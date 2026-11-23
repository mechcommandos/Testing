/**
 * Onglet « Compte » de l'espace parent : connexion par Microsoft ou Facebook (Google désactivé côté serveur), ou par e-mail (création de compte,
 * connexion, mot de passe oublié),
 * choix des profils synchronisés, export et suppression du compte.
 * Sans compte connecté, rien n'est envoyé ; même la vérification de disponibilité (/api/health) ne contient aucune donnée.
 */
import { API_ERRORS, api, errorText } from '../../core/api.js';
import { avatarSvg } from '../art.js';
import { confirmDialog, download, h, put, toast } from '../dom.js';
import { app } from '../state.js';
import { nativeApp, openExternal } from '../../core/native.js';
import { adultCheck } from './parent-gate.js';

const PROVIDER_LABELS = { google: 'Google', microsoft: 'Microsoft', facebook: 'Facebook', apple: 'Apple', demo: 'Démo' };
const PROVIDER_ERRORS = {
  annule: 'Connexion annulée.',
  session_expiree: 'La connexion a expiré. Recommence.',
  consentement_requis: 'Pour créer un compte, coche d’abord la case de confirmation, puis recommence.',
  email_deja_utilise: 'Un compte existe déjà avec cette adresse : connecte-toi avec l’e-mail et le mot de passe, puis lie ce fournisseur depuis l’espace parent en ligne.',
  identite_deja_liee: 'Ce compte est déjà lié à un autre compte parent Layjou.',
  fournisseur: 'Le fournisseur de connexion n’a pas répondu correctement. Réessaie dans un moment.',
};

const DATA_SENT = [
  'Ton adresse e-mail (et, avec Microsoft ou Facebook, l’identifiant de compte transmis par le fournisseur) ; avec un mot de passe, seulement son empreinte.',
  'Le nom de cet appareil et son type (par exemple « iPad · Safari »), pour que tu puisses le gérer à distance.',
  'Pour les seuls profils que tu choisis de synchroniser : pseudonyme, avatar, tranche d’âge.',
  'Leurs sessions (jeu, difficulté, début, fin, temps actif) et leurs résultats (réussite, indices, erreurs, durée).',
];

const SYNC_ISSUES = {
  foreign: 'Ce profil appartient à un autre compte : il n’est pas synchronisé.',
  limit: 'Limite de 12 profils par compte atteinte : ce profil n’est pas synchronisé.',
  invalid: 'Ce profil n’a pas pu être envoyé.',
};

export async function accountTab(root, refresh) {
  const account = await app.sync.account();
  if (account?.status === 'connected') return connectedView(root, account, refresh);
  put(root, h('h1', {}, 'Compte parent'),
    h('p', {}, 'Layjou fonctionne sans compte : tout reste sur cet appareil. Le compte, facultatif, sert à retrouver les profils choisis sur plusieurs appareils.'));
  const health = await api('health');
  if (!health.ok || !health.data.accounts) {
    put(root, h('div', { class: 'notice' },
      h('p', {}, health.status === 0 ? 'Pas de connexion au serveur pour l’instant. Le compte parent sera proposé quand l’appareil sera en ligne.' : 'Le compte parent n’est pas encore disponible.'),
      h('p', { class: 'small' }, 'Aucune donnée n’est envoyée à un serveur tant que tu n’as pas créé de compte et choisi les profils à synchroniser.')));
    return;
  }
  signedOutView(root, account, refresh, health.data.oauth ?? []);
}

function dataSentDetails() {
  return h('details', { class: 'small' }, h('summary', {}, 'Ce qui est envoyé au serveur'),
    h('ul', {}, DATA_SENT.map((t) => h('li', {}, t))),
    h('p', {}, 'Rien d’autre : pas de nom complet, de date de naissance, de photo, de position ni de statistique de visite. Tu peux exporter ou supprimer le compte à tout moment depuis cet onglet.'),
    h('p', {}, legalLink('conditions-generales/', 'Conditions générales'), ' · ',
      legalLink('confidentialite/', 'Vie privée'), ' · ',
      legalLink('cookies/', 'Cookies')));
}

/** Lien vers une page légale du site. Application iOS : contrôle parental, puis la vue Safari intégrée. */
function legalLink(path, label) {
  if (nativeApp() !== 'ios') return h('a', { href: path, target: '_blank', rel: 'noopener' }, label);
  return h('a', { href: '#', onclick: async (e) => {
    e.preventDefault();
    if (await adultCheck()) openExternal(`https://layjou.com/${path}`);
  } }, label);
}

