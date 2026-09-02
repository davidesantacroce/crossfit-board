const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

test('rifiuta il salvataggio se una Parte non è compilata', async ({ page }) => {
  await mockBackend(page);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');

  let alertMessage = null;
  page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });

  await page.evaluate(() => {
    switchTab('registra');
    addWorkoutBlock('For Time', '', '');
    editingWodId = null;
  });
  await page.evaluate(() => saveWodSession());
  await page.waitForTimeout(50);

  expect(alertMessage).toContain('non è compilata');
});

test('salva una sessione con RX/Scaled per singola Parte e svuota il form', async ({ page }) => {
  const state = await mockBackend(page);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());

  await page.evaluate(() => {
    switchTab('registra');
    addWorkoutBlock('For Time', 'Fran', '21-15-9 Thruster + Pull-up');
    addWorkoutBlock('Sets', 'Back Squat', '5x5');
    setBlockCategory(blockCounter, 'SCALED'); // solo l'ultima Parte è Scaled
    editingWodId = null;
  });
  await page.evaluate(() => saveWodSession());
  await page.waitForFunction(() => document.querySelectorAll('[id^="workout-block-"]').length === 0);

  expect(state.wods).toHaveLength(1);
  const [saved] = state.wods;
  expect(saved.mode).toBeUndefined(); // RX/Scaled è per blocco, non più un mode di sessione
  expect(saved.blocks.map((b) => b.category)).toEqual(['RX', 'SCALED']);
});
