/**
 * Consignes parlées (synthèse vocale du système, en français), petits sons de retour (Web Audio) et
 * enregistrements courts déclarés dans content/audio.json (cris d'animaux, sons des lettres). Tout se coupe depuis l'espace parent, et se met en pause quand
 * l'application passe en arrière-plan. Une activité ne dépend jamais du son pour être réussie.
 */
import { haptic, nativeApp, nativeCall } from './native.js';

let settings = { sound: true, speech: true, volume: 0.8, voice: null };
// Application iOS : la voix passe par la synthèse native (meilleure voix de l'appareil) ; la fin de chaque phrase
// revient par window.__layjouSpeechEnd(id).
const IOS = nativeApp() === 'ios';
const nativeEnds = new Map(); // id → suite à appeler quand la phrase est finie ou coupée
let nativeId = 0;
if (IOS) {
  window.__layjouSpeechEnd = (id) => {
    const done = nativeEnds.get(id);
    nativeEnds.delete(id);
    done?.();
  };
}
const cancelSynth = () => (IOS ? nativeCall('stop') : globalThis.speechSynthesis?.cancel());
let context = null;
let frenchVoice = null;

export function configureAudio(next) {
  settings = { ...settings, ...next };
  if (!settings.speech) stopSpeaking();
  frenchVoice = pickVoice();
}

// Voix françaises connues (Windows, Chrome, Apple, Edge, Linux). Ordre de préférence :
// 1. les voix modernes, « naturelles » (Google dans Chrome, « Online (Natural) » dans Edge, voix Apple améliorées) ;
// 2. les voix féminines avant les voix masculines ;
// 3. les anciennes voix de Windows (Hortense, Julie, Paul) ;
// 4. en dernier, eSpeak (Linux, Firefox) : très robotique, gardée seulement s'il n'y a rien d'autre.
// Une voix en ligne qui échoue (pas de connexion) est écartée pour la suite : on revient à une voix de l'appareil.
const FEMALE = /(hortense|julie|denise|eloise|éloïse|vivienne|ariane|sylvie|caroline|josephine|joséphine|coralie|brigitte|yvette|celeste|céleste|charline|audrey|aur[ée]lie|am[ée]lie|marie|virginie|c[ée]line|l[ée]a|louise|chantal|google fran[cç]ais|female|femme)/i;
const MALE = /(paul|thomas|henri|claude|nicolas|r[ée]my|jacques|daniel|antoine|jean|mathieu|guillaume|alain|fabrice|j[ée]r[ôo]me|yves|g[ée]rard|louis|maxime|fabien|\bmale\b)/i;
const MODERN = /(google|online|natural|neural|premium|enhanced|am[ée]lior|siri)/i;
const BASIC = /(espeak|speech-?dispatcher|speechd|mbrola|pico)/i;
const failedVoices = new Set(); // voix en ligne qui n'ont pas pu parler (hors connexion)

export function isFemaleVoice(voice) {
  return FEMALE.test(voice.name) && !MALE.test(voice.name.replace(FEMALE, ''));
}

/** Qualité d'une voix : « natural » (moderne), « standard » (ancienne voix de l'appareil) ou « basic » (eSpeak, robotique). */
export function voiceQuality(voice) {
  const id = `${voice.name} ${voice.voiceURI ?? ''}`;
  if (BASIC.test(id)) return 'basic';
  if (MODERN.test(id)) return 'natural';
  // Linux : les voix du système passent par speech-dispatcher et portent souvent un simple nom de langue.
  if (/^(french|fran[cç]ais)\b/i.test(voice.name) || /^fr([-_][a-z]{2})?$/i.test(voice.name)) return 'basic';
  return 'standard';
}

function score(voice) {
  let s = 0;
  const quality = voiceQuality(voice);
  if (quality === 'natural') s += 30;
  else if (quality === 'basic') s -= 30;
  if (isFemaleVoice(voice)) s += 10;
  else if (MALE.test(voice.name)) s -= 20;
  // Voix d'enfant d'Edge (« Eloise ») : la plus proche de la voix claire et jeune de Chrome, préférée des enfants.
  if (/[ée]lo[iï]se/i.test(voice.name) && quality === 'natural') s += 5;
  if (voice.lang?.replace('_', '-') === 'fr-FR') s += 2;
  if (failedVoices.has(voice.name)) s -= 100;
  return s;
}

