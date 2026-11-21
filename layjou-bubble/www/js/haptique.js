/* ------------------------------------------------------------------ *
 *  Haptique — retours haptiques « sensationnels » des jeux Layjou
 *  (version script classique : expose window.Haptique).
 *
 *  Effets de base (moteur Taptic d'iOS, vibreur d'Android) :
 *    select  cran discret · light / medium / heavy  chocs
 *    success / warning / error  motifs de notification du système
 *  Effets composés : motifs enchaînés, grondements continus, crescendo
 *  de combo, explosion, poussée, fête, échec.
 *  Limiteur : deux impulsions espacées d'au moins 40 ms, sauf si la
 *  seconde est plus forte.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var WEIGHT = { select: 1, light: 2, medium: 3, heavy: 4, success: 5, warning: 5, error: 6 };
  var WEB_MS = { select: 5, light: 10, medium: 18, heavy: 32, success: [14, 60, 22], warning: [24, 90, 24], error: [30, 60, 30, 60, 40] };
  var STYLE = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' };
  var NOTIF = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' };
  var enabled = function () { return true; };
  var last = 0, lastWeight = 0, selecting = false, plugin;
  var loops = {}, timers = [];

  function isNative() {
    var core = window.capacitorExports && window.capacitorExports.Capacitor;
    var cap = core || window.Capacitor;
    return !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  }
  function haptics() {
    if (plugin !== undefined) return plugin;
    plugin = null;
    if (!isNative()) return plugin;
    try {
      if (window.capacitorExports && window.capacitorExports.registerPlugin) plugin = window.capacitorExports.registerPlugin('Haptics');
      else if (window.Capacitor && window.Capacitor.Plugins) plugin = window.Capacitor.Plugins.Haptics || null;
    } catch (e) { plugin = null; }
    return plugin;
  }
  function swallow(p) { if (p && p.catch) p.catch(function () {}); }

  function fire(kind) {
    var H = haptics();
    if (H) {
      try {
        if (kind === 'select') {
          if (!selecting) { selecting = true; swallow(H.selectionStart()); }
          swallow(H.selectionChanged());
        } else if (STYLE[kind]) swallow(H.impact({ style: STYLE[kind] }));
        else if (NOTIF[kind]) swallow(H.notification({ type: NOTIF[kind] }));
      } catch (e) { /* plugin indisponible */ }
      return;
    }
    if (!isNative() && navigator.vibrate) { try { navigator.vibrate(WEB_MS[kind] || 10); } catch (e) { /* non supporté */ } }
  }

  function pulse(kind) {
    if (!enabled()) return;
    var now = performance.now(), w = WEIGHT[kind] || 2;
    if (now - last < 40 && w <= lastWeight) return;
    last = now; lastWeight = w;
    fire(kind);
  }
  function later(ms, fn) { var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); fn(); }, ms); timers.push(id); }

  var H = {
    /** Branche le réglage du joueur (fonction qui renvoie true si les vibrations sont actives). */
    setEnabled: function (fn) { enabled = fn; },
    select: function () { pulse('select'); },
    tap: function () { pulse('select'); },
    light: function () { pulse('light'); },
    medium: function () { pulse('medium'); },
    heavy: function () { pulse('heavy'); },
    success: function () { pulse('success'); },
    warning: function () { pulse('warning'); },
    error: function () { pulse('error'); },
    force: function (k) { pulse(k >= 0.75 ? 'heavy' : k >= 0.4 ? 'medium' : k > 0.1 ? 'light' : 'select'); },
    /** Motif : [[effet, délai ms], ...] */
    pattern: function (steps) {
      if (!enabled()) return;
      steps.forEach(function (s) { if (!s[1]) pulse(s[0]); else later(s[1], function () { pulse(s[0]); }); });
    },
    /** Grondement continu nommé, idempotent (peut être rappelé à chaque image). */
    loop: function (name, kind, every) {
      var cur = loops[name];
      if (cur && cur.kind === kind && cur.every === every) return;
      if (cur) clearInterval(cur.id);
      pulse(kind);
      loops[name] = { kind: kind, every: every, id: setInterval(function () { pulse(kind); }, every) };
    },
    stop: function (name) { var cur = loops[name]; if (cur) { clearInterval(cur.id); delete loops[name]; } },
    stopAll: function () {
      Object.keys(loops).forEach(function (k) { clearInterval(loops[k].id); });
      loops = {};
      timers.forEach(clearTimeout); timers = [];
      var P = haptics();
      if (selecting && P) { selecting = false; try { swallow(P.selectionEnd()); } catch (e) { /* ignore */ } }
    },
    combo: function (n) {
      if (n <= 1) return pulse('light');
      if (n < 4) return H.pattern([['medium', 0], ['light', 70]]);
      if (n < 7) return H.pattern([['heavy', 0], ['medium', 70], ['light', 140]]);
      H.pattern([['heavy', 0], ['heavy', 80], ['medium', 160], ['light', 230]]);
    },
    boom: function () { H.pattern([['heavy', 0], ['heavy', 70], ['medium', 160], ['light', 260]]); },
    surge: function () { H.pattern([['heavy', 0], ['medium', 60], ['light', 130], ['select', 210]]); },
    celebrate: function () { H.pattern([['success', 0], ['light', 180], ['light', 260], ['medium', 360], ['heavy', 480]]); },
    fail: function () { H.pattern([['error', 0], ['heavy', 220]]); },
    hurt: function () { H.pattern([['heavy', 0], ['error', 90]]); },
  };
  window.Haptique = H;
  document.addEventListener('visibilitychange', function () { if (document.hidden) H.stopAll(); });
})();
