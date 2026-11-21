# Logo Layjou « autocollant » et écrans de démarrage : python3 design/logo/generate.py .
import glob, sys
from PIL import Image, ImageFilter
R = sys.argv[1]
logo = Image.open(R + '/design/logo/layjou-logo.png').convert('RGBA')
art = Image.open(R + '/design/icon/presentation-orange.png').convert('RGB')
ORANGE = art.getpixel((5, 5))
icon = art.crop((680, 560, 1330, 1210))
pill = art.crop((850, 1415, 1160, 1525))
L = Image.LANCZOS

def sticker(width):
    """Logo à la largeur voulue, contour blanc épais (≈1,7 % de la largeur), fond transparent."""
    lg = logo.resize((width, round(logo.height * width / logo.width)), L)
    pad = max(2, round(width * 0.017))
    k = pad * 2 + 1
    canvas = Image.new('RGBA', (lg.width + 4 * pad, lg.height + 4 * pad), (0, 0, 0, 0))
    canvas.paste(lg, (2 * pad, 2 * pad))
    a = canvas.split()[3].filter(ImageFilter.MaxFilter(k if k <= 51 else 51)).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new('RGBA', canvas.size, (255, 255, 255, 0)); out.putalpha(a)
    out.alpha_composite(canvas)
    return out

# logo du menu du jeu
sticker(900).save(R + '/www/assets/layjou-logo.png', optimize=True)

def splash(w, h, frac):
    size = int(min(w, h) * frac)          # hauteur totale du bloc
    ic = icon.resize((int(size * 0.55),) * 2, L)
    st = sticker(int(size * 0.62))
    pl = pill.resize((int(size * 0.3), int(size * 0.3 * pill.height / pill.width)), L)
    total = ic.height + st.height + pl.height
    out = Image.new('RGB', (w, h), ORANGE)
    y = (h - total) // 2
    out.paste(ic, ((w - ic.width) // 2, y)); y += ic.height
    out.paste(st, ((w - st.width) // 2, y), st); y += st.height - int(st.height * 0.08)
    out.paste(pl, ((w - pl.width) // 2, y))
    return out

for f in glob.glob(R + '/android/app/src/main/res/drawable*/splash.png'):
    w, h = Image.open(f).size
    splash(w, h, 0.8).save(f, optimize=True)
for f in glob.glob(R + '/ios/App/App/Assets.xcassets/Splash.imageset/*.png'):
    splash(2732, 2732, 0.45).save(f, optimize=True)
print('ok')
