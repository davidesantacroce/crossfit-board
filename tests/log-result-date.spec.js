const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v70: nel Log Result il giorno dell'allenamento è un campo, con oggi come default. Prima il
// risultato di una sessione nuova veniva SEMPRE datato oggi (anche registrando il recupero di un
// giorno passato), e la sessione prendeva in silenzio il giorno su cui era rimasto il calendario:
// è così che un lavoro di lunedì è finito salvato sul giovedì precedente.

function shift(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const OGGI = shift(0);
const IERI = shift(-1);
const DOMANI = shift(1);

async function apriForm(page) {
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9'));
  await page.evaluate(() => openLogResultModal(blockCounter));
}

async function compilaTempo(page, minuti, secondi) {
  await page.evaluate(() => { document.getElementById('lrScoreType').value = 'Time'; renderLrScoreFields(); });
  await page.locator('#lrTimeMin').fill(String(minuti));
  await page.locator('#lrTimeSec').fill(String(secondi));
}

test('il campo data parte da oggi', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriForm(page);

  await expect(page.locator('#lrDate')).toHaveValue(OGGI);
  await expect(page.locator('#lrDateHint')).toHaveText('');
  // Un risultato non può riferirsi a un allenamento non ancora svolto.
  await expect(page.locator('#lrDate')).toHaveAttribute('max', OGGI);
});

test('scegliendo un altro giorno la card lo dice, e il risultato ci finisce sopra', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriForm(page);

  await page.locator('#lrDate').fill(IERI);
  await page.locator('#lrDate').dispatchEvent('change');
  await expect(page.locator('#lrDateHint')).toContainText('non su oggi');

  await compilaTempo(page, 7, 42);
  await page.evaluate(() => saveLogResult());
  await expect.poll(() => state.results.length).toBe(1);

  expect(state.results[0].date).toBe(IERI);
});

test('anche la sessione si sposta sul giorno scelto: risultato e allenamento non si separano', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await apriForm(page);

  await page.locator('#lrDate').fill(IERI);
  await compilaTempo(page, 7, 42);
  await page.evaluate(() => saveLogResult());
  await expect.poll(() => state.results.length).toBe(1);

  // Il form resta aperto sul giorno scelto e lo dice.
  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('#pastDayBannerText')).toContainText('STAI REGISTRANDO');
  await expect(page.locator('#saveWodBtn')).toContainText("SALVA L'ALLENAMENTO DEL");

  await page.evaluate(() => saveWodSession());
  await expect.poll(() => state.wods.length).toBe(1);
  expect(state.wods[0].date).toBe(IERI); // la stessa data del risultato, non oggi
});

test('rifiuta un giorno futuro', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriForm(page);

  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await page.locator('#lrDate').fill(DOMANI);
  await compilaTempo(page, 7, 42);
  await page.evaluate(() => saveLogResult());
  await page.waitForTimeout(100);

  expect(messaggio).toContain('giorno futuro');
  expect(state.results).toHaveLength(0);
});

test('riaprendo il risultato già loggato il campo mostra la sua data, non oggi', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriForm(page);

  await page.locator('#lrDate').fill(IERI);
  await compilaTempo(page, 7, 42);
  await page.evaluate(() => saveLogResult());

  await page.evaluate(() => openLogResultModal(blockCounter));
  await expect(page.locator('#lrDate')).toHaveValue(IERI);
});

test('sul tasto SALVA si legge il giorno anche senza loggare un risultato', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();

  await expect(page.locator('#saveWodBtn')).toContainText("SALVA L'ALLENAMENTO DI OGGI");

  await page.evaluate((d) => selectCalendarDate(d), IERI);
  await page.getByRole('button', { name: /\+ Registra un allenamento per questo giorno/ }).click();
  const [y, m, gg] = IERI.split('-');
  await expect(page.locator('#saveWodBtn')).toContainText(`${gg}/${m}/${y}`);
});