function field(label, attrs) {
  return [h('label', { for: attrs.id }, label), h('input', attrs)];
}

function signedOutView(root, account, refresh, providers) {
  const message = h('div', { role: 'status', 'aria-live': 'polite' });
  const say = (text, error = false) => { message.className = error ? 'error' : 'notice'; message.textContent = text; };
  const busy = (form, on) => form.querySelectorAll('button').forEach((b) => { b.disabled = on; });

  const [loginEmailLabel, loginEmail] = field('Adresse e-mail', { id: 'login-email', type: 'email', autocomplete: 'username', required: true, value: account?.email ?? '' });
  const [loginPassLabel, loginPass] = field('Mot de passe', { id: 'login-password', type: 'password', autocomplete: 'current-password', required: true });
  const needEmail = () => { if (!loginEmail.value.trim()) { say('Saisis d’abord ton adresse e-mail.', true); return false; } return true; };

  const login = h('form', {
    class: 'form',
    onsubmit: async (e) => {
      e.preventDefault();
      busy(login, true);
      const r = await api('account/login', { method: 'POST', body: { email: loginEmail.value, password: loginPass.value } });
      busy(login, false);
      if (!r.ok) return say(errorText(r), true);
      await connectAccount(r.data);
      refresh();
    },
  }, h('h2', {}, 'Se connecter'), loginEmailLabel, loginEmail, loginPassLabel, loginPass,
  h('div', { class: 'row' },
    h('button', { class: 'btn' }, 'Se connecter'),
    h('button', { type: 'button', class: 'btn ghost small', onclick: async () => {
      if (!needEmail()) return;
      const r = await api('account/password/request', { method: 'POST', body: { email: loginEmail.value } });
      say(r.ok ? `Si un compte existe pour ${loginEmail.value.trim()}, un lien pour choisir un nouveau mot de passe vient d’y être envoyé (valable une heure).` : errorText(r), !r.ok);
    } }, 'Mot de passe oublié'),
    h('button', { type: 'button', class: 'btn ghost small', onclick: async () => {
      if (!needEmail()) return;
      const r = await api('account/resend', { method: 'POST', body: { email: loginEmail.value } });
      say(r.ok ? 'Si cette adresse attend une confirmation, un nouveau lien vient d’y être envoyé.' : errorText(r), !r.ok);
    } }, 'Renvoyer l’e-mail de confirmation')));

  const [regEmailLabel, regEmail] = field('Adresse e-mail', { id: 'reg-email', type: 'email', autocomplete: 'email', required: true });
  const [regPassLabel, regPass] = field('Mot de passe (10 caractères au moins)', { id: 'reg-password', type: 'password', autocomplete: 'new-password', minlength: 10, maxlength: 128, required: true });
  const [regPass2Label, regPass2] = field('Confirmer le mot de passe', { id: 'reg-password2', type: 'password', autocomplete: 'new-password', required: true });
  const consent = h('input', { type: 'checkbox', id: 'reg-consent' });
  const register = h('form', {
    class: 'form',
    onsubmit: async (e) => {
      e.preventDefault();
      if (regPass.value !== regPass2.value) return say('Les deux mots de passe ne sont pas identiques.', true);
      busy(register, true);
      const r = await api('account/register', { method: 'POST', body: { email: regEmail.value, password: regPass.value, consent: consent.checked } });
      busy(register, false);
      if (!r.ok) return say(errorText(r), true);
      const email = regEmail.value.trim();
      loginEmail.value = email;
      regPass.value = '';
      regPass2.value = '';
      say(`Un e-mail de confirmation a été envoyé à ${email}. Ouvre le lien qu’il contient, puis reviens ici pour te connecter. Sans confirmation sous 7 jours, la demande est effacée.`);
    },
  }, h('h2', {}, 'Créer un compte'), regEmailLabel, regEmail, regPassLabel, regPass, regPass2Label, regPass2,
  h('label', { class: 'check consent', for: 'reg-consent' }, consent,
    ' Je suis le parent ou le responsable légal des enfants dont je synchroniserai les profils, et j’accepte que les données décrites ci-dessous soient enregistrées sur le serveur de Layjou.'),
  dataSentDetails(),
  h('button', { class: 'btn' }, 'Créer le compte'));

  put(root, message, providerButtons(providers), h('div', { class: 'account-forms' }, login, register));
}

