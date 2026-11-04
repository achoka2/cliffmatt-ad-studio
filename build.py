#!/usr/bin/env python3
"""Build Cliffmatt Ad Studio.

Outputs
  ./index.html, ./css/, ./js/app.js, ./sw.js, ./manifest.webmanifest  -> the GitHub Pages web app (repo root)
  ./dist/ad-studio-single-file.html                                    -> one self-contained file (Claude artifact / offline)

Run:  python3 build.py
"""
import base64, hashlib, json, pathlib

R = pathlib.Path(__file__).resolve().parent
SRC = R / 'src'

FONTS = [
    ('Anton', 400, 'anton-latin-400-normal.woff2'),
    ('Montserrat', 500, 'montserrat-latin-500-normal.woff2'),
    ('Montserrat', 600, 'montserrat-latin-600-normal.woff2'),
    ('Montserrat', 700, 'montserrat-latin-700-normal.woff2'),
    ('Montserrat', 800, 'montserrat-latin-800-normal.woff2'),
    ('Montserrat', 900, 'montserrat-latin-900-normal.woff2'),
    ('DM Serif Display', 400, 'dm-serif-display-latin-400-normal.woff2'),
    ('Plus Jakarta Sans', 400, 'plus-jakarta-sans-latin-400-normal.woff2'),
    ('Plus Jakarta Sans', 600, 'plus-jakarta-sans-latin-600-normal.woff2'),
    ('Plus Jakarta Sans', 700, 'plus-jakarta-sans-latin-700-normal.woff2'),
    ('Plus Jakarta Sans', 800, 'plus-jakarta-sans-latin-800-normal.woff2'),
]
VENDOR = ['three.min.js', 'jszip.min.js', 'mp4-muxer.min.js']
TITLE = 'Cliffmatt Ad Studio'
DESC = 'Book cover in, realistic 3D mockup and branded Facebook ads in every size out.'


def font_face(fam, wt, src):
    return f'@font-face{{font-family:"{fam}";font-style:normal;font-weight:{wt};font-display:block;src:{src} format("woff2")}}\n'


def main():
    parts = sorted((SRC / 'js').glob('*.js'))
    app_js = "(() => {\n'use strict';\n" + '\n'.join(p.read_text() for p in parts) + '\n})();\n'
    css = (SRC / 'css' / 'app.css').read_text()
    body = (SRC / 'body.html').read_text()
    for name, code in [('app.js', app_js)] + [(v, (R / 'vendor' / v).read_text()) for v in VENDOR]:
        assert '</script' not in code.lower(), name

    h = hashlib.sha1((app_js + css + body).encode()).hexdigest()[:10]

    # ---- web app (GitHub Pages) ----
    (R / 'css').mkdir(exist_ok=True); (R / 'js').mkdir(exist_ok=True)
    (R / 'css' / 'app.css').write_text(css)
    (R / 'css' / 'fonts.css').write_text(''.join(font_face(f, w, f"url('../fonts/{n}')") for f, w, n in FONTS))
    (R / 'js' / 'app.js').write_text(app_js)
    scripts = ''.join(f'<script src="vendor/{v}?v={h}"></script>\n' for v in VENDOR) + f'<script src="js/app.js?v={h}"></script>\n'
    index = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#0F2A49">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Ad Studio">
<link rel="stylesheet" href="css/fonts.css?v={h}">
<link rel="stylesheet" href="css/app.css?v={h}">
<style>:root{{color-scheme:light}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
</head>
<body>
{body}
{scripts}</body>
</html>
'''
    (R / 'index.html').write_text(index)
    (R / 'manifest.webmanifest').write_text(json.dumps({
        'name': TITLE, 'short_name': 'Ad Studio', 'description': DESC,
        'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'any',
        'background_color': '#0F2A49', 'theme_color': '#0F2A49',
        'icons': [
            {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
        ]
    }, indent=2))
    assets = ['./', 'index.html', 'manifest.webmanifest', f'css/app.css?v={h}', f'css/fonts.css?v={h}', f'js/app.js?v={h}'] + \
             [f'vendor/{v}?v={h}' for v in VENDOR] + [f'fonts/{n}' for _, _, n in FONTS] + \
             ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png']
    sw = f'''// Offline cache for Cliffmatt Ad Studio (version {h})
const CACHE = 'adstudio-{h}';
const ASSETS = {json.dumps(assets)};
self.addEventListener('install', e => {{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {{
    e.respondWith(fetch(req).then(r => {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; }})
      .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }}
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {{ if (r.ok) {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }} return r; }})));
}});
'''
    (R / 'sw.js').write_text(sw)
    (R / '.nojekyll').write_text('')

    # ---- single file (Claude artifact / offline copy) ----
    fonts_inline = ''.join(font_face(f, w, 'url(data:font/woff2;base64,' + base64.b64encode((R / 'fonts' / n).read_bytes()).decode() + ')') for f, w, n in FONTS)
    single = (f'<title>{TITLE}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n{fonts_inline}\n{css}\n</style>\n{body}\n'
              + ''.join(f'<script>{(R / "vendor" / v).read_text()}</script>\n' for v in VENDOR) + f'<script>{app_js}</script>\n')
    (R / 'dist').mkdir(exist_ok=True)
    (R / 'dist' / 'ad-studio-single-file.html').write_text(single)
    print(f'built {h}: web app + single file ({len(single) // 1024} KB)')


if __name__ == '__main__':
    main()
