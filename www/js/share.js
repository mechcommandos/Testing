// Bouton Instagram de la barre « Partager cette page » : Instagram n'a pas d'adresse de partage web.
// Partage natif du téléphone s'il existe, sinon copie du lien avec un message.
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.s-share-instagram');
    if (!btn) return;
    var url = btn.getAttribute('data-share-url');
    var title = btn.getAttribute('data-share-title');
    var msg = btn.closest('.s-share').querySelector('.s-share-msg');
    var copied = function () { if (msg) msg.textContent = btn.getAttribute('data-copied'); };
    var copy = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(copied, function () { window.prompt('', url); });
      else window.prompt('', url);
    };
    if (navigator.share) navigator.share({ title: title, url: url }).catch(function (err) { if (!err || err.name !== 'AbortError') copy(); });
    else copy();
  });
})();
