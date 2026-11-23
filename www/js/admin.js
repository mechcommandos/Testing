/**
 * Espace admin : tableau de bord (fréquentation, jeux, comptes) et gestion des comptes parents.
 * Graphiques en SVG faits main : aucune bibliothèque externe. Les données viennent de api/admin/*.
 */
import { api, errorText } from './core/api.js';
import { h, toast, confirmDialog } from './ui/dom.js';

const root = document.getElementById('ad-root');
const PERIODS = [7, 30, 90, 365];
const KIND = { guest: 'Invités', parent_free: 'Parents (gratuit)', parent_famille: 'Parents (Famille)' };
const KIND_COLOR = { guest: 'var(--c2)', parent_free: 'var(--c1)', parent_famille: 'var(--c3)' };
const PLATFORM = { web: 'Site web', pwa: 'Appli installée (PWA)', android: 'Android', ios: 'iOS' };
const DEVICE = { mobile: 'Mobile', tablet: 'Tablette', desktop: 'Ordinateur', other: 'Autre' };
const REASON = { completed: 'Terminé', quit: 'Quitté', abandoned: 'Abandonné', timeout: 'Inactivité', hidden: 'Appli fermée', other: 'Autre' };
const WEEKDAY = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const PLAN_STATUS = { active: 'actif', trialing: 'essai', past_due: 'paiement en retard', canceled: 'résilié', paused: 'en pause' };

const state = { tab: 'stats', days: 30, stats: null, q: '', page: 1, parents: null, open: null, messages: null, mq: '', mPage: 1, mUnread: false, msgOpen: null, unread: 0 };

// ---------- Formats ----------
const nf = new Intl.NumberFormat('fr-FR');
const num = (n) => (n == null ? '—' : nf.format(Math.round(n * 10) / 10));
const pct = (r) => (r == null ? '—' : `${(r * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`);
function dur(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
const dayLabel = (d) => { const [, m, j] = String(d).split('-'); return `${j}/${m}`; };
const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const label = (map, key) => map[key] ?? (key == null || key === '' ? 'Inconnu' : String(key));

// ---------- Briques d'affichage ----------
function card(title, sub, ...body) {
  return h('section', { class: 'ad-card' }, h('h3', {}, title), sub ? h('p', { class: 'ad-sub' }, sub) : null, ...body);
}
const empty = (text = 'Pas encore de données sur la période.') => h('p', { class: 'ad-empty' }, text);
const legend = (items) => h('ul', { class: 'ad-legend' }, ...items.map(([name, color]) => h('li', {}, h('span', { class: 'ad-sw', style: { background: color } }), name)));

function kpi(name, k, format = num, invert = false) {
  const value = k?.value ?? null;
  const prev = k?.previous ?? null;
  let delta = h('span', { class: 'ad-delta' }, 'période précédente : —');
  if (value != null && prev != null) {
    if (prev === 0) delta = h('span', { class: 'ad-delta' }, `avant : ${format(prev)}`);
    else {
      const r = (value - prev) / Math.abs(prev);
      const good = invert ? r < 0 : r > 0;
      const cls = Math.abs(r) < 0.005 ? '' : good ? 'up' : 'down';
      const sign = r > 0 ? '+' : '';
      delta = h('span', { class: `ad-delta ${cls}`, title: `Période précédente : ${format(prev)}` }, `${r > 0 ? '▲' : r < 0 ? '▼' : '='} ${sign}${(r * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`);
    }
  }
  return h('div', { class: 'ad-kpi' }, h('div', { class: 'ad-kpi-label' }, name), h('div', { class: 'ad-kpi-value' }, format(value)), delta);
}

function hbars(items, { color = 'var(--c1)', format = num, extra } = {}) {
  const list = items.filter((i) => i.value > 0);
  if (!list.length) return empty();
  const max = Math.max(...list.map((i) => i.value));
  return h('div', { class: 'ad-hbars' }, ...list.map((i) => h('div', { class: 'ad-hbar', title: extra ? extra(i) : `${i.label} : ${format(i.value)}` },
    h('span', { class: 'ad-hbar-label' }, i.label),
    h('span', { class: 'ad-hbar-track' }, h('span', { class: 'ad-hbar-fill', style: { width: `${(i.value / max) * 100}%`, background: i.color ?? color, display: 'block' } })),
    h('span', { class: 'ad-hbar-val' }, format(i.value)))));
}

/** Échelle « ronde » pour l'axe vertical. */
function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function axis(W, H, P, max, labels) {
  let s = '';
  for (let i = 0; i <= 4; i++) {
    const y = P.t + (H - P.t - P.b) * (1 - i / 4);
    s += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}"/><text x="${P.l - 6}" y="${y + 4}" text-anchor="end">${esc(num((max * i) / 4))}</text>`;
  }
  const n = labels.length;
  const step = Math.max(1, Math.ceil(n / 8));
  const w = (W - P.l - P.r) / n;
  labels.forEach((l, i) => {
    if (i % step === 0 || i === n - 1) s += `<text x="${P.l + w * (i + 0.5)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
  });
  return s;
}

/** Courbes quotidiennes : plusieurs séries, une info-bulle par jour. */
function lineChart(days, series) {
  if (!days.length) return empty();
  const W = 640; const H = 230; const P = { l: 44, r: 10, t: 12, b: 26 };
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const n = days.length; const w = (W - P.l - P.r) / n;
  const x = (i) => P.l + w * (i + 0.5);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / max);
  let svg = axis(W, H, P, max, days.map(dayLabel));
  for (const s of series) {
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    if (s.area) svg += `<polygon points="${x(0).toFixed(1)},${y(0)} ${pts} ${x(n - 1).toFixed(1)},${y(0)}" fill="${s.color}" opacity="0.10"/>`;
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (n <= 31) s.values.forEach((v, i) => { svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6" fill="${s.color}"/>`; });
  }
  days.forEach((d, i) => {
    const tip = `${dayLabel(d)} — ${series.map((s) => `${s.name} : ${num(s.values[i])}`).join(' · ')}`;
    svg += `<rect class="hit" x="${(P.l + w * i).toFixed(1)}" y="${P.t}" width="${w.toFixed(1)}" height="${H - P.t - P.b}"><title>${esc(tip)}</title></rect>`;
  });
  return h('div', {}, h('div', { html: `<svg class="ad-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(', '))} par jour">${svg}</svg>` }), legend(series.map((s) => [s.name, s.color])));
}

