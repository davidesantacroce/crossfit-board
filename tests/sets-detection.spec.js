const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// WOD segnalato dall'utente: 4 set (uno per riga, ciascuno prefissato da "1x") con range di
// percentuale ("@60-65% 1RM") invece di un singolo numero.
const BACK_SQUAT_EXPLANATION = `1x 3 Position Back Squat @60-65% 1RM
Back Squat
1x 3 Position Back Squat @60-65% 1RM
Back Squat
1x 3 Position Back Squat @70-73% 1RM
Back Squat
1x 3 Position Back Squat @70-73% 1RM
Back Squat
-rest 2 min between sets-
*3 positions are Just Above Parallel, Parallel, In
The Hole.`;

async function apriLogResultSuSets(page, explanation) {
  await page.evaluate((expl) => {
    addWorkoutBlock('Sets', '3 Position Back Squat A', expl);
    openLogResultModal(1);
  }, explanation);
}

test('rileva i 4 set (non 1) e riconosce il Back Squat, proponendo il peso dal massimale', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    massimali: [{ athlete: 'Test Athlete', movement: 'Back Squat', weight: 100, date: '2026-08-01' }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriLogResultSuSets(page, BACK_SQUAT_EXPLANATION);

  await expect(page.locator('#lrDetectedSetsHint')).toContainText('4 set x 3 reps');
  await expect(page.locator('#lrScoreType')).toHaveValue('Weight');
  await expect(page.locator('.lr-perset-row')).toHaveCount(4);
  await expect(page.locator('#logResultModal .suggested-weight-hint')).toContainText('Back Squat');
  await expect(page.locator('#logResultModal .suggested-weight-hint')).toContainText('100');

  // 60-65% e 70-73%: il peso proposto usa la media del range (62.5% e 71.5% di 100).
  const values = await page.locator('.lr-perset-row .lr-perset-input-wrap input').all();
  await expect(values[0]).toHaveValue('62.5');
  await expect(values[1]).toHaveValue('62.5');
  await expect(values[2]).toHaveValue('71.5');
  await expect(values[3]).toHaveValue('71.5');
});

test('senza massimale per Back Squat mostra l\'avviso invece del peso proposto', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriLogResultSuSets(page, BACK_SQUAT_EXPLANATION);

  await expect(page.locator('#logResultModal .missing-max-hint')).toContainText('Back Squat');
  await expect(page.locator('.lr-perset-row')).toHaveCount(4);
});

test('+ Aggiungi Set aggiunge una riga senza perdere i pesi già inseriti', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriLogResultSuSets(page, BACK_SQUAT_EXPLANATION);

  await page.locator('.lr-perset-row').nth(0).locator('input').fill('61');
  await page.getByRole('button', { name: '+ Aggiungi Set' }).click();

  await expect(page.locator('.lr-perset-row')).toHaveCount(5);
  await expect(page.locator('.lr-perset-row').nth(0).locator('input')).toHaveValue('61');
  await expect(page.locator('.lr-perset-row').nth(4)).toContainText('Set 5');
  await expect(page.locator('.lr-perset-row').nth(4).locator('input')).toHaveValue('');
});

test('rimuovere un set toglie la riga giusta e non si scende sotto 1 set', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriLogResultSuSets(page, BACK_SQUAT_EXPLANATION);

  await page.locator('.lr-perset-row').nth(0).locator('input').fill('60');
  await page.locator('.lr-perset-row').nth(2).locator('input').fill('70');

  // Rimuove il Set 2 (indice 1): restano Set 1 (60) e quello che era Set 3 (70), rinumerato Set 2.
  await page.locator('.lr-perset-row').nth(1).locator('.lr-perset-remove-btn').click();
  await expect(page.locator('.lr-perset-row')).toHaveCount(3);
  await expect(page.locator('.lr-perset-row').nth(0).locator('input')).toHaveValue('60');
  await expect(page.locator('.lr-perset-row').nth(1)).toContainText('Set 2');
  await expect(page.locator('.lr-perset-row').nth(1).locator('input')).toHaveValue('70');

  // Rimuove finché resta un solo set: il tasto rimuovi si disabilita, non si arriva a 0.
  await page.locator('.lr-perset-row').nth(0).locator('.lr-perset-remove-btn').click();
  await page.locator('.lr-perset-row').nth(0).locator('.lr-perset-remove-btn').click();
  await expect(page.locator('.lr-perset-row')).toHaveCount(1);
  await expect(page.locator('.lr-perset-row').nth(0).locator('.lr-perset-remove-btn')).toBeDisabled();
});
