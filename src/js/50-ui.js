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
