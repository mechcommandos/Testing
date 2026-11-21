"""Build the splash images: app icon from the artwork + official Layjou logo (white sticker outline) + BUBBLE pill."""
import sys
from PIL import Image, ImageFilter, ImageDraw

art_dir = sys.argv[1]
logo = Image.open('resources/layjou-logo.png').convert('RGBA')

def sticker(w):
    h = int(logo.height * w / logo.width)
    l = logo.resize((w, h), Image.LANCZOS)
    r = int(w * 0.017)
    pad = r + 4
    c = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    c.alpha_composite(l, (pad, pad))
    a = c.split()[3].filter(ImageFilter.MaxFilter(2 * r + 1)).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new('RGBA', c.size, (255, 255, 255, 0))
    out.putalpha(a)
    out.alpha_composite(c)
    return out

if __name__ == '__main__':
    sticker(900).save('www/img/layjou-logo.png')
    for src, dst in [('4.webp', 'splash.png'), ('5.webp', 'splash-dark.png')]:
        orig = Image.open(f'{art_dir}/{src}').convert('RGBA')
        im = orig.copy()
        bg = im.getpixel((20, 20))
        ImageDraw.Draw(im).rectangle((0, 1180, 2000, 1560), fill=bg)  # remove old wordmark
        s = sticker(900)
        im.alpha_composite(s, ((2000 - s.width) // 2, 1200))
        pill = orig.crop((770, 1395, 1230, 1515))
        ImageDraw.Draw(pill).rectangle((140, 0, 200, 14), fill=bg)  # leftover of the old "y"
        im.paste(pill, ((2000 - pill.width) // 2, 1200 + s.height + 15))
        im.convert('RGB').resize((2732, 2732), Image.LANCZOS).save('assets/' + dst)
