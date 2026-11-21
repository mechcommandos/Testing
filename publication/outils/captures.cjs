/**
 * Captures brutes des 6 jeux Layjou pour les stores, prises automatiquement dans de vraies parties.
 *
 *   node publication/outils/captures.cjs [jeu ...] [--formats=phone,ipad,iap] [--langs=fr,en]
 *
 * Sortie : publication/store/<jeu>/captures-brutes/<format>-<langue>/NN-<nom>.jpg
 *   phone : 1206 × 2622 (iPhone avec Dynamic Island, écran moyen ; sert aussi à Google Play)
 *   ipad  : 2064 × 2752 (iPad 13 pouces)
 *
 * Prérequis : Playwright (Chromium), `npm install` dans chaque jeu, et les bundles web construits :
 *   Blocks `npm run build` (dist/), Battle `npm run build` (layjou-battle/dist/).
 *   Kart est lancé avec son serveur de développement (accès de test à la course).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');

const REPO = path.resolve(__dirname, '..', '..');
const OUT = path.join(REPO, 'publication', 'store');
const FORMATS = {
  phone: { viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true },
  ipad: { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, isMobile: true },
  // écran Boutique pour la vérification des achats intégrés par Apple (non composé pour les stores)
  iap: { viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };

/* ------------------------------ serveurs ------------------------------ */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };
function serve(dir, port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}
async function kartDevServer(port) {
  const root = path.join(REPO, 'layjou-kart');
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [root] })).href);
  const srv = await vite.createServer({ root, server: { port, host: '127.0.0.1', strictPort: true }, logLevel: 'error' });
  await srv.listen(); return srv;
}

