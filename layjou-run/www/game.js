import * as THREE from './vendor/three.module.min.js';
import { ads, PRIVACY_URL } from './ads.js';

/* =========================================================
   Layjou Run — endless runner sur 3 voies
   ========================================================= */

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const LANE = 2.2;
const SPAWN_Z = -130;
const GRAVITY = 26;
const JUMP_V = 9.6;
const SLIDE_TIME = 0.65;
const REVIVE_COST = 100;
const COL = { white: 0xffffff, cyan: 0x1cc5d8, cyanDeep: 0x0e9fb3, pink: 0xff5fa2, navy: 0x0a3a9a, sky: 0xd9f1fb };

/* ---------------- Sauvegarde ---------------- */
const SAVE_KEY = 'roborush.v1';
const save = {
  best: 0, hearts: 0, streak: 0, lastDay: '', mute: false, vibe: true,
  up: { magnet: 0, shield: 0, double: 0 }, missions: [], missionsDone: 0,
};
try {
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (raw && typeof raw === 'object') Object.assign(save, raw, { up: Object.assign(save.up, raw.up || {}) });
} catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
// Retours haptiques (haptique.js) : réglage « Vibrations » du joueur
const HX = window.Haptique;
HX.setEnabled(() => save.vibe !== false);
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) HX.tap(); }, true);
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
}

/* ---------------- Bonus quotidien ---------------- */
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
let dailyMessage = '';
(function daily() {
  const now = new Date();
  const today = dayKey(now);
  if (save.lastDay === today) return;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  save.streak = save.lastDay === dayKey(y) ? save.streak + 1 : 1;
  save.lastDay = today;
  const gift = 20 * Math.min(save.streak, 7);
  save.hearts += gift;
  dailyMessage = `Bonus du jour ${save.streak} : +${gift} cœurs. Reviens demain pour +${20 * Math.min(save.streak + 1, 7)}.`;
  persist();
})();

/* ---------------- Missions ---------------- */
const MISSIONS = {
  heartsRun: { txt: (n) => `Ramasse ${n} cœurs en une seule partie`, base: 30, step: 15, run: true },
  scoreRun: { txt: (n) => `Marque ${n} points en une seule partie`, base: 500, step: 400, run: true },
  jumps: { txt: (n) => `Saute ${n} fois`, base: 20, step: 10 },
  slides: { txt: (n) => `Glisse ${n} fois sous un portique`, base: 15, step: 8 },
  powerups: { txt: (n) => `Attrape ${n} bonus`, base: 3, step: 1 },
  heartsTotal: { txt: (n) => `Ramasse ${n} cœurs au total`, base: 100, step: 60 },
};
function newMission() {
  const used = save.missions.map((m) => m.type);
  const type = pick(Object.keys(MISSIONS).filter((t) => !used.includes(t)));
  const lvl = Math.floor(save.missionsDone / 3);
  const def = MISSIONS[type];
  return { type, goal: def.base + def.step * lvl, prog: 0, reward: 40 + 10 * lvl, done: false };
}
function refreshMissions() {
  save.missions = save.missions.filter((m) => m && MISSIONS[m.type] && !m.done);
  while (save.missions.length < 3) save.missions.push(newMission());
  persist();
}
function missionEvent(type, value) {
  for (const m of save.missions) {
    if (m.type !== type || m.done) continue;
    m.prog = MISSIONS[type].run ? Math.max(m.prog, value) : m.prog + value;
    if (m.prog >= m.goal) {
      m.prog = m.goal; m.done = true;
      save.hearts += m.reward; save.missionsDone++;
      toast(`Mission réussie : +${m.reward} cœurs`);
      sfx.mission();
      HX.pattern([['success', 0], ['light', 180], ['medium', 280]]);
      persist();
    }
  }
}
refreshMissions();

/* ---------------- Améliorations ---------------- */
const UPGRADES = {
  magnet: { name: 'Aimant', icon: 'i-magnet', dur: (l) => 6 + 1.5 * l },
  shield: { name: 'Bouclier', icon: 'i-shield', dur: (l) => 8 + 2 * l },
  double: { name: 'Score ×2', icon: 'i-double', dur: (l) => 6 + 1.5 * l },
};
const MAX_LVL = 5;
const upCost = (l) => 150 * (l + 1);

/* ---------------- Son ---------------- */
let actx = null;
function tone(f0, f1, dur, type = 'sine', vol = 0.12, delay = 0) {
  if (save.mute || !actx) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(); const g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  unlock() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { actx = null; }
  },
  heart: () => tone(900, 1400, 0.08, 'sine', 0.08),
  jump: () => tone(320, 640, 0.16, 'triangle', 0.1),
  slide: () => tone(260, 120, 0.2, 'triangle', 0.1),
  power: () => { tone(520, 520, 0.09, 'square', 0.06); tone(780, 780, 0.09, 'square', 0.06, 0.09); tone(1040, 1040, 0.14, 'square', 0.06, 0.18); },
  crash: () => { tone(220, 50, 0.45, 'sawtooth', 0.16); tone(90, 40, 0.5, 'square', 0.1); },
  shield: () => tone(700, 200, 0.3, 'sine', 0.14),
  mission: () => { tone(660, 660, 0.1, 'triangle', 0.1); tone(990, 990, 0.2, 'triangle', 0.1, 0.1); },
};

/* ---------------- Rendu ---------------- */
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#6fbff2'); gr.addColorStop(0.5, '#dff3fc'); gr.addColorStop(1, '#f4fbff');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
scene.fog = new THREE.Fog(0xdff3fc, 45, 128);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 300);
let camBase = new THREE.Vector3(0, 4.4, 7.6);

scene.add(new THREE.HemisphereLight(0xffffff, 0xb9e6f5, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(4, 9, 6);
scene.add(sun);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const portrait = camera.aspect < 1;
  camera.fov = portrait ? 76 : 60;
  camBase.set(0, portrait ? 4.9 : 4.2, portrait ? 8.6 : 7.4);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.02, ...extra });
