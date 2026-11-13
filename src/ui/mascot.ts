/**
 * LayJou : l'illustration d'origine + des calques SVG par-dessus (expressions du visage,
 * accessoires). Les coordonnées des calques sont celles de l'image d'origine (1080 × 1456) ;
 * l'image exportée a simplement PAD pixels de marge (voir scripts/build_assets.py).
 */
import { h } from './dom';

const PAD = 36;
const VIEW = `${-PAD} ${-PAD} ${1080 + 2 * PAD} ${1456 + 2 * PAD}`;

// Géométrie du visage mesurée sur l'illustration
const FACE = { cx: 525, cy: 441.5, tilt: -14.1 };
const NAVY = '#02449c';
const SCREEN =
  '781,441 770,507 731,561 678,595 625,615 575,629 524,640 469,647 407,644 346,619 302,570 277,507 268,441 282,376 321,324 372,289 424,267 474,252 524,241 580,235 641,238 702,264 746,313 771,375';
// repère local du visage : yeux en (±142, 17), bouche en (0, 117), sourcils en (±148, -119)
const EYE_X = 142;
const EYE_Y = 17;

export type Mood = 'happy' | 'joy' | 'wow' | 'worried' | 'sad' | 'blink';
export type Equipped = { skin: string | null; head: string | null; face: string | null; neck: string | null };

const eyePatch = (x: number) => `<ellipse cx="${x}" cy="${EYE_Y}" rx="98" ry="104" fill="url(#lj-patch)"/>`;
const mouthPatch = `<ellipse cx="-2" cy="118" rx="100" ry="82" fill="url(#lj-patch)"/>`;
const browPatch = (x: number) => `<ellipse cx="${x}" cy="-119" rx="66" ry="42" fill="url(#lj-patch)"/>`;
const stroke = (d: string, color: string, w: number) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const worriedBrows =
  browPatch(-148) + browPatch(148) + stroke('M-196 -100 Q-150 -136 -104 -140', '#05D7FA', 22) + stroke('M196 -100 Q150 -136 104 -140', '#05D7FA', 22);

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.46;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#FFD84D" stroke="#FFF6C9" stroke-width="8" stroke-linejoin="round"/><circle cx="${cx - r * 0.2}" cy="${cy - r * 0.18}" r="${r * 0.13}" fill="#fff"/>`;
}

/** Calques du visage, dans le repère local (origine au centre de l'écran, incliné). */
const FACES: Record<Mood, string> = {
  happy: '',
  blink:
    eyePatch(-EYE_X) + eyePatch(EYE_X) + stroke(`M-198 14 Q-142 52 -86 14`, '#EAF9FF', 20) + stroke(`M86 14 Q142 52 198 14`, '#EAF9FF', 20),
  joy:
    eyePatch(-EYE_X) + eyePatch(EYE_X) + stroke(`M-200 40 Q-142 -44 -84 40`, '#EAF9FF', 24) + stroke(`M84 40 Q142 -44 200 40`, '#EAF9FF', 24),
  wow: eyePatch(-EYE_X) + eyePatch(EYE_X) + star(-EYE_X, EYE_Y, 82) + star(EYE_X, EYE_Y, 82),
  worried:
    worriedBrows +
    mouthPatch +
    stroke('M-52 128 q17 -22 34 0 t34 0 t34 0', '#FF8A93', 16) +
    `<path d="M236 -150 q26 40 0 58 q-26 -18 0 -58z" fill="#8FE6FF" stroke="#EAF9FF" stroke-width="6"/>`,
  sad:
    worriedBrows +
    eyePatch(-EYE_X) +
    eyePatch(EYE_X) +
    stroke(`M-196 4 Q-142 50 -88 22`, '#EAF9FF', 20) +
    stroke(`M196 4 Q142 50 88 22`, '#EAF9FF', 20) +
    `<path d="M-150 62 q22 36 0 52 q-22 -16 0 -52z" fill="#8FE6FF"/>` +
    mouthPatch +
    stroke('M-48 146 Q0 96 48 146', '#FF8A93', 18),
};