/** Voix françaises disponibles sur l'appareil, la plus douce (naturelle, féminine) en premier. */
export function frenchVoices() {
  return globalThis.speechSynthesis ? rankVoices(speechSynthesis.getVoices()) : [];
}

export function rankVoices(voices) {
  return voices.filter((v) => v.lang?.toLowerCase().startsWith('fr')).sort((a, b) => score(b) - score(a));
}

function pickVoice() {
  const voices = frenchVoices();
  const chosen = voices.find((v) => v.name === settings.voice && !failedVoices.has(v.name));
  return chosen ?? voices[0] ?? null;
}

/** Qualité de la voix utilisée en ce moment (espace parent : conseil pour obtenir une voix plus naturelle). */
export function currentVoiceQuality() {
  if (IOS) return 'natural'; // iOS : l'appareil choisit sa meilleure voix
  const v = frenchVoice ?? pickVoice();
  return v ? voiceQuality(v) : 'none';
}

if (globalThis.speechSynthesis) {
  frenchVoice = pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => { frenchVoice = pickVoice(); });
}

/**
 * Hauteur de voix : une voix masculine moderne est légèrement adoucie ; une voix basique (eSpeak) garde sa hauteur
 * normale, car la monter la rend encore plus robotique.
 */
function tone(voice) {
  if (!voice) return 1;
  if (voiceQuality(voice) === 'basic') return 1;
  return isFemaleVoice(voice) ? 1.05 : 1.12;
}

export function speechAvailable() {
  if (IOS) return true;
  return !!globalThis.speechSynthesis && !!(frenchVoice ?? pickVoice());
}

/*
 * File d'attente de la voix : une phrase n'en coupe jamais une autre. Le « Oui : chat ! » d'une bonne réponse se
 * termine avant que la question suivante soit lue. Seul stopSpeaking() (Répéter, changement de niveau, sortie du jeu,
 * célébration) interrompt et vide la file.
 *
 * Chaque consigne est découpée en phrases courtes (CHUNK caractères au plus) : les voix en ligne de Chrome
 * (« Google français ») se bloquent sur un texte long, sans jamais finir ni signaler d'erreur. Découpée, la consigne
 * garde la même voix d'un bout à l'autre, dans tous les jeux. Filet de sécurité : une phrase qui ne finit pas dans le
 * temps prévu est arrêtée, et la suite continue.
 */
const MAX_QUEUE = 3;
export const CHUNK = 140;
let current = null;   // { parts, index, timer }
const queue = [];     // [{ parts: [SpeechSynthesisUtterance], onStart }]
let waiters = [];
const failures = new Map(); // voix en ligne → échecs de suite (écartée pour la session au 3e)

/** Découpe un texte en morceaux courts, aux fins de phrase, puis aux virgules si une phrase est trop longue. */
export function chunkText(text, max = CHUNK) {
  const sentences = String(text).replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]*[»"”]?\s*/g) ?? [String(text)];
  const out = [];
  for (const raw of sentences) {
    let s = raw.trim();
    while (s.length > max) {
      const cut = Math.max(s.lastIndexOf(', ', max), s.lastIndexOf(' ; ', max), s.lastIndexOf(' : ', max));
      const at = cut > max / 3 ? cut + 1 : s.lastIndexOf(' ', max);
      if (at <= 0) break;
      out.push(s.slice(0, at).trim());
      s = s.slice(at).trim();
    }
    if (!s) continue;
    // Les tout petits morceaux (« Oui ! ») restent collés à la phrase précédente si la place le permet.
    if (out.length && out.at(-1).length + s.length + 1 <= max && s.length < 25) out[out.length - 1] += ` ${s}`;
    else out.push(s);
  }
  return out.length ? out : [String(text)];
}

function finished(entry) {
  if (current !== entry) return;
  clearTimeout(entry.timer);
  current = null;
  const next = queue.shift();
  if (next) start(next);
  else { const w = waiters; waiters = []; w.forEach((resolve) => resolve()); }
}

