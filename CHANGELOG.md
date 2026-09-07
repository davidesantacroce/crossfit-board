# Changelog

Cronologia delle versioni di **CrossFit Bicocca** (`index.html`). Il numero e la data mostrati
qui corrispondono a `APP_VERSION`/`APP_VERSION_DATE` nell'header dell'app e nel tab
Impostazioni. Versioni più recenti in cima.

## v69 — 2026-09-07
- **Nella Bacheca si legge il testo del WOD toccando la card.** Prima si vedevano solo nome e
  tipo, e per sapere cosa c'era dentro bisognava caricarlo nel form con "USA QUESTO WOD". Ora la
  card si apre e si richiude come le giornate; il tasto per usarlo resta raggiungibile senza
  aprirla. I lavori vecchi senza testo scritto mostrano l'elenco degli esercizi; quelli che non
  hanno proprio niente da mostrare non hanno la freccetta.
- **I giorni sono dal più recente in cima**, così l'ultimo programmato si legge subito senza
  scorrere la settimana. Dentro la giornata l'ordine resta quello deciso con le frecce, che è la
  sequenza dell'allenamento.

## v68 — 2026-09-06
- **Nella vista giorno le card sono tutte alte uguale.** Il badge PUBBLICATO divideva la riga
  con il nome del lavoro e ci finiva sopra solo quando il nome era lungo: quella card diventava
  più alta delle altre e l'elenco sembrava sbilenco.
- Ora il badge sta **sempre su una riga sua sopra il nome** (come già nello Storico), così il
  nome ha tutta la larghezza e gli bastano due righe.
- Le altezze vengono **pareggiate misurando la card più alta** invece di fissare un valore: se i
  nomi della giornata sono tutti corti, le card restano compatte. Si rifà anche quando ruoti il
  telefono.

## v67 — 2026-09-06
- **Nella vista giorno il nome del lavoro e il punteggio non si sovrappongono più.** Stavano
  affiancati sulla stessa riga e il punteggio non andava a capo: si prendeva tutta la larghezza
  che gli serviva e al nome restava una colonna strettissima, dove si spezzava in verticale una
  parola per riga finendo per finire sotto al punteggio ("Back Squat" scritto sopra
  "100/100/110/110/… kg").
- Ora il **nome sta sulla prima riga** e il **punteggio su quella sotto**, come già nello
  Storico dalla v66. Le frecce ↑/↓ e la freccetta di apertura restano a destra.
- Un punteggio più largo dello schermo (un EMOM con molti carichi) **va a capo** invece di
  sbordare dalla card.

## v66 — 2026-09-06
- **Nello Storico il nome del WOD sta su una riga tutta sua.** Prima la divideva con il badge
  della categoria e con il tipo fra parentesi: su telefono un nome un po' lungo veniva
  schiacciato o spezzato a metà e si leggeva male. Ora il nome è la prima riga della card, più
  grande, e categoria e tipo scendono su una riga di dettaglio sotto.
- Il **punteggio** ha anch'esso la sua riga, un filo più grande di prima.

## v65 — 2026-09-06
- **Nello Storico ogni lavoro ha la sua card: niente più accorpamenti.** Anche le righe vecchie
  (più lavori salvati insieme, prima della v48) si vedono divise, un lavoro per card, con il suo
  WOD, il suo punteggio e il suo tasto Risultati. Prima erano un'unica card con dentro l'elenco
  delle Parti.
- Su quei lavori il tasto **Elimina lascia il posto a ⑂ Spacchetta**: condividono ancora la
  stessa riga sul Foglio, quindi cancellarne uno cancellerebbe anche gli altri. La card lo dice
  ("Salvato insieme ad altri N lavori nella stessa riga"), e spacchettando diventano indipendenti
  (v64) — da lì in poi hanno il loro Elimina.
- Il conteggio della giornata conta i **lavori**, non le righe.

## v64 — 2026-09-06
- **Le sessioni vecchie si spacchettano in allenamenti singoli.** Quelle salvate prima della v48
  contengono più lavori in un'unica riga: ora un tasto **⑂ Spacchetta in N** (sulla card, sia
  nella vista giorno sia nello Storico) le trasforma in **N allenamenti separati**, con la stessa
  data, lo stesso atleta, lo stesso risultato, la stessa categoria RX/Scaled e, se erano
  pubblicati, il **pubblicato** conservato.
- In **IMPOSTAZIONI** compare la card **⑂ ALLENAMENTI RAGGRUPPATI** che li conta e li spacchetta
  tutti in un colpo. Sparisce da sola quando non c'è più niente da fare.
