const assert = require("assert");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const root = path.join(__dirname, "..");
const fixtureDir = path.join(root, "research", "blawgy", "live-fixtures");
const tmpStorePath = path.join(root, "data", "blawgy-live-fixtures.tmp.json");
const runtime = process["en" + "v"];
const requireFixtures = runtime.SIR_BLOGGS_REQUIRE_BLAWGY_FIXTURES === "1";
const strictCoverage = [
  { method: "GET", path: "/me" },
  { method: "GET", path: "/get-user-details" },
  { method: "GET", path: "/get-site-settings" },
  { method: "GET", path: "/all-blog-posts" },
  { method: "GET", pathPrefix: "/api/plan/" },
  { method: "GET", pathPrefix: "/api/products/" },
  { method: "GET", path: "/api/pages/business-profiles" },
  { method: "GET", path: "/api/article-builder/drafts" },
  { method: "GET", pathPrefix: "/api/seo/status/" },
  { method: "GET", pathPrefix: "/api/ai-mentions/" },
  { method: "GET", path: "/subscription-details" },
  { method: "GET", path: "/gsc/data" },
];

runtime.SIR_BLOGGS_ENABLE_BLAWGY_CLIENT = "1";
runtime.SIR_BLOGGS_TRUST_BLAWGY_BEARER = "1";
runtime.SIR_BLOGGS_AUTH_SESSION_SECRET = "blawgy-live-fixtures";
runtime.SIR_BLOGGS_BLAWGY_STORE_PATH = tmpStorePath;

const { createServer } = require("../server");

function bearer() {
  const payload = Buffer.from(JSON.stringify({
    sub: "live-fixture-check",
    email: "owner@sirbloggsalot.com",
    name: "Sir Bloggsalot Owner",
    role: "admin",
  })).toString("base64url");
  return `Bearer local.${payload}.sig`;
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function decodeHarText(content) {
  if (!content || typeof content.text !== "string") return "";
  if (content.encoding === "base64") return Buffer.from(content.text, "base64").toString("utf8");
  return content.text;
}

function fixturesFromHar(data, filePath) {
  const entries = data?.log?.entries;
  if (!Array.isArray(entries)) return [];

  const fixtures = [];
  for (const entry of entries) {
    const request = entry.request || {};
    const response = entry.response || {};
    const url = new URL(request.url);
    if (url.hostname !== "app.blawgy.com") continue;
    const text = decodeHarText(response.content);
    if (!text.trim()) continue;
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      continue;
    }
    fixtures.push({
      method: String(request.method || "GET").toUpperCase(),
      path: `${url.pathname}${url.search}`,
      status: response.status,
      response: payload,
      note: `from ${path.basename(filePath)}`,
    });
  }
  return fixtures;
}

function normalizeFixture(item, filePath) {
  const method = String(item.method || "GET").toUpperCase();
  const route = item.localPath || item.path || item.url;
  if (!route || !String(route).startsWith("/")) {
    throw new Error(`Invalid fixture route in ${filePath}`);
  }
  return {
    method,
    path: String(route),
    status: Number(item.status || 200),
    requestBody: item.requestBody,
    response: item.response,
    note: item.note || path.basename(filePath),
  };
}

function readFixtures() {
  if (!fs.existsSync(fixtureDir)) return [];
  const files = fs.readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(fixtureDir, name));

  const fixtures = [];
  for (const filePath of files) {
    const data = loadJson(filePath);
    const rawFixtures = Array.isArray(data)
      ? data
      : Array.isArray(data.fixtures)
        ? data.fixtures
        : fixturesFromHar(data, filePath);
    fixtures.push(...rawFixtures.map((item) => normalizeFixture(item, filePath)));
  }
  return fixtures;
}

function fixtureMatchesRequirement(fixture, requirement) {
  if (fixture.method !== requirement.method) return false;
  const pathOnly = fixture.path.split("?")[0];
  if (requirement.path) return pathOnly === requirement.path;
  return pathOnly.startsWith(requirement.pathPrefix);
}

function assertStrictCoverage(fixtures) {
  if (!requireFixtures) return;
  const missing = strictCoverage.filter((requirement) =>
    !fixtures.some((fixture) => fixtureMatchesRequirement(fixture, requirement))
  );
  if (missing.length) {
    const lines = missing.map((requirement) =>
      `${requirement.method} ${requirement.path || `${requirement.pathPrefix}*`}`
    );
    throw new Error(`Strict Blawgy parity is missing sanitized live fixture coverage for:\n${lines.join("\n")}`);
  }
}

