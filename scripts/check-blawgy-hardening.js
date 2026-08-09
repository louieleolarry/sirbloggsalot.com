"use strict";

// Phase 1 hardening tests (no network): article-job dedup and restart recovery.
//   * A repeated PUT /generate-blog/:id for an in-flight entry does NOT spawn a
//     second generation (idempotent while in_queue/generating).
//   * Entries persisted as in_queue/generating with no content are reconciled to
//     'failed' on the next createBlawgyCompat init (restart recovery).
//
// Run: node scripts/check-blawgy-hardening.js  (added to `npm run check`).

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sba-harden-"));
const storePath = path.join(tmpDir, "blawgy-store.json");
process.env.SIR_BLOGGS_BLAWGY_STORE_PATH = storePath;

const { createBlawgyCompat } = require("../lib/blawgy-compat");

const USER = { id: "google:harden", email: "owner@harden.test", role: "client", name: "Owner", picture: "" };
const SITE = "harden.test";

function makeDeps(providers) {
  return {
    root: tmpDir,
    readSessionUser: async () => USER,
    readRequestJson: async (req) => req.__body || {},
    sendJson: (res, status, payload) => { res.statusCode = status; res.__json = payload; res.ended = true; },
    publicUser: (u) => (u ? { id: u.id, email: u.email, name: u.name, picture: u.picture, role: u.role } : null),
    providers,
  };
}

function makeRes() {
  const res = { statusCode: 0, headers: {}, chunks: [], ended: false, __json: undefined };
  res.writeHead = (s, h) => { res.statusCode = s; Object.assign(res.headers, h || {}); return res; };
  res.write = (c) => { res.chunks.push(String(c)); return true; };
  res.end = (c) => { if (c) res.chunks.push(String(c)); res.ended = true; return res; };
  return res;
}

async function call(compat, method, pathAndQuery, body) {
  const req = { method, url: pathAndQuery, headers: { cookie: "sirbloggs_session=stub" }, __body: body };
  const res = makeRes();
  const handled = await compat.serve(req, res, new URL(pathAndQuery, "http://localhost"));
  return { handled, status: res.statusCode, json: res.__json };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // ---- dedup: two rapid PUTs for the same entry => one generation ----
  let fullArticleCalls = 0;
  let releaseArticle;
  const gate = new Promise((resolve) => { releaseArticle = resolve; });
  const gatedLlm = {
    provider: "mock",
    model: "mock",
    articleOutline: async () => ({ sections: [] }),
    async fullArticle() {
      fullArticleCalls += 1;
      await gate; // hold the job "in flight" so the second PUT collapses
      return { sections: [{ title: "S", content: "<p>x</p>" }], metaDescription: "m" };
    },
  };
  const compat = createBlawgyCompat(makeDeps({ scrape: null, llm: gatedLlm, keywords: null, llmAvailable: true, keywordsAvailable: false }));

  const added = await call(compat, "POST", `/api/plan/${SITE}/add`, { keyword: "widgets", clusterLabel: "Widgets" });
  const entryId = added.json && added.json.entry && (added.json.entry.id || added.json.entry._id);
  assert.ok(entryId, "should create a plan entry to generate");

  const first = await call(compat, "PUT", `/generate-blog/${encodeURIComponent(entryId)}`, { site: SITE });
  assert.strictEqual(first.status, 200, "first generate-blog accepted");
  await delay(20); // let the worker enter fullArticle (awaiting the gate)
  const second = await call(compat, "PUT", `/generate-blog/${encodeURIComponent(entryId)}`, { site: SITE });
  assert.strictEqual(second.status, 200, "second generate-blog is idempotent (200)");

  releaseArticle();
  for (let i = 0; i < 40; i++) {
    await delay(20);
    const plan = await call(compat, "GET", `/api/plan/${SITE}`);
    const rows = (plan.json && plan.json.entries) || [];
    const row = rows.find((e) => (e.id || (e._id && e._id.$oid) || e._id) === entryId);
    if (row && row.blogStatus === "published") break;
  }
  assert.strictEqual(fullArticleCalls, 1, "a repeated PUT for an in-flight entry must NOT trigger a second generation");

  // ---- restart recovery: a stranded in-flight entry is reconciled to failed ----
  const raw = JSON.parse(fs.readFileSync(storePath, "utf8"));
  let stuckId = null;
  for (const account of Object.values(raw.users || {})) {
    for (const site of Object.values((account && account.sites) || {})) {
      const entry = ((site && site.plan && site.plan.entries) || [])[0];
      if (entry) {
        entry.blogStatus = "generating";
        entry.status = "generating";
        entry.blogContent = ""; // simulate crash mid-generation (status persisted, no content)
        stuckId = entry.id || entry._id;
      }
    }
  }
  assert.ok(stuckId, "seeded a stuck entry");
  fs.writeFileSync(storePath, JSON.stringify(raw));

  // A fresh instance simulates a process restart and should reconcile on init.
  const restarted = createBlawgyCompat(makeDeps({ scrape: null, llm: null, keywords: null, llmAvailable: false, keywordsAvailable: false }));
  let reconciled = false;
  for (let i = 0; i < 40 && !reconciled; i++) {
    await delay(20);
    const plan = await call(restarted, "GET", `/api/plan/${SITE}`);
    const rows = (plan.json && plan.json.entries) || [];
    const row = rows.find((e) => (e.id || (e._id && e._id.$oid) || e._id) === stuckId);
    if (row && row.blogStatus === "failed") reconciled = true;
  }
  assert.ok(reconciled, "a stranded in-flight entry must be reconciled to 'failed' on restart");

  console.log("Blawgy hardening checks passed (job dedup; restart recovery of stranded article jobs).");
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error("Hardening check FAILED:", error && error.stack ? error.stack : error);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  process.exit(1);
});
