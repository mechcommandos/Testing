/**
 * Point d'entrée : ouvre le stockage local, charge le catalogue, puis route les écrans.
 * Les adresses utilisent le fragment (#/jeux…) : aucune règle de réécriture n'est nécessaire sur l'hébergement.
 */
import { openStorage } from './core/db.js';
import { visit } from './core/analytics.js';
import { suspendAudio } from './core/audio.js';
import { Store } from './core/store.js';
import { SyncClient } from './core/sync.js';
import { DeviceClient, REFRESH_MS } from './core/device.js';
import { h } from './ui/dom.js';
import { allowedHere, app, applySettings, pausedHere, reapplySettings, setActiveProfile } from './ui/state.js';
import { renderHeader } from './ui/screens/header.js';
import { whoPlays } from './ui/screens/who-plays.js';
import { catalogue } from './ui/screens/catalogue.js';
import { island } from './ui/screens/island.js';
import { listenForInstall } from './ui/install.js';
import { album } from './ui/screens/album.js';
import { companionScreen } from './ui/screens/companion-screen.js';
import { adventure } from './ui/screens/adventure.js';
import { play } from './ui/screens/play.js';
import { parent } from './ui/screens/parent.js';
import { resetLink, verifyLink } from './ui/screens/account-link.js';
import { providerDone, providerError } from './ui/screens/account.js';
import { rememberedTab, unlockWithToken } from './ui/screens/parent-gate.js';

/**
 * Sans profil choisi, on joue en invité : la liste des jeux s'affiche tout de suite.
 * « Qui joue ? » reste accessible depuis la pastille du profil, dans l'en-tête.
 */
async function asGuestIfNeeded() {
  if (!app.activeProfile) await setActiveProfile(await app.store.guestProfile());
}

function toParentTab() {
  const tab = rememberedTab();
  history.replaceState(null, '', `${location.pathname}#/parent/${tab}`);
  return parent(tab);
}

function toAccountTab() {
  history.replaceState(null, '', `${location.pathname}#/parent/compte`);
  return parent('compte');
}

