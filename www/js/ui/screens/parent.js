/**
 * Espace parent : progrès, profils, réglages, données, compte. Protégé localement par un code parent
 * (ou, sans code, une question de calcul qui écarte les plus petits). Ce n'est pas une sécurité forte :
 * voir docs/espace-parent.md. Verrouillage automatique après 5 minutes sans interaction.
 */
import { api } from '../../core/api.js';
import { applyBackup, exportData, summaryCsv, validateBackup } from '../../core/backup.js';
import { AGE_BANDS, AVATARS, THRESHOLDS } from '../../core/config.js';
import { clock } from '../../core/ids.js';
import { describeGame, finishedGames, formatDuration, levelName, PERIODS, SKILL_STATUS, skillStatus, summarize } from '../../core/insights.js';
import { checkPin, grownUpQuestion, hashPin, isValidPin } from '../../core/pin.js';
import { AVATAR_NAMES, avatarSvg } from '../art.js';
import { icon } from '../icons.js';
import { clear, confirmDialog, download, h, put, toast } from '../dom.js';
import { app, applyReadingMode, applySettings, gameById, isPlayable, setActiveProfile, updateWorld } from '../state.js';
import { managedKeys } from '../../core/device.js';
import { nativeApp } from '../../core/native.js';
import { currentVoiceQuality, frenchVoices, isFemaleVoice, speak, voiceQuality } from '../../core/audio.js';
import { accountTab as accountScreen } from './account.js';
import { accountGate, rememberTab } from './parent-gate.js';
import { canAddProfile } from '../../core/plan.js';
import { chartsSection, family, familyOnly, goalEditor, limitSelect, printReport, revisionsEditor, wordsEditor } from './parent-plus.js';
import { devicesTab, subscriptionBox } from './parent-online.js';

const TABS = { progres: 'Les progrès', profils: 'Profils', appareils: 'Appareils', reglages: 'Réglages', donnees: 'Données', compte: 'Compte' };
let lockTimer = null;

export async function parent(tab) {
  const main = document.getElementById('main');
  if (!TABS[tab]) tab = 'progres';
  // Connexion par compte il y a moins de 15 minutes : pas de nouvelle demande, même après être sorti de l'espace.
  if (app.parentUnlockedUntil < clock.now() && (app.parentTrustedUntil ?? 0) > clock.now()) app.parentUnlockedUntil = clock.now() + THRESHOLDS.parentAutoLockMs;
  if (app.parentUnlockedUntil < clock.now()) return gate(main, tab);

  const content = h('div', { class: 'parent-content' });
  main.replaceChildren(h('section', { class: 'parent' },
    h('nav', { class: 'parent-nav', 'aria-label': 'Espace parent' },
      Object.entries(TABS).map(([id, label]) => h('a', { href: `#/parent/${id}`, class: id === tab ? 'active' : '', 'aria-current': id === tab ? 'page' : null }, label)),
      h('button', { class: 'btn ghost small', onclick: lock, html: `${icon('lock', 18)} Verrouiller` })),
    content));

  await { progres: progressTab, profils: profilesTab, appareils: devicesTab, reglages: settingsTab, donnees: dataTab, compte: async (root) => {
    const below = h('div');
    root.append(await subscriptionBox(() => refreshTab('compte')), below);
    return accountScreen(below, () => refreshTab('compte'));
  } }[tab](content);

  // Toute interaction repousse le verrouillage automatique.
  const bump = () => { app.parentUnlockedUntil = clock.now() + THRESHOLDS.parentAutoLockMs; };
  bump();
  main.addEventListener('pointerdown', bump);
  main.addEventListener('keydown', bump);
  clearInterval(lockTimer);
  lockTimer = setInterval(() => { if (app.parentUnlockedUntil < clock.now()) lock(); }, 10_000);
  return {
    destroy() {
      clearInterval(lockTimer);
      main.removeEventListener('pointerdown', bump);
      main.removeEventListener('keydown', bump);
    },
  };
}

function lock() {
  app.parentUnlockedUntil = 0;
  app.parentTrustedUntil = 0; // « Verrouiller » ferme vraiment, même après une connexion par compte
  clearInterval(lockTimer);
  location.hash = '#/qui-joue';
}

