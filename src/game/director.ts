/**
 * Le « Directeur » : générateur adaptatif de pièces.
 *
 * Objectif : garder le joueur dans la zone de « flow » le plus longtemps possible —
 * ni frustré (défaite injuste, pièces impossibles), ni ennuyé (partie sans tension).
 *
 * Principes :
 *  1. Équité : chaque donne de 3 pièces est TOUJOURS posable (vérifié par simulation).
 *     Le joueur ne perd que sur ses propres choix de placement.
 *  2. Difficulté cible dynamique : elle monte avec le score rapporté au niveau habituel
 *     du joueur (moyenne mobile), suit une vague tension / relâchement, et baisse quand
 *     le plateau devient dangereux.
 *  3. Sauvetages : quand le plateau est presque bloqué, un nombre limité de donnes
 *     « miracle » (pièces qui s'emboîtent et effacent des lignes) crée des retournements
 *     de situation mémorables. Le budget se recharge lentement.
 *  4. Accueil et réconfort : premières parties plus douces, coup de pouce après une série
 *     de parties courtes, et légère aide à l'approche du record personnel.
 */
import { analyzeFit, canPlaceAll, fillRatio, place, type Board, type FitInfo } from './board';
import { COLOR_COUNT, SHAPES, type Piece, type Shape } from './shapes';

export interface PlayerModel {
  /** parties terminées */
  games: number;
  /** moyenne mobile exponentielle des scores */
  avgScore: number;
  best: number;
  /** derniers scores (5 max) */
  recent: number[];
}

export interface DirectorState {
  /** index de la prochaine donne */
  set: number;
  /** jetons de sauvetage disponibles */
  rescue: number;
  /** familles de la donne précédente (pour éviter les répétitions) */
  last: string[];
}

export interface DirectorDebug {
  mode: 'normal' | 'rescue' | 'fallback';
  difficulty: number;
  danger: number;
}

export type Rng = () => number;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const newPlayerModel = (): PlayerModel => ({ games: 0, avgScore: 0, best: 0, recent: [] });

export function newDirectorState(player: PlayerModel): DirectorState {
  return { set: 0, rescue: player.games < 3 ? 3 : 2, last: [] };
}

/** Met à jour le modèle du joueur à la fin d'une partie. */
export function recordGame(player: PlayerModel, score: number): PlayerModel {
  const games = player.games + 1;
  const avgScore = player.games === 0 ? score : player.avgScore * 0.7 + score * 0.3;
  return {
    games,
    avgScore,
    best: Math.max(player.best, score),
    recent: [...player.recent, score].slice(-5),
  };
}

interface Analysis {
  infos: Map<string, FitInfo>;
  fill: number;
  mobility: number;
  danger: number;
}

function analyze(board: Board): Analysis {
  const infos = new Map<string, FitInfo>();
  let total = 0;
  let fitting = 0;
  for (const s of SHAPES) {
    const info = analyzeFit(board, s);
    infos.set(s.id, info);
    total += s.weight;
    if (info.fits > 0) fitting += s.weight;
  }
  const fill = fillRatio(board);
  const mobility = fitting / total;
  const danger = clamp(0.55 * smoothstep(0.42, 0.8, fill) + 0.75 * (1 - mobility), 0, 1);
  return { infos, fill, mobility, danger };
}

/** Difficulté cible (0 = très accommodant, 1 = très exigeant). */
export function targetDifficulty(score: number, state: DirectorState, player: PlayerModel, danger: number): number {
  const reference = Math.max(500, player.avgScore * 1.15);
  const progress = score / reference;
  let d = 0.24 + 0.52 * smoothstep(0.1, 1.9, progress);

  // accueil : les toutes premières parties sont plus douces
  if (player.games < 3) d *= 0.55 + 0.15 * player.games;

  // réconfort : après plusieurs parties courtes, on desserre l'étau
  const recent = player.recent.slice(-3);
  if (recent.length >= 2 && recent.every((s) => s < player.avgScore * 0.6)) d -= 0.12;

  // à portée du record : petit coup de pouce (battre son record donne envie de rejouer)
  if (player.best > 200 && score > player.best * 0.8 && score < player.best * 1.05) d -= 0.1;
  // record largement battu : on resserre pour que la partie garde son enjeu
  if (player.best > 200 && score > player.best * 1.3) d += 0.08;

  // vague tension / relâchement
  d += 0.1 * Math.sin((state.set / 8) * Math.PI * 2);

  // clémence quand le plateau se remplit
  d -= danger * 0.42;
  return clamp(d, 0.04, 0.92);
}

