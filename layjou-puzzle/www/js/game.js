/* Layjou Puzzle — logique du jeu (tri par 3 sur étagères) */
(function () {
  'use strict';
  const CFG = window.LAYJOU_CONFIG.game;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (n) => Math.floor(Math.random() * n);
  const shuffleArr = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const GOODS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍋', '🍉', '🍍', '🥝', '🍒', '🥕', '🌽', '🍅', '🥑', '🍞', '🧀',
    '🥚', '🍩', '🍪', '🍫', '🍬', '🍭', '🍯', '🥛', '🍼', '🍔', '🍕', '🌭', '🍟', '🍿', '🍦', '🎂',
    '☕', '🎁', '⚽', '🏀', '🎈', '🌸', '🐥', '🚗', '🔑', '💡', '🌵', '🎸', '👟', '🎩', '📚', '⏰'];

  /* ---------- sauvegarde ---------- */
  const SAVE_KEY = 'layjou-puzzle-save-v1';
  const save = Object.assign({ level: 1, coins: 0, sound: true, vibe: true, boosters: { magnet: 2, shuffle: 2, freeze: 2 } }, load());
  function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* stockage indisponible */ } }

  /* ---------- son & vibration ---------- */
  let actx = null;
  function beep(freq, dur, type, delay) {
    if (!save.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime + (delay || 0);
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* pas d'audio */ }
  }
  const sfx = {
    pick: () => beep(520, 0.07, 'triangle'),
    drop: () => beep(340, 0.09, 'triangle'),
    bad: () => beep(160, 0.15, 'sawtooth'),
    match: (n) => { const b = 520 + Math.min(n, 8) * 60; beep(b, 0.12, 'sine'); beep(b * 1.25, 0.12, 'sine', 0.08); beep(b * 1.5, 0.2, 'sine', 0.16); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.25, 'triangle', i * 0.12)),
    lose: () => [392, 330, 262].forEach((f, i) => beep(f, 0.3, 'sine', i * 0.18)),
    tick: () => beep(880, 0.04, 'square'),
  };
  // Retours haptiques (js/haptique.js) : réglage « Vibrations » du joueur
  const HX = window.Haptique;
  HX.setEnabled(() => save.vibe !== false);
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) HX.tap(); }, true);

  /* ---------- état ---------- */
  let S = null;           // partie en cours
  let busy = false;       // animation en cours
  let timerId = null;
  let sel = null;         // objet sélectionné {c, p}
  let drag = null;

  /* ---------- génération d'un niveau ---------- */
  function levelParams(level) {
    const cols = level <= 2 ? 2 : 3;
    const rows = level <= 1 ? 2 : level <= 4 ? 3 : level <= 11 ? 4 : 5;
    const depth = level <= 2 ? 1 : level <= 5 ? 2 : level <= 14 ? 3 : 4;
    return { cols, rows, depth };
  }

  function generate(level) {
    const { cols, rows, depth } = levelParams(level);
    const C = cols * rows;
    const frontEmpty = Math.max(3, Math.round(C * 0.55));
    const frontCount = C * 3 - frontEmpty;
    const backCap = C * 3 * (depth - 1);
    const triples = Math.floor((frontCount + backCap * 0.85) / 3);
    const total = triples * 3;
    const kinds = Math.min(triples, 3 + level, GOODS.length);
    const palette = shuffleArr(GOODS.slice()).slice(0, kinds);

    for (let attempt = 0; attempt < 60; attempt++) {
      const items = [];
      for (let i = 0; i < triples; i++) for (let k = 0; k < 3; k++) items.push(palette[i % kinds]);
      shuffleArr(items);

      const comps = Array.from({ length: C }, () => ({ layers: Array.from({ length: depth }, () => [null, null, null]) }));
      const front = [], back = [];
      for (let c = 0; c < C; c++) for (let p = 0; p < 3; p++) {
        front.push([c, 0, p]);
        for (let l = 1; l < depth; l++) back.push([c, l, p]);
      }
      shuffleArr(front); shuffleArr(back);
      const nFront = Math.min(frontCount, total);
      const slots = front.slice(0, nFront).concat(back.slice(0, total - nFront));
      slots.forEach(([c, l, p], i) => { comps[c].layers[l][p] = items[i]; });
      // retire les couches arrière totalement vides
      comps.forEach((cp) => { cp.layers = cp.layers.filter((ly, i) => i === 0 || ly.some(Boolean)); });
      const hasTriple = comps.some((cp) => isTriple(cp.layers[0]));
      if (!hasTriple) return { comps, total, cols, rows };
    }
    return generate(level); // extrêmement improbable
  }

  const isTriple = (ly) => ly[0] && ly[0] === ly[1] && ly[1] === ly[2];
  const isEmpty = (ly) => !ly[0] && !ly[1] && !ly[2];
  const remaining = () => S.comps.reduce((n, cp) => n + cp.layers.reduce((m, ly) => m + ly.filter(Boolean).length, 0), 0);

  /* ---------- rendu ---------- */
  const board = $('#board');

  function layout() {
    if (!S) return;
    const wrap = $('#board-wrap').getBoundingClientRect();
    const bw = (wrap.width - (S.cols - 1) * 8 - S.cols * 16) / (S.cols * 3);
    const bh = (wrap.height - (S.rows - 1) * 10 - S.rows * 18) / (S.rows * 1.55);
    const slot = Math.max(22, Math.min(bw, bh, 62));
    document.documentElement.style.setProperty('--slot', slot + 'px');
    board.style.gridTemplateColumns = `repeat(${S.cols}, auto)`;
  }

  function renderComp(c, anim) {
    const cp = S.comps[c];
    const el = board.children[c];
    const frontHtml = cp.layers[0].map((it, p) =>
      `<div class="slot" data-c="${c}" data-p="${p}">${it ? `<span class="item ${anim || ''}" data-c="${c}" data-p="${p}">${it}</span>` : ''}</div>`).join('');
    const backLy = cp.layers[1];
    const backHtml = backLy ? backLy.map((it) => `<div class="slot">${it ? `<span class="item">${it}</span>` : ''}</div>`).join('') : '';
    const more = cp.layers.length - 2;
    el.innerHTML = `<div class="row back">${backHtml}</div><div class="row front">${frontHtml}</div>${more > 0 ? `<div class="depth">+${more}</div>` : ''}`;
  }

  function renderAll() {
    board.innerHTML = S.comps.map((_, c) => `<div class="comp" data-c="${c}"></div>`).join('');
    S.comps.forEach((_, c) => renderComp(c));
    layout();
    updateHud();
  }

  function updateHud() {
    $$('[data-bind="coins"]').forEach((e) => { e.textContent = save.coins; });
    $$('[data-bind="level"]').forEach((e) => { e.textContent = save.level; });
    $$('.booster').forEach((b) => {
      const n = save.boosters[b.dataset.booster];
      const c = $('.count', b);
      c.textContent = n > 0 ? n : '+';
      c.classList.toggle('empty', n <= 0);
    });
    if (S) {
      $('#progress-fill').style.width = (100 * (1 - remaining() / S.total)) + '%';
      const frozen = S.frozen > 0;
      const tm = $('.timer');
      $('#timer-fill').style.width = Math.max(0, 100 * S.time / S.maxTime) + '%';
      const sec = Math.max(0, Math.ceil(S.time));
      $('#timer-text').textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
      tm.classList.toggle('low', !frozen && S.time <= 15);
      tm.classList.toggle('frozen', frozen);
    }
  }

  let bubbleTimer = null;
  function say(text, ms) {
    const b = $('#game-bubble');
    b.textContent = text;
    const m = $('#mini-mascot');
    m.classList.remove('cheer'); void m.offsetWidth; m.classList.add('cheer');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { b.textContent = ''; }, ms || 1800);
  }

  function flyText(text, x, y) {
    const f = document.createElement('div');
    f.className = 'fly'; f.textContent = text;
    f.style.left = x + 'px'; f.style.top = y + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 800);
  }

  function confetti() {
    const box = $('#confetti');
    const colors = ['#19b8c9', '#ff5c9a', '#ffc531', '#0b3a8f', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('i');
      c.style.left = rand(100) + '%';
      c.style.background = colors[rand(colors.length)];
      c.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
      c.style.animationDelay = (Math.random() * 0.5) + 's';
      box.appendChild(c);
    }
    setTimeout(() => { box.innerHTML = ''; }, 3600);
  }

  /* ---------- déroulement ---------- */
  function show(id) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  }

  function startLevel() {
    const g = generate(save.level);
    const triples = g.total / 3;
    const perTriple = Math.max(4.5, 7.5 - save.level * 0.12);
    const maxTime = Math.round(35 + triples * perTriple);
    S = { comps: g.comps, cols: g.cols, rows: g.rows, total: g.total, time: maxTime, maxTime, frozen: 0, combo: 0, lastClear: 0, continues: 0, over: false, paused: false };
    sel = null; busy = false;
    show('game');
    renderAll();
    say(t('start'));
    startTimer();
  }

  function startTimer() {
    stopTimer();
    let last = performance.now();
    timerId = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(1, (now - last) / 1000); last = now;
      if (!S || S.over || S.paused) return;
      if (S.frozen > 0) { S.frozen -= dt; }
      else {
        const before = Math.ceil(S.time);
        S.time -= dt;
        const after = Math.ceil(S.time);
        if (after !== before && after <= 10 && after > 0) { sfx.tick(); if (after <= 3) HX.medium(); else HX.select(); }
        if (before > 15 && after <= 15) { say(t('hurry'), 2500); HX.pattern([['warning', 0], ['light', 200]]); }
      }
      updateHud();
      if (S.time <= 0 && !busy) lose();
    }, 200);
  }
  function stopTimer() { clearInterval(timerId); timerId = null; }

  /** Applique effacements et révélations jusqu'à stabilité. */
  async function resolve() {
    busy = true;
    let loop = true;
    while (loop) {
      loop = false;
      // 1) triplets
      const cleared = [];
      S.comps.forEach((cp, c) => { if (isTriple(cp.layers[0])) cleared.push(c); });
      if (cleared.length) {
        loop = true;
        for (const c of cleared) {
          const now = performance.now();
          S.combo = now - S.lastClear < 5000 ? S.combo + 1 : 1;
          S.lastClear = now;
          $$('.row.front .item', board.children[c]).forEach((e) => e.classList.add('pop'));
          const r = board.children[c].getBoundingClientRect();
          const gain = Math.min(S.combo, 5);
          save.coins += gain;
          flyText('+' + gain + ' 🪙', r.left + r.width / 2 - 20, r.top);
          sfx.match(S.combo); HX.combo(S.combo);
          say(S.combo >= 2 ? t('combo', { n: S.combo }) : t('good'));
        }
        await sleep(300);
        cleared.forEach((c) => { S.comps[c].layers[0] = [null, null, null]; renderComp(c); });
      }
      // 2) révélation des couches arrière
      const shifted = [];
      S.comps.forEach((cp, c) => { if (isEmpty(cp.layers[0]) && cp.layers.length > 1) { cp.layers.shift(); shifted.push(c); } });
      if (shifted.length) {
        loop = true;
        shifted.forEach((c) => renderComp(c, 'reveal'));
        HX.select();
        await sleep(280);
      }
    }
    persist(); updateHud();
    busy = false;
    if (remaining() === 0) return win();
    if (S.time <= 0) return lose();
    // blocage : plus aucune case libre à l'avant
    const free = S.comps.some((cp) => cp.layers[0].some((x) => !x));
    if (!free) { say(t('noMoves'), 2200); HX.warning(); await sleep(500); await doShuffle(); }
  }

  async function move(from, to) {
    if (busy || S.over) return;
    const it = S.comps[from.c].layers[0][from.p];
    if (!it || S.comps[to.c].layers[0][to.p]) return;
    S.comps[from.c].layers[0][from.p] = null;
    S.comps[to.c].layers[0][to.p] = it;
    sel = null;
    renderComp(from.c);
    renderComp(to.c);
    const el = $(`.row.front .item[data-p="${to.p}"]`, board.children[to.c]);
    if (el) el.classList.add('drop');
    sfx.drop(); HX.medium();
    await resolve();
  }

  function win() {
    S.over = true; stopTimer();
    const ratio = S.time / S.maxTime;
    const stars = S.continues > 0 ? 1 : ratio > 0.4 ? 3 : ratio > 0.18 ? 2 : 1;
    const bonus = 10 + stars * 5;
    save.coins += bonus; save.level += 1; persist();
    sfx.win(); confetti(); HX.celebrate();
    for (let i = 0; i < stars; i++) setTimeout(() => HX.force(i === 2 ? 1 : 0.5), 700 + i * 220);
    dialog({
      title: t('winTitle'), stars, text: t('winText', { c: bonus }),
      actions: [
        { label: t('next'), cls: 'primary', fn: () => { closeDialog(); startLevel(); } },
        { label: t('home'), cls: 'ghost', fn: () => { closeDialog(); goHome(); } },
      ],
    });
  }

  function lose() {
    if (S.over) return;
    S.over = true; stopTimer(); sfx.lose(); HX.stopAll(); HX.fail();
    Ads.preload();
    const canContinue = S.continues < CFG.maxContinues;
    const actions = [];
    if (canContinue) {
      actions.push({
        label: t('watch', { s: CFG.continueSeconds }), cls: 'primary',
        fn: async (btn) => {
          btn.disabled = true; btn.textContent = t('adLoading');
          const ok = await Ads.showRewarded();
          if (ok) {
            closeDialog();
            S.continues++; S.over = false;
            S.time = CFG.continueSeconds; S.maxTime = Math.max(S.maxTime, CFG.continueSeconds);
            updateHud(); startTimer(); say(t('start')); HX.surge();
          } else {
            btn.disabled = false; btn.textContent = t('watch', { s: CFG.continueSeconds });
            $('#dlg-text').textContent = t('adFail');
          }
        },
      });
    }
    actions.push({ label: t('retry'), cls: canContinue ? '' : 'primary', fn: () => { closeDialog(); startLevel(); } });
    actions.push({ label: t('home'), cls: 'ghost', fn: () => { closeDialog(); goHome(); } });
    dialog({
      title: t('loseTitle'), sad: true,
      text: canContinue ? t('loseText', { s: CFG.continueSeconds }) : t('loseTextNoMore'),
      actions,
    });
  }

  function goHome() {
    stopTimer(); S = null;
    $('#btn-play').textContent = '▶ ' + t('play', { n: save.level });
    $('#home-bubble').textContent = t('hello');
    updateHud();
    show('home');
  }

  /* ---------- bonus ---------- */
  async function doShuffle() {
    busy = true;
    const pos = [], items = [];
    S.comps.forEach((cp, c) => cp.layers.forEach((ly, l) => ly.forEach((it, p) => { if (it) { pos.push([c, l, p]); items.push(it); } })));
    const frontFull = !S.comps.some((cp) => cp.layers[0].some((x) => !x));
    for (let n = 0; n < 200; n++) {
      shuffleArr(items);
      pos.forEach(([c, l, p], i) => { S.comps[c].layers[l][p] = items[i]; });
      // si tout est plein à l'avant, il faut au moins un triplet pour débloquer
      if (!frontFull || S.comps.some((cp) => isTriple(cp.layers[0]))) break;
    }
    S.comps.forEach((_, c) => renderComp(c, 'drop'));
    say(t('shuffled'));
    sfx.pick();
    HX.pattern([['medium', 0], ['select', 90], ['select', 160], ['select', 230]]);
    await sleep(250);
    if (frontFull && !S.comps.some((cp) => isTriple(cp.layers[0]))) removeTriple();
    await resolve();
  }

  /** Retire 3 objets identiques (les plus visibles d'abord). */
  function removeTriple() {
    const count = {};
    S.comps.forEach((cp) => cp.layers[0].forEach((it) => { if (it) count[it] = (count[it] || 0) + 1; }));
    let best = null;
    Object.keys(count).forEach((k) => { if (!best || count[k] > count[best]) best = k; });
    if (!best) { // rien à l'avant : prend n'importe quel objet
      S.comps.some((cp) => cp.layers.some((ly) => ly.some((it) => { best = it; return !!it; })));
    }
    if (!best) return;
    let left = 3;
    const maxDepth = Math.max.apply(null, S.comps.map((cp) => cp.layers.length));
    for (let l = 0; l < maxDepth && left > 0; l++) {
      S.comps.forEach((cp) => {
        const ly = cp.layers[l]; if (!ly) return;
        for (let p = 0; p < 3 && left > 0; p++) if (ly[p] === best) { ly[p] = null; left--; }
      });
    }
    // supprime les couches arrière devenues vides
    S.comps.forEach((cp, c) => { cp.layers = cp.layers.filter((ly, i) => i === 0 || !isEmpty(ly)); renderComp(c); });
  }

  const BOOSTERS = {
    magnet: async () => { sfx.match(3); HX.boom(); save.coins += 1; removeTriple(); await resolve(); },
    shuffle: async () => { await doShuffle(); },
    freeze: async () => { S.frozen = CFG.freezeSeconds; say(t('frozen'), 2500); sfx.pick(); HX.pattern([['heavy', 0], ['select', 120], ['select', 220]]); updateHud(); },
  };

  async function useBooster(name) {
    if (!S || busy || S.over) return;
    if (save.boosters[name] <= 0) return offerBooster(name);
    save.boosters[name]--; persist(); updateHud();
    sel = null;
    await BOOSTERS[name]();
  }

  function offerBooster(name) {
    S.paused = true;
    const resume = () => { closeDialog(); S.paused = false; updateHud(); };
    const actions = [{
      label: t('watchFree'), cls: 'primary',
      fn: async (btn) => {
        btn.disabled = true; btn.textContent = t('adLoading');
        const ok = await Ads.showRewarded();
        if (ok) { save.boosters[name]++; persist(); HX.success(); resume(); }
        else { btn.disabled = false; btn.textContent = t('watchFree'); $('#dlg-text').textContent = t('adFail'); }
      },
    }];
    if (save.coins >= CFG.boosterPrice) {
      actions.push({ label: t('buy', { p: CFG.boosterPrice }), fn: () => { save.coins -= CFG.boosterPrice; save.boosters[name]++; persist(); HX.celebrate(); resume(); } });
    }
    actions.push({ label: t('cancel'), cls: 'ghost', fn: resume });
    dialog({ title: t('boosterTitle'), text: t('boosterText', { b: t(name) }), actions });
  }

  /* ---------- dialogues ---------- */
  function dialog(o) {
    $('#dlg-title').textContent = o.title;
    $('#dlg-text').textContent = o.text || '';
    $('#dlg-mascot').classList.toggle('sad', !!o.sad);
    $('#dlg-stars').innerHTML = o.stars ? [1, 2, 3].map((i) => `<span class="${i <= o.stars ? '' : 'off'}">⭐</span>`).join('') : '';
    const box = $('#dlg-actions'); box.innerHTML = '';
    o.actions.forEach((a) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || ''); b.textContent = a.label;
      b.addEventListener('click', () => a.fn(b));
      box.appendChild(b);
    });
    $('#overlay').classList.remove('hidden');
  }
  function closeDialog() { $('#overlay').classList.add('hidden'); }

  function pause() {
    if (!S || S.over || S.paused) return;
    S.paused = true;
    dialog({
      title: t('pauseTitle'),
      actions: [
        { label: t('resume'), cls: 'primary', fn: () => { closeDialog(); S.paused = false; } },
        { label: t('retry'), fn: () => { closeDialog(); startLevel(); } },
        { label: t('home'), cls: 'ghost', fn: () => { closeDialog(); goHome(); } },
      ],
    });
  }

  /* ---------- interactions : glisser-déposer ou toucher-toucher ---------- */
  function slotAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const comp = el.closest('.comp');
    if (!comp) return null;
    const c = +comp.dataset.c;
    const ly = S.comps[c].layers[0];
    // case libre la plus proche du doigt dans ce compartiment
    let best = null, bd = 1e9;
    $$('.row.front .slot', comp).forEach((s, p) => {
      if (ly[p]) return;
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - x);
      if (d < bd) { bd = d; best = { c, p }; }
    });
    return best;
  }

  function setSel(v) {
    sel = v;
    $$('.item.selected', board).forEach((e) => e.classList.remove('selected'));
    if (v) {
      const e = $(`.row.front .item[data-p="${v.p}"]`, board.children[v.c]);
      if (e) e.classList.add('selected');
    }
  }

  board.addEventListener('pointerdown', (ev) => {
    if (!S || busy || S.over || S.paused || drag) return;
    const item = ev.target.closest('.row.front .item');
    if (item) {
      drag = { c: +item.dataset.c, p: +item.dataset.p, x: ev.clientX, y: ev.clientY, el: item, ghost: null, id: ev.pointerId };
      ev.preventDefault();
      return;
    }
    // toucher une case libre avec un objet sélectionné
    if (sel) {
      const to = slotAt(ev.clientX, ev.clientY);
      if (to) move(sel, to); else setSel(null);
    }
  });

  window.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    if (!drag.ghost) {
      if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 8) return;
      setSel(null);
      const g = document.createElement('div');
      g.className = 'drag-ghost'; g.textContent = drag.el.textContent;
      document.body.appendChild(g);
      drag.ghost = g; drag.el.classList.add('dragging');
      sfx.pick(); HX.select();
    }
    drag.ghost.style.left = ev.clientX + 'px';
    drag.ghost.style.top = ev.clientY + 'px';
    const to = slotAt(ev.clientX, ev.clientY - 20);
    $$('.comp.target', board).forEach((e) => e.classList.remove('target'));
    if (to && !(to.c === drag.c)) board.children[to.c].classList.add('target');
  });

  function endDrag(ev, cancelled) {
    if (!drag || (ev && ev.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    $$('.comp.target', board).forEach((e) => e.classList.remove('target'));
    if (d.ghost) {
      d.ghost.remove(); d.el.classList.remove('dragging');
      const to = cancelled ? null : slotAt(ev.clientX, ev.clientY - 20);
      if (to && !(to.c === d.c && to.p === d.p)) move({ c: d.c, p: d.p }, to);
      else if (!cancelled && !to) { sfx.bad(); HX.pattern([['light', 0], ['error', 110]]); }
      return;
    }
    if (cancelled) return;
    // simple toucher : sélectionne / désélectionne
    if (sel && sel.c === d.c && sel.p === d.p) setSel(null);
    else { setSel({ c: d.c, p: d.p }); sfx.pick(); HX.light(); }
  }
  window.addEventListener('pointerup', (ev) => endDrag(ev, false));
  window.addEventListener('pointercancel', (ev) => endDrag(ev, true));

  /* ---------- boutons ---------- */
  $('#btn-play').addEventListener('click', () => { beep(660, 0.1, 'triangle'); startLevel(); });
  $('#btn-pause').addEventListener('click', pause);
  $$('.booster').forEach((b) => b.addEventListener('click', () => useBooster(b.dataset.booster)));
  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.textContent = save.sound ? '🔊' : '🔇'; };
  soundBtn.addEventListener('click', () => { save.sound = !save.sound; persist(); paintSound(); });
  const vibeBtn = $('#btn-vibe');
  const paintVibe = () => { vibeBtn.textContent = save.vibe !== false ? '📳' : '📴'; vibeBtn.classList.toggle('off', save.vibe === false); };
  vibeBtn.addEventListener('click', () => { save.vibe = save.vibe === false; persist(); paintVibe(); if (save.vibe) HX.medium(); });

  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  // bouton retour Android
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (App && App.addListener) {
    App.addListener('backButton', () => {
      if (S && !S.over) { if (S.paused) return; pause(); }
      else if (!S && App.exitApp) App.exitApp();
    });
  }

  /* ---------- démarrage ---------- */
  $$('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  paintSound();
  paintVibe();
  goHome();
  Ads.init();
  const Splash = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen;
  if (Splash && Splash.hide) Splash.hide();

  // accès pour les tests automatisés
  window.__layjou = { get state() { return S; }, save, startLevel, generate, move, useBooster };
})();
