const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function openAtletaTab(page) {
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('atleta'));
}

test('la card resta nascosta per un atleta senza nessuna sessione mai registrata', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  await expect(page.locator('#trainingFocusCard')).toBeHidden();
});

test('con sessioni ma nessun movimento riconosciuto nelle ultime 4 settimane, mostra un messaggio invece del radar', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    // Titolo/spiegazione senza nessun termine di COMMON_MOVEMENTS.
    wods: [{ id: 'w1', date: daysAgo(1), athlete: 'Test Athlete', blocks: [{ title: 'Allenamento libero', type: 'AMRAP', explanation: 'quello che viene', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  await expect(page.locator('#trainingFocusCard')).toBeVisible();
  await expect(page.locator('#trainingFocusContainer')).toContainText('Nessun movimento riconosciuto');
  await expect(page.locator('.training-focus-svg')).toHaveCount(0);
});

test('conta i movimenti per categoria e normalizza rispetto al massimo del periodo', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [
      { id: 'w1', date: daysAgo(1), athlete: 'Test Athlete', blocks: [{ title: 'Back Squat 5x5', type: 'Strength', explanation: 'Back Squat pesante', result: '' }] },
      { id: 'w2', date: daysAgo(2), athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '' }] },
      { id: 'w3', date: daysAgo(3), athlete: 'Test Athlete', blocks: [{ title: 'Grace', type: 'For Time', explanation: '30 Clean and Jerk', result: '' }] },
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  // Squat: 1 (Back Squat). Weightlifting Olimpico: 3 (Thruster + Clean + Jerk, tutti e tre
  // riconosciuti separatamente). Trazioni: 1 (Pull-up). Il resto a zero.
  const computed = await page.evaluate(() => computeTrainingFocus('Test Athlete', 4));
  const byName = Object.fromEntries(computed.map((f) => [f.name, f]));
  expect(byName['Squat & Affondi'].count).toBe(1);
  expect(byName['Weightlifting Olimpico'].count).toBe(3);
  expect(byName['Trazioni'].count).toBe(1);
  expect(byName['Spinta'].count).toBe(0);
  expect(byName['Weightlifting Olimpico'].value).toBe(100); // il massimo del periodo
  expect(byName['Squat & Affondi'].value).toBe(Math.round((1 / 3) * 100));

  await expect(page.locator('#trainingFocusCard')).toBeVisible();
  await expect(page.locator('.training-focus-caption')).toContainText('Weightlifting Olimpico');
  await expect(page.locator('.training-focus-list-row', { hasText: 'Weightlifting Olimpico' })).toContainText('100');
});

test('ignora le sessioni più vecchie della finestra e i WOD pubblicati non fatti dall\'atleta', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [
      // Fuori dalla finestra di 4 settimane (28 giorni): non deve contare.
      { id: 'w-old', date: daysAgo(40), athlete: 'Test Athlete', blocks: [{ title: 'Deadlift', type: 'Strength', explanation: 'Deadlift 5x5', result: '' }] },
      // Pubblicato ma non fatto dall'atleta: non deve contare.
      { id: 'w-pub', date: daysAgo(1), athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Snatch', type: 'Strength', explanation: 'Snatch tecnica', result: '' }] },
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await openAtletaTab(page);

  const computed = await page.evaluate(() => computeTrainingFocus('Test Athlete', 4));
  const totalCount = computed.reduce((s, f) => s + f.count, 0);
  expect(totalCount).toBe(0);
  await expect(page.locator('#trainingFocusContainer')).toContainText('Nessun movimento riconosciuto');
});
