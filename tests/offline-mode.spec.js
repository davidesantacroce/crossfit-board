const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v52 "modalità palestra": in palestra la linea spesso non c'è. L'app deve aprirsi con gli
// ultimi dati scaricati invece che vuota, e un salvataggio senza rete deve restare sul telefono
// e partire da solo, invece di finire in un "Errore di connessione" che perde il lavoro.

const cadeLaLinea = (route) => route.abort();
const oggi = () => new Date().toISOString().slice(0, 10);

const coda = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pendingWrites') || '[]'));

test('senza linea l\'app si apre con gli ultimi dati scaricati, non vuota', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: oggi(), athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9', result: '4:30' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  // Resta loggato anche dopo il reload, come sul telefono di chi usa già l'app.
  await page.evaluate(() => localStorage.setItem('loginVersion', REQUIRED_LOGIN_VERSION));

  await page.route('**/macros/**', cadeLaLinea);
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('funLoadingOverlay').classList.contains('active'));

  await page.evaluate(() => switchTab('storico'));
  await expect(page.locator('#historyList')).toContainText('Fran');
  await expect(page.locator('#connectionStatusText')).toContainText('Offline');
});

test('un allenamento salvato senza linea resta sul telefono e si vede subito', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  let messaggio = null;
  page.on('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await page.evaluate(() => fetchCloudData());

  await page.route('**/macros/**', cadeLaLinea);
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9 Thruster + Pull-up'));
  await page.evaluate(() => saveWodSession());

  expect(state.wods).toHaveLength(0);              // sul Foglio non è arrivato niente
  expect(await coda(page)).toHaveLength(1);        // ma non è andato perso
  await expect.poll(() => messaggio).toContain('salvato sul telefono');
  await expect(page.locator('#historyList')).toContainText('Fran'); // e si vede già nello storico
  await expect(page.locator('#connectionStatusText')).toContainText('in attesa');
});

test('quando torna la linea la coda parte e il Foglio si allinea', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());

  await page.route('**/macros/**', cadeLaLinea);
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9'));
  await page.evaluate(() => saveWodSession());
  expect(await coda(page)).toHaveLength(1);

  await page.unroute('**/macros/**', cadeLaLinea); // torna la linea
  const inviati = await page.evaluate(() => flushPendingWrites());

  expect(inviati).toBe(1);
  expect(state.wods).toHaveLength(1);
  expect(state.wods[0].blocks[0].title).toBe('Fran');
  expect(await coda(page)).toHaveLength(0);
  await expect(page.locator('#connectionStatusText')).toContainText('Connesso');
});

test('le scritture in coda mantengono l\'ordine (prima la cancellazione, poi il salvataggio)', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: oggi(), athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());

  await page.route('**/macros/**', cadeLaLinea);
  // Modificare una sessione manda prima una deleteWod e poi il nuovo salvataggio: invertirle
  // cancellerebbe quello appena scritto.
  await page.evaluate(() => editWodSession('w1'));
  await page.evaluate(() => { document.querySelector('.block-title').value = 'Fran modificata'; });
  await page.evaluate(() => saveWodSession());

  const azioni = (await coda(page)).map((v) => v.payload.action);
  expect(azioni).toEqual(['deleteWod', 'saveWodSession']);

  await page.unroute('**/macros/**', cadeLaLinea);
  await page.evaluate(() => flushPendingWrites());
  expect(state.wods).toHaveLength(1);
  expect(state.wods[0].blocks[0].title).toBe('Fran modificata');
});

test('login e PIN non finiscono mai in coda: il loro esito va visto subito', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');

  const queueable = await page.evaluate(() => QUEUEABLE_ACTIONS);
  expect(queueable).not.toContain('setPin');
  expect(queueable).not.toContain('verifyPin');
  expect(queueable).not.toContain('saveAthlete');

  await page.route('**/macros/**', cadeLaLinea);
  const esito = await page.evaluate(() => postToBackend({ action: 'setPin', name: 'Test Athlete', pin: '1234' }));
  expect(esito.ok).toBe(false);
  expect(esito.queued).toBe(false);
  expect(await coda(page)).toHaveLength(0);
});
