const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v51: lo storico segue la data dell'allenamento, non l'ordine in cui le righe sono finite nel
// Foglio (che è quello di salvataggio: un recupero o una modifica finivano in cima).

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const dateMostrate = (page) =>
  page.evaluate(() => Array.from(document.querySelectorAll('#historyList .history-item-header div:first-child')).map((e) => e.innerText.trim()).filter(Boolean));

test('il più recente sta in cima, anche se salvato per primo', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [
      // Ordine di salvataggio volutamente diverso da quello cronologico.
      { id: 'w1', date: daysAgo(1), athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '4:30' }] },
      { id: 'w2', date: daysAgo(5), athlete: 'Test Athlete', blocks: [{ title: 'Grace', type: 'For Time', explanation: '', result: '2:30' }] },
      { id: 'w3', date: daysAgo(3), athlete: 'Test Athlete', blocks: [{ title: 'Cindy', type: 'AMRAP', explanation: '', result: '18' }] },
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('storico'));

  const date = await dateMostrate(page);
  const atteso = [daysAgo(1), daysAgo(3), daysAgo(5)].map((d) => { const [y, m, g] = d.split('-'); return `${g}/${m}/${y}`; });
  expect(date).toEqual(atteso);
});

test('un recupero registrato oggi per un giorno passato non scavalca i più recenti', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: daysAgo(1), athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '4:30' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());

  // Recupero: registrato ORA, ma riferito a 5 giorni fa.
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, daysAgo(5));
  await page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Grace', '30 Clean and Jerk'));
  await page.evaluate(() => saveWodSession());
  await expect.poll(() => state.wods.length).toBe(2);

  await page.evaluate(() => switchTab('storico'));
  const date = await dateMostrate(page);
  const fmt = (d) => { const [y, m, g] = d.split('-'); return `${g}/${m}/${y}`; };
  expect(date).toEqual([fmt(daysAgo(1)), fmt(daysAgo(5))]); // Fran resta in cima
});
