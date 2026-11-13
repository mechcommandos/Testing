/**
 * Profil du joueur, persistant (Capacitor Preferences : SharedPreferences / UserDefaults / localStorage).
 * Contient l'économie, l'inventaire, la progression, les missions et la partie en cours.
 */
import { Preferences } from '@capacitor/preferences';
import { ECONOMY } from '../config';
import { newPlayerModel, recordGame, type PlayerModel } from '../game/director';
import { WEAPON_IDS, type GameSnapshot, type WeaponId } from '../game/game';
import type { Lang } from '../i18n';
import { itemById, type Slot } from './catalog';

const KEY = 'layjou.profile.v1';

export type MissionKind = 'games' | 'lines' | 'score' | 'combo' | 'multi' | 'blocks' | 'weapons' | 'total';

export interface Mission {
  kind: MissionKind;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface Profile {
  coins: number;
  credits: number;
  best: number;
  xp: number;
  level: number;
  player: PlayerModel;
  owned: string[];
  equipped: Record<Slot, string | null>;
  weapons: Record<WeaponId, number>;
  daily: { last: string | null; streak: number };
  missions: { date: string; list: Mission[]; bonus: boolean };
  giftAt: number;
  adCoins: { date: string; count: number };
  settings: { sound: boolean; haptics: boolean; lang: Lang | null };
  tutorialDone: boolean;
  saved: GameSnapshot | null;
  /** transactions du store déjà créditées (anti double-crédit) */
  receipts: string[];
}

export const today = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MISSION_POOL: { kind: MissionKind; targets: number[]; reward: number }[] = [
  { kind: 'games', targets: [3, 5], reward: 100 },
  { kind: 'lines', targets: [25, 40, 60], reward: 140 },
  { kind: 'score', targets: [600, 1000, 1500], reward: 160 },
  { kind: 'combo', targets: [3, 4, 5], reward: 150 },
  { kind: 'multi', targets: [4, 6], reward: 140 },
  { kind: 'blocks', targets: [150, 250], reward: 110 },
  { kind: 'weapons', targets: [2, 3], reward: 120 },
  { kind: 'total', targets: [2000, 3500], reward: 150 },
];

/** 3 missions du jour, tirées de façon déterministe à partir de la date. */
function rollMissions(date: string): Mission[] {
  let seed = [...date].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pool = [...MISSION_POOL];
  const out: Mission[] = [];
  for (let i = 0; i < 3; i++) {
    const def = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const k = Math.floor(rnd() * def.targets.length);
    out.push({
      kind: def.kind,
      target: def.targets[k],
      progress: 0,
      reward: def.reward + k * 40,
      claimed: false,
    });
  }
  return out;
}

function defaults(): Profile {
  return {
    coins: ECONOMY.startCoins,
    credits: ECONOMY.startCredits,
    best: 0,
    xp: 0,
    level: 1,
    player: newPlayerModel(),
    owned: ['classic'],
    equipped: { skin: 'classic', head: null, face: null, neck: null },
    weapons: { ...ECONOMY.startWeapons },
    daily: { last: null, streak: 0 },
    missions: { date: today(), list: rollMissions(today()), bonus: false },
    giftAt: 0,
    adCoins: { date: today(), count: 0 },
    settings: { sound: true, haptics: true, lang: null },
    tutorialDone: false,
    saved: null,
    receipts: [],
  };
}

export const xpForLevel = (level: number): number => 120 + level * 60;

/** Récompenses du calendrier quotidien (cycle de 7 jours). */
export interface Reward {
  coins?: number;
  credits?: number;
  weapon?: WeaponId;
}
export const DAILY_REWARDS: Reward[] = [
  { coins: 100 },
  { weapon: 'hammer' },
  { coins: 180 },
  { weapon: 'laser' },
  { coins: 260 },
  { weapon: 'chroma' },
  { coins: 400, credits: 30 },
];

export interface GameSummary {
  score: number;
  lines: number;
  blocks: number;
  maxCombo: number;
  multi: number;
  weaponsUsed: number;
}

export interface GameRewards {
  coins: number;
  xp: number;
  record: boolean;
  previousBest: number;
  levelsGained: { level: number; reward: Reward }[];
}

type Listener = () => void;

class Store {
  p: Profile = defaults();
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value) {
        const raw = JSON.parse(value) as Partial<Profile>;
        const d = defaults();
        this.p = {
          ...d,
          ...raw,
          player: { ...d.player, ...raw.player },
          equipped: { ...d.equipped, ...raw.equipped },
          weapons: { ...d.weapons, ...raw.weapons },
          daily: { ...d.daily, ...raw.daily },
          settings: { ...d.settings, ...raw.settings },
        };
      }
    } catch (e) {
      console.warn('Profil illisible, réinitialisation', e);
      this.p = defaults();
    }
    this.rollover();
  }

  /** Passage à un nouveau jour : nouvelles missions, compteurs quotidiens remis à zéro. */
  rollover(): void {
    const d = today();
    if (this.p.missions.date !== d) this.p.missions = { date: d, list: rollMissions(d), bonus: false };
    if (this.p.adCoins.date !== d) this.p.adCoins = { date: d, count: 0 };
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Notifie l'interface et planifie la sauvegarde. */
  commit(): void {
    this.listeners.forEach((fn) => fn());
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 250);
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try {
      await Preferences.set({ key: KEY, value: JSON.stringify(this.p) });
    } catch (e) {
      console.warn('Sauvegarde impossible', e);
    }
  }

  // ---------- économie ----------
  addCoins(n: number): void {
    this.p.coins = Math.max(0, this.p.coins + Math.round(n));
    this.commit();
  }
  addCredits(n: number): void {
    this.p.credits = Math.max(0, this.p.credits + Math.round(n));
    this.commit();
  }
  spendCoins(n: number): boolean {
    if (this.p.coins < n) return false;
    this.addCoins(-n);
    return true;
  }
  spendCredits(n: number): boolean {
    if (this.p.credits < n) return false;
    this.addCredits(-n);
    return true;
  }
  addWeapon(w: WeaponId, n = 1): void {
    this.p.weapons[w] = Math.max(0, (this.p.weapons[w] ?? 0) + n);
    this.commit();
  }
  grant(r: Reward): void {
    if (r.coins) this.p.coins += r.coins;
    if (r.credits) this.p.credits += r.credits;
    if (r.weapon) this.p.weapons[r.weapon] += 1;
    this.commit();
  }
  totalWeapons(): number {
    return WEAPON_IDS.reduce((a, w) => a + this.p.weapons[w], 0);
  }

  // ---------- cosmétiques ----------
  owns(id: string): boolean {
    return this.p.owned.includes(id);
  }
  /** Achète un objet. Renvoie 'ok', 'coins' (pas assez de boulons) ou 'credits'. */
  buyItem(id: string): 'ok' | 'coins' | 'credits' {
    const item = itemById(id);
    if (!item || this.owns(id)) return 'ok';
    if (item.credits) {
      if (!this.spendCredits(item.credits)) return 'credits';
    } else if (item.coins) {
      if (!this.spendCoins(item.coins)) return 'coins';
    }
    this.p.owned.push(id);
    this.equip(id);
    return 'ok';
  }
  equip(id: string): void {
    const item = itemById(id);
    if (!item || !this.owns(id)) return;
    this.p.equipped[item.slot] = id;
    this.commit();
  }
  unequip(slot: Slot): void {
    if (slot === 'skin') return;
    this.p.equipped[slot] = null;
    this.commit();
  }

  // ---------- cadeau quotidien ----------
  dailyAvailable(): boolean {
    return this.p.daily.last !== today();
  }
  /** Jour du cycle (0..6) qui sera récompensé au prochain retrait. */
  dailyIndex(): number {
    const { last, streak } = this.p.daily;
    if (!last) return 0;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const consecutive = last === today(y) || last === today();
    const s = consecutive ? streak : 0;
    return (last === today() ? s - 1 + 7 : s) % 7;
  }
  claimDaily(): Reward | null {
    if (!this.dailyAvailable()) return null;
    const i = this.dailyIndex();
    const reward = DAILY_REWARDS[i];
    this.p.daily = { last: today(), streak: i + 1 };
    this.grant(reward);
    return reward;
  }

  // ---------- cadeau gratuit (minuteur) ----------
  giftReady(): boolean {
    return Date.now() >= this.p.giftAt;
  }
  claimGift(): Reward | null {
    if (!this.giftReady()) return null;
    const roll = Math.random();
    const reward: Reward =
      roll < 0.55
        ? { coins: 60 + Math.floor(Math.random() * 9) * 10 }
        : roll < 0.9
          ? { weapon: WEAPON_IDS[Math.floor(Math.random() * WEAPON_IDS.length)] }
          : { credits: 10 };
    this.p.giftAt = Date.now() + ECONOMY.giftCooldown;
    this.grant(reward);
    return reward;
  }

  // ---------- missions ----------
  private bump(kind: MissionKind, value: number, mode: 'add' | 'max'): void {
    for (const m of this.p.missions.list) {
      if (m.kind !== kind || m.claimed) continue;
      m.progress = Math.min(m.target, mode === 'add' ? m.progress + value : Math.max(m.progress, value));
    }
  }
  claimMission(i: number): number {
    const m = this.p.missions.list[i];
    if (!m || m.claimed || m.progress < m.target) return 0;
    m.claimed = true;
    this.addCoins(m.reward);
    return m.reward;
  }
  missionBonusReady(): boolean {
    return !this.p.missions.bonus && this.p.missions.list.every((m) => m.claimed);
  }
  claimMissionBonus(): Reward | null {
    if (!this.missionBonusReady()) return null;
    this.p.missions.bonus = true;
    const reward: Reward = { credits: 15, coins: 150 };
    this.grant(reward);
    return reward;
  }
  /** Nombre de récompenses en attente (pastille de notification). */
  missionsClaimable(): number {
    return (
      this.p.missions.list.filter((m) => !m.claimed && m.progress >= m.target).length +
      (this.missionBonusReady() ? 1 : 0)
    );
  }

  /** Progression des missions en cours de partie (combo, armes). */
  trackLive(kind: 'combo' | 'weapons', value: number): void {
    this.rollover();
    this.bump(kind, value, kind === 'combo' ? 'max' : 'add');
    this.commit();
  }

  // ---------- fin de partie ----------
  finishGame(g: GameSummary): GameRewards {
    this.rollover();
    const previousBest = this.p.best;
    const record = g.score > previousBest;
    this.p.best = Math.max(previousBest, g.score);
    this.p.player = recordGame(this.p.player, g.score);

    this.bump('games', 1, 'add');
    this.bump('lines', g.lines, 'add');
    this.bump('blocks', g.blocks, 'add');
    this.bump('multi', g.multi, 'add');
    this.bump('total', g.score, 'add');
    this.bump('score', g.score, 'max');
    this.bump('combo', g.maxCombo, 'max');

    const coins = Math.max(5, Math.round(g.score / ECONOMY.coinDivisor)) + (record && previousBest > 0 ? 50 : 0);
    const xp = Math.round(g.score / 8) + g.lines * 2;
    this.p.coins += coins;
    this.p.xp += xp;
    const levelsGained: GameRewards['levelsGained'] = [];
    while (this.p.xp >= xpForLevel(this.p.level)) {
      this.p.xp -= xpForLevel(this.p.level);
      this.p.level += 1;
      const lv = this.p.level;
      const reward: Reward =
        lv % 5 === 0
          ? { credits: 20, coins: 200, weapon: 'laser' }
          : { coins: 80 + lv * 10, weapon: lv % 2 === 0 ? 'hammer' : 'recycle' };
      this.grant(reward);
      levelsGained.push({ level: lv, reward });
    }
    this.p.saved = null;
    this.commit();
    return { coins, xp, record, previousBest, levelsGained };
  }

  saveGame(s: GameSnapshot | null): void {
    this.p.saved = s;
    this.commit();
  }
}

export const store = new Store();
