# Adding a design

Designs live in the `TPL` object: `src/js/40-designs.js` holds the originals and `src/js/41-mockup-designs.js` the mockup-style ones (a new file works too: `Object.assign(TPL, { ... })` in a file numbered 41–49). Each design is:

```js
mydesign: {
  name: 'My design', dark: true,                 // dark = white text by default
  bg(ctx, L, D) { /* paint the background; L.W, L.H, L.k = 'sq' | 'pt' | 'st' | 'ls' */ },
  rects: {                                        // [x, y, w, h] as fractions of the canvas
    sq: { book: [.5, .1, .45, .75], headline: [.05, .2, .45, .3], cta: [.05, .7, .4, .08] },
    pt: { ... }, st: { ... }, ls: { ... }         // 4:5, 9:16 (keep 14% top / 20% bottom clear), 1.91:1
  },
  styles(D, th, L) { return { book: { align: 'center' }, headline: { fam: FONT.anton, wt: 400, upper: true, color: th.ink } }; }
}
```

Elements you can place: `book` (with `variant`: `main`, `top`, `lie`, `stack`, `pair`, `collection`, `fan`, `duoTop`, `topA`, `topB`, `tilt`, `ajar`, `open`), `book2` (a second book with its own variant; it does not follow the drag), `device` (phone), `chat`, `logo`, `kicker` (small label above the headline: `style: 'pill'` or spaced capitals with `bar: true`), `headline`, `sub`, `offer`, `deal`, `quote`, `steps`, `price`, `cta`, `site`, `tag`.

A rect may run past the canvas (negative `x`/`y`, or `x + w > 1`) to bleed a book off the edge, as in *Book banner*.

New camera set-ups for book variants go in `VARIANTS` in `src/js/20-product.js`: a list of books (`pose: 'stand' | 'lie'`, `yaw`, `x`, `y`, `z`, `open` = cover opening in degrees) and the camera height `elev` (90 = straight down).

Then add the id to `TPL_ORDER` and a line to `DESIGN_META` (category + one-line description). Categories: `shop`, `promo`, `trust`, `series`, `scene`, `own` (add new ones to `CATEGORIES`).

Run `python3 build.py`, check every size, commit.