// ---------- Porte d'entrée ----------

async function gate(main, tab) {
  const settings = app.settings;
  const message = h('p', { class: 'error', role: 'alert' });
  const open = () => Promise.resolve(app.current?.destroy?.()).then(() => parent(tab)).then((screen) => { app.current = screen; });
  const unlock = () => {
    app.parentUnlockedUntil = clock.now() + THRESHOLDS.parentAutoLockMs;
    open();
  };
  rememberTab(tab);
  main.replaceChildren(h('section', { class: 'narrow gate' }, h('h1', {}, 'Espace parent'), h('p', { role: 'status' }, 'Chargement…')));
  // Compte parent d'abord (Google, code par e-mail) ; null si le serveur ne répond pas.
  const accountBlock = await accountGate(open);

  // Code parent de l'appareil (s'il est défini) : toujours possible, même hors ligne.
  const pinBlock = settings.pin ? (() => {
    const input = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: 6, 'aria-label': 'Code parent', class: 'pin-input' });
    return h('section', { class: 'gate-pin' },
      h('p', {}, accountBlock ? 'Ou avec le code parent de cet appareil :' : 'Saisis le code parent.'),
      h('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          const state = await app.store.getMeta('pinState', { failures: 0, lockedUntil: 0, lockouts: 0 });
          const result = await checkPin(input.value, settings.pin, state);
          await app.store.setMeta('pinState', result.state);
          input.value = '';
          if (result.ok) return unlock();
          message.textContent = result.lockedUntil
            ? `Trop d’essais. Réessaie dans ${Math.ceil((result.lockedUntil - clock.now()) / 1000)} secondes.`
            : 'Code incorrect.';
        },
      }, input, h('button', { class: 'btn' }, 'Entrer')),
      h('details', {}, h('summary', {}, 'Code oublié ?'), h('p', { class: 'small' }, 'Le code est seulement stocké sur cet appareil, sous forme d’empreinte. Ouvrez l’espace parent avec votre compte (ci-dessus) pour le changer ; sans compte ni connexion, il faut effacer les données du site dans les réglages du navigateur.')));
  })() : null;

  // Dernier recours (serveur injoignable et pas de code parent) : la question de calcul.
  const mathBlock = !accountBlock && !settings.pin ? (() => {
    const question = grownUpQuestion();
    const input = h('input', { type: 'number', inputmode: 'numeric', 'aria-label': 'Résultat', class: 'pin-input' });
    return h('section', {},
      h('p', {}, 'Le serveur ne répond pas : pour continuer, un adulte répond à cette question.'),
      h('p', { class: 'question' }, `Combien font ${question.text} ?`),
      h('form', { onsubmit: (e) => { e.preventDefault(); Number(input.value) === question.answer ? unlock() : (message.textContent = 'Ce n’est pas la bonne réponse.'); } },
        input, h('button', { class: 'btn' }, 'Entrer')));
  })() : null;

  main.replaceChildren(h('section', { class: 'narrow gate' },
    h('h1', {}, 'Espace parent'),
    accountBlock, pinBlock, mathBlock, message,
    h('a', { href: '#/jeux', class: 'btn ghost' }, 'Retour aux jeux')));
  main.querySelector('input:not([readonly])')?.focus();
  return { destroy() {} };
}
// ---------- Progrès ----------

