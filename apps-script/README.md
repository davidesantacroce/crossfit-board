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

## Fogli usati

`Wods`, `Athletes`, `Massimali`, `Results`, `Whoop` (quest'ultimo creato al primo sync).
