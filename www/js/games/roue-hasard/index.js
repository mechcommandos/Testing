/**
 * La roue du hasard (jeu 51) : une roue de cases de couleur et une flèche qui s'arrête au hasard. Certain, possible,
 * impossible ; la couleur la plus probable ; quelle roue donne le plus de chances ; « k chances sur n ».
 * Après la bonne réponse, la roue tourne et s'arrête sur une case (un vrai tirage, juste pour voir).
 */
import { h } from '../../ui/dom.js';
import { quizGame } from '../quiz.js';
import { COLORS, count, makeSeries } from './rules.js';

const LABEL = { certain: 'Certain', possible: 'Possible', impossible: 'Impossible' };
/** Couleur accordée avec « case » (féminin) : une case bleue, des cases vertes. */
const FEM = { rouge: 'rouge', bleu: 'bleue', vert: 'verte', jaune: 'jaune' };
const cases = (c, n) => `${FEM[c]}${n > 1 ? 's' : ''}`;

function wheelSvg(sectors, size = 170, label = '') {
  const n = sectors.length;
  const r = 70;
  let paths = '';
  if (n === 1) paths = `<circle cx="80" cy="80" r="${r}" fill="${COLORS[sectors[0]]}"/>`;
  sectors.forEach((c, i) => {
    if (n === 1) return;
    const a0 = (2 * Math.PI * i) / n - Math.PI / 2;
    const a1 = (2 * Math.PI * (i + 1)) / n - Math.PI / 2;
    const p = (a) => `${(80 + r * Math.cos(a)).toFixed(1)} ${(80 + r * Math.sin(a)).toFixed(1)}`;
    paths += `<path d="M80 80L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}z" fill="${COLORS[c]}" stroke="#fff" stroke-width="2.5"/>`;
  });
  return `<svg viewBox="0 0 160 172" width="${size}" aria-hidden="true" focusable="false"><g class="rh-spin">${paths}</g><circle cx="80" cy="80" r="${r}" fill="none" stroke="#23324d" stroke-width="3"/>`
    + `<path d="M80 4l-9 18h18z" fill="#23324d"/><circle cx="80" cy="80" r="7" fill="#fff" stroke="#23324d" stroke-width="3"/>${label ? `<text x="80" y="168" text-anchor="middle" font-size="18" font-weight="800" fill="#23324d" font-family="Verdana, sans-serif">${label}</text>` : ''}</svg>`;
}

const describe = (sectors) => Object.keys(COLORS).filter((c) => count(sectors, c)).map((c) => `${count(sectors, c)} ${c}`).join(', ');
const chip = (c) => `<svg viewBox="0 0 40 40" width="48" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="${COLORS[c]}" stroke="#23324d" stroke-width="2"/></svg>`;

