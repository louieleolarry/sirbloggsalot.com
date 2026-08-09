"use strict";

// Phase 1 (1c-1f) core-loop integration test — no network.
//
// Drives createBlawgyCompat directly with INJECTED MOCK providers and asserts the
// real provider wiring end to end: onboarding scrape description, LLM onboarding
// intelligence, DataForSEO keyword clusters (cached + served), and the async
// article-generation worker behind PUT /generate-blog/:id producing real content.
// Also asserts graceful degradation: with NO providers, the deterministic
// placeholders still answer.
//
// Run: node scripts/check-blawgy-core-loop.js  (added to `npm run check`).

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sba-core-loop-"));
process.env.SIR_BLOGGS_BLAWGY_STORE_PATH = path.join(tmpDir, "blawgy-store.json");

const { createBlawgyCompat } = require("../lib/blawgy-compat");

const USER = { id: "google:core-loop", email: "owner@acme.test", role: "client", name: "Owner", picture: "" };
const SITE = "acme.test";

const mockProviders = {
  scrape: {
    fetchSite: async (website) => ({
      url: website,
      finalUrl: `https://${website}`,
      title: "Acme Widgets",
      text: "Acme sells premium widgets and gadgets to local hardware shops across Colorado.",
      faviconUrl: `https://${website}/favicon.ico`,
    }),
  },
  llm: {
    provider: "mock",
    model: "mock",
    businessDescription: async () => "Acme Widgets supplies premium widgets and gadgets to local hardware shops.",
    detectBusinessType: async () => ({ businessType: "local", market: { locationName: "United States" }, locations: ["Denver, CO"] }),
    onboardingSuggestions: async () => ({ audienceSuggestions: ["Local hardware shops"], toneSuggestions: ["Helpful", "Expert"] }),
    researchCompetitors: async () => ({ competitors: [{ domain: "rivalwidgets.test" }] }),
    articleTitles: async () => ["The Widget Buying Guide", "How Widgets Work", "Widget Maintenance Checklist"],
    articleOutline: async () => ({ sections: [{ title: "Introduction", bullets: ["why widgets"] }, { title: "Choosing", bullets: ["sizes"] }] }),
    fullArticle: async () => ({
      sections: [
        { title: "Introduction", content: "<p>Widgets matter for local shops.</p>" },
        { title: "Choosing", content: "<p>Pick the right size.</p>" },
      ],
      metaDescription: "A practical guide to buying widgets.",
    }),
    articleSection: async () => "<p>Rewritten section.</p>",
  },
  keywords: {
    research: async () => ({
      clusters: [
        {
          label: "Widgets",
          pillarKeyword: "widgets",
          keywords: [
            { kw: "widgets", volume: 900, kd: 20, intent: "Commercial", covered: false },
            { kw: "buy widgets online", volume: 400, kd: 15, intent: "Transactional", covered: false },
          ],
        },
      ],
      meta: { provider: "dataforseo", dfsCalls: 1, estimatedCost: 0.05, market: "United States" },
    }),
  },
  llmAvailable: true,
  keywordsAvailable: true,
  llmProvider: "mock",
};

function makeDeps(providers) {
  return {
    root: tmpDir,
    readSessionUser: async () => USER,
    readRequestJson: async (req) => req.__body || {},
    sendJson: (res, status, payload) => {
      res.statusCode = status;
      res.__json = payload;
      res.ended = true;
    },
    publicUser: (u) => (u ? { id: u.id, email: u.email, name: u.name, picture: u.picture, role: u.role } : null),
    providers,
  };
}

function makeRes() {
  const res = { statusCode: 0, headers: {}, chunks: [], ended: false, __json: undefined };
  res.writeHead = (status, headers) => {
    res.statusCode = status;
    Object.assign(res.headers, headers || {});
    return res;
  };
  res.write = (chunk) => {
    res.chunks.push(String(chunk));
    return true;
  };
  res.end = (chunk) => {
    if (chunk) res.chunks.push(String(chunk));
    res.ended = true;
    return res;
  };
  return res;
}

