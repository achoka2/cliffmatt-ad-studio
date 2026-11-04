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
  const T0 = TPL[S.template], floating = ((T0.styles(D, themeFor(D, T0), L) || {}).book || {}).floor === false;
  const c = mk(sz.w, sz.h), x = ctx2(c);
  const draw = t => {
    let fr = null;
    if (is3d) {
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

