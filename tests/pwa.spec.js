const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { gotoApp } = require('./helpers');

test('la pagina dichiara manifest e icone per essere installabile come PWA', async ({ page }) => {
  await gotoApp(page);

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.json');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', 'icons/apple-touch-icon.png');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#121316');
});

// Letto da disco (non via fetch dal browser): i test caricano index.html con file://, dove le
// richieste fetch relative sono soggette a restrizioni CORS del browser non pertinenti qui —
// interessa solo che il file sia JSON valido e coerente con quanto dichiarato in index.html.
test('manifest.json è valido e punta a icone che esistono davvero', async () => {
  const manifestPath = path.resolve(__dirname, '..', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  expect(manifest.name).toBeTruthy();
  expect(manifest.display).toBe('standalone');
  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  // Almeno un'icona "any" e una "maskable" (Android la ritaglia diversamente).
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);

  manifest.icons.forEach((icon) => {
    const iconPath = path.resolve(__dirname, '..', icon.src);
    expect(fs.existsSync(iconPath), `icona mancante: ${icon.src}`).toBe(true);
  });
});

test('sw.js non intercetta mai le chiamate all\'API (solo GET stessa origine)', async () => {
  const swPath = path.resolve(__dirname, '..', 'sw.js');
  const sw = fs.readFileSync(swPath, 'utf8');

  // Verifica di intento più che di comportamento: il guard che esclude POST e le richieste
  // cross-origin (Google Apps Script) deve restare nel file, altrimenti dati salvati o Whoop/
  // Salute rischierebbero di essere serviti da una cache invece che dalla rete.
  expect(sw).toMatch(/method\s*!==\s*['"]GET['"]/);
  expect(sw).toMatch(/origin\s*!==\s*self\.location\.origin/);
});
