/**
 * Code parent local. Protège l'accès à l'espace parent sur l'appareil, rien de plus :
 * ce n'est ni une authentification serveur, ni un consentement, et une personne qui accède aux données
 * du navigateur peut le contourner (voir docs/espace-parent.md).
 *
 * Stockage : empreinte PBKDF2-SHA256 (150 000 itérations) avec un sel aléatoire, jamais le code en clair.
 * Après 5 erreurs, attente de 60 s, doublée à chaque nouvelle série d'erreurs (plafond 15 min).
 */
import { THRESHOLDS } from './config.js';
import { clock } from './ids.js';

const ITERATIONS = 150_000;

const toHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

export function isValidPin(pin) {
  return /^\d{4,6}$/.test(String(pin));
}

export async function hashPin(pin, saltHex = null) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return { salt: toHex(salt), hash: toHex(bits), iterations: ITERATIONS };
}

/** Comparaison en temps constant des empreintes. */
function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Vérifie un code et met à jour l'état de temporisation.
 * @returns {Promise<{ok: boolean, lockedUntil?: number, state: object}>}
 */
export async function checkPin(pin, stored, state = { failures: 0, lockedUntil: 0, lockouts: 0 }) {
  const now = clock.now();
  if (state.lockedUntil > now) return { ok: false, lockedUntil: state.lockedUntil, state };
  const { hash } = await hashPin(pin, stored.salt);
  if (equal(hash, stored.hash)) return { ok: true, state: { failures: 0, lockedUntil: 0, lockouts: 0 } };

  const failures = state.failures + 1;
  if (failures < THRESHOLDS.pinMaxAttempts) return { ok: false, state: { ...state, failures } };
  const lockouts = state.lockouts + 1;
  const lockedUntil = now + Math.min(THRESHOLDS.pinLockMs * 2 ** (lockouts - 1), 15 * 60_000);
  return { ok: false, lockedUntil, state: { failures: 0, lockedUntil, lockouts } };
}

/** Sans code configuré : petite question de calcul pour écarter les tout-petits, pas une sécurité. */
export function grownUpQuestion(random = Math.random) {
  const a = 6 + Math.floor(random() * 4);
  const b = 3 + Math.floor(random() * 6);
  return { text: `${a} × ${b}`, answer: a * b };
}
