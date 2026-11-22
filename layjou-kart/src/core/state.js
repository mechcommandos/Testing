/* Sauvegarde locale + économie du joueur. */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { CONFIG } from './config.js';
import { xpForLevel, EVENTS } from '../game/data.js';

const KEY = 'layjou-kart-save-v1';

const fresh = () => ({
  v: 1,
  coins: CONFIG.economy.startCoins, credits: CONFIG.economy.startCredits,
  xp: 0, level: 1,
  stars: {}, best: {}, bestTime: {},
  owned: { skin: ['classic'], accessory: ['none'], weapon: ['blaster'], kart: ['coeur'] },
  equip: { skin: 'classic', accessory: 'none', weapon: 'blaster', kart: 'coeur' },
  adProgress: {}, turbos: 0, noAds: false, iapOwned: [], iapTx: [],
  settings: { sfx: true, music: true, haptics: true, notif: false, notifAsked: false, lang: null, assist: true, sensitivity: 1, quality: 1 },
  tut: {},
  stats: { races: 0, wins: 0, podiums: 0, sessions: 0, videos: 0, playSec: 0, spent: 0, coinsEarned: 0 },
  flow: { skill: 0, podStreak: 0, missStreak: 0, eventMiss: {}, history: [], lastInterRace: 0, lastInterAt: 0 },
  daily: { claimDay: 0, streak: 0, missionsDay: 0, missions: [], bonusClaimed: false, wheelDay: 0, wheelFreeUsed: false, wheelAds: 0, freeDay: 0, freeCount: 0, chestAt: 0 },
  firstSeen: Date.now(), lastSeen: Date.now(),
});

export const S = { data: fresh() };
const listeners = new Set();
let saveTimer = null;

function merge(base, saved) {
  for (const k of Object.keys(saved || {})) {
    if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], saved[k]);
    else base[k] = saved[k];
  }
  return base;
}

export async function loadState() {
  let raw = null;
  try { if (Capacitor.isNativePlatform()) raw = (await Preferences.get({ key: KEY })).value; } catch { /* stockage natif indisponible */ }
  if (!raw) { try { raw = localStorage.getItem(KEY); } catch { /* navigation privée */ } }
  if (raw) { try { S.data = merge(fresh(), JSON.parse(raw)); } catch { S.data = fresh(); } }
  return S.data;
}

export function save(now = false) {
  const write = () => {
    saveTimer = null;
    S.data.lastSeen = Date.now();
    const raw = JSON.stringify(S.data);
    try { localStorage.setItem(KEY, raw); } catch { /* quota */ }
    if (Capacitor.isNativePlatform()) Preferences.set({ key: KEY, value: raw }).catch(() => {});
  };
  if (now) { clearTimeout(saveTimer); write(); } else if (!saveTimer) saveTimer = setTimeout(write, 250);
}

export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function emit(what = 'all') { for (const fn of listeners) fn(what); save(); }

/* ----------------------------- monnaies ----------------------------- */
export function addCoins(n) { S.data.coins = Math.max(0, Math.round(S.data.coins + n)); if (n > 0) S.data.stats.coinsEarned += Math.round(n); emit('coins'); }
export function addCredits(n) { S.data.credits = Math.max(0, Math.round(S.data.credits + n)); emit('credits'); }
export function spend(kind, n) {
  if (S.data[kind] < n) return false;
  S.data[kind] -= n; if (kind === 'credits') S.data.stats.spent += n; emit(kind); return true;
}

/** @returns {number[]} niveaux gagnés */
export function addXp(n) {
  const d = S.data, ups = [];
  d.xp += Math.round(n);
  while (d.xp >= xpForLevel(d.level)) { d.xp -= xpForLevel(d.level); d.level++; ups.push(d.level); }
  emit('xp'); return ups;
}

/* ---------------------------- inventaire ---------------------------- */
export const owns = (type, id) => S.data.owned[type].includes(id);
export function grant(type, id) { if (!owns(type, id)) { S.data.owned[type].push(id); emit('owned'); } }
export function equip(type, id) { if (owns(type, id)) { S.data.equip[type] = id; emit('equip'); } }

/* ---------------------------- progression ---------------------------- */
export const totalStars = () => Object.values(S.data.stars).reduce((a, b) => a + b, 0);
export const worldStars = (w) => EVENTS.filter((e) => e.world === w).reduce((a, e) => a + (S.data.stars[e.key] || 0), 0);
/** Prochaine épreuve à jouer (première sans étoile dans un monde débloqué). */
export function nextEvent(unlocked) {
  for (const e of EVENTS) if (unlocked(e.world) && !S.data.stars[e.key]) return e;
  return EVENTS.filter((e) => unlocked(e.world)).sort((a, b) => (S.data.stars[a.key] || 0) - (S.data.stars[b.key] || 0))[0];
}
