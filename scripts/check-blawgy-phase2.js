"use strict";

// Phase 2 integration test — no network. Drives createBlawgyCompat with INJECTED
// mock GSC + CMS-publisher providers and asserts the real wiring end to end:
//   - GSC OAuth: /gsc/connect/start -> 302 Google; /gsc/oauth2callback exchanges the
//     code, lists one property, auto-connects, 302s ?connected=true; /gsc/data serves
//     real Search Analytics rows; the stored token is REDACTED to a marker.
//   - CMS: /test-connection validates a real publisher; /publish-draft pushes to the
//     publisher and persists the real cmsPostId + publishedUrl.
//   - Security: publicSiteSettings never echoes appPassword/apiToken (write-only) but
//     flags presence; update-site-settings preserves a stored secret on empty submit.
//   - Graceful degradation: with no gsc/publishers, /gsc/data 500s (placeholder) and
//     /publish-draft flips locally (fabricated URL).
//
// Run: node scripts/check-blawgy-phase2.js  (added to `npm run check`).

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sba-phase2-"));
process.env.SIR_BLOGGS_BLAWGY_STORE_PATH = path.join(tmpDir, "blawgy-store.json");

const { createBlawgyCompat } = require("../lib/blawgy-compat");

const USER = { id: "google:phase2", email: "owner@example.test", role: "client", name: "Owner", picture: "" };
const SITE = "example.test";

const publishCalls = [];
const wpPublisher = {
  blogType: "wordpress",
  hasCreds: (conn) => Boolean(conn && conn.username && conn.appPassword),
  validate: async (conn) => ({ ok: true, user: { name: conn.username } }),
  publish: async (article, conn) => { publishCalls.push({ op: "publish", article, conn }); return { cmsPostId: 123, publishedUrl: "https://real.example/post/123", status: article.status === "draft" ? "draft" : "published" }; },
  update: async (id, article) => { publishCalls.push({ op: "update", id }); return { cmsPostId: id, publishedUrl: "https://real.example/post/" + id, status: "published" }; },
};

function providers(withReal) {
  const gsc = withReal ? {
    authorizeUrl: ({ redirectUri, state }) => `https://accounts.google.com/o/oauth2/v2/auth?client_id=cid&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=webmasters`,
    exchangeCode: async ({ code }) => ({ access_token: "AT-" + code, refresh_token: "RT", expiry: Date.now() + 3600e3 }),
    refresh: async () => ({ access_token: "AT-refreshed", expiry: Date.now() + 3600e3 }),
    listSites: async () => [{ displayName: SITE, url: `sc-domain:${SITE}`, permissionLevel: "siteOwner" }],
    searchAnalytics: async (_t, _p, opts) => [{ keys: [opts.dimensions[0] === "query" ? "widgets" : opts.startDate], clicks: 10, impressions: 100, ctr: 0.1, position: 5.2 }],
    revoke: async () => true,
  } : null;
  const publishersImpl = withReal ? {
    getPublisher: (bt) => (bt === "wordpress" ? wpPublisher : null),
    connFromSettings: (bt, settings, site) => ({ site, username: settings && settings.username, appPassword: settings && settings.appPassword }),
  } : null;
  return { scrape: null, llm: null, keywords: null, gsc, publishers: publishersImpl, llmAvailable: false, keywordsAvailable: false, gscAvailable: Boolean(gsc) };
}

function makeDeps(withReal) {
  return {
    root: tmpDir,
    readSessionUser: async () => USER,
    readRequestJson: async (req) => req.__body || {},
    sendJson: (res, status, payload) => { res.statusCode = status; res.__json = payload; res.ended = true; },
    publicUser: (u) => (u ? { id: u.id, email: u.email, name: u.name, picture: u.picture, role: u.role } : null),
    providers: providers(withReal),
  };
}

function makeRes() {
  const res = { statusCode: 0, headers: {}, chunks: [], ended: false, __json: undefined };
  res.writeHead = (status, headers) => { res.statusCode = status; Object.assign(res.headers, headers || {}); return res; };
  res.write = (c) => { res.chunks.push(String(c)); return true; };
  res.end = (c) => { if (c) res.chunks.push(String(c)); res.ended = true; return res; };
  return res;
}

async function call(compat, method, pathAndQuery, body) {
  const req = { method, url: pathAndQuery, headers: { cookie: "sirbloggs_session=stub", host: "sirbloggsalot.com", "x-forwarded-proto": "https" }, __body: body };
  const res = makeRes();
  const url = new URL(pathAndQuery, "https://sirbloggsalot.com");
  const handled = await compat.serve(req, res, url);
  return { handled, status: res.statusCode, json: res.__json, location: res.headers.location, chunks: res.chunks };
}

function entryId(planJson) {
  const rows = (planJson && (planJson.entries || (planJson.plan && planJson.plan.entries))) || [];
  const row = rows.find((e) => e.id || e._id);
  return row && (row.id || row._id);
}

