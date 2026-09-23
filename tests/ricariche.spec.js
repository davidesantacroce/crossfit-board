const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v75: giorni di ricarica. Si registra solo il GIORNO, non il contenuto del pasto, e il
// grafico dei giorni attivi li impila sopra gli allenamenti nella stessa barra.
// v76: la funzione esiste solo per gli atleti in RICARICA_ATHLETES. Per gli altri non c'è il
// tasto e il grafico resta com'era.

function shift(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const OGGI = shift(0);
const IERI = shift(-1);
const DOMANI = shift(1);

// Deve comparire in RICARICA_ATHLETES dentro index.html: il primo test qui sotto lo verifica,
// così se la lista cambia si capisce subito perché il resto fallisce.
const ATLETA = 'Davide Santacroce';
const NON_ABILITATO = 'Mario Rossi';

const allenamento = (id, date) => ({
  id, date, athlete: ATLETA,
  blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '7:42' }],
});

async function apri(page, dati, atleta) {
  const nome = atleta || ATLETA;
  const state = await mockBackend(page, {
    athletes: [{ name: ATLETA, hasPin: false }, { name: NON_ABILITATO, hasPin: false }],
    ...dati,
  });
  await gotoApp(page);
  await loginAs(page, nome);
  await page.evaluate(() => fetchCloudData());
  return state;
}

const tasto = (page) => page.locator('#registraDayView .btn-ricarica');

test('l\'atleta usato dai test è fra quelli abilitati alle ricariche', async ({ page }) => {
  // Se questo fallisce, RICARICA_ATHLETES è cambiata: è quella la ragione, non il resto.
  await apri(page, {});
  const abilitati = await page.evaluate(() => RICARICA_ATHLETES);
  expect(abilitati).toContain(ATLETA.toLowerCase());
});

test('si segna la ricarica del giorno e si toglie ritoccando', async ({ page }) => {
  const state = await apri(page, {});
  await page.evaluate(() => switchTab('registra'));

  await expect(tasto(page)).toContainText('Segna una ricarica');
  await tasto(page).click();

  await expect.poll(() => (state.ricariche || []).length).toBe(1);
  expect(state.ricariche[0].date).toBe(OGGI);
  await expect(tasto(page)).toContainText('tocca per togliere');

  await tasto(page).click();
  await expect.poll(() => (state.ricariche || []).length).toBe(0);
  await expect(tasto(page)).toContainText('Segna una ricarica');
});

test('si segna anche su un giorno passato scelto dal calendario', async ({ page }) => {
  const state = await apri(page, {});
  await page.evaluate(() => switchTab('registra'));
  await page.evaluate((d) => selectCalendarDate(d), IERI);

  await tasto(page).click();
  await expect.poll(() => (state.ricariche || []).length).toBe(1);
  expect(state.ricariche[0].date).toBe(IERI);
});

test('su un giorno futuro il tasto non c\'è', async ({ page }) => {
  await apri(page, {});
  await page.evaluate(() => switchTab('registra'));
  await page.evaluate((d) => selectCalendarDate(d), DOMANI);

  await expect(tasto(page)).toHaveCount(0);
});

test('si segna anche in un giorno di riposo, senza allenamenti', async ({ page }) => {
  // È il caso più frequente: la ricarica capita spesso nel giorno in cui non ti alleni.
  const state = await apri(page, {});
  await page.evaluate(() => switchTab('registra'));

  await expect(page.locator('#registraDayView')).toContainText('Nessun allenamento registrato');
  await tasto(page).click();
  await expect.poll(() => (state.ricariche || []).length).toBe(1);
});

test('nel grafico la ricarica si impila sopra gli allenamenti', async ({ page }) => {
  await apri(page, {
    wods: [allenamento('w1', IERI), allenamento('w2', OGGI)],
    ricariche: [{ id: 'r1', athlete: ATLETA, date: OGGI }],
  });
  await page.evaluate(() => switchTab('atleta'));

  const ultima = page.locator('#activeDaysChartContainer .active-days-col').last();
  await expect(ultima.locator('.active-days-bar')).toHaveCount(1);     // allenamenti
  await expect(ultima.locator('.active-days-bar-ric')).toHaveCount(1); // ricariche
  await expect(ultima.locator('.active-days-bar-count')).toContainText('2'); // 2 allenamenti
  await expect(ultima.locator('.active-days-ric-count')).toHaveText('+1');
  await expect(page.locator('#activeDaysChartContainer .active-days-legend')).toContainText('Ricariche');
});

