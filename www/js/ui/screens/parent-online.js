/**
 * Espace parent de l'application, fonctions du compte en ligne (sans passer par le site) :
 * - onglet « Appareils » : chaque appareil connecté au compte — jeux autorisés ou en pause, blocage momentané
 *   (offre Famille), réglages imposés, jeux désactivés, nom, déconnexion ;
 * - encart « Mon offre » de l'onglet Compte : abonnement Famille (paiement Paddle, moyen de paiement, résiliation),
 *   bilan de la semaine et alertes par e-mail.
 * Mêmes appels à l'API que l'espace parent en ligne (js/parent-space.js), mêmes règles côté serveur.
 */
import { api, errorText } from '../../core/api.js';
import { BLOCKS, blockedLabel, blockUntil, openCheckout, planStatusText, REMOTE_SETTINGS, since, withSetting } from '../../core/parent-remote.js';
import { confirmDialog, h, toast } from '../dom.js';
import { app, isPlayable } from '../state.js';
import { FAMILY_PERKS } from './parent-plus.js';
import { FREE_DAILY_MIN, FREE_PROFILES, PRICE } from '../../core/plan.js';
import { inStoreApp } from '../../core/native.js';

/** replaceChildren() sans les valeurs vides (le natif écrirait « null » à l'écran). */
const show = (el, ...nodes) => el.replaceChildren(...nodes.flat().filter((n) => n !== null && n !== undefined && n !== false));

async function connected() {
  const account = await app.sync.account();
  return account?.status === 'connected';
}

const notConnected = (what) => h('div', { class: 'notice' },
  h('p', {}, `${what} demande un compte parent : connectez cet appareil dans l’onglet `, h('a', { href: '#/parent/compte' }, 'Compte'), '.'),
  h('p', { class: 'small' }, 'Connectez ensuite les autres appareils (tablette, téléphone, ordinateur) au même compte : ils apparaîtront ici.'));

// ---------- Onglet Appareils ----------

export async function devicesTab(root) {
  root.append(h('h1', {}, 'Appareils'));
  if (!(await connected())) return root.append(notConnected('La gestion des appareils à distance'));
  const status = h('p', { class: 'small', role: 'status' }, 'Chargement…');
  root.append(status);
  const [devicesRes, me] = await Promise.all([api('devices'), api('account')]);
  if (!devicesRes.ok) { status.textContent = errorText(devicesRes); return; }
  const family = me.ok && me.data.plan === 'famille';
  const playable = app.catalogue.games.filter(isPlayable);
  const devices = devicesRes.data.devices;
  status.replaceWith(
    h('p', { class: 'lead' }, 'Mettre les jeux en pause, bloquer un appareil un moment, imposer des réglages ou désactiver des jeux, sur chaque appareil connecté à votre compte.'),
    devices.length
      ? h('div', { class: 'dev-list' }, devices.map((d) => deviceCard(d, playable, family)))
      : h('p', { class: 'empty' }, 'Aucun appareil connecté pour l’instant.'),
    h('p', { class: 'small' }, 'Les consignes s’appliquent sur l’appareil à sa prochaine connexion à Internet (quelques minutes au plus).'));
}