const OUT = `stroke="#fff" stroke-width="13" stroke-linejoin="round" paint-order="stroke"`;

/** Accessoires portés devant le personnage (repère de l'image d'origine). */
const FRONT: Record<string, string> = {
  // ---- tête : ancrés au sommet du casque, inclinés comme la tête
  partyhat: `<g transform="translate(476 196) rotate(-9)">
    <path d="M-128 6 Q0 44 128 6 L10 -262 Q0 -280 -10 -262z" fill="#FF4F9A" ${OUT}/>
    <path d="M-128 6 Q0 44 128 6 L10 -262 Q0 -280 -10 -262z" fill="#FF4F9A"/>
    <path d="M-106 -40 Q0 -6 106 -40 L88 -82 Q0 -52 -88 -82z M-62 -140 Q0 -120 62 -140 L45 -180 Q0 -164 -45 -180z" fill="#FFD84D"/>
    <path d="M-10 -262 Q0 -280 10 -262 L128 6 Q96 16 60 22z" fill="#C2185B" opacity=".22"/>
    <circle cx="0" cy="-272" r="36" fill="#19C5D6" ${OUT}/><circle cx="-10" cy="-284" r="10" fill="#fff" opacity=".8"/>
  </g>`,
  tophat: `<g transform="translate(476 200) rotate(-9)">
    <path d="M-112 -16 L-104 -214 Q0 -244 104 -214 L112 -16z" fill="#1F2A5C" ${OUT}/>
    <ellipse cx="0" cy="0" rx="176" ry="34" fill="#1F2A5C" ${OUT}/>
    <path d="M-111 -40 Q0 -8 111 -40 L109 -84 Q0 -54 -109 -84z" fill="#FF4F9A"/>
    <path d="M-88 -208 Q-70 -120 -84 -92" fill="none" stroke="#5167C4" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="0" cy="-214" rx="104" ry="22" fill="#2F3D80"/>
  </g>`,
  crown: `<g transform="translate(478 214) rotate(-9)">
    <path d="M-132 0 L-150 -128 L-78 -66 L-40 -118 L0 -62 L40 -118 L78 -66 L150 -128 L132 0 Q0 30 -132 0z" fill="#FFC531" ${OUT}/>
    <path d="M-132 0 Q0 30 132 0 L136 -34 Q0 -4 -136 -34z" fill="#FFA300"/>
    <path d="M-140 -104 L-78 -52 L-66 -68" fill="none" stroke="#FFF3B0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="-150" cy="-128" r="17" fill="#FF4F9A" stroke="#fff" stroke-width="6"/><circle cx="150" cy="-128" r="17" fill="#FF4F9A" stroke="#fff" stroke-width="6"/>
    <circle cx="-40" cy="-118" r="13" fill="#19C5D6" stroke="#fff" stroke-width="5"/><circle cx="40" cy="-118" r="13" fill="#19C5D6" stroke="#fff" stroke-width="5"/>
    <circle cx="-72" cy="-10" r="12" fill="#19C5D6"/><circle cx="0" cy="-2" r="14" fill="#FF4F9A"/><circle cx="72" cy="-10" r="12" fill="#19C5D6"/>
  </g>`,
  // ---- cou
  bowtie: `<g transform="translate(548 706) rotate(-8)">
    <path d="M-16 0 L-118 -62 Q-134 0 -118 62z M16 0 L118 -62 Q134 0 118 62z" fill="#FF3D6E" ${OUT}/>
    <path d="M-16 0 L-118 62 Q-126 30 -126 0z M16 0 L118 62 Q126 30 126 0z" fill="#C2185B" opacity=".3"/>
    <rect x="-30" y="-34" width="60" height="68" rx="20" fill="#FF6F91" ${OUT}/>
    <circle cx="-76" cy="-14" r="9" fill="#fff"/><circle cx="76" cy="-14" r="9" fill="#fff"/><circle cx="-92" cy="18" r="7" fill="#fff"/><circle cx="92" cy="18" r="7" fill="#fff"/>
  </g>`,
  scarf: `<g>
    <path d="M452 716 L436 880 Q470 896 506 880 L514 726z" fill="#FF8A3D" ${OUT}/>
    <path d="M440 838 Q472 852 508 838 L506 880 Q470 896 436 880z M448 756 Q480 770 512 756 L511 794 Q478 808 444 794z" fill="#FFD84D"/>
    <path d="M404 668 Q548 760 706 640 L716 700 Q552 826 398 730z" fill="#FF8A3D" ${OUT}/>
    <path d="M470 700 L462 762 M546 716 L548 780 M624 696 L636 756" stroke="#FFD84D" stroke-width="26"/>
  </g>`,
};

