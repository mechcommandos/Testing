/**
 * Accès aux données locales : profils, réglages, résultats, sessions et progression par jeu.
 * Toutes les écritures portent l'identifiant du profil reçu au moment de l'action : un changement de profil
 * ne peut pas réattribuer un résultat en cours.
 *
 * Synchronisation (compte parent) : chaque modification d'un profil marqué `sync` ajoute une entrée dans
 * `syncQueue` ; core/sync.js l'envoie au serveur. Les changements reçus d'un autre appareil passent par les
 * méthodes `applyRemote*`, qui n'ajoutent rien à la file.
 */
import { AGE_BANDS, AVATARS } from './config.js';
import { clock, uuid } from './ids.js';

export const GUEST_TTL_MS = 7 * 24 * 3600_000;

export class Store {
  constructor(storage) {
    this.db = storage;
    /** Appelé après chaque ajout dans la file de synchronisation (core/sync.js y branche un envoi différé). */
    this.onQueue = null;
  }

  // ---------- Profils ----------

  async listProfiles({ includeArchived = false, includeGuest = false } = {}) {
    const all = await this.db.getAll('profiles');
    return all
      .filter((p) => (includeArchived || !p.archivedAt) && (includeGuest || !p.guest))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  getProfile(id) { return this.db.get('profiles', id); }

  validateProfile({ nickname, avatar, ageBand }) {
    const errors = {};
    const name = String(nickname ?? '').trim();
    if (name.length < 1 || name.length > 20) errors.nickname = 'Le pseudonyme doit faire entre 1 et 20 caractères.';
    if (!AVATARS.includes(avatar)) errors.avatar = 'Choisis un avatar.';
    if (!AGE_BANDS.some((b) => b.id === ageBand)) errors.ageBand = 'Choisis une tranche d’âge.';
    return errors;
  }

  async createProfile({ nickname, avatar, ageBand, sync = false }) {
    const errors = this.validateProfile({ nickname, avatar, ageBand });
    if (Object.keys(errors).length) throw Object.assign(new Error('Profil invalide'), { errors });
    const now = clock.now();
    const profile = { id: uuid(), nickname: String(nickname).trim(), avatar, ageBand, prefs: { favorites: [] }, guest: false, archivedAt: null, createdAt: now, updatedAt: now, sync: !!sync };
    await this.db.put('profiles', profile);
    await this.enqueue('profile', profile.id, profile);
    return profile;
  }

  /** Modifier pseudonyme, avatar ou tranche d'âge : les acquis ne sont jamais effacés. */
  async updateProfile(id, changes) {
    const profile = await this.getProfile(id);
    if (!profile) throw new Error('Profil introuvable');
    const next = { ...profile, ...pick(changes, ['nickname', 'avatar', 'ageBand', 'dailyLimitMin', 'words', 'goal', 'revisions']) };
    const errors = this.validateProfile(next);
    if (Object.keys(errors).length) throw Object.assign(new Error('Profil invalide'), { errors });
    next.nickname = String(next.nickname).trim();
    next.updatedAt = clock.now();
    await this.db.put('profiles', next);
    await this.enqueue('profile', id, next);
    return next;
  }

  async setArchived(id, archived) {
    const profile = await this.getProfile(id);
    profile.archivedAt = archived ? clock.now() : null;
    profile.updatedAt = clock.now();
    await this.db.put('profiles', profile);
    await this.enqueue('profile', id, profile);
  }

  /** Les favoris restent propres à l'appareil : ils ne sont pas synchronisés. */
  async toggleFavorite(profileId, gameId) {
    const profile = await this.getProfile(profileId);
    const favorites = new Set(profile.prefs?.favorites ?? []);
    favorites.has(gameId) ? favorites.delete(gameId) : favorites.add(gameId);
    profile.prefs = { ...profile.prefs, favorites: [...favorites] };
    await this.db.put('profiles', profile);
    return favorites.has(gameId);
  }

  /** Efface la progression d'un profil sans supprimer le profil (sur tous les appareils s'il est synchronisé). */
  async resetProfile(id) {
    const profile = await this.getProfile(id);
    const resetAt = clock.now();
    await this.wipe(id);
    if (profile) await this.db.put('profiles', { ...profile, resetAt });
    if (profile?.sync) {
      await this.dropQueued(id);
      await this.enqueue('reset', id, profile, { resetAt });
    }
  }

  async deleteProfile(id) {
    const profile = await this.getProfile(id);
    await this.dropQueued(id);
    await this.wipe(id);
    await this.db.delete('profiles', id);
    await this.setMeta(`world:${id}`, null); // album et compagnon du profil (core/world.js)
    if (profile?.sync) await this.enqueue('deletion', id, profile);
  }

  /** Supprime résultats, sessions et progression d'un profil (tous, ou ceux antérieurs à `until`). */
  async wipe(profileId, until = Infinity) {
    const [results, sessions, progress] = await Promise.all([
      this.db.query('results', 'profileId', profileId), this.db.query('sessions', 'profileId', profileId), this.db.query('progress', 'profileId', profileId),
    ]);
    const all = until === Infinity;
    await this.db.putMany([
      ...results.filter((r) => all || r.createdAt <= until).map((r) => ({ store: 'results', remove: r.id })),
      ...sessions.filter((s) => all || s.startedAt <= until).map((s) => ({ store: 'sessions', remove: s.id })),
      ...(all ? progress.map((p) => ({ store: 'progress', remove: p.key })) : []),
    ]);
    if (!all) await this.rebuildProgress(profileId);
  }

  /** Profil invité : sans pseudonyme choisi, données signalées comme temporaires, jamais synchronisé. */
  async guestProfile() {
    const guests = (await this.db.getAll('profiles')).filter((p) => p.guest);
    const fresh = guests.find((g) => clock.now() - g.createdAt < GUEST_TTL_MS);
    for (const old of guests.filter((g) => g !== fresh)) await this.deleteProfile(old.id);
    if (fresh) return fresh;
    const now = clock.now();
    const guest = { id: uuid(), nickname: 'Invité', avatar: 'robot', ageBand: '4-5', prefs: { favorites: [] }, guest: true, archivedAt: null, createdAt: now, updatedAt: now, sync: false };
    await this.db.put('profiles', guest);
    return guest;
  }

  /** Rattacher explicitement la progression invitée à un nouveau profil (choisi par un parent). */
  async adoptGuest(guestId, { nickname, avatar, ageBand, sync = false }) {
    const guest = await this.getProfile(guestId);
    if (!guest?.guest) throw new Error('Ce profil n’est pas un profil invité');
    const errors = this.validateProfile({ nickname, avatar, ageBand });
    if (Object.keys(errors).length) throw Object.assign(new Error('Profil invalide'), { errors });
    const profile = { ...guest, nickname: String(nickname).trim(), avatar, ageBand, guest: false, updatedAt: clock.now(), sync: false };
    await this.db.put('profiles', profile);
    if (sync) await this.setSync(profile.id, true);
    return { ...profile, sync: !!sync };
  }

  // ---------- Réglages ----------

  async getSettings() {
    const row = await this.db.get('settings', 'parent');
    return { sound: true, volume: 0.8, speech: true, reducedMotion: false, breakReminderMin: 0, pin: null, voice: null, ...(row?.value ?? {}) };
  }

  async saveSettings(changes) {
    const current = await this.getSettings();
    const value = { ...current, ...changes };
    await this.db.put('settings', { key: 'parent', value });
    return value;
  }

  async getMeta(key, fallback = null) { return (await this.db.get('settings', `meta:${key}`))?.value ?? fallback; }
  async setMeta(key, value) { await this.db.put('settings', { key: `meta:${key}`, value }); }

  // ---------- Progression ----------

  progressKey(profileId, gameId) { return `${profileId}:${gameId}`; }

  async getProgress(profileId, gameId) {
    return (await this.db.get('progress', this.progressKey(profileId, gameId))) ?? {
      key: this.progressKey(profileId, gameId), profileId, gameId, difficulty: 0, completed: {}, activities: 0, successes: 0, lastPlayedAt: null, resume: null,
    };
  }

  progressForProfile(profileId) { return this.db.query('progress', 'profileId', profileId); }
  resultsForProfile(profileId) { return this.db.query('results', 'profileId', profileId); }
  resultsForGame(profileId, gameId) { return this.db.query('results', 'profileGame', [profileId, gameId]); }
  sessionsForProfile(profileId) { return this.db.query('sessions', 'profileId', profileId); }

  async setDifficulty(profileId, gameId, difficulty) {
    const progress = await this.getProgress(profileId, gameId);
    progress.difficulty = difficulty;
    await this.db.put('progress', progress);
  }

  async saveResume(profileId, gameId, resume) {
    const progress = await this.getProgress(profileId, gameId);
    progress.resume = resume;
    await this.db.put('progress', progress);
  }

  /**
   * Enregistre un résultat d'activité et met à jour la progression du jeu en une seule transaction
   * (avec l'entrée de file de synchronisation si le profil est synchronisé).
   * Idempotent : un résultat déjà connu (même identifiant) ne change rien.
   */
  async recordResult(result, { queue = true } = {}) {
    if (await this.db.get('results', result.id)) return false;
    const progress = await this.getProgress(result.profileId, result.gameId);
    countResult(progress, result);
    const writes = [{ store: 'results', value: result }, { store: 'progress', value: progress }];
    const profile = queue ? await this.getProfile(result.profileId) : null;
    const entry = profile?.sync && !profile.guest ? queueEntry('result', result.id, result.profileId) : null;
    if (entry) writes.push({ store: 'syncQueue', value: entry });
    await this.db.putMany(writes);
    if (entry) this.onQueue?.();
    return true;
  }

  async saveSession(session) {
    await this.db.put('sessions', session);
    await this.enqueue('session', session.id, await this.getProfile(session.profileId));
  }

  /** Recalcule les compteurs de progression depuis les résultats (après une remise à zéro partielle). */
  async rebuildProgress(profileId) {
    const [results, rows] = await Promise.all([this.resultsForProfile(profileId), this.progressForProfile(profileId)]);
    const byGame = new Map(rows.map((p) => [p.gameId, { ...p, completed: {}, activities: 0, successes: 0, lastPlayedAt: null }]));
    for (const r of results.sort((a, b) => a.createdAt - b.createdAt)) {
      if (!byGame.has(r.gameId)) byGame.set(r.gameId, await this.getProgress(profileId, r.gameId));
      countResult(byGame.get(r.gameId), r);
    }
    await this.db.putMany([...byGame.values()].map((value) => ({ store: 'progress', value })));
  }

  // ---------- File de synchronisation ----------

  async enqueue(kind, entityId, profile, extra = {}) {
    if (!profile?.sync || profile.guest) return;
    await this.db.put('syncQueue', { ...queueEntry(kind, entityId, profile.id), ...extra });
    this.onQueue?.();
  }

  async dropQueued(profileId) {
    const entries = (await this.db.getAll('syncQueue')).filter((e) => e.profileId === profileId);
    await this.db.putMany(entries.map((e) => ({ store: 'syncQueue', remove: e.id })));
  }

  /** Activer la synchronisation d'un profil envoie aussi tout son historique local. */
  async setSync(profileId, on) {
    const profile = await this.getProfile(profileId);
    if (!profile || profile.guest) return;
    await this.db.put('profiles', { ...profile, sync: on, syncIssue: null });
    if (!on) return this.dropQueued(profileId);
    const [sessions, results] = await Promise.all([this.sessionsForProfile(profileId), this.resultsForProfile(profileId)]);
    await this.db.putMany([
      { store: 'syncQueue', value: queueEntry('profile', profileId, profileId) },
      ...sessions.map((s) => ({ store: 'syncQueue', value: queueEntry('session', s.id, profileId) })),
      ...results.map((r) => ({ store: 'syncQueue', value: queueEntry('result', r.id, profileId) })),
    ]);
    this.onQueue?.();
  }

  /** Retire un profil du compte (serveur et autres appareils) en le gardant sur cet appareil, non synchronisé. */
  async removeFromAccount(profileId) {
    const profile = await this.getProfile(profileId);
    if (!profile?.sync) return;
    await this.dropQueued(profileId);
    await this.db.putMany([
      { store: 'profiles', value: { ...profile, sync: false, syncIssue: null } },
      { store: 'syncQueue', value: queueEntry('deletion', profileId, profileId) },
    ]);
    this.onQueue?.();
  }

  /** Déconnexion d'un compte au profit d'un autre, ou compte supprimé : plus rien n'est synchronisé. */
  async unsyncAll() {
    const profiles = await this.db.getAll('profiles');
    await this.db.putMany([
      ...profiles.filter((p) => p.sync).map((p) => ({ store: 'profiles', value: { ...p, sync: false } })),
      ...(await this.db.getAll('syncQueue')).map((e) => ({ store: 'syncQueue', remove: e.id })),
    ]);
  }

  // ---------- Changements reçus d'un autre appareil (rien n'est remis dans la file) ----------

  /** Profil reçu : créé s'il est inconnu ; ignoré si cet appareil ne le synchronise pas ; sinon le plus récent gagne. */
  async applyRemoteProfile(remote) {
    const local = await this.getProfile(remote.id);
    if (local && !local.sync) return false;
    let profile = local;
    if (!local) {
      profile = { id: remote.id, prefs: { favorites: [] }, guest: false, sync: true, createdAt: remote.createdAt, updatedAt: 0, archivedAt: null };
    }
    if (remote.updatedAt > profile.updatedAt) {
      profile = {
        ...profile, nickname: remote.nickname, avatar: remote.avatar, ageBand: remote.ageBand, updatedAt: remote.updatedAt,
        dailyLimitMin: remote.dailyLimitMin ?? null, words: Array.isArray(remote.words) ? remote.words : [],
        goal: remote.goal ?? null, revisions: remote.revisions ?? null,
        archivedAt: remote.archived ? (profile.archivedAt ?? remote.updatedAt) : null,
      };
    }
    const resetAt = remote.resetAt ?? 0;
    const needsReset = resetAt > (profile.resetAt ?? 0);
    if (needsReset) profile.resetAt = resetAt;
    // Écho de sa propre modification : rien n'a changé, rien n'est compté comme reçu.
    if (local && profile === local && !needsReset) return false;
    await this.db.put('profiles', profile);
    if (needsReset && local) await this.wipe(profile.id, resetAt);
    return true;
  }

  async applyRemoteSession(remote) {
    const profile = await this.getProfile(remote.profileId);
    if (!profile?.sync || remote.startedAt <= (profile.resetAt ?? 0)) return false;
    const local = await this.db.get('sessions', remote.id);
    const merged = local
      ? { ...local, endedAt: local.endedAt ?? remote.endedAt, endReason: local.endReason ?? remote.endReason, activeMs: Math.max(local.activeMs, remote.activeMs) }
      : { ...remote, activities: null };
    if (local && merged.endedAt === local.endedAt && merged.activeMs === local.activeMs && merged.endReason === local.endReason) return false;
    await this.db.put('sessions', merged);
    return true;
  }

  async applyRemoteResult(remote) {
    const profile = await this.getProfile(remote.profileId);
    if (!profile?.sync || remote.createdAt <= (profile.resetAt ?? 0)) return false;
    return this.recordResult({ ...remote, data: {} }, { queue: false });
  }

  /** Profil supprimé depuis un autre appareil : supprimé ici aussi, s'il y est synchronisé. */
  async applyRemoteDeletion(profileId) {
    const profile = await this.getProfile(profileId);
    if (!profile?.sync) return false;
    await this.dropQueued(profileId);
    await this.wipe(profileId);
    await this.db.delete('profiles', profileId);
    return true;
  }
}

function countResult(progress, result) {
  progress.activities += 1;
  if (result.success) progress.successes += 1;
  if (result.success && result.level !== undefined && result.level !== null) {
    const done = new Set(progress.completed[result.difficulty] ?? []);
    done.add(result.level);
    progress.completed[result.difficulty] = [...done];
  }
  progress.lastPlayedAt = Math.max(progress.lastPlayedAt ?? 0, result.createdAt);
}

/** `rev` change à chaque mise en file : une entrée modifiée pendant un envoi n'est pas retirée par erreur. */
function queueEntry(kind, entityId, profileId) {
  return { id: `${kind}:${entityId}`, kind, entityId, profileId, at: clock.now(), rev: uuid() };
}

function pick(object, keys) {
  return Object.fromEntries(keys.filter((k) => object[k] !== undefined).map((k) => [k, object[k]]));
}
