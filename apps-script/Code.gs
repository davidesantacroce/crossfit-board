function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Azione per salvare una sessione di allenamento (Multi-blocco o Singola)
    if (data.action === 'saveWodSession' || data.action === 'saveWod') {
      var sheet = ss.getSheetByName("Wods") || ss.insertSheet("Wods");

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["id", "date", "athlete", "type", "mode", "title", "explanation", "exercises", "result", "notes"]);
      } else {
        ensureColumnExists(sheet, "explanation");
      }

      var dateColIndex = getColumnIndex(sheet, "date");
      if (dateColIndex > 0) {
        sheet.getRange(1, dateColIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
      }

      if (data.blocks && Array.isArray(data.blocks)) {
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

        data.blocks.forEach(function(block, index) {
          var exercisesFormatted = (block.exercises || []).map(function(ex) {
            var repStr = ex.reps ? ex.reps + " " : "";
            var weightStr = ex.weight ? " (" + ex.weight + ")" : "";
            return "• " + repStr + ex.name + weightStr;
          }).join("\n");

          var resultVal = "";
          if (block.type === 'Sets' && Array.isArray(block.result)) {
            resultVal = JSON.stringify(block.result);
          } else {
            resultVal = block.result || "";
          }

          var rowMap = {
            "id": data.id + "_" + index,
            "date": String(data.date || ""),
            "athlete": data.athlete,
            "type": block.type,
            "mode": data.mode,
            "title": block.title || "WOD",
            "explanation": block.explanation || "",
            "exercises": exercisesFormatted,
            "result": resultVal,
            "notes": data.notes || ""
          };
          var newRow = headers.map(function(h) {
            return rowMap.hasOwnProperty(h) ? rowMap[h] : "";
          });

          sheet.appendRow(newRow);
        });
      }

      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Gestione salvataggio Atleti
    if (data.action === 'saveAthlete') {
      var sheet = ss.getSheetByName("Athletes") || ss.insertSheet("Athletes");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["name", "age", "weight", "height"]);
      }
      ensureColumnExists(sheet, "pin");
      var pinColIndex = getColumnIndex(sheet, "pin");

      var rows = sheet.getDataRange().getValues();
      var found = false;

      for (var i = 1; i < rows.length; i++) {
        if (normalizeAthleteName_(rows[i][0]) === normalizeAthleteName_(data.name)) {
          // Registrarsi con un nome già in uso non deve poter sovrascrivere il PIN di chi c'è
          // già: sarebbe un modo per impossessarsi del profilo altrui (storico, massimali,
          // risultati). Un profilo ancora SENZA PIN resta rivendicabile, com'è già per setPin.
          var existingPin = pinColIndex > 0 ? String(rows[i][pinColIndex - 1] || "") : "";
          if (data.pin && existingPin) {
            return ContentService.createTextOutput(JSON.stringify({
              "status": "error",
              "message": "Esiste già un atleta con questo nome. Se sei tu, accedi con il tuo PIN invece di registrarti di nuovo."
            })).setMimeType(ContentService.MimeType.JSON);
          }
          sheet.getRange(i + 1, 2).setValue(data.age);
          sheet.getRange(i + 1, 3).setValue(data.weight);
          if (data.pin && pinColIndex > 0) {
            sheet.getRange(i + 1, pinColIndex).setValue(hashPin(data.pin));
          }
          found = true;
          break;
        }
      }

      if (!found) {
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        // Salviamo il nome con gli spazi normalizzati (maiuscole originali intatte): così due
        // registrazioni che differiscono solo per spaziatura non generano due atleti.
        var nomePulito = String(data.name || '').replace(/\s+/g, ' ').trim();
        var rowMap = { "name": nomePulito, "age": data.age, "weight": data.weight, "height": "", "pin": data.pin ? hashPin(data.pin) : "" };
        var newRow = headers.map(function(h) { return rowMap.hasOwnProperty(h) ? rowMap[h] : ""; });
        sheet.appendRow(newRow);
      }

      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Crea il PIN la prima volta che un atleta accede (non ne ha ancora uno impostato)
    if (data.action === 'setPin') {
      var sheet = ss.getSheetByName("Athletes");
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Nessun atleta trovato."})).setMimeType(ContentService.MimeType.JSON);
      ensureColumnExists(sheet, "pin");
      var pinColIndex = getColumnIndex(sheet, "pin");
      var rows = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        if (normalizeAthleteName_(rows[i][0]) === normalizeAthleteName_(data.name)) {
          var existingPin = String(rows[i][pinColIndex - 1] || "");
          if (existingPin) {
            return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "PIN già impostato: usa quello esistente."})).setMimeType(ContentService.MimeType.JSON);
          }
          sheet.getRange(i + 1, pinColIndex).setValue(hashPin(data.pin));
          found = true;
          break;
        }
      }
      if (!found) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Atleta non trovato."})).setMimeType(ContentService.MimeType.JSON);
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Verifica il PIN al login, con blocco temporaneo dopo troppi tentativi falliti
    if (data.action === 'verifyPin') {
      var sheet = ss.getSheetByName("Athletes");
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Nessun atleta trovato."})).setMimeType(ContentService.MimeType.JSON);

      var cacheKey = 'pinfail_' + data.name.toLowerCase();
      var cache = CacheService.getScriptCache();
      var failCount = Number(cache.get(cacheKey) || 0);
      if (failCount >= 5) {
        return ContentService.createTextOutput(JSON.stringify({"status": "locked"})).setMimeType(ContentService.MimeType.JSON);
      }

      var pinColIndex = getColumnIndex(sheet, "pin");
      var rows = sheet.getDataRange().getValues();
      var storedHash = "";
      for (var i = 1; i < rows.length; i++) {
        if (normalizeAthleteName_(rows[i][0]) === normalizeAthleteName_(data.name)) {
          storedHash = pinColIndex > 0 ? String(rows[i][pinColIndex - 1] || "") : "";
          break;
        }
      }

      var valid = !!storedHash && storedHash === hashPin(data.pin);
      if (valid) { cache.remove(cacheKey); } else { cache.put(cacheKey, String(failCount + 1), 300); }

      return ContentService.createTextOutput(JSON.stringify({"status": "success", "valid": valid})).setMimeType(ContentService.MimeType.JSON);
    }

    // Gestione salvataggio Massimali (storico: ogni salvataggio accoda una riga datata)
    if (data.action === 'saveMassimale') {
      var sheet = ss.getSheetByName("Massimali") || ss.insertSheet("Massimali");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["athlete", "movement", "weight", "date"]);
      } else {
        ensureColumnExists(sheet, "date");
      }

      var dateColIndex = getColumnIndex(sheet, "date");
      if (dateColIndex > 0) {
        sheet.getRange(1, dateColIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowMap = {
        "athlete": data.athlete,
        "movement": data.movement,
        "weight": data.weight,
        "date": String(data.date || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd"))
      };
      var newRow = headers.map(function(h) { return rowMap.hasOwnProperty(h) ? rowMap[h] : ""; });
      sheet.appendRow(newRow);

      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Gestione salvataggio Log Result (risultato dettagliato di un blocco WOD)
    if (data.action === 'logResult') {
      var sheet = ss.getSheetByName("Results") || ss.insertSheet("Results");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["id", "athlete", "date", "workout", "workoutType", "scoreType", "scoreDetail", "score", "category", "movements", "notes"]);
      } else {
        ensureColumnExists(sheet, "scoreDetail");
      }

      var dateColIndex = getColumnIndex(sheet, "date");
      if (dateColIndex > 0) {
        sheet.getRange(1, dateColIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowMap = {
        "id": String(data.id || Date.now()),
        "athlete": data.athlete,
        "date": String(data.date || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd")),
        "workout": data.workout || "",
        "workoutType": data.workoutType || "",
        "scoreType": data.scoreType || "",
        "scoreDetail": data.scoreDetail ? JSON.stringify(data.scoreDetail) : "",
        "score": data.score || "",
        "category": data.category || "",
        "movements": data.movements || "",
        "notes": data.notes || ""
      };
      var newRow = headers.map(function(h) { return rowMap.hasOwnProperty(h) ? rowMap[h] : ""; });

      var idColIndex = getColumnIndex(sheet, "id");
      var rows = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][idColIndex - 1]) === rowMap.id) {
          sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow(newRow);
      }

      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Gestione eliminazione di un risultato loggato
    if (data.action === 'deleteResult') {
      var sheet = ss.getSheetByName("Results");
      if (sheet) {
        var idColIndex = getColumnIndex(sheet, "id");
        var rows = sheet.getDataRange().getValues();
        for (var i = rows.length - 1; i >= 1; i--) {
          if (String(rows[i][idColIndex - 1]) === String(data.id)) {
            sheet.deleteRow(i + 1);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Frasi divertenti mostrate durante il caricamento: sono battute interne alla palestra,
    // quindi vanno condivise fra tutti e aggiungibili dall'app, senza passare dal codice.
    if (data.action === 'saveFunPhrase') {
      var sheet = ss.getSheetByName("Frasi") || ss.insertSheet("Frasi");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["id", "text", "athlete", "createdAt"]);
      }

      var testo = String(data.text || '').replace(/\s+/g, ' ').trim();
      if (!testo) {
        return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "La frase è vuota."})).setMimeType(ContentService.MimeType.JSON);
      }
      if (testo.length > 120) {
        return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "La frase è troppo lunga (massimo 120 caratteri)."})).setMimeType(ContentService.MimeType.JSON);
      }

      // Niente doppioni: la frase comparirebbe due volte nell'estrazione casuale, con il
      // risultato di sembrare "uscita di nuovo" più spesso delle altre.
      var righeEsistenti = sheet.getDataRange().getValues();
      var testoColIndex = getColumnIndex(sheet, "text");
      for (var i = 1; i < righeEsistenti.length; i++) {
        if (String(righeEsistenti[i][testoColIndex - 1] || '').trim().toLowerCase() === testo.toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Questa frase c'è già."})).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowMap = {
        "id": String(data.id || Date.now()),
        "text": testo,
        "athlete": data.athlete || "",
        "createdAt": new Date()
      };
      sheet.appendRow(headers.map(function(h) { return rowMap.hasOwnProperty(h) ? rowMap[h] : ""; }));

      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'deleteFunPhrase') {
      var sheet = ss.getSheetByName("Frasi");
      if (sheet) {
        var idColIndex = getColumnIndex(sheet, "id");
        var rows = sheet.getDataRange().getValues();
        for (var i = rows.length - 1; i >= 1; i--) {
          if (String(rows[i][idColIndex - 1]) === String(data.id)) {
            sheet.deleteRow(i + 1);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Gestione eliminazione WOD
    if (data.action === 'deleteWod') {
      var sheet = ss.getSheetByName("Wods");
      if (sheet) {
        var rows = sheet.getDataRange().getValues();
        for (var i = rows.length - 1; i >= 1; i--) {
          var rowId = rows[i][0].toString();
          if (rowId === data.id || rowId.indexOf(data.id + "_") === 0) {
            sheet.deleteRow(i + 1);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Riceve una misurazione di salute (peso/composizione dalla bilancia, frequenza cardiaca a
    // riposo/passi/calorie dall'Apple Watch) inviata da un Comando iOS che legge da Salute.
    if (data.action === 'saveHealthData') {
      return ContentService.createTextOutput(JSON.stringify(saveHealthPayload_(data, ss))).setMimeType(ContentService.MimeType.JSON);
    }


  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Confronto fra nomi di atleta: senza distinzione di maiuscole e con gli spazi interni
// normalizzati, così "mario  rossi " e "Mario Rossi" sono la stessa persona e non due profili
// distinti che poi si dividono storico, classifiche e massimali.
function normalizeAthleteName_(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Calcola l'hash SHA-256 (esadecimale) di un PIN: non salviamo/confrontiamo mai il PIN in chiaro.
function hashPin(pin) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin));
  return digest.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

// Aggiunge una colonna con l'intestazione indicata se non è già presente nel foglio
function ensureColumnExists(sheet, headerName) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf(headerName) === -1) {
    sheet.getRange(1, lastCol + 1).setValue(headerName);
  }
}

// Ritorna l'indice (1-based) di una colonna dato il nome della sua intestazione, o -1 se non esiste
function getColumnIndex(sheet, headerName) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = headers.indexOf(headerName);
  return idx === -1 ? -1 : idx + 1;
}

// Formatta un valore data (che potrebbe essere un oggetto Date di Sheets o già una stringa)
// in una stringa pulita YYYY-MM-DD, usando il fuso orario del foglio per evitare sfasamenti
function formatDateValue(value, timeZone) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, timeZone, "yyyy-MM-dd");
  }
  var str = String(value);
  var match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}

// I valori che arrivano da un Comando iOS possono includere l'unità di misura e usare la
// virgola come separatore decimale ("78,4 kg", "8.400 passi", "540 kcal"): li normalizziamo
// qui, così il Comando può limitarsi a passare il campione di Salute così com'è invece di
// dover contenere un'azione "Numero" per ogni singola metrica.
function parseHealthNumber_(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'number') return isNaN(raw) ? '' : raw;

  var s = String(raw).replace(/[^0-9,.\-]/g, ''); // via unità di misura, spazi, testo
  if (!s) return '';

  var commas = (s.match(/,/g) || []).length;
  var dots = (s.match(/\./g) || []).length;

  if (commas && dots) {
    // Entrambi presenti: l'ULTIMO è il separatore decimale ("1.234,5" all'italiana,
    // "1,234.5" all'inglese), l'altro separa le migliaia.
    var decimalIsComma = s.lastIndexOf(',') > s.lastIndexOf('.');
    s = decimalIsComma ? s.split('.').join('').replace(',', '.') : s.split(',').join('');
  } else if (commas || dots) {
    // Un separatore solo: è SEMPRE il decimale.
    //
    // Qui prima c'era una regola che con esattamente tre cifre dopo il separatore assumeva le
    // migliaia ("8.400" passi). Sbagliata: Comandi manda i valori di Salute senza raggruppare
    // le migliaia e con parecchi decimali (il peso è arrivato come "78.100000001"), quindi
    // "28.859" erano 28,859 kcal e quella regola le trasformava in 28859 — mille volte tanto,
    // in silenzio. Più separatori uguali restano migliaia ("1.234.567"), lì non c'è ambiguità.
    var sep = commas ? ',' : '.';
    var isThousands = (commas || dots) > 1;
    s = isThousands ? s.split(sep).join('') : s.split(sep).join('.');
  }

  var n = Number(s);
  if (isNaN(n)) return '';

  // Apple Health converte le unità internamente e restituisce valori con code in virgola
  // mobile ("78.100000001" per 78,1 kg). Tre decimali sono ben oltre la precisione utile di
  // qualunque metrica qui (peso, percentuale, bpm, passi, kcal) e tolgono il rumore.
  return Math.round(n * 1000) / 1000;
}

// Scrive una misurazione di salute nel foglio "Health", una riga per giorno+atleta.
// Condivisa da doPost (corpo JSON) e doGet (valori nei parametri dell'URL): quest'ultima
// permette a un Comando iOS di mandare i dati con una sola azione "Ottieni contenuto di URL",
// senza costruire un JSON sul telefono.
// L'endpoint è pubblico, quindi richiede il segreto condiviso HEALTH_INGEST_SECRET.
function saveHealthPayload_(data, ss) {
  var props = PropertiesService.getScriptProperties();
  var expectedSecret = props.getProperty('HEALTH_INGEST_SECRET');
  if (!expectedSecret || data.secret !== expectedSecret) {
    return { status: "error", message: "Non autorizzato." };
  }

  var athlete = props.getProperty('HEALTH_ATHLETE_NAME');
  if (!athlete) {
    return { status: "error", message: "Manca HEALTH_ATHLETE_NAME nelle Script Properties." };
  }

  var sheet = ss.getSheetByName("Health") || ss.insertSheet("Health");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["athlete", "date", "weight", "bodyFatPercentage", "restingHeartRate", "steps", "activeEnergy", "updatedAt"]);
  }

  var dateColIndex = getColumnIndex(sheet, "date");
  if (dateColIndex > 0) {
    sheet.getRange(1, dateColIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
  }

  var dateStr = String(data.date || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd"));
  var athleteColIndex = getColumnIndex(sheet, "athlete");
  var rows = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][dateColIndex - 1]) === dateStr && rows[i][athleteColIndex - 1] === athlete) {
      foundRow = i;
      break;
    }
  }
  var existingRow = foundRow >= 0 ? rows[foundRow] : null;

  // Un giorno può ricevere più chiamate separate (es. il peso da un Comando al mattino, i
  // passi da un altro alla sera): aggiorniamo solo i campi presenti in QUESTA chiamata,
  // senza cancellare quelli già scritti in precedenza per lo stesso giorno.
  // Passi ed energia attiva sono totali che durante la giornata possono solo crescere: se
  // arriva un valore più basso di quello già salvato per lo stesso giorno è quasi certamente
  // un totale parziale (Comando eseguito prima, o configurato per leggere l'ultimo campione
  // invece della somma di oggi), e sovrascriverlo peggiorerebbe il dato. Teniamo il massimo,
  // così si può anche far girare l'automazione più volte al giorno.
  // Peso, percentuale di grasso e FC a riposo NON sono cumulativi: lì l'ultima misurazione
  // è la più giusta e deve poter sostituire la precedente, anche verso il basso.
  var CUMULATIVI = { steps: true, activeEnergy: true };

  var saved = [];
  var fieldValue = function(key) {
    var parsed = parseHealthNumber_(data[key]);
    var precedente = "";
    if (existingRow) {
      var idx = getColumnIndex(sheet, key);
      if (idx > 0) precedente = existingRow[idx - 1];
    }

    if (parsed === '') return precedente;

    if (CUMULATIVI[key] && precedente !== "" && Number(precedente) > parsed) {
      return precedente;
    }

    saved.push(key);
    return parsed;
  };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowMap = {
    "athlete": athlete,
    "date": dateStr,
    "weight": fieldValue('weight'),
    "bodyFatPercentage": fieldValue('bodyFatPercentage'),
    "restingHeartRate": fieldValue('restingHeartRate'),
    "steps": fieldValue('steps'),
    "activeEnergy": fieldValue('activeEnergy'),
    "updatedAt": new Date()
  };
  var newRow = headers.map(function(h) { return rowMap.hasOwnProperty(h) ? rowMap[h] : ""; });

  if (foundRow >= 0) {
    sheet.getRange(foundRow + 1, 1, 1, newRow.length).setValues([newRow]);
  } else {
    sheet.appendRow(newRow);
  }

  // 'saved' elenca cosa è stato effettivamente scritto: eseguendo il Comando a mano, la
  // risposta dice subito se il valore è arrivato o se il campo era vuoto.
  return { status: "success", date: dateStr, saved: saved };
}

