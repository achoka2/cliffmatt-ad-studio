(() => {
'use strict';
// ---------- tiny helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const rad = d => d * Math.PI / 180;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const ctx2 = (c, read) => c.getContext('2d', read ? { willReadFrequently: true } : undefined);
const slug = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const uid = () => Math.random().toString(36).slice(2, 10);
function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Could not encode image')), type, q));
function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return val === undefined ? null : false; } }

const FONT = {
  anton: '"Anton", Impact, "Arial Narrow", sans-serif',
  mont: '"Montserrat", "Arial Black", Arial, sans-serif',
  serif: '"DM Serif Display", Georgia, "Times New Roman", serif',
  bebas: '"Bebas Neue", Impact, sans-serif',
  ui: '"Plus Jakarta Sans", Arial, sans-serif'
};
const GOLD = '#ffd23f';

const SIZES = {
  square:    { w: 1080, h: 1080, name: 'Feed square',   ratio: '1:1',    file: '1x1',   k: 'sq' },
  portrait:  { w: 1080, h: 1350, name: 'Feed tall',     ratio: '4:5',    file: '4x5',   k: 'pt' },
  story:     { w: 1080, h: 1920, name: 'Stories, Reels', ratio: '9:16',  file: '9x16',  k: 'st' },
  landscape: { w: 1200, h: 628,  name: 'Link ad',       ratio: '1.91:1', file: '191x1', k: 'ls' }
};
const SIZE_ORDER = ['square', 'portrait', 'story', 'landscape'];

// ---------- colour ----------
function hexToRgb(h) { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHex(c) { return '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function rgbToHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function hslToRgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; if (s === 0) return [l * 255, l * 255, l * 255]; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]; }
const hsl = (h, s, l, a = 1) => `hsla(${h.toFixed(1)},${(clamp(s, 0, 1) * 100).toFixed(1)}%,${(clamp(l, 0, 1) * 100).toFixed(1)}%,${a})`;
function lum([r, g, b]) { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); }
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const shade = (hex, k) => rgbToHex(hexToRgb(hex).map(v => v * k));

// ---------- image analysis ----------
function analyze(cv) {
  const sw = 48, sh = Math.max(8, Math.round(48 * cv.height / cv.width));
  const c = mk(sw, sh), x = ctx2(c, true); x.drawImage(cv, 0, 0, sw, sh);
  const d = x.getImageData(0, 0, sw, sh).data;
  let sr = 0, sg = 0, sb = 0, n = 0; const buckets = new Map();
  let lr = 0, lg = 0, lb = 0, ln = 0, er = 0, eg = 0, eb = 0, en = 0;
  for (let y = 0; y < sh; y++) for (let xx = 0; xx < sw; xx++) {
    const i = (y * sw + xx) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    sr += r; sg += g; sb += b; n++;
    const k = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
    let e = buckets.get(k); if (!e) { e = [0, 0, 0, 0]; buckets.set(k, e); } e[0] += r; e[1] += g; e[2] += b; e[3]++;
    if (xx < 2) { lr += r; lg += g; lb += b; ln++; }
    if (xx < 1 || y < 1 || xx >= sw - 1 || y >= sh - 1) { er += r; eg += g; eb += b; en++; }
  }
  const avg = [sr / n, sg / n, sb / n];
  const list = [...buckets.values()].map(e => { const c = [e[0] / e[3], e[1] / e[3], e[2] / e[3]]; const [h, s, l] = rgbToHsl(c); return { c, h, s, l, n: e[3] }; }).sort((a, b) => b.n - a.n);
  const dominant = list[0].c;
  let vivid = null, best = -1;
  for (const e of list) { if (e.n < n * 0.012 || e.l < .18 || e.l > .86) continue; const sc = e.s * e.s * Math.sqrt(e.n); if (sc > best) { best = sc; vivid = e; } }
  const [dh, ds] = rgbToHsl(dominant);
  const base = vivid && vivid.s > .28 ? vivid : { h: dh, s: ds };
  return {
    avg, dominant, vivid: vivid && vivid.s > .28 ? vivid.c : null, hue: base.h, sat: base.s,
    dark: lum(avg) < .3, spine: rgbToHex([lr / ln, lg / ln, lb / ln]), edge: [er / en, eg / en, eb / en]
  };
}

function trimBorders(cv) {
  const w = cv.width, h = cv.height, x = ctx2(cv, true), d = x.getImageData(0, 0, w, h).data;
  const px = (xx, yy) => { const i = (yy * w + xx) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const ref = [0, 1, 2].map(k => corners.reduce((a, c) => a + c[k], 0) / 4);
  const transparent = corners.every(c => c[3] < 20);
  if (!transparent && Math.min(...ref) < 205) return cv; // only trim white / light padding or transparent edges
  const tol = 26, stepX = Math.max(1, (w / 220) | 0), stepY = Math.max(1, (h / 220) | 0);
  const same = i => transparent ? d[i + 3] < 20 : (Math.abs(d[i] - ref[0]) < tol && Math.abs(d[i + 1] - ref[1]) < tol && Math.abs(d[i + 2] - ref[2]) < tol);
  const rowBlank = yy => { for (let xx = 0; xx < w; xx += stepX) if (!same((yy * w + xx) * 4)) return false; return true; };
  const colBlank = xx => { for (let yy = 0; yy < h; yy += stepY) if (!same((yy * w + xx) * 4)) return false; return true; };
  let t = 0, b = h - 1, l = 0, r = w - 1;
  while (t < h * .25 && rowBlank(t)) t++;
  while (b > h * .75 && rowBlank(b)) b--;
  while (l < w * .25 && colBlank(l)) l++;
  while (r > w * .75 && colBlank(r)) r--;
  if (t === 0 && l === 0 && b === h - 1 && r === w - 1) return cv;
  const nw = r - l + 1, nh = b - t + 1; if (nw < w * .4 || nh < h * .4) return cv;
  const o = mk(nw, nh); ctx2(o).drawImage(cv, l, t, nw, nh, 0, 0, nw, nh); return o;
}

function imageToCanvas(img, maxSide = 1800) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const k = Math.min(1, maxSide / Math.max(w, h));
  const c = mk(w * k, h * k), x = ctx2(c); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); return c;
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file could not be opened as an image')); i.src = src; }); }
async function fileToCanvas(file, maxSide) {
  const url = URL.createObjectURL(file);
  try { const img = await loadImg(url); return imageToCanvas(img, maxSide); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function bbox(cv) {
  const w = cv.width, h = cv.height, d = ctx2(cv, true).getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4; let first = -1, last = -1;
    for (let x = 0; x < w; x++) if (d[row + x * 4 + 3] > 10) { first = x; break; }
    if (first < 0) continue;
    for (let x = w - 1; x >= first; x--) if (d[row + x * 4 + 3] > 10) { last = x; break; }
    if (first < minX) minX = first; if (last > maxX) maxX = last; if (y < minY) minY = y; maxY = y;
  }
  if (maxX < 0) return { x: 0, y: 0, w, h };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// ---------- canvas drawing helpers ----------
function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function setShadow(ctx, color, blur, ox = 0, oy = 0) { const k = ctx.getTransform().a || 1; ctx.shadowColor = color; ctx.shadowBlur = blur * k; ctx.shadowOffsetX = ox * k; ctx.shadowOffsetY = oy * k; }
function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
function coverFit(ctx, img, x, y, w, h, ax = .5, ay = .5) { const iw = img.width, ih = img.height, s = Math.max(w / iw, h / ih); const dw = iw * s, dh = ih * s; ctx.drawImage(img, x + (w - dw) * ax, y + (h - dh) * ay, dw, dh); }
function containRect(iw, ih, x, y, w, h, ax = .5, ay = .5) { const s = Math.min(w / iw, h / ih); const dw = iw * s, dh = ih * s; return { x: x + (w - dw) * ax, y: y + (h - dh) * ay, w: dw, h: dh, s }; }

let FILTER_OK = false;
try { const t = mk(8, 1), x = ctx2(t, true); x.fillStyle = '#fff'; x.fillRect(0, 0, 8, 1); x.filter = 'blur(2px)'; x.fillStyle = '#000'; x.fillRect(4, 0, 4, 1); FILTER_OK = x.getImageData(2, 0, 1, 1).data[0] < 250; } catch (e) { FILTER_OK = false; }

const blurCache = new Map();
function blurredFill(img, W, H, radius, key) {
  const ck = key ? `${key}|${W}x${H}|${radius}` : null;
  if (ck && blurCache.has(ck)) return blurCache.get(ck);
  const k = .25, w = Math.ceil(W * k), h = Math.ceil(H * k), r = radius * k;
  const c = mk(w, h), x = ctx2(c);
  if (FILTER_OK) { x.filter = `blur(${r}px)`; coverFit(x, img, -r * 2, -r * 2, w + r * 4, h + r * 4); x.filter = 'none'; }
  else {
    let src = img, sw = img.width, sh = img.height; const tw = Math.max(8, Math.round(w / (r / 2 + 1)));
    while (sw / 2 > tw) { sw = Math.round(sw / 2); sh = Math.round(sh / 2); const t = mk(sw, sh); ctx2(t).drawImage(src, 0, 0, sw, sh); src = t; }
    x.imageSmoothingQuality = 'high'; coverFit(x, src, 0, 0, w, h);
  }
  if (ck) { if (blurCache.size > 40) blurCache.clear(); blurCache.set(ck, c); }
  return c;
}

// ---------- text ----------
function wrapText(ctx, t, w) {
  const out = [];
  for (const para of String(t).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean); let line = '';
    for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (!line || ctx.measureText(test).width <= w) line = test; else { out.push(line); line = wd; } }
    if (line) out.push(line);
  }
  return out.length ? out : [''];
}
function balanceText(ctx, t, w, n) {
  let best = wrapText(ctx, t, w); if (n <= 1) return best;
  let lo = w * .35, hi = w;
  for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2, ls = wrapText(ctx, t, mid); if (ls.length <= n && ls.every(l => ctx.measureText(l).width <= w)) { best = ls; hi = mid; } else lo = mid; }
  return best;
}
function fitText(ctx, text, o) {
  const t = o.upper ? String(text).toUpperCase() : String(text);
  const lh = o.lh || 1.08, maxLines = o.lines || 2;
  let size = Math.max(6, o.max), minS = o.min || Math.max(9, o.max * .22);
  while (size >= minS) {
    ctx.font = `${o.wt} ${size}px ${o.fam}`;
    const ls = wrapText(ctx, t, o.w);
    if (ls.length <= maxLines && ls.length * size * lh <= o.h * 1.02 && ls.every(l => ctx.measureText(l).width <= o.w))
      return { size, lines: balanceText(ctx, t, o.w, ls.length), font: ctx.font };
    size = Math.floor(size * .94);
  }
  ctx.font = `${o.wt} ${minS}px ${o.fam}`;
  return { size: minS, lines: wrapText(ctx, t, o.w).slice(0, maxLines), font: ctx.font };
}

// ---------- animation timeline (video ads) ----------
const TIMELINE = { book: [0, 1.3], device: [.9, 1.7], logo: [.5, 1.1], headline: [.9, 1.5], sub: [1.25, 1.85], price: [1.7, 2.3], cta: [1.9, 2.5], site: [2.2, 2.8], tag: [2.2, 2.8] };
function anim(A, key) {
  if (!A) return { a: 1, dy: 0, s: 1 };
  const [s, e] = TIMELINE[key] || [0, .5]; const p = clamp((A.t - s) / (e - s), 0, 1), q = easeOut(p);
  let sc = 1;
  if (key === 'price' || key === 'cta') { sc = .55 + .45 * easeBack(p); if (A.t > 3.3) sc *= 1 + .05 * Math.max(0, Math.sin((A.t - 3.3) * Math.PI / .55)) * (((A.t - 3.3) % 1.6) < .55 ? 1 : 0); }
  return { a: q, dy: (1 - q) * 36, s: sc };
}

/* =========================================================================
   3D engine (three.js). Books stand or lie on an invisible floor that only
   catches their shadow; the shadow is rendered in its own pass and softened,
   then the book is drawn on top. Several books can share one scene.
   ========================================================================= */
