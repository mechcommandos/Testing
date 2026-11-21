# Régénère les icônes et écrans de démarrage Android/iOS : python3 design/icon/generate.py .
import glob, os, sys
from PIL import Image, ImageDraw
R = sys.argv[1]
D = R + '/design/icon/'
full = Image.open(D + 'icon-1024.png').convert('RGBA')
bg = Image.open(D + 'background.png').convert('RGBA')
fg = Image.open(D + 'foreground.png').convert('RGBA')
splash_src = Image.open(D + 'presentation-orange.png').convert('RGB').crop((450, 510, 1550, 1610))  # icône + titre
ORANGE = splash_src.getpixel((5, 5))
LANCZOS = Image.LANCZOS

def masked(img, size, shape):
    im = img.resize((size, size), LANCZOS)
    m = Image.new('L', (size * 4, size * 4), 0)
    d = ImageDraw.Draw(m)
    if shape == 'round': d.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    else: d.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * 0.22), fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), m.resize((size, size), LANCZOS))
    return out

res = R + '/android/app/src/main/res/'
for f in glob.glob(res + 'mipmap-*/ic_launcher*.png'):
    w = Image.open(f).size[0]
    if f.endswith('_foreground.png'):
        # couche avant de l'icône adaptative : le contenu tient dans la zone sûre (66/108)
        out = Image.new('RGBA', (w, w), (0, 0, 0, 0))
        c = fg.resize((int(w * 0.66),) * 2, LANCZOS)
        out.alpha_composite(c, ((w - c.width) // 2, (w - c.height) // 2))
        out.save(f)
        bg.resize((w, w), LANCZOS).convert('RGB').save(f.replace('_foreground', '_background'), optimize=True)
    elif f.endswith('_round.png'):
        masked(full, w, 'round').save(f)
    else:
        masked(full, w, 'rect').save(f)

# écrans de démarrage : fond orange + visuel centré
def splash(w, h, frac):
    out = Image.new('RGB', (w, h), ORANGE)
    s = int(min(w, h) * frac)
    out.paste(splash_src.resize((s, s), LANCZOS), ((w - s) // 2, (h - s) // 2))
    return out
for f in glob.glob(res + 'drawable*/splash.png'):
    w, h = Image.open(f).size
    splash(w, h, 0.8).save(f, optimize=True)
for f in glob.glob(R + '/ios/App/App/Assets.xcassets/Splash.imageset/*.png'):
    splash(2732, 2732, 0.45).save(f, optimize=True)

# iOS : icône 1024 sans transparence (Apple applique ses propres coins arrondis)
full.convert('RGB').save(R + '/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', optimize=True)
print('ok', ORANGE)
