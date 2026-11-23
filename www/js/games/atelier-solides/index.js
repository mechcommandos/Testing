/**
 * L'atelier des solides (jeu 49) : reconnaître cube, pavé, boule, cylindre, cône et pyramide, les retrouver dans des
 * objets de tous les jours, puis découvrir leurs faces, leurs sommets et ceux qui roulent. Dessins en perspective
 * simple, sans texte (le nom est sous la carte).
 */
import { h } from '../../ui/dom.js';
import { quizGame } from '../quiz.js';
import { makeSeries, OBJECTS, SOLIDS } from './rules.js';

const S = '#23324d';
const svg = (inner, size = 84) => `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${inner}</svg>`;

export const SOLID_ART = {
  cube: `<path d="M22 36l28-14 28 14v34l-28 14-28-14z" fill="#5aa9f0" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M22 36l28 14 28-14M50 50v34" fill="none" stroke="${S}" stroke-width="3"/><path d="M22 36l28-14 28 14-28 14z" fill="#8cc6f7"/><path d="M22 36l28-14 28 14-28 14z" fill="none" stroke="${S}" stroke-width="3" stroke-linejoin="round"/>`,
  pave: `<path d="M10 40l46-12 34 12v28l-46 14-34-14z" fill="#f5b82e" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M10 40l46-12 34 12-46 12z" fill="#ffd775" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M44 52v30" stroke="${S}" stroke-width="3"/>`,
  boule: `<circle cx="50" cy="52" r="34" fill="#ef5f95" stroke="${S}" stroke-width="3"/><ellipse cx="50" cy="52" rx="34" ry="10" fill="none" stroke="${S}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".5"/><circle cx="38" cy="38" r="8" fill="#fff" opacity=".45"/>`,
  cylindre: `<path d="M24 26v48a26 9 0 0 0 52 0V26" fill="#3aa65b" stroke="${S}" stroke-width="3"/><ellipse cx="50" cy="26" rx="26" ry="9" fill="#7fd08f" stroke="${S}" stroke-width="3"/>`,
  cone: `<path d="M50 12L24 76a26 9 0 0 0 52 0z" fill="#8b6fe8" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M24 76a26 9 0 0 1 52 0" fill="none" stroke="${S}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".6"/>`,
  pyramide: `<path d="M50 12L14 70l30 16 42-18z" fill="#e9c46a" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M50 12L44 86" stroke="${S}" stroke-width="3"/><path d="M50 12L44 86l42-18z" fill="#d4a93f" stroke="${S}" stroke-width="3" stroke-linejoin="round"/>`,
};

