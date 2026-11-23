/**
 * Le laboratoire des mécanismes (jeu 27) : leviers, poulies, engrenages dessinés. On choisit une réponse, puis
 * le mécanisme s'anime pour montrer pourquoi (le rocher se soulève, les roues tournent). L'indice retire un mauvais choix.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { gearDirection, makeSeries, SIMPLIFICATIONS } from './rules.js';

const svgBox = (inner, label, cls = '') => h('div', { class: `k-svg ${cls}`, role: 'img', 'aria-label': label, html: `<svg viewBox="0 0 400 200" aria-hidden="true" focusable="false">${inner}</svg>` });

function leverArt(t, f = null) {
  // Planche de 10 cases (x 40 → 360) ; rocher à gauche, enfant à droite.
  const fx = f === null ? null : 40 + f * 32;
  const fulcrum = fx === null ? '' : `<path d="M${fx - 16} 170L${fx} 140L${fx + 16} 170z" fill="#8a5a2b"/>`;
  return `<line x1="20" y1="170" x2="380" y2="170" stroke="#c9b48a" stroke-width="6"/>${fulcrum}<g class="k-plank"><rect x="40" y="128" width="320" height="12" rx="4" fill="#c98a4b"/>`
    + `<g transform="translate(46 80)"><path d="M0 48q-4-30 22-40q30-8 40 18q8 22-10 22z" fill="#8a93a6"/></g><text x="74" y="118" font-size="14" font-weight="700" fill="#23324d">${t.weight === 3 ? 'caisse' : ''}</text>`
    + '<g transform="translate(330 70)"><circle cx="10" cy="10" r="10" fill="#c98a4b"/><rect x="2" y="20" width="16" height="30" rx="7" fill="#ef5f95"/></g></g>';
}

function pulleyArt(t) {
  const sys = (x, ropes, label) => `<g transform="translate(${x} 0)"><rect x="-40" y="10" width="80" height="8" fill="#5b6b85"/><circle cx="0" cy="34" r="14" fill="#8a93a6"/>`
    + `${Array.from({ length: ropes }, (_, i) => `<line x1="${-12 + i * (24 / Math.max(1, ropes - 1))}" y1="34" x2="${-12 + i * (24 / Math.max(1, ropes - 1))}" y2="130" stroke="#c98a4b" stroke-width="3"/>`).join('')}`
    + `<rect x="-22" y="130" width="44" height="34" rx="6" fill="#a8683a"/><text x="0" y="152" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${t.weight ?? ''}${t.weight ? ' kg' : ''}</text>`
    + `<text x="0" y="190" text-anchor="middle" font-size="13" font-weight="700" fill="#23324d">${label}</text></g>`;
  return sys(70, 1, '1 brin') + sys(200, 2, '2 brins') + sys(330, 4, '4 brins');
}

function gearsArt(t, spin = false) {
  const n = t.kind === 'gear-speed' ? 2 : t.count;
  const sizes = t.kind === 'gear-speed' ? [60, 30] : Array.from({ length: n }, () => 34);
  let x = t.kind === 'gear-speed' ? 120 : 200 - ((n - 1) * 68) / 2;
  let out = '';
  sizes.forEach((r, i) => {
    if (i > 0) x += sizes[i - 1] + r - 4;
    const dir = i % 2 === 0 ? 1 : -1;
    const teeth = Math.round(r / 3);
    const cogs = Array.from({ length: teeth }, (_, k) => `<rect x="-4" y="${-r - 6}" width="8" height="10" rx="2" transform="rotate(${(360 / teeth) * k})"/>`).join('');
    const speed = t.kind === 'gear-speed' ? (i === 0 ? 4 : 4 * (sizes[1] / sizes[0])) : 3;
    out += `<g transform="translate(${x} 100)"><g class="${spin ? 'k-spin' : ''}" style="animation-duration:${speed}s;animation-direction:${dir === 1 ? 'normal' : 'reverse'}" fill="${i === 0 ? '#1fb3c6' : i === sizes.length - 1 ? '#ef5f95' : '#f5c046'}">${cogs}<circle r="${r}"/><circle r="${r * 0.3}" fill="#fff"/></g></g>`;
  });
  return out;
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let question;
  let errors;
  let hints;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  const cur = () => series[index];

  function art(t, solved = false) {
    if (t.kind.startsWith('lever')) {
      const f = t.kind === 'lever-fulcrum' ? (solved ? t.options.find((o) => o.id === t.correctId).f : null) : t.kind === 'lever-middle' ? 5 : 2;
      return svgBox(leverArt(t, f), 'Une planche posée sur un point d’appui, un rocher d’un côté, un enfant de l’autre.', solved && t.kind !== 'lever-middle' ? 'lifted' : '');
    }
    if (t.kind.startsWith('pulley')) return svgBox(pulleyArt(t), 'Trois systèmes de poulies : 1 brin, 2 brins, 4 brins.');
    return svgBox(gearsArt(t, solved), `${t.kind === 'gear-speed' ? 2 : t.count} roues dentées qui se touchent.`);
  }

  function ask() {
    const t = cur();
    question = choiceQuestion(ctx, { model: art(t), choices: t.options.map((o) => ({ id: o.id, text: o.label, aria: o.label, className: 'long' })), correctId: t.correctId, layout: 'list', onCorrect: solved });
    clear(root);
    root.append(h('div', { class: 'c-game mechanics' }, seriesDots(series.length, index), question.node));
    ctx.instruct(t.prompt);
  }

  function why(t) {
    if (t.kind === 'lever-fulcrum') return 'Plus le point d’appui est près du rocher, plus le côté de l’enfant est long : une petite force soulève un gros poids.';
    if (t.kind === 'lever-push') return 'Plus on appuie loin du point d’appui, moins il faut de force.';
    if (t.kind === 'lever-middle') return 'Au milieu, les deux côtés sont aussi longs : il faudrait une force aussi grande que le poids du rocher. Il faut rapprocher le point d’appui du rocher.';
    if (t.kind === 'pulley') return `Avec ${t.options.find((o) => o.id === t.correctId).ropes} brins, chaque brin porte une part du poids : il suffit de ${t.weight / Number(t.correctId)} kg de force.`;
    if (t.kind === 'pulley-fixed') return 'La poulie fixe change le sens de la force : on tire vers le bas, c’est plus facile avec son propre poids.';
    if (t.kind === 'gear-direction') return `Deux roues qui se touchent tournent en sens contraire : avec ${t.count} roues, la dernière tourne ${gearDirection(t.count) === 1 ? 'dans le même sens' : 'dans l’autre sens'}.`;
    return `Chaque dent de la grande roue pousse une dent de la petite : ${t.big} dents, c’est ${t.big / t.small} fois ${t.small} dents.`;
  }

  function solved() {
    errors += question.errors;
    const t = cur();
    const model = root.querySelector('.k-svg');
    model.replaceWith(art(t, true));
    const text = why(t);
    ctx.instruct(text);
    index += 1;
    const next = index < series.length ? ask : finish;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton(index < series.length ? 'Expérience suivante' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { tasks: series.map((t) => t.kind) } });
    if (!destroyed) {
      ctx.celebrate(newSeries, `Simplifié pour le jeu : ${SIMPLIFICATIONS[0].toLowerCase()}`);
    }
  }

  newSeries();

  return {
    hint() { if (question) { hints += 1; question.hint(); } },
    repeat() { if (series) ctx.instruct(cur().prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
