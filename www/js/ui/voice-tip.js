/**
 * Conseil aux parents, dans Firefox seulement, quand l'appareil n'a qu'une voix robotique (eSpeak sur Linux, anciennes voix de Windows) :
 * un bandeau sur l'île propose d'ouvrir Layjou dans un navigateur qui apporte une voix naturelle (Chrome, Edge).
 * Un site ne peut pas installer de voix : c'est le seul levier sans rien installer. « Ne plus afficher » est retenu
 * sur l'appareil ; la croix ne le cache que pour cette visite.
 */
import { currentVoiceQuality } from '../core/audio.js';
import { h } from './dom.js';
import { app } from './state.js';

const KEY = 'voiceTipDismissed';
let hiddenThisVisit = false;

/** Attend que le navigateur ait donné sa liste de voix (elle arrive parfois après le chargement). */
function voicesReady() {
  const synth = globalThis.speechSynthesis;
  if (!synth || synth.getVoices().length) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { synth.removeEventListener?.('voiceschanged', done); resolve(); };
    synth.addEventListener?.('voiceschanged', done);
    setTimeout(done, 2000);
  });
}

/** Firefox seulement : c'est le navigateur sans voix naturelle à lui (il utilise celles du système). */
export function isFirefox(ua = navigator.userAgent) {
  return /Firefox\//.test(ua) && !/Seamonkey/i.test(ua);
}

export function platform(ua = navigator.userAgent) {
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod|Macintosh/i.test(ua)) return 'apple';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux|X11|CrOS/i.test(ua)) return 'linux';
  return 'other';
}

/** Texte du conseil, ou null s'il n'y a rien à conseiller. */
export function tipText(quality, os) {
  if (quality === 'natural') return null;
  // Les voix d'Apple et d'Android sans « naturelle » dans le nom restent agréables : pas de conseil.
  if (quality === 'standard' && (os === 'apple' || os === 'android' || os === 'other')) return null;
  if (quality === 'none') return 'Aucune voix française n’est disponible dans ce navigateur : les consignes ne sont pas lues à voix haute. Ouvrez Layjou dans Google Chrome pour les entendre.';
  if (os === 'linux') return 'La voix qui lit les consignes est très robotique dans ce navigateur. Pour une voix plus douce, ouvrez Layjou dans Google Chrome : elle y est choisie automatiquement.';
  if (os === 'windows') return 'La voix qui lit les consignes est une ancienne voix, un peu robotique. Pour une voix plus douce, ouvrez Layjou dans Google Chrome ou Microsoft Edge : elle y est choisie automatiquement.';
  return 'La voix qui lit les consignes est un peu robotique dans ce navigateur. Pour une voix plus douce, essayez Google Chrome ou Microsoft Edge.';
}

/** Ajoute le bandeau dans container, avant before (s'il y a lieu). */
export async function addVoiceTip(container, before = null) {
  if (hiddenThisVisit || !app.store || !isFirefox()) return;
  const settings = await app.store.getSettings();
  if (settings.sound === false || settings.speech === false) return; // la voix est coupée : rien à conseiller
  if (await app.store.getMeta(KEY, false)) return;
  await voicesReady();
  const text = tipText(currentVoiceQuality(), platform());
  if (!text || !container.isConnected) return;
  const address = new URL('app.html', location.href).href;
  const copyBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
    try { await navigator.clipboard.writeText(address); copyBtn.textContent = 'Adresse copiée'; } catch { copyBtn.textContent = address; }
  } }, 'Copier l’adresse de Layjou');
  const tip = h('aside', { class: 'notice voice-tip', role: 'note', 'aria-label': 'Conseil pour les parents' },
    h('p', {}, h('strong', {}, 'Pour les parents : '), text),
    h('div', { class: 'voice-tip-actions' },
      copyBtn,
      h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { tip.remove(); hiddenThisVisit = true; await app.store.setMeta(KEY, true); } }, 'Ne plus afficher')),
    h('button', { class: 'voice-tip-close', type: 'button', 'aria-label': 'Fermer le conseil', onclick: () => { tip.remove(); hiddenThisVisit = true; } }, '×'));
  container.insertBefore(tip, before);
}