/** Boutons « Continuer avec Google / Microsoft / Facebook » (seulement les fournisseurs configurés sur le serveur). */
function providerButtons(providers) {
  if (!providers.length || nativeApp() === 'ios') return null; // iOS : pas de connexion par fournisseur
  const consent = h('input', { type: 'checkbox', id: 'provider-consent' });
  const links = providers.map((p) => h('a', { class: `btn provider provider-${p}`, 'data-provider': p }, `Continuer avec ${PROVIDER_LABELS[p] ?? p}`));
  const update = () => links.forEach((a) => { a.href = `api/oauth/${a.dataset.provider}/start?return=app&consent=${consent.checked ? 1 : 0}`; });
  consent.addEventListener('change', update);
  update();
  return h('section', { class: 'form providers' }, h('h2', {}, 'Connexion rapide'),
    h('div', { class: 'provider-list' }, links),
    h('label', { class: 'check consent', for: 'provider-consent' }, consent,
      ' Première connexion : je suis le parent ou le responsable légal, et j’accepte que mon compte, le nom de cet appareil et les profils que je choisirai de synchroniser soient enregistrés sur le serveur de Layjou.'),
    h('p', { class: 'small' }, 'Le fournisseur nous transmet un identifiant de compte et, s’il la partage, ton adresse e-mail. Rien n’est publié.'));
}

/**
 * Compte connecté sur cet appareil (e-mail ou fournisseur) : un autre compte que le précédent repart de zéro,
 * aucun profil n'est envoyé d'office. L'appareil s'enregistre et reçoit ses consignes.
 */
export async function connectAccount(summary) {
  const previous = await app.sync.account();
  const sameAccount = previous?.ref ? previous.ref === summary.ref : !!summary.email && previous?.email === summary.email;
  if (!sameAccount) await app.store.unsyncAll();
  await app.sync.saveAccount({
    email: summary.email ?? null, ref: summary.ref, providers: summary.providers ?? [], hasPassword: !!summary.hasPassword,
    status: 'connected', lastError: null,
    cursor: sameAccount ? previous.cursor ?? 0 : 0, lastSyncAt: sameAccount ? previous.lastSyncAt ?? null : null,
  });
  await app.device.register();
  await app.sync.run();
}

/** Retour d'une connexion Google / Microsoft / Facebook (#/compte/connecte). */
export async function providerDone() {
  const main = document.getElementById('main');
  main.replaceChildren(h('section', { class: 'narrow' }, h('h1', {}, 'Connexion'), h('p', { role: 'status' }, 'Connexion au compte parent…')));
  const r = await api('account');
  if (r.ok) {
    await connectAccount(r.data);
    toast('Compte parent connecté sur cet appareil.');
  } else toast(errorText(r));
}

export function providerError(code) {
  toast(PROVIDER_ERRORS[code] ?? API_ERRORS.server_error);
}

