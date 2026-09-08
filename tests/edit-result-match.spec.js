const { test, expect } = require('@playwright/test');
const { mockBackend, gotoApp, loginAs } = require('./helpers');

// v71: aprendo in modifica un lavoro SENZA risultato, l'app ci attaccava il risultato di un
// altro lavoro dello stesso giorno e dello stesso tipo. Caso reale segnalato: l'8/09 c'erano
// cinque lavori, uno solo ("Weighted Ring Dip") aveva il punteggio 8/8/8 kg; aprendo "Tempo
// Weighted Strict Lean Away Pull Up" (Sets, senza risultato) compariva addosso quel punteggio,
// note comprese. Il ripiego "unico risultato di quel tipo in quel giorno" nasceva da quando una
// giornata era una sessione sola; dalla v48 sono più lavori singoli e non identifica più niente.

const G = '2026-09-08';

function wod(id, title, result) {
  return { id, date: G, athlete: 'Test Athlete', mode: 'PUBLISHED', blocks: [{ title, type: 'Sets', explanation: '3 sets', result, category: 'RX' }] };
}

const RISULTATO_RING_DIP = {
  id: 'r1', athlete: 'Test Athlete', date: G, workout: 'Weighted Ring Dip', workoutType: 'Sets',
  scoreType: 'Weight', scoreDetail: {}, scoreDisplay: '8/8/8 kg', category: 'RX', movements: '', notes: '5 reps 12kg - poi 6reps',
};

async function apri(page, dati) {
  await mockBackend(page, { athletes: [{ name: 'Test Athlete', hasPin: false }], ...dati });
  await gotoApp(page);
  await loginAs(page, 'Test Athlete');
  await page.evaluate(() => fetchCloudData());
}

test('un lavoro senza risultato non si prende quello di un altro lavoro dello stesso giorno', async ({ page }) => {
  await apri(page, {
    wods: [wod('w1', 'Weighted Ring Dip', '8/8/8 kg'), wod('w2', 'Tempo Weighted Strict Lean Away Pull Up', '')],
    results: [RISULTATO_RING_DIP],
  });

  await page.evaluate(() => editWodSession('w2'));

  // Nessun risultato agganciato: né in memoria né nel riquadro verde del blocco.
  expect(await page.evaluate(() => Object.keys(blockResults).length)).toBe(0);
  await expect(page.locator('#registraFormCard')).not.toContainText('8/8/8 kg');
  await expect(page.locator('#registraFormCard')).not.toContainText('5 reps 12kg');
});

test('il lavoro che il risultato ce l\'ha davvero se lo ritrova, note comprese', async ({ page }) => {
  await apri(page, {
    wods: [wod('w1', 'Weighted Ring Dip', '8/8/8 kg'), wod('w2', 'Tempo Weighted Strict Lean Away Pull Up', '')],
    results: [RISULTATO_RING_DIP],
  });

  await page.evaluate(() => editWodSession('w1'));

  expect(await page.evaluate(() => Object.keys(blockResults).length)).toBe(1);
  await expect(page.locator('#registraFormCard')).toContainText('8/8/8 kg');
  await expect(page.locator('#registraFormCard')).toContainText('5 reps 12kg');
});

test('un lavoro rinominato ritrova il suo risultato grazie al punteggio', async ({ page }) => {
  // Il titolo sul blocco non combacia più con quello registrato nel risultato, ma il punteggio
  // salvato sul blocco sì: è quello a tenere insieme l'abbinamento.
  await apri(page, {
    wods: [wod('w1', 'Ring Dip zavorrato', '8/8/8 kg')],
    results: [RISULTATO_RING_DIP],
  });

  await page.evaluate(() => editWodSession('w1'));

  await expect(page.locator('#registraFormCard')).toContainText('5 reps 12kg'); // le note vengono dal Log Result
});

test('un lavoro rinominato con un punteggio diverso non ruba il risultato altrui', async ({ page }) => {
  await apri(page, {
    wods: [wod('w1', 'Un altro lavoro', '60 kg')],
    results: [RISULTATO_RING_DIP],
  });

  await page.evaluate(() => editWodSession('w1'));

  // Tiene il proprio punteggio salvato sul blocco, senza le note di un risultato non suo.
  await expect(page.locator('#registraFormCard')).toContainText('60 kg');
  await expect(page.locator('#registraFormCard')).not.toContainText('5 reps 12kg');
});

test('due Parti della stessa riga non rivendicano lo stesso risultato', async ({ page }) => {
  await apri(page, {
    wods: [{ id: 'v1', date: G, athlete: 'Test Athlete', blocks: [
      { title: 'Weighted Ring Dip', type: 'Sets', explanation: '', result: '8/8/8 kg', category: 'RX' },
      { title: 'Weighted Ring Dip', type: 'Sets', explanation: '', result: '8/8/8 kg', category: 'RX' },
    ] }],
    results: [RISULTATO_RING_DIP],
  });

  await page.evaluate(() => editWodSession('v1'));

  const ids = await page.evaluate(() => Object.values(blockResults).map((r) => String(r.id)));
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2); // il secondo blocco ricade sul punteggio del blocco, non sullo stesso Log Result
});
