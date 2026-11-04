/* =========================================================================
   Mockup-style designs (ideas from popular book mockup sites, drawn from
   scratch): two copies from above, big banner books, open book, fanned
   series, two-tone wave and an outlined frame. Every one has a layout for
   1:1, 4:5, 9:16 and 1.91:1.
   ========================================================================= */

// A second book in the same ad. It never follows the drag / position sliders.
EL.book2 = function (ctx, L, D, rect, st, A) {
  return EL.book(ctx, L, Object.assign({}, D, { track: null, pos: { scale: 1, x: 0, y: 0 } }), rect, Object.assign({ variant: 'topB' }, st), A);
};
// Small label above the headline: a pill, or spaced capitals with a short bar.
EL.kicker = function (ctx, L, D, rect, st, A) {
  const t = D.text.kicker; if (!D.show.kicker || !t) return;
  const an = anim(A, 'kicker'); ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy * .5);
  if (st.style === 'pill') labelPill(ctx, t, rect, st);
  else {
    const label = String(t).toUpperCase(), h = rect.h, chars = [...label], sp = st.spacing ?? .16, fam = st.fam || FONT.mont, wt = st.wt || 800;
    const bar = st.bar ? h * 1.5 : 0, gap = st.bar ? h * .45 : 0;
    let fs = h * .78; const width = () => { ctx.font = `${wt} ${fs}px ${fam}`; return chars.reduce((a, c) => a + ctx.measureText(c).width, 0) + fs * sp * (chars.length - 1); };
    let tw = width(); while (tw > rect.w - bar - gap && fs > 6) { fs *= .94; tw = width(); }
    const total = bar + gap + tw, x0 = st.align === 'center' ? rect.x + (rect.w - total) / 2 : st.align === 'right' ? rect.x + rect.w - total : rect.x, cy = rect.y + h / 2;
    ctx.fillStyle = st.color || '#111';
    if (bar) { rr(ctx, x0, cy - h * .06, bar, h * .12, h * .06); ctx.fill(); }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; let x = x0 + bar + gap;
    for (const c of chars) { ctx.fillText(c, x, cy + fs * .04); x += ctx.measureText(c).width + fs * sp; }
  }
  ctx.restore();
};
Object.assign(TIMELINE, { book2: [.25, 1.45], kicker: [.7, 1.3] });

// ---------- background helpers ----------
function studioBackdrop(ctx, W, H, P, floorY) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffffff'); g.addColorStop(floorY, hsl(P.h, .12, .93)); g.addColorStop(1, hsl(P.h, .14, .84)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, H * floorY, 0, W / 2, H * floorY, Math.max(W, H) * .6); r.addColorStop(0, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
}
// Bauhaus-style tiles: quarter circles, half circles, dots, triangles and stripes.
function geoTiles(ctx, x0, y0, w, h, rows, cols, colors, seed) {
  const rnd = seeded(seed), tw = w / cols, th = h / rows, pick = () => colors[Math.floor(rnd() * colors.length)];
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * tw, y = y0 + r * th, bgc = pick(); let fg = pick(); while (fg === bgc) fg = pick();
    ctx.fillStyle = bgc; ctx.fillRect(x - .5, y - .5, tw + 1, th + 1); ctx.fillStyle = fg;
    const k = Math.floor(rnd() * 6), m = Math.min(tw, th);
    ctx.beginPath();
    if (k === 0) { const cx = rnd() > .5 ? x : x + tw, cy = rnd() > .5 ? y : y + th; ctx.moveTo(cx, cy); ctx.arc(cx, cy, m, 0, Math.PI * 2); }
    else if (k === 1) { const a = Math.floor(rnd() * 4) * Math.PI / 2; ctx.save(); ctx.translate(x + tw / 2, y + th / 2); ctx.rotate(a); ctx.arc(0, th / 2, m / 2, Math.PI, 0); ctx.restore(); }
    else if (k === 2) ctx.arc(x + tw / 2, y + th / 2, m * .34, 0, Math.PI * 2);
    else if (k === 3) { if (rnd() > .5) { ctx.moveTo(x, y); ctx.lineTo(x + tw, y + th); ctx.lineTo(x, y + th); } else { ctx.moveTo(x + tw, y); ctx.lineTo(x + tw, y + th); ctx.lineTo(x, y + th); } }
    else if (k === 4) { for (let i = 0; i < 4; i++) ctx.rect(x, y + th * (i / 4 + .06), tw, th * .11); }
    else { ctx.arc(x + tw / 2, y + th / 2, m * .42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = bgc; ctx.beginPath(); ctx.arc(x + tw / 2, y + th / 2, m * .2, 0, Math.PI * 2); }
    ctx.fill();
  }
  ctx.restore();
}
function wavePath(ctx, W, H, a, b, amp) {
  ctx.beginPath(); ctx.moveTo(0, H * a);
  ctx.bezierCurveTo(W * .3, H * (a + amp), W * .62, H * (b - amp), W, H * b);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
}

