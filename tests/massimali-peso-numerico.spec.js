const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v78: il Foglio restituisce il peso di un massimale come NUMERO quando la cella è numerica
// (80) e come stringa quando non lo è ("3:59"). Il codice lo trattava sempre come testo e
// chiamava .trim() sul valore salvato: con un numero saltava con un TypeError a metà del
// salvataggio, senza avviso e senza scrivere niente. Caso reale: lo Snatch a 80 kg che non si
// aggiornava. I test usavano pesi come stringa, quindi non lo vedevano.

const SNATCH = 'Snatch (Strappo)';

async function apriAtleta(page, massimali) {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    massimali,
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('atleta'));
  return state;
}

const campo = (page, movimento) => page.locator(`.rm-weight[data-movement="${movimento}"]`);

test('un massimale con peso numerico si aggiorna, come quelli con peso testuale', async ({ page }) => {
  const errori = [];
  page.on('pageerror', (e) => errori.push(e.message));

  // Esattamente la forma che arriva dal Foglio: numero, e data vuota sulle righe vecchie.
  const state = await apriAtleta(page, [
    { athlete: 'Test Athlete', movement: SNATCH, weight: 80, date: '' },
  ]);
  page.on('dialog', (d) => d.accept());

  await expect(campo(page, SNATCH)).toHaveValue('80');
  await campo(page, SNATCH).fill('85');
  await page.evaluate(() => saveMassimaliCloud());

  await expect.poll(() => state.massimali.length).toBe(2);
  expect(state.massimali[1]).toMatchObject({ movement: SNATCH, weight: '85' });
  expect(errori).toEqual([]);
});

test('un peso numerico identico a quello salvato non rimanda niente', async ({ page }) => {
  const state = await apriAtleta(page, [
    { athlete: 'Test Athlete', movement: SNATCH, weight: 80, date: '' },
  ]);
  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });

  await campo(page, SNATCH).fill('80');
  await page.evaluate(() => saveMassimaliCloud());
  await page.waitForTimeout(200);

  expect(messaggio).toContain('Nessuna modifica');
  expect(state.massimali).toHaveLength(1);
});

test('un benchmark a tempo (peso testuale) continua a funzionare', async ({ page }) => {
  const FRAN = 'Fran (21-15-9 Thruster 43/30kg + Pull-up)';
  const state = await apriAtleta(page, [
    { athlete: 'Test Athlete', movement: FRAN, weight: '3:59', date: '' },
  ]);
  page.on('dialog', (d) => d.accept());

  await expect(campo(page, FRAN)).toHaveValue('3:59');
  await campo(page, FRAN).fill('3:45');
  await page.evaluate(() => saveMassimaliCloud());

  await expect.poll(() => state.massimali.length).toBe(2);
  expect(state.massimali[1]).toMatchObject({ movement: FRAN, weight: '3:45' });
});

test('se il salvataggio fallisce lo dice, invece di annunciare un successo', async ({ page }) => {
  const state = await apriAtleta(page, [
    { athlete: 'Test Athlete', movement: SNATCH, weight: 80, date: '' },
  ]);
  // Il backend rifiuta la scrittura.
  await page.route('**/macros/**', async (route) => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 500, body: 'ko' });
    return route.fallback();
  });

  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await campo(page, SNATCH).fill('85');
  await page.evaluate(() => saveMassimaliCloud());
  await page.waitForTimeout(300);

  expect(messaggio).toContain('Non sono riuscito a salvare');
  expect(messaggio).toContain(SNATCH);
  expect(state.massimali).toHaveLength(1);
});
