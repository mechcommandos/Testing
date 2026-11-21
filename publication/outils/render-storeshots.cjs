/**
 * Compose les captures « store » (pastille du jeu + légende + capture dans un appareil) des 6 jeux Layjou
 * à partir des captures brutes publication/store/<jeu>/captures-brutes/<format>-<langue>/NN-<scène>.jpg
 * (produites par captures.cjs) et des icônes publication/brand/layjou-<jeu>/store/play-icon-512.png.
 *
 *   phone-<lg>  →  google-play/<lg>/NN.jpg        1080 × 1920  (Google Play, téléphone)
 *               →  app-store-iphone/<lg>/NN.jpg   1206 × 2622  (App Store, iPhone 6,9" « Dynamic Island »)
 *   ipad-<lg>   →  app-store-ipad/<lg>/NN.jpg     2064 × 2752  (App Store, iPad 13")
 *
 *   node publication/outils/render-storeshots.cjs [jeu ...]
 * Seul prérequis : Playwright + Chromium (aucun accès réseau : la police est dans outils/fonts).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');          // publication/
const STORE = path.join(ROOT, 'store');
const BRAND = path.join(ROOT, 'brand');

/* Légendes par scène : { fr: [titre, sous-titre], en: [...] }. Clé « NN-scène » prioritaire sur « scène ». */
const GAMES = {
  kart: { name: 'Layjou Kart', colors: ['#ff8fd0', '#7b3cf0', '#2d1474'], captions: {
    'course-derapage': { fr: ['Dérape et fonce !', 'Mini-turbos, turbos dorés et figures sur les tremplins'], en: ['Drift and boost!', 'Mini-turbos, golden boosts and ramp tricks'] },
    'tunnel-neon': { fr: ['15 circuits délirants', 'Bonbon-Ville, Port Néon, Lune Givrée et plus encore'], en: ['15 wild tracks', 'Candy City, Neon Harbor, Frost Moon and more'] },
    'lune-givree': { fr: ['Affronte 7 rivaux monstrueux', 'Objets, armes et attaques spéciales pour les doubler'], en: ['Race 7 monster rivals', 'Items, weapons and special attacks to get ahead'] },
    garage: { fr: ['Personnalise ton bolide', 'Karts, skins, accessoires et armes à collectionner'], en: ['Customize your ride', 'Karts, skins, accessories and weapons to collect'] },
    podium: { fr: ['Monte sur la 1re marche !', 'Gagne des coupes, des étoiles et des récompenses'], en: ['Take first place!', 'Win cups, stars and rewards'] },
  } },
  battle: { name: 'Layjou Battle', colors: ['#ff8a3d', '#e0244a', '#5a0f4c'], captions: {
    combat: { fr: ['Pare, esquive et frappe !', 'Des combats en temps réel faciles à prendre en main'], en: ['Block, dodge and strike!', 'Real-time battles that are easy to pick up'] },
    'super-coeur': { fr: ['Déchaîne le Super Cœur', 'Remplis ta jauge et lance l’attaque ultime'], en: ['Unleash the Super Heart', 'Fill your gauge and launch the ultimate attack'] },
    hangar: { fr: ['Personnalise ton robot', 'Skins, accessoires et armes à collectionner'], en: ['Customize your robot', 'Skins, accessories and weapons to collect'] },
    victoire: { fr: ['Gagne étoiles et trésors', '25 niveaux, 5 boss et une Arène infinie'], en: ['Earn stars and treasures', '25 levels, 5 bosses and an endless Arena'] },
    carte: { fr: ['25 niveaux et 5 boss', 'Une grande aventure et une Arène infinie'], en: ['25 levels and 5 bosses', 'A big adventure plus an endless Arena'] },
    boutique: { fr: ['Une boutique pleine de surprises', 'Packs, crédits et pièces pour progresser plus vite'], en: ['A shop full of surprises', 'Packs, credits and coins to level up faster'] },
    accueil: { fr: ['Combats des monstres géants', 'Layjou, le petit robot au grand cœur'], en: ['Battle giant monsters', 'Layjou, the little robot with a big heart'] },
  } },
  blocks: { name: 'Layjou Blocks', colors: ['#8dffb0', '#22c98a', '#0a6e62'], captions: {
    plateau: { fr: ['Complète des lignes', 'Glisse les pièces sur le plateau 8 × 8'], en: ['Clear lines', 'Drag pieces onto the 8 × 8 board'] },
    style: { fr: ['Habille ton robot', 'Skins et accessoires à débloquer'], en: ['Dress up your robot', 'Skins and accessories to unlock'] },
    boutique: { fr: ['Des armes pour t’en sortir', 'Marteau, Laser, Chroma et Recycleur'], en: ['Weapons to save the day', 'Hammer, Laser, Chroma and Recycler'] },
    missions: { fr: ['Missions du jour', 'Des récompenses à gagner chaque jour'], en: ['Daily missions', 'New rewards to win every day'] },
    accueil: { fr: ['Le puzzle de blocs de Layjou', 'Simple à prendre en main, dur à lâcher'], en: ['Layjou’s block puzzle', 'Easy to pick up, hard to put down'] },
  } },
  bubble: { name: 'Layjou Bubble', colors: ['#6ff3ff', '#2fb0ff', '#3a4fd8'], captions: {
    partie: { fr: ['Aligne 3 bulles pour les éclater', 'Un match-3 coloré avec Layjou'], en: ['Match 3 bubbles to pop them', 'A colorful match-3 with Layjou'] },
    combo: { fr: ['Crée des bulles spéciales', 'Ligne, bombe et arc-en-ciel : combine-les !'], en: ['Create special bubbles', 'Line, bomb and rainbow: combine them!'] },
    objectif: { fr: ['Des objectifs variés', 'Score, glace à briser, batteries à recharger'], en: ['Varied goals', 'Score, ice to break, batteries to charge'] },
    niveaux: { fr: ['30 niveaux à conquérir', 'Jusqu’à 3 étoiles par niveau'], en: ['30 levels to conquer', 'Up to 3 stars per level'] },
    accueil: { fr: ['Joue avec Layjou', 'Le petit robot qui adore les bulles'], en: ['Play with Layjou', 'The little robot who loves bubbles'] },
  } },
  puzzle: { name: 'Layjou Puzzle', colors: ['#c3a2ff', '#8356f0', '#4a20b8'], captions: {
    partie: { fr: ['Range 3 objets identiques', 'Le jeu de tri relaxant de Layjou'], en: ['Sort 3 matching items', 'Layjou’s relaxing sorting game'] },
    tri: { fr: ['Vide les étagères', 'Les objets cachés avancent au premier plan'], en: ['Clear the shelves', 'Hidden items move to the front'] },
    aimant: { fr: ['Des bonus malins', 'Aimant, Mélange et Gel pour gagner du temps'], en: ['Clever boosters', 'Magnet, Shuffle and Freeze to save time'] },
    accueil: { fr: ['Prêt à trier ?', 'Des niveaux de plus en plus corsés'], en: ['Ready to sort?', 'Levels that get trickier and trickier'] },
  } },
  run: { name: 'Layjou Run', colors: ['#ffb347', '#ff6a5a', '#c0509a'], captions: {
    course: { fr: ['Cours sans t’arrêter !', 'Glisse, saute et passe sous les obstacles'] },
    '02-course': { fr: ['Esquive les trains', 'Change de voie au dernier moment'] },
    esquive: { fr: ['Esquive les trains', 'Change de voie au dernier moment'] },
    ameliorations: { fr: ['Améliore tes bonus', 'Aimant, bouclier et score ×2'] },
    'fin-course': { fr: ['Bats ton record', 'Une course plus rapide à chaque partie'] },
    accueil: { fr: ['Missions et cadeaux chaque jour', 'Reviens chaque jour pour plus de cœurs'] },
  } },
};
const OUTPUTS = {
  phone: [['google-play', 1080, 1920, 'phone'], ['app-store-iphone', 1206, 2622, 'phone']],
  ipad: [['app-store-ipad', 2064, 2752, 'tablet']],
};

