#!/usr/bin/env node
// Estrae tutti gli <script> inline (senza attributo src, cioè il codice dell'app) da
// index.html e ne verifica la sintassi con `node --check`. Serve a beccare subito, ad ogni
// push, errori come una virgola dimenticata in un array (è già successo editando a mano
// FUN_LOADING_MESSAGES: mancava una virgola tra due stringhe e l'intera app smetteva di
// funzionare, perché tutto il codice sta in un unico <script>).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const indexPath = path.join(__dirname, '..', '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

// Esclude gli script con src="..." (le librerie da CDN, Tesseract/Cropper): non hanno
// contenuto inline da verificare.
const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let combined = '';
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  combined += match[1] + '\n';
  count++;
}

if (count === 0) {
  console.error('Nessun <script> inline trovato in index.html: controlla il percorso o la regex di estrazione.');
  process.exit(1);
}

const tmpFile = path.join(os.tmpdir(), `index-inline-script-${Date.now()}.js`);
fs.writeFileSync(tmpFile, combined);

try {
  execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'inherit' });
  console.log(`OK: sintassi valida (${count} blocco/i <script> inline, ${combined.split('\n').length} righe totali).`);
} catch (err) {
  console.error('\nErrore di sintassi in uno degli <script> inline di index.html (vedi sopra per riga/colonna).');
  process.exitCode = 1;
} finally {
  fs.unlinkSync(tmpFile);
}
