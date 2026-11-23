// Formulaire de contact : envoie le message à api/contact (JSON) et affiche le résultat.
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = form.querySelector('.s-form-status');
  var button = form.querySelector('button[type="submit"]');
  var mail = form.getAttribute('data-mail') || 'contact@layjou.com';
  var fields = ['name', 'email', 'message'];

  function say(text, ok) {
    status.textContent = text;
    status.className = 's-form-status ' + (ok ? 'ok' : 'ko');
  }
  function mark(name, bad) {
    var input = form.elements[name];
    var err = document.getElementById('c-' + name + '-err');
    if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (err) err.hidden = !bad;
  }
  function check() {
    var bad = [];
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    var message = form.elements.message.value.trim();
    if (!name || name.length > 120) bad.push('name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) bad.push('email');
    if (message.length < 10 || message.length > 5000) bad.push('message');
    return bad;
  }
  function show(bad) {
    fields.forEach(function (f) { mark(f, bad.indexOf(f) !== -1); });
    if (bad.length) {
      var first = form.elements[bad[0]];
      if (first) first.focus();
    }
  }

  fields.forEach(function (f) {
    form.elements[f].addEventListener('input', function () {
      if (this.getAttribute('aria-invalid') === 'true') mark(f, check().indexOf(f) !== -1);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = check();
    show(bad);
    if (bad.length) { say('Vérifiez les champs signalés.', false); return; }
    button.disabled = true;
    say('Envoi en cours…', true);
    var body = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      subject: form.elements.subject.value,
      message: form.elements.message.value.trim(),
      website: form.elements.website.value
    };
    fetch(form.getAttribute('data-api'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-layjou': '1' },
      body: JSON.stringify(body),
      credentials: 'same-origin'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
    }).then(function (r) {
      if (r.status >= 200 && r.status < 300 && r.data && r.data.ok) {
        form.reset();
        show([]);
        say('Merci, votre message est bien parti. Nous vous répondrons par e-mail.', true);
      } else if (r.status === 400 && r.data && Array.isArray(r.data.fields)) {
        show(r.data.fields);
        say('Vérifiez les champs signalés.', false);
      } else if (r.status === 429) {
        say('Trop de messages envoyés depuis votre connexion. Réessayez dans une heure, ou écrivez à ' + mail + '.', false);
      } else {
        say('Le formulaire est indisponible pour le moment. Écrivez-nous directement à ' + mail + '.', false);
      }
    }).catch(function () {
      say('Envoi impossible (connexion ?). Réessayez, ou écrivez à ' + mail + '.', false);
    }).then(function () {
      button.disabled = false;
    });
  });
})();
