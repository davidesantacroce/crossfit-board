# Changelog

Cronologia delle versioni di **CrossFit Bicocca** (`index.html`). Il numero e la data mostrati
qui corrispondono a `APP_VERSION`/`APP_VERSION_DATE` nell'header dell'app e nel tab
Impostazioni. Versioni più recenti in cima.

## v34 — 2026-09-04
- Tasto **↻** nell'intestazione delle card Whoop e Salute: ricarica i dati dal Foglio senza
  ricaricare la pagina. Utile perché quei dati arrivano da fuori (sync notturno Whoop, Comando
  iOS per Salute) e capita di volerli rivedere subito dopo averli mandati.
- Backend: corretta l'interpretazione dei valori inviati da Salute. `28.859` kcal venivano letti
  come 28859 (mille volte tanto) per via di una regola sul separatore delle migliaia rivelatasi
  sbagliata: Comandi manda i valori senza raggruppare le migliaia e con molti decimali, quindi
  un separatore singolo è sempre decimale.

## v33 — 2026-09-04
- **Fix**: nella classifica di un WOD, un atleta che aveva loggato lo stesso lavoro due volte
  (per sbaglio, o perché l'aveva davvero rifatto) compariva due volte col proprio nome. Ora
  ogni atleta compare una sola volta, col **suo risultato migliore**.
- "Migliore" segue il tipo di punteggio: il tempo più basso per un For Time, il valore più alto
  per AMRAP/Reps/Peso. Se i due risultati non sono confrontabili (tipi di punteggio diversi o
  non interpretabili) resta il più recente.
- Anche il badge col numero sul pulsante "Risultati Altri Atleti" ora conta le **persone**,
  non i caricamenti, coerente con quello che si vede aprendo la classifica.

## v32 — 2026-09-03
- La bacheca "WOD già caricati" ora copre **l'intera settimana** (domenica-sabato) del giorno
  selezionato nel calendario, non solo quel giorno preciso — visibile su qualunque giorno si
  stia guardando (oggi, futuro, un giorno passato), anche prima di scegliere di registrare un
  recupero. Ogni proposta mostra la data a cui appartiene.
- Selezionare un WOD dalla bacheca su un giorno passato apre da solo il form del recupero e lo
  popola, senza dover prima cliccare "+ Registra un allenamento per questo giorno".
- WOD identici caricati da atleti diversi si accorpano ancora in un'unica card, ma solo se
  dello stesso giorno: lo stesso titolo in giorni diversi resta separato (sono due proposte
  diverse).

## v31 — 2026-09-03
- **Fix**: registrando un recupero (es. oggi 4 settembre il WOD di ieri 3 settembre), la
  bacheca "già caricato" restava vuota anche se altri atleti avevano già scritto quel WOD per
  quel giorno — bisognava ritrascriverlo da zero. Ora, aprendo un giorno passato con "+
  Registra un allenamento", compare "📋 GIÀ CARICATO IL ..." con quanto già inserito da altri
  quel giorno, riusabile con lo stesso pulsante "USA QUESTO WOD" della bacheca di oggi.

## v30 — 2026-09-03
- **Fix**: un giorno passato senza nessun allenamento ancora registrato non offriva alcun modo
  di loggarne uno — utile per un recupero (es. fatto oggi il WOD di ieri). Ora, aprendo un
  giorno passato dal calendario, compare "+ Registra un allenamento per questo giorno": salva
  la sessione con la data di quel giorno, non con quella odierna.
- Il pulsante "PUBBLICA SOLO IL WOD" resta nascosto mentre si registra un recupero: non ha
  senso proporre in bacheca il WOD di un giorno già passato.
- Disponibile anche se quel giorno ha già una o più sessioni salvate ("+ Registra un altro
  allenamento"), per chi si allena due volte lo stesso giorno.

## v29 — 2026-09-03
- Nuova card **🩺 SALUTE** nella tab Atleta: peso, % grasso corporeo, frequenza cardiaca a
  riposo, passi ed energia attiva. I dati arrivano da un Comando (Shortcuts) su iPhone che
  legge da Salute — copre sia l'Apple Watch sia qualunque bilancia collegata a Salute (Renpho
  inclusa), senza un'integrazione separata per dispositivo.
- Ogni metrica mostra il suo giorno più recente disponibile, non necessariamente lo stesso per
  tutte: un Comando può inviare solo il peso al mattino e i passi la sera.
- Il peso mostra il trend rispetto alla pesata precedente (non alla primissima mai registrata),
  e un bottone "Usa ... kg nel profilo" precompila il campo peso senza salvare da solo.
- Backend: nuova azione `saveHealthData`, protetta da un segreto condiviso (l'endpoint `/exec`
  è pubblico) perché non essendoci un'API cloud per HealthKit i dati arrivano in push dal
  telefono, non recuperati con un sync come per Whoop.

## v28 — 2026-09-02
- La classifica di un **WOD del giorno** ora confronta solo chi lo ha fatto entro **3 giorni**
  dalla data del WOD, invece di accomunare tutti quelli che hanno usato lo stesso titolo in
  qualsiasi momento. La tolleranza include chi recupera l'allenamento qualche giorno dopo (o
  lo anticipa): la finestra è simmetrica.
