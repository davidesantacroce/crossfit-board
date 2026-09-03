const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

function shiftDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const IERI = shiftDays(-1);

async function apriGiorno(page, dateStr) {
  await page.evaluate(() => switchTab('registra'));
  await page.evaluate((d) => selectCalendarDate(d), dateStr);
}

test('un giorno passato senza sessioni offre il bottone per registrare un recupero', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, IERI);

  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' })).toBeVisible();
});

test('il bottone apre il form con la data giusta, senza il pulsante pubblica', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, IERI);
  await page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' }).click();

  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('#pastDayBanner')).toBeVisible();
  await expect(page.locator('#pastDayBannerText')).toContainText('STAI REGISTRANDO');
  await expect(page.locator('#saveWodBtn')).toBeVisible();
  await expect(page.locator('#publishWodBtn')).toBeHidden();
});

test('salva il recupero con la data del giorno passato selezionato, non con oggi', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await apriGiorno(page, IERI);
  await page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' }).click();

  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9 Thruster + Pull-up'));
  await page.evaluate(() => saveWodSession());
  await page.waitForFunction(() => (globalData.wods || []).length > 0);

  expect(state.wods).toHaveLength(1);
  expect(state.wods[0].date).toBe(IERI);
  expect(state.wods[0].mode).toBeUndefined();
});

test('annulla torna alla vista di sola lettura senza aver salvato nulla', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, IERI);
  await page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' }).click();
  await page.getByRole('button', { name: 'Annulla' }).click();

  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toBeVisible();
  expect(state.wods).toHaveLength(0);
});

test('un giorno passato CON sessioni già salvate offre comunque il bottone per aggiungerne un\'altra', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Grace', type: 'For Time', explanation: '', result: '2:30' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, IERI);

  await expect(page.locator('#registraDayView')).toContainText('Grace');
  await expect(page.getByRole('button', { name: "+ Registra un altro allenamento per questo giorno" })).toBeVisible();
});

test('cambiando giorno la modalità recupero si azzera, non resta appiccicata alla data successiva', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, IERI);
  await page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' }).click();
  await expect(page.locator('#registraFormCard')).toBeVisible();

  await apriGiorno(page, shiftDays(-2));
  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toBeVisible();
});

test('la bacheca della settimana è visibile fin da subito su un giorno passato, senza dover prima cliccare "+ Registra"', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, IERI);

  // Ancora nella vista di sola lettura (il form del recupero non è stato aperto), ma la
  // bacheca della settimana è già visibile.
  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#proposedWodCard')).toBeVisible();
  await expect(page.locator('#proposedWodTitle')).toContainText('WOD DI QUESTA SETTIMANA');
  await expect(page.locator('#proposedWodContent')).toContainText('Fran');
});

test('selezionare un WOD dalla bacheca, anche prima di aver cliccato "+ Registra", apre il form del recupero e lo popola', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, IERI);

  // Nessun click su "+ Registra": si seleziona il WOD direttamente dalla bacheca.
  await page.evaluate(() => useProposedWod(0));

  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('.block-title').first()).toHaveValue('Fran');

  await page.evaluate(() => saveWodSession());
  await page.waitForFunction(() => (globalData.wods || []).length > 1);

  const mine = state.wods.find((w) => w.athlete === 'Test Athlete');
  expect(mine.date).toBe(IERI);
  expect(mine.blocks[0].title).toBe('Fran');
});

// Stesso algoritmo di getWeekStart() nell'app (settimana da domenica a sabato), calcolato qui
// lato Node per scegliere date di test che ricadano garantite nella stessa settimana.
function weekStartOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test('un WOD caricato in un altro giorno della stessa settimana resta comunque disponibile, con la sua data indicata', async ({ page }) => {
  // Un giorno nella stessa settimana di IERI (domenica-sabato) ma non IERI stesso: il lunedì
  // della settimana di IERI, spostato di +1 se coincidesse già con IERI.
  let altroGiorno = weekStartOf(IERI);
  if (altroGiorno === IERI) altroGiorno = addDaysToDateString(altroGiorno, 1);
  expect(weekStartOf(altroGiorno)).toBe(weekStartOf(IERI)); // garanzia che il fixture sia corretto

  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: altroGiorno, athlete: 'Mario Rossi', blocks: [{ title: 'Grace', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, IERI);

  const [y, m, d] = altroGiorno.split('-');
  await expect(page.locator('#proposedWodContent')).toContainText('Grace');
  await expect(page.locator('#proposedWodContent')).toContainText(`${d}/${m}/${y}`); // formatDateForDisplay
});

test('la bacheca mostra il giorno della settimana abbreviato oltre alla data', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, IERI);

  const abbrev = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][new Date(IERI + 'T00:00:00').getDay()];
  const [y, m, d] = IERI.split('-');
  await expect(page.locator('#proposedWodContent')).toContainText(`${abbrev} ${d}/${m}/${y}`);
});

test('martedì e mercoledì restano distinguibili (non la sola lettera M)', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');

  const [martedi, mercoledi] = await page.evaluate(() => [
    formatDateWithWeekday('2026-09-01'), // martedì
    formatDateWithWeekday('2026-09-02'), // mercoledì
  ]);
  expect(martedi).toBe('Mar 01/09/2026');
  expect(mercoledi).toBe('Mer 02/09/2026');
});
