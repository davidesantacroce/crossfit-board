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
