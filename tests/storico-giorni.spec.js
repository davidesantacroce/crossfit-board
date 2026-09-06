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

// --- v65: nello storico ogni lavoro ha la sua card, anche dentro una riga vecchia multi-Parte ---

test('una riga con più lavori diventa una card per lavoro', async ({ page }) => {
  await apriStorico(page, [
    { id: 'v1', date: giorniFa(1), athlete: 'Test Athlete', blocks: [
      { title: 'A. Back Squat', type: 'Sets', explanation: '5x5', result: '110 kg', category: 'RX' },
      { title: 'B. Fran', type: 'For Time', explanation: '21-15-9', result: '4:30', category: 'RX' },
    ] },
    wod('s1', 1, 'C. Cindy', '18 rounds'),
  ]);

  // Tre lavori, tre card: non si accorpa più niente.
  await expect(page.locator('#historyList .history-item')).toHaveCount(3);
  await expect(page.locator('#historyList .day-group-count')).toHaveText('3 allenamenti');
  await expect(page.locator('#historyList')).toContainText('A. Back Squat');
  await expect(page.locator('#historyList')).toContainText('B. Fran');
  await expect(page.locator('#historyList')).toContainText('C. Cindy');

  // Ogni card ha il suo punteggio, non un elenco di punteggi tutti insieme.
  const cardFran = page.locator('#historyList .history-item').filter({ hasText: 'B. Fran' });
  await expect(cardFran).toContainText('4:30');
  await expect(cardFran).not.toContainText('110 kg');
});

test('sui lavori che condividono una riga, Elimina lascia il posto a Spacchetta', async ({ page }) => {
  await apriStorico(page, [
    { id: 'v1', date: giorniFa(1), athlete: 'Test Athlete', blocks: [
      { title: 'A', type: 'Sets', explanation: '', result: '' },
      { title: 'B', type: 'For Time', explanation: '', result: '' },
    ] },
    wod('s1', 1, 'Singolo', '1:00'),
  ]);

  // Cancellarne uno cancellerebbe anche l'altro: al suo posto c'è Spacchetta, e la card lo dice.
  // Regex (case-sensitive): con una stringa, hasText ignora le maiuscole e "A (" pescherebbe
  // anche "riga (lavoro 1 di 2)" della nota, finendo su due card.
  const cardA = page.locator('#historyList .history-item').filter({ hasText: /A \(Sets\)/ });
  await expect(cardA.getByRole('button', { name: /Spacchetta in 2/ })).toBeVisible();
  await expect(cardA.getByRole('button', { name: /Elimina/ })).toHaveCount(0);
  await expect(cardA).toContainText('Salvato insieme ad altri 1 lavori');

  // Il lavoro che sta da solo sulla sua riga tiene Elimina.
  const cardSingola = page.locator('#historyList .history-item').filter({ hasText: 'Singolo' });
  await expect(cardSingola.getByRole('button', { name: /Elimina/ })).toBeVisible();
  await expect(cardSingola.getByRole('button', { name: /Spacchetta/ })).toHaveCount(0);
});
