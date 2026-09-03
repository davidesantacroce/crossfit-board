// Service worker minimo: serve solo a rendere l'app installabile (PWA) e a farla aprire anche
// offline con l'ultima versione vista, NON a mettere in cache dati. Le chiamate all'API (Google
// Apps Script, altro dominio) e le librerie da CDN non vengono mai intercettate: vanno sempre in
// rete come oggi, altrimenti risultati salvati/dati Whoop e Salute rischierebbero di restare
// "congelati" a una copia vecchia.
//
// Bump di CACHE_NAME quando cambia l'elenco SHELL_URLS: invalida la cache precedente invece di
// tenerla in giro all'infinito.
const CACHE_NAME = 'bicocca-crossfit-shell-v1';
const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Solo GET della stessa origine: le POST di salvataggio e le chiamate a Google Apps Script
  // (altro dominio) devono sempre andare in rete, mai passare da qui.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Network-first: chi ha connessione vede sempre l'ultima versione pubblicata della pagina;
  // solo se la rete non risponde (offline) si ripiega sull'ultima copia salvata in cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
