/**
 * Installer Layjou comme une application (écran d'accueil, plein écran, hors connexion).
 * Android et ordinateur (Chrome, Edge) : l'invite d'installation du système, gardée pour le bouton « Installer ».
 * iPhone et iPad : pas d'invite système ; on explique « Partager → Sur l'écran d'accueil ».
 * Déjà installée (mode application) : aucun bouton.
 */
import { confirmDialog, h, toast } from './dom.js';
import { inStoreApp } from '../core/native.js';

let deferred = null;

export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    document.dispatchEvent(new CustomEvent('layjou:installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    toast('Layjou est installé sur cet appareil.');
    document.dispatchEvent(new CustomEvent('layjou:installable'));
  });
}

export function installed() {
  // Application Android ou iOS des stores : déjà installée.
  return inStoreApp() || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function canInstall() {
  return !installed() && (!!deferred || isIos());
}

export async function install() {
  if (deferred) {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    return outcome === 'accepted';
  }
  if (isIos()) {
    await confirmDialog({ title: 'Installer Layjou', text: 'Dans Safari, touchez le bouton Partager (le carré avec une flèche), puis « Sur l’écran d’accueil ». Layjou s’ouvrira ensuite comme une application.', confirm: 'Compris', cancel: 'Fermer' });
  }
  return false;
}

/** Bouton « Installer l'appli », affiché seulement quand l'installation est possible. */
export function installButton(className = 'btn ghost small') {
  if (!canInstall()) return null;
  return h('button', { class: className, onclick: async () => { await install(); } }, 'Installer l’appli');
}