- I **benchmark noti** (Fran, Murph, Cindy...) restano confrontabili di sempre: è il loro scopo.
- La modale di confronto ora dichiara su cosa sta confrontando — finestra temporale con la
  data di riferimento, oppure "risultati di sempre" per i benchmark.
- Il badge col numero di atleti sul pulsante "Risultati Altri Atleti" usa lo stesso filtro
  della modale, quindi il numero e l'elenco coincidono sempre.

## v27 — 2026-09-02
- Si possono **programmare i WOD dei giorni futuri**: selezionando una data futura nel
  calendario, il form si apre in modalità programmazione e il WOD si pubblica in anticipo con
  "📋 PUBBLICA IL WOD DEL ...". Comparirà in bacheca quel giorno.
- Su una data futura il pulsante "SALVA SESSIONE COMPLETA" è nascosto (e il salvataggio è
  comunque rifiutato): un risultato non può riferirsi a un allenamento non ancora svolto.
- La bacheca segue il giorno selezionato e mostra cosa è già stato programmato per quella data,
  così non si pubblicano due volte lo stesso WOD.
- Nel calendario i giorni futuri con un WOD già programmato hanno un pallino vuoto, distinto
  dal pallino pieno degli allenamenti svolti.
- I giorni passati restano in sola lettura come prima.

## v26 — 2026-09-02
- Nuova card **⌚ WHOOP** nella tab Atleta: recovery, strain e qualità del sonno dell'ultimo
  giorno sincronizzato, più l'elenco degli allenamenti rilevati dalla fascia (sport, strain,
  frequenza cardiaca media/massima, calorie).
- La card compare solo per gli atleti che hanno effettivamente dati Whoop collegati; le
  metriche mancanti mostrano un trattino invece di sparire, e se l'ultimo dato è più vecchio
  di una settimana viene segnalato che la fascia non sincronizza da un po'.
- I dati arrivano dal foglio "Whoop", popolato dal backend Apps Script tramite l'API Whoop
  (OAuth 2.0) con sincronizzazione automatica giornaliera.

## v25 — 2026-09-02
- Badge rosso stile notifica iOS sul pulsante "👥 Risultati Altri Atleti", col numero di
  persone che hanno già loggato quel WOD — live nel form di Registra, in Storico e nella vista
  di un giorno passato.
- Aggiunto un controllo automatico su GitHub Actions che verifica la sintassi JS di
  `index.html` ad ogni push (vedi `.github/workflows/check.yml`).

## v24 — 2026-09-02
- Il form di Registra non parte più con una Parte vuota precompilata: resta vuoto finché non
  premi "+ Aggiungi Lavoro" (ora più grande, a tutta larghezza).
- RX/Scaled non è più un toggle unico per l'intera sessione: ogni Parte ha il proprio toggle,
  così parti diverse della stessa sessione possono avere modalità diverse. Il badge RX/SCALED
  in Storico è ora per singolo blocco.

