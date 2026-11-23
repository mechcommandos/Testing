/**
 * Calculs purs sur les résultats enregistrés : statut des compétences, suggestions de difficulté,
 * synthèses pour l'espace parent. Aucune donnée inventée : sans résultat, on le dit.
 * Règles documentées dans docs/progression.md et public/content/skills.json.
 */
import { THRESHOLDS } from './config.js';

export const SKILL_STATUS = {
  unexplored: 'Pas encore exploré',
  discovery: 'En découverte',
  practice: 'En pratique',
  regular: 'Réussites régulières',
};

/**
 * Statut d'une compétence à partir des résultats qui la travaillent.
 * @param {Array} results résultats d'un profil (tous jeux)
 */
export function skillStatus(skillId, results) {
  const related = results.filter((r) => r.skills?.includes(skillId)).sort((a, b) => a.createdAt - b.createdAt);
  const sessions = new Set(related.map((r) => r.sessionId));
  const recent = related.slice(-8);
  const successes = recent.filter((r) => r.success);
  const autonomous = recent.filter((r) => r.autonomous);
  const contexts = new Set(successes.map((r) => `${r.gameId}:${r.difficulty}`));
  const base = { skillId, activities: related.length, sessions: sessions.size, recentSuccesses: successes.length, recentAutonomous: autonomous.length, games: [...new Set(related.map((r) => r.gameId))] };

  if (related.length === 0) {
    return { ...base, status: 'unexplored', explanation: 'Aucune activité terminée pour cette compétence.' };
  }
  if (related.length >= 3 && sessions.size >= 2 && successes.length >= 5 && autonomous.length >= 3 && contexts.size >= 2) {
    return { ...base, status: 'regular', explanation: `${successes.length} réussites sur les ${recent.length} dernières activités, dont ${autonomous.length} sans indice, dans ${contexts.size} jeux ou niveaux différents.` };
  }
  if (related.length >= 3 && sessions.size >= 2) {
    return { ...base, status: 'practice', explanation: `${related.length} activités terminées sur ${sessions.size} sessions.` };
  }
  return {
    ...base, status: 'discovery',
    explanation: `${related.length} activité${related.length > 1 ? 's' : ''} terminée${related.length > 1 ? 's' : ''} : pas encore assez de données pour parler de régularité.`,
  };
}

/**
 * Suggestion après une activité : 'harder' (plusieurs réussites autonomes variées), 'help' (difficultés
 * répétées) ou null. Elle ne change jamais la difficulté en cours de défi : l'interface la propose à la fin.
 * @param {Array} results résultats du profil pour ce jeu et cette difficulté, du plus ancien au plus récent
 */
export function suggestion(results, { maxDifficulty = 2, difficulty = 0 } = {}) {
  const window = results.slice(-THRESHOLDS.suggestHarderWindow);
  const autonomous = window.filter((r) => r.autonomous);
  const levels = new Set(autonomous.map((r) => r.level ?? r.id));
  if (difficulty < maxDifficulty && autonomous.length >= THRESHOLDS.suggestHarderAfter && levels.size >= 2) return 'harder';
  const last = results.slice(-THRESHOLDS.suggestHelpAfter);
  if (last.length === THRESHOLDS.suggestHelpAfter && last.every((r) => !r.autonomous)) return 'help';
  return null;
}

export const PERIODS = {
  7: '7 derniers jours',
  30: '30 derniers jours',
  all: 'Depuis le début',
};

/** Synthèse d'un profil sur une période, à partir des seuls résultats et sessions enregistrés. */
export function summarize({ results, sessions, games, period = 'all', now = Date.now() }) {
  const since = period === 'all' ? 0 : now - Number(period) * 24 * 3600_000;
  const inPeriod = results.filter((r) => r.createdAt >= since);
  const sessionsIn = sessions.filter((s) => s.startedAt >= since);
  const byGame = new Map();
  for (const r of inPeriod) {
    const g = byGame.get(r.gameId) ?? { gameId: r.gameId, activities: 0, successes: 0, autonomous: 0, withHelp: 0, hints: 0, byDifficulty: {} };
    g.activities += 1;
    if (r.success) g.successes += 1;
    if (r.autonomous) g.autonomous += 1;
    if (r.success && !r.autonomous) g.withHelp += 1;
    g.hints += r.hints;
    g.byDifficulty[r.difficulty] = (g.byDifficulty[r.difficulty] ?? 0) + (r.success ? 1 : 0);
    byGame.set(r.gameId, g);
  }
  const gameName = (id) => games.find((x) => x.id === id)?.name ?? id;
  return {
    period,
    activities: inPeriod.length,
    successes: inPeriod.filter((r) => r.success).length,
    autonomous: inPeriod.filter((r) => r.autonomous).length,
    withHelp: inPeriod.filter((r) => r.success && !r.autonomous).length,
    gamesExplored: byGame.size,
    activeMs: sessionsIn.reduce((total, s) => total + (s.activeMs ?? 0), 0),
    sessions: sessionsIn.length,
    lastSessionAt: sessions.reduce((latest, s) => Math.max(latest, s.endedAt ?? s.startedAt), 0) || null,
    games: [...byGame.values()].map((g) => ({ ...g, name: gameName(g.gameId) })).sort((a, b) => b.activities - a.activities),
  };
}

/** Date de la première réussite au dernier niveau d'un jeu (le jeu est alors « terminé »), ou null. */
/** Parties gagnées par niveau avant de passer au suivant. */
export const LEVEL_PLAYS = 3;

/** Parties réussies à un niveau (résultats d'un même jeu). */
export function levelPlays(results, difficulty) {
  return results.filter((r) => r.success && r.difficulty === difficulty).length;
}

/** Jeu terminé : date de la LEVEL_PLAYS-ième partie réussie au dernier niveau (null sinon). */
export function gameFinishedAt(results, game) {
  if (!game) return null;
  const last = game.difficulties.length - 1;
  const at = results.filter((r) => r.gameId === game.id && r.success && r.difficulty === last).map((r) => r.createdAt).sort((a, b) => a - b);
  return at.length >= LEVEL_PLAYS ? at[LEVEL_PLAYS - 1] : null;
}

/** Jeux terminés (tous les niveaux réussis), du plus récent au plus ancien : [{ gameId, name, at }]. */
export function finishedGames(results, games) {
  return games.map((g) => ({ gameId: g.id, name: g.name, at: gameFinishedAt(results, g) })).filter((x) => x.at).sort((a, b) => b.at - a.at);
}

/** Phrase factuelle sur un jeu, par difficulté : « 4 activités réussies en “Compter jusqu'à 5” ». */
export function describeGame(gameSummary, game) {
  return Object.entries(gameSummary.byDifficulty)
    .filter(([, n]) => n > 0)
    .map(([d, n]) => `${n} activité${n > 1 ? 's' : ''} réussie${n > 1 ? 's' : ''} en « ${levelName(game, Number(d))} »`);
}

/** Nom court d'une difficulté : levelNames, sinon le début de sa description. */
export function levelName(game, index) {
  return game?.levelNames?.[index] ?? game?.difficulties?.[index]?.split(':')[0] ?? `Niveau ${index + 1}`;
}

export function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (ms > 0 && minutes === 0) return 'moins d’une minute';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}
