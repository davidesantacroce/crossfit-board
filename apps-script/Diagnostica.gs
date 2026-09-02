// ── DIAGNOSI WHOOP (sola lettura) ────────────────────────────────────────────
// Verifica l'autorizzazione e conta quanti dati storici esistono sull'account
// Whoop collegato, guardando indietro 3 anni. NON scrive nulla sul foglio e
// NON stampa mai i token.
// Uso: seleziona diagnosiWhoop nel menu a tendina in alto -> Esegui ▶
//      poi copia il Log di esecuzione.
function diagnosiWhoop() {
  var props = PropertiesService.getScriptProperties();
  var token = getValidWhoopAccessToken_();

  Logger.log('=== DIAGNOSI WHOOP ===');
  Logger.log('Token valido ottenuto: ' + (token ? 'SI' : 'NO'));
  Logger.log('Refresh token salvato: ' + (props.getProperty('WHOOP_REFRESH_TOKEN') ? 'SI' : 'NO'));
  Logger.log('WHOOP_ATHLETE_NAME: ' + (props.getProperty('WHOOP_ATHLETE_NAME') || '(NON IMPOSTATO)'));
  if (!token) {
    Logger.log('Senza token non posso interrogare l\'API. Ricollega da SCRIPT_URL?whoopConnect=1');
    return;
  }

  // 1) Verifica che l'autorizzazione funzioni e a quale account e' collegata.
  var profRes = UrlFetchApp.fetch(WHOOP_API_BASE + '/v2/user/profile/basic', {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  Logger.log('');
  Logger.log('>>> profilo utente -> HTTP ' + profRes.getResponseCode());
  Logger.log(profRes.getContentText());

  // 2) Conta i dati storici disponibili, per tipo.
  var since = new Date();
  since.setFullYear(since.getFullYear() - 3);
  var startIso = Utilities.formatDate(since, 'UTC', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  Logger.log('');
  Logger.log('Finestra analizzata: dal ' + startIso + ' a oggi');

  var collezioni = [
    { nome: 'recovery',  path: '/v2/recovery',          campoData: 'created_at' },
    { nome: 'cycle',     path: '/v2/cycle',             campoData: 'start' },
    { nome: 'sleep',     path: '/v2/activity/sleep',    campoData: 'end' },
    { nome: 'workout',   path: '/v2/activity/workout',  campoData: 'start' }
  ];

  var MAX_PAGINE = 40; // ~1000 record per collezione, per non superare i limiti di esecuzione

  collezioni.forEach(function(c) {
    var totale = 0, scorati = 0, pagine = 0, nextToken = null;
    var primaData = null, ultimaData = null, esempio = null, errore = null;

    do {
      var url = WHOOP_API_BASE + c.path + '?limit=25&start=' + encodeURIComponent(startIso)
        + (nextToken ? '&nextToken=' + encodeURIComponent(nextToken) : '');
      var res = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true
      });

      if (res.getResponseCode() !== 200) {
        errore = 'HTTP ' + res.getResponseCode() + ' -> ' + res.getContentText().substring(0, 300);
        break;
      }

      var body = JSON.parse(res.getContentText());
      var records = body.records || [];
      records.forEach(function(r) {
        totale++;
        if (r.score_state === 'SCORED' && r.score) {
          scorati++;
          if (!esempio) esempio = r;
        }
        var d = r[c.campoData];
        if (d) {
          if (!primaData || d < primaData) primaData = d;
          if (!ultimaData || d > ultimaData) ultimaData = d;
        }
      });

      nextToken = body.next_token || null;
      pagine++;
    } while (nextToken && pagine < MAX_PAGINE);

    Logger.log('');
    if (errore) {
      Logger.log('>>> ' + c.nome + ': ERRORE ' + errore);
      return;
    }
    Logger.log('>>> ' + c.nome + ': ' + totale + ' record totali, di cui ' + scorati + ' con punteggio valido'
      + (nextToken ? ' (limite di ' + MAX_PAGINE + ' pagine raggiunto: ce ne sono altri)' : ''));
    Logger.log('    periodo: ' + (primaData || '-') + '  ->  ' + (ultimaData || '-'));
    if (esempio) {
      Logger.log('    esempio piu recente con punteggio: ' + JSON.stringify(esempio).substring(0, 500));
    }
  });

  Logger.log('');
  Logger.log('=== FINE DIAGNOSI ===');
}
