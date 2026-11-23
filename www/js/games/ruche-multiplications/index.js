/**
 * La ruche des multiplications (jeu 37) : des groupes d'abeilles, des alvéoles en rangées, puis les tables.
 * Premier indice : on compte par bonds sous chaque groupe (4, 8, 12…) ; ensuite, un mauvais choix disparaît.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, seriesDots } from '../choices.js';
import { makeSeries, SERIES, skipCount } from './rules.js';
import { app } from '../../ui/state.js';

function hexes(rows, cols, size = 26) {
  const w = size * 1.74;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 6 + c * w + (r % 2) * (w / 2);
    const y = 6 + r * size * 1.5;
    const p = [0, 1, 2, 3, 4, 5].map((k) => { const a = (Math.PI / 3) * k + Math.PI / 6; return `${(x + w / 2 + size * Math.cos(a)).toFixed(1)},${(y + size + size * Math.sin(a)).toFixed(1)}`; }).join(' ');
    cells.push(`<polygon points="${p}" fill="#f5c046" stroke="#c98a1f" stroke-width="3"/><circle cx="${x + w / 2}" cy="${y + size}" r="${size * 0.35}" fill="#f9dc8a"/>`);
  }
  const width = 12 + cols * w + w / 2;
  const height = 12 + (rows - 1) * size * 1.5 + size * 2;
  return `<svg viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" width="${Math.min(320, width).toFixed(0)}" aria-hidden="true" focusable="false">${cells.join('')}</svg>`;
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let hintStep;
  let question;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random, { tables: app.activeProfile?.revisions?.tables ?? [] });
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  function model(q) {
    if (q.kind === 'groups') {
      return h('div', { class: 'c-model rm-groups', role: 'img', 'aria-label': `${q.a} fleurs avec ${q.b} abeilles chacune` },
        Array.from({ length: q.a }, (_, i) => h('div', { class: 'rm-group' },
          h('span', { class: 'rm-flower', html: picto('fleur', 54) }),
          h('span', { class: 'rm-bees' }, Array.from({ length: q.b }, () => h('span', { html: picto('abeille', 30) }))),
          h('span', { class: 'rm-count', 'data-i': i }, ''))));
    }
    if (q.kind === 'rows') {
      return h('div', { class: 'c-model rm-rows', role: 'img', 'aria-label': `${q.a} rangées de ${q.b} alvéoles` },
        h('span', { html: hexes(q.a, q.b) }), h('span', { class: 'rm-row-counts' }, Array.from({ length: q.a }, (_, i) => h('span', { class: 'rm-count', 'data-i': i }, ''))));
    }
    return h('div', { class: 'c-model rm-table' }, h('strong', {}, `${q.a} × ${q.b}`), h('span', { class: 'rm-count rm-skip', 'data-i': 0 }, ''));
  }

  function ask() {
    const q = series[index];
    hintStep = 0;
    question = choiceQuestion(ctx, {
      model: model(q),
      choices: q.choices.map((n) => ({ id: String(n), text: String(n), aria: String(n), className: 'rm-num' })),
      correctId: String(q.product),
      onCorrect: () => answered(q),
    });
    clear(root);
    root.append(h('div', { class: 'c-game rm-game' }, seriesDots(SERIES, index), question.node));
    ctx.instruct(q.prompt);
  }

  function answered(q) {
    errors += question.errors;
    ctx.instruct(q.why);
    index += 1;
    ctx.afterSpeech(() => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }, 800);
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { products: series.map((q) => `${q.a}x${q.b}`) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!question) return;
      hints += 1;
      const q = series[index];
      if (hintStep === 0) {
        const counts = skipCount(q.a, q.b);
        if (q.kind === 'table') root.querySelector('.rm-skip').textContent = counts.join(', ');
        else root.querySelectorAll('.rm-count').forEach((el, i) => { el.textContent = String(counts[i]); });
        ctx.instruct(`Compte par bonds de ${q.b} : ${counts.join(', ')}.`);
      } else question.hint();
      hintStep += 1;
    },
    repeat() { if (series) ctx.instruct(series[index].prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
