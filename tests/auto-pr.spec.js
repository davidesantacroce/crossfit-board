const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

test('un Log Result migliore su un benchmark noto aggiorna il massimale, uno peggiore no', async ({ page }) => {
  const state = await mockBackend(page);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');

  await page.evaluate(() => {
    switchTab('registra');
    addWorkoutBlock('For Time', 'Fran', '21-15-9 Thruster + Pull-up');
  });
  const blockId = await page.evaluate(() => blockCounter);

  async function logFranTime(min, sec) {
    await page.evaluate(({ blockId, min, sec }) => {
      openLogResultModal(blockId);
      document.getElementById('lrScoreType').value = 'Time';
      renderLrScoreFields();
      document.getElementById('lrTimeMin').value = min;
      document.getElementById('lrTimeSec').value = sec;
    }, { blockId, min, sec });
    await page.evaluate(() => saveLogResult());
  }

  await logFranTime('5', '00');
  await logFranTime('6', '00'); // peggiore: non deve sovrascrivere
  await logFranTime('4', '30'); // migliore: deve sovrascrivere

  const key = 'fran (21-15-9 thruster 43/30kg + pull-up)';
  const entries = state.massimali.filter((m) => m.movement.toLowerCase() === key);
  expect(entries.map((e) => e.weight)).toEqual(['5:00', '4:30']);
});

test('un peso migliore su un massimale della lista lo aggiorna, uno peggiore no', async ({ page }) => {
  const state = await mockBackend(page);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');

  await page.evaluate(() => {
    switchTab('registra');
    addWorkoutBlock('For Time', 'Back Squat', '1RM attempt'); // testo senza numeri di set, per avere il campo peso singolo
  });
  const blockId = await page.evaluate(() => blockCounter);

  async function logSquatWeight(kg) {
    await page.evaluate(({ blockId, kg }) => {
      openLogResultModal(blockId);
      document.getElementById('lrScoreType').value = 'Weight';
      renderLrScoreFields();
      document.getElementById('lrWeight').value = kg;
      document.getElementById('lrWeightUnit').value = 'kg';
    }, { blockId, kg });
    await page.evaluate(() => saveLogResult());
  }

  await logSquatWeight('100');
  await logSquatWeight('90'); // peggiore: non deve sovrascrivere

  const entries = state.massimali.filter((m) => m.movement.toLowerCase() === 'back squat');
  expect(entries.map((e) => e.weight)).toEqual(['100 kg']);
});
