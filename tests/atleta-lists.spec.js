const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v51: i due elenchi del tab ATLETA (33 massimali + 28 benchmark) non sono più sempre tutti
// aperti: di default mostrano solo le voci compilate, la ricerca trova anche le altre.

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const CON_MASSIMALI = {
  athletes: [{ name: 'Test Athlete', hasPin: false }],
  massimali: [
    { athlete: 'Test Athlete', movement: 'Back Squat', weight: '140', date: daysAgo(20) },
    { athlete: 'Test Athlete', movement: 'Deadlift (Stacco)', weight: '180', date: daysAgo(30) },
  ],
};

async function apriAtleta(page) {
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('atleta'));
}

const nomiVisibili = (page, containerId) =>
  page.evaluate((id) => Array.from(document.querySelectorAll(`#${id} .rm-row > span:first-child`)).map((e) => e.innerText), containerId);

test('di default si vedono solo le voci già compilate, non tutte e 33', async ({ page }) => {
  await mockBackend(page, CON_MASSIMALI);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  expect(await nomiVisibili(page, 'rmContainer')).toEqual(['Back Squat', 'Deadlift (Stacco)']);
  await expect(page.locator('#rmToggleAll')).toHaveText('Mostra tutti (33)');
});

test('la ricerca trova anche una voce mai compilata', async ({ page }) => {
  await mockBackend(page, CON_MASSIMALI);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  await page.locator('#rmSearch').fill('snatch');
  const nomi = await nomiVisibili(page, 'rmContainer');
  expect(nomi).toContain('Snatch (Strappo)');   // mai compilata, ma cercabile
  expect(nomi).not.toContain('Back Squat');
  await expect(page.locator('#rmToggleAll')).toBeHidden(); // cercando, il bottone non serve

  await page.locator('#rmSearch').fill('qualcosa che non esiste');
  await expect(page.locator('#rmEmptyHint')).toContainText('Nessuna voce trovata');
});

test('"mostra tutti" apre l\'elenco intero e si torna indietro', async ({ page }) => {
  await mockBackend(page, CON_MASSIMALI);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriAtleta(page);

  await page.locator('#rmToggleAll').click();
  expect(await page.locator('#rmContainer .rm-row').count()).toBe(33);
  await expect(page.locator('#rmToggleAll')).toHaveText('Mostra solo i compilati (2)');

  await page.locator('#rmToggleAll').click();
  expect(await page.locator('#rmContainer .rm-row').count()).toBe(2);
});

test('un valore digitato e poi nascosto da una ricerca viene salvato lo stesso', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await apriAtleta(page);

  await page.locator('#rmSearch').fill('back squat');
  await page.locator('#rmContainer .rm-weight').first().fill('150');

  // Cambiando ricerca la riga sparisce dalla vista: il valore però non è ancora salvato.
  await page.locator('#rmSearch').fill('snatch');
  expect(await nomiVisibili(page, 'rmContainer')).not.toContain('Back Squat');

  await page.getByRole('button', { name: 'SALVA MASSIMALI' }).click();
  await expect.poll(() => state.massimali.length).toBe(1);
  expect(state.massimali[0]).toMatchObject({ movement: 'Back Squat', weight: '150' });

  // E tornando a cercarla, il valore c'è.
  await page.locator('#rmSearch').fill('back squat');
  await expect(page.locator('#rmContainer .rm-weight').first()).toHaveValue('150');
});

test('non si rimandano valori identici a quelli già salvati', async ({ page }) => {
  const state = await mockBackend(page, CON_MASSIMALI);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  let messaggio = null;
  page.on('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await apriAtleta(page);

  await page.getByRole('button', { name: 'SALVA MASSIMALI' }).click();
  await expect.poll(() => messaggio).toContain('Nessuna modifica');
  expect(state.massimali).toHaveLength(2); // solo i due di partenza
});
