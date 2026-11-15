/**
 * Génère les visuels des 4 jeux Layjou (Battle, Bubble, Puzzle, Run) dans brand/ :
 * icône complète, calques adaptatifs Android, écrans de démarrage, icône et bannière Play Store.
 * Le jeu de fichiers de Layjou Battle est aussi copié dans assets/ (source de `capacitor-assets`).
 *
 *   npm i -D playwright && npx playwright install chromium   (une seule fois)
 *   npm run icons          → brand/ + assets/
 *   npm run assets         → idem, puis génération des icônes natives Android / iOS
 */
const fs = require('fs');
const path = require('path');

const GAMES = ['battle', 'bubble', 'puzzle', 'run', 'blocks'];
const FILES = [
  ['icon', 1024, 'icon-only.png'], ['fg', 1024, 'icon-foreground.png'], ['bg', 1024, 'icon-background.png'],
  ['splash', 2732, 'splash.png'], ['splash-dark', 2732, 'splash-dark.png'],
  ['icon', 512, 'store/play-icon-512.png'], ['feature', 1024, 'store/feature-graphic-1024x500.png'],
];

(async () => {
  const { chromium } = require('playwright');
  const { createServer } = await import('vite');
  let sharp = null; try { sharp = require('sharp'); } catch { /* recompression facultative */ }
  const root = path.resolve(__dirname, '..');
  const server = await createServer({ root, server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));

  async function shot(game, kind, size, file) {
    await page.goto(`http://127.0.0.1:5199/dev/icons.html?game=${game}&kind=${kind}&size=${size}`);
    await page.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
    const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
    let buf = Buffer.from(data.split(',')[1], 'base64');
    if (sharp) buf = await sharp(buf).png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }).toBuffer(); // sans perte
    const out = path.join(root, file);
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf);
    console.log('✓', file, `(${Math.round(buf.length / 1024)} Ko)`);
  }

  for (const g of GAMES) for (const [kind, size, name] of FILES) await shot(g, kind, size, `brand/layjou-${g}/${name}`);
  await shot('battle', 'sheet', 1024, 'brand/preview.png');
  // Layjou Battle : sources de capacitor-assets + favicon + icône de notification
  for (const f of ['icon-only.png', 'icon-foreground.png', 'icon-background.png', 'splash.png', 'splash-dark.png']) fs.copyFileSync(path.join(root, 'brand/layjou-battle', f), path.join(root, 'assets', f));
  await shot('battle', 'icon', 192, 'public/favicon.png');
  await shot('battle', 'stat', 96, 'assets/ic_stat_layjou.png');
  await browser.close(); await server.close();
})().catch((e) => { console.error(e); process.exit(1); });