- Spacchettati, quei lavori entrano a pieno titolo nel resto: si riordinano con le frecce (v63),
  hanno ciascuno il proprio tasto Risultati e contano uno per uno.
- I nuovi allenamenti vengono **creati prima** e il vecchio eliminato **dopo**: se qualcosa si
  inceppa a metà restano dei doppioni, che si vedono e si cancellano, invece di un buco nello
  storico. Nessuna modifica al backend: usa i salvataggi che già esistono, coda offline compresa.

## v63 — 2026-09-06
- **L'ordine dei lavori dentro una giornata si decide a mano**, con le frecce ↑/↓ su ogni lavoro
  nella vista giorno di REGISTRA (compaiono solo se la giornata ne ha più di uno, e non aprono la
  card). L'ordine scelto vale **ovunque**: vista giorno, bacheca e storico.
- Prima le tre viste potevano contraddirsi: la bacheca ordinava per orario di pubblicazione,
  vista giorno e storico per ordine delle righe sul Foglio — e quell'ordine cambiava da solo,
  perché ri-salvare una sessione la cancella e la riaccoda in fondo.
- Ogni spostamento **rinumera l'intera giornata** (0, 1, 2 …): così anche le sessioni vecchie,
  che un ordine non ce l'hanno, ne prendono uno al primo riordino. Modificare una sessione non le
  fa perdere il posto.
- **Richiede di ridistribuire l'Apps Script** (nuova colonna `order` nel foglio *Wods* e nuova
  azione `setWodOrder`, che aggiorna solo quella colonna senza riscrivere le righe). Finché non
  lo si fa, le frecce riordinano solo sul dispositivo e **l'app lo dice con un avviso**, invece di
  far credere che sia stato salvato. Vedi `apps-script/README.md`.
- Senza linea il riordino finisce nella coda della modalità palestra, come gli altri salvataggi.

## v62 — 2026-09-06
- **Fix: modificare un WOD pubblicato lo faceva smettere di essere pubblicato.** Bastava
  correggerne il titolo dalla bacheca: il salvataggio non rimandava il campo `mode`, quindi la
  riga tornava una sessione normale — spariva dai WOD pubblicati e ricompariva nello storico
  come allenamento svolto **senza punteggio** (un WOD pubblicato non ne ha), falsando anche
  giorni attivi e radar del focus. Ora la modifica conserva il mode di partenza: un WOD
  pubblicato resta pubblicato, una sessione normale resta normale.
- **Lo Storico è raggruppato per giornata**, come la bacheca: ogni giorno è una riga con quanti
  allenamenti contiene, e si apre toccandola. Di default è aperto il giorno più recente.
- **Cercando** si aprono da soli tutti i giorni che contengono risultati: altrimenti la ricerca
  avrebbe mostrato solo righe chiuse.
- La data non è più ripetuta dentro ogni card: ora sta nell'intestazione della giornata.

## v61 — 2026-09-06
- **La bacheca raggruppa i lavori per giornata**, e ogni giornata si apre e si chiude. Con la
  settimana programmata (dalla v59 un lavoro per card) la pagina diventava lunghissima: 15 lavori
  su 5 giorni erano **1924 px**, ora sono **532**. Ogni riga dice il giorno e quanti lavori ci
  sono ("3 lavori").
- **Di default è aperto il giorno di oggi**, che è quello che si cerca aprendo la bacheca, ed è
  segnalato con "· oggi". Se nella settimana c'è una sola giornata con lavori, quella è già
  aperta. Cambiando settimana si riparte dal default di quella settimana.
