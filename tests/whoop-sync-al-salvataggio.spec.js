const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v74: salvando un allenamento l'app chiede subito al backend di risincronizzare la fascia,
// invece di aspettare il trigger delle 6 del mattino. Registrando la sera, i dati Whoop di
// quel giorno si sarebbero visti solo l'indomani.

function oggi() {
  return new Date().toISOString().slice(0, 10);
}

const rigaFascia = {
  athlete: 'Test Athlete', type: 'workout', date: oggi(), recordId: 'w-nuovo',
  data: { sportName: 'functional-fitness', strain: 13.1, averageHeartRate: 150, maxHeartRate: 178, kilojoule: 1700 },
};

async function salvaUnAllenamento(page) {
  await page.evaluate(() => switchTab('registra'));
  // Dopo il primo salvataggio il bottone diventa "+ Registra un ALTRO allenamento per oggi".
  await page.getByRole('button', { name: /\+ Registra un (altro )?allenamento per oggi/ }).click();
  await page.evaluate(() => addWorkoutBlock('For Time', 'Fran', '21-15-9'));
  await page.evaluate(() => saveWodSession());
}

test('salvando un allenamento parte la sincronizzazione della fascia', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());

  await salvaUnAllenamento(page);
  await expect.poll(() => state.syncWhoopCalls || 0).toBe(1);
});

test('i dati arrivati con la sincronizzazione compaiono da soli, senza ricaricare', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  // La riga della fascia entra nel foglio solo quando il sync gira.
  state.whoopInArrivo = [rigaFascia];

  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());

  await salvaUnAllenamento(page);

  // Dopo il salvataggio si finisce nello Storico: la striscia deve comparire da sé.
  await expect(page.locator('#historyList .wod-whoop')).toHaveCount(1);
  await expect(page.locator('#historyList .wod-whoop')).toContainText('Strain 13.1');
});

test('salvare più lavori di fila non fa partire più sincronizzazioni complete', async ({ page }) => {
  // Il caso reale: quattro lavori salvati in quattro minuti. La strozzatura sta nel backend,
  // quindi le chiamate ci sono ma solo la prima sincronizza davvero.
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());

  await salvaUnAllenamento(page);
  await expect.poll(() => state.syncWhoopCalls || 0).toBe(1);
  const primoSync = state.whoopSync.at;

  await salvaUnAllenamento(page);
  await expect.poll(() => state.syncWhoopCalls || 0).toBe(2);
  expect(state.whoopSync.at).toBe(primoSync); // la seconda chiamata non ha risincronizzato
});

test('un salvataggio messo in coda offline non chiama la sincronizzazione', async ({ page }) => {
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }));

  await salvaUnAllenamento(page);
  await expect.poll(() => (state.wods || []).length).toBe(0); // in coda, non sul Foglio
  await page.waitForTimeout(300);
  expect(state.syncWhoopCalls || 0).toBe(0);
});

test('se il backend non conosce ancora syncWhoop il salvataggio non ne risente', async ({ page }) => {
  // Backend non ancora ridistribuito: ignora l'azione sconosciuta e risponde "success" secco.
  const state = await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }] });
  await page.route('**/macros/**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && JSON.parse(req.postData()).action === 'syncWhoop') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    }
    return route.fallback();
  });

  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  page.on('dialog', (d) => d.accept());

  await salvaUnAllenamento(page);
  await expect.poll(() => (state.wods || []).length).toBe(1); // salvato lo stesso
  await expect(page.locator('#historyList')).toContainText('Fran');
});

test('una sincronizzazione fallita viene detta, invece di dare la colpa alla fascia', async ({ page }) => {
  await mockBackend(page, {
    athletes: [{ name: 'Test Athlete', hasPin: false }],
    whoop: [rigaFascia],
    whoopSync: { ok: false, message: 'Nessun token Whoop valido: ricollega da SCRIPT_URL?whoopConnect=1', at: Date.now() },
  });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
  await page.evaluate(() => switchTab('atleta'));

  await expect(page.locator('#whoopCard .whoop-date')).toContainText('ultima sincronizzazione non è riuscita');
  await expect(page.locator('#whoopCard .whoop-date')).toContainText('token Whoop');
});
