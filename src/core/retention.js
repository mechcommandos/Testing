/* ------------------------------------------------------------------ *
 *  FLOW ENGINE — l'algorithme de rétention de LayJou Battle.
 *
 *  Objectif : garder le joueur dans la « zone de flow » (ni frustré,
 *  ni blasé) et lui donner à chaque instant une raison de rejouer.
 *
 *   1. Difficulté dynamique (DDA) : un indice de maîtrise `skill`
 *      (−1 … +1) est mis à jour après chaque combat à partir de la
 *      performance réelle. Les PV, dégâts, vitesses de télégraphe et
 *      cadence des ennemis sont ajustés pour viser des victoires
 *      serrées (≈ 30 % de PV restants).
 *   2. Garde-fous anti-frustration : clémence par niveau après chaque
 *      défaite, démarrage en douceur, bonus de retour après absence.
 *   3. Courbe de tension : cycle montée / pic / respiration sur
 *      4 combats pour rythmer la session.
 *   4. Boucles de récompense : série de session (multiplicateur de
 *      pièces), coffre de session, missions et récompenses
 *      quotidiennes, roue, coffre gratuit minuté.
 *   5. « Prochain objectif » : après chaque combat, on met en avant
 *      le but le plus proche d'être atteint (effet de gradient).
 *   6. Cadence publicitaire : interstitiels rares, jamais après une
 *      série de défaites.
 *
 *  Tout est local, déterministe et sans mécanique trompeuse : pas de
 *  faux compte à rebours, pas de difficulté gonflée pour vendre.
 * ------------------------------------------------------------------ */
import { S, save, emit, addCoins, addCredits, owns } from './state.js';
import { CONFIG } from './config.js';
import { clamp, dayIndex, seeded } from './util.js';
import { MISSIONS, DAILY_REWARDS, WHEEL, UPGRADES, SKINS, ACCESSORIES, WEAPONS, STAGES, upgradeCost, upgradeCap, xpForLevel } from '../game/data.js';

const TARGET_PERF = 0.5; // victoire avec ~30 % de PV restants
const TENSION = [0, 0.04, 0.08, -0.08]; // montée, montée, pic, respiration

export const session = { battles: 0, wins: 0, streak: 0, startedAt: Date.now(), comeback: false, awayDays: 0, chestWins: 0, lastBattleAt: 0 };

