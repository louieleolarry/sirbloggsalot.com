"use strict";

const BASE_URL = "https://api.dataforseo.com";
const KEYWORD_IDEAS_PATH = "/v3/dataforseo_labs/google/keyword_ideas/live";
// Rough per-request price estimate (USD) for a DataForSEO Labs live call.
const DFS_CALL_COST = 0.05;

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "by",
  "with", "from", "is", "are", "be", "how", "what", "why", "when", "where",
  "which", "who", "your", "you", "my", "our", "me", "best", "top", "vs",
  "near", "free", "new", "guide", "this", "that", "these", "those", "it",
  "as", "do", "does",
]);

function stem(word) {
  const w = String(word).toLowerCase();
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function significantStems(keyword) {
  const raw = String(keyword).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const stems = raw.map(stem);
  const significant = stems.filter((s) => s.length > 1 && !STOPWORDS.has(s));
  return significant.length ? significant : stems;
}

function titleCase(value) {
  return String(value)
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function compareRows(a, b) {
  const volA = a.volume || 0;
  const volB = b.volume || 0;
  if (volB !== volA) return volB - volA;
  const kdA = a.kd || 0;
  const kdB = b.kd || 0;
  if (kdA !== kdB) return kdA - kdB;
  return a.kw < b.kw ? -1 : a.kw > b.kw ? 1 : 0;
}

function pickKey(stems, freq) {
  const candidates = stems.slice().sort((a, b) => {
    const freqA = freq.get(a) || 0;
    const freqB = freq.get(b) || 0;
    if (freqB !== freqA) return freqB - freqA;
    if (b.length !== a.length) return b.length - a.length;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return candidates[0] || "misc";
}

// Pure, deterministic grouping of mapped keyword rows into topical clusters.
function clusterKeywords(rows) {
  const list = Array.isArray(rows)
    ? rows.filter((row) => row && typeof row.kw === "string" && row.kw.trim())
    : [];
  if (!list.length) return [];

  const stemsByRow = list.map((row) => significantStems(row.kw));

  const freq = new Map();
  for (const stems of stemsByRow) {
    for (const token of new Set(stems)) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }

  const groups = new Map();
  list.forEach((row, index) => {
    const key = pickKey(stemsByRow[index], freq);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const clusters = [];
  for (const [key, groupRows] of groups) {
    const sorted = groupRows.slice().sort(compareRows);
    clusters.push({
      label: titleCase(key),
      pillarKeyword: sorted[0].kw,
      keywords: sorted,
    });
  }

  clusters.sort((a, b) => {
    const volA = a.keywords.reduce((sum, row) => sum + (row.volume || 0), 0);
    const volB = b.keywords.reduce((sum, row) => sum + (row.volume || 0), 0);
    if (volB !== volA) return volB - volA;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });

  return clusters;
}

function extractItems(data) {
  const tasks = data && Array.isArray(data.tasks) ? data.tasks : [];
  const task = tasks[0] || {};
  const result = Array.isArray(task.result) ? task.result : [];
  const first = result[0] || {};
  return Array.isArray(first.items) ? first.items : [];
}

function mapItem(item) {
  const it = item || {};
  const info = it.keyword_info || {};
  const props = it.keyword_properties || {};
  const intentInfo = it.search_intent_info || {};
  const volume = Number(info.search_volume);
  const kd = Number(props.keyword_difficulty);
  const intent = intentInfo.main_intent;
  return {
    kw: typeof it.keyword === "string" ? it.keyword : "",
    volume: Number.isFinite(volume) ? volume : 0,
    kd: Number.isFinite(kd) ? kd : 0,
    intent: typeof intent === "string" && intent ? intent : "informational",
    covered: false,
  };
}

function createKeywords(env = process.env) {
  const source = env || {};
  const login = source.DATAFORSEO_LOGIN;
  const password = source.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;

  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  return {
    async research(
      { site, seedTerms = [], market = "United States", limit = 60 } = {},
      { fetchImpl = fetch } = {}
    ) {
      const seeds = Array.isArray(seedTerms)
        ? seedTerms.map((term) => String(term).trim()).filter(Boolean)
        : [];

      let dfsCalls = 0;
      let items = [];

      if (seeds.length) {
        const body = [{
          keywords: seeds,
          location_name: market,
          language_name: "English",
          limit,
        }];
        const response = await fetchImpl(`${BASE_URL}${KEYWORD_IDEAS_PATH}`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        dfsCalls += 1;
        const data = await response.json();
        items = extractItems(data);
      }

      const rows = items.map(mapItem);
      const clusters = clusterKeywords(rows);

      return {
        clusters,
        meta: {
          provider: "dataforseo",
          dfsCalls,
          estimatedCost: Number((dfsCalls * DFS_CALL_COST).toFixed(4)),
          market,
        },
      };
    },
  };
}

module.exports = { createKeywords, clusterKeywords };
