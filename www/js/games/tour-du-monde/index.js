/**
 * Le tour du monde (jeu 52) : une carte du monde simplifiée (contours approximatifs, dessinés pour Layjou).
 * Reconnaître un continent, puis dire où vivent des animaux et où se trouvent des monuments ; après la bonne réponse,
 * le continent s'allume sur la carte.
 */
import { h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { quizGame } from '../quiz.js';
import { CONTINENTS, makeSeries, short } from './rules.js';

/** Contours en [longitude, latitude], très simplifiés. */
const SHAPES = {
  'amerique-nord': [
    [[-165, 65], [-150, 71], [-120, 72], [-95, 70], [-80, 63], [-65, 60], [-55, 50], [-70, 43], [-76, 35], [-81, 25], [-97, 26], [-97, 18], [-88, 15], [-80, 8], [-90, 14], [-105, 20], [-112, 30], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
    [[-55, 60], [-45, 60], [-20, 70], [-20, 80], [-60, 82], [-72, 77], [-60, 70]],
  ],
  'amerique-sud': [[[-80, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -42], [-68, -55], [-75, -50], [-73, -35], [-71, -18], [-81, -5], [-78, 2]]],
  europe: [
    [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [-2, 50], [5, 52], [8, 57], [5, 62], [15, 69], [28, 71], [40, 67], [60, 68], [60, 55], [50, 47], [40, 47], [30, 45], [28, 41], [23, 38], [20, 40], [15, 38], [12, 44], [8, 44], [3, 43], [-5, 36]],
    [[-6, 50], [2, 51], [0, 55], [-3, 58], [-6, 56]],
  ],
  afrique: [
    [[-17, 15], [-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [41, -2], [40, -15], [35, -25], [28, -34], [18, -34], [12, -17], [9, -1], [9, 4], [-8, 4], [-15, 10]],
    [[44, -13], [50, -15], [47, -25], [43, -22]],
  ],
  asie: [
    [[60, 68], [80, 73], [110, 77], [140, 72], [170, 68], [180, 66], [180, 62], [160, 60], [155, 50], [140, 45], [130, 35], [122, 30], [120, 22], [108, 20], [105, 10], [100, 2], [98, 10], [92, 22], [80, 8], [73, 18], [67, 25], [57, 25], [52, 15], [43, 12], [35, 28], [36, 36], [28, 41], [30, 45], [40, 47], [50, 47], [60, 55]],
    [[130, 31], [142, 40], [141, 45], [135, 35]],
    [[95, 5], [105, -6], [120, -9], [140, -8], [130, -2], [118, 4], [108, 1]],
  ],
  oceanie: [
    [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -31], [116, -35], [114, -26]],
    [[172, -35], [178, -38], [174, -41], [167, -46], [170, -44]],
  ],
  antarctique: [[[-180, -66], [-120, -72], [-60, -64], [0, -69], [60, -66], [120, -66], [180, -67], [180, -78], [-180, -78]]],
};

const X = (lon) => ((lon + 180) * 2).toFixed(0);
const Y = (lat) => ((84 - lat) * 2).toFixed(0);
const path = (rings) => rings.map((r) => `M${r.map(([lo, la]) => `${X(lo)} ${Y(la)}`).join('L')}z`).join('');

function map(highlight = null, glow = false) {
  const shapes = Object.entries(SHAPES).map(([id, rings]) => {
    const on = id === highlight;
    return `<path d="${path(rings)}" fill="${on ? (glow ? '#2f8f5b' : '#ef5f95') : '#e6dcc0'}" stroke="${on ? '#23324d' : '#b9ab88'}" stroke-width="${on ? 2.5 : 1.2}" stroke-linejoin="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 720 330" aria-hidden="true" focusable="false"><rect width="720" height="330" rx="18" fill="#bfe3f5"/>${shapes}</svg>`;
}

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'tm-game',
    view: (q) => {
      const art = h('div', { class: 'tm-map', html: map(q.kind === 'map' ? q.answer : null) });
      const choices = q.options.map((c) => ({ id: c, text: short(c), aria: short(c), className: 'long' }));
      const lightUp = () => { art.innerHTML = map(q.answer, true); };
      if (q.kind === 'map') {
        return {
          say: 'Quel est le continent colorié en rose sur la carte ?',
          model: h('div', { class: 'c-model tm-model', role: 'img', 'aria-label': 'Carte du monde, un continent en rose' }, art),
          choices,
          layout: 'list',
          explain: `Oui, c’est ${CONTINENTS[q.answer]} !`,
          hint: 'Repère d’abord l’Europe, en haut au milieu de la carte : c’est là que se trouve la France.',
          onSolved: lightUp,
        };
      }
      const it = q.item;
      const animal = q.kind === 'animal';
      return {
        say: animal ? `Sur quel continent vit ${it.name} à l’état sauvage ?` : `Sur quel continent se trouve ${it.name} ?`,
        model: h('div', { class: 'c-model tm-model' }, art,
          h('p', { class: 'tm-item' }, it.picto ? h('span', { 'aria-hidden': 'true', html: picto(it.picto, 56) }) : null, h('strong', {}, it.name.replace(/^./, (c) => c.toUpperCase())))),
        choices,
        layout: 'list',
        explain: `Oui : ${CONTINENTS[q.answer]}. ${it.fact}`,
        hint: animal ? 'Pense au climat : la savane, la glace, la forêt de bambous…' : 'Pense au pays où se trouve ce lieu.',
        onSolved: lightUp,
      };
    },
  });
}
