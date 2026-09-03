# Backend Apps Script

Codice del Google Apps Script collegato al Foglio Google **"App CrossFit Data"**, che fa da
backend all'app (`../index.html`). È lo script pubblicato all'URL `/exec` che trovi in
`index.html` (`getScriptUrl()`).

| File | Cosa contiene |
|---|---|
| `Code.gs` | Il backend vero e proprio: `doPost` (salvataggi), `doGet` (lettura dati + callback OAuth Whoop), utility, integrazione Whoop. |
| `Diagnostica.gs` | Funzione `diagnosiWhoop()`, di sola lettura, per verificare l'autorizzazione Whoop e quanti dati esistono sull'account. Non serve al funzionamento dell'app: si può tenere o cancellare. |

## ⚠️ La fonte di verità è ancora l'editor Apps Script

Questi file sono una copia versionata del codice, allineata a mano. **Prima di considerarli
autorevoli** (e soprattutto prima di un eventuale `clasp push`, che sovrascrive il progetto
online) verifica che corrispondano a ciò che gira davvero, con `clasp pull` oppure
confrontandoli con l'editor.

## Perché tenerlo nel repo

A differenza di `index.html`, questo codice non può essere modificato direttamente da fuori:
va incollato nell'editor Apps Script. Due volte un incollaggio parziale o duplicato ha rotto
il login in produzione. Tenendolo qui: le modifiche si vedono come diff, la cronologia è in
git, e si può tornare indietro con `git revert` invece che con il rollback delle distribuzioni.

## Sincronizzare con clasp (opzionale)

