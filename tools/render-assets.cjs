/**
 * Régénère les visuels sources de l'app dans assets/ (icône, splash) et public/favicon.png
 * à partir du moteur de rendu vectoriel du jeu.
 *
 *   npm i -D playwright && npx playwright install chromium   (une seule fois)
 *   npm run assets
 */
const fs = require('fs');
const path = require('path');

(async () => {
  const { chromium } = require('playwright');
  const { createServer } = await import('vite');
  const root = path.resolve(__dirname, '..');
  const server = await createServer({ root, server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  const out = (p) => path.join(root, p);
  fs.mkdirSync(out('assets'), { recursive: true }); fs.mkdirSync(out('public'), { recursive: true });
  const jobs = [
    ['icon', 1024, 'assets/icon-only.png'], ['fg', 1024, 'assets/icon-foreground.png'], ['bg', 1024, 'assets/icon-background.png'],
    ['splash', 2732, 'assets/splash.png'], ['splash-dark', 2732, 'assets/splash-dark.png'], ['icon', 192, 'public/favicon.png'], ['stat', 96, 'assets/ic_stat_layjou.png'],
  ];
  for (const [kind, size, file] of jobs) {
    await page.goto(`http://127.0.0.1:5199/dev/assets.html?kind=${kind}&size=${size}`);
    await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
    const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
    fs.writeFileSync(out(file), Buffer.from(data.split(',')[1], 'base64'));
    console.log('✓', file);
  }
  await browser.close(); await server.close();
})().catch((e) => { console.error(e); process.exit(1); });
