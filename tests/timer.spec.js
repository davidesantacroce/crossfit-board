const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v53: timer dentro al blocco. I test non aspettano il tempo vero (sarebbero lenti e ballerini):
// spostano indietro l'istante di avvio, che è esattamente il dato su cui il timer fa i conti.

async function apriBloccoConTimer(page, tipo, titolo, spiegazione) {
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await page.evaluate(({ tipo, titolo, spiegazione }) => {
    addWorkoutBlock(tipo, titolo, spiegazione);
    openTimerModal(blockCounter);
  }, { tipo, titolo, spiegazione });
}

// Fa come se il timer fosse partito `secondi` fa.
const simulaSecondi = (page, secondi) =>
  page.evaluate((s) => { timerStartedAt = Date.now() - s * 1000; renderTimer(); }, secondi);

const display = (page) => page.locator('#timerDisplay').innerText();

test.beforeEach(async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
});

test('il tipo di WOD sceglie il timer giusto e legge i minuti dal testo', async ({ page }) => {
  await apriBloccoConTimer(page, 'AMRAP', 'Cindy', '20 min AMRAP\n5 Pull-up\n10 Push-up\n15 Air Squat');
  expect(await page.evaluate(() => timerMode)).toBe('down');
  await expect(page.locator('#timerMinutes')).toHaveValue('20');
  await expect(page.locator('#timerDisplay')).toHaveText('20:00');

  // Si esce dal timer e si riparte da un blocco nuovo, come farebbe l'utente.
  await page.evaluate(() => { closeTimerModal(); cancelLoggingPastDay(); });
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9 Thruster + Pull-up');
  expect(await page.evaluate(() => timerMode)).toBe('up');
  await expect(page.locator('#timerDisplay')).toHaveText('00:00');
  await expect(page.locator('#timerSetup')).toBeHidden(); // il cronometro non ha niente da impostare
});

test('il cronometro conta dal tempo reale, non dai tick', async ({ page }) => {
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9');
  await page.evaluate(() => toggleTimer());
  await simulaSecondi(page, 65);

  await expect(page.locator('#timerDisplay')).toHaveText('01:05');
  await expect(page.locator('#timerStartBtn')).toHaveText('⏸ Pausa');
});

test('mettere in pausa e ripartire non perde il tempo già fatto', async ({ page }) => {
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9');
  await page.evaluate(() => toggleTimer());
  await simulaSecondi(page, 30);
  await page.evaluate(() => toggleTimer()); // pausa
  await expect(page.locator('#timerDisplay')).toHaveText('00:30');

  await page.evaluate(() => toggleTimer()); // riparte
  await simulaSecondi(page, 12);            // altri 12 s sopra ai 30 già maturati
  await expect(page.locator('#timerDisplay')).toHaveText('00:42');

  await page.evaluate(() => resetTimer());
  await expect(page.locator('#timerDisplay')).toHaveText('00:00');
});

test('il countdown si ferma a zero e lo dice', async ({ page }) => {
  await apriBloccoConTimer(page, 'AMRAP', 'Cindy', '5 min AMRAP');
  await expect(page.locator('#timerDisplay')).toHaveText('05:00');

  await page.evaluate(() => toggleTimer());
  await simulaSecondi(page, 5 * 60 + 3); // sforato

  await expect(page.locator('#timerDisplay')).toHaveText('00:00');
  await expect(page.locator('#timerSub')).toHaveText('FINITO');
  expect(await page.evaluate(() => timerRunning())).toBe(false); // si è fermato da solo
});

test('l\'EMOM mostra il round e quanto manca al prossimo minuto', async ({ page }) => {
  await apriBloccoConTimer(page, 'EMOM', 'EMOM 10', 'EMOM 10\n3 Power Clean');
  expect(await page.evaluate(() => timerMode)).toBe('emom');

  await page.evaluate(() => { document.getElementById('timerMinutes').value = '1'; document.getElementById('timerRounds').value = '10'; onTimerSetupChanged(); toggleTimer(); });
  await simulaSecondi(page, 150); // 2 round pieni + 30 s

  // Il maiuscolo è solo CSS: nel testo resta "Round 3 / 10".
  await expect(page.locator('#timerSub')).toHaveText('Round 3 / 10');
  await expect(page.locator('#timerDisplay')).toHaveText('00:30'); // al minuto successivo
});

test('il tempo misurato si porta nel Log Result con un tocco', async ({ page }) => {
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9 Thruster + Pull-up');
  await page.evaluate(() => toggleTimer());
  await simulaSecondi(page, 4 * 60 + 32);
  await page.evaluate(() => toggleTimer()); // stop

  await expect(page.locator('#timerUseBtn')).toBeVisible();
  await page.locator('#timerUseBtn').click();

  await expect(page.locator('#timerModal')).not.toHaveClass(/active/);
  await expect(page.locator('#logResultModal')).toHaveClass(/active/);
  await expect(page.locator('#lrScoreType')).toHaveValue('Time');
  await expect(page.locator('#lrTimeMin')).toHaveValue('4');
  await expect(page.locator('#lrTimeSec')).toHaveValue('32');
});

test('il bottone del timer non rompe la coppia Log Result / Results', async ({ page }) => {
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: '+ Registra un allenamento per oggi' }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9'));

  const timer = await page.locator('.btn-timer-open').boundingBox();
  const logResult = await page.locator('.btn-log-result').boundingBox();
  const results = await page.locator('.btn-community-paired').boundingBox();

  expect(logResult.width).toBe(results.width);       // la coppia resta uguale (vedi v50)
  expect(timer.y).toBeLessThan(logResult.y);         // il timer sta sopra, a tutta larghezza
  expect(timer.width).toBeGreaterThan(logResult.width);
});