async function connectedView(root, account, refresh) {
  const [queue, profiles] = await Promise.all([app.store.db.getAll('syncQueue'), app.store.listProfiles({ includeArchived: true })]);
  const when = account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'jamais';
  const pending = queue.length ? `${queue.length} modification${queue.length > 1 ? 's' : ''} en attente d’envoi.` : 'Rien en attente.';
  const lastError = account.lastError ? ` Dernier essai : ${API_ERRORS[account.lastError] ?? API_ERRORS.server_error}` : '';

  const syncNow = h('button', { class: 'btn', onclick: async () => {
    syncNow.disabled = true;
    const r = await app.sync.run();
    syncNow.disabled = false;
    toast(r.ok ? `Synchronisé : ${r.sent} envoi(s), ${r.received} changement(s) reçu(s).` : (API_ERRORS[r.error] ?? API_ERRORS.server_error));
    refresh();
  } }, 'Synchroniser maintenant');


  const profileRow = (p) => h('li', {},
    h('span', { html: avatarSvg(p.avatar, 40) }),
    h('div', {}, h('strong', {}, p.nickname), p.syncIssue ? h('span', { class: 'small block error' }, SYNC_ISSUES[p.syncIssue] ?? '') : null),
    h('div', { class: 'row' },
      h('label', { class: 'check' }, h('input', {
        type: 'checkbox', checked: !!p.sync, 'aria-label': `Synchroniser ${p.nickname}`,
        onchange: async (e) => {
          await app.store.setSync(p.id, e.target.checked);
          if (e.target.checked) await app.sync.run();
          refresh();
        },
      }), ' Synchroniser'),
      p.sync ? h('button', { class: 'btn ghost small', onclick: async () => {
        if (!(await confirmDialog({ title: `Retirer ${p.nickname} du compte ?`, text: 'Le profil et sa progression seront supprimés du serveur et des autres appareils synchronisés. Ils restent sur cet appareil, sans synchronisation.', confirm: 'Retirer du compte', danger: true }))) return;
        await app.store.removeFromAccount(p.id);
        await app.sync.run();
        refresh();
      } }, 'Retirer du compte') : null));

  const who = account.email ?? `compte ${(account.providers ?? []).map((p) => PROVIDER_LABELS[p] ?? p).join(', ')}`;
  const policy = app.device.policy();
  put(root, h('h1', {}, 'Compte parent'),
    h('p', {}, 'Connecté avec ', h('strong', {}, who), '.'),
    policy ? h('div', { class: 'notice' },
      h('p', {}, `Cet appareil s’appelle « ${policy.name} » dans l’espace parent en ligne. `,
        policy.gamesEnabled ? (policy.blockedGames.length ? `${policy.blockedGames.length} jeu(x) désactivé(s).` : 'Tous les jeux sont autorisés.') : 'Les jeux sont en pause.'),
      h('p', { class: 'small' }, 'Pour mettre les jeux en pause, bloquer un appareil un moment, choisir les jeux autorisés ou imposer des réglages à distance : onglet ',
        h('a', { href: '#/parent/appareils' }, 'Appareils'), '.')) : null,
    h('p', { class: 'small', role: 'status' }, `Dernière synchronisation : ${when}. ${pending}${lastError}`),
    h('div', { class: 'row' }, syncNow,
      h('button', { class: 'btn ghost', onclick: async () => {
        await api('account/logout', { method: 'POST' });
        await app.sync.saveAccount({ status: 'signed-out' });
        await app.device.clear();
        toast('Déconnecté. Les données restent sur cet appareil.');
        refresh();
      } }, 'Se déconnecter')),
    h('section', {},
      h('h2', {}, 'Profils synchronisés'),
      h('p', { class: 'small' }, 'Un profil synchronisé se retrouve sur tous les appareils connectés à ce compte. Les favoris et la difficulté choisie restent propres à chaque appareil.'),
      profiles.length ? h('ul', { class: 'profile-list' }, profiles.map(profileRow)) : h('p', {}, 'Aucun profil sur cet appareil.'),
      dataSentDetails()),
    h('section', { class: 'form' },
      h('h2', {}, 'Mes données sur le serveur'),
      h('button', { class: 'btn ghost', onclick: async () => {
        const r = await api('account/export');
        if (!r.ok) return toast(errorText(r));
        download(`layjou-compte-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(r.data, null, 1), 'application/json');
      } }, 'Exporter les données du compte (JSON)'),
      deleteSection(account, refresh)));
}

/**
 * Suppression du compte, depuis l'application (exigée par l'App Store et Google Play pour toute application où l'on
 * crée un compte). Immédiate : le compte et ses données synchronisées sont effacés du serveur. Les profils restent sur
 * cet appareil. Un abonnement Famille en cours doit d'abord être résilié (sinon Paddle continuerait de prélever).
 */
function deleteSection(account, refresh) {
  const passwordless = account.hasPassword === false;
  const confirmInput = h('input', { type: passwordless ? 'text' : 'password', id: 'delete-password', autocomplete: passwordless ? 'off' : 'current-password' });
  const message = h('p', { class: 'error', role: 'alert' });
  return h('details', { class: 'danger-zone' },
    h('summary', {}, 'Supprimer le compte'),
    h('p', { class: 'small' }, 'Supprime du serveur le compte, ses appareils et toutes les données synchronisées. Les profils et la progression restent sur cet appareil ; ceux des autres appareils aussi, jusqu’à ce que tu les effaces depuis leur espace parent.'),
    h('label', { for: 'delete-password' }, passwordless ? 'Pour confirmer, écris SUPPRIMER' : 'Mot de passe'), confirmInput, message,
    h('button', { class: 'btn danger', onclick: async () => {
      if (!confirmInput.value) { message.textContent = passwordless ? 'Écris SUPPRIMER pour confirmer.' : 'Saisis ton mot de passe pour confirmer.'; return; }
      if (!(await confirmDialog({ title: 'Supprimer le compte ?', text: 'Le compte et toutes les données synchronisées seront supprimés du serveur. Cette action est définitive.', confirm: 'Supprimer le compte', danger: true }))) return;
      const r = await api('account/delete', { method: 'POST', body: passwordless ? { confirm: confirmInput.value.trim() } : { password: confirmInput.value } });
      confirmInput.value = '';
      if (!r.ok) { message.textContent = errorText(r); return; }
      await app.store.unsyncAll();
      await app.store.setMeta('account', null);
      await app.device.clear();
      toast('Compte supprimé du serveur.');
      refresh();
    } }, 'Supprimer mon compte'));
}
