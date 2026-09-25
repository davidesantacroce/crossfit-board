const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v79: i valori passati a una funzione dentro un attributo onclick venivano interpolati grezzi.
// Una virgoletta doppia nel testo CHIUDE l'attributo, e il bottone smette di funzionare.
// Caso segnalato: il WOD «"Miracles happen every day." ?», di cui non si apriva la finestra
// Risultati. Sul Foglio vero ci sono diversi titoli così, copiati dalla programmazione.

function shift(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const OGGI = shift(0);
const IERI = shift(-1);

// I due casi veri presi dal Foglio: virgolette doppie, e un apostrofo tipografico.
const TITOLO = '"Miracles happen every day." ?';
const TITOLO_APOSTROFO = "Hook 'em Horns A";

const sessione = (id, date, title) => ({
  id, date, athlete: 'Test Athlete',
  blocks: [{ title, type: 'Sets', explanation: '3 sets', result: '60 kg', category: 'RX' }],
});

async function apri(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
}

test('dallo Storico si aprono i Risultati di un WOD con le virgolette nel titolo', async ({ page }) => {
  const errori = [];
  page.on('pageerror', (e) => errori.push(e.message));
  await apri(page, [sessione('w1', IERI, TITOLO)]);
  await page.evaluate(() => switchTab('storico'));

  const card = page.locator('#historyList .history-item').first();
  await expect(card.locator('.history-item-title')).toHaveText(TITOLO);

  await card.getByRole('button', { name: /Risultati/ }).click();
  await expect(page.locator('#communityResultsModal')).toHaveClass(/active/);
  await expect(page.locator('#communityResultsTitle')).toContainText('MIRACLES HAPPEN EVERY DAY');
  expect(errori).toEqual([]);
});

test('lo stesso dalla vista giorno', async ({ page }) => {
  await apri(page, [sessione('w1', OGGI, TITOLO)]);
  await page.evaluate(() => switchTab('registra'));

  await page.locator('#registraDayView').getByRole('button', { name: /Risultati/ }).click();
  await expect(page.locator('#communityResultsModal')).toHaveClass(/active/);
  await expect(page.locator('#communityResultsTitle')).toContainText('MIRACLES HAPPEN EVERY DAY');
});

test('un apostrofo nel titolo continua a funzionare', async ({ page }) => {
  await apri(page, [sessione('w1', IERI, TITOLO_APOSTROFO)]);
  await page.evaluate(() => switchTab('storico'));

  await page.locator('#historyList .history-item').first().getByRole('button', { name: /Risultati/ }).click();
  await expect(page.locator('#communityResultsTitle')).toContainText("HOOK 'EM HORNS A");
});

test('anche Modifica resta cliccabile su quella card', async ({ page }) => {
  // Non regressione: il parser HTML si riprende da un attributo chiuso male, quindi gli altri
  // bottoni funzionavano anche prima — ma il titolo passa ora dallo stesso helper, e questo
  // verifica che continuino a funzionare e che arrivi intatto nel form.
  const errori = [];
  page.on('pageerror', (e) => errori.push(e.message));
  await apri(page, [sessione('w1', IERI, TITOLO)]);
  await page.evaluate(() => switchTab('storico'));

  const card = page.locator('#historyList .history-item').first();
  await card.getByRole('button', { name: /Modifica/ }).click();
  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('.block-title')).toHaveValue(TITOLO);
  expect(errori).toEqual([]);
});

test('jsArg regge virgolette, apostrofi, backslash e a capo', async ({ page }) => {
  await apri(page, []);
  const reso = await page.evaluate(() => {
    const brutto = `virgo"letta ' apostrofo \\ backslash\nea capo`;
    const div = document.createElement('div');
    div.innerHTML = `<button onclick="window.__ricevuto = ${jsArg(brutto)}">x</button>`;
    document.body.appendChild(div);
    div.querySelector('button').click();
    const out = window.__ricevuto;
    div.remove();
    return { out, atteso: brutto };
  });
  expect(reso.out).toBe(reso.atteso);
});
