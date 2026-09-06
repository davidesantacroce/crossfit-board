const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v64: le sessioni vecchie (una riga con dentro più lavori, come si faceva prima della v48) si
// spacchettano in un allenamento per lavoro, dalla card stessa o tutte insieme da IMPOSTAZIONI.

function giorniFa(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const IERI = giorniFa(1);

const vecchia = (id, giorni, titoli, extra = {}) => ({
  id, date: giorniFa(giorni), athlete: 'Test Athlete',
  blocks: titoli.map((t, i) => ({ title: t, type: 'For Time', explanation: `testo ${t}`, result: `ris ${i}`, category: i === 0 ? 'RX' : 'SCALED' })),
  ...extra,
});

async function apri(page, wods) {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());
  return state;
}

// Il badge RX/SCALED sta dentro l'elemento del titolo: qui interessa solo il nome del lavoro.
const titoliDelGiorno = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('#registraDayView .day-item-title'))
    .map((e) => e.innerText.replace(/^(RX|SCALED)\s*/, '').split(' (')[0].trim()));

test('spacchettare una sessione crea un allenamento per lavoro, conservando tutto', async ({ page }) => {
  const state = await apri(page, [vecchia('v1', 1, ['A', 'B', 'C'])]);
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, IERI);

  await page.locator('#registraDayView').getByRole('button', { name: /Spacchetta in 3/ }).click();
  await expect.poll(() => state.wods.length).toBe(3);

  // Ogni lavoro è ora una sessione a sé, nell'ordine in cui stava dentro la vecchia.
  expect(state.wods.map((w) => w.blocks.length)).toEqual([1, 1, 1]);
  expect(state.wods.map((w) => w.blocks[0].title)).toEqual(['A', 'B', 'C']);
  expect(state.wods.map((w) => w.order)).toEqual([0, 1, 2]);
  // Data, atleta, risultato e categoria restano quelli di prima.
  expect(state.wods.every((w) => w.date === IERI && w.athlete === 'Test Athlete')).toBe(true);
  expect(state.wods.map((w) => w.blocks[0].result)).toEqual(['ris 0', 'ris 1', 'ris 2']);
  expect(state.wods.map((w) => w.blocks[0].category)).toEqual(['RX', 'SCALED', 'SCALED']);
  // La vecchia non c'è più, e non restano doppioni.
  expect(state.wods.some((w) => w.id === 'v1')).toBe(false);

  await expect.poll(() => titoliDelGiorno(page)).toEqual(['A', 'B', 'C']);
});

test('un WOD pubblicato spacchettato resta pubblicato', async ({ page }) => {
  const state = await apri(page, [vecchia('p1', 1, ['A', 'B'], { mode: 'PUBLISHED' })]);
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, IERI);

  await page.locator('#registraDayView').getByRole('button', { name: /Spacchetta in 2/ }).click();
  await expect.poll(() => state.wods.length).toBe(2);

  expect(state.wods.every((w) => w.mode === 'PUBLISHED')).toBe(true);
});

test('il tasto compare solo sulle sessioni con più lavori', async ({ page }) => {
  await apri(page, [
    vecchia('v1', 1, ['A', 'B']),
    { id: 's1', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Singolo', type: 'For Time', explanation: '', result: '' }] },
  ]);
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, IERI);

  // Due card nella giornata: partono chiuse (v58), e i tasti stanno nel corpo.
  const cardDoppia = page.locator('#registraDayView .day-item').filter({ hasText: 'A' }).first();
  await cardDoppia.locator('.day-item-head').click();
  await expect(cardDoppia.getByRole('button', { name: /Spacchetta in 2/ })).toBeVisible();
  const cardSingola = page.locator('#registraDayView .day-item').filter({ hasText: 'Singolo' });
  await cardSingola.locator('.day-item-head').click();
  await expect(cardSingola.getByRole('button', { name: /Risultati/ })).toBeVisible();
});

test('si spacchetta anche dallo Storico', async ({ page }) => {
  const state = await apri(page, [vecchia('v1', 1, ['A', 'B'])]);
  await page.evaluate(() => switchTab('storico'));

  await page.locator('#historyList').getByRole('button', { name: /Spacchetta in 2/ }).click();
  await expect.poll(() => state.wods.length).toBe(2);
  await expect(page.locator('#historyList').getByRole('button', { name: /Spacchetta/ })).toHaveCount(0);
});

test('da IMPOSTAZIONI si spacchetta tutto in un colpo, e poi la card sparisce', async ({ page }) => {
  const state = await apri(page, [
    vecchia('v1', 1, ['A', 'B']),
    vecchia('v2', 4, ['C', 'D', 'E']),
    { id: 's1', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Gia singolo', type: 'For Time', explanation: '', result: '' }] },
  ]);
  await page.evaluate(() => switchTab('impostazioni'));

  await expect(page.locator('#splitSessionsCard')).toBeVisible();
  await expect(page.locator('#splitSessionsInfo')).toContainText('2 allenamenti');
  await expect(page.locator('#splitSessionsInfo')).toContainText('5 lavori');

  await page.locator('#splitSessionsBtn').click();
  await expect.poll(() => state.wods.length).toBe(6); // 2 + 3 + quella già singola

  expect(state.wods.every((w) => w.blocks.length === 1)).toBe(true);
  await expect(page.locator('#splitSessionsCard')).toBeHidden(); // niente più da fare
});

test('senza sessioni raggruppate la card in IMPOSTAZIONI non compare', async ({ page }) => {
  await apri(page, [{ id: 's1', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Solo', type: 'For Time', explanation: '', result: '' }] }]);
  await page.evaluate(() => switchTab('impostazioni'));

  await expect(page.locator('#splitSessionsCard')).toBeHidden();
});
