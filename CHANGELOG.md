# Changelog

Cronologia delle versioni di **CrossFit Bicocca** (`index.html`). Il numero e la data mostrati
qui corrispondono a `APP_VERSION`/`APP_VERSION_DATE` nell'header dell'app e nel tab
Impostazioni. Versioni più recenti in cima.

## v51 — 2026-09-05
- Il tab **ATLETA** era lungo circa **7 schermate** (6328 px): teneva sempre aperte tutte le
  righe dei due elenchi, 33 massimali + 28 benchmark, quasi tutte vuote. Ora di default mostra
  **solo le voci già compilate**, con una **ricerca** che trova anche quelle mai inserite e un
  **"Mostra tutti"** per aprire l'elenco intero. Stessi dati, tab da 6328 a **1984 px**.
- Un valore digitato e poi uscito dalla vista (ricerca cambiata, elenco richiuso) **non si perde
  e viene salvato lo stesso**: il salvataggio non guarda più solo le righe a schermo. Resta
  invariato il fatto che si mandino al Foglio solo i valori davvero cambiati.
- Lo **storico** ora è ordinato per **data dell'allenamento** (più recente in cima) invece che
  per ordine di salvataggio. Prima un recupero registrato oggi per lunedì scorso finiva in cima,
  e modificare una sessione vecchia la faceva risalire (il salvataggio la cancella e la riaccoda).
- Sul giorno di oggi la vista vuota dice "Nessun allenamento registrato per **oggi**", coerente
  con il titolo e il bottone (diceva ancora "per questo giorno").

## v50 — 2026-09-05
- **🏆 Log Result** e **👥 Results** ora stanno **affiancati**, metà riga a testa, con misure
  identiche: erano uno sopra l'altro e di dimensioni diverse, pur essendo le due azioni gemelle
  del blocco. Il secondo si chiamava "Risultati Altri Atleti" e andava a capo su due righe:
  ora è solo "Results" e sta su una riga sola come il gemello.
- Tolto il **tratteggio** dal bordo di Log Result: bordo pieno da 1 px e stesso raggio degli
  angoli dell'altro, così i due bottoni sono davvero identici (resta il colore accent a
  distinguere l'azione principale).
- Il bottone **📷 Carica Foto** (e la ✕ accanto) sono un po' più grandi: da 28 a 36 px di
  altezza, testo da 10 a 12 px, più facili da centrare col dito.
- Nelle viste di sola lettura (Storico, giorno del calendario) il bottone resta com'era: lì sta
  da solo sotto la card, non affiancato a nulla.

## v49 — 2026-09-05
- Il calendario di REGISTRA è ora una **finestra scorrevole centrata su oggi** (da 3 giorni fa a
  3 giorni avanti) invece della settimana fissa domenica-sabato. Prima, di **domenica** non si
  vedeva **ieri** e di **sabato** non si vedeva **domani** senza prima spostare la settimana con
  ‹ / ›: proprio i due giorni che servono più spesso per registrare un allenamento o recuperare
  quello del giorno prima.
- Toccando un giorno già visibile la riga **resta ferma** invece di riscorrere sotto il dito: si
  ricentra solo quando la data scelta (es. dal picker 📅) è fuori dai giorni mostrati.
- La lettera sotto ogni giorno ora segue la data vera e non la posizione nella riga, e
  l'etichetta in alto nomina entrambi i mesi quando la finestra è a cavallo di due (es. "ago - set").

## v48 — 2026-09-05
- **Un allenamento alla volta in REGISTRA**: sia OGGI sia un giorno passato mostrano ora di
  default la vista di sola lettura di quanto già registrato, invece del form sempre aperto.
  Prima si poteva impilare più "Parti" (+ Aggiungi Lavoro) in un'unica sessione salvata in un
  colpo solo: comodo ma creava discrepanze nello storico, perché spesso si fa solo UNA delle
  parti di una giornata proposta, non l'intera seduta. Ora "+ Aggiungi Lavoro" aggiunge solo la
  prima Parte e poi sparisce: per un secondo allenamento fatto lo stesso giorno si usa "+
  Registra un altro allenamento", che apre un form vuoto e lo salva come riga separata.
- Il tasto PUBBLICA resta disponibile registrando un nuovo allenamento per oggi (a differenza
  del recupero di un giorno passato, dove non ha senso proporlo in bacheca).
- Sessioni multi-Parte già esistenti nello storico restano visibili e modificabili come prima:
  la modifica riapre tutte le Parti già salvate; il limite riguarda solo la creazione di nuove
  sessioni.

## v47 — 2026-09-04
- La card SALUTE ora mostra solo **peso** e **grasso corporeo**: FC a riposo, passi ed energia
  attiva sono stati tolti dalla card (chi li segue lo fa già dalla card Whoop). Il backend
  continua ad accettare tutti e 5 i campi come prima — un atleta che manda ancora FC/passi/
  energia attiva dal proprio Comando non perde nulla, restano solo non mostrati qui.

## v46 — 2026-09-03
- Fix: un WOD a set scritto una riga per set (es. "1x 3 Position Back Squat @60-65% 1RM"
  ripetuta N volte) veniva riconosciuto come **1 solo set**, perché il primo "1x" a inizio riga
  veniva scambiato per l'intero schema set×reps prima ancora di arrivare a contare le righe
  ripetute. Corretto l'ordine di rilevamento: le righe ripetute con percentuale ora vincono
  sempre sul pattern "NxM" generico.
- Aggiunto anche il supporto ai **range di percentuale** ("60-65%" invece di un solo numero,
  frequente nei programmi di forza): il peso proposto usa la media degli estremi. Prima un
  range del genere non veniva riconosciuto affatto (né per contare i set né per calcolare il
  peso), quindi né il numero di set né il massimale/peso proposto comparivano.