async function progressTab(root) {
  const profiles = await app.store.listProfiles({ includeArchived: true });
  if (!profiles.length) {
    put(root, h('h1', {}, 'Les progrès'), h('p', {}, 'Aucun profil pour l’instant.'), h('a', { class: 'btn', href: '#/parent/profils' }, 'Créer un profil'));
    return;
  }
  let profileId = (app.activeProfile && !app.activeProfile.guest && profiles.some((p) => p.id === app.activeProfile.id)) ? app.activeProfile.id : profiles[0].id;
  let period = '7';
  const body = h('div');

  async function render() {
    clear(body);
    const profile = profiles.find((p) => p.id === profileId);
    const [results, sessions, progress] = await Promise.all([app.store.resultsForProfile(profileId), app.store.sessionsForProfile(profileId), app.store.progressForProfile(profileId)]);
    const s = summarize({ results, sessions, games: app.catalogue.games, period, now: clock.now() });
    // Jeux terminés : depuis toujours (pas seulement sur la période choisie).
    const finished = finishedGames(results, app.catalogue.games.filter(isPlayable));
    const finishedIds = new Set(finished.map((x) => x.gameId));

    put(body, 
      h('div', { class: 'parent-head' },
        h('span', { html: avatarSvg(profile.avatar, 56) }),
        h('h1', {}, `Les progrès de ${profile.nickname}`),
        h('select', { 'aria-label': 'Période', onchange: (e) => { period = e.target.value; render(); } },
          Object.entries(PERIODS).map(([v, label]) => h('option', { value: v, selected: period === v, disabled: !family() && v !== '7' }, family() || v === '7' ? label : `${label} (offre Famille)`))),
        family() ? h('button', { class: 'btn ghost small', onclick: () => printReport(profile, results, sessions) }, 'Bilan à imprimer (PDF)') : null),
      h('div', { class: 'stats' },
        stat('games', s.gamesExplored, s.gamesExplored > 1 ? 'jeux explorés' : 'jeu exploré'),
        stat('check', s.activities, s.activities > 1 ? 'activités terminées' : 'activité terminée'),
        stat('clock', formatDuration(s.activeMs) || '0 min', 'de jeu actif estimé'),
        stat('star', finished.length, finished.length > 1 ? 'jeux terminés' : 'jeu terminé'),
        stat('calendar', s.lastSessionAt ? new Date(s.lastSessionAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—', 'dernière session')),
      s.activities === 0 ? h('p', { class: 'notice' }, 'Pas encore d’activité terminée sur cette période.') : null,
      family() ? chartsSection(results, sessions) : familyOnly('Historique complet, graphiques du temps de jeu et bilan à imprimer.'),
      s.games.length ? h('section', {}, h('h2', {}, 'Par jeu'), h('ul', { class: 'game-progress' }, s.games.map((g) => {
        const game = gameById(g.gameId);
        return h('li', {},
          h('strong', {}, g.name), finishedIds.has(g.gameId) ? h('span', { class: 'tag-finished' }, 'Jeu terminé') : null,
          h('ul', {}, describeGame(g, game).map((line) => h('li', {}, line))),
          h('p', { class: 'small' }, `${g.autonomous} sans indice, ${g.withHelp} avec aide, ${g.hints} indice${g.hints > 1 ? 's' : ''} utilisé${g.hints > 1 ? 's' : ''}.`));
      }))) : null,
      finishedSection(finished),
      resumeSection(progress),
      skillsSection(results));
  }

  put(root, 
    profiles.length > 1 ? h('div', { class: 'chips', role: 'group', 'aria-label': 'Enfant' }, profiles.map((p) => h('button', {
      class: `chip${p.id === profileId ? ' on' : ''}`, onclick: (e) => { profileId = p.id; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); render(); },
    }, p.nickname, p.archivedAt ? ' (archivé)' : ''))) : null,
    body);
  await render();
}

function stat(name, value, label) {
  return h('div', { class: 'stat' }, h('span', { class: 'stat-icon', 'aria-hidden': 'true', html: icon(name, 24) }), h('strong', {}, String(value)), h('span', {}, label));
}

/** Jeux terminés : tous les niveaux réussis, avec la date de la première réussite au dernier niveau. */
function finishedSection(finished) {
  if (!finished.length) return null;
  const date = (at) => new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return h('section', {}, h('h2', {}, 'Jeux terminés'),
    h('p', { class: 'small' }, 'Un jeu est terminé quand son dernier niveau a été réussi.'),
    h('ul', { class: 'plain finished-list' }, finished.map((x) => h('li', {}, h('span', { class: 'tag-finished' }, 'Terminé'), ` ${x.name}, le ${date(x.at)}`))));
}

function resumeSection(progress) {
  const toResume = progress.filter((p) => {
    const game = gameById(p.gameId);
    return game && isPlayable(game) && p.lastPlayedAt;
  });
  if (!toResume.length) return null;
  return h('section', {}, h('h2', {}, 'Activités à reprendre'), h('ul', { class: 'plain' }, toResume.map((p) => {
    const game = gameById(p.gameId);
    return h('li', {}, `${game.name} : dernière difficulté « ${levelName(game, p.difficulty)} », ${p.successes} réussite${p.successes > 1 ? 's' : ''} au total.`);
  })));
}

function skillsSection(results) {
  const statuses = app.skills.skills.map((skill) => ({ skill, ...skillStatus(skill.id, results) }));
  const worked = statuses.filter((s) => s.status !== 'unexplored');
  return h('section', {},
    h('h2', {}, 'Compétences travaillées'),
    h('p', { class: 'small' }, 'Ces statuts décrivent ce qui a été observé dans Layjou. Ce ne sont ni des notes ni un diagnostic. Référentiel de démonstration, à faire valider.'),
    worked.length ? h('ul', { class: 'skills' }, worked.map((s) => h('li', {},
      h('span', { class: `status ${s.status}` }, SKILL_STATUS[s.status]),
      h('strong', {}, s.skill.label),
      h('span', { class: 'small' }, s.explanation)))) : h('p', {}, 'Aucune compétence travaillée pour l’instant.'),
    h('details', {}, h('summary', {}, 'Comment ces statuts sont calculés'), h('ul', { class: 'small' }, Object.entries(app.skills.rules).map(([k, v]) => h('li', {}, `${k === 'discovery' ? 'En découverte' : k === 'practice' ? 'En pratique' : k === 'regular' ? 'Réussites régulières' : 'Données insuffisantes'} : ${v}`)))));
}

// ---------- Profils ----------

async function profilesTab(root) {
  const profiles = await app.store.listProfiles({ includeArchived: true });
  const guest = (await app.store.listProfiles({ includeGuest: true })).find((p) => p.guest);
  put(root, h('h1', {}, 'Profils'),
    h('p', { class: 'small' }, 'Un profil = un pseudonyme, un avatar et une tranche d’âge. Pas de nom complet, de date de naissance ni de photo. Sur un même appareil, les profils ne sont pas confidentiels entre eux.'),
    h('ul', { class: 'profile-list' }, profiles.map((p) => h('li', {},
      h('span', { html: avatarSvg(p.avatar, 48) }),
      h('div', {}, h('strong', {}, p.nickname), h('span', { class: 'small' }, `${AGE_BANDS.find((b) => b.id === p.ageBand)?.label}${p.archivedAt ? ' · archivé' : ''}${p.sync ? ' · synchronisé' : ''}`),
        family() ? h('div', { class: 'profile-plus' }, limitSelect(p, refresh),
          h('button', { class: 'btn ghost small', onclick: () => wordsEditor(root, p, refresh) }, `Mots de la semaine (${(p.words ?? []).length})`),
          h('button', { class: 'btn ghost small', onclick: () => goalEditor(root, p, refresh) }, p.goal ? `Objectif : ${p.goal.target}` : 'Objectif de la semaine'),
          h('button', { class: 'btn ghost small', onclick: () => revisionsEditor(root, p, refresh) }, 'Révisions de l’école')) : null),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost small', onclick: () => editForm(root, p) }, 'Modifier'),
        h('button', { class: 'btn ghost small', onclick: async () => { await app.store.setArchived(p.id, !p.archivedAt); if (app.activeProfile?.id === p.id && !p.archivedAt) await setActiveProfile(null); refresh(); } }, p.archivedAt ? 'Désarchiver' : 'Archiver'),
        h('button', { class: 'btn ghost small', onclick: async () => {
          if (await confirmDialog({ title: `Réinitialiser ${p.nickname} ?`, text: p.sync ? 'Toute sa progression sera effacée, sur cet appareil et sur les autres appareils synchronisés. Le profil est conservé.' : 'Toute sa progression sur cet appareil sera effacée. Le profil est conservé.', confirm: 'Réinitialiser', danger: true })) { await app.store.resetProfile(p.id); toast('Progression réinitialisée.'); }
        } }, 'Réinitialiser'),
        h('button', { class: 'btn danger small', onclick: async () => {
          if (await confirmDialog({ title: `Supprimer ${p.nickname} ?`, text: p.sync ? 'Le profil et toute sa progression seront supprimés de cet appareil, du compte et des autres appareils synchronisés. Cette action est définitive.' : 'Le profil et toute sa progression seront supprimés de cet appareil. Cette action est définitive.', confirm: 'Supprimer', danger: true })) {
            await app.store.deleteProfile(p.id);
            if (app.activeProfile?.id === p.id) await setActiveProfile(null);
            refresh();
          }
        } }, 'Supprimer'))))),
    canAddProfile({ family: family(), profiles })
      ? h('button', { class: 'btn', onclick: () => editForm(root, null) }, 'Ajouter un profil')
      : familyOnly('L’offre gratuite comprend un profil d’enfant. L’offre Famille permet d’en ajouter autant que nécessaire.'),
    family() ? null : familyOnly('Temps de jeu choisi pour chaque enfant (sinon 1 heure par jour sur l’appareil), objectif de la semaine avec récompense, mots et révisions de l’école.'),
    guest ? h('section', { class: 'notice' },
      h('h2', {}, 'Progression du mode invité'),
      h('p', {}, 'Une partie a été jouée en mode invité. Tu peux la rattacher à un nouveau profil ; elle n’est jamais rattachée automatiquement à un enfant existant.'),
      canAddProfile({ family: family(), profiles })
        ? h('button', { class: 'btn ghost', onclick: () => editForm(root, null, guest) }, 'Créer un profil avec cette progression')
        : familyOnly('Pour créer un deuxième profil avec cette progression.')) : null);
}

function refresh() {
  refreshTab('profils');
}

function editForm(root, profile, guest = null) {
  clear(root);
  let avatar = profile?.avatar ?? guest?.avatar ?? AVATARS[0];
  const errors = h('div', { class: 'error', role: 'alert' });
  // Compte connecté : un nouveau profil est synchronisé par défaut (case décochable).
  const syncBox = h('input', { type: 'checkbox', id: 'profile-sync', checked: true });
  const syncRow = h('label', { class: 'check', for: 'profile-sync', hidden: true }, syncBox, ' Synchroniser ce profil avec le compte parent');
  if (!profile) app.sync.account().then((a) => { if (a?.status === 'connected') syncRow.hidden = false; });
  const nickname = h('input', { id: 'nickname', maxlength: 20, required: true, value: profile?.nickname ?? '', autocomplete: 'off' });
  const ageBand = h('select', { id: 'ageBand' }, AGE_BANDS.map((b) => h('option', { value: b.id, selected: (profile?.ageBand ?? '4-5') === b.id }, b.label)));
  const avatars = h('div', { class: 'avatar-pick', role: 'radiogroup', 'aria-label': 'Avatar' }, AVATARS.map((a) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': a === avatar ? 'true' : 'false', 'aria-label': AVATAR_NAMES[a], class: a === avatar ? 'on' : '', html: avatarSvg(a, 64),
    onclick: (e) => { avatar = a; avatars.querySelectorAll('button').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); }); e.currentTarget.classList.add('on'); e.currentTarget.setAttribute('aria-checked', 'true'); },
  })));
  put(root, h('h1', {}, profile ? `Modifier ${profile.nickname}` : 'Nouveau profil'),
    h('form', {
      class: 'form',
      onsubmit: async (e) => {
        e.preventDefault();
        const data = { nickname: nickname.value, avatar, ageBand: ageBand.value, sync: !profile && !syncRow.hidden && syncBox.checked };
        try {
          const saved = profile ? await app.store.updateProfile(profile.id, data) : guest ? await app.store.adoptGuest(guest.id, data) : await app.store.createProfile(data);
          if (!app.activeProfile || app.activeProfile.id === saved.id || app.activeProfile.guest) await setActiveProfile(saved);
          toast(profile ? 'Profil modifié.' : 'Profil créé.');
          refresh();
        } catch (error) {
          errors.textContent = Object.values(error.errors ?? { e: error.message }).join(' ');
        }
      },
    },
    h('label', { for: 'nickname' }, 'Pseudonyme (pas le nom complet)'), nickname,
    h('label', { for: 'ageBand' }, 'Tranche d’âge'), ageBand,
    h('p', { class: 'small' }, 'Elle sert à suggérer des jeux ; elle ne bloque rien, et la modifier n’efface aucun acquis.'),
    h('span', { class: 'label' }, 'Avatar'), avatars,
    syncRow,
    errors,
    h('div', { class: 'row' }, h('button', { class: 'btn' }, 'Enregistrer'), h('button', { type: 'button', class: 'btn ghost', onclick: refresh }, 'Annuler'))));
  nickname.focus();
}

