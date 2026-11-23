/**
 * Cet appareil vu du compte parent : identifiant local, enregistrement auprès du serveur, consignes reçues.
 *
 * Consignes (réglage local « meta:devicePolicy », fixées depuis l'espace parent en ligne) :
 *   { deviceId, name, gamesEnabled, settings: { sound?, speech?, reducedMotion?, breakReminderMin? }, blockedGames: [] }
 * Elles restent appliquées hors ligne (dernière version reçue) et disparaissent quand le compte est déconnecté.
 * Contrôle parental coopératif : l'application les respecte, ce n'est pas une barrière de sécurité.
 */
import { api } from './api.js';
import { uuid as makeUuid } from './ids.js'; // repli si crypto.randomUUID manque

export const MANAGED_KEYS = ['sound', 'speech', 'reducedMotion', 'breakReminderMin'];
export const REFRESH_MS = 5 * 60 * 1000;

/** Réglages réellement appliqués : ceux de l'appareil, remplacés par ceux imposés par le parent. */
export function effectiveSettings(local, policy) {
  const managed = {};
  for (const key of MANAGED_KEYS) if (policy?.settings && key in policy.settings) managed[key] = policy.settings[key];
  return { ...local, ...managed };
}

/** Clés de réglage verrouillées par le compte parent (affichées grisées dans l'appli). */
export function managedKeys(policy) {
  return MANAGED_KEYS.filter((key) => policy?.settings && key in policy.settings);
}

export function gamesPaused(policy, now = Date.now()) {
  return policy?.gamesEnabled === false || (Number.isFinite(policy?.blockedUntil) && policy.blockedUntil > now);
}

export function gameAllowed(policy, gameId) {
  return !gamesPaused(policy) && !(policy?.blockedGames ?? []).includes(gameId);
}

/** Nom lisible de la plateforme, tiré du navigateur (aucune empreinte : juste un libellé pour le parent). */
export function platformLabel(ua = globalThis.navigator?.userAgent ?? '') {
  const os = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Téléphone Android' : 'Tablette Android')
    : /CrOS/.test(ua) ? 'Chromebook' : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${os} · ${browser}` : os;
}

export class DeviceClient {
  constructor(store, { call = api, onPolicy = () => {}, onSignedOut = () => {}, uuid = makeUuid, ua } = {}) {
    Object.assign(this, { store, call, onPolicy, onSignedOut, uuid, ua });
    this.current = null;
    this.running = null;
  }

  async load() {
    this.current = await this.store.getMeta('devicePolicy', null);
    return this.current;
  }

  policy() { return this.current; }

  async deviceId() {
    let id = await this.store.getMeta('deviceId', null);
    if (!id) {
      id = this.uuid();
      await this.store.setMeta('deviceId', id);
    }
    return id;
  }

  /** Enregistre l'appareil et récupère ses consignes (une requête à la fois) ; sans compte, ne fait rien. */
  register() {
    this.running ??= this.#register().finally(() => { this.running = null; });
    return this.running;
  }

  async #register() {
    const account = await this.store.getMeta('account', null);
    if (account?.status !== 'connected') {
      if (this.current) await this.setPolicy(null);
      return { ok: false, error: 'signed-out' };
    }
    const r = await this.call('devices/register', { method: 'POST', body: { deviceId: await this.deviceId(), platform: platformLabel(this.ua) } });
    if (r.ok) {
      await this.setPolicy(r.data);
      return { ok: true, policy: r.data };
    }
    // Session fermée (appareil déconnecté depuis l'espace parent, ou expiration) : le compte est déconnecté ici.
    if (r.status === 401) {
      await this.store.setMeta('account', { ...account, status: 'signed-out', lastError: 'unauthenticated' });
      await this.setPolicy(null);
      this.onSignedOut();
      return { ok: false, error: 'unauthenticated' };
    }
    // Hors ligne ou erreur passagère : on garde les dernières consignes reçues.
    return { ok: false, error: r.data?.error ?? 'server_error' };
  }

  async setPolicy(policy) {
    const before = JSON.stringify(this.current);
    this.current = policy;
    await this.store.setMeta('devicePolicy', policy);
    if (JSON.stringify(policy) !== before) this.onPolicy(policy);
  }

  /** Déconnexion volontaire : les consignes ne s'appliquent plus. */
  clear() { return this.setPolicy(null); }
}
