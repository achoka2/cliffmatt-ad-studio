/* =========================================================================
   Templates. Rects are fractions of width/height: [x, y, w, h].
   sq = 1:1, pt = 4:5, st = 9:16 (keeps 14% top / 20% bottom clear), ls = 1.91:1
   ========================================================================= */
function palOf(D) {
  const i = D.info; let h = i.hue, s = i.sat;
  if (s < .12) { const [bh, bs] = rgbToHsl(hexToRgb(D.brand.dark)); h = bh; s = Math.max(bs, .4); }
  s = clamp(s, .35, .85);
  return { h, s, deep: hsl(h, s * .85, .1), deep2: hsl(h + 16, s, .22), glow: hsl(h, Math.max(s, .6), .58, .55), tint: hsl(h, .38, .965), tint2: hsl(h, .42, .87), vivid: i.vivid ? rgbToHex(i.vivid) : D.brand.primary, night: hsl(h, s * .45, .055) };
}
function stars(ctx, W, H, n, seed, color, area) {
  const r = seeded(seed); ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = (area ? area[0] + r() * area[2] : r()) * W, y = (area ? area[1] + r() * area[3] : r()) * H, s = (r() * r()) * Math.min(W, H) * .012 + 1;
    ctx.globalAlpha = .35 + r() * .65;
    if (r() > .82) { ctx.beginPath(); ctx.moveTo(x, y - s * 3); ctx.quadraticCurveTo(x, y, x + s * 3, y); ctx.quadraticCurveTo(x, y, x, y + s * 3); ctx.quadraticCurveTo(x, y, x - s * 3, y); ctx.quadraticCurveTo(x, y, x, y - s * 3); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(x, y, s * .5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

const TPL = {
  classic: {
    name: 'Classic', dark: false,
    bg(ctx, L) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, L.W, L.H);
      const g = ctx.createRadialGradient(L.W / 2, L.H * .45, 0, L.W / 2, L.H * .45, Math.max(L.W, L.H) * .75); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(15,42,73,.07)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);
    },
    rects: {
      sq: { logo: [.05, .05, .15, .15], price: [.81, .05, .14, .14], book: [.17, .07, .66, .74], site: [.07, .845, .52, .09], tag: [.66, .835, .27, .11] },
      pt: { logo: [.05, .04, .16, .128], price: [.79, .04, .16, .128], book: [.12, .11, .76, .64], site: [.07, .845, .52, .072], tag: [.66, .835, .27, .09] },
      st: { logo: [.07, .145, .17, .095], price: [.76, .145, .17, .095], book: [.07, .248, .86, .412], tag: [.3, .664, .4, .052], site: [.13, .728, .74, .052] },
      ls: { book: [.03, .06, .46, .88], logo: [.52, .08, .14, .26], price: [.83, .07, .13, .25], headline: [.52, .39, .44, .24], site: [.52, .7, .3, .14], tag: [.83, .68, .13, .18] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { align: 'bottom', ground: true, shadow: .2, groundA: th.dark ? .6 : .45 },
        logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'left' },
        tag: { style: 'serif', color: b.tagColor, align: 'right', fam: FONT.serif },
        headline: { fam: FONT.mont, wt: 800, color: th.ink, lines: 3, lh: 1.08, v: 'middle' }
      };
    }
  },
  promo: {
    name: 'Bold promo', dark: true,
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L;
      const g = ctx.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, P.deep); g.addColorStop(1, P.deep2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const cx = W * (L.k === 'st' || L.k === 'pt' ? .62 : .72), cy = H * (L.k === 'st' ? .5 : .48), R = Math.max(W, H) * .55;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); rg.addColorStop(0, P.glow); rg.addColorStop(.5, hsl(P.h, P.s, .4, .18)); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(cx, cy); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, R * (.42 + i * .09), R * (.42 + i * .09) * .95, rad(-12), rad(200 + i * 25), rad(520 + i * 20)); ctx.lineWidth = Math.min(W, H) * (.006 - i * .0015); ctx.strokeStyle = i === 0 ? 'rgba(255,214,120,.55)' : 'rgba(255,255,255,.18)'; ctx.stroke(); }
      ctx.restore();
      stars(ctx, W, H, 60, 9, '#ffffff');
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.05, .045, .14, .14], tag: [.79, .055, .16, .07], headline: [.05, .2, .44, .35], sub: [.05, .565, .42, .11], cta: [.05, .705, .42, .085], book: [.52, .1, .45, .74], price: [.79, .6, .18, .18], site: [.1, .875, .8, .075] },
      pt: { logo: [.05, .04, .14, .112], tag: [.79, .05, .16, .056], headline: [.05, .17, .9, .2], book: [.44, .38, .53, .46], sub: [.05, .43, .4, .13], cta: [.05, .6, .38, .066], price: [.06, .69, .2, .16], site: [.1, .885, .8, .062] },
      st: { logo: [.07, .145, .15, .085], tag: [.77, .155, .16, .04], headline: [.07, .245, .86, .12], book: [.14, .375, .72, .27], price: [.7, .52, .24, .135], sub: [.08, .655, .84, .045], cta: [.18, .713, .64, .042], site: [.15, .768, .7, .032] },
      ls: { logo: [.03, .07, .08, .15], tag: [.86, .07, .11, .1], headline: [.03, .26, .48, .38], sub: [.03, .65, .46, .11], cta: [.03, .8, .25, .13], site: [.3, .81, .22, .11], book: [.55, .05, .4, .9], price: [.86, .62, .12, .3] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { align: 'center', shadow: .5, floor: false, glow: th.dark ? 'rgba(255,220,140,.18)' : null },
        logo: { align: 'left', shadow: true },
        headline: { fam: FONT.anton, wt: 400, upper: true, color: th.ink, accent: th.dark ? GOLD : b.primary, lines: 4, lh: 1.0, shadow: th.dark ? 'rgba(0,0,0,.4)' : null, v: 'middle' },
        sub: { fam: FONT.mont, wt: 700, color: th.soft, lines: 3, lh: 1.22, max: .38 },
        cta: { fill: b.primary, ink: '#fff' },
        price: { shape: 'burst', fill: GOLD, ink: '#17120a' },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.primary, align: 'center' },
        tag: { style: 'label', fill: b.tagColor, ink: '#fff', align: 'right' }
      };
    }
  },
  glow: {
    name: 'Cover glow', dark: true,
    bg(ctx, L, D) {
      const { W, H } = L; const b = blurredFill(D.cover, W, H, Math.min(W, H) * .06, 'c' + D.coverId);
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(b, 0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(6,8,14,.35)'); g.addColorStop(.55, 'rgba(6,8,14,.45)'); g.addColorStop(1, 'rgba(6,8,14,.86)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.05, .05, .13, .13], tag: [.8, .06, .15, .068], book: [.2, .07, .6, .6], price: [.73, .48, .2, .2], headline: [.06, .695, .88, .11], sub: [.1, .808, .8, .045], cta: [.06, .878, .43, .074], site: [.51, .878, .43, .074] },
      pt: { logo: [.05, .04, .13, .104], tag: [.8, .05, .15, .055], book: [.17, .07, .66, .56], price: [.74, .49, .2, .16], headline: [.06, .655, .88, .11], sub: [.1, .772, .8, .042], cta: [.06, .87, .43, .06], site: [.51, .87, .43, .06] },
      st: { logo: [.07, .145, .14, .078], tag: [.78, .155, .15, .038], book: [.12, .23, .76, .34], price: [.72, .45, .22, .12], headline: [.07, .585, .86, .085], sub: [.1, .673, .8, .032], cta: [.13, .717, .74, .046], site: [.17, .772, .66, .036] },
      ls: { book: [.04, .07, .4, .86], logo: [.48, .07, .08, .15], tag: [.84, .08, .12, .1], headline: [.48, .27, .48, .3], sub: [.48, .58, .48, .1], cta: [.48, .76, .23, .14], site: [.73, .76, .23, .14], price: [.33, .58, .14, .27] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { align: 'center', shadow: .6, floor: false },
        logo: { align: 'left', shadow: true },
        headline: { fam: FONT.mont, wt: 900, upper: true, color: th.ink, lines: 2, lh: 1.05, align: 'center', shadow: th.dark ? 'rgba(0,0,0,.5)' : null, v: 'middle' },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 1, align: 'center' },
        cta: { fill: b.primary, ink: '#fff' },
        price: { shape: 'circle', fill: GOLD, ink: '#17120a', ring: 'rgba(0,0,0,.25)' },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.primary, align: 'center' },
        tag: { style: 'label', fill: b.tagColor, ink: '#fff', align: 'right' }
      };
    }
  },
  spotlight: {
    name: 'Spotlight', dark: true,
    horizon: { sq: .77, pt: .73, st: .655, ls: .82 },
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L, hz = this.horizon[L.k] * H, cx = L.k === 'ls' ? W * .24 : W / 2;
      ctx.fillStyle = P.night; ctx.fillRect(0, 0, W, H);
      const wall = ctx.createLinearGradient(0, 0, 0, hz); wall.addColorStop(0, hsl(P.h, P.s * .35, .1)); wall.addColorStop(1, hsl(P.h, P.s * .35, .16)); ctx.fillStyle = wall; ctx.fillRect(0, 0, W, hz);
      const floor = ctx.createLinearGradient(0, hz, 0, H); floor.addColorStop(0, hsl(P.h, P.s * .3, .2)); floor.addColorStop(1, hsl(P.h, P.s * .3, .05)); ctx.fillStyle = floor; ctx.fillRect(0, hz, W, H - hz);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const top = Math.min(W, H) * .08, bot = Math.min(W, H) * (L.k === 'ls' ? .5 : .46);
      const cone = ctx.createLinearGradient(0, 0, 0, hz); cone.addColorStop(0, 'rgba(255,246,225,.3)'); cone.addColorStop(1, 'rgba(255,246,225,.07)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(cx - top, 0); ctx.lineTo(cx + top, 0); ctx.lineTo(cx + bot, hz); ctx.lineTo(cx - bot, hz); ctx.closePath(); ctx.fill();
      ctx.translate(cx, hz + (H - hz) * .12); ctx.scale(1, .16);
      const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, bot * 1.3); pool.addColorStop(0, 'rgba(255,240,210,.42)'); pool.addColorStop(1, 'rgba(255,240,210,0)'); ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(0, 0, bot * 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const lamp = ctx.createRadialGradient(cx, 0, 0, cx, 0, top * 2.2); lamp.addColorStop(0, 'rgba(255,250,235,.9)'); lamp.addColorStop(1, 'rgba(255,250,235,0)'); ctx.fillStyle = lamp; ctx.fillRect(cx - top * 3, 0, top * 6, top * 2.5);
      const v = ctx.createRadialGradient(cx, H * .5, Math.min(W, H) * .25, cx, H * .5, Math.max(W, H) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.05, .05, .1, .1], headline: [.17, .05, .66, .12], sub: [.2, .175, .6, .04], book: [.27, .245, .46, .555], price: [.78, .05, .17, .1], site: [.05, .895, .5, .06], tag: [.62, .885, .33, .075] },
      pt: { logo: [.05, .04, .11, .088], headline: [.17, .045, .66, .11], sub: [.2, .165, .6, .034], book: [.23, .225, .54, .53], price: [.78, .045, .17, .08], cta: [.3, .808, .4, .05], site: [.05, .9, .5, .05], tag: [.62, .892, .33, .062] },
      st: { logo: [.43, .145, .14, .068], headline: [.08, .225, .84, .085], sub: [.15, .318, .7, .024], book: [.2, .36, .6, .31], cta: [.27, .705, .46, .036], site: [.06, .765, .52, .028], tag: [.62, .76, .32, .036] },
      ls: { book: [.07, .08, .34, .76], logo: [.5, .08, .07, .14], headline: [.5, .25, .46, .3], sub: [.5, .56, .46, .07], cta: [.5, .7, .22, .11], site: [.5, .86, .26, .08], tag: [.8, .84, .16, .11], price: [.85, .06, .12, .16] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { align: 'bottom', shadow: .35, reflect: true, ground: true, groundA: .7 },
        logo: { align: 'left' },
        headline: { fam: FONT.serif, wt: 400, color: th.ink, lines: 2, lh: 1.04, align: 'center', v: 'middle' },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 1, align: 'center' },
        cta: { fill: 'none', stroke: th.ink, ink: th.ink, arrow: true },
        price: { shape: 'circle', fill: GOLD, ink: '#17120a', rot: 0 },
        site: { style: 'text', ink: th.ink, color: th.soft, align: 'left' },
        tag: { style: 'serif', color: GOLD, align: 'right' }
      };
    }
  },
  banner: {
    name: 'Banner', dark: false,
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L, M = Math.min(W, H);
      ctx.fillStyle = '#f6f3ee'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(15,42,73,.06)'; const gs = M * .045; for (let y = gs; y < H; y += gs) for (let x = gs; x < W; x += gs) { ctx.beginPath(); ctx.arc(x, y, M * .0025, 0, Math.PI * 2); ctx.fill(); }
      const accent = D.brand.primary;
      const dots = { sq: [[.03, .02, .09], [.66, .0, .05], [1.0, .42, .1], [.58, .95, .07], [.98, .92, .05], [.48, .62, .02]], pt: [[.03, .02, .09], [.72, .0, .05], [1.0, .62, .1], [.55, .97, .07], [.95, .93, .05]], st: [[.04, .1, .09], [.94, .12, .07], [1.0, .5, .09], [.03, .6, .04], [.6, .86, .07]], ls: [[.02, .04, .1], [.5, .02, .06], [.97, .5, .14], [.45, .96, .09], [.7, .95, .04]] }[L.k];
      dots.forEach(([x, y, r], i) => { ctx.beginPath(); ctx.arc(x * W, y * H, r * Math.max(W, H), 0, Math.PI * 2); ctx.fillStyle = i % 2 ? P.vivid : accent; ctx.globalAlpha = i % 2 ? .85 : 1; ctx.fill(); ctx.globalAlpha = 1; });
    },
    rects: {
      sq: { logo: [.06, .06, .12, .12], price: [.82, .05, .14, .14], headline: [.06, .2, .62, .2], sub: [.06, .41, .5, .05], cta: [.06, .49, .38, .07], tag: [.06, .58, .16, .05], book: [.36, .4, .62, .54], site: [.06, .885, .4, .065] },
      pt: { logo: [.06, .05, .13, .104], price: [.81, .04, .14, .112], headline: [.06, .17, .88, .17], sub: [.06, .35, .6, .045], cta: [.06, .41, .38, .055], tag: [.06, .48, .16, .04], book: [.12, .46, .86, .42], site: [.06, .905, .5, .05] },
      st: { logo: [.07, .145, .15, .085], price: [.76, .145, .17, .095], headline: [.07, .245, .86, .11], sub: [.08, .36, .84, .04], cta: [.2, .41, .6, .04], book: [.04, .46, .92, .26], site: [.18, .762, .64, .032] },
      ls: { logo: [.04, .07, .08, .15], headline: [.04, .26, .44, .3], sub: [.04, .57, .44, .1], cta: [.04, .74, .24, .13], site: [.3, .77, .2, .1], book: [.5, .1, .48, .82], price: [.86, .05, .11, .2] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { variant: 'pair', align: 'bottom', shadow: .3, ground: false },
        logo: { align: 'left' },
        headline: { fam: FONT.mont, wt: 900, upper: true, color: th.dark ? '#fff' : b.dark, accent: b.primary, lines: 3, lh: 1.02, v: 'middle' },
        sub: { fam: FONT.mont, wt: 500, color: th.soft, lines: 3, lh: 1.3, max: .3 },
        cta: { fill: b.dark, ink: '#fff' },
        price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'left' },
        tag: { style: 'label', fill: b.tagColor, ink: '#fff', align: 'left' }
      };
    }
  },
  instant: {
    name: 'Instant PDF', dark: true, usesDevice: true,
    bg(ctx, L, D) {
      const { W, H } = L, b = D.brand; const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shade(b.dark, 1.25)); g.addColorStop(1, shade(b.dark, .55)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = '#fff'; for (let i = -4; i < 12; i++) { ctx.beginPath(); const x = i * Math.max(W, H) * .14; ctx.moveTo(x, 0); ctx.lineTo(x + W * .07, 0); ctx.lineTo(x - H * .5 + W * .07, H); ctx.lineTo(x - H * .5, H); ctx.fill(); } ctx.restore();
      const rg = ctx.createRadialGradient(W * .5, H * .55, 0, W * .5, H * .55, Math.max(W, H) * .5); rg.addColorStop(0, rgba(hexToRgb(b.primary), .35)); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.05, .05, .11, .11], headline: [.18, .05, .64, .13], sub: [.15, .19, .7, .045], book: [.07, .27, .5, .55], device: [.5, .34, .3, .5], price: [.79, .23, .17, .17], cta: [.06, .875, .44, .075], site: [.52, .875, .42, .075] },
      pt: { logo: [.05, .04, .11, .088], headline: [.18, .045, .64, .12], sub: [.12, .175, .76, .04], book: [.06, .25, .52, .55], device: [.5, .32, .32, .5], price: [.78, .23, .18, .144], cta: [.06, .875, .44, .062], site: [.52, .875, .42, .062], tag: [.06, .82, .2, .045] },
      st: { logo: [.07, .145, .14, .078], headline: [.07, .235, .86, .085], sub: [.08, .325, .84, .028], book: [.05, .37, .56, .3], device: [.52, .41, .36, .27], price: [.72, .33, .22, .12], cta: [.18, .713, .64, .04], site: [.2, .765, .6, .032] },
      ls: { book: [.02, .08, .32, .86], device: [.27, .22, .17, .74], logo: [.5, .07, .08, .15], headline: [.5, .26, .46, .28], sub: [.5, .55, .46, .09], cta: [.5, .74, .22, .14], site: [.74, .74, .22, .14], price: [.86, .05, .11, .2] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { align: 'center', shadow: .45, floor: false }, device: { shadow: .5, ax: .5, ay: 1 },
        logo: { align: 'left', shadow: true },
        headline: { fam: FONT.anton, wt: 400, upper: true, color: th.ink, accent: th.dark ? GOLD : b.primary, lines: 2, lh: 1.0, align: 'center', v: 'middle' },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 1, align: 'center' },
        cta: { fill: b.primary, ink: '#fff' },
        price: { shape: 'burst', fill: GOLD, ink: '#17120a' },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.primary, align: 'center' },
        tag: { style: 'label', fill: b.tagColor, ink: '#fff', align: 'left' }
      };
    }
  },
  custom: {
    name: 'My background', dark: false,
    bg(ctx, L, D) {
      const P = palOf(D), g = ctx.createLinearGradient(0, 0, 0, L.H); g.addColorStop(0, P.tint); g.addColorStop(1, P.tint2); ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);
    },
    rects: {
      sq: { logo: [.05, .05, .13, .13], price: [.8, .05, .15, .15], book: [.2, .1, .6, .7], site: [.25, .865, .5, .075], tag: [.78, .855, .17, .09] },
      pt: { logo: [.05, .04, .13, .104], price: [.8, .04, .15, .12], headline: [.1, .16, .8, .1], book: [.18, .28, .64, .54], site: [.25, .88, .5, .06], tag: [.78, .87, .17, .075] },
      st: { logo: [.07, .145, .15, .085], price: [.76, .145, .17, .095], headline: [.08, .25, .84, .08], book: [.12, .35, .76, .33], site: [.2, .74, .6, .04], tag: [.38, .69, .24, .04] },
      ls: { book: [.04, .07, .42, .86], logo: [.52, .08, .1, .19], price: [.84, .07, .12, .23], headline: [.52, .36, .44, .24], site: [.52, .72, .3, .14], tag: [.84, .7, .12, .18] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { align: 'center', shadow: .4 }, logo: { align: 'left', shadow: th.dark },
        headline: { fam: FONT.mont, wt: 900, upper: true, color: th.ink, lines: 2, lh: 1.04, align: 'center', shadow: th.dark ? 'rgba(0,0,0,.45)' : null, v: 'middle' },
        price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'center' },
        tag: { style: 'serif', color: b.tagColor, align: 'right', shadow: th.dark ? 'rgba(0,0,0,.4)' : null }
      };
    }
  }
};

