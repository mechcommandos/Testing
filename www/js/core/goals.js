/**
 * Offre Famille : objectif de la semaine et récompense choisis par le parent, programme du jour, révisions de l'école.
 * Règles pures, testées (tests/js/goals.test.js). Les données vivent sur le profil (synchronisé) :
 *   goal      : { target: 1..100, theme: null | domaine, reward: texte libre (60 car.) } — compté du lundi au dimanche ;
 *   revisions : { tables: [1..10], sounds: ['o', 'on', …] } — tables et sons étudiés en classe.
 */
export const GOAL_TARGETS = [3, 5, 8, 10, 15, 20, 30];
export const SOUNDS = { o: 'o (bateau)', on: 'on (mouton)', a: 'a (chat)', in: 'in (lapin)', e: 'é (bébé)', ou: 'ou (loup)', eil: 'eil (soleil)' };
export const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DAY = 86_400_000;

/** Lundi 0 h de la semaine en cours (heure locale). */
export function weekStart(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function validGoal(goal) {
  return !!goal && Number.isInteger(goal.target) && goal.target >= 1 && goal.target <= 100
    && (goal.theme === null || typeof goal.theme === 'string') && typeof goal.reward === 'string' && goal.reward.length <= 60;
}

/** Progrès de la semaine : activités réussies depuis lundi (dans le thème choisi, s'il y en a un). */
export function goalProgress(goal, results, games, now) {
  if (!validGoal(goal)) return null;
  const since = weekStart(now);
  const themeOf = new Map(games.map((g) => [g.id, g.theme]));
  const count = results.filter((r) => r.success && r.createdAt >= since && (!goal.theme || themeOf.get(r.gameId) === goal.theme)).length;
  return { count: Math.min(count, goal.target), target: goal.target, done: count >= goal.target, reward: goal.reward.trim(), theme: goal.theme };
}

/** L'objectif vient-il d'être atteint par la dernière activité ? */
export function goalJustReached(goal, before, after, games, now) {
  const a = goalProgress(goal, before, games, now);
  const b = goalProgress(goal, after, games, now);
  return !!a && !!b && !a.done && b.done;
}

/** Petit générateur déterministe : le même programme toute la journée, pour un même enfant. */
function seeded(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/**
 * Programme du jour : 3 jeux (environ 10 minutes), adaptés à l'âge, de thèmes différents.
 * Priorité aux révisions de l'école, puis aux compétences « en pratique » (presque acquises) et « en découverte »,
 * puis aux jeux pas encore essayés. skillStatusOf(skillId) → 'unexplored' | 'insufficient' | 'discovery' | 'practice' | 'regular'.
 */
export function dailyProgram({ profile, games, skillStatusOf, allowed = () => true, now, size = 3 }) {
  const [minAge, maxAge] = String(profile?.ageBand ?? '4-5').split('-').map(Number);
  const candidates = games.filter((g) => g.status === 'available' && allowed(g.id) && g.ages[0] <= maxAge && g.ages[1] >= minAge);
  const random = seeded(`${profile?.id ?? 'invite'}:${new Date(now).toDateString()}`);
  const weight = { practice: 4, discovery: 3, insufficient: 2, unexplored: 1.5, regular: 0.5 };
  const scored = candidates.map((g) => {
    let score = Math.max(...g.skills.map((s) => weight[skillStatusOf(s)] ?? 1));
    if (g.id === 'mots-semaine' && profile?.words?.length >= 3) score += 6;
    if (g.id === 'ruche-multiplications' && profile?.revisions?.tables?.length) score += 5;
    if (g.id === 'chasse-rimes' && profile?.revisions?.sounds?.length) score += 5;
    return { g, score: score + random() * 2 };
  }).sort((a, b) => b.score - a.score);
  const out = [];
  const themes = new Set();
  for (const { g } of scored) {
    if (out.length >= size) break;
    if (themes.has(g.theme) && scored.length > size * 2) continue;
    themes.add(g.theme);
    out.push(g.id);
  }
  return out;
}

/** Jeux du programme déjà réussis aujourd'hui. */
export function doneToday(results, now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return new Set(results.filter((r) => r.success && r.createdAt >= d.getTime() && r.createdAt < d.getTime() + DAY).map((r) => r.gameId));
}

export function validRevisions(rev) {
  return !!rev && Array.isArray(rev.tables) && rev.tables.every((t) => TABLES.includes(t)) && Array.isArray(rev.sounds) && rev.sounds.every((s) => s in SOUNDS);
}