const M = {
  white: mat(COL.white), cyan: mat(COL.cyan), pink: mat(COL.pink), navy: mat(COL.navy, { roughness: 0.25 }),
  blue: mat(0x2f8cf0), dark: mat(0x06246b), mouth: mat(0xff7a7a),
  heart: mat(COL.pink, { emissive: 0xff2f86, emissiveIntensity: 0.35, roughness: 0.3 }),
  post: mat(COL.cyanDeep),
};

/* ---------------- Décor ---------------- */
const TILE = 8;
const trackTex = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#eef8fc'; g.fillRect(0, 0, 512, 512);
  const laneW = 512 * (LANE / (LANE * 3 + 0.6));
  for (let l = -1; l <= 1; l++) {
    const cx = 256 + l * laneW;
    g.fillStyle = '#e1f1f8'; g.fillRect(cx - 58, 0, 116, 512);            // ballast clair
    g.fillStyle = '#c3dbe8';
    for (let y = 16; y < 512; y += 64) g.fillRect(cx - 50, y, 100, 22);   // traverses
    g.fillStyle = '#7f9db3'; g.fillRect(cx - 36, 0, 9, 512); g.fillRect(cx + 27, 0, 9, 512); // rails
    g.fillStyle = '#d8ecf5'; g.fillRect(cx - 34, 0, 3, 512); g.fillRect(cx + 29, 0, 3, 512); // reflets
  }
  g.fillStyle = '#ffb3d2';
  for (const x of [256 - laneW / 2, 256 + laneW / 2]) g.fillRect(x - 4, 0, 8, 512);
  g.fillStyle = '#19c3d6'; g.fillRect(0, 0, 14, 512); g.fillRect(498, 0, 14, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 220 / TILE); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
})();
const TRACK_W = LANE * 3 + 0.6;
const track = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_W, 220), new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.8 }));
track.rotation.x = -Math.PI / 2; track.position.z = -95;
scene.add(track);
for (const s of [-1, 1]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 220), M.cyan);
  rail.position.set(s * (TRACK_W / 2 + 0.12), 0.05, -95);
  scene.add(rail);
}
const under = new THREE.Mesh(new THREE.BoxGeometry(TRACK_W - 0.6, 0.5, 220), mat(0x8fd9ea));
under.position.set(0, -0.3, -95);
scene.add(under);

const scenery = []; // { mesh, par (parallaxe), span }
const PASTEL = [0xffffff, 0xbfeef5, 0xffd3e6, 0x9fe1ee, 0xcfd9ff, 0xffe9f2];
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
const sphGeo = new THREE.SphereGeometry(1, 14, 10);
const domeGeo = new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const glow = { pink: new THREE.MeshBasicMaterial({ color: 0xff7fb5 }), warm: new THREE.MeshBasicMaterial({ color: 0xfff1b8 }) };
const leaf = mat(0x7fdc9f, { roughness: 0.9 });

// façade : grille de fenêtres, certaines allumées
const windowTex = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#e9f1f7'; for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 128, 3);
  for (let r = 0; r < 8; r++) for (let q = 0; q < 4; q++) {
    const lit = Math.random();
    g.fillStyle = lit < 0.18 ? '#ffe9a6' : lit < 0.55 ? '#7fb2e6' : '#5c8fd0';
    g.beginPath(); g.roundRect(q * 32 + 7, r * 32 + 9, 18, 17, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(q * 32 + 7, r * 32 + 9, 18, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function facade(color, around, height) {
  const tex = windowTex.clone();
  tex.repeat.set(Math.max(1, Math.round(around / 3.6)), height / 9.6); tex.needsUpdate = true;
  return mat(color, { map: tex, roughness: 0.85 });
}
function tower(i) {
  const g = new THREE.Group();
  const side = i % 2 ? 1 : -1;
  const w = rand(3.2, 6.5), H = 60, top = rand(-2, 15);
  const round = Math.random() < 0.35;
  const color = pick(PASTEL), accent = pick([M.cyan, M.pink, M.white]);
  g.add(part(round ? cylGeo : boxGeo, facade(color, round ? w * 3.14 : w, H), 0, -H / 2, 0, w, H, w));
  let roof = 0;
  if (round) {
    g.add(part(cylGeo, accent, 0, 0.1, 0, w * 1.08, 0.3, w * 1.08));
    g.add(part(domeGeo, mat(color), 0, 0.25, 0, w * 0.92, w * 0.7, w * 0.92));
    roof = 0.25 + w * 0.35;
  } else {
    g.add(part(boxGeo, accent, 0, 0.12, 0, w * 1.07, 0.26, w * 1.07));
    roof = 0.25;
    const r = Math.random();
    if (r < 0.45) {                       // étage en retrait
      const h2 = rand(2, 5), w2 = w * 0.62;
      g.add(part(boxGeo, facade(color, w2, h2), 0, roof + h2 / 2, 0, w2, h2, w2));
      g.add(part(boxGeo, accent, 0, roof + h2 + 0.1, 0, w2 * 1.1, 0.2, w2 * 1.1));
      roof += h2 + 0.2;
    } else if (r < 0.8) {                 // jardin sur le toit
      for (let k = 0; k < 3; k++) {
        const s = rand(0.5, 0.9);
        g.add(part(sphGeo, leaf, rand(-0.3, 0.3) * w, roof + s * 0.8, rand(-0.3, 0.3) * w, s, s, s));
      }
    }
  }
  if (Math.random() < 0.55) {             // antenne, comme celle du robot
    const ah = rand(1.6, 3.6);
    g.add(part(cylGeo, M.cyan, 0, roof + ah / 2, 0, 0.1, ah, 0.1));
    g.add(part(sphGeo, glow.pink, 0, roof + ah + 0.2, 0, 0.26, 0.26, 0.26));
  }
  g.position.set(side * rand(8.5, 26), top, -i * (200 / 44) + 10);
  scene.add(g);
  scenery.push({ mesh: g, par: 1, span: 200 });
}
for (let i = 0; i < 44; i++) tower(i);

// lampadaires le long de la voie
for (let i = 0; i < 20; i++) {
  const side = i % 2 ? 1 : -1;
  const g = new THREE.Group();
  g.add(part(cylGeo, M.white, 0, 1.6, 0, 0.12, 3.2, 0.12));
  g.add(part(boxGeo, M.cyan, -side * 0.35, 3.2, 0, 0.9, 0.1, 0.14));
  g.add(part(sphGeo, glow.warm, -side * 0.75, 3.08, 0, 0.17, 0.17, 0.17));
  g.position.set(side * (TRACK_W / 2 + 0.55), 0, -Math.floor(i / 2) * 20 - 5);
  scene.add(g);
  scenery.push({ mesh: g, par: 1, span: 200 });
}

// nuages
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.92 });
for (let i = 0; i < 14; i++) {
  const g = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const s = new THREE.Mesh(sphGeo, cloudMat);
    const r = rand(1.4, 2.6) * (k === 2 ? 1.3 : 1);
    s.scale.set(r * 1.5, r, r * 1.2); s.position.set((k - 2) * 2.2, rand(-0.3, 0.5) + (k === 2 ? 0.6 : 0), rand(-0.5, 0.5));
    g.add(s);
  }
  g.position.set((i % 2 ? 1 : -1) * rand(22, 60), rand(-12, 24), -rand(20, 220));
  scene.add(g);
  scenery.push({ mesh: g, par: 0.25, span: 230 });
}