/** Barres empilées par jour (parties commencées par catégorie d'utilisateur). */
function stackedBars(days, keys) {
  if (!days.length) return empty();
  const W = 640; const H = 230; const P = { l: 44, r: 10, t: 12, b: 26 };
  const totals = days.map((d) => keys.reduce((a, k) => a + (d.values[k] ?? 0), 0));
  const max = niceMax(Math.max(1, ...totals));
  const n = days.length; const w = (W - P.l - P.r) / n; const bw = Math.max(1, w * 0.72);
  const scale = (H - P.t - P.b) / max;
  let svg = axis(W, H, P, max, days.map((d) => dayLabel(d.day)));
  days.forEach((d, i) => {
    let base = H - P.b;
    for (const k of keys) {
      const v = d.values[k] ?? 0;
      if (!v) continue;
      const hgt = v * scale;
      base -= hgt;
      svg += `<rect x="${(P.l + w * i + (w - bw) / 2).toFixed(1)}" y="${base.toFixed(1)}" width="${bw.toFixed(1)}" height="${hgt.toFixed(1)}" fill="${KIND_COLOR[k]}"/>`;
    }
    const tip = `${dayLabel(d.day)} — ${keys.map((k) => `${KIND[k]} : ${num(d.values[k] ?? 0)}`).join(' · ')} (total ${num(totals[i])})`;
    svg += `<rect class="hit" x="${(P.l + w * i).toFixed(1)}" y="${P.t}" width="${w.toFixed(1)}" height="${H - P.t - P.b}"><title>${esc(tip)}</title></rect>`;
  });
  return h('div', {}, h('div', { html: `<svg class="ad-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Parties commencées par jour et par catégorie">${svg}</svg>` }), legend(keys.map((k) => [KIND[k], KIND_COLOR[k]])));
}

/** Anneau de répartition. */
function donut(items, centerLabel) {
  const list = items.filter((i) => i.value > 0);
  const total = list.reduce((a, i) => a + i.value, 0);
  if (!total) return empty();
  const R = 60; const r = 38; const C = 75;
  let a0 = -Math.PI / 2; let svg = '';
  for (const i of list) {
    const frac = i.value / total;
    const tip = `${i.label} : ${num(i.value)} (${pct(frac)})`;
    if (frac >= 0.9999) {
      svg += `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="${i.color}" stroke-width="${R - r}"><title>${esc(tip)}</title></circle>`;
      break;
    }
    const a1 = a0 + frac * 2 * Math.PI; const large = frac > 0.5 ? 1 : 0;
    const p = (rad, a) => `${(C + rad * Math.cos(a)).toFixed(2)},${(C + rad * Math.sin(a)).toFixed(2)}`;
    svg += `<path d="M${p(R, a0)} A${R},${R} 0 ${large} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${large} 0 ${p(r, a0)} Z" fill="${i.color}"><title>${esc(tip)}</title></path>`;
    a0 = a1;
  }
  svg += `<text class="ad-donut-total" x="${C}" y="${C + 2}" text-anchor="middle">${esc(num(total))}</text><text x="${C}" y="${C + 18}" text-anchor="middle">${esc(centerLabel)}</text>`;
  return h('div', { class: 'ad-donut' },
    h('div', { html: `<svg class="ad-chart" viewBox="0 0 150 150" role="img" aria-label="Répartition">${svg}</svg>` }),
    h('ul', { class: 'ad-legend' }, ...list.map((i) => h('li', {}, h('span', { class: 'ad-sw', style: { background: i.color } }), `${i.label} — ${num(i.value)} (${pct(i.value / total)})`))));
}

