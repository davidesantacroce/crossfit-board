// Utility condivise dai test Playwright. Mockano il backend Google Apps Script con un
// piccolo stato in memoria che accumula le POST (saveWodSession/deleteWod/saveMassimale/
// logResult), abbastanza fedele al comportamento reale da testare i flussi principali senza
// toccare il Foglio Google vero.
const path = require('path');

const INDEX_PATH = 'file://' + path.resolve(__dirname, '..', 'index.html');

function applyPost(state, body) {
  if (body.action === 'saveWodSession') {
    state.wods = state.wods.filter((w) => String(w.id) !== String(body.id));
    state.wods.push({ id: body.id, date: body.date, athlete: body.athlete, mode: body.mode, blocks: body.blocks });
  } else if (body.action === 'deleteWod') {
    state.wods = state.wods.filter((w) => String(w.id) !== String(body.id));
  } else if (body.action === 'saveMassimale') {
    state.massimali.push({ athlete: body.athlete, movement: body.movement, weight: body.weight, date: body.date });
  } else if (body.action === 'saveFunPhrase') {
    const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (state.funPhrases.some((f) => norm(f.text) === norm(body.text))) return { status: 'error', message: "Questa frase c'è già." };
    state.funPhrases.push({ id: body.id, text: String(body.text).replace(/\s+/g, ' ').trim(), athlete: body.athlete });
  } else if (body.action === 'deleteFunPhrase') {
    state.funPhrases = state.funPhrases.filter((f) => String(f.id) !== String(body.id));
  } else if (body.action === 'logResult') {
    const idx = state.results.findIndex((r) => String(r.id) === String(body.id));
    const entry = {
      id: body.id, athlete: body.athlete, date: body.date, workout: body.workout, workoutType: body.workoutType,
      scoreType: body.scoreType, scoreDetail: body.scoreDetail, scoreDisplay: body.score,
      category: body.category, movements: body.movements, notes: body.notes,
    };
    if (idx >= 0) state.results[idx] = entry;
    else state.results.unshift(entry);
  }
}

// Intercetta le chiamate all'endpoint Apps Script. Ritorna lo stato in memoria (wods/athletes/
// massimali/results), utile per fare assert su cosa è stato effettivamente "salvato".
async function mockBackend(page, initialData = {}) {
  const state = { wods: [], athletes: [], massimali: [], results: [], whoop: [], health: [], funPhrases: [], ...initialData };

  await page.route('**/macros/**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      // applyPost può rifiutare (es. una frase duplicata): in quel caso rispondiamo con
      // l'errore, come farebbe il backend vero.
      const esito = applyPost(state, JSON.parse(req.postData()));
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(esito || { status: 'success' }),
      });
    }
    if (req.url().includes('getData')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    }
  });

  return state;
}

// Apre l'app e aspetta che la schermata di caricamento iniziale sia sparita.
async function gotoApp(page) {
  await page.goto(INDEX_PATH);
  await page.waitForFunction(() => !document.getElementById('funLoadingOverlay').classList.contains('active'));
}

// Simula un login già avvenuto (bypassa PIN/overlay), come fanno i test esistenti in questa
// conversazione: imposta l'atleta attivo e nasconde l'overlay di login.
async function loginAs(page, athleteName) {
  await page.evaluate((name) => {
    document.getElementById('loginOverlay').style.display = 'none';
    localStorage.setItem('activeAthlete', name);
  }, athleteName);
}

module.exports = { INDEX_PATH, mockBackend, gotoApp, loginAs };