// montgolfières au loin
function stripeTex(css) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 8;
  const g = c.getContext('2d');
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : css; g.fillRect(k * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const balloonMats = ['#ff5fa2', '#19c3d6', '#7f8cf5'].map((c) => new THREE.MeshStandardMaterial({ map: stripeTex(c), roughness: 0.7 }));
for (let i = 0; i < 6; i++) {
  const g = new THREE.Group();
  g.add(part(new THREE.SphereGeometry(1, 24, 16), balloonMats[i % 3], 0, 0, 0, 3.2, 3.8, 3.2));
  g.add(part(new THREE.CylinderGeometry(1.7, 0.7, 2.2, 16), balloonMats[i % 3], 0, -3.6, 0));
  g.add(part(boxGeo, M.navy, 0, -5.6, 0, 1.1, 0.9, 1.1));
  g.position.set((i % 2 ? 1 : -1) * rand(20, 46), rand(7, 26), -30 - i * 36);
  scene.add(g);
  scenery.push({ mesh: g, par: 0.35, span: 230 });
}

// portiques au-dessus de la voie
for (let i = 0; i < 3; i++) {
  const arch = new THREE.Mesh(new THREE.TorusGeometry(TRACK_W / 2 + 0.9, 0.22, 10, 40, Math.PI), i % 2 ? M.pink : M.cyan);
  arch.position.set(0, 0, -40 - i * 70);
  scene.add(arch);
  scenery.push({ mesh: arch, par: 1, span: 210 });
}

/* ---------------- Le robot ---------------- */
function heartGeometry(size, depth) {
  const s = size, sh = new THREE.Shape();
  sh.moveTo(0, -0.5 * s);
  sh.bezierCurveTo(-1.0 * s, 0.1 * s, -0.5 * s, 0.8 * s, 0, 0.3 * s);
  sh.bezierCurveTo(0.5 * s, 0.8 * s, 1.0 * s, 0.1 * s, 0, -0.5 * s);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 2, curveSegments: 10 });
  g.center();
  return g;
}
function part(geo, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  return m;
}
function buildRobot() {
  const root = new THREE.Group();   // origine aux pieds, regarde vers -z
  const body = new THREE.Group();
  root.add(body);
  const sph = new THREE.SphereGeometry(1, 24, 18);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);

  // torse
  body.add(part(sph, M.white, 0, 0.9, 0, 0.36, 0.38, 0.32));
  body.add(part(sph, M.cyan, 0, 0.7, 0, 0.35, 0.22, 0.31));
  const chest = part(heartGeometry(0.13, 0.03), M.pink, 0, 0.95, -0.31); chest.rotation.y = Math.PI;
  body.add(chest);
  // sac à dos (visible depuis la caméra)
  body.add(part(new THREE.BoxGeometry(0.4, 0.42, 0.2), M.cyan, 0, 0.95, 0.3));
  body.add(part(heartGeometry(0.11, 0.03), M.pink, 0, 0.96, 0.41));
  for (const s of [-1, 1]) body.add(part(new THREE.BoxGeometry(0.08, 0.3, 0.5), M.pink, s * 0.2, 1.12, 0.02));

  // tête
  const head = new THREE.Group(); head.position.y = 1.62;
  head.add(part(sph, M.white, 0, 0, 0, 0.56, 0.47, 0.5));
  head.add(part(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, 0.72), M.cyan, 0, 0.012, 0, 0.565, 0.475, 0.505));
  head.add(part(sph, M.navy, 0, -0.03, -0.2, 0.44, 0.34, 0.34));
  for (const s of [-1, 1]) {
    head.add(part(sph, M.white, s * 0.17, -0.04, -0.49, 0.1, 0.1, 0.05));
    head.add(part(sph, M.blue, s * 0.17, -0.045, -0.52, 0.07, 0.07, 0.04));
    head.add(part(sph, M.cyan, s * 0.56, -0.02, 0, 0.1, 0.17, 0.17));
    head.add(part(sph, M.pink, s * 0.62, -0.02, 0, 0.07, 0.12, 0.12));
  }
  head.add(part(sph, M.mouth, 0, -0.2, -0.47, 0.08, 0.05, 0.04));
  head.add(part(cyl, M.cyan, 0, 0.56, 0, 0.025, 0.22, 0.025));
  const bulb = part(sph, M.pink, 0, 0.74, 0, 0.1, 0.1, 0.1);
  head.add(bulb);
  body.add(head);

  // bras
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.4, 1.08, 0);
    arm.add(part(cyl, M.white, 0, -0.08, 0, 0.09, 0.14, 0.09));
    arm.add(part(cyl, M.cyan, 0, -0.21, 0, 0.092, 0.12, 0.092));
    arm.add(part(cyl, M.white, 0, -0.33, 0, 0.09, 0.12, 0.09));
    arm.add(part(sph, M.cyan, 0, -0.46, 0, 0.14, 0.14, 0.14));
    arm.rotation.z = s * 0.25;
    body.add(arm); arms.push(arm);
  }
  // jambes
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.19, 0.6, 0);
    leg.add(part(cyl, M.white, 0, -0.16, 0, 0.11, 0.3, 0.11));
    leg.add(part(sph, M.pink, 0, -0.3, -0.02, 0.12, 0.12, 0.12));
    leg.add(part(sph, M.cyan, 0, -0.48, -0.07, 0.15, 0.12, 0.24));
    leg.add(part(new THREE.BoxGeometry(0.26, 0.05, 0.44), M.white, 0, -0.575, -0.07));
    root.add(leg); legs.push(leg);
  }
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16),
    new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.25, depthWrite: false }));
  shield.position.y = 1.05; shield.visible = false;
  root.add(shield);
  return { root, body, head, arms, legs, shield, bulb };
}
const robot = buildRobot();
scene.add(robot.root);
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x0b2f8a, transparent: true, opacity: 0.22, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
scene.add(blob);