function deviceCard(device, playable, family) {
  const gamesSummary = h('summary', {});
  const countGames = () => { gamesSummary.textContent = `Jeux autorisés (${playable.length - device.blockedGames.length} sur ${playable.length})`; };
  countGames();
  let card = null;
  const save = async (changes, note = 'Enregistré.') => {
    const r = await api('devices/update', { method: 'POST', body: { deviceId: device.deviceId, ...changes } });
    toast(r.ok ? note : errorText(r));
    if (!r.ok) return false;
    Object.assign(device, r.data);
    card.classList.toggle('paused', !device.gamesEnabled);
    countGames();
    if (device.current) app.device.register(); // cet appareil : les consignes s'appliquent tout de suite
    return true;
  };

  const name = h('input', { value: device.name, maxlength: 60, 'aria-label': 'Nom de l’appareil', class: 'dev-name' });
  name.addEventListener('change', () => save({ name: name.value }, 'Nom enregistré.'));
  const enabled = h('input', { type: 'checkbox', checked: device.gamesEnabled, role: 'switch' });
  enabled.addEventListener('change', () => save({ gamesEnabled: enabled.checked }, enabled.checked ? 'Jeux de nouveau autorisés.' : 'Jeux en pause sur cet appareil.'));

  const settings = REMOTE_SETTINGS.map((s) => {
    const current = device.settings?.[s.key];
    const select = h('select', { 'aria-label': s.label }, s.options.map(([v, label]) => h('option', { value: v, selected: String(current ?? '') === v }, label)));
    select.addEventListener('change', () => save({ settings: withSetting(device.settings, s.key, select.value) }));
    return h('label', { class: 'dev-setting' }, h('span', {}, s.label), select);
  });

  const games = playable.map((g) => {
    const box = h('input', { type: 'checkbox', checked: !device.blockedGames.includes(g.id) });
    box.addEventListener('change', () => {
      const blocked = new Set(device.blockedGames);
      box.checked ? blocked.delete(g.id) : blocked.add(g.id);
      save({ blockedGames: [...blocked] });
    });
    return h('label', { class: 'check dev-game' }, box, ' ', g.name);
  });

  card = h('article', { class: `dev-card${device.gamesEnabled ? '' : ' paused'}` },
    h('div', { class: 'dev-head' }, name,
      h('span', { class: 'small' }, `${device.platform ?? ''}${device.platform ? ' · ' : ''}vu ${since(device.lastSeenAt)}${device.current ? ' · cet appareil' : ''}`)),
    h('label', { class: 'check dev-switch' }, enabled, ' Jeux autorisés sur cet appareil'),
    blockControls(device, family, save),
    h('details', {}, h('summary', {}, 'Réglages imposés'), h('div', { class: 'dev-settings' }, settings),
      h('p', { class: 'small' }, '« Au choix de l’appareil » laisse le réglage fait dans l’application.')),
    h('details', {}, gamesSummary, h('div', { class: 'dev-games' }, games)),
    device.current ? null : h('button', { class: 'btn ghost small', onclick: async () => {
      if (!(await confirmDialog({ title: `Déconnecter « ${device.name} » ?`, text: 'L’application de cet appareil sera déconnectée du compte. Les profils et la progression restent sur l’appareil.', confirm: 'Déconnecter', danger: true }))) return;
      const r = await api('devices/revoke', { method: 'POST', body: { deviceId: device.deviceId } });
      toast(r.ok ? 'Appareil déconnecté.' : errorText(r));
      if (r.ok) card.remove();
    } }, 'Déconnecter cet appareil'));
  return card;
}

function blockControls(device, family, save) {
  const box = h('div', { class: 'dev-block' });
  const draw = () => {
    if (!family) {
      show(box, h('p', { class: 'small family-only' }, h('strong', {}, 'Offre Famille · '), 'Bloquer momentanément cet appareil (30 min, 1 h, jusqu’à demain…).', inStoreApp() ? null : ' ', inStoreApp() ? null : h('a', { href: '#/parent/compte' }, 'En savoir plus')));
      return;
    }
    const until = device.blockedUntil && device.blockedUntil > Date.now() ? device.blockedUntil : null;
    if (until) {
      show(box, h('p', {}, h('strong', {}, `Bloqué jusqu’à ${blockedLabel(until)}.`)),
        h('button', { class: 'btn ghost small', onclick: async () => { if (await save({ blockedUntil: 0 }, 'Appareil débloqué.')) draw(); } }, 'Débloquer maintenant'));
      return;
    }
    const select = h('select', { 'aria-label': 'Durée du blocage' }, BLOCKS.map(([v, label]) => h('option', { value: v }, label)));
    show(box, h('label', { class: 'dev-setting' }, h('span', {}, 'Bloquer momentanément'), select),
      h('button', { class: 'btn ghost small', onclick: async () => {
        const v = select.value === 'matin' ? 'matin' : Number(select.value);
        if (await save({ blockedUntil: blockUntil(v) }, 'Appareil bloqué : les jeux reprendront à l’heure choisie.')) draw();
      } }, 'Bloquer'));
  };
  draw();
  return box;
}

// ---------- Mon offre (onglet Compte) ----------

