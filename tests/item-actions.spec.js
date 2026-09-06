const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v60: Modifica · Risultati · Elimina sono tre tasti gemelli, stessa larghezza e stessa altezza,
// identici nella vista giorno e nello Storico. Prima Modifica ed Elimina stavano nell'intestazione
// con misure diverse fra loro, e "Results" era un blocco a parte a tutta larghezza.

function giorniFa(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const IERI = giorniFa(1);

const datiBase = {
  athletes: [{ name: 'Test Athlete', hasPin: false }],
  wods: [{ id: 'a', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '4:30', category: 'RX' }] }],
};

const misure = (page, dove) => page.evaluate((sel) => {
  const riga = document.querySelector(sel);
  return Array.from(riga.querySelectorAll('button')).map((b) => {
    const r = b.getBoundingClientRect();
    return { testo: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) };
  });
}, dove);

async function apri(page, dati = datiBase) {
  await mockBackend(page, dati);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
}

test('nello Storico i tre tasti sono uguali e allineati', async ({ page }) => {
  await apri(page);
  await page.evaluate(() => switchTab('storico'));

  const b = await misure(page, '#historyList .item-actions-row');
  expect(b.map((x) => x.testo)).toEqual(['✏️ MODIFICA', '👥 RISULTATI', '✕ ELIMINA']);
  expect(new Set(b.map((x) => x.w)).size).toBe(1); // stessa larghezza
  expect(new Set(b.map((x) => x.h)).size).toBe(1); // stessa altezza
  expect(new Set(b.map((x) => x.y)).size).toBe(1); // sulla stessa riga
});

test('nella vista giorno sono gli stessi tre tasti, con le stesse misure', async ({ page }) => {
  await apri(page);
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, IERI);

  const b = await misure(page, '#registraDayView .item-actions-row');
  expect(b.map((x) => x.testo)).toEqual(['✏️ MODIFICA', '👥 RISULTATI', '✕ ELIMINA']);
  expect(new Set(b.map((x) => x.w)).size).toBe(1);
  expect(new Set(b.map((x) => x.h)).size).toBe(1);
  expect(new Set(b.map((x) => x.y)).size).toBe(1);
});

test('il tasto si chiama Risultati, non Results', async ({ page }) => {
  await apri(page);
  await page.evaluate(() => switchTab('storico'));
  await expect(page.locator('#historyList .item-actions-row')).toContainText('Risultati');
  await expect(page.locator('#historyList')).not.toContainText('Results');
});

test('Risultati apre comunque il confronto con gli altri atleti', async ({ page }) => {
  await apri(page, {
    ...datiBase,
    results: [{ id: 'r1', athlete: 'Mario Rossi', date: IERI, workout: 'Fran', workoutType: 'For Time', scoreType: 'Time', scoreDisplay: '3:20', category: 'RX', movements: '' }],
  });
  await page.evaluate(() => switchTab('storico'));

  await page.locator('#historyList').getByRole('button', { name: /Risultati/ }).click();
  await expect(page.locator('#communityResultsContent')).toContainText('Mario Rossi');
});

test('una vecchia sessione multi-Parte tiene un Risultati per Parte', async ({ page }) => {
  await apri(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'vecchia', date: IERI, athlete: 'Test Athlete', blocks: [
      { title: 'Parte 1', type: 'Sets', explanation: 'Deadlift', result: '150 kg' },
      { title: 'Parte 2', type: 'For Time', explanation: 'Fran', result: '4:30' },
    ] }],
  });
  await page.evaluate(() => switchTab('storico'));

  // Il confronto è per singolo lavoro: con due Parti restano due tasti Risultati, uno per Parte.
  await expect(page.locator('#historyList .community-btn-wrap')).toHaveCount(2);
  // Nella riga in fondo il posto centrale lo prende "Spacchetta" (v64), sempre a misure uguali.
  const b = await misure(page, '#historyList .item-actions-row');
  expect(b.map((x) => x.testo)).toEqual(['✏️ MODIFICA', '⑂ SPACCHETTA IN 2', '✕ ELIMINA']);
  expect(new Set(b.map((x) => x.w)).size).toBe(1);
  expect(new Set(b.map((x) => x.h)).size).toBe(1);
});
