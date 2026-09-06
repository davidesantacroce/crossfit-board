const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v58: con più lavori nello stesso giorno le card partono chiuse — titolo e punteggio, per avere
// la giornata intera sott'occhio — e si apre solo quello che serve leggere o loggare.

function ieri() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const IERI = ieri();

const treLavori = () => ({
  athletes: [{ name: 'Test Athlete', hasPin: false }],
  wods: [
    { id: 'a', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'A. Back Squat', type: 'Sets', explanation: '5x5 @75% 1RM', result: '110 kg', category: 'RX' }] },
    { id: 'b', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'B. Ironworkers', type: 'For Time', explanation: '5 Sets\n400m Run\n16 Thruster', result: '13:57 (2:35/2:41/2:48/2:52/3:01)', category: 'RX' }] },
    { id: 'c', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'C. Cindy', type: 'AMRAP', explanation: '20 min AMRAP', result: '', category: 'SCALED' }] },
  ],
});

async function apriGiorno(page, dati) {
  await mockBackend(page, dati);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, IERI);
}

test('con più lavori le card partono chiuse, con titolo e punteggio a vista', async ({ page }) => {
  await apriGiorno(page, treLavori());

  await expect(page.locator('.day-item')).toHaveCount(3);
  await expect(page.locator('.day-item-body')).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(page.locator('.day-item-body').nth(i)).toBeHidden();

  // Quello che serve per orientarsi resta visibile anche da chiuse.
  await expect(page.locator('.day-item-head').nth(0)).toContainText('A. Back Squat');
  await expect(page.locator('.day-item-head').nth(0)).toContainText('110 kg');
  await expect(page.locator('.day-item-head').nth(2)).toContainText('C. Cindy');

  // Il testo del WOD invece no: è lì che se ne andava tutto lo spazio. (useInnerText perché
  // toContainText legge di default anche il testo nascosto.)
  await expect(page.locator('#registraDayView')).not.toContainText('400m Run', { useInnerText: true });
});

test('dei tempi per set il riassunto mostra il totale, non i parziali', async ({ page }) => {
  await apriGiorno(page, treLavori());

  await expect(page.locator('.day-item-head').nth(1)).toContainText('13:57');
  await expect(page.locator('.day-item-head').nth(1)).not.toContainText('2:35');

  // Aprendola, i parziali ci sono tutti.
  await page.locator('.day-item-head').nth(1).click();
  await expect(page.locator('.day-item-body').nth(1)).toContainText('13:57 (2:35/2:41/2:48/2:52/3:01)');
});

test('si apre solo il lavoro toccato, e si richiude ritoccandolo', async ({ page }) => {
  await apriGiorno(page, treLavori());

  await page.locator('.day-item-head').nth(1).click();
  await expect(page.locator('.day-item-body').nth(1)).toBeVisible();
  await expect(page.locator('.day-item-body').nth(0)).toBeHidden();
  await expect(page.locator('.day-item-body').nth(2)).toBeHidden();
  await expect(page.locator('.day-item-body').nth(1)).toContainText('400m Run');

  await page.locator('.day-item-head').nth(1).click();
  await expect(page.locator('.day-item-body').nth(1)).toBeHidden();
});

test('Modifica ed Elimina stanno dentro la card aperta, non si toccano per sbaglio', async ({ page }) => {
  await apriGiorno(page, treLavori());

  await expect(page.getByRole('button', { name: /Modifica/ })).toHaveCount(0);
  await page.locator('.day-item-head').nth(0).click();
  await expect(page.locator('.day-item-body').nth(0).getByRole('button', { name: /Modifica/ })).toBeVisible();
  await expect(page.locator('.day-item-body').nth(0).getByRole('button', { name: /Elimina/ })).toBeVisible();
});

test('con un lavoro solo non c\'è niente da riassumere: la card è già aperta', async ({ page }) => {
  await apriGiorno(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'solo', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9 Thruster + Pull-up', result: '4:30' }] }],
  });

  await expect(page.locator('.day-item-body')).toBeVisible();
  await expect(page.locator('#registraDayView')).toContainText('21-15-9 Thruster + Pull-up');
});
