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

