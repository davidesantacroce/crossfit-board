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

// --- v54: chiudere la modale a metà WOD non deve far perdere il tempo, e lo schermo deve
// restare acceso mentre il timer conta. ---

// Finto wake lock: quello vero non è pilotabile da un test, e qui interessa che l'app lo chieda
// quando parte e lo rilasci quando si ferma.
const installaFintoWakeLock = (page) => page.evaluate(() => {
  window.__wake = { richieste: 0, rilasci: 0 };
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: async () => {
        window.__wake.richieste++;
        return { release: async () => { window.__wake.rilasci++; }, addEventListener() {} };
      },
    },
  });
});

test('chiudere e riaprire la modale non perde il WOD in corso', async ({ page }) => {
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9');
  await page.evaluate(() => toggleTimer());
  await simulaSecondi(page, 95);
  await expect(page.locator('#timerDisplay')).toHaveText('01:35');

  await page.evaluate(() => closeTimerModal());
  await page.evaluate(() => openTimerModal(timerBlockId));

  // Il tempo non riparte da zero e il timer sta ancora contando.
  await expect(page.locator('#timerDisplay')).not.toHaveText('00:00');
  expect(await page.evaluate(() => timerRunning())).toBe(true);
  await expect(page.locator('#timerStartBtn')).toHaveText('⏸ Pausa');
});

test('riaprendo si ritrova anche un timer in pausa, col tempo già fatto', async ({ page }) => {
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9');
  await page.evaluate(() => toggleTimer());
  await simulaSecondi(page, 42);
  await page.evaluate(() => toggleTimer()); // pausa
  await page.evaluate(() => closeTimerModal());

  await page.evaluate(() => openTimerModal(timerBlockId));
  await expect(page.locator('#timerDisplay')).toHaveText('00:42');
  expect(await page.evaluate(() => timerRunning())).toBe(false);
});

test('su una Parte diversa il timer riparte da capo, con le impostazioni di quel WOD', async ({ page }) => {
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9');
  await page.evaluate(() => toggleTimer());
  await simulaSecondi(page, 42);
  await page.evaluate(() => closeTimerModal());

  // Un'altra Parte (es. modificando una vecchia sessione multi-blocco) ha il suo timer.
  await page.evaluate(() => { addWorkoutBlock('AMRAP', 'Cindy', '20 min AMRAP'); openTimerModal(blockCounter); });
  expect(await page.evaluate(() => timerMode)).toBe('down');
  await expect(page.locator('#timerDisplay')).toHaveText('20:00');
});

test('lo schermo resta acceso mentre il timer conta, e si libera quando si ferma', async ({ page }) => {
  await apriBloccoConTimer(page, 'For Time', 'Fran', '21-15-9');
  await installaFintoWakeLock(page);

  await page.evaluate(() => toggleTimer());
  await expect.poll(() => page.evaluate(() => window.__wake.richieste)).toBe(1);

  await page.evaluate(() => toggleTimer()); // pausa
  await expect.poll(() => page.evaluate(() => window.__wake.rilasci)).toBe(1);
});

test('a tempo scaduto lo schermo non resta acceso a vuoto', async ({ page }) => {
  await apriBloccoConTimer(page, 'AMRAP', 'Cindy', '5 min AMRAP');
  await installaFintoWakeLock(page);

  await page.evaluate(() => toggleTimer());
  await expect.poll(() => page.evaluate(() => window.__wake.richieste)).toBe(1);
  await simulaSecondi(page, 5 * 60 + 1);

  await expect(page.locator('#timerSub')).toHaveText('FINITO');
  await expect.poll(() => page.evaluate(() => window.__wake.rilasci)).toBe(1);
});