## v23 — 2026-09-02
- La bacheca WOD del giorno resta visibile dopo aver usato un WOD proposto (prima spariva).
- WOD identici pubblicati/salvati da atleti diversi vengono accorpati in un'unica card con
  tutti i nomi, invece di ripetersi.
- SALVA SESSIONE COMPLETA e PUBBLICA SOLO IL WOD rifiutano una Parte senza titolo né
  spiegazione.

## v22 — 2026-09-02
- Bacheca "WOD del giorno": oltre alle sessioni complete di altri atleti, ora include i WOD
  pubblicati con il nuovo tasto "📋 Pubblica solo il WOD" (senza risultato personale), incluse
  le proprie pubblicazioni. Nessuna modifica al backend richiesta.

## v21 — 2026-09-01
- Rimossa la funzione "WOD in coppia/team" introdotta in v20 (richiesta esplicita).

## v20 — 2026-09-01 *(rimossa in v21)*
- WOD in coppia/team: log condiviso automaticamente nello storico dei compagni indicati.

## v19 — 2026-09-01
- I messaggi simpatici della schermata di caricamento compaiono anche premendo "Salva Sessione
  Completa", non solo all'avvio/login.
- Le etichette del grafico Giorni Attivi a Settimana mostrano l'intervallo completo della
  settimana (es. "31/8-6/9") invece del solo lunedì iniziale.
- Tasti PRs / Benchmark sotto il grafico nel tab Atleta.
- Sezione Benchmark WOD nei Massimali con i WOD benchmark più noti del CrossFit.
- Aggiornamento automatico di massimali/benchmark quando si registra un risultato
  migliorativo.
- *(fix same-day)* Corretto un errore di sintassi introdotto editando a mano
  `FUN_LOADING_MESSAGES` (virgole mancanti tra le frasi, che rompeva l'intera app).

## v18 — 2026-09-01
- Migliorato l'import foto WOD: pulisce l'artefatto OCR "O" dal cerchietto colorato nei titoli
  e mostra uno stato di caricamento durante l'estrazione.
- Grafico "Giorni Attivi a Settimana" nel tab Atleta.
- Rimossa la card ridondante "Risultati Loggati" dal tab Storico.
- Messaggi simpatici nella schermata di caricamento sessioni (avvio app e login).

## v17 — 2026-09-01
- Rimossa la card "Risultati Loggati" dal tab Storico (ridondante con il confronto per blocco).

## v16 — 2026-09-01
- Grafico "Giorni Attivi a Settimana" nel tab Atleta.

## v15 — 2026-09-01
- Import foto WOD: pulizia dell'artefatto OCR "O" e stato di caricamento durante l'estrazione.

## v14 — 2026-09-01
- Doppi invii bloccati disabilitando il bottone durante il salvataggio (evita sessioni/risultati
  duplicati se si preme due volte).

## v13 — 2026-09-01
- Corretto un crash del bottone "Modifica" nello Storico quando il blocco aveva movimenti già
  loggati (`movements` non normalizzato in array).

## v12 — 2026-09-01
- PIN personale a 4 cifre per atleta al login.

## v11 — 2026-09-01
- Se più atleti caricano WOD diversi lo stesso giorno, vengono mostrati tutti come proposta,
  non solo il primo.

## v10 — 2026-09-01
- Tasto "Risultati Altri Atleti" aggiunto anche in Storico e nel calendario di Registra (prima
  solo nel form live).

## v9 — 2026-09-01
- Nel confronto con altri atleti sono inclusi anche i risultati salvati senza mai aprire "Log
  Result" (solo testo sintetico nel blocco).

## v8 — 2026-09-01
- Introdotta la visualizzazione della versione dell'app (header + tab Impostazioni). Prima
  versione tracciata con un numero visibile.

## Prima del versionamento — fino al 2026-08-31
Base dell'app costruita prima che la versione fosse mostrata all'utente: sessioni WOD
multi-blocco, Log Result per singolo blocco (con rilevamento automatico di set/percentuali e
proposta di peso dal massimale), storico con ricerca, calendario di Registra, storico
massimali con tabella percentuali, loghi fissi, proposta del WOD già caricato da altri atleti,
modifica delle sessioni salvate.
