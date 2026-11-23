/**
 * Offres Gratuit et Famille (règles appliquées sur l'appareil, testées dans tests/js/plan.test.js).
 *
 * Gratuit : tous les jeux, un profil d'enfant, 1 heure de jeu par jour sur l'appareil (tous profils confondus).
 * Famille (abonnement du compte parent) : profils illimités, pas de limite générale, une limite par enfant au choix
 * du parent, blocage momentané d'un appareil, bilan par e-mail, historique et graphiques, mots de la semaine.
 *
 * L'offre vient du compte parent connecté (consignes de l'appareil, champ plan). Sans compte : Gratuit.
 * Comme les autres consignes, c'est un contrôle coopératif : l'application le respecte.
 */
export const FREE_DAILY_MIN = 60;
export const FREE_PROFILES = 1;
export const LIMIT_CHOICES = [null, 15, 30, 45, 60, 90, 120, 180];
export const PRICE = '2,99 €';

export function isFamily(policy) {
  return policy?.plan === 'famille';
}

export function startOfDay(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Temps de jeu actif aujourd'hui (ms), pour un profil ou pour tout l'appareil. */
export function playedToday(sessions, now, profileId = null) {
  const since = startOfDay(now);
  return sessions
    .filter((s) => s.startedAt >= since && (profileId === null || s.profileId === profileId))
    .reduce((total, s) => total + (s.activeMs ?? 0), 0);
}

/**
 * Limite du jour qui s'applique : { minutes, scope } ou null (pas de limite).
 * scope 'device' : offre gratuite, tout l'appareil ; scope 'profile' : limite choisie pour cet enfant (Famille).
 */
export function dailyLimit({ family, profile }) {
  if (!family) return { minutes: FREE_DAILY_MIN, scope: 'device' };
  const m = profile?.dailyLimitMin;
  return Number.isInteger(m) && m > 0 ? { minutes: m, scope: 'profile' } : null;
}

/** Temps restant aujourd'hui (ms), Infinity sans limite. extraMs : temps de la session en cours, pas encore enregistré. */
export function timeLeft({ family, profile, sessions, now, extraMs = 0 }) {
  const limit = dailyLimit({ family, profile });
  if (!limit) return Infinity;
  const used = playedToday(sessions, now, limit.scope === 'profile' ? profile?.id ?? null : null) + extraMs;
  return Math.max(0, limit.minutes * 60_000 - used);
}

/** L'appareil est-il bloqué momentanément (jusqu'à une heure choisie par le parent) ? */
export function blockedUntil(policy, now) {
  const until = policy?.blockedUntil;
  return Number.isFinite(until) && until > now ? until : null;
}

/** Un profil de plus peut-il être créé ? (Gratuit : un seul enfant ; le mode invité ne compte pas.) */
export function canAddProfile({ family, profiles }) {
  return family || profiles.filter((p) => !p.guest).length < FREE_PROFILES;
}

/** Mots de la semaine : nettoie une saisie libre (un mot par ligne, virgule ou espace). */
export function parseWords(text, max = 40) {
  const words = String(text ?? '').split(/[\s,;]+/).map((w) => w.trim().toLowerCase()).filter((w) => /^[\p{L}][\p{L}'’-]{0,29}$/u.test(w));
  return [...new Set(words)].slice(0, max);
}