/* ---------------- Objets de la piste ---------------- */
const G = {
  heart: heartGeometry(0.34, 0.1),
  barrier: new THREE.BoxGeometry(1.9, 0.5, 0.35),
  barrierFoot: new THREE.BoxGeometry(0.18, 0.75, 0.5),
  stripe: new THREE.BoxGeometry(1.92, 0.14, 0.37),
  post: new THREE.CylinderGeometry(0.11, 0.11, 2.6, 12),
  gateBar: new THREE.BoxGeometry(2.1, 0.7, 0.4),
};

// Train à grande vitesse : caisse extrudée + nez profilé (le nez pointe vers +z, vers le joueur)
const TRAIN = { body: 5.6, nose: 3.4, y0: 0.35, y1: 2.5, hw: 0.95 };
TRAIN.len = TRAIN.body + TRAIN.nose;
TRAIN.sy = (t) => 1 - 0.72 * Math.pow(t, 1.2);          // hauteur relative du nez
TRAIN.top = (t) => TRAIN.y0 + (TRAIN.y1 - TRAIN.y0) * TRAIN.sy(t);
(function buildTrainGeo() {
  const { hw, y0, y1 } = TRAIN, rt = 0.7, rb = 0.2, P = Math.PI;
  const sh = new THREE.Shape();
  sh.moveTo(-hw + rb, y0); sh.lineTo(hw - rb, y0); sh.absarc(hw - rb, y0 + rb, rb, -P / 2, 0);
  sh.lineTo(hw, y1 - rt); sh.absarc(hw - rt, y1 - rt, rt, 0, P / 2);
  sh.lineTo(-hw + rt, y1); sh.absarc(-hw + rt, y1 - rt, rt, P / 2, P);
  sh.lineTo(-hw, y0 + rb); sh.absarc(-hw + rb, y0 + rb, rb, P, P * 1.5);
  const body = new THREE.ExtrudeGeometry(sh, { depth: TRAIN.body, bevelEnabled: false, curveSegments: 8 });
  body.translate(0, 0, -TRAIN.len / 2);
  G.trainBody = body;

  const pts = sh.getPoints(8);
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop();
  const n = pts.length, R = 12, pos = [], idx = [];
  for (let i = 0; i <= R; i++) {
    const t = i / R;
    const sx = 1 - 0.62 * Math.pow(t, 2.1), sy = TRAIN.sy(t);
    for (const p of pts) pos.push(p.x * sx, y0 + (p.y - y0) * sy, t * TRAIN.nose);
  }
  const low = [];                          // bas de caisse : couleur de la livrée
  for (let i = 0; i < R; i++) for (let j = 0; j < n; j++) {
    const j2 = (j + 1) % n, a = i * n + j, b = i * n + j2, c = a + n, d = b + n;
    (pts[j].y < 1.12 && pts[j2].y < 1.12 ? low : idx).push(a, b, d, a, d, c);
  }
  const tip = pos.length / 3;
  pos.push(0, y0 + (y1 - y0) * 0.14, TRAIN.nose + 0.22);
  for (let j = 0; j < n; j++) low.push(R * n + j, R * n + (j + 1) % n, tip);
  const nose = new THREE.BufferGeometry();
  nose.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  nose.setIndex(idx.concat(low)); nose.computeVertexNormals();
  nose.addGroup(0, idx.length, 0); nose.addGroup(idx.length, low.length, 1);
  nose.translate(0, 0, TRAIN.body - TRAIN.len / 2);
  G.trainNose = nose;
  G.trainBand = new THREE.BoxGeometry(1.94, 0.44, TRAIN.body - 0.5);
  G.trainStripe = new THREE.BoxGeometry(1.93, 0.16, TRAIN.body);
  G.trainLine = new THREE.BoxGeometry(1.93, 0.06, TRAIN.body);
  G.trainUnder = new THREE.BoxGeometry(1.5, 0.4, TRAIN.len - 1.4);
  G.trainBogie = new THREE.BoxGeometry(1.72, 0.34, 1.3);
})();
const TM = {
  shell: mat(0xe4ecf4, { roughness: 0.3, metalness: 0.2 }),
  glass: mat(0x0b2a6b, { roughness: 0.12, metalness: 0.3 }),
  under: mat(0x33415f, { roughness: 0.8 }),
  light: new THREE.MeshBasicMaterial({ color: 0xfff6c9 }),
  liveries: [[M.cyan, M.pink], [M.pink, M.cyan], [mat(0x3558c9), M.cyan]],
};
function iconTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
  g.lineWidth = 8; g.strokeStyle = kind === 'double' ? '#ff5fa2' : '#19c3d6'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
  if (kind === 'double') {
    g.fillStyle = '#e2428a'; g.font = '900 58px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('×2', 64, 68);
  } else if (kind === 'magnet') {
    g.lineWidth = 20; g.strokeStyle = '#e2428a'; g.beginPath(); g.moveTo(40, 34); g.lineTo(40, 64); g.arc(64, 64, 24, Math.PI, 0, true); g.lineTo(88, 34); g.stroke();
    g.strokeStyle = '#0b2f8a'; g.beginPath(); g.moveTo(40, 30); g.lineTo(40, 46); g.moveTo(88, 30); g.lineTo(88, 46); g.stroke();
  } else {
    g.fillStyle = '#19c3d6'; g.beginPath(); g.moveTo(64, 26); g.lineTo(96, 38); g.lineTo(96, 62);
    g.quadraticCurveTo(96, 92, 64, 106); g.quadraticCurveTo(32, 92, 32, 62); g.lineTo(32, 38); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(64, 38); g.lineTo(44, 46); g.lineTo(44, 62); g.quadraticCurveTo(44, 82, 64, 92); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const iconMats = {};
for (const k of Object.keys(UPGRADES)) iconMats[k] = new THREE.SpriteMaterial({ map: iconTexture(k), transparent: true });

let objs = [];
function addObj(o) { scene.add(o.mesh); objs.push(o); return o; }
function clearObjs() { for (const o of objs) scene.remove(o.mesh); objs = []; }

function addObstacle(type, lane, z) {
  const x = (lane - 1) * LANE;
  const g = new THREE.Group();
  let box;
  if (type === 'barrier') {
    g.add(part(G.barrier, M.pink, 0, 0.5, 0));
    g.add(part(G.stripe, M.white, 0, 0.5, 0));
    for (const s of [-1, 1]) g.add(part(G.barrierFoot, M.white, s * 0.8, 0.375, 0));
    box = { hw: 0.95, hz: 0.2, y0: 0, y1: 0.75 };
  } else if (type === 'gate') {
    for (const s of [-1, 1]) g.add(part(G.post, M.post, s * 1.0, 1.3, 0));
    g.add(part(G.gateBar, M.pink, 0, 1.6, 0));
    g.add(part(G.stripe, M.white, 0, 1.6, 0, 1.08, 1, 1.12));
    box = { hw: 1.0, hz: 0.22, y0: 1.25, y1: 2.6 };
  } else {
    const [c1, c2] = pick(TM.liveries);
    const zc = -TRAIN.nose / 2, zn = TRAIN.body - TRAIN.len / 2; // centre de la caisse, début du nez
    g.add(part(G.trainBody, TM.shell, 0, 0, 0));
    g.add(part(G.trainNose, [TM.shell, c1], 0, 0, 0));
    g.add(part(G.trainBand, TM.glass, 0, 1.52, zc));
    g.add(part(G.trainStripe, c1, 0, 0.98, zc));
    g.add(part(G.trainLine, c2, 0, 0.8, zc));
    const glass = part(sphGeo, TM.glass, 0, TRAIN.top(0.42) - 0.07, zn + 0.42 * TRAIN.nose, 0.5, 0.16, 0.8); // pare-brise
    glass.rotation.x = 0.4;
    g.add(glass);
    for (const s of [-1, 1]) g.add(part(sphGeo, TM.light, s * 0.2, 0.72, TRAIN.len / 2 + 0.03, 0.09, 0.07, 0.09));
    g.add(part(G.trainUnder, TM.under, 0, 0.2, -0.5));
    for (const zb of [-TRAIN.len / 2 + 1.2, zn - 0.8]) g.add(part(G.trainBogie, TM.under, 0, 0.19, zb));
    g.add(part(boxGeo, TM.under, 0, 2.56, zc - 1, 0.7, 0.12, 1.4));    // pantographe replié
    z -= TRAIN.len / 2;
    box = { hw: 0.97, hz: TRAIN.len / 2, y0: 0, y1: 2.6 };
  }
  g.position.set(x, 0, z);
  return addObj({ kind: 'obst', type, mesh: g, ...box });
}
function addHeart(lane, z, y) {
  const m = new THREE.Mesh(G.heart, M.heart);
  m.position.set((lane - 1) * LANE, y, z); m.rotation.y = z;
  return addObj({ kind: 'heart', mesh: m });
}
function addPower(lane, z) {
  const type = pick(Object.keys(UPGRADES));
  const m = new THREE.Sprite(iconMats[type]);
  m.scale.set(1.25, 1.25, 1); m.position.set((lane - 1) * LANE, 1.15, z);
  return addObj({ kind: 'power', type, mesh: m });
}

function spawnRow(z) {
  const d = run.dist;
  const easy = d < 220;
  const pNone = easy ? 0.62 : Math.max(0.26, 0.46 - d / 9000);
  const types = [0, 1, 2].map(() => {
    if (Math.random() < pNone) return 'none';
    const r = Math.random();
    return r < 0.38 ? 'barrier' : r < 0.68 ? 'gate' : 'block';
  });
  if (types.every((t) => t === 'block')) types[Math.floor(rand(0, 3))] = Math.random() < 0.5 ? 'barrier' : 'none';
  if (types.every((t) => t === 'none') && !easy) types[Math.floor(rand(0, 3))] = pick(['barrier', 'gate']);
  types.forEach((t, i) => { if (t !== 'none') addObstacle(t, i, z); });

  if (Math.random() < 0.78) {
    const lane = pick([0, 1, 2].filter((i) => types[i] !== 'block'));
    const t = types[lane];
    for (let k = -2; k <= 2; k++) {
      const y = t === 'barrier' ? 0.95 + 1.15 * (1 - (k / 2.4) ** 2) : t === 'gate' ? 0.5 : 0.95;
      addHeart(lane, z + k * 1.7, y);
    }
  }
  if (d >= run.nextPower) {
    const free = [0, 1, 2].filter((i) => types[i] === 'none');
    if (free.length) { addPower(pick(free), z + 7); run.nextPower = d + rand(260, 460); }
  }
}

/* ---------------- État de la partie ---------------- */
let state = 'menu'; // menu | play | pause | dying | over
let run = null;
const player = { lane: 1, x: 0, y: 0, vy: 0, slide: 0, phase: 0, tilt: 0, lean: 0, dive: false };

function newRun() { ads.maybeInterstitial().then(newRunNow); }
function newRunNow() {
  clearObjs();
  run = { dist: 0, score: 0, hearts: 0, speed: 13, nextRow: 30, nextPower: rand(120, 200),
    powers: { magnet: 0, shield: 0, double: 0 }, invuln: 0, revived: false, shake: 0, dieT: 0, newBest: false };
  Object.assign(player, { lane: 1, x: 0, y: 0, vy: 0, slide: 0, tilt: 0, lean: 0, dive: false });
  robot.root.rotation.set(0, 0, 0);
  lastHud = {};
  for (let z = -42; z > SPAWN_Z; z -= rand(17, 22)) spawnRow(z);
  run.nextRow = rand(14, 20);
  setState('play');
}
function setState(s) {
  state = s;
  $('menu').hidden = s !== 'menu';
  $('pause').hidden = s !== 'pause';
  $('over').hidden = s !== 'over';
  $('hud').hidden = !(s === 'play' || s === 'pause' || s === 'dying');
  if (s !== 'menu') $('shop').hidden = true;
  if (s === 'menu') { robot.root.visible = true; robot.shield.visible = false; renderMenu(); }
}

/* ---------------- Commandes ---------------- */
function move(dir) {
  if (state !== 'play') return;
  const n = clamp(player.lane + dir, 0, 2);
  if (n !== player.lane) { player.lane = n; tone(500, 560, 0.05, 'sine', 0.04); HX.select(); }
}
function jump() {
  if (state !== 'play') return;
  if (player.y <= 0.001) {
    player.vy = JUMP_V; player.slide = 0; player.y = 0.002;
    sfx.jump(); HX.light(); missionEvent('jumps', 1);
  }
}
function slide() {
  if (state !== 'play') return;
  if (player.y > 0.001) { player.vy = -18; player.dive = true; HX.medium(); return; }
  if (player.slide <= 0) { player.slide = SLIDE_TIME; sfx.slide(); HX.light(); }
}
window.addEventListener('keydown', (e) => {
  const k = e.key;
  if (['ArrowLeft', 'a', 'q'].includes(k)) move(-1);
  else if (['ArrowRight', 'd'].includes(k)) move(1);
  else if (['ArrowUp', 'w', 'z', ' '].includes(k)) { jump(); if (state === 'play') e.preventDefault(); }
  else if (['ArrowDown', 's'].includes(k)) { slide(); if (state === 'play') e.preventDefault(); }
  else if (k === 'Escape' || k === 'p') { if (state === 'play') pause(); else if (state === 'pause') resume(); }
});
let touch = null;
canvas.addEventListener('pointerdown', (e) => { sfx.unlock(); touch = { x: e.clientX, y: e.clientY, used: false }; });
canvas.addEventListener('pointermove', (e) => {
  if (!touch || touch.used) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
  touch.used = true;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (dy < 0) jump(); else slide();
});
const endTouch = () => { touch = null; };
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function pause() { if (state === 'play') { setState('pause'); HX.stopAll(); } }
function resume() { if (state === 'pause') { setState('play'); lastT = performance.now(); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

/* ---------------- Interface ---------------- */
let toastTimer = 0;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
const fmt = (n) => Math.floor(n).toLocaleString('fr-FR');
function renderMenu() {
  refreshMissions();
  $('mBest').textContent = fmt(save.best);
  $('mHearts').textContent = fmt(save.hearts);
  $('mStreak').textContent = save.streak || 1;
  $('daily').hidden = !dailyMessage; $('daily').textContent = dailyMessage;
  $('muteBtn').textContent = save.mute ? 'Son : non' : 'Son : oui';
  $('vibeBtn').textContent = save.vibe === false ? 'Vibrations : non' : 'Vibrations : oui';
  $('missions').innerHTML = save.missions.map((m) => `
    <div class="item">
      <div class="item-top"><span>${MISSIONS[m.type].txt(fmt(m.goal))}</span><span class="reward">+${m.reward}</span></div>
      <div class="bar"><i style="transform:scaleX(${clamp(m.prog / m.goal, 0, 1)})"></i></div>
    </div>`).join('');
}
function renderShop() {
  $('sHearts').textContent = fmt(save.hearts);
  $('shopList').innerHTML = Object.entries(UPGRADES).map(([k, u]) => {
    const l = save.up[k], max = l >= MAX_LVL;
    return `<div class="item shop-item">
      <svg><use href="#${u.icon}"/></svg>
      <div class="info"><b>${u.name}</b><small>Niveau ${l}/${MAX_LVL} · dure ${u.dur(l)} s${max ? '' : ` → ${u.dur(l + 1)} s`}</small></div>
      <button class="btn cyan" data-up="${k}" ${max || save.hearts < upCost(l) ? 'disabled' : ''}>${max ? 'Max' : upCost(l)}</button>
    </div>`;
  }).join('');
}
$('shopList').addEventListener('click', (e) => {
  const k = e.target.closest('[data-up]')?.dataset.up;
  if (!k) return;
  const l = save.up[k];
  if (l >= MAX_LVL || save.hearts < upCost(l)) return;
  save.hearts -= upCost(l); save.up[k]++; persist(); sfx.power(); HX.celebrate(); renderShop();
});
$('playBtn').onclick = () => { sfx.unlock(); dailyMessage = ''; newRun(); };
$('shopBtn').onclick = () => { renderShop(); $('menu').hidden = true; $('shop').hidden = false; };
$('shopBack').onclick = () => { $('shop').hidden = true; setState('menu'); };
$('muteBtn').onclick = () => { save.mute = !save.mute; persist(); sfx.unlock(); renderMenu(); };
$('vibeBtn').onclick = () => { save.vibe = save.vibe === false; persist(); if (save.vibe) HX.medium(); renderMenu(); };
$('pauseBtn').onclick = pause;
$('resumeBtn').onclick = resume;
$('quitBtn').onclick = () => { endRun(); clearObjs(); setState('menu'); };
$('againBtn').onclick = () => { sfx.unlock(); refreshMissions(); newRun(); };
$('menuBtn').onclick = () => { clearObjs(); robot.root.rotation.set(0, 0, 0); player.y = 0; setState('menu'); };
function revive() {
  run.invuln = 2.5; run.speed = Math.max(13, run.speed * 0.8);
  objs = objs.filter((o) => { if (o.kind === 'obst' && o.mesh.position.z > -45) { scene.remove(o.mesh); return false; } return true; });
  Object.assign(player, { y: 0, vy: 0, slide: 0, dive: false });
  robot.root.rotation.set(0, 0, 0);
  setState('play'); lastT = performance.now();
  HX.surge();
}
$('reviveBtn').onclick = () => {
  if (run.revived || save.hearts < REVIVE_COST) return;
  save.hearts -= REVIVE_COST; persist();
  run.revived = true;
  revive();
};

// Reprise gratuite contre une vidéo récompensée (une fois par partie, applications mobiles)
let adBusy = false;
function refreshAdBtn() {
  const b = $('adBtn');
  b.hidden = !ads.available || !run || run.adRevived;
  b.disabled = !ads.ready || adBusy;
  b.textContent = ads.ready || adBusy ? 'Continuer avec une vidéo' : 'Vidéo en chargement…';
}
ads.onChange = refreshAdBtn;
$('adBtn').onclick = async () => {
  if (adBusy || state !== 'over' || run.adRevived) return;
  adBusy = true; refreshAdBtn();
  const ok = await ads.show();
  adBusy = false;
  if (ok && state === 'over') { run.adRevived = true; revive(); }
  else { refreshAdBtn(); if (!ok) toast('Vidéo interrompue : pas de reprise'); }
};
$('policyLnk').onclick = (e) => { e.preventDefault(); window.open(PRIVACY_URL, '_blank'); };
$('adPrivacyBtn').onclick = () => ads.showPrivacyOptions();
ads.init().then(() => { $('adPrivacyBtn').hidden = !ads.hasPrivacyOptions(); });

let lastHud = {};
function hud() {
  const s = Math.floor(run.score);
  if (s !== lastHud.s) { $('scoreChip').textContent = fmt(s); lastHud.s = s; }
  if (run.hearts !== lastHud.h) { $('heartChip').textContent = run.hearts; lastHud.h = run.hearts; }
  const key = Object.keys(run.powers).filter((k) => run.powers[k] > 0).join();
  if (key !== lastHud.p) {
    lastHud.p = key;
    $('powers').innerHTML = key ? key.split(',').map((k) =>
      `<div class="power ${k}"><svg><use href="#${UPGRADES[k].icon}"/></svg><div class="bar"><i id="pb-${k}"></i></div></div>`).join('') : '';
  }
  for (const k of Object.keys(run.powers)) {
    if (run.powers[k] > 0) { const el = $('pb-' + k); if (el) el.style.transform = `scaleX(${run.powers[k] / UPGRADES[k].dur(save.up[k])})`; }
  }
}
function endRun() {
  if (!run || run.ended) return;
  run.ended = true;
  const s = Math.floor(run.score);
  if (s > save.best) { save.best = s; run.newBest = true; setTimeout(() => HX.celebrate(), 450); }
  persist();
}
function showOver() {
  const prevBest = save.best;
  endRun();
  const s = Math.floor(run.score);
  $('oScore').textContent = fmt(s);
  $('oHearts').textContent = run.hearts;
  $('oBest').textContent = fmt(save.best);
  $('oRecord').textContent = run.newBest ? 'Nouveau record !' : `Encore ${fmt(prevBest - s + 1)} points pour battre ton record.`;
  const can = !run.revived && save.hearts >= REVIVE_COST;
  $('reviveBtn').hidden = run.revived;
  $('reviveBtn').disabled = !can;
  $('reviveBtn').textContent = can ? `Continuer (${REVIVE_COST} cœurs)` : `Continuer : il faut ${REVIVE_COST} cœurs`;
  run.ended = false; // une reprise peut encore améliorer le score
  refreshAdBtn();
  setState('over');
}

/* ---------------- Boucle ---------------- */
function scroll(dz) {
  trackTex.offset.y += dz / TILE;
  for (const s of scenery) {
    s.mesh.position.z += dz * s.par;
    if (s.mesh.position.z > 14) s.mesh.position.z -= s.span;
  }
}
function hit(o) {
  if (run.invuln > 0) return;
  if (run.powers.shield > 0) {
    run.powers.shield = 0; run.invuln = 1; run.shake = 0.25;
    scene.remove(o.mesh); o.dead = true; sfx.shield(); HX.pattern([['heavy', 0], ['select', 100], ['light', 180]]); toast('Bouclier utilisé');
    return;
  }
  sfx.crash(); HX.stopAll(); HX.pattern([['heavy', 0], ['heavy', 80], ['error', 200], ['heavy', 420]]); run.shake = 0.5; run.dieT = 0; player.vy = 7; player.slide = 0;
  state = 'dying';
}
function update(dt) {
  const playing = state === 'play';
  const dying = state === 'dying';
  let speed = 6;
  if (playing) {
    run.speed = 13 + 20 * (1 - Math.exp(-run.dist / 2400));
    speed = run.speed;
  } else if (dying) {
    run.dieT += dt; speed = run.speed * Math.max(0, 1 - run.dieT * 2.5) * -0.3;
    if (run.dieT > 1.0) { showOver(); return; }
  } else if (state === 'pause' || state === 'over') return;

  const dz = speed * dt;
  scroll(dz);

  // --- joueur ---
  const tx = (player.lane - 1) * LANE;
  const px0 = player.x;
  player.x += (tx - player.x) * Math.min(1, dt * 15);
  player.tilt += ((player.x - px0) / Math.max(dt, 0.001) * -0.035 - player.tilt) * Math.min(1, dt * 12);
  if (player.y > 0 || player.vy > 0) {
    player.vy -= GRAVITY * dt; player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0; player.vy = 0;
      if (playing) HX.force(player.dive ? 1 : 0.6);
      if (player.dive && playing) { player.slide = SLIDE_TIME; sfx.slide(); }
      player.dive = false;
    }
  }
  if (player.slide > 0) player.slide -= dt;
  const sliding = player.slide > 0;
  player.phase += dt * (playing ? 6 + speed * 0.42 : 7);
  const inAir = player.y > 0.05;
  const sw = Math.sin(player.phase);
  const [aL, aR] = robot.arms, [lL, lR] = robot.legs;
  if (dying) {
    robot.root.rotation.x += (1.45 - robot.root.rotation.x) * Math.min(1, dt * 6);
    aL.rotation.x = aR.rotation.x = -2.6;
  } else if (sliding) {
    player.lean += (1.25 - player.lean) * Math.min(1, dt * 18);
    lL.rotation.x = 0.2; lR.rotation.x = -0.15; aL.rotation.x = aR.rotation.x = 0.6;
  } else {
    player.lean += (0 - player.lean) * Math.min(1, dt * 14);
    if (inAir) { lL.rotation.x = 0.9; lR.rotation.x = -0.5; aL.rotation.x = aR.rotation.x = -2.4; }
    else { lL.rotation.x = sw * 0.95; lR.rotation.x = -sw * 0.95; aL.rotation.x = -sw * 0.9; aR.rotation.x = sw * 0.9; }
  }
  if (!dying) robot.root.rotation.x = player.lean;
  robot.root.rotation.z = player.tilt;
  robot.root.position.set(player.x, player.y + (sliding ? 0.22 : 0), 0);
  robot.body.position.y = inAir || sliding ? 0 : Math.abs(Math.cos(player.phase)) * 0.07;
  robot.bulb.scale.setScalar(0.1 + Math.sin(player.phase * 0.5) * 0.008);
  blob.position.x = player.x; blob.scale.setScalar(clamp(1 - player.y * 0.25, 0.4, 1));

  // --- caméra ---
  let shx = 0, shy = 0;
  if (run && run.shake > 0) { run.shake -= dt; shx = rand(-1, 1) * run.shake * 0.5; shy = rand(-1, 1) * run.shake * 0.5; }
  camera.position.set(camBase.x + player.x * 0.55 + shx, camBase.y + player.y * 0.25 + shy, camBase.z);
  camera.lookAt(player.x * 0.75, 1.5 + player.y * 0.3, -7);

  if (!run || state === 'menu') return;

  // --- monde ---
  if (playing) {
    run.dist += dz;
    const mult = run.powers.double > 0 ? 2 : 1;
    const palier = Math.floor(run.score / 1000);
    run.score += dz * mult;
    if (playing && Math.floor(run.score / 1000) > palier) HX.pattern([['medium', 0], ['medium', 110]]); // palier de 1 000 points
    missionEvent('scoreRun', Math.floor(run.score));
    if (run.invuln > 0) run.invuln -= dt;
    for (const k of Object.keys(run.powers)) if (run.powers[k] > 0) run.powers[k] = Math.max(0, run.powers[k] - dt);
    if (run.dist >= run.nextRow) {
      spawnRow(SPAWN_Z);
      run.nextRow = run.dist + clamp(run.speed * 0.95, 14, 30) + rand(0, 7);
    }
  }
  robot.shield.visible = run.powers.shield > 0;
  robot.root.visible = !(run.invuln > 0 && Math.floor(run.invuln * 12) % 2 === 0);

  const ph = sliding ? 0.75 : 1.65;
  const magnet = run.powers.magnet > 0;
  const py = player.y + 0.9;
  for (const o of objs) {
    const p = o.mesh.position;
    p.z += dz;
    if (p.z > 12) { o.dead = true; scene.remove(o.mesh); continue; }
    if (o.kind === 'heart') {
      o.mesh.rotation.y += dt * 3;
      if (magnet && p.z > -16 && p.z < 4) {
        const f = Math.min(1, dt * 9);
        p.x += (player.x - p.x) * f; p.y += (py - p.y) * f; p.z += (0 - p.z) * f * 0.6;
      }
      if (playing && Math.abs(p.z) < 0.9 && Math.abs(p.x - player.x) < 0.95 && Math.abs(p.y - py) < 1.25) {
        o.dead = true; scene.remove(o.mesh);
        const n = run.powers.double > 0 ? 2 : 1;
        run.hearts += n; save.hearts += n; run.score += 5 * n;
        sfx.heart(); HX.select();
        missionEvent('heartsRun', run.hearts); missionEvent('heartsTotal', n);
      }
    } else if (o.kind === 'power') {
      p.y = 1.15 + Math.sin(player.phase * 0.4) * 0.12;
      if (playing && Math.abs(p.z) < 0.9 && Math.abs(p.x - player.x) < 1.0 && player.y < 1.6) {
        o.dead = true; scene.remove(o.mesh);
        run.powers[o.type] = UPGRADES[o.type].dur(save.up[o.type]);
        sfx.power(); HX.surge(); toast(UPGRADES[o.type].name); missionEvent('powerups', 1);
      }
    } else if (playing) {
      if (Math.abs(p.z) < o.hz + 0.3 && Math.abs(p.x - player.x) < o.hw + 0.22 && player.y < o.y1 && player.y + ph > o.y0) {
        hit(o);
      } else if (o.type === 'gate' && !o.passed && p.z > 0.6) {
        o.passed = true;
        if (Math.abs(p.x - player.x) < 1 && sliding) missionEvent('slides', 1);
      }
    }
  }
  objs = objs.filter((o) => !o.dead);
  hud();
}

let lastT = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
setState('menu');
requestAnimationFrame(frame);

// Accès pour les tests automatisés
window.__game = { get state() { return state; }, get run() { return run; }, get objs() { return objs; }, player, save, move, jump, slide };
