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

  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(0);

  await page.getByText('+ Aggiungi Lavoro').click();
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(1);
});