function playPart(entry) {
  const u = entry.parts[entry.index];
  let over = false; // « end », « error » et le filet de sécurité ne font avancer qu'une fois
  const nextPart = () => {
    if (over || current !== entry) return;
    over = true;
    clearTimeout(entry.timer);
    entry.index += 1;
    if (entry.index < entry.parts.length) playPart(entry);
    else finished(entry);
  };
  if (IOS) {
    // iOS : phrase dite par la synthèse native ; même filet de sécurité que sur le web.
    const id = `s${++nativeId}`;
    nativeEnds.set(id, nextPart);
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => { nativeEnds.delete(id); nativeCall('stop'); nextPart(); }, 2500 + (u.text.length * 90) / (u.rate || 1));
    if (!nativeCall('speak', { id, text: u.text, lang: u.lang, rate: u.rate, pitch: u.pitch })) { nativeEnds.delete(id); nextPart(); }
    return;
  }
  u.onend = () => {
    if (u.voice && !u.voice.localService) failures.delete(u.voice.name);
    nextPart();
  };
  u.onerror = (e) => {
    if (over || current !== entry) return;
    // Voix en ligne qui échoue (connexion coupée…) : la phrase est redite avec une voix de l'appareil. Après trois
    // échecs de suite, cette voix est écartée pour la session ; un seul échec ne suffit pas.
    if (u.voice && !u.voice.localService && !['interrupted', 'canceled'].includes(e?.error) && u.lang === 'fr-FR') {
      const count = (failures.get(u.voice.name) ?? 0) + 1;
      failures.set(u.voice.name, count);
      if (count >= 3) { failedVoices.add(u.voice.name); frenchVoice = pickVoice(); }
      const local = frenchVoices().find((v) => v.localService);
      if (local && !u.retried) {
        const again = new SpeechSynthesisUtterance(u.text);
        Object.assign(again, { lang: u.lang, voice: local, rate: u.rate, pitch: tone(local), volume: u.volume, retried: true });
        entry.parts[entry.index] = again;
        over = true;
        clearTimeout(entry.timer);
        playPart(entry);
        return;
      }
    }
    nextPart();
  };
  // Durée estimée (environ 14 caractères par seconde au débit 1), avec une marge ; au-delà, la phrase est arrêtée.
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => { speechSynthesis.cancel(); nextPart(); }, 2500 + (u.text.length * 90) / (u.rate || 1));
  speechSynthesis.speak(u);
}

function start(item) {
  const entry = { parts: item.parts, index: 0, timer: 0 };
  current = entry;
  item.onStart?.();
  playPart(entry);
}

function enqueue(parts, onStart) {
  const item = { parts, onStart };
  if (!current) {
    cancelSynth(); // reste éventuel d'une phrase dont « end » n'est pas arrivé
    start(item);
    return;
  }
  queue.push(item);
  while (queue.length > MAX_QUEUE) queue.shift();
}

/** Résout quand la voix a fini de parler (tout de suite si elle se tait). */
export function speechDone() {
  return current ? new Promise((resolve) => waiters.push(resolve)) : Promise.resolve();
}

/** true si une phrase est en cours ou en attente. */
export function speaking() {
  return !!current;
}

/**
 * Dit une consigne, après la phrase en cours s'il y en a une. onStart est appelé au moment où elle commence
 * (pour afficher le texte en même temps). Retourne false si la voix est coupée ou indisponible.
 */
export function speak(text, { onStart } = {}) {
  if (!settings.speech || !settings.sound || !text) return false;
  if (IOS) {
    enqueue(chunkText(text).map((piece) => ({ text: piece, lang: 'fr-FR', rate: 1, pitch: 1 })), onStart);
    return true;
  }
  if (!globalThis.speechSynthesis) return false;
  const voice = frenchVoice ?? pickVoice();
  const parts = chunkText(text).map((piece) => {
    const utterance = new SpeechSynthesisUtterance(piece);
    utterance.lang = 'fr-FR';
    utterance.voice = voice;
    utterance.rate = 0.9; // débit posé
    utterance.pitch = tone(voice);
    utterance.volume = settings.volume;
    return utterance;
  });
  enqueue(parts, onStart);
  return true;
}