// Funzione doGet aggiornata per raggruppare i blocchi dello stesso WOD
function doGet(e) {
  // --- Instradamento Whoop: separato dalle chiamate normali dell'app, che non passano mai
  // questi parametri (l'app usa sempre e solo ?action=getData). ---
  if (e && e.parameter && e.parameter.whoopConnect) {
    return handleWhoopConnect_();
  }
  if (e && e.parameter && (e.parameter.code || e.parameter.error)) {
    return handleWhoopCallback_(e);
  }

  // --- Dati salute anche via GET, con i valori nei parametri dell'URL ---
  // Serve a tenere il Comando iOS a DUE sole azioni: leggere il campione da Salute e chiamare
  // questo URL con la variabile dentro. Costruire un JSON sul telefono richiedeva invece
  // azioni Numero/Data/Testo/Dizionario per ogni metrica, troppo lavoro manuale.
  // Il segreto viaggia nella query string invece che nel corpo: un po' più esposto (gli URL
  // finiscono nei log più facilmente), ma difende dalla stessa cosa — che chi conosce l'URL
  // /exec possa scriverci dentro. L'operazione è idempotente (upsert per giorno+atleta),
  // quindi una GET ripetuta non fa danni.
  if (e && e.parameter && e.parameter.action === 'saveHealthData') {
    var healthLock = LockService.getScriptLock();
    healthLock.tryLock(10000);
    try {
      var healthResult = saveHealthPayload_(e.parameter, SpreadsheetApp.getActiveSpreadsheet());
      return ContentService.createTextOutput(JSON.stringify(healthResult)).setMimeType(ContentService.MimeType.JSON);
    } finally {
      healthLock.releaseLock();
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var timeZone = ss.getSpreadsheetTimeZone();

  function getSheetData(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return [];
    var headers = rows[0];
    var data = [];

    for (var i = 1; i < rows.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j].toLowerCase()] = rows[i][j];
      }
      data.push(obj);
    }
    return data;
  }

  var rawWods = getSheetData("Wods");
  var wodsMap = {};

  rawWods.forEach(function(row) {
    var fullId = String(row.id || "");
    var mainId = fullId.includes("_") ? fullId.split("_")[0] : fullId;

    if (!wodsMap[mainId]) {
      wodsMap[mainId] = {
        id: mainId,
        date: formatDateValue(row.date, timeZone),
        athlete: row.athlete,
        mode: row.mode,
        notes: row.notes,
        blocks: []
      };
    }

    var parsedResult = row.result;
    try {
      if (typeof row.result === 'string' && row.result.startsWith('[')) {
        parsedResult = JSON.parse(row.result);
      }
    } catch(err) {}

    wodsMap[mainId].blocks.push({
      title: row.title,
      type: row.type,
      explanation: row.explanation || "",
      result: parsedResult,
      exercises: []
    });
  });

  var aggregatedWods = Object.keys(wodsMap).map(function(key) {
    return wodsMap[key];
  });

  var result = {
    wods: aggregatedWods,
    athletes: getSheetData("Athletes").map(function(a) {
      return { name: a.name, age: a.age, weight: a.weight, height: a.height, hasPin: !!(a.pin && String(a.pin).length > 0) };
    }),
    massimali: getSheetData("Massimali"),
    results: getSheetData("Results").map(function(r) {
      var parsedDetail = {};
      try {
        if (r.scoredetail && typeof r.scoredetail === 'string' && r.scoredetail.length > 0) {
          parsedDetail = JSON.parse(r.scoredetail);
        }
      } catch (err) {}
      return {
        id: r.id,
        athlete: r.athlete,
        date: formatDateValue(r.date, timeZone),
        workout: r.workout,
        workoutType: r.workouttype,
        scoreType: r.scoretype,
        scoreDetail: parsedDetail,
        scoreDisplay: r.score,
        category: r.category,
        movements: r.movements,
        notes: r.notes
      };
    }),
    whoop: getSheetData("Whoop").map(function(w) {
      var parsed = {};
      try { parsed = w.data ? JSON.parse(w.data) : {}; } catch (err) {}
      return { athlete: w.athlete, type: w.type, date: w.date, recordId: w.recordid, data: parsed };
    }),
    funPhrases: getSheetData("Frasi").map(function(f) {
      return { id: f.id, text: f.text, athlete: f.athlete };
    }),
    health: getSheetData("Health").map(function(h) {
      return {
        athlete: h.athlete,
        date: formatDateValue(h.date, timeZone),
        weight: h.weight,
        bodyFatPercentage: h.bodyfatpercentage,
        restingHeartRate: h.restingheartrate,
        steps: h.steps,
        activeEnergy: h.activeenergy
      };
    })
  };

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ===================== INTEGRAZIONE WHOOP =====================
// Prima di usarla: registra l'app su developer-dashboard.whoop.com (Redirect URI = l'URL di
// questo Web App), poi vai su Impostazioni progetto → Proprietà script e aggiungi:
//   WHOOP_CLIENT_ID      = il Client ID
//   WHOOP_CLIENT_SECRET  = il Client Secret
//   WHOOP_ATHLETE_NAME   = il tuo nome esatto come compare nel foglio Athletes

var WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
var WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
var WHOOP_API_BASE = "https://api.prod.whoop.com/developer";
var WHOOP_SCOPES = "read:recovery read:cycles read:workout read:sleep read:profile offline";

// Pagina "Connetti Whoop": apri SCRIPT_URL?whoopConnect=1 nel browser per iniziare.
function handleWhoopConnect_() {
  var props = PropertiesService.getScriptProperties();
  var clientId = props.getProperty('WHOOP_CLIENT_ID');
  if (!clientId) {
    return HtmlService.createHtmlOutput('<p>Manca WHOOP_CLIENT_ID nelle Script Properties.</p>');
  }
  var state = Utilities.getUuid();
  CacheService.getScriptCache().put('whoop_oauth_state', state, 600);
  var redirectUri = ScriptApp.getService().getUrl();
  var authUrl = WHOOP_AUTH_URL
    + "?response_type=code"
    + "&client_id=" + encodeURIComponent(clientId)
    + "&redirect_uri=" + encodeURIComponent(redirectUri)
    + "&scope=" + encodeURIComponent(WHOOP_SCOPES)
    + "&state=" + encodeURIComponent(state);
  var html = '<p style="font-family:sans-serif;">Collega il tuo account Whoop:</p>'
    + '<p><a href="' + authUrl + '" target="_blank" rel="noopener" style="font-size:18px;font-family:sans-serif;">🔗 Autorizza con Whoop</a></p>';
  return HtmlService.createHtmlOutput(html);
}

