const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// La bacheca dei WOD vive solo nel tab dedicato BACHECA (non più duplicata dentro REGISTRA):
// questi test la esercitano lì.

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const IERI = shiftDays(-1);

async function apriBacheca(page) {
  await page.evaluate(() => switchTab('bacheca'));
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
  await apriBacheca(page);

  const candidates = await page.evaluate(() => bachecaCandidates.map((c) => c.athletes.slice().sort()));
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

test('selezionare un WOD dalla bacheca porta su REGISTRA con la data e il form popolati', async ({ page }) => {
  await mockBackend(page, {
    wods: [{ id: 'w1', date: today(), athlete: 'Mario Rossi', mode: 'PUBLISHED', blocks: [{ title: 'Grace', type: 'For Time', explanation: '30 Clean & Jerk', result: '' }] }],
    athletes: [{ name: 'Test Athlete', hasPin: false }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriBacheca(page);

  await page.evaluate(() => useWodFromBacheca(0));

  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('.block-title').first()).toHaveValue('Grace');
});

test('selezionare dalla bacheca un WOD di un giorno passato apre il form in modalità recupero', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());
  await apriBacheca(page);

  await page.evaluate(() => useWodFromBacheca(0));

  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('#pastDayBanner')).toBeVisible();
  await expect(page.locator('.block-title').first()).toHaveValue('Fran');

  await page.evaluate(() => saveWodSession());
  await page.waitForFunction(() => (globalData.wods || []).length > 1);

  const mine = state.wods.find((w) => w.athlete === 'Test Athlete');
  expect(mine.date).toBe(IERI);
  expect(mine.blocks[0].title).toBe('Fran');
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
  await apriBacheca(page);

  await expect(page.locator('#bachecaContent')).toContainText('Thursday Recovery');
  await expect(page.locator('#bachecaContent')).toContainText('Fran');
  // La propria sessione è etichettata "te" e il pulsante invita a riusarla, non a copiarla.
  await expect(page.locator('#bachecaContent')).toContainText('te');
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
  await apriBacheca(page);

  await expect(page.locator('#bachecaContent')).toContainText('Grace');
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
  // Posiziona esplicitamente la bacheca sulla settimana di IERI (che è anche quella di
  // altroGiorno), indipendentemente da quale sia la settimana corrente quando il test gira.
  await page.evaluate((d) => {
    switchTab('bacheca');
    bachecaWeekStart = toDateString(getWeekStart(new Date(d + 'T00:00:00')));
    renderBachecaTab();
  }, IERI);

  const [y, m, d] = altroGiorno.split('-');
  await expect(page.locator('#bachecaContent')).toContainText('Grace');
  await expect(page.locator('#bachecaContent')).toContainText(`${d}/${m}/${y}`); // formatDateForDisplay
});

test('la bacheca mostra il giorno della settimana abbreviato oltre alla data', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate((d) => {
    switchTab('bacheca');
    bachecaWeekStart = toDateString(getWeekStart(new Date(d + 'T00:00:00')));
    renderBachecaTab();
  }, IERI);

  const abbrev = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][new Date(IERI + 'T00:00:00').getDay()];
  const [y, m, d] = IERI.split('-');
  await expect(page.locator('#bachecaContent')).toContainText(`${abbrev} ${d}/${m}/${y}`);
});