/** Voix d'une autre langue (ex. « en ») : anglais britannique en premier, puis toute voix de cette langue. */
export function voiceFor(lang) {
  if (IOS) return { lang: lang === 'fr' ? 'fr-FR' : 'en-US', name: 'iOS' }; // l'appareil a toujours ces voix
  if (!globalThis.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(lang));
  return voices.find((v) => /en-gb/i.test(v.lang) && v.localService) ?? voices.find((v) => /en-gb/i.test(v.lang)) ?? voices[0] ?? null;
}

/** Dit un mot ou une phrase dans une autre langue (jeu 26), après la phrase en cours. Retourne false sans voix de cette langue. */
export function speakIn(text, lang = 'en', { slow = false } = {}) {
  if (!settings.sound || !text) return false;
  if (IOS) {
    enqueue([{ text, lang: lang === 'fr' ? 'fr-FR' : 'en-US', rate: slow ? 0.8 : 1, pitch: 1 }]);
    return true;
  }
  if (!globalThis.speechSynthesis) return false;
  const voice = voiceFor(lang);
  if (!voice) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = slow ? 0.7 : 0.9;
  utterance.volume = settings.volume;
  enqueue([utterance]);
  return true;
}

/** Coupe la voix tout de suite et vide la file d'attente. */
export function stopSpeaking() {
  queue.length = 0;
  if (current) clearTimeout(current.timer);
  current = null;
  nativeEnds.clear();
  cancelSynth();
  const w = waiters;
  waiters = [];
  w.forEach((resolve) => resolve());
}
const TONES = {
  tap: [[660, 0.06]],
  good: [[523, 0.09], [659, 0.09], [784, 0.14]],
  soft: [[330, 0.12]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.22]],
  // Nouveau badge : petite fanfare montante, puis note tenue.
  badge: [[659, 0.09], [784, 0.09], [988, 0.09], [1319, 0.12], [1047, 0.08], [1319, 0.34]],
};

/** Sons doux : aucun son « d'échec » agressif. */
export function sfx(name) {
  // Application iOS : petite vibration pour une réussite seulement (jamais pour une erreur).
  if (IOS && (name === 'good' || name === 'win' || name === 'badge')) haptic('success');
  if (!settings.sound || !TONES[name]) return;
  try {
    context ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    let at = context.currentTime;
    for (const [frequency, duration] of TONES[name]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18 * settings.volume, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      osc.connect(gain).connect(context.destination);
      osc.start(at);
      osc.stop(at + duration + 0.02);
      at += duration * 0.9;
    }
  } catch {
    // Pas d'audio disponible : le jeu continue sans son.
  }
}

/**
 * Une note d'instrument synthétisé (jeu 11). Ce sont des timbres approchés, pas des enregistrements :
 * piano (triangle amorti), trompette (dent de scie filtrée), cloche (deux sinus inharmoniques), tambour (bruit grave).
 * Retourne false si le son est coupé ou indisponible.
 */
export function playNote(instrument, frequency, durationMs = 450) {
  if (!soundOn()) return false;
  try {
    context ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    const at = context.currentTime;
    const end = at + durationMs / 1000;
    const out = context.createGain();
    out.connect(context.destination);
    const peak = 0.22 * settings.volume;
    if (instrument === 'tambour') {
      const length = Math.floor(context.sampleRate * 0.35);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      out.gain.setValueAtTime(peak * 2.2, at);
      noise.connect(filter).connect(out);
      noise.start(at);
      return true;
    }
    const voices = instrument === 'cloche' ? [[1, 'sine', 1], [2.76, 'sine', 0.35]] : instrument === 'trompette' ? [[1, 'sawtooth', 1]] : [[1, 'triangle', 1]];
    let target = out;
    if (instrument === 'trompette') {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 4;
      filter.connect(out);
      target = filter;
    }
    out.gain.setValueAtTime(0.0001, at);
    out.gain.exponentialRampToValueAtTime(peak, at + (instrument === 'trompette' ? 0.04 : 0.01));
    out.gain.exponentialRampToValueAtTime(0.0001, instrument === 'cloche' ? end + 0.6 : end);
    for (const [ratio, type, level] of voices) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequency * ratio;
      gain.gain.value = level;
      osc.connect(gain).connect(target);
      osc.start(at);
      osc.stop((instrument === 'cloche' ? end + 0.6 : end) + 0.05);
    }
    return true;
  } catch {
    return false;
  }
}