test('senza ricariche il grafico resta com\'era, legenda compresa', async ({ page }) => {
  await apri(page, { wods: [allenamento('w1', OGGI)] });
  await page.evaluate(() => switchTab('atleta'));

  await expect(page.locator('#activeDaysChartContainer .active-days-bar-ric')).toHaveCount(0);
  await expect(page.locator('#activeDaysChartContainer .active-days-legend')).toHaveCount(0);
});

test('le ricariche di un altro atleta non finiscono nel tuo grafico', async ({ page }) => {
  await apri(page, {
    wods: [allenamento('w1', OGGI)],
    ricariche: [{ id: 'r1', athlete: NON_ABILITATO, date: OGGI }],
  });
  await page.evaluate(() => switchTab('atleta'));

  await expect(page.locator('#activeDaysChartContainer .active-days-bar-ric')).toHaveCount(0);
});

test('con le sole ricariche il grafico si disegna lo stesso', async ({ page }) => {
  await apri(page, { ricariche: [{ id: 'r1', athlete: ATLETA, date: OGGI }] });
  await page.evaluate(() => switchTab('atleta'));

  await expect(page.locator('#activeDaysChartContainer .active-days-empty')).toHaveCount(0);
  await expect(page.locator('#activeDaysChartContainer .active-days-bar-ric')).toHaveCount(1);
});

test('senza linea la ricarica si segna comunque e resta in coda', async ({ page }) => {
  const state = await apri(page, {});
  await page.evaluate(() => switchTab('registra'));
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }));

  await tasto(page).click();

  await expect(tasto(page)).toContainText('tocca per togliere'); // già vera sul telefono
  expect(state.ricariche).toHaveLength(0);                       // non ancora sul Foglio
  // La coda conserva { payload, at }, non il payload nudo.
  const inCoda = await page.evaluate(() => JSON.parse(localStorage.getItem('pendingWrites') || '[]'));
  expect(inCoda.filter((v) => v.payload && v.payload.action === 'setRicarica')).toHaveLength(1);
});

test('per un altro atleta il tasto ricarica non c\'è', async ({ page }) => {
  await apri(page, {}, NON_ABILITATO);
  await page.evaluate(() => switchTab('registra'));

  await expect(page.locator('#registraDayView')).toContainText('Nessun allenamento registrato');
  await expect(tasto(page)).toHaveCount(0);
});

test('per un altro atleta il grafico resta senza la parte delle ricariche', async ({ page }) => {
  await apri(page, {
    wods: [{ id: 'w1', date: OGGI, athlete: NON_ABILITATO, blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '7:42' }] }],
    // Righe sue sul foglio: anche così la funzione per lui non esiste.
    ricariche: [{ id: 'r1', athlete: NON_ABILITATO, date: OGGI }],
  }, NON_ABILITATO);
  await page.evaluate(() => switchTab('atleta'));

  await expect(page.locator('#activeDaysChartContainer .active-days-bar')).not.toHaveCount(0);
  await expect(page.locator('#activeDaysChartContainer .active-days-bar-ric')).toHaveCount(0);
  await expect(page.locator('#activeDaysChartContainer .active-days-legend')).toHaveCount(0);
});

test('anche chiamandola a mano, un altro atleta non scrive ricariche', async ({ page }) => {
  // Il tasto non c'è, ma la funzione resta raggiungibile: deve fermarsi da sé.
  const state = await apri(page, {}, NON_ABILITATO);
  await page.evaluate((d) => toggleRicarica(d), OGGI);
  await page.waitForTimeout(200);

  expect(state.ricariche || []).toHaveLength(0);
});