const GL = (() => {
  const SIZE = 1400;
  let tried = false, ok = false, renderer = null, scene, camera, ground, shLight, stage, shadowCv, bareCv;
  const slots = {};
  function init() {
    if (tried) return ok; tried = true;
    try {
      if (!window.THREE) throw new Error('3D library missing');
      const cv = mk(SIZE, SIZE);
      renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE, false); renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(19, 1, .05, 200);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x9096a0, .72));
      const key = new THREE.DirectionalLight(0xffffff, .55); key.position.set(-3, 3.5, 6); scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, .42); fill.position.set(6, .8, 1.5); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffffff, .16); rim.position.set(3, 4, -3); scene.add(rim);
      shLight = new THREE.DirectionalLight(0xffffff, .0001); shLight.castShadow = true;
      shLight.shadow.mapSize.set(1024, 1024); shLight.shadow.bias = -.0006; shLight.shadow.normalBias = .02;
      scene.add(shLight, shLight.target);
      ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: .55 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
      stage = new THREE.Group(); scene.add(stage);
      shadowCv = mk(SIZE, SIZE); bareCv = mk(SIZE, SIZE);
      ok = true;
    } catch (e) { console.warn('3D mockups unavailable, using flat covers instead.', e); ok = false; }
    return ok;
  }
  const col = hex => new THREE.Color(hex).convertSRGBToLinear();
  function pagesCanvas(vertical) {
    const c = mk(512, 512), x = ctx2(c); x.fillStyle = '#f8f7f3'; x.fillRect(0, 0, 512, 512);
    const rnd = seeded(vertical ? 7 : 11);
    for (let i = 0; i < 512; i += 2) { x.fillStyle = `rgba(120,110,95,${.03 + rnd() * .09})`; if (vertical) x.fillRect(i, 0, 1, 512); else x.fillRect(0, i, 512, 1); }
    // bright next to the front cover, shaded towards the back board (as on real page blocks)
    const g = vertical ? x.createLinearGradient(0, 0, 512, 0) : x.createLinearGradient(0, 512, 0, 0);
    g.addColorStop(0, 'rgba(0,0,0,.12)'); g.addColorStop(.05, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(0,0,0,.04)'); g.addColorStop(.93, 'rgba(0,0,0,.24)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512); return c;
  }
  function spineCanvas(spec, frac) {
    const H = 2048, W = Math.max(48, Math.round(H * frac)); const c = mk(W, H), x = ctx2(c);
    x.fillStyle = spec.spineColor; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(.5, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.22)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const ink = lum(hexToRgb(spec.spineColor)) > .45 ? '#141414' : '#f4efe4';
    const title = (spec.title || '').toUpperCase(), author = (spec.author || '').toUpperCase();
    x.save(); x.translate(W / 2, 0); x.rotate(Math.PI / 2); x.fillStyle = ink; x.textBaseline = 'middle';
    let ts = Math.min(W * .46, 110); x.font = `800 ${ts}px ${FONT.mont}`;
    while (ts > 8 && x.measureText(title).width > H * .6) { ts -= 2; x.font = `800 ${ts}px ${FONT.mont}`; }
    x.textAlign = 'left'; x.fillText(title, H * .07, 0);
    let as = Math.min(W * .32, 70); x.font = `600 ${as}px ${FONT.mont}`;
    while (as > 8 && x.measureText(author).width > H * .26) { as -= 2; x.font = `600 ${as}px ${FONT.mont}`; }
    x.textAlign = 'right'; x.fillText(author, H * .94, 0);
    x.restore(); return c;
  }
  function pageFaceCanvas() {
    const c = mk(256, 360), x = ctx2(c); x.fillStyle = '#f7f5f0'; x.fillRect(0, 0, 256, 360);
    const rnd = seeded(3); x.fillStyle = 'rgba(70,64,56,.13)';
    for (let y = 40; y < 320; y += 11) { const w = 150 + rnd() * 50; x.fillRect(32, y, y % 77 < 11 ? w * .6 : w, 3); }
    const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(0,0,0,.1)'); g.addColorStop(.12, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 360);
    return c;
  }
  function backCoverCanvas(spec) {
    const w = 700, h = Math.round(700 * spec.cover.height / spec.cover.width), c = mk(w, h), x = ctx2(c);
    const sm = mk(14, Math.max(4, Math.round(14 * h / w))); ctx2(sm).drawImage(spec.cover, 0, 0, sm.width, sm.height); // colour wash, no readable mirrored text
    x.imageSmoothingQuality = 'high'; x.drawImage(sm, 0, 0, w, h);
    x.fillStyle = rgba(hexToRgb(spec.backColor), .72); x.fillRect(0, 0, w, h);
    const ink = lum(hexToRgb(spec.backColor)) > .45 ? 'rgba(20,20,20,' : 'rgba(250,246,238,';
    x.fillStyle = ink + '.95)'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = w * .08; x.font = `400 ${fs}px ${FONT.serif}`; const lines = wrapText(x, spec.title || '', w * .76).slice(0, 3);
    lines.forEach((l, i) => x.fillText(l, w / 2, h * .16 + i * fs * 1.15));
    const rnd = seeded(8); x.fillStyle = ink + '.32)';
    for (let i = 0; i < 11; i++) { const lw = w * (.55 + rnd() * .2) * (i % 4 === 3 ? .6 : 1); rr(x, (w - lw) / 2, h * .38 + i * h * .028, lw, h * .011, h * .005); x.fill(); }
    if (spec.author) { x.fillStyle = ink + '.9)'; x.font = `700 ${w * .035}px ${FONT.mont}`; x.fillText(spec.author.toUpperCase(), w / 2, h * .82); }
    return c;
  }
  function hingeCover(src) {
    const c = mk(src.width, src.height), x = ctx2(c); x.drawImage(src, 0, 0); const w = c.width, h = c.height, hx = w * .045, l = Math.max(1, w * .003);
    const g = x.createLinearGradient(0, 0, hx * 1.5, 0); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(.6, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, hx * 1.5, h);
    x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(hx, 0, l, h); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(hx + l, 0, l * 1.8, h); return c;
  }
  function sheenCanvas() {
    const c = mk(512, 512), x = ctx2(c); const g = x.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.3, 'rgba(255,255,255,0)'); g.addColorStop(.41, 'rgba(255,255,255,.5)'); g.addColorStop(.47, 'rgba(255,255,255,.14)'); g.addColorStop(.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    const r = x.createRadialGradient(70, 50, 0, 70, 50, 320); r.addColorStop(0, 'rgba(255,255,255,.32)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 512, 512); return c;
  }
  function clear(slot) {
    const s = slots[slot]; if (!s) return;
    s.clones.forEach(c => { if (c.parent) c.parent.remove(c); });
    s.disp.forEach(d => { try { d.dispose(); } catch (e) {} }); delete slots[slot];
  }
  function build(slot, spec) {
    if (!init()) return false;
    const key = [spec.type, spec.coverId, spec.thick, spec.spineColor, spec.backColor, spec.edgeColor, spec.title, spec.author].join('|');
    if (slots[slot] && slots[slot].key === key) return true;
    clear(slot);
    const disp = [], mats = [], root = new THREE.Group();
    const tex = cv => { const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); disp.push(t); return t; };
    const mat = o => { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: .6, metalness: 0 }, o)); disp.push(m); mats.push(m); return m; };
    const geo = g => { disp.push(g); return g; };
    const mesh = (g, m) => { const ms = new THREE.Mesh(g, m); ms.castShadow = true; return ms; };
    const ar = spec.cover.width / spec.cover.height;
    let H = 2, W = H * ar, T = H * spec.thick, front = T / 2;
    if (spec.type === 'hardcover' || spec.type === 'paperback' || spec.type === 'flat' || spec.type === 'openbook') {
      const coverMat = mat({ map: tex(spec.type === 'hardcover' ? hingeCover(spec.cover) : spec.cover), roughness: .5 });
      const backMat = mat({ color: col(spec.backColor), roughness: .6 });
      const pV = mat({ map: tex(pagesCanvas(true)), roughness: .95 }), pH = mat({ map: tex(pagesCanvas(false)), roughness: .95 });
      if (spec.type === 'hardcover' || spec.type === 'paperback') {
        const hard = spec.type === 'hardcover', b = hard ? .028 : .01, o = hard ? .03 : .004, sp = hard ? .02 : .006;
        const edgeMat = hard ? mat({ color: col(spec.edgeColor), roughness: .7 }) : mat({ color: col(spec.spineColor), roughness: .6 });
        const inside = mat({ color: col(hard ? '#efe8dc' : '#f7f6f2'), roughness: .9 }), pFace = mat({ map: tex(pageFaceCanvas()), roughness: .95 });
        const pivot = new THREE.Group(); pivot.name = 'frontPivot'; pivot.position.set(-W / 2, 0, T / 2 - b / 2);
        const fb = mesh(geo(new THREE.BoxGeometry(W, H, b)), [edgeMat, edgeMat, edgeMat, edgeMat, coverMat, inside]); fb.position.x = W / 2; pivot.add(fb);
        const bb = mesh(geo(new THREE.BoxGeometry(W, H, b)), [edgeMat, edgeMat, edgeMat, edgeMat, inside, backMat]); bb.position.z = -T / 2 + b / 2;
        const pages = mesh(geo(new THREE.BoxGeometry(W - o - sp, H - 2 * o, T - 2 * b)), [pV, pV, pH, pH, pFace, pFace]); pages.position.x = (sp - o) / 2;
        const spineMat = mat({ map: tex(spineCanvas(spec, hard ? T * 1.15 / H : T / H)), roughness: .55 });
        let spn;
        if (hard) { spn = mesh(geo(new THREE.CylinderGeometry(T / 2, T / 2, H, 32, 1, false, Math.PI, Math.PI)), [spineMat, edgeMat, edgeMat]); spn.scale.x = .3; spn.position.x = -W / 2; }
        else { spn = mesh(geo(new THREE.BoxGeometry(b, H, T)), [edgeMat, spineMat, edgeMat, edgeMat, edgeMat, edgeMat]); spn.position.x = -W / 2 + b / 2 - .002; }
        root.add(pivot, bb, pages, spn);
        root.userData.pivot = true;
      } else if (spec.type === 'openbook') {
        const b = .03, swing = rad(24), edge = mat({ color: col(spec.edgeColor), roughness: .7 }), inside = mat({ color: col('#efe8dc'), roughness: .9 });
        const backArt = mat({ map: tex(backCoverCanvas(spec)), roughness: .55 }), spineMat = mat({ map: tex(spineCanvas(spec, T / H)), roughness: .55 });
        const spn = mesh(geo(new THREE.BoxGeometry(T, H, b)), [edge, edge, edge, edge, spineMat, edge]);
        const fp = new THREE.Group(); fp.position.x = T / 2; fp.rotation.y = swing;
        const fb = mesh(geo(new THREE.BoxGeometry(W, H, b)), [edge, edge, edge, edge, coverMat, inside]); fb.position.x = W / 2; fp.add(fb);
        const bp = new THREE.Group(); bp.position.x = -T / 2; bp.rotation.y = -swing;
        const bk = mesh(geo(new THREE.BoxGeometry(W, H, b)), [edge, edge, edge, edge, backArt, inside]); bk.position.x = -W / 2; bp.add(bk);
        const pg = geo(new THREE.PlaneGeometry(W * .95, H * .97)); pg.translate(W * .475, 0, 0);
        const pm = mat({ map: tex(pageFaceCanvas()), side: THREE.DoubleSide, roughness: .92 });
        const N = 44;
        for (let i = 0; i < N; i++) {
          const t = i / (N - 1), u = Math.sign(t - .5) * Math.pow(Math.abs(2 * t - 1), .55);
          const ph = rad(90 - u * 70), pmh = mesh(pg, pm); pmh.position.set(0, 0, -b * .6); pmh.rotation.y = ph; root.add(pmh);
        }
        root.add(spn, fp, bp);
        W = W * 2 + T; T = W * .5;
        spec._noSheen = true;
      } else {
        T = H * .012; front = T / 2; const e = mat({ color: col('#f3f1ec'), roughness: .8 });
        root.add(mesh(geo(new THREE.BoxGeometry(W, H, T)), [e, e, e, e, coverMat, backMat]));
      }
    } else if (spec.type === 'phone') {
      const pc = spec.phoneCanvas; W = H * pc.width / pc.height; T = H * .055;
      const r = W * .14, sh = new THREE.Shape(), x0 = -W / 2, y0 = -H / 2;
      sh.moveTo(x0 + r, y0); sh.lineTo(x0 + W - r, y0); sh.quadraticCurveTo(x0 + W, y0, x0 + W, y0 + r); sh.lineTo(x0 + W, y0 + H - r); sh.quadraticCurveTo(x0 + W, y0 + H, x0 + W - r, y0 + H);
      sh.lineTo(x0 + r, y0 + H); sh.quadraticCurveTo(x0, y0 + H, x0, y0 + H - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
      const g = geo(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: true, bevelThickness: T * .18, bevelSize: W * .012, bevelSegments: 4, curveSegments: 18 }));
      g.translate(0, 0, -T / 2);
      const pos = g.attributes.position, uv = g.attributes.uv, grp = g.groups.find(q => q.materialIndex === 0);
      if (grp && uv) {
        const idx = g.index; const ids = [];
        for (let i = grp.start; i < grp.start + grp.count; i++) ids.push(idx ? idx.getX(i) : i);
        let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; ids.forEach(v => { const px = pos.getX(v), py = pos.getY(v); mnx = Math.min(mnx, px); mxx = Math.max(mxx, px); mny = Math.min(mny, py); mxy = Math.max(mxy, py); });
        ids.forEach(v => uv.setXY(v, (pos.getX(v) - mnx) / (mxx - mnx), (pos.getY(v) - mny) / (mxy - mny)));
        uv.needsUpdate = true;
      }
      const screen = mat({ map: tex(pc), roughness: .25 }), body = mat({ color: col('#2b2e34'), roughness: .35, metalness: .25 });
      root.add(mesh(g, [screen, body]));
      g.computeBoundingBox(); front = g.boundingBox.max.z; T = g.boundingBox.max.z - g.boundingBox.min.z;
    }
    const sheenMat = new THREE.MeshBasicMaterial({ map: tex(sheenCanvas()), transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }); disp.push(sheenMat);
    if (!spec._noSheen) {
      const sg = geo(new THREE.PlaneGeometry(spec.type === 'phone' ? W : H * ar, H)), sheen = new THREE.Mesh(sg, sheenMat);
      const pv = root.getObjectByName('frontPivot');
      if (pv) { sheen.position.set(H * ar / 2, 0, (spec.type === 'hardcover' ? .028 : .01) / 2 + .004); pv.add(sheen); }
      else { sheen.position.z = front + .004; root.add(sheen); }
    }
    slots[slot] = { key, root, disp, mats, sheenMat, clones: [], dims: { W, H, T } };
    return true;
  }
  const smallA = mk(8, 8), smallB = mk(8, 8);
  function softShadow(x, w, h, k) {
    // blur at reduced size: the shadow is soft anyway, and this keeps video frames fast
    const qa = Math.round(w / 4), qb = Math.round(w / 2);
    if (smallA.width !== qa) { smallA.width = smallA.height = qa; smallB.width = smallB.height = qb; }
    const ax = ctx2(smallA), bx = ctx2(smallB); ax.clearRect(0, 0, qa, qa); bx.clearRect(0, 0, qb, qb);
    if (FILTER_OK) {
      ax.filter = `blur(${Math.max(1, qa * .03)}px)`; ax.drawImage(shadowCv, 0, 0, qa, qa); ax.filter = 'none';
      bx.filter = `blur(${Math.max(1, qb * .009)}px)`; bx.drawImage(shadowCv, 0, 0, qb, qb); bx.filter = 'none';
    } else {
      const t = mk(qa / 6, qa / 6); ctx2(t).drawImage(shadowCv, 0, 0, t.width, t.height); ax.imageSmoothingQuality = 'high'; ax.drawImage(t, 0, 0, qa, qa);
      const t2 = mk(qb / 4, qb / 4); ctx2(t2).drawImage(shadowCv, 0, 0, t2.width, t2.height); bx.imageSmoothingQuality = 'high'; bx.drawImage(t2, 0, 0, qb, qb);
    }
    x.save(); x.imageSmoothingQuality = 'high'; x.globalAlpha = .75 * k; x.drawImage(smallA, 0, 0, w, h); x.globalAlpha = .45 * k; x.drawImage(smallB, 0, 0, w, h); x.restore();
  }
  // items: [{slot, pose:'stand'|'lie', yaw, x, y, z, lean}], view: {elev, roll, gloss, shadow}
  function renderScene(items, view, target) {
    if (!init()) return null;
    while (stage.children.length) stage.remove(stage.children[0]);
    const used = {}, usedSlots = new Set();
    for (const it of items) {
      const s = slots[it.slot]; if (!s) continue;
      const n = used[it.slot] || 0; used[it.slot] = n + 1; usedSlots.add(s);
      let inst = s.clones[n]; if (!inst) { inst = s.root.clone(); s.clones[n] = inst; }
      const { H, T } = s.dims;
      if (it.pose === 'lie') { inst.rotation.set(-Math.PI / 2, rad(it.yaw || 0), 0, 'YXZ'); inst.position.set(it.x || 0, T / 2 + (it.y || 0), it.z || 0); }
      else { inst.rotation.set(rad(it.lean || 0), rad(it.yaw || 0), 0, 'YXZ'); inst.position.set(it.x || 0, H / 2 + (it.y || 0), it.z || 0); }
      const pv = inst.getObjectByName('frontPivot'); if (pv) pv.rotation.y = -rad(it.open || 0);
      stage.add(inst);
    }
    if (!stage.children.length) return null;
    stage.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(stage), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2 * 1.02;
    const elev = clamp(view.elev ?? 4, -15, 90), e = rad(Math.min(elev, 89.5)), d = r / Math.sin(rad(camera.fov / 2));
    camera.up.set(0, 1, 0);
    camera.position.set(c.x, c.y + Math.sin(e) * d, c.z + Math.cos(e) * d);
    camera.near = Math.max(.05, d - r * 2.2); camera.far = d + r * 2.2; camera.lookAt(c);
    if (view.roll) camera.rotateZ(rad(view.roll));
    camera.updateProjectionMatrix();
    const Ldir = new THREE.Vector3(1.1, 8, -.35).normalize();
    shLight.position.copy(c).addScaledVector(Ldir, r * 4); shLight.target.position.copy(c); shLight.target.updateMatrixWorld();
    const sc = shLight.shadow.camera; sc.left = sc.bottom = -r * 2.2; sc.right = sc.top = r * 2.2; sc.near = .1; sc.far = r * 9; sc.updateProjectionMatrix();
    usedSlots.forEach(s => { s.sheenMat.opacity = view.gloss ?? .3; });
    const x = ctx2(target); x.clearRect(0, 0, target.width, target.height);
    if (view.shadow !== false) {
      ground.visible = true;
      usedSlots.forEach(s => { s.mats.forEach(m => { m.colorWrite = false; m.depthWrite = false; }); s.sheenMat.visible = false; });
      renderer.render(scene, camera);
      const sx = ctx2(shadowCv); sx.clearRect(0, 0, SIZE, SIZE); sx.drawImage(renderer.domElement, 0, 0);
      usedSlots.forEach(s => { s.mats.forEach(m => { m.colorWrite = true; m.depthWrite = true; }); s.sheenMat.visible = true; });
      softShadow(x, target.width, target.height, view.shadowStrength ?? .85);
    }
    ground.visible = false;
    renderer.render(scene, camera);
    const bx = ctx2(bareCv); bx.clearRect(0, 0, SIZE, SIZE); bx.drawImage(renderer.domElement, 0, 0);
    x.drawImage(renderer.domElement, 0, 0, target.width, target.height);
    return target;
  }
  return { SIZE, init, build, renderScene, dims: slot => slots[slot] ? slots[slot].dims : { W: 1.33, H: 2, T: .2 }, bare: () => bareCv, get ok() { return init(); } };
})();

