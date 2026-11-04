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