// Riceve il redirect di Whoop dopo il consenso (?code=...&state=...) e scambia il code coi token.
function handleWhoopCallback_(e) {
  if (e.parameter.error) {
    return HtmlService.createHtmlOutput('<p>Autorizzazione Whoop non completata: ' + e.parameter.error + '</p>');
  }

  var expectedState = CacheService.getScriptCache().get('whoop_oauth_state');
  if (!expectedState || expectedState !== e.parameter.state) {
    return HtmlService.createHtmlOutput('<p>Sessione scaduta: riprova da SCRIPT_URL?whoopConnect=1</p>');
  }

  var props = PropertiesService.getScriptProperties();
  var redirectUri = ScriptApp.getService().getUrl();

  var response = UrlFetchApp.fetch(WHOOP_TOKEN_URL, {
    method: 'post',
    payload: {
      grant_type: 'authorization_code',
      code: e.parameter.code,
      redirect_uri: redirectUri,
      client_id: props.getProperty('WHOOP_CLIENT_ID'),
      client_secret: props.getProperty('WHOOP_CLIENT_SECRET')
    },
    muteHttpExceptions: true
  });

  var body = JSON.parse(response.getContentText());
  if (!body.access_token) {
    return HtmlService.createHtmlOutput('<p>Errore nello scambio del token: ' + response.getContentText() + '</p>');
  }

  storeWhoopTokens_(body);
  return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;">✅ Whoop collegato! Puoi chiudere questa pagina.</p>');
}

