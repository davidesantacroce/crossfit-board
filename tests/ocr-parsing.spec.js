const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

test('ripulisce la "O" isolata (cerchietto OCR) senza toccare parole vere come OHS', async ({ page }) => {
  await mockBackend(page);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');

  const result = await page.evaluate(() => {
    switchTab('registra');
    addWorkoutBlock();
    const id = blockCounter;
    const titleFor = (text) => {
      parseAndFillBlock(id, text);
      return document.querySelector(`#workout-block-${id} .block-title`).value;
    };
    return {
      circle: titleFor('O Superset 1\nO Power Snatch + Snatch\n3x5 @70% 1RM'),
      circleOnOwnLine: titleFor('O\nSuperset 1\nRow 500m'),
      ohsPreserved: titleFor('OHS 3x5\n@70% 1RM'),
      overheadPreserved: titleFor('Overhead Press\n5x5'),
    };
  });

  expect(result.circle).toBe('Superset 1');
  expect(result.circleOnOwnLine).toBe('Superset 1');
  expect(result.ohsPreserved).toBe('OHS 3x5');
  expect(result.overheadPreserved).toBe('Overhead Press');
});
