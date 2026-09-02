# Test automatici

Test [Playwright](https://playwright.dev/) sui percorsi critici di `index.html`: caricamento
sessione, validazioni, OCR, bacheca WOD del giorno, aggiornamento automatico di
massimali/benchmark. Il backend Google Apps Script è simulato in memoria (vedi
`tests/helpers.js`), quindi girano offline senza toccare il Foglio Google vero.

## Prima volta

```bash
npm install
npx playwright install --with-deps chromium
```

## Eseguirli

```bash
npm test
```

Aggiungi un nuovo file `tests/*.spec.js` per ogni percorso critico che vuoi tenere sotto
controllo — non serve coprire tutto, solo ciò che farebbe più male rompere senza accorgersene.
