#!/usr/bin/env python3
"""
Pipeline d'assets de Layjou Blocks.

À partir de l'illustration d'origine (assets/source/layjou-original.png, fond blanc) :
  1. détoure le personnage (flood-fill du fond depuis les bords) ;
  2. ajoute un contour « sticker » blanc + une ombre douce ;
  3. génère les skins par remappage de teinte (le visage/écran reste intact) ;
  4. exporte en WebP dans public/mascot/<skin>.webp

Le repère des overlays (accessoires, expressions) reste celui de l'image d'origine
(1080 x 1456) : l'image exportée ajoute simplement PAD pixels de marge de chaque côté.

Usage : python3 scripts/build_assets.py
"""
from __future__ import annotations

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "layjou-original.png")
OUT = os.path.join(ROOT, "public", "mascot")

PAD = 36          # marge (px, repère d'origine) autour de l'image pour le contour sticker
SCALE = 0.625     # facteur d'export
OUTLINE = 13      # épaisseur du contour sticker (px, repère d'origine)

# Centres de teinte de l'illustration d'origine
TEAL_H, PINK_H = 184.0, 332.0

# id -> paramètres de recoloration. p* = couleur principale (turquoise), a* = accent (rose)
#   h : teinte cible ; s / v : multiplicateurs saturation / luminosité ; warm : dérive de teinte dans les ombres
SKINS: dict[str, dict | None] = {
    "classic": None,
    "bubblegum": {"p": dict(h=330, s=0.80, v=1.16), "a": dict(h=186, s=1.0, v=0.92)},
    "jungle": {"p": dict(h=146, s=0.92, v=0.98), "a": dict(h=28, s=1.0, v=1.0)},
    "lava": {"p": dict(h=6, s=0.88, v=1.10), "a": dict(h=46, s=1.0, v=1.0)},
    "galaxy": {"p": dict(h=262, s=0.74, v=1.10), "a": dict(h=172, s=0.9, v=0.96)},
    "gold": {"p": dict(h=43, s=0.90, v=1.17, warm=110), "a": dict(h=350, s=1.05, v=0.90)},
    "ninja": {"p": dict(h=228, s=0.34, v=0.36), "a": dict(h=96, s=1.0, v=0.98)},
}


