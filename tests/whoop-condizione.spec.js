const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v73: sotto l'allenamento si legge anche COME STAVI quella mattina (recovery, sonno, HRV,
// frequenza a riposo). Prima la striscia diceva solo quanto era costato il lavoro — strain,
// battiti, calorie — e senza lo stato di partenza un tempo alto o un carico basso non si
// sanno leggere.

function shift(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const IERI = shift(-1);

const sessione = { id: 's1', date: IERI, athlete: 'Test Athlete', blocks: [{ title: 'Fran', type: 'For Time', explanation: '', result: '7:42' }] };

const recovery = (score) => ({ athlete: 'Test Athlete', type: 'recovery', date: IERI, recordId: 'r1', data: { recoveryScore: score, restingHeartRate: 46, hrvMilli: 32.4 } });
const sonno = { athlete: 'Test Athlete', type: 'sleep', date: IERI, recordId: 's1', data: { sleepPerformancePercentage: 78 } };
const allenamento = { athlete: 'Test Athlete', type: 'workout', date: IERI, recordId: 'w1', data: { sportName: 'functional-fitness', strain: 14.2, averageHeartRate: 148, maxHeartRate: 181, kilojoule: 1800 } };

async function apriStorico(page, whoop) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], wods: [sessione], whoop });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('storico'));
}

test('sotto la sessione si legge recovery, sonno, HRV e frequenza a riposo', async ({ page }) => {
  await apriStorico(page, [recovery(45), sonno, allenamento]);

  const striscia = page.locator('#historyList .wod-whoop');
  await expect(striscia).toContainText('Come stavi');
  await expect(striscia).toContainText('Recovery 45%');
  await expect(striscia).toContainText('Sonno 78%');
  await expect(striscia).toContainText('HRV 32 ms');
  await expect(striscia).toContainText('FC riposo 46 bpm');
  // Restano anche i dati dell'allenamento, che erano già lì.
  await expect(striscia).toContainText('Strain 14.2');
});

test('lo stato del mattino sta prima dell\'allenamento', async ({ page }) => {
  await apriStorico(page, [recovery(45), sonno, allenamento]);

  // innerText applica il text-transform: uppercase della classe, quindi si confronta minuscolo.
  const righe = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#historyList .wod-whoop-row .wod-whoop-sport')).map((e) => e.innerText.trim().toLowerCase()));
  expect(righe[0]).toContain('come stavi');
  expect(righe[1]).toContain('functional-fitness');
});

test('il recovery è colorato secondo le soglie di Whoop', async ({ page }) => {
  await apriStorico(page, [recovery(28), sonno, allenamento]);
  await expect(page.locator('#historyList .wod-whoop .whoop-recovery-low')).toContainText('Recovery 28%');

  await apriStorico(page, [recovery(85), sonno, allenamento]);
  await expect(page.locator('#historyList .wod-whoop .whoop-recovery-high')).toContainText('Recovery 85%');
});

test('lo stato si vede anche se quel giorno la fascia non ha marcato un allenamento', async ({ page }) => {
  // Capita spesso: l'allenamento lo registri tu, la fascia quel giorno ha solo i dati del mattino.
  await apriStorico(page, [recovery(60), sonno]);

  const striscia = page.locator('#historyList .wod-whoop');
  await expect(striscia).toContainText('Recovery 60%');
  await expect(striscia).not.toContainText('Strain');
});

test('senza nessun dato della fascia non compare una striscia vuota', async ({ page }) => {
  await apriStorico(page, []);
  await expect(page.locator('#historyList .wod-whoop')).toHaveCount(0);
});

test('una metrica mancante non lascia un pezzo vuoto', async ({ page }) => {
  await apriStorico(page, [
    { athlete: 'Test Athlete', type: 'recovery', date: IERI, recordId: 'r1', data: { recoveryScore: 55 } },
  ]);

  const striscia = page.locator('#historyList .wod-whoop');
  await expect(striscia).toContainText('Recovery 55%');
  await expect(striscia).not.toContainText('HRV');
  await expect(striscia).not.toContainText('FC riposo');
  await expect(striscia).not.toContainText('Sonno');
});
