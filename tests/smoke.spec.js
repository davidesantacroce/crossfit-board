const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

test('l\'app si carica senza errori in console', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await mockBackend(page);
  await gotoApp(page);

  expect(errors).toEqual([]);
  await expect(page.locator('.nav button', { hasText: 'REGISTRA' })).toBeVisible();
});

test('Registra parte senza nessuna Parte precompilata', async ({ page }) => {
  await mockBackend(page);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => switchTab('registra'));

  // Oggi mostra di default la vista di sola lettura (vedi one-workout-at-a-time in registra.spec.js):
  // bisogna prima aprire esplicitamente il form per un nuovo allenamento.
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();

  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(0);

  await page.getByText('+ Aggiungi Lavoro').click();
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(1);
});
