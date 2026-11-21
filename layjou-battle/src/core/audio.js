/* Son 100 % synthétisé (WebAudio) : aucun fichier audio à embarquer. */
import { S } from './state.js';

let ctx = null, master = null, sfxBus = null, musicBus = null;
let musicTimer = null, musicMood = null, step = 0, nextTime = 0, muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.2; musicBus.connect(master);
  return ctx;
}

function tone({ type = 'sine', f0 = 440, f1 = null, dur = 0.12, vol = 0.5, delay = 0, bus = sfxBus, attack = 0.005 }) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise({ dur = 0.15, vol = 0.4, f = 1200, q = 0.8, type = 'bandpass', delay = 0, f1 = null, bus = sfxBus }) {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = ctx.currentTime + delay, src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true; flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q; if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g); g.connect(bus); src.start(t, Math.random()); src.stop(t + dur + 0.02);
}

const RECIPES = {
  click: () => tone({ type: 'triangle', f0: 720, f1: 980, dur: 0.06, vol: 0.3 }),
  tab: () => tone({ type: 'sine', f0: 520, f1: 700, dur: 0.07, vol: 0.25 }),
  error: () => { tone({ type: 'square', f0: 190, dur: 0.1, vol: 0.2 }); tone({ type: 'square', f0: 150, dur: 0.14, vol: 0.2, delay: 0.1 }); },
  coin: () => { tone({ type: 'square', f0: 990, dur: 0.06, vol: 0.18 }); tone({ type: 'square', f0: 1320, dur: 0.16, vol: 0.18, delay: 0.06 }); },
  buy: () => [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.3, delay: i * 0.07 })),
  levelup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.2, vol: 0.16, delay: i * 0.09 })),
  chest: () => { noise({ dur: 0.25, vol: 0.3, f: 500, f1: 3000 }); [660, 880, 1320].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.3, delay: 0.2 + i * 0.08 })); },
  tick: () => tone({ type: 'square', f0: 1400, dur: 0.025, vol: 0.12 }),
  star: () => { tone({ type: 'triangle', f0: 880, f1: 1760, dur: 0.2, vol: 0.35 }); },
  swing: () => noise({ dur: 0.1, vol: 0.22, f: 900, f1: 2600, q: 1.2 }),
  whoosh: () => noise({ dur: 0.22, vol: 0.3, f: 400, f1: 1800, q: 0.9 }),
  hit: () => { noise({ dur: 0.08, vol: 0.5, f: 1600, q: 0.6 }); tone({ type: 'sine', f0: 180, f1: 70, dur: 0.1, vol: 0.5 }); },
  hitHeavy: () => { noise({ dur: 0.16, vol: 0.6, f: 900, q: 0.5 }); tone({ type: 'sine', f0: 150, f1: 45, dur: 0.22, vol: 0.7 }); },
  slash: () => { noise({ dur: 0.09, vol: 0.4, f: 3200, f1: 900, q: 1.5 }); tone({ type: 'sawtooth', f0: 900, f1: 300, dur: 0.08, vol: 0.14 }); },
  shoot: () => { tone({ type: 'square', f0: 980, f1: 260, dur: 0.13, vol: 0.22 }); noise({ dur: 0.06, vol: 0.2, f: 2400 }); },
  zap: () => { tone({ type: 'sawtooth', f0: 1600, f1: 200, dur: 0.18, vol: 0.25 }); noise({ dur: 0.2, vol: 0.3, f: 4200, q: 3 }); },
  boom: () => { noise({ dur: 0.5, vol: 0.7, f: 500, f1: 80, type: 'lowpass' }); tone({ type: 'sine', f0: 120, f1: 30, dur: 0.5, vol: 0.8 }); },
  quake: () => { noise({ dur: 0.4, vol: 0.5, f: 260, f1: 70, type: 'lowpass' }); tone({ type: 'sine', f0: 90, f1: 34, dur: 0.4, vol: 0.7 }); },
  land: () => { noise({ dur: 0.2, vol: 0.35, f: 300, type: 'lowpass' }); tone({ type: 'sine', f0: 110, f1: 50, dur: 0.2, vol: 0.5 }); },
  warn: () => { tone({ type: 'square', f0: 660, dur: 0.07, vol: 0.14 }); tone({ type: 'square', f0: 660, dur: 0.07, vol: 0.14, delay: 0.11 }); },
  danger: () => { tone({ type: 'sawtooth', f0: 440, f1: 880, dur: 0.14, vol: 0.16 }); tone({ type: 'sawtooth', f0: 440, f1: 880, dur: 0.14, vol: 0.16, delay: 0.17 }); },
  shield: () => tone({ type: 'sine', f0: 320, f1: 640, dur: 0.12, vol: 0.25 }),
  block: () => { noise({ dur: 0.07, vol: 0.3, f: 2600, q: 2 }); tone({ type: 'triangle', f0: 420, f1: 300, dur: 0.1, vol: 0.3 }); },
  perfect: () => { tone({ type: 'triangle', f0: 1175, dur: 0.09, vol: 0.35 }); tone({ type: 'triangle', f0: 1568, dur: 0.22, vol: 0.35, delay: 0.07 }); noise({ dur: 0.1, vol: 0.2, f: 5000, q: 2 }); },
  break: () => { noise({ dur: 0.3, vol: 0.5, f: 3000, f1: 500, q: 1 }); tone({ type: 'sawtooth', f0: 300, f1: 80, dur: 0.3, vol: 0.3 }); },
  dash: () => noise({ dur: 0.16, vol: 0.25, f: 2200, f1: 600, q: 1 }),
  dodgeOk: () => tone({ type: 'sine', f0: 880, f1: 1320, dur: 0.12, vol: 0.25 }),
  hurt: () => { tone({ type: 'sawtooth', f0: 320, f1: 110, dur: 0.18, vol: 0.3 }); noise({ dur: 0.1, vol: 0.4, f: 800 }); },
  spit: () => tone({ type: 'sine', f0: 500, f1: 180, dur: 0.14, vol: 0.25 }),
  beam: () => { tone({ type: 'sawtooth', f0: 220, f1: 330, dur: 1.1, vol: 0.14 }); noise({ dur: 1.1, vol: 0.14, f: 1800, q: 3 }); },
  ping: () => { tone({ type: 'sine', f0: 1568, dur: 0.1, vol: 0.2 }); tone({ type: 'sine', f0: 2093, dur: 0.14, vol: 0.2, delay: 0.08 }); },
  weak: () => { tone({ type: 'square', f0: 1320, f1: 2640, dur: 0.12, vol: 0.18 }); noise({ dur: 0.12, vol: 0.4, f: 1400, q: 0.6 }); },
  stun: () => [1047, 880, 1047, 880].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.09, vol: 0.25, delay: i * 0.08 })),
  roar: () => { tone({ type: 'sawtooth', f0: 160, f1: 60, dur: 0.9, vol: 0.4 }); noise({ dur: 0.9, vol: 0.4, f: 400, f1: 150, type: 'lowpass' }); },
  ult: () => { tone({ type: 'sawtooth', f0: 220, f1: 1760, dur: 0.5, vol: 0.2 }); [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.25, delay: 0.45 + i * 0.1 })); },
  go: () => { tone({ type: 'square', f0: 784, dur: 0.1, vol: 0.2 }); tone({ type: 'square', f0: 1175, dur: 0.25, vol: 0.2, delay: 0.1 }); },
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ type: 'square', f0: f, dur: i === 6 ? 0.5 : 0.13, vol: 0.17, delay: i * 0.12 })),
  lose: () => [392, 349, 311, 262].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: i === 3 ? 0.6 : 0.22, vol: 0.28, delay: i * 0.2 })),
  ko: () => { tone({ type: 'sawtooth', f0: 400, f1: 60, dur: 0.6, vol: 0.3 }); noise({ dur: 0.3, vol: 0.4, f: 600, type: 'lowpass' }); },
  revive: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.3, delay: i * 0.07 })),
  spin: () => tone({ type: 'square', f0: 1100, dur: 0.03, vol: 0.12 }),
};

