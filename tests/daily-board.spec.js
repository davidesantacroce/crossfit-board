const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

function today() {
  return new Date().toISOString().slice(0, 10);
}

test('accorpa in un\'unica card i WOD identici pubblicati da atleti diversi', async ({ page }) => {
  await mockBackend(page, {
    wods: [
      { id: 'w1', date: today(), athlete: 'Mario Rossi', mode: 'PUBLISHED', blocks: [{ title: 'Grace', type: 'For Time', explanation: '30 Clean & Jerk', result: '' }] },
      { id: 'w2', date: today(), athlete: 'Giulia Bianchi', mode: 'PUBLISHED', blocks: [{ title: 'Grace', type: 'For Time', explanation: '30 Clean & Jerk', result: '' }] },
      { id: 'w3', date: today(), athlete: 'Luca Verdi', mode: 'PUBLISHED', blocks: [{ title: 'Diverso', type: 'AMRAP', explanation: 'altra cosa', result: '' }] },
    ],
    athletes: [{ name: 'Test Athlete', hasPin: false }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('registra'));

  const candidates = await page.evaluate(() => proposedWodCandidates.map((c) => c.athletes.slice().sort()));
  expect(candidates).toHaveLength(2);
  expect(candidates).toContainEqual(['Giulia Bianchi', 'Mario Rossi']);
  expect(candidates).toContainEqual(['Luca Verdi']);
});

test('un WOD pubblicato non conta come giorno attivo', async ({ page }) => {
  await mockBackend(page, {
    wods: [{ id: 'w1', date: today(), athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'WOD', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());

  const hasLog = await page.evaluate(() => {
    renderRegistraCalendar();
    return document.querySelector('.calendar-day.is-today')?.classList.contains('has-log') ?? null;
  });
  expect(hasLog).toBe(false);
});

test('la bacheca resta visibile/riutilizzabile dopo aver usato un WOD proposto', async ({ page }) => {
  await mockBackend(page, {
    wods: [{ id: 'w1', date: today(), athlete: 'Mario Rossi', mode: 'PUBLISHED', blocks: [{ title: 'Grace', type: 'For Time', explanation: '30 Clean & Jerk', result: '' }] }],
    athletes: [{ name: 'Test Athlete', hasPin: false }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('registra'));

  await page.evaluate(() => {
    useProposedWod(0);
    document.getElementById('workoutBlocksContainer').innerHTML = ''; // l'atleta svuota il form
    updateProposedWodCard();
  });

  const stillVisible = await page.evaluate(() => document.getElementById('proposedWodCard').style.display !== 'none');
  expect(stillVisible).toBe(true);
});

test('la bacheca mostra anche il WOD che hai caricato tu, non solo quelli degli altri', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [
      { id: 'w1', date: today(), athlete: 'Test Athlete', blocks: [{ title: 'Thursday Recovery', type: 'For Time', explanation: '', result: '45:00' }] },
      { id: 'w2', date: today(), athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '3:20' }] },
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('registra'));

  await expect(page.locator('#proposedWodContent')).toContainText('Thursday Recovery');
  await expect(page.locator('#proposedWodContent')).toContainText('Fran');
  // La propria sessione è etichettata "te" e il pulsante invita a riusarla, non a copiarla.
  await expect(page.locator('#proposedWodContent')).toContainText('te');
  await expect(page.getByRole('button', { name: 'RIUSA QUESTO WOD' })).toBeVisible();
});

test('la sessione propria compare anche in un altro giorno della settimana', async ({ page }) => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // domenica: sempre nella stessa settimana di oggi
  const pad = (v) => String(v).padStart(2, '0');
  const domenica = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: domenica, athlete: 'Test Athlete', blocks: [{ title: 'Grace', type: 'For Time', explanation: '', result: '2:30' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('registra'));

  await expect(page.locator('#proposedWodCard')).toBeVisible();
  await expect(page.locator('#proposedWodContent')).toContainText('Grace');
});
