/** Petits utilitaires DOM (pas de framework). */

type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.assign(el.dataset, v);
      } else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Relance une animation CSS en retirant puis remettant la classe. */
export function replay(el: Element, cls: string): void {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

/** Anime un nombre affiché jusqu'à sa nouvelle valeur. */
export function countTo(el: HTMLElement, to: number, format: (n: number) => string, ms = 500): void {
  const from = Number(el.dataset.value ?? 0);
  el.dataset.value = String(to);
  if (from === to || ms <= 0) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    if (el.dataset.value !== String(to)) return; // une animation plus récente a pris le relais
    const k = clamp((now - start) / ms, 0, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = format(Math.round(from + (to - from) * eased));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

type Kid = Node | string | null | undefined | false;
/** Remplace le contenu d'un élément (les valeurs vides sont ignorées). */
export function fill(el: Element, ...kids: Kid[]): void {
  el.replaceChildren(...kids.filter((k): k is Node | string => k !== null && k !== undefined && k !== false));
}
/** Ajoute des enfants à un élément (les valeurs vides sont ignorées). */
export function add(el: Element, ...kids: Kid[]): void {
  el.append(...kids.filter((k): k is Node | string => k !== null && k !== undefined && k !== false));
}
