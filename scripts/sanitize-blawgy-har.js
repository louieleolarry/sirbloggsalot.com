const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const discoveryDir = require("./discovery-dir");
const fixtureDir = path.join(discoveryDir, "research", "blawgy", "live-fixtures");

function usage() {
  console.error("Usage: node scripts/sanitize-blawgy-har.js /path/to/blawgy.har [output.json] [--include-writes]");
  process.exitCode = 1;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

function decodeHarText(content) {
  if (!content || typeof content.text !== "string") return "";
  if (content.encoding === "base64") return Buffer.from(content.text, "base64").toString("utf8");
  return content.text;
}

function parseMaybeJson(text) {
  if (!text || !String(text).trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function cleanValue(value, key = "") {
  const lower = String(key).toLowerCase();
  if (/(token|secret|password|passcode|private|apikey|api_key|auth|email|phone|address|stripe|payment|userid|user_id|uid)/.test(lower)) {
    return "[redacted]";
  }

  if (Array.isArray(value)) return value.map((item) => cleanValue(item, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, cleanValue(childValue, childKey)])
    );
  }
  if (typeof value === "string" && /@|sk_|pk_|AIza|ya29\.|Bearer\s+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{24}\b/i.test(value)) return "[redacted]";
  return value;
}

function fixturePathFromUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.hostname !== "app.blawgy.com") return null;
  if (url.pathname.startsWith("/static/")) return null;
  if (url.pathname === "/" || url.pathname === "/login" || url.pathname === "/manifest.json") return null;
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    const value = url.searchParams.get(key) || "";
    if (/(token|secret|password|passcode|private|apikey|api_key|auth|email|phone|address|stripe|payment|userid|user_id|uid)/.test(lower)) {
      url.searchParams.set(key, lower.includes("email") ? "fixture@example.com" : "redacted");
    } else if (/@|sk_|pk_|AIza|ya29\.|Bearer\s+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{24}\b/i.test(value)) {
      url.searchParams.set(key, "redacted");
    }
  }
  return `${url.pathname}${url.search}`;
}

function responseJson(entry) {
  return parseMaybeJson(decodeHarText(entry.response?.content));
}

function requestJson(entry) {
  const postData = entry.request?.postData;
  if (!postData) return undefined;
  if (postData.text) return parseMaybeJson(postData.text);
  if (Array.isArray(postData.params)) {
    return Object.fromEntries(postData.params.map((param) => [param.name, param.value]));
  }
  return undefined;
}

function extractFixtures(har, includeWrites) {
  const entries = har?.log?.entries;
  if (!Array.isArray(entries)) throw new Error("Input is not a HAR file with log.entries.");

  const fixtures = [];
  const seen = new Set();

  for (const entry of entries) {
    const method = String(entry.request?.method || "GET").toUpperCase();
    if (!includeWrites && method !== "GET") continue;

    const route = fixturePathFromUrl(entry.request?.url || "");
    if (!route) continue;

    const parsedResponse = responseJson(entry);
    if (parsedResponse === undefined) continue;

    const key = `${method} ${route}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const fixture = {
      method,
      path: route,
      status: Number(entry.response?.status || 200),
      response: cleanValue(parsedResponse),
      note: "sanitized production capture",
    };

    if (includeWrites && !["GET", "DELETE"].includes(method)) {
      const parsedRequest = requestJson(entry);
      if (parsedRequest !== undefined) fixture.requestBody = cleanValue(parsedRequest);
    }

    fixtures.push(fixture);
  }

  fixtures.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
  return fixtures;
}

function main() {
  const args = process.argv.slice(2);
  const includeWrites = args.includes("--include-writes");
  const positional = args.filter((arg) => arg !== "--include-writes");
  const inputPath = positional[0];
  const outputPath = positional[1] || path.join(fixtureDir, `capture-${timestamp()}.json`);

  if (!inputPath) return usage();

  const har = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const fixtures = extractFixtures(har, includeWrites);
  if (!fixtures.length) throw new Error("No app.blawgy.com JSON API fixtures found in HAR.");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(fixtures, null, 2)}\n`);
  console.log(`Wrote ${fixtures.length} sanitized Blawgy fixtures to ${outputPath}`);
}

main();