- I giorni ora si leggono **in ordine di calendario** (dal primo all'ultimo della settimana)
  invece che dal più recente: raggruppati per giornata, la settimana si legge come un programma.

## v60 — 2026-09-06
- **Modifica · Risultati · Elimina sono ora tre tasti gemelli**, stessa larghezza e stessa
  altezza, sulla stessa riga — identici nella vista giorno di REGISTRA e nello **Storico**.
  Prima Modifica ed Elimina stavano nell'intestazione della card con misure diverse fra loro, e
  il tasto dei risultati era un blocco a parte a tutta larghezza sotto il WOD.
- Il tasto si chiama di nuovo **Risultati** (era "Results"), ovunque compaia.
- Le vecchie sessioni multi-Parte tengono un Risultati **per Parte** — il confronto con gli altri
  è per singolo lavoro — e la riga in fondo resta con Modifica ed Elimina.
- Anche il badge col numero di risultati resta sopra il proprio tasto: coi tre affiancati
  sporgeva su quello accanto.

## v59 — 2026-09-06
- **La bacheca elenca i lavori singoli**, non le giornate. Prima accorpava per *atleta + giorno*:
  i tre lavori programmati da una persona per lunedì diventavano una card sola, e "USA QUESTO
  WOD" li caricava tutti e tre insieme nel form — contro la regola di un allenamento alla volta
  (v48). Ora ogni lavoro è una card e sceglierla porta nel form **quel lavoro soltanto**.
- **Lo stesso lavoro pubblicato da più persone nello stesso giorno resta una card sola**, con
  tutti i nomi: è il senso della bacheca, vedere il WOD del giorno e chi lo ha proposto. Chi
  ripubblica lo stesso lavoro non compare due volte.
- Le vecchie sessioni multi-Parte (precedenti alla v48) si aprono in una card per Parte.
- Dentro la giornata l'ordine è quello di **pubblicazione**, e un lavoro accorpato resta al suo
  posto invece di scavalcare quelli programmati dopo di lui.

## v58 — 2026-09-06
- **Le giornate con più lavori ora si leggono in una schermata.** Nella vista giorno di REGISTRA
  ogni lavoro è una card **richiudibile**: chiusa mostra badge RX/Scaled, titolo, tipo e
  punteggio; si apre toccandola quando serve leggere il WOD o loggarlo. Con tre lavori la
  giornata passa da ~700 a **288 px**.
- Le card partono **chiuse quando ce n'è più di una** e **aperta quando è una sola** (lì non c'è
  niente da riassumere). Si apre solo quella toccata, le altre restano chiuse.
- Nel riassunto della card chiusa il punteggio a tempi per set mostra solo il **totale**
  ("13:57"): i parziali si leggono aprendola.
- **Modifica** ed **Elimina** stanno ora dentro la card aperta, non nell'intestazione: scorrendo
  la giornata non si rischia di toccarli.
- Con una sola Parte il titolo non viene più ripetuto dentro la card: è già nell'intestazione.

## v57 — 2026-09-06
- **Fix: su un giorno futuro si riusciva a programmare un solo WOD.** Dopo aver pubblicato, il
  form restava pieno del lavoro appena pubblicato e "+ Aggiungi Lavoro" è nascosto quando una
  Parte c'è già (v48): per programmarne un secondo per lo stesso giorno non c'era strada, se non
  cancellare a mano la Parte con la ✕. Ora dopo la pubblicazione il form si svuota e si torna
  all'elenco del giorno.
- **Anche i giorni futuri partono dalla vista di sola lettura**, come oggi e i giorni passati:
  si vede l'elenco dei **WOD già programmati** per quel giorno (con Modifica ed Elimina) e un
  tasto **"+ Programma un altro WOD per questo giorno"**. Prima un giorno futuro mostrava solo
  il form vuoto, senza modo di vedere cosa ci fosse già.
- Titolo e testi seguono il giorno: "WOD PROGRAMMATI PER IL …" e "Nessun WOD ancora programmato
  per questo giorno", invece delle parole pensate per un allenamento già svolto.

## v56 — 2026-09-06
- **TEMPO PER SET**: un WOD a set cronometrati ora chiede un tempo **per ogni set**, come fanno i
  gestionali di programmazione, invece di un unico numero. Esempio reale: *Ironworkers — 5 Sets:
  400m Run + 16 Thruster + 8 Bar Muscle Ups, rest 2 minutes between sets*. Il numero di set si
  legge dal testo del WOD (stesso riconoscimento del CARICO PER SET) e resta modificabile con
  **+ Aggiungi Set** e il tasto rimuovi.
- Sotto le righe compare il **totale aggiornato mentre scrivi**: è la somma dei set, senza il
  recupero fra l'uno e l'altro.
- Il punteggio salvato porta **totale davanti e parziali dietro** — `13:57 (2:35/2:41/2:48/2:52/3:01)`
  — così nello storico si vede subito com'è andata set per set. Confronti con la community e
  aggiornamento automatico dei PR usano il **totale**, non un numero pescato a caso dal testo.
- Vale solo per i blocchi **Sets** con più di un set: un For Time normale mantiene il campo unico
  di sempre.

## v55 — 2026-09-06
- **La fascia incontra il WOD.** Sotto ogni sessione registrata (nello Storico e nella vista
  giorno del calendario) compaiono ora i dati Whoop di quell'allenamento: sport, **strain**,
  **bpm medi e massimi**, **calorie**. I due pezzi erano già entrambi nell'app — la card Whoop
  nel tab ATLETA e lo storico dei WOD — ma non si erano mai incontrati: si vedeva *cosa* avevi
  fatto oppure *quanto era costato*, mai le due cose insieme.