/* --------------------------- musique générative --------------------------- */
const MOODS = {
  menu: { bpm: 104, root: 57, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [-3, 0, 4, 7], [-5, -1, 2, 7]], drums: false, wave: 'triangle' },
  battle: { bpm: 138, root: 50, prog: [[0, 3, 7, 10], [0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9]], drums: true, wave: 'square' },
  boss: { bpm: 150, root: 48, prog: [[0, 3, 7, 10], [1, 4, 8, 11], [0, 3, 7, 10], [-2, 1, 5, 8]], drums: true, wave: 'sawtooth' },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function schedule() {
  if (!ctx || !musicMood) return;
  const M = MOODS[musicMood], spb = 60 / M.bpm / 2; // croches
  while (nextTime < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % M.prog.length, chord = M.prog[bar], i = step % 8, t = nextTime - ctx.currentTime;
    const d = Math.max(0, t);
    // arpège
    const note = chord[[0, 1, 2, 3, 2, 1, 2, 3][i]] + (i === 7 && bar % 2 ? 12 : 0);
    tone({ type: M.wave, f0: mtof(M.root + 12 + note), dur: spb * 0.9, vol: M.wave === 'triangle' ? 0.5 : 0.22, delay: d, bus: musicBus, attack: 0.01 });
    // basse
    if (i % 4 === 0 || (M.drums && i === 6)) tone({ type: 'triangle', f0: mtof(M.root - 12 + chord[0]), dur: spb * (M.drums ? 1.6 : 3.4), vol: 0.75, delay: d, bus: musicBus, attack: 0.01 });
    // nappe
    if (i === 0) for (const n of chord.slice(0, 3)) tone({ type: 'sine', f0: mtof(M.root + n), dur: spb * 7.6, vol: 0.2, delay: d, bus: musicBus, attack: 0.3 });
    if (M.drums) {
      if (i % 4 === 0) tone({ type: 'sine', f0: 150, f1: 40, dur: 0.16, vol: 0.9, delay: d, bus: musicBus });
      if (i % 4 === 2) noise({ dur: 0.09, vol: 0.35, f: 1800, q: 0.7, delay: d, bus: musicBus });
      noise({ dur: 0.03, vol: i % 2 ? 0.12 : 0.07, f: 7000, q: 1.5, delay: d, bus: musicBus });
    }
    nextTime += spb; step++;
  }
}

