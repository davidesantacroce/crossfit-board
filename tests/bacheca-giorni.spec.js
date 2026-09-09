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

// Tre giorni della settimana corrente che comprendono SEMPRE oggi: prima erano fissi i primi
// tre (dom/lun/mar) e girando di mercoledì oggi non era fra questi, quindi i test sul giorno
// corrente non avevano una giornata da trovare.
const INDICI_GIORNI = (() => {
  const oggi = new Date().getDay();
  const altri = [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== oggi);
  return [oggi, altri[0], altri[1]].sort((a, b) => a - b);
})();

const GIORNI = INDICI_GIORNI.map(giornoDellaSettimana);

// Un giorno della settimana che NON sia oggi: i test che aprono una giornata chiusa non possono
// pescarla per posizione, perché quale posto occupi oggi dipende dal giorno in cui girano.
function unGiornoNonOggi() {
  return GIORNI.find((g) => g !== OGGI);
}

// Posizione di una giornata nel fixture, che è anche il suffisso dei suoi lavori (A0, B0, C0...).
function posizioneDi(dateStr) {
  return GIORNI.indexOf(dateStr);
}

// Il gruppo di una giornata, cercato per data invece che per indice.
function gruppoDelGiorno(page, dateStr) {
  const [y, m, d] = dateStr.split('-');
  return page.locator('#bachecaContent .day-group').filter({ hasText: `${d}/${m}/${y}` });
}

async function apriBacheca(page, wods) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('bacheca'));
}

// Tre lavori in ciascuna delle tre giornate del fixture (oggi compreso).
function settimanaProgrammata() {
  const wods = [];
  let id = 100;
  GIORNI.forEach((giorno, pos) => {
    ['A', 'B', 'C'].forEach((t) => {
      wods.push({ id: String(++id), date: giorno, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: `${t}${pos}`, type: 'For Time', explanation: 'testo del wod', result: '' }] });
    });
  });
  return wods;
}

test('i lavori sono raggruppati per giornata, con il conteggio', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());

  await expect(page.locator('#bachecaContent .day-group')).toHaveCount(3);
  await expect(page.locator('#bachecaContent .day-group-count').first()).toHaveText('3 lavori');

  // v69: i giorni si leggono dal più recente in cima, non in ordine di calendario.
  const giorni = await page.evaluate(() => Array.from(document.querySelectorAll('#bachecaContent .day-group-label')).map((e) => e.innerText));
  const attesi = GIORNI.slice().reverse();
  for (let i = 0; i < 3; i++) {
    const [y, m, d] = attesi[i].split('-');
    expect(giorni[i]).toContain(`${d}/${m}/${y}`);
  }
});

test('di default è aperto il giorno di oggi, gli altri sono chiusi', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());

  const aperte = await page.evaluate(() => Array.from(expandedBachecaDays));
  expect(aperte).toEqual([OGGI]);

  const corpi = page.locator('#bachecaContent .day-group-body');
  const indiceOggi = await page.evaluate(() => Array.from(document.querySelectorAll('#bachecaContent .day-group')).findIndex((el) => el.classList.contains('is-today')));
  for (let i = 0; i < await corpi.count(); i++) {
    if (i === indiceOggi) await expect(corpi.nth(i)).toBeVisible();
    else await expect(corpi.nth(i)).toBeHidden();
  }
});

test('toccando una giornata si apre, e si richiude ritoccandola', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());
  const giorno = unGiornoNonOggi();
  const indice = posizioneDi(giorno);
  const gruppo = gruppoDelGiorno(page, giorno);

  await expect(gruppo.locator('.day-group-body')).toBeHidden();
  await gruppo.locator('.day-group-head').click();
  await expect(gruppo.locator('.day-group-body')).toBeVisible();
  await expect(gruppo.locator('.day-group-body')).toContainText(`A${indice}`);

  await gruppo.locator('.day-group-head').click();
  await expect(gruppo.locator('.day-group-body')).toBeHidden();
});

test('il giorno di oggi è segnalato', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());
  await expect(page.locator('#bachecaContent .day-group.is-today .day-group-label')).toContainText('oggi');
});

test('con una sola giornata nella settimana, quella è già aperta', async ({ page }) => {
  await apriBacheca(page, [
    { id: '1', date: giornoDellaSettimana(3), athlete: 'Mario Rossi', mode: 'PUBLISHED', blocks: [{ title: 'Murph', type: 'For Time', explanation: '', result: '' }] },
  ]);

  await expect(page.locator('#bachecaContent .day-group')).toHaveCount(1);
  await expect(page.locator('#bachecaContent .day-group-body')).toBeVisible();
  await expect(page.locator('#bachecaContent .day-group-count')).toHaveText('1 lavoro');
});

test('scegliere un WOD da una giornata aperta porta quel lavoro nel form', async ({ page }) => {
  await apriBacheca(page, settimanaProgrammata());

  const giorno = unGiornoNonOggi();
  const indice = posizioneDi(giorno);
  const gruppo = gruppoDelGiorno(page, giorno);

  await gruppo.locator('.day-group-head').click();
  await gruppo.getByRole('button', { name: /QUESTO WOD/ }).nth(1).click(); // il secondo lavoro: B

  await expect(page.locator('[id^="workout-block-"]')).toHaveCount(1);
  await expect(page.locator('.block-title')).toHaveValue(`B${indice}`);
});
