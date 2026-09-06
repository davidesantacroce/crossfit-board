const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v56: un WOD a set cronometrati chiede un tempo PER OGNI SET, non un unico numero — come fanno
// i gestionali di programmazione. WOD di esempio: quello reale segnalato dall'utente.
const IRONWORKERS = `5 Sets
400m Run
16 Thruster (85/60)
8 Bar Muscle Ups
*Rest 2 minutes between sets.`;

const TEMPI = [['2', '35'], ['2', '41'], ['2', '48'], ['2', '52'], ['3', '01']];

async function apriLogResultATempo(page, tipo, titolo, spiegazione) {
  await page.evaluate(() => switchTab('registra'));
  await page.getByRole('button', { name: /\+ Registra un/ }).click();
  await page.evaluate(({ tipo, titolo, spiegazione }) => {
    addWorkoutBlock(tipo, titolo, spiegazione);
    openLogResultModal(blockCounter);
    document.getElementById('lrScoreType').value = 'Time';
    renderLrScoreFields();
  }, { tipo, titolo, spiegazione });
}

async function compilaTempi(page, tempi = TEMPI) {
  for (let i = 0; i < tempi.length; i++) {
    await page.locator('.lr-perset-row').nth(i).locator('.lr-perset-min').fill(tempi[i][0]);
    await page.locator('.lr-perset-row').nth(i).locator('.lr-perset-sec').fill(tempi[i][1]);
  }
}

test.beforeEach(async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
});

test('un WOD a 5 set cronometrati chiede 5 tempi, non uno solo', async ({ page }) => {
  await apriLogResultATempo(page, 'Sets', 'Ironworkers', IRONWORKERS);

  await expect(page.locator('#lrDetectedSetsHint')).toContainText('5 set');
  await expect(page.locator('.lr-perset-row')).toHaveCount(5);
  await expect(page.locator('.lr-perset-row').nth(0)).toContainText('Set 1');
  await expect(page.locator('#lrTimeMin')).toHaveCount(0); // niente campo unico
});

test('il totale si aggiorna mentre scrivi, escludendo il recupero', async ({ page }) => {
  await apriLogResultATempo(page, 'Sets', 'Ironworkers', IRONWORKERS);
  await compilaTempi(page);

  // 2:35 + 2:41 + 2:48 + 2:52 + 3:01 = 13:57 (i 2 minuti di recupero non si contano).
  await expect(page.locator('#lrPerSetTotal')).toContainText('Totale 13:57');
  await expect(page.locator('#lrPerSetTotal')).toContainText('5 set');
});

test('il punteggio salvato porta il totale davanti e i parziali dietro', async ({ page }) => {
  await apriLogResultATempo(page, 'Sets', 'Ironworkers', IRONWORKERS);
  await compilaTempi(page);

  const r = await page.evaluate(() => buildLrScoreResult());
  expect(r.scoreDisplay).toBe('13:57 (2:35/2:41/2:48/2:52/3:01)');
  expect(r.scoreDetail.perSet).toBe(true);
  expect(r.scoreDetail.sets).toHaveLength(5);
  // I secondi si salvano come li ha digitati l'utente: "01" perde lo zero davanti passando da
  // sanitizeIntInput, ed è il punteggio a rimetterlo (3:01, non 3:1).
  expect(r.scoreDetail.sets[4]).toMatchObject({ set: 5, minutes: '3', seconds: '1' });
});

test('i confronti con gli altri e i PR usano il totale, non un numero a caso', async ({ page }) => {
  await apriLogResultATempo(page, 'Sets', 'Ironworkers', IRONWORKERS);
  await compilaTempi(page);
  const r = await page.evaluate(() => buildLrScoreResult());

  const ordinamento = await page.evaluate((res) => scoreSortValue(res), r);
  expect(ordinamento).toMatchObject({ value: 837, higherIsBetter: false, confident: true }); // 13:57

  // Anche il punteggio già salvato (che nello storico è solo testo) resta leggibile.
  const daTesto = await page.evaluate((d) => parseStoredComparableScore(d, 'Time'), r.scoreDisplay);
  expect(daTesto).toBe(837);
  // Un tempo semplice continua a funzionare come prima.
  expect(await page.evaluate(() => parseStoredComparableScore('4:30', 'Time'))).toBe(270);
});

test('si possono aggiungere e togliere set anche sui tempi', async ({ page }) => {
  await apriLogResultATempo(page, 'Sets', 'Ironworkers', IRONWORKERS);
  await compilaTempi(page);

  await page.getByRole('button', { name: '+ Aggiungi Set' }).click();
  await expect(page.locator('.lr-perset-row')).toHaveCount(6);
  await expect(page.locator('.lr-perset-row').nth(0).locator('.lr-perset-min')).toHaveValue('2'); // niente perso

  await page.locator('.lr-perset-row').nth(5).locator('.lr-perset-remove-btn').click();
  await page.locator('.lr-perset-row').nth(0).locator('.lr-perset-remove-btn').click();
  await expect(page.locator('.lr-perset-row')).toHaveCount(4);
  await expect(page.locator('#lrPerSetTotal')).toContainText('Totale 11:22'); // senza il primo set
});

test('riaprendo il risultato i tempi tornano riga per riga', async ({ page }) => {
  await apriLogResultATempo(page, 'Sets', 'Ironworkers', IRONWORKERS);
  await compilaTempi(page);
  await page.evaluate(() => saveLogResult());

  await page.evaluate(() => openLogResultModal(blockCounter));
  await expect(page.locator('.lr-perset-row')).toHaveCount(5);
  await expect(page.locator('.lr-perset-row').nth(2).locator('.lr-perset-min')).toHaveValue('2');
  await expect(page.locator('.lr-perset-row').nth(2).locator('.lr-perset-sec')).toHaveValue('48');
  await expect(page.locator('#lrPerSetTotal')).toContainText('Totale 13:57');
});

test('un For Time normale resta con il campo unico, non diventa una lista', async ({ page }) => {
  await apriLogResultATempo(page, 'For Time', 'Fran', '21-15-9 Thruster + Pull-up');

  await expect(page.locator('#lrTimeMin')).toBeVisible();
  await expect(page.locator('.lr-perset-row')).toHaveCount(0);
});
