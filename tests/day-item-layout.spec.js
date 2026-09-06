const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v67: nella vista giorno il nome del lavoro e il suo punteggio stanno su due righe diverse.
// Prima erano affiancati e il punteggio, che non andava a capo, si prendeva tutta la larghezza
// che gli serviva: al nome restava una colonna strettissima, si spezzava in verticale una
// lettera per riga e i due testi finivano per sovrapporsi (segnalato con "Back Squat" scritto
// sopra "100/100/110/110/... kg").

const OGGI = new Date().toISOString().slice(0, 10);

const LUNGO = 'Power Snatch + Snatch';
const CARICHI = '100/100/110/110/110/110/110/110 kg';

const wod = (id, order, title, type, result) => ({
  id, date: OGGI, athlete: 'Test Athlete', mode: 'PRIVATE', order,
  blocks: [{ title, type, explanation: 'testo del wod', category: '', result }],
});

async function apriGiorno(page, wods) {
  await page.setViewportSize({ width: 390, height: 1200 }); // telefono: il caso segnalato
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('registra'));
}

const siSovrappongono = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('nome e punteggio non si sovrappongono, nemmeno con un punteggio lunghissimo', async ({ page }) => {
  await apriGiorno(page, [
    wod('a', 0, LUNGO, 'Sets', '44/44/48/48/52/52/53 kg'),
    wod('b', 1, 'Back Squat', 'EMOM', CARICHI),
  ]);

  const cards = page.locator('#registraDayView .day-item');
  await expect(cards).toHaveCount(2);

  for (const i of [0, 1]) {
    const titolo = await cards.nth(i).locator('.day-item-title').boundingBox();
    const punteggio = await cards.nth(i).locator('.day-item-score').boundingBox();
    expect(siSovrappongono(titolo, punteggio)).toBe(false);
    // Il punteggio comincia dove il nome è finito: righe diverse, non affiancate.
    expect(punteggio.y).toBeGreaterThanOrEqual(titolo.y + titolo.height - 1);
  }
});

test('il nome sta su una riga sola: non gli resta una colonna stretta', async ({ page }) => {
  // Due lavori, così le card restano chiuse e il punteggio riassunto c'è davvero: è lui che
  // prima si portava via la larghezza del nome.
  await apriGiorno(page, [wod('a', 0, LUNGO, 'Sets', CARICHI), wod('b', 1, 'Back Squat', 'EMOM', '1:00')]);

  const prima = page.locator('#registraDayView .day-item').first();
  const head = await prima.locator('.day-item-head').boundingBox();
  const titolo = await prima.locator('.day-item-title').boundingBox();

  // Prima il punteggio affiancato lasciava al nome meno di un terzo della riga.
  expect(titolo.width).toBeGreaterThan(head.width * 0.6);
  // E lo spezzava una parola (a volte una lettera) per riga: qui ci sta su una riga sola.
  expect(titolo.height).toBeLessThan(40);
});

// Con un lavoro solo la card si apre da sola (e da aperta il riassunto non si mostra), quindi
// questi due partono da una giornata con due lavori, che restano chiusi.

test('un punteggio più largo dello schermo va a capo invece di sbordare dalla card', async ({ page }) => {
  // Un EMOM lungo: da solo su una riga sarebbe piu' largo della card, quindi deve andare a capo
  // (prima aveva white-space: nowrap e sbordava).
  const moltoLungo = Array(16).fill('110').join('/') + ' kg';
  await apriGiorno(page, [wod('a', 0, LUNGO, 'Sets', '1:00'), wod('b', 1, 'Back Squat', 'EMOM', moltoLungo)]);

  const cardBackSquat = page.locator('#registraDayView .day-item').nth(1);
  const card = await cardBackSquat.boundingBox();
  const punteggio = await cardBackSquat.locator('.day-item-score').boundingBox();
  const unaRiga = await cardBackSquat.locator('.day-item-title').boundingBox();

  expect(punteggio.x + punteggio.width).toBeLessThanOrEqual(card.x + card.width + 1);
  expect(punteggio.height).toBeGreaterThan(unaRiga.height); // più di una riga: è andato a capo
});

test('aprendo la card il punteggio riassunto sparisce, come prima', async ({ page }) => {
  await apriGiorno(page, [wod('a', 0, LUNGO, 'Sets', CARICHI), wod('b', 1, 'Back Squat', 'EMOM', '1:00')]);

  const prima = page.locator('#registraDayView .day-item').first();
  await expect(prima.locator('.day-item-score')).toBeVisible();
  await prima.locator('.day-item-head').click();
  await expect(prima.locator('.day-item-score')).toHaveCount(0);
});
