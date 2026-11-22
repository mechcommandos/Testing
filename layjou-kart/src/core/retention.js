/* ------------------------------------------------------------------ *
 *  FLOW ENGINE — l'algorithme de rétention de Layjou Kart.
 *
 *  Objectif : garder le joueur dans la « zone de flow » (ni frustré,
 *  ni blasé) et lui donner à chaque instant une raison de relancer
 *  une course.
 *
 *   1. Difficulté dynamique (DDA) : un indice de maîtrise `skill`
 *      (−1 … +1) est mis à jour après chaque course (place, écart,
 *      prolongations). Il règle le rythme des rivaux, leur agressivité
 *      avec les objets et la chance du joueur aux boîtes, pour viser
 *      des courses serrées gagnées « de justesse ».
 *   2. Directeur de course (en course, race.js) : élastique qui garde
 *      le peloton groupé autour du joueur, renforcé au dernier tour.
 *   3. Garde-fous anti-frustration : clémence par épreuve après chaque
 *      échec, démarrage en douceur, clémence des rivaux (« mercy ») après
 *      une série d'échecs, reprise facilitée après une absence.
 *   4. Courbe de tension : montée sur les 3 courses d'une Coupe,
 *      respiration au défi, cycle de session.
 *   5. Boucles de récompense : série de session (×1,5 de pièces),
 *      coffre de session (3 podiums), cadeau quotidien sur 7 jours,
 *      3 missions + bonus, roue, coffre gratuit toutes les 3 h,
 *      cadeau de retour, étoiles qui débloquent les mondes, records.
 *   6. « Prochain objectif » et « presque ! » : on montre le but le
 *      plus proche et l'écart qui manquait (effet de gradient).
 *   7. Cadence publicitaire : interstitiels rares, jamais après une
 *      série d'échecs.
 *
 *  Tout est local et loyal : pas de faux compte à rebours, pas de
 *  difficulté gonflée pour pousser à l'achat.
 * ------------------------------------------------------------------ */
import { S, save, emit, addCoins, addCredits, owns, totalStars, worldStars } from './state.js';
import { CONFIG } from './config.js';
import { clamp, dayIndex, seeded } from './util.js';
import { MISSIONS, DAILY_REWARDS, WHEEL, SKINS, ACCESSORIES, WEAPONS, KARTS, EVENTS, WORLD_UNLOCK, WORLDS, xpForLevel } from '../game/data.js';

const TARGET = 0.5;                       // perf visée : 2ᵉ / 3ᵉ place en moyenne, victoires fréquentes
const TENSION = [0, 0.01, 0.02, -0.02];   // cycle de session

export const session = { races: 0, podiums: 0, streak: 0, startedAt: Date.now(), comeback: false, awayDays: 0, chestPods: 0 };