function storeWhoopTokens_(tokenResponse) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('WHOOP_ACCESS_TOKEN', tokenResponse.access_token);
  if (tokenResponse.refresh_token) {
    props.setProperty('WHOOP_REFRESH_TOKEN', tokenResponse.refresh_token);
  }
  var expiresAt = Date.now() + (Number(tokenResponse.expires_in || 3600) * 1000) - 60000;
  props.setProperty('WHOOP_TOKEN_EXPIRES_AT', String(expiresAt));
}

// Ritorna un access token valido, rinnovandolo automaticamente se scaduto.
function getValidWhoopAccessToken_() {
  var props = PropertiesService.getScriptProperties();
  var expiresAt = Number(props.getProperty('WHOOP_TOKEN_EXPIRES_AT') || 0);
  if (Date.now() < expiresAt) {
    return props.getProperty('WHOOP_ACCESS_TOKEN');
  }

  var refreshToken = props.getProperty('WHOOP_REFRESH_TOKEN');
  if (!refreshToken) return null;

  var response = UrlFetchApp.fetch(WHOOP_TOKEN_URL, {
    method: 'post',
    payload: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: props.getProperty('WHOOP_CLIENT_ID'),
      client_secret: props.getProperty('WHOOP_CLIENT_SECRET'),
      scope: 'offline'
    },
    muteHttpExceptions: true
  });

  var body = JSON.parse(response.getContentText());
  if (!body.access_token) return null;
  storeWhoopTokens_(body);
  return body.access_token;
}

