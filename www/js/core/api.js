/**
 * Appels à l'API Layjou (même origine). Ne lève jamais d'exception : renvoie { ok, status, data }.
 * status 0 = pas de réseau. L'en-tête X-Layjou est exigé par le serveur sur toute requête POST (anti-CSRF).
 */
import { nativeApp } from './native.js';

export async function api(path, { method = 'GET', body, fetchImpl = globalThis.fetch } = {}) {
  try {
    const response = await fetchImpl(`api/${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-Layjou': '1' } : {},
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });
    let data = {};
    try { data = await response.json(); } catch { /* corps vide ou non JSON */ }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'network' } };
  }
}

/** Messages affichés aux parents pour chaque code d'erreur du serveur. */
export const API_ERRORS = {
  network: 'Pas de connexion au serveur. Vérifie la connexion internet et réessaie.',
  invalid_email: 'Cette adresse e-mail n’est pas valide.',
  weak_password: 'Le mot de passe doit faire au moins 10 caractères et ne pas être l’adresse e-mail.',
  consent_required: 'Coche la case pour confirmer que tu es le parent ou le responsable légal.',
  invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.',
  email_not_verified: 'Adresse pas encore confirmée : ouvre le lien reçu par e-mail.',
  invalid_token: 'Ce lien n’est plus valable (déjà utilisé ou expiré). Demande un nouveau lien.',
  too_many_requests: 'Trop d’essais. Patiente quelques minutes avant de réessayer.',
  unauthenticated: 'Session expirée : reconnecte-toi.',
  accounts_unavailable: 'Le compte parent n’est pas disponible sur ce serveur.',
  not_found: 'Le compte parent n’est pas disponible sur ce serveur.',
  confirmation_required: 'Écris SUPPRIMER pour confirmer.',
  device_limit: 'Limite de 20 appareils atteinte : déconnecte un ancien appareil depuis l’espace parent en ligne.',
  plan_required: 'Cette fonction fait partie de l’offre Famille.',
  invalid_code: 'Code incorrect ou expiré. Demandez-en un nouveau.',
  payment_required: 'Le paiement est ouvert : abonnez-vous pour activer l’offre Famille.',
  // Application iOS : pas de renvoi vers le site.
  subscription_active: nativeApp() === 'ios' ? 'L’abonnement Famille est encore actif : réessayez plus tard.' : 'Résiliez d’abord l’abonnement Famille (« Résilier l’abonnement », dans « Mon offre » de l’espace parent en ligne sur layjou.com) : sans cela, Paddle continuerait de le prélever.',
  device_foreign: 'Cet appareil est relié à un autre compte parent.',
  device_not_found: 'Cet appareil n’existe plus.',
  server_error: 'Le serveur a rencontré un problème. Réessaie plus tard.',
};

export function errorText(result) {
  const code = result?.data?.error;
  return API_ERRORS[code] ?? API_ERRORS.server_error;
}