export const OBJECT_ART = {
  de: `${SOLID_ART.cube.replace(/#5aa9f0/g, '#fff').replace(/#8cc6f7/g, '#f4f6fa')}<circle cx="50" cy="36" r="3.5" fill="${S}"/><circle cx="35" cy="56" r="3.5" fill="${S}"/><circle cx="36" cy="70" r="3.5" fill="${S}"/><circle cx="64" cy="54" r="3.5" fill="${S}"/><circle cx="64" cy="68" r="3.5" fill="${S}"/>`,
  boite: `${SOLID_ART.pave.replace(/#f5b82e/g, '#c98a4b').replace(/#ffd775/g, '#e2ab6d')}<path d="M22 64l16 6" stroke="#fff" stroke-width="3"/>`,
  orange: `<circle cx="50" cy="54" r="32" fill="#f59a23" stroke="${S}" stroke-width="3"/><path d="M50 22q4-10 14-10q-2 10-14 10z" fill="#3aa65b" stroke="${S}" stroke-width="2"/><circle cx="40" cy="44" r="2" fill="#c96f0f"/><circle cx="58" cy="60" r="2" fill="#c96f0f"/><circle cx="46" cy="70" r="2" fill="#c96f0f"/>`,
  canette: `${SOLID_ART.cylindre.replace('#3aa65b', '#e5484d').replace('#7fd08f', '#d9dde6')}<path d="M24 46h52v14H24z" fill="#fff" opacity=".8"/>`,
  cornet: `<path d="M30 40l20 50 20-50z" fill="#e2ab6d" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M36 50l20 16M42 66l12-10M34 44l30 8" stroke="#b07a3f" stroke-width="2"/><circle cx="50" cy="32" r="20" fill="#f7c6d9" stroke="${S}" stroke-width="3"/>`,
  tente: `<path d="M50 14L12 80h76z" fill="#1fb3c6" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M50 14L62 80" stroke="${S}" stroke-width="3"/><path d="M50 46l-10 34h20z" fill="#23324d"/>`,
  brique: `${SOLID_ART.pave.replace(/#f5b82e/g, '#fff').replace(/#ffd775/g, '#eaf3fb').replace('M10 40l46-12 34 12v28l-46 14-34-14z', 'M28 30l24-8 22 8v52l-24 8-22-8z').replace('M10 40l46-12 34 12-46 12z', 'M28 30l24-8 22 8-24 8z').replace('M44 52v30', 'M50 38v52')}<path d="M32 52h14v14H32z" fill="#1a56b8"/>`,
  bille: `<circle cx="50" cy="54" r="24" fill="#1fb3c6" stroke="${S}" stroke-width="3"/><path d="M34 50q16-12 32 4" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/><circle cx="42" cy="44" r="5" fill="#fff" opacity=".6"/>`,
  bougie: `${SOLID_ART.cylindre.replace('#3aa65b', '#fff4d6').replace('#7fd08f', '#ffe9a8')}<path d="M50 26v-10" stroke="${S}" stroke-width="3"/><path d="M50 4q8 8 0 14q-8-6 0-14z" fill="#f59a23"/>`,
  chapeau: `${SOLID_ART.cone.replace('#8b6fe8', '#ef5f95')}<circle cx="50" cy="12" r="6" fill="#f5b82e" stroke="${S}" stroke-width="2"/><path d="M38 46l24-6M32 62l36-8" stroke="#fff" stroke-width="4"/>`,
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const solidName = (id) => SOLIDS[id].name.replace(/^(le |la )/, '');

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'so-game',
    view: (q) => {
      const cards = q.kind === 'property' && /^\d+$/.test(q.answer)
        ? q.options.map((n) => ({ id: n, text: n, aria: n, className: 'letter' }))
        : q.options.map((id) => ({ id, html: svg(SOLID_ART[id]), text: solidName(id), aria: SOLIDS[id].name }));
      if (q.kind === 'name') {
        return {
          say: `Touche ${SOLIDS[q.answer].name}.`,
          choices: cards,
          explain: `Oui, c’est ${SOLIDS[q.answer].name} !`,
          hint: `Cherche ${SOLIDS[q.answer].name}.`,
        };
      }
      if (q.kind === 'object') {
        const o = OBJECTS[q.object];
        return {
          say: `${cap(o.name)} ressemble à quel solide ?`,
          model: h('div', { class: 'c-model so-model' }, h('span', { html: svg(OBJECT_ART[q.object], 120) }), h('strong', {}, cap(o.name))),
          choices: cards,
          explain: `Oui : ${o.name} a la forme d’${SOLIDS[q.answer].name.startsWith('la ') ? 'une' : 'un'} ${solidName(q.answer)}.`,
          hint: 'Regarde ses faces : sont-elles plates ou arrondies ? A-t-il une pointe ?',
        };
      }
      return {
        say: q.say,
        model: /^\d+$/.test(q.answer) ? h('div', { class: 'c-model so-model' }, h('span', { html: svg(SOLID_ART[/pyramide/.test(q.say) ? 'pyramide' : 'cube'], 120) })) : null,
        choices: cards,
        explain: `Oui ! ${q.why}`,
        hint: 'Imagine que tu tiens le solide dans tes mains et que tu le fais tourner.',
      };
    },
  });
}