function serve(dir, port) {
  const types = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.js': 'text/javascript' };
  const srv = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}

(async () => {
  const only = process.argv.slice(2);
  const { chromium } = require('playwright');
  const server = await serve(__dirname, 5198);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('http://127.0.0.1:5198/storeshots.html');
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 60000 });
  const fontOk = await page.evaluate(() => document.fonts.check('700 40px "Fredoka Variable"'));
  if (!fontOk) throw new Error('police Fredoka non chargée');
  const b64 = (f, mime) => `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;

  for (const [id, g] of Object.entries(GAMES)) {
    if (only.length && !only.includes(id)) continue;
    const rawRoot = path.join(STORE, id, 'captures-brutes');
    if (!fs.existsSync(rawRoot)) { console.warn('pas de captures pour', id); continue; }
    const icon = b64(path.join(BRAND, `layjou-${id}`, 'store', 'play-icon-512.png'), 'image/png');
    for (const src of fs.readdirSync(rawRoot).sort()) {
      const m = /^(phone|ipad)-(fr|en)$/.exec(src); if (!m) continue;
      const [, kind, lang] = m;
      const shots = fs.readdirSync(path.join(rawRoot, src)).filter((f) => f.endsWith('.jpg')).sort();
      for (const [fmt, w, h, device] of OUTPUTS[kind]) {
        const out = path.join(STORE, id, fmt, lang);
        fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
        for (const [i, file] of shots.entries()) {
          const stem = file.replace(/\.jpg$/, ''), scene = stem.replace(/^\d+-/, '');
          const cap = g.captions[stem] || g.captions[scene];
          if (!cap || !cap[lang]) throw new Error(`légende manquante : ${id} ${scene} (${lang})`);
          const [title, sub] = cap[lang];
          const url = await page.evaluate(async (o) => { await window.compose(o); return document.getElementById('c').toDataURL('image/jpeg', 0.92); },
            { w, h, device, shot: b64(path.join(rawRoot, src, file), 'image/jpeg'), icon, title, sub, c1: g.colors[0], c2: g.colors[1], c3: g.colors[2], name: g.name });
          fs.writeFileSync(path.join(out, `${String(i + 1).padStart(2, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
        }
        console.log('✓', id, fmt, lang, shots.length, 'captures');
      }
    }
  }
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
