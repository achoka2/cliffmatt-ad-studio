# Adding a design

Designs live in `src/js/40-designs.js` in the `TPL` object. Each design is:

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

Elements you can place: `book` (with `variant`: `main`, `top`, `lie`, `stack`, `pair`, `collection`), `device` (phone), `chat`, `logo`, `headline`, `sub`, `offer`, `deal`, `quote`, `steps`, `price`, `cta`, `site`, `tag`.

Then add the id to `TPL_ORDER` and a line to `DESIGN_META` (category + one-line description). Categories: `shop`, `promo`, `trust`, `series`, `scene`, `own` (add new ones to `CATEGORIES`).

Run `python3 build.py`, check every size, commit.
