// LayJou Bubble — UI: screens, board rendering, animations, input, modals.
import { Board } from './engine.js';
import { getLevel, LEVEL_COUNT } from './levels.js';
import { initAds, showRewarded } from './ads.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CONTINUE_MOVES = window.LAYJOU_CONFIG.continueMoves;

// ---------- i18n ----------
const STRINGS = {
  fr: {
    play: 'Jouer', levels: 'Niveaux', soundOn: '🔊 Son activé', soundOff: '🔇 Son coupé',
    level: 'Niveau', moves: 'Coups', goal: 'Objectif', score: 'Score',
    goalScore: (n) => `Atteins ${n} points !`,
    goalIce: (n) => `Brise les ${n} cases de glace !`,
    goalBattery: (n) => `Fais descendre ${n} batteries tout en bas pour me recharger !`,
    start: "C'est parti !", win: 'Bravo !', next: 'Niveau suivant', replay: 'Rejouer', menu: 'Niveaux',
    allDone: 'Tu as terminé tous les niveaux !',
    out: 'Plus de coups !', outText: "Tu y es presque… Regarde une pub pour continuer la partie.",
    watchAd: (n) => `Continuer : +${n} coups`, giveUp: 'Abandonner',
    adSkipped: 'Regarde la pub jusqu’au bout pour gagner les coups.',
    adUnavailable: 'Aucune pub disponible pour le moment. Réessaie dans un instant.',
    adLoading: 'Chargement de la pub…',
    extra: (n) => `+${n} coups ! On continue !`,
    pause: 'Pause', resume: 'Reprendre', restart: 'Recommencer',
    shuffle: 'Plus de combinaisons… je mélange !',
    cheers: ['Bien joué !', 'Super !', 'Génial !', 'Incroyable !', 'LayJou adore !'],
    lowMoves: 'Attention, plus que quelques coups !',
    fakeAd: 'Publicité (simulation — les vraies pubs AdMob s’affichent dans l’application)',
    bonus: (n) => `Bonus coups restants : +${n}`,
  },
  en: {
    play: 'Play', levels: 'Levels', soundOn: '🔊 Sound on', soundOff: '🔇 Sound off',
    level: 'Level', moves: 'Moves', goal: 'Goal', score: 'Score',
    goalScore: (n) => `Reach ${n} points!`,
    goalIce: (n) => `Break all ${n} frozen tiles!`,
    goalBattery: (n) => `Bring ${n} batteries to the bottom to recharge me!`,
    start: "Let's go!", win: 'Well done!', next: 'Next level', replay: 'Play again', menu: 'Levels',
    allDone: 'You finished every level!',
    out: 'Out of moves!', outText: 'So close… Watch an ad to keep playing.',
    watchAd: (n) => `Continue: +${n} moves`, giveUp: 'Give up',
    adSkipped: 'Watch the whole ad to earn the moves.',
    adUnavailable: 'No ad available right now. Try again in a moment.',
    adLoading: 'Loading ad…',
    extra: (n) => `+${n} moves! Keep going!`,
    pause: 'Paused', resume: 'Resume', restart: 'Restart',
    shuffle: 'No more matches… shuffling!',
    cheers: ['Nice!', 'Great!', 'Awesome!', 'Incredible!', 'LayJou loves it!'],
    lowMoves: 'Careful, only a few moves left!',
    fakeAd: 'Advertisement (simulated — real AdMob ads show in the app)',
    bonus: (n) => `Remaining moves bonus: +${n}`,
  },
};
const T = STRINGS[(navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'];
const fmt = (n) => n.toLocaleString(T === STRINGS.fr ? 'fr-FR' : 'en-US');

// ---------- persistence ----------
const SAVE_KEY = 'layjou-bubble-v1';
let progress = { stars: {}, sound: true };
try { progress = { ...progress, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch (e) { /* first run */ }
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) { /* private mode */ } };
const unlocked = () => {
  let n = 1;
  while (n < LEVEL_COUNT && progress.stars[n]) n++;
  return n;
};

// ---------- sound (synthesised, no asset files) ----------
let audio = null;
function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0) {
  if (!progress.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) { /* audio unavailable */ }
}
const sfx = {
  swap: () => tone(420, 0.08, 'triangle'),
  bad: () => tone(160, 0.18, 'sawtooth', 0.07),
  pop: (combo) => tone(380 + Math.min(combo, 8) * 90, 0.14, 'sine', 0.14),
  blast: () => tone(120, 0.3, 'square', 0.08),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.13)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.16)),
};

