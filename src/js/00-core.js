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
    if (spec.type === 'hardcover' || spec.type === 'paperback' || spec.type === 'flat') {
      const coverMat = mat({ map: tex(spec.type === 'hardcover' ? hingeCover(spec.cover) : spec.cover), roughness: .5 });
      const backMat = mat({ color: col(spec.backColor), roughness: .6 });
      const pV = mat({ map: tex(pagesCanvas(true)), roughness: .95 }), pH = mat({ map: tex(pagesCanvas(false)), roughness: .95 });
      if (spec.type === 'hardcover') {
        const b = .028, o = .03, sp = .02, edgeMat = mat({ color: col(spec.edgeColor), roughness: .7 });
        const fb = mesh(geo(new THREE.BoxGeometry(W, H, b)), [edgeMat, edgeMat, edgeMat, edgeMat, coverMat, edgeMat]); fb.position.z = T / 2 - b / 2;
        const bb = mesh(geo(new THREE.BoxGeometry(W, H, b)), [edgeMat, edgeMat, edgeMat, edgeMat, edgeMat, backMat]); bb.position.z = -T / 2 + b / 2;
        const pages = mesh(geo(new THREE.BoxGeometry(W - o - sp, H - 2 * o, T - 2 * b)), [pV, pV, pH, pH, pV, pV]); pages.position.x = (sp - o) / 2;
        const spineMat = mat({ map: tex(spineCanvas(spec, T * 1.15 / H)), roughness: .55 });
        const sp3 = mesh(geo(new THREE.CylinderGeometry(T / 2, T / 2, H, 32, 1, false, Math.PI, Math.PI)), [spineMat, edgeMat, edgeMat]); sp3.scale.x = .3; sp3.position.x = -W / 2;
        root.add(fb, bb, pages, sp3);
      } else if (spec.type === 'paperback') {
        const spineMat = mat({ map: tex(spineCanvas(spec, T / H)), roughness: .55 });
        root.add(mesh(geo(new THREE.BoxGeometry(W, H, T)), [pV, spineMat, pH, pH, coverMat, backMat]));
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
    const sg = geo(new THREE.PlaneGeometry(W, H));
    const sheenMat = new THREE.MeshBasicMaterial({ map: tex(sheenCanvas()), transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }); disp.push(sheenMat);
    const sheen = new THREE.Mesh(sg, sheenMat); sheen.position.z = front + .004; root.add(sheen);
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

