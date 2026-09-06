const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v62: lo Storico raggruppa per giornata, come la bacheca. L'elenco è lungo mesi: si vedono i
// giorni e si apre quello che interessa.

function giorniFa(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const wod = (id, giorni, titolo, risultato = '') => ({
  id, date: giorniFa(giorni), athlete: 'Test Athlete',
  blocks: [{ title: titolo, type: 'For Time', explanation: `testo di ${titolo}`, result: risultato, category: 'RX' }],
});

async function apriStorico(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('storico'));
}

const TRE_GIORNI = [wod('a1', 1, 'Fran', '4:30'), wod('a2', 1, 'Grace', '2:30'), wod('b1', 3, 'Cindy', '18 rounds'), wod('c1', 8, 'Murph', '52:00')];

test('gli allenamenti sono raggruppati per giornata, con il conteggio', async ({ page }) => {
  await apriStorico(page, TRE_GIORNI);

  await expect(page.locator('#historyList .day-group')).toHaveCount(3);
  await expect(page.locator('#historyList .day-group-count').first()).toHaveText('2 allenamenti');
  await expect(page.locator('#historyList .day-group-count').nth(1)).toHaveText('1 allenamento');
});

test('è aperto il giorno più recente, gli altri sono chiusi', async ({ page }) => {
  await apriStorico(page, TRE_GIORNI);

  const corpi = page.locator('#historyList .day-group-body');
  await expect(corpi.nth(0)).toBeVisible();
  await expect(corpi.nth(1)).toBeHidden();
  await expect(corpi.nth(2)).toBeHidden();
  await expect(corpi.nth(0)).toContainText('Fran');
});

test('toccando una giornata si apre e si richiude', async ({ page }) => {
  await apriStorico(page, TRE_GIORNI);
  const seconda = page.locator('#historyList .day-group').nth(1);

  await seconda.locator('.day-group-head').click();
  await expect(seconda.locator('.day-group-body')).toBeVisible();
  await expect(seconda.locator('.day-group-body')).toContainText('Cindy');

  await seconda.locator('.day-group-head').click();
  await expect(seconda.locator('.day-group-body')).toBeHidden();
});

test('cercando si aprono i giorni che contengono i risultati', async ({ page }) => {
  await apriStorico(page, TRE_GIORNI);

  // Murph è nel giorno più vecchio, che di default è chiuso.
  await page.locator('#searchWod').fill('murph');
  await expect(page.locator('#historyList .day-group')).toHaveCount(1);
  await expect(page.locator('#historyList .day-group-body')).toBeVisible();
  await expect(page.locator('#historyList')).toContainText('Murph', { useInnerText: true });

  // Svuotando la ricerca si torna al comportamento normale.
  await page.locator('#searchWod').fill('');
  await expect(page.locator('#historyList .day-group')).toHaveCount(3);
});