function funnel(f) {
  if (!f || !f.visitors) return empty();
  const steps = [['Visiteurs', f.visitors, 'var(--c2)'], ['Ont commencé un jeu', f.started, 'var(--c1)'], ['Ont terminé un jeu', f.completed, 'var(--c4)']];
  return h('div', { class: 'ad-funnel' }, ...steps.map(([name, v, color], i) => h('div', { class: 'ad-funnel-step' },
    h('div', { class: 'ad-funnel-head' }, h('span', {}, name), h('strong', {}, `${num(v)}${i ? ` · ${pct(v / f.visitors)}` : ''}`)),
    h('div', { class: 'ad-funnel-bar', style: { width: `${Math.max(1, (v / f.visitors) * 100)}%`, background: color } }))));
}

function heat(hours, key, color) {
  const max = Math.max(0, ...hours.map((x) => x[key]));
  if (!max) return empty();
  return h('div', {},
    h('div', { class: 'ad-heat' }, ...hours.map((x) => h('div', { class: 'ad-heat-cell', title: `${x.hour} h – ${x.hour + 1} h : ${num(x[key])}`, style: { background: color, opacity: String(0.08 + 0.92 * (x[key] / max)) } }))),
    h('div', { class: 'ad-heat-axis' }, ...hours.map((x) => h('span', {}, x.hour % 3 === 0 ? `${x.hour}h` : ''))));
}

function table(head, rows, { sort } = {}) {
  return h('div', { class: 'ad-table-wrap' }, h('table', { class: 'ad-table' },
    h('thead', {}, h('tr', {}, ...head.map((c) => h('th', { class: `${c.num ? 'num' : ''} ${c.key && sort ? 'sortable' : ''}`, scope: 'col', onclick: c.key && sort ? () => sort(c.key) : null, title: c.title ?? null }, c.label)))),
    h('tbody', {}, ...rows)));
}

function stats(pairs) {
  return h('dl', { class: 'ad-stats' }, ...pairs.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))));
}

// ---------- Tableau de bord ----------
let gameSort = { key: 'starts', dir: -1 };

function gamesTable(games) {
  if (!games.length) return empty('Aucune partie sur la période.');
  const list = [...games].sort((a, b) => {
    const va = a[gameSort.key]; const vb = b[gameSort.key];
    if (typeof va === 'string' || typeof vb === 'string') return String(va ?? '').localeCompare(String(vb ?? ''), 'fr') * gameSort.dir;
    return ((va ?? -1) - (vb ?? -1)) * gameSort.dir;
  });
  const holder = h('div', {});
  const sort = (key) => { gameSort = { key, dir: gameSort.key === key ? -gameSort.dir : -1 }; holder.replaceWith(gamesTable(games)); };
  const bar = (r) => h('span', { class: 'ad-mini' }, h('span', { style: { width: `${Math.round((r ?? 0) * 100)}%` } }));
  holder.append(table([
    { label: 'Jeu', key: 'name' }, { label: 'Thème', key: 'theme' }, { label: 'Commencées', key: 'starts', num: true },
    { label: 'Terminées', key: 'completed', num: true }, { label: 'Taux', key: 'completionRate', num: true, title: 'Parties terminées / commencées' },
    { label: 'Durée moy.', key: 'avgActiveMs', num: true }, { label: 'Réussite', key: 'successRate', num: true, title: 'Activités réussies (comptes parents)' },
    { label: 'Joueurs', key: 'players', num: true }, { label: 'Invités', key: 'guestStarts', num: true, title: 'Parties commencées en invité' },
  ], list.map((g) => h('tr', {},
    h('td', {}, g.name ?? g.gameId), h('td', {}, g.theme ?? '—'), h('td', { class: 'num' }, num(g.starts)), h('td', { class: 'num' }, num(g.completed)),
    h('td', { class: 'num' }, pct(g.completionRate), bar(g.completionRate)), h('td', { class: 'num' }, dur(g.avgActiveMs)),
    h('td', { class: 'num' }, pct(g.successRate)), h('td', { class: 'num' }, num(g.players)), h('td', { class: 'num' }, num(g.guestStarts)))), { sort }));
  return holder;
}

