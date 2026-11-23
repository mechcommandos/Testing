/**
 * Espace parent en ligne (espace-parent.html) : connexion par Facebook, Microsoft ou e-mail (Google désactivé),
 * gestion des appareils où l'application est connectée et de leurs consignes (jeux en pause, jeux désactivés,
 * réglages imposés), offre Famille (abonnement Paddle, bilan par e-mail, blocage momentané), fournisseurs de connexion.
 * Les mêmes fonctions existent dans l'espace parent de l'application (onglets Appareils et Compte).
 * Tout passe par l'API ; aucune donnée n'est gardée dans la page. Aucune donnée bancaire ne passe par Layjou :
 * le paiement s'ouvre dans la fenêtre de Paddle.
 */
import { api, errorText } from './core/api.js';
import { BLOCKS, blockedLabel, blockUntil, openCheckout, planStatusText, REMOTE_SETTINGS, since, withSetting } from './core/parent-remote.js';
import { h, toast, confirmDialog } from './ui/dom.js';
import { feedbackWidget, identifyFeedback } from './feedback.js';

const root = document.getElementById('ps-root');
const LABELS = { google: 'Google', microsoft: 'Microsoft', facebook: 'Facebook', apple: 'Apple', demo: 'Démo' };
const OAUTH_ERRORS = {
  annule: 'Connexion annulée.',
  session_expiree: 'La connexion a expiré ou a été ouverte dans un autre navigateur. Recommencez.',
  consentement_requis: 'Pour créer un compte, cochez d’abord la case de confirmation, puis recommencez.',
  email_deja_utilise: 'Un compte existe déjà avec cette adresse. Connectez-vous avec la méthode habituelle, puis liez ce fournisseur depuis « Mon compte ».',
  identite_deja_liee: 'Ce compte est déjà lié à un autre compte parent Layjou.',
  fournisseur: 'Le fournisseur de connexion n’a pas répondu correctement. Réessayez dans un moment.',
};
function render(...nodes) {
  root.replaceChildren(...nodes.flat().filter(Boolean));
}

async function boot() {
  const params = new URLSearchParams(location.hash.slice(1));
  const error = params.get('erreur');
  if (params.get('bilan') === 'arrete') toast('Le bilan de la semaine ne vous sera plus envoyé. Vous pouvez le réactiver dans « Mon offre ».');
  if (error || params.get('bilan')) history.replaceState(null, '', location.pathname);
  const health = await api('health');
  if (health.ok && health.data.feedback) feedbackWidget(health.data.feedback);
  if (!health.ok || !health.data.accounts) {
    render(h('p', { class: 's-lead' }, health.status === 0 ? 'Le serveur est injoignable pour le moment.' : 'L’espace parent en ligne n’est pas encore ouvert.'),
      h('p', {}, 'Layjou fonctionne sans compte : les réglages de chaque appareil se font dans l’espace parent de l’application.'));
    return;
  }
  const me = await api('account');
  identifyFeedback(me.ok);
  if (me.status === 401) return signIn(error, health.data.oauth ?? []);
  if (!me.ok) return render(h('p', { class: 's-note' }, errorText(me)));
  return dashboard(me.data, health.data.oauth ?? []);
}

// ---------- Connexion ----------

function signIn(error, providers) {
  const message = h('p', { role: 'alert', class: error ? 's-note' : '' }, error ? (OAUTH_ERRORS[error] ?? errorText({ data: { error } })) : '');
  const consent = h('input', { type: 'checkbox', id: 'ps-consent' });
  const links = providers.map((id) => h('a', { class: `ps-provider ps-${id}`, href: '#', 'data-provider': id }, `Continuer avec ${LABELS[id] ?? id}`));
  const updateLinks = () => links.forEach((a) => { a.href = `api/oauth/${a.dataset.provider}/start?return=space&consent=${consent.checked ? 1 : 0}`; });
  consent.addEventListener('change', updateLinks);
  updateLinks();

  const email = h('input', { type: 'email', id: 'ps-email', autocomplete: 'username', required: true });
  const password = h('input', { type: 'password', id: 'ps-password', autocomplete: 'current-password', required: true });
  const form = h('form', {
    class: 'ps-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const r = await api('account/login', { method: 'POST', body: { email: email.value, password: password.value } });
      if (!r.ok) { message.className = 's-note'; message.textContent = errorText(r); return; }
      boot();
    },
  }, h('label', { for: 'ps-email' }, 'Adresse e-mail'), email, h('label', { for: 'ps-password' }, 'Mot de passe'), password, h('button', { class: 's-btn' }, 'Se connecter'));

  render(
    h('p', { class: 's-lead' }, 'Connectez-vous pour gérer les appareils où vos enfants jouent : mettre les jeux en pause, choisir les jeux autorisés, régler le son ou le rappel de pause.'),
    message,
    providers.length ? h('section', { class: 'ps-card' },
      h('h2', {}, 'Se connecter avec'),
      h('div', { class: 'ps-providers' }, links),
      h('label', { class: 'ps-check', for: 'ps-consent' }, consent, ' Première connexion : je suis le parent ou le responsable légal des enfants qui utiliseront Layjou, et j’accepte que mon compte et les réglages des appareils soient enregistrés sur le serveur de Layjou.'),
      h('p', { class: 's-small' }, 'Nous recevons du fournisseur un identifiant de compte et, s’il la partage, votre adresse e-mail. Rien d’autre, et nous ne publions rien.')) : null,
    h('section', { class: 'ps-card' }, h('h2', {}, 'Ou avec votre e-mail'), form,
      h('p', { class: 's-small' }, 'Pas encore de compte avec e-mail ? Il se crée depuis l’application : Espace parent, onglet Compte.')));
}

