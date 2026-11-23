/** « Mon aventure » : le tableau de bord de l'enfant. Pas de classement, pas de série, pas de note. */
import { earnedBadges } from '../../core/badges.js';
import { AGE_BANDS } from '../../core/config.js';
import { avatarSvg, gameThumb } from '../art.js';
import { picto } from '../pictos.js';
import { h } from '../dom.js';
import { allowedHere, app, gameById, isPlayable as playableAnywhere, pausedHere } from '../state.js';
import { pausedScreen } from './paused.js';
import { familyPanel } from '../family-panel.js';

const isPlayable = (g) => playableAnywhere(g) && allowedHere(g.id);

export async function adventure() {
  const main = document.getElementById('main');
  if (pausedHere()) return pausedScreen(main);
  const profile = app.activeProfile;
  const [results, progress] = await Promise.all([app.store.resultsForProfile(profile.id), app.store.progressForProfile(profile.id)]);
  const recent = progress.filter((p) => p.lastPlayedAt).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  const lastGame = recent.map((p) => gameById(p.gameId)).find((g) => g && isPlayable(g));
  const done = results.filter((r) => r.success).length;
  const badges = earnedBadges(results);
  const band = AGE_BANDS.find((b) => b.id === profile.ageBand);
  const explored = new Set(results.map((r) => r.gameId));
  const next = app.catalogue.games.filter((g) => isPlayable(g) && !explored.has(g.id) && (!band || (g.ages[0] <= band.max && g.ages[1] >= band.min)));

  const family = await familyPanel(profile); // offre Famille : objectif de la semaine et programme du jour
  main.replaceChildren(h('section', { class: 'adventure' },
    h('div', { class: 'adv-head' },
      h('span', { class: 'avatar', html: avatarSvg(profile.avatar, 110) }),
      h('div', {}, h('h1', {}, `L’aventure de ${profile.nickname}`), h('p', { class: 'lead' }, done ? `${done} activité${done > 1 ? 's' : ''} réussie${done > 1 ? 's' : ''}` : 'Ton aventure commence !'))),
    family,
    lastGame ? h('a', { class: 'btn big continue', href: `#/jouer/${lastGame.id}` }, `▶ Continuer : ${lastGame.name}`) : h('a', { class: 'btn big continue', href: '#/jeux' }, '▶ Choisir un jeu'),
    recent.length ? h('section', {}, h('h2', {}, 'Mes jeux'), h('div', { class: 'recent-row' }, recent.slice(0, 6).map((p) => {
      const g = gameById(p.gameId);
      return g ? h('a', { class: 'recent-item', href: isPlayable(g) ? `#/jouer/${g.id}` : '#/jeux' }, h('span', { html: gameThumb(g) }), g.name, h('span', { class: 'small' }, `${p.successes} réussite${p.successes > 1 ? 's' : ''}`)) : null;
    }))) : null,
    next.length ? h('section', {}, h('h2', {}, 'À découvrir'), h('div', { class: 'recent-row' }, next.map((g) => h('a', { class: 'recent-item', href: `#/jouer/${g.id}` }, h('span', { html: gameThumb(g) }), g.name)))) : null,
    h('section', {}, h('h2', {}, 'Mes badges'), h('ul', { class: 'badges' }, badges.map((b) => h('li', { class: b.earned ? 'earned' : 'locked', title: b.description },
      h('span', { class: 'badge-icon', 'aria-hidden': 'true', html: picto(b.icon, 56) }),
      h('span', {}, b.label),
      h('span', { class: 'small' }, b.earned ? 'Obtenu' : b.description)))))));
  return { destroy() {} };
}
