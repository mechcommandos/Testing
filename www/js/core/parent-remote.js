/**
 * Ce que partagent l'espace parent en ligne (espace-parent.html) et l'espace parent de l'application :
 * réglages imposables à distance, durées de blocage momentané, paiement de l'offre Famille par Paddle.
 * Aucune donnée bancaire ne passe par Layjou : le paiement s'ouvre dans la fenêtre de Paddle.
 */
import { api } from './api.js';

export const REMOTE_SETTINGS = [
  { key: 'sound', label: 'Sons et voix', options: [['', 'Au choix de l’appareil'], ['true', 'Activés'], ['false', 'Coupés']] },
  { key: 'speech', label: 'Consignes lues à voix haute', options: [['', 'Au choix de l’appareil'], ['true', 'Oui'], ['false', 'Non']] },
  { key: 'reducedMotion', label: 'Animations', options: [['', 'Au choix de l’appareil'], ['false', 'Normales'], ['true', 'Réduites']] },
  { key: 'breakReminderMin', label: 'Rappel de pause', options: [['', 'Au choix de l’appareil'], ['0', 'Désactivé'], ['15', 'Après 15 min'], ['20', 'Après 20 min'], ['30', 'Après 30 min']] },
];

/** Valeur choisie dans une liste de réglage → réglages à envoyer (vide = laissé au choix de l'appareil). */
export function withSetting(settings, key, value) {
  const next = { ...settings };
  if (value === '') delete next[key];
  else next[key] = key === 'breakReminderMin' ? Number(value) : value === 'true';
  return next;
}

export const BLOCKS = [[30, '30 minutes'], [60, '1 heure'], [120, '2 heures'], ['matin', 'Jusqu’à demain matin (7 h)']];

export function blockUntil(choice, now = new Date()) {
  if (choice !== 'matin') return now.getTime() + choice * 60_000;
  const next = new Date(now);
  next.setDate(next.getDate() + (now.getHours() >= 7 ? 1 : 0));
  next.setHours(7, 0, 0, 0);
  return next.getTime();
}

/** « 18:30 » ou « demain, 07:00 ». */
export function blockedLabel(until) {
  const when = new Date(until);
  return `${when.toDateString() === new Date().toDateString() ? '' : 'demain, '}${when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function since(datetime) {
  const date = new Date(`${datetime.replace(' ', 'T')}Z`);
  const minutes = Math.round((Date.now() - date) / 60000);
  if (minutes < 2) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 48 * 60) return `il y a ${Math.round(minutes / 60)} h`;
  return `le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

export const longDate = (datetime) => new Date(`${datetime.replace(' ', 'T')}Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Texte d'état de l'offre Famille active. */
export function planStatusText(account, price) {
  if (account.planStatus === 'gratuite') return 'Offerte gratuitement à tous les parents inscrits : aucun paiement.';
  if (account.planStatus === 'offert') return 'Offerte pendant le lancement : le paiement n’est pas encore ouvert. Quand il ouvrira, il faudra s’abonner pour la garder.';
  if (account.planStatus === 'canceling') return `Résiliée : l’offre reste active jusqu’au ${longDate(account.planUntil)}, sans nouveau prélèvement.`;
  if (account.planStatus === 'past_due') return 'Le dernier paiement n’a pas abouti : mettez à jour le moyen de paiement pour garder l’offre.';
  return account.planUntil ? `Prochain renouvellement le ${longDate(account.planUntil)} (${price} par mois).` : 'Offre active.';
}

function loadPaddle() {
  if (window.Paddle) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

/**
 * Ouvre le paiement Paddle (fenêtre par-dessus la page), puis attend que le webhook active l'offre.
 * `say(texte)` affiche l'avancement ; `done()` est appelé quand l'offre Famille est active.
 */
export async function openCheckout(account, billing, { say, done }) {
  say('Ouverture du paiement…');
  try {
    await loadPaddle();
    if (billing.environment === 'sandbox') window.Paddle.Environment.set('sandbox');
    window.Paddle.Initialize({
      token: billing.clientToken,
      eventCallback: (e) => { if (e?.name === 'checkout.completed') waitForPlan(say, done); },
    });
    window.Paddle.Checkout.open({
      items: [{ priceId: billing.priceId, quantity: 1 }],
      customer: account.email ? { email: account.email } : undefined,
      customData: account.checkout,
      settings: { displayMode: 'overlay', locale: 'fr', theme: 'light', allowLogout: false },
    });
    say('');
  } catch {
    say('Le paiement n’a pas pu s’ouvrir. Vérifiez la connexion, ou désactivez un bloqueur de contenu.');
  }
}

async function waitForPlan(say, done) {
  say('Paiement reçu, activation de l’offre…');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const me = await api('account');
    if (me.ok && me.data.plan === 'famille') return done();
  }
  say('Le paiement est enregistré ; l’activation peut prendre quelques minutes. Revenez un peu plus tard.');
}
