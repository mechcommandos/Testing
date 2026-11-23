/**
 * Le tri des homophones (jeu 47) : choisir le mot qui complète la phrase. La phrase est lue à voix haute (les deux
 * mots se prononcent pareil : c'est l'astuce de remplacement qui permet de choisir). L'indice donne l'astuce.
 */
import { h } from '../../ui/dom.js';
import { quizGame } from '../quiz.js';
import { fill, makeSeries, PAIRS, written } from './rules.js';

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'ho-game',
    data: (series) => ({ pairs: [...new Set(series.map((q) => q.pair))] }),
    view: (q) => {
      const [before, after] = q.sentence.split('___');
      const blank = h('span', { class: 'ho-blank' }, '…');
      return {
        // On entend la phrase entière (les deux mots se prononcent pareil) ; l'écrit garde le trou.
        say: `${fill(q.sentence, q.answer)} Quel mot faut-il écrire : « ${PAIRS[q.pair].words[0]} » ou « ${PAIRS[q.pair].words[1]} » ?`,
        show: `Quel mot faut-il écrire : « ${PAIRS[q.pair].words[0]} » ou « ${PAIRS[q.pair].words[1]} » ?`,
        model: h('div', { class: 'c-model ho-model' }, h('p', { class: 'ho-sentence' }, before, blank, after)),
        choices: q.options.map((w) => ({ id: w, text: written(q.sentence, w), aria: w, className: 'letter ho-word' })),
        explain: `Oui : « ${fill(q.sentence, q.answer)} » ${PAIRS[q.pair].rule}`,
        hint: PAIRS[q.pair].rule,
        onSolved: () => { blank.textContent = written(q.sentence, q.answer); blank.classList.add('ok'); },
      };
    },
  });
}
