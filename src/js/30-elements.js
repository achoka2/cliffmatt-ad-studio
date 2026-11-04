/* =========================================================================
   Ad elements
   ========================================================================= */
function bookPlacement(L, rect, D, align, imgBook) {
  const p = D.pos || { scale: 1, x: 0, y: 0 }, b = imgBook || D.book;
  const cw = rect.w * p.scale, ch = rect.h * p.scale;
  const cx = rect.x + rect.w / 2 + p.x * L.W;
  const s = Math.min(cw / b.crop.w, ch / b.crop.h), w = b.crop.w * s, h = b.crop.h * s;
  let y;
  if (align === 'bottom') y = rect.y + rect.h - h + p.y * L.H;
  else y = rect.y + rect.h / 2 - h / 2 + p.y * L.H;
  return { x: cx - w / 2, y, w, h, s };
}
function reflection(img, w, h) {
  const rw = Math.max(1, Math.round(Math.min(480, w))), rh = Math.max(1, Math.round(rw * h / w));
  const c = mk(rw, rh * .5), x = ctx2(c);
  x.save(); x.translate(0, rh); x.scale(1, -1); x.drawImage(img, 0, 0, rw, rh); x.restore();
  x.globalCompositeOperation = 'destination-in'; const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, 'rgba(0,0,0,.3)'); g.addColorStop(.8, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  return c;
}
const EL = {
  book(ctx, L, D, rect, st, A) {
    const main = !st.variant || st.variant === 'main';
    const B = main ? D.book : (D.getBook ? D.getBook(st.variant) : D.book);
    if (!B) return;
    const P = bookPlacement(L, rect, D, st.align || 'center', B);
    if (D.track) D.track.book = P;
    const an = anim(A, 'book');
    const floating = st.floor === false && B.gl && B.bare;
    let img = floating ? B.bare : B.img, ix = P.x, iy = P.y, iw = P.w, ih = P.h;
    if (A && A.frame && main) { img = floating && A.bare ? A.bare : A.frame; ix = P.x - B.crop.x * P.s; iy = P.y - B.crop.y * P.s; iw = ih = B.full * P.s; }
    ctx.save(); ctx.globalAlpha *= an.a;
    if (!main && A) { const sc = .92 + .08 * easeOut(clamp(A.t / 1.3, 0, 1)); ctx.translate(P.x + P.w / 2, P.y + P.h); ctx.scale(sc, sc); ctx.translate(-(P.x + P.w / 2), -(P.y + P.h)); }
    if (st.glow) {
      const g = ctx.createRadialGradient(P.x + P.w / 2, P.y + P.h / 2, 0, P.x + P.w / 2, P.y + P.h / 2, Math.max(P.w, P.h) * .75);
      g.addColorStop(0, st.glow); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(P.x - P.w, P.y - P.h * .5, P.w * 3, P.h * 2);
    }
    if (st.ground && !B.gl) {
      ctx.save(); ctx.translate(P.x + P.w * .52, P.y + P.h * .985); ctx.scale(1, .1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, P.w * .62); g.addColorStop(0, `rgba(0,0,0,${st.groundA ?? .5})`); g.addColorStop(.55, `rgba(0,0,0,${(st.groundA ?? .5) * .35})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, P.w * .62, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (st.reflect && !B.gl) {
      const src = A && A.frame ? null : (B.refl || (B.refl = reflection(B.img, B.img.width, B.img.height)));
      if (src) ctx.drawImage(src, P.x, P.y + P.h - 1, P.w, P.h * .36);
    }
    if (!B.gl || floating) setShadow(ctx, `rgba(0,0,0,${st.shadow ?? .35})`, P.h * .05, P.w * .035, P.h * .02);
    else if (st.lift) setShadow(ctx, `rgba(0,0,0,${st.lift})`, P.h * .04, 0, P.h * .015);
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();
  },
  device(ctx, L, D, rect, st, A) {
    if (!D.show.device || !D.device) return;
    const dv = D.device, an = anim(A, 'device');
    const r = containRect(dv.crop.w, dv.crop.h, rect.x, rect.y, rect.w, rect.h, st.ax ?? .5, st.ay ?? 1);
    ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy);
    setShadow(ctx, `rgba(0,0,0,${st.shadow ?? .45})`, r.h * .05, r.w * .04, r.h * .025);
    ctx.drawImage(dv.img, r.x, r.y, r.w, r.h); ctx.restore();
  },
  logo(ctx, L, D, rect, st, A) {
    if (!D.show.logo) return;
    const img = D.logoImg; if (!img) return;
    const an = anim(A, 'logo');
    const r = containRect(img.width, img.height, rect.x, rect.y, rect.w, rect.h, st.align === 'right' ? 1 : st.align === 'center' ? .5 : 0, st.v === 'bottom' ? 1 : st.v === 'middle' ? .5 : 0);
    ctx.save(); ctx.globalAlpha *= an.a; if (st.shadow) setShadow(ctx, 'rgba(0,0,0,.3)', r.h * .08, 0, r.h * .03);
    ctx.drawImage(img, r.x, r.y + an.dy * .5, r.w, r.h); ctx.restore();
  },
  headline(ctx, L, D, rect, st, A) { return textEl(ctx, D, 'headline', rect, st, A); },
  sub(ctx, L, D, rect, st, A) { return textEl(ctx, D, 'sub', rect, st, A); },
  cta(ctx, L, D, rect, st, A) {
    const text = D.text.cta; if (!D.show.cta || !text) return;
    const an = anim(A, 'cta'), h = rect.h, label = String(text).toUpperCase();
    let fs = h * .4; const fam = st.fam || FONT.mont, wt = st.wt || 800, arrowW = st.arrow === false ? 0 : h * .42;
    ctx.font = `${wt} ${fs}px ${fam}`; let tw = ctx.measureText(label).width; const maxTw = rect.w - h * .9 - arrowW;
    while (tw > maxTw && fs > 6) { fs *= .94; ctx.font = `${wt} ${fs}px ${fam}`; tw = ctx.measureText(label).width; }
    const w = Math.min(rect.w, tw + h * .9 + arrowW + (arrowW ? h * .12 : 0));
    const x = st.align === 'center' ? rect.x + (rect.w - w) / 2 : st.align === 'right' ? rect.x + rect.w - w : rect.x;
    ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(x + w / 2, rect.y + h / 2); ctx.scale(an.s, an.s); ctx.translate(-(x + w / 2), -(rect.y + h / 2));
    setShadow(ctx, 'rgba(0,0,0,.25)', h * .25, 0, h * .08);
    rr(ctx, x, rect.y, w, h, st.radius != null ? h * st.radius : h / 2);
    if (st.fill && st.fill !== 'none') { ctx.fillStyle = st.fill; ctx.fill(); }
    noShadow(ctx);
    if (st.stroke) { ctx.lineWidth = h * .06; ctx.strokeStyle = st.stroke; ctx.stroke(); }
    ctx.fillStyle = st.ink || '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = `${wt} ${fs}px ${fam}`;
    ctx.fillText(label, x + h * .45, rect.y + h / 2 + fs * .05);
    if (arrowW) {
      const ax = x + w - h * .45 - arrowW * .55, ay = rect.y + h / 2, aw = arrowW * .62; ctx.strokeStyle = st.ink || '#fff'; ctx.lineWidth = fs * .16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + aw, ay); ctx.moveTo(ax + aw * .55, ay - aw * .42); ctx.lineTo(ax + aw, ay); ctx.lineTo(ax + aw * .55, ay + aw * .42); ctx.stroke();
    }
    ctx.restore();
  },
  price(ctx, L, D, rect, st, A) {
    const p = String(D.text.price || '').trim(); if (!D.show.price || !p) return;
    const an = anim(A, 'price'), R = Math.min(rect.w, rect.h) / 2, cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(cx, cy); ctx.scale(an.s, an.s); ctx.rotate(rad(st.rot ?? -8));
    setShadow(ctx, 'rgba(0,0,0,.28)', R * .25, 0, R * .08);
    ctx.beginPath();
    if (st.shape === 'circle') ctx.arc(0, 0, R, 0, Math.PI * 2);
    else { const n = 18; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr2 = i % 2 ? R * .86 : R; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath(); }
    ctx.fillStyle = st.fill || '#ee4e8d'; ctx.fill(); noShadow(ctx);
    if (st.ring) { ctx.beginPath(); ctx.arc(0, 0, R * .8, 0, Math.PI * 2); ctx.lineWidth = R * .03; ctx.strokeStyle = st.ring; ctx.stroke(); }
    const m = p.match(/^([^\d]*?)\s*([\d][\d.,]*)\s*(.*)$/);
    ctx.fillStyle = st.ink || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (m) {
      const top = (m[1] || 'Only').trim().toUpperCase(), big = m[2] + (m[3] ? ' ' + m[3] : '');
      let bs = R * .78; ctx.font = `900 ${bs}px ${FONT.mont}`; while (ctx.measureText(big).width > R * 1.42 && bs > 6) { bs *= .93; ctx.font = `900 ${bs}px ${FONT.mont}`; }
      ctx.fillText(big, 0, R * .16);
      let ts = R * .3; ctx.font = `800 ${ts}px ${FONT.mont}`; while (ctx.measureText(top).width > R * 1.1 && ts > 5) { ts *= .93; ctx.font = `800 ${ts}px ${FONT.mont}`; }
      ctx.fillText(top, 0, -R * .42);
    } else {
      let bs = R * .5; ctx.font = `900 ${bs}px ${FONT.mont}`; const ls = wrapText(ctx, p.toUpperCase(), R * 1.4);
      while ((ls.length > 2 || ls.some(l => ctx.measureText(l).width > R * 1.45)) && bs > 6) { bs *= .92; ctx.font = `900 ${bs}px ${FONT.mont}`; }
      const lines = wrapText(ctx, p.toUpperCase(), R * 1.45).slice(0, 2); lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * bs * 1.05));
    }
    ctx.restore();
  },
  site(ctx, L, D, rect, st, A) {
    const s = D.brand.site; if (!D.show.site || !s) return;
    const an = anim(A, 'site'), h = rect.h, style = st.style || 'outline';
    let fs = h * .48; ctx.font = `800 ${fs}px ${FONT.mont}`; let tw = ctx.measureText(s).width;
    const icon = h * .58, pad = style === 'text' ? 0 : h * .32, gap = h * .16;
    const maxTw = rect.w - pad * 2 - icon - gap;
    while (tw > maxTw && fs > 6) { fs *= .94; ctx.font = `800 ${fs}px ${FONT.mont}`; tw = ctx.measureText(s).width; }
    const content = icon + gap + tw, w = style === 'bar' ? rect.w : content + pad * 2;
    const x = st.align === 'center' ? rect.x + (rect.w - w) / 2 : st.align === 'right' ? rect.x + rect.w - w : rect.x;
    ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy * .6);
    if (style !== 'text') {
      rr(ctx, x, rect.y, w, h, style === 'bar' ? h * .5 : h * .24);
      if (style === 'outline') { ctx.fillStyle = st.fill || '#fff'; ctx.fill(); ctx.lineWidth = h * .07; ctx.strokeStyle = st.color; ctx.stroke(); }
      else { setShadow(ctx, 'rgba(0,0,0,.2)', h * .3, 0, h * .08); ctx.fillStyle = st.fill || st.color; ctx.fill(); noShadow(ctx); }
    }
    const cx0 = (style === 'bar' ? x + (w - content) / 2 : x + pad);
    linkIcon(ctx, cx0 + icon / 2, rect.y + h / 2, icon, st.icon || st.color, icon * .14);
    ctx.fillStyle = st.ink || '#0b0b0b'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = `800 ${fs}px ${FONT.mont}`;
    ctx.fillText(s, cx0 + icon + gap, rect.y + h / 2 + fs * .04);
    ctx.restore();
  },
  tag(ctx, L, D, rect, st, A) {
    const t = D.text.tag; if (!D.show.tag || !t) return;
    const an = anim(A, 'tag'); ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy * .5);
    if (st.style === 'label') {
      const h = rect.h; let fs = h * .56; ctx.font = `900 ${fs}px ${FONT.mont}`; let tw = ctx.measureText(t.toUpperCase()).width;
      while (tw > rect.w - h * .7 && fs > 6) { fs *= .93; ctx.font = `900 ${fs}px ${FONT.mont}`; tw = ctx.measureText(t.toUpperCase()).width; }
      const w = tw + h * .7, x = st.align === 'left' ? rect.x : st.align === 'center' ? rect.x + (rect.w - w) / 2 : rect.x + rect.w - w;
      setShadow(ctx, 'rgba(0,0,0,.25)', h * .2, 0, h * .06); rr(ctx, x, rect.y, w, h, h * .18); ctx.fillStyle = st.fill; ctx.fill(); noShadow(ctx);
      ctx.fillStyle = st.ink || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.toUpperCase(), x + w / 2, rect.y + h / 2 + fs * .04);
    } else {
      const f = fitText(ctx, t, { fam: st.fam || FONT.serif, wt: st.wt || 400, max: rect.h, w: rect.w, h: rect.h, lines: 1, lh: 1 });
      ctx.font = f.font; ctx.fillStyle = st.color; ctx.textBaseline = 'middle'; ctx.textAlign = st.align || 'right';
      const x = ctx.textAlign === 'center' ? rect.x + rect.w / 2 : ctx.textAlign === 'right' ? rect.x + rect.w : rect.x;
      if (st.shadow) setShadow(ctx, st.shadow, f.size * .2, 0, f.size * .05);
      ctx.fillText(f.lines[0], x, rect.y + rect.h / 2 + f.size * .05);
    }
    ctx.restore();
  }
};
function textEl(ctx, D, key, rect, st, A) {
  const text = D.text[key]; if (!D.show[key] || !text) return;
  const an = anim(A, key);
  const f = fitText(ctx, text, { fam: st.fam, wt: st.wt, max: st.max ? st.max * rect.h : rect.h, min: st.min, w: rect.w, h: rect.h, lines: st.lines || 2, lh: st.lh || 1.06, upper: st.upper });
  ctx.font = f.font;
  const lh = f.size * (st.lh || 1.06), total = f.lines.length * lh;
  const capH = ctx.measureText('H').actualBoundingBoxAscent || f.size * .72;
  const y0 = st.v === 'bottom' ? rect.y + rect.h - total : st.v === 'middle' ? rect.y + (rect.h - total) / 2 : rect.y;
  const x = st.align === 'center' ? rect.x + rect.w / 2 : st.align === 'right' ? rect.x + rect.w : rect.x;
  ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy); ctx.textAlign = st.align || 'left'; ctx.textBaseline = 'alphabetic';
  if (st.shadow) setShadow(ctx, st.shadow, f.size * .22, 0, f.size * .05);
  f.lines.forEach((ln, i) => { ctx.fillStyle = st.accent && f.lines.length > 1 && i === f.lines.length - 1 ? st.accent : st.color; ctx.fillText(ln, x, y0 + i * lh + (lh + capH) / 2); });
  ctx.restore();
}
function linkIcon(ctx, cx, cy, s, color, lw) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 4); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const w = s * .56, h = s * .34, off = s * .19;
  rr(ctx, -w / 2 - off, -h / 2, w, h, h / 2); ctx.stroke(); rr(ctx, -w / 2 + off, -h / 2, w, h, h / 2); ctx.stroke(); ctx.restore();
}


// ---------- more elements: offer label, deal price, quote, steps, chat ----------
const DEFAULT_STEPS = 'Visit {site}\nPay {price} via {payment}\nGet your PDF on WhatsApp or email';
function labelPill(ctx, text, rect, st) {
  const h = rect.h, t = String(text).toUpperCase(); let fs = h * .52; ctx.font = `900 ${fs}px ${FONT.mont}`; let tw = ctx.measureText(t).width;
  while (tw > rect.w - h * .8 && fs > 6) { fs *= .93; ctx.font = `900 ${fs}px ${FONT.mont}`; tw = ctx.measureText(t).width; }
  const w = tw + h * .8, x = st.align === 'center' ? rect.x + (rect.w - w) / 2 : st.align === 'right' ? rect.x + rect.w - w : rect.x;
  setShadow(ctx, 'rgba(0,0,0,.25)', h * .2, 0, h * .06); rr(ctx, x, rect.y, w, h, h * (st.radius ?? .18)); ctx.fillStyle = st.fill; ctx.fill(); noShadow(ctx);
  ctx.fillStyle = st.ink || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + w / 2, rect.y + h / 2 + fs * .04);
}
function star(ctx, cx, cy, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill(); }
function stepLines(D) {
  const b = D.brand, raw = String(b.steps || DEFAULT_STEPS).split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4);
  return raw.map(s => s.replace(/\{site\}/g, b.site || 'our page').replace(/\{price\}/g, D.text.price || b.price).replace(/\{payment\}/g, b.payment || 'M-Pesa').replace(/\{title\}/g, D.title || 'the book'));
}
const chatCache = new Map();
function chatCanvas(D) {
  const b = D.brand, title = D.title || 'Your book', price = D.text.price || b.price, pay = b.payment || 'M-Pesa';
  const key = [title, price, pay, b.name, b.dark, b.logo ? b.logo.length : 0].join('|');
  if (chatCache.has(key)) return chatCache.get(key);
  const W = 620, H = 1270, r = 92, c = mk(W, H), x = ctx2(c);
  rr(x, 0, 0, W, H, r); const body = x.createLinearGradient(0, 0, W, H); body.addColorStop(0, '#3a3e46'); body.addColorStop(1, '#16181c'); x.fillStyle = body; x.fill();
  const bz = 18; rr(x, bz, bz, W - 2 * bz, H - 2 * bz, r - bz); x.fillStyle = '#050506'; x.fill();
  const sx = bz + 10, sy = bz + 10, sw = W - 2 * sx, sh = H - 2 * sy;
  x.save(); rr(x, sx, sy, sw, sh, r - bz - 10); x.clip();
  x.fillStyle = '#efe7dd'; x.fillRect(sx, sy, sw, sh);
  const rnd = seeded(5); x.fillStyle = 'rgba(120,100,80,.07)'; for (let i = 0; i < 140; i++) { x.beginPath(); x.arc(sx + rnd() * sw, sy + rnd() * sh, 2 + rnd() * 5, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = b.dark; x.fillRect(sx, sy, sw, 168);
  const logo = logoImgFor(b); x.save(); x.beginPath(); x.arc(sx + 70, sy + 112, 34, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.clip(); x.drawImage(logo, sx + 36, sy + 78, 68, 68); x.restore();
  x.fillStyle = '#fff'; x.font = `700 27px ${FONT.ui}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(b.name || 'Shop', sx + 122, sy + 100);
  x.font = `500 20px ${FONT.ui}`; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText('online', sx + 122, sy + 130);
  let y = sy + 200; const maxW = sw * .72;
  const bubble = (text, out, time, doc) => {
    x.font = `500 23px ${FONT.ui}`;
    const lines = doc ? [] : wrapText(x, text, maxW - 40); const tw = doc ? maxW : Math.max(...lines.map(l => x.measureText(l).width)) + 40;
    const bw = Math.min(maxW, Math.max(tw, 150)), bh = doc ? 132 : lines.length * 31 + 44;
    const bx = out ? sx + sw - 22 - bw : sx + 22;
    x.save(); setShadow(x, 'rgba(0,0,0,.12)', 3, 0, 1); rr(x, bx, y, bw, bh, 16); x.fillStyle = out ? '#d9fdd3' : '#ffffff'; x.fill(); x.restore();
    x.fillStyle = '#1d2329';
    if (doc) {
      x.fillStyle = '#f5f6f6'; rr(x, bx + 10, y + 10, bw - 20, 84, 10); x.fill();
      x.fillStyle = '#e5322d'; rr(x, bx + 22, y + 20, 48, 64, 6); x.fill(); x.fillStyle = '#fff'; x.font = `800 15px ${FONT.mont}`; x.textAlign = 'center'; x.fillText('PDF', bx + 46, y + 54); x.textAlign = 'left';
      x.fillStyle = '#1d2329'; x.font = `600 22px ${FONT.ui}`; let t = title + '.pdf'; while (x.measureText(t).width > bw - 120 && t.length > 8) t = t.slice(0, -6) + '….pdf'; x.fillText(t, bx + 84, y + 42);
      x.fillStyle = '#6a7378'; x.font = `500 18px ${FONT.ui}`; x.fillText('PDF document', bx + 84, y + 70);
    } else lines.forEach((l, i) => { x.textBaseline = 'top'; x.fillText(l, bx + 20, y + 14 + i * 31); });
    x.textBaseline = 'alphabetic'; x.fillStyle = '#7c868c'; x.font = `500 16px ${FONT.ui}`; x.textAlign = 'right';
    x.fillText(time, bx + bw - (out ? 44 : 16), y + bh - 10); x.textAlign = 'left';
    if (out) { x.strokeStyle = '#4fb6ec'; x.lineWidth = 2.4; x.lineCap = 'round'; const tx = bx + bw - 38, ty = y + bh - 16; [0, 7].forEach(o => { x.beginPath(); x.moveTo(tx + o, ty); x.lineTo(tx + 4 + o, ty + 4); x.lineTo(tx + 11 + o, ty - 5); x.stroke(); }); }
    y += bh + 16;
  };
  bubble(`Hello, I'd like the PDF of ${title}`, true, '10:21');
  bubble(`Sure! Pay ${price} via ${pay} and we'll send it here.`, false, '10:21');
  bubble('Done, I have paid', true, '10:23');
  bubble('', false, '10:24', true);
  bubble('Here is your book. Enjoy reading!', false, '10:24');
  x.fillStyle = '#ffffff'; rr(x, sx + 16, sy + sh - 96, sw - 112, 66, 33); x.fill(); x.fillStyle = '#9aa3a8'; x.font = `500 22px ${FONT.ui}`; x.textBaseline = 'middle'; x.fillText('Message', sx + 44, sy + sh - 63);
  x.fillStyle = b.primary; x.beginPath(); x.arc(sx + sw - 50, sy + sh - 63, 33, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(sx + sw - 62, sy + sh - 77); x.lineTo(sx + sw - 34, sy + sh - 63); x.lineTo(sx + sw - 62, sy + sh - 49); x.closePath(); x.fill();
  x.restore();
  x.fillStyle = '#000'; rr(x, W / 2 - 80, sy + 22, 160, 44, 22); x.fill();
  if (chatCache.size > 10) chatCache.clear(); chatCache.set(key, c); return c;
}
Object.assign(EL, {
  offer(ctx, L, D, rect, st, A) {
    const t = D.text.offer; if (!t) return; const an = anim(A, 'offer');
    ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy * .5); labelPill(ctx, t, rect, st); ctx.restore();
  },
  deal(ctx, L, D, rect, st, A) {
    const now = String(D.text.price || '').trim(); if (!now || !D.show.price) return;
    const old = String(D.text.oldPrice || '').trim(), an = anim(A, 'deal');
    ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy);
    const al = st.align || 'left', topH = rect.h * .3, x = al === 'center' ? rect.x + rect.w / 2 : al === 'right' ? rect.x + rect.w : rect.x;
    ctx.textAlign = al; ctx.textBaseline = 'middle';
    const pre = old ? 'WAS ' : 'ONLY', oldT = old.toUpperCase();
    let fs = topH * .78; ctx.font = `800 ${fs}px ${FONT.mont}`; while (ctx.measureText(pre + oldT).width > rect.w && fs > 6) { fs *= .94; ctx.font = `800 ${fs}px ${FONT.mont}`; }
    ctx.fillStyle = st.soft; const ty = rect.y + topH / 2; ctx.fillText(pre + oldT, x, ty);
    if (old) {
      const full = ctx.measureText(pre + oldT).width, ow = ctx.measureText(oldT).width, start = al === 'center' ? x - full / 2 + (full - ow) : al === 'right' ? x - ow : x + full - ow;
      ctx.strokeStyle = st.strike || '#ff3b30'; ctx.lineWidth = Math.max(2, fs * .13); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(start - fs * .1, ty + fs * .08); ctx.lineTo(start + ow + fs * .1, ty - fs * .06); ctx.stroke();
    }
    const big = now.toUpperCase(); let bs = (rect.h - topH) * .95; ctx.font = `400 ${bs}px ${FONT.anton}`; while (ctx.measureText(big).width > rect.w && bs > 8) { bs *= .94; ctx.font = `400 ${bs}px ${FONT.anton}`; }
    if (st.shadow) setShadow(ctx, st.shadow, bs * .12, 0, bs * .04);
    ctx.fillStyle = st.color; ctx.fillText(big, x, rect.y + topH + (rect.h - topH) / 2 + bs * .04);
    ctx.restore();
  },
  quote(ctx, L, D, rect, st, A) {
    const q = String(D.text.quote || '').trim(), real = !!q, text = q || D.text.headline; if (!text) return;
    const an = anim(A, 'quote'); ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(0, an.dy);
    const al = st.align || 'left', x = al === 'center' ? rect.x + rect.w / 2 : rect.x; let y = rect.y;
    if (real && D.show.stars) { const sr = rect.h * .045; ctx.fillStyle = GOLD; for (let i = 0; i < 5; i++) star(ctx, (al === 'center' ? x - sr * 5.2 + sr : x + sr) + i * sr * 2.6, y + sr, sr); y += sr * 2 + rect.h * .04; }
    if (real) { const qs = rect.h * .28; ctx.font = `400 ${qs}px ${FONT.serif}`; ctx.fillStyle = st.accent; ctx.textAlign = al; ctx.textBaseline = 'alphabetic'; ctx.fillText('“', x - (al === 'center' ? 0 : qs * .04), y + qs * .72); y += qs * .5; }
    const by = String(D.text.quoteBy || '').trim(), foot = real && by ? rect.h * .1 : 0;
    const f = fitText(ctx, text, { fam: FONT.serif, wt: 400, max: rect.h * .2, min: rect.h * .05, w: rect.w, h: rect.y + rect.h - y - foot, lines: 7, lh: 1.14 });
    ctx.font = f.font; ctx.textAlign = al; ctx.fillStyle = st.color; ctx.textBaseline = 'alphabetic';
    const lh = f.size * 1.14, capH = ctx.measureText('H').actualBoundingBoxAscent || f.size * .7;
    f.lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lh + (lh + capH) / 2));
    if (foot) { const fy = y + f.lines.length * lh + foot * .7; ctx.font = `600 ${foot * .52}px ${FONT.mont}`; ctx.fillStyle = st.soft; ctx.fillText('— ' + by, x, fy); }
    ctx.restore();
  },
  steps(ctx, L, D, rect, st, A) {
    const lines = stepLines(D), n = lines.length; if (!n) return;
    const gap = rect.h * .05, rowH = (rect.h - gap * (n - 1)) / n, R = Math.min(rowH * .36, rect.w * .085);
    lines.forEach((ln, i) => {
      const an = anim(A ? { t: A.t - i * .3 } : null, 'steps'), y = rect.y + i * (rowH + gap);
      ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(an.dy * -.6, 0);
      ctx.fillStyle = st.badge; ctx.beginPath(); ctx.arc(rect.x + R, y + rowH / 2, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = st.badgeInk || '#fff'; ctx.font = `900 ${R * 1.1}px ${FONT.mont}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), rect.x + R, y + rowH / 2 + R * .05);
      const tx = rect.x + R * 2 + R * .6, f = fitText(ctx, ln, { fam: FONT.mont, wt: 700, max: Math.min(rowH * .42, R * 1.05), w: rect.x + rect.w - tx, h: rowH, lines: 2, lh: 1.15 });
      ctx.font = f.font; ctx.fillStyle = st.color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const lh = f.size * 1.15; f.lines.forEach((l, j) => ctx.fillText(l, tx, y + rowH / 2 + (j - (f.lines.length - 1) / 2) * lh));
      ctx.restore();
    });
  },
  chat(ctx, L, D, rect, st, A) {
    const img = chatCanvas(D), an = anim(A, 'chat'); const r = containRect(img.width, img.height, rect.x, rect.y, rect.w, rect.h, st.ax ?? .5, .5);
    ctx.save(); ctx.globalAlpha *= an.a; ctx.translate(r.x + r.w / 2, r.y + r.h / 2 + an.dy); ctx.rotate(rad(st.rot ?? 4));
    setShadow(ctx, 'rgba(0,0,0,.35)', r.h * .05, r.w * .04, r.h * .025); ctx.drawImage(img, -r.w / 2, -r.h / 2, r.w, r.h); ctx.restore();
  }
});
Object.assign(TIMELINE, { offer: [.6, 1.2], deal: [1.4, 2.0], quote: [.8, 1.6], steps: [1.0, 1.6], chat: [.5, 1.3] });

// ---------- scene props (desk, flat lay) ----------
const woodCache = new Map();
function woodCanvas(w, h, tone, seed) {
  const k = [w, h, tone.join(','), seed].join('|'); if (woodCache.has(k)) return woodCache.get(k);
  const c = mk(w, h), x = ctx2(c), rnd = seeded(seed), planks = 5, pw = w / planks;
  for (let i = 0; i < planks; i++) {
    const kk = .86 + rnd() * .24; x.fillStyle = rgbToHex(tone.map(v => v * kk)); x.fillRect(i * pw, 0, pw + 1, h);
    for (let g = 0; g < 34; g++) {
      const gx = i * pw + rnd() * pw, amp = 1 + rnd() * 5, ph = rnd() * 6, fr = 60 + rnd() * 140;
      x.strokeStyle = rnd() > .45 ? `rgba(60,34,14,${.05 + rnd() * .12})` : `rgba(255,235,205,${.04 + rnd() * .08})`; x.lineWidth = .6 + rnd() * 1.8;
      x.beginPath(); for (let y = 0; y <= h; y += 10) { const xx = gx + Math.sin(y / fr + ph) * amp; if (y === 0) x.moveTo(xx, y); else x.lineTo(xx, y); } x.stroke();
    }
    if (rnd() > .6) { const kx = i * pw + pw * (.3 + rnd() * .4), ky = rnd() * h; const g = x.createRadialGradient(kx, ky, 0, kx, ky, pw * .12); g.addColorStop(0, 'rgba(50,28,10,.45)'); g.addColorStop(1, 'rgba(50,28,10,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(kx, ky, pw * .08, pw * .16, 0, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = 'rgba(35,18,6,.38)'; x.fillRect(i * pw, 0, Math.max(1.5, w * .002), h);
  }
  if (woodCache.size > 8) woodCache.clear(); woodCache.set(k, c); return c;
}
function drawTabletop(ctx, wood, X, top, W, Hh) {
  const rows = Math.ceil(Hh / 2);
  for (let i = 0; i < rows; i++) {
    const t = i / rows, sw = wood.width * (1.15 - .55 * t), sx = (wood.width - sw) / 2, sy = wood.height * (1 - Math.pow(1 - t, 1.6)) * .98;
    ctx.drawImage(wood, sx, sy, sw, Math.max(1, wood.height * .004), X, top + i * 2, W, 2.6);
  }
  const fog = ctx.createLinearGradient(0, top, 0, top + Hh); fog.addColorStop(0, 'rgba(255,240,220,.28)'); fog.addColorStop(.25, 'rgba(255,240,220,0)'); fog.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.fillStyle = fog; ctx.fillRect(X, top, W, Hh);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(X, top, W, Math.max(1, Hh * .006));
}
function drawPlant(ctx, cx, base, s) {
  ctx.save();
  const rnd = seeded(21); const leaves = 11;
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + (rnd() - .5) * 2.3, len = s * (.55 + rnd() * .5), lw = len * .2;
    const bx = cx + (rnd() - .5) * s * .12, by = base - s * .38;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a + Math.PI / 2);
    const g = ctx.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, '#2f5d34'); g.addColorStop(1, i % 3 ? '#5f9a52' : '#78ad60'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lw, -len * .5, 0, -len); ctx.quadraticCurveTo(-lw, -len * .5, 0, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = Math.max(1, lw * .06); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len * .9); ctx.stroke(); ctx.restore();
  }
  const pw = s * .42, ph = s * .38, py = base - ph;
  setShadow(ctx, 'rgba(0,0,0,.25)', s * .06, -s * .05, s * .02);
  const pg = ctx.createLinearGradient(cx - pw / 2, 0, cx + pw / 2, 0); pg.addColorStop(0, '#b4613d'); pg.addColorStop(.45, '#d98a5f'); pg.addColorStop(1, '#8f4527'); ctx.fillStyle = pg;
  ctx.beginPath(); ctx.moveTo(cx - pw / 2, py); ctx.lineTo(cx + pw / 2, py); ctx.lineTo(cx + pw * .38, base); ctx.lineTo(cx - pw * .38, base); ctx.closePath(); ctx.fill(); noShadow(ctx);
  ctx.fillStyle = '#c97750'; ctx.fillRect(cx - pw * .53, py - ph * .06, pw * 1.06, ph * .16); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(cx - pw * .53, py - ph * .06, pw * 1.06, ph * .04);
  ctx.restore();
}
function drawMug(ctx, cx, base, s, color) {
  ctx.save(); const w = s * .5, h = s * .56, top = base - h;
  setShadow(ctx, 'rgba(0,0,0,.28)', s * .07, -s * .06, s * .02);
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, shade(color, .78)); g.addColorStop(.4, color); g.addColorStop(1, shade(color, .62)); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx + w / 2, top); ctx.lineTo(cx + w / 2, base - w * .1); ctx.quadraticCurveTo(cx + w / 2, base, cx + w * .4, base); ctx.lineTo(cx - w * .4, base); ctx.quadraticCurveTo(cx - w / 2, base, cx - w / 2, base - w * .1); ctx.closePath(); ctx.fill(); noShadow(ctx);
  ctx.strokeStyle = shade(color, .75); ctx.lineWidth = w * .11; ctx.beginPath(); ctx.ellipse(cx + w * .55, top + h * .45, w * .2, h * .22, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = '#3b2416'; ctx.beginPath(); ctx.ellipse(cx, top, w / 2, w * .1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = shade(color, 1.08); ctx.lineWidth = w * .03; ctx.stroke();
  ctx.restore();
}
function drawCoffeeTop(ctx, cx, cy, r) {
  ctx.save(); setShadow(ctx, 'rgba(0,0,0,.3)', r * .25, -r * .12, r * .1);
  ctx.fillStyle = '#f4f2ee'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); noShadow(ctx);
  ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = r * .02; ctx.beginPath(); ctx.arc(cx, cy, r * .82, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); setShadow(ctx, 'rgba(0,0,0,.22)', r * .12, -r * .05, r * .05); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r * .62, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx + r * .55, cy - r * .1, r * .32, r * .2); ctx.restore();
  const g = ctx.createRadialGradient(cx - r * .1, cy - r * .1, 0, cx, cy, r * .52); g.addColorStop(0, '#c99a6a'); g.addColorStop(.45, '#8a5a34'); g.addColorStop(1, '#4a2a16'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * .52, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(245,225,200,.6)'; ctx.lineWidth = r * .03; ctx.beginPath(); ctx.moveTo(cx - r * .12, cy - r * .2); ctx.bezierCurveTo(cx + r * .2, cy - r * .25, cx + r * .2, cy + r * .15, cx - r * .05, cy + r * .2); ctx.stroke();
  ctx.restore();
}
function drawSprig(ctx, x1, y1, x2, y2, s, color = '#8fa98a') {
  ctx.save(); setShadow(ctx, 'rgba(0,0,0,.22)', s * .05, -s * .03, s * .03);
  const mx = (x1 + x2) / 2 + (y2 - y1) * .15, my = (y1 + y2) / 2 - (x2 - x1) * .15;
  ctx.strokeStyle = '#6d7f63'; ctx.lineWidth = s * .018; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
  const n = 11;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2, py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
    const lr = s * (.075 - t * .03); [-1, 1].forEach(side => {
      const ang = Math.atan2(y2 - y1, x2 - x1) + side * 1.2;
      ctx.fillStyle = side > 0 ? color : shade(color, .9); ctx.beginPath(); ctx.ellipse(px + Math.cos(ang) * lr * .9, py + Math.sin(ang) * lr * .9, lr, lr * .82, ang, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.restore();
}
function drawPen(ctx, x1, y1, x2, y2, w) {
  ctx.save(); const a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1); ctx.translate(x1, y1); ctx.rotate(a);
  setShadow(ctx, 'rgba(0,0,0,.3)', w * .8, -w * .4, w * .6);
  const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, '#3b3f46'); g.addColorStop(.5, '#16181c'); g.addColorStop(1, '#0a0b0d'); ctx.fillStyle = g;
  rr(ctx, 0, -w / 2, len * .9, w, w / 2); ctx.fill(); noShadow(ctx);
  ctx.fillStyle = '#c9a54c'; ctx.beginPath(); ctx.moveTo(len * .9, -w * .35); ctx.lineTo(len, 0); ctx.lineTo(len * .9, w * .35); ctx.fill();
  ctx.fillStyle = '#d9b860'; rr(ctx, len * .08, -w * .62, len * .3, w * .22, w * .1); ctx.fill();
  ctx.restore();
}