export const Flow = {
  /* ----------------------------- session ----------------------------- */
  sessionStart() {
    const d = S.data, now = Date.now();
    const away = (now - (d.lastSeen || now)) / 86400000;
    Object.assign(session, { races: 0, podiums: 0, streak: 0, startedAt: now, chestPods: 0, awayDays: Math.floor(away), comeback: away >= 2 && d.stats.races > 0 });
    d.stats.sessions++;
    this.ensureDaily();
    save();
  },

  comebackGift() {
    if (!session.comeback || session.comebackGiven) return null;
    session.comebackGiven = true;
    const coins = Math.round(200 * (1 + S.data.level * 0.25) * Math.min(3, session.awayDays / 2));
    addCoins(coins); S.data.turbos += 1; emit('turbos');
    return { coins, turbo: 1, days: session.awayDays };
  },

  unlocked(world) { return world === 0 || totalStars() >= WORLD_UNLOCK[world]; },

  /* ------------------------ difficulté dynamique ------------------------ */
  difficulty(ev) {
    const d = S.data, f = d.flow, s = f.skill;
    let ease = 0;
    if (d.stats.races < 3) ease += 0.22 - d.stats.races * 0.05;
    ease += Math.min(0.3, 0.09 * (f.eventMiss[ev.key] || 0));
    if (f.missStreak >= 2) ease += 0.07;
    if (session.comeback && session.races < 2) ease += 0.1;
    const cupStep = ev.kind === 'race' ? ev.track * 0.012 : 0;
    const tension = d.stats.races < 3 ? 0 : TENSION[session.races % TENSION.length] + cupStep;
    const world = ev.world * 0.008;
    return {
      aiPace: clamp((0.97 + 0.05 * s + tension + world) * (1 - ease * 0.4), 0.86, 1.06),
      rubber: clamp(1 + ease * 0.8 - s * 0.15, 0.75, 1.4),
      aggro: clamp((0.75 + 0.35 * s) * (1 - ease), 0.35, 1.15),
      luck: clamp(-s * 0.25 + ease * 0.8, 0, 0.45),
      mercy: clamp((f.missStreak >= 2 ? 0.35 : 0) + (d.stats.races < 3 ? 0.5 : 0) + ease * 0.5, 0, 0.8),
      ease, skill: s,
    };
  },

  /** Met à jour le modèle de maîtrise après une course. */
  record(res, ev, stars) {
    const d = S.data, f = d.flow;
    let perf;
    if (res.mode === 'race') perf = 1 - 2 * ((res.place - 1) / Math.max(1, res.n - 1));
    else if (res.mode === 'duel') perf = res.place === 1 ? 0.6 + clamp(-res.leaderGap, 0, 4) * 0 + 0.2 : -0.4;
    else perf = stars >= 2 ? 0.6 : stars === 1 ? 0.2 : -0.5;
    perf -= 0.25 * res.extensions;
    f.skill = clamp(f.skill + 0.18 * (perf - TARGET), -1, 1);
    f.history.push(Math.round(perf * 100) / 100); if (f.history.length > 12) f.history.shift();
    const success = res.mode === 'race' ? res.place <= 3 : res.mode === 'duel' ? res.place === 1 : stars >= 1;
    d.stats.races++; session.races++; session.streak++;
    if (res.mode === 'race' && res.place === 1) d.stats.wins++;
    if (success) {
      if (res.mode === 'race') d.stats.podiums++;
      session.podiums++; session.chestPods++; f.podStreak++; f.missStreak = 0; delete f.eventMiss[ev.key];
    } else {
      f.missStreak++; f.podStreak = 0; f.eventMiss[ev.key] = (f.eventMiss[ev.key] || 0) + 1;
    }
    save();
    return { perf, success, sessionChest: session.chestPods >= 3 };
  },

  /** Multiplicateur de pièces de la série de session (« encore une course »). */
  streakMul(n = session.streak) { return 1 + Math.min(0.5, 0.1 * n); },

  takeSessionChest() {
    if (session.chestPods < 3) return null;
    session.chestPods -= 3;
    return this.rollChest(1.3);
  },

  rollChest(mult = 1) {
    const lvl = S.data.level, r = Math.random();
    const coins = Math.round((160 + lvl * 50) * mult * (0.8 + Math.random() * 0.6) / 5) * 5;
    const credits = r < 0.3 ? Math.round((3 + Math.random() * 5) * mult) : 0;
    const turbo = r > 0.86 ? 1 : 0;
    addCoins(coins); if (credits) addCredits(credits); if (turbo) { S.data.turbos += turbo; emit('turbos'); }
    return { coins, credits, turbo };
  },

  /** Écart qui a manqué pour la place supérieure (« presque ! »). */
  nearMiss(res) {
    if (res.mode !== 'race' && res.mode !== 'duel') return null;
    if (res.place === 1 || res.gapAhead <= 0 || res.gapAhead > 2.5) return null;
    return { gap: res.gapAhead, place: res.place - 1 };
  },

  /** Conseil adapté à la façon dont la course a été perdue. */
  tip(res) {
    const st = res.stats;
    if (st.offroad > 6) return 'tip_offroad';
    if (st.drifts < 3) return 'tip_drift';
    if (st.hitsTaken >= 3) return 'tip_shield';
    if (st.specials === 0) return 'tip_special';
    if (st.coins < 6) return 'tip_coins';
    return 'tip_items';
  },

  /* ---------------------------- interstitiels ---------------------------- */
  shouldShowInterstitial() {
    const d = S.data, c = CONFIG.ads.interstitial, f = d.flow;
    if (!c.enabled || d.noAds) return false;
    if (d.stats.races < c.skipFirstRaces) return false;
    if (f.missStreak >= 2) return false;
    if (d.stats.races - f.lastInterRace < c.everyNRaces) return false;
    if (Date.now() - f.lastInterAt < c.minSecondsBetween * 1000) return false;
    return true;
  },
  markInterstitial() { const f = S.data.flow; f.lastInterRace = S.data.stats.races; f.lastInterAt = Date.now(); save(); },

  /* ------------------------- boucle quotidienne ------------------------- */
  ensureDaily() {
    const d = S.data.daily, today = dayIndex();
    if (d.missionsDay !== today) {
      d.missionsDay = today; d.bonusClaimed = false;
      const rnd = seeded(today * 7919 + 23), lvl = S.data.level, tier = lvl < 5 ? 0 : lvl < 12 ? 1 : 2;
      const chosen = [MISSIONS[0]];
      while (chosen.length < 3) { const m = MISSIONS[1 + Math.floor(rnd() * (MISSIONS.length - 1))]; if (!chosen.includes(m)) chosen.push(m); }
      d.missions = chosen.map((m) => ({ id: m.id, n: m.n[tier], p: 0, claimed: false, reward: Math.round((m.reward * (1 + 0.5 * tier) * (1 + lvl * 0.06)) / 10) * 10 }));
    }
    if (d.wheelDay !== today) { d.wheelDay = today; d.wheelFreeUsed = false; d.wheelAds = 0; }
    if (d.freeDay !== today) { d.freeDay = today; d.freeCount = 0; }
    if (!d.chestAt) d.chestAt = Date.now() + 5 * 60000;
  },

  progress(id, n = 1) {
    if (n <= 0) return null;
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
  claimMissionsBonus() { if (!this.missionsBonusReady()) return null; S.data.daily.bonusClaimed = true; addCredits(12); return { credits: 12, chest: this.rollChest(1.5) }; },
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
    const coins = r.coins ? Math.round(r.coins * (1 + S.data.level * 0.05)) : 0;
    if (coins) addCoins(coins);
    if (r.credits) addCredits(r.credits);
    const chest = r.chest ? this.rollChest(2) : null;
    save();
    return { ...r, coins, chest, index: st.index };
  },

  wheelStatus() { this.ensureDaily(); const d = S.data.daily; return { free: !d.wheelFreeUsed, adsLeft: CONFIG.economy.wheelAdSpinsPerDay - d.wheelAds }; },
  spinWheel(viaAd) {
    const d = S.data.daily;
    if (viaAd) d.wheelAds++; else d.wheelFreeUsed = true;
    const total = WHEEL.reduce((s, w) => s + w.w, 0); let r = Math.random() * total, index = 0;
    for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r <= 0) { index = i; break; } }
    const prize = { ...WHEEL[index] };
    if (prize.coins) prize.coins = Math.round(prize.coins * (1 + S.data.level * 0.06) / 5) * 5;
    save();
    return { index, prize };
  },
  grantWheel(prize) { if (prize.coins) addCoins(prize.coins); if (prize.credits) addCredits(prize.credits); if (prize.turbo) { S.data.turbos += prize.turbo; emit('turbos'); } },

  chestReadyIn() { this.ensureDaily(); return Math.max(0, S.data.daily.chestAt - Date.now()); },
  openFreeChest() {
    if (this.chestReadyIn() > 0) return null;
    S.data.daily.chestAt = Date.now() + CONFIG.economy.freeChestHours * 3600000;
    return this.rollChest(1);
  },

  freeCreditsLeft() { this.ensureDaily(); return CONFIG.ads.freeCreditsPerDay - S.data.daily.freeCount; },
  takeFreeCredits() { S.data.daily.freeCount++; addCredits(CONFIG.ads.freeCreditsAmount); return CONFIG.ads.freeCreditsAmount; },

  /* --------------------- prochain objectif (nudges) --------------------- */
  nextGoals() {
    const d = S.data, out = [];
    this.ensureDaily();
    for (const m of d.daily.missions) if (!m.claimed) out.push(m.p >= m.n ? { key: 'g_mission_done', vars: {}, pct: 1.05, go: 'missions' } : { key: 'g_mission', vars: { left: m.n - m.p, n: m.n }, pct: m.p / m.n, go: 'missions', mission: m });
    const items = [['skin', SKINS], ['accessory', ACCESSORIES], ['weapon', WEAPONS], ['kart', KARTS]];
    for (const [type, list] of items) for (const it of list) {
      if (owns(type, it.id) || !it.price || !it.price.coins) continue;
      out.push(d.coins >= it.price.coins ? { key: 'g_item_ready', vars: { name: it.name }, pct: 1.0, go: 'garage' } : { key: 'g_item', vars: { left: it.price.coins - d.coins, name: it.name }, pct: (d.coins / it.price.coins) * 0.95, go: 'garage' });
    }
    out.push({ key: 'g_level', vars: { left: xpForLevel(d.level) - d.xp, lvl: d.level + 1 }, pct: (d.xp / xpForLevel(d.level)) * 0.9, go: 'race' });
    const stars = totalStars();
    const nextW = WORLD_UNLOCK.findIndex((n) => n > stars);
    if (nextW > 0) out.push({ key: 'g_world', vars: { left: WORLD_UNLOCK[nextW] - stars, name: WORLDS[nextW].name }, pct: stars / WORLD_UNLOCK[nextW], go: 'race' });
    if (session.chestPods > 0 && session.chestPods < 3) out.push({ key: 'g_chest', vars: { n: 3 - session.chestPods }, pct: session.chestPods / 3 + 0.2, go: 'race' });
    const seen = new Set();
    return out.filter((g) => g.pct > 0.25).sort((a, b) => b.pct - a.pct).filter((g) => { const k = g.key.replace('_ready', ''); if (seen.has(k)) return false; seen.add(k); return true; });
  },

  worldProgress(w) { return { stars: worldStars(w), max: EVENTS.filter((e) => e.world === w).length * 3 }; },
};
