/**
 * La machine à remonter le temps (jeu 48) : reconnaître le passé, le présent et le futur, puis choisir le verbe
 * qui va avec « hier », « aujourd'hui » ou « demain ». Après la bonne réponse, le cadran de la machine se règle.
 */
import { h } from '../../ui/dom.js';
import { quizGame } from '../quiz.js';
import { fill, makeSeries, TIMES } from './rules.js';

const DIAL = { passe: -60, present: 0, futur: 60 };

function machine(time = null) {
  const angle = time ? DIAL[time] : 0;
  return `<svg viewBox="0 0 220 120" width="220" aria-hidden="true" focusable="false"><path d="M20 110a90 90 0 0 1 180 0z" fill="#eef4ff" stroke="#23324d" stroke-width="3"/>`
    + `<path d="M20 110a90 90 0 0 1 60-85" fill="none" stroke="#8b6fe8" stroke-width="10"/><path d="M84 23a90 90 0 0 1 52 0" fill="none" stroke="#1fb3c6" stroke-width="10"/><path d="M140 25a90 90 0 0 1 60 85" fill="none" stroke="#f5b82e" stroke-width="10"/>`
    + `<text x="38" y="72" font-size="13" font-weight="800" fill="#23324d" font-family="Verdana, sans-serif">hier</text><text x="110" y="52" text-anchor="middle" font-size="13" font-weight="800" fill="#23324d" font-family="Verdana, sans-serif">maintenant</text><text x="182" y="72" text-anchor="end" font-size="13" font-weight="800" fill="#23324d" font-family="Verdana, sans-serif">demain</text>`
    + `<g transform="rotate(${angle} 110 110)" opacity="${time ? 1 : 0.35}"><path d="M106 110l4-70 4 70z" fill="#ef5f95"/></g><circle cx="110" cy="110" r="9" fill="#23324d"/></svg>`;
}

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'mt-game',
    view: (q) => {
      const dial = h('div', { class: 'mt-dial', html: machine() });
      if (q.kind === 'when') {
        return {
          say: `${q.sentence} Est-ce que ça s’est passé hier, est-ce que ça se passe maintenant, ou est-ce que ça se passera demain ?`,
          model: h('div', { class: 'c-model mt-model' }, dial, h('p', { class: 'mt-sentence' }, q.sentence)),
          choices: q.options.map((t) => ({ id: t, text: `${TIMES[t].label}`, aria: `${TIMES[t].label}, ${TIMES[t].sub}`, className: `mt-time mt-${t}` })),
          explain: `Oui : « ${q.sentence} » C’est ${TIMES[q.answer].sub}, ${q.answer === 'passe' ? 'c’est déjà arrivé' : q.answer === 'present' ? 'ça se passe en ce moment' : 'ça n’est pas encore arrivé'}.`,
          hint: 'Écoute bien le verbe : « a mangé », c’est fini ; « mange », c’est maintenant ; « mangera », c’est plus tard.',
          onSolved: () => { dial.innerHTML = machine(q.answer); },
        };
      }
      const [before, after] = q.sentence.split('___');
      const blank = h('span', { class: 'ho-blank' }, '…');
      return {
        say: `${q.sentence.replace('___', '…')} Choisis le bon verbe : ${q.options.join(', ')}.`,
        model: h('div', { class: 'c-model mt-model' }, dial, h('p', { class: 'mt-sentence' }, before, blank, after)),
        choices: q.options.map((f) => ({ id: f, text: f, aria: f, className: 'long' })),
        layout: 'list',
        explain: `Oui : « ${fill(q)} »${q.kind === 'form' ? ` « ${q.marker} » parle ${q.time === 'passe' ? 'du passé' : q.time === 'present' ? 'du présent' : 'du futur'}.` : ''}`,
        hint: q.kind === 'form' ? `Regarde le début de la phrase : « ${q.marker} ».` : 'Regarde le mot de temps au début, puis qui fait l’action : un seul, ou plusieurs ?',
        onSolved: () => { blank.textContent = q.answer; blank.classList.add('ok'); if (q.time) dial.innerHTML = machine(q.time); },
      };
    },
  });
}