// ---------- phone screen ----------
function phoneCanvas(cover, title) {
  const W = 620, H = 1270, r = 92; const c = mk(W, H), x = ctx2(c);
  rr(x, 0, 0, W, H, r); const body = x.createLinearGradient(0, 0, W, H); body.addColorStop(0, '#3a3e46'); body.addColorStop(1, '#16181c'); x.fillStyle = body; x.fill();
  const b = 18; rr(x, b, b, W - 2 * b, H - 2 * b, r - b); x.fillStyle = '#050506'; x.fill();
  const sx = b + 10, sy = b + 10, sw = W - 2 * sx, sh = H - 2 * sy;
  x.save(); rr(x, sx, sy, sw, sh, r - b - 10); x.clip();
  x.fillStyle = '#e9e6df'; x.fillRect(sx, sy, sw, sh);
  x.fillStyle = '#ffffff'; x.fillRect(sx, sy, sw, 150);
  x.fillStyle = '#1b2333'; x.font = `600 26px ${FONT.ui}`; x.textBaseline = 'middle'; x.textAlign = 'left';
  let t = (title || 'Book') + '.pdf'; while (x.measureText(t).width > sw - 190 && t.length > 6) t = t.slice(0, -6) + '….pdf';
  x.fillText(t, sx + 34, sy + 108);
  x.fillStyle = '#d6111c'; rr(x, sx + sw - 104, sy + 88, 72, 40, 8); x.fill(); x.fillStyle = '#fff'; x.font = `800 22px ${FONT.mont}`; x.textAlign = 'center'; x.fillText('PDF', sx + sw - 68, sy + 109);
  x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(sx, sy + 150, sw, 2);
  const area = { x: sx + 36, y: sy + 190, w: sw - 72, h: sh - 300 };
  const cr = containRect(cover.width, cover.height, area.x, area.y, area.w, area.h, .5, .35);
  x.save(); setShadow(x, 'rgba(0,0,0,.28)', 18, 0, 6); x.drawImage(cover, cr.x, cr.y, cr.w, cr.h); x.restore();
  x.fillStyle = 'rgba(27,35,51,.55)'; x.font = `600 22px ${FONT.ui}`; x.textAlign = 'center'; x.fillText('Page 1', sx + sw / 2, sy + sh - 58);
  const gl = x.createLinearGradient(sx, sy, sx + sw, sy + sh * .6); gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(.45, 'rgba(255,255,255,0)'); x.fillStyle = gl; x.fillRect(sx, sy, sw, sh);
  x.restore();
  x.fillStyle = '#000'; rr(x, W / 2 - 80, sy + 22, 160, 44, 22); x.fill();
  return c;
}

// ---------- logo badge (used when no logo has been uploaded) ----------
const badgeCache = new Map();
function badgeFor(brand) {
  const key = brand.name + brand.primary + brand.dark;
  if (badgeCache.has(key)) return badgeCache.get(key);
  const S = 512, c = mk(S, S), x = ctx2(c);
  x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); x.fillStyle = '#ffffff'; x.fill();
  x.lineWidth = 22; x.strokeStyle = brand.primary; x.stroke();
  x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 40, 0, Math.PI * 2); x.lineWidth = 3; x.strokeStyle = brand.dark; x.globalAlpha = .35; x.stroke(); x.globalAlpha = 1;
  const words = (brand.name || 'Brand').trim().split(/\s+/); const first = (words[0] || '').toUpperCase(), rest = words.slice(1).join(' ').toUpperCase();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = brand.dark;
  let s = 120; x.font = `900 ${s}px ${FONT.mont}`; while (s > 20 && x.measureText(first).width > 350) { s -= 3; x.font = `900 ${s}px ${FONT.mont}`; }
  x.fillText(first, S / 2, rest ? S / 2 - 18 : S / 2);
  if (rest) {
    let r = 54; x.font = `800 ${r}px ${FONT.mont}`; while (r > 14 && x.measureText(rest).width > 260) { r -= 2; x.font = `800 ${r}px ${FONT.mont}`; }
    const tw = x.measureText(rest).width + 48; x.fillStyle = brand.primary; rr(x, S / 2 - tw / 2, S / 2 + s * .42, tw, r * 1.5, r * .75); x.fill();
    x.fillStyle = '#fff'; x.fillText(rest, S / 2, S / 2 + s * .42 + r * .78);
  }
  badgeCache.set(key, c); return c;
}

// ---------- sample cover (shown before the first upload) ----------
function sampleCover() {
  const W = 800, H = 1200, c = mk(W, H), x = ctx2(c);
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0f2140'); sky.addColorStop(.42, '#6d3460'); sky.addColorStop(.66, '#e2733a'); sky.addColorStop(.8, '#f6b24a'); sky.addColorStop(1, '#f6b24a');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  const sun = x.createRadialGradient(W * .5, H * .7, 0, W * .5, H * .7, 360); sun.addColorStop(0, 'rgba(255,236,170,1)'); sun.addColorStop(.25, 'rgba(255,214,120,.9)'); sun.addColorStop(.26, 'rgba(255,190,100,.45)'); sun.addColorStop(1, 'rgba(255,170,80,0)');
  x.fillStyle = sun; x.fillRect(0, 0, W, H);
  const rnd = seeded(42); x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 70; i++) { const s = rnd() * 2.2; x.fillRect(rnd() * W, rnd() * H * .38, s, s); }
  x.fillStyle = '#2a1830'; x.beginPath(); x.moveTo(0, H * .8); for (let i = 0; i <= 10; i++) x.lineTo(W * i / 10, H * (.77 + Math.sin(i * 1.3) * .02)); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  x.fillStyle = '#120b16'; x.beginPath(); x.moveTo(0, H * .86); x.quadraticCurveTo(W * .5, H * .8, W, H * .87); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  const tx = W * .68, ty = H * .83; x.strokeStyle = '#120b16'; x.lineCap = 'round';
  x.lineWidth = 14; x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx - 6, ty - 90, tx - 30, ty - 150); x.stroke();
  x.lineWidth = 8; x.beginPath(); x.moveTo(tx - 6, ty - 80); x.quadraticCurveTo(tx + 30, ty - 120, tx + 60, ty - 150); x.stroke();
  x.fillStyle = '#120b16'; [[-120, -165, 110, 26], [-30, -180, 140, 30], [60, -168, 100, 24], [-70, -150, 120, 18]].forEach(([dx, dy, rx, ry]) => { x.beginPath(); x.ellipse(tx + dx + 40, ty + dy, rx, ry, 0, 0, Math.PI * 2); x.fill(); });
  x.textAlign = 'center'; x.fillStyle = '#fbe9cf'; x.font = `400 128px ${FONT.serif}`; x.fillText('The Long', W / 2, 250); x.fillText('Rains', W / 2, 380);
  x.font = `600 26px ${FONT.mont}`; x.fillStyle = 'rgba(251,233,207,.85)'; if ('letterSpacing' in x) x.letterSpacing = '8px'; x.fillText('A NOVEL', W / 2, 450);
  x.font = `700 34px ${FONT.mont}`; x.fillStyle = '#fbe9cf'; x.fillText('AMANI OTIENO', W / 2, H - 70); if ('letterSpacing' in x) x.letterSpacing = '0px';
  return c;
}


/* =========================================================================
   State
   ========================================================================= */
const DEFAULT_BRANDS = [
  { id: 'cliffmatt', name: 'Cliffmatt Books', site: 'cliffmatt.co.ke', primary: '#ee4e8d', dark: '#0F2A49', siteColor: '#139b90', tagColor: '#d6111c', price: 'Ksh 100', tag: 'PDF', cta: 'Get your PDF now', delivery: 'Your PDF arrives on WhatsApp or email right after payment', payment: 'M-Pesa', steps: 'Visit {site}\nPay {price} via {payment}\nGet your PDF on WhatsApp or email', logo: null },
  { id: 'pdfworld', name: 'PDF World', site: '', primary: '#f08c00', dark: '#14213d', siteColor: '#2563eb', tagColor: '#d6111c', price: 'Ksh 100', tag: 'PDF', cta: 'Download the PDF', delivery: 'Your PDF arrives on WhatsApp or email right after payment', payment: 'M-Pesa', steps: 'Order on our page\nPay {price} via {payment}\nGet your PDF on WhatsApp or email', logo: null }
];
const ANGLES = { right: { pose: 'stand', turn: -30, tilt: 3, spin: 0 }, front: { pose: 'stand', turn: -12, tilt: 4, spin: 0 }, spine: { pose: 'stand', turn: 32, tilt: 5, spin: 0 }, hero: { pose: 'stand', turn: -40, tilt: 16, spin: -3 }, lying: { pose: 'lie', turn: -24, tilt: 46, spin: 0 }, above: { pose: 'lie', turn: -10, tilt: 90, spin: 0 } };
const MOCK_DEFAULT = { v: 2, type: 'hardcover', pose: 'stand', angle: 'right', turn: -30, tilt: 3, spin: 0, thick: 16, gloss: 25, spineAuto: true, spineColor: '#222222' };
const KEY = 'cmAdStudio.v1';
const saved = store(KEY) || {};
const S = {
  brands: Array.isArray(saved.brands) && saved.brands.length ? saved.brands : JSON.parse(JSON.stringify(DEFAULT_BRANDS)),
  brandId: saved.brandId || 'cliffmatt',
  cover: null, info: null, coverId: 0, isSample: true, coverBlobName: '',
  title: '', author: '',
  text: { headline: '', sub: '', cta: '', tag: '', price: '', offer: '', kicker: '', oldPrice: '', quote: '', quoteBy: '' },
  auto: { headline: true, sub: true, cta: true, tag: true, price: true, offer: true, kicker: true },
  show: Object.assign({ headline: true, sub: true, cta: true, tag: true, kicker: true, logo: true, price: true, site: true, device: true, stars: false }, saved.show || {}),
  mock: Object.assign({}, MOCK_DEFAULT, saved.mock && saved.mock.v === 2 ? saved.mock : (saved.mock ? { type: saved.mock.type } : {})),
  extra: [],
  template: saved.template || 'shop',
  size: saved.size || 'portrait',
  sizesOn: Object.assign({ square: true, portrait: true, story: true, landscape: true }, saved.sizesOn || {}),
  fmt: saved.fmt || 'png',
  bg: Object.assign({ mode: 'template', color: '#0F2A49', color2: '#2a4f7f', grad: true, imgId: null, dim: 0 }, saved.bg || {}),
  pos: { scale: 1, x: 0, y: 0 },
  safe: saved.safe !== false,
  book: null, device: null, bgImg: null, bgDark: true,
  aiCopy: null
};
if (!S.brands.find(b => b.id === S.brandId)) S.brandId = S.brands[0].id;
const brand = () => S.brands.find(b => b.id === S.brandId) || S.brands[0];
function persist() {
  const ok = store(KEY, { brands: S.brands, brandId: S.brandId, show: S.show, mock: S.mock, template: S.template, size: S.size, sizesOn: S.sizesOn, fmt: S.fmt, bg: Object.assign({}, S.bg), safe: S.safe });
  if (!ok) console.warn('Settings could not be saved in this browser.');
}
const logoCache = new Map();
function logoImgFor(b) {
  if (!b.logo) return badgeFor(b);
  const hit = logoCache.get(b.logo); if (hit) return hit.ready ? hit.cv : badgeFor(b);
  const entry = { ready: false, cv: null }; logoCache.set(b.logo, entry);
  loadImg(b.logo).then(img => { entry.cv = imageToCanvas(img, 600); entry.ready = true; invalidate(); }).catch(() => {});
  return badgeFor(b);
}


/* =========================================================================
   Product (mockup) rendering
   ========================================================================= */
