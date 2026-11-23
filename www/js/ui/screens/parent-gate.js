/**
 * Porte de l'espace parent, par le compte parent plutôt que par un calcul :
 * - appareil connecté à un compte : déverrouiller avec Google (ou un autre fournisseur), ou avec un code reçu par
 *   e-mail ; le serveur remet une preuve à usage unique (5 min) que l'application vérifie (POST account/unlock) ;
 * - appareil sans compte : la même porte crée ou connecte un compte en un geste (fournisseur, ou code par e-mail
 *   sans mot de passe), puis ouvre l'espace parent ;
 * - code parent de l'appareil : toujours possible s'il est défini ;
 * - serveur injoignable ou comptes désactivés : la question de calcul reste le dernier recours.
 * Après une connexion par compte, l'espace reste ouvert 15 minutes, même si l'on en sort.
 */
import { api, errorText } from '../../core/api.js';
import { clock } from '../../core/ids.js';
import { THRESHOLDS } from '../../core/config.js';
import { grownUpQuestion } from '../../core/pin.js';
import { nativeApp } from '../../core/native.js';
import { h, toast } from '../dom.js';
import { app } from '../state.js';
import { connectAccount } from './account.js';

const LABELS = { google: 'Google', microsoft: 'Microsoft', facebook: 'Facebook', demo: 'Démo' };
export const TRUST_MS = 15 * 60_000;
const TAB_KEY = 'layjou-parent-tab';

/** Ouvre l'espace parent pour 15 minutes (connexion par compte) ou jusqu'au verrouillage automatique (code, calcul). */
export function grantParent({ trusted = false } = {}) {
  const now = clock.now();
  app.parentUnlockedUntil = now + THRESHOLDS.parentAutoLockMs;
  if (trusted) app.parentTrustedUntil = now + TRUST_MS;
}

export function rememberTab(tab) {
  try { sessionStorage.setItem(TAB_KEY, tab); } catch { /* onglet par défaut */ }
}

export function rememberedTab() {
  try { return sessionStorage.getItem(TAB_KEY) || 'progres'; } catch { return 'progres'; }
}

/** Retour de Google (…#/parent/deverrouiller/<jeton>) : la preuve est vérifiée par le serveur. */
export async function unlockWithToken(token) {
  const me = await api('account');
  if (me.ok) await connectAccount(me.data); // compte (re)connecté sur cet appareil, le même ou un autre
  const r = await api('account/unlock', { method: 'POST', body: { token } });
  if (r.ok) grantParent({ trusted: true });
  else toast('La connexion a expiré. Recommence.');
  return r.ok;
}

/** Bloc « compte » de la porte. Renvoie null si le serveur ne répond pas ou si les comptes sont désactivés. */
/**
 * Contrôle parental avant de quitter l'application (liens externes, iOS) : une question de calcul pour adulte.
 * Résout true si la réponse est juste.
 */
export function adultCheck() {
  return new Promise((resolve) => {
    const question = grownUpQuestion();
    let done = false;
    const answer = (ok) => {
      if (done) return;
      done = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(ok);
    };
    const input = h('input', { type: 'number', inputmode: 'numeric', 'aria-label': 'Résultat', class: 'pin-input' });
    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'adult-title' },
      h('h2', { id: 'adult-title' }, 'Demande à un adulte'),
      h('p', {}, `Combien font ${question.text} ?`),
      h('form', { onsubmit: (e) => { e.preventDefault(); answer(Number(input.value) === question.answer); } },
        input,
        h('div', { class: 'row end' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => answer(false) }, 'Annuler'),
          h('button', { class: 'btn' }, 'Continuer'))));
    dialog.addEventListener('close', () => answer(false));
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
  });
}

export async function accountGate(onOpen) {
  const health = await api('health');
  if (!health.ok || !health.data.accounts) return null;
  const providers = health.data.oauth ?? [];
  const account = await app.sync.account();
  const connected = account?.status === 'connected';
  const message = h('p', { class: 'error', role: 'alert' });

  // Code par e-mail : envoyer, puis saisir les 6 chiffres.
  const email = h('input', { type: 'email', id: 'gate-email', autocomplete: 'email', value: connected ? account.email ?? '' : '', readonly: connected && !!account.email });
  const consent = h('input', { type: 'checkbox', id: 'gate-consent' });
  const code = h('input', { id: 'gate-code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, pattern: '[0-9]{6}', class: 'pin-input' });
  const codeStep = h('form', { class: 'form gate-code', hidden: true, onsubmit: async (e) => {
    e.preventDefault();
    const r = await api('account/email-login', { method: 'POST', body: { email: email.value, code: code.value.trim() } });
    if (!r.ok) { message.textContent = r.data?.error === 'invalid_code' ? 'Code incorrect ou expiré.' : errorText(r); return; }
    await connectAccount(r.data);
    const ok = await api('account/unlock', { method: 'POST', body: { token: r.data.unlock } });
    if (!ok.ok) { message.textContent = errorText(ok); return; }
    grantParent({ trusted: true });
    onOpen();
  } }, h('label', { for: 'gate-code' }, 'Code reçu par e-mail (6 chiffres)'), code, h('button', { class: 'btn' }, 'Ouvrir l’espace parent'));
  const sendForm = h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault();
    message.textContent = '';
    const r = await api('account/email-code', { method: 'POST', body: { email: email.value, consent: consent.checked } });
    if (!r.ok) { message.textContent = r.data?.error === 'consent_required' ? 'Pour créer le compte, cochez la case de confirmation.' : errorText(r); return; }
    codeStep.hidden = false;
    toast(`Code envoyé à ${email.value}.`);
    code.focus();
  } },
  h('label', { for: 'gate-email' }, 'Adresse e-mail du parent'), email,
  connected ? null : h('label', { class: 'check consent', for: 'gate-consent' }, consent, ' Je suis le parent ou le responsable légal, et j’accepte la création d’un compte parent Layjou avec cette adresse (si elle n’en a pas déjà un).'),
  h('button', { class: 'btn ghost' }, 'Recevoir un code par e-mail'));

  // Application iOS : pas de connexion Google / Microsoft / Facebook (e-mail ou code parent seulement).
  const providerLinks = nativeApp() === 'ios' ? [] : providers.map((p) => {
    const a = h('a', { class: `btn provider provider-${p}` }, `${connected ? 'Déverrouiller' : 'Continuer'} avec ${LABELS[p] ?? p}`);
    const update = () => { a.href = `api/oauth/${p}/start?return=${connected ? 'unlock' : 'app'}&consent=${connected || consent.checked ? 1 : 0}`; };
    consent.addEventListener('change', update);
    update();
    return a;
  });

  return h('section', { class: 'gate-account' },
    h('p', {}, connected ? 'Connectez-vous avec le compte parent de cet appareil :' : 'Connectez-vous pour ouvrir l’espace parent (compte gratuit, sans mot de passe à retenir) :'),
    providerLinks.length ? h('div', { class: 'provider-list' }, providerLinks) : null,
    providerLinks.length ? h('p', { class: 'small gate-or' }, 'ou') : null,
    sendForm, codeStep, message);
}
