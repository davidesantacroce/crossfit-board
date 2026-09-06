const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

function shiftDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DOMANI = shiftDays(1);
const IERI = shiftDays(-1);

async function apriGiorno(page, dateStr) {
  await page.evaluate(() => switchTab('registra'));
  await page.evaluate((d) => selectCalendarDate(d), dateStr);
}

test('un giorno futuro mostra prima cosa è già programmato, poi apre il form', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, DOMANI);

  // Anche un giorno futuro parte dalla vista di sola lettura (v57): il form si apre su richiesta,
  // un WOD alla volta, così se ne possono programmare più d'uno per lo stesso giorno.
  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toContainText('Nessun WOD ancora programmato');
  await page.getByRole('button', { name: '+ Programma un WOD per questo giorno' }).click();

  await expect(page.locator('#registraFormCard')).toBeVisible();
  await expect(page.locator('#registraDayView')).toBeHidden();
  await expect(page.locator('#futureDayBanner')).toBeVisible();
  await expect(page.locator('#futureDayBannerText')).toContainText('STAI PROGRAMMANDO');
  // Un risultato non può riferirsi a un allenamento non ancora svolto.
  await expect(page.locator('#saveWodBtn')).toBeHidden();
  await expect(page.locator('#publishWodBtn')).toContainText('PUBBLICA IL WOD DEL');
});

test('un giorno passato resta in sola lettura, come prima', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, IERI);

  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toBeVisible();
});

test('tornando su oggi si vede di nuovo la vista di sola lettura, non più la programmazione', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, DOMANI);
  await page.evaluate(() => selectCalendarDate(getTodayDateString()));

  // Oggi mostra di default la vista di sola lettura (v48), non più il form di programmazione
  // del giorno futuro appena lasciato.
  await expect(page.locator('#futureDayBanner')).toBeHidden();
  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toBeVisible();

  // Aprendo il form per oggi, il tasto pubblica torna quello standard (non più quello del
  // giorno futuro appena lasciato).
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await expect(page.locator('#saveWodBtn')).toBeVisible();
  await expect(page.locator('#publishWodBtn')).toContainText('PUBBLICA SOLO IL WOD');
});

test('pubblica il WOD sulla data futura selezionata, non su oggi', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await apriGiorno(page, DOMANI);
  await page.getByRole('button', { name: '+ Programma un WOD per questo giorno' }).click();

  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9 Thruster + Pull-up'));
  await page.evaluate(() => publishDailyWod());
  await page.waitForFunction(() => (globalData.wods || []).length > 0);

  expect(state.wods).toHaveLength(1);
  expect(state.wods[0].date).toBe(DOMANI);
  expect(state.wods[0].mode).toBe('PUBLISHED');
  expect(state.wods[0].blocks[0].title).toBe('Fran');
});

test('rifiuta di registrare un risultato su un giorno futuro', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, DOMANI);
  await page.getByRole('button', { name: '+ Programma un WOD per questo giorno' }).click();

  let alertMessage = null;
  page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9'));
  await page.evaluate(() => saveWodSession());
  await page.waitForTimeout(50);

  expect(alertMessage).toContain('giorno futuro');
  expect(state.wods).toHaveLength(0);
});

test('il tab BACHECA mostra ciò che è già programmato per un giorno futuro', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: DOMANI, athlete: 'Coach', mode: 'PUBLISHED', blocks: [{ title: 'Murph', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  // Si posiziona esplicitamente sulla settimana di DOMANI: se il test gira di sabato, domani
  // cadrebbe nella settimana successiva rispetto a quella corrente mostrata di default.
  await page.evaluate((d) => {
    switchTab('bacheca');
    bachecaWeekStart = toDateString(getWeekStart(new Date(d + 'T00:00:00')));
    renderBachecaTab();
  }, DOMANI);

  await expect(page.locator('#bachecaContent')).toContainText('Murph');
});

test('il calendario segnala i giorni futuri con un WOD già programmato', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: DOMANI, athlete: 'Coach', mode: 'PUBLISHED', blocks: [{ title: 'Murph', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('registra'));

  const segnati = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.calendar-day.has-programmed')).length
  );
  expect(segnati).toBe(1);
});

// --- v57: programmare PIÙ lavori per lo stesso giorno futuro (caso segnalato: "sto programmando
// diversi lavori per lunedì e posso farne solo 1"). ---

test('dopo aver pubblicato si può programmare subito un altro WOD per lo stesso giorno', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await apriGiorno(page, DOMANI);

  await page.getByRole('button', { name: '+ Programma un WOD per questo giorno' }).click();
  await page.evaluate(() => addWorkoutBlock('Sets', 'A. Back Squat', '5x5 @75%'));
  await page.evaluate(() => publishDailyWod());
  await expect.poll(() => state.wods.length).toBe(1);

  // Il form si è svuotato e si torna all'elenco del giorno, che ora invita ad aggiungerne un altro.
  await expect(page.locator('#registraFormCard')).toBeHidden();
  await expect(page.locator('#registraDayView')).toContainText('A. Back Squat');
  await page.getByRole('button', { name: '+ Programma un altro WOD per questo giorno' }).click();
  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(0); // form vuoto, non quello di prima

  await page.evaluate(() => addWorkoutBlock('AMRAP', 'B. Cindy', '20 min AMRAP'));
  await page.evaluate(() => publishDailyWod());
  await expect.poll(() => state.wods.length).toBe(2);

  // Due righe separate, stesso giorno, entrambe pubblicate.
  expect(state.wods.map((w) => w.blocks[0].title).sort()).toEqual(['A. Back Squat', 'B. Cindy']);
  expect(state.wods.every((w) => w.date === DOMANI && w.mode === 'PUBLISHED')).toBe(true);
  expect(state.wods.every((w) => w.blocks.length === 1)).toBe(true);
});

test('l\'elenco del giorno futuro mostra i WOD già programmati, con il tasto per un altro', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'p1', date: DOMANI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Murph', type: 'For Time', explanation: '', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, DOMANI);

  await expect(page.locator('#registraDayViewTitle')).toContainText('WOD PROGRAMMATI PER IL');
  await expect(page.locator('#registraDayView')).toContainText('Murph');
  await expect(page.getByRole('button', { name: '+ Programma un altro WOD per questo giorno' })).toBeVisible();
});