/* ---------- research-backed concepts and mediamodifier-style scenes ---------- */
Object.assign(TPL, {
  shop: {
    name: 'Shop image', dark: false,
    bg(ctx, L) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, L.W, L.H); },
    rects: {
      sq: { book: [.12, .08, .62, .83], tag: [.67, .77, .26, .1] },
      pt: { book: [.09, .1, .7, .78], tag: [.67, .8, .27, .08] },
      st: { book: [.08, .22, .8, .46], tag: [.58, .645, .32, .05] },
      ls: { book: [.24, .06, .44, .88], tag: [.65, .72, .2, .16] }
    },
    styles(D) { return { book: { align: 'bottom' }, tag: { style: 'text', fam: FONT.mont, wt: 800, color: D.brand.tagColor, align: 'left' } }; }
  },
  offer: {
    name: 'Price offer', dark: true,
    bg(ctx, L, D) {
      const { W, H } = L, b = D.brand; ctx.fillStyle = b.dark; ctx.fillRect(0, 0, W, H);
      const cx = W * (L.k === 'ls' ? .22 : L.k === 'st' ? .5 : L.k === 'pt' ? .7 : .74), cy = H * (L.k === 'st' ? .52 : L.k === 'pt' ? .58 : .48), R = Math.max(W, H) * 1.2;
      ctx.save(); ctx.translate(cx, cy);
      for (let i = 0; i < 28; i++) { ctx.rotate(Math.PI * 2 / 28); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * .06); ctx.lineTo(R, R * .06); ctx.closePath(); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,210,63,.07)'; ctx.fill(); }
      ctx.restore();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * .55); g.addColorStop(0, 'rgba(255,210,63,.28)'); g.addColorStop(1, 'rgba(255,210,63,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      stars(ctx, W, H, 26, 4, '#ffffff');
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.83, .04, .13, .13], offer: [.06, .07, .46, .075], headline: [.06, .18, .45, .26], deal: [.06, .47, .44, .21], cta: [.06, .72, .42, .08], book: [.51, .12, .46, .72], site: [.1, .885, .8, .07] },
      pt: { logo: [.83, .035, .13, .104], offer: [.06, .05, .52, .055], headline: [.06, .13, .74, .15], book: [.42, .31, .55, .53], deal: [.06, .35, .38, .2], cta: [.06, .62, .36, .06], site: [.1, .9, .8, .055] },
      st: { logo: [.43, .145, .14, .075], offer: [.2, .235, .6, .035], headline: [.07, .285, .86, .1], book: [.12, .395, .76, .27], deal: [.15, .675, .7, .065], cta: [.18, .75, .64, .04] },
      ls: { book: [.04, .06, .38, .88], offer: [.46, .08, .34, .12], headline: [.46, .25, .5, .27], deal: [.46, .55, .3, .26], cta: [.77, .6, .2, .14], site: [.46, .86, .3, .1], logo: [.86, .05, .11, .2] }
    },
    styles(D, th, L) {
      const b = D.brand, al = L && L.k === 'st' ? 'center' : 'left'; return {
        book: { align: 'center', glow: 'rgba(255,210,63,.16)', floor: false, shadow: .5 }, logo: { align: 'right', shadow: true },
        offer: { fill: GOLD, ink: '#17120a', align: al, radius: .5 },
        headline: { fam: FONT.anton, wt: 400, upper: true, color: th.ink, lines: 3, lh: 1.0, align: al, v: 'middle', shadow: 'rgba(0,0,0,.35)' },
        deal: { color: GOLD, soft: th.soft, strike: '#ff4d4d', align: al, shadow: 'rgba(0,0,0,.35)' },
        cta: { fill: b.primary, ink: '#fff', align: al },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.primary, align: 'center' }
      };
    }
  },
  quote: {
    name: 'Reader quote', dark: true,
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L; const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, P.night); g.addColorStop(1, P.deep); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const bx = L.k === 'ls' ? W * .82 : L.k === 'sq' ? W * .78 : W * .5, by = L.k === 'sq' ? H * .62 : L.k === 'ls' ? H * .5 : H * .68;
      const rg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.min(W, H) * .5); rg.addColorStop(0, hsl(P.h, P.s, .45, .35)); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = .06; ctx.fillStyle = '#fff'; ctx.font = `400 ${Math.min(W, H) * .9}px ${FONT.serif}`; ctx.textBaseline = 'top'; ctx.fillText('”', W * .5, -Math.min(W, H) * .12); ctx.restore();
    },
    rects: {
      sq: { logo: [.06, .06, .12, .12], quote: [.06, .21, .55, .52], book: [.6, .3, .37, .58], cta: [.06, .79, .4, .07], site: [.06, .89, .5, .06] },
      pt: { logo: [.06, .04, .12, .096], quote: [.06, .16, .88, .36], book: [.28, .53, .44, .33], cta: [.06, .9, .42, .055], site: [.52, .9, .42, .055] },
      st: { logo: [.07, .145, .14, .078], quote: [.08, .245, .84, .25], book: [.24, .51, .52, .2], cta: [.18, .725, .64, .042], site: [.2, .776, .6, .03] },
      ls: { quote: [.04, .1, .6, .6], logo: [.04, .78, .07, .16], site: [.13, .8, .3, .12], book: [.67, .06, .3, .88] }
    },
    styles(D, th, L) {
      const b = D.brand; return {
        book: { align: 'center', glow: 'rgba(255,255,255,.08)', floor: false, shadow: .5 }, logo: { align: 'left', shadow: true },
        quote: { color: th.ink, soft: th.soft, accent: th.dark ? GOLD : b.primary, align: L && L.k === 'st' ? 'center' : 'left' },
        cta: { fill: b.primary, ink: '#fff', align: L && L.k === 'st' ? 'center' : 'left' },
        site: { style: 'text', ink: th.ink, color: th.soft, align: L && L.k === 'st' ? 'center' : 'left' }
      };
    }
  },
  steps: {
    name: 'How to order', dark: false,
    autoText: { headline: () => 'Get it in 3 easy steps' },
    bg(ctx, L, D) {
      const { W, H } = L, b = D.brand; ctx.fillStyle = '#f5f7f6'; ctx.fillRect(0, 0, W, H);
      const cx = L.k === 'ls' ? W * .75 : W * .78, cy = L.k === 'st' ? H * .5 : H * .45, R = Math.min(W, H) * .55;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba(hexToRgb(b.primary), .28)); g.addColorStop(1, rgba(hexToRgb(b.primary), 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgba(hexToRgb(b.dark), .05); const gs = Math.min(W, H) * .05; for (let y = gs; y < H; y += gs) for (let x = gs; x < W; x += gs) { ctx.beginPath(); ctx.arc(x, y, Math.min(W, H) * .003, 0, Math.PI * 2); ctx.fill(); }
    },
    rects: {
      sq: { logo: [.06, .05, .12, .12], headline: [.06, .2, .5, .16], steps: [.06, .4, .45, .37], cta: [.06, .82, .44, .075], chat: [.58, .06, .38, .88], book: [.48, .6, .2, .34] },
      pt: { logo: [.06, .04, .12, .096], headline: [.06, .15, .52, .14], steps: [.06, .33, .46, .36], cta: [.06, .74, .44, .06], chat: [.58, .1, .38, .74], book: [.46, .62, .22, .28], site: [.06, .89, .44, .055] },
      st: { logo: [.07, .145, .14, .078], headline: [.07, .235, .86, .075], steps: [.07, .33, .44, .3], chat: [.53, .32, .4, .37], book: [.33, .55, .26, .15], cta: [.15, .72, .7, .045], site: [.2, .776, .6, .032] },
      ls: { headline: [.04, .08, .46, .18], steps: [.04, .3, .44, .48], cta: [.04, .82, .26, .13], chat: [.6, .03, .22, .94], book: [.76, .4, .2, .56], logo: [.88, .04, .1, .18] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { align: 'bottom', lift: .25 }, chat: { rot: 4 }, logo: { align: 'left' },
        headline: { fam: FONT.mont, wt: 900, upper: true, color: th.dark ? '#fff' : b.dark, accent: b.primary, lines: 3, lh: 1.02, v: 'middle' },
        steps: { color: th.dark ? '#fff' : '#18212f', badge: b.primary },
        cta: { fill: b.dark, ink: '#fff' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'left' }
      };
    }
  },
  collection: {
    name: 'Collection', dark: true,
    autoText: { headline: D => D.author ? `The ${D.author} collection` : 'The complete collection', sub: D => D.count > 1 ? `${D.count} books · instant PDF download` : 'Instant PDF download' },
    bg(ctx, L, D) {
      const P = palOf(D), b = D.brand, { W, H } = L; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shade(b.dark, 1.1)); g.addColorStop(1, P.night); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const cy = H * (L.k === 'st' ? .55 : L.k === 'ls' ? .55 : .6), cx = L.k === 'ls' ? W * .3 : W / 2;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .55); rg.addColorStop(0, hsl(P.h, P.s, .5, .38)); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      stars(ctx, W, H, 40, 17, '#ffffff', [0, 0, 1, .4]);
    },
    rects: {
      sq: { logo: [.05, .045, .12, .12], headline: [.18, .05, .64, .15], sub: [.15, .205, .7, .045], book: [.03, .27, .94, .57], price: [.81, .66, .16, .16], cta: [.06, .875, .43, .075], site: [.51, .875, .43, .075] },
      pt: { logo: [.05, .04, .12, .096], headline: [.18, .045, .64, .13], sub: [.15, .18, .7, .04], book: [.03, .25, .94, .58], price: [.79, .69, .18, .144], cta: [.06, .88, .43, .062], site: [.51, .88, .43, .062] },
      st: { logo: [.43, .145, .14, .075], headline: [.07, .23, .86, .1], sub: [.1, .335, .8, .028], book: [.03, .38, .94, .3], price: [.74, .6, .2, .11], cta: [.18, .72, .64, .042], site: [.2, .772, .6, .032] },
      ls: { book: [.02, .08, .56, .86], logo: [.62, .06, .08, .15], headline: [.62, .25, .35, .3], sub: [.62, .56, .35, .08], cta: [.62, .72, .2, .13], site: [.62, .87, .3, .09], price: [.86, .05, .11, .2] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { variant: 'collection', align: 'center' }, logo: { align: 'left', shadow: true },
        headline: { fam: FONT.anton, wt: 400, upper: true, color: th.ink, accent: th.dark ? GOLD : b.primary, lines: 2, lh: 1.0, align: 'center', v: 'middle', shadow: 'rgba(0,0,0,.35)' },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 1, align: 'center' },
        price: { shape: 'burst', fill: GOLD, ink: '#17120a' }, cta: { fill: b.primary, ink: '#fff' },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.primary, align: 'center' }
      };
    }
  },
  topview: {
    name: 'Top view', dark: false,
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L; ctx.fillStyle = hsl(P.h, .16, .88); ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W * .3, H * .25, 0, W * .3, H * .25, Math.max(W, H) * .8); g.addColorStop(0, 'rgba(255,255,255,.65)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.05, .05, .12, .12], price: [.82, .05, .13, .13], book: [.15, .1, .7, .74], site: [.25, .875, .5, .075], tag: [.79, .86, .16, .1] },
      pt: { logo: [.05, .04, .12, .096], price: [.82, .04, .13, .104], headline: [.2, .05, .6, .09], book: [.12, .17, .76, .66], site: [.25, .88, .5, .06], tag: [.79, .87, .16, .08] },
      st: { logo: [.07, .145, .14, .078], price: [.78, .145, .15, .085], headline: [.1, .245, .8, .07], book: [.08, .325, .84, .37], tag: [.4, .695, .2, .04], site: [.2, .745, .6, .04] },
      ls: { book: [.04, .04, .44, .92], logo: [.55, .08, .1, .19], headline: [.55, .32, .4, .26], site: [.55, .66, .32, .13], tag: [.86, .66, .1, .15], price: [.86, .06, .11, .21] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { variant: 'top', align: 'center' }, logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        headline: { fam: FONT.mont, wt: 800, color: th.dark ? '#fff' : b.dark, lines: 2, lh: 1.08, align: 'center', v: 'middle' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'center' },
        tag: { style: 'text', fam: FONT.mont, wt: 900, color: b.tagColor, align: 'right' }
      };
    }
  },
  desk: {
    name: 'Desk scene', dark: false,
    hz: { sq: .62, pt: .6, st: .57, ls: .64 },
    bg(ctx, L, D) {
      const { W, H } = L, hz = this.hz[L.k] * H, M = Math.min(W, H);
      const wall = ctx.createLinearGradient(0, 0, 0, hz); wall.addColorStop(0, '#efe7dc'); wall.addColorStop(1, '#ddd0bf'); ctx.fillStyle = wall; ctx.fillRect(0, 0, W, hz);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,248,232,.16)';
      [[.08, .2], [.3, .42]].forEach(([a, b2]) => { ctx.beginPath(); ctx.moveTo(W * a, 0); ctx.lineTo(W * b2, 0); ctx.lineTo(W * (b2 + .35), hz); ctx.lineTo(W * (a + .35), hz); ctx.closePath(); ctx.fill(); });
      ctx.restore();
      drawTabletop(ctx, woodCanvas(1400, 900, [176, 122, 76], 7), 0, hz, W, H - hz);
      const td = H - hz;
      if (L.k !== 'st') drawPlant(ctx, W * (L.k === 'ls' ? .93 : .87), hz + td * .14, M * (L.k === 'ls' ? .44 : .36));
      else drawPlant(ctx, W * .86, hz + td * .1, M * .4);
      if (L.k === 'sq' || L.k === 'pt') drawMug(ctx, W * .1, hz + td * .4, M * .2, '#e9e4dc');
    },
    rects: {
      sq: { logo: [.05, .05, .11, .11], headline: [.18, .05, .64, .12], sub: [.25, .175, .5, .04], price: [.81, .05, .14, .14], book: [.22, .2, .5, .66], site: [.05, .895, .44, .06], tag: [.66, .885, .29, .08] },
      pt: { logo: [.05, .04, .11, .088], headline: [.18, .045, .64, .1], sub: [.22, .15, .56, .035], price: [.81, .04, .14, .112], book: [.2, .2, .54, .64], site: [.05, .905, .44, .05], tag: [.66, .895, .29, .065] },
      st: { logo: [.07, .145, .14, .078], price: [.78, .145, .15, .085], headline: [.08, .235, .84, .075], book: [.1, .32, .64, .42], site: [.2, .766, .6, .034] },
      ls: { book: [.06, .05, .38, .88], headline: [.5, .1, .38, .3], sub: [.5, .42, .38, .08], logo: [.5, .56, .08, .15], site: [.5, .86, .3, .1], tag: [.62, .56, .2, .14] }
    },
    styles(D) {
      const b = D.brand; return {
        book: { align: 'bottom' }, logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        headline: { fam: FONT.serif, wt: 400, color: '#2b231c', lines: 2, lh: 1.05, align: 'center', v: 'middle' },
        sub: { fam: FONT.mont, wt: 600, color: 'rgba(43,35,28,.72)', lines: 1, align: 'center' },
        site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'left' },
        tag: { style: 'text', fam: FONT.mont, wt: 900, color: b.tagColor, align: 'right', shadow: 'rgba(0,0,0,.25)' }
      };
    }
  },
  flatlay: {
    name: 'Flat lay', dark: true,
    bg(ctx, L, D) {
      const { W, H } = L, M = Math.min(W, H); const wood = woodCanvas(1200, 1200, [150, 102, 64], 13);
      coverFit(ctx, wood, 0, 0, W, H);
      const v = ctx.createRadialGradient(W / 2, H / 2, M * .3, W / 2, H / 2, Math.max(W, H) * .78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.38)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      const k = L.k;
      const cup = { sq: [.87, .16, .15], pt: [.86, .14, .14], st: [.84, .1, .15], ls: [.93, .2, .17] }[k];
      drawCoffeeTop(ctx, cup[0] * W, cup[1] * H, cup[2] * M);
      const sp = { sq: [-.02, .99, .22, .66], pt: [-.02, .99, .22, .7], st: [-.02, .86, .26, .7], ls: [.5, 1.02, .62, .64] }[k];
      drawSprig(ctx, sp[0] * W, sp[1] * H, sp[2] * W, sp[3] * H, M * .5);
      const pen = { sq: [.7, .97, .97, .8], pt: [.7, .97, .97, .83], st: [.66, .86, .97, .8], ls: [.75, .97, .99, .72] }[k];
      drawPen(ctx, pen[0] * W, pen[1] * H, pen[2] * W, pen[3] * H, M * .022);
    },
    rects: {
      sq: { logo: [.05, .05, .12, .12], book: [.16, .09, .68, .74], site: [.22, .875, .56, .07], price: [.04, .4, .15, .15], tag: [.8, .4, .16, .1] },
      pt: { logo: [.05, .04, .12, .096], book: [.12, .12, .76, .7], site: [.22, .885, .56, .056], price: [.04, .42, .15, .12], tag: [.8, .44, .16, .08] },
      st: { logo: [.07, .145, .14, .078], book: [.08, .24, .84, .44], price: [.76, .63, .18, .1], site: [.2, .74, .6, .04] },
      ls: { book: [.04, .03, .46, .94], logo: [.56, .08, .09, .17], headline: [.56, .3, .32, .26], site: [.56, .66, .3, .12], tag: [.56, .82, .14, .13] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { variant: 'top', align: 'center' }, logo: { align: 'left', shadow: true }, price: { shape: 'burst', fill: GOLD, ink: '#17120a' },
        headline: { fam: FONT.serif, wt: 400, color: '#fff', lines: 2, shadow: 'rgba(0,0,0,.5)', v: 'middle' },
        site: { style: 'bar', fill: '#ffffff', ink: '#0d1424', icon: b.primary, align: 'center' },
        tag: { style: 'label', fill: b.tagColor, ink: '#fff', align: 'right' }
      };
    }
  },
  stack: {
    name: 'Book stack', dark: false,
    bg(ctx, L, D) {
      const P = palOf(D), { W, H } = L; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.tint); g.addColorStop(.62, P.tint2); g.addColorStop(1, hsl(P.h, .3, .8)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const cx = L.k === 'ls' ? W * .27 : W / 2, cy = H * (L.k === 'st' ? .55 : .62); const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .5); rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    },
    rects: {
      sq: { logo: [.05, .05, .12, .12], headline: [.2, .05, .6, .12], sub: [.22, .175, .56, .04], book: [.06, .23, .88, .6], price: [.81, .05, .14, .14], cta: [.06, .875, .43, .075], site: [.51, .875, .43, .075] },
      pt: { logo: [.05, .04, .12, .096], headline: [.18, .05, .64, .11], sub: [.2, .165, .6, .035], book: [.05, .22, .9, .6], price: [.81, .04, .14, .112], cta: [.06, .88, .43, .062], site: [.51, .88, .43, .062] },
      st: { logo: [.07, .145, .14, .078], price: [.77, .145, .16, .09], headline: [.08, .24, .84, .08], sub: [.15, .325, .7, .028], book: [.04, .37, .92, .32], cta: [.18, .72, .64, .042], site: [.2, .772, .6, .032] },
      ls: { book: [.02, .04, .5, .92], logo: [.56, .07, .08, .15], headline: [.56, .26, .4, .28], sub: [.56, .56, .4, .08], cta: [.56, .72, .2, .13], site: [.78, .72, .19, .13], price: [.86, .05, .11, .2] }
    },
    styles(D, th) {
      const b = D.brand; return {
        book: { variant: 'stack', align: 'bottom' }, logo: { align: 'left' }, price: { shape: 'burst', fill: b.primary, ink: '#fff' },
        headline: { fam: FONT.mont, wt: 900, upper: true, color: th.dark ? '#fff' : b.dark, accent: b.primary, lines: 2, lh: 1.02, align: 'center', v: 'middle' },
        sub: { fam: FONT.mont, wt: 600, color: th.soft, lines: 1, align: 'center' },
        cta: { fill: b.dark, ink: '#fff' }, site: { style: 'outline', color: b.siteColor, ink: '#0b0b0b', fill: '#fff', align: 'center' }
      };
    }
  }
});

