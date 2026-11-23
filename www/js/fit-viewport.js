/*
 * Téléphone affiché « comme un ordinateur » : quand Chrome est réglé sur « Site pour ordinateur » (réglage global,
 * par site, ou repris par l'application Android), il ignore <meta name="viewport"> et dessine la page sur 980 px
 * de large, réduite pour tenir dans l'écran : tout devient minuscule et la mise en page bureau s'affiche.
 *
 * Ce script (chargé tôt, juste après la feuille de style) détecte ce cas — écran tactile étroit mais page bien plus
 * large que l'écran — et rétablit l'affichage téléphone :
 * - la page est agrandie (zoom) pour retrouver la largeur réelle de l'écran ;
 * - les règles @media en largeur/hauteur sont recalculées pour cette largeur réelle ;
 * - les unités vw/vh sont converties pour l'écran réel.
 * Sur ordinateur et sur un téléphone normal, il ne fait rien.
 */
(function () {
  var screenW = screen.width;
  var pageW = window.innerWidth || document.documentElement.clientWidth;
  if (!(navigator.maxTouchPoints > 0 && screenW > 0 && screenW < 900 && pageW > screenW * 1.3)) return;

  var z = pageW / screenW;
  var w = screenW;
  var h = Math.round(window.innerHeight / z);
  var root = document.documentElement;
  root.classList.add('fit-viewport');
  root.style.zoom = String(z);

  var scaleQuery = function (text) {
    return text.replace(/(min|max)-(width|height)\s*:\s*([\d.]+)px/g, function (m, a, b, n) { return a + '-' + b + ': ' + (n * z) + 'px'; });
  };
  var viewportUnits = function (value) {
    return value.replace(/(-?[\d.]+)d?v([wh])\b/g, function (m, n, u) { return (n * (u === 'w' ? w : h) / 100).toFixed(2) + 'px'; });
  };
  var walk = function (rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.media && r.cssRules) {
        if (/width|height/.test(r.media.mediaText)) r.media.mediaText = scaleQuery(r.media.mediaText);
        walk(r.cssRules);
      } else if (r.style) {
        for (var j = 0; j < r.style.length; j++) {
          var p = r.style[j];
          var v = r.style.getPropertyValue(p);
          if (/\dd?v[wh]\b/.test(v)) r.style.setProperty(p, viewportUnits(v), r.style.getPropertyPriority(p));
        }
      } else if (r.cssRules) {
        walk(r.cssRules);
      }
    }
  };
  for (var s = 0; s < document.styleSheets.length; s++) {
    try { walk(document.styleSheets[s].cssRules); } catch (e) { /* feuille d'un autre domaine : ignorée */ }
  }
  // En tournant l'écran, la largeur change : on recharge pour tout recalculer (la progression est enregistrée).
  window.addEventListener('orientationchange', function () { location.reload(); });
})();