// Chiama un endpoint "collection" di Whoop e concatena tutte le pagine (next_token).
//
// MAX_PAGINE ferma il ciclo anche se l'API restituisse un nextToken che non si esaurisce mai
// (es. un cursore rimasto "incollato"): senza un tetto, un ciclo così può girare fino al limite
// di 6 minuti di ogni esecuzione Apps Script e venire ucciso a metà, invece di fermarsi da solo
// con un avviso chiaro nel log. 200 pagine da 25 = 5000 record, ben oltre quanto un singolo
// account Whoop può avere in qualsiasi finestra sensata.
function fetchWhoopCollection_(path, accessToken, startIso) {
  var MAX_PAGINE = 200;
  var records = [];
  var nextToken = null;
  var pagine = 0;

  do {
    var url = WHOOP_API_BASE + path + "?limit=25&start=" + encodeURIComponent(startIso)
      + (nextToken ? "&nextToken=" + encodeURIComponent(nextToken) : "");
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + accessToken },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Errore da ' + path + ': HTTP ' + response.getResponseCode() + ' -> ' + response.getContentText().substring(0, 300));
      break;
    }

    var body = JSON.parse(response.getContentText());
    records = records.concat(body.records || []);
    nextToken = body.next_token || null;
    pagine++;

    if (pagine >= MAX_PAGINE && nextToken) {
      Logger.log('Attenzione: ' + path + ' ha ancora altre pagine oltre il limite di sicurezza (' + MAX_PAGINE + '), fermato qui con ' + records.length + ' record.');
      break;
    }
  } while (nextToken);

  return records;
}

