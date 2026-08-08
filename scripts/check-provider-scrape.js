"use strict";

// Unit test for lib/providers/scrape.js — the SSRF-guarded onboarding crawler.
//
// Fully self-contained: DNS and fetch are both injected fakes, so this runs with
// ZERO real network or DNS access. Exits 0 on success, non-zero on failure.
//
// Run: node scripts/check-provider-scrape.js  (added to `npm run check`).

const assert = require("assert");
const { fetchSite } = require("../lib/providers/scrape");

// Case-insensitive headers shim matching the fetch Headers.get() contract.
function makeHeaders(map = {}) {
  const lower = {};
  for (const [key, value] of Object.entries(map)) lower[key.toLowerCase()] = value;
  return { get: (name) => (name.toLowerCase() in lower ? lower[name.toLowerCase()] : null) };
}

// Fake DNS: hostname -> array of {address, family} records.
const DNS_TABLE = {
  "example.com": [{ address: "93.184.216.34", family: 4 }],
  "redirector.test": [{ address: "198.51.100.10", family: 4 }],
  "loopback.test": [{ address: "127.0.0.1", family: 4 }],
  "ten.test": [{ address: "10.5.6.7", family: 4 }],
  "metadata.test": [{ address: "169.254.169.254", family: 4 }],
  "internal.test": [{ address: "10.1.2.3", family: 4 }],
};

async function fakeDnsLookup(hostname, options) {
  assert.deepStrictEqual(options, { all: true }, "DNS lookup must be called with { all: true }");
  const records = DNS_TABLE[hostname];
  if (!records) throw Object.assign(new Error(`ENOTFOUND ${hostname}`), { code: "ENOTFOUND" });
  return records;
}

async function expectCode(promise, code, label) {
  try {
    await promise;
  } catch (error) {
    assert.strictEqual(error.code, code, `${label}: expected code '${code}', got '${error.code}' (${error.message})`);
    return;
  }
  throw new Error(`${label}: expected rejection with code '${code}', but it resolved`);
}

const PAGE_HTML = [
  "<!doctype html><html><head>",
  "<title>Example &amp; Co Homepage</title>",
  '<link rel="stylesheet" href="/site.css">',
  '<link rel="icon" href="/favicon-32.png">',
  "<style>body { color: #DONOTLEAKCSS }</style>",
  "<script>window.__SECRET__ = 'DONOTLEAKJS';</script>",
  "</head><body>",
  "<h1>Welcome</h1><p>We build widgets for local shops.</p>",
  "</body></html>",
].join("");

async function main() {
  // (1) URLs resolving to loopback / private / metadata space are rejected.
  const alwaysOk = async () => ({ status: 200, headers: makeHeaders(), text: async () => "<title>x</title>" });

  await expectCode(
    fetchSite("http://loopback.test/", { dnsLookup: fakeDnsLookup, fetchImpl: alwaysOk }),
    "blocked_domain",
    "loopback (127.0.0.1)"
  );
  await expectCode(
    fetchSite("ten.test", { dnsLookup: fakeDnsLookup, fetchImpl: alwaysOk }),
    "blocked_domain",
    "private (10.x)"
  );
  await expectCode(
    fetchSite("https://metadata.test/latest/meta-data/", { dnsLookup: fakeDnsLookup, fetchImpl: alwaysOk }),
    "blocked_domain",
    "cloud metadata (169.254.169.254)"
  );

  // The guard must run BEFORE any socket is opened.
  let blockedFetchCalls = 0;
  const countingFetch = async () => { blockedFetchCalls += 1; return alwaysOk(); };
  await expectCode(
    fetchSite("loopback.test", { dnsLookup: fakeDnsLookup, fetchImpl: countingFetch }),
    "blocked_domain",
    "guard precedes fetch"
  );
  assert.strictEqual(blockedFetchCalls, 0, "fetch must not be called for a blocked host");

  // (2) A public-IP URL returns extracted title, script-free text, absolute favicon.
  let sawManualRedirect = false;
  const successFetch = async (urlString, options) => {
    if (options && options.redirect === "manual") sawManualRedirect = true;
    return { status: 200, url: urlString, headers: makeHeaders({ "content-type": "text/html" }), text: async () => PAGE_HTML };
  };

  const result = await fetchSite("example.com", { dnsLookup: fakeDnsLookup, fetchImpl: successFetch });
  assert.strictEqual(sawManualRedirect, true, "fetchImpl must be called with redirect:'manual'");
  assert.strictEqual(result.url, "https://example.com/", "bare domain normalized to https origin");
  assert.strictEqual(result.finalUrl, "https://example.com/", "finalUrl reflects the fetched URL");
  assert.strictEqual(result.title, "Example & Co Homepage", "title extracted and entity-decoded");
  assert.ok(result.text.length > 0, "text must be non-empty");
  assert.ok(result.text.includes("Welcome"), "visible body text is retained");
  assert.ok(result.text.includes("widgets for local shops"), "paragraph text is retained");
  assert.ok(!result.text.includes("DONOTLEAKJS"), "script contents must be stripped from text");
  assert.ok(!result.text.includes("DONOTLEAKCSS"), "style contents must be stripped from text");
  assert.strictEqual(result.faviconUrl, "https://example.com/favicon-32.png", "favicon resolved to an absolute URL");

  // (3) A redirect hop pointing at a private IP is blocked on the next hop.
  let redirectFetchCalls = 0;
  const redirectFetch = async (urlString) => {
    redirectFetchCalls += 1;
    if (urlString === "https://redirector.test/") {
      return { status: 302, url: urlString, headers: makeHeaders({ location: "http://internal.test/secret" }), text: async () => "" };
    }
    // Should never be reached: the guard must block internal.test before fetching it.
    return { status: 200, url: urlString, headers: makeHeaders(), text: async () => "<title>leaked internal</title>" };
  };

  await expectCode(
    fetchSite("redirector.test", { dnsLookup: fakeDnsLookup, fetchImpl: redirectFetch }),
    "blocked_domain",
    "redirect to private IP"
  );
  assert.strictEqual(redirectFetchCalls, 1, "only the public first hop should be fetched; the private hop is blocked pre-fetch");

  console.log("Scrape provider checks passed.");
}

main().catch((error) => {
  console.error("Scrape provider check FAILED:", error && error.message ? error.message : error);
  process.exit(1);
});
