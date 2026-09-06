const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v66: nella card dello storico il nome del WOD sta su una riga tutta sua. Prima la divideva
// con il badge della categoria e con il tipo fra parentesi, e su telefono un nome un po' lungo
// veniva schiacciato: il punteggio ha la sua riga, il nome pure.

function oggi() {
  return new Date().toISOString().slice(0, 10);
}

const LUNGO = 'A. Back Squat pesante';

async function apriStorico(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('storico'));
}

const wodFran = {
  id: 'w1', date: oggi(), athlete: 'Test Athlete', mode: 'PRIVATE', blocks: [
    { title: LUNGO, type: 'Sets', explanation: '5x5 @75%', category: 'STRENGTH', result: '100kg' },
  ],
};

test('il nome del WOD ha una riga sua, senza categoria né tipo attaccati', async ({ page }) => {
  await apriStorico(page, [wodFran]);

  const titolo = page.locator('#historyList .history-item-title');
  await expect(titolo).toHaveCount(1);
  // Esattamente il nome: niente "(Sets)" in coda, niente "STRENGTH" davanti.
  await expect(titolo).toHaveText(LUNGO);

  // Categoria e tipo esistono ancora, ma su una riga di dettaglio a parte.
  const meta = page.locator('#historyList .history-item-meta');
  await expect(meta).toContainText('STRENGTH');
  await expect(meta).toContainText('Sets');
});

test('nome e punteggio stanno su due righe diverse', async ({ page }) => {
  await apriStorico(page, [wodFran]);

  const titolo = page.locator('#historyList .history-item-title');
  const score = page.locator('#historyList .history-item-score');
  await expect(score).toHaveText('Score: 100kg');

  const rigaTitolo = await titolo.boundingBox();
  const rigaScore = await score.boundingBox();
  // Il punteggio comincia dove il nome è già finito: righe separate, non affiancate.
  expect(rigaScore.y).toBeGreaterThanOrEqual(rigaTitolo.y + rigaTitolo.height);
});

test('un WOD senza categoria né tipo non lascia una riga di dettaglio vuota', async ({ page }) => {
  await apriStorico(page, [
    { id: 'w2', date: oggi(), athlete: 'Test Athlete', mode: 'PRIVATE', blocks: [
      { title: 'Solo il nome', type: '', explanation: '', result: '' },
    ] },
  ]);

  await expect(page.locator('#historyList .history-item-title')).toHaveText('Solo il nome');
  await expect(page.locator('#historyList .history-item-meta')).toHaveCount(0);
});
