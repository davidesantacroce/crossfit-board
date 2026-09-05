const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// Le due azioni del blocco ("🏆 Log Result" e "👥 Results") sono gemelle: stessa riga, stessa
// larghezza, stessa altezza. Il vincolo è facile da rompere senza accorgersene, perché basta
// che uno dei due bottoni torni a essere figlio diretto della riga flex: il suo padding+bordo
// si sommerebbe alla sua metà (flex-basis: 0 si risolve sul content box).

async function apriBloccoNuovo(page) {
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9 Thruster + Pull-up'));
}

test('Log Result e Results hanno esattamente la stessa larghezza e la stessa altezza', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriBloccoNuovo(page);

  const logResult = await page.locator('.btn-log-result').boundingBox();
  const results = await page.locator('.btn-community-paired').boundingBox();

  expect(logResult.width).toBe(results.width);
  expect(logResult.height).toBe(results.height);
  expect(logResult.y).toBe(results.y); // affiancati, non uno sopra l'altro
});

test('il bottone Log Result non è più tratteggiato', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriBloccoNuovo(page);

  const stile = await page.evaluate(() => {
    const c = getComputedStyle(document.querySelector('.btn-log-result'));
    return { borderStyle: c.borderTopStyle, borderWidth: c.borderTopWidth };
  });
  expect(stile.borderStyle).toBe('solid');
  expect(stile.borderWidth).toBe('1px'); // stesso spessore del gemello
});

test('l\'etichetta è "Results", corta abbastanza da stare su una riga sola', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriBloccoNuovo(page);

  await expect(page.locator('.btn-community-paired')).toHaveText('👥 Results');
});

test('nelle viste di sola lettura il bottone resta da solo a tutta larghezza', async ({ page }) => {
  const ieri = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: ieri, athlete: 'Test Athlete', blocks: [{ title: 'Grace', type: 'For Time', explanation: '', result: '2:30' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, ieri);

  // Nessuna riga di azioni affiancate qui: non c'è un "Log Result" a cui accoppiarsi.
  await expect(page.locator('#registraDayView .result-actions-row')).toHaveCount(0);
  await expect(page.locator('#registraDayView .community-btn-wrap')).toBeVisible();
  await expect(page.locator('#registraDayView .btn-community-paired')).toHaveCount(0);
});