const PROD = mk(GL.SIZE, GL.SIZE);
function mockSpec(cover, info, mock, title, author, coverId, type) {
  const t = type || mock.type;
  return {
    type: t, cover, coverId, title, author,
    thick: t === 'paperback' ? Math.max(.02, mock.thick * .8 / 100) : mock.thick / 100,
    spineColor: mock.spineAuto ? info.spine : mock.spineColor,
    backColor: rgbToHex(info.dominant), edgeColor: '#2a2a2c',
    phoneCanvas: t === 'phone' ? phoneCanvas(cover, title) : null
  };
}
// Fixed camera set-ups for scene styles (independent of the user's angle sliders)
const VARIANTS = {
  top: () => ({ items: [{ pose: 'lie', yaw: -9 }], elev: 90 }),
  lie: () => ({ items: [{ pose: 'lie', yaw: 26 }], elev: 42 }),
  stack: d => ({ items: [{ pose: 'lie', yaw: 10, x: d.W * .32 }, { pose: 'lie', yaw: -7, y: d.T, x: d.W * .32 }, { pose: 'lie', yaw: 15, y: d.T * 2, x: d.W * .36, z: -d.H * .02 }, { pose: 'stand', yaw: -18, x: -d.W * .62, z: d.H * .78 }], elev: 18 }),
  pair: d => ({ items: [{ pose: 'stand', yaw: -16, x: -d.W * .55, z: -d.H * .05 }, { pose: 'lie', yaw: -28, x: d.W * .86, z: d.H * .42 }], elev: 15 }),
  duoTop: d => ({ items: [{ pose: 'lie', yaw: 15, x: d.W * .2, z: -d.H * .06 }, { pose: 'lie', yaw: -3, y: d.T * 1.02, x: -d.W * .06, z: d.H * .04 }], elev: 90 }),
  topA: () => ({ items: [{ pose: 'lie', yaw: 0 }], elev: 90 }),
  topB: () => ({ items: [{ pose: 'lie', yaw: 34 }], elev: 90 }),
  tilt: () => ({ items: [{ pose: 'lie', yaw: -14 }], elev: 60 }),
  ajar: () => ({ items: [{ pose: 'stand', yaw: -24, open: 34 }], elev: 9 }),
  open: () => ({ items: [{ pose: 'stand', yaw: 0 }], elev: 30 })
};
function renderProduct(spec, view, target = PROD, slot = 'book') {
  const x = ctx2(target);
  if (GL.build(slot, spec)) {
    const items = view.items || [{ pose: view.pose || 'stand', yaw: view.turn }];
    items.forEach(it => { it.slot = it.slot || slot; });
    if (GL.renderScene(items, { elev: view.tilt, roll: view.spin, gloss: view.gloss, shadow: view.shadow }, target)) return target;
  }
  // flat fallback when 3D is unavailable
  x.clearRect(0, 0, target.width, target.height);
  const src = spec.type === 'phone' ? spec.phoneCanvas : spec.cover;
  const r = containRect(src.width, src.height, 0, 0, target.width, target.height); const k = .84;
  x.save(); x.translate(target.width / 2, target.height / 2); x.rotate(rad(view.spin || 0)); x.drawImage(src, -r.w * k / 2, -r.h * k / 2, r.w * k, r.h * k); x.restore();
  return target;
}
function cropProduct(full, bare) {
  const b = bbox(full); const c = mk(b.w, b.h); ctx2(c).drawImage(full, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  let bc = null; if (bare) { bc = mk(b.w, b.h); ctx2(bc).drawImage(bare, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h); }
  return { img: c, bare: bc, crop: b, full: full.width, gl: !!bare };
}
function rotOf(m) { return { pose: m.pose || 'stand', turn: m.turn, tilt: m.tilt, spin: m.spin, gloss: m.gloss / 100 }; }
function buildProduct() {
  if (!S.cover) return;
  const spec = mockSpec(S.cover, S.info, S.mock, S.title, S.author, S.coverId);
  renderProduct(spec, rotOf(S.mock));
  S.book = cropProduct(PROD, GL.ok ? GL.bare() : null);
}
const variantCache = new Map();
function mainCtx() { return { cover: S.cover, info: S.info, title: S.title, author: S.author, coverId: S.coverId, slot: 'book', cache: variantCache }; }
function getBookVariant(variant, c = mainCtx()) {
  if (variant === 'collection' || variant === 'fan') return collectionProduct(c, variant);
  if (variant === 'open') c = Object.assign({}, c, { slot: c.slot === 'book' ? 'openbook' : c.slot + '-open' });
  const spec = mockSpec(c.cover, c.info, variant === 'open' ? Object.assign({}, S.mock, { type: 'openbook' }) : S.mock, c.title, c.author, c.coverId);
  const key = [variant, spec.type, spec.thick, spec.spineColor, c.coverId, S.mock.gloss, c.title, c.author].join('|');
  if (c.cache.has(key)) return c.cache.get(key);
  const t = mk(GL.SIZE, GL.SIZE); let prod;
  if (GL.build(c.slot, spec)) {
    const v = VARIANTS[variant](GL.dims(c.slot));
    renderProduct(spec, { items: v.items, tilt: v.elev, spin: v.roll || 0, gloss: S.mock.gloss / 100 }, t, c.slot);
    prod = cropProduct(t, GL.bare());
  } else { renderProduct(spec, rotOf(S.mock), t, c.slot); prod = cropProduct(t, null); }
  if (c.cache.size > 40) c.cache.clear(); c.cache.set(key, prod); return prod;
}
function collectionProduct(c, variant = 'collection') {
  const type = S.mock.type === 'phone' ? 'hardcover' : S.mock.type, m = Object.assign({}, S.mock, { type });
  const list = [{ cover: c.cover, info: c.info, title: c.title, author: c.author, coverId: c.coverId, slot: c.slot }]
    .concat(S.extra.map((e, i) => ({ cover: e.cover, info: e.info, title: e.title || '', author: '', coverId: 'x' + e.id, slot: 'x' + i })));
  // a fan needs at least three books: repeat the covers we have
  if (variant === 'fan') { const base = list.slice(); for (let i = 0; list.length < 3; i++) list.push(base[i % base.length]); }
  const key = [variant, type, m.thick, m.gloss, ...list.map(l => l.coverId + ':' + l.slot)].join('|');
  if (c.cache.has(key)) return c.cache.get(key);
  const t = mk(GL.SIZE, GL.SIZE); let prod;
  if (list.every(l => GL.build(l.slot, mockSpec(l.cover, l.info, m, l.title, l.author, l.coverId)))) {
    const n = list.length, d = GL.dims(c.slot), W = d.W;
    if (variant === 'fan') {
      // fanned like playing cards: each book rests on the one before it
      const items = list.map((l, i) => { const k = n > 1 ? i / (n - 1) - .5 : 0; return { slot: l.slot, pose: 'lie', yaw: -k * 40, x: (i - (n - 1) / 2) * W * .6, y: i * d.T * 1.02, z: (.25 - k * k) * d.H * .12 }; });
      GL.renderScene(items, { elev: 90, roll: 0, gloss: m.gloss / 100 }, t);
    } else {
      const items = list.map((l, i) => ({ slot: l.slot, pose: 'stand', yaw: -24, x: (i - (n - 1) / 2) * W * .74, z: -i * .34 }));
      GL.renderScene(items, { elev: 7, roll: 0, gloss: m.gloss / 100 }, t);
    }
    prod = cropProduct(t, GL.bare());
  } else { renderProduct(mockSpec(c.cover, c.info, m, c.title, c.author, c.coverId), rotOf(m), t, c.slot); prod = cropProduct(t, null); }
  c.cache.set(key, prod); return prod;
}
let deviceKey = '';
function buildDevice(cover = S.cover, info = S.info, title = S.title, coverId = S.coverId) {
  const k = coverId + '|' + title;
  if (cover === S.cover && deviceKey === k && S.device) return S.device;
  const spec = mockSpec(cover, info, S.mock, title, '', coverId + '-phone', 'phone');
  let dev;
  if (GL.build('phone', spec)) { const t = mk(GL.SIZE, GL.SIZE); GL.renderScene([{ slot: 'phone', pose: 'stand', yaw: 16 }], { elev: 4, roll: 0, gloss: .25 }, t); dev = cropProduct(t, GL.bare()); }
  else { const pc = spec.phoneCanvas; dev = { img: pc, crop: { x: 0, y: 0, w: pc.width, h: pc.height }, full: pc.height }; }
  if (cover === S.cover) { deviceKey = k; S.device = dev; }
  return dev;
}


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

/* =========================================================================
   Step-by-step interface
   1 Book · 2 3D mockup · 3 Design · 4 Customise · 5 Download
   ========================================================================= */
const STEPS = [
  { n: 1, name: 'Book', next: 'Next: 3D mockup' },
  { n: 2, name: '3D mockup', next: 'Next: pick a design' },
  { n: 3, name: 'Design', next: 'Next: customise' },
  { n: 4, name: 'Customise', next: 'Next: download' },
  { n: 5, name: 'Download', next: 'Start the next book' }
];
let STEP = 1, MODE = 'make', CAT = 'all';
const preview = $('#preview'), mockStage = $('#mockStage');
let raf = 0, productDirty = true, lastTrack = null;

function invalidate(product = false) { if (product) productDirty = true; if (!raf) raf = requestAnimationFrame(renderAll); }
function renderAll() {
  raf = 0;
  if (!S.cover) { drawCoverThumb(); return; }
  if (productDirty) { buildProduct(); productDirty = false; }
  if (MODE !== 'make') return;
  if (STEP === 2) { renderMockStage(); renderAngleThumbs(); }
  else if (STEP === 3) renderGallery();
  else if (STEP === 4) { if (TPL[S.template].usesDevice && S.show.device) buildDevice(); renderMain(); }
  else if (STEP === 5) renderSizeCards();
}

// ---------- navigation ----------
function setMode(m) {
  MODE = m;
  $$('.mode').forEach(b => b.setAttribute('aria-current', b.dataset.mode === m ? 'page' : 'false'));
  ['make', 'batch', 'resize'].forEach(k => $('#mode-' + k).hidden = k !== m);
  document.body.dataset.mode = m;
  if (m === 'make') invalidate();
  window.scrollTo({ top: 0 });
}
function goStep(n) {
  n = clamp(n, 1, 5);
  if (n > 1 && !S.cover) { toast('Add a cover first'); n = 1; }
  STEP = n;
  $$('#mode-make .step').forEach(s => s.hidden = +s.dataset.step !== n);
  $$('.st').forEach(b => { const k = +b.dataset.step; b.setAttribute('aria-current', k === n ? 'step' : 'false'); b.classList.toggle('done', k < n); b.disabled = k > 1 && !S.cover; });
  $('#backBtn').disabled = n === 1;
  $('#nextBtn').textContent = STEPS[n - 1].next;
  $('#nextBtn').disabled = !S.cover && n === 1;
  $('#abHint').textContent = `Step ${n} of 5`;
  $('#quickDl').hidden = n === 5 || !S.cover;
  document.body.dataset.step = n;
  window.scrollTo({ top: 0 });
  invalidate();
}
function onCoverChanged() {
  $('#dropEmpty').hidden = !!S.cover; $('#coverThumb').hidden = !S.cover;
  $$('.st').forEach(b => { b.disabled = +b.dataset.step > 1 && !S.cover; });
  $('#nextBtn').disabled = !S.cover && STEP === 1; $('#quickDl').hidden = STEP === 5 || !S.cover;
  angleKey = '';
}
function selectTemplate(id) {
  S.template = id;
  if (id === 'custom' && S.bg.mode === 'template' && S.bg.imgId) setBgMode('image');
  $$('#gallery .dz').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.t === id)));
  $('#curDesign').textContent = TPL[id].name;
  persist(); invalidate();
}
function syncPressed(sel, attr, val) { $$(`${sel} [data-${attr}]`).forEach(el => { if (el.tagName !== 'CANVAS') el.setAttribute('aria-pressed', String(el.dataset[attr] === val)); }); }

// ---------- step 1: cover ----------
function drawCoverThumb() {
  const t = $('#coverThumb'), x = ctx2(t); x.clearRect(0, 0, t.width, t.height);
  if (!S.cover) return;
  const r = containRect(S.cover.width, S.cover.height, 24, 24, t.width - 48, t.height - 48);
  x.save(); setShadow(x, 'rgba(0,0,0,.28)', 26, 0, 10); x.drawImage(S.cover, r.x, r.y, r.w, r.h); x.restore();
}
function resetForNextBook() {
  S.cover = null; S.info = null; S.book = null; S.device = null; S.extra = []; S.isSample = false; S.isSampleText = false; S.titleGuessed = false;
  S.title = ''; S.author = ''; $('#title').value = ''; $('#author').value = '';
  for (const k of ['headline', 'sub']) { S.auto[k] = true; S.text[k] = ''; }
  ['oldPrice', 'quote', 'quoteBy'].forEach(k => { S.text[k] = ''; $('#' + k).value = ''; });
  S.aiCopy = null; $('#aiStatus').hidden = true; $('#sampleFlag').hidden = true;
  S.pos = { scale: 1, x: 0, y: 0 }; syncPos(); syncAutoFields(); renderExtra(); updateLinks(); renderCopy(); onCoverChanged();
  goStep(1); drawCoverThumb();
  toast('Ready for the next book. Paste or drop its cover.');
}

