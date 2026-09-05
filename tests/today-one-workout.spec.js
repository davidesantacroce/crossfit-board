const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v48: anche OGGI mostra di default la vista di sola lettura di quanto già registrato, come già
// avveniva per un giorno passato (vedi past-day-log.spec.js): niente più form sempre aperto con
// "+ Aggiungi Lavoro" pronto a impilare più Parti in un'unica sessione.

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function apriRegistra(page) {
  await page.evaluate(() => switchTab('registra'));
}

test('oggi senza sessioni mostra la vista di sola lettura, non il form', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriRegistra(page);

  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Registra un allenamento per oggi' })).toBeVisible();
});

test('il bottone apre il form vuoto, con pubblica ancora disponibile (a differenza del recupero)', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriRegistra(page);
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();

  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(0);
  await expect(page.locator('#pastDayBanner')).toBeVisible();
  await expect(page.locator('#pastDayBannerText')).toContainText('STAI REGISTRANDO UN ALLENAMENTO PER OGGI');
  await expect(page.locator('#saveWodBtn')).toBeVisible();
  await expect(page.locator('#publishWodBtn')).toBeVisible();
});

test('+ Aggiungi Lavoro sparisce dopo la prima Parte: una sola Parte per sessione', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriRegistra(page);
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();

  await expect(page.locator('#addWorkoutBlockBtn')).toBeVisible();
  await page.locator('#addWorkoutBlockBtn').click();

  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(1);
  await expect(page.locator('#addWorkoutBlockBtn')).toBeHidden();

  // Rimuovendo l'unica Parte, il bottone per aggiungerne una torna disponibile.
  await page.locator('[id^="workout-block-"] .btn-remove').click();
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(0);
  await expect(page.locator('#addWorkoutBlockBtn')).toBeVisible();
});

test('salvato il primo allenamento di oggi, se ne può registrare subito un altro separato', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await apriRegistra(page);
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();

  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9 Thruster + Pull-up'));
  await page.evaluate(() => saveWodSession());
  await page.waitForFunction(() => (globalData.wods || []).length > 0);

  expect(state.wods).toHaveLength(1);
  expect(state.wods[0].blocks).toHaveLength(1);

  await apriRegistra(page);
  await expect(page.locator('#registraDayView')).toContainText('Fran');
  await expect(page.getByRole('button', { name: '+ Registra un altro allenamento per oggi' })).toBeVisible();

  await page.getByRole('button', { name: '+ Registra un altro allenamento per oggi' }).click();
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(0); // form vuoto, non quello della Parte già salvata

  await page.evaluate(() => addWorkoutBlock('AMRAP', 'Cindy', '20 min AMRAP'));
  await page.evaluate(() => saveWodSession());
  await page.waitForFunction(() => (globalData.wods || []).length > 1);

  expect(state.wods).toHaveLength(2); // due righe separate, non un'unica sessione multi-blocco
  expect(state.wods.every((w) => w.blocks.length === 1)).toBe(true);
});

test('annulla la registrazione di oggi torna alla vista di sola lettura senza salvare', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriRegistra(page);
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9'));

  await page.getByRole('button', { name: 'Annulla' }).click();

  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toBeVisible();
  expect(state.wods).toHaveLength(0);

  // Riaprendo il form si riparte da zero, non dalla Parte lasciata a metà prima di annullare.
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(0);
});
