const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

const WOD_DATE = '2026-05-10';

function risultato(athlete, date, scoreDisplay, extra = {}) {
  return {
    id: `${athlete}-${date}-${scoreDisplay}`, athlete, date,
    workout: 'Metcon', workoutType: 'For Time', scoreType: 'Time',
    scoreDetail: {}, scoreDisplay, category: 'RX', movements: [], notes: '', ...extra,
  };
}

async function conRisultati(page, results) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], results });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
}

test('un atleta che ha loggato due volte lo stesso WOD compare una volta sola', async ({ page }) => {
  await conRisultati(page, [
    risultato('Riccardo', WOD_DATE, '12:00'),
    risultato('Riccardo', WOD_DATE, '10:30'), // stesso giorno, doppio caricamento per sbaglio
    risultato('Mario', WOD_DATE, '11:00'),
  ]);

  const nomi = await page.evaluate((d) =>
    getCommunityMatches('Metcon', 'For Time', d).map((r) => r.athlete).sort(), WOD_DATE);
  expect(nomi).toEqual(['Mario', 'Riccardo']);
});

test('a parità di atleta tiene il tempo migliore, non il più recente', async ({ page }) => {
  await conRisultati(page, [
    risultato('Riccardo', WOD_DATE, '12:00'),
    risultato('Riccardo', '2026-05-11', '13:30'), // più recente ma peggiore (Time: meno è meglio)
  ]);

  const risultati = await page.evaluate((d) => getCommunityMatches('Metcon', 'For Time', d), WOD_DATE);
  expect(risultati).toHaveLength(1);
  expect(risultati[0].scoreDisplay).toBe('12:00');
});

test('su un punteggio dove più è meglio tiene il valore più alto', async ({ page }) => {
  await conRisultati(page, [
    risultato('Riccardo', WOD_DATE, '5 rounds', { scoreType: 'AMRAP', workoutType: 'AMRAP', scoreDetail: { rounds: 5, reps: 0 } }),
    risultato('Riccardo', WOD_DATE, '7 rounds', { scoreType: 'AMRAP', workoutType: 'AMRAP', scoreDetail: { rounds: 7, reps: 0 } }),
  ]);

  const risultati = await page.evaluate((d) => getCommunityMatches('Metcon', 'AMRAP', d), WOD_DATE);
  expect(risultati).toHaveLength(1);
  expect(risultati[0].scoreDisplay).toBe('7 rounds');
});

test('con punteggi non confrontabili fra loro tiene il più recente', async ({ page }) => {
  await conRisultati(page, [
    risultato('Riccardo', WOD_DATE, '12:00'),
    risultato('Riccardo', '2026-05-12', 'finito', { scoreType: '' }), // tipo diverso/non interpretabile
  ]);

  const risultati = await page.evaluate((d) => getCommunityMatches('Metcon', 'For Time', d), '2026-05-12');
  expect(risultati).toHaveLength(1);
  expect(risultati[0].scoreDisplay).toBe('finito');
});

test('il badge conta le persone, non i caricamenti', async ({ page }) => {
  await conRisultati(page, [
    risultato('Riccardo', WOD_DATE, '12:00'),
    risultato('Riccardo', WOD_DATE, '10:30'),
    risultato('Mario', WOD_DATE, '11:00'),
  ]);

  const badge = await page.evaluate((d) => {
    const m = renderCommunityButton('void 0', 'Metcon', 'For Time', d).match(/notification-badge">(\d+)</);
    return m ? Number(m[1]) : 0;
  }, WOD_DATE);
  expect(badge).toBe(2);
});

test('nella modale il nome duplicato non compare due volte', async ({ page }) => {
  await conRisultati(page, [
    risultato('Riccardo', WOD_DATE, '12:00'),
    risultato('Riccardo', WOD_DATE, '10:30'),
    risultato('Mario', WOD_DATE, '11:00'),
  ]);

  await page.evaluate((d) => openCommunityResultsModalFor('Metcon', 'For Time', d), WOD_DATE);
  const testo = await page.locator('#communityResultsContent').innerText();
  expect(testo.match(/Riccardo/g)).toHaveLength(1);
  expect(testo).toContain('10:30'); // il suo migliore
  expect(testo).not.toContain('12:00');
});

test('atleti diversi con lo stesso risultato restano entrambi', async ({ page }) => {
  await conRisultati(page, [
    risultato('Riccardo', WOD_DATE, '11:00'),
    risultato('Mario', WOD_DATE, '11:00'),
  ]);

  const nomi = await page.evaluate((d) =>
    getCommunityMatches('Metcon', 'For Time', d).map((r) => r.athlete).sort(), WOD_DATE);
  expect(nomi).toEqual(['Mario', 'Riccardo']);
});
