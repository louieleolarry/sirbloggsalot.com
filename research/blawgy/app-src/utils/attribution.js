// First-touch ad attribution for the app (app.blawgy.com).
//
// Captures gclid/gbraid/wbraid + utm_* from the URL, the gtag conversion-linker
// cookie (_gcl_aw), and the cross-subdomain cookie the landing site writes
// (blawgy_attr). Stored once in localStorage; sent to the backend at signup so
// paid conversions can be joined back to the ad click (see
// backend/lib/googleAdsConversions.js).

const STORAGE_KEY = 'blawgy_attribution';
const CLICK_KEYS = ['gclid', 'gbraid', 'wbraid'];
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

function readCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// _gcl_aw looks like GCL.1712345678.<gclid>
function gclidFromLinkerCookie() {
  const raw = readCookie('_gcl_aw');
  if (!raw) return null;
  const parts = raw.split('.');
  return parts.length >= 3 ? parts.slice(2).join('.') : null;
}

function landingCookieAttribution() {
  const raw = readCookie('blawgy_attr');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function currentPageAttribution() {
  const out = {};
  try {
    const params = new URL(window.location.href).searchParams;
    [...CLICK_KEYS, ...UTM_KEYS].forEach((key) => {
      const val = params.get(key);
      if (val) out[key] = val;
    });
  } catch {
    // ignore
  }
  return out;
}

// Capture once per browser. Call early on app load; safe to call repeatedly.
// A fresh gclid upgrades a stored blob that has none (e.g. user first came
// organically, later clicked an ad).
export function captureAttribution() {
  try {
    const fromUrl = currentPageAttribution();
    const fromLanding = landingCookieAttribution() || {};
    const linkerGclid = gclidFromLinkerCookie();

    const merged = { ...fromLanding, ...fromUrl };
    if (!merged.gclid && linkerGclid) merged.gclid = linkerGclid;

    const stored = getStoredAttribution();
    if (stored) {
      if (!stored.gclid && merged.gclid) {
        const upgraded = { ...stored, ...merged, captured_at: stored.captured_at };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
      }
      return;
    }

    if (Object.keys(merged).length === 0 && !document.referrer) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...merged,
      referrer: document.referrer || undefined,
      landing_page: window.location.pathname + window.location.search,
      captured_at: new Date().toISOString(),
    }));
  } catch {
    // Attribution must never break the app.
  }
}

export function getStoredAttribution() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
