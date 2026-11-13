// Browser smoke test: plays real swipes on the board (node tests/ui.test.mjs [screenshot-dir]).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = new URL('../www/', import.meta.url).pathname;
const shots = process.argv[2];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const p = req.url.split('?')[0];
    const data = await readFile(join(root, p === '/' ? 'index.html' : p));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'text/html' }).end(data);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'fr-FR' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (name) => { if (shots) await page.screenshot({ path: join(shots, name + '.png') }); };
const idle = () => page.waitForFunction(() => !window.__layjou.busy, null, { timeout: 20000 });

async function swipe() {
  const m = await page.evaluate(() => {
    const mv = window.__layjou.board.findMove();
    const rect = document.getElementById('board').getBoundingClientRect();
    const s = rect.width / window.__layjou.board.cols;
    const pt = (p) => ({ x: rect.left + (p.c + 0.5) * s, y: rect.top + (p.r + 0.5) * s });
    return { a: pt(mv.a), b: pt(mv.b) };
  });
  await page.mouse.move(m.a.x, m.a.y);
  await page.mouse.down();
  await page.mouse.move(m.b.x, m.b.y, { steps: 4 });
  await page.mouse.up();
  await idle();
}

await page.goto(url);
await shot('1-home');
await page.click('#btnPlay');
await shot('2-intro');
await page.click('#mStart');
await shot('3-board');
for (let i = 0; i < 3; i++) await swipe();
const st = await page.evaluate(() => ({ moves: window.__layjou.board.moves, score: window.__layjou.board.score }));
if (st.score <= 0) throw new Error('swipes did not score: ' + JSON.stringify(st));
await shot('4-playing');

// Out of moves -> rewarded ad -> game continues with +5 moves.
await page.evaluate(() => window.__layjou.startLevel(6));
await page.click('#mStart');
await page.evaluate(() => { window.__layjou.board.moves = 1; });
await swipe().catch(() => {});
await page.waitForSelector('#mAd', { timeout: 20000 });
await shot('5-out-of-moves');
await page.click('#mAd');
await page.waitForSelector('#fakeAd.show');
await page.waitForSelector('#fakeAd', { state: 'hidden', timeout: 10000 });
await idle();
const moves = await page.evaluate(() => window.__layjou.board.moves);
if (moves !== 5) throw new Error('expected 5 moves after the ad, got ' + moves);
await swipe();
await shot('6-continued');

// Winning stores stars and unlocks the next level.
await page.evaluate(() => window.__layjou.startLevel(1));
await page.click('#mStart');
await page.evaluate(() => { window.__layjou.board.score = 1e6; });
await swipe().catch(() => {});
await page.waitForSelector('#mNext', { timeout: 20000 });
await shot('7-win');
await page.click('#mMenu');
await shot('8-levels');
const unlocked = await page.locator('.lvl:not(.locked)').count();
if (unlocked < 2) throw new Error('level 2 should be unlocked');

await browser.close();
server.close();
if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('ui test passed');
