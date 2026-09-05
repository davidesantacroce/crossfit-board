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

test('un giorno futuro apre il form in modalità programmazione', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriGiorno(page, DOMANI);

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
