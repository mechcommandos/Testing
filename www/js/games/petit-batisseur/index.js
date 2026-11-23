/**
 * Le petit bâtisseur (jeu 13) : reproduire une construction de blocs, ou relever un défi de construction.
 * Toucher un bloc de la réserve puis une colonne (ou le glisser sur la colonne) : il tombe sur la pile.
 * Le bouton sous une colonne retire son bloc du haut. La construction est vérifiée à chaque bloc posé.
 */
import { clear, h } from '../../ui/dom.js';
import { seriesDots } from '../choices.js';
import { enableDrag, shake } from '../shared.js';
import { blockCount, COLORS, emptyBoard, isDone, makeSeries, MAX_HEIGHT, nextStep } from './rules.js';

const colorOf = (id) => COLORS.find((c) => c.id === id);

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let board;
  let selected;
  let errors;
  let hints;
  let finishing = false;
  let destroyed = false;
  let columnsEl;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    start();
  }

  const task = () => series[index];
  const palette = () => (difficulty === 0 ? [colorOf('bleu')] : COLORS);

  function start() {
    board = emptyBoard();
    selected = palette()[0].id;
    finishing = false;
    render();
    ctx.instruct(task().prompt);
  }

  function stack(col, { small = false } = {}) {
    return h('div', { class: `b-col${small ? ' small' : ''}` },
      Array.from({ length: MAX_HEIGHT }, (_, i) => {
        const c = col[i];
        return h('span', { class: `b-cell${c ? ' full' : ''}`, style: c ? { background: colorOf(c).fill } : null });
      }).reverse());
  }

  function render() {
    const t = task();
    const model = t.kind === 'model'
      ? h('div', { class: 'b-model', 'aria-label': describe(t.model, t.colored) }, h('span', { class: 'b-tag' }, 'Modèle'), h('div', { class: 'b-grid small' }, t.model.map((col) => stack(col, { small: true }))), h('div', { class: 'b-ground small' }))
      : h('div', { class: 'b-model b-challenge' }, h('span', { class: 'b-tag' }, 'Défi'), h('p', {}, t.challenge.text));

    columnsEl = h('div', { class: 'b-grid', role: 'group', 'aria-label': 'Chantier' }, board.map((col, k) =>
      h('button', { class: 'b-drop', 'data-col': k, 'aria-label': `Poser le bloc dans la colonne ${k + 1} (${col.length} bloc${col.length > 1 ? 's' : ''})`, onclick: () => place(k) }, stack(col))));
    const takes = h('div', { class: 'b-takes' }, board.map((col, k) =>
      h('button', { class: 'b-take', 'aria-label': `Retirer le bloc du haut de la colonne ${k + 1}`, disabled: !col.length, onclick: () => takeTop(k) }, '↑ Retirer')));

    const pal = h('div', { class: 'b-palette', role: 'group', 'aria-label': 'Réserve de blocs' }, palette().map((c) => {
      const btn = h('button', { class: `b-block${selected === c.id ? ' on' : ''}`, style: { background: c.fill }, 'aria-pressed': selected === c.id ? 'true' : 'false', 'aria-label': `Bloc ${c.label}`, onclick: () => { selected = c.id; render(); } });
      enableDrag(btn, { targetSelector: '.b-drop', onStart: () => { selected = c.id; }, onDrop: (target) => { if (target) place(Number(target.dataset.col)); } });
      return btn;
    }));

    clear(root);
    root.append(h('div', { class: 'c-game builder' },
      seriesDots(series.length, index),
      h('div', { class: 'b-stage' }, model, h('div', { class: 'b-site' }, columnsEl, h('div', { class: 'b-ground' }), takes)),
      pal,
      h('p', { class: 'small b-count', 'aria-live': 'polite' }, `${blockCount(board)} bloc${blockCount(board) > 1 ? 's' : ''} posé${blockCount(board) > 1 ? 's' : ''} sur ${t.blocks}`)));
  }

  function describe(model, colored) {
    return `Modèle : ${model.map((col, k) => (col.length ? `colonne ${k + 1}, ${col.length} bloc${col.length > 1 ? 's' : ''}${colored ? ` (${col.map((c) => colorOf(c).label).join(', ')}, de bas en haut)` : ''}` : null)).filter(Boolean).join(' ; ')}`;
  }

  function place(k) {
    if (finishing || board[k].length >= MAX_HEIGHT) return;
    const t = task();
    // Erreur seulement pour un modèle : bloc posé là où le modèle n'en a pas, ou de la mauvaise couleur.
    if (t.kind === 'model') {
      const want = t.model[k][board[k].length];
      const wrong = !want || (t.colored && want !== selected) || board[k].some((c, i) => t.colored && c !== t.model[k][i]);
      if (wrong) {
        errors += 1;
        ctx.sfx('soft');
        if (errors % 3 === 0) ctx.offerHint();
      } else ctx.sfx('tap');
    } else ctx.sfx('tap');
    board[k].push(selected);
    render();
    if (t.kind === 'model' && board[k].length > t.model[k].length) shake(columnsEl.children[k], ctx.reducedMotion);
    check();
  }

  function takeTop(k) {
    if (finishing || !board[k].length) return;
    board[k].pop();
    ctx.sfx('tap');
    render();
    check();
  }

  function check() {
    if (!isDone(task(), board)) {
      if (task().kind === 'challenge' && blockCount(board) > task().blocks) {
        errors += 1;
        ctx.instruct(`Il y a plus de ${task().blocks} blocs : retire-en un.`);
      }
      return;
    }
    finishing = true;
    ctx.sfx('good');
    root.querySelector('.b-site')?.classList.add('built');
    ctx.afterSpeech(() => {
      if (destroyed) return;
      index += 1;
      if (index < series.length) start();
      else finish();
    }, ctx.reducedMotion ? 300 : 1100);
  }

  async function finish() {
    await ctx.activityDone({
      success: true, hints, errors, attempts: series.length, level: null,
      data: { kinds: series.map((t) => (t.kind === 'model' ? `modele-${t.blocks}` : t.challenge.id)) },
    });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || finishing) return;
      hints += 1;
      const t = task();
      const step = nextStep(t, board);
      if (t.kind === 'challenge' || !step) {
        ctx.instruct(t.prompt);
        root.querySelector('.b-model')?.classList.add('glow');
        return;
      }
      if (step.action === 'remove') {
        root.querySelectorAll('.b-take')[step.col].classList.add('glow');
        ctx.instruct(`Retire le bloc du haut de la colonne ${step.col + 1}.`);
      } else {
        selected = step.color;
        render();
        columnsEl.children[step.col].classList.add('glow');
        ctx.instruct(`Pose un bloc ${colorOf(step.color).label} dans la colonne ${step.col + 1}.`);
      }
    },
    repeat() { if (series) ctx.instruct(task().prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}