function accountsSection(a) {
  if (!a) return [];
  const p = a.parents ?? {}; const c = a.children ?? {}; const s = a.sessions ?? {}; const r = a.results ?? {}; const d = a.devices ?? {};
  const signups = a.signups ?? [];
  const bands = (c.ageBands ?? []).map((b) => ({ label: b.band == null ? 'Âge non renseigné' : `${b.band} ans`, value: b.count }));
  const plans = (a.plans ?? []).map((x) => ({ label: `${x.plan === 'famille' ? 'Famille' : 'Gratuit'}${x.status ? ` · ${PLAN_STATUS[x.status] ?? x.status}` : ''}`, value: x.count, color: x.plan === 'famille' ? 'var(--c3)' : 'var(--c1)' }));
  return [
    h('h2', { class: 'ad-section-title' }, 'Comptes parents'),
    h('div', { class: 'ad-grid' },
      card('Parents', 'Comptes créés sur le site ou dans l’appli.', stats([
        ['Comptes', num(p.total)], ['E-mail vérifié', num(p.verified)], ['Nouveaux (période)', num(p.new)], ['Actifs (période)', num(p.active)],
        ['Offre Famille', num(p.family)], ['Bilan hebdo activé', num(p.weeklyReport)], ['Suppression demandée', num(p.deletionRequested)],
      ])),
      card('Enfants et appareils', 'Profils enfants synchronisés avec un compte.', stats([
        ['Profils enfants', num(c.total)], ['Profils actuels', num(c.current)], ['Nouveaux profils', num(c.new)], ['Enfants actifs', num(c.active)],
        ['Appareils liés', num(d.total)], ['Appareils actifs', num(d.active)], ['Nouveaux appareils', num(d.new)],
      ])),
      card('Inscriptions par jour', null, signups.length ? lineChart(signups.map((x) => x.day), [{ name: 'Inscriptions', color: 'var(--c3)', values: signups.map((x) => x.count), area: true }]) : empty()),
      card('Offres', 'Répartition des comptes par offre et état de l’abonnement.', donut(plans, 'comptes')),
      card('Âge des enfants', null, hbars(bands, { color: 'var(--c5)' })),
      card('Parties des comptes synchronisés', 'Données détaillées remontées par la synchronisation.', stats([
        ['Sessions', num(s.count)], ['Sessions closes', num(s.ended)], ['Sessions terminées', num(s.completed)], ['Durée moyenne', dur(s.avgActiveMs)],
        ['Activités jouées', num(r.count)], ['Réussite', pct(r.successRate)], ['Sans aide', pct(r.autonomyRate)],
        ['Indices / activité', num(r.avgHints)], ['Erreurs / activité', num(r.avgErrors)],
      ])),
      card('Plateformes des appareils liés', null, hbars((d.platforms ?? []).map((x) => ({ label: label(PLATFORM, x.key), value: x.count })), { color: 'var(--c6)' })),
    ),
  ];
}