// ---------- step 2: mockup ----------
function renderMockStage() {
  const c = mockStage, x = ctx2(c); x.clearRect(0, 0, c.width, c.height);
  if (!S.book) return;
  const r = containRect(S.book.img.width, S.book.img.height, 60, 60, c.width - 120, c.height - 120);
  x.drawImage(S.book.img, r.x, r.y, r.w, r.h);
}
let angleKey = '', angleJob = 0;
function renderAngleThumbs() {
  if (!S.cover) return;
  const spec = mockSpec(S.cover, S.info, S.mock, S.title, S.author, S.coverId);
  const k = [S.coverId, spec.type, spec.thick, spec.spineColor, S.mock.gloss, S.title].join('|'); if (k === angleKey) return; angleKey = k;
  const cards = $$('#angleChips canvas'), job = ++angleJob; let i = 0;
  const step = () => {
    if (job !== angleJob || STEP !== 2) { if (job === angleJob) angleKey = ''; return; }
    const c = cards[i++]; if (!c) return;
    const a = ANGLES[c.dataset.a], t = mk(360, 360);
    renderProduct(spec, Object.assign({ gloss: S.mock.gloss / 100 }, a), t);
    const p = cropProduct(t, null), x = ctx2(c); x.clearRect(0, 0, c.width, c.height);
    const r = containRect(p.img.width, p.img.height, 8, 8, c.width - 16, c.height - 16); x.drawImage(p.img, r.x, r.y, r.w, r.h);
    if (i < cards.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- step 3: design gallery ----------
function buildGallery() {
  const chips = $('#catChips'); chips.innerHTML = '';
  CATEGORIES.forEach(c => {
    const n = c.id === 'all' ? TPL_ORDER.length : TPL_ORDER.filter(id => TPL[id].cat === c.id).length; if (!n) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.c = c.id; b.setAttribute('aria-pressed', String(c.id === CAT));
    b.innerHTML = `${c.name} <small>${n}</small>`; b.addEventListener('click', () => { CAT = c.id; syncPressed('#catChips', 'c', CAT); filterGallery(); }); chips.append(b);
  });
  const g = $('#gallery'); g.innerHTML = '';
  TPL_ORDER.forEach(id => {
    const T = TPL[id], b = document.createElement('button'); b.type = 'button'; b.className = 'dz'; b.dataset.t = id; b.dataset.cat = T.cat; b.setAttribute('aria-pressed', String(id === S.template));
    const c = mk(440, 440); c.dataset.t = id;
    const meta = document.createElement('span'); meta.className = 'dz-meta'; meta.innerHTML = `<b></b><small></small>`; meta.querySelector('b').textContent = T.name; meta.querySelector('small').textContent = T.desc || '';
    b.append(c, meta);
    b.addEventListener('click', () => selectTemplate(id));
    b.addEventListener('dblclick', () => { selectTemplate(id); goStep(4); });
    g.append(b);
  });
  filterGallery();
}
function filterGallery() { $$('#gallery .dz').forEach(c => { c.hidden = CAT !== 'all' && c.dataset.cat !== CAT; }); renderGallery(); }
let galleryJob = 0;
function renderGallery() {
  if (!S.cover) return;
  const job = ++galleryJob, cards = $$('#gallery .dz').filter(c => !c.hidden), D = buildData();
  if (S.show.device) D.device = buildDevice();
  let i = 0;
  const step = () => {
    if (job !== galleryJob || STEP !== 3) return;
    const t0 = performance.now();
    while (i < cards.length && performance.now() - t0 < 30) {
      const card = cards[i++], c = card.querySelector('canvas'), x = ctx2(c);
      compose(x, 'square', Object.assign({}, D, { template: card.dataset.t }), c.width / 1080);
    }
    if (i < cards.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- step 4: customise ----------
function renderMain() {
  const sz = SIZES[S.size]; if (preview.width !== sz.w || preview.height !== sz.h) { preview.width = sz.w; preview.height = sz.h; }
  const D = buildData({ track: {} });
  compose(ctx2(preview), S.size, D, 1);
  lastTrack = D.track;
  const st = S.size === 'story' && S.safe;
  $('#safeT').hidden = $('#safeB').hidden = $('#safeR').hidden = !st;
  $('#meta').innerHTML = `<b>${sz.w} × ${sz.h}</b> px · ${sz.ratio} · ${sz.name}`;
  syncPressed('#sizeSeg', 's', S.size);
}
function syncPos() { $('#pScale').value = Math.round(S.pos.scale * 100); $('#pX').value = Math.round(S.pos.x * 100); $('#pY').value = Math.round(S.pos.y * 100); outs(); }
function outs() {
  $('#turnO').value = `${S.mock.turn}°`; $('#tiltO').value = `${S.mock.tilt}°`; $('#spinO').value = `${S.mock.spin}°`; $('#thickO').value = S.mock.thick; $('#glossO').value = `${S.mock.gloss}%`;
  $('#pScaleO').value = `${$('#pScale').value}%`; $('#pXO').value = $('#pX').value; $('#pYO').value = $('#pY').value; $('#bgDimO').value = `${S.bg.dim}%`;
}
function syncMockUI() {
  $('#turn').value = S.mock.turn; $('#tilt').value = S.mock.tilt; $('#spin').value = S.mock.spin; $('#thick').value = S.mock.thick; $('#gloss').value = S.mock.gloss;
  $('#spineAuto').checked = S.mock.spineAuto; $('#spineColor').disabled = S.mock.spineAuto; if (!S.mock.spineAuto) $('#spineColor').value = S.mock.spineColor;
  syncPressed('#prodSeg', 'v', S.mock.type); syncPressed('#angleChips', 'a', S.mock.angle || ''); outs();
}

// ---------- step 5: download ----------
function buildSizeCards() {
  const box = $('#sizes'); box.innerHTML = '';
  SIZE_ORDER.forEach(k => {
    const sz = SIZES[k], card = document.createElement('div'); card.className = 'szc';
    card.innerHTML = `<div class="szc-img"><canvas data-s="${k}" width="10" height="10"></canvas></div>
      <div class="szc-meta"><div><b>${sz.ratio} ${sz.name}</b><small>${sz.w} × ${sz.h} px · ${({ square: 'Feed and carousel', portrait: 'Best for phones in the feed', story: 'Stories and Reels, full screen', landscape: 'Links and the desktop right column' })[k]}</small></div>
      <div class="szc-act"><label class="tg"><input type="checkbox" data-inc="${k}" ${S.sizesOn[k] ? 'checked' : ''}>In ZIP</label><button class="btn sm" type="button" data-one="${k}">Download</button></div></div>`;
    box.append(card);
  });
}
function renderSizeCards() {
  const D = buildData(); if (TPL[S.template].usesDevice && S.show.device) D.device = buildDevice();
  $$('#sizes canvas').forEach(c => { const k = c.dataset.s, sz = SIZES[k], sc = Math.min(520 / sz.w, 600 / sz.h); const w = Math.round(sz.w * sc), h = Math.round(sz.h * sc); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } compose(ctx2(c), k, D, sc); });
  $('#dlDesign').textContent = TPL[S.template].name;
}

// ---------- toasts / busy ----------
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
function busy(msg) { let b = $('.busy'); if (!msg) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.className = 'busy'; b.innerHTML = '<div><span class="spin"></span><span class="m"></span></div>'; document.body.append(b); } b.querySelector('.m').textContent = msg; }
const tick = () => new Promise(r => setTimeout(r, 0));

// ---------- cover ----------
async function setCover(cv, { name = '', sample = false } = {}) {
  if ($('#trim').checked && !sample) cv = trimBorders(cv);
  S.cover = cv; S.info = analyze(cv); S.coverId++; S.isSample = sample; S.device = null; S.pos = { scale: 1, x: 0, y: 0 }; syncPos();
  $('#sampleFlag').hidden = !sample;
  drawCoverThumb();
  if (S.mock.spineAuto) $('#spineColor').value = S.info.spine;
  if (!sample && name) { const guess = guessTitle(name); if (guess && (S.isSampleText || S.titleGuessed || !$('#title').value)) { $('#title').value = guess; S.title = guess; S.titleGuessed = true; } }
  if (!sample && S.isSampleText) { if (!name || !guessTitle(name)) { $('#title').value = ''; S.title = ''; } $('#author').value = ''; S.author = ''; S.isSampleText = false; S.aiCopy = null; }
  updateLinks(); renderCopy(); onCoverChanged();
  invalidate(true);
}
function guessTitle(name) {
  let s = String(name).replace(/\.[a-z0-9]{2,5}$/i, '').replace(/\(\d+\)$/, '');
  if (/_AC_|_SL\d|_UF\d|^\d+$|^[A-Z0-9]{8,}/.test(s) || /^(image|img|screenshot|screen shot|download|photo|unnamed|cover)\b/i.test(s)) return '';
  s = s.replace(/[_\-+.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const filler = /^(pdf|cover|book|ebook|e book|front|hd|final|copy|new)$/i; let ws = s.split(' ');
  while (ws.length && filler.test(ws[0])) ws.shift(); while (ws.length && filler.test(ws[ws.length - 1])) ws.pop(); s = ws.join(' ');
  if (s.length < 3 || !/[a-z]{3}/i.test(s)) return '';
  return s.replace(/\w\S*/g, w => w.length > 3 || /^(i|ii|iii|iv)$/i.test(w) ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase()).replace(/^./, c => c.toUpperCase());
}
async function handleCoverFile(file) {
  if (!file || !/^image\//.test(file.type)) { toast('That is not an image file. Try a JPG, PNG or WebP cover.'); return; }
  try { const cv = await fileToCanvas(file, 2000); await setCover(cv, { name: file.name }); toast('Cover added'); }
  catch (e) { toast(e.message || 'That image could not be opened'); }
}
function updateLinks() {
  const q = [S.title, S.author].filter(Boolean).join(' ');
  $('#gLink').href = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent((q || 'book') + ' book cover');
}

// ---------- copy ----------
function copyVariants(t = currentText()) {
  const b = brand(), T = S.title || 'this book', by = S.author ? ` by ${S.author}` : '', p = t.price || b.price, s = b.site, del = b.delivery, pay = b.payment;
  const end = s ? `👉 Order now at ${s}` : '👉 Tap "Shop now" to order';
  return [
    { name: 'Short and direct', text: `📖 ${T}${by} is now available as a PDF.\n\nGet your copy for only ${p} and start reading on your phone today.\n\n✅ ${del}.\n${end}` },
    { name: 'Opens with a question', text: `Have you been looking for ${T}${by}?\n\nNo need to wait for a printed copy. Get the full PDF for just ${p} and read it on your phone, tablet or laptop.\n\n📲 ${del}.\n\n${end}` },
    { name: 'Steps to order', text: `How to get ${T} in 3 easy steps:\n\n1️⃣ ${s ? 'Visit ' + s : 'Tap "Shop now"'}\n2️⃣ Pay ${p} via ${pay}\n3️⃣ ${del}\n\nStart reading in minutes 📚` }
  ];
}
function renderCopy() {
  const t = currentText(), b = brand(), T = S.title || 'Your book';
  const head = (S.aiCopy && S.aiCopy.fb_headline) || (`${T} (PDF)`.length <= 40 ? `${T} (PDF)` : T.slice(0, 40));
  const desc = (S.aiCopy && S.aiCopy.fb_description) || `Only ${t.price || b.price} · Instant PDF`;
  const ff = $('#fbFields'); ff.innerHTML = '';
  [['Headline', head], ['Description', desc]].forEach(([k, v]) => { const d = document.createElement('div'); d.className = 'fbf'; d.innerHTML = `<div><small>${k}</small><span></span></div><button class="btn" type="button">Copy</button>`; d.querySelector('span').textContent = v; d.querySelector('button').addEventListener('click', () => copyText(v)); ff.append(d); });
  const grid = $('#copyGrid'); grid.innerHTML = '';
  const items = [];
  if (S.aiCopy && Array.isArray(S.aiCopy.primary_texts)) S.aiCopy.primary_texts.slice(0, 3).forEach((tx, i) => items.push({ name: `Claude's version ${i + 1}`, text: String(tx), ai: true }));
  copyVariants(t).forEach(v => items.push(v));
  items.forEach(v => {
    const d = document.createElement('div'); d.className = 'cv' + (v.ai ? ' ai' : '');
    d.innerHTML = `<h4><span>Primary text</span><em></em></h4><pre></pre><div><button class="btn" type="button">Copy text</button></div>`;
    d.querySelector('em').textContent = v.name; d.querySelector('pre').textContent = v.text; d.querySelector('button').addEventListener('click', () => copyText(v.text));
    grid.append(d);
  });
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove(); toast(ok ? 'Copied' : 'Select the text and copy it with Ctrl+C');
  }
}

/* =========================================================================
   Saving files (artifact viewer capability, or a plain download elsewhere)
   ========================================================================= */
let DL;
const dlReady = (async () => { try { if (window.claude && typeof window.claude.use === 'function') DL = await window.claude.use('downloads'); else DL = null; } catch (e) { DL = null; } return DL; })();
async function saveBlob(name, blob) {
  if (window.claude && typeof window.claude.use === 'function') {
    const dl = await dlReady;
    if (dl) {
      try { await dl.save({ filename: name, data: blob }); toast(`Saved ${name}`); return true; }
      catch (e) {
        const code = e && e.code;
        if (code === 'declined') { toast('Download cancelled'); return false; }
        if (code === 'rate_limited') { toast('Another download is waiting for your OK. Try again in a moment.'); return false; }
        if (code === 'rejected_extension' || code === 'extension_not_enabled') { toast('This file type cannot be saved here.'); return false; }
        if (code === 'too_large') { toast('That file is too large to save here.'); return false; }
      }
    }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 8000); toast(`Downloaded ${name}`); return true;
}
async function zipOf(files) { const z = new JSZip(); files.forEach(f => z.file(f.name, f.blob)); return z.generateAsync({ type: 'blob', compression: 'STORE' }); }
const fmtExt = () => S.fmt === 'jpg' ? 'jpg' : 'png';
async function adBlob(sizeKey, D) { const sz = SIZES[sizeKey], c = mk(sz.w, sz.h); compose(ctx2(c), sizeKey, D, 1); return toBlob(c, S.fmt === 'jpg' ? 'image/jpeg' : 'image/png', .93); }
function baseName(title = S.title) { return slug(title) || 'book'; }
function fileName(sizeKey, tplId = S.template, title) { const sz = SIZES[sizeKey]; return `${baseName(title)}_${slug(brand().name) || 'brand'}_${tplId}_${sz.file}_${sz.w}x${sz.h}.${fmtExt()}`; }
async function mockupBlob(book = S.book) { return toBlob(book.img, 'image/png'); }

async function downloadAll() {
  if (!S.cover) return;
  const keys = SIZE_ORDER.filter(k => S.sizesOn[k]); if (!keys.length) { toast('Tick at least one size to include'); return; }
  busy('Making your ads…'); await tick();
  try {
    if (TPL[S.template].usesDevice && S.show.device) buildDevice();
    const D = buildData(), files = [];
    for (const k of keys) { files.push({ name: fileName(k), blob: await adBlob(k, D) }); await tick(); }
    files.push({ name: `${baseName()}_3d-mockup.png`, blob: await mockupBlob() });
    const zip = await zipOf(files); busy();
    await saveBlob(`${baseName()}_facebook-ads.zip`, zip);
  } catch (e) { busy(); toast(e.message || 'Something went wrong while making the files'); }
}
async function downloadOne(k) {
  k = typeof k === 'string' ? k : S.size;
  busy('Making the image…'); await tick();
  try { const D = buildData(); if (TPL[S.template].usesDevice && S.show.device) D.device = buildDevice(); const b = await adBlob(k, D); busy(); await saveBlob(fileName(k), b); } catch (e) { busy(); toast(e.message); }
}
async function downloadMock() { try { await saveBlob(`${baseName()}_3d-mockup.png`, await mockupBlob()); } catch (e) { toast(e.message); } }
async function downloadCarousel() {
  busy('Making 10 carousel cards…'); await tick();
  try {
    buildDevice(); const D0 = buildData(), files = [];
    for (let i = 0; i < CAROUSEL.length; i++) { const id = CAROUSEL[i]; const D = Object.assign({}, D0, { template: id, bg: { mode: 'template' } }); files.push({ name: `${String(files.length + 1).padStart(2, '0')}_${baseName()}_${id}_1080x1080.${fmtExt()}`, blob: await adBlob('square', D) }); await tick(); }
    const zip = await zipOf(files); busy(); await saveBlob(`${baseName()}_carousel-cards.zip`, zip);
  } catch (e) { busy(); toast(e.message); }
}

// ---------- video ----------
// Frame-by-frame H.264 encoding (WebCodecs + MP4 muxer) so every frame lands at exact 30 fps,
// however long each frame takes to draw. Falls back to live recording in older browsers.
async function downloadVideo() {
  const sk = S.size, sz = SIZES[sk], FPS = 30, DUR = 6, N = FPS * DUR;
  if (TPL[S.template].usesDevice && S.show.device) buildDevice();
  const D = buildData(), L = { W: sz.w, H: sz.h, k: sz.k };
  const bgC = mk(sz.w, sz.h); drawBackground(ctx2(bgC), L, D);
  const spec = mockSpec(S.cover, S.info, S.mock, S.title, S.author, S.coverId);
  const frameCv = mk(GL.SIZE, GL.SIZE), base = rotOf(S.mock), is3d = GL.ok;
  const T0 = TPL[S.template], bookSt = (T0.styles(D, themeFor(D, T0), L) || {}).book || {}, floating = bookSt.floor === false;
  const turning = !bookSt.variant || bookSt.variant === 'main'; // scene designs use a fixed camera, so only the main book turns
  const c = mk(sz.w, sz.h), x = ctx2(c);
  const draw = t => {
    let fr = null;
    if (is3d && turning) {
      const e = easeOut(clamp(t / 1.4, 0, 1)), sway = t > 2.6 ? Math.sin((t - 2.6) * 1.5) * 5 : 0;
      fr = renderProduct(spec, { pose: base.pose, turn: base.turn + (1 - e) * -55 + sway, tilt: base.tilt, spin: base.spin, gloss: base.gloss, shadow: !floating }, frameCv);
    }
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, sz.w, sz.h);
    compose(x, sk, D, 1, { t, frame: fr, bare: is3d ? GL.bare() : null }, bgC);
  };
  const name = `${baseName()}_${S.template}_video_${sz.file}`;
  busy('Making the video… 0%'); await tick();
  try {
    if (window.VideoEncoder && window.VideoFrame && window.Mp4Muxer) {
      let cfg = null;
      for (const codec of ['avc1.640033', 'avc1.640032', 'avc1.640028', 'avc1.4d0033', 'avc1.4d0028']) {
        const c0 = { codec, width: sz.w, height: sz.h, bitrate: 9000000, framerate: FPS, avc: { format: 'avc' } };
        try { const r = await VideoEncoder.isConfigSupported(c0); if (r && r.supported) { cfg = c0; break; } } catch (e) {}
      }
      if (cfg) {
        const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: sz.w, height: sz.h, frameRate: FPS }, fastStart: 'in-memory' });
        let err = null;
        const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { err = e; } });
        enc.configure(cfg);
        for (let i = 0; i < N; i++) {
          if (err) throw err;
          draw(i / FPS);
          const vf = new VideoFrame(c, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
          enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
          while (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 4));
          if (i % 6 === 0) { busy(`Making the video… ${Math.round(i / N * 100)}%`); await tick(); }
        }
        await enc.flush(); if (err) throw err; enc.close(); muxer.finalize();
        busy(); await saveBlob(name + '.mp4', new Blob([muxer.target.buffer], { type: 'video/mp4' })); return;
      }
    }
    // fallback: live capture
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) { busy(); toast('This browser cannot make video. Chrome or Edge can.'); return; }
    const types = ['video/mp4;codecs=avc1.42E01F', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mime = types.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } });
    if (!mime) { busy(); toast('This browser cannot make video.'); return; }
    const rc = $('#rec'); rc.width = sz.w; rc.height = sz.h; const rx = ctx2(rc);
    const stream = rc.captureStream(30), chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 9000000 });
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    busy(`Recording a ${DUR}-second video…`); draw(0); rx.drawImage(c, 0, 0); rec.start(200);
    const t0 = performance.now();
    await new Promise(res => { const step = () => { const t = (performance.now() - t0) / 1000; draw(Math.min(t, DUR)); rx.drawImage(c, 0, 0); if (t < DUR + .15) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
    rec.stop(); await stopped; stream.getTracks().forEach(t => t.stop()); busy();
    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    await saveBlob(`${name}.${ext}`, new Blob(chunks, { type: mime.split(';')[0] }));
  } catch (e) { busy(); console.warn(e); toast('The video could not be made in this browser.'); }
}


/* =========================================================================
   Claude (optional): read the cover and write the words.
   Inside claude.ai the page uses the viewer's own Claude (no key needed).
   Anywhere else (the web app), it uses an Anthropic API key saved in this browser.
   ========================================================================= */
const AI_KEY = 'cmAdStudio.ai';
const AIS = Object.assign({ key: '', model: 'claude-sonnet-5-5' }, store(AI_KEY) || {});
let SAMPLE = null, SAMPLE_IMG = false;
const aiMode = () => SAMPLE ? 'claude' : (AIS.key ? 'api' : null);
const aiCanSee = () => aiMode() === 'api' || (aiMode() === 'claude' && SAMPLE_IMG);
function aiRefresh() {
  const m = aiMode();
  $('#aiRead').hidden = !m; $('#aiRead span').textContent = aiCanSee() ? 'Read the cover & write the words with Claude' : 'Write the words with Claude';
  $('#aiHint').hidden = !!m;
  $('#bAi').hidden = !aiCanSee();
  $('#aiSettings').hidden = !!SAMPLE;
}
(async () => {
  try {
    if (!(window.claude && typeof window.claude.use === 'function')) return;
    const s = await window.claude.use('sample'); if (!s) return;
    SAMPLE = s; try { const lim = await s.limits(); SAMPLE_IMG = !!(lim && lim.images); } catch (e) { SAMPLE_IMG = false; }
  } catch (e) {} finally { try { aiRefresh(); } catch (e) {} }
})();
function blobToBase64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); }); }
async function aiJSON(prompt, { image = null, quick = false } = {}) {
  const mode = aiMode();
  if (mode === 'claude') {
    const opts = { modelTier: quick ? 'quick' : 'default' }; if (image && SAMPLE_IMG) opts.images = [image];
    return SAMPLE.json(prompt, opts);
  }
  if (mode === 'api') {
    const content = [];
    if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.type || 'image/jpeg', data: await blobToBase64(image) } });
    content.push({ type: 'text', text: prompt + '\n\nReply with the JSON only, with no other text.' });
    let res;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': AIS.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: quick ? 'claude-haiku-5-5' : (AIS.model || 'claude-sonnet-5-5'), max_tokens: 2000, messages: [{ role: 'user', content }] })
      });
    } catch (e) { throw { code: 'offline' }; }
    if (!res.ok) { let msg = ''; try { msg = (await res.json()).error.message; } catch (e) {} throw { code: res.status === 401 ? 'bad_key' : res.status === 429 ? 'rate_limited' : res.status === 404 ? 'bad_model' : 'api_error', message: msg }; }
    const j = await res.json(); const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const m = text.match(/\{[\s\S]*\}/); if (!m) throw { code: 'invalid_json' };
    try { return JSON.parse(m[0]); } catch (e) { throw { code: 'invalid_json' }; }
  }
  throw { code: 'not_available' };
}
async function coverBlobForAI(cv) { const k = Math.min(1, 1024 / Math.max(cv.width, cv.height)); const c = mk(cv.width * k, cv.height * k); ctx2(c).drawImage(cv, 0, 0, c.width, c.height); return toBlob(c, 'image/jpeg', .88); }
function aiErr(e) {
  const c = e && e.code;
  if (c === 'not_granted') return 'Claude was not allowed for this page, so the words were left as they are.';
  if (c === 'rate_limited') return 'Claude is busy right now. Try again in a minute.';
  if (c === 'invalid_json') return 'Claude replied in an unexpected format. Try once more.';
  if (c === 'bad_key') return 'Your Claude API key was not accepted. Check it in Settings.';
  if (c === 'bad_model') return 'That Claude model name was not found. Pick another in Settings.';
  if (c === 'offline') return 'Could not reach Claude. Check your internet connection.';
  if (c === 'cancelled') return 'Stopped.';
  return 'Claude could not finish that request' + (e && e.message ? ` (${e.message})` : '') + '. Your words were left as they are.';
}
async function aiFill() {
  if (!aiMode()) return;
  const btn = $('#aiRead'), st = $('#aiStatus'); btn.disabled = true; st.hidden = false; st.textContent = aiCanSee() ? 'Claude is reading the cover…' : 'Claude is writing…';
  const b = brand(), t = currentText(), price = t.price || b.price, see = aiCanSee() && S.cover && !S.isSample;
  const prompt = `You write Facebook ad content for ${b.name}, an online shop in Kenya that sells e-books as PDF files${b.site ? ` at ${b.site}` : ''}. Buyers pay ${price} by ${b.payment}. Delivery: ${b.delivery}.
${see ? 'Look at the attached book cover.' : ''}
Title as typed by the user: "${S.isSampleText ? '' : S.title}". Author as typed: "${S.isSampleText ? '' : S.author}".

Reply with only JSON in this exact shape:
{"title":"","author":"","genre":"","headline":"","subline":"","button":"","primary_texts":["","",""],"fb_headline":"","fb_description":""}

Rules:
- title and author: as printed on the cover, in Title Case. Use the typed values if there is no cover. Empty string if unknown.
- headline: the big words printed on the ad image. 2 to 6 words about the reader's benefit or the book's promise. Do not just repeat the title.
- subline: 5 to 12 words that support the headline.
- button: 2 to 4 words, for example "Get your PDF now".
- primary_texts: three different Facebook primary texts of 40 to 110 words: (1) short and direct, (2) opens with a relatable question or situation, (3) numbered steps to order. Short lines, a few emojis, mention the price ${price}, end with a call to action${b.site ? ` that names ${b.site}` : ''}.
- fb_headline: at most 40 characters. fb_description: at most 30 characters.
- Follow Meta advertising policy: never assert or imply the reader's personal attributes such as health, finances, religion or relationships (no "Are you depressed?", "You are in debt", "As a Christian you…").
- Do not invent reviews, ratings, bestseller claims, page counts or quotes.
- Clear, plain English for Kenyan readers.`;
  try {
    const r = await aiJSON(prompt, { image: see ? await coverBlobForAI(S.cover) : null });
    if (!r || typeof r !== 'object') throw { code: 'invalid_json' };
    if (r.title && (!S.title || S.isSampleText || S.titleGuessed)) { S.title = String(r.title); $('#title').value = S.title; S.titleGuessed = false; }
    if (r.author && (!S.author || S.isSampleText)) { S.author = String(r.author); $('#author').value = S.author; }
    S.isSampleText = false;
    if (r.headline) { S.text.headline = String(r.headline); S.auto.headline = false; $('#headline').value = S.text.headline; }
    if (r.subline) { S.text.sub = String(r.subline); S.auto.sub = false; $('#sub').value = S.text.sub; }
    if (r.button) { S.text.cta = String(r.button); S.auto.cta = false; $('#cta').value = S.text.cta; }
    S.aiCopy = r; st.textContent = 'Done. Claude filled in the title, headline, second line and button, and wrote three ad texts for step 5. Edit anything you like.';
    updateLinks(); renderCopy(); invalidate(true);
  } catch (e) { st.textContent = aiErr(e); }
  finally { btn.disabled = false; }
}
async function aiTest() {
  const st = $('#aiTestStatus'); st.textContent = 'Checking…';
  try { const r = await aiJSON('Reply with {"ok":true}', { quick: true }); st.textContent = r && r.ok ? 'Connected. Claude features are on.' : 'Connected, but the reply was unexpected.'; }
  catch (e) { st.textContent = aiErr(e); }
}

