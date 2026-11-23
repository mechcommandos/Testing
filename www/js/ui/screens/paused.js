/**
 * Écrans de pause : jeux mis en pause (ou bloqués momentanément) depuis l'espace parent en ligne, et temps de jeu
 * du jour terminé (1 heure par jour en offre gratuite, ou la limite choisie pour l'enfant en offre Famille).
 */
import { blockedUntil, FREE_DAILY_MIN } from '../../core/plan.js';
import { inStoreApp, nativeApp } from '../../core/native.js';
import { h } from '../dom.js';
import { mascot } from '../mascot.js';
import { app } from '../state.js';

const hour = (ms) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function pausedScreen(main) {
  const until = blockedUntil(app.device?.policy(), Date.now());
  const tomorrow = until && new Date(until).toDateString() !== new Date().toDateString();
  main.replaceChildren(h('section', { class: 'narrow paused-screen' },
    sleeping(),
    h('h1', {}, 'C’est l’heure de la pause'),
    h('p', { class: 'lead' }, until ? `Les jeux sont en pause sur cet appareil jusqu’à ${tomorrow ? 'demain, ' : ''}${hour(until)}. On se retrouve plus tard !` : 'Les jeux sont en pause sur cet appareil. On se retrouve plus tard !'),
    h('p', { class: 'small' }, nativeApp() === 'ios' ? 'Réessaie plus tard.' : 'Un parent peut les réactiver depuis l’espace parent en ligne (layjou.com, Espace parent).')));
  return { destroy() {} };
}

/** Temps de jeu du jour terminé. scope 'device' : offre gratuite ; 'profile' : limite choisie par le parent. */
export function timeUpScreen(main, { scope, minutes }) {
  main.replaceChildren(h('section', { class: 'narrow paused-screen' },
    sleeping(),
    h('h1', {}, 'Tu as bien joué aujourd’hui !'),
    h('p', { class: 'lead' }, `Le temps de jeu de la journée est terminé${minutes ? ` (${minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`})` : ''}. On se retrouve demain !`),
    h('a', { class: 'btn', href: '#/album' }, 'Voir mon album'),
    scope === 'device' && inStoreApp()
      ? h('p', { class: 'small parents-note' }, `Pour les parents : l’offre gratuite permet ${FREE_DAILY_MIN} minutes de jeu par jour.`)
      : scope === 'device'
      ? h('p', { class: 'small parents-note' }, `Pour les parents : l’offre gratuite permet ${FREE_DAILY_MIN} minutes de jeu par jour. L’offre Famille (gratuite pour les parents inscrits, toujours sans publicité) enlève cette limite et permet d’en choisir une pour chaque enfant : Espace parent, onglet Compte.`)
      : h('p', { class: 'small parents-note' }, 'Pour les parents : cette limite se change dans l’espace parent, onglet Profils.')));
  return { destroy() {} };
}

function sleeping() {
  const wrap = mascot({ size: 150 });
  wrap.append(h('span', { class: 'zzz' }, 'z z z'));
  return wrap;
}