// ---------- Tableau de bord ----------

async function dashboard(account, providers) {
  const [devicesRes, catalogue, billingRes] = await Promise.all([api('devices'), fetch('content/games.json').then((r) => r.json()), api('billing/config')]);
  const billing = billingRes.ok ? billingRes.data : { enabled: false, price: '2,99 €' };
  const family = account.plan === 'famille';
  const playable = catalogue.games.filter((g) => g.status === 'available');
  const devices = devicesRes.ok ? devicesRes.data.devices : [];
  const who = account.email ?? `compte ${account.providers.map((p) => LABELS[p] ?? p).join(', ')}`;

  render(
    h('div', { class: 'ps-bar' }, h('p', {}, 'Connecté : ', h('strong', {}, who)),
      h('button', { class: 's-btn s-btn-ghost', onclick: async () => { await api('account/logout', { method: 'POST' }); boot(); } }, 'Se déconnecter')),
    offerSection(account, billing),
    h('section', {}, h('h2', {}, 'Appareils'),
      devices.length
        ? h('div', { class: 'ps-devices' }, devices.map((d) => deviceCard(d, playable, family)))
        : h('div', { class: 'ps-card' }, h('p', {}, 'Aucun appareil connecté pour l’instant.'),
          h('p', { class: 's-small' }, 'Sur la tablette ou le téléphone de l’enfant, ouvrez Layjou, puis Espace parent → Compte → connectez-vous avec le même compte. L’appareil apparaîtra ici.'))),
    accountSection(account, providers),
  );
}

function blockControls(device, family, save) {
  const box = h('div', { class: 'ps-block' });
  const draw = () => {
    const until = device.blockedUntil && device.blockedUntil > Date.now() ? device.blockedUntil : null;
    if (!family) {
      box.replaceChildren(h('p', { class: 's-small' }, h('strong', {}, 'Offre Famille · '), 'Bloquer momentanément cet appareil (30 min, 1 h, jusqu’à demain…).'));
      return;
    }
    if (until) {
      box.replaceChildren(h('p', {}, `Bloqué jusqu’à ${blockedLabel(until)}.`),
        h('button', { class: 's-btn s-btn-ghost', onclick: async () => { await save({ blockedUntil: 0 }, 'Appareil débloqué.'); draw(); } }, 'Débloquer maintenant'));
      return;
    }
    const select = h('select', { 'aria-label': 'Durée du blocage' }, BLOCKS.map(([v, label]) => h('option', { value: v }, label)));
    box.replaceChildren(h('label', { class: 'ps-setting' }, h('span', {}, 'Bloquer momentanément'), select),
      h('button', { class: 's-btn s-btn-ghost', onclick: async () => {
        const v = select.value === 'matin' ? 'matin' : Number(select.value);
        await save({ blockedUntil: blockUntil(v) }, 'Appareil bloqué : les jeux reprendront à l’heure choisie.');
        draw();
      } }, 'Bloquer'));
  };
  draw();
  return box;
}