async function main() {
  const compat = createBlawgyCompat(makeDeps(true));

  // --- GSC OAuth flow --------------------------------------------------------
  const start = await call(compat, "GET", `/gsc/connect/start?site=${SITE}`);
  assert.strictEqual(start.status, 302, "connect/start should 302");
  assert.ok(/accounts\.google\.com/.test(start.location), "connect/start -> Google");
  const state = new URL(start.location).searchParams.get("state");
  assert.ok(state, "authorize URL carries a state");

  const cb = await call(compat, "GET", `/gsc/oauth2callback?code=abc123&state=${encodeURIComponent(state)}`);
  assert.strictEqual(cb.status, 302, "callback should 302");
  assert.ok(/\/reports\?connected=true/.test(cb.location), `single property should auto-connect, got ${cb.location}`);

  const settings = await call(compat, "GET", `/get-site-settings?site=${SITE}`);
  const gscPub = settings.json.settings.gsc;
  assert.ok(gscPub && gscPub.connected === true, "gsc marked connected");
  assert.strictEqual(gscPub.access_token, "connected", "gsc token REDACTED to marker");
  assert.strictEqual(gscPub.connected_site, `sc-domain:${SITE}`, "connected property persisted");

  const data = await call(compat, "GET", `/gsc/data?site=${SITE}&filters[dimensions]=query&filters[startDate]=2026-07-01&filters[endDate]=2026-07-28`);
  assert.strictEqual(data.status, 200, "gsc/data 200");
  assert.ok(Array.isArray(data.json.rows) && data.json.rows[0].keys[0] === "widgets", "real search-analytics rows flow through");

  const ranks = await call(compat, "GET", `/api/keyword-research/${SITE}/rankings?source=gsc`);
  assert.strictEqual(ranks.status, 200, "gsc rankings 200");
  assert.strictEqual(ranks.json.source, "gsc", "rankings served from gsc");
  assert.ok(ranks.json.rows[0] && ranks.json.rows[0].keyword === "widgets", "gsc rankings mapped from search analytics");

  // --- Secret redaction + write-only preservation ----------------------------
  await call(compat, "POST", "/update-site-settings", { site: SITE, settings: { blogType: "wordpress", username: "editor", appPassword: "app-pass-123" } });
  let s2 = await call(compat, "GET", `/get-site-settings?site=${SITE}`);
  assert.strictEqual(s2.json.settings.appPassword, "", "appPassword is write-only (redacted)");
  assert.strictEqual(s2.json.settings.hasAppPassword, true, "hasAppPassword presence flag set");
  // Empty submit must NOT wipe the stored secret.
  await call(compat, "POST", "/update-site-settings", { site: SITE, settings: { appPassword: "", tone: "friendly" } });
  const connAfter = { username: "editor" };
  // prove persistence by publishing (publisher.hasCreds needs the stored appPassword)
  void connAfter;

  // --- Real CMS validate + publish ------------------------------------------
  const test = await call(compat, "POST", "/test-connection", { site: SITE, blogType: "wordpress", username: "editor", appPassword: "app-pass-123" });
  assert.strictEqual(test.status, 200, "test-connection 200");
  assert.strictEqual(test.json.success, true, "wordpress validate succeeded");

  const plan = await call(compat, "GET", `/api/plan/${SITE}`);
  const id = entryId(plan.json);
  assert.ok(id, "a plan entry exists to publish");
  const pubRes = await call(compat, "POST", "/publish-draft", { site: SITE, id });
  assert.strictEqual(pubRes.status, 200, "publish-draft 200");
  assert.strictEqual(pubRes.json.publishedUrl, "https://real.example/post/123", "REAL publishedUrl from the CMS (not fabricated)");
  assert.ok(publishCalls.some((c) => c.op === "publish"), "publisher.publish was actually called");
  const plan2 = await call(compat, "GET", `/api/plan/${SITE}`);
  const row = ((plan2.json && (plan2.json.entries || (plan2.json.plan && plan2.json.plan.entries))) || []).find((e) => (e.id || e._id) === id);
  assert.strictEqual(row.publishedUrl, "https://real.example/post/123", "real publishedUrl persisted on the entry");

  // --- Graceful degradation (no gsc / no publishers) — fresh store -----------
  process.env.SIR_BLOGGS_BLAWGY_STORE_PATH = path.join(tmpDir, "bare-store.json");
  const bare = createBlawgyCompat(makeDeps(false));
  const bareData = await call(bare, "GET", `/gsc/data?site=${SITE}`);
  assert.strictEqual(bareData.status, 500, "no gsc provider -> placeholder 500 (not connected)");
  await call(bare, "POST", "/update-site-settings", { site: SITE, settings: { blogType: "wordpress", username: "u", appPassword: "p" } });
  const barePlan = await call(bare, "GET", `/api/plan/${SITE}`);
  const bareId = entryId(barePlan.json);
  const barePub = await call(bare, "POST", "/publish-draft", { site: SITE, id: bareId });
  assert.strictEqual(barePub.status, 200, "no publisher -> local placeholder publish still 200");
  assert.ok(/\/blog\//.test(barePub.json.publishedUrl || ""), "placeholder fabricates a local URL");

  console.log("Blawgy Phase 2 checks passed (GSC OAuth + Search Analytics + redaction + CMS publish; graceful degradation).");
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error("Phase 2 check FAILED:", error && error.stack ? error.stack : error);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  process.exit(1);
});
