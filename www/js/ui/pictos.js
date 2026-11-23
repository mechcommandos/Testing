/**
 * Bibliothèque d'illustrations de Layjou : dessins SVG originaux (aucun émoji, aucune ressource tierce),
 * dans le style du logo (aplats, formes rondes, sans contour). Chaque illustration a un identifiant stable
 * utilisé par les contenus des jeux (champ "picto" des fichiers content/games/*.json).
 */
import { ANIMALS, HABITATS } from './pictos-animals.js';
import { FACES, FOOD, INSTRUMENTS, OBJECTS, SCIENCE, VEHICLES, WASTE } from './pictos-things.js';
import { CLOTHES, DIGITAL, GARDEN, WEATHER } from './pictos-nature.js';

export const PICTOS = { ...ANIMALS, ...HABITATS, ...FOOD, ...VEHICLES, ...OBJECTS, ...SCIENCE, ...WASTE, ...INSTRUMENTS, ...WEATHER, ...CLOTHES, ...GARDEN, ...DIGITAL, ...Object.fromEntries(Object.entries(FACES).map(([k, v]) => [`visage-${k}`, v])) };

export function hasPicto(id) {
  return Object.hasOwn(PICTOS, id);
}

/** SVG d'une illustration. Un identifiant inconnu donne un cadre vide (repérable), jamais une erreur. */
export function picto(id, size = 64) {
  const body = PICTOS[id] ?? '<rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="#c9cfdc" stroke-width="4" stroke-dasharray="8 6"/>';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${body}</svg>`;
}