function pickWeighted<T>(items: T[], weights: number[], rng: Rng): T | null {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return null;
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

function distinctColors(n: number, rng: Rng): number[] {
  const pool = Array.from({ length: COLOR_COUNT }, (_, i) => i + 1);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = Math.floor(rng() * pool.length);
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}

/** Donne « normale » : tirage pondéré par l'affinité entre la difficulté des formes et la cible. */
function sampleNormal(a: Analysis, d: number, state: DirectorState, rng: Rng): Shape[] {
  const chosen: Shape[] = [];
  const helpChance = 0.85 - 0.65 * d;
  for (let slot = 0; slot < 3; slot++) {
    const helper = slot === 0 && rng() < helpChance;
    const weights = SHAPES.map((s) => {
      const info = a.infos.get(s.id)!;
      const diff = s.difficulty - d * 0.95;
      let w = s.weight * (0.1 + Math.exp(-(diff * diff) / (2 * 0.3 * 0.3)));
      w *= info.fits === 0 ? 0.02 : 0.55 + 0.45 * Math.min(1, info.fits / 12);
      if (helper) w *= info.bestClear > 0 ? Math.pow(info.bestClear, 1.6) * 6 : 0.05;
      if (state.last.includes(s.family)) w *= 0.5;
      const dup = chosen.filter((c) => c.family === s.family).length;
      if (dup > 0) w *= dup > 1 ? 0.02 : 0.3;
      return w;
    });
    const s = pickWeighted(SHAPES as Shape[], weights, rng);
    if (s) chosen.push(s);
  }
  return chosen;
}

/**
 * Donne construite pièce par pièce sur un plateau simulé : chaque pièce est choisie parmi
 * celles qui rentrent, en favorisant celles qui effacent des lignes. Toujours posable dans l'ordre.
 */
function sampleGreedy(board: Board, clearBias: number, rng: Rng): Shape[] {
  const chosen: Shape[] = [];
  let sim = board;
  for (let slot = 0; slot < 3; slot++) {
    const cands: Shape[] = [];
    const weights: number[] = [];
    const bests: FitInfo[] = [];
    for (const s of SHAPES) {
      const info = analyzeFit(sim, s);
      if (info.fits === 0) continue;
      const size = s.cells.length;
      let w = s.weight * (0.35 + Math.pow(info.bestClear, 1.8) * clearBias);
      // sans ligne à la clé, on préfère les petites pièces qui n'encombrent pas
      if (info.bestClear === 0) w *= 1 / (1 + size * 0.35);
      if (chosen.some((c) => c.family === s.family)) w *= 0.3;
      cands.push(s);
      weights.push(w);
      bests.push(info);
    }
    const s = pickWeighted(cands, weights, rng);
    if (!s) break;
    chosen.push(s);
    const best = bests[cands.indexOf(s)].best!;
    sim = place(sim, s, best.r, best.c, 1).board;
  }
  // plateau saturé : on complète avec la plus petite pièce
  while (chosen.length < 3) chosen.push(SHAPES[0] as Shape);
  return chosen;
}

export interface NextSet {
  pieces: Piece[];
  state: DirectorState;
  debug: DirectorDebug;
}

export interface NextSetOptions {
  /** force une donne de sauvetage (recyclage, reprise après « continuer ») sans consommer de jeton */
  forceRescue?: boolean;
  rng?: Rng;
}

export function nextSet(
  board: Board,
  score: number,
  state: DirectorState,
  player: PlayerModel,
  opts: NextSetOptions = {},
): NextSet {
  const rng = opts.rng ?? Math.random;
  const a = analyze(board);
  const d = targetDifficulty(score, state, player, a.danger);

  let shapes: Shape[] | null = null;
  let mode: DirectorDebug['mode'] = 'normal';
  let rescue = state.rescue;

  if (opts.forceRescue) {
    shapes = sampleGreedy(board, 5, rng);
    mode = 'rescue';
  } else if (a.danger > 0.6 && rescue > 0) {
    shapes = sampleGreedy(board, 5, rng);
    mode = 'rescue';
    rescue -= 1;
  } else {
    for (let attempt = 0; attempt < 24 && !shapes; attempt++) {
      const cand = sampleNormal(a, d, state, rng);
      if (cand.length === 3 && canPlaceAll(board, cand)) shapes = cand;
    }
    if (!shapes) {
      // aucune donne aléatoire posable : on en construit une sur mesure, sans biais vers les lignes
      shapes = sampleGreedy(board, 0.6, rng);
      mode = 'fallback';
    }
  }

  // mélange pour que la pièce « d'aide » ne soit pas toujours à la même place
  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }

  const colors = distinctColors(shapes.length, rng);
  const pieces = shapes.map((s, i) => ({ shapeId: s.id, color: colors[i] }));

  // recharge lente du budget de sauvetage (plus lente quand le joueur dépasse son niveau habituel)
  const set = state.set + 1;
  const progress = score / Math.max(500, player.avgScore * 1.15);
  const regenEvery = 5 + Math.min(6, Math.floor(progress) * 2);
  const cap = player.games < 3 ? 3 : 2;
  if (set % regenEvery === 0) rescue = Math.min(cap, rescue + 1);

  return {
    pieces,
    state: { set, rescue, last: shapes.map((s) => s.family) },
    debug: { mode, difficulty: d, danger: a.danger },
  };
}
