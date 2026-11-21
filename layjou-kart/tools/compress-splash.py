"""Compresse les écrans de démarrage générés par capacitor-assets (palette 256 couleurs + tramage).

    python3 tools/compress-splash.py      (après `npm run assets`)
"""
import glob, os
from PIL import Image

files = glob.glob('android/app/src/main/res/drawable*/splash.png') + glob.glob('ios/App/App/Assets.xcassets/Splash.imageset/*.png')
before = after = 0
for f in files:
    before += os.path.getsize(f)
    im = Image.open(f).convert('RGB')
    im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(f, optimize=True)
    after += os.path.getsize(f)
print(f'{len(files)} fichiers : {before / 1e6:.1f} Mo → {after / 1e6:.1f} Mo')
