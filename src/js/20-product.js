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

