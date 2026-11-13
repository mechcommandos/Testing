/** Particules (canvas plein écran) : éclats de blocs, confettis, étincelles. */

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  size: number;
  rot: number;
  vr: number;
  life: number;
  max: number;
  color: string;
  shape: 0 | 1 | 2; // carré arrondi, rond, étoile
}

export const BLOCK_COLORS = ['', '#19C5D6', '#FF4F9A', '#FFC531', '#8B6CF6', '#FF8A3D', '#35D07F', '#FF5A5A'];

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let dpr = 1;
const parts: P[] = [];
let running = false;
let last = 0;

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}

export function initFx(): void {
  canvas = document.getElementById('fx') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  resize();
  window.addEventListener('resize', resize);
}

function star(c: CanvasRenderingContext2D, r: number): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  c.closePath();
  c.fill();
}

function frame(now: number): void {
  const dt = Math.min(0.034, (now - last) / 1000);
  last = now;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const k = p.life / p.max;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, k * 2.2);
    ctx.fillStyle = p.color;
    const s = p.size * (0.5 + 0.5 * k);
    if (p.shape === 0) {
      ctx.beginPath();
      ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.28);
      ctx.fill();
    } else if (p.shape === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else star(ctx, s * 0.7);
    ctx.restore();
  }
  if (parts.length > 0) requestAnimationFrame(frame);
  else {
    running = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function kick(): void {
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Éclats quand un bloc disparaît. */
export function burst(x: number, y: number, color: string, count = 7, power = 1): void {
  if (parts.length > 900) return;
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(60, 260) * power;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 80,
      g: 620,
      size: rand(5, 12),
      rot: rand(0, 6),
      vr: rand(-8, 8),
      life: rand(0.45, 0.9),
      max: 0.9,
      color: i % 4 === 0 ? '#ffffff' : color,
      shape: i % 3 === 0 ? 1 : 0,
    });
  }
  kick();
}

/** Petites étoiles montantes (récompenses, coups de cœur). */
export function sparkle(x: number, y: number, color = '#FFD84D', count = 12): void {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(40, 200);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 60,
      g: 120,
      size: rand(7, 15),
      rot: rand(0, 6),
      vr: rand(-4, 4),
      life: rand(0.5, 1.1),
      max: 1.1,
      color: i % 3 === 0 ? '#ffffff' : color,
      shape: 2,
    });
  }
  kick();
}

/** Pluie de confettis (record, niveau). */
export function confetti(count = 110): void {
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    parts.push({
      x: rand(0, w),
      y: rand(-140, -10),
      vx: rand(-70, 70),
      vy: rand(120, 380),
      g: 160,
      size: rand(7, 13),
      rot: rand(0, 6),
      vr: rand(-9, 9),
      life: rand(1.8, 3),
      max: 3,
      color: BLOCK_COLORS[1 + Math.floor(Math.random() * 7)],
      shape: i % 5 === 0 ? 2 : 0,
    });
  }
  kick();
}
