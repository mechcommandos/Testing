/**
 * Offre Famille, côté enfant (profil d'enfant seulement) :
 * - goalChip : l'objectif de la semaine en version courte, à côté du titre de l'île ;
 * - familyPanel : l'objectif avec sa récompense et « Mon programme du jour » (3 jeux, cochés quand ils sont réussis
 *   aujourd'hui), dans « Mon aventure ».
 */
import { dailyProgram, doneToday, goalProgress } from '../core/goals.js';
import { skillStatus } from '../core/insights.js';
import { isFamily } from '../core/plan.js';
import { speak } from '../core/audio.js';
import { h } from './dom.js';
import { picto } from './pictos.js';
import { allowedHere, app, gameById } from './state.js';
import { gameThumb } from './thumbs.js';

const eligible = (profile) => !!profile && !profile.guest && isFamily(app.device?.policy());

function goalSentence(goal) {
  const theme = goal.theme ? app.skills.domains.find((d) => d.id === goal.theme)?.label : null;
  return goal.done
    ? `Bravo, objectif de la semaine atteint !${goal.reward ? ` Ta récompense : ${goal.reward}.` : ''}`
    : `Objectif de la semaine : ${goal.count} sur ${goal.target} activités réussies${theme ? ` (${theme.toLowerCase()})` : ''}.${goal.reward ? ` Récompense : ${goal.reward}.` : ''}`;
}

const bar = (goal) => h('span', { class: 'isl-goal-bar', 'aria-hidden': 'true' }, h('span', { style: { width: `${Math.round((goal.count / goal.target) * 100)}%` } }));

/** Objectif court, à côté du titre de l'île (même hauteur que les boutons). Le toucher ouvre « Mon aventure ». */
export async function goalChip(profile, pre = false) {
  if (!eligible(profile) || !profile.goal) return null;
  const goal = goalProgress(profile.goal, await app.store.resultsForProfile(profile.id), app.catalogue.games, Date.now());
  if (!goal) return null;
  const sentence = goalSentence(goal);
  // Lien vers « Mon aventure », où l'objectif est détaillé avec le programme du jour.
  return h('a', { class: `goal-chip${goal.done ? ' done' : ''}`, href: '#/aventure', 'aria-label': `${sentence} Voir mon aventure.`, title: sentence },
    h('span', { class: 'goal-chip-icon', 'aria-hidden': 'true', html: picto(goal.done ? 'etoile' : 'cadeau', 30) }),
    // Les chiffres restent visibles même en mode « je ne sais pas encore lire » : seul le mot disparaît.
    h('span', { class: 'goal-chip-text' }, goal.done ? (pre ? '' : 'Objectif atteint !') : pre ? `${goal.count} / ${goal.target}` : `Objectif ${goal.count}/${goal.target}`),
    bar(goal));
}

/** Objectif complet et programme du jour (« Mon aventure »). */
export async function familyPanel(profile, pre = false) {
  if (!eligible(profile)) return null;
  const results = await app.store.resultsForProfile(profile.id);
  const now = Date.now();
  const games = app.catalogue.games;
  const goal = goalProgress(profile.goal, results, games, now);
  const program = dailyProgram({ profile, games, skillStatusOf: (s) => skillStatus(s, results).status, allowed: allowedHere, now });
  const done = doneToday(results, now);
  const goalText = goal ? goalSentence(goal) : '';

  return h('section', { class: 'isl-family' },
    goal ? h('button', { class: `isl-goal${goal.done ? ' done' : ''}`, type: 'button', 'aria-label': goalText, onclick: () => speak(goalText) },
      h('span', { class: 'isl-goal-icon', 'aria-hidden': 'true', html: picto(goal.done ? 'etoile' : 'cadeau', 44) }),
      h('span', { class: 'isl-goal-body' },
        pre ? null : h('span', { class: 'isl-goal-text' }, goal.done ? 'Objectif atteint !' : `Mon objectif de la semaine : ${goal.count} / ${goal.target}`),
        bar(goal),
        !pre && goal.reward ? h('span', { class: 'isl-goal-reward' }, goal.done ? `Ta récompense : ${goal.reward}` : `Récompense : ${goal.reward}`) : null)) : null,
    program.length ? h('div', { class: 'isl-program' },
      h('h2', {}, pre ? h('span', { 'aria-label': 'Mon programme du jour', html: picto('reveil', 30) }) : 'Mon programme du jour'),
      h('div', { class: 'isl-program-list' }, program.map((id) => {
        const g = gameById(id);
        const ok = done.has(id);
        return h('a', { class: `isl-program-item${ok ? ' done' : ''}`, href: `#/jouer/${id}`, 'aria-label': `${g.name}${ok ? ' : réussi aujourd’hui' : ''}` },
          h('span', { class: 'isl-program-thumb', 'aria-hidden': 'true', html: gameThumb(g) }),
          pre ? null : h('span', { class: 'isl-program-name' }, g.name),
          ok ? h('span', { class: 'isl-program-check', 'aria-hidden': 'true', html: picto('etoile', 26) }) : null);
      }))) : null);
}