function dashboard(st) {
  const k = st.kpis ?? {};
  const days = st.daily ?? [];
  const out = [];
  out.push(h('p', { class: 'ad-meta' }, `Du ${dateFr(st.period.from)} au ${dateFr(st.period.to)} (${st.period.timezone}), comparé au ${dateFr(st.period.previousFrom)} – ${dateFr(st.period.previousTo)}. Mis à jour le ${new Date((st.generatedAt ?? 0) * 1000).toLocaleString('fr-FR')}.`));
  if (!st.analytics) out.push(h('div', { class: 'ad-notice' }, 'La mesure de fréquentation est désactivée sur ce serveur (« analytics_enabled » absent de la configuration) : les visites et les parties des invités ne sont pas comptées. Les chiffres des comptes restent affichés.'));

  out.push(h('div', { class: 'ad-kpis' },
    kpi('Visites', k.visits), kpi('Visiteurs uniques / jour', k.visitors), kpi('Pages par visiteur', k.pagesPerVisitor),
    kpi('Parties commencées', k.starts), kpi('Parties terminées', k.completed), kpi('Taux de complétion', k.completionRate, pct),
    kpi('Parties closes', k.ends), kpi('Joueurs', k.players), kpi('Temps de jeu moyen', k.avgActiveMs, dur), kpi('Temps de jeu total', k.totalActiveMs, dur)));

  // Comptes parents d'abord, juste avant la fréquentation.
  out.push(...accountsSection(st.accounts));

  out.push(h('h2', { class: 'ad-section-title' }, 'Fréquentation et parties'));
  const kinds = (st.userKinds ?? []);
  out.push(h('div', { class: 'ad-grid' },
    h('section', { class: 'ad-card wide' }, h('h3', {}, 'Évolution quotidienne'), h('p', { class: 'ad-sub' }, 'Visiteurs : empreinte quotidienne sans cookie (un même appareil compte une fois par jour).'),
      lineChart(days.map((d) => d.day), [
        { name: 'Visites', color: 'var(--c2)', values: days.map((d) => d.visits), area: true },
        { name: 'Visiteurs', color: 'var(--c6)', values: days.map((d) => d.visitors) },
        { name: 'Parties commencées', color: 'var(--c1)', values: days.map((d) => d.starts) },
        { name: 'Parties terminées', color: 'var(--c4)', values: days.map((d) => d.completed) },
      ])),
    h('section', { class: 'ad-card wide' }, h('h3', {}, 'Parties commencées par type d’utilisateur'),
      stackedBars(days.map((d) => ({ day: d.day, values: d.startsByKind ?? {} })), ['guest', 'parent_free', 'parent_famille'])),
    card('Visiteurs par type d’utilisateur', null, donut(kinds.map((x) => ({ label: label(KIND, x.kind), value: x.visitors, color: KIND_COLOR[x.kind] ?? 'var(--c5)' })), 'visiteurs')),
    card('Entonnoir', 'Visiteurs → parties commencées → parties terminées (empreintes quotidiennes).', funnel(st.funnel)),
  ));

  out.push(card('Comparatif par type d’utilisateur', 'Invités : sans compte. Parents : appareil relié à un compte, gratuit ou Famille.',
    kinds.length ? table([
      { label: 'Type' }, { label: 'Visites', num: true }, { label: 'Visiteurs', num: true }, { label: 'Commencées', num: true },
      { label: 'Closes', num: true }, { label: 'Terminées', num: true }, { label: 'Taux', num: true }, { label: 'Durée moy.', num: true },
    ], kinds.map((x) => h('tr', {}, h('td', {}, h('span', { class: 'ad-sw', style: { background: KIND_COLOR[x.kind] ?? 'var(--c5)', display: 'inline-block', marginRight: '6px' } }), label(KIND, x.kind)),
      h('td', { class: 'num' }, num(x.visits)), h('td', { class: 'num' }, num(x.visitors)), h('td', { class: 'num' }, num(x.starts)),
      h('td', { class: 'num' }, num(x.ends)), h('td', { class: 'num' }, num(x.completed)), h('td', { class: 'num' }, pct(x.completionRate)), h('td', { class: 'num' }, dur(x.avgActiveMs))))) : empty()));

  out.push(h('h2', { class: 'ad-section-title' }, 'Jeux'));
  out.push(h('section', { class: 'ad-card' }, h('h3', {}, 'Classement des jeux'), h('p', { class: 'ad-sub' }, 'Cliquer sur un en-tête pour trier.'), gamesTable(st.games ?? [])));
  out.push(h('div', { class: 'ad-grid', style: { marginTop: '14px' } },
    card('Jeux les plus lancés', null, hbars((st.games ?? []).slice().sort((a, b) => b.starts - a.starts).slice(0, 10).map((g) => ({ label: g.name ?? g.gameId, value: g.starts })))),
    card('Fin des parties', 'Comment les parties se terminent.', hbars((st.endReasons ?? []).map((x) => ({ label: label(REASON, x.key), value: x.count, color: x.key === 'completed' ? 'var(--c4)' : 'var(--c5)' })),
      { extra: (i) => i.label })),
    card('Difficulté choisie', 'Parties commencées (et terminées) par niveau.', hbars((st.difficulties ?? []).map((x) => ({ label: `${x.difficulty == null ? 'Non précisé' : `Niveau ${x.difficulty}`} · ${num(x.completed)} terminées`, value: x.starts })), { color: 'var(--c6)' })),
    card('Temps de jeu par fin de partie', null, hbars((st.endReasons ?? []).map((x) => ({ label: label(REASON, x.key), value: x.avgActiveMs ?? 0 })), { color: 'var(--c2)', format: dur })),
  ));

  out.push(h('h2', { class: 'ad-section-title' }, 'Audience'));
  const hours = st.hours ?? [];
  out.push(h('div', { class: 'ad-grid' },
    card('Pages vues', 'Visites par page du site et de l’appli.', hbars((st.pages ?? []).map((x) => ({ label: x.page, value: x.visits })), { extra: (i) => i.label })),
    card('Plateformes', 'Visiteurs uniques par plateforme (les applis des stores ne sont pas mesurées).', hbars((st.platforms ?? []).map((x) => ({ label: label(PLATFORM, x.key), value: x.visitors })), { color: 'var(--c6)' })),
    card('Appareils', 'Visiteurs uniques par type d’écran.', hbars((st.devices ?? []).map((x) => ({ label: label(DEVICE, x.key), value: x.visitors })), { color: 'var(--c2)' })),
    card('Jours de la semaine', 'Visites et parties commencées.', hbars((st.weekdays ?? []).flatMap((x) => [{ label: `${WEEKDAY[x.weekday - 1]} · visites`, value: x.visits, color: 'var(--c2)' }, { label: `${WEEKDAY[x.weekday - 1]} · parties`, value: x.starts }]))),
    h('section', { class: 'ad-card wide' }, h('h3', {}, 'Heures d’affluence (heure de Paris)'),
      h('p', { class: 'ad-sub' }, 'Visites'), heat(hours, 'visits', 'var(--c2)'),
      h('p', { class: 'ad-sub', style: { marginTop: '14px' } }, 'Parties commencées'), heat(hours, 'starts', 'var(--c1)')),
  ));

  return out;
}

// ---------- Gestion des comptes ----------
async function setPlan(p, plan, until) {
  const body = { parentId: p.id, plan };
  if (plan === 'famille' && until) body.until = until;
  const res = await api('admin/parent/plan', { method: 'POST', body });
  if (!res.ok) {
    const msg = { subscription_active: 'Abonnement payant en cours : à modifier depuis Paddle.', invalid_until: 'Date de fin invalide (elle doit être dans le futur).', parent_not_found: 'Compte introuvable.' }[res.data?.error];
    toast(msg ?? errorText(res));
    return;
  }
  toast(plan === 'famille' ? 'Offre Famille accordée.' : 'Compte repassé en gratuit.');
  loadParents();
}

async function removeParent(p) {
  const ok = await confirmDialog({ title: 'Supprimer ce compte ?', text: `Le compte ${p.email}, ses ${p.children} profil(s) enfant(s), ses appareils et ses résultats seront effacés définitivement. Cette action est irréversible.`, confirm: 'Supprimer définitivement', danger: true });
  if (!ok) return;
  const res = await api('admin/parent/delete', { method: 'POST', body: { parentId: p.id } });
  if (!res.ok) {
    const msg = { subscription_active: 'Abonnement payant en cours : résiliez-le d’abord.', cannot_delete_self: 'Vous ne pouvez pas supprimer votre propre compte ici.', parent_not_found: 'Compte déjà supprimé.' }[res.data?.error];
    toast(msg ?? errorText(res));
    return;
  }
  toast('Compte supprimé.');
  state.open = null;
  loadParents();
}

