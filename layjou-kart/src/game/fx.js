/* Particules en espace écran : étincelles de dérapage, fumée, poussière, confettis. */
import { TAU } from '../core/util.js';

export class FX {
  constructor() { this.p = []; this.shake = 0; this.flash = 0; this.flashColor = '255,60,90'; }

  spawn(o) { if (this.p.length < 420) this.p.push({ vx: 0, vy: 0, g: 0, life: 0.5, t: 0, size: 3, color: '#fff', drag: 0.9, type: 'dot', rot: 0, vr: 0, ...o }); }

  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (o.speed || 200) * (0.4 + Math.random() * 0.8);
      this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), ...o, color: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color, size: (o.size || 3) * (0.6 + Math.random() * 0.8), life: (o.life || 0.6) * (0.7 + Math.random() * 0.6), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
    }
  }

  update(dt) {
    for (const q of this.p) {
      q.t += dt; q.vx *= Math.pow(q.drag, dt * 60); q.vy = q.vy * Math.pow(q.drag, dt * 60) + q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    }
    this.p = this.p.filter((q) => q.t < q.life);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.flash = Math.max(0, this.flash - dt * 2.2);
  }

  draw(ctx) {
    for (const q of this.p) {
      const k = 1 - q.t / q.life;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (q.type === 'smoke') {
        ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.6 - k), 0, TAU); ctx.fill();
      } else if (q.type === 'spark') {
        ctx.strokeStyle = q.color; ctx.lineWidth = q.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke();
      } else if (q.type === 'confetti') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.color; ctx.fillRect(-q.size, -q.size * 0.45, q.size * 2, q.size * 0.9); ctx.restore();
      } else if (q.type === 'star') {
        ctx.fillStyle = q.color; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? q.size * 0.4 : q.size; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else {
        ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + 0.5 * k), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
