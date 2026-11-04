# Cliffmatt Ad Studio

Book cover in, realistic 3D mockup and branded Facebook ads in every size out.

**Open the app:** https://achoka2.github.io/cliffmatt-ad-studio/

Works in any modern browser on a phone or computer, keeps working offline once opened, and can be installed like an app (Chrome: ⋮ → *Install app*; iPhone Safari: Share → *Add to Home Screen*).

## How it works (5 steps)
1. **Book** – paste a cover (⌘V / Ctrl+V), drop a file or browse. Title, author, price. Extra covers for a series.
2. **3D mockup** – hardcover, paperback, flat or phone; six angles; fine-tune turn, camera height, thickness, shine.
3. **Design** – 16 designs in categories (website & catalogue, promotions, build trust, series, scenes, your own).
4. **Customise** – words, what shows on the ad, background, book position, safe zones.
5. **Download** – every Facebook size in one ZIP (1:1, 4:5, 9:16, 1.91:1), video ad, 10-card carousel, ad copy.

Also: **Batch** (many covers → one ZIP) and **Resize an ad** (fit a finished design to every size).

Brands, logos and uploaded backgrounds are saved in the browser you use; use **Settings → Back up brands** to move them to another device. Claude features (reading covers, writing ad words) work inside claude.ai, or here with your own Anthropic API key in Settings.

## Project layout
- `src/body.html`, `src/css/app.css`, `src/js/*.js` – the source (joined in file-name order).
- `src/js/40-designs.js` – all ad designs; see `DESIGNS.md` to add one.
- `vendor/`, `fonts/`, `icons/` – libraries (three.js r149, JSZip, mp4-muxer), fonts and app icons.
- `build.py` – builds the site at the repo root (`index.html`, `css/`, `js/app.js`, `sw.js`, `manifest.webmanifest`) and `dist/ad-studio-single-file.html` (one self-contained file).

Run `python3 build.py` after editing anything in `src/`, commit, then publish:

```
git push origin main
git push origin main:gh-pages   # GitHub Pages serves the gh-pages branch
```