/* ------------------------------ utilitaires ------------------------------ */
const tapForce = (page, sel) => page.locator(sel).first().click({ force: true, timeout: 5000 }).catch(() => {});
async function drag(page, from, to, steps = 12) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
}
const center = async (loc) => { const b = await loc.boundingBox(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; };

/* ------------------------------ scénarios ------------------------------ */
// Chaque scénario renvoie une liste de [nom, async (page, lang, fmt) => void] ; la capture est prise à la fin.
const SCENARIOS = {
  kart: {
    url: 'http://127.0.0.1:5191/',
    init: (lang) => ({ key: 'layjou-kart-save-v1', value: { settings: { lang, haptics: true }, tut: { steer: 1, drift: 1, item: 1, special: 1, start: 1, jump: 1 }, coins: 12450, credits: 260, level: 8, xp: 140, owned: { skin: ['classic', 'fraise', 'neon'], accessory: ['none', 'scarf', 'cap'], weapon: ['blaster', 'saber'], kart: ['coeur', 'bonbon', 'requin'] } } }),
    shots: {
      'course-derapage': async (page) => { await kartRace(page, 'candy-0', 8.4); },
      'tunnel-neon': async (page) => { await kartRace(page, 'harbor-0', 15.8); },
      'lune-givree': async (page) => { await kartRace(page, 'frost-2', 9.5); },
      boutique: async (page) => { await tapForce(page, '[data-tab="shop"]'); await sleep(1000); },
      garage: async (page) => { await tapForce(page, '[data-tab="garage"]'); await sleep(500); await tapForce(page, '[data-act="tab"][data-t="kart"]'); await sleep(400); await tapForce(page, '[data-act="pick"][data-id="requin"]'); await sleep(900); },
      podium: async (page) => {
        await kartRace(page, 'candy-1', 4.5, false);
        await page.evaluate(() => { const R = window.__race(); const L = R.L * R.laps; R.player.dist = L - 2400; R.player.score = 2650; R.player.stats.drifts = 9; R.racers.forEach((r, i) => { if (!r.isPlayer) r.dist = L - 3000 - i * 500; }); });
        await sleep(4300);
      },
      accueil: async () => { await sleep(600); },
    },
    sets: { phone: ['course-derapage', 'tunnel-neon', 'lune-givree', 'garage', 'podium'], ipad: ['course-derapage', 'tunnel-neon', 'garage'], iap: ['boutique'] },
  },
  battle: {
    url: 'http://127.0.0.1:5192/',
    init: (lang) => ({ key: 'layjou-battle-save-v1', value: { settings: { lang }, coins: 8400, credits: 180, level: 6, stage: 6 } }),
    shots: {
      combat: async (page) => { await tapForce(page, '.btn-play'); await sleep(5200); for (let i = 0; i < 4; i++) { await page.keyboard.press('j'); await sleep(260); } await sleep(300); },
      hangar: async (page) => { await tapForce(page, '[data-tab="hangar"]'); await sleep(900); },
      carte: async (page) => { await tapForce(page, '[data-tab="map"]'); await sleep(900); },
      boutique: async (page) => { await tapForce(page, '[data-tab="shop"]'); await sleep(900); },
      accueil: async () => { await sleep(800); },
    },
    sets: { phone: ['combat', 'hangar', 'carte', 'boutique', 'accueil'], ipad: ['combat', 'hangar', 'accueil'], iap: ['boutique'] },
  },
  blocks: {
    url: 'http://127.0.0.1:5193/',
    init: (lang) => ({ key: null, lang }),
    shots: {
      plateau: async (page) => {
        await tapForce(page, 'button.play'); await sleep(1400);
        const targets = [[0, 0], [5, 0], [0, 6], [6, 6], [3, 3], [2, 6], [6, 2], [4, 0], [0, 3]];
        for (let round = 0, t = 0; round < 3; round++) {
          for (let k = 0; k < 3; k++) {
            const pieces = page.locator('.slot .piece'); if (await pieces.count() === 0) break;
            const from = await center(pieces.first()); const cells = page.locator('.cell');
            const [c, r] = targets[t++ % targets.length]; const to = await center(cells.nth(r * 8 + c));
            if (from && to) { await drag(page, from, { x: to.x, y: to.y - 40 }); await sleep(650); }
          }
        }
        await sleep(700);
      },
      style: async (page) => { await tapForce(page, '.nav-btn.n2'); await sleep(1000); },
      boutique: async (page) => { await tapForce(page, '.nav-btn.n1'); await sleep(1000); },
      missions: async (page) => { await tapForce(page, '.nav-btn.n3'); await sleep(1000); },
      accueil: async () => { await sleep(800); },
    },
    sets: { phone: ['plateau', 'style', 'boutique', 'missions', 'accueil'], ipad: ['plateau', 'style', 'accueil'], iap: ['boutique'] },
  },
  bubble: {
    url: 'http://127.0.0.1:5194/',
    init: (lang) => ({ key: 'layjou-bubble-v1', value: { stars: { 1: 3, 2: 3, 3: 2, 4: 3, 5: 1 }, sound: true, vibe: true }, lang }),
    shots: {
      partie: async (page) => { await bubbleStart(page); await bubbleSwaps(page, 6); },
      combo: async (page) => { await bubbleStart(page); await bubbleSwaps(page, 14); },
      niveaux: async (page) => { await tapForce(page, '#btnLevels'); await sleep(900); },
      accueil: async () => { await sleep(800); },
    },
    sets: { phone: ['partie', 'combo', 'niveaux', 'accueil'], ipad: ['partie', 'niveaux', 'accueil'] },
  },
  puzzle: {
    url: 'http://127.0.0.1:5195/',
    init: (lang) => ({ key: 'layjou-puzzle-save-v1', value: { level: 4, coins: 135, sound: true, vibe: true, boosters: { magnet: 2, shuffle: 2, freeze: 1 } }, lang }),
    shots: {
      partie: async (page) => { await tapForce(page, '#btn-play'); await sleep(1500); await puzzleMoves(page, 4); },
      tri: async (page) => { await tapForce(page, '#btn-play'); await sleep(1500); await puzzleMoves(page, 10); },
      accueil: async () => { await sleep(800); },
    },
    sets: { phone: ['partie', 'tri', 'accueil'], ipad: ['partie', 'tri', 'accueil'] },
  },
  run: {
    url: 'http://127.0.0.1:5196/',
    langs: ['fr'], // jeu en français uniquement
    init: () => ({ key: 'roborush.v1', value: { best: 4820, hearts: 260, streak: 3, mute: false, vibe: true } }),
    shots: {
      course: async (page) => { await tapForce(page, '#playBtn'); await sleep(2600); },
      esquive: async (page) => { await tapForce(page, '#playBtn'); await sleep(1500); for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowRight']) { await page.keyboard.press(k); await sleep(420); } await sleep(300); },
      ameliorations: async (page) => { await tapForce(page, '#shopBtn'); await sleep(900); },
      accueil: async () => { await sleep(800); },
    },
    sets: { phone: ['course', 'esquive', 'ameliorations', 'accueil'], ipad: ['course', 'ameliorations', 'accueil'] },
  },
};

async function kartRace(page, key, seconds, autopilot = true) {
  await page.evaluate(async (k) => {
    const { startRace } = await import('/src/ui/race-ui.js');
    const { eventByKey } = await import('/src/game/data.js');
    startRace(eventByKey(k));
    window.__ap = setInterval(() => {
      const R = window.__race(); if (!R) return;
      const p = R.player, segs = R.track.segments, N = segs.length, i0 = R.segIndex(p);
      let c = 0; for (let j = 2; j < 14; j++) c += segs[(i0 + j) % N].curve; c /= 12;
      window.__steer(Math.max(-1, Math.min(1, (-c * 0.08 - p.x) * 2.5 + c * 0.3)));
      if (p.item && Math.random() < 0.03) R.input.useItem = true;
    }, 50);
  }, key);
  if (!autopilot) await page.evaluate(() => clearInterval(window.__ap));
  await sleep(seconds * 1000);
}
async function bubbleStart(page) { await tapForce(page, '#btnPlay'); await sleep(900); await tapForce(page, '#mStart'); await sleep(1200); }
async function bubbleSwaps(page, n) {
  const tiles = page.locator('.tile'); const count = await tiles.count(); if (!count) return;
  const cols = await page.evaluate(() => { const t = [...document.querySelectorAll('.tile')]; const y0 = t[0].getBoundingClientRect().top; return t.filter((e) => Math.abs(e.getBoundingClientRect().top - y0) < 2).length; });
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * (count - cols - 1)); const a = await center(tiles.nth(idx));
    const b = await center(tiles.nth(Math.random() < 0.5 ? idx + 1 : idx + cols)); if (a && b) await drag(page, a, b, 6);
    await sleep(1100);
  }
}
async function puzzleMoves(page, n) {
  for (let i = 0; i < n; i++) {
    const items = page.locator('.row.front .item'); const slots = page.locator('.row.front .slot:not(:has(.item))');
    if (!(await items.count()) || !(await slots.count())) break;
    const a = await center(items.nth(Math.floor(Math.random() * (await items.count()))));
    const b = await center(slots.nth(Math.floor(Math.random() * (await slots.count()))));
    if (a && b) await drag(page, a, { x: b.x, y: b.y + 20 }, 10);
    await sleep(900);
  }
}