// Converte un timestamp ISO (con ora e fuso) di Whoop in una data YYYY-MM-DD nel fuso del foglio.
function formatWhoopDate_(isoString, timeZone) {
  if (!isoString) return "";
  return Utilities.formatDate(new Date(isoString), timeZone, "yyyy-MM-dd");
}

// Scrive/aggiorna una riga nel foglio Whoop, identificata da atleta+tipo+recordId.
function upsertWhoopRow_(sheet, athlete, type, recordId, dateStr, dataObj) {
  var idColIndex = getColumnIndex(sheet, "recordId");
  var typeColIndex = getColumnIndex(sheet, "type");
  var athleteColIndex = getColumnIndex(sheet, "athlete");
  var rows = sheet.getDataRange().getValues();
  var newRow = [athlete, type, dateStr, String(recordId), JSON.stringify(dataObj), new Date()];

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idColIndex - 1]) === String(recordId)
        && rows[i][typeColIndex - 1] === type
        && rows[i][athleteColIndex - 1] === athlete) {
      sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      return;
    }
  }
  sheet.appendRow(newRow);
}

// Sincronizza recovery/cicli(strain)/sonno/allenamenti Whoop dagli ultimi 14 giorni: pensata
// per il trigger giornaliero (vedi installDailyWhoopSyncTrigger), non per recuperare storico
// vecchio (per quello vedi backfillWhoopHistory più sotto).
function syncWhoopData() {
  var since = new Date();
  since.setDate(since.getDate() - 14);
  syncWhoopSince_(since);
}

// Backfill una tantum di TUTTO lo storico disponibile sull'account (fino a 3 anni fa, lo
// stesso orizzonte usato da diagnosiWhoop): utile la prima volta che si collega un account
// che ha già mesi di dati, così l'app ha subito qualcosa da mostrare invece di aspettare che
// il trigger giornaliero li accumuli 14 giorni alla volta. Eseguila UNA VOLTA a mano
// dall'editor (selezionala nel menu a tendina in alto -> Esegui ▶), poi non serve più:
// il trigger giornaliero da qui in poi tiene tutto aggiornato da solo.
function backfillWhoopHistory() {
  var since = new Date();
  since.setFullYear(since.getFullYear() - 3);
  syncWhoopSince_(since);
}