[clasp](https://github.com/google/clasp) è la CLI ufficiale di Google per Apps Script:

```bash
npm install -g @google/clasp
clasp login                    # richiede il tuo account Google
clasp clone <SCRIPT_ID>        # la prima volta, dentro questa cartella
clasp pull                     # scarica il codice online -> file locali
clasp push                     # carica i file locali -> progetto online
```

Serve prima attivare l'API Apps Script dalle impostazioni di Apps Script.
Lo `<SCRIPT_ID>` si trova in **⚙️ Impostazioni progetto → ID script**.

## Distribuzione: salvare NON basta

Distinzione che è già costata parecchi giri a vuoto:

- **Salvare** (Ctrl+S) è sufficiente per eseguire una funzione dall'editor (`Esegui ▶`) e per
  i **trigger** automatici, che girano sempre sull'ultimo codice salvato.
- Per aggiornare il **web app** (l'URL `/exec` che usa l'app) serve invece:
  **Distribuisci → Gestisci distribuzioni → ✏️ modifica → Nuova versione → Distribuisci**.

In caso di guasto, dalla stessa schermata si può riselezionare una versione precedente per
tornare immediatamente a un codice funzionante.

## Script Properties richieste

Si impostano in **⚙️ Impostazioni progetto → Proprietà script**. I valori non stanno (e non
devono stare) nel repo.

| Proprietà | A cosa serve |
|---|---|
| `WHOOP_CLIENT_ID` | Client ID dell'app registrata sul dashboard sviluppatori Whoop. |
| `WHOOP_CLIENT_SECRET` | Client secret della stessa app. **Segreto**: non condividerlo e non metterlo nel repo. |
| `WHOOP_ATHLETE_NAME` | Nome dell'atleta a cui associare i dati Whoop, scritto esattamente come nel foglio `Athletes` (es. `Davide Santacroce`). |
| `WHOOP_ACCESS_TOKEN`, `WHOOP_REFRESH_TOKEN`, `WHOOP_TOKEN_EXPIRES_AT` | Scritte automaticamente dal codice dopo l'autorizzazione: non impostarle a mano. |
| `HEALTH_INGEST_SECRET` | Segreto condiviso richiesto da `saveHealthData` (peso/Apple Watch, vedi sotto). **Segreto**: generane uno lungo e casuale, non condividerlo e non metterlo nel repo. |
| `HEALTH_ATHLETE_NAME` | Nome dell'atleta a cui associare i dati salute, come nel foglio `Athletes` (es. `Davide Santacroce`). |

## Collegare Whoop

1. Sul dashboard sviluppatori Whoop, registrare come Redirect URI **esattamente** l'URL `/exec`
   della distribuzione attiva.
2. Aprire `<URL_EXEC>?whoopConnect=1` e cliccare "Autorizza con Whoop". Il link ha
   `target="_blank"` apposta: le pagine di `HtmlService` sono servite dentro un iframe, e la
   pagina di login Whoop rifiuta di essere incorniciata (`X-Frame-Options`), quindi senza
   aprire una nuova scheda il browser mostra "connessione negata".
3. A consenso dato, i token finiscono nelle Script Properties.
4. Se l'account ha già mesi di dati storici (verificabile con `diagnosiWhoop`), esegui **una
   volta sola** `backfillWhoopHistory` per recuperare tutto (fino a 3 anni fa): altrimenti
   `syncWhoopData` (14 giorni per volta) ci metterebbe mesi a raggiungerli.
5. `installDailyWhoopSyncTrigger` (da eseguire una volta sola) installa `syncWhoopData` come
   sincronizzazione automatica giornaliera. Rieseguila se rinomini la funzione di sync: ripulisce
   anche un eventuale vecchio trigger rimasto puntato al nome precedente.

Nota: le funzioni con l'underscore finale (`nomeFunzione_`) sono private per convenzione di
Apps Script e **non compaiono** nel menù a tendina dell'editor, quindi non si possono lanciare
a mano. Per questo `syncWhoopData`, `backfillWhoopHistory` e `installDailyWhoopSyncTrigger`
non ce l'hanno; `syncWhoopSince_` invece sì (è il motore comune alle prime due).

## Collegare Apple Watch / bilancia (Renpho o altra) via Salute

Non c'è un'API cloud per questi dati: HealthKit vive solo sul telefono e non è raggiungibile
da una pagina web (nemmeno aprendo l'app dal telefono stesso: Safari non ha accesso a Salute).
Il ponte è un **Comando (Shortcuts) su iPhone** che legge da Salute e chiama il nostro
endpoint — e copre in un colpo solo qualsiasi sorgente scriva su Salute: Apple Watch, bilancia
Renpho tramite la sua app, altre app fitness.

Il Comando è volutamente ridotto a **due azioni per metrica**: i valori viaggiano nei parametri
dell'URL, e il backend si occupa di interpretarli. Niente azioni Dizionario/Testo/Numero/Data
da montare a mano sul telefono.

1. Genera un segreto lungo e casuale (es. con un password manager) e mettilo in
   `HEALTH_INGEST_SECRET` nelle Script Properties. Imposta anche `HEALTH_ATHLETE_NAME`.
2. Sul telefono, app **Comandi** → **Automazione** → **Crea automazione personale** →
   **Ora del giorno** (es. ogni sera alle 22, dopo l'allenamento/la pesata).
3. **Azione 1**: cerca "Salute" nella libreria e aggiungi "Trova campioni di dati sanitari"
   (il nome esatto varia tra versioni di iOS) → Tipo: **Peso corporeo**, Ordina per: **più
   recente**, Limita a: **1**.
4. **Azione 2**: aggiungi **Ottieni contenuto di URL** e scrivi nel campo URL:
   ```
   <URL_EXEC>?action=saveHealthData&secret=<IL_TUO_SEGRETO>&weight=
   ```
   poi, senza spazi dopo `=`, inserisci la **variabile** del campione letto al passo 3
   (toccando la barra sopra la tastiera). Metodo `GET`, nessun corpo da configurare.
5. Disattiva "Chiedi prima di eseguire" sull'automazione, altrimenti non parte da sola.

**Per aggiungere altre metriche**: una "Trova campioni di dati sanitari" in più per ciascuna, e
in fondo all'URL `&nomeCampo=` seguito dalla sua variabile. I campi accettati sono `weight`,
`bodyFatPercentage`, `restingHeartRate`, `steps`, `activeEnergy` — tutti facoltativi, in
qualunque combinazione. I campi omessi in una chiamata **non cancellano** quelli già salvati
per lo stesso giorno, quindi si possono anche spezzare in automazioni diverse a orari diversi.

**Come impostare l'azione Salute, metrica per metrica**: alcune grandezze in Salute sono un
singolo campione al giorno, altre sono decine di campioni sparsi nella giornata. Sbagliare qui
è la causa più probabile di valori che "ballano".

| Campo | Tipo in Salute | Impostazione dell'azione |
|---|---|---|
| `weight` | una pesata | Ordina per **più recente**, Limite **1** |
| `bodyFatPercentage` | una pesata | Ordina per **più recente**, Limite **1** |
| `restingHeartRate` | uno al giorno | Ordina per **più recente**, Limite **1** |
| `steps` | tanti campioni | Filtro **data di inizio = oggi**, nessun limite, poi **Calcola statistiche → Somma** |
| `activeEnergy` | tanti campioni | Filtro **data di inizio = oggi**, nessun limite, poi **Calcola statistiche → Somma** |

Con "più recente" su passi o energia attiva si prende solo l'ultimo frammento registrato (es.
le poche kcal degli ultimi minuti), non il totale del giorno.

**Protezione lato server**: `steps` e `activeEnergy` sono trattati come cumulativi — un valore
più basso di quello già salvato per lo stesso giorno viene ignorato, perché è quasi certamente
un totale parziale. Questo permette di far girare l'automazione più volte al giorno tenendo
sempre il totale più alto, e protegge dal caso in cui l'azione sia rimasta configurata su "più
recente". Peso, grasso corporeo e FC a riposo non sono cumulativi: lì l'ultima misurazione
sostituisce sempre la precedente, anche verso il basso. Per correggere a mano un cumulativo
sbagliato si modifica la cella nel foglio `Health`.

**Perché non serve convertire i valori**: `parseHealthNumber_` in `Code.gs` normalizza quello
che manda Comandi, unità di misura e separatori compresi — `78,4 kg` → `78.4`, `8.400 passi` →
`8400`, `15,2%` → `15.2`. Un separatore singolo seguito da esattamente tre cifre è trattato da
separatore delle migliaia (nessuna di queste metriche ha senso con tre decimali).

**La data non serve passarla**: se manca, il backend usa il giorno corrente nel fuso del
Foglio. Passala (`&date=AAAA-MM-GG`) solo se il Comando gira a cavallo della mezzanotte o se
vuoi scrivere su un giorno diverso.

**Per verificare**: esegui il Comando a mano col tasto ▶. La risposta dice cosa è stato
scritto, es. `{"status":"success","date":"2026-09-04","saved":["weight"]}`. Se `saved` è vuoto
il valore non è arrivato (variabile non inserita nell'URL); se leggi `Non autorizzato` il
segreto non corrisponde.

Nota: l'ingestione funziona anche in `POST` con un corpo JSON (stessi campi più `action` e
`secret`), che è la forma più corretta per una scrittura. La `GET` esiste perché rende il
Comando enormemente più semplice da costruire, e l'operazione è comunque idempotente: riscrive
la riga del giorno invece di accodarne una nuova.

## Fogli usati

`Wods`, `Athletes`, `Massimali`, `Results`, `Whoop` (creato al primo sync), `Health` (creato
alla prima chiamata `saveHealthData`).