/** Accessoires dessinés sur l'écran-visage (repère local du visage). */
const ON_FACE: Record<string, string> = {
  shades: `
    <path d="M-246 -40 Q-142 -60 -40 -40 Q-36 60 -80 92 Q-142 116 -204 92 Q-248 60 -246 -40z" fill="#101B45" stroke="#FF4F9A" stroke-width="16" stroke-linejoin="round"/>
    <path d="M246 -40 Q142 -60 40 -40 Q36 60 80 92 Q142 116 204 92 Q248 60 246 -40z" fill="#101B45" stroke="#FF4F9A" stroke-width="16" stroke-linejoin="round"/>
    <path d="M-44 -30 Q0 -52 44 -30" fill="none" stroke="#FF4F9A" stroke-width="18" stroke-linecap="round"/>
    <path d="M-214 -14 L-166 58 M-178 -22 L-146 26 M70 -14 L118 58 M106 -22 L138 26" stroke="#6C8CFF" stroke-width="14" stroke-linecap="round" opacity=".75"/>`,
  hearts: [-EYE_X, EYE_X]
    .map(
      (x) => `<g transform="translate(${x} ${EYE_Y - 4})">
      <path d="M0 96 C-150 6 -118 -100 -52 -100 C-22 -100 -6 -80 0 -62 C6 -80 22 -100 52 -100 C118 -100 150 6 0 96z" fill="#FF2E7E" fill-opacity=".9" stroke="#FFD0E4" stroke-width="15" stroke-linejoin="round"/>
      <path d="M-70 -52 Q-58 -76 -34 -74" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/></g>`,
    )
    .join('') + `<path d="M-52 -18 Q0 -40 52 -18" fill="none" stroke="#FFD0E4" stroke-width="16" stroke-linecap="round"/>`,
};

/** Accessoires dessinés derrière le personnage. */
const BACK: Record<string, string> = {
  cape: `<path d="M386 700 Q548 640 716 664 Q840 900 902 1216 Q812 1168 742 1232 Q664 1176 566 1240 Q468 1176 380 1240 Q300 1172 206 1228 Q262 900 386 700z" fill="#E5283F" ${OUT}/>
    <path d="M386 700 Q548 640 716 664 Q770 780 800 900 Q560 820 320 930 Q346 800 386 700z" fill="#B3162C" opacity=".45"/>`,
};
// attache de la cape, visible devant le corps
FRONT.cape = `<g transform="translate(548 704) rotate(-8)"><path d="M-150 -6 Q0 60 150 -30 L156 18 Q0 112 -156 42z" fill="#E5283F" ${OUT}/><circle cx="0" cy="44" r="24" fill="#FFC531" stroke="#fff" stroke-width="7"/></g>`;

const DEFS = `<defs>
  <radialGradient id="lj-patch"><stop offset="0.86" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY}" stop-opacity="0"/></radialGradient>
  <clipPath id="lj-screen"><polygon points="${SCREEN}"/></clipPath>
</defs>`;

