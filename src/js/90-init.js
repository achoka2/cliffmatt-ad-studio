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
  ['headline', 'sub', 'cta', 'tag', 'offer'].forEach(k => $('#' + k).addEventListener('input', e => { S.text[k] = e.target.value; S.auto[k] = !e.target.value; invalidate(); }));
  ['oldPrice', 'quote', 'quoteBy'].forEach(k => $('#' + k).addEventListener('input', e => { S.text[k] = e.target.value; renderCopy(); invalidate(); }));
  $('#stars').checked = !!S.show.stars; $('#stars').addEventListener('change', e => { S.show.stars = e.target.checked; persist(); invalidate(); });
  $$('[data-show]').forEach(cb => { cb.checked = !!S.show[cb.dataset.show]; cb.addEventListener('change', () => { S.show[cb.dataset.show] = cb.checked; persist(); invalidate(); }); });
  $('#resetWords').addEventListener('click', () => { for (const k of ['headline', 'sub', 'cta', 'tag', 'price', 'offer']) { S.auto[k] = true; S.text[k] = ''; } ['oldPrice', 'quote', 'quoteBy'].forEach(k => { S.text[k] = ''; $('#' + k).value = ''; }); S.aiCopy = null; syncAutoFields(); $('#price').value = ''; renderCopy(); invalidate(); });
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
