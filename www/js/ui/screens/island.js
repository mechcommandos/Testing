/**
 * L'île de loisirs : l'accueil des enfants. Une carte dessinée (montagnes, fleuve qui s'élargit en un long lac jusqu'au port,
 * plage et palmiers, forêt, ateliers, marché, village, port avec ses bateaux) où chaque jeu est un lieu, regroupé par collection (thème).
 * Une collection s'éclaire dès qu'un de ses jeux a été joué ; un lieu jamais visité est un peu pâle. Le compagnon attend
 * près du dernier jeu joué. La liste classique reste dans « Tous les jeux ».
 * Mode « je ne sais pas encore lire » : un premier toucher dit le nom du lieu, un second l'ouvre.
 */
import { speak, speechOn, sfx, stopSpeaking } from '../../core/audio.js';
import { h } from '../dom.js';
import { picto } from '../pictos.js';
import { icon } from '../icons.js';
import { allowedHere, app, gameById, isPlayable, pausedHere, readingMode, reducedMotion } from '../state.js';
import { companion, react } from '../mascot.js';
import { pausedScreen } from './paused.js';
import { installButton } from '../install.js';
import { addVoiceTip } from '../voice-tip.js';
import { goalChip } from '../family-panel.js';

/** Collections (repère 1000 × 640) : couleur du halo, zone de la carte, nom et place de l'écriteau (en %). */
export const ZONES = {
  logic: { label: 'Les ateliers', color: '#b9a6f2', shape: 'M48 110C60 50 200 40 300 60S370 150 350 220 260 250 150 245 50 210 48 110z', sign: [19, 4] },
  perception: { label: 'La plage', color: '#ffb59e', shape: 'M58 214C122 218 204 256 222 326C238 392 178 446 66 460C50 392 44 292 58 214z', sign: [25, 53] },
  world: { label: 'La forêt', color: '#6cc07e', shape: 'M630 60C700 30 880 30 950 90S980 260 930 300 700 310 650 270 600 120 630 60z', sign: [79, 49] },
  math: { label: 'Le marché', color: '#f8c27a', shape: 'M60 470C80 450 200 450 320 460S350 540 320 585 150 605 70 585 50 500 60 470z', sign: [32, 76] },
  social: { label: 'Le village', color: '#f5a9c0', shape: 'M380 410C400 390 540 390 570 410S580 480 550 500 400 500 385 480z', sign: [47, 61] },
  arts: { label: 'La place des artistes', color: '#93d3ee', shape: 'M360 510C380 490 580 490 610 510S620 590 580 600 380 600 360 575z', sign: [47, 95] },
  language: { label: 'Le port', color: '#f4dc8f', shape: 'M580 400C620 360 880 340 950 380S980 520 940 560 690 610 620 590 560 440 580 400z', sign: [86, 80] },
};

/** Image de chaque lieu (bibliothèque d'images) : grande et colorée, lisible même par un enfant de 3 ans. */
export const PLACE_ICONS = {
  'jardin-couleurs': 'tournesol', 'marche-nombres': 'panier', 'animaux-sons': 'vache', 'ile-lettres': 'bateau', 'memory-explorateurs': 'boussole',
  'robot-labyrinthes': 'robot', 'puzzles-suites': 'cadeau', 'petits-scientifiques': 'ampoule', 'bons-gestes': 'bac-jaune', 'histoires-emotions': 'visage-joie',
  orchestre: 'piano', ombres: 'lapin', 'petit-batisseur': 'marteau', differences: 'etoile', 'detectives-categories': 'herisson', 'histoires-ordre': 'enveloppe',
  'cuisine-mesures': 'gateau', 'pizzeria-fractions': 'melon', horloge: 'reveil', 'boutique-budgets': 'piece', 'voyage-cartes': 'train',
  'meteo-saisons': 'parapluie', 'jardin-vivant': 'pousse', mecanismes: 'boulon', 'explorateurs-numerique': 'cadenas', 'mots-phrases': 'journal',
  'detectives-lecture': 'feuille-papier', 'passeport-langues': 'helicoptere', 'code-debogage': 'tablette', 'studio-motifs': 'ballon',
  'dessus-dessous': 'carton', 'trace-magique': 'lien', 'docteur-doudous': 'peluche', 'chasse-rimes': 'cloche',
};