- **CARICO PER SET** nel Log Result ora ha sempre **+ Aggiungi Set** e un tasto rimuovi per
  riga: il numero di set rilevato automaticamente resta un punto di partenza, modificabile a
  mano se il WOD è ambiguo o se in pratica se ne fanno di più/meno.

## v45 — 2026-09-03
- Restyling visivo (colori invariati): bagliore ambientale in alto dietro l'header, card più
  arrotondate con un'ombra morbida per dare profondità, tasti principali con gradiente e
  bagliore accent, stati attivi (tab in nav, RX/Scaled, giorno selezionato nel calendario, focus
  sui campi) più marcati con un piccolo glow invece del solo cambio colore.

## v44 — 2026-09-03
- Nuova card **📊 FOCUS ALLENAMENTO** nel tab ATLETA: un radar che mostra su cosa ti sei
  concentrato nelle ultime 4 settimane (Squat, Hinge & Carry, Weightlifting Olimpico, Trazioni,
  Spinta, Core & Skill, Monostrutturale), non quanto sei forte. Ogni asse conta quante volte un
  movimento di quella categoria compare nelle sessioni salvate (stesso riconoscimento già usato
  in "Confronta con la community"), normalizzato rispetto alla categoria più allenata nel
  periodo = 100.
- Disegnato a mano in SVG inline, nessuna libreria di grafici aggiunta al bundle.

## v43 — 2026-09-03
- L'app è ora **installabile come PWA**: icona in home screen su Android/iOS, avvio a schermo
  intero senza barra del browser (`manifest.json`, icone in `icons/`, service worker minimo in
  `sw.js`).
- Il service worker mette in cache solo la "shell" statica della pagina (per aprirla anche
  offline con l'ultima versione vista): non tocca mai le chiamate all'API di Google Apps Script
  né le POST di salvataggio, che restano sempre in rete come prima.

## v42 — 2026-09-03
- La card Whoop mostra ora **tutte** le metriche di recovery e ciclo fisiologico fornite
  dall'API, non solo recovery/strain/sonno: HRV, SpO2, temperatura cutanea, FC media e max del
  giorno, calorie. La card passa da 3 a 9 tile.
- SpO2 e temperatura cutanea sono nuovi campi aggiunti alla sincronizzazione in `Code.gs`
  (richiede di ridistribuire il backend per avere effetto — vedi `apps-script/README.md`).

## v41 — 2026-09-03
- Rimossa la card "WOD di questa settimana" duplicata dentro REGISTRA: era una copia esatta di
  quanto ora vive nel tab BACHECA (v40). REGISTRA torna a mostrare solo quanto già registrato
  per il giorno selezionato.

## v40 — 2026-09-03
- Il tasto ↻ di ricarica sulle card Salute e Whoop ora aggiorna davvero la card, non solo i dati
  in memoria: prima serviva un refresh manuale della pagina per vedere il risultato.
- Nuovo tab **BACHECA**: sfoglia liberamente i WOD caricati/pubblicati da chiunque, settimana
  per settimana (frecce avanti/indietro), indipendentemente dal giorno selezionato in REGISTRA.
  Scegliere un WOD da lì porta su REGISTRA con la data giusta e il form già popolato.

## v39 — 2026-09-04
- Nuova sezione **😄 FRASI DI CARICAMENTO** in Impostazioni: le frasi si aggiungono e si
  eliminano dall'app, senza più passare dal codice. Sono **condivise** con tutti gli atleti
  (vivono nel Foglio, nuovo foglio "Frasi") e mostrano chi le ha aggiunte.
- Le 14 frasi incluse nell'app restano sempre come base: se il Foglio è vuoto o irraggiungibile
  la schermata di caricamento ha comunque qualcosa da mostrare.
- Rifiutate le frasi vuote, quelle oltre 120 caratteri e i doppioni (confronto che ignora
  maiuscole e spaziatura, e tiene conto anche delle frasi incluse nell'app).

## v38 — 2026-09-04
- Due nuovi messaggini nella schermata di caricamento: "Sei un finto modesto" e "Questi 100kg
  pesano una tonnellata".

## v37 — 2026-09-04
- Non si possono più creare **due atleti con lo stesso nome**: la registrazione viene rifiutata
  con un messaggio che invita ad accedere col proprio PIN. Il confronto ignora maiuscole e
  spaziatura, quindi "  mario   ROSSI " e "Mario Rossi" sono la stessa persona.
- **Sicurezza**: registrarsi con il nome di un atleta esistente **sovrascriveva il suo PIN**,
  di fatto permettendo di impossessarsi del suo profilo (storico, massimali, risultati). Ora il
  backend rifiuta. Un profilo che non ha ancora un PIN resta rivendicabile, come già avveniva.
- Il salvataggio del profilo ora **controlla la risposta del backend**: prima mostrava
  "registrato!" anche in caso di errore e impostava comunque l'atleta attivo sul dispositivo,
  lasciandolo "loggato" con un profilo mai creato.

## v36 — 2026-09-04
- **Fix**: nella bacheca non comparivano i WOD caricati da te — vedevi quelli di tutti gli
  altri tranne i tuoi, a meno di averli pubblicati col tasto apposito. Era un residuo di quando
  la bacheca significava "cosa hanno caricato gli altri"; ora che mostra l'intera settimana come
  vista d'insieme, ci sono anche i tuoi, etichettati "te" e con il pulsante "RIUSA QUESTO WOD".

## v35 — 2026-09-04
- Nella bacheca dei WOD ogni proposta mostra ora anche il **giorno della settimana abbreviato**
  accanto alla data (es. "Gio 04/09/2026"): con le proposte di tutta la settimana, riconoscere
  il giorno è più immediato del numero.

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