const TPL_ORDER = ['shop', 'classic', 'promo', 'glow', 'offer', 'wave', 'frame', 'quote', 'steps', 'collection', 'fan', 'spotlight', 'topview', 'duo', 'openbook', 'bigbanner', 'desk', 'flatlay', 'stack', 'banner', 'instant', 'custom'];
const CAROUSEL = ['promo', 'glow', 'offer', 'spotlight', 'topview', 'desk', 'stack', 'banner', 'instant', 'steps'];
const ORDER = ['chat', 'book2', 'book', 'device', 'price', 'logo', 'offer', 'kicker', 'headline', 'sub', 'deal', 'quote', 'steps', 'cta', 'site', 'tag'];

function overrideBg(ctx, L, D) {
  const { W, H } = L;
  if (D.bg.mode === 'color') {
    if (D.bg.grad) { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, D.bg.color); g.addColorStop(1, D.bg.color2); ctx.fillStyle = g; } else ctx.fillStyle = D.bg.color;
    ctx.fillRect(0, 0, W, H);
  } else if (D.bg.mode === 'image' && D.bgImg) {
    ctx.imageSmoothingQuality = 'high'; coverFit(ctx, D.bgImg, 0, 0, W, H);
    if (D.bg.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${D.bg.dim / 100})`; ctx.fillRect(0, 0, W, H); }
  } else return false;
  return true;
}
function themeFor(D, T) {
  const dark = (D.bg.mode === 'template' || (D.bg.mode === 'image' && !D.bgImg)) ? T.dark : D.bgDark;
  return { dark, ink: dark ? '#ffffff' : '#111a2b', soft: dark ? 'rgba(255,255,255,.86)' : 'rgba(17,26,43,.74)' };
}
function drawBackground(ctx, L, D) {
  const T = TPL[D.template];
  if (D.bg.mode === 'template' || !overrideBg(ctx, L, D)) T.bg(ctx, L, D);
}
function drawForeground(ctx, L, D, A) {
  const T = TPL[D.template], R = T.rects[L.k], th = themeFor(D, T);
  if (T.autoText && D.auto) { const o = {}; for (const k in T.autoText) if (D.auto[k]) o[k] = T.autoText[k](D); D = Object.assign({}, D, { text: Object.assign({}, D.text, o) }); }
  const st = T.styles(D, th, L);
  for (const k of ORDER) {
    const r = R[k]; if (!r) continue;
    if (k === 'device' && !(T.usesDevice && D.show.device)) continue;
    const rect = { x: r[0] * L.W, y: r[1] * L.H, w: r[2] * L.W, h: r[3] * L.H };
    let box = rect;
    if (k === 'book' && T.usesDevice && !D.show.device && R.device) {
      const d = R.device, x1 = Math.min(r[0], d[0]), y1 = Math.min(r[1], d[1]), x2 = Math.max(r[0] + r[2], d[0] + d[2]), y2 = Math.max(r[1] + r[3], d[1] + d[3]);
      box = { x: x1 * L.W, y: y1 * L.H, w: (x2 - x1) * L.W, h: (y2 - y1) * L.H };
    }
    EL[k](ctx, L, D, box, st[k] || {}, A);
  }
}
function compose(ctx, sizeKey, D, scale = 1, A = null, bgCanvas = null) {
  const sz = SIZES[sizeKey], L = { W: sz.w, H: sz.h, k: sz.k };
  ctx.save(); ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, L.W, L.H); else drawBackground(ctx, L, D);
  drawForeground(ctx, L, D, A);
  ctx.restore();
  return L;
}

function autoText(key, title = S.title, author = S.author) {
  const b = brand();
  if (key === 'headline') return title || 'Your book title';
  if (key === 'sub') return author ? `by ${author}` : 'Instant PDF download';
  if (key === 'cta') return b.cta;
  if (key === 'tag') return b.tag;
  if (key === 'price') return b.price;
  if (key === 'offer') return 'Special offer';
  if (key === 'kicker') return 'Instant PDF e-book';
  return '';
}
function currentText() { const t = {}; for (const k of ['headline', 'sub', 'cta', 'tag', 'price', 'offer', 'kicker']) t[k] = S.auto[k] ? autoText(k) : S.text[k]; for (const k of ['oldPrice', 'quote', 'quoteBy']) t[k] = S.text[k]; return t; }
function buildData(o = {}) {
  const b = brand();
  if (!('device' in o) && S.cover && S.show.device && TPL[o.template || S.template].usesDevice) buildDevice();
  return Object.assign({
    cover: S.cover, info: S.info, coverId: S.coverId, book: S.book, device: S.device,
    brand: b, logoImg: logoImgFor(b), text: currentText(), show: S.show, template: S.template,
    bg: S.bg, bgImg: S.bgImg, bgDark: S.bgDark, pos: S.pos, track: null,
    title: S.title, author: S.author, count: 1 + S.extra.length, auto: S.auto, getBook: v => getBookVariant(v)
  }, o);
}


/* =========================================================================
   Design catalogue: categories and the one-line descriptions shown in step 3.
   HOW TO ADD A DESIGN
     1. Add an entry to TPL above (or Object.assign(TPL, {...}) in a new file):
        { name, dark, bg(ctx, L, D), rects: { sq, pt, st, ls }, styles(D, th, L) }
        rects place elements as [x, y, w, h] fractions of the canvas for
        1:1 (sq), 4:5 (pt), 9:16 (st, keep 14% top / 20% bottom clear) and 1.91:1 (ls).
        Elements: book (variant: main | top | lie | stack | pair | collection | fan | duoTop |
        topA | topB | tilt | ajar | open), book2 (a second book, same variants, not draggable),
        device, chat, logo, kicker, headline, sub, offer, deal, quote, steps, price, cta, site, tag.
        A rect may run past the edges (negative x/y or x+w > 1) to bleed a book off the canvas.
     2. Add its id to TPL_ORDER and a line to DESIGN_META below.
   ========================================================================= */
const CATEGORIES = [
  { id: 'all', name: 'All designs' },
  { id: 'shop', name: 'Website & catalogue' },
  { id: 'promo', name: 'Promotions' },
  { id: 'trust', name: 'Build trust' },
  { id: 'series', name: 'Series' },
  { id: 'scene', name: 'Scenes' },
  { id: 'own', name: 'Your own' }
];
const DESIGN_META = {
  shop: ['shop', 'White background, the book and a red PDF, like your website photos'],
  classic: ['shop', 'Your Canva ad: logo, book, website pill and PDF'],
  promo: ['promo', 'Big bold headline on a dark glowing background'],
  glow: ['promo', 'Blurred cover behind the book, words underneath'],
  offer: ['promo', 'Price sticker with a crossed-out old price'],
  instant: ['promo', 'Book plus phone, so people see it is an instant PDF'],
  quote: ['trust', 'A real reader review, or a strong line from the book'],
  steps: ['trust', 'Three steps to order and a chat showing delivery'],
  collection: ['series', 'Up to 6 covers from one author or series'],
  spotlight: ['scene', 'Book on a dark floor under a spotlight'],
  topview: ['scene', 'Book lying flat, seen from above'],
  desk: ['scene', 'Book standing on a wooden desk with a plant'],
  flatlay: ['scene', 'Top-down desk with coffee, leaves and a pen'],
  stack: ['scene', 'A standing book in front of a stack of copies'],
  banner: ['scene', 'Two books and a headline, magazine style'],
  wave: ['promo', 'Two-tone wave, big white headline, cover opening'],
  frame: ['promo', 'Outlined frame, tilted book, label, headline and button'],
  fan: ['series', 'Books fanned out on a colourful geometric band'],
  duo: ['scene', 'Two copies stacked, seen from above on grey'],
  openbook: ['scene', 'The book standing open with its pages fanned'],
  bigbanner: ['scene', 'Two big books running off the edges, bold circles'],
  custom: ['own', 'Your own background picture or colour']
};

