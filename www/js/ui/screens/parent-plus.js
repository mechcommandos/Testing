/**
 * Espace parent de l'application : ce qui dépend de l'offre (Gratuit / Famille).
 * - graphiques du temps de jeu et des activités, bilan imprimable (PDF via « Imprimer ») ;
 * - par enfant : limite de temps par jour, mots de la semaine.
 */
import { formatDuration, finishedGames, levelName, SKILL_STATUS, skillStatus, summarize } from '../../core/insights.js';
import { FREE_DAILY_MIN, FREE_PROFILES, isFamily, LIMIT_CHOICES, parseWords, PRICE, startOfDay } from '../../core/plan.js';
import { GOAL_TARGETS, SOUNDS, TABLES } from '../../core/goals.js';
import { clear, h, put, toast } from '../dom.js';
import { inStoreApp, nativeApp, nativeShare } from '../../core/native.js';
import { app, gameById, isPlayable } from '../state.js';

const DAY = 86_400_000;

export const family = () => isFamily(app.device?.policy());

export const FAMILY_PERKS = [
  'Enfants illimités, synchronisés sur tous vos appareils',
  'Pas de limite de temps, ou une limite choisie pour chaque enfant',
  'Bloquer momentanément un appareil à distance',
  'Un objectif de la semaine et une récompense pour chaque enfant',
  'Un programme du jour de 10 minutes, adapté à l’enfant',
  'Les révisions de l’école : mots, tables, sons étudiés',
  'Bilan de la semaine et alertes par e-mail',
  'Historique complet, graphiques et bilan à imprimer',
];

/** Petit encart quand une fonction est réservée à l'offre Famille. */
export function familyOnly(text) {
  return h('p', { class: 'small family-only' }, h('strong', {}, 'Offre Famille · '), text, inStoreApp() ? null : ' ', inStoreApp() ? null : h('a', { href: '#/parent/compte' }, 'En savoir plus'));
}

// ---------- Graphiques ----------

function barChart({ values, labels, title, unit, color }) {
  const W = 560;
  const H = 170;
  const max = Math.max(1, ...values);
  const bw = W / values.length;
  const bars = values.map((v, i) => {
    const bh = Math.round((v / max) * (H - 40));
    return `<rect x="${i * bw + 4}" y="${H - 22 - bh}" width="${bw - 8}" height="${bh}" rx="4" fill="${color}"><title>${labels[i]} : ${v} ${unit}</title></rect>`
      + (v ? `<text x="${i * bw + bw / 2}" y="${H - 26 - bh}" text-anchor="middle" font-size="11" fill="#56627a">${v}</text>` : '')
      + `<text x="${i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#56627a">${labels[i]}</text>`;
  }).join('');
  return h('figure', { class: 'chart' }, h('figcaption', {}, title),
    h('div', { role: 'img', 'aria-label': `${title} : ${values.map((v, i) => `${labels[i]} ${v} ${unit}`).join(', ')}`, html: `<svg viewBox="0 0 ${W} ${H}" focusable="false"><line x1="0" x2="${W}" y1="${H - 22}" y2="${H - 22}" stroke="#d8e1ec"/>${bars}</svg>` }));
}

/** Minutes de jeu par jour (14 derniers jours) et activités réussies par semaine (8 dernières semaines). */
export function chartsSection(results, sessions, now = Date.now()) {
  const today = startOfDay(now);
  const days = Array.from({ length: 14 }, (_, i) => today - (13 - i) * DAY);
  const minutes = days.map((d) => Math.round(sessions.filter((s) => s.startedAt >= d && s.startedAt < d + DAY).reduce((t, s) => t + (s.activeMs ?? 0), 0) / 60_000));
  const dayLabels = days.map((d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'narrow' }) + new Date(d).getDate());
  const weeks = Array.from({ length: 8 }, (_, i) => today + DAY - (8 - i) * 7 * DAY);
  const perWeek = weeks.map((w) => results.filter((r) => r.success && r.createdAt >= w && r.createdAt < w + 7 * DAY).length);
  const weekLabels = weeks.map((w) => new Date(w).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }));
  return h('section', { class: 'charts' }, h('h2', {}, 'Graphiques'),
    barChart({ values: minutes, labels: dayLabels, title: 'Minutes de jeu par jour (14 derniers jours)', unit: 'min', color: '#1fb3c6' }),
    barChart({ values: perWeek, labels: weekLabels, title: 'Activités réussies par semaine (8 dernières semaines)', unit: 'activités', color: '#8b6fe8' }));
}

// ---------- Bilan imprimable ----------