/** Le son est-il activé (réglage parent, volume non nul) ? */
export function soundOn() {
  return settings.sound && settings.volume > 0;
}

/** La voix lit-elle les consignes ? */
export function speechOn() {
  return settings.sound && settings.speech && speechAvailable();
}

let clip = null;
let pendingClip = null; // enregistrement qui attend la fin de la voix

/**
 * Joue un enregistrement. Résout true à la fin de la lecture, false si le son est coupé ou si le fichier
 * est absent ou illisible (le jeu bascule alors sur un autre mode, jamais sur un échec de l'enfant).
 */
export function playClip(url, { end = null } = {}) {
  if (!soundOn() || !url || typeof Audio === 'undefined') return Promise.resolve(false);
  stopClip();
  const token = {};
  pendingClip = token;
  // Annulé pendant l'attente (stopClip) : la promesse ne se résout pas, comme un enregistrement interrompu.
  return speechDone().then(() => (pendingClip !== token ? new Promise(() => {}) : !soundOn() ? false : new Promise((resolve) => {
    const audio = new Audio(url);
    clip = audio;
    audio.volume = settings.volume;
    const done = (ok) => { audio.onended = audio.onerror = audio.ontimeupdate = null; resolve(ok); };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    // Extrait d'un enregistrement plus long : on s'arrête à « end » secondes.
    if (end) audio.ontimeupdate = () => { if (audio.currentTime >= end) { audio.pause(); audio.ontimeupdate = null; done(true); } };
    audio.play().catch(() => done(false));
  })));
}

export function stopClip() {
  pendingClip = null;
  clip?.pause();
  clip = null;
  stopCheer();
}

/** Arrière-plan : tout s'arrête ; retour : rien ne reprend tout seul de façon bruyante. */
export function suspendAudio() {
  stopSpeaking();
  stopCheer();
  stopClip();
  context?.suspend?.();
}

// ---------- Effet de victoire (« Youpiii ! ») ----------

/** Enregistrement de victoire (« Oh Yeah ! »). Absent ou illisible : « yaaay » synthétisé. */
export const CHEER_URL = 'assets/audio/fx/bravo.mp3';
let cheerBuffer = null; // Promise<AudioBuffer|null>
let cheerSource = null;

/**
 * Moteur audio partagé. Les navigateurs (Safari iOS surtout) n'autorisent le son qu'après un geste de l'enfant :
 * le moteur est débloqué au premier toucher, puis reste actif. Un son joué plus tard (après l'enregistrement
 * du résultat, donc hors du geste) passe alors sans être bloqué, contrairement à un élément <audio>.
 */
