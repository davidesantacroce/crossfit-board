const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v49: la riga del calendario in REGISTRA è una finestra scorrevole centrata su oggi, non più
// la settimana fissa domenica-sabato (che di domenica nascondeva ieri e di sabato domani).

function shiftDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Le date dei 7 giorni mostrati, nell'ordine in cui compaiono nella riga.
function giorniMostrati(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('#calendarDaysRow .calendar-day')).map((el) =>
      (el.getAttribute('onclick').match(/'([\d-]{10})'/) || [])[1]
    )
  );
}

test('ieri, oggi e domani sono sempre nella riga, qualunque giorno della settimana sia oggi', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => switchTab('registra'));

  const giorni = await giorniMostrati(page);
  expect(giorni).toHaveLength(7);
  expect(giorni).toContain(shiftDays(-1));
  expect(giorni).toContain(shiftDays(0));
  expect(giorni).toContain(shiftDays(1));
  expect(giorni[3]).toBe(shiftDays(0)); // oggi al centro dei 7
});

test('la lettera sotto ogni giorno resta quella del giorno vero, anche se la riga è scorsa', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => switchTab('registra'));

  const coppie = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#calendarDaysRow .calendar-day')).map((el) => ({
      data: (el.getAttribute('onclick').match(/'([\d-]{10})'/) || [])[1],
      lettera: el.querySelector('.calendar-day-name').innerText,
    }))
  );

  const attese = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
  for (const { data, lettera } of coppie) {
    expect(lettera).toBe(attese[new Date(data + 'T00:00:00').getDay()]);
  }
});

test('toccando un giorno già visibile la riga non si sposta sotto il dito', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => switchTab('registra'));
  const prima = await giorniMostrati(page);

  await page.evaluate((d) => selectCalendarDate(d), shiftDays(-3)); // il primo della riga
  expect(await giorniMostrati(page)).toEqual(prima);

  await page.evaluate((d) => selectCalendarDate(d), shiftDays(3)); // l'ultimo della riga
  expect(await giorniMostrati(page)).toEqual(prima);
});

test('scegliendo una data fuori dalla riga (picker 📅) la finestra si ricentra su quella', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => switchTab('registra'));

  const lontano = shiftDays(-30);
  await page.evaluate((d) => jumpToCalendarDate(d), lontano);

  const giorni = await giorniMostrati(page);
  expect(giorni[3]).toBe(lontano); // al centro della nuova finestra
  expect(giorni).toContain(shiftDays(-31));
  expect(giorni).toContain(shiftDays(-29));
});

test('le frecce spostano la finestra di 7 giorni pieni, senza sovrapposizioni', async ({ page }) => {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => switchTab('registra'));
  const prima = await giorniMostrati(page);

  await page.evaluate(() => shiftCalendarWeek(1));
  const dopo = await giorniMostrati(page);

  expect(dopo).toHaveLength(7);
  expect(dopo.filter((d) => prima.includes(d))).toEqual([]); // nessun giorno ripetuto
  expect(dopo[0]).toBe(shiftDays(4)); // riparte dal giorno dopo l'ultimo di prima

  await page.evaluate(() => shiftCalendarWeek(-1));
  expect(await giorniMostrati(page)).toEqual(prima); // e si torna esattamente indietro
});
