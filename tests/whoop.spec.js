const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function openAtletaTab(page) {
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('atleta'));
}

test('la card Whoop resta nascosta per un atleta senza dati Whoop', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    whoop: [{ athlete: 'Un Altro', type: 'recovery', date: daysAgo(1), recordId: '1', data: { recoveryScore: 70 } }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  await expect(page.locator('#whoopCard')).toBeHidden();
});

test('mostra tutte le metriche di recovery e ciclo, più il sonno, dell\'ultimo giorno sincronizzato', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    whoop: [
      { athlete: 'Test Athlete', type: 'recovery', date: daysAgo(3), recordId: 'r-old', data: { recoveryScore: 20, restingHeartRate: 60 } },
      { athlete: 'Test Athlete', type: 'recovery', date: daysAgo(1), recordId: 'r-new', data: { recoveryScore: 82, restingHeartRate: 48, hrvMilli: 65, spo2Percentage: 97, skinTempCelsius: 33.4 } },
      { athlete: 'Test Athlete', type: 'cycle', date: daysAgo(1), recordId: 'c1', data: { strain: 14.26, averageHeartRate: 78, maxHeartRate: 145, kilojoule: 9000 } },
      { athlete: 'Test Athlete', type: 'sleep', date: daysAgo(1), recordId: 's1', data: { sleepPerformancePercentage: 91 } },
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  await expect(page.locator('#whoopCard')).toBeVisible();
  const values = await page.locator('#whoopContainer .whoop-stat-value').allInnerTexts();
  // Ordine: Recovery, HRV, SpO2, Temp. cutanea, Strain, FC media, FC max, Calorie, Sonno.
  expect(values).toEqual(['82%', '65 ms', '97%', '33.4°C', '14.3', '78 bpm', '145 bpm', '2151 kcal', '91%']);
  await expect(page.locator('#whoopContainer .whoop-stat-value').first()).toHaveClass(/whoop-recovery-high/);
  // Vince il recovery più recente, non quello di 3 giorni fa.
  await expect(page.locator('#whoopContainer')).toContainText('48 bpm a riposo');
});

test('una metrica mancante mostra il trattino invece di sparire', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    whoop: [{ athlete: 'Test Athlete', type: 'recovery', date: daysAgo(1), recordId: 'r1', data: { recoveryScore: 30 } }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  const values = await page.locator('#whoopContainer .whoop-stat-value').allInnerTexts();
  expect(values).toEqual(['30%', '—', '—', '—', '—', '—', '—', '—', '—']);
  await expect(page.locator('#whoopContainer .whoop-stat-value').first()).toHaveClass(/whoop-recovery-low/);
});

test('elenca gli allenamenti rilevati dalla fascia, dal più recente', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    whoop: [
      { athlete: 'Test Athlete', type: 'workout', date: daysAgo(5), recordId: 'w-old', data: { sportName: 'Running', strain: 8.1 } },
      { athlete: 'Test Athlete', type: 'workout', date: daysAgo(2), recordId: 'w-new', data: { sportName: 'Functional Fitness', strain: 15.4, averageHeartRate: 152, maxHeartRate: 181, kilojoule: 2000 } },
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  const names = await page.locator('#whoopContainer .whoop-workout-name').allInnerTexts();
  expect(names).toEqual(['Functional Fitness', 'Running']);
  await expect(page.locator('#whoopContainer .whoop-workout').first()).toContainText('152 bpm medi');
  await expect(page.locator('#whoopContainer .whoop-workout').first()).toContainText('478 kcal');
});

// Se il foglio Google converte la data in un vero Date, torna un timestamp ISO a mezzanotte
// locale: tagliare i primi 10 caratteri darebbe il giorno prima.
test('interpreta correttamente una data arrivata come timestamp ISO', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    whoop: [{ athlete: 'Test Athlete', type: 'recovery', date: '2025-10-01T22:00:00.000Z', recordId: 'r1', data: { recoveryScore: 55 } }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  const giorno = await page.evaluate(() => whoopDayKey('2025-10-01T22:00:00.000Z'));
  const atteso = new Date('2025-10-01T22:00:00.000Z');
  const pad = (n) => String(n).padStart(2, '0');
  expect(giorno).toBe(`${atteso.getFullYear()}-${pad(atteso.getMonth() + 1)}-${pad(atteso.getDate())}`);
  await expect(page.locator('#whoopContainer')).toContainText('la fascia non sincronizza da un po');
});
