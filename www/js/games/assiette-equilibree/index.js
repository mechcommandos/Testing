/**
 * L'assiette équilibrée (jeu 53) : reconnaître les familles d'aliments, compléter un repas, et distinguer ce qu'on
 * mange tous les jours de ce qu'on garde pour de temps en temps. Les aliments sans image dans la bibliothèque sont
 * dessinés ici, dans le même style.
 */
import { h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { quizGame } from '../quiz.js';
import { FAMILIES, FOODS, makeSeries } from './rules.js';

const S = '#23324d';
const DRAWN = {
  brocoli: `<path d="M44 58h12l4 30H40z" fill="#7fbf5a" stroke="${S}" stroke-width="3"/><circle cx="34" cy="44" r="16" fill="#3aa65b" stroke="${S}" stroke-width="3"/><circle cx="66" cy="44" r="16" fill="#3aa65b" stroke="${S}" stroke-width="3"/><circle cx="50" cy="30" r="18" fill="#4fbb68" stroke="${S}" stroke-width="3"/>`,
  pain: `<path d="M12 62q0-30 38-30t38 30q0 16-38 16T12 62z" fill="#e2ab6d" stroke="${S}" stroke-width="3"/><path d="M30 46l8 10M46 42l8 10M62 44l8 10" stroke="#b07a3f" stroke-width="4" stroke-linecap="round"/>`,
  pates: `<path d="M14 50h72q-4 30-36 30T14 50z" fill="#fff" stroke="${S}" stroke-width="3"/><path d="M22 50q6-14 12 0q6-14 12 0q6-14 12 0q6-14 12 0q6-14 10 0" fill="#f7d774" stroke="#c99a04" stroke-width="3"/>`,
  riz: `<path d="M14 50h72q-4 30-36 30T14 50z" fill="#fff" stroke="${S}" stroke-width="3"/><path d="M20 50q30-22 60 0z" fill="#fbfbf3" stroke="#c4cedb" stroke-width="2"/><g fill="#d9dde6"><ellipse cx="38" cy="44" rx="3" ry="1.6"/><ellipse cx="50" cy="40" rx="3" ry="1.6"/><ellipse cx="60" cy="45" rx="3" ry="1.6"/><ellipse cx="46" cy="47" rx="3" ry="1.6"/></g>`,
  lait: `<path d="M32 28l18-10 18 10v58H32z" fill="#fff" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M32 28h36" stroke="${S}" stroke-width="3"/><path d="M32 52h36v16H32z" fill="#5aa9f0"/>`,
  yaourt: `<path d="M28 34h44l-6 50H34z" fill="#fff" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><rect x="24" y="26" width="52" height="10" rx="3" fill="#ef5f95" stroke="${S}" stroke-width="3"/><circle cx="50" cy="60" r="8" fill="#f7c6d9"/>`,
  fromage: `<path d="M14 66l60-30 14 8v26H14z" fill="#f5c84a" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M14 66h74" stroke="${S}" stroke-width="3"/><circle cx="36" cy="72" r="4" fill="#d9a520"/><circle cx="62" cy="58" r="5" fill="#d9a520"/><circle cx="74" cy="72" r="3" fill="#d9a520"/>`,
  oeuf: `<ellipse cx="50" cy="56" rx="38" ry="26" fill="#fff" stroke="${S}" stroke-width="3"/><circle cx="50" cy="56" r="13" fill="#f5b82e"/>`,
  poulet: `<path d="M30 30q20-14 38 0q12 14 2 30L46 80q-8 4-12-4l-2-10q-14-16-2-36z" fill="#c98a4b" stroke="${S}" stroke-width="3"/><path d="M36 72l-12 14" stroke="#fff4d6" stroke-width="7" stroke-linecap="round"/><circle cx="22" cy="88" r="5" fill="#fff4d6" stroke="${S}" stroke-width="2"/>`,
  bonbons: `<g stroke="${S}" stroke-width="2.5"><path d="M18 40l-10-8v18zM50 40l10-8v18z" fill="#ef5f95"/><ellipse cx="34" cy="40" rx="16" ry="11" fill="#ef5f95"/><path d="M44 66l-10-8v18zM76 66l10-8v18z" fill="#1fb3c6"/><ellipse cx="60" cy="66" rx="16" ry="11" fill="#1fb3c6"/></g>`,
  soda: `<path d="M34 22h32l-4 66H38z" fill="#c0392b" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M36 44h28v16H36z" fill="#fff" opacity=".85"/><path d="M58 22l8-14" stroke="${S}" stroke-width="3"/>`,
  eau: `<path d="M40 12h20v10q12 6 12 20v44H28V42q0-14 12-20z" fill="#dff1fb" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M28 58h44v28H28z" fill="#8cc6f7"/><rect x="40" y="6" width="20" height="8" rx="2" fill="#1a56b8"/>`,
};

const art = (id, size = 64) => (FOODS[id].picto ? picto(FOODS[id].picto, size) : `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${DRAWN[id]}</svg>`);
const short = (id) => FOODS[id].name.replace(/^(le |la |les |l’)/, '');
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function plateArt(foods) {
  return h('div', { class: 'ae-plate', role: 'img', 'aria-label': `Dans l’assiette : ${foods.map((f) => FOODS[f].name).join(', ')}` },
    foods.map((f) => h('span', { class: 'ae-food', html: art(f, 70) })), h('span', { class: 'ae-free', 'aria-hidden': 'true' }, '?'));
}

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'ae-game',
    view: (q) => {
      const food = (id) => ({ id, html: art(id), text: short(id), aria: FOODS[id].name });
      if (q.kind === 'family') {
        return {
          say: `Touche ${FAMILIES[q.family].one}.`,
          choices: q.options.map(food),
          explain: `Oui : ${FOODS[q.answer].name}, c’est dans la famille ${FAMILIES[q.family].of}.`,
          hint: q.family === 'laitiers' ? 'Cherche ce qui est fait avec du lait.' : q.family === 'feculents' ? 'Cherche le pain, les pâtes ou le riz.' : q.family === 'proteines' ? 'Cherche la viande, le poisson ou l’œuf.' : 'Cherche ce qui pousse dans un jardin ou sur un arbre.',
        };
      }
      if (q.kind === 'meal') {
        const plate = plateArt(q.plate);
        return {
          say: `Dans l’assiette, il y a ${q.plate.map((f) => FOODS[f].name).join(' et ')}. Qu’ajouter pour que le repas soit équilibré ?`,
          model: h('div', { class: 'c-model ae-model' }, plate),
          choices: q.options.map(food),
          explain: `Oui : avec ${FOODS[q.answer].name}, le repas a un fruit ou un légume, un féculent, et de la viande, du poisson ou un œuf.`,
          hint: `Il manque ${FAMILIES[q.missing].one}.`,
          onSolved: () => { plate.querySelector('.ae-free')?.replaceWith(h('span', { class: 'ae-food ae-new', html: art(q.answer, 70) })); },
        };
      }
      if (q.kind === 'often') {
        const daily = q.answer === 'daily';
        return {
          say: `${cap(FOODS[q.food].name)} : on en mange tous les jours, ou de temps en temps ?`,
          model: h('div', { class: 'c-model ae-model' }, h('span', { html: art(q.food, 110) }), h('strong', {}, cap(short(q.food)))),
          choices: [{ id: 'daily', text: 'Tous les jours', aria: 'Tous les jours' }, { id: 'sometimes', text: 'De temps en temps', aria: 'De temps en temps' }],
          explain: q.food === 'eau' ? 'Oui : l’eau, c’est la boisson de tous les jours, à chaque repas et quand on a soif.'
            : daily ? `Oui : ${FOODS[q.food].name}, on peut en manger tous les jours.` : `Oui : ${FOODS[q.food].name}, c’est très sucré. On le garde pour de temps en temps, pour se faire plaisir.`,
          hint: 'Les produits très sucrés, on les garde pour les fêtes et les petits plaisirs.',
        };
      }
      return {
        say: 'Quel goûter est le plus équilibré ?',
        choices: q.options.map((i) => {
          const pair = q.snacks[Number(i)];
          return { id: i, html: `<span class="ae-pair">${pair.map((f) => art(f, 56)).join('')}</span>`, text: pair.map(short).join(' + '), aria: pair.map((f) => FOODS[f].name).join(' et ') };
        }),
        explain: `Oui : ${q.snacks[0].map((f) => FOODS[f].name).join(' et ')}, c’est un goûter qui donne de l’énergie sans trop de sucre.`,
        hint: 'Cherche le goûter avec un fruit, du pain ou un produit laitier.',
      };
    },
  });
}