// ---------- Réglages ----------

async function settingsTab(root) {
  const s = app.settings;
  const managed = new Set(managedKeys(app.device?.policy()));
  const lockNote = (key) => managed.has(key) ? h('span', { class: 'small block managed' }, 'Imposé depuis l’espace parent en ligne.') : null;
  const save = async (changes) => { await applySettings(await app.store.saveSettings(changes)); toast('Réglage enregistré.'); };
  const toggle = (key, label, hint) => h('label', { class: `check${managed.has(key) ? ' is-managed' : ''}` }, h('input', { type: 'checkbox', checked: s[key], disabled: managed.has(key), onchange: (e) => save({ [key]: e.target.checked }) }), ` ${label}`, hint ? h('span', { class: 'small block' }, hint) : null, lockNote(key));
  const pinMessage = h('p', { class: 'small', role: 'status' });
  const pinInput = h('input', { type: 'password', inputmode: 'numeric', maxlength: 6, autocomplete: 'new-password', 'aria-label': 'Nouveau code parent (4 à 6 chiffres)' });

  put(root, h('h1', {}, 'Réglages'),
    h('section', { class: 'form' },
      h('h2', {}, 'Son'),
      toggle('sound', 'Sons et voix'),
      toggle('speech', 'Lire les consignes à voix haute', 'Utilise la voix française de l’appareil. Si aucune voix n’est installée, les consignes restent affichées.'),
      voiceRow(s, save),
      h('label', {}, 'Volume ', h('input', { type: 'range', min: 0, max: 1, step: 0.1, value: s.volume, onchange: (e) => save({ volume: Number(e.target.value) }) })),
      readingSetting(),
      h('h2', {}, 'Confort'),
      toggle('reducedMotion', 'Réduire les animations'),
      h('label', { class: managed.has('breakReminderMin') ? 'is-managed' : '' }, 'Rappel de pause ',
        h('select', { disabled: managed.has('breakReminderMin'), onchange: (e) => save({ breakReminderMin: Number(e.target.value) }) },
          [[0, 'Désactivé'], [15, 'Après 15 min de jeu actif'], [20, 'Après 20 min'], [30, 'Après 30 min']].map(([v, l]) => h('option', { value: v, selected: s.breakReminderMin === v }, l))), lockNote('breakReminderMin')),
      h('h2', {}, 'Code parent'),
      h('p', { class: 'small' }, 'Il protège l’accès à cet espace sur cet appareil. Ce n’est pas une sécurité forte : une personne qui a accès aux données du navigateur peut le contourner.'),
      pinInput,
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: async () => {
          if (!isValidPin(pinInput.value)) { pinMessage.textContent = 'Le code doit faire 4 à 6 chiffres.'; return; }
          await save({ pin: await hashPin(pinInput.value) });
          await app.store.setMeta('pinState', { failures: 0, lockedUntil: 0, lockouts: 0 });
          pinInput.value = '';
          pinMessage.textContent = 'Code parent enregistré.';
        } }, s.pin ? 'Changer le code' : 'Définir le code'),
        s.pin ? h('button', { class: 'btn ghost', onclick: async () => { await save({ pin: null }); pinMessage.textContent = 'Code parent retiré.'; } }, 'Retirer le code') : null),
      pinMessage));
}

