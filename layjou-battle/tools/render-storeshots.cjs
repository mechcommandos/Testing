/**
 * Génère les captures « store » (légende + capture dans un téléphone) des jeux Layjou
 * à partir de store/<jeu>/captures-brutes/*.jpg et des icônes de brand/.
 *
 *   Google Play      : store/<jeu>/google-play/NN.jpg       1080 × 1920 (9:16)
 *   App Store iPhone : store/<jeu>/app-store-iphone/NN.jpg  1206 × 2622
 *
 *   npm i -D playwright && npx playwright install chromium   (une seule fois)
 *   node tools/render-storeshots.cjs
 */
const fs = require('fs');
const path = require('path');

const GAMES = {
  battle: { name: 'Layjou Battle', colors: ['#ff8a3d', '#e0244a', '#5a0f4c'], captions: [
    ['Pare, esquive et frappe !', 'Des combats en temps réel faciles à prendre en main'],
    ['Déchaîne le Super Cœur', 'Remplis ta jauge et lance l’attaque ultime'],
    ['Personnalise ton robot', 'Skins, accessoires et armes à collectionner'],
    ['Gagne étoiles et trésors', '25 niveaux, 5 boss et une Arène infinie'],
    ['Combats des monstres géants', 'Layjou, le petit robot au grand cœur'],
  ] },
  bubble: { name: 'Layjou Bubble', colors: ['#6ff3ff', '#2fb0ff', '#3a4fd8'], captions: [
    ['Aligne 3 bulles pour les éclater', 'Un match-3 coloré avec Layjou'],
    ['Crée des bulles spéciales', 'Ligne, bombe et arc-en-ciel : combine-les !'],
    ['Des objectifs variés', 'Score, glace à briser, batteries à recharger'],
    ['30 niveaux à conquérir', 'Jusqu’à 3 étoiles par niveau'],
    ['Joue avec Layjou', 'Le petit robot qui adore les bulles'],
  ] },
  puzzle: { name: 'Layjou Puzzle', colors: ['#c3a2ff', '#8356f0', '#4a20b8'], captions: [
    ['Range 3 objets identiques', 'Le jeu de tri relaxant de Layjou'],
    ['Vide les étagères', 'Les objets cachés avancent au premier plan'],
    ['Des bonus malins', 'Aimant, Mélange et Gel pour gagner du temps'],
    ['Prêt à trier ?', 'Des niveaux de plus en plus corsés'],
  ] },
  run: { name: 'Layjou Run', colors: ['#ffb347', '#ff6a5a', '#c0509a'], captions: [
    ['Cours sans t’arrêter !', 'Glisse, saute et passe sous les obstacles'],
    ['Esquive les trains', 'Change de voie au dernier moment'],
    ['Améliore tes bonus', 'Aimant, bouclier et score ×2'],
    ['Bats ton record', 'Une course plus rapide à chaque partie'],
    ['Missions et cadeaux chaque jour', 'Reviens chaque jour pour plus de cœurs'],
  ] },
  blocks: { name: 'Layjou Blocks', colors: ['#8dffb0', '#22c98a', '#0a6e62'], captions: [
    ['Complète des lignes', 'Glisse les pièces sur le plateau 8 × 8'],
    ['Habille ton robot', 'Skins et accessoires à débloquer'],
    ['Des armes pour t’en sortir', 'Marteau, Laser, Chroma et Recycleur'],
    ['Missions du jour', 'Des récompenses à gagner chaque jour'],
    ['Le puzzle de blocs de Layjou', 'Simple à prendre en main, dur à lâcher'],
  ] },
};
const FORMATS = [['google-play', 1080, 1920], ['app-store-iphone', 1206, 2622]];

(async () => {
  const { chromium } = require('playwright');
  const { createServer } = await import('vite');
  const root = path.resolve(__dirname, '..');
  const server = await createServer({ root, server: { port: 5198, host: '127.0.0.1' }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('http://127.0.0.1:5198/dev/storeshots.html');
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 60000 });
  const b64 = (f, mime) => `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;

  for (const [id, g] of Object.entries(GAMES)) {
    const dir = path.join(root, 'store', id, 'captures-brutes');
    if (!fs.existsSync(dir)) { console.warn('pas de captures pour', id); continue; }
    const shots = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
    const icon = b64(path.join(root, 'brand', `layjou-${id}`, 'store', 'play-icon-512.png'), 'image/png');
    for (const [fmt, w, h] of FORMATS) {
      const out = path.join(root, 'store', id, fmt); fs.mkdirSync(out, { recursive: true });
      for (let i = 0; i < shots.length; i++) {
        const [title, sub] = g.captions[i] || ['', ''];
        const url = await page.evaluate(async (o) => { const png = await window.compose(o); const c = document.getElementById('c'); return c.toDataURL('image/jpeg', 0.92) || png; },
          { w, h, shot: b64(path.join(dir, shots[i]), 'image/jpeg'), icon, title, sub, c1: g.colors[0], c2: g.colors[1], c3: g.colors[2], name: g.name });
        const file = path.join(out, `${String(i + 1).padStart(2, '0')}.jpg`);
        fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      }
      console.log('✓', id, fmt, shots.length, 'captures');
    }
  }
  await browser.close(); await server.close();
})().catch((e) => { console.error(e); process.exit(1); });