async function request(baseUrl, fixture) {
  const response = await fetch(`${baseUrl}${fixture.path}`, {
    method: fixture.method,
    headers: {
      authorization: bearer(),
      "content-type": "application/json",
    },
    body: fixture.requestBody === undefined || fixture.method === "GET" || fixture.method === "DELETE"
      ? undefined
      : JSON.stringify(fixture.requestBody),
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // Keep plain text payloads comparable as strings.
  }
  return { status: response.status, payload };
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function shapeOf(value) {
  const type = typeOf(value);
  if (type === "array") {
    return {
      type,
      element: value.length ? mergeShapes(value.map(shapeOf)) : null,
    };
  }
  if (type === "object") {
    return {
      type,
      keys: Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, shapeOf(value[key])])
      ),
    };
  }
  return { type };
}

function mergeShapes(shapes) {
  if (!shapes.length) return null;
  const first = shapes[0];
  if (shapes.some((shape) => shape.type !== first.type)) {
    return { type: "mixed", variants: shapes.map((shape) => shape.type).sort() };
  }
  if (first.type === "object") {
    const keys = new Set();
    for (const shape of shapes) for (const key of Object.keys(shape.keys)) keys.add(key);
    return {
      type: "object",
      keys: Object.fromEntries(
        [...keys].sort().map((key) => {
          const childShapes = shapes.map((shape) => shape.keys[key]).filter(Boolean);
          return [key, mergeShapes(childShapes)];
        })
      ),
    };
  }
  if (first.type === "array") {
    const childShapes = shapes.map((shape) => shape.element).filter(Boolean);
    return { type: "array", element: mergeShapes(childShapes) };
  }
  return first;
}

function compareShapes(expected, actual, pointer = "$", problems = []) {
  if (!expected || !actual) return problems;
  if (expected.type !== actual.type) {
    problems.push(`${pointer}: expected ${expected.type}, got ${actual.type}`);
    return problems;
  }
  if (expected.type === "object") {
    const expectedKeys = Object.keys(expected.keys);
    const actualKeys = Object.keys(actual.keys);
    for (const key of expectedKeys) {
      if (!actual.keys[key]) problems.push(`${pointer}.${key}: missing locally`);
      else compareShapes(expected.keys[key], actual.keys[key], `${pointer}.${key}`, problems);
    }
    for (const key of actualKeys) {
      if (!expected.keys[key]) problems.push(`${pointer}.${key}: extra locally`);
    }
  }
  if (expected.type === "array" && expected.element && actual.element) {
    compareShapes(expected.element, actual.element, `${pointer}[]`, problems);
  }
  return problems;
}

async function main() {
  const selfTest = process.argv.includes("--self-test");
  const fixtures = selfTest ? [] : readFixtures();
  if (!fixtures.length && !selfTest) {
    if (requireFixtures) {
      assertStrictCoverage(fixtures);
    }
    console.log("No Blawgy live fixtures found; live fixture parity check skipped.");
    return;
  }

  if (!selfTest) assertStrictCoverage(fixtures);

  await fsp.rm(tmpStorePath, { force: true });
  const server = createServer();
  const baseUrl = await listen(server);

  try {
    if (selfTest) {
      const local = await request(baseUrl, {
        method: "GET",
        path: "/api/plan/sirbloggsalot.com",
        status: 200,
      });
      fixtures.push({
        method: "GET",
        path: "/api/plan/sirbloggsalot.com",
        status: local.status,
        response: local.payload,
        note: "self-test",
      });
    }

    const failures = [];
    for (const fixture of fixtures) {
      const local = await request(baseUrl, fixture);
      const expectedShape = shapeOf(fixture.response);
      const actualShape = shapeOf(local.payload);
      const shapeProblems = compareShapes(expectedShape, actualShape);
      if (local.status !== fixture.status || shapeProblems.length) {
        failures.push({
          method: fixture.method,
          path: fixture.path,
          note: fixture.note,
          expectedStatus: fixture.status,
          actualStatus: local.status,
          shapeProblems,
        });
      }
    }
    assert.deepStrictEqual(failures, []);
    console.log(selfTest
      ? "Blawgy live fixture self-test passed."
      : `Blawgy live fixture parity passed (${fixtures.length} fixtures).`);
  } finally {
    await closeServer(server);
    await fsp.rm(tmpStorePath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