const routes = [
  // Accueil des enfants : l'île. La liste classique des jeux reste sur #/jeux (« Tous les jeux »).
  [/^#?\/?$/, async () => { await asGuestIfNeeded(); return island(); }],
  [/^#\/album$/, async () => { await asGuestIfNeeded(); return album(); }],
  [/^#\/compagnon$/, async () => { await asGuestIfNeeded(); return companionScreen(); }],
  [/^#\/qui-joue$/, () => whoPlays()],
  [/^#\/jeux$/, async () => { await asGuestIfNeeded(); return catalogue(); }],
  [/^#\/aventure$/, async () => { await asGuestIfNeeded(); return adventure(); }],
  [/^#\/jouer\/([a-z0-9-]+)$/, async (id) => { await asGuestIfNeeded(); return play(id); }],
  // Retour de Google (ou autre) pour déverrouiller l'espace parent : preuve vérifiée, puis l'onglet demandé.
  [/^#\/parent\/deverrouiller\/([0-9a-f]{64})$/, async (token) => { await unlockWithToken(token); return toParentTab(); }],
  [/^#\/parent(?:\/([a-z]+))?$/, (tab) => parent(tab ?? 'progres')],
  [/^#\/compte\/verifier\/([0-9a-f]{64})$/, (token) => verifyLink(token)],
  [/^#\/compte\/mot-de-passe\/([0-9a-f]{64})$/, (token) => resetLink(token)],
  [/^#\/compte\/termine$/, () => parent('compte')],
  // Retour de Google / Microsoft / Facebook : l'adresse est remplacée, puis l'onglet Compte s'affiche.
  [/^#\/compte\/connecte$/, async () => { await providerDone(); return toAccountTab(); }],
  // Première connexion depuis la porte de l'espace parent : compte connecté et espace ouvert.
  [/^#\/compte\/connecte\/([0-9a-f]{64})$/, async (token) => { await unlockWithToken(token); return toParentTab(); }],
  [/^#\/compte\/erreur\/([a-z_]+)$/, (code) => { providerError(code); return toAccountTab(); }],
];

async function route() {
  const main = document.getElementById('main');
  const hash = location.hash || '#/';
  // L'écran précédent se termine proprement (session de jeu close, minuteries arrêtées).
  if (app.current?.destroy) await app.current.destroy();
  app.current = null;
  if (!hash.startsWith('#/parent')) app.parentUnlockedUntil = 0;
  for (const [pattern, handler] of routes) {
    const match = hash.match(pattern);
    if (match) {
      try {
        app.current = await handler(...match.slice(1));
      } catch (error) {
        console.error(error);
        main.replaceChildren(h('section', { class: 'narrow' }, h('h1', {}, 'Oups, cet écran n’a pas pu s’ouvrir'),
          h('p', {}, 'Recharge la page. Si le problème revient, envoie ce message à contact@layjou.com :'),
          h('pre', { class: 'small error-detail' }, String(error?.stack ?? error).slice(0, 600)),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => location.reload() }, 'Recharger'), h('a', { class: 'btn ghost', href: '#/jeux' }, 'Retour aux jeux'))));
        app.current = { destroy() {} };
      }
      break;
    }
  }
  if (!app.current) location.hash = '#/';
  renderHeader();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function boot() {
  visit('app');
  listenForInstall(); // garder l'invite d'installation (Android, Chrome) pour le bouton « Installer l'appli »
  const storage = await openStorage();
  app.store = new Store(storage);
  const [catalogueData, skills] = await Promise.all([
    fetch('content/games.json').then((r) => r.json()),
    fetch('content/skills.json').then((r) => r.json()),
  ]);
  app.catalogue = catalogueData;
  app.skills = skills;
  app.storagePersistent = storage.persistent;
  app.sync = new SyncClient(app.store, { onChange: afterSync });
  app.device = new DeviceClient(app.store, { onPolicy: afterPolicy, onSignedOut: () => document.dispatchEvent(new CustomEvent('layjou:sync')) });
  await app.device.load();
  app.store.onQueue = () => app.sync.schedule();
  await applySettings(await app.store.getSettings());

  const activeId = await app.store.getMeta('activeProfile');
  const profile = activeId ? await app.store.getProfile(activeId) : null;
  if (profile && !profile.archivedAt) await setActiveProfile(profile);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') suspendAudio();
    else app.device.register().catch(() => {});
  });
  window.addEventListener('hashchange', route);
  document.addEventListener('layjou:profile', renderHeader);
  await route();
  document.documentElement.classList.remove('booting');

  // Synchronisation en arrière-plan, seulement si un compte parent est connecté sur cet appareil.
  // Les consignes du parent (jeux en pause, réglages imposés) sont relues au démarrage, puis toutes les 5 minutes.
  setTimeout(() => { app.device.register().catch(() => {}); app.sync.run().catch(() => {}); }, 1500);
  setInterval(() => app.device.register().catch(() => {}), REFRESH_MS);
  window.addEventListener('online', () => { app.device.register().catch(() => {}); app.sync.run().catch(() => {}); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

/**
 * Nouvelles consignes du compte parent : réglages réappliqués ; l'écran est redessiné s'il affiche des jeux
 * (catalogue, aventure) ou un jeu qui vient d'être mis en pause ou désactivé. Un jeu autorisé n'est pas interrompu.
 */
async function afterPolicy() {
  await reapplySettings();
  const hash = location.hash || '#/';
  const playing = hash.match(/^#\/jouer\/([a-z0-9-]+)$/);
  if (playing ? !allowedHere(playing[1]) || pausedHere() : /^#?\/?$|^#\/jeux$|^#\/aventure$|^#\/album$/.test(hash)) await route();
  document.dispatchEvent(new CustomEvent('layjou:policy'));
}

/** Après une synchronisation : le profil actif a pu être modifié ou supprimé depuis un autre appareil. */
async function afterSync() {
  if (app.activeProfile) {
    const fresh = await app.store.getProfile(app.activeProfile.id);
    if (!fresh) {
      await setActiveProfile(null);
      if (!location.hash.startsWith('#/parent')) location.hash = '#/qui-joue';
    } else if (fresh.updatedAt !== app.activeProfile.updatedAt) {
      await setActiveProfile(fresh);
    }
  }
  document.dispatchEvent(new CustomEvent('layjou:sync'));
}

boot().catch((error) => {
  console.error(error);
  document.getElementById('main').textContent = 'Layjou n’a pas pu démarrer. Recharge la page ; si le problème continue, vide le cache du navigateur.';
});
