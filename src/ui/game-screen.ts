/** Écran de jeu : plateau, glisser-déposer, armes, fin de partie. */
import { ECONOMY, WEAPON_PRICES } from '../config';
import { SIZE, canPlace, fillRatio, previewLines, lineCells, idx } from '../game/board';
import { ENERGY_MAX, COMBO_GRACE, Game, MAX_CONTINUES, WEAPON_IDS, type BlastOutcome, type PlaceOutcome, type WeaponId } from '../game/game';
import { shapeById, type Piece, type Shape } from '../game/shapes';
import { fmt, say, t, td } from '../i18n';
import { ads } from '../services/ads';
import { haptic, sfx } from '../services/audio';
import { store, xpForLevel, type GameRewards } from '../state/store';
import { add, clamp, countTo, fill, h, replay, sleep } from './dom';
import { BLOCK_COLORS, burst, confetti, sparkle } from './fx';
import * as ic from './icons';
import { Mascot } from './mascot';
import { btn, buyWeapon, openModal, openShop, rewardChips, toast, watchAd } from './modals';

export interface GameScreen {
  el: HTMLElement;
  pause: () => void;
  destroy: () => void;
}

function pieceEl(shape: Shape, color: number): HTMLDivElement {
  const el = h('div', { class: 'piece', style: { gridTemplateColumns: `repeat(${shape.w}, var(--u))`, gridTemplateRows: `repeat(${shape.h}, var(--u))` } });
  for (const [r, c] of shape.cells) {
    el.appendChild(h('i', { class: `blk c${color}`, style: { gridRow: String(r + 1), gridColumn: String(c + 1) } }));
  }
  return el;
}

