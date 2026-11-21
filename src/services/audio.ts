/**
 * Effets sonores synthétisés (WebAudio) : aucun fichier audio à charger.
 * Les effacements jouent des notes d'une gamme pentatonique qui montent avec le combo.
 */
import { Haptic } from './haptics';
import { store } from '../state/store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (!store.p.settings.sound) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** À appeler sur le premier geste de l'utilisateur (politique d'autoplay). */
export function unlockAudio(): void {
  ac();
}

export function suspendAudio(): void {
  if (ctx && ctx.state === 'running') void ctx.suspend();
}

interface Tone {
  f: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  at?: number;
}

function tone({ f, to, dur, type = 'sine', vol = 0.3, at = 0 }: Tone): void {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

function noise(dur: number, vol: number, cutoff: number, at = 0): void {
  const c = ac();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(master);
  src.start(c.currentTime + at);
}

// gamme pentatonique majeure (do) sur trois octaves
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];

export const sfx = {
  tap: () => tone({ f: 660, to: 880, dur: 0.06, type: 'triangle', vol: 0.12 }),
  pick: () => tone({ f: 420, to: 560, dur: 0.07, type: 'triangle', vol: 0.14 }),
  place: () => {
    tone({ f: 260, to: 150, dur: 0.11, vol: 0.34 });
    noise(0.05, 0.12, 1800);
  },
  invalid: () => tone({ f: 170, to: 110, dur: 0.14, type: 'square', vol: 0.07 }),
  clear: (lines: number, streak: number) => {
    const base = Math.min(streak - 1, 5);
    const notes = Math.min(2 + lines, 5);
    for (let i = 0; i < notes; i++) {
      tone({ f: PENTA[Math.min(base + i * 2, PENTA.length - 1)], dur: 0.32, type: 'triangle', vol: 0.22, at: i * 0.07 });
      tone({ f: PENTA[Math.min(base + i * 2, PENTA.length - 1)] * 2, dur: 0.2, vol: 0.06, at: i * 0.07 });
    }
    noise(0.18, 0.1, 5000);
  },
  perfect: () => [0, 2, 4, 5, 7, 9].forEach((n, i) => tone({ f: PENTA[n], dur: 0.4, type: 'triangle', vol: 0.2, at: i * 0.08 })),
  coin: () => {
    tone({ f: 1318, dur: 0.09, type: 'square', vol: 0.07 });
    tone({ f: 1760, dur: 0.22, type: 'square', vol: 0.07, at: 0.08 });
  },
  reward: () => [0, 2, 4, 7].forEach((n, i) => tone({ f: PENTA[n], dur: 0.3, type: 'triangle', vol: 0.2, at: i * 0.09 })),
  levelUp: () => [0, 2, 4, 5, 7, 9, 10].forEach((n, i) => tone({ f: PENTA[n], dur: 0.35, type: 'triangle', vol: 0.18, at: i * 0.07 })),
  boom: () => {
    noise(0.45, 0.5, 700);
    tone({ f: 130, to: 45, dur: 0.4, vol: 0.5 });
  },
  zap: () => {
    tone({ f: 1800, to: 240, dur: 0.3, type: 'sawtooth', vol: 0.14 });
    noise(0.2, 0.12, 6000);
  },
  whoosh: () => noise(0.3, 0.2, 2400),
  stuck: () => {
    tone({ f: 330, to: 262, dur: 0.22, type: 'triangle', vol: 0.2 });
    tone({ f: 262, to: 196, dur: 0.3, type: 'triangle', vol: 0.2, at: 0.2 });
  },
  gameOver: () => [392, 330, 262, 196].forEach((f, i) => tone({ f, dur: 0.34, type: 'triangle', vol: 0.2, at: i * 0.16 })),
};

// ---------- vibrations (voir services/haptics.ts : impacts, motifs, combos, explosions) ----------
Haptic.setEnabled(() => store.p.settings.haptics);
export const haptic = Haptic;