export const Audio = {
  /** À appeler sur le premier geste utilisateur (politique d'autoplay). */
  unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); if (c && musicMood && !musicTimer) this.music(musicMood, true); },
  sfx(name) {
    if (!S.data.settings.sfx || muted) return;
    const c = ensure(); if (!c || c.state !== 'running') return;
    const r = RECIPES[name]; if (r) { try { r(); } catch { /* nœud audio indisponible */ } }
  },
  music(mood, force = false) {
    if (mood === musicMood && !force) return;
    musicMood = mood; clearInterval(musicTimer); musicTimer = null;
    if (!mood || !S.data.settings.music || muted) return;
    const c = ensure(); if (!c || c.state !== 'running') return;
    step = 0; nextTime = c.currentTime + 0.08;
    musicTimer = setInterval(schedule, 90); schedule();
  },
  refresh() { this.music(musicMood, true); },
  /** Coupe tout (arrière-plan, publicité). */
  mute(v) {
    muted = v;
    if (!ctx) return;
    if (v) { clearInterval(musicTimer); musicTimer = null; master.gain.setTargetAtTime(0, ctx.currentTime, 0.02); if (ctx.state === 'running') ctx.suspend().catch(() => {}); }
    else { ctx.resume().then(() => { master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.05); this.music(musicMood, true); }).catch(() => {}); }
  },
};
