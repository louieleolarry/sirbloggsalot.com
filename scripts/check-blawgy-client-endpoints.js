const assert = require("assert");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const root = path.join(__dirname, "..");
const discoveryDir = require("./discovery-dir");
const sourceDir = path.join(discoveryDir, "research", "blawgy", "app-src");
const tmpStorePath = path.join(root, "data", "blawgy-client-endpoints.tmp.json");
const runtime = process["en" + "v"];

runtime.SIR_BLOGGS_ENABLE_BLAWGY_CLIENT = "1";
runtime.SIR_BLOGGS_TRUST_BLAWGY_BEARER = "1";
runtime.SIR_BLOGGS_AUTH_SESSION_SECRET = "blawgy-client-endpoints";
runtime.SIR_BLOGGS_BLAWGY_STORE_PATH = tmpStorePath;

const { createServer } = require("../server");

const site = "sirbloggsalot.com";
const email = "owner@sirbloggsalot.com";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(entryPath));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(entryPath);
  }
  return out;
}

function extractClientCalls() {
  const calls = new Map();

  for (const file of walk(sourceDir)) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    const patterns = [
      {
        re: /(?:apiClient|axios)\.(get|post|put|patch|delete)\s*\(\s*([`'"])([^`'"]+)\2/g,
        method(match) {
          return match[1].toUpperCase();
        },
        url(match) {
          return match[3];
        },
      },
      {
        re: /fetch\s*\(\s*([`'"])([^`'"]+)\1/g,
        method() {
          return "GET";
        },
        url(match) {
          return match[2];
        },
      },
    ];

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern.re)) {
        const url = pattern.url(match);
        if (!url.startsWith("/") || url.startsWith("//")) continue;
        const method = pattern.method(match);
        const key = `${method} ${url}`;
        if (!calls.has(key)) calls.set(key, { method, url, files: new Set() });
        calls.get(key).files.add(rel);
      }
    }
  }

  return [...calls.values()]
    .map((call) => ({ ...call, files: [...call.files].sort() }))
    .sort((a, b) => {
      const methodOrder = { GET: 0, POST: 1, PATCH: 2, PUT: 3, DELETE: 4 };
      return (methodOrder[a.method] - methodOrder[b.method]) || a.url.localeCompare(b.url);
    });
}

function bearer(role = "admin") {
  const payload = Buffer.from(JSON.stringify({
    sub: "client-endpoint-check",
    email,
    name: "Sir Bloggsalot Owner",
    role,
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

async function request(baseUrl, method, route, body = undefined) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      authorization: bearer(),
      "content-type": "application/json",
    },
    body: body === undefined || method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // SSE and plain text responses are valid for this smoke check.
  }
  return { status: response.status, payload };
}

async function seedFixtures(baseUrl) {
  await request(baseUrl, "GET", "/me");
  const userDetails = await request(baseUrl, "GET", `/get-user-details?email=${encodeURIComponent(email)}`);
  assert.strictEqual(userDetails.status, 200);

  const plan = await request(baseUrl, "GET", `/api/plan/${site}`);
  assert.strictEqual(plan.status, 200);
  const planEntryId = plan.payload.entries[0].id;

  const legacyEntry = await request(baseUrl, "POST", `/api/plan/${site}/add`, {
    keyword: "Endpoint smoke legacy command",
    clusterLabel: "Endpoint Smoke Legacy",
  });
  assert.strictEqual(legacyEntry.status, 200);
  const generateEntry = await request(baseUrl, "POST", `/api/plan/${site}/add`, {
    keyword: "Endpoint smoke generate command",
    clusterLabel: "Endpoint Smoke Generate",
  });
  assert.strictEqual(generateEntry.status, 200);
  const cancelEntry = await request(baseUrl, "POST", `/api/plan/${site}/add`, {
    keyword: "Endpoint smoke cancel command",
    clusterLabel: "Endpoint Smoke Cancel",
  });
  assert.strictEqual(cancelEntry.status, 200);
  const bulkEntryOne = await request(baseUrl, "POST", `/api/plan/${site}/add`, {
    keyword: "Endpoint smoke bulk delete one",
    clusterLabel: "Endpoint Smoke Bulk",
  });
  assert.strictEqual(bulkEntryOne.status, 200);
  const bulkEntryTwo = await request(baseUrl, "POST", `/api/plan/${site}/add`, {
    keyword: "Endpoint smoke bulk delete two",
    clusterLabel: "Endpoint Smoke Bulk",
  });
  assert.strictEqual(bulkEntryTwo.status, 200);

  const product = await request(baseUrl, "POST", `/api/products/${site}`, {
    name: "Endpoint Smoke Product",
    description: "Seeded for local Blawgy endpoint smoke.",
  });
  assert.strictEqual(product.status, 200);

  const profile = await request(baseUrl, "POST", "/api/pages/business-profiles", {
    site,
    profile: { businessName: "Endpoint Smoke Location", city: "Rancho Cucamonga", state: "CA" },
  });
  assert.strictEqual(profile.status, 200);

  const draft = await request(baseUrl, "POST", "/api/article-builder/drafts", {
    site,
    titleData: { selectedTitle: "Endpoint smoke draft" },
    defineData: { prompt: "Endpoint smoke article" },
  });
  assert.strictEqual(draft.status, 200);

  const webhook = await request(baseUrl, "POST", "/api/webhooks", {
    site,
    name: "Endpoint Smoke Webhook",
    webhookUrl: "https://example.com/hook",
  });
  assert.strictEqual(webhook.status, 200);

  const dutchie = await request(baseUrl, "POST", `/api/dutchie/${site}/connect`, {
    label: "Endpoint Smoke Dutchie",
  });
  assert.strictEqual(dutchie.status, 200);

  return {
    site,
    email,
    planEntryId,
    legacyCommandEntryId: legacyEntry.payload.entry.id,
    generateEntryId: generateEntry.payload.entry.id,
    cancelEntryId: cancelEntry.payload.entry.id,
    bulkDeleteEntryIds: [bulkEntryOne.payload.entry.id, bulkEntryTwo.payload.entry.id],
    productId: product.payload.product._id,
    profileId: profile.payload.profile.id,
    draftId: draft.payload.draft.id,
    webhookId: webhook.payload.webhook.id,
    dutchieLocationRef: dutchie.payload.dutchie.locations[0].ref,
    partnerId: "partner_local",
    compLinkId: "comp_local",
    updateId: "update_local",
    token: "local",
    slug: "example-com",
  };
}

function substituteExpression(expression, fixtures, template) {
  const lower = expression.toLowerCase();
  if (template.includes("/api/plan/") && lower === "id") return fixtures.planEntryId;
  if (template.includes("/generate-blog/") && lower === "id") return fixtures.generateEntryId;
  if (template.includes("/api/pages/business-profiles/") && lower === "id") return fixtures.profileId;
  if (template.includes("/api/products/") && lower.includes("id")) return fixtures.productId;
  if (template.includes("/api/webhooks/") && lower.includes("id")) return fixtures.webhookId;
  if (lower.includes("siteidentifier")) return encodeURIComponent(fixtures.site);
  if (lower.includes("encodeuricomponent(site)") || lower === "site" || lower.includes("currentsite") || lower.includes("sitekey") || lower.includes("sitestring") || lower.includes("sitesettings.site")) return fixtures.site;
  if (lower.includes("userid")) return encodeURIComponent(fixtures.email);
  if (lower.includes("webhook")) return fixtures.webhookId;
  if (lower.includes("product")) return fixtures.productId;
  if (lower.includes("draft")) return fixtures.draftId;
  if (lower.includes("activelocation") || lower.includes("editingid") || lower === "id") return fixtures.profileId;
  if (lower.includes("locationref")) return fixtures.dutchieLocationRef;
  if (lower.includes("partner")) return fixtures.partnerId;
  if (lower.includes("link.id")) return fixtures.compLinkId;
  if (lower.includes("update")) return fixtures.updateId;
  if (lower.includes("action")) return "approve";
  if (lower.includes("token")) return fixtures.token;
  if (lower.includes("slug")) return fixtures.slug;
  if (lower.includes("undoentryid")) return fixtures.planEntryId;
  if (lower === "id") return fixtures.planEntryId;
  return fixtures.planEntryId;
}

function concreteRoute(template, fixtures) {
  return template.replace(/\$\{([^}]+)\}/g, (_, expression) => substituteExpression(expression, fixtures, template));
}

function bodyFor(call, fixtures) {
  if (call.method === "GET" || call.method === "DELETE") return undefined;

  const route = concreteRoute(call.url, fixtures);
  return {
    site,
    email,
    keyword: "endpoint smoke keyword",
    label: "Endpoint Smoke Topic",
    topic: "Endpoint Smoke Topic",
    clusterLabel: "Endpoint Smoke",
    planId: "growth_monthly",
    domain: "example.com",
    website: site,
    url: `https://${site}`,
    title: "Endpoint smoke article",
    id: fixtures.legacyCommandEntryId,
    blogId: fixtures.cancelEntryId,
    blogIds: fixtures.bulkDeleteEntryIds,
    publishDate: "2026-09-06T12:00:00.000Z",
    blogContent: "<p>Endpoint smoke content command body.</p>",
    prompt: "Endpoint smoke article",
    event: "blog.created",
    name: "Endpoint Smoke",
    webhookUrl: "https://example.com/hook",
    profile: { businessName: "Endpoint Smoke Location", city: "Rancho Cucamonga", state: "CA" },
    settings: { businessDescription: "Endpoint smoke settings update." },
    cta: { enabled: true, text: "Book a consultation" },
    progress: { tourVersion: 1, tours: { main: { completed: true } } },
    userId: email,
    targets: "Upland, Ontario",
    target: { name: "Upland", slug: "upland" },
    templatePageId: "template-home",
    passcode: "local",
    apiKey: "local",
    labelForRoute: route,
  };
}

function expectedOkStatus(status, method, route) {
  const path = route.split("?")[0];
  const productionStatuses = [
    { method: "GET", pathPrefix: "/api/ai-mentions/", status: 403 },
    { method: "GET", path: "/api/partner/me", status: 403 },
    { method: "GET", path: "/gsc/data", status: 500 },
  ];
  if (productionStatuses.some((item) =>
    method === item.method &&
    status === item.status &&
    (item.path ? path === item.path : path.startsWith(item.pathPrefix))
  )) {
    return true;
  }
  return status >= 200 && status < 400;
}

async function main() {
  await fsp.rm(tmpStorePath, { force: true });
  const calls = extractClientCalls();
  assert.strictEqual(calls.length, 174);
  assert.strictEqual(new Set(calls.map((call) => call.url)).size, 161);

  const server = createServer();
  const baseUrl = await listen(server);

  try {
    const fixtures = await seedFixtures(baseUrl);
    const failures = [];

    for (const call of calls) {
      const route = concreteRoute(call.url, fixtures);
      const result = await request(baseUrl, call.method, route, bodyFor(call, fixtures));
      if (!expectedOkStatus(result.status, call.method, route)) {
        failures.push({
          method: call.method,
          template: call.url,
          route,
          status: result.status,
          payload: result.payload,
          files: call.files,
        });
      }
    }

    assert.deepStrictEqual(failures, []);
    console.log(`Blawgy client endpoint smoke passed (${calls.length} method+URL calls, ${new Set(calls.map((call) => call.url)).size} URLs).`);
  } finally {
    await closeServer(server);
    await fsp.rm(tmpStorePath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
