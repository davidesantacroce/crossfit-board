const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v69: nella bacheca si legge il testo del WOD toccando la card, senza doverlo prima caricare
// nel form con "USA QUESTO WOD". E i giorni sono dal più recente in cima.

function giornoDellaSettimana(i) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + i);
  return d.toISOString().slice(0, 10);
}

const TESTO = '21-15-9\nThruster 43kg\nPull-up';

async function apriBacheca(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('bacheca'));
  // Un giorno solo nella settimana: è già aperto (vedi bacheca-giorni.spec.js).
}

const unGiorno = (blocks) => [
  { id: '1', date: giornoDellaSettimana(3), athlete: 'Mario Rossi', mode: 'PUBLISHED', blocks },
];

test('toccando la card si legge il testo del WOD, ritoccandola si richiude', async ({ page }) => {
  await apriBacheca(page, unGiorno([{ title: 'Fran', type: 'For Time', explanation: TESTO, result: '' }]));

  const card = page.locator('#bachecaContent .bacheca-card').first();
  await expect(card.locator('.bacheca-card-body')).toBeHidden();

  await card.locator('.bacheca-card-head').click();
  await expect(card.locator('.bacheca-card-body')).toBeVisible();
  await expect(card.locator('.bacheca-card-body')).toContainText('Thruster 43kg');

  await card.locator('.bacheca-card-head').click();
  await expect(card.locator('.bacheca-card-body')).toBeHidden();
});

test('aprire una card non ne apre altre', async ({ page }) => {
  await apriBacheca(page, [
    { id: '1', date: giornoDellaSettimana(3), athlete: 'Mario Rossi', mode: 'PUBLISHED', order: 0, blocks: [{ title: 'Fran', type: 'For Time', explanation: TESTO, result: '' }] },
    { id: '2', date: giornoDellaSettimana(3), athlete: 'Mario Rossi', mode: 'PUBLISHED', order: 1, blocks: [{ title: 'Cindy', type: 'AMRAP', explanation: '20 min AMRAP', result: '' }] },
  ]);

  const cards = page.locator('#bachecaContent .bacheca-card');
  await expect(cards).toHaveCount(2);

  await cards.nth(1).locator('.bacheca-card-head').click();
  await expect(cards.nth(1).locator('.bacheca-card-body')).toBeVisible();
  await expect(cards.nth(0).locator('.bacheca-card-body')).toBeHidden();
});

test('un WOD senza testo non ha niente da aprire: nessuna freccetta', async ({ page }) => {
  await apriBacheca(page, unGiorno([{ title: 'Murph', type: 'For Time', explanation: '', result: '' }]));

  const card = page.locator('#bachecaContent .bacheca-card').first();
  await expect(card.locator('.bacheca-card-body')).toHaveCount(0);
  await expect(card.locator('.day-item-chevron')).toHaveCount(0);
});

test('un WOD vecchio senza spiegazione mostra comunque gli esercizi', async ({ page }) => {
  await apriBacheca(page, unGiorno([
    { title: 'Vecchio', type: 'For Time', explanation: '', result: '', exercises: [{ reps: '21', name: 'Thruster', weight: '43kg' }] },
  ]));

  const card = page.locator('#bachecaContent .bacheca-card').first();
  await card.locator('.bacheca-card-head').click();
  await expect(card.locator('.bacheca-card-body')).toContainText('Thruster');
  await expect(card.locator('.bacheca-card-body')).toContainText('43kg');
});

test('il tasto USA QUESTO WOD resta raggiungibile senza aprire la card', async ({ page }) => {
  await apriBacheca(page, unGiorno([{ title: 'Fran', type: 'For Time', explanation: TESTO, result: '' }]));

  const card = page.locator('#bachecaContent .bacheca-card').first();
  await expect(card.locator('.bacheca-card-body')).toBeHidden();
  await card.getByRole('button', { name: /QUESTO WOD/ }).click();

  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(1);
  await expect(page.locator('.block-title')).toHaveValue('Fran');
});
