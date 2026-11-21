/* Effets visuels : particules, textes flottants, ondes, secousses. */
import { TAU, rand, clamp } from '../core/util.js';
import { heartPath, starPath } from './layjou.js';

export class Fx {
  constructor() { this.p = []; this.texts = []; this.rings = []; this.shake = 0; this.flash = 0; this.flashColor = '#fff'; }

  burst(x, y, color, n = 10, speed = 220, type = 'spark', size = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), v = rand(speed * 0.35, speed);
      this.p.push({ type, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (type === 'spark' ? 0 : 40), life: rand(0.3, 0.6), max: 0.6, color: Array.isArray(color) ? color[i % color.length] : color, size: rand(size * 0.6, size * 1.3), rot: rand(TAU), g: type === 'shard' || type === 'coin' ? 620 : type === 'smoke' ? -30 : 140 });
    }
  }
  puff(x, y, color, n = 6) { this.burst(x, y, color, n, 70, 'smoke', 12); }
  ring(x, y, color, r0 = 10, r1 = 80, life = 0.35, width = 6) { this.rings.push({ x, y, color, r0, r1, life, max: life, width }); }
  text(x, y, str, color = '#fff', size = 22, life = 0.9) { this.texts.push({ x: x + rand(-8, 8), y, str, color, size, life, max: life, vy: -70 }); }
  quake(a) { this.shake = Math.max(this.shake, a); }
  blink(color = '#fff', a = 0.5) { this.flash = Math.max(this.flash, a); this.flashColor = color; }

  update(dt) {
    for (const q of this.p) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - 1.8 * dt; q.rot += dt * 6; }
    for (const r of this.rings) r.life -= dt;
    for (const s of this.texts) { s.life -= dt; s.y += s.vy * dt; s.vy *= 1 - 2.2 * dt; }
    this.p = this.p.filter((q) => q.life > 0); this.rings = this.rings.filter((r) => r.life > 0); this.texts = this.texts.filter((s) => s.life > 0);
    if (this.p.length > 260) this.p.splice(0, this.p.length - 260);
    this.shake = Math.max(0, this.shake - dt * 46); this.flash = Math.max(0, this.flash - dt * 2.6);
  }

  draw(ctx) {
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = clamp(1 - k); ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2)), 0, TAU); ctx.stroke();
    }
    for (const q of this.p) {
      const a = clamp(q.life / q.max * 1.6);
      ctx.globalAlpha = a; ctx.fillStyle = q.color;
      if (q.type === 'spark') {
        ctx.strokeStyle = q.color; ctx.lineWidth = q.size * 0.7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.045, q.y - q.vy * 0.045); ctx.stroke();
      } else if (q.type === 'smoke') {
        ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (2 - a), 0, TAU); ctx.fill();
      } else if (q.type === 'star') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); starPath(ctx, 0, 0, q.size * 1.6, q.size * 0.7, 5); ctx.fill(); ctx.restore();
      } else if (q.type === 'heart') {
        heartPath(ctx, q.x, q.y, q.size);ctx.fill();
      } else if (q.type === 'shard') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath(); ctx.moveTo(-q.size, q.size * 0.6); ctx.lineTo(0, -q.size); ctx.lineTo(q.size, q.size * 0.7); ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (q.type === 'coin') {
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * Math.abs(Math.cos(q.rot)), q.size, 0, 0, TAU); ctx.fill();
      } else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const s of this.texts) {
      const k = 1 - s.life / s.max, pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.55 : 1.15 - Math.min(0.15, (k - 0.15) * 0.6);
      ctx.globalAlpha = clamp(s.life / s.max * 2.2);
      ctx.font = `700 ${Math.round(s.size * pop)}px "Fredoka Variable", "Fredoka", system-ui, sans-serif`;
      ctx.lineWidth = Math.max(3, s.size * 0.22); ctx.strokeStyle = 'rgba(11,20,64,0.9)'; ctx.strokeText(s.str, s.x, s.y);
      ctx.fillStyle = s.color; ctx.fillText(s.str, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }
}
