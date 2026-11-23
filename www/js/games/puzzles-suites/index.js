/**
 * L'atelier des puzzles et des suites (jeu 7). Les activités alternent : un puzzle, puis 3 suites.
 * Puzzle : toucher une pièce, puis sa case (le modèle reste visible en miniature).
 * Suites : toucher l'élément qui continue la suite.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, seriesDots } from '../choices.js';
import { shake, shapeSvg } from '../shared.js';
import { COLORS, fitsSlot, makePuzzle, makeSuite, SKILLS, SUITES_PER_ACTIVITY } from './rules.js';
import { SCENE_IDS, SCENE_NAMES, sceneSvg, tileSvg } from './scenes.js';

const COLOR_NAMES = { rouge: ['rouge', 'rouge'], bleu: ['bleu', 'bleue'], jaune: ['jaune', 'jaune'], vert: ['vert', 'verte'] };
const SHAPE_NAMES = { rond: 'rond', carre: 'carré', triangle: 'triangle', fleur: 'fleur' };
/** « rond bleu », « fleur bleue » : la couleur s'accorde avec la forme. */
const nameOf = (t) => `${SHAPE_NAMES[t.shape]} ${COLOR_NAMES[t.color][t.shape === 'fleur' ? 1 : 0]}`;

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let kind = 'puzzle';
  let destroyed = false;
  let current = null; // { hint() } de l'activité en cours

  function next() {
    if (destroyed) return;
    if (kind === 'puzzle') startPuzzle();
    else startSuites();
  }

  async function done(payload) {
    await ctx.activityDone({ success: true, attempts: 1, level: null, skills: SKILLS[kind], ...payload, data: { kind, ...payload.data } });
    kind = kind === 'puzzle' ? 'suite' : 'puzzle';
    if (!destroyed) ctx.celebrate(next);
  }

  // ---------- Puzzle ----------

  function startPuzzle() {
    const puzzle = makePuzzle(difficulty, random, SCENE_IDS);
    const { n, scene } = puzzle;
    const placed = new Set();
    let selected = null;
    let errors = 0;
    let hints = 0;
    // Largeur disponible ; 0 si la page n'est pas encore affichée : on prend alors celle d'un téléphone.
    const available = root.clientWidth || document.documentElement.clientWidth || 360;
    // Le puzzle à construire et, juste à sa droite, les pièces mélangées (même sur un téléphone).
    const boardSize = Math.max(150, Math.min(320, Math.floor((available - 10) * 0.56)));
    const cell = Math.floor(boardSize / n);
    const trayWidth = Math.max(60, available - boardSize - 12);
    const count = n * n;
    let traySize = 0;
    let trayCols = 1;
    // On choisit le nombre de colonnes qui donne les plus grandes pièces sans dépasser la largeur ni trop la hauteur.
    for (let cols = 1; cols <= 4; cols++) {
      const rows = Math.ceil(count / cols);
      const size = Math.min(Math.floor((trayWidth - (cols - 1) * 6) / cols) - 6, Math.floor((boardSize * 1.6 - (rows - 1) * 6) / rows) - 6, 84);
      if (size > traySize) { traySize = size; trayCols = cols; }
    }
    traySize = Math.max(34, traySize);
    ctx.activityStart();

    const slots = Array.from({ length: n * n }, (_, i) => h('button', {
      class: 'p-slot', 'data-slot': i, 'aria-label': `case ${Math.floor(i / n) + 1}, ${(i % n) + 1}`, style: { width: `${cell}px`, height: `${cell}px` },
      onclick: (e) => place(i, e.currentTarget),
    }));
    const pieceButtons = new Map();
    const tray = h('div', { class: 'p-tray', style: { gridTemplateColumns: `repeat(${trayCols}, auto)` } }, puzzle.pieces.map((piece) => {
      const btn = h('button', { class: 'p-piece', 'aria-label': `pièce ${piece.id + 1}`, html: tileSvg(scene, n, piece.x, piece.y, traySize), onclick: () => select(piece, btn) });
      pieceButtons.set(piece.id, btn);
      return btn;
    }));

    function select(piece, btn) {
      selected = piece;
      tray.querySelectorAll('.selected').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      ctx.sfx('tap');
    }

    function place(slotIndex, slotEl) {
      if (placed.has(slotIndex)) return;
      if (!selected) {
        ctx.instruct('Touche d’abord une pièce, puis sa place.', { quiet: true });
        return;
      }
      if (!fitsSlot(selected, slotIndex)) {
        errors += 1;
        shake(pieceButtons.get(selected.id), ctx.reducedMotion);
        ctx.sfx('soft');
        if (errors === 3) ctx.offerHint();
        return;
      }
      placed.add(slotIndex);
      slotEl.innerHTML = tileSvg(scene, n, selected.x, selected.y, cell);
      slotEl.classList.add('filled');
      slotEl.setAttribute('aria-label', 'pièce placée');
      pieceButtons.get(selected.id).remove();
      selected = null;
      ctx.sfx('good');
      root.querySelectorAll('.p-slot.glow').forEach((s) => s.classList.remove('glow'));
      if (placed.size === n * n) {
        ctx.instruct(`Bravo, ${SCENE_NAMES[scene]} est complet${scene === 'maison' || scene === 'fusee' ? 'e' : ''} !`);
        setTimeout(() => done({ errors, hints, data: { pieces: n * n, scene } }), 700);
      }
    }

    clear(root);
    root.append(h('div', { class: 'c-game puzzle' },
      h('div', { class: 'p-model', 'aria-label': 'modèle', html: sceneSvg(scene, 76) }),
      h('div', { class: 'p-top' },
        h('div', { class: `p-board`, style: { gridTemplateColumns: `repeat(${n}, ${cell}px)` } }, slots),
        tray)));
    ctx.instruct(`Reconstitue l’image : ${n * n} pièces. Touche une pièce, puis sa place.`);

    current = {
      hint() {
        hints += 1;
        const remaining = puzzle.pieces.filter((p) => !placed.has(p.id));
        const piece = selected ?? random.pick(remaining);
        if (!piece) return;
        select(piece, pieceButtons.get(piece.id));
        slots[piece.id].classList.add('glow');
      },
      repeat() { ctx.instruct('Touche une pièce, puis sa place. Le modèle est en haut.'); },
    };
  }

  // ---------- Suites ----------

  function startSuites() {
    let index = 0;
    let errors = 0;
    let hints = 0;
    let question = null;
    ctx.activityStart();

    const token = (t, size) => h('span', { class: 's-token', html: shapeSvg(t.shape, COLORS[t.color], size) });

    function ask() {
      const suite = makeSuite(difficulty, random);
      const row = h('div', { class: 's-row', 'aria-label': `suite : ${suite.items.map(nameOf).join(', ')}, puis ?` },
        suite.items.map((t) => token(t, 0.42)), h('span', { class: 's-token s-missing', 'aria-hidden': 'true' }, '?'));
      question = choiceQuestion(ctx, {
        model: h('div', { class: 'c-model s-model' }, row),
        choices: suite.choices.map((c) => ({ id: c.id, aria: nameOf(c) })),
        correctId: suite.expected.id,
        onCorrect: () => {
          errors += question.errors;
          index += 1;
          if (index < SUITES_PER_ACTIVITY) ctx.afterSpeech(() => { if (!destroyed) ask(); }, 600);
          else done({ errors, hints, attempts: SUITES_PER_ACTIVITY, data: { suites: SUITES_PER_ACTIVITY } });
        },
      });
      // Les cartes de choix montrent la forme dessinée (le moteur commun gère texte et émoji, on ajoute le dessin).
      question.node.querySelectorAll('.c-choice').forEach((btn) => {
        const c = suite.choices.find((x) => x.id === btn.dataset.id);
        btn.prepend(token(c, 0.75));
      });
      clear(root);
      root.append(h('div', { class: 'c-game suites' }, seriesDots(SUITES_PER_ACTIVITY, index), question.node));
      ctx.instruct(difficulty === 2 ? 'Regarde la forme et la couleur. Qu’est-ce qui vient ensuite ?' : 'Qu’est-ce qui vient ensuite ?');
    }

    ask();
    current = {
      hint() { hints += 1; question?.hint(); },
      repeat() { ctx.instruct('Qu’est-ce qui vient ensuite ?'); },
    };
  }

  next();

  return {
    hint() { current?.hint(); },
    repeat() { current?.repeat(); },
    destroy() { destroyed = true; clear(root); },
  };
}
