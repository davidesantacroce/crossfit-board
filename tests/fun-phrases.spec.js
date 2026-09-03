const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

async function apriImpostazioni(page) {
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('impostazioni'));
}

test('aggiunge una frase e la mostra nell\'elenco, attribuita a chi l\'ha scritta', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriImpostazioni(page);

  // Frase non già inclusa nell'app, altrimenti scatterebbe (giustamente) il controllo
  // sui doppioni.
  await page.fill('#newFunPhrase', 'Il coach ti guarda male');
  await page.getByRole('button', { name: 'AGGIUNGI FRASE' }).click();

  await expect(page.locator('#funPhrasesList')).toContainText('Il coach ti guarda male');
  await expect(page.locator('#funPhrasesList')).toContainText('aggiunta da Test Athlete');
  expect(state.funPhrases).toHaveLength(1);
  await expect(page.locator('#newFunPhrase')).toHaveValue(''); // il campo si svuota
});

test('la frase aggiunta entra nell\'estrazione dell\'overlay', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    funPhrases: [{ id: 'p1', text: 'Sei un finto modesto', athlete: 'Mario' }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());

  const frasi = await page.evaluate(() => allFunPhrases());
  expect(frasi).toContain('Sei un finto modesto');
  // Le frasi incluse nell'app restano comunque disponibili.
  expect(frasi.length).toBeGreaterThan(1);
});

test('rifiuta una frase duplicata, anche se coincide con una inclusa nell\'app', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriImpostazioni(page);

  const inclusa = await page.evaluate(() => FUN_LOADING_MESSAGES[0]);
  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await page.fill('#newFunPhrase', `  ${inclusa.toUpperCase()}  `);
  await page.getByRole('button', { name: 'AGGIUNGI FRASE' }).click();
  await page.waitForTimeout(150);

  expect(messaggio).toContain("c'è già");
  expect(state.funPhrases).toHaveLength(0);
});

test('rifiuta una frase vuota', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriImpostazioni(page);

  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await page.fill('#newFunPhrase', '   ');
  await page.getByRole('button', { name: 'AGGIUNGI FRASE' }).click();
  await page.waitForTimeout(150);

  expect(messaggio).toContain('Scrivi prima la frase');
  expect(state.funPhrases).toHaveLength(0);
});

test('elimina una frase, previa conferma', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    funPhrases: [{ id: 'p1', text: 'Frase da buttare', athlete: 'Mario' }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriImpostazioni(page);
  await expect(page.locator('#funPhrasesList')).toContainText('Frase da buttare');

  page.once('dialog', (d) => d.accept());
  await page.locator('#funPhrasesList .btn-delete-history').click();

  await expect(page.locator('#funPhrasesList')).not.toContainText('Frase da buttare');
  expect(state.funPhrases).toHaveLength(0);
});

test('annullando la conferma la frase resta', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    funPhrases: [{ id: 'p1', text: 'Frase da tenere', athlete: 'Mario' }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriImpostazioni(page);

  page.once('dialog', (d) => d.dismiss());
  await page.locator('#funPhrasesList .btn-delete-history').click();
  await page.waitForTimeout(150);

  await expect(page.locator('#funPhrasesList')).toContainText('Frase da tenere');
  expect(state.funPhrases).toHaveLength(1);
});

test('senza frasi aggiunte lo dice, ricordando che quelle incluse ci sono', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriImpostazioni(page);

  await expect(page.locator('#funPhrasesList')).toContainText('Nessuna frase aggiunta');
});
