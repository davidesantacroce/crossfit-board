const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v63: l'ordine dei lavori dentro una giornata si decide con le frecce su/giù, e vale in tutte
// le viste (vista giorno, bacheca, storico).

const OGGI = new Date().toISOString().slice(0, 10);

const lavoro = (id, titolo, extra = {}) => ({
  id, date: OGGI, athlete: 'Test Athlete',
  blocks: [{ title: titolo, type: 'For Time', explanation: `testo ${titolo}`, result: '' }],
  ...extra,
});

// Funzione, non costante: il riordino scrive "order" dentro gli oggetti del fixture, e un
// array condiviso a livello di modulo farebbe partire ogni test dall'ordine lasciato dal
// precedente.
const tre = () => [lavoro('101', 'A'), lavoro('102', 'B'), lavoro('103', 'C')];

const titoliGiorno = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('#registraDayView .day-item-title')).map((e) => e.innerText.split(' (')[0].trim()));

async function apriGiorno(page, wods) {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, OGGI);
  return state;
}

test('spostare un lavoro cambia l\'ordine e lo salva sul Foglio', async ({ page }) => {
  const state = await apriGiorno(page, tre());
  expect(await titoliGiorno(page)).toEqual(['A', 'B', 'C']);

  // Porta C sopra B.
  await page.locator('#registraDayView .day-item').nth(2).locator('.day-item-move-btn').first().click();
  await expect.poll(() => titoliGiorno(page)).toEqual(['A', 'C', 'B']);

  // Tutta la giornata viene rinumerata 0,1,2: niente buchi e niente ambiguità.
  const ordini = Object.fromEntries(state.wods.map((w) => [w.blocks[0].title, w.order]));
  expect(ordini).toEqual({ A: 0, C: 1, B: 2 });
});

test('le frecce agli estremi sono disabilitate, e con un lavoro solo non ci sono', async ({ page }) => {
  await apriGiorno(page, tre());
  const card = (i) => page.locator('#registraDayView .day-item').nth(i);

  await expect(card(0).locator('.day-item-move-btn').first()).toBeDisabled(); // il primo non sale
  await expect(card(0).locator('.day-item-move-btn').nth(1)).toBeEnabled();
  await expect(card(2).locator('.day-item-move-btn').nth(1)).toBeDisabled();  // l'ultimo non scende

  await apriGiorno(page, [lavoro('999', 'Solo')]);
  await expect(page.locator('#registraDayView .day-item-move-btn')).toHaveCount(0);
});

test('toccare una freccia non apre né chiude la card', async ({ page }) => {
  await apriGiorno(page, tre());
  const corpi = page.locator('#registraDayView .day-item-body');
  await expect(corpi.nth(0)).toBeHidden();

  await page.locator('#registraDayView .day-item').nth(0).locator('.day-item-move-btn').nth(1).click();
  await expect.poll(() => titoliGiorno(page)).toEqual(['B', 'A', 'C']);
  await expect(page.locator('#registraDayView .day-item-body').nth(0)).toBeHidden();
});

test('l\'ordine scelto vale anche in bacheca e nello storico', async ({ page }) => {
  await apriGiorno(page, tre());
  await page.locator('#registraDayView .day-item').nth(2).locator('.day-item-move-btn').first().click();
  await expect.poll(() => titoliGiorno(page)).toEqual(['A', 'C', 'B']);

  await page.evaluate(() => switchTab('bacheca'));
  expect(await page.evaluate(() => bachecaCandidates.map((c) => c.blocks[0].title))).toEqual(['A', 'C', 'B']);

  await page.evaluate(() => switchTab('storico'));
  // Dalla v66 il nome del WOD ha un elemento tutto suo, quindi si legge direttamente.
  const nelloStorico = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#historyList .history-item .history-item-title')).map((el) => el.textContent.trim()));
  expect(nelloStorico).toEqual(['A', 'C', 'B']);
});

test('le sessioni vecchie senza ordine vengono numerate al primo riordino', async ({ page }) => {
  const state = await apriGiorno(page, tre()); // nessuna ha "order"
  expect(state.wods.every((w) => w.order === undefined)).toBe(true);

  await page.locator('#registraDayView .day-item').nth(0).locator('.day-item-move-btn').nth(1).click();
  await expect.poll(() => titoliGiorno(page)).toEqual(['B', 'A', 'C']);

  expect(state.wods.every((w) => Number.isFinite(w.order))).toBe(true);
});

test('modificare una sessione non le fa perdere il posto', async ({ page }) => {
  const state = await apriGiorno(page, tre());
  await page.locator('#registraDayView .day-item').nth(2).locator('.day-item-move-btn').first().click();
  await expect.poll(() => titoliGiorno(page)).toEqual(['A', 'C', 'B']);

  await page.evaluate(() => editWodSession('103')); // C, ora in seconda posizione
  await page.evaluate(() => { document.querySelector('.block-title').value = 'C rinominato'; });
  await page.evaluate(() => saveWodSession());
  await expect.poll(() => state.wods.find((w) => w.id === '103').blocks[0].title).toBe('C rinominato');

  expect(state.wods.find((w) => w.id === '103').order).toBe(1); // resta al suo posto
});

test('senza linea il riordino finisce in coda e riparte da solo', async ({ page }) => {
  const state = await apriGiorno(page, tre());
  const cadeLaLinea = (route) => route.abort();
  await page.route('**/macros/**', cadeLaLinea);

  await page.locator('#registraDayView .day-item').nth(2).locator('.day-item-move-btn').first().click();
  await expect.poll(() => titoliGiorno(page)).toEqual(['A', 'C', 'B']); // si vede subito
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pendingWrites') || '[]').length)).toBe(1);

  await page.unroute('**/macros/**', cadeLaLinea);
  await page.evaluate(() => flushPendingWrites());
  const ordini = Object.fromEntries(state.wods.map((w) => [w.blocks[0].title, w.order]));
  expect(ordini).toEqual({ A: 0, C: 1, B: 2 });
});