/* =========================================================================
   Background library (IndexedDB, falls back to memory)
   ========================================================================= */
const BGDB = (() => {
  let dbp = null; const mem = new Map();
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(res => { try { const r = indexedDB.open('cmAdStudio', 1); r.onupgradeneeded = () => r.result.createObjectStore('bgs', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
    return dbp;
  }
  async function tx(mode, fn) { const db = await open(); if (!db) return null; return new Promise(res => { try { const t = db.transaction('bgs', mode), s = t.objectStore('bgs'); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : true); t.onerror = () => res(null); } catch (e) { res(null); } }); }
  return {
    async all() { const r = await tx('readonly', s => s.getAll()); return Array.isArray(r) ? r : [...mem.values()]; },
    async put(item) { const r = await tx('readwrite', s => s.put(item)); if (!r) mem.set(item.id, item); },
    async del(id) { await tx('readwrite', s => s.delete(id)); mem.delete(id); }
  };
})();
const bgItems = new Map();
async function loadBgLibrary() {
  const items = await BGDB.all(); items.sort((a, b) => a.added - b.added);
  for (const it of items) { if (!bgItems.has(it.id)) bgItems.set(it.id, { id: it.id, blob: it.blob, url: URL.createObjectURL(it.blob), cv: null }); }
  renderBgLib();
  if (S.bg.imgId && bgItems.has(S.bg.imgId)) await selectBg(S.bg.imgId, true);
  else if (S.bg.mode === 'image') { S.bg.imgId = null; }
}
function renderBgLib() {
  const lib = $('#bgLib'); $$('.bgt', lib).forEach(n => n.remove());
  for (const it of bgItems.values()) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bgt'; b.dataset.id = it.id; b.setAttribute('aria-pressed', String(S.bg.imgId === it.id)); b.setAttribute('aria-label', 'Use this background');
    b.innerHTML = `<img alt="" src="${it.url}"><span class="x" title="Remove" aria-hidden="true">×</span>`;
    b.addEventListener('click', async e => { if (e.target.classList.contains('x')) { await BGDB.del(it.id); URL.revokeObjectURL(it.url); bgItems.delete(it.id); if (S.bg.imgId === it.id) { S.bg.imgId = null; S.bgImg = null; } renderBgLib(); persist(); invalidate(); return; } await selectBg(it.id); });
    lib.insertBefore(b, $('#bgAdd'));
  }
}
async function selectBg(id, quiet) {
  const it = bgItems.get(id); if (!it) return;
  if (!it.cv) { try { it.cv = imageToCanvas(await loadImg(it.url), 2200); } catch (e) { toast('That background could not be opened'); return; } }
  S.bg.imgId = id; S.bgImg = it.cv; computeBgDark(); if (!quiet) setBgMode('image'); renderBgLib(); persist(); invalidate();
}
async function addBgFiles(files) {
  let last = null;
  for (const f of files) { if (!/^image\//.test(f.type)) continue; const id = uid(); const blob = f.slice(0, f.size, f.type); await BGDB.put({ id, blob, added: Date.now() }); bgItems.set(id, { id, blob, url: URL.createObjectURL(blob), cv: null }); last = id; }
  if (last) { await selectBg(last); toast('Background added'); }
}
function computeBgDark() {
  if (S.bg.mode === 'color') { const a = hexToRgb(S.bg.color), b = hexToRgb(S.bg.grad ? S.bg.color2 : S.bg.color); S.bgDark = lum([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]) < .4; }
  else if (S.bg.mode === 'image' && S.bgImg) { const i = analyze(S.bgImg); S.bgDark = lum(i.avg) * (1 - S.bg.dim / 100) < .38; }
}
function setBgMode(m) {
  S.bg.mode = m; syncPressed('#bgSeg', 'v', m); $('#bgColorRow').hidden = m !== 'color'; $('#bgImgRow').hidden = m !== 'image';
  if (m === 'image' && S.bg.imgId && !S.bgImg) selectBg(S.bg.imgId, true);
  computeBgDark(); persist(); invalidate();
}

/* =========================================================================
   Brand kit
   ========================================================================= */
function fillBrandSelect() {
  const sel = $('#brandSel'); sel.innerHTML = ''; S.brands.forEach(b => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.name || 'Untitled brand'; sel.append(o); }); sel.value = S.brandId;
}
const KF = { kSteps: 'steps', kName: 'name', kSite: 'site', kPrimary: 'primary', kDark: 'dark', kSiteColor: 'siteColor', kTagColor: 'tagColor', kPrice: 'price', kTag: 'tag', kCta: 'cta', kDelivery: 'delivery', kPayment: 'payment' };
function openKit() { const b = brand(); for (const [id, k] of Object.entries(KF)) $('#' + id).value = b[k] || (k === 'steps' ? DEFAULT_STEPS : ''); drawKitLogo(); $('#kDel').disabled = S.brands.length < 2; $('#kitDlg').showModal(); }
function drawKitLogo() { const c = $('#kLogo'), x = ctx2(c); x.clearRect(0, 0, c.width, c.height); const img = logoImgFor(brand()); const r = containRect(img.width, img.height, 8, 8, c.width - 16, c.height - 16); x.drawImage(img, r.x, r.y, r.w, r.h); }
function kitChanged() { const b = brand(); for (const [id, k] of Object.entries(KF)) b[k] = $('#' + id).value; badgeCache.clear(); fillBrandSelect(); persist(); drawKitLogo(); syncAutoFields(); renderCopy(); invalidate(true); }

function syncAutoFields() {
  for (const k of ['headline', 'sub', 'cta', 'tag', 'price', 'offer', 'kicker']) { const el = $('#' + k); if (S.auto[k]) { el.value = ''; el.placeholder = autoText(k); } }
}

/* =========================================================================
   Extra covers (Collection style)
   ========================================================================= */
function renderExtra() {
  const row = $('#extraRow'); $$('.xt', row).forEach(n => n.remove());
  S.extra.forEach((e, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'xt'; b.title = 'Remove'; b.setAttribute('aria-label', 'Remove this cover');
    const c = mk(80, 112), r = containRect(e.cover.width, e.cover.height, 0, 0, 80, 112); ctx2(c).drawImage(e.cover, r.x, r.y, r.w, r.h); b.append(c);
    b.addEventListener('click', () => { S.extra.splice(i, 1); renderExtra(); invalidate(); });
    row.insertBefore(b, $('#extraAdd'));
  });
  $('#extraAdd').hidden = S.extra.length >= 5;
  $('#extraHint').textContent = S.extra.length ? `${S.extra.length + 1} books in the Collection style` : 'Add up to 5 more covers to show a whole series in one ad.';
}
async function addExtraFiles(files) {
  for (const f of files) {
    if (S.extra.length >= 5) { toast('The Collection style shows up to 6 books'); break; }
    if (!/^image\//.test(f.type)) continue;
    try { let cv = await fileToCanvas(f, 1600); if ($('#trim').checked) cv = trimBorders(cv); S.extra.push({ id: uid(), cover: cv, info: analyze(cv), title: guessTitle(f.name) }); } catch (e) {}
  }
  renderExtra(); if (S.extra.length) selectTemplate('collection'); invalidate();
}
async function useBatchAsCollection() {
  if (!BATCH.length) { toast('Add some covers first'); return; }
  const [first, ...rest] = BATCH;
  S.extra = rest.slice(0, 5).map(it => ({ id: it.id, cover: it.cover, info: it.info, title: it.title }));
  S.isSampleText = false; S.title = first.title || ''; S.author = first.author || rest.find(r => r.author)?.author || ''; $('#title').value = S.title; $('#author').value = S.author;
  await setCover(first.cover, {});
  S.title = first.title || ''; $('#title').value = S.title;
  renderExtra(); selectTemplate('collection'); setMode('make'); goStep(4); persist(); invalidate(true);
  if (BATCH.length > 6) toast('The Collection style shows the first 6 covers');
}

/* =========================================================================
   Batch
   ========================================================================= */
const BATCH = [];
function renderBatch() {
  const list = $('#bList'); list.innerHTML = '';
  BATCH.forEach((it, i) => {
    const row = document.createElement('div'); row.className = 'brow';
    const c = mk(88, 120); const r = containRect(it.cover.width, it.cover.height, 0, 0, 88, 120); ctx2(c).drawImage(it.cover, r.x, r.y, r.w, r.h);
    row.append(c);
    const ti = document.createElement('input'); ti.type = 'text'; ti.placeholder = 'Book title'; ti.value = it.title; ti.setAttribute('aria-label', 'Book title'); ti.addEventListener('input', () => it.title = ti.value);
    const au = document.createElement('input'); au.type = 'text'; au.placeholder = 'Author'; au.value = it.author; au.setAttribute('aria-label', 'Author'); au.addEventListener('input', () => it.author = au.value);
    const rm = document.createElement('button'); rm.className = 'rm'; rm.type = 'button'; rm.textContent = '×'; rm.setAttribute('aria-label', 'Remove'); rm.addEventListener('click', () => { BATCH.splice(i, 1); renderBatch(); });
    row.append(ti, au, rm); list.append(row);
  });
  $('#bEmpty').hidden = BATCH.length > 0;
  const g = $('#bGo'); g.disabled = !BATCH.length; g.textContent = `Make ads for ${BATCH.length} book${BATCH.length === 1 ? '' : 's'}`;
}
async function addBatchFiles(files) {
  for (const f of files) { if (!/^image\//.test(f.type)) continue; try { let cv = await fileToCanvas(f, 1800); if ($('#trim').checked) cv = trimBorders(cv); BATCH.push({ id: uid(), cover: cv, info: analyze(cv), title: guessTitle(f.name), author: '', name: f.name }); } catch (e) {} }
  renderBatch();
}
async function runBatch() {
  const sizes = SIZE_ORDER.filter(k => $(`#bSizes input[data-k="${k}"]`).checked); if (!sizes.length) { toast('Tick at least one size'); return; }
  const tpl = $('#bTpl').value, files = [], bar = $('#bBar'), status = $('#bStatus'); $('#bGo').disabled = true;
  const t0 = currentText();
  try {
    for (let i = 0; i < BATCH.length; i++) {
      const it = BATCH[i]; status.textContent = `Book ${i + 1} of ${BATCH.length}: ${it.title || it.name}`; await tick();
      const cid = 'b' + it.id;
      const spec = mockSpec(it.cover, it.info, S.mock, it.title, it.author, cid);
      renderProduct(spec, rotOf(S.mock)); const book = cropProduct(PROD, GL.ok ? GL.bare() : null), bctx = { cover: it.cover, info: it.info, title: it.title, author: it.author, coverId: cid, slot: 'book', cache: new Map() };
      const device = TPL[tpl].usesDevice && S.show.device ? buildDevice(it.cover, it.info, it.title, cid) : null;
      const text = Object.assign({}, t0, { headline: S.auto.headline ? (it.title || 'Get the PDF') : t0.headline, sub: S.auto.sub ? (it.author ? `by ${it.author}` : 'Instant PDF download') : t0.sub });
      if (!S.auto.headline && it.title) text.headline = it.title;
      const D = buildData({ cover: it.cover, info: it.info, coverId: cid, book, device, text, template: tpl, pos: { scale: 1, x: 0, y: 0 }, title: it.title, author: it.author, count: 1, getBook: v => getBookVariant(v, bctx) });
      const folder = (slug(it.title) || slug(it.name) || 'book-' + (i + 1));
      for (const k of sizes) { const sz = SIZES[k]; files.push({ name: `${folder}/${folder}_${tpl}_${sz.file}_${sz.w}x${sz.h}.${fmtExt()}`, blob: await adBlob(k, D) }); }
      if ($('#bMock').checked) files.push({ name: `${folder}/${folder}_3d-mockup.png`, blob: await toBlob(book.img, 'image/png') });
      bar.style.width = `${Math.round((i + 1) / BATCH.length * 100)}%`;
    }
    status.textContent = 'Packing the ZIP…'; await tick();
    const zip = await zipOf(files); status.textContent = `Done: ${files.length} files for ${BATCH.length} books.`;
    await saveBlob(`${slug(brand().name) || 'brand'}_batch_${BATCH.length}-books.zip`, zip);
  } catch (e) { status.textContent = e.message || 'Something went wrong.'; }
  finally { $('#bGo').disabled = !BATCH.length; productDirty = true; S.device = null; deviceKey = ''; invalidate(true); }
}
async function batchAI() {
  if (!aiCanSee() || !BATCH.length) return;
  const btn = $('#bAi'), status = $('#bStatus'); btn.disabled = true;
  try {
    for (let i = 0; i < BATCH.length; i++) {
      const it = BATCH[i]; status.textContent = `Claude is reading cover ${i + 1} of ${BATCH.length}…`;
      try { const r = await aiJSON('Read this book cover. Reply with only JSON: {"title":"","author":""} using Title Case, exactly the words printed on the cover. Empty strings if unreadable.', { image: await coverBlobForAI(it.cover), quick: true }); if (r && r.title) it.title = String(r.title); if (r && r.author) it.author = String(r.author); renderBatch(); }
      catch (e) { if (e && ['not_granted', 'rate_limited', 'bad_key', 'bad_model', 'offline'].includes(e.code)) { status.textContent = aiErr(e); return; } }
    }
    status.textContent = 'Titles filled in. Check them, then make the ads.';
  } finally { btn.disabled = false; }
}

/* =========================================================================
   Resize a finished ad
   ========================================================================= */
const RZ = { img: null, mode: 'blur', name: '' };
function edgeColor(img) { const i = analyze(img); return rgbToHex(i.edge); }
function drawResized(ctx, img, W, H, mode, scale = 1) {
  ctx.save(); ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (mode === 'crop') { coverFit(ctx, img, 0, 0, W, H); ctx.restore(); return; }
  if (mode === 'blur') { const b = blurredFill(img, W, H, Math.min(W, H) * .05, 'rz' + RZ.id); ctx.drawImage(b, 0, 0, W, H); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, W, H); }
  else { ctx.fillStyle = RZ.edge || '#000'; ctx.fillRect(0, 0, W, H); }
  const r = containRect(img.width, img.height, 0, 0, W, H);
  if (mode === 'blur') setShadow(ctx, 'rgba(0,0,0,.35)', Math.min(W, H) * .03, 0, Math.min(W, H) * .01);
  ctx.drawImage(img, r.x, r.y, r.w, r.h); ctx.restore();
}
function renderResize() {
  const g = $('#rGrid'); g.innerHTML = ''; $('#rEmpty').hidden = !!RZ.img; $('#rGo').disabled = !RZ.img; if (!RZ.img) return;
  SIZE_ORDER.forEach(k => { const sz = SIZES[k], sc = Math.min(300 / sz.w, 300 / sz.h), c = mk(sz.w * sc, sz.h * sc); drawResized(ctx2(c), RZ.img, sz.w, sz.h, RZ.mode, sc); const cell = document.createElement('div'); cell.className = 'rcell'; const s = document.createElement('small'); s.textContent = `${sz.ratio} · ${sz.w} × ${sz.h}`; cell.append(c, s); g.append(cell); });
}
async function setResizeFile(file) {
  if (!file || !/^image\//.test(file.type)) { toast('That is not an image file.'); return; }
  try { RZ.img = await fileToCanvas(file, 2400); RZ.id = uid(); RZ.edge = edgeColor(RZ.img); RZ.name = file.name.replace(/\.[a-z0-9]+$/i, ''); renderResize(); } catch (e) { toast(e.message); }
}
async function resizeAll() {
  if (!RZ.img) return; busy('Resizing…'); await tick();
  try {
    const files = [];
    for (const k of SIZE_ORDER) { const sz = SIZES[k], c = mk(sz.w, sz.h); drawResized(ctx2(c), RZ.img, sz.w, sz.h, RZ.mode); files.push({ name: `${slug(RZ.name) || 'ad'}_${sz.file}_${sz.w}x${sz.h}.${fmtExt()}`, blob: await toBlob(c, S.fmt === 'jpg' ? 'image/jpeg' : 'image/png', .93) }); }
    const zip = await zipOf(files); busy(); await saveBlob(`${slug(RZ.name) || 'ad'}_all-sizes.zip`, zip);
  } catch (e) { busy(); toast(e.message); }
}


/* =========================================================================
   Wiring
   ========================================================================= */
function bindDrop(zone, onFiles, multiple) {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('over');
    const files = [...(e.dataTransfer.files || [])].filter(f => /^image\//.test(f.type));
    if (files.length) onFiles(multiple ? files : [files[0]]);
    else if (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/html')) toast('The browser only passed a link. Right-click the image → Copy image, then paste here.');
  });
}
function clickable(el, fn) { el.addEventListener('click', fn); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } }); }

function measureHeader() { const h = $('.top'); if (h) document.documentElement.style.setProperty('--hdr', h.offsetHeight + 'px'); }
function init() {
  measureHeader(); window.addEventListener('resize', measureHeader);
  // modes and steps
  $$('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#homeLink').addEventListener('click', e => { e.preventDefault(); setMode('make'); goStep(1); });
  $$('.st').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.step)));
  $('#backBtn').addEventListener('click', () => goStep(STEP - 1));
  $('#nextBtn').addEventListener('click', () => { if (STEP === 5) resetForNextBook(); else goStep(STEP + 1); });
  $('#quickDl').addEventListener('click', downloadAll);

  // brand + settings
  fillBrandSelect();
  $('#brandSel').addEventListener('change', e => { S.brandId = e.target.value; persist(); syncAutoFields(); renderCopy(); invalidate(); });
  $('#kitBtn').addEventListener('click', openKit);
  Object.keys(KF).forEach(id => $('#' + id).addEventListener('input', kitChanged));
  $('#kLogoBtn').addEventListener('click', () => $('#kLogoFile').click());
  $('#kLogoFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { let cv = await fileToCanvas(f, 512); cv = trimBorders(cv); brand().logo = cv.toDataURL('image/png'); persist(); drawKitLogo(); setTimeout(drawKitLogo, 150); chatCache.clear(); invalidate(); toast('Logo saved for this brand'); }
    catch (er) { toast(er.message); }
  });
  $('#kLogoClear').addEventListener('click', () => { brand().logo = null; persist(); drawKitLogo(); chatCache.clear(); invalidate(); });
  $('#kNew').addEventListener('click', () => { const b = Object.assign(JSON.parse(JSON.stringify(DEFAULT_BRANDS[0])), { id: uid(), name: 'New brand', site: '', logo: null }); S.brands.push(b); S.brandId = b.id; persist(); fillBrandSelect(); kitRefresh(); });
  $('#kDel').addEventListener('click', () => { if (S.brands.length < 2) return; const id = S.brandId; S.brands = S.brands.filter(b => b.id !== id); S.brandId = S.brands[0].id; persist(); fillBrandSelect(); kitRefresh(); });
  $('#kExport').addEventListener('click', async () => { await saveBlob('ad-studio-brand-kit.json', new Blob([JSON.stringify({ app: 'cliffmatt-ad-studio', v: 1, brands: S.brands }, null, 1)], { type: 'application/json' })); });
  $('#kImport').addEventListener('click', () => $('#kImportFile').click());
  $('#kImportFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.brands) || !j.brands.length) throw new Error('bad'); S.brands = j.brands.map(b => Object.assign({}, DEFAULT_BRANDS[0], b, { id: b.id || uid() })); S.brandId = S.brands[0].id; persist(); fillBrandSelect(); kitRefresh(); toast('Brand kit restored'); }
    catch (er) { toast('That file is not a brand kit backup.'); }
  });
  function kitRefresh() { const b = brand(); for (const [id, k] of Object.entries(KF)) $('#' + id).value = b[k] || (k === 'steps' ? DEFAULT_STEPS : ''); drawKitLogo(); $('#kDel').disabled = S.brands.length < 2; badgeCache.clear(); chatCache.clear(); syncAutoFields(); renderCopy(); invalidate(true); }
  // Claude API key (web app only)
  $('#aiKey').value = AIS.key; $('#aiModel').value = AIS.model;
  $('#aiKey').addEventListener('change', e => { AIS.key = e.target.value.trim(); store(AI_KEY, AIS); aiRefresh(); $('#aiTestStatus').textContent = AIS.key ? 'Saved in this browser.' : 'Removed.'; });
  $('#aiModel').addEventListener('change', e => { AIS.model = e.target.value; store(AI_KEY, AIS); });
  $('#aiTest').addEventListener('click', aiTest);
  $('#aiHintBtn').addEventListener('click', openKit);

  // step 1: cover
  const drop = $('#drop');
  clickable(drop, () => $('#coverFile').click());
  $('#coverFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) handleCoverFile(f); });
  bindDrop(drop, fs => handleCoverFile(fs[0]));
  document.addEventListener('paste', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && !(e.clipboardData && [...e.clipboardData.items].some(i => i.type.startsWith('image/')))) return;
    const items = [...((e.clipboardData && e.clipboardData.items) || [])].filter(i => i.kind === 'file' && i.type.startsWith('image/'));
    if (!items.length) return; e.preventDefault();
    const files = items.map(i => i.getAsFile()).filter(Boolean);
    if (MODE === 'batch') addBatchFiles(files); else if (MODE === 'resize') setResizeFile(files[0]); else handleCoverFile(files[0]);
  });
  $('#title').addEventListener('input', e => { S.title = e.target.value; S.isSampleText = false; S.titleGuessed = false; updateLinks(); syncAutoFields(); renderCopy(); invalidate(true); });
  $('#author').addEventListener('input', e => { S.author = e.target.value; S.isSampleText = false; updateLinks(); syncAutoFields(); renderCopy(); invalidate(true); });
  $('#price').addEventListener('input', e => { S.text.price = e.target.value; S.auto.price = !e.target.value; renderCopy(); invalidate(); });
  $('#aiRead').addEventListener('click', aiFill);
  $('#extraAdd').addEventListener('click', () => $('#extraFile').click());
  $('#extraFile').addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; addExtraFiles(fs); });
  $('#extraClear').addEventListener('click', () => { S.extra = []; renderExtra(); invalidate(); });
  bindDrop($('#extraRow'), fs => addExtraFiles(fs), true);

  // step 2: mockup
  $$('#prodSeg button').forEach(b => b.addEventListener('click', () => {
    S.mock.type = b.dataset.v;
    if (b.dataset.v === 'flat') Object.assign(S.mock, { pose: 'stand', turn: 0, tilt: 4, spin: 0, angle: '' });
    else if (b.dataset.v === 'phone') Object.assign(S.mock, { pose: 'stand', turn: -18, tilt: 4, spin: 0, angle: '' });
    else if (!S.mock.angle) Object.assign(S.mock, ANGLES.right, { angle: 'right' });
    syncMockUI(); persist(); invalidate(true);
  }));
  $$('#angleChips button').forEach(c => c.addEventListener('click', () => { Object.assign(S.mock, ANGLES[c.dataset.a], { angle: c.dataset.a }); syncMockUI(); persist(); invalidate(true); }));
  ['turn', 'tilt', 'spin', 'thick', 'gloss'].forEach(k => $('#' + k).addEventListener('input', e => { S.mock[k] = +e.target.value; if (k !== 'thick' && k !== 'gloss') { S.mock.angle = ''; syncPressed('#angleChips', 'a', ''); } outs(); invalidate(true); }));
  ['turn', 'tilt', 'spin', 'thick', 'gloss'].forEach(k => $('#' + k).addEventListener('change', persist));
  $('#spineAuto').addEventListener('change', e => { S.mock.spineAuto = e.target.checked; $('#spineColor').disabled = e.target.checked; persist(); invalidate(true); });
  $('#spineColor').addEventListener('input', e => { S.mock.spineColor = e.target.value; S.mock.spineAuto = false; $('#spineAuto').checked = false; persist(); invalidate(true); });
  $('#dlMock').addEventListener('click', downloadMock);

  // step 3: gallery
  buildGallery();
  $('#curDesign').textContent = TPL[S.template].name;

  // step 4: words, show, background, position
  ['headline', 'sub', 'cta', 'tag', 'offer', 'kicker'].forEach(k => $('#' + k).addEventListener('input', e => { S.text[k] = e.target.value; S.auto[k] = !e.target.value; invalidate(); }));
  ['oldPrice', 'quote', 'quoteBy'].forEach(k => $('#' + k).addEventListener('input', e => { S.text[k] = e.target.value; renderCopy(); invalidate(); }));
  $('#stars').checked = !!S.show.stars; $('#stars').addEventListener('change', e => { S.show.stars = e.target.checked; persist(); invalidate(); });
  $$('[data-show]').forEach(cb => { cb.checked = !!S.show[cb.dataset.show]; cb.addEventListener('change', () => { S.show[cb.dataset.show] = cb.checked; persist(); invalidate(); }); });
  $('#resetWords').addEventListener('click', () => { for (const k of ['headline', 'sub', 'cta', 'tag', 'price', 'offer', 'kicker']) { S.auto[k] = true; S.text[k] = ''; } ['oldPrice', 'quote', 'quoteBy'].forEach(k => { S.text[k] = ''; $('#' + k).value = ''; }); S.aiCopy = null; syncAutoFields(); $('#price').value = ''; renderCopy(); invalidate(); });
  $$('#sizeSeg button').forEach(b => b.addEventListener('click', () => { S.size = b.dataset.s; persist(); invalidate(); }));
  $('#safeTg').checked = S.safe; $('#safeTg').addEventListener('change', e => { S.safe = e.target.checked; persist(); invalidate(); });
  $$('#bgSeg button').forEach(b => b.addEventListener('click', () => setBgMode(b.dataset.v)));
  $('#bgColor').value = S.bg.color; $('#bgColor2').value = S.bg.color2; $('#bgGrad').checked = S.bg.grad; $('#bgDim').value = S.bg.dim;
  $('#bgColor').addEventListener('input', e => { S.bg.color = e.target.value; computeBgDark(); persist(); invalidate(); });
  $('#bgColor2').addEventListener('input', e => { S.bg.color2 = e.target.value; computeBgDark(); persist(); invalidate(); });
  $('#bgGrad').addEventListener('change', e => { S.bg.grad = e.target.checked; computeBgDark(); persist(); invalidate(); });
  $('#bgDim').addEventListener('input', e => { S.bg.dim = +e.target.value; computeBgDark(); outs(); persist(); invalidate(); });
  $('#bgAdd').addEventListener('click', () => $('#bgFile').click());
  $('#bgFile').addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; addBgFiles(fs); });
  bindDrop($('#bgLib'), fs => addBgFiles(fs), true);
  ['pScale', 'pX', 'pY'].forEach(id => $('#' + id).addEventListener('input', () => { S.pos = { scale: +$('#pScale').value / 100, x: +$('#pX').value / 100, y: +$('#pY').value / 100 }; outs(); invalidate(); }));
  $('#posReset').addEventListener('click', () => { S.pos = { scale: 1, x: 0, y: 0 }; syncPos(); invalidate(); });
  let drag = null;
  const hit = e => { if (!lastTrack || !lastTrack.book) return null; const r = preview.getBoundingClientRect(), k = preview.width / r.width, x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k, b = lastTrack.book; return (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) ? k : null; };
  preview.addEventListener('pointerdown', e => { const k = hit(e); if (!k) return; drag = { x0: e.clientX, y0: e.clientY, px: S.pos.x, py: S.pos.y, k }; preview.setPointerCapture(e.pointerId); preview.style.cursor = 'grabbing'; });
  preview.addEventListener('pointermove', e => {
    if (!drag) { preview.style.cursor = hit(e) ? 'grab' : 'default'; return; }
    const sz = SIZES[S.size]; S.pos.x = clamp(drag.px + (e.clientX - drag.x0) * drag.k / sz.w, -.3, .3); S.pos.y = clamp(drag.py + (e.clientY - drag.y0) * drag.k / sz.h, -.3, .3); syncPos(); invalidate();
  });
  const endDrag = () => { if (drag) { drag = null; preview.style.cursor = 'grab'; } };
  preview.addEventListener('pointerup', endDrag); preview.addEventListener('pointercancel', endDrag);

  // step 5: download
  buildSizeCards();
  $('#sizes').addEventListener('change', e => { const k = e.target.dataset.inc; if (k) { S.sizesOn[k] = e.target.checked; persist(); } });
  $('#sizes').addEventListener('click', e => { const b = e.target.closest('[data-one]'); if (b) downloadOne(b.dataset.one); });
  $$('input[name=fmt]').forEach(r => { r.checked = r.value === S.fmt; r.addEventListener('change', () => { S.fmt = r.value; persist(); }); });
  $('#dlAll').addEventListener('click', downloadAll);
  $('#dlVideo').addEventListener('click', downloadVideo);
  $('#dlCarousel').addEventListener('click', downloadCarousel);
  $('#vidSize').value = S.size; $('#vidSize').addEventListener('change', e => { S.size = e.target.value; persist(); });

  // batch
  const bt = $('#bTpl'); TPL_ORDER.forEach(id => { const o = document.createElement('option'); o.value = id; o.textContent = TPL[id].name; bt.append(o); }); bt.value = S.template === 'custom' ? 'shop' : S.template;
  const bs = $('#bSizes'); SIZE_ORDER.forEach(k => { const l = document.createElement('label'); l.className = 'tg'; l.innerHTML = `<input type="checkbox" data-k="${k}" ${S.sizesOn[k] ? 'checked' : ''}>${SIZES[k].ratio} ${SIZES[k].name}`; bs.append(l); });
  clickable($('#bDrop'), () => $('#bFile').click());
  $('#bFile').addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; addBatchFiles(fs); });
  bindDrop($('#bDrop'), addBatchFiles, true);
  $('#bGo').addEventListener('click', runBatch);
  $('#bAi').addEventListener('click', batchAI);
  $('#bCollection').addEventListener('click', useBatchAsCollection);
  renderBatch();

  // resize
  clickable($('#rDrop'), () => $('#rFile').click());
  $('#rFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) setResizeFile(f); });
  bindDrop($('#rDrop'), fs => setResizeFile(fs[0]));
  $$('#rSeg button').forEach(b => b.addEventListener('click', () => { RZ.mode = b.dataset.v; syncPressed('#rSeg', 'v', RZ.mode); renderResize(); }));
  $('#rGo').addEventListener('click', resizeAll);

  syncMockUI(); syncPos(); syncAutoFields(); renderExtra(); aiRefresh();
  setBgMode(S.bg.mode === 'image' && !S.bg.imgId ? 'template' : S.bg.mode);
  loadBgLibrary();
  if (!GL.ok) { $$('#prodSeg button, #angleChips button').forEach(b => b.disabled = true); toast('3D is not available in this browser, so covers are shown flat.'); }
}