function audioContext() {
  context ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function unlockAudio() {
  try {
    const c = audioContext();
    // Un tampon silencieux joué pendant le geste débloque définitivement le son sur iOS.
    const silent = c.createBufferSource();
    silent.buffer = c.createBuffer(1, 1, 22050);
    silent.connect(c.destination);
    silent.start(0);
  } catch {
    // Pas d'audio : rien à débloquer.
  }
}
if (globalThis.document) ['pointerdown', 'touchend', 'keydown'].forEach((t) => document.addEventListener(t, unlockAudio, true));

/** Télécharge et décode l'enregistrement de victoire à l'avance (une fois), pour le jouer sans délai. */
export function preloadCheer() {
  cheerBuffer ??= fetch(CHEER_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((data) => (data ? new Promise((resolve) => audioContext().decodeAudioData(data, resolve, () => resolve(null))) : null))
    .catch(() => null);
  return cheerBuffer;
}

export function stopCheer() {
  try { cheerSource?.stop(); } catch { /* déjà terminé */ }
  cheerSource = null;
}

/**
 * Cris de joie à la réussite : l'enregistrement s'il est disponible, sinon un « yaaay » de petites voix synthétisées
 * (voyelles « i-a-é » par filtres de formants, plusieurs voix d'enfants décalées) avec quelques clochettes.
 */
export async function cheer() {
  if (!soundOn()) return false;
  stopSpeaking();
  stopCheer();
  const buffer = await preloadCheer();
  if (buffer) {
    try {
      const c = audioContext();
      const source = c.createBufferSource();
      const gain = c.createGain();
      source.buffer = buffer;
      gain.gain.value = settings.volume;
      source.connect(gain).connect(c.destination);
      source.start();
      cheerSource = source;
      source.onended = () => { if (cheerSource === source) cheerSource = null; };
      return true;
    } catch {
      // Lecture impossible : la synthèse prend le relais.
    }
  }
  return synthCheer();
}

function synthCheer() {
  try {
    context ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    const t0 = context.currentTime + 0.02;
    const master = context.createGain();
    master.gain.value = 0.9 * settings.volume;
    master.connect(context.destination);

    // Petites voix : hauteur d'enfant, montée joyeuse « yaaa-ay », léger vibrato, départs décalés.
    const voices = [[420, 0], [500, 0.03], [560, 0.06], [470, 0.09], [610, 0.05]];
    for (const [pitch, delay] of voices) {
      const start = t0 + delay;
      const end = start + 1.05;
      const src = context.createOscillator();
      src.type = 'sawtooth';
      src.frequency.setValueAtTime(pitch * 0.85, start);
      src.frequency.exponentialRampToValueAtTime(pitch * 1.25, start + 0.18);
      src.frequency.exponentialRampToValueAtTime(pitch * 1.18, start + 0.7);
      src.frequency.exponentialRampToValueAtTime(pitch * 1.32, end);
      const vib = context.createOscillator();
      const vibGain = context.createGain();
      vib.frequency.value = 6 + Math.random() * 2;
      vibGain.gain.value = pitch * 0.025;
      vib.connect(vibGain).connect(src.frequency);

      // Formants : « i » (300 / 2300 Hz) → « a » (850 / 1350 Hz) → « é » (450 / 2100 Hz)
      const f1 = context.createBiquadFilter();
      const f2 = context.createBiquadFilter();
      f1.type = f2.type = 'bandpass';
      f1.Q.value = 6;
      f2.Q.value = 9;
      f1.frequency.setValueAtTime(300, start);
      f1.frequency.linearRampToValueAtTime(850, start + 0.12);
      f1.frequency.setValueAtTime(850, start + 0.6);
      f1.frequency.linearRampToValueAtTime(450, end);
      f2.frequency.setValueAtTime(2300, start);
      f2.frequency.linearRampToValueAtTime(1350, start + 0.12);
      f2.frequency.setValueAtTime(1350, start + 0.6);
      f2.frequency.linearRampToValueAtTime(2100, end);
      const g2 = context.createGain();
      g2.gain.value = 0.6;

      const env = context.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(0.09, start + 0.06);
      env.gain.setValueAtTime(0.09, start + 0.75);
      env.gain.exponentialRampToValueAtTime(0.0001, end);

      src.connect(f1).connect(env);
      src.connect(f2).connect(g2).connect(env);
      env.connect(master);
      src.start(start);
      vib.start(start);
      src.stop(end + 0.05);
      vib.stop(end + 0.05);
    }

    // Souffle de foule joyeuse (bruit filtré) sous les voix.
    const length = Math.floor(context.sampleRate * 1.1);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 0.8;
    const nEnv = context.createGain();
    nEnv.gain.setValueAtTime(0.0001, t0);
    nEnv.gain.exponentialRampToValueAtTime(0.035, t0 + 0.1);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    noise.connect(band).connect(nEnv).connect(master);
    noise.start(t0);

    // Clochettes scintillantes à la fin.
    [1568, 2093, 2637, 3136].forEach((freq, i) => {
      const at = t0 + 0.75 + i * 0.07;
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.06, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      osc.connect(g).connect(master);
      osc.start(at);
      osc.stop(at + 0.4);
    });
    return true;
  } catch {
    return false;
  }
}
