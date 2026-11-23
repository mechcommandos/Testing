/**
 * Export / import des données locales (espace parent uniquement).
 * Format JSON versionné ; l'import est validé entièrement avant toute écriture, puis écrit en une transaction :
 * un fichier invalide ne modifie rien. Doublons : un résultat déjà présent (même identifiant) est ignoré.
 */
import { AGE_BANDS, AVATARS, APP } from './config.js';

export const BACKUP_FORMAT = 'layjou-backup';
export const BACKUP_VERSION = 1;

export async function exportData(store) {
  const [profiles, results, sessions, progress] = await Promise.all([
    store.db.getAll('profiles'), store.db.getAll('results'), store.db.getAll('sessions'), store.db.getAll('progress'),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: APP.version,
    exportedAt: new Date().toISOString(),
    profiles: profiles.filter((p) => !p.guest),
    results: results.filter((r) => profiles.some((p) => p.id === r.profileId && !p.guest)),
    sessions: sessions.filter((s) => profiles.some((p) => p.id === s.profileId && !p.guest)),
    progress: progress.filter((g) => profiles.some((p) => p.id === g.profileId && !p.guest)),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valide un objet d'import. Retourne { ok, errors, data, summary }. */
export function validateBackup(raw, knownGameIds) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Le fichier ne contient pas de données lisibles.'] };
  if (raw.format !== BACKUP_FORMAT) errors.push('Ce fichier n’est pas une sauvegarde Layjou.');
  if (raw.version !== BACKUP_VERSION) errors.push(`Version de sauvegarde non prise en charge (${raw.version}).`);
  for (const key of ['profiles', 'results', 'sessions', 'progress']) {
    if (!Array.isArray(raw[key])) errors.push(`Section « ${key} » absente ou invalide.`);
  }
  if (errors.length) return { ok: false, errors };

  const profileIds = new Set();
  raw.profiles.forEach((p, i) => {
    if (!UUID.test(p?.id ?? '')) errors.push(`Profil ${i + 1} : identifiant invalide.`);
    if (typeof p?.nickname !== 'string' || !p.nickname.trim() || p.nickname.length > 20) errors.push(`Profil ${i + 1} : pseudonyme invalide.`);
    if (!AVATARS.includes(p?.avatar)) errors.push(`Profil ${i + 1} : avatar inconnu.`);
    if (!AGE_BANDS.some((b) => b.id === p?.ageBand)) errors.push(`Profil ${i + 1} : tranche d’âge inconnue.`);
    profileIds.add(p?.id);
  });
  raw.results.forEach((r, i) => {
    if (!UUID.test(r?.id ?? '') || !profileIds.has(r?.profileId)) errors.push(`Résultat ${i + 1} : identifiant ou profil invalide.`);
    if (!knownGameIds.includes(r?.gameId)) errors.push(`Résultat ${i + 1} : jeu inconnu.`);
    if (typeof r?.success !== 'boolean' || !Number.isFinite(r?.createdAt)) errors.push(`Résultat ${i + 1} : contenu invalide.`);
  });
  raw.sessions.forEach((s, i) => {
    if (!UUID.test(s?.id ?? '') || !profileIds.has(s?.profileId) || !Number.isFinite(s?.activeMs)) errors.push(`Session ${i + 1} : invalide.`);
  });
  raw.progress.forEach((g, i) => {
    if (!profileIds.has(g?.profileId) || !knownGameIds.includes(g?.gameId) || g?.key !== `${g?.profileId}:${g?.gameId}`) errors.push(`Progression ${i + 1} : invalide.`);
  });
  if (errors.length) return { ok: false, errors: errors.slice(0, 12) };

  return {
    ok: true,
    errors: [],
    data: raw,
    summary: { profiles: raw.profiles.map((p) => p.nickname), results: raw.results.length, exportedAt: raw.exportedAt },
  };
}

/**
 * Applique un import validé. mode 'merge' : ajoute les profils absents et les résultats inconnus ;
 * mode 'replace' : efface d'abord toutes les données locales (après confirmation dans l'interface).
 */
export async function applyBackup(store, data, mode = 'merge') {
  const writes = [];
  if (mode === 'replace') {
    for (const store_ of ['profiles', 'results', 'sessions', 'progress', 'syncQueue']) {
      for (const row of await store.db.getAll(store_)) writes.push({ store: store_, remove: row.id ?? row.key });
    }
  }
  const existing = mode === 'replace' ? new Set() : new Set((await store.db.getAll('results')).map((r) => r.id));
  const existingProfiles = mode === 'replace' ? new Set() : new Set((await store.db.getAll('profiles')).map((p) => p.id));
  for (const p of data.profiles) if (!existingProfiles.has(p.id)) writes.push({ store: 'profiles', value: { ...p, guest: false, sync: false } }); // la synchronisation se réactive explicitement
  for (const r of data.results) if (!existing.has(r.id)) writes.push({ store: 'results', value: r });
  for (const s of data.sessions) writes.push({ store: 'sessions', value: s });
  for (const g of data.progress) if (mode === 'replace' || !existingProfiles.has(g.profileId)) writes.push({ store: 'progress', value: g });
  await store.db.putMany(writes);
  return { profiles: data.profiles.length, results: data.results.filter((r) => !existing.has(r.id)).length };
}

/** Récapitulatif CSV (une ligne par profil et par jeu), séparateur point-virgule pour les tableurs français. */
export function summaryCsv(profiles, results, games) {
  const rows = [['Profil', 'Jeu', 'Activités terminées', 'Réussites', 'Réussites sans indice', 'Réussites avec aide', 'Indices utilisés', 'Dernière activité']];
  for (const profile of profiles) {
    const byGame = new Map();
    for (const r of results.filter((x) => x.profileId === profile.id)) {
      const g = byGame.get(r.gameId) ?? { n: 0, ok: 0, auto: 0, help: 0, hints: 0, last: 0 };
      g.n += 1; g.ok += r.success ? 1 : 0; g.auto += r.autonomous ? 1 : 0; g.help += r.success && !r.autonomous ? 1 : 0; g.hints += r.hints; g.last = Math.max(g.last, r.createdAt);
      byGame.set(r.gameId, g);
    }
    for (const [gameId, g] of byGame) {
      rows.push([profile.nickname, games.find((x) => x.id === gameId)?.name ?? gameId, g.n, g.ok, g.auto, g.help, g.hints, new Date(g.last).toISOString().slice(0, 10)]);
    }
  }
  const cell = (v) => {
    const s = String(v);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // pas de formule exécutée par le tableur
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}
