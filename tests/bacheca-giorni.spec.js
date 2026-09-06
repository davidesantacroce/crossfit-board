const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v61: la bacheca raggruppa i lavori per giornata. Con una settimana programmata (dalla v59 un
// lavoro per card) la pagina diventava lunghissima: ora si vede l'elenco dei giorni e si apre
// quello che interessa.

function shift(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const OGGI = shift(0);

// Giorni sicuramente nella settimana mostrata (domenica-sabato) qualunque giorno si giri:
// si parte dalla domenica della settimana di oggi.
function giornoDellaSettimana(i) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + i);
  return d.toISOString().slice(0, 10);
}

async function apriBacheca(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('bacheca'));
}

// Tre lavori in ciascuno dei primi tre giorni della settimana corrente.
function settimanaProgrammata() {
  const wods = [];
  let id = 100;
  [0, 1, 2].forEach((i) => {
    ['A', 'B', 'C'].forEach((t) => {
      wods.push({ id: String(++id), date: giornoDellaSettimana(i), athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: `${t}${i}`, type: 'For Time', explanation: 'testo del wod', result: '' }] });
    });
  });
  return wods;
}

test('i lavori sono raggruppati per giornata, con il conteggio', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());

  await expect(page.locator('.bacheca-day')).toHaveCount(3);
  await expect(page.locator('.bacheca-day-count').first()).toHaveText('3 lavori');

  // I giorni si leggono in ordine di calendario, dal primo all'ultimo della settimana.
  const giorni = await page.evaluate(() => Array.from(document.querySelectorAll('.bacheca-day-label')).map((e) => e.innerText));
  const attesi = [0, 1, 2].map((i) => giornoDellaSettimana(i));
  for (let i = 0; i < 3; i++) {
    const [y, m, d] = attesi[i].split('-');
    expect(giorni[i]).toContain(`${d}/${m}/${y}`);
  }
});

test('di default è aperto il giorno di oggi, gli altri sono chiusi', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());

  const aperte = await page.evaluate(() => Array.from(expandedBachecaDays));
  expect(aperte).toEqual([OGGI]);

  const corpi = page.locator('.bacheca-day-body');
  const indiceOggi = await page.evaluate(() => Array.from(document.querySelectorAll('.bacheca-day')).findIndex((el) => el.classList.contains('is-today')));
  for (let i = 0; i < await corpi.count(); i++) {
    if (i === indiceOggi) await expect(corpi.nth(i)).toBeVisible();
    else await expect(corpi.nth(i)).toBeHidden();
  }
});

test('toccando una giornata si apre, e si richiude ritoccandola', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());
  const seconda = page.locator('.bacheca-day').nth(1);

  await expect(seconda.locator('.bacheca-day-body')).toBeHidden();
  await seconda.locator('.bacheca-day-head').click();
  await expect(seconda.locator('.bacheca-day-body')).toBeVisible();
  await expect(seconda.locator('.bacheca-day-body')).toContainText('A1');

  await seconda.locator('.bacheca-day-head').click();
  await expect(seconda.locator('.bacheca-day-body')).toBeHidden();
});

test('il giorno di oggi è segnalato', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());
  await expect(page.locator('.bacheca-day.is-today .bacheca-day-label')).toContainText('oggi');
});

test('con una sola giornata nella settimana, quella è già aperta', async ({ page }) => {
  await apriBacheca(page, [
    { id: '1', date: giornoDellaSettimana(3), athlete: 'Mario Rossi', mode: 'PUBLISHED', blocks: [{ title: 'Murph', type: 'For Time', explanation: '', result: '' }] },
  ]);

  await expect(page.locator('.bacheca-day')).toHaveCount(1);
  await expect(page.locator('.bacheca-day-body')).toBeVisible();
  await expect(page.locator('.bacheca-day-count')).toHaveText('1 lavoro');
});

test('scegliere un WOD da una giornata aperta porta quel lavoro nel form', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());

  await page.locator('.bacheca-day').nth(1).locator('.bacheca-day-head').click();
  await page.locator('.bacheca-day').nth(1).getByRole('button', { name: /QUESTO WOD/ }).nth(1).click();

  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(1);
  await expect(page.locator('.block-title')).toHaveValue('B1');
});
