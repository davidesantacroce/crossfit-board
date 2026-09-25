const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v80: il titolo ricavato dall'OCR veniva tagliato a 40 caratteri netti, in mezzo a una parola,
// e la coda della riga spariva per sempre (finiva nel titolo, non in spiegazione). Sul Foglio
// vero ci sono cinque titoli lunghi ESATTAMENTE 40, fra cui "Pause Snatch Pull + Floating Power
// Snatc" e "Snatch Deadlift + Power Snatch + Floatin".

async function scansiona(page, testo) {
  return page.evaluate((t) => {
    switchTab('registra');
    addWorkoutBlock();
    const id = blockCounter;
    parseAndFillBlock(id, t);
    return {
      titolo: document.querySelector(`#workout-block-${id} .block-title`).value,
      spiegazione: document.querySelector(`#workout-block-${id} .block-explanation`).value,
    };
  }, testo);
}

async function apri(page) {
  await mockBackend(page);
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
}

test('un titolo lungo come quelli veri della programmazione non viene più tagliato', async ({ page }) => {
  await apri(page);
  // 41 caratteri: prima veniva tagliato a 40, perdendo l'ultima lettera.
  const vero = 'Power Snatch + Hang Power Snatch + Snatch';
  const { titolo } = await scansiona(page, `${vero}\n3x5 @70% 1RM`);
  expect(titolo).toBe(vero);
});

test('oltre il limite si taglia all\'ultimo spazio, mai dentro una parola', async ({ page }) => {
  await apri(page);
  const lungo = 'Pause Snatch Pull + Floating Power Snatch + Hang Power Snatch + Overhead Squat Complex';
  const { titolo } = await scansiona(page, `${lungo}\n3x3 @75%`);

  expect(titolo.length).toBeLessThanOrEqual(80);
  expect(lungo.startsWith(titolo)).toBe(true);        // è un prefisso vero
  expect(titolo.endsWith('Snatc')).toBe(false);       // non spezza la parola
  // Il punto di taglio cade su uno spazio della riga originale.
  expect(lungo[titolo.length]).toBe(' ');
});

test('quando il titolo viene accorciato la riga intera resta in spiegazione', async ({ page }) => {
  await apri(page);
  const lungo = 'Pause Snatch Pull + Floating Power Snatch + Hang Power Snatch + Overhead Squat Complex';
  const { titolo, spiegazione } = await scansiona(page, `${lungo}\n3x3 @75%`);

  expect(titolo).not.toBe(lungo);
  expect(spiegazione).toContain(lungo); // la coda non si perde più
});

test('un titolo corto non finisce doppio in spiegazione', async ({ page }) => {
  await apri(page);
  const { titolo, spiegazione } = await scansiona(page, 'Fran\n21-15-9 Thruster + Pull-up');

  expect(titolo).toBe('Fran');
  expect(spiegazione).toBe('21-15-9 Thruster + Pull-up');
});

test('una parola unica più lunga del limite si taglia comunque', async ({ page }) => {
  await apri(page);
  const parolona = 'A'.repeat(120);
  const { titolo } = await scansiona(page, `${parolona}\n3x3`);

  expect(titolo).toHaveLength(80);
});

test('il pallino colorato letto come © viene ripulito, come la O e lo 0', async ({ page }) => {
  await apri(page);
  // Caso reale dal Foglio: «© "If | was goin' somewhere, | was runni».
  const { titolo } = await scansiona(page, '© Superset 1\n3x5 @70% 1RM');
  expect(titolo).toBe('Superset 1');

  const soloRiga = await scansiona(page, '©\nSuperset 2\nRow 500m');
  expect(soloRiga.titolo).toBe('Superset 2');
});