/**
 * Mode « je ne sais pas encore lire » du profil actif : automatique (2–5 ans), activé ou désactivé.
 * Navigation par images et par la voix : les mots de l'en-tête et de l'île disparaissent, chaque bouton dit son nom.
 */
function readingSetting() {
  const profile = app.activeProfile;
  if (!profile || !app.world) return null;
  const value = app.world.preReader === null || app.world.preReader === undefined ? 'auto' : app.world.preReader ? 'on' : 'off';
  const select = h('select', { id: 'pre-reader', onchange: async (e) => {
    await updateWorld({ ...app.world, preReader: { auto: null, on: true, off: false }[e.target.value] });
    applyReadingMode();
    toast('Réglage enregistré.');
  } }, [['auto', 'Automatique (activé de 2 à 5 ans)'], ['on', 'Activé'], ['off', 'Désactivé']].map(([v, l]) => h('option', { value: v, selected: value === v }, l)));
  return h('div', {},
    h('h2', {}, `Lecture (profil ${profile.nickname})`),
    h('label', { for: 'pre-reader' }, 'Mode « je ne sais pas encore lire »'), select,
    h('p', { class: 'small' }, 'Navigation par images et par la voix : un premier toucher dit le nom d’un lieu de l’île, un second l’ouvre. Les niveaux deviennent des points.'));
}

