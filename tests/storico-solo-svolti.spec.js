const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v72: un WOD pubblicato ma senza punteggio è programmazione, non un allenamento fatto: nello
// Storico non ci va (segnalato: "Core Work non l'ho fatto, come mai lo vedo nello storico?").
// Ci entra da solo appena gli si logga il risultato. Il resto dell'app faceva già questa
// distinzione — calendario, giorni attivi, radar — ma escludendo TUTTI i pubblicati, quindi non
// contava nemmeno quelli davvero svolti: ora usano tutti lo stesso criterio.

function shift(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const IERI = shift(-1);

const pubblicato = (id, title, result) => ({
  id, date: IERI, athlete: 'Test Athlete', mode: 'PUBLISHED',
  blocks: [{ title, type: 'Sets', explanation: '3 sets', result, category: 'RX' }],
});

async function apriStorico(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('storico'));
}

test('un WOD pubblicato e non fatto non compare nello Storico', async ({ page }) => {
  await apriStorico(page, [
    pubblicato('w1', 'Weighted Ring Dip', '8/8/8 kg'),
    pubblicato('w2', 'Core Work', ''),
  ]);

  await expect(page.locator('#historyList')).toContainText('Weighted Ring Dip');
  await expect(page.locator('#historyList')).not.toContainText('Core Work');
  await expect(page.locator('#historyList .history-item')).toHaveCount(1);
});

test('lo stesso WOD compare appena ha un punteggio', async ({ page }) => {
  await apriStorico(page, [pubblicato('w2', 'Core Work', '3x20 reps')]);
  await expect(page.locator('#historyList')).toContainText('Core Work');
});

test('una sessione NON pubblicata resta anche senza punteggio', async ({ page }) => {
  // Se l'hai registrata tu, l'hai fatta: una mobility non ha uno score da mettere.
  await apriStorico(page, [
    { id: 'w3', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Mobility', type: 'Sets', explanation: '', result: '' }] },
  ]);
  await expect(page.locator('#historyList')).toContainText('Mobility');
});

test('se restano solo WOD programmati, lo Storico lo dice invece di mostrare giornate vuote', async ({ page }) => {
  await apriStorico(page, [pubblicato('w2', 'Core Work', '')]);

  await expect(page.locator('#historyList .day-group')).toHaveCount(0);
  await expect(page.locator('#historyList')).toContainText('quando ne logghi il risultato');
});

test('in una riga vecchia si vede il lavoro fatto e non quello solo programmato', async ({ page }) => {
  await apriStorico(page, [
    { id: 'v1', date: IERI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [
      { title: 'Fatto', type: 'Sets', explanation: '', result: '60 kg' },
      { title: 'Solo programmato', type: 'Sets', explanation: '', result: '' },
    ] },
  ]);

  await expect(page.locator('#historyList')).toContainText('Fatto');
  await expect(page.locator('#historyList')).not.toContainText('Solo programmato');
});

test('un WOD pubblicato E fatto conta come giorno di allenamento', async ({ page }) => {
  // Prima il calendario e i grafici escludevano tutti i pubblicati, quindi un allenamento
  // pubblicato in bacheca e poi svolto non compariva da nessuna parte.
  await apriStorico(page, [pubblicato('w1', 'Weighted Ring Dip', '8/8/8 kg')]);

  await page.evaluate(() => switchTab('registra'));
  const segnati = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.calendar-day.has-log')).length);
  expect(segnati).toBe(1);
});