- L'abbinamento è **per giornata**, e lo dice: Whoop salva solo la data dell'allenamento (non
  l'ora) e una sessione registrata non ha un'ora sua. Se in un giorno la fascia ha rilevato più
  allenamenti li mostra **tutti**, segnalando che sono più di uno, invece di sceglierne uno a
  caso e far leggere numeri sbagliati.
- Niente striscia sui WOD solo **pubblicati** in bacheca: non sono allenamenti che hai fatto.
- Nessuna modifica al backend: usa i dati che la sincronizzazione Whoop porta già nel Foglio.

## v54 — 2026-09-05
- **Fix del timer (v53): chiudere la modale a metà WOD faceva perdere il tempo.** Bastava
  chiuderla per rileggere il WOD, o toccarla per sbaglio: riaprendola si trovava 00:00, fermo.
  Il timer intanto continuava a girare invisibile, e la riapertura lo azzerava comunque. Ora
  chiudere la modale non ferma niente e riaprendola si ritrova il timer com'era, che stia
  contando o sia in pausa. Su una Parte diversa riparte da capo, con le impostazioni di quel WOD.
- **Lo schermo resta acceso mentre il timer conta** (wake lock): durante un WOD nessuno tocca il
  telefono per svegliarlo, e un timer che sparisce a metà non serve a niente. Si libera in pausa,
  a tempo scaduto e chiudendo la modale, e viene richiesto di nuovo tornando sull'app se il timer
  sta ancora contando. Dove il wake lock non c'è o viene negato, il timer funziona come prima.

## v53 — 2026-09-05
**Timer integrato nel blocco.** Nuovo tasto **⏱ Timer** su ogni Parte, sopra la coppia Log
Result / Results, con tre modalità:
- **Cronometro** per i For Time (parte da zero e sale).
- **Countdown** per gli AMRAP: i minuti si leggono dal testo del WOD ("20 min AMRAP" →
  countdown da 20:00), e si possono cambiare a mano.
- **EMOM**: countdown che riparte a ogni round, con "Round 3 / 10" sotto le cifre e un bip a
  ogni cambio round.
- A fine tempo suona (e vibra, dove il telefono lo permette): il bip è generato al volo, nessun
  file audio da scaricare o da tenere in cache per l'offline.
- **"Usa questo tempo nel Log Result"** apre il Log Result della stessa Parte già impostato su
  Time, coi minuti e i secondi compilati: niente da ricopiare a mano.
- Il tempo si calcola sempre sull'orologio di sistema, mai sommando i tick: con lo schermo
  spento o l'app in secondo piano il browser rallenta i timer, e un cronometro che accumula
  tick perderebbe secondi proprio a metà WOD.
- Cifre grandi e tabulari, leggibili col telefono per terra, e la coppia Log Result / Results
  resta com'era (due metà uguali): il timer sta sopra, a tutta larghezza.

## v52 — 2026-09-05
**Modalità palestra: l'app funziona anche senza linea.**
- **I dati restano.** Ogni sincronizzazione riuscita viene tenuta sul telefono: aprendo l'app
  senza rete si vedono storico, massimali, bacheca e grafici dell'ultima volta, invece di
  un'app vuota. È anche più veloce all'avvio, perché disegna subito la copia locale e poi la
  sostituisce quando il Foglio risponde.
- **I salvataggi non si perdono più.** Senza rete un salvataggio finiva in "Errore di
  connessione", e il lavoro restava solo dentro al form finché non chiudevi l'app. Ora va in
  una coda sul telefono, si vede subito nello storico e nel calendario come se fosse già
  salvato, e **parte da solo appena torna la linea** (o alla sincronizzazione successiva).
  Vale per: salvare un allenamento, pubblicare un WOD, eliminarlo, loggare un risultato e
  salvare un massimale.
- Le scritture partono **nell'ordine in cui le hai fatte**: modificare una sessione manda prima
  la cancellazione e poi il nuovo salvataggio, e invertirle cancellerebbe quanto appena scritto.
- Login, PIN e profilo restano **online**: rimandarli non avrebbe senso e il loro esito va visto
  subito.
- L'indicatore in fondo diceva sempre "Connesso al database di Google Sheet", **anche senza
  linea**. Ora dice la verità: "Offline · stai vedendo gli ultimi dati scaricati" oppure quanti
  salvataggi sono ancora in attesa.

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
