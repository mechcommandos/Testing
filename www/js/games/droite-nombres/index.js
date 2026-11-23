/**
 * La droite des nombres (jeu 45) : lire le nombre montré par la flèche, ou trouver où se trouve un nombre.
 * Après la bonne réponse, le nombre s'écrit sur la droite à sa place.
 */
import { h } from '../../ui/dom.js';
import { quizGame } from '../quiz.js';
import { makeSeries } from './rules.js';

const L = 30;
const R = 570;

function line(range, { arrow = null, marks = [], shown = null } = {}) {
  const x = (v) => L + ((R - L) * v) / range.max;
  let svg = `<line x1="${L - 10}" x2="${R + 14}" y1="70" y2="70" stroke="#23324d" stroke-width="3"/><path d="M${R + 14} 64l10 6-10 6z" fill="#23324d"/>`;
  if (range.minor) for (let v = range.minor; v < range.max; v += range.step) svg += `<line x1="${x(v)}" x2="${x(v)}" y1="64" y2="76" stroke="#8a97ab" stroke-width="2"/>`;
  for (let v = 0; v <= range.max; v += range.step) svg += `<line x1="${x(v)}" x2="${x(v)}" y1="58" y2="82" stroke="#23324d" stroke-width="3"/>`;
  for (const v of range.labels) svg += `<text x="${x(v)}" y="106" text-anchor="middle" font-size="20" font-weight="800" fill="#23324d" font-family="Verdana, sans-serif">${v}</text>`;
  if (arrow !== null) svg += `<g class="dn-arrow"><path d="M${x(arrow)} 54l-11-18h22z" fill="#ef5f95"/><rect x="${x(arrow) - 4}" y="14" width="8" height="24" rx="3" fill="#ef5f95"/></g>`;
  for (const m of marks) svg += `<g><circle cx="${x(m.value)}" cy="32" r="17" fill="#1a56b8"/><text x="${x(m.value)}" y="39" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" font-family="Verdana, sans-serif">${m.letter}</text><line x1="${x(m.value)}" x2="${x(m.value)}" y1="49" y2="60" stroke="#1a56b8" stroke-width="3"/></g>`;
  if (shown !== null) svg += `<text x="${x(shown)}" y="106" text-anchor="middle" font-size="20" font-weight="800" fill="#2f8f5b" font-family="Verdana, sans-serif">${shown}</text>`;
  return `<svg viewBox="0 0 600 116" aria-hidden="true" focusable="false">${svg}</svg>`;
}

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'dn-game',
    view: (q) => {
      const step = q.range.minor ? `Les grands traits vont de ${q.range.step} en ${q.range.step}, les petits sont au milieu.` : `Chaque trait ajoute ${q.range.step}.`;
      const art = h('div', { class: 'dn-line', role: 'img', 'aria-label': `Droite graduée de 0 à ${q.range.max}`, html: q.kind === 'read' ? line(q.range, { arrow: q.value }) : line(q.range, { marks: q.marks }) });
      const solved = () => { art.innerHTML = line(q.range, { arrow: q.kind === 'read' ? q.value : null, marks: q.kind === 'place' ? q.marks : [], shown: q.value }); };
      if (q.kind === 'read') {
        return {
          say: 'Quel nombre montre la flèche rose ?',
          model: h('div', { class: 'c-model dn-model' }, art),
          choices: q.options.map((n) => ({ id: n, text: n, aria: n, className: 'dn-num' })),
          explain: `Oui, la flèche montre ${q.value}. ${step}`,
          hint: step,
          onSolved: solved,
        };
      }
      return {
        say: `Où se trouve le nombre ${q.value} : au repère A, B ou C ?`,
        model: h('div', { class: 'c-model dn-model' }, art, h('p', { class: 'dn-target' }, `Où est ${q.value} ?`)),
        choices: q.marks.map((m) => ({ id: m.letter, text: m.letter, aria: `Repère ${m.letter}`, className: 'letter' })),
        explain: `Oui, ${q.value} est au repère ${q.answer}. ${step}`,
        hint: `Pars de 0 ou du nombre écrit le plus proche, et compte les traits. ${step}`,
        onSolved: solved,
      };
    },
  });
}
