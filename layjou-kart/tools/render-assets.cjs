/**
 * Génère l'icône, les calques adaptatifs Android, les écrans de démarrage, l'icône de notification
 * et les visuels Play Store de Layjou Kart à partir du moteur de dessin du jeu (dev/assets.html).
 *
 *   npm i -D playwright   (une seule fois, si Playwright n'est pas déjà installé)
 *   npm run icons         → assets/ + public/favicon.png + store/
 *   npm run assets        → idem, puis génération des icônes natives Android / iOS (capacitor-assets)
 */
const fs = require('fs');
const path = require('path');

const FILES = [
  ['icon', 1024, 'assets/icon-only.png'], ['fg', 1024, 'assets/icon-foreground.png'], ['bg', 1024, 'assets/icon-background.png'],
  ['splash', 2732, 'assets/splash.png'], ['splash-dark', 2732, 'assets/splash-dark.png'],
  ['icon', 512, 'store/play-icon-512.png'], ['feature', 1024, 'store/feature-graphic-1024x500.png'],
  ['icon', 192, 'public/favicon.png'], ['stat', 96, 'assets/ic_stat_layjou.png'],
];

(async () => {
  const { chromium } = require('playwright');
  const { createServer } = await import('vite');
  const root = path.resolve(__dirname, '..');
  const server = await createServer({ root, server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  for (const [kind, size, file] of FILES) {
    await page.goto(`http://127.0.0.1:5199/dev/assets.html?kind=${kind}&size=${size}`);
    await page.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
    const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
    const out = path.join(root, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
    console.log('✓', file);
  }
  await browser.close(); await server.close();
})().catch((e) => { console.error(e); process.exit(1); });
