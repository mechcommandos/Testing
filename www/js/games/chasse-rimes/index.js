/**
 * La chasse aux rimes (jeu 46) : écouter des mots et trouver celui qui rime, celui qui commence pareil, ou compter
 * les syllabes. Tous les mots sont dits à voix haute ; les images aident l'enfant qui ne lit pas encore.
 */
import { h } from '../../ui/dom.js';
import { app } from '../../ui/state.js';
import { picto } from '../../ui/pictos.js';
import { quizGame } from '../quiz.js';
import { makeSeries, SYLLABLES, WORDS } from './rules.js';

const card = (id) => h('div', { class: 'c-model cr-model' }, h('span', { class: 'cr-pic', 'aria-hidden': 'true', html: picto(id, 96) }), h('strong', { class: 'cr-word' }, WORDS[id]));

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries: (d, r) => makeSeries(d, r, { sounds: app.activeProfile?.revisions?.sounds ?? [] }),
    className: 'cr-game',
    view: (q) => {
      const t = WORDS[q.target];
      if (q.kind === 'syllables') {
        const parts = SYLLABLES[q.target];
        return {
          say: `${t}. Combien de syllabes entends-tu dans « ${t} » ? Tape dans tes mains à chaque syllabe.`,
          model: card(q.target),
          choices: q.options.map((n) => ({ id: n, text: n, aria: `${n} syllabe${n === '1' ? '' : 's'}`, className: 'letter' })),
          explain: `Oui : ${parts.join(' - ')}. ${parts.length === 1 ? 'Une seule syllabe' : `${parts.length} syllabes`}.`,
          hint: `Écoute bien : ${parts.join('… ')}.`,
          onSolved: (root) => { const w = root.querySelector('.cr-word'); if (w) w.textContent = parts.join(' · '); },
        };
      }
      const list = q.options.map((id) => WORDS[id]).join('… ');
      const rhyme = q.kind === 'rhyme';
      return {
        say: rhyme ? `Quel mot rime avec « ${t} » ? Écoute : ${list}.` : `Quel mot commence par le même son que « ${t} » ? Écoute : ${list}.`,
        model: card(q.target),
        choices: q.options.map((id) => ({ id, picto: id, text: WORDS[id], aria: WORDS[id] })),
        explain: rhyme ? `Oui ! « ${t} » et « ${WORDS[q.answer]} » finissent par le même son : ils riment.` : `Oui ! « ${t} » et « ${WORDS[q.answer]} » commencent par le même son.`,
        hint: rhyme ? `Écoute la fin du mot : ${t}… ${t}.` : `Écoute le début du mot : ${t}… ${t}.`,
      };
    },
  });
}