function planTag(p) {
  if (p.family) return h('span', { class: 'ad-tag famille' }, `Famille${p.planStatus ? ` · ${PLAN_STATUS[p.planStatus] ?? p.planStatus}` : ''}`);
  return h('span', { class: 'ad-tag' }, 'Gratuit');
}

function detailRow(p) {
  const plan = h('select', { 'aria-label': 'Offre' }, h('option', { value: 'famille' }, 'Famille (offerte)'), h('option', { value: 'free' }, 'Gratuit'));
  plan.value = p.family ? 'famille' : 'free';
  const until = h('input', { type: 'date', 'aria-label': 'Fin de l’offre (facultatif)', value: p.planUntil ? p.planUntil.slice(0, 10) : '' });
  const locked = p.subscription && ['active', 'trialing', 'past_due'].includes(p.planStatus);
  return h('tr', { class: 'ad-detail' }, h('td', { colspan: '9' },
    stats([
      ['Inscription', dateFr(p.createdAt)], ['E-mail', p.verified ? 'vérifié' : 'non vérifié'], ['Offre', p.family ? 'Famille' : 'Gratuit'],
      ['Fin de l’offre', p.planUntil ? dateFr(p.planUntil) : '—'], ['Abonnement Paddle', p.subscription ? (PLAN_STATUS[p.planStatus] ?? p.planStatus ?? 'oui') : 'aucun'],
      ['Dernière activité', dateFr(p.lastActiveAt)], ['Suppression demandée', p.deletionRequested ? 'oui' : 'non'],
    ]),
    locked ? h('p', { class: 'ad-sub', style: { marginTop: '10px' } }, 'Abonnement payant en cours : l’offre et la suppression se gèrent depuis Paddle.') : null,
    h('div', { class: 'ad-form', style: { marginTop: '10px' } },
      h('label', {}, 'Offre', plan), h('label', {}, 'Jusqu’au (vide = sans fin)', until),
      h('button', { type: 'button', class: 'ad-btn primary', disabled: locked || null, onclick: () => setPlan(p, plan.value, until.value) }, 'Appliquer'),
      h('button', { type: 'button', class: 'ad-btn danger', disabled: locked || p.admin || null, title: p.admin ? 'Compte administrateur' : null, onclick: () => removeParent(p) }, 'Supprimer le compte'))));
}

function parentsView() {
  const wrap = h('div', {});
  const input = h('input', { type: 'search', placeholder: 'Rechercher une adresse e-mail…', 'aria-label': 'Rechercher un compte', value: state.q });
  const form = h('form', { class: 'ad-search', onsubmit: (e) => { e.preventDefault(); state.q = input.value.trim(); state.page = 1; state.open = null; loadParents(); } },
    input, h('button', { type: 'submit', class: 'ad-btn primary' }, 'Rechercher'));
  wrap.append(form);
  const data = state.parents;
  if (!data) { wrap.append(h('p', { class: 's-lead' }, 'Chargement…')); return wrap; }
  if (data.error) { wrap.append(h('p', { class: 'ad-error' }, data.error)); return wrap; }
  wrap.append(h('p', { class: 'ad-meta' }, `${num(data.total)} compte(s)${state.q ? ` pour « ${state.q} »` : ''}.`));
  if (!data.parents.length) { wrap.append(empty('Aucun compte trouvé.')); return wrap; }
  const rows = [];
  for (const p of data.parents) {
    const open = state.open === p.id;
    rows.push(h('tr', { class: 'ad-parent-row' },
      h('td', { title: p.email }, p.email, p.admin ? h('span', { class: 'ad-tag ok', style: { marginLeft: '6px' } }, 'admin') : null),
      h('td', {}, dateFr(p.createdAt)),
      h('td', {}, p.verified ? h('span', { class: 'ad-tag ok' }, 'vérifié') : h('span', { class: 'ad-tag warn' }, 'à vérifier')),
      h('td', {}, planTag(p), p.deletionRequested ? h('span', { class: 'ad-tag warn', style: { marginLeft: '6px' } }, 'suppression demandée') : null),
      h('td', { class: 'num' }, num(p.children)), h('td', { class: 'num' }, num(p.devices)), h('td', { class: 'num' }, num(p.results)),
      h('td', {}, dateFr(p.lastActiveAt)),
      h('td', {}, h('button', { type: 'button', class: 'ad-btn small', 'aria-expanded': String(open), onclick: () => { state.open = open ? null : p.id; render(); } }, open ? 'Fermer' : 'Gérer'))));
    if (open) rows.push(detailRow(p));
  }
  wrap.append(h('section', { class: 'ad-card' }, table([
    { label: 'E-mail' }, { label: 'Inscription' }, { label: 'État' }, { label: 'Offre' }, { label: 'Enfants', num: true },
    { label: 'Appareils', num: true }, { label: 'Résultats', num: true }, { label: 'Dernière activité' }, { label: '' },
  ], rows)));
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  wrap.append(h('div', { class: 'ad-pager' },
    h('button', { type: 'button', class: 'ad-btn small', disabled: state.page <= 1 || null, onclick: () => { state.page--; state.open = null; loadParents(); } }, '← Précédent'),
    h('span', {}, `Page ${data.page} / ${pages}`),
    h('button', { type: 'button', class: 'ad-btn small', disabled: state.page >= pages || null, onclick: () => { state.page++; state.open = null; loadParents(); } }, 'Suivant →')));
  return wrap;
}