/** Ouvre la fenêtre d'impression avec un bilan sur 30 jours (choisir « Enregistrer en PDF » pour un fichier). */
export function printReport(profile, results, sessions, now = Date.now()) {
  const s = summarize({ results, sessions, games: app.catalogue.games, period: '30', now });
  const finished = finishedGames(results, app.catalogue.games.filter(isPlayable));
  const skills = app.skills.skills.map((skill) => ({ skill, ...skillStatus(skill.id, results) })).filter((x) => x.status !== 'unexplored');
  const date = (ms) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const sheet = h('div', { class: 'print-report' },
    h('header', {}, h('img', { src: 'assets/img/wordmark.png', alt: 'Layjou', width: 120, height: 34 }), h('p', {}, `Bilan du ${date(now - 30 * DAY)} au ${date(now)}`)),
    h('h1', {}, `Les progrès de ${profile.nickname}`),
    h('ul', { class: 'print-stats' },
      h('li', {}, h('strong', {}, formatDuration(s.activeMs) || '0 min'), ' de jeu actif'),
      h('li', {}, h('strong', {}, String(s.activities)), ` activité${s.activities > 1 ? 's' : ''} terminée${s.activities > 1 ? 's' : ''}`),
      h('li', {}, h('strong', {}, String(s.autonomous)), ' réussies sans indice'),
      h('li', {}, h('strong', {}, String(s.gamesExplored)), ` jeu${s.gamesExplored > 1 ? 'x' : ''} joué${s.gamesExplored > 1 ? 's' : ''}`)),
    s.games.length ? h('section', {}, h('h2', {}, 'Par jeu'), h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Jeu'), h('th', {}, 'Activités'), h('th', {}, 'Réussies'), h('th', {}, 'Niveau le plus haut'))),
      h('tbody', {}, s.games.map((g) => {
        const top = Math.max(-1, ...Object.entries(g.byDifficulty).filter(([, n]) => n > 0).map(([d]) => Number(d)));
        return h('tr', {}, h('td', {}, g.name), h('td', {}, String(g.activities)), h('td', {}, String(g.successes)), h('td', {}, top >= 0 ? levelName(gameById(g.gameId), top) : '—'));
      })))) : null,
    finished.length ? h('section', {}, h('h2', {}, 'Jeux terminés (tous les niveaux réussis)'), h('ul', {}, finished.map((f) => h('li', {}, `${f.name}, le ${date(f.at)}`)))) : null,
    skills.length ? h('section', {}, h('h2', {}, 'Compétences travaillées'), h('ul', {}, skills.map((x) => h('li', {}, `${x.skill.label} : ${SKILL_STATUS[x.status]}`)))) : null,
    h('p', { class: 'print-note' }, 'Ce bilan décrit ce qui a été joué dans Layjou sur cet appareil et les appareils synchronisés. Ce n’est ni une note ni un diagnostic.'));
  document.body.append(sheet);
  document.body.classList.add('printing');
  const done = () => { sheet.remove(); document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  // Application iOS : le bilan en PDF dans la feuille de partage (imprimer, Fichiers, mail).
  if (nativeApp() === 'ios') {
    document.body.classList.add('native-printing');
    // Le bilan reste affiché pendant la création du PDF ; il s'efface au premier toucher après la feuille de partage.
    setTimeout(() => {
      nativeShare('Bilan Layjou');
      const close = () => { done(); document.body.classList.remove('native-printing'); };
      setTimeout(() => document.addEventListener('pointerdown', close, { once: true }), 1000);
    }, 300); // le temps de charger le logo
    return;
  }
  setTimeout(() => window.print(), 300); // le temps de charger le logo
}

// ---------- Par enfant : limite du jour et mots de la semaine ----------

export function limitSelect(profile, onSaved) {
  const select = h('select', { 'aria-label': `Temps de jeu par jour pour ${profile.nickname}`, onchange: async (e) => {
    const v = e.target.value === '' ? null : Number(e.target.value);
    await app.store.updateProfile(profile.id, { dailyLimitMin: v });
    toast(v ? `Limite : ${v} min par jour.` : 'Sans limite de temps.');
    onSaved?.();
  } }, LIMIT_CHOICES.map((m) => h('option', { value: m ?? '', selected: (profile.dailyLimitMin ?? null) === m }, m === null ? 'Sans limite' : m >= 60 && m % 60 === 0 ? `${m / 60} h par jour` : m > 60 ? `${Math.floor(m / 60)} h ${m % 60} par jour` : `${m} min par jour`)));
  return h('label', { class: 'inline-setting' }, 'Temps de jeu : ', select);
}