/* ------------------------------------ main ------------------------------------ */
(async () => {
  const args = process.argv.slice(2);
  const games = args.filter((a) => !a.startsWith('--')); const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1].split(',');
  const formats = opt('formats', 'phone,ipad'), langs = opt('langs', 'fr,en');
  const list = games.length ? games : Object.keys(SCENARIOS);
  const servers = [await serve(path.join(REPO, 'layjou-battle', 'dist'), 5192), await serve(path.join(REPO, 'dist'), 5193),
    await serve(path.join(REPO, 'layjou-bubble', 'www'), 5194), await serve(path.join(REPO, 'layjou-puzzle', 'www'), 5195), await serve(path.join(REPO, 'layjou-run', 'www'), 5196)];
  const vite = list.includes('kart') ? await kartDevServer(5191) : null;
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  for (const g of list) {
    const S = SCENARIOS[g];
    for (const fmt of formats) for (const lang of (S.langs || langs)) {
      if (!S.sets[fmt]) continue;
      const dir = path.join(OUT, g, 'captures-brutes', `${fmt}-${lang}`); fs.mkdirSync(dir, { recursive: true });
      for (const [i, name] of S.sets[fmt].entries()) {
        const ctx = await browser.newContext({ ...FORMATS[fmt], hasTouch: true, locale: lang === 'fr' ? 'fr-FR' : 'en-US' });
        const init = S.init(lang);
        await ctx.addInitScript(({ init, day }) => {
          try { if (init.key && !sessionStorage.getItem('__init')) { localStorage.setItem(init.key, JSON.stringify(init.value)); sessionStorage.setItem('__init', '1'); } } catch { /* ignore */ }
          window.__day = day;
        }, { init, day: today() });
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', (e) => errs.push(e.message));
        await page.goto(S.url); await sleep(1800);
        // ferme une éventuelle fenêtre d'accueil (cadeau du jour…)
        await page.keyboard.press('Escape').catch(() => {});
        try { await S.shots[name](page, lang, fmt); } catch (e) { errs.push(String(e.message || e)); }
        const file = path.join(dir, `${String(i + 1).padStart(2, '0')}-${name}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
        console.log(errs.length ? '⚠' : '✓', g, fmt, lang, name, errs.length ? errs.join(' | ').slice(0, 160) : '');
        await ctx.close();
      }
    }
  }
  await browser.close();
  for (const s of servers) s.close();
  if (vite) await vite.close();
})().catch((e) => { console.error(e); process.exit(1); });