export const Flow = {
  /* ----------------------------- session ----------------------------- */
  sessionStart() {
    const d = S.data, now = Date.now();
    const away = (now - (d.lastSeen || now)) / 86400000;
    Object.assign(session, { battles: 0, wins: 0, streak: 0, startedAt: now, chestWins: 0, awayDays: Math.floor(away), comeback: away >= 2 && d.stats.battles > 0 });
    d.stats.sessions++;
    this.ensureDaily();
    save();
  },

  /** Bonus de retour (≥ 2 jours d'absence) : pièces + 1 boost, proportionnels au niveau. */
  comebackGift() {
    if (!session.comeback || session.comebackGiven) return null;
    session.comebackGiven = true;
    const coins = Math.round(150 * (1 + S.data.level * 0.25) * Math.min(3, session.awayDays / 2));
    addCoins(coins); S.data.boosts += 1; emit('boosts');
    return { coins, boost: 1, days: session.awayDays };
  },

  /* ------------------------ difficulté dynamique ------------------------ */
  difficulty(stageIndex, mode = 'stage') {
    const d = S.data, f = d.flow, s = f.skill;
    let ease = 0;
    if (d.stats.battles < 3) ease += 0.25; // premiers pas
    if (mode === 'stage') ease += Math.min(0.3, 0.1 * (f.stageLoss[stageIndex] || 0)); // clémence par niveau
    if (f.lossStreak >= 2) ease += 0.08; // garde-fou anti-frustration
    if (session.comeback && session.battles < 2) ease += 0.12; // reprise en douceur
    const tension = d.stats.battles < 3 ? 0 : TENSION[session.battles % TENSION.length];
    const hard = 1 + 0.22 * s + tension;
    return {
      hp: clamp(hard * (1 - ease), 0.55, 1.4),
      dmg: clamp((1 + 0.2 * s + tension * 0.6) * (1 - ease), 0.55, 1.35),
      wind: clamp((1 - 0.18 * s) * (1 + ease * 0.6), 0.75, 1.4),
      gap: clamp((1 - 0.15 * s) * (1 + ease * 0.5), 0.75, 1.4),
      weak: clamp((1 - 0.2 * s) * (1 + ease), 0.7, 1.6),
      ease, skill: s,
    };
  },

  /** Met à jour le modèle de maîtrise après un combat. */
  record(res, { stageIndex, mode }) {
    const d = S.data, f = d.flow;
    let perf = res.win ? 0.3 + 0.7 * res.hpPct : -(0.35 + 0.65 * res.enemyHpPct);
    if (res.revives) perf -= 0.25 * res.revives;
    if (mode === 'arena') perf = clamp((res.waves - 2) / 4, -0.6, 1); // l'arène juge sur le nombre de vagues
    f.skill = clamp(f.skill + 0.22 * (perf - TARGET_PERF), -1, 1);
    f.history.push(Math.round(perf * 100) / 100); if (f.history.length > 12) f.history.shift();
    d.stats.battles++; session.battles++; session.streak++; session.lastBattleAt = Date.now();
    const won = mode === 'arena' ? res.waves >= 1 : res.win;
    if (won) {
      d.stats.wins++; session.wins++; session.chestWins++; f.winStreak++; f.lossStreak = 0;
      if (mode === 'stage') delete f.stageLoss[stageIndex];
    } else {
      d.stats.losses++; f.lossStreak++; f.winStreak = 0;
      if (mode === 'stage') f.stageLoss[stageIndex] = (f.stageLoss[stageIndex] || 0) + 1;
    }
    save();
    return { perf, sessionChest: session.chestWins >= 3 };
  },

  /** Multiplicateur de pièces de la série de session (« encore un combat »). */
  streakMul(n = session.streak) { return 1 + Math.min(0.5, 0.1 * n); },

  takeSessionChest() {
    if (session.chestWins < 3) return null;
    session.chestWins -= 3;
    return this.rollChest(1.2);
  },

  rollChest(mult = 1) {
    const lvl = S.data.level, r = Math.random();
    const coins = Math.round((120 + lvl * 40) * mult * (0.8 + Math.random() * 0.6) / 5) * 5;
    const credits = r < 0.3 ? Math.round((3 + Math.random() * 5) * mult) : 0;
    const boost = r > 0.88 ? 1 : 0;
    addCoins(coins); if (credits) addCredits(credits); if (boost) { S.data.boosts += boost; emit('boosts'); }
    return { coins, credits, boost };
  },

  /* ---------------------------- interstitiels ---------------------------- */
  shouldShowInterstitial() {
    const d = S.data, c = CONFIG.ads.interstitial, f = d.flow;
    if (!c.enabled || d.noAds) return false;
    if (d.stats.battles < c.skipFirstBattles) return false;
    if (f.lossStreak >= 2) return false; // jamais quand le joueur est déjà frustré
    if (d.stats.battles - f.lastInterBattle < c.everyNBattles) return false;
    if (Date.now() - f.lastInterAt < c.minSecondsBetween * 1000) return false;
    return true;
  },
  markInterstitial() { const f = S.data.flow; f.lastInterBattle = S.data.stats.battles; f.lastInterAt = Date.now(); save(); },

  /* ------------------------- boucle quotidienne ------------------------- */
  ensureDaily() {
    const d = S.data.daily, today = dayIndex();
    if (d.missionsDay !== today) {
      d.missionsDay = today; d.bonusClaimed = false;
      const rnd = seeded(today * 7919 + 17), lvl = S.data.level, tier = lvl < 5 ? 0 : lvl < 12 ? 1 : 2;
      const pool = MISSIONS.filter((m) => !m.needArena || S.data.stage >= 5);
      const chosen = [];
      // toujours une mission « gagner » + deux autres variées
      chosen.push(pool[0]);
      while (chosen.length < 3) { const m = pool[1 + Math.floor(rnd() * (pool.length - 1))]; if (!chosen.includes(m)) chosen.push(m); }
      d.missions = chosen.map((m) => ({ id: m.id, n: m.n[tier], p: 0, claimed: false, reward: Math.round((m.reward * (1 + 0.5 * tier) * (1 + lvl * 0.06)) / 10) * 10 }));
    }
    if (d.wheelDay !== today) { d.wheelDay = today; d.wheelFreeUsed = false; d.wheelAds = 0; }
    if (d.freeDay !== today) { d.freeDay = today; d.freeCount = 0; }
    if (!d.chestAt) d.chestAt = Date.now() + 5 * 60000; // premier coffre vite disponible
  },

  /** Progression des missions depuis les évènements de jeu. */
  progress(id, n = 1) {
    this.ensureDaily();
    let changed = false, done = null;
    for (const m of S.data.daily.missions) if (m.id === id && !m.claimed && m.p < m.n) { m.p = Math.min(m.n, m.p + n); changed = true; if (m.p >= m.n) done = m; }
    if (changed) save();
    return done;
  },
  claimMission(i) {
    const m = S.data.daily.missions[i];
    if (!m || m.claimed || m.p < m.n) return null;
    m.claimed = true; addCoins(m.reward); return m;
  },
  missionsBonusReady() { const d = S.data.daily; return !d.bonusClaimed && d.missions.length > 0 && d.missions.every((m) => m.claimed); },
  claimMissionsBonus() { if (!this.missionsBonusReady()) return null; S.data.daily.bonusClaimed = true; addCredits(10); return { credits: 10, chest: this.rollChest(1.5) }; },
  missionsBadge() { return S.data.daily.missions.filter((m) => !m.claimed && m.p >= m.n).length + (this.missionsBonusReady() ? 1 : 0); },

  dailyStatus() {
    const d = S.data.daily, today = dayIndex();
    const claimable = d.claimDay !== today;
    const continues = d.claimDay === today - 1;
    const nextIndex = claimable ? (continues ? d.streak % 7 : 0) : (d.streak - 1 + 7) % 7;
    return { claimable, index: nextIndex, streak: claimable && !continues ? 0 : d.streak };
  },
  claimDaily() {
    const st = this.dailyStatus(); if (!st.claimable) return null;
    const d = S.data.daily, r = DAILY_REWARDS[st.index];
    d.streak = st.index === 0 && d.claimDay !== dayIndex() - 1 ? 1 : d.streak + 1; d.claimDay = dayIndex();
    if (r.coins) addCoins(Math.round(r.coins * (1 + S.data.level * 0.05)));
    if (r.credits) addCredits(r.credits);
    const chest = r.chest ? this.rollChest(2) : null;
    save();
    return { ...r, coins: r.coins ? Math.round(r.coins * (1 + S.data.level * 0.05)) : 0, chest, index: st.index };
  },

  wheelStatus() { this.ensureDaily(); const d = S.data.daily; return { free: !d.wheelFreeUsed, adsLeft: CONFIG.economy.wheelAdSpinsPerDay - d.wheelAds }; },
  /** @returns {{index:number, prize:object}} */
  spinWheel(viaAd) {
    const d = S.data.daily;
    if (viaAd) d.wheelAds++; else d.wheelFreeUsed = true;
    const total = WHEEL.reduce((s, w) => s + w.w, 0); let r = Math.random() * total, index = 0;
    for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r <= 0) { index = i; break; } }
    const prize = { ...WHEEL[index] };
    if (prize.coins) { prize.coins = Math.round(prize.coins * (1 + S.data.level * 0.06) / 5) * 5; }
    save();
    return { index, prize };
  },
  grantWheel(prize) { if (prize.coins) addCoins(prize.coins); if (prize.credits) addCredits(prize.credits); if (prize.boost) { S.data.boosts += prize.boost; emit('boosts'); } },

  chestReadyIn() { this.ensureDaily(); return Math.max(0, S.data.daily.chestAt - Date.now()); },
  openFreeChest() {
    if (this.chestReadyIn() > 0) return null;
    S.data.daily.chestAt = Date.now() + CONFIG.economy.freeChestHours * 3600000;
    return this.rollChest(1);
  },

  freeCreditsLeft() { this.ensureDaily(); return CONFIG.ads.freeCreditsPerDay - S.data.daily.freeCount; },
  takeFreeCredits() { S.data.daily.freeCount++; addCredits(CONFIG.ads.freeCreditsAmount); return CONFIG.ads.freeCreditsAmount; },

  /* --------------------- prochain objectif (nudges) --------------------- */
  /** Objectifs triés du plus proche au plus lointain. @returns {{key:string, vars:object, pct:number, go:string}[]} */
  nextGoals() {
    const d = S.data, out = [];
    this.ensureDaily();
    for (const m of d.daily.missions) if (!m.claimed) out.push(m.p >= m.n ? { key: 'g_mission_done', vars: {}, pct: 1.05, go: 'missions' } : { key: 'g_mission', vars: { left: m.n - m.p, id: m.id, n: m.n }, pct: m.p / m.n, go: 'missions', mission: m });
    for (const u of UPGRADES) {
      const lvl = d.up[u.id]; if (lvl >= upgradeCap(u, d.level)) continue;
      const cost = upgradeCost(u, lvl);
      out.push(d.coins >= cost ? { key: 'g_upgrade_ready', vars: { name: u.name }, pct: 1.02, go: 'lab' } : { key: 'g_upgrade', vars: { left: cost - d.coins, name: u.name }, pct: d.coins / cost, go: 'lab' });
    }
    const items = [['skin', SKINS], ['accessory', ACCESSORIES], ['weapon', WEAPONS]];
    for (const [type, list] of items) for (const it of list) {
      if (owns(type, it.id) || !it.price) continue;
      if (it.price.coins) out.push(d.coins >= it.price.coins ? { key: 'g_item_ready', vars: { name: it.name }, pct: 1.0, go: 'hangar' } : { key: 'g_item', vars: { left: it.price.coins - d.coins, name: it.name }, pct: (d.coins / it.price.coins) * 0.95, go: 'hangar' });
    }
    out.push({ key: 'g_level', vars: { left: xpForLevel(d.level) - d.xp, lvl: d.level + 1 }, pct: (d.xp / xpForLevel(d.level)) * 0.9, go: 'fight' });
    if (d.stage < STAGES.length) { const toBoss = 4 - (d.stage % 5); out.push(toBoss === 0 ? { key: 'g_boss_now', vars: {}, pct: 0.97, go: 'fight' } : { key: 'g_boss', vars: { n: toBoss }, pct: 1 - toBoss / 5, go: 'fight' }); }
    if (session.chestWins > 0 && session.chestWins < 3) out.push({ key: 'g_chest', vars: { n: 3 - session.chestWins }, pct: session.chestWins / 3 + 0.2, go: 'fight' });
    const seen = new Set();
    return out.filter((g) => g.pct > 0.25).sort((a, b) => b.pct - a.pct).filter((g) => { const k = g.key.replace('_ready', ''); if (seen.has(k)) return false; seen.add(k); return true; });
  },

  /** Conseil adapté à la façon dont le joueur vient de perdre. */
  defeatTip(res) {
    if (res.perfects + res.dodges < 2 && res.hitsTaken >= 4) return 'tip_defend';
    if (res.weak === 0) return 'tip_weak';
    if (res.ults === 0) return 'tip_ult';
    if (res.stuns === 0) return 'tip_stun';
    return 'tip_upgrade';
  },
};
