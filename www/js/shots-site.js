// Accueil : captures d'écran qui tournent. La première (l'île) reste fixe ; toutes les 5 secondes, une des trois
// autres places (à tour de rôle) affiche un nouveau jeu, pris dans la réserve (#s-shots-pool, écrite par
// tools/build-site.php). Chaque capture est un lien vers la fiche du jeu. En pause quand l'onglet est caché, quand la
// souris est sur les captures ou que le clavier y est ; sans animation si le visiteur a demandé moins de mouvement.
(() => {
  const list = document.querySelector('.s-shots[data-rotate]');
  const poolEl = document.getElementById('s-shots-pool');
  if (!list || !poolEl) return;
  let pool;
  try { pool = JSON.parse(poolEl.textContent); } catch { return; }
  const slots = [...list.children].slice(1); // la première place (l'île) ne change pas
  if (!slots.length || !pool.length) return;
  const read = (li) => {
    const a = li.querySelector('a'); const img = li.querySelector('img');
    return { href: a.getAttribute('href'), src: img.getAttribute('src'), alt: img.alt, name: li.querySelector('strong').textContent, text: li.querySelector('figcaption span').textContent };
  };
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const delay = Number(list.dataset.rotate) || 5000;
  let turn = 0;
  let paused = false;

  const show = (li, item) => {
    const img = li.querySelector('img');
    const apply = () => {
      li.querySelector('a').setAttribute('href', item.href);
      img.src = item.src; img.alt = item.alt;
      li.querySelector('strong').textContent = item.name;
      li.querySelector('figcaption span').textContent = item.text;
      li.classList.remove('s-shot-out');
    };
    if (still.matches) { apply(); return; }
    li.classList.add('s-shot-out');
    setTimeout(apply, 350);
  };

  const step = () => {
    if (paused || document.hidden) return;
    const li = slots[turn % slots.length];
    turn += 1;
    const item = pool.shift();
    pool.push(read(li)); // le jeu remplacé retourne au bout de la réserve
    // L'image est chargée avant l'échange, pour ne jamais montrer un cadre vide.
    const pre = new Image();
    pre.onload = pre.onerror = () => show(li, item);
    pre.src = item.src;
  };

  list.addEventListener('mouseenter', () => { paused = true; });
  list.addEventListener('mouseleave', () => { paused = false; });
  list.addEventListener('focusin', () => { paused = true; });
  list.addEventListener('focusout', () => { paused = false; });
  setInterval(step, delay);
})();