// ---------- screens ----------
function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === name));
  if (name === 'map') renderMap();
  if (name !== 'game') clearTimeout(hintTimer);
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => show(b.dataset.go)));

function renderMap() {
  const cur = unlocked();
  let total = 0;
  $('levels').innerHTML = '';
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const st = progress.stars[n] || 0;
    total += st;
    const b = document.createElement('button');
    b.className = 'lvl' + (n > cur ? ' locked' : n === cur && !st ? ' current' : '');
    b.innerHTML = `<i>${n > cur ? '🔒' : n}</i><small>${n > cur ? '' : '<b>' + '★'.repeat(st) + '</b>' + '★'.repeat(3 - st)}</small>`;
    b.addEventListener('click', () => startLevel(n));
    $('levels').appendChild(b);
  }
  $('totalStars').textContent = total;
}

// ---------- modal ----------
function modal(html) {
  $('modal').innerHTML = html;
  $('overlay').classList.add('show');
  return $('modal');
}
const closeModal = () => $('overlay').classList.remove('show');

// ---------- game state ----------
const boardEl = $('board');
let board = null;
let level = null;
let S = 44;
let els = new Map(); // piece id -> element
let tiles = [];
let busy = false;
let over = true;
let selected = null;
let drag = null;
let hintTimer = 0;
let speechTimer = 0;

function goalText() {
  const g = level.goal;
  if (g.type === 'score') return T.goalScore(fmt(g.target));
  if (g.type === 'ice') return T.goalIce(level.iceTotal);
  return T.goalBattery(g.count);
}

function say(text, cheer = false, hold = 2200) {
  const sp = $('speech');
  sp.textContent = text;
  sp.classList.remove('pop');
  void sp.offsetWidth;
  sp.classList.add('pop');
  if (cheer) {
    $('coach').classList.remove('cheer');
    void $('coach').offsetWidth;
    $('coach').classList.add('cheer');
  }
  clearTimeout(speechTimer);
  if (hold) speechTimer = setTimeout(() => { sp.textContent = goalText(); }, hold);
}

function startLevel(n) {
  level = getLevel(n);
  board = new Board(level);
  over = false;
  busy = true;
  selected = null;
  show('game');
  build();
  updateHUD(board.snapshot());
  say(goalText(), false, 0);
  const m = modal(`
    <img class="mascot" src="img/layjou.png" alt="">
    <h3>${T.level} ${n}</h3>
    <p>${goalText()}</p>
    <p>${T.moves} : ${level.moves}</p>
    <button class="btn primary" id="mStart">${T.start}</button>`);
  m.querySelector('#mStart').addEventListener('click', () => {
    closeModal();
    busy = false;
    scheduleHint();
  });
}

// ---------- rendering ----------
function layout() {
  const wrap = $('boardWrap');
  S = Math.max(24, Math.min(72, Math.floor(Math.min(wrap.clientWidth / board.cols, wrap.clientHeight / board.rows))));
  boardEl.style.setProperty('--s', S + 'px');
  boardEl.style.width = board.cols * S + 'px';
  boardEl.style.height = board.rows * S + 'px';
}
const place = (el, r, c, dur = 170) => {
  el.style.transitionDuration = dur + 'ms';
  el.style.transform = `translate(${c * S}px, ${r * S}px)`;
};
function bubClass(p) {
  if (p.battery) return 'bub battery';
  if (p.special === 'rainbow') return 'bub rainbow';
  return `bub c${p.color}` + (p.special ? ` sp-${p.special}` : '');
}
function addPiece(p, r, c) {
  const el = document.createElement('div');
  el.className = 'piece';
  el.innerHTML = `<div class="${bubClass(p)}"></div>`;
  place(el, r, c, 0);
  boardEl.appendChild(el);
  els.set(p.id, el);
  return el;
}
function build() {
  boardEl.innerHTML = '';
  els = new Map();
  tiles = [];
  layout();
  for (let r = 0; r < board.rows; r++) {
    tiles.push([]);
    for (let c = 0; c < board.cols; c++) {
      const cell = board.cells[r][c];
      if (cell.hole) { tiles[r].push(null); continue; }
      const t = document.createElement('div');
      t.className = 'tile' + ((r + c) % 2 ? ' alt' : '') + (cell.ice ? ' ice' + cell.ice : '');
      t.style.left = c * S + 'px';
      t.style.top = r * S + 'px';
      boardEl.appendChild(t);
      tiles[r].push(t);
    }
  }
  board.eachCell((r, c, cell) => addPiece(cell.piece, r, c));
}
function relayout() {
  if (!board || !$('game').classList.contains('active')) return;
  layout();
  board.eachCell((r, c, cell) => {
    tiles[r][c].style.left = c * S + 'px';
    tiles[r][c].style.top = r * S + 'px';
    if (cell.piece && els.has(cell.piece.id)) place(els.get(cell.piece.id), r, c, 0);
  });
}
window.addEventListener('resize', () => { if (!busy) relayout(); });