// Motore comune: scarica recovery/cicli/sonno/allenamenti da 'since' a oggi e li scrive
// (upsert, senza duplicare) nel foglio Whoop. Condiviso da syncWhoopData (14 giorni, uso
// quotidiano) e backfillWhoopHistory (storico completo, una tantum) così restano sempre
// allineate sulla stessa logica invece di rischiare di divergere nel tempo.
function syncWhoopSince_(since) {
  var accessToken = getValidWhoopAccessToken_();
  if (!accessToken) {
    Logger.log('Nessun token Whoop valido: collega prima da SCRIPT_URL?whoopConnect=1');
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var athlete = props.getProperty('WHOOP_ATHLETE_NAME');
  if (!athlete) {
    Logger.log('Manca WHOOP_ATHLETE_NAME nelle Script Properties.');
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var timeZone = ss.getSpreadsheetTimeZone();
  var sheet = ss.getSheetByName("Whoop") || ss.insertSheet("Whoop");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["athlete", "type", "date", "recordId", "data", "updatedAt"]);
  }

  // Senza questo, Google Sheets interpreta "2025-10-02" come data vera e la restituisce a
  // doGet come timestamp ISO a mezzanotte locale ("2025-10-01T22:00:00.000Z"), cioè il giorno
  // prima. Forzando il formato testo la colonna resta la stringa YYYY-MM-DD che scriviamo.
  var dateColIndex = getColumnIndex(sheet, "date");
  if (dateColIndex > 0) {
    sheet.getRange(1, dateColIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
  }

  var startIso = Utilities.formatDate(since, "UTC", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  var counts = { recovery: 0, cycle: 0, sleep: 0, workout: 0 };

  fetchWhoopCollection_("/v2/recovery", accessToken, startIso).forEach(function(r) {
    if (r.score_state !== 'SCORED' || !r.score) return;
    upsertWhoopRow_(sheet, athlete, 'recovery', r.cycle_id, formatWhoopDate_(r.created_at, timeZone), {
      recoveryScore: r.score.recovery_score,
      restingHeartRate: r.score.resting_heart_rate,
      hrvMilli: r.score.hrv_rmssd_milli
    });
    counts.recovery++;
  });

  fetchWhoopCollection_("/v2/cycle", accessToken, startIso).forEach(function(c) {
    // 'end' è null per il ciclo ancora in corso: se la fascia è ferma, resta per sempre il
    // "ciclo corrente" con punteggio azzerato (SCORED ma strain/HR/kilojoule tutti a 0), non
    // un vero giorno di riposo. Lo saltiamo per non mostrare un dato falso.
    if (c.score_state !== 'SCORED' || !c.score || !c.end) return;
    upsertWhoopRow_(sheet, athlete, 'cycle', c.id, formatWhoopDate_(c.start, timeZone), {
      strain: c.score.strain,
      averageHeartRate: c.score.average_heart_rate,
      maxHeartRate: c.score.max_heart_rate,
      kilojoule: c.score.kilojoule
    });
    counts.cycle++;
  });

  fetchWhoopCollection_("/v2/activity/sleep", accessToken, startIso).forEach(function(s) {
    if (s.score_state !== 'SCORED' || !s.score) return;
    upsertWhoopRow_(sheet, athlete, 'sleep', s.id, formatWhoopDate_(s.end, timeZone), {
      sleepPerformancePercentage: s.score.sleep_performance_percentage
    });
    counts.sleep++;
  });

  fetchWhoopCollection_("/v2/activity/workout", accessToken, startIso).forEach(function(w) {
    if (w.score_state !== 'SCORED' || !w.score) return;
    upsertWhoopRow_(sheet, athlete, 'workout', w.id, formatWhoopDate_(w.start, timeZone), {
      sportName: w.sport_name,
      strain: w.score.strain,
      averageHeartRate: w.score.average_heart_rate,
      maxHeartRate: w.score.max_heart_rate,
      kilojoule: w.score.kilojoule,
      zoneDurations: w.score.zone_durations
    });
    counts.workout++;
  });

  Logger.log('Sync Whoop completata: ' + counts.recovery + ' recovery, ' + counts.cycle
    + ' cicli, ' + counts.sleep + ' notti di sonno, ' + counts.workout + ' allenamenti.');
}

// Esegui UNA VOLTA (Esegui ▶ con questa funzione selezionata) per installare la sincronizzazione
// automatica giornaliera.
function installDailyWhoopSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    // Il prefisso invece del nome esatto ripulisce anche un vecchio trigger registrato su
    // 'syncWhoopData_' (il nome privato usato prima della rinomina): altrimenti resterebbe
    // attivo puntando a una funzione che non esiste più, fallendo ogni notte in silenzio.
    if (t.getHandlerFunction().indexOf('syncWhoopData') === 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncWhoopData').timeBased().everyDays(1).atHour(6).create();
  Logger.log('Trigger di sync giornaliero Whoop installato.');
}