export function wordsEditor(root, profile, back) {
  clear(root);
  const area = h('textarea', { id: 'words', rows: 8, maxlength: 1200, placeholder: 'maison\nécole\njardin\n…' }, (profile.words ?? []).join('\n'));
  const count = h('p', { class: 'small', role: 'status' });
  const update = () => { const n = parseWords(area.value).length; count.textContent = `${n} mot${n > 1 ? 's' : ''} retenu${n > 1 ? 's' : ''} (40 au plus).`; };
  area.addEventListener('input', update);
  update();
  put(root, h('h1', {}, `Les mots de la semaine de ${profile.nickname}`),
    h('p', {}, 'Recopiez la liste de mots donnée par l’école : un mot par ligne (ou séparés par des virgules). Ils apparaîtront dans le jeu « Les mots de la semaine », où l’enfant les écoute puis les écrit avec des lettres.'),
    h('label', { for: 'words' }, 'Mots'), area, count,
    h('p', { class: 'small' }, 'Des mots simples : lettres, accents, trait d’union (pas de phrase).'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => {
        await app.store.updateProfile(profile.id, { words: parseWords(area.value) });
        toast('Mots enregistrés.');
        back();
      } }, 'Enregistrer'),
      h('button', { class: 'btn ghost', onclick: back }, 'Annuler')));
  area.focus();
}

// ---------- Objectif de la semaine et récompense ----------

export function goalEditor(root, profile, back) {
  clear(root);
  const goal = profile.goal ?? { target: 10, theme: null, reward: '' };
  const target = h('select', { id: 'goal-target' }, GOAL_TARGETS.map((n) => h('option', { value: n, selected: goal.target === n }, `${n} activités réussies`)));
  const theme = h('select', { id: 'goal-theme' }, h('option', { value: '' }, 'Tous les jeux'),
    app.skills.domains.map((d) => h('option', { value: d.id, selected: goal.theme === d.id }, d.label)));
  const reward = h('input', { id: 'goal-reward', maxlength: 60, value: goal.reward, placeholder: 'Une sortie au parc, une histoire de plus ce soir…', autocomplete: 'off' });
  put(root, h('h1', {}, `L’objectif de la semaine de ${profile.nickname}`),
    h('p', {}, 'Choisissez un objectif pour la semaine (du lundi au dimanche) et, si vous voulez, une récompense. L’enfant voit son objectif à côté du titre de l’île et dans « Mon aventure », et une fête l’accueille quand il l’atteint. Vous recevez un e-mail si les alertes sont activées.'),
    h('div', { class: 'form' },
      h('label', { for: 'goal-target' }, 'Objectif'), target,
      h('label', { for: 'goal-theme' }, 'Dans quels jeux'), theme,
      h('label', { for: 'goal-reward' }, 'Récompense (facultatif)'), reward,
      h('p', { class: 'small' }, 'Une récompense simple et sans écran marche souvent le mieux : un moment ensemble, un choix pour le dîner…'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: async () => {
          await app.store.updateProfile(profile.id, { goal: { target: Number(target.value), theme: theme.value || null, reward: reward.value.trim().slice(0, 60) } });
          toast('Objectif enregistré.');
          back();
        } }, 'Enregistrer'),
        profile.goal ? h('button', { class: 'btn ghost', onclick: async () => { await app.store.updateProfile(profile.id, { goal: null }); toast('Objectif retiré.'); back(); } }, 'Retirer l’objectif') : null,
        h('button', { class: 'btn ghost', onclick: back }, 'Annuler'))));
}

// ---------- Révisions de l'école : tables et sons ----------

export function revisionsEditor(root, profile, back) {
  clear(root);
  const rev = profile.revisions ?? { tables: [], sounds: [] };
  const tables = TABLES.map((t) => h('label', { class: 'check chip-check' }, h('input', { type: 'checkbox', value: t, checked: rev.tables.includes(t) }), ` × ${t}`));
  const sounds = Object.entries(SOUNDS).map(([id, label]) => h('label', { class: 'check chip-check' }, h('input', { type: 'checkbox', value: id, checked: rev.sounds.includes(id) }), ` ${label}`));
  const tablesBox = h('div', { class: 'chip-checks', role: 'group', 'aria-label': 'Tables à réviser' }, tables);
  const soundsBox = h('div', { class: 'chip-checks', role: 'group', 'aria-label': 'Sons étudiés' }, sounds);
  put(root, h('h1', {}, `Les révisions de l’école de ${profile.nickname}`),
    h('p', {}, 'Cochez ce qui est travaillé en classe en ce moment. Les jeux s’en servent, et le programme du jour les met en avant.'),
    h('h2', {}, 'Tables de multiplication à réviser'),
    h('p', { class: 'small' }, 'Utilisées par « La ruche des multiplications », niveau « Les tables ».'),
    tablesBox,
    h('h2', {}, 'Sons étudiés'),
    h('p', { class: 'small' }, 'Utilisés par « La chasse aux rimes », niveau « Les rimes ».'),
    soundsBox,
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => {
        const pickNums = [...tablesBox.querySelectorAll('input:checked')].map((i) => Number(i.value));
        const pickSounds = [...soundsBox.querySelectorAll('input:checked')].map((i) => i.value);
        await app.store.updateProfile(profile.id, { revisions: pickNums.length || pickSounds.length ? { tables: pickNums, sounds: pickSounds } : null });
        toast('Révisions enregistrées.');
        back();
      } }, 'Enregistrer'),
      h('button', { class: 'btn ghost', onclick: back }, 'Annuler')));
}
