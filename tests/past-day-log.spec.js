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

test('mentre si registra un recupero, la bacheca mostra cosa hanno già caricato altri per quel giorno', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, IERI);

  // La bacheca non compare finché non si è scelto esplicitamente di registrare un recupero.
  await expect(page.locator('#proposedWodCard')).toBeHidden();

  await page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' }).click();

  await expect(page.locator('#proposedWodCard')).toBeVisible();
  await expect(page.locator('#proposedWodTitle')).toContainText('GIÀ CARICATO');
  await expect(page.locator('#proposedWodContent')).toContainText('Fran');
});

test('usare il WOD già caricato da un altro popola il form, e si salva sulla data del giorno passato', async ({ page }) => {
  const state = await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'w1', date: IERI, athlete: 'Mario Rossi', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '' }] }],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => fetchCloudData());
  await apriGiorno(page, IERI);
  await page.getByRole('button', { name: '+ Registra un allenamento per questo giorno' }).click();

  await page.evaluate(() => useProposedWod(0));
  await expect(page.locator('.block-title').first()).toHaveValue('Fran');

  await page.evaluate(() => saveWodSession());
  await page.waitForFunction(() => (globalData.wods || []).length > 1);

  const mine = state.wods.find((w) => w.athlete === 'Test Athlete');
  expect(mine.date).toBe(IERI);
  expect(mine.blocks[0].title).toBe('Fran');
});