function updateHUD(st) {
  $('moves').textContent = st.moves;
  document.querySelector('.hud-box.moves').classList.toggle('low', st.moves <= 3 && !over);
  $('score').textContent = fmt(st.score);
  const g = level.goal;
  $('goal').textContent =
    g.type === 'score' ? `★ ${fmt(g.target)}` : g.type === 'ice' ? `❄ ${st.ice}` : `⚡ ${st.batteries}/${g.count}`;
  const max = level.stars[2];
  $('starBar').style.width = Math.min(100, (st.score / max) * 100) + '%';
  level.stars.forEach((s, i) => {
    $('ps' + i).style.left = (s / max) * 100 + '%';
    $('ps' + i).classList.toggle('on', st.score >= s);
  });
}

function fx(className, style) {
  const el = document.createElement('div');
  el.className = 'fx ' + className;
  Object.assign(el.style, style);
  boardEl.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

// ---------- step player ----------
async function playSteps(steps) {
  for (const s of steps) {
    if (s.type === 'swap') {
      const [ia, ib] = s.ids;
      place(els.get(ia), s.back ? s.a.r : s.b.r, s.back ? s.a.c : s.b.c);
      place(els.get(ib), s.back ? s.b.r : s.a.r, s.back ? s.b.c : s.a.c);
      s.back ? sfx.bad() : sfx.swap();
      await sleep(180);
    } else if (s.type === 'clear') {
      if (s.transforms.length) {
        for (const t of s.transforms) {
          const b = els.get(t.id).firstChild;
          b.className = b.className.replace(/ sp-\w+/, '') + ' sp-' + t.special;
        }
        await sleep(280);
      }
      for (const f of s.fx) {
        if (f.kind === 'row') fx('fx-row', { top: f.r * S + 'px' });
        else if (f.kind === 'col') fx('fx-col', { left: f.c * S + 'px' });
        else if (f.kind === 'bomb') {
          const d = (f.rad * 2 + 1.6) * S;
          fx('fx-bomb', { width: d + 'px', height: d + 'px', left: (f.c + 0.5) * S - d / 2 + 'px', top: (f.r + 0.5) * S - d / 2 + 'px' });
        } else fx('fx-flash', {});
      }
      s.fx.length ? sfx.blast() : sfx.pop(s.combo);
      let cx = 0, cy = 0;
      for (const p of s.removed) {
        els.get(p.id).classList.add('pop');
        cx += p.c; cy += p.r;
      }
      for (const i of s.ice) tiles[i.r][i.c].className = tiles[i.r][i.c].className.replace(/ ice\d/, '') + (i.level ? ' ice' + i.level : '');
      if (s.removed.length) {
        const f = document.createElement('div');
        f.className = 'float-score';
        f.textContent = '+' + fmt(s.gained);
        f.style.left = (cx / s.removed.length + 0.5) * S + 'px';
        f.style.top = (cy / s.removed.length + 0.5) * S + 'px';
        boardEl.appendChild(f);
        setTimeout(() => f.remove(), 800);
      }
      updateHUD(s.state);
      if (s.combo >= 2 || s.removed.length >= 8) say(T.cheers[Math.min(T.cheers.length - 1, Math.max(0, s.combo - 2 + (s.removed.length >= 12 ? 2 : 0)))], true);
      await sleep(220);
      for (const p of s.removed) { els.get(p.id).remove(); els.delete(p.id); }
      for (const sp of s.spawns) addPiece(sp.piece, sp.r, sp.c).classList.add('appear');
    } else if (s.type === 'fall') {
      let longest = 0;
      const drop = (el, c, from, to) => {
        const dur = 110 + 75 * Math.sqrt(to - from) * 1.6;
        longest = Math.max(longest, dur);
        place(el, to, c, dur);
      };
      const fresh = s.spawned.map((n) => ({ n, el: addPiece(n.piece, n.from, n.c) }));
      void boardEl.offsetWidth; // commit start positions before animating
      for (const m of s.moves) drop(els.get(m.id), m.c, m.from, m.to);
      for (const { n, el } of fresh) drop(el, n.c, n.from, n.to);
      await sleep(longest + 30);
    } else if (s.type === 'collect') {
      for (const it of s.items) els.get(it.id).classList.add('collect');
      tone(880, 0.25, 'triangle', 0.14);
      tone(1320, 0.3, 'triangle', 0.12, 0.12);
      say('⚡ ' + s.state.batteries + '/' + level.goal.count, true);
      updateHUD(s.state);
      await sleep(360);
      for (const it of s.items) { els.get(it.id).remove(); els.delete(it.id); }
    } else if (s.type === 'shuffle') {
      say(T.shuffle, false, 2600);
      await sleep(500);
      for (const p of s.positions) {
        const el = els.get(p.id);
        const b = el.firstChild;
        if (!/sp-|rainbow/.test(b.className)) b.className = `bub c${p.color}`;
        place(el, p.r, p.c, 450);
      }
      await sleep(500);
    }
  }
}

// ---------- input ----------
function cellAt(e) {
  const rect = boardEl.getBoundingClientRect();
  const c = Math.floor((e.clientX - rect.left) / S);
  const r = Math.floor((e.clientY - rect.top) / S);
  return board && board.pieceAt(r, c) ? { r, c } : null;
}
function select(cell) {
  if (selected) {
    const p = board.pieceAt(selected.r, selected.c);
    if (p && els.has(p.id)) els.get(p.id).classList.remove('selected');
  }
  selected = cell;
  if (cell) els.get(board.pieceAt(cell.r, cell.c).id).classList.add('selected');
}
const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

boardEl.addEventListener('pointerdown', (e) => {
  if (busy || over) return;
  const cell = cellAt(e);
  if (!cell) return;
  drag = { cell, x: e.clientX, y: e.clientY };
  try { boardEl.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
});
boardEl.addEventListener('pointermove', (e) => {
  if (!drag || busy) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < S * 0.35) return;
  const from = drag.cell;
  const to = Math.abs(dx) > Math.abs(dy) ? { r: from.r, c: from.c + Math.sign(dx) } : { r: from.r + Math.sign(dy), c: from.c };
  drag = null;
  select(null);
  attempt(from, to);
});
const endDrag = () => {
  if (!drag || busy) { drag = null; return; }
  const cell = drag.cell;
  drag = null;
  if (selected && adjacent(selected, cell)) {
    const from = selected;
    select(null);
    attempt(from, cell);
  } else if (selected && selected.r === cell.r && selected.c === cell.c) select(null);
  else select(cell);
};
boardEl.addEventListener('pointerup', endDrag);
boardEl.addEventListener('pointercancel', () => { drag = null; });

async function attempt(a, b) {
  if (busy || over || !board.pieceAt(a.r, a.c) || !board.pieceAt(b.r, b.c)) return;
  busy = true;
  clearHint();
  const res = board.swap(a, b);
  await playSteps(res.steps);
  updateHUD(board.snapshot());
  if (res.valid && board.status() === 'playing' && board.moves === 3) say(T.lowMoves, false);
  await checkEnd();
}

// ---------- hints ----------
function clearHint() {
  clearTimeout(hintTimer);
  boardEl.querySelectorAll('.hint').forEach((el) => el.classList.remove('hint'));
}
function scheduleHint() {
  clearHint();
  hintTimer = setTimeout(() => {
    if (busy || over) return;
    const m = board.findMove();
    if (!m) return;
    for (const p of [m.a, m.b]) els.get(board.pieceAt(p.r, p.c).id).classList.add('hint');
  }, 6000);
}

// ---------- end of level ----------
async function checkEnd() {
  const status = board.status();
  if (status === 'playing') {
    busy = false;
    scheduleHint();
    return;
  }
  await sleep(350);
  if (status === 'won') return win();
  lose();
}

function win() {
  over = true;
  const movesLeft = board.moves;
  const res = board.finish();
  updateHUD(board.snapshot());
  const n = level.n;
  progress.stars[n] = Math.max(progress.stars[n] || 0, res.stars);
  save();
  sfx.win();
  const last = n >= LEVEL_COUNT;
  const m = modal(`
    <img class="mascot" src="img/layjou.png" alt="">
    <h3>${T.win}</h3>
    <div class="stars">${'<b>★</b>'.repeat(res.stars)}${'★'.repeat(3 - res.stars)}</div>
    <div class="final-score">${fmt(res.score)}</div>
    <p>${movesLeft ? T.bonus(fmt(res.bonus)) : last ? T.allDone : ''}</p>
    ${last ? '' : `<button class="btn primary" id="mNext">${T.next}</button>`}
    <button class="btn" id="mReplay">${T.replay}</button>
    <button class="btn" id="mMenu">${T.menu}</button>`);
  if (!last) m.querySelector('#mNext').addEventListener('click', () => startLevel(n + 1));
  m.querySelector('#mReplay').addEventListener('click', () => startLevel(n));
  m.querySelector('#mMenu').addEventListener('click', () => { closeModal(); show('map'); });
}

function lose() {
  sfx.lose();
  const m = modal(`
    <img class="mascot" src="img/layjou.png" alt="">
    <h3>${T.out}</h3>
    <p>${T.outText}</p>
    <button class="btn primary" id="mAd"><span class="ad-tag">▶ AD</span>${T.watchAd(CONTINUE_MOVES)}</button>
    <div class="note" id="mNote"></div>
    <button class="btn" id="mRetry">${T.restart}</button>
    <button class="btn" id="mQuit">${T.giveUp}</button>`);
  const adBtn = m.querySelector('#mAd');
  const note = m.querySelector('#mNote');
  adBtn.addEventListener('click', async () => {
    adBtn.disabled = true;
    note.textContent = T.adLoading;
    const result = await showRewarded(T);
    if (result === 'rewarded') {
      closeModal();
      const steps = board.addMoves(CONTINUE_MOVES);
      updateHUD(board.snapshot());
      say(T.extra(CONTINUE_MOVES), true, 2600);
      await playSteps(steps);
      busy = false;
      scheduleHint();
    } else {
      adBtn.disabled = false;
      note.textContent = result === 'skipped' ? T.adSkipped : T.adUnavailable;
    }
  });
  m.querySelector('#mRetry').addEventListener('click', () => startLevel(level.n));
  m.querySelector('#mQuit').addEventListener('click', () => { over = true; closeModal(); show('map'); });
}

// ---------- pause ----------
$('btnPause').addEventListener('click', () => {
  if (busy || over) return;
  busy = true;
  clearHint();
  const m = modal(`
    <h3>${T.pause}</h3>
    <p>${T.level} ${level.n} — ${goalText()}</p>
    <button class="btn primary" id="mResume">${T.resume}</button>
    <button class="btn" id="mRestart">${T.restart}</button>
    <button class="btn" id="mMenu">${T.menu}</button>
    <button class="btn" id="mSound">${progress.sound ? T.soundOn : T.soundOff}</button>`);
  m.querySelector('#mResume').addEventListener('click', () => { closeModal(); busy = false; scheduleHint(); });
  m.querySelector('#mRestart').addEventListener('click', () => startLevel(level.n));
  m.querySelector('#mMenu').addEventListener('click', () => { over = true; closeModal(); show('map'); });
  m.querySelector('#mSound').addEventListener('click', (e) => { toggleSound(); e.target.textContent = progress.sound ? T.soundOn : T.soundOff; });
});

// ---------- home ----------
function toggleSound() {
  progress.sound = !progress.sound;
  save();
  $('btnSound').textContent = progress.sound ? T.soundOn : T.soundOff;
  if (progress.sound) sfx.swap();
}
$('btnPlay').textContent = T.play;
$('btnLevels').textContent = T.levels;
$('btnSound').textContent = progress.sound ? T.soundOn : T.soundOff;
$('mapTitle').textContent = T.levels;
$('lblMoves').textContent = T.moves;
$('lblGoal').textContent = T.goal;
$('lblScore').textContent = T.score;
$('btnPlay').addEventListener('click', () => startLevel(unlocked()));
$('btnLevels').addEventListener('click', () => show('map'));
$('btnSound').addEventListener('click', toggleSound);
document.documentElement.lang = T === STRINGS.fr ? 'fr' : 'en';

initAds();

// Debug/test hook (used by tests/ui.test.mjs).
window.__layjou = { get board() { return board; }, get busy() { return busy; }, startLevel };