/** Fait tourner la roue (sauf mouvement réduit) : un tour et demi, puis un arrêt au hasard. */
function spin(root, reducedMotion, random) {
  if (reducedMotion) return;
  for (const g of root.querySelectorAll('.rh-spin')) {
    g.style.transformOrigin = '80px 80px';
    g.style.transition = 'transform 1.6s cubic-bezier(.2,.7,.2,1)';
    requestAnimationFrame(() => { g.style.transform = `rotate(${540 + Math.floor(random() * 360)}deg)`; });
  }
}

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'rh-game',
    view: (q) => {
      const solved = (root) => spin(root, ctx.reducedMotion, ctx.random);
      if (q.kind === 'chance') {
        const k = count(q.sectors, q.color);
        return {
          say: `On fait tourner la roue. Tomber sur le ${q.color}, c’est certain, possible ou impossible ?`,
          model: h('div', { class: 'c-model rh-model' }, h('div', { role: 'img', 'aria-label': `Roue : ${describe(q.sectors)}`, html: wheelSvg(q.sectors) }), h('p', { class: 'rh-ask' }, `Tomber sur le ${q.color} ?`)),
          choices: ['certain', 'possible', 'impossible'].map((id) => ({ id, text: LABEL[id], aria: LABEL[id] })),
          explain: q.answer === 'certain' ? `Oui, c’est certain : toutes les cases sont ${cases(q.color, 2)}.`
            : q.answer === 'impossible' ? `Oui, c’est impossible : il n’y a aucune case ${cases(q.color, 1)} sur la roue.` : `Oui, c’est possible : ${k} case${k > 1 ? 's' : ''} sur ${q.sectors.length} ${k > 1 ? 'sont' : 'est'} ${cases(q.color, k)}, mais pas toutes.`,
          hint: `Cherche les cases ${cases(q.color, 2)} sur la roue : il y en a toutes, quelques-unes, ou aucune ?`,
          onSolved: solved,
        };
      }
      if (q.kind === 'most') {
        return {
          say: 'Sur quelle couleur la flèche a-t-elle le plus de chances de s’arrêter ?',
          model: h('div', { class: 'c-model rh-model' }, h('div', { role: 'img', 'aria-label': `Roue : ${describe(q.sectors)}`, html: wheelSvg(q.sectors) })),
          choices: q.options.map((c) => ({ id: c, html: chip(c), text: c, aria: c })),
          explain: `Oui : le ${q.answer} a le plus de cases (${count(q.sectors, q.answer)} sur ${q.sectors.length}), donc le plus de chances. Mais une autre couleur peut quand même sortir !`,
          hint: 'Compte les cases de chaque couleur.',
          onSolved: solved,
        };
      }
      if (q.kind === 'fraction') {
        return {
          say: `Combien de chances a-t-on de tomber sur le ${q.color} ?`,
          model: h('div', { class: 'c-model rh-model' }, h('div', { role: 'img', 'aria-label': `Roue : ${describe(q.sectors)}`, html: wheelSvg(q.sectors) })),
          choices: q.options.map((o) => ({ id: o, text: o, aria: `${o.replace('sur', 'chances sur')}` })),
          layout: 'list',
          explain: `Oui : ${q.k} case${q.k > 1 ? 's' : ''} ${cases(q.color, q.k)} sur ${q.n} cases en tout, c’est ${q.k} chance${q.k > 1 ? 's' : ''} sur ${q.n}.`,
          hint: `Compte les cases ${cases(q.color, 2)}, puis toutes les cases de la roue.`,
          onSolved: solved,
        };
      }
      const ka = count(q.a, q.color);
      const kb = count(q.b, q.color);
      let why = `La roue A a ${ka} case${ka > 1 ? 's' : ''} ${cases(q.color, ka)} sur ${q.a.length}, la roue B ${kb} sur ${q.b.length}.`;
      if (q.scale) {
        const { small, big, ks, factor } = q.scale;
        why += ` ${ks} sur ${small}, c’est comme ${ks * factor} sur ${big}.`;
      }
      return {
        say: `Avec quelle roue a-t-on le plus de chances de tomber sur le ${q.color} : la roue A ou la roue B ?`,
        model: h('div', { class: 'c-model rh-model rh-two' },
          h('div', { role: 'img', 'aria-label': `Roue A : ${describe(q.a)}`, html: wheelSvg(q.a, 150, 'A') }),
          h('div', { role: 'img', 'aria-label': `Roue B : ${describe(q.b)}`, html: wheelSvg(q.b, 150, 'B') })),
        choices: q.options.map((l) => ({ id: l, text: `Roue ${l}`, aria: `Roue ${l}`, className: 'letter rh-letter' })),
        explain: `Oui, la roue ${q.answer} ! ${why}`,
        hint: q.scale ? 'Les roues n’ont pas le même nombre de cases : imagine que la petite roue soit découpée en autant de cases que la grande.' : 'Les deux roues ont autant de cases : compte les cases de la bonne couleur.',
        onSolved: solved,
      };
    },
  });
}