function deviceCard(device, playable, family = false) {
  const gamesSummary = h('summary', {}, `Jeux autorisés (${playable.length - device.blockedGames.length} sur ${playable.length})`);
  let card = null;
  const save = async (changes, note = 'Enregistré.') => {
    const r = await api('devices/update', { method: 'POST', body: { deviceId: device.deviceId, ...changes } });
    toast(r.ok ? note : errorText(r));
    if (r.ok) {
      Object.assign(device, r.data);
      card.classList.toggle('paused', !device.gamesEnabled);
      gamesSummary.textContent = `Jeux autorisés (${playable.length - device.blockedGames.length} sur ${playable.length})`;
    }
  };
  const name = h('input', { value: device.name, maxlength: 60, 'aria-label': 'Nom de l’appareil' });
  name.addEventListener('change', () => save({ name: name.value }, 'Nom enregistré.'));
  const enabled = h('input', { type: 'checkbox', checked: device.gamesEnabled, role: 'switch' });
  enabled.addEventListener('change', () => save({ gamesEnabled: enabled.checked }, enabled.checked ? 'Jeux de nouveau autorisés.' : 'Jeux en pause sur cet appareil.'));

  const settings = REMOTE_SETTINGS.map((s) => {
    const current = device.settings?.[s.key];
    const select = h('select', { 'aria-label': s.label }, s.options.map(([v, label]) => h('option', { value: v, selected: String(current ?? '') === v }, label)));
    select.addEventListener('change', () => {
      save({ settings: withSetting(device.settings, s.key, select.value) });
    });
    return h('label', { class: 'ps-setting' }, h('span', {}, s.label), select);
  });

  const games = playable.map((g) => {
    const box = h('input', { type: 'checkbox', checked: !device.blockedGames.includes(g.id) });
    box.addEventListener('change', () => {
      const blocked = new Set(device.blockedGames);
      box.checked ? blocked.delete(g.id) : blocked.add(g.id);
      save({ blockedGames: [...blocked] });
    });
    return h('label', { class: 'ps-game' }, box, h('img', { src: `assets/img/jeux/${g.id}.svg`, alt: '', width: 64, height: 36 }), g.name);
  });

  card = h('article', { class: `ps-card ps-device${device.gamesEnabled ? '' : ' paused'}` },
    h('div', { class: 'ps-device-head' }, name,
      h('span', { class: 's-small' }, `${device.platform ?? ''}${device.platform ? ' · ' : ''}vu ${since(device.lastSeenAt)}${device.current ? ' · ce navigateur' : ''}`)),
    h('label', { class: 'ps-switch' }, enabled, h('span', {}, 'Jeux autorisés sur cet appareil')),
    blockControls(device, family, save),
    h('details', {}, h('summary', {}, 'Réglages imposés'), h('div', { class: 'ps-settings' }, settings),
      h('p', { class: 's-small' }, '« Au choix de l’appareil » laisse le réglage fait dans l’application.')),
    h('details', {}, gamesSummary, h('div', { class: 'ps-games' }, games)),
    h('button', { class: 's-btn s-btn-ghost ps-revoke', onclick: async () => {
      if (!(await confirmDialog({ title: `Déconnecter « ${device.name} » ?`, text: 'L’application de cet appareil sera déconnectée du compte. Les profils et la progression restent sur l’appareil.', confirm: 'Déconnecter', danger: true }))) return;
      const r = await api('devices/revoke', { method: 'POST', body: { deviceId: device.deviceId } });
      toast(r.ok ? 'Appareil déconnecté.' : errorText(r));
      boot();
    } }, 'Déconnecter cet appareil'));
  return card;
}

const PERKS = [
  'Enfants illimités, synchronisés sur tous vos appareils',
  'Pas de limite de temps, ou une limite choisie pour chaque enfant',
  'Bloquer momentanément un appareil',
  'Un objectif de la semaine et une récompense pour chaque enfant',
  'Un programme du jour de 10 minutes, adapté à l’enfant',
  'Les révisions de l’école : mots, tables, sons étudiés',
  'Bilan de la semaine et alertes par e-mail',
  'Historique complet, graphiques et bilan à imprimer',
];

