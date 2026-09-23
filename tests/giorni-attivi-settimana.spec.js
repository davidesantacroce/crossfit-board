const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v77: la vista SETTIMANA del grafico giorni attivi ha una colonna per GIORNO ed è quella di
// partenza. Le barre settimanali dicono quante ricariche hai fatto, non in quale giorno: per
// vedere il ritmo dentro la settimana serve scendere al giorno.

const ATLETA = 'Davide Santacroce'; // dev'essere in RICARICA_ATHLETES

const pad = (v) => String(v).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Il grafico usa la settimana lunedì→domenica (getWeekStartDateString), non domenica→sabato
// come la bacheca.
function lunedi() {
  const d = new Date();
  const g = d.getDay();
  d.setDate(d.getDate() + (g === 0 ? -6 : 1 - g));
  return iso(d);
}
function giorno(i) {
  const d = new Date(lunedi() + 'T00:00:00');
  d.setDate(d.getDate() + i);
  return iso(d);
}
const OGGI = iso(new Date());
const INDICE_OGGI = [0, 1, 2, 3, 4, 5, 6].find((i) => giorno(i) === OGGI);

const allenamento = (id, date) => ({
  id, date, athlete: ATLETA,
  blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '7:42' }],
});

async function apri(page, dati) {
  await mockBackend(page, { athletes: [{ name: ATLETA, hasPin: false }], ...dati });
  await gotoApp(page);
  await loginAs(page, ATLETA);
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('atleta'));
}

const colonne = (page) => page.locator('#activeDaysChartContainer .active-days-col');

test('si parte dalla settimana, con una colonna per giorno', async ({ page }) => {
  await apri(page, { wods: [allenamento('w1', OGGI)] });

  expect(await page.evaluate(() => activeDaysCurrentRange)).toBe('week');
  await expect(page.locator('.active-days-range-btn.active')).toHaveText('SETTIMANA');
  await expect(colonne(page)).toHaveCount(7);
});

test('le etichette sono i sette giorni, dal lunedì', async ({ page }) => {
  await apri(page, { wods: [allenamento('w1', OGGI)] });

  const etichette = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#activeDaysChartContainer .active-days-label-col')).map((e) => e.innerText.trim()));
  expect(etichette).toHaveLength(7);
  const primoGiorno = new Date(lunedi() + 'T00:00:00').getDate();
  expect(etichette[0]).toContain(String(primoGiorno));
});

test('la ricarica si vede nel giorno in cui l\'hai fatta', async ({ page }) => {
  await apri(page, {
    wods: [allenamento('w1', OGGI)],
    ricariche: [{ id: 'r1', athlete: ATLETA, date: giorno(0) }],
  });

  // Lunedì: la ricarica, e nient'altro se non è anche oggi.
  await expect(colonne(page).nth(0).locator('.active-days-bar-ric')).toHaveCount(1);
  // Il giorno di oggi ha l'allenamento.
  await expect(colonne(page).nth(INDICE_OGGI).locator('.active-days-bar')).toHaveCount(1);
  // Un giorno senza niente non ha nessuna delle due barre.
  const vuoto = [0, 1, 2, 3, 4, 5, 6].find((i) => i !== 0 && i !== INDICE_OGGI);
  await expect(colonne(page).nth(vuoto).locator('.active-days-bar, .active-days-bar-ric')).toHaveCount(0);
});

test('il giorno di oggi è evidenziato e quelli futuri sono spenti', async ({ page }) => {
  await apri(page, { wods: [allenamento('w1', OGGI)] });

  await expect(colonne(page).nth(INDICE_OGGI)).toHaveClass(/is-today/);
  const futuri = await page.evaluate(() =>
    document.querySelectorAll('#activeDaysChartContainer .active-days-col.is-future').length);
  expect(futuri).toBe(6 - INDICE_OGGI);
});

test('nella vista per giorno il conteggio lascia il posto al pittogramma della ricarica', async ({ page }) => {
  // I numeri sarebbero tutti "1" e non direbbero niente.
  await apri(page, {
    wods: [allenamento('w1', OGGI)],
    ricariche: [{ id: 'r1', athlete: ATLETA, date: OGGI }],
  });

  await expect(colonne(page).nth(INDICE_OGGI).locator('.active-days-bar-count')).toHaveText('🍝');
});

test('tornando su RECENTI si riprendono le barre settimanali', async ({ page }) => {
  await apri(page, { wods: [allenamento('w1', OGGI)] });

  await page.locator('.active-days-range-btn[data-range="recent"]').click();
  await expect(colonne(page)).toHaveCount(8); // otto settimane
  await expect(colonne(page).last().locator('.active-days-bar-count')).toHaveText('1');
});