/** Voix des consignes : automatique (voix féminine la plus douce de l'appareil) ou choisie dans la liste. */
function voiceRow(s, save) {
  if (nativeApp() === 'ios') return null; // iOS : l'appareil choisit sa meilleure voix
  const select = h('select', { id: 'voice', onchange: async (e) => { await save({ voice: e.target.value || null }); speak('Bonjour ! Touche la bonne réponse.'); } });
  const fill = () => {
    const voices = frenchVoices();
    select.replaceChildren(h('option', { value: '' }, 'Automatique (voix féminine si disponible)'),
      voices.map((v) => h('option', { value: v.name, selected: s.voice === v.name }, `${v.name}${isFemaleVoice(v) ? ' · féminine' : ''}${{ natural: ' · naturelle', basic: ' · robotique' }[voiceQuality(v)] ?? ''}`)));
    advice.textContent = adviceText();
  };
  const advice = h('p', { class: 'small' });
  fill();
  globalThis.speechSynthesis?.addEventListener?.('voiceschanged', fill, { once: true });
  return h('div', { class: 'voice-row' },
    h('label', { for: 'voice' }, 'Voix des consignes'),
    h('div', { class: 'row' }, select, h('button', { type: 'button', class: 'btn ghost small', onclick: () => speak('Bonjour ! Touche la bonne réponse.') }, 'Écouter')),
    advice);
}

