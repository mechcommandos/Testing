/**
 * Le sondage de la classe (jeu 40) : lire un pictogramme ou un diagramme en barres, puis en construire un.
 * Indice : la colonne utile est surlignée, puis un mauvais choix disparaît (lecture) ; une barre fausse est montrée
 * (construction).
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { makeSeries, wrongBars } from './rules.js';

const COLORS = ['#ef5f95', '#f5b82e', '#1fb3c6', '#8b6fe8'];

function pictogram(topic, counts) {
  return h('div', { class: 'c-model sc-picto', role: 'table', 'aria-label': topic.title },
    h('p', { class: 'sc-title' }, topic.title),
    topic.items.map((it, i) => h('div', { class: 'sc-line', role: 'row', 'data-i': i },
      h('span', { class: 'sc-key', role: 'rowheader', html: picto(it, 40), 'aria-label': topic.names[it] }),
      h('span', { class: 'sc-icons', role: 'cell', 'aria-label': `${counts[i]} enfants` }, Array.from({ length: counts[i] }, () => h('span', { class: 'sc-kid', 'aria-hidden': 'true' }))))),
    h('p', { class: 'small' }, 'Un rond = un enfant.'));
}

function bars(topic, counts, top) {
  const H = 200;
  const unit = H / top;
  const grid = Array.from({ length: top / 2 + 1 }, (_, k) => `<line x1="40" x2="380" y1="${220 - k * 2 * unit}" y2="${220 - k * 2 * unit}" stroke="#d8e1ec"/><text x="32" y="${224 - k * 2 * unit}" text-anchor="end" font-size="12" fill="#56627a">${k * 2}</text>`).join('');
  const rects = counts.map((c, i) => `<rect class="sc-bar" data-i="${i}" x="${60 + i * 82}" y="${220 - c * unit}" width="56" height="${c * unit}" rx="4" fill="${COLORS[i]}"/>`).join('');
  return `<svg viewBox="0 0 400 230" aria-hidden="true" focusable="false">${grid}<line x1="40" x2="40" y1="20" y2="220" stroke="#56627a" stroke-width="2"/><line x1="40" x2="380" y1="220" y2="220" stroke="#56627a" stroke-width="2"/>${rects}</svg>`;
}

function barChart(topic, counts, top) {
  return h('div', { class: 'c-model sc-bars' }, h('p', { class: 'sc-title' }, topic.title),
    h('div', { class: 'sc-chart', role: 'img', 'aria-label': `${topic.title} ${topic.items.map((it, i) => `${topic.names[it]} : ${counts[i]}`).join(', ')}`, html: bars(topic, counts, top) }),
    h('div', { class: 'sc-keys' }, topic.items.map((it) => h('span', { html: picto(it, 40) }))));
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let hintStep;
  let question;
  let built;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  function ask() {
    const q = series[index];
    hintStep = 0;
    question = null;
    clear(root);
    if (q.kind === 'build') return build(q);
    const { topic, counts } = q.survey;
    const model = difficulty === 0 ? pictogram(topic, counts) : barChart(topic, counts, Math.ceil(Math.max(...counts) / 2) * 2 + 2);
    question = choiceQuestion(ctx, {
      model,
      choices: q.kind === 'pick' ? q.options.map((o) => ({ id: o, picto: o, aria: topic.names[o] })) : q.options.map((n) => ({ id: n, text: n, aria: n, className: 'sc-num' })),
      correctId: q.correctId,
      onCorrect: () => answered(q),
    });
    root.append(h('div', { class: 'c-game sc-game' }, seriesDots(series.length, index), question.node));
    ctx.instruct(q.say);
  }

  function answered(q) {
    errors += question.errors;
    ctx.instruct(q.kind === 'pick' ? `Oui, ${q.survey.topic.names[q.correctId]} !` : `Oui, ${q.correctId} !`);
    index += 1;
    ctx.afterSpeech(() => { if (destroyed) return; if (index < series.length) ask(); else finish(); }, 800);
  }

  function build(q) {
    const { topic, counts } = q;
    built = counts.map(() => 0);
    const top = 12;
    const chart = h('div', { class: 'sc-chart', html: bars(topic, built, top) });
    const redraw = () => { chart.innerHTML = bars(topic, built, top); };
    const controls = h('div', { class: 'sc-controls' }, topic.items.map((it, i) => h('div', { class: 'sc-ctl', 'data-i': i },
      h('span', { html: picto(it, 36) }),
      h('button', { class: 'sc-step', 'aria-label': `Monter la barre de ${topic.names[it]}`, onclick: () => { built[i] = Math.min(top, built[i] + 1); redraw(); } }, '+'),
      h('button', { class: 'sc-step', 'aria-label': `Descendre la barre de ${topic.names[it]}`, onclick: () => { built[i] = Math.max(0, built[i] - 1); redraw(); } }, '−'))));
    const table = h('table', { class: 'sc-table' }, h('caption', {}, topic.title),
      h('tbody', {}, topic.items.map((it, i) => h('tr', {}, h('th', { scope: 'row' }, h('span', { html: picto(it, 28) }), ` ${topic.names[it]}`), h('td', {}, String(counts[i]))))));
    const check = h('button', { class: 'btn big', onclick: () => verify(q, controls) }, 'Vérifier');
    root.append(h('div', { class: 'c-game sc-game' }, seriesDots(series.length, index), table, h('div', { class: 'c-model sc-bars' }, chart, controls), check));
    ctx.instruct('Voici les réponses du sondage dans le tableau. Construis le diagramme : monte chaque barre jusqu’au bon nombre, puis touche « Vérifier ».');
  }

  function verify(q, controls) {
    const wrong = wrongBars(q.counts, built);
    controls.querySelectorAll('.sc-ctl').forEach((el) => el.classList.remove('bad'));
    if (wrong.length) {
      errors += 1;
      ctx.sfx('soft');
      wrong.forEach((i) => { const el = controls.querySelector(`.sc-ctl[data-i="${i}"]`); el.classList.add('bad'); shake(el, ctx.reducedMotion); });
      ctx.instruct(wrong.length === 1 ? 'Presque ! Une barre n’est pas à la bonne hauteur : regarde le tableau.' : `${wrong.length} barres ne sont pas à la bonne hauteur. Regarde le tableau.`);
      return;
    }
    ctx.sfx('good');
    ctx.instruct('Bravo, ton diagramme est juste !');
    index += 1;
    root.querySelector('.c-game > .btn')?.remove();
    root.querySelector('.c-game').append(continueButton(index < series.length ? 'Sondage suivant' : 'Terminer', () => { if (destroyed) return; if (index < series.length) ask(); else finish(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { topics: series.map((q) => (q.topic ?? q.survey.topic).id) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      const q = series?.[index];
      if (!q) return;
      hints += 1;
      if (q.kind === 'build') {
        const wrong = wrongBars(q.counts, built);
        if (wrong.length) root.querySelector(`.sc-ctl[data-i="${wrong[0]}"]`)?.classList.add('glow');
        ctx.instruct(wrong.length ? `Regarde la barre de ${q.topic.names[q.topic.items[wrong[0]]]} : elle doit monter jusqu’à ${q.counts[wrong[0]]}.` : 'Toutes les barres sont justes : touche « Vérifier ».');
        return;
      }
      if (hintStep === 0 && q.kind === 'count') {
        const target = q.survey.topic.items.findIndex((it) => q.say.includes(q.survey.topic.names[it]));
        if (target >= 0) root.querySelectorAll(`[data-i="${target}"]`).forEach((el) => el.classList.add('sc-focus'));
        else question.hint();
      } else question.hint();
      hintStep += 1;
    },
    repeat() { const q = series?.[index]; if (q) ctx.instruct(q.kind === 'build' ? 'Monte chaque barre jusqu’au nombre du tableau, puis touche « Vérifier ».' : q.say); },
    destroy() { destroyed = true; clear(root); },
  };
}
