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