export function createGameScreen(resume: boolean, goHome: () => void, replayGame: () => void): GameScreen {
  const game = resume && store.p.saved ? Game.restore(store.p.saved, store.p.player) : Game.fresh(store.p.player);
  let busy = false;
  let ended = false;
  let aiming: WeaponId | null = null;
  let dangerSaid = 0;
  const offs: (() => void)[] = [];

  // ---------- structure ----------
  const mascot = new Mascot(store.p.equipped as never);
  const scoreEl = h('div', { class: 'score', dataset: { value: String(game.score) } }, fmt(game.score));
  const bestEl = h('span', { class: 'pill best', html: `${ic.crown}<b>${fmt(Math.max(store.p.best, game.score))}</b>` });
  const creditsEl = h('button', { class: 'pill', onclick: () => openShop('credits') });
  const comboEl = h('div', { class: 'combo' });
  const energyFill = h('i');
  const energyEl = h('div', { class: 'energy', html: ic.heart }, h('div', { class: 'energy-bar' }, energyFill));
  const cells: HTMLDivElement[] = [];
  const boardEl = h('div', { class: 'board' });
  for (let i = 0; i < SIZE * SIZE; i++) {
    const c = h('div', { class: 'cell' });
    cells.push(c);
    boardEl.appendChild(c);
  }
  const popLayer = h('div', { class: 'pops' });
  const stuckEl = h('div', { class: 'stuck' });
  const boardWrap = h('div', { class: 'board-wrap' }, boardEl, popLayer);
  const slots = [0, 1, 2].map(() => h('div', { class: 'slot' }));
  const trayEl = h('div', { class: 'tray' }, slots, stuckEl);
  const weaponBtns = new Map<WeaponId, HTMLButtonElement>();
  const weaponsEl = h('div', { class: 'weapons' });
  const aimBar = h('div', { class: 'aimbar' });
  const hintEl = h('div', { class: 'tuto' }, h('span', { class: 'tuto-hand' }, '👆'), t('tutorial'));

  const el = h(
    'div',
    { class: 'screen game' },
    h('div', { class: 'topbar' }, h('button', { class: 'round', 'aria-label': t('paused'), html: ic.pause, onclick: () => pause() }), bestEl, creditsEl),
    h('div', { class: 'hud' }, h('div', { class: 'hud-mascot' }, mascot.el), h('div', { class: 'hud-info' }, scoreEl, comboEl, energyEl)),
    boardWrap,
    trayEl,
    h('div', { class: 'dock' }, weaponsEl, aimBar),
  );

  // ---------- rendu ----------
  const setCell = (i: number, color: number, anim?: string) => {
    const cell = cells[i];
    fill(cell);
    if (color) cell.appendChild(h('i', { class: `blk c${color} ${anim ?? ''}` }));
  };
  const renderBoard = () => {
    for (let i = 0; i < cells.length; i++) {
      const cur = cells[i].firstElementChild as HTMLElement | null;
      const want = game.board[i];
      if (want === 0 ? cur : !cur || !cur.classList.contains(`c${want}`)) setCell(i, want);
    }
  };
  const renderTray = (animate = false) => {
    slots.forEach((slot, i) => {
      const p = game.tray[i];
      fill(slot);
      slot.classList.toggle('nofit', !!p && !game.slotFits(i));
      if (!p) return;
      const shape = shapeById(p.shapeId);
      const pe = pieceEl(shape, p.color);
      // les grandes pièces sont réduites pour tenir dans leur case
      pe.style.setProperty('--u', `calc(var(--slot) / ${Math.max(4.4, Math.max(shape.w, shape.h) + 0.6)})`);
      if (animate) {
        pe.classList.add('deal');
        pe.style.animationDelay = `${i * 70}ms`;
      }
      slot.appendChild(pe);
    });
  };
  const renderHud = (animateScore = true) => {
    countTo(scoreEl, game.score, fmt, animateScore ? 450 : 0);
    const best = Math.max(store.p.best, game.score);
    bestEl.innerHTML = `${ic.crown}<b>${fmt(best)}</b>`;
    bestEl.classList.toggle('beaten', store.p.best > 0 && game.score > store.p.best);
    creditsEl.innerHTML = `${ic.credit}<b>${fmt(store.p.credits)}</b><span class="plus">+</span>`;
    if (game.streak >= 2) {
      const pips = Array.from({ length: COMBO_GRACE }, (_, i) => `<i class="${i < COMBO_GRACE - game.idle ? 'on' : ''}"></i>`).join('');
      comboEl.innerHTML = `<b>${t('combo')} ×${game.streak}</b><span class="pips">${pips}</span>`;
      comboEl.classList.add('show');
    } else comboEl.classList.remove('show');
    energyFill.style.width = `${(game.energy / ENERGY_MAX) * 100}%`;
  };
  const renderWeapons = () => {
    fill(weaponsEl, 
      ...WEAPON_IDS.map((w) => {
        const n = store.p.weapons[w];
        const b = h(
          'button',
          { class: `weapon ${aiming === w ? 'on' : ''} ${n === 0 ? 'empty' : ''}`, 'aria-label': td('w_' + w), onclick: () => onWeapon(w) },
          h('span', { class: 'weapon-ic', html: ic.weaponIcons[w] }),
          h('small', null, td('w_' + w)),
          h('i', { class: 'count' }, n === 0 ? '+' : String(n)),
        );
        weaponBtns.set(w, b);
        return b;
      }),
    );
    fill(aimBar, 
      h('span', { html: aiming ? `${ic.weaponIcons[aiming]} ${t('aimHint')}` : '' }),
      h('button', { class: 'btn ghost small', onclick: () => setAim(null) }, t('cancel')),
    );
    el.classList.toggle('aiming', !!aiming);
  };
  offs.push(store.on(() => { renderWeapons(); renderHud(false); }));

  const cellCenter = (i: number) => {
    const r = cells[i].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const pop = (text: string, i: number, cls = '') => {
    const br = boardWrap.getBoundingClientRect();
    const p = cellCenter(i);
    const node = h('div', { class: `pop ${cls}`, style: { left: `${clamp(p.x - br.left, 40, br.width - 40)}px`, top: `${p.y - br.top}px` } }, text);
    popLayer.appendChild(node);
    setTimeout(() => node.remove(), 1100);
  };
  const banner = (text: string, cls = '') => {
    const node = h('div', { class: `praise ${cls}` }, text);
    popLayer.appendChild(node);
    setTimeout(() => node.remove(), 1300);
  };
  const explode = (list: number[], colors: number[], origin?: number) => {
    const o = origin !== undefined ? { r: Math.floor(origin / SIZE), c: origin % SIZE } : null;
    list.forEach((i, k) => {
      const dist = o ? Math.abs(Math.floor(i / SIZE) - o.r) + Math.abs((i % SIZE) - o.c) : 0;
      const delay = dist * 22;
      const blk = cells[i].firstElementChild as HTMLElement | null;
      if (blk) {
        blk.style.animationDelay = `${delay}ms`;
        blk.classList.add('clearing');
      }
      setTimeout(() => {
        const p = cellCenter(i);
        burst(p.x, p.y, BLOCK_COLORS[colors[k]] ?? '#fff', list.length > 24 ? 4 : 6);
      }, delay);
    });
    return sleep(Math.min(520, 260 + 22 * 14));
  };

  // ---------- pose d'une pièce ----------
  async function applyPlace(out: PlaceOutcome): Promise<void> {
    busy = true;
    hintEl.remove();
    if (!store.p.tutorialDone) { store.p.tutorialDone = true; store.commit(); }
    out.placed.forEach((i) => setCell(i, out.color, 'plop'));
    sfx.place();
    haptic.medium();
    const anchor = out.placed[Math.floor(out.placed.length / 2)];

    if (out.lineCount > 0) {
      await sleep(70);
      sfx.clear(out.lineCount, out.streak);
      haptic.combo(out.lineCount + out.streak);
      replay(boardWrap, out.lineCount >= 2 ? 'shake2' : 'shake1');
      const wait = explode(out.cleared, out.clearedColors, anchor);
      pop(`+${fmt(out.gained)}`, anchor, 'big');
      const power = out.lineCount + out.streak - 1;
      if (out.perfect) {
        banner(t('perfect'), 'gold');
        sfx.perfect();
        haptic.celebrate();
        confetti(90);
      } else if (power >= 2) {
        banner(t(`praise${clamp(power - 1, 1, 5)}` as 'praise1'), `p${clamp(power - 1, 1, 5)}`);
      }
      mascot.flash(power >= 3 ? 'wow' : 'joy', 1300);
      mascot.act(power >= 3 ? 'cheer' : 'hop');
      if (out.streak >= 3) mascot.say(say('sayCombo'));
      else if (Math.random() < 0.35) mascot.say(say('sayClear'));
      store.trackLive('combo', game.maxCombo);
      await wait;
    } else {
      pop(`+${out.gained}`, anchor);
    }
    renderBoard();
    renderHud();

    if (out.energyFull) {
      const w = WEAPON_IDS[Math.floor(Math.random() * 3)];
      store.addWeapon(w, 1);
      sfx.reward();
      haptic.pattern([['success', 0], ['medium', 160], ['heavy', 280]]);
      const r = energyEl.getBoundingClientRect();
      sparkle(r.left + 14, r.top + r.height / 2, '#FF4F9A', 16);
      banner(t('heartFull', { w: td('w_' + w) }), 'heart');
      replay(weaponBtns.get(w)!, 'gain');
    }
    renderTray(out.refilled);
    if (out.refilled) { sfx.whoosh(); haptic.select(); }
    store.saveGame(game.snapshot());
    busy = false;
    afterMove();
  }

  /** Après chaque action : ambiance, détection du blocage. */
  function afterMove(): void {
    const fill = fillRatio(game.board);
    if (!game.hasMoves()) {
      void onStuck();
      return;
    }
    stuckEl.classList.remove('show');
    if (fill > 0.62) {
      mascot.setMood('worried');
      if (Date.now() - dangerSaid > 9000) { dangerSaid = Date.now(); mascot.say(say('sayDanger')); haptic.warning(); }
    } else mascot.setMood('happy');
    boardWrap.classList.toggle('danger', fill > 0.62);
    if (store.p.best > 0 && game.score > store.p.best && !bestEl.dataset.cheered) {
      bestEl.dataset.cheered = '1';
      banner(t('newRecord'), 'gold');
      confetti(70);
      sfx.levelUp();
      haptic.celebrate();
    }
  }

  // ---------- glisser-déposer ----------
  slots.forEach((slot, slotIndex) => {
    slot.addEventListener('pointerdown', (e) => {
      const piece = game.tray[slotIndex];
      if (!piece || busy || ended || aiming || !e.isPrimary) return;
      e.preventDefault();
      startDrag(slotIndex, piece, e);
    });
  });

  function startDrag(slotIndex: number, piece: Piece, start: PointerEvent): void {
    const shape = shapeById(piece.shapeId);
    const slot = slots[slotIndex];
    const src = slot.firstElementChild as HTMLElement;
    const rect0 = boardEl.getBoundingClientRect();
    const pitch = rect0.width / SIZE;
    const lift = start.pointerType === 'mouse' ? pitch * 0.6 : pitch * 1.7;
    const drag = pieceEl(shape, piece.color);
    drag.classList.add('drag');
    drag.style.setProperty('--u', `${pitch}px`);
    document.body.appendChild(drag);
    src.style.visibility = 'hidden';
    sfx.pick();
    haptic.select();
    let target: { r: number; c: number } | null = null;
    let marked: HTMLElement[] = [];

    const clearMarks = () => {
      marked.forEach((m) => { m.classList.remove('ghost', 'will'); m.style.removeProperty('--gc'); });
      marked = [];
    };
    const move = (e: PointerEvent) => {
      const w = shape.w * pitch;
      const hgt = shape.h * pitch;
      const left = e.clientX - w / 2;
      const top = e.clientY - lift - hgt;
      drag.style.transform = `translate(${left}px, ${top}px)`;
      const rect = boardEl.getBoundingClientRect();
      const fc = (left - rect.left) / pitch;
      const fr = (top - rect.top) / pitch;
      // position la plus proche où la pièce rentre (tolérance : un peu moins d'une case)
      let best: { r: number; c: number; d: number } | null = null;
      for (let r = Math.floor(fr); r <= Math.ceil(fr); r++) {
        for (let c = Math.floor(fc); c <= Math.ceil(fc); c++) {
          if (!canPlace(game.board, shape, r, c)) continue;
          const d = Math.hypot(r - fr, c - fc);
          if (d < 0.85 && (!best || d < best.d)) best = { r, c, d };
        }
      }
      if (best?.r === target?.r && best?.c === target?.c) return;
      clearMarks();
      target = best ? { r: best.r, c: best.c } : null;
      if (!target) return;
      for (const [dr, dc] of shape.cells) {
        const cell = cells[idx(target.r + dr, target.c + dc)];
        cell.classList.add('ghost');
        cell.style.setProperty('--gc', BLOCK_COLORS[piece.color]);
        marked.push(cell);
      }
      const lines = previewLines(game.board, shape, target.r, target.c);
      for (const i of lineCells(lines)) {
        cells[i].classList.add('will');
        cells[i].style.setProperty('--gc', BLOCK_COLORS[piece.color]);
        marked.push(cells[i]);
      }
      if (lines.rows.length + lines.cols.length > 0) haptic.light();
    };
    const end = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      clearMarks();
      const out = target && e.type === 'pointerup' ? game.placePiece(slotIndex, target.r, target.c) : null;
      if (out) {
        drag.remove();
        void applyPlace(out);
      } else {
        // retour dans le plateau de pièces
        sfx.invalid();
        haptic.pattern([['light', 0], ['light', 90]]);
        const back = slot.getBoundingClientRect();
        drag.classList.add('back');
        drag.style.transform = `translate(${back.left + back.width / 2 - (shape.w * pitch) / 2}px, ${back.top + back.height / 2 - (shape.h * pitch) / 2}px) scale(.45)`;
        setTimeout(() => { drag.remove(); src.style.visibility = ''; }, 170);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    move(start);
  }

  // ---------- armes ----------
  function setAim(w: WeaponId | null): void {
    aiming = w;
    cells.forEach((c) => c.classList.remove('aim'));
    renderWeapons();
    if (w) { mascot.say(say('sayAim'), 2200); stuckEl.classList.remove('show'); }
    else if (!game.hasMoves() && !ended) stuckEl.classList.add('show');
  }

  function onWeapon(w: WeaponId): void {
    if (busy || ended) return;
    sfx.tap();
    if (store.p.weapons[w] <= 0) return openWeaponOffer(w);
    if (w === 'recycle') {
      setAim(null);
      store.addWeapon('recycle', -1);
      store.trackLive('weapons', 1);
      game.recycle();
      sfx.whoosh();
      haptic.medium();
      mascot.act('fire');
      renderTray(true);
      store.saveGame(game.snapshot());
      afterMove();
      return;
    }
    setAim(aiming === w ? null : w);
  }

  const cellAt = (e: PointerEvent) => {
    const rect = boardEl.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
    return r >= 0 && c >= 0 && r < SIZE && c < SIZE ? { r, c } : null;
  };
  const aimPreview = (e: PointerEvent) => {
    if (!aiming) return;
    cells.forEach((c) => c.classList.remove('aim'));
    const at = cellAt(e);
    if (at) game.weaponTargets(aiming, at.r, at.c).forEach((i) => cells[i].classList.add('aim'));
  };
  boardEl.addEventListener('pointerdown', (e) => { if (aiming) { boardEl.setPointerCapture(e.pointerId); aimPreview(e); } });
  boardEl.addEventListener('pointermove', (e) => { if (aiming && e.buttons) aimPreview(e); });
  boardEl.addEventListener('pointerup', (e) => {
    if (!aiming || busy) return;
    const at = cellAt(e);
    cells.forEach((c) => c.classList.remove('aim'));
    if (!at) return;
    const w = aiming;
    const out = game.fireWeapon(w, at.r, at.c);
    if (!out) { sfx.invalid(); haptic.error(); return; }
    store.addWeapon(w, -1);
    store.trackLive('weapons', 1);
    setAim(null);
    void applyBlast(out, idx(at.r, at.c), w === 'laser' ? 'zap' : 'boom');
  });

  async function applyBlast(out: BlastOutcome, origin: number, sound: 'zap' | 'boom'): Promise<void> {
    busy = true;
    mascot.act('fire');
    mascot.flash('wow', 900);
    sfx[sound]();
    haptic.boom();
    replay(boardWrap, 'shake2');
    if (out.gained) pop(`+${out.gained}`, origin, 'big');
    await explode(out.cells, out.colors, origin);
    renderBoard();
    renderHud();
    renderTray();
    store.saveGame(game.snapshot());
    busy = false;
    afterMove();
  }

  function openWeaponOffer(w: WeaponId): void {
    const price = WEAPON_PRICES[w];
    const m = openModal({ title: t('outOf', { w: td('w_' + w) }), cls: 'offer' });
    const done = () => { m.close(); renderWeapons(); };
    add(m.body, 
      h('div', { class: 'offer-ic', html: ic.weaponIcons[w] }),
      h('p', { class: 'hint' }, td('wd_' + w)),
      ads.available()
        ? btn(h('span', { html: `${t('video')} · <b>+1</b>` }), 'cyan big', async () => {
            if (await watchAd()) { store.addWeapon(w, 1); sfx.reward(); haptic.success(); done(); }
          }, ic.video)
        : null,
      h(
        'div',
        { class: 'offer-row' },
        btn(h('span', { html: `×1 &nbsp;${ic.coin}<b>${price.coins}</b>` }), 'white', () => buyWeapon(w, 'coins') && done()),
        btn(h('span', { html: `×5 &nbsp;${ic.credit}<b>${price.credits5}</b>` }), 'pink', () => buyWeapon(w, 'credits') && done()),
      ),
    );
  }

  // ---------- blocage, continuer, fin ----------
  async function onStuck(): Promise<void> {
    if (ended) return;
    mascot.setMood('sad');
    mascot.say(say('sayStuck'), 2400);
    renderTray();
    if (store.totalWeapons() > 0) {
      // le joueur a encore des armes : à lui de décider
      sfx.stuck();
      haptic.warning();
      fill(stuckEl, 
        h('b', null, t('stuckTitle')),
        h('small', null, t('stuckHint')),
        h('button', { class: 'btn ghost small', onclick: () => { stuckEl.classList.remove('show'); void offerContinue(); } }, t('giveUp')),
      );
      stuckEl.classList.add('show');
      replay(weaponsEl, 'nudge');
      return;
    }
    busy = true;
    sfx.stuck();
    haptic.warning();
    replay(boardWrap, 'shake2');
    await sleep(900);
    busy = false;
    void offerContinue();
  }

  async function offerContinue(): Promise<void> {
    if (ended) return;
    if (game.continues >= MAX_CONTINUES) return endGame();
    const cost = ECONOMY.continueCosts[Math.min(game.continues, ECONOMY.continueCosts.length - 1)];
    const canVideo = game.continues < ECONOMY.continueByVideo && ads.available();
    const face = new Mascot(store.p.equipped as never);
    face.setMood('sad');
    const m = openModal({ title: t('continueTitle'), cls: 'continue', dismissable: false, onClose: () => face.destroy() });
    const revive = async () => {
      m.close();
      const out = game.revive();
      mascot.setMood('happy');
      mascot.say(say('sayRevive'));
      await applyBlast(out, 27, 'zap');
      renderTray(true);
    };
    add(m.body, 
      h('div', { class: 'cont-mascot' }, face.el),
      h('div', { class: 'cont-score' }, fmt(game.score)),
      h('p', { class: 'hint' }, t('continueText')),
      canVideo
        ? btn(h('span', { html: `${t('watchVideo')} · <b>${t('free')}</b>` }), 'cyan big', async () => { if (await watchAd()) void revive(); }, ic.video)
        : null,
      btn(h('span', { html: `${t('continue')} &nbsp;${ic.credit}<b>${cost}</b>` }), 'pink big', () => {
        if (store.spendCredits(cost)) void revive();
        else { toast(t('notEnoughCredits'), 'bad'); sfx.invalid(); haptic.error(); openShop('credits'); }
      }),
      h('button', { class: 'link', onclick: () => { haptic.tap(); m.close(); endGame(); } }, t('noThanks')),
    );
  }

  function endGame(): void {
    if (ended) return;
    ended = true;
    stuckEl.classList.remove('show');
    sfx.gameOver();
    haptic.stopAll();
    haptic.fail();
    const rewards = store.finishGame({
      score: game.score,
      lines: game.lines,
      blocks: game.blocks,
      maxCombo: game.maxCombo,
      multi: game.multi,
      weaponsUsed: game.weaponsUsed,
    });
    void store.flush();
    setTimeout(() => { void ads.maybeInterstitial().then(() => showResults(rewards)); }, 500);
  }

  function showResults(r: GameRewards): void {
    const face = new Mascot(store.p.equipped as never);
    const m = openModal({ cls: 'results', dismissable: false, onClose: () => face.destroy() });
    if (r.record) {
      face.setMood('wow');
      face.act('cheer');
      confetti(140);
      sfx.levelUp();
      haptic.celebrate();
    } else face.setMood('happy');
    let coins = r.coins;
    const coinsEl = h('b', { dataset: { value: '0' } }, '0');
    const doubleBtn = ads.available()
      ? btn(h('span', { html: `${t('double')} ×2` }), 'cyan', async () => {
          if (!(await watchAd())) return;
          store.addCoins(coins);
          coins *= 2;
          countTo(coinsEl, coins, fmt, 600);
          sfx.coin();
          haptic.celebrate();
          doubleBtn!.replaceWith(h('span', { class: 'doubled' }, t('doubled')));
        }, ic.video)
      : null;
    const need = xpForLevel(store.p.level);
    const gap = r.previousBest - game.score;
    add(m.body, 
      h('div', { class: 'res-mascot' }, face.el),
      h('div', { class: `res-title ${r.record ? 'record' : ''}` }, r.record ? t('newRecord') : t('gameOver')),
      h('div', { class: 'res-score' }, fmt(game.score)),
      h('div', { class: 'res-best', html: `${ic.crown} ${t('best')} <b>${fmt(store.p.best)}</b>` }),
      !r.record && gap > 0 && gap < r.previousBest * 0.35 ? h('p', { class: 'res-near' }, t('toRecord', { n: fmt(gap) })) : null,
      h(
        'div',
        { class: 'res-stats' },
        h('div', null, h('small', null, t('linesCleared')), h('b', null, String(game.lines))),
        h('div', null, h('small', null, t('maxCombo')), h('b', null, `×${game.maxCombo}`)),
        h('div', { class: 'res-coins' }, h('small', null, t('earned')), h('span', { html: ic.coin }, coinsEl)),
      ),
      doubleBtn,
      h(
        'div',
        { class: 'res-xp' },
        h('span', { class: 'lvl' }, `${t('level')} ${store.p.level}`),
        h('div', { class: 'bar' }, h('i', { style: { width: `${(store.p.xp / need) * 100}%` } }), h('span', null, `${fmt(store.p.xp)} / ${fmt(need)} XP`)),
      ),
      ...r.levelsGained.map((l) => h('div', { class: 'res-level' }, h('b', null, t('levelUp', { n: l.level })), rewardChips(l.reward))),
      store.missionsClaimable() > 0 ? h('p', { class: 'res-near' }, `🎯 ${t('missions')} : ${store.missionsClaimable()} ✓`) : null,
      btn(t('playAgain'), 'pink big', () => { m.close(); replayGame(); }, ic.play),
      h('button', { class: 'link', onclick: () => { haptic.tap(); m.close(); goHome(); } }, t('quit')),
    );
    setTimeout(() => countTo(coinsEl, coins, fmt, 900), 250);
    if (r.levelsGained.length) setTimeout(() => { sfx.levelUp(); haptic.celebrate(); confetti(60); }, 700);
  }

  // ---------- pause ----------
  function pause(): void {
    if (ended || document.querySelector('#overlays .modal')) return;
    const m = openModal({ title: t('paused'), cls: 'pause' });
    add(m.body, 
      btn(t('continue'), 'pink big', () => m.close(), ic.play),
      btn(t('restart'), 'white', () => { m.close(); endGameSilently(); replayGame(); }, ic.restart),
      btn(t('quit'), 'white', () => { m.close(); store.saveGame(game.snapshot()); void store.flush(); goHome(); }, ic.home),
    );
  }
  /** Recommencer : la partie en cours compte (missions, boulons) mais sans écran de résultats. */
  function endGameSilently(): void {
    if (ended) return;
    ended = true;
    store.finishGame({ score: game.score, lines: game.lines, blocks: game.blocks, maxCombo: game.maxCombo, multi: game.multi, weaponsUsed: game.weaponsUsed });
  }

  // ---------- démarrage ----------
  renderBoard();
  renderTray(true);
  renderHud(false);
  renderWeapons();
  if (!store.p.tutorialDone) trayEl.appendChild(hintEl);
  store.saveGame(game.snapshot());
  setTimeout(() => { mascot.say(say('sayHello')); mascot.act('hop'); if (!game.hasMoves()) void onStuck(); }, 350);

  return {
    el,
    pause,
    destroy: () => {
      offs.forEach((f) => f());
      mascot.destroy();
      el.remove();
    },
  };
}
