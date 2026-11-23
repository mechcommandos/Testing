/**
 * La cuisine des mesures (jeu 17) : une recette de crêpes en 4 étapes.
 * Comparer (rubans, balance, verres), verser dans un verre doseur gradué, peser avec des poids, choisir l'unité,
 * convertir g ↔ kg et mL ↔ L. L'indice montre la graduation visée (verser) ou les poids utiles (peser).
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { formatMass, fr, JUG_MAX, makeSeries, tiltFor, WEIGHTS, weightsFor } from './rules.js';

const svg = (viewBox, inner, label, cls = 'm-svg') => h('div', { class: cls, role: 'img', 'aria-label': label, html: `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${inner}</svg>` });

function ribbons(t) {
  const bar = (y, cm, color) => `<rect x="20" y="${y}" width="${cm * 22}" height="22" rx="6" fill="${color}"/>`;
  return svg('0 0 400 110', `${bar(18, t.a, '#3b82f6')}${bar(66, t.b, '#e5484d')}<line x1="20" y1="8" x2="20" y2="100" stroke="#5b6b85" stroke-width="3"/>`, 'Deux rubans alignés à gauche : un bleu en haut, un rouge en bas.');
}

function balance(t) {
  // Le plateau du côté le plus lourd descend (en SVG, y grandit vers le bas) : le fléau penche de 12°.
  const tilt = tiltFor(t);
  const pan = (x, y, fruit) => `<g transform="translate(${x} ${y})"><path d="M0 -50L-48 0M0 -50L48 0" stroke="#5b4a3a" stroke-width="3"/><path d="M-55 0h110l-16 22h-78z" fill="#c9a36a"/><g transform="translate(-30 -62)">${picto(fruit, 60).replace(/^<svg /, '<svg x="0" y="0" ')}</g></g>`;
  const dy = Math.sin((tilt * Math.PI) / 180) * 120;
  return svg('0 0 400 230', `<rect x="190" y="70" width="20" height="140" rx="6" fill="#8a6238"/><rect x="140" y="205" width="120" height="16" rx="8" fill="#8a6238"/>`
    + `<line x1="${200 - 120}" y1="${70 + dy}" x2="${200 + 120}" y2="${70 - dy}" stroke="#5b4a3a" stroke-width="10" stroke-linecap="round"/>`
    + `<circle cx="200" cy="70" r="10" fill="#5b4a3a"/>${pan(80, 120 + dy, t.left)}${pan(320, 120 - dy, t.right)}`, 'Une balance avec un fruit sur chaque plateau.');
}

function glass(x, level) {
  const top = 30;
  const height = 160;
  const fill = (level / JUG_MAX) * height;
  return `<path d="M${x} ${top}h90l-8 ${height}h-74z" fill="#eef6fb" stroke="#5b6b85" stroke-width="4"/><path d="M${x + 1 + (8 * (1 - fill / height))} ${top + height - fill}h${88 - 16 * (1 - fill / height)}l-${8 * (fill / height)} ${fill}h-74z" fill="#f7f1e3"/>`;
}

function glasses(t) {
  return svg('0 0 400 210', `${glass(70, t.a)}${glass(240, t.b)}`, 'Deux verres identiques avec du lait, à gauche et à droite.');
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let question;
  let state;
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  const task = () => series[index];

  function frame(...body) {
    clear(root);
    root.append(h('div', { class: 'c-game kitchen' },
      h('p', { class: 'm-recipe' }, h('strong', {}, 'Recette des crêpes'), ` · étape ${index + 1} sur ${series.length}`),
      seriesDots(series.length, index), ...body));
  }

  function ask() {
    const t = task();
    busy = false;
    question = null;
    if (t.kind === 'pour') return pour(t);
    if (t.kind === 'weigh') return weigh(t);
    const model = t.kind === 'compare-length' ? ribbons(t) : t.kind === 'compare-mass' ? balance(t) : t.kind === 'compare-volume' ? glasses(t) : null;
    question = choiceQuestion(ctx, { model, choices: t.choices.map((c) => ({ ...c, aria: c.text, className: c.picto ? '' : 'long' })), correctId: t.correctId, layout: t.choices.some((c) => c.picto) ? '' : 'list', onCorrect: done });
    frame(question.node);
    ctx.instruct(t.prompt);
  }

  // ----- Verser : verre doseur gradué tous les 100 mL -----
  function pour(t) {
    state = { level: 0 };
    const jug = h('div', { class: 'm-jug' });
    const reading = h('p', { class: 'm-reading', 'aria-live': 'polite' });
    const draw = () => {
      const H = 240;
      const y = (ml) => 260 - (ml / JUG_MAX) * H;
      let ticks = '';
      for (let ml = 100; ml <= JUG_MAX; ml += 100) {
        const major = ml % 200 === 0;
        ticks += `<line class="${ml === state.hintAt ? 'm-target' : ''}" x1="60" y1="${y(ml)}" x2="${major ? 96 : 84}" y2="${y(ml)}" stroke="#23324d" stroke-width="3"/>`;
        if (major) ticks += `<text x="102" y="${y(ml) + 6}" font-size="17" font-weight="700" fill="#23324d">${ml === 1000 ? '1 L' : ml}</text>`;
      }
      // 50 mL : petits traits intermédiaires
      for (let ml = 50; ml < JUG_MAX; ml += 100) ticks += `<line x1="60" y1="${y(ml)}" x2="74" y2="${y(ml)}" stroke="#23324d" stroke-width="2"/>`;
      jug.innerHTML = `<svg viewBox="0 0 220 280" aria-hidden="true" focusable="false"><path d="M50 20h120v240a10 10 0 0 1-10 10H60a10 10 0 0 1-10-10z" fill="#eef6fb" stroke="#5b6b85" stroke-width="4"/>`
        + `<rect x="52" y="${y(state.level)}" width="116" height="${260 - y(state.level)}" fill="${t.liquid.id === 'lait' ? '#f7f1e3' : '#bfe3f7'}"/>${ticks}<path d="M170 60q36 10 30 70" fill="none" stroke="#5b6b85" stroke-width="8" stroke-linecap="round"/><text x="54" y="14" font-size="14" font-weight="700" fill="#5b6b85">mL</text></svg>`;
      jug.setAttribute('role', 'img');
      jug.setAttribute('aria-label', `Verre doseur rempli à ${state.level} mL`);
      reading.textContent = '';
    };
    const change = (d) => {
      if (busy) return;
      state.level = Math.max(0, Math.min(JUG_MAX, state.level + d));
      ctx.sfx('tap');
      draw();
    };
    const steps = t.step === 250 ? [250, 50] : [100, 50];
    frame(h('div', { class: 'm-row' }, jug, h('div', { class: 'm-controls' },
      steps.map((s) => h('button', { class: 'btn ghost', onclick: () => change(s) }, `Verser ${s} mL`)),
      h('button', { class: 'btn ghost', onclick: () => change(-50) }, 'Retirer 50 mL'),
      h('button', { class: 'btn', onclick: () => check(state.level === t.target, state.level < t.target ? 'Il n’y en a pas assez.' : 'Il y en a trop.') }, 'C’est prêt'),
      reading)));
    draw();
    ctx.instruct(t.prompt);
    state.redraw = draw;
  }

  // ----- Peser : poser des poids sur le plateau ; l'écran de la balance affiche le total -----
  function weigh(t) {
    state = { pan: [] };
    const panEl = h('div', { class: 'm-pan', 'aria-live': 'polite' });
    const screen = h('div', { class: 'm-screen' });
    const draw = () => {
      const total = state.pan.reduce((a, b) => a + b, 0);
      panEl.replaceChildren(...state.pan.map((w, i) => h('button', { class: `m-weight w${w}`, 'aria-label': `Enlever le poids de ${w} g`, onclick: () => { if (busy) return; state.pan.splice(i, 1); draw(); } }, `${w} g`)));
      if (!state.pan.length) panEl.append(h('span', { class: 'small' }, 'Plateau vide'));
      screen.textContent = formatMass(total).replace('.', ',');
    };
    frame(h('div', { class: 'm-scale' }, h('p', { class: 'm-what' }, t.solid.name.replace(/^./, (c) => c.toUpperCase())), panEl, h('div', { class: 'm-base' }, screen)),
      h('div', { class: 'm-weights', role: 'group', 'aria-label': 'Poids disponibles' }, WEIGHTS.map((w) => h('button', { class: `m-weight w${w}`, 'aria-label': `Poser un poids de ${w} g`, onclick: () => { if (busy) return; state.pan.push(w); ctx.sfx('tap'); draw(); } }, `${w} g`))),
      h('button', { class: 'btn', onclick: () => { const total = state.pan.reduce((a, b) => a + b, 0); check(total === t.target, total < t.target ? 'Ce n’est pas assez lourd.' : 'C’est trop lourd.'); } }, 'C’est pesé'));
    draw();
    ctx.instruct(t.prompt);
    state.redraw = draw;
  }

  function check(ok, why) {
    if (busy) return;
    if (!ok) {
      errors += 1;
      ctx.sfx('soft');
      shake(root.querySelector('.m-jug, .m-scale'), ctx.reducedMotion);
      ctx.instruct(`${why} ${task().prompt}`);
      if (errors % 2 === 0) ctx.offerHint();
      return;
    }
    ctx.sfx('good');
    done();
  }

  function done() {
    busy = true;
    if (question) errors += question.errors;
    const t = task();
    const praise = t.kind === 'pour' ? `Parfait : ${t.label}.` : t.kind === 'weigh' ? `Parfait : ${t.label}.` : 'Bien vu !';
    ctx.instruct(praise);
    index += 1;
    const next = index < series.length ? ask : finish;
    if (t.kind === 'pour' || t.kind === 'weigh') root.querySelector('.c-game').append(continueButton(index < series.length ? 'Étape suivante' : 'Terminer', () => { if (!destroyed) next(); }));
    else ctx.afterSpeech(() => { if (!destroyed) next(); }, ctx.reducedMotion ? 200 : 600);
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { tasks: series.map((t) => t.kind) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const t = task();
      if (question) return question.hint();
      if (t.kind === 'pour') {
        state.hintAt = Math.round(t.target / 100) * 100 === t.target ? t.target : null;
        state.redraw();
        ctx.instruct(state.hintAt ? `Regarde le trait qui brille : c’est ${t.target} mL.` : `${fr(t.target)} mL, c’est entre ${Math.floor(t.target / 100) * 100} et ${Math.ceil(t.target / 100) * 100} : au petit trait du milieu.`);
      } else if (t.kind === 'weigh') {
        const ws = weightsFor(t.target);
        ctx.instruct(`Essaie avec ${ws.map((w) => `${w} g`).join(' + ')}${t.target >= 1000 ? `, ce qui fait ${t.target} g` : ''}.`);
      }
    },
    repeat() { if (series) ctx.instruct(task().prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
