const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v59: la bacheca elenca i LAVORI SINGOLI, non le giornate. Lo stesso lavoro pubblicato da più
// persone lo stesso giorno resta una card sola, con tutti i nomi.

const OGGI = new Date().toISOString().slice(0, 10);

const titoli = (page) => page.evaluate(() => bachecaCandidates.map((c) => c.blocks[0].title));
const nomi = (page, i) => page.evaluate((idx) => bachecaCandidates[idx].athletes, i);

async function apriBacheca(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('bacheca'));
}

test('tre lavori dello stesso giorno sono tre card, non una', async ({ page }) => {
  await apriBacheca(page, [
    { id: '101', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'A. Back Squat', type: 'Sets', explanation: '5x5 @75%', result: '' }] },
    { id: '102', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'B. Ironworkers', type: 'For Time', explanation: '5 Sets\n400m Run', result: '' }] },
    { id: '103', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'C. Cindy', type: 'AMRAP', explanation: '20 min AMRAP', result: '' }] },
  ]);

  // Nell'ordine in cui sono stati programmati.
  expect(await titoli(page)).toEqual(['A. Back Squat', 'B. Ironworkers', 'C. Cindy']);
  expect(await page.evaluate(() => bachecaCandidates.every((c) => c.blocks.length === 1))).toBe(true);
});

test('lo stesso lavoro pubblicato da due persone resta una card sola, con entrambi i nomi', async ({ page }) => {
  await apriBacheca(page, [
    { id: '101', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Ironworkers', type: 'For Time', explanation: '5 Sets\n400m Run', result: '' }] },
    { id: '102', date: OGGI, athlete: 'Mario Rossi', blocks: [{ title: 'Ironworkers', type: 'For Time', explanation: '5 Sets\n400m Run', result: '14:20' }] },
    { id: '103', date: OGGI, athlete: 'Giulia Bianchi', blocks: [{ title: 'Altro', type: 'AMRAP', explanation: 'roba diversa', result: '' }] },
  ]);

  expect(await titoli(page)).toEqual(['Ironworkers', 'Altro']);
  expect((await nomi(page, 0)).sort()).toEqual(['Mario Rossi', 'Test Athlete']);
  await expect(page.locator('#bachecaContent')).toContainText('Mario Rossi'); // il maiuscolo è solo CSS
});

test('lo stesso atleta che ripubblica lo stesso lavoro non compare due volte', async ({ page }) => {
  await apriBacheca(page, [
    { id: '101', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Grace', type: 'For Time', explanation: '30 Clean and Jerk', result: '' }] },
    { id: '102', date: OGGI, athlete: 'Test Athlete', blocks: [{ title: 'Grace', type: 'For Time', explanation: '30 Clean and Jerk', result: '2:30' }] },
  ]);

  expect(await titoli(page)).toEqual(['Grace']);
  expect(await nomi(page, 0)).toEqual(['Test Athlete']);
});

test('una vecchia sessione multi-Parte diventa una card per Parte', async ({ page }) => {
  await apriBacheca(page, [
    { id: '101', date: OGGI, athlete: 'Giulia Bianchi', blocks: [
      { title: 'Parte 1', type: 'Sets', explanation: 'Deadlift 5x3', result: '' },
      { title: 'Parte 2', type: 'For Time', explanation: 'Fran', result: '' },
    ] },
  ]);

  expect(await titoli(page)).toEqual(['Parte 1', 'Parte 2']);
});

test('scegliendo una card il form riceve un solo lavoro', async ({ page }) => {
  await apriBacheca(page, [
    { id: '101', date: OGGI, athlete: 'Mario Rossi', blocks: [{ title: 'A', type: 'Sets', explanation: 'aaa', result: '' }] },
    { id: '102', date: OGGI, athlete: 'Mario Rossi', blocks: [{ title: 'B', type: 'AMRAP', explanation: 'bbb', result: '' }] },
  ]);

  await page.evaluate(() => useWodFromBacheca(1));
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(1);
  await expect(page.locator('.block-title')).toHaveValue('B');
});

test('un lavoro accorpato non scavalca quelli programmati dopo di lui', async ({ page }) => {
  await apriBacheca(page, [
    { id: '101', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'A', type: 'Sets', explanation: 'aaa', result: '' }] },
    { id: '102', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'B', type: 'For Time', explanation: 'bbb', result: '' }] },
    { id: '103', date: OGGI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'C', type: 'AMRAP', explanation: 'ccc', result: '' }] },
    // Mario fa B più tardi: si accorpa con B, che però resta al suo posto.
    { id: '999', date: OGGI, athlete: 'Mario Rossi', blocks: [{ title: 'B', type: 'For Time', explanation: 'bbb', result: '9:99' }] },
  ]);

  expect(await titoli(page)).toEqual(['A', 'B', 'C']);
});
