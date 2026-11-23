/**
 * Pages ouvertes depuis les e-mails : confirmation d'adresse et choix d'un nouveau mot de passe.
 * Le jeton est dans le fragment de l'adresse (#/compte/…) : il n'apparaît pas dans les journaux du serveur web.
 * Il est retiré de l'historique dès qu'il a servi.
 */
import { API_ERRORS, api, errorText } from '../../core/api.js';
import { h } from '../dom.js';

function forget() {
  history.replaceState(null, '', `${location.pathname}#/compte/termine`);
}

export async function verifyLink(token) {
  const main = document.getElementById('main');
  const box = h('section', { class: 'narrow' }, h('h1', {}, 'Confirmation de l’adresse'), h('p', { role: 'status' }, 'Vérification…'));
  main.replaceChildren(box);
  const r = await api('account/verify', { method: 'POST', body: { token } });
  forget();
  box.replaceChildren(h('h1', {}, r.ok ? 'Adresse confirmée' : 'Lien non valable'),
    h('p', { role: 'status' }, r.ok ? 'Ton compte parent est activé. Connecte-toi depuis l’espace parent, onglet Compte, sur chaque appareil à synchroniser.' : errorText(r)),
    h('a', { class: 'btn', href: '#/parent/compte' }, 'Aller à l’espace parent'));
  return { destroy() {} };
}

export async function resetLink(token) {
  const main = document.getElementById('main');
  const message = h('p', { role: 'alert', class: 'error' });
  const pass = h('input', { type: 'password', id: 'new-password', autocomplete: 'new-password', minlength: 10, maxlength: 128, required: true });
  const pass2 = h('input', { type: 'password', id: 'new-password2', autocomplete: 'new-password', required: true });
  const form = h('form', {
    class: 'form',
    onsubmit: async (e) => {
      e.preventDefault();
      if (pass.value !== pass2.value) { message.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
      const r = await api('account/password/reset', { method: 'POST', body: { token, password: pass.value } });
      if (!r.ok && r.data?.error === 'weak_password') { message.textContent = API_ERRORS.weak_password; return; }
      forget();
      form.replaceWith(h('div', {},
        h('p', { role: 'status' }, r.ok ? 'Mot de passe changé. Pour ta sécurité, tous les appareils ont été déconnectés : reconnecte-toi depuis l’espace parent.' : errorText(r)),
        h('a', { class: 'btn', href: '#/parent/compte' }, 'Aller à l’espace parent')));
    },
  },
  h('label', { for: 'new-password' }, 'Nouveau mot de passe (10 caractères au moins)'), pass,
  h('label', { for: 'new-password2' }, 'Confirmer'), pass2,
  message,
  h('button', { class: 'btn' }, 'Enregistrer'));
  main.replaceChildren(h('section', { class: 'narrow' }, h('h1', {}, 'Nouveau mot de passe'), form));
  pass.focus();
  return { destroy() {} };
}