/** Place de chaque jeu sur la carte (en %), dans la zone de sa collection. */
export const PLACES = {
  // Les ateliers (logique), en haut à gauche, près du moulin.
  'robot-labyrinthes': [9, 16], 'puzzles-suites': [21, 13], 'petit-batisseur': [32, 20], 'detectives-categories': [12, 32], 'code-debogage': [24, 29],
  // La plage (observation), sur la côte ouest, entre les palmiers.
  'jardin-couleurs': [8, 42], 'memory-explorateurs': [17, 46], ombres: [9, 57], differences: [18, 61],
  // La forêt (découverte du monde), en haut à droite.
  'animaux-sons': [68, 12], 'petits-scientifiques': [79, 10], 'bons-gestes': [90, 14], horloge: [68, 25], 'voyage-cartes': [79, 24],
  'meteo-saisons': [90, 27], 'jardin-vivant': [68, 38], mecanismes: [79, 37], 'explorateurs-numerique': [90, 40],
  // Le marché (nombres), en bas à gauche.
  'marche-nombres': [9, 74], 'cuisine-mesures': [20, 71], 'pizzeria-fractions': [12, 86], 'boutique-budgets': [25, 84],
  // Le village (émotions) et la place des artistes.
  'histoires-emotions': [46, 70], orchestre: [40, 84], 'studio-motifs': [54, 84],
  // Le port (langage), en bas à droite, de part et d'autre du lac qui descend vers la mer.
  'ile-lettres': [60, 68], 'histoires-ordre': [82, 62], 'mots-phrases': [92, 71], 'detectives-lecture': [70, 83], 'passeport-langues': [62, 89],
  // Placés à la demande, hors de la zone de leur collection : à gauche de l'île, sur la montagne, au village.
  'dessus-dessous': [27, 41], 'trace-magique': [52, 20], 'docteur-doudous': [39, 70], 'chasse-rimes': [53, 74],
};

/** Jeux jouables mais pas encore placés sur l’île (on les trouve dans « Tous les jeux »). */
export const NOT_ON_MAP = ['metiers', 'rue-securite', 'bulle-calme',
  'ruche-multiplications', 'bocal-estimation', 'astronaute', 'sondage-classe', 'code-secret', 'petits-strateges', 'frise-temps',
  'amis-de-dix', 'droite-nombres', 'homophones', 'machine-temps', 'atelier-solides', 'potager-surfaces', 'roue-hasard', 'tour-du-monde', 'assiette-equilibree', 'mots-semaine'];

// Petits éléments dessinés ; chacun porte sa propre ombre au sol (plus léger qu'un filtre SVG sur un téléphone).
/**
 * Fond de carte : l'illustration de l'île (assets/img/ile-de-loisirs.webp, même cadrage que le repère 1000 × 640 des lieux),
 * avec par-dessus les halos des collections (plus visibles quand un jeu de la collection a été joué).
 */
function islandSvg(litZones) {
  const halos = Object.entries(ZONES).map(([id, z]) => `<path d="${z.shape}" fill="${z.color}" class="isl-zone${litZones.has(id) ? ' lit' : ''}"/>`).join('');
  return `<img class="isl-art" src="assets/img/ile-de-loisirs.webp" alt="" width="1569" height="1003" decoding="async" draggable="false">
    <svg viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true" focusable="false">${halos}</svg>`;
}

