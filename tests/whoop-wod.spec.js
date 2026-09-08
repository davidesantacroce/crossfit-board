const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v55: i dati della fascia agganciati alla sessione registrata. Whoop salva solo la data (non
// l'ora) e una sessione non ha un'ora sua: l'abbinamento è per giornata, e quando ce n'è più di
// uno si mostrano tutti invece di sceglierne uno a caso.

function giorniFa(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const IERI = giorniFa(1);

const allenamentoFascia = (extra = {}) => ({
  athlete: 'Test Athlete', type: 'workout', date: IERI, recordId: 'wk1',
  data: { sportName: 'Functional Fitness', strain: 12.4, averageHeartRate: 152, maxHeartRate: 181, kilojoule: 2600 },
  ...extra,
});

const sessioneIeri = {
  id: 'w1', date: IERI, athlete: 'Test Athlete',
  blocks: [{ title: 'Fran', type: 'For Time', explanation: '21-15-9', result: '4:30', category: 'RX' }],
};

async function apriStorico(page) {
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('storico'));
}

test('sotto la sessione compaiono strain, battiti e calorie di quel giorno', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [sessioneIeri],
    whoop: [allenamentoFascia()],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriStorico(page);

  const striscia = page.locator('#historyList .wod-whoop');
  await expect(striscia).toHaveCount(1);
  await expect(striscia).toContainText('Functional Fitness');
  await expect(striscia).toContainText('Strain 12.4');
  await expect(striscia).toContainText('152 bpm medi');
  await expect(striscia).toContainText('max 181');
  await expect(striscia).toContainText('621 kcal'); // 2600 kJ
});

test('un giorno senza dati della fascia non mostra una striscia vuota', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [sessioneIeri, { id: 'w2', date: giorniFa(5), athlete: 'Test Athlete', blocks: [{ title: 'Grace', type: 'For Time', explanation: '', result: '2:30' }] }],
    whoop: [allenamentoFascia()],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriStorico(page);

  await expect(page.locator('#historyList .history-item')).toHaveCount(2);
  await expect(page.locator('#historyList .wod-whoop')).toHaveCount(1); // solo quella di ieri
});

test('con due allenamenti nello stesso giorno li mostra entrambi, senza sceglierne uno', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [sessioneIeri],
    whoop: [
      allenamentoFascia(),
      allenamentoFascia({ recordId: 'wk2', data: { sportName: 'Running', strain: 8.1, averageHeartRate: 140, maxHeartRate: 168, kilojoule: 1800 } }),
    ],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriStorico(page);

  await expect(page.locator('#historyList .wod-whoop-row')).toHaveCount(2);
  await expect(page.locator('#historyList .wod-whoop')).toContainText('Running');
  await expect(page.locator('#historyList .wod-whoop-note')).toContainText('2 allenamenti rilevati');
});

test('un WOD solo pubblicato non è un allenamento fatto: non è proprio nello Storico', async ({ page }) => {
  // Dalla v72 un WOD pubblicato senza punteggio è programmazione e nello Storico non compare
  // affatto: a maggior ragione non gli si attaccano i dati della fascia.
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'p1', date: IERI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Murph', type: 'For Time', explanation: '', result: '' }] }],
    whoop: [allenamentoFascia()],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriStorico(page);

  await expect(page.locator('#historyList .history-item')).toHaveCount(0);
  await expect(page.locator('#historyList .wod-whoop')).toHaveCount(0);
});

test('un WOD pubblicato e poi svolto i dati della fascia ce li ha', async ({ page }) => {
  // L'hai messo in bacheca per tutti e poi l'hai fatto: è un allenamento tuo a tutti gli effetti.
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [{ id: 'p1', date: IERI, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title: 'Murph', type: 'For Time', explanation: '', result: '42:00' }] }],
    whoop: [allenamentoFascia()],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriStorico(page);

  await expect(page.locator('#historyList .history-item')).toHaveCount(1);
  await expect(page.locator('#historyList .wod-whoop')).toHaveCount(1);
});

test('i dati di un altro atleta non finiscono sulla tua sessione', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [sessioneIeri],
    whoop: [allenamentoFascia({ athlete: 'Mario Rossi' })],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await apriStorico(page);

  await expect(page.locator('#historyList .wod-whoop')).toHaveCount(0);
});

test('la striscia si vede anche nella vista giorno del calendario', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    wods: [sessioneIeri],
    whoop: [allenamentoFascia()],
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate((d) => { switchTab('registra'); selectCalendarDate(d); }, IERI);

  await expect(page.locator('#registraDayView .wod-whoop')).toContainText('Strain 12.4');
});