export class Mascot {
  readonly el: HTMLDivElement;
  private img: HTMLImageElement;
  private back: HTMLElement;
  private front: HTMLElement;
  private bubble: HTMLDivElement;
  private mood: Mood = 'happy';
  private eq: Equipped = { skin: 'classic', head: null, face: null, neck: null };
  private moodTimer: ReturnType<typeof setTimeout> | null = null;
  private blinkTimer: ReturnType<typeof setTimeout> | null = null;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  private baseMood: Mood = 'happy';

  constructor(equipped: Equipped) {
    this.img = h('img', { class: 'mascot-img', alt: 'LayJou', draggable: 'false' });
    this.back = h('div', { class: 'mascot-layer' });
    this.front = h('div', { class: 'mascot-layer' });
    this.bubble = h('div', { class: 'bubble' });
    this.el = h(
      'div',
      { class: 'mascot' },
      h('div', { class: 'mascot-shadow' }),
      h('div', { class: 'mascot-body' }, this.back, this.img, this.front),
      this.bubble,
    );
    this.equip(equipped);
    this.scheduleBlink();
  }

  equip(eq: Equipped): void {
    this.eq = { ...eq };
    const src = `./mascot/${eq.skin ?? 'classic'}.webp`;
    if (this.img.getAttribute('src') !== src) this.img.src = src;
    this.render();
  }

  /** Humeur de fond (reste jusqu'à nouvel ordre). */
  setMood(mood: Mood): void {
    this.baseMood = mood;
    if (!this.moodTimer) this.apply(mood);
  }

  /** Expression passagère, puis retour à l'humeur de fond. */
  flash(mood: Mood, ms = 1200): void {
    if (this.moodTimer) clearTimeout(this.moodTimer);
    this.apply(mood);
    this.moodTimer = setTimeout(() => {
      this.moodTimer = null;
      this.apply(this.baseMood);
    }, ms);
  }

  /** Joue une animation de corps : 'hop', 'cheer', 'shake', 'fire'. */
  act(anim: 'hop' | 'cheer' | 'shake' | 'fire'): void {
    const body = this.el.querySelector('.mascot-body') as HTMLElement;
    body.classList.remove('hop', 'cheer', 'shake', 'fire');
    void body.offsetWidth;
    body.classList.add(anim);
  }

  say(text: string, ms = 1800): void {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubble.textContent = text;
    this.bubble.classList.remove('show');
    void this.bubble.offsetWidth;
    this.bubble.classList.add('show');
    this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('show'), ms);
  }

  destroy(): void {
    [this.moodTimer, this.blinkTimer, this.bubbleTimer].forEach((x) => x && clearTimeout(x));
    this.el.remove();
  }

  private apply(mood: Mood): void {
    if (this.mood === mood) return;
    this.mood = mood;
    this.el.dataset.mood = mood;
    this.render();
  }

  private scheduleBlink(): void {
    this.blinkTimer = setTimeout(
      () => {
        if (this.mood === 'happy' && this.el.isConnected && !this.moodTimer) {
          this.apply('blink');
          setTimeout(() => this.mood === 'blink' && this.apply(this.baseMood), 140);
        }
        this.scheduleBlink();
      },
      2600 + Math.random() * 2600,
    );
  }

  private render(): void {
    const { head, face, neck } = this.eq;
    const faceLayer = FACES[this.mood] + (face ? (ON_FACE[face] ?? '') : '');
    const front =
      (neck ? (FRONT[neck] ?? '') : '') +
      (faceLayer
        ? `<g clip-path="url(#lj-screen)"><g transform="translate(${FACE.cx} ${FACE.cy}) rotate(${FACE.tilt})">${faceLayer}</g></g>`
        : '') +
      (head ? (FRONT[head] ?? '') : '');
    this.front.innerHTML = front ? `<svg viewBox="${VIEW}">${DEFS}${front}</svg>` : '';
    const back = neck ? (BACK[neck] ?? '') : '';
    this.back.innerHTML = back ? `<svg viewBox="${VIEW}">${back}</svg>` : '';
  }
}
