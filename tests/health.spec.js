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

test('mostra peso e grasso corporeo più recenti (FC a riposo/passi/energia attiva non si mostrano più qui: li segue Whoop)', async ({ page }) => {
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
  expect(values).toEqual(['78.4 kg', '15.2%']);
});

test('ogni metrica prende il suo giorno più recente, anche se non coincidono', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [
      { athlete: 'Test Athlete', date: daysAgo(5), weight: 80.0 },                 // solo peso, vecchio
      { athlete: 'Test Athlete', date: daysAgo(1), bodyFatPercentage: 14.8 },      // solo grasso, oggi
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  const values = await page.locator('#healthContainer .health-stat-value').allInnerTexts();
  expect(values[0]).toBe('80.0 kg');  // dal giorno vecchio, unico con un peso
  expect(values[1]).toBe('14.8%');    // dal giorno recente, unico con il grasso corporeo
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
  expect(values).toEqual(['78.4 kg', '—']);
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

test('il tasto ↻ ricarica i dati dal backend senza ricaricare la pagina', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    health: [{ athlete: 'Test Athlete', date: daysAgo(1), weight: 78.4 }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);
  await expect(page.locator('#healthContainer .health-stat-value').first()).toHaveText('78.4 kg');

  // Il Comando iOS manda una nuova pesata mentre la pagina è già aperta.
  state.health.push({ athlete: 'Test Athlete', date: daysAgo(0), weight: 77.2 });

  await page.locator('#healthCard .btn-refresh-card').click();

  await expect(page.locator('#healthContainer .health-stat-value').first()).toHaveText('77.2 kg');
});

test('anche la card Whoop ha il suo tasto di ricarica', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    whoop: [{ athlete: 'Test Athlete', type: 'recovery', date: daysAgo(1), recordId: 'r1', data: { recoveryScore: 70 } }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  await expect(page.locator('#whoopCard .btn-refresh-card')).toBeVisible();
});