/** Conseil selon la voix disponible : les voix modernes (en ligne) sont bien plus naturelles que les anciennes voix de l’appareil. */
function adviceText() {
  const q = currentVoiceQuality();
  const linux = /Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent);
  if (q === 'natural') return 'Une voix naturelle est utilisée. Elle passe par Internet : sans connexion, une voix de l’appareil prend le relais.';
  if (linux) return 'Cet appareil n’a qu’une voix de synthèse basique (eSpeak), très robotique. Pour une voix naturelle, ouvrez Layjou dans Google Chrome : sa voix « Google français » est choisie automatiquement.';
  if (q === 'basic' || q === 'none') return 'Aucune voix naturelle n’est disponible sur cet appareil. Essayez Google Chrome ou Microsoft Edge, qui proposent des voix françaises naturelles.';
  return 'Les voix de cet appareil sont anciennes et un peu robotiques. Pour une voix naturelle : ouvrez Layjou dans Microsoft Edge (voix « Denise Online (Natural) ») ou Google Chrome (voix « Google français ») ; elles sont choisies automatiquement.';
}

// ---------- Données ----------

async function dataTab(root) {
  const gameIds = app.catalogue.games.map((g) => g.id);
  const preview = h('div');
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json' });
  let persisted = null;
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* indisponible */ }

  fileInput.addEventListener('change', async () => {
    clear(preview);
    const file = fileInput.files[0];
    if (!file) return;
    let raw;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('trop gros');
      raw = JSON.parse(await file.text());
    } catch {
      preview.append(h('p', { class: 'error' }, 'Fichier illisible ou corrompu. Rien n’a été modifié.'));
      return;
    }
    const check = validateBackup(raw, gameIds);
    if (!check.ok) {
      preview.append(h('p', { class: 'error' }, 'Ce fichier ne peut pas être importé. Rien n’a été modifié.'), h('ul', { class: 'small' }, check.errors.map((e) => h('li', {}, e))));
      return;
    }
    preview.append(h('div', { class: 'notice' },
      h('p', {}, `Sauvegarde du ${new Date(check.summary.exportedAt).toLocaleString('fr-FR')} : ${check.summary.profiles.length} profil(s) (${check.summary.profiles.join(', ')}) et ${check.summary.results} résultat(s).`),
      h('p', { class: 'small' }, 'Fusionner : ajoute les profils absents et les résultats inconnus (un résultat déjà présent n’est pas dupliqué). Remplacer : efface d’abord toutes les données de cet appareil.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: async () => { const r = await applyBackup(app.store, check.data, 'merge'); toast(`Import terminé : ${r.results} résultat(s) ajouté(s).`); clear(preview); } }, 'Fusionner'),
        h('button', { class: 'btn danger', onclick: async () => {
          if (!(await confirmDialog({ title: 'Remplacer toutes les données ?', text: 'Les profils et la progression actuels de cet appareil seront effacés et remplacés par la sauvegarde.', confirm: 'Remplacer', danger: true }))) return;
          await applyBackup(app.store, check.data, 'replace');
          await setActiveProfile(null);
          toast('Données remplacées.');
          clear(preview);
        } }, 'Remplacer'))));
  });

  put(root, h('h1', {}, 'Données'),
    h('section', { class: 'notice' },
      h('p', {}, app.storagePersistent ? 'La progression est enregistrée sur cet appareil, dans le navigateur.' : 'Attention : ce navigateur ne permet pas d’enregistrer durablement (navigation privée ?). La progression sera perdue à la fermeture.'),
      h('p', { class: 'small' }, 'Le stockage local n’est pas une sauvegarde garantie : effacer les données du navigateur ou désinstaller l’application supprime la progression. Les exports contiennent les pseudonymes et la progression des enfants : garde-les en lieu sûr.'),
      persisted === false && navigator.storage?.persist ? h('button', { class: 'btn ghost small', onclick: async () => toast((await navigator.storage.persist()) ? 'Stockage durable accordé.' : 'Le navigateur a refusé le stockage durable.') }, 'Demander un stockage durable') : null),
    h('section', { class: 'form' },
      h('h2', {}, 'Exporter'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: async () => download(`layjou-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportData(app.store), null, 1), 'application/json') }, 'Sauvegarde complète (JSON)'),
        h('button', { class: 'btn ghost', onclick: async () => {
          const profiles = await app.store.listProfiles({ includeArchived: true });
          const results = (await Promise.all(profiles.map((p) => app.store.resultsForProfile(p.id)))).flat();
          download(`layjou-recapitulatif-${new Date().toISOString().slice(0, 10)}.csv`, summaryCsv(profiles, results, app.catalogue.games), 'text/csv;charset=utf-8');
        } }, 'Récapitulatif (CSV)')),
      h('h2', {}, 'Importer une sauvegarde'),
      fileInput, preview,
      h('h2', {}, 'Tout effacer'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!(await confirmDialog({ title: 'Effacer toutes les données ?', text: 'Profils, progression et réglages de cet appareil seront supprimés définitivement, et cet appareil sera déconnecté du compte parent. Les données du compte sur le serveur ne sont pas touchées.', confirm: 'Tout effacer', danger: true }))) return;
        if ((await app.sync.account())?.status === 'connected') await api('account/logout', { method: 'POST' });
        for (const store of ['profiles', 'results', 'sessions', 'progress', 'settings', 'syncQueue']) await app.store.db.clear(store);
        await setActiveProfile(null);
        await applySettings(await app.store.getSettings());
        location.hash = '#/qui-joue';
      } }, 'Effacer les données de cet appareil')));
}

// ---------- Compte : ui/screens/account.js ----------

function refreshTab(tab) {
  Promise.resolve(app.current?.destroy?.()).then(() => parent(tab)).then((screen) => { app.current = screen; });
}