export async function island() {
  const main = document.getElementById('main');
  if (pausedHere()) return pausedScreen(main);
  const profile = app.activeProfile;
  const progress = profile ? await app.store.progressForProfile(profile.id) : [];
  const played = new Set(progress.filter((p) => p.lastPlayedAt).map((p) => p.gameId));
  const last = progress.filter((p) => p.lastPlayedAt).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)[0]?.gameId;
  const litZones = new Set([...played].map((id) => gameById(id)?.theme).filter(Boolean));
  const pre = readingMode();
  const pocket = app.world?.stickers.filter((s) => !s.placed).length ?? 0;
  let armed = null;
  // Bouton « Installer l'appli » : l'invite du système peut arriver après l'affichage de l'île.
  const installSlot = h('span', { class: 'isl-install' }, pre ? null : installButton());
  const onInstallable = () => installSlot.replaceChildren(...[pre ? null : installButton()].filter(Boolean));
  document.addEventListener('layjou:installable', onInstallable);

  const markers = app.catalogue.games.filter((g) => PLACES[g.id]).map((g) => {
    const [x, y] = PLACES[g.id];
    const ready = isPlayable(g);
    const blocked = ready && !allowedHere(g.id);
    const state = !ready ? 'soon' : blocked ? 'blocked' : played.has(g.id) ? 'visited' : 'new';
    const label = !ready ? `${g.name} : bientôt` : blocked ? `${g.name} : désactivé par un parent` : g.name;
    const btn = h('button', {
      class: `isl-place ${state}`, style: { left: `${x}%`, top: `${y}%` }, 'aria-label': label, 'data-game': g.id,
      onclick: () => open(g, state, btn),
    }, h('span', { class: 'isl-medal', style: { '--zone': ZONES[g.theme]?.color ?? '#ffffff' }, html: picto(PLACE_ICONS[g.id] ?? 'etoile', 64) }),
    state === 'soon' ? h('span', { class: 'isl-cloud', 'aria-hidden': 'true' }) : null,
    state === 'visited' ? h('span', { class: 'isl-flag', 'aria-hidden': 'true' }) : null,
    state === 'soon' ? null : h('span', { class: 'isl-name' }, g.name.replace(/^(Le |La |Les |L’|L')/, '')));
    return btn;
  });

  const at = PLACES[last] ?? [50, 50];
  const buddy = companion({ size: 64, tappable: true });
  const buddyLink = h('a', { href: '#/compagnon', class: 'isl-buddy', style: { left: `${at[0] > 50 ? at[0] - 6 : at[0] + 6}%`, top: `${Math.max(at[1] - 2, 4)}%` }, 'aria-label': `${app.world?.companion.name ?? 'Ton compagnon'} : l’habiller` }, buddy);

  const zoneLabels = Object.entries(ZONES).map(([id, z]) => h('span', { class: `isl-zone-name${litZones.has(id) ? ' lit' : ''}`, style: zoneLabelPos(id), 'aria-hidden': 'true' }, z.label));

  const goal = await goalChip(profile, pre); // offre Famille : objectif de la semaine, à côté du titre
  const visited = [...played].filter((id) => PLACES[id]).length; // lieux de l'île (les jeux pas encore placés n'y comptent pas)
  main.replaceChildren(h('section', { class: 'island' },
    h('div', { class: 'isl-top' },
      h('div', { class: 'isl-title' }, h('h1', {}, 'L’île de loisirs'), goal),
      h('div', { class: 'isl-actions' },
        h('a', { class: 'btn isl-album', href: '#/album', 'aria-label': pocket ? `Mon album : ${pocket} autocollant${pocket > 1 ? 's' : ''} à coller` : 'Mon album' }, h('span', { 'aria-hidden': 'true', html: icon('book', 20) }), pre ? null : h('span', { class: 'isl-btn-text' }, 'Mon album'), pocket ? h('span', { class: 'isl-count' }, String(pocket)) : null),
        installSlot,
        h('a', { class: 'btn ghost small isl-all', href: '#/jeux', 'aria-label': 'Tous les jeux' }, h('span', { class: 'isl-ico', 'aria-hidden': 'true', html: icon('games', 22) }), h('span', { class: 'isl-btn-text' }, 'Tous les jeux')))),
    h('div', { class: 'isl-frame' },
      h('div', { class: 'isl-scroll' }, h('div', { class: 'isl-map' }, h('div', { class: 'isl-svg', html: islandSvg(litZones) }), zoneLabels, markers, buddyLink)),
      arrow('left', 'Voir la gauche de l’île', -1), arrow('right', 'Voir la droite de l’île', 1)),
    pre ? null : h('p', { class: 'small isl-help' }, `${visited} lieu${visited > 1 ? 'x' : ''} visité${visited > 1 ? 's' : ''} sur ${app.catalogue.games.filter((g) => isPlayable(g) && PLACES[g.id]).length}. Touche un lieu pour entendre son nom, puis touche-le encore pour jouer.`)));

  // Sur petit écran, la carte défile : on la centre sur le dernier lieu visité.
  const scroller = main.querySelector('.isl-scroll');
  scroller.scrollLeft = Math.max(0, (scroller.scrollWidth * at[0]) / 100 - scroller.clientWidth / 2);
  // Téléphone : flèches pour faire glisser la carte (affichées seulement s'il reste de la carte de ce côté).
  const arrows = main.querySelectorAll('.isl-arrow');
  const updateArrows = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    arrows[0].hidden = scroller.scrollLeft <= 4;
    arrows[1].hidden = scroller.scrollLeft >= max - 4;
  };
  scroller.addEventListener('scroll', updateArrows, { passive: true });
  requestAnimationFrame(updateArrows);
  react(buddy, 'wave');
  // Voix robotique sur cet appareil : conseil aux parents, sous le titre de l'île.
  const islandEl = main.querySelector('.island');
  addVoiceTip(islandEl, islandEl.querySelector('.isl-frame')).catch(() => {});

  function arrow(name, label, dir) {
    return h('button', {
      class: `isl-arrow isl-arrow-${name}`, 'aria-label': label, hidden: true,
      onclick: () => { sfx('tap'); const s = main.querySelector('.isl-scroll'); s.scrollBy({ left: dir * s.clientWidth * 0.7, behavior: reducedMotion() ? 'auto' : 'smooth' }); },
    }, h('span', { 'aria-hidden': 'true', html: icon(name, 30) }));
  }

  function open(g, state, btn) {
    if (state === 'soon') { sfx('soft'); speak(`${g.name} : bientôt sur l’île !`); return; }
    if (state === 'blocked') { sfx('soft'); speak('Ce jeu est fermé pour le moment.'); return; }
    if (armed !== g.id) {
      // Premier toucher : la voix dit le nom du lieu (sans voix, le nom s'affiche sur ce lieu) ; le second toucher ouvre le jeu.
      armed = g.id;
      main.querySelectorAll('.isl-place.armed').forEach((b) => b.classList.remove('armed'));
      btn.classList.add('armed');
      btn.classList.toggle('named', !speechOn());
      sfx('tap');
      stopSpeaking(); // un nouveau lieu touché remplace le nom en cours de lecture
      speak(`${g.name}. Touche encore pour jouer !`);
      return;
    }
    stopSpeaking(); // la consigne du jeu démarre tout de suite
    location.hash = `#/jouer/${g.id}`;
  }

  return { destroy() { document.removeEventListener('layjou:installable', onInstallable); } };
}

function zoneLabelPos(id) {
  const [x, y] = ZONES[id].sign;
  return { left: `${x}%`, top: `${y}%` };
}
