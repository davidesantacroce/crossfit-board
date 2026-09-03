const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

async function compilaProfilo(page, { nome, pin = '1234', conferma = '1234' }) {
  await page.evaluate(() => switchTab('atleta'));
  await page.evaluate(([n, p, c]) => {
    document.getElementById('profileName').value = n;
    document.getElementById('profileAge').value = '30';
    document.getElementById('profileWeight').value = '80';
    document.getElementById('profilePin').value = p;
    document.getElementById('profilePinConfirm').value = c;
  }, [nome, pin, conferma]);
}

test('rifiuta la registrazione di un nome già esistente', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Mario Rossi', hasPin: true }] });
  await gotoApp(page);
  await page.evaluate(() => fetchCloudData());

  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await compilaProfilo(page, { nome: 'Mario Rossi' });
  await page.evaluate(() => saveProfile());
  await page.waitForTimeout(100);

  expect(messaggio).toContain('Esiste già un atleta con questo nome');
  // Non deve nemmeno risultare loggato come quella persona.
  expect(await page.evaluate(() => localStorage.getItem('activeAthlete'))).toBeNull();
});

test('il confronto ignora maiuscole e spaziatura', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Mario Rossi', hasPin: true }] });
  await gotoApp(page);
  await page.evaluate(() => fetchCloudData());

  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await compilaProfilo(page, { nome: '  mario   ROSSI ' });
  await page.evaluate(() => saveProfile());
  await page.waitForTimeout(100);

  expect(messaggio).toContain('Esiste già un atleta con questo nome');
});

test('un nome nuovo si registra regolarmente', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Mario Rossi', hasPin: true }] });
  await gotoApp(page);
  await page.evaluate(() => fetchCloudData());

  page.on('dialog', (d) => d.accept());
  await compilaProfilo(page, { nome: 'Luca Verdi' });
  await page.evaluate(() => saveProfile());

  await page.waitForFunction(() => localStorage.getItem('activeAthlete') === 'Luca Verdi');
});

test('un errore dal backend non lascia il dispositivo loggato', async ({ page }) => {
  await mockBackend(page, { athletes: [] });
  await gotoApp(page);
  // Il backend rifiuta (es. corsa fra due registrazioni simultanee dello stesso nome).
  await page.route('**/macros/**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'error', message: 'Esiste già un atleta con questo nome.' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ athletes: [], wods: [], results: [], massimali: [] }) });
  });

  let messaggio = null;
  page.once('dialog', (d) => { messaggio = d.message(); d.accept(); });
  await compilaProfilo(page, { nome: 'Nuovo Atleta' });
  await page.evaluate(() => saveProfile());
  await page.waitForTimeout(200);

  expect(messaggio).toContain('Esiste già un atleta');
  expect(await page.evaluate(() => localStorage.getItem('activeAthlete'))).toBeNull();
});

test('chi è già loggato può aggiornare il proprio profilo senza essere bloccato', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Mario Rossi', hasPin: true }] });
  await gotoApp(page);
  await loginAs(page, 'Mario Rossi');
  await page.evaluate(() => fetchCloudData());

  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => switchTab('atleta'));
  await page.evaluate(() => {
    document.getElementById('profileName').value = 'Mario Rossi';
    document.getElementById('profileAge').value = '31';
    document.getElementById('profileWeight').value = '81';
  });
  await page.evaluate(() => saveProfile());
  await page.waitForTimeout(200);

  // Resta loggato: l'aggiornamento del proprio profilo non è una registrazione duplicata.
  expect(await page.evaluate(() => localStorage.getItem('activeAthlete'))).toBe('Mario Rossi');
});
