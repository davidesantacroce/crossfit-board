const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function apriAtleta(page) {
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('atleta'));
}

test('la card Salute resta nascosta per un atleta senza dati', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [{ athlete: 'Un Altro', date: daysAgo(1), weight: 80 }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  await expect(page.locator('#healthCard')).toBeHidden();
});

test('mostra peso, grasso corporeo, FC a riposo, passi ed energia più recenti', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [{
      athlete: 'Test Athlete', date: daysAgo(1),
      weight: 78.4, bodyFatPercentage: 15.2, restingHeartRate: 52, steps: 8400, activeEnergy: 540,
    }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  await expect(page.locator('#healthCard')).toBeVisible();
  const values = await page.locator('#healthContainer .health-stat-value').allInnerTexts();
  expect(values).toEqual(['78.4 kg', '15.2%', '52 bpm', '8.400', '540 kcal']);
});

test('ogni metrica prende il suo giorno più recente, anche se non coincidono', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [
      { athlete: 'Test Athlete', date: daysAgo(5), weight: 80.0, steps: 3000 }, // solo peso vecchio
      { athlete: 'Test Athlete', date: daysAgo(1), steps: 9000 },               // solo passi, oggi
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  const values = await page.locator('#healthContainer .health-stat-value').allInnerTexts();
  expect(values[0]).toBe('80.0 kg');  // dal giorno vecchio, unico con un peso
  expect(values[3]).toBe('9.000');    // dal giorno recente, unico con i passi
  await expect(page.locator('#healthContainer')).toContainText('Ultimo dato:'); // segue il giorno più recente in assoluto
});

test('il trend del peso confronta con la pesata precedente, non con il primo valore mai inserito', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [
      { athlete: 'Test Athlete', date: daysAgo(10), weight: 90.0 },
      { athlete: 'Test Athlete', date: daysAgo(2), weight: 79.0 },
      { athlete: 'Test Athlete', date: daysAgo(1), weight: 78.4 }, // -0.6 dall'ultima, non -11.6 dalla prima
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  await expect(page.locator('#healthContainer .health-stat').first()).toContainText('-0.6 kg');
  await expect(page.locator('#healthContainer .health-stat-value').first()).toHaveClass(/health-weight-trend-down/);
});

test('una metrica mancante mostra il trattino invece di sparire', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [{ athlete: 'Test Athlete', date: daysAgo(1), weight: 78.4 }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  const values = await page.locator('#healthContainer .health-stat-value').allInnerTexts();
  expect(values).toEqual(['78.4 kg', '—', '—', '—', '—']);
});

test('il bottone precompila il peso nel profilo senza salvare da solo', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [{ athlete: 'Test Athlete', date: daysAgo(1), weight: 78.4 }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  await page.getByRole('button', { name: /Usa 78.4 kg nel profilo/ }).click();
  await expect(page.locator('#profileWeight')).toHaveValue('78.4');
  expect(state.wods).toHaveLength(0); // nessuna chiamata di salvataggio innescata dal solo click
});
