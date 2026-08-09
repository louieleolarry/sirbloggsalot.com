"use strict";

const assert = require("assert");

const { createAhrefs } = require("../lib/providers/ahrefs");
const { createKeywords } = require("../lib/providers/keywords");

// (1) Credential gating: no token -> null.
assert.strictEqual(createAhrefs({}), null);
assert.strictEqual(createAhrefs({ NOT_A_TOKEN: "x" }), null);

const provider = createAhrefs({ AHREFS_API_TOKEN: "dummy-token" });
assert.strictEqual(typeof provider, "object");
assert.strictEqual(typeof provider.research, "function");

// (2) research() with an injected transport returning a canned Ahrefs payload.
//     Response shape mirrors GET /v3/keywords-explorer/matching-terms:
//       { keywords: [ { keyword, volume, difficulty, intents } ] }
const cannedKeywords = [
  {
    keyword: "content marketing",
    volume: 5000,
    difficulty: 40,
    intents: { informational: true, commercial: false },
  },
  {
    keyword: "content marketing strategy",
    volume: 3200,
    difficulty: 55,
    intents: { informational: true, commercial: true },
  },
  {
    keyword: "content marketing agency",
    volume: 1800,
    difficulty: 60,
    intents: { transactional: true, commercial: true },
  },
  {
    keyword: "seo audit tool",
    volume: 2400,
    difficulty: 35,
    intents: { commercial: true },
  },
  // Sparse item: every optional field missing -> defensive defaults.
  { keyword: "seo audit checklist" },
];

let capturedUrl = null;
let capturedOpts = null;
const fakeFetch = async (url, opts) => {
  capturedUrl = url;
  capturedOpts = opts;
  return {
    ok: true,
    async json() {
      return { keywords: cannedKeywords };
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

  // Request shape: correct endpoint, GET method, Bearer auth, and query params.
  assert.ok(
    capturedUrl.includes("https://api.ahrefs.com/v3/keywords-explorer/matching-terms"),
    "calls the matching-terms endpoint"
  );
  assert.strictEqual(capturedOpts.method, "GET");
  assert.ok(
    capturedOpts.headers.Authorization === "Bearer dummy-token",
    "sends Authorization: Bearer <token>"
  );
  const parsed = new URL(capturedUrl);
  assert.strictEqual(parsed.searchParams.get("country"), "us");
  assert.strictEqual(parsed.searchParams.get("keywords"), "content marketing,seo audit");
  assert.strictEqual(parsed.searchParams.get("select"), "keyword,volume,difficulty,intents");
  assert.strictEqual(parsed.searchParams.get("limit"), "60");

  // Response shape: same { clusters, meta } contract as the DataForSEO client.
  assert.ok(Array.isArray(out.clusters) && out.clusters.length >= 1, "returns clusters");
  assert.strictEqual(out.meta.provider, "ahrefs");
  assert.strictEqual(out.meta.ahrefsCalls, 1);
  assert.strictEqual(out.meta.market, "United States");
  assert.strictEqual(out.meta.country, "us");
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

  // Clusters carry the mapped volume/kd from the Ahrefs response.
  const allRows = out.clusters.reduce((acc, c) => acc.concat(c.keywords), []);
  const cm = allRows.find((row) => row.kw === "content marketing");
  assert.ok(cm, "mapped a known keyword");
  assert.strictEqual(cm.volume, 5000);
  assert.strictEqual(cm.kd, 40);
  assert.strictEqual(cm.intent, "informational");

  const agency = allRows.find((row) => row.kw === "content marketing agency");
  assert.ok(agency, "mapped the transactional keyword");
  assert.strictEqual(agency.intent, "transactional");

  // Defensive mapping of the sparse item.
  const sparse = allRows.find((row) => row.kw === "seo audit checklist");
  assert.ok(sparse, "mapped the sparse item");
  assert.strictEqual(sparse.volume, 0);
  assert.strictEqual(sparse.kd, 0);
  assert.strictEqual(sparse.intent, "informational");

  // (3) research() throws on a non-ok response, with status in the message.
  const errFetch = async () => ({
    ok: false,
    status: 401,
    async text() {
      return "invalid token";
    },
  });
  await assert.rejects(
    () => provider.research({ seedTerms: ["x"] }, { fetchImpl: errFetch }),
    /Ahrefs request failed \(401\)/,
    "surfaces a non-ok Ahrefs response"
  );

  // (4) No seeds -> no network call, empty clusters, provider still labelled.
  let called = false;
  const spyFetch = async () => {
    called = true;
    return { ok: true, async json() { return { keywords: [] }; } };
  };
  const empty = await provider.research({ seedTerms: [] }, { fetchImpl: spyFetch });
  assert.strictEqual(called, false, "no seeds means no request");
  assert.deepStrictEqual(empty.clusters, []);
  assert.strictEqual(empty.meta.ahrefsCalls, 0);

  // (5) Selection wiring: createKeywords prefers Ahrefs when the token is set,
  //     else DataForSEO. Distinguish by meta.provider without any network.
  const throwFetch = async () => { throw new Error("no network expected"); };

  const ahrefsSelected = createKeywords({ AHREFS_API_TOKEN: "x" });
  assert.strictEqual(typeof ahrefsSelected, "object");
  const aMeta = (await ahrefsSelected.research({}, { fetchImpl: throwFetch })).meta;
  assert.strictEqual(aMeta.provider, "ahrefs", "AHREFS_API_TOKEN selects the Ahrefs client");

  const dfsSelected = createKeywords({ DATAFORSEO_LOGIN: "a", DATAFORSEO_PASSWORD: "b" });
  assert.strictEqual(typeof dfsSelected, "object");
  const dMeta = (await dfsSelected.research({}, { fetchImpl: throwFetch })).meta;
  assert.strictEqual(dMeta.provider, "dataforseo", "DataForSEO creds select the DataForSEO client");

  // Ahrefs wins when both are present.
  const both = createKeywords({ AHREFS_API_TOKEN: "x", DATAFORSEO_LOGIN: "a", DATAFORSEO_PASSWORD: "b" });
  const bMeta = (await both.research({}, { fetchImpl: throwFetch })).meta;
  assert.strictEqual(bMeta.provider, "ahrefs", "Ahrefs takes precedence over DataForSEO");

  // No creds at all -> null.
  assert.strictEqual(createKeywords({}), null);

  console.log("Ahrefs provider checks passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
