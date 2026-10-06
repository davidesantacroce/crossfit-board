const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// Regressione: un risultato Time con molti split per set non deve allargare la card su telefono.
const OGGI = new Date().toISOString().slice(0, 10);
const SPLIT = Array.from({ length: 16 }, (_, i) => `2:${String(30 + (i % 20)).padStart(2, '0')}`);
const SCORE_LUNGO = `40:00 (${SPLIT.join('/')})`;

const wod = {
  id: 'perset-wrap',
  date: OGGI,
  athlete: 'Test Athlete',
  mode: 'PRIVATE',
  order: 0,
  blocks: [{
    title: 'Long interval test',
    type: 'Sets',
    explanation: '16 Sets\nWork hard\nRest as needed',
    category: '',
    result: SCORE_LUNGO,
  }],
};

async function apriApp(page) {
  await page.setViewportSize({ width: 390, height: 1200 });
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [wod],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
}

async function expectDentroLaCard(locator, card) {
  const misura = await locator.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  const cardBox = await card.boundingBox();
  const scoreBox = await locator.boundingBox();

  expect(misura.scrollWidth).toBeLessThanOrEqual(misura.clientWidth + 1);
  expect(scoreBox.x + scoreBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
  // Con 16 split su 390 px il testo deve occupare più di una riga.
  expect(misura.scrollHeight).toBeGreaterThan(18);
}

test('nella vista giorno aperta gli split lunghi vanno a capo dentro la card', async ({ page }) => {
  await apriApp(page);
  await page.evaluate(() => switchTab('registra'));

  const card = page.locator('#registraDayView .day-item').first();
  await expect(card).toBeVisible();

  const score = card.locator('.day-item-detail-score');
  await expect(score).toContainText('40:00');
  await expectDentroLaCard(score, card);
});

test('nello Storico gli split lunghi vanno a capo dentro la card', async ({ page }) => {
  await apriApp(page);
  await page.evaluate(() => switchTab('storico'));

  const card = page.locator('#historyList .history-item').first();
  const score = card.locator('.history-item-score');

  await expect(score).toContainText('40:00');
  await expectDentroLaCard(score, card);
});
