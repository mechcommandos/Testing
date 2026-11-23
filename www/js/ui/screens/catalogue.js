/**
 * Accueil et catalogue : filtres âge / thème / compétence, favoris, « Continuer », jeux récents.
 * Un jeu non terminé est affiché comme indisponible : jamais de bouton « Jouer » trompeur.
 * Les filtres d'âge aident à choisir ; ils ne bloquent jamais un jeu.
 */
import { AGE_BANDS } from '../../core/config.js';
import { gameThumb } from '../art.js';
import { clear, h } from '../dom.js';
import { icon } from '../icons.js';
import { allowedHere, app, gameById, isPlayable, pausedHere } from '../state.js';
import { pausedScreen } from './paused.js';
import { mascot, react } from '../mascot.js';

const filters = { age: 'all', theme: 'all', skill: 'all', favorites: false };

export async function catalogue() {
  const main = document.getElementById('main');
  if (pausedHere()) return pausedScreen(main);
  const profile = app.activeProfile;
  const progress = profile ? await app.store.progressForProfile(profile.id) : [];
  const favorites = new Set(profile?.prefs?.favorites ?? []);
  const recent = progress.filter((p) => p.lastPlayedAt).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt).map((p) => gameById(p.gameId)).filter(Boolean);
  const games = app.catalogue.games;
  const domains = app.skills.domains;
  const skillLabel = (id) => app.skills.skills.find((s) => s.id === id)?.label ?? id;

  const list = h('div', { class: 'game-grid', 'aria-live': 'polite' });

  function matches(game) {
    if (filters.age !== 'all') {
      const band = AGE_BANDS.find((b) => b.id === filters.age);
      if (game.ages[1] < band.min || game.ages[0] > band.max) return false;
    }
    if (filters.theme !== 'all' && game.theme !== filters.theme) return false;
    if (filters.skill !== 'all' && !game.skills.includes(filters.skill)) return false;
    if (filters.favorites && !favorites.has(game.id)) return false;
    return true;
  }

  function card(game) {
    const blocked = isPlayable(game) && !allowedHere(game.id);
    const playable = isPlayable(game) && !blocked;
    const fav = favorites.has(game.id);
    return h('article', { class: `game-card${playable ? '' : ' unavailable'}${blocked ? ' blocked' : ''}` },
      playable
        ? h('a', { class: 'thumb', href: `#/jouer/${game.id}`, tabindex: '-1', 'aria-hidden': 'true', html: gameThumb(game) })
        : h('div', { class: 'thumb', html: gameThumb(game) }),
      h('h3', {}, game.name),
      h('p', { class: 'meta' }, `${game.ages[0]}–${game.ages[1]} ans`),
      h('div', { class: 'card-actions' },
        playable
          ? h('a', { class: 'btn play', href: `#/jouer/${game.id}` }, 'Jouer')
          : blocked ? h('span', { class: 'soon' }, 'Désactivé par un parent')
            : h('span', { class: 'soon', title: 'Ce jeu est conçu mais pas encore développé.' }, 'Bientôt'),
        profile ? h('button', {
          class: `fav${fav ? ' on' : ''}`, 'aria-pressed': fav ? 'true' : 'false', 'aria-label': fav ? `Retirer ${game.name} des favoris` : `Ajouter ${game.name} aux favoris`,
          onclick: async (e) => {
            const on = await app.store.toggleFavorite(profile.id, game.id);
            on ? favorites.add(game.id) : favorites.delete(game.id);
            app.activeProfile = await app.store.getProfile(profile.id);
            e.currentTarget.classList.toggle('on', on);
            e.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false');
          },
          html: icon('star', 22),
        }) : null));
  }

  function renderList() {
    clear(list);
    const shown = games.filter(matches).sort((a, b) => Number(isPlayable(b)) - Number(isPlayable(a)) || a.n - b.n);
    if (!shown.length) list.append(h('p', { class: 'empty' }, 'Aucun jeu ne correspond à ces filtres.'));
    shown.forEach((g) => list.append(card(g)));
  }

  const chip = (value, label, key) => h('button', {
    class: `chip${filters[key] === value ? ' on' : ''}`, 'aria-pressed': filters[key] === value ? 'true' : 'false',
    onclick: (e) => {
      filters[key] = value;
      e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
      e.currentTarget.classList.add('on');
      e.currentTarget.setAttribute('aria-pressed', 'true');
      renderList();
    },
  }, label);

  const available = games.filter(isPlayable).length;
  const continueGame = recent.find((g) => isPlayable(g) && allowedHere(g.id));

  const hello = mascot({ size: 140, tappable: true });
  setTimeout(() => react(hello, 'wave'), 400);
  main.replaceChildren(h('section', { class: 'catalogue' },
    h('div', { class: 'hero' },
      h('div', {},
        h('h1', {}, 'Apprendre en jouant'),
        h('p', { class: 'lead' }, available === games.length ? `${available} jeux à découvrir.` : `${available} jeux disponibles sur ${games.length} en préparation.`),
        continueGame ? h('a', { class: 'btn big', href: `#/jouer/${continueGame.id}` }, `Continuer : ${continueGame.name}`) : null),
      hello),
    recent.length > 1 ? h('section', { class: 'recent' }, h('h2', {}, 'Récemment joués'), h('div', { class: 'recent-row' }, recent.slice(0, 4).map((g) => h('a', { class: 'recent-item', href: isPlayable(g) && allowedHere(g.id) ? `#/jouer/${g.id}` : '#/jeux' }, h('span', { html: gameThumb(g) }), g.name)))) : null,
    h('div', { class: 'filters' },
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Âge' }, chip('all', 'Tous', 'age'), AGE_BANDS.map((b) => chip(b.id, b.label, 'age'))),
      h('div', { class: 'selects' },
        h('label', {}, 'Thème ', h('select', { onchange: (e) => { filters.theme = e.target.value; renderList(); } },
          h('option', { value: 'all' }, 'Tous les thèmes'), domains.map((d) => h('option', { value: d.id, selected: filters.theme === d.id }, d.label)))),
        h('label', {}, 'Compétence ', h('select', { onchange: (e) => { filters.skill = e.target.value; renderList(); } },
          h('option', { value: 'all' }, 'Toutes'), app.skills.skills.map((s) => h('option', { value: s.id, selected: filters.skill === s.id }, skillLabel(s.id))))),
        profile ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: filters.favorites, onchange: (e) => { filters.favorites = e.target.checked; renderList(); } }), ' Mes favoris') : null)),
    list));
  renderList();
  return { destroy() {} };
}
