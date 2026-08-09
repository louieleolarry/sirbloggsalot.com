"use strict";

// Ahrefs keyword-data provider (API v3, Keywords Explorer).
// Mirrors the DataForSEO client in ./keywords: createAhrefs(env) returns null
// unless AHREFS_API_TOKEN is set; otherwise an object whose research() takes an
// injected { fetchImpl } (so tests run with zero real network), throws on
// response.ok === false (status + short body slice), maps the response into the
// same `rows = [{ kw, volume, kd, intent, covered }]` shape, and reuses the
// deterministic clusterKeywords() grouping. No npm deps (built-in fetch only).
//
// Docs (verified 2026-08):
//   https://docs.ahrefs.com/en/api/reference/keywords-explorer/get-matching-terms
//   https://docs.ahrefs.com/en/api/reference/keywords-explorer/get-overview
//   https://docs.ahrefs.com/en/api/docs/free-test-queries
// Endpoint used: GET https://api.ahrefs.com/v3/keywords-explorer/matching-terms
//   Auth:   Authorization: Bearer <AHREFS_API_TOKEN>
//   Query:  keywords (comma-separated seeds), country (2-letter ISO), select
//           (comma-separated columns), limit
//   Response: { "keywords": [ { keyword, volume, difficulty, intents, ... } ] }
//   Field names used below:
//     keyword    -> row.kw     (the keyword string)
//     volume     -> row.volume (monthly search volume, integer)
//     difficulty -> row.kd     (keyword difficulty, 0-100)
//     intents    -> row.intent (object of booleans; reduced to one label)

const { clusterKeywords } = require("./keywords");

const BASE_URL = "https://api.ahrefs.com/v3";
const MATCHING_TERMS_PATH = "/keywords-explorer/matching-terms";
// Columns requested from Ahrefs. `intents` returns the intent object; if a real
// call rejects `intents` as an unknown column, drop it here (see notes below).
const SELECT_FIELDS = "keyword,volume,difficulty,intents";
// Ahrefs bills per row of keyword data returned; the exact price varies by plan
// and cannot be known from the response. Use a nominal per-call estimate for
// parity with the DataForSEO provider's estimatedCost.
const AHREFS_CALL_COST = 0.05;

// Map the human-readable `market` used across the app to Ahrefs' 2-letter ISO
// country code. Defaults to "us"; already-2-letter inputs pass through.
const MARKET_TO_COUNTRY = {
  "united states": "us",
  "united states of america": "us",
  usa: "us",
  "united kingdom": "gb",
  "great britain": "gb",
  uk: "gb",
  canada: "ca",
  australia: "au",
  germany: "de",
  france: "fr",
  spain: "es",
  italy: "it",
  netherlands: "nl",
  india: "in",
  ireland: "ie",
  "new zealand": "nz",
};

function countryCode(market) {
  const key = String(market || "").trim().toLowerCase();
  if (!key) return "us";
  if (MARKET_TO_COUNTRY[key]) return MARKET_TO_COUNTRY[key];
  if (/^[a-z]{2}$/.test(key)) return key; // already an ISO code
  return "us";
}

// Ahrefs returns `intents` as an object of booleans:
//   { informational, navigational, commercial, transactional, branded, local }
// The row shape carries a single intent label, so reduce by priority. Defends
// against the field being absent or (in older/edge responses) an array of
// strings. Defaults to "informational" like the DataForSEO mapper.
function mainIntent(intents) {
  if (intents && typeof intents === "object" && !Array.isArray(intents)) {
    const priority = ["transactional", "commercial", "navigational", "informational"];
    for (const key of priority) {
      if (intents[key]) return key;
    }
    return "informational";
  }
  if (Array.isArray(intents)) {
    const first = intents.find((value) => typeof value === "string" && value);
    if (first) return first;
  }
  if (typeof intents === "string" && intents) return intents;
  return "informational";
}

function extractKeywords(data) {
  if (data && Array.isArray(data.keywords)) return data.keywords;
  return [];
}

function mapKeyword(item) {
  const it = item || {};
  const volume = Number(it.volume);
  const kd = Number(it.difficulty);
  return {
    kw: typeof it.keyword === "string" ? it.keyword : "",
    volume: Number.isFinite(volume) ? volume : 0,
    kd: Number.isFinite(kd) ? kd : 0,
    intent: mainIntent(it.intents),
    covered: false,
  };
}

function createAhrefs(env = process.env) {
  const source = env || {};
  const token = source.AHREFS_API_TOKEN;
  if (!token) return null;

  return {
    async research(
      { site, seedTerms = [], market = "United States", limit = 60 } = {},
      { fetchImpl = fetch } = {}
    ) {
      const seeds = Array.isArray(seedTerms)
        ? seedTerms.map((term) => String(term).trim()).filter(Boolean)
        : [];

      const country = countryCode(market);
      let ahrefsCalls = 0;
      let items = [];

      if (seeds.length) {
        const params = new URLSearchParams({
          keywords: seeds.join(","),
          country,
          select: SELECT_FIELDS,
          limit: String(limit),
        });
        const url = `${BASE_URL}${MATCHING_TERMS_PATH}?${params.toString()}`;
        const response = await fetchImpl(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal:
            typeof AbortSignal !== "undefined" && AbortSignal.timeout
              ? AbortSignal.timeout(15000)
              : undefined,
        });
        ahrefsCalls += 1;
        if (response.ok === false) {
          const detail =
            typeof response.text === "function"
              ? await response.text().catch(() => "")
              : "";
          throw new Error(
            `Ahrefs request failed (${response.status}). ${String(detail).slice(0, 200)}`.trim()
          );
        }
        const data = await response.json();
        items = extractKeywords(data);
      }

      const rows = items.map(mapKeyword);
      const clusters = clusterKeywords(rows);

      return {
        clusters,
        meta: {
          provider: "ahrefs",
          ahrefsCalls,
          estimatedCost: Number((ahrefsCalls * AHREFS_CALL_COST).toFixed(4)),
          market,
          country,
        },
      };
    },
  };
}

module.exports = { createAhrefs };