// ---------- Messages (formulaire de contact) ----------
const dateTimeFr = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

async function markMessage(m, read) {
  const res = await api('admin/message/read', { method: 'POST', body: { messageId: m.id, read } });
  if (!res.ok) { toast(res.data?.error === 'message_not_found' ? 'Message introuvable.' : errorText(res)); return; }
  loadMessages(true);
}

async function removeMessage(m) {
  const ok = await confirmDialog({ title: 'Supprimer ce message ?', text: `Le message de ${m.name} (${m.email}) sera effacé définitivement. Cette action est irréversible.`, confirm: 'Supprimer', danger: true });
  if (!ok) return;
  const res = await api('admin/message/delete', { method: 'POST', body: { messageId: m.id } });
  if (!res.ok && res.data?.error !== 'message_not_found') { toast(errorText(res)); return; }
  toast('Message supprimé.');
  if (state.msgOpen === m.id) state.msgOpen = null;
  loadMessages(true);
}

function replyLink(m) {
  const subject = `Re: ${m.subjectLabel ?? 'Votre message à Layjou'}`;
  const quote = m.message.split('\n').map((l) => `> ${l}`).join('\n');
  return `mailto:${encodeURIComponent(m.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Bonjour ${m.name},\n\n\n\n${dateTimeFr(m.createdAt)}, vous avez écrit :\n${quote}`)}`;
}

function messageItem(m) {
  const open = state.msgOpen === m.id;
  const unread = !m.readAt;
  const toggle = () => {
    state.msgOpen = open ? null : m.id;
    if (!open && unread) markMessage(m, true); else render();
  };
  return h('li', { class: `ad-msg${unread ? ' unread' : ''}${open ? ' open' : ''}` },
    h('button', { type: 'button', class: 'ad-msg-head', 'aria-expanded': String(open), onclick: toggle },
      h('span', { class: 'ad-msg-from' }, unread ? h('span', { class: 'ad-dot', 'aria-label': 'non lu' }) : null, m.name, h('span', { class: 'ad-msg-mail' }, m.email)),
      h('span', { class: 'ad-tag' }, m.subjectLabel ?? m.subject),
      h('span', { class: 'ad-msg-date' }, dateTimeFr(m.createdAt)),
      open ? null : h('span', { class: 'ad-msg-preview' }, m.message.length > 140 ? `${m.message.slice(0, 140)}…` : m.message)),
    open ? h('div', { class: 'ad-msg-body' },
      h('p', { class: 'ad-msg-text' }, m.message),
      h('div', { class: 'ad-form' },
        h('a', { class: 'ad-btn primary', href: replyLink(m) }, 'Répondre par e-mail'),
        h('button', { type: 'button', class: 'ad-btn', onclick: () => markMessage(m, unread) }, unread ? 'Marquer comme lu' : 'Marquer comme non lu'),
        h('button', { type: 'button', class: 'ad-btn danger', onclick: () => removeMessage(m) }, 'Supprimer'))) : null);
}

function messagesView() {
  const wrap = h('div', {});
  const input = h('input', { type: 'search', placeholder: 'Rechercher (nom, e-mail, texte)…', 'aria-label': 'Rechercher un message', value: state.mq });
  const onlyUnread = h('input', { type: 'checkbox', checked: state.mUnread || null, onchange: () => { state.mUnread = onlyUnread.checked; state.mPage = 1; loadMessages(); } });
  wrap.append(h('form', { class: 'ad-search', onsubmit: (e) => { e.preventDefault(); state.mq = input.value.trim(); state.mPage = 1; state.msgOpen = null; loadMessages(); } },
    input, h('button', { type: 'submit', class: 'ad-btn primary' }, 'Rechercher'), h('label', { class: 'ad-check' }, onlyUnread, 'Non lus seulement')));
  const data = state.messages;
  if (!data) { wrap.append(h('p', { class: 's-lead' }, 'Chargement…')); return wrap; }
  if (data.error) { wrap.append(h('p', { class: 'ad-error' }, data.error)); return wrap; }
  wrap.append(h('p', { class: 'ad-meta' }, `${num(data.total)} message(s)${state.mq ? ` pour « ${state.mq} »` : ''} · ${num(data.unread)} non lu(s) au total.`));
  if (!data.messages.length) { wrap.append(empty(state.mq || state.mUnread ? 'Aucun message ne correspond.' : 'Aucun message reçu pour l’instant. Ils arrivent ici depuis le formulaire de la page Contact.')); return wrap; }
  wrap.append(h('section', { class: 'ad-card' }, h('ul', { class: 'ad-msgs' }, ...data.messages.map(messageItem))));
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  if (pages > 1) {
    wrap.append(h('div', { class: 'ad-pager' },
      h('button', { type: 'button', class: 'ad-btn small', disabled: state.mPage <= 1 || null, onclick: () => { state.mPage--; state.msgOpen = null; loadMessages(); } }, '← Précédent'),
      h('span', {}, `Page ${data.page} / ${pages}`),
      h('button', { type: 'button', class: 'ad-btn small', disabled: state.mPage >= pages || null, onclick: () => { state.mPage++; state.msgOpen = null; loadMessages(); } }, 'Suivant →')));
  }
  return wrap;
}

// ---------- Accès, chargement, rendu ----------
function denied(res) {
  if (res.status === 401) {
    return [h('p', { class: 's-lead' }, 'Connectez-vous d’abord avec votre compte administrateur.'), h('p', {}, h('a', { class: 's-btn', href: 'espace-parent.html' }, 'Se connecter'))];
  }
  if (res.status === 403) return [h('p', { class: 's-lead' }, 'Accès réservé aux administrateurs de Layjou.'), h('p', { class: 's-note' }, 'Ce compte n’est pas autorisé, ou son adresse e-mail n’est pas encore vérifiée.')];
  if (res.status === 404) return [h('p', { class: 's-lead' }, 'Les comptes ne sont pas ouverts sur ce serveur : l’espace admin est indisponible.')];
  return [h('p', { class: 'ad-error' }, errorText(res)), h('button', { type: 'button', class: 'ad-btn', onclick: () => loadStats() }, 'Réessayer')];
}

let accessDenied = null;

async function loadStats() {
  state.stats = null; render();
  const res = await api(`admin/stats?days=${state.days}`);
  if (!res.ok) { accessDenied = res; render(); return; }
  accessDenied = null;
  state.stats = res.data;
  render();
}

async function loadParents() {
  state.parents = null; render();
  const res = await api(`admin/parents?q=${encodeURIComponent(state.q)}&page=${state.page}`);
  if (!res.ok && [401, 403, 404].includes(res.status)) { accessDenied = res; render(); return; }
  state.parents = res.ok ? res.data : { error: errorText(res) };
  render();
}

async function loadMessages(quiet = false) {
  if (!quiet) { state.messages = null; render(); }
  const res = await api(`admin/messages?q=${encodeURIComponent(state.mq)}&page=${state.mPage}${state.mUnread ? '&status=unread' : ''}`);
  if (!res.ok && [401, 403, 404].includes(res.status)) { accessDenied = res; render(); return; }
  state.messages = res.ok ? res.data : { error: errorText(res) };
  if (res.ok) state.unread = res.data.unread;
  render();
}

// Compteur de non-lus affiché sur l'onglet, même avant de l'ouvrir.
async function loadUnreadCount() {
  const res = await api('admin/messages?status=unread&page=1');
  if (res.ok) { state.unread = res.data.unread; render(); }
}

function toolbar() {
  const tabs = h('div', { class: 'ad-tabs', role: 'tablist' },
    ...[['stats', 'Tableau de bord'], ['parents', 'Gestion des comptes'], ['messages', 'Messages']].map(([id, name]) => h('button', {
      type: 'button', class: 'ad-tab', role: 'tab', 'aria-selected': String(state.tab === id),
      onclick: () => {
        if (state.tab === id) return; state.tab = id;
        history.replaceState(null, '', id === 'stats' ? location.pathname : `#${id}`);
        if (id === 'parents' && !state.parents) loadParents(); else if (id === 'messages') loadMessages(); else render();
      },
    }, name, id === 'messages' && state.unread ? h('span', { class: 'ad-badge', 'aria-label': `${state.unread} non lu(s)` }, String(state.unread)) : null)));
  const right = state.tab === 'stats'
    ? h('div', { class: 'ad-periods', role: 'group', 'aria-label': 'Période' },
      ...PERIODS.map((d) => h('button', { type: 'button', class: 'ad-period', 'aria-pressed': String(state.days === d), onclick: () => { if (state.days !== d) { state.days = d; loadStats(); } } }, d === 365 ? '1 an' : `${d} j`)),
      h('button', { type: 'button', class: 'ad-btn', title: 'Actualiser', 'aria-label': 'Actualiser', onclick: () => loadStats() }, '↻'))
    : h('div', {});
  return h('div', { class: 'ad-bar' }, tabs, right);
}

function render() {
  if (accessDenied) { root.replaceChildren(...denied(accessDenied)); return; }
  const body = state.tab === 'stats'
    ? (state.stats ? dashboard(state.stats) : [h('p', { class: 's-lead' }, 'Chargement des statistiques…')])
    : state.tab === 'parents' ? [parentsView()] : [messagesView()];
  root.replaceChildren(toolbar(), ...body);
}

const initialTab = location.hash.slice(1);
if (initialTab === 'parents') { state.tab = 'parents'; loadParents(); loadUnreadCount(); }
else if (initialTab === 'messages') { state.tab = 'messages'; loadMessages(); }
else { loadStats(); loadUnreadCount(); }
