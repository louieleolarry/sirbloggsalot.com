"use strict";

const assert = require("assert");

const { createKeywords, clusterKeywords } = require("../lib/providers/keywords");

// (1) Credential gating.
assert.strictEqual(createKeywords({}), null);
assert.strictEqual(createKeywords({ DATAFORSEO_LOGIN: "a" }), null);
assert.strictEqual(createKeywords({ DATAFORSEO_PASSWORD: "b" }), null);

const provider = createKeywords({ DATAFORSEO_LOGIN: "a", DATAFORSEO_PASSWORD: "b" });
assert.strictEqual(typeof provider, "object");
assert.strictEqual(typeof provider.research, "function");

// (2) research() with an injected transport returning a canned DataForSEO payload.
const cannedItems = [
  {
    keyword: "content marketing",
    keyword_info: { search_volume: 5000 },
    keyword_properties: { keyword_difficulty: 40 },
    search_intent_info: { main_intent: "informational" },
  },
  {
    keyword: "content marketing strategy",
    keyword_info: { search_volume: 3200 },
    keyword_properties: { keyword_difficulty: 55 },
    search_intent_info: { main_intent: "commercial" },
  },
  {
    keyword: "content marketing agency",
    keyword_info: { search_volume: 1800 },
    keyword_properties: { keyword_difficulty: 60 },
    search_intent_info: { main_intent: "transactional" },
  },
  {
    keyword: "seo audit tool",
    keyword_info: { search_volume: 2400 },
    keyword_properties: { keyword_difficulty: 35 },
    search_intent_info: { main_intent: "commercial" },
  },
  // Sparse item: every field missing -> defensive defaults.
  { keyword: "seo audit checklist" },
];

let capturedUrl = null;
let capturedOpts = null;
const fakeFetch = async (url, opts) => {
  capturedUrl = url;
  capturedOpts = opts;
  return {
    async json() {
      return { tasks: [{ result: [{ items: cannedItems }] }] };
    },
  };
};

(async () => {
  const out = await provider.research(
    {
      site: "example.com",
      seedTerms: ["content marketing", "seo audit"],
      market: "United States",
      limit: 60,
    },
    { fetchImpl: fakeFetch }
  );

  // Request shape: correct endpoint, method, Basic auth, and task body.
  assert.ok(
    capturedUrl.endsWith("/v3/dataforseo_labs/google/keyword_ideas/live"),
    "calls the keyword_ideas endpoint"
  );
  assert.strictEqual(capturedOpts.method, "POST");
  assert.ok(capturedOpts.headers.Authorization.startsWith("Basic "));
  const sentBody = JSON.parse(capturedOpts.body);
  assert.ok(Array.isArray(sentBody), "body is an array of task objects");
  assert.deepStrictEqual(sentBody[0].keywords, ["content marketing", "seo audit"]);
  assert.strictEqual(sentBody[0].location_name, "United States");
  assert.strictEqual(sentBody[0].language_name, "English");
  assert.strictEqual(sentBody[0].limit, 60);

  // Response shape.
  assert.ok(Array.isArray(out.clusters) && out.clusters.length >= 1, "returns clusters");
  assert.strictEqual(out.meta.provider, "dataforseo");
  assert.strictEqual(out.meta.dfsCalls, 1);
  assert.strictEqual(out.meta.market, "United States");
  assert.strictEqual(typeof out.meta.estimatedCost, "number");

  for (const cluster of out.clusters) {
    assert.strictEqual(typeof cluster.label, "string");
    assert.ok(cluster.label.length > 0);
    assert.strictEqual(typeof cluster.pillarKeyword, "string");
    assert.ok(Array.isArray(cluster.keywords) && cluster.keywords.length >= 1);
    for (const row of cluster.keywords) {
      assert.strictEqual(typeof row.kw, "string");
      assert.strictEqual(typeof row.volume, "number");
      assert.strictEqual(typeof row.kd, "number");
      assert.strictEqual(typeof row.intent, "string");
      assert.strictEqual(row.covered, false);
    }
  }

  // Defensive mapping of the sparse item.
  const allRows = out.clusters.reduce((acc, c) => acc.concat(c.keywords), []);
  const sparse = allRows.find((row) => row.kw === "seo audit checklist");
  assert.ok(sparse, "mapped the sparse item");
  assert.strictEqual(sparse.volume, 0);
  assert.strictEqual(sparse.kd, 0);
  assert.strictEqual(sparse.intent, "informational");

  // (3) clusterKeywords groups related keywords and picks the highest-volume pillar.
  const fixture = [
    { kw: "email marketing", volume: 4000, kd: 30, intent: "informational", covered: false },
    { kw: "email marketing tips", volume: 900, kd: 20, intent: "informational", covered: false },
    { kw: "email marketing software", volume: 6000, kd: 50, intent: "commercial", covered: false },
    { kw: "landing page design", volume: 2500, kd: 25, intent: "informational", covered: false },
    { kw: "landing page builder", volume: 3200, kd: 40, intent: "commercial", covered: false },
  ];
  const clusters = clusterKeywords(fixture);
  assert.ok(clusters.length >= 2, "splits into at least two clusters");

  const emailCluster = clusters.find((c) =>
    c.keywords.some((row) => row.kw === "email marketing tips")
  );
  assert.ok(emailCluster, "email keywords land in one cluster");
  assert.strictEqual(emailCluster.keywords.length, 3);
  assert.strictEqual(emailCluster.pillarKeyword, "email marketing software");

  const landingCluster = clusters.find((c) =>
    c.keywords.some((row) => row.kw === "landing page design")
  );
  assert.ok(landingCluster, "landing keywords land in one cluster");
  assert.strictEqual(landingCluster.pillarKeyword, "landing page builder");

  console.log("Keywords provider checks passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