// ---------- installable web app ----------
function initPWA() {
  const inClaude = !!(window.claude && typeof window.claude.use === 'function');
  document.body.dataset.host = inClaude ? 'claude' : 'web';
  if (inClaude || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing; if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const t = $('#updateBar'); t.hidden = false;
        }
      });
    });
  }).catch(() => {});
  $('#updateBtn').addEventListener('click', () => location.reload());
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  $('#installBtn').addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; $('#installBtn').hidden = true; });
  window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; toast('Ad Studio is installed'); });
}

async function start() {
  const fams = ['400 40px "Anton"', '900 40px "Montserrat"', '800 40px "Montserrat"', '700 40px "Montserrat"', '600 40px "Montserrat"', '500 40px "Montserrat"', '400 40px "DM Serif Display"', '400 40px "Plus Jakarta Sans"', '600 40px "Plus Jakarta Sans"'];
  try { await Promise.race([Promise.all(fams.map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  initPWA();
  init();
  S.isSampleText = true; S.title = 'The Long Rains'; S.author = 'Amani Otieno'; $('#title').value = S.title; $('#author').value = S.author;
  await setCover(sampleCover(), { sample: true });
  S.isSampleText = true; syncAutoFields(); renderCopy();
  setMode('make'); goStep(1);
  window.__adstudio = { renderProduct, mockSpec, rotOf, PROD, S, TPL, TPL_ORDER, SIZES, compose, buildData, setCover, renderAll, downloadAll, GL, buildProduct, buildDevice, invalidate, analyze, getBookVariant, renderExtra, goStep, setMode };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

})();