async function call(compat, method, pathAndQuery, body) {
  const req = { method, url: pathAndQuery, headers: { cookie: "sirbloggs_session=stub" }, __body: body };
  const res = makeRes();
  const url = new URL(pathAndQuery, "http://localhost");
  const handled = await compat.serve(req, res, url);
  return { handled, status: res.statusCode, json: res.__json, chunks: res.chunks };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const compat = createBlawgyCompat(makeDeps(mockProviders));

  // 1. Onboarding scrape -> real (mocked) LLM business description.
  const scrape = await call(compat, "GET", `/scrape-site?website=${SITE}`);
  assert.strictEqual(scrape.status, 200, "scrape should be 200");
  assert.ok(/Acme Widgets supplies/.test(scrape.json.productDescription), "scrape should return the LLM description");
  assert.ok(scrape.json.faviconUrl.includes(SITE), "scrape should return the real favicon");

  // 2. Onboarding intelligence (competitors / suggestions).
  const competitors = await call(compat, "POST", "/research-competitors", { site: SITE });
  assert.deepStrictEqual(competitors.json.competitors, [{ domain: "rivalwidgets.test" }], "competitors from LLM");
  const suggestions = await call(compat, "POST", "/onboarding-suggestions", { site: SITE, productDescription: "widgets" });
  assert.ok(suggestions.json.audienceSuggestions.includes("Local hardware shops"), "audience suggestions from LLM");

  // 3. Keyword research: populate the real cache and serve it via clustersForSite.
  const clusters = await call(compat, "GET", `/api/keyword-research/${SITE}/clusters`);
  assert.strictEqual(clusters.status, 200, "clusters should be 200");
  const widgetCluster = (clusters.json.clusters || []).find((c) => c.pillarKeyword === "widgets");
  assert.ok(widgetCluster, "clusters should include the real DataForSEO 'widgets' cluster");
  assert.strictEqual(widgetCluster.keywords[0].volume, 900, "real search volume should flow through");

  // 4. Seed the content plan from the real clusters, then read an entry.
  const generate = await call(compat, "POST", `/api/plan/${SITE}/generate`, { horizonWeeks: 6 });
  assert.ok(generate.status === 200, "plan generate should be 200");
  const seeded = (generate.json && generate.json.entries) || [];
  assert.ok(seeded.length > 0, "generate should add entries seeded from the real clusters");
  // Real keyword metrics + computed upside flow into the seeded entry (parity: the
  // SPA renders "8,100 searches / Moderate (21/100) / Potential 405-891" from these).
  const seededEntry = seeded.find((e) => e.seoMetrics && e.seoMetrics.searchVolume === 900) || seeded[0];
  assert.strictEqual(seededEntry.seoMetrics.searchVolume, 900, "seeded entry should carry the real DataForSEO search volume");
  assert.ok(seededEntry.upside && seededEntry.upside.high > 0, "seeded entry should have a computed traffic upside");

  const plan = await call(compat, "GET", `/api/plan/${SITE}`);
  assert.ok(plan.json.projection && plan.json.projection.high > 0, "plan projection should sum entry upsides");
  const entryId = seededEntry.id || (seededEntry._id && seededEntry._id.$oid) || seededEntry._id;
  assert.ok(entryId, "seeded entry should have an id");

  // 5. Generate the article (async worker) -> real (mocked) content, status published.
  const queued = await call(compat, "PUT", `/generate-blog/${encodeURIComponent(entryId)}`, { site: SITE });
  assert.strictEqual(queued.status, 200, "generate-blog should accept the job");
  assert.strictEqual(queued.json.blogStatus, "in_queue", "generate-blog should queue the job");

  let published = null;
  for (let i = 0; i < 40 && !published; i++) {
    await delay(25);
    const poll = await call(compat, "GET", `/api/plan/${SITE}`);
    const rows = (poll.json && (poll.json.entries || (poll.json.plan && poll.json.plan.entries))) || [];
    const row = rows.find((e) => (e.id || (e._id && e._id.$oid) || e._id) === entryId);
    if (row && row.blogStatus === "published") published = row;
  }
  assert.ok(published, "the article worker should mark the entry published");

  // The real proof: the generated body is persisted and served by /blog-content.
  const content = await call(compat, "GET", `/blog-content?id=${encodeURIComponent(entryId)}&site=${SITE}`);
  assert.ok(/Widgets matter for local shops/.test(JSON.stringify(content.json)), "blog-content should return the real generated body");

  // 6. Graceful degradation: with NO providers, placeholders still answer.
  const bare = createBlawgyCompat(makeDeps({ scrape: null, llm: null, keywords: null, llmAvailable: false, keywordsAvailable: false }));
  const placeholderScrape = await call(bare, "GET", `/scrape-site?website=${SITE}`);
  assert.strictEqual(placeholderScrape.status, 200, "placeholder scrape should still be 200");
  assert.ok(placeholderScrape.json.productDescription, "placeholder scrape should still return a description");

  console.log("Blawgy core-loop checks passed (scrape + intel + keywords + plan + async article worker; graceful degradation).");
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error("Core-loop check FAILED:", error && error.stack ? error.stack : error);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  process.exit(1);
});
