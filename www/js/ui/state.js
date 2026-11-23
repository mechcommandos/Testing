/** État partagé de l'application (un seul onglet) et chargement paresseux des jeux. */
import { configureAudio } from '../core/audio.js';
import { gameAllowed, gamesPaused, effectiveSettings } from '../core/device.js';
import { levelName } from '../core/insights.js';
import { loadWorld, preReading, saveWorld } from '../core/world.js';

export const app = {
  store: null,
  sync: null, // core/sync.js : SyncClient
  catalogue: null, // games.json
  skills: null, // skills.json
  settings: null, // réglages appliqués (ceux de l'appareil + ceux imposés par le compte parent)
  localSettings: null, // réglages enregistrés sur cet appareil
  device: null, // core/device.js : DeviceClient
  world: null, // core/world.js : album, compagnon, mode sans lecture du profil actif
  activeProfile: null,
  parentUnlockedUntil: 0,
  current: null, // écran courant : { destroy() }
};

/** Chaque jeu n'est chargé qu'à son ouverture : le démarrage ne télécharge aucun des 30 jeux. */
export const GAME_MODULES = {
  'jardin-couleurs': () => import('../games/jardin-couleurs/index.js'),
  'marche-nombres': () => import('../games/marche-nombres/index.js'),
  'robot-labyrinthes': () => import('../games/robot-labyrinthes/index.js'),
  'animaux-sons': () => import('../games/animaux-sons/index.js'),
  'ile-lettres': () => import('../games/ile-lettres/index.js'),
  'memory-explorateurs': () => import('../games/memory-explorateurs/index.js'),
  'ombres': () => import('../games/ombres/index.js'),
  'puzzles-suites': () => import('../games/puzzles-suites/index.js'),
  'orchestre': () => import('../games/orchestre/index.js'),
  'petits-scientifiques': () => import('../games/petits-scientifiques/index.js'),
  'bons-gestes': () => import('../games/bons-gestes/index.js'),
  'histoires-emotions': () => import('../games/histoires-emotions/index.js'),
  'petit-batisseur': () => import('../games/petit-batisseur/index.js'),
  'differences': () => import('../games/differences/index.js'),
  'detectives-categories': () => import('../games/detectives-categories/index.js'),
  'histoires-ordre': () => import('../games/histoires-ordre/index.js'),
  'cuisine-mesures': () => import('../games/cuisine-mesures/index.js'),
  'pizzeria-fractions': () => import('../games/pizzeria-fractions/index.js'),
  'horloge': () => import('../games/horloge/index.js'),
  'boutique-budgets': () => import('../games/boutique-budgets/index.js'),
  'voyage-cartes': () => import('../games/voyage-cartes/index.js'),
  'meteo-saisons': () => import('../games/meteo-saisons/index.js'),
  'jardin-vivant': () => import('../games/jardin-vivant/index.js'),
  'mots-phrases': () => import('../games/mots-phrases/index.js'),
  'detectives-lecture': () => import('../games/detectives-lecture/index.js'),
  'passeport-langues': () => import('../games/passeport-langues/index.js'),
  'mecanismes': () => import('../games/mecanismes/index.js'),
  'code-debogage': () => import('../games/code-debogage/index.js'),
  'explorateurs-numerique': () => import('../games/explorateurs-numerique/index.js'),
  'studio-motifs': () => import('../games/studio-motifs/index.js'),
  // Jeux 31 à 43 : jouables depuis « Tous les jeux », pas encore placés sur l’île.
  'trace-magique': () => import('../games/trace-magique/index.js'),
  'dessus-dessous': () => import('../games/dessus-dessous/index.js'),
  'docteur-doudous': () => import('../games/docteur-doudous/index.js'),
  'metiers': () => import('../games/metiers/index.js'),
  'rue-securite': () => import('../games/rue-securite/index.js'),
  'bulle-calme': () => import('../games/bulle-calme/index.js'),
  'ruche-multiplications': () => import('../games/ruche-multiplications/index.js'),
  'bocal-estimation': () => import('../games/bocal-estimation/index.js'),
  'astronaute': () => import('../games/astronaute/index.js'),
  'sondage-classe': () => import('../games/sondage-classe/index.js'),
  'code-secret': () => import('../games/code-secret/index.js'),
  'petits-strateges': () => import('../games/petits-strateges/index.js'),
  'frise-temps': () => import('../games/frise-temps/index.js'),
  'amis-de-dix': () => import('../games/amis-de-dix/index.js'),
  'droite-nombres': () => import('../games/droite-nombres/index.js'),
  'chasse-rimes': () => import('../games/chasse-rimes/index.js'),
  'homophones': () => import('../games/homophones/index.js'),
  'machine-temps': () => import('../games/machine-temps/index.js'),
  'atelier-solides': () => import('../games/atelier-solides/index.js'),
  'potager-surfaces': () => import('../games/potager-surfaces/index.js'),
  'roue-hasard': () => import('../games/roue-hasard/index.js'),
  'tour-du-monde': () => import('../games/tour-du-monde/index.js'),
  'assiette-equilibree': () => import('../games/assiette-equilibree/index.js'),
  'mots-semaine': () => import('../games/mots-semaine/index.js'),
};

export function gameById(id) {
  return app.catalogue.games.find((g) => g.id === id) ?? null;
}

export function isPlayable(game) {
  return game.status === 'available' && !!GAME_MODULES[game.id];
}

export async function setActiveProfile(profile) {
  app.activeProfile = profile;
  await app.store.setMeta('activeProfile', profile?.id ?? null);
  app.world = profile ? await loadWorld(app.store, profile.id) : null;
  applyReadingMode();
  document.dispatchEvent(new CustomEvent('layjou:profile'));
}

export async function applySettings(local) {
  app.localSettings = local;
  const settings = effectiveSettings(local, app.device?.policy());
  app.settings = settings;
  configureAudio({ sound: settings.sound, speech: settings.speech, volume: settings.volume, voice: settings.voice ?? null });
  document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function reapplySettings() {
  return app.localSettings ? applySettings(app.localSettings) : null;
}

/** Consignes du compte parent pour cet appareil (aucune sans compte connecté). */
export function allowedHere(gameId) {
  return gameAllowed(app.device?.policy(), gameId);
}

export function pausedHere() {
  return gamesPaused(app.device?.policy());
}

export function reducedMotion() {
  return document.documentElement.classList.contains('reduced-motion');
}

export function difficultyLabel(game, index) {
  return levelName(game, index);
}

/** Enregistre le monde du profil actif (album, compagnon) après une modification. */
export async function updateWorld(next) {
  if (!app.activeProfile) return null;
  app.world = next;
  await saveWorld(app.store, app.activeProfile.id, next);
  document.dispatchEvent(new CustomEvent('layjou:world'));
  return next;
}

/** Mode « je ne sais pas encore lire » du profil actif : classe sur <html>, lue par les écrans et le CSS. */
export function readingMode() {
  return !!app.world && preReading(app.world, app.activeProfile);
}

export function applyReadingMode() {
  document.documentElement.classList.toggle('pre-reader', readingMode());
}