function offerSection(account, billing) {
  const family = account.plan === 'famille';
  const weekly = h('input', { type: 'checkbox', role: 'switch', checked: account.weeklyReport });
  weekly.addEventListener('change', async () => {
    const r = await api('account/preferences', { method: 'POST', body: { weeklyReport: weekly.checked } });
    toast(r.ok ? (weekly.checked ? 'Bilan de la semaine activé.' : 'Bilan de la semaine désactivé.') : errorText(r));
  });
  const alerts = h('input', { type: 'checkbox', role: 'switch', checked: account.alerts });
  alerts.addEventListener('change', async () => {
    const r = await api('account/preferences', { method: 'POST', body: { alerts: alerts.checked } });
    toast(r.ok ? (alerts.checked ? 'Alertes activées.' : 'Alertes désactivées.') : errorText(r));
  });
  if (family) {
    const status = planStatusText(account, billing.price);
    return h('section', { id: 'offre' }, h('h2', {}, 'Mon offre'),
      h('div', { class: 'ps-card ps-offer on' },
        h('p', {}, h('strong', {}, 'Offre Famille active.'), ' Merci de soutenir Layjou, qui restera toujours sans publicité.'),
        h('p', { class: 's-small' }, status),
        h('label', { class: 'ps-switch' }, weekly, h('span', {}, 'Recevoir le bilan de la semaine par e-mail', account.email ? '' : ' (ajoutez une adresse e-mail au compte)')),
        h('label', { class: 'ps-switch' }, alerts, h('span', {}, 'M’alerter par e-mail quand un enfant termine un jeu ou atteint son objectif')),
        h('p', { class: 's-small' }, 'L’objectif de la semaine, sa récompense et les révisions de l’école se choisissent dans l’application : Espace parent, onglet Profils.'),
        h('p', { class: 'ps-offer-links' },
          account.planPaymentUrl ? h('a', { class: 'ps-link', href: account.planPaymentUrl, rel: 'noopener' }, 'Changer de moyen de paiement') : null,
          account.planCancelUrl && account.planStatus !== 'canceling' ? h('a', { class: 'ps-link', href: account.planCancelUrl, rel: 'noopener' }, 'Résilier l’abonnement') : null),
        ['offert', 'gratuite'].includes(account.planStatus) ? null : h('p', { class: 's-small' }, 'Paiement et factures gérés par Paddle, notre revendeur. La résiliation prend effet à la fin du mois payé.')));
  }
  const message = h('p', { class: 's-small', role: 'status' });
  // Paiement pas encore configuré : l'offre Famille s'active sans paiement (voir server/src/Billing.php).
  const button = billing.enabled
    ? h('button', { class: 's-btn s-btn-big', onclick: () => openCheckout(account, billing, { say: (t) => { message.textContent = t; }, done: () => { toast('Offre Famille activée. Merci !'); boot(); } }) }, `S’abonner : ${billing.price} par mois`)
    : h('button', { class: 's-btn s-btn-big', onclick: async () => {
      const r = await api('billing/activate', { method: 'POST' });
      if (!r.ok) { message.textContent = errorText(r); return; }
      toast('Offre Famille activée.');
      boot();
    } }, 'Activer l’offre Famille');
  return h('section', { id: 'offre' }, h('h2', {}, 'Mon offre'),
    h('div', { class: 'ps-card ps-offer' },
      h('p', {}, h('strong', {}, 'Offre gratuite.'), ' Tous les jeux, sans publicité, avec un profil d’enfant et une heure de jeu par jour.'),
      h('h3', {}, `Offre Famille : ${billing.price} par mois`),
      h('ul', { class: 'ps-perks' }, PERKS.map((p) => h('li', {}, p))),
      h('p', { class: 'ps-noads' }, 'Layjou restera toujours sans publicité, avec ou sans abonnement.'),
      button, message,
      billing.enabled ? h('p', { class: 's-small' }, 'Sans engagement : résiliable à tout moment, effet à la fin du mois payé. Paiement sécurisé par Paddle, notre revendeur (factures et TVA). Aucune donnée bancaire ne passe par Layjou.')
        : h('p', { class: 's-small' }, `Le paiement n’est pas encore ouvert : l’offre Famille est offerte en attendant. Quand il ouvrira (${billing.price} par mois), il faudra s’abonner pour la garder.`)));
}

function accountSection(account, providers) {
  const linked = new Set(account.providers);
  const others = providers.filter((p) => !linked.has(p));
  return h('section', {}, h('h2', {}, 'Mon compte'),
    h('div', { class: 'ps-card' },
      h('p', {}, account.providers.length ? `Connexion possible avec : ${account.providers.map((p) => LABELS[p] ?? p).join(', ')}${account.hasPassword ? ', e-mail et mot de passe' : ''}.` : 'Connexion par e-mail et mot de passe.'),
      others.length ? h('p', {}, 'Lier aussi : ', others.map((p) => h('a', { class: 'ps-link', href: `api/oauth/${p}/start?return=space&link=1` }, LABELS[p] ?? p))) : null,
      null),
    deleteSection(account));
}

function deleteSection(account) {
  const confirmInput = h('input', { 'aria-label': account.hasPassword ? 'Mot de passe' : 'Écrire SUPPRIMER', type: account.hasPassword ? 'password' : 'text', autocomplete: 'off' });
  const message = h('p', { role: 'alert', class: 's-small' });
  return h('details', { class: 'ps-card', id: 'suppression' }, h('summary', {}, 'Supprimer mon compte'),
    h('p', {}, 'Le compte, ses appareils et les données synchronisées sont supprimés du serveur. Les profils restent sur chaque appareil.'),
    h('p', { class: 's-small' }, account.hasPassword ? 'Confirmez avec votre mot de passe :' : 'Pour confirmer, écrivez SUPPRIMER :'),
    confirmInput, message,
    h('button', { class: 's-btn ps-danger', onclick: async () => {
      const body = account.hasPassword ? { password: confirmInput.value } : { confirm: confirmInput.value.trim() };
      const r = await api('account/delete', { method: 'POST', body });
      if (!r.ok) { message.textContent = r.data?.error === 'confirmation_required' ? 'Écrivez SUPPRIMER pour confirmer.' : errorText(r); return; }
      toast('Compte supprimé.');
      boot();
    } }, 'Supprimer définitivement'));
}


boot();