export async function subscriptionBox(refresh) {
  const box = h('section', { class: 'offer-box' }, h('p', { class: 'small' }, 'Chargement de l’offre…'));
  const fill = async () => {
    if (!(await connected()) && inStoreApp()) return freePlan();
    if (!(await connected())) {
      show(box, h('h2', {}, 'Offre Famille : ', h('s', {}, `${PRICE} par mois`), ' (gratuite)'),
        h('p', {}, `Tous les jeux restent gratuits, et Layjou restera toujours sans publicité. L’offre gratuite comprend ${FREE_PROFILES} profil d’enfant et ${FREE_DAILY_MIN} minutes de jeu par jour. L’offre Famille ajoute :`),
        h('ul', { class: 'perks' }, FAMILY_PERKS.map((p) => h('li', {}, p))),
        h('p', { class: 'small' }, 'L’offre Famille est offerte à tous les parents inscrits : connectez cet appareil à un compte parent, ci-dessous, et elle s’active aussitôt.'));
      return;
    }
    const [me, billingRes] = await Promise.all([api('account'), api('billing/config')]);
    if (!me.ok) { show(box, h('p', { class: 'error' }, errorText(me))); return; }
    const account = me.data;
    const billing = billingRes.ok ? billingRes.data : { enabled: false, price: '2,99 €' };
    if (account.plan === 'famille') return active(account, billing);
    // Applications des stores : ni achat ni lien vers un paiement (règles d'Apple et de Google).
    if (inStoreApp()) return freePlan();
    offer(account, billing);
  };

  const pref = (key, checked, on, off) => {
    const input = h('input', { type: 'checkbox', role: 'switch', checked });
    input.addEventListener('change', async () => {
      const r = await api('account/preferences', { method: 'POST', body: { [key]: input.checked } });
      toast(r.ok ? (input.checked ? on : off) : errorText(r));
    });
    return input;
  };

  const freePlan = () => {
    box.className = 'offer-box';
    show(box, h('h2', {}, 'Offre gratuite'),
      h('p', {}, `Tous les jeux, sans publicité, avec ${FREE_PROFILES} profil d’enfant et ${FREE_DAILY_MIN} minutes de jeu par jour.`));
  };

  const active = (account, billing) => {
    box.className = 'offer-box on';
    const store = inStoreApp();
    show(box, h('h2', {}, 'Offre Famille active'),
      h('p', {}, 'Merci de soutenir Layjou, qui restera toujours sans publicité.'),
      store ? null : h('p', { class: 'small' }, planStatusText(account, billing.price)),
      h('label', { class: 'check' }, pref('weeklyReport', account.weeklyReport, 'Bilan de la semaine activé.', 'Bilan de la semaine désactivé.'),
        ` Recevoir le bilan de la semaine par e-mail${account.email ? '' : ' (ajoutez une adresse e-mail au compte)'}`),
      h('label', { class: 'check' }, pref('alerts', account.alerts, 'Alertes activées.', 'Alertes désactivées.'),
        ' M’alerter par e-mail quand un enfant termine un jeu ou atteint son objectif'),
      store ? null : h('div', { class: 'row' },
        account.planPaymentUrl ? h('a', { class: 'btn ghost small', href: account.planPaymentUrl, target: '_blank', rel: 'noopener' }, 'Changer de moyen de paiement') : null,
        account.planCancelUrl && account.planStatus !== 'canceling' ? h('a', { class: 'btn ghost small', href: account.planCancelUrl, target: '_blank', rel: 'noopener' }, 'Résilier l’abonnement') : null),
      store || ['offert', 'gratuite'].includes(account.planStatus) ? null : h('p', { class: 'small' }, 'Paiement et factures gérés par Paddle, notre revendeur. La résiliation prend effet à la fin du mois payé.'));
  };

  const offer = (account, billing) => {
    box.className = 'offer-box';
    const message = h('p', { class: 'small', role: 'status' });
    const done = async () => { toast('Offre Famille activée. Merci !'); await app.device.register(); refresh(); };
    const button = billing.enabled
      ? h('button', { class: 'btn', onclick: () => openCheckout(account, billing, { say: (t) => { message.textContent = t; }, done }) }, `S’abonner : ${billing.price} par mois`)
      : h('button', { class: 'btn', onclick: async () => {
        const r = await api('billing/activate', { method: 'POST' });
        if (!r.ok) { message.textContent = errorText(r); return; }
        done();
      } }, 'Activer l’offre Famille');
    show(box, h('h2', {}, `Offre Famille : ${billing.price} par mois`),
      h('p', {}, `Tous les jeux restent gratuits, et Layjou restera toujours sans publicité. L’offre gratuite comprend ${FREE_PROFILES} profil d’enfant et ${FREE_DAILY_MIN} minutes de jeu par jour. L’offre Famille ajoute :`),
      h('ul', { class: 'perks' }, FAMILY_PERKS.map((p) => h('li', {}, p))),
      button, message,
      h('p', { class: 'small' }, billing.enabled
        ? 'Sans engagement : résiliable à tout moment, effet à la fin du mois payé. Paiement sécurisé par Paddle, notre revendeur (factures et TVA). Aucune donnée bancaire ne passe par Layjou.'
        : `Le paiement n’est pas encore ouvert : l’offre Famille est offerte en attendant. Quand il ouvrira (${billing.price} par mois), il faudra s’abonner pour la garder.`));
  };

  fill().catch(() => show(box, h('p', { class: 'error' }, 'L’offre n’a pas pu être chargée. Vérifiez la connexion.')));
  return box;
}