Object.assign(TPL, {
  duo: {
    name: 'Two from above', dark: false,
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L; ctx.fillStyle = hsl(P.h, .05, .84); ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W * .25, H * .15, 0, W * .25, H * .15, Math.max(W, H) * .9); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const rnd = seeded(5); ctx.fillStyle = 'rgba(0,0,0,.018)'; for (let i = 0; i < 2600; i++) ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.14)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.05, .05, .12, .12], price: [.82, .05, .13, .13], book: [.12, .07, .76, .78], site: [.25, .875, .5, .075], tag: [.79, .86, .16, .1] },
      pt: { logo: [.05, .04, .12, .096], price: [.82, .04, .13, .104], headline: [.2, .05, .6, .09], book: [.08, .16, .84, .68], site: [.25, .88, .5, .06], tag: [.79, .87, .16, .08] },
      st: { logo: [.07, .145, .14, .078], price: [.78, .145, .15, .085], headline: [.1, .24, .8, .07], book: [.05, .32, .9, .38], tag: [.4, .7, .2, .035], site: [.2, .745, .6, .04] },
      ls: { book: [.03, .04, .46, .92], logo: [.55, .08, .1, .19], headline: [.55, .32, .4, .26], site: [.55, .66, .29, .13], tag: [.86, .66, .1, .15], price: [.86, .06, .11, .21] }
    },
    styles(D, th, L) {
      const b = D.brand; return {
        book: { variant: 'duoTop', align: 'center' }, logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        headline: { fam: FONT.mont, wt: 800, color: th.dark ? '#fff' : b.dark, lines: 2, lh: 1.08, align: 'center', v: 'middle' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'center' },
        tag: { style: 'text', fam: FONT.mont, wt: 900, color: b.tagColor, align: L && L.k === 'st' ? 'center' : 'right' }
      };
    }
  },
  bigbanner: {
    name: 'Book banner', dark: false,
    bg(ctx, L, D) {
      const P = palOf(D), b = D.brand, { W, H } = L, M = Math.max(W, H);
      ctx.fillStyle = '#f6f1ea'; ctx.fillRect(0, 0, W, H);
      const warm = '#f39a2e', c = { sq: [[.0, .05, .2, warm], [.92, .9, .26, b.primary], [.5, .78, .03, P.vivid]], pt: [[.0, .0, .14, warm], [.95, .6, .2, b.primary], [.42, .55, .025, P.vivid]], st: [[-.02, .1, .12, warm], [1, .55, .2, b.primary], [.82, .26, .025, P.vivid]], ls: [[.5, .0, .1, warm], [.5, 1.02, .08, b.primary], [.28, .82, .02, P.vivid]] }[L.k];
      c.forEach(([x, y, r, col]) => { ctx.beginPath(); ctx.arc(x * W, y * H, r * M, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); });
      ctx.strokeStyle = rgba(hexToRgb(b.dark), .12); ctx.lineWidth = M * .002; const s = M * .03;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(W * (L.k === 'ls' ? .7 : .12), H * (L.k === 'ls' ? .12 : .9), s * (1 + i), 0, Math.PI * 2); ctx.stroke(); }
    },
    rects: {
      sq: { logo: [.06, .06, .12, .12], kicker: [.06, .24, .4, .035], headline: [.06, .29, .39, .27], sub: [.06, .58, .37, .1], cta: [.06, .71, .36, .07], site: [.06, .875, .4, .065], book2: [.52, -.1, .6, .6], book: [.45, .34, .6, .74], price: [.36, .08, .13, .13] },
      pt: { logo: [.06, .04, .12, .096], price: [.81, .04, .14, .112], kicker: [.06, .165, .6, .03], headline: [.06, .205, .88, .15], sub: [.06, .365, .7, .045], cta: [.06, .425, .38, .05], site: [.5, .425, .44, .05], book2: [-.18, .5, .66, .58], book: [.36, .5, .72, .6] },
      st: { logo: [.07, .145, .15, .085], price: [.76, .145, .17, .095], kicker: [.07, .25, .7, .024], headline: [.07, .282, .86, .1], sub: [.07, .388, .86, .032], cta: [.07, .434, .52, .036], site: [.07, .48, .6, .03], book2: [-.22, .52, .7, .32], book: [.32, .5, .76, .33] },
      ls: { book2: [-.1, -.16, .4, 1.04], book: [.71, .04, .36, 1.14], logo: [.455, .05, .09, .16], kicker: [.3, .25, .4, .055], headline: [.31, .32, .38, .25], sub: [.3, .59, .4, .08], cta: [.37, .71, .26, .12], site: [.37, .86, .26, .09], price: [.62, .05, .11, .22] }
    },
    styles(D, th, L) {
      const b = D.brand, mid = L && L.k === 'ls' ? 'center' : 'left'; return {
        book: { variant: 'topA', align: 'center' }, book2: { variant: 'topB', align: 'center' },
        logo: { align: mid === 'center' ? 'center' : 'left' }, price: { shape: 'burst', fill: GOLD, ink: '#17120a' },
        kicker: { style: 'text', bar: mid !== 'center', color: b.primary, align: mid },
        headline: { fam: FONT.mont, wt: 900, upper: true, color: th.dark ? '#fff' : b.dark, accent: b.primary, lines: 3, lh: 1.02, align: mid, v: 'middle' },
        sub: { fam: FONT.mont, wt: 500, color: th.soft, lines: 2, lh: 1.3, max: L && (L.k === 'sq' || L.k === 'ls') ? .42 : null, align: mid },
        cta: { fill: b.dark, ink: '#fff', align: mid },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: mid }
      };
    }
  },
  openbook: {
    name: 'Open book', dark: false,
    floor: { sq: .78, pt: .78, st: .66, ls: .86 },
    bg(ctx, L, D) { studioBackdrop(ctx, L.W, L.H, palOf(D), this.floor[L.k]); },
    rects: {
      sq: { logo: [.05, .05, .12, .12], price: [.82, .05, .13, .13], headline: [.19, .055, .62, .13], sub: [.2, .195, .6, .045], book: [.04, .26, .92, .58], site: [.07, .875, .5, .075], tag: [.66, .865, .28, .1] },
      pt: { logo: [.05, .04, .12, .096], price: [.82, .04, .13, .104], headline: [.12, .16, .76, .13], sub: [.15, .3, .7, .04], book: [.03, .36, .94, .48], site: [.07, .885, .5, .06], tag: [.66, .875, .28, .08] },
      st: { logo: [.07, .145, .14, .078], price: [.78, .145, .15, .085], headline: [.08, .24, .84, .1], sub: [.1, .345, .8, .03], book: [.03, .39, .94, .31], site: [.08, .735, .58, .045], tag: [.68, .728, .24, .058] },
      ls: { book: [.02, .05, .55, .9], logo: [.6, .07, .09, .16], price: [.86, .05, .11, .2], headline: [.6, .27, .37, .3], sub: [.6, .58, .37, .08], site: [.6, .76, .25, .12], tag: [.86, .75, .11, .14] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { variant: 'open', align: 'bottom' }, logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        headline: { fam: FONT.serif, wt: 400, color: th.dark ? '#fff' : b.dark, lines: 2, lh: 1.05, align: 'center', v: 'middle' },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 1, align: 'center' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'left' },
        tag: { style: 'serif', color: b.tagColor, align: 'right', fam: FONT.serif }
      };
    }
  },
  fan: {
    name: 'Series fan', dark: false,
    band: { sq: [0, .3, 1, .53], pt: [0, .3, 1, .52], st: [0, .41, 1, .28], ls: [0, 0, .6, 1] },
    autoText: {
      headline: D => D.count > 1 ? (D.author ? `The ${D.author} collection` : 'The complete collection') : (D.title || 'Your book title'),
      sub: D => D.count > 1 ? `${D.count} books · instant PDF download` : (D.author ? `by ${D.author}` : 'Instant PDF download')
    },
    bg(ctx, L, D) {
      const P = palOf(D), b = D.brand, { W, H } = L; ctx.fillStyle = '#f7f3ec'; ctx.fillRect(0, 0, W, H);
      const [bx, by, bw, bh] = this.band[L.k], rows = L.k === 'ls' ? 4 : L.k === 'st' ? 3 : 3;
      const tile = (bh * H) / rows, cols = Math.max(1, Math.round(bw * W / tile));
      geoTiles(ctx, bx * W, by * H, bw * W, bh * H, rows, cols, [b.primary, b.dark, P.vivid, '#f39a2e', b.siteColor, '#f7f3ec'], 21);
      ctx.fillStyle = 'rgba(247,243,236,.18)'; ctx.fillRect(bx * W, by * H, bw * W, bh * H);
    },
    rects: {
      sq: { logo: [.05, .05, .12, .12], price: [.82, .05, .13, .13], headline: [.19, .05, .62, .14], sub: [.2, .2, .6, .045], book: [.03, .27, .94, .58], cta: [.06, .875, .43, .075], site: [.51, .875, .43, .075] },
      pt: { logo: [.05, .04, .12, .096], price: [.82, .04, .13, .104], headline: [.19, .045, .62, .13], sub: [.15, .185, .7, .04], book: [.03, .26, .94, .6], cta: [.06, .88, .43, .062], site: [.51, .88, .43, .062] },
      st: { logo: [.43, .145, .14, .075], headline: [.07, .23, .86, .11], sub: [.1, .345, .8, .03], book: [.03, .39, .94, .32], price: [.74, .62, .2, .11], cta: [.18, .72, .64, .042], site: [.2, .772, .6, .032] },
      ls: { book: [.02, .06, .56, .88], logo: [.63, .06, .08, .15], price: [.86, .05, .11, .2], headline: [.63, .25, .34, .3], sub: [.63, .56, .34, .08], cta: [.63, .71, .3, .12], site: [.63, .86, .3, .1] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { variant: 'fan', align: 'center' }, logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        headline: { fam: FONT.serif, wt: 400, color: th.dark ? '#fff' : b.dark, lines: 2, lh: 1.04, align: 'center', v: 'middle' },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 1, align: 'center' },
        cta: { fill: b.primary, ink: '#fff' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'center' }
      };
    }
  },
  wave: {
    name: 'Wave', dark: true,
    wave: { sq: [.76, .6], pt: [.66, .52], st: [.6, .53], ls: [1.02, .58] },
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L, [a, b2] = this.wave[L.k];
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, hsl(P.h, P.s, .3)); g.addColorStop(1, hsl(P.h + 22, P.s, .44)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const r = ctx.createRadialGradient(W * .85, H * .1, 0, W * .85, H * .1, Math.max(W, H) * .6); r.addColorStop(0, 'rgba(255,255,255,.16)'); r.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = hsl(P.h + 10, P.s * .8, .62, .55); wavePath(ctx, W, H, a - .05, b2 - .07, .07); ctx.fill();
      const lg = ctx.createLinearGradient(0, H * b2, 0, H); lg.addColorStop(0, hsl(P.h, .35, .95)); lg.addColorStop(1, hsl(P.h, .3, .86)); ctx.fillStyle = lg; wavePath(ctx, W, H, a, b2, .06); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; const s = Math.min(W, H) * .012;
      for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) { ctx.beginPath(); ctx.arc(W * .06 + x * s * 3, H * (L.k === 'ls' ? .9 : .03) + y * s * 3 + (L.k === 'ls' ? -s * 12 : 0), s * .45, 0, Math.PI * 2); ctx.fill(); }
    },
    rects: {
      sq: { logo: [.05, .05, .12, .12], headline: [.05, .2, .48, .29], sub: [.05, .5, .44, .09], cta: [.05, .62, .38, .075], book: [.5, .1, .48, .79], price: [.36, .72, .15, .15], site: [.05, .875, .42, .07] },
      pt: { logo: [.05, .04, .12, .096], headline: [.05, .15, .9, .17], sub: [.05, .335, .52, .07], cta: [.05, .425, .4, .055], book: [.44, .3, .54, .58], price: [.1, .66, .19, .152], site: [.05, .89, .42, .055] },
      st: { logo: [.07, .145, .15, .085], headline: [.07, .245, .86, .12], sub: [.07, .37, .86, .036], cta: [.07, .418, .52, .04], book: [.26, .45, .68, .3], price: [.08, .56, .24, .135], site: [.15, .768, .7, .032] },
      ls: { logo: [.03, .07, .08, .15], headline: [.03, .25, .5, .36], sub: [.03, .62, .48, .1], cta: [.03, .78, .23, .13], site: [.28, .78, .24, .13], book: [.56, .04, .38, .92], price: [.86, .05, .11, .2] }
    },
    styles(D, th) {
      const b = D.brand, P = palOf(D); return {
        book: { variant: 'ajar', align: 'bottom' }, logo: { align: 'left', shadow: true },
        headline: { fam: FONT.mont, wt: 900, upper: true, color: th.ink, accent: th.dark ? GOLD : b.primary, lines: 3, lh: 1.0, v: 'middle', shadow: th.dark ? 'rgba(0,0,0,.25)' : null },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 2, lh: 1.25, max: .42 },
        cta: { fill: th.dark ? '#ffffff' : b.dark, ink: th.dark ? P.deep : '#fff' },
        price: { shape: 'burst', fill: GOLD, ink: '#17120a' },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.primary, align: 'center' }
      };
    }
  },
  frame: {
    name: 'Framed', dark: false,
    band: { sq: [0, .8, 1, .2], pt: [0, .825, 1, .175], st: [0, .69, 1, .31], ls: [.5, .72, .5, .28] },
    bg(ctx, L, D) {
      const P = palOf(D), b = D.brand, { W, H } = L, M = Math.min(W, H), m = M * .04, rad2 = M * .045;
      ctx.fillStyle = hsl(P.h, .25, .965); ctx.fillRect(0, 0, W, H);
      const [bx, by, bw, bh] = this.band[L.k];
      ctx.save(); rr(ctx, m, m, W - 2 * m, H - 2 * m, rad2); ctx.clip();
      ctx.fillStyle = b.siteColor; ctx.fillRect(bx * W, by * H, bw * W, bh * H);
      ctx.fillStyle = rgba(hexToRgb(b.siteColor), .1); const s = M * .022;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) { ctx.beginPath(); ctx.arc(W - m - M * .05 - x * s * 2, m + M * .05 + y * s * 2, s * .35, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(m + M * .02, (by - .02) * H, M * .1, 0, Math.PI * 2); ctx.fillStyle = rgba(hexToRgb(b.primary), .12); ctx.fill();
      ctx.restore();
      rr(ctx, m, m, W - 2 * m, H - 2 * m, rad2); ctx.lineWidth = M * .008; ctx.strokeStyle = b.siteColor; ctx.stroke();
    },
    rects: {
      sq: { logo: [.08, .08, .12, .12], price: [.43, .1, .14, .14], book: [.06, .15, .55, .62], kicker: [.6, .2, .31, .045], headline: [.6, .27, .31, .3], sub: [.6, .585, .31, .12], site: [.08, .845, .44, .075], cta: [.55, .845, .37, .075] },
      pt: { logo: [.08, .065, .12, .096], price: [.78, .065, .14, .112], kicker: [.08, .18, .5, .03], headline: [.08, .22, .84, .13], sub: [.08, .355, .78, .04], book: [.06, .4, .88, .41], site: [.08, .86, .44, .06], cta: [.55, .86, .37, .06] },
      st: { logo: [.08, .145, .14, .078], price: [.76, .145, .16, .09], kicker: [.08, .24, .6, .022], headline: [.08, .268, .84, .085], sub: [.08, .358, .84, .03], book: [.04, .395, .92, .285], site: [.15, .71, .7, .032], cta: [.2, .755, .6, .036] },
      ls: { book: [.05, .1, .44, .8], logo: [.86, .1, .09, .17], price: [.37, .08, .12, .22], kicker: [.53, .12, .3, .06], headline: [.53, .2, .42, .3], sub: [.53, .51, .42, .14], site: [.6, .775, .3, .11] }
    },
    styles(D, th, L) {
      const b = D.brand; return {
        book: { variant: 'tilt', align: 'center' }, logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        kicker: { style: 'pill', fill: b.primary, ink: '#fff', align: 'left', radius: .5 },
        headline: { fam: FONT.serif, wt: 400, color: th.dark ? '#fff' : b.dark, lines: 3, lh: 1.04, v: 'middle' },
        sub: { fam: FONT.mont, wt: 500, color: th.soft, lines: 3, lh: 1.3, max: L && (L.k === 'sq' || L.k === 'ls') ? .34 : null },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.siteColor, align: 'center' },
        cta: { fill: b.dark, ink: '#fff', align: 'center' }
      };
    }
  }
});

// catalogue fields shown in step 3 (category + one-line description)
TPL_ORDER.forEach(id => { const m = DESIGN_META[id] || ['own', '']; TPL[id].cat = m[0]; TPL[id].desc = m[1]; });
