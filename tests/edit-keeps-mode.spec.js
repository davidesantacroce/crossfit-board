const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v62 (bug segnalato): correggendo il nome di un WOD pubblicato in bacheca, questo perdeva il
// "PUBBLICATO" e ricompariva nello storico come allenamento svolto senza punteggio, perché il
// salvataggio non rimandava il campo mode.

const DOMANI = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

test('correggere il nome di un WOD pubblicato non lo trasforma in un allenamento svolto', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'p1', date: DOMANI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Jerk Balanc', type: 'Sets', explanation: '3x3', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());

  await page.evaluate(() => editWodSession('p1'));
  await page.evaluate(() => { document.querySelector('.block-title').value = 'Jerk Balance'; });
  await page.evaluate(() => saveWodSession());
  await expect.poll(() => state.wods.length).toBe(1);

  expect(state.wods[0].blocks[0].title).toBe('Jerk Balance'); // la correzione c'è
  expect(state.wods[0].mode).toBe('PUBLISHED');               // e resta pubblicato
});

test('una sessione normale modificata non diventa pubblicata', async ({ page }) => {
  const ieri = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'n1', date: ieri, athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9', result: '4:30' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());

  await page.evaluate(() => editWodSession('n1'));
  await page.evaluate(() => { document.querySelector('.block-title').value = 'Fran (rifatta)'; });
  await page.evaluate(() => saveWodSession());
  await expect.poll(() => state.wods[0].blocks[0].title).toBe('Fran (rifatta)');

  expect(state.wods[0].mode).toBeUndefined();
});

test('dopo aver modificato un WOD pubblicato, una sessione nuova non eredita il pubblicato', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'p1', date: DOMANI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Jerk Balance', type: 'Sets', explanation: '3x3', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());

  await page.evaluate(() => editWodSession('p1'));
  await page.evaluate(() => cancelEditWod());

  // Ora registro un allenamento di oggi: deve essere una sessione normale.
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: /\+ Registra un/ }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9'));
  await page.evaluate(() => saveWodSession());
  await expect.poll(() => state.wods.length).toBe(2);

  const nuova = state.wods.find((w) => w.blocks[0].title === 'Fran');
  expect(nuova.mode).toBeUndefined();
});
