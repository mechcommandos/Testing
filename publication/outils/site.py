#!/usr/bin/env python3
"""Construit les pages web à héberger sur layjou.com à partir des textes du kit :

    store/politique-de-confidentialite.md  →  site/confidentialite/index.html   (https://layjou.com/confidentialite/)
    store/assistance.md                    →  site/support/index.html           (https://layjou.com/support/)
    + site/app-ads.txt                                                           (https://layjou.com/app-ads.txt)

    python3 publication/outils/site.py

Pour remplir les champs entre crochets ([Nom de l'éditeur…], [adresse e-mail de contact]…), renseignez VALEURS ci-dessous
puis relancez le script ; tant qu'il en reste, le script les liste.
"""
import html
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # publication/
SITE = os.path.join(ROOT, 'site')

# Champs à remplir (laisser la valeur vide pour garder le texte entre crochets)
VALEURS = {
    "[Nom de l'éditeur ou de la société]": '',
    '[Publisher name]': '',
    '[adresse ou pays]': '',
    '[address or country]': '',
    '[adresse e-mail de contact]': '',
    '[contact email]': '',
}

APP_ADS = 'google.com, pub-6003645213510535, DIRECT, f08c47fec0942fa0\n'

CSS = """
:root { --bg: #f6f3ff; --card: #ffffff; --ink: #1f1640; --soft: #5b5378; --accent: #ff4f9a; --accent2: #2fb0ff; --line: #e4ddf7; }
@media (prefers-color-scheme: dark) { :root { --bg: #120d26; --card: #1c1538; --ink: #f1edff; --soft: #b7add6; --line: #33295a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
header { background: linear-gradient(135deg, var(--accent), #8a4dff 60%, var(--accent2)); color: #fff; padding: 28px 16px 22px; text-align: center; }
header b { display: block; font-size: 26px; letter-spacing: .5px; }
header nav { margin-top: 10px; display: flex; justify-content: center; gap: 8px; }
header nav a { color: #fff; text-decoration: none; padding: 4px 14px; border-radius: 99px; background: rgba(255,255,255,.18); font-weight: 600; }
main { max-width: 760px; margin: -12px auto 40px; padding: 0 16px; }
section { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 8px 22px 18px; margin-top: 18px; }
h1 { font-size: 24px; margin: 18px 0 4px; } h2 { font-size: 18px; margin: 22px 0 6px; }
p, li { color: var(--ink); } em { color: var(--soft); }
ul { padding-left: 22px; } li { margin: 4px 0; }
a { color: var(--accent2); overflow-wrap: anywhere; }
footer { text-align: center; color: var(--soft); font-size: 13px; padding-bottom: 30px; }
"""


def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', t)
    t = re.sub(r'(https?://[^\s<)]+[^\s<).,;])', r'<a href="\1">\1</a>', t)
    return t


def md_to_html(md):
    out, para, items = [], [], []

    def flush():
        if para:
            out.append('<p>' + '<br>'.join(inline(x) for x in para) + '</p>'); para.clear()
        if items:
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>'); items.clear()
    for line in md.splitlines():
        s = line.rstrip()
        if not s:
            flush(); continue
        if s.startswith('# '):
            flush(); out.append(f'<h1>{inline(s[2:])}</h1>')
        elif s.startswith('## '):
            flush(); out.append(f'<h2>{inline(s[3:])}</h2>')
        elif s.startswith('- '):
            if para:
                flush()
            items.append(s[2:])
        else:
            if items:
                flush()
            para.append(s)
    flush()
    return '\n'.join(out)


def page(src, dest, title, langs_titles):
    md = open(os.path.join(ROOT, 'store', src), encoding='utf-8').read()
    for k, v in VALEURS.items():
        if v:
            md = md.replace(k, v)
    left = sorted(set(re.findall(r'\[[^\]\n]{3,60}\]', md)))
    parts = [p.strip() for p in md.split('\n---\n')]
    sections = ''.join(f'<section id="{lg}" lang="{lg}">\n{md_to_html(p)}\n</section>\n' for lg, p in zip(('fr', 'en'), parts))
    nav = ''.join(f'<a href="#{lg}">{lt}</a>' for lg, lt in langs_titles)
    doc = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="robots" content="index, follow">
<style>{CSS}</style>
</head>
<body>
<header><b>Layjou</b><nav>{nav}</nav></header>
<main>
{sections}</main>
<footer>Layjou · Battle · Blocks · Bubble · Kart · Puzzle · Run</footer>
</body>
</html>
"""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(doc)
    print('✓', os.path.relpath(dest, ROOT), '— champs à remplir :', ', '.join(left) if left else 'aucun')


def main():
    page('politique-de-confidentialite.md', os.path.join(SITE, 'confidentialite', 'index.html'),
         'Politique de confidentialité — jeux Layjou', [('fr', 'Français'), ('en', 'English')])
    page('assistance.md', os.path.join(SITE, 'support', 'index.html'),
         'Assistance — jeux Layjou', [('fr', 'Français'), ('en', 'English')])
    with open(os.path.join(SITE, 'app-ads.txt'), 'w', encoding='utf-8') as f:
        f.write(APP_ADS)
    print('✓ site/app-ads.txt')


if __name__ == '__main__':
    main()
