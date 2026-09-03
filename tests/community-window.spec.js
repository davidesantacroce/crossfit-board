const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

const WOD_DATE = '2026-05-10';

function risultato(athlete, date, workout, scoreDisplay) {
  return {
    id: `${athlete}-${date}`, athlete, date, workout, workoutType: 'For Time',
    scoreType: 'Time', scoreDetail: {}, scoreDisplay, category: 'RX', movements: [], notes: '',
  };
}

async function conRisultati(page, results) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], results });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
}

test('un WOD del giorno confronta solo chi lo ha fatto entro la finestra di tolleranza', async ({ page }) => {
  await conRisultati(page, [
    risultato('Mario', WOD_DATE, 'Metcon', '10:00'),
    risultato('Giulia', '2026-05-12', 'Metcon', '11:00'),   // recupera 2 giorni dopo: dentro
    risultato('Luca', '2026-05-13', 'Metcon', '12:00'),     // 3 giorni dopo: al limite, dentro
    risultato('Anna', '2026-05-14', 'Metcon', '13:00'),     // 4 giorni dopo: fuori
    risultato('Paolo', '2026-01-02', 'Metcon', '09:00'),    // stesso titolo mesi prima: fuori
  ]);

  const nomi = await page.evaluate((d) =>
    getCommunityMatches('Metcon', 'For Time', d).map((r) => r.athlete).sort(), WOD_DATE);
  expect(nomi).toEqual(['Giulia', 'Luca', 'Mario']);
});

test('la finestra è simmetrica: vale anche per chi lo ha fatto in anticipo', async ({ page }) => {
  await conRisultati(page, [
    risultato('Mario', WOD_DATE, 'Metcon', '10:00'),
    risultato('Giulia', '2026-05-07', 'Metcon', '11:00'),   // 3 giorni prima: dentro
    risultato('Anna', '2026-05-06', 'Metcon', '12:00'),     // 4 giorni prima: fuori
  ]);

  const nomi = await page.evaluate((d) =>
    getCommunityMatches('Metcon', 'For Time', d).map((r) => r.athlete).sort(), WOD_DATE);
  expect(nomi).toEqual(['Giulia', 'Mario']);
});

test('un benchmark noto resta confrontabile di sempre', async ({ page }) => {
  await conRisultati(page, [
    risultato('Mario', WOD_DATE, 'Fran', '3:20'),
    risultato('Giulia', '2024-02-01', 'Fran', '4:10'),      // due anni prima: comunque in classifica
    risultato('Luca', '2026-08-30', 'Fran', '2:55'),
  ]);

  const nomi = await page.evaluate((d) =>
    getCommunityMatches('Fran', 'For Time', d).map((r) => r.athlete).sort(), WOD_DATE);
  expect(nomi).toEqual(['Giulia', 'Luca', 'Mario']);
});

test('senza data di riferimento il confronto resta di sempre, come prima', async ({ page }) => {
  await conRisultati(page, [
    risultato('Mario', WOD_DATE, 'Metcon', '10:00'),
    risultato('Paolo', '2026-01-02', 'Metcon', '09:00'),
  ]);

  const nomi = await page.evaluate(() =>
    getCommunityMatches('Metcon', 'For Time').map((r) => r.athlete).sort());
  expect(nomi).toEqual(['Mario', 'Paolo']);
});

test('il badge del pulsante conta le stesse persone che si vedono nella modale', async ({ page }) => {
  await conRisultati(page, [
    risultato('Mario', WOD_DATE, 'Metcon', '10:00'),
    risultato('Giulia', '2026-05-12', 'Metcon', '11:00'),
    risultato('Paolo', '2026-01-02', 'Metcon', '09:00'),    // fuori finestra
  ]);

  const badge = await page.evaluate((d) => {
    const html = renderCommunityButton('void 0', 'Metcon', 'For Time', d);
    const m = html.match(/notification-badge">(\d+)</);
    return m ? Number(m[1]) : 0;
  }, WOD_DATE);

  const inModale = await page.evaluate((d) => getCommunityMatches('Metcon', 'For Time', d).length, WOD_DATE);
  expect(badge).toBe(2);
  expect(badge).toBe(inModale);
});

test('la modale spiega su cosa sta confrontando', async ({ page }) => {
  await conRisultati(page, [
    risultato('Mario', WOD_DATE, 'Metcon', '10:00'),
    risultato('Giulia', WOD_DATE, 'Fran', '4:00'),
  ]);

  await page.evaluate((d) => openCommunityResultsModalFor('Metcon', 'For Time', d), WOD_DATE);
  await expect(page.locator('#communityResultsContent')).toContainText('entro 3 giorni dal 10/05/2026');

  await page.evaluate((d) => openCommunityResultsModalFor('Fran', 'For Time', d), WOD_DATE);
  await expect(page.locator('#communityResultsContent')).toContainText('confronto su tutti i risultati di sempre');
});
