/* ------------------------------------------------------------------ *
 *  Haptique — retours haptiques « sensationnels » des jeux Layjou.
 *
 *  Effets de base (moteur Taptic d'iOS, vibreur d'Android) :
 *    select  cran discret (pièce, roulette, onglet)
 *    light / medium / heavy  chocs de plus en plus forts
 *    success / warning / error  motifs de notification du système
 *  Effets composés : motifs enchaînés, grondements continus (hors-piste,
 *  dérapage qui se charge, turbo), crescendo de combo, explosion, fête.
 *
 *  Un limiteur évite de saturer le moteur : deux impulsions sont
 *  espacées d'au moins 40 ms, sauf si la seconde est plus forte.
 * ------------------------------------------------------------------ */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = Capacitor.isNativePlatform();
type Kind = 'select' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
type Step = [Kind, number];
const WEIGHT: Record<Kind, number> = { select: 1, light: 2, medium: 3, heavy: 4, success: 5, warning: 5, error: 6 };
const WEB_MS: Record<Kind, number | number[]> = { select: 5, light: 10, medium: 18, heavy: 32, success: [14, 60, 22], warning: [24, 90, 24], error: [30, 60, 30, 60, 40] };

let enabled: () => boolean = () => true;
let last = 0, lastWeight = 0, selecting = false;
const loops = new Map<string, { kind: Kind; every: number; id: ReturnType<typeof setInterval> }>();
const timers = new Set<ReturnType<typeof setTimeout>>();

function fire(kind: Kind): void {
  if (native) {
    const swallow = (): void => undefined;
    switch (kind) {
      case 'select':
        if (!selecting) { selecting = true; Haptics.selectionStart().catch(swallow); }
        Haptics.selectionChanged().catch(() => Haptics.impact({ style: ImpactStyle.Light }).catch(swallow));
        return;
      case 'light': Haptics.impact({ style: ImpactStyle.Light }).catch(swallow); return;
      case 'medium': Haptics.impact({ style: ImpactStyle.Medium }).catch(swallow); return;
      case 'heavy': Haptics.impact({ style: ImpactStyle.Heavy }).catch(swallow); return;
      case 'success': Haptics.notification({ type: NotificationType.Success }).catch(swallow); return;
      case 'warning': Haptics.notification({ type: NotificationType.Warning }).catch(swallow); return;
      case 'error': Haptics.notification({ type: NotificationType.Error }).catch(swallow); return;
        }
    return;
  }
  if (navigator.vibrate) { try { navigator.vibrate(WEB_MS[kind] ?? 10); } catch { /* non supporté */ } }
}

function pulse(kind: Kind): void {
  if (!enabled()) return;
  const now = performance.now(), w = WEIGHT[kind] ?? 2;
  if (now - last < 40 && w <= lastWeight) return;
  last = now; lastWeight = w;
  fire(kind);
}

function later(ms: number, fn: () => void): void { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); }

export const Haptic = {
  native,
  /** Branche le réglage du joueur (fonction qui renvoie true si les vibrations sont actives). */
  setEnabled(fn: () => boolean): void { enabled = fn; },

  select: () => pulse('select'),
  tap: () => pulse('select'),
  light: () => pulse('light'),
  medium: () => pulse('medium'),
  heavy: () => pulse('heavy'),
  success: () => pulse('success'),
  warning: () => pulse('warning'),
  error: () => pulse('error'),
  /** Impulsion selon une force 0..1. */
  force(k: number): void { pulse(k >= 0.75 ? 'heavy' : k >= 0.4 ? 'medium' : k > 0.1 ? 'light' : 'select'); },

  /** Motif : [[effet, délai ms], ...] — ex. [['heavy', 0], ['medium', 90]]. */
  pattern(steps: Step[]): void {
    if (!enabled()) return;
    for (const [kind, at] of steps) { if (!at) pulse(kind); else later(at, () => pulse(kind)); }
  },

  /**
   * Grondement continu nommé : impulsions répétées tant qu'on le rappelle.
   * Idempotent : on peut l'appeler à chaque image, il ne redémarre que si l'effet ou le rythme changent.
   */
  loop(name: string, kind: Kind, every: number): void {
    const cur = loops.get(name);
    if (cur && cur.kind === kind && cur.every === every) return;
    if (cur) clearInterval(cur.id);
    pulse(kind);
    loops.set(name, { kind, every, id: setInterval(() => pulse(kind), every) });
  },
  stop(name: string): void { const cur = loops.get(name); if (cur) { clearInterval(cur.id); loops.delete(name); } },
  stopAll(): void {
    for (const cur of loops.values()) clearInterval(cur.id);
    loops.clear();
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (selecting && native) { selecting = false; Haptics.selectionEnd().catch(() => {}); }
  },

  /* ---------------------------- effets composés ---------------------------- */
  /** Crescendo de combo : plus la chaîne est longue, plus ça tape. */
  combo(n: number): void {
    if (n <= 1) return pulse('light');
    if (n < 4) return this.pattern([['medium', 0], ['light', 70]]);
    if (n < 7) return this.pattern([['heavy', 0], ['medium', 70], ['light', 140]]);
    return this.pattern([['heavy', 0], ['heavy', 80], ['medium', 160], ['light', 230]]);
  },
  /** Explosion / gros impact. */
  boom(): void { this.pattern([['heavy', 0], ['heavy', 70], ['medium', 160], ['light', 260]]); },
  /** Turbo / accélération : poussée qui retombe. */
  surge(): void { this.pattern([['heavy', 0], ['medium', 60], ['light', 130], ['select', 210]]); },
  /** Victoire / récompense : notification de succès puis petite cascade. */
  celebrate(): void { this.pattern([['success', 0], ['light', 180], ['light', 260], ['medium', 360], ['heavy', 480]]); },
  /** Défaite / K.O. */
  fail(): void { this.pattern([['error', 0], ['heavy', 220]]); },
  /** Coup reçu. */
  hurt(): void { this.pattern([['heavy', 0], ['error', 90]]); },
};
