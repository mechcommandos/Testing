/**
 * Synchronisation avec le compte parent : envoie la file locale (syncQueue) par lots, puis applique les
 * changements reçus des autres appareils. Ne bloque jamais le jeu : en cas d'échec, la file attend.
 *
 * État du compte (réglage local « meta:account ») :
 *   { email, status: 'connected' | 'signed-out', cursor, lastSyncAt, lastError }
 */
import { api } from './api.js';
import { clock } from './ids.js';

export const BATCH = 400;
const MAX_ROUNDS = 20;
// Refus définitifs : l'entrée quitte la file (les autres refus n'existent pas côté serveur aujourd'hui).
const SERVER_KIND = { profile: 'profile', session: 'session', result: 'result', reset: 'reset', deletion: 'deletion' };

export class SyncClient {
  constructor(store, { call = api, onChange = () => {} } = {}) {
    this.store = store;
    this.call = call;
    this.onChange = onChange;
    this.running = null;
    this.timer = null;
  }

  account() { return this.store.getMeta('account', null); }
  async saveAccount(changes) {
    const next = { ...(await this.account()), ...changes };
    await this.store.setMeta('account', next);
    return next;
  }

  /** Envoi différé (regroupe les petites modifications) ; sans effet si aucun compte n'est connecté. */
  schedule(delayMs = 8000) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run().catch(() => {}), delayMs);
  }

  /** Une seule synchronisation à la fois ; renvoie { ok, error?, sent, received }. */
  run() {
    this.running ??= this.#run().finally(() => { this.running = null; });
    return this.running;
  }

  async #run() {
    let account = await this.account();
    if (account?.status !== 'connected') return { ok: false, error: 'signed-out', sent: 0, received: 0 };
    let sent = 0;
    let received = 0;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const batch = (await this.store.db.getAll('syncQueue')).sort((a, b) => a.at - b.at).slice(0, BATCH);
      const push = await this.buildPush(batch);
      const response = await this.call('sync', { method: 'POST', body: { cursor: account.cursor ?? 0, push } });
      if (!response.ok) {
        const error = response.data?.error ?? 'server_error';
        await this.saveAccount(response.status === 401 ? { status: 'signed-out', lastError: 'unauthenticated' } : { lastError: error });
        this.onChange();
        return { ok: false, error, sent, received };
      }
      const body = response.data;
      sent += await this.settle(batch, body);
      received += await this.applyPull(body);
      account = await this.saveAccount({ cursor: body.cursor, lastSyncAt: clock.now(), lastError: null });
      const remaining = (await this.store.db.getAll('syncQueue')).length;
      if (!body.more && (remaining === 0 || batch.length === 0)) break;
    }
    this.onChange();
    return { ok: true, sent, received };
  }

  /** Construit l'envoi ; chaque profil concerné par le lot est joint pour que ses données soient acceptées. */
  async buildPush(batch) {
    const push = { profiles: [], sessions: [], results: [], resets: [], deletions: [] };
    const profileIds = new Set();
    for (const entry of batch) {
      if (entry.kind === 'deletion') push.deletions.push(entry.entityId);
      else if (entry.kind === 'reset') { push.resets.push({ profileId: entry.profileId, resetAt: entry.resetAt }); profileIds.add(entry.profileId); }
      else if (entry.kind === 'session') {
        const s = await this.store.db.get('sessions', entry.entityId);
        if (s) push.sessions.push(toServerSession(s));
        profileIds.add(entry.profileId);
      } else if (entry.kind === 'result') {
        const r = await this.store.db.get('results', entry.entityId);
        if (r) push.results.push(toServerResult(r));
        profileIds.add(entry.profileId);
      } else profileIds.add(entry.profileId);
    }
    for (const id of profileIds) {
      const p = await this.store.getProfile(id);
      if (p?.sync && !push.deletions.includes(id)) push.profiles.push(toServerProfile(p));
    }
    return push;
  }

  /** Retire de la file ce que le serveur a traité, sauf si l'entrée a été modifiée entre-temps. */
  async settle(batch, body) {
    const handled = new Set([...body.accepted, ...body.rejected].filter((x) => x.id).map((x) => `${x.kind}:${x.id}`));
    const removals = [];
    for (const entry of batch) {
      const key = `${SERVER_KIND[entry.kind]}:${entry.entityId}`;
      const gone = entry.kind === 'session' || entry.kind === 'result' ? !(await this.store.db.get(`${entry.kind}s`, entry.entityId)) : false;
      if (!handled.has(key) && !gone) continue;
      const current = await this.store.db.get('syncQueue', entry.id);
      if (current?.rev === entry.rev) removals.push({ store: 'syncQueue', remove: entry.id });
    }
    await this.store.db.putMany(removals);
    for (const r of body.rejected) {
      if (r.kind !== 'profile' || !r.id) continue;
      if (r.reason === 'deleted') await this.store.applyRemoteDeletion(r.id);
      else if (r.reason === 'foreign' || r.reason === 'limit' || r.reason === 'invalid') {
        const p = await this.store.getProfile(r.id);
        if (p) {
          await this.store.dropQueued(r.id);
          await this.store.db.put('profiles', { ...p, sync: false, syncIssue: r.reason });
        }
      }
    }
    return removals.length;
  }

  async applyPull(body) {
    let count = 0;
    for (const p of body.profiles) if (await this.store.applyRemoteProfile(p)) count++;
    for (const s of body.sessions) if (await this.store.applyRemoteSession(s)) count++;
    for (const r of body.results) if (await this.store.applyRemoteResult(r)) count++;
    for (const id of body.deletions) if (await this.store.applyRemoteDeletion(id)) count++;
    return count;
  }
}

// ---------- Conversion vers le format du serveur (seuls les champs utiles, rien d'autre ne part) ----------

export function toServerProfile(p) {
  return {
    id: p.id, nickname: p.nickname, avatar: p.avatar, ageBand: p.ageBand, archived: !!p.archivedAt, createdAt: p.createdAt, updatedAt: p.updatedAt,
    dailyLimitMin: Number.isInteger(p.dailyLimitMin) ? p.dailyLimitMin : null, words: Array.isArray(p.words) ? p.words : [],
    goal: p.goal ?? null, revisions: p.revisions ?? null,
  };
}

export function toServerSession(s) {
  return {
    id: s.id, profileId: s.profileId, gameId: s.gameId, difficulty: s.difficulty, startedAt: s.startedAt,
    endedAt: s.endedAt ?? null, activeMs: clampInt(s.activeMs, 86_400_000), endReason: s.endReason ?? null,
  };
}

export function toServerResult(r) {
  return {
    id: r.id, profileId: r.profileId, sessionId: r.sessionId, gameId: r.gameId, difficulty: r.difficulty, level: r.level ?? null,
    success: !!r.success, autonomous: !!r.autonomous, hints: clampInt(r.hints, 65_535), errors: clampInt(r.errors, 65_535),
    attempts: clampInt(r.attempts, 65_535), durationMs: clampInt(r.durationMs, 86_400_000), skills: r.skills ?? [],
    contentVersion: r.contentVersion ?? 1, createdAt: r.createdAt,
  };
}

function clampInt(value, max) {
  return Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
}