def rgb_to_hsv(rgb: np.ndarray):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0)
    gc = np.where(m, (mx - g) / np.where(m, d, 1), 0)
    bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    h = np.where(m, h, 0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return h * 360.0, s, mx


def hsv_to_rgb(h: np.ndarray, s: np.ndarray, v: np.ndarray):
    h = (h % 360.0) / 60.0
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def smooth_band(h: np.ndarray, lo: float, hi: float, soft: float = 8.0):
    """Poids 1 dans [lo, hi], décroissance douce sur `soft` degrés."""
    up = np.clip((h - (lo - soft)) / soft, 0, 1)
    down = np.clip(((hi + soft) - h) / soft, 0, 1)
    return np.minimum(up, down)


def flood_mask(img: Image.Image, seeds, thresh: int) -> np.ndarray:
    t = img.copy()
    mark = (255, 0, 255)
    for xy in seeds:
        if t.getpixel(xy) != mark:
            ImageDraw.floodfill(t, xy, mark, thresh=thresh)
    a = np.asarray(t)
    return (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255)


def face_mask(rgb: np.ndarray) -> np.ndarray:
    """Masque de l'écran-visage (bleu nuit + yeux/bouche/sourcils inclus)."""
    a = rgb.astype(int)
    navy = (abs(a[..., 0] - 2) < 40) & (abs(a[..., 1] - 67) < 40) & (abs(a[..., 2] - 154) < 40)
    m = Image.fromarray((navy * 255).astype("uint8")).copy()
    ImageDraw.floodfill(m, (520, 330), 128)
    scr = np.array(m) == 128
    m2 = Image.fromarray((scr * 255).astype("uint8")).copy()
    ImageDraw.floodfill(m2, (0, 0), 100)
    holes = np.array(m2) == 0
    full = Image.fromarray(((scr | holes) * 255).astype("uint8"))
    # légère dilatation + adoucissement pour une transition propre sur le bord de l'écran
    full = full.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    return np.asarray(full).astype(np.float32) / 255.0


def recolor(rgb: np.ndarray, keep: np.ndarray, spec: dict) -> np.ndarray:
    f = rgb.astype(np.float32) / 255.0
    h, s, v = rgb_to_hsv(f)
    out_h, out_s, out_v = h.copy(), s.copy(), v.copy()
    for key, center, lo, hi in (("p", TEAL_H, 160, 202), ("a", PINK_H, 300, 356)):
        p = spec[key]
        w = smooth_band(h, lo, hi) * (1.0 - keep)
        # les pixels peu saturés (reflets, anticrénelage vers le blanc) sont moins affectés en luminosité
        sat_w = np.clip(s / 0.55, 0, 1)
        new_h = h + (p["h"] - center)
        if p.get("warm"):
            new_h = new_h - np.clip(0.86 - v, 0, 1) * p["warm"]
        new_s = np.clip(s * p["s"], 0, 1)
        new_v = np.clip(v * (1 + (p["v"] - 1) * sat_w), 0, 1)
        out_h = np.where(w > 0, new_h, out_h)
        out_s = out_s + (new_s - out_s) * w
        out_v = out_v + (new_v - out_v) * w
    res = hsv_to_rgb(out_h, out_s, out_v)
    return np.clip(res * 255.0 + 0.5, 0, 255).astype(np.uint8)


def sticker(rgb: np.ndarray, alpha: np.ndarray) -> Image.Image:
    """Compose personnage + contour blanc + ombre douce sur un canevas élargi de PAD."""
    h, w = alpha.shape
    cw, ch = w + 2 * PAD, h + 2 * PAD
    a_img = Image.new("L", (cw, ch), 0)
    a_img.paste(Image.fromarray((alpha * 255).astype("uint8")), (PAD, PAD))

    # contour : dilatation ronde (flou + seuil) puis anticrénelage
    dil = a_img.filter(ImageFilter.GaussianBlur(OUTLINE * 0.62)).point(lambda p: 255 if p > 18 else 0)
    dil = dil.filter(ImageFilter.GaussianBlur(1.4))

    # ombre douce bleutée, légèrement décalée vers le bas
    sh = Image.new("L", (cw, ch), 0)
    sh.paste(dil, (0, 9))
    sh = sh.filter(ImageFilter.GaussianBlur(9)).point(lambda p: int(p * 0.30))

    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (cw, ch), (16, 52, 122, 255))
    shadow.putalpha(sh)
    canvas = Image.alpha_composite(canvas, shadow)
    white = Image.new("RGBA", (cw, ch), (255, 255, 255, 255))
    white.putalpha(dil)
    canvas = Image.alpha_composite(canvas, white)

    char = Image.new("RGBA", (cw, ch), (255, 255, 255, 0))
    char_rgb = Image.fromarray(rgb, "RGB")
    char.paste(char_rgb, (PAD, PAD))
    # le personnage est collé sur le blanc du contour : bords nets, sans halo
    char.putalpha(a_img.filter(ImageFilter.GaussianBlur(0.8)))
    canvas = Image.alpha_composite(canvas, char)
    return canvas


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(SRC).convert("RGB")
    w, h = src.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    bg = flood_mask(src, seeds, thresh=10)
    alpha = (~bg).astype(np.float32)
    rgb = np.asarray(src).copy()
    keep = face_mask(rgb)

    for skin, spec in SKINS.items():
        colored = rgb if spec is None else recolor(rgb, keep, spec)
        img = sticker(colored, alpha)
        ow, oh = round(img.width * SCALE), round(img.height * SCALE)
        img = img.resize((ow, oh), Image.LANCZOS)
        path = os.path.join(OUT, f"{skin}.webp")
        img.save(path, "WEBP", quality=90, method=6)
        print(f"{skin:10s} -> {os.path.relpath(path, ROOT)}  {ow}x{oh}  {os.path.getsize(path) // 1024} Ko")

    # version HD du skin classique pour l'icône et le splash
    hd = sticker(rgb, alpha)
    hd.save(os.path.join(ROOT, "assets", "source", "layjou-sticker.png"))
    print("layjou-sticker.png", hd.size)


if __name__ == "__main__":
    main()
