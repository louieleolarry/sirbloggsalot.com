const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sourceDir = path.join(root, "research", "blawgy", "app-src");
const compatPath = path.join(root, "lib", "blawgy-compat.js");
const localBundlePath = path.join(root, "static", "js", "main.715d1cb0.local.js");
const localShellPath = path.join(root, "blawgy-app.html");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(entryPath));
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      out.push(entryPath);
    }
  }
  return out;
}

const compat = fs.readFileSync(compatPath, "utf8");
const endpoints = new Map();

for (const file of walk(sourceDir)) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  const patterns = [
    /(?:fetch|axios(?:\.[a-z]+)?|apiClient(?:\.[a-z]+)?)\s*\(\s*([`'"])([^`'"]+)\1/g,
    /(?:\.get|\.post|\.put|\.patch|\.delete)\s*\(\s*([`'"])([^`'"]+)\1/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const endpoint = match[2];
      if (!endpoint.startsWith("/") || endpoint.startsWith("//")) continue;
      if (!endpoints.has(endpoint)) endpoints.set(endpoint, new Set());
      endpoints.get(endpoint).add(rel);
    }
  }
}

const missing = [...endpoints.keys()].filter((endpoint) => {
  const base = endpoint
    .replace(/\$\{[^}]+\}/g, "")
    .replace(/:[A-Za-z0-9_]+/g, "")
    .split("?")[0];
  const prefix = base.split("/").slice(0, 3).join("/");
  return ![endpoint, base, base.replace(/\/+$/, ""), prefix].filter(Boolean).some((candidate) => compat.includes(candidate));
});

assert.deepStrictEqual(missing, [], `Missing Blawgy endpoint compatibility:\n${missing.join("\n")}`);

const localBundle = fs.readFileSync(localBundlePath, "utf8");
assert.ok(localBundle.includes("window.__BLAWGY_API_BASE__||window.location.origin"));
assert.ok(!localBundle.includes('baseURL:"https://app.blawgy.com"'));
assert.ok(localBundle.includes("sirbloggsalot.com"));
assert.ok(localBundle.includes("__blawgyOverrides=e&&e.nativeEvent?null:e"));
assert.ok(localBundle.includes("window.__BLAWGY_LOCAL_USER__"));
assert.ok(localBundle.includes("window.__BLAWGY_LOCAL_SITE__"));
assert.ok(localBundle.includes("window.__BLAWGY_LOCAL_AUTH__"));
assert.ok(!localBundle.includes("https://app.blawgy.com"));

const localShell = fs.readFileSync(localShellPath, "utf8");
assert.ok(localShell.includes("/static/js/main.715d1cb0.local.js"));
assert.ok(localShell.includes("window.__BLAWGY_API_BASE__"));
assert.ok(localShell.includes("/api/auth/session"));
assert.ok(localShell.includes("window.__BLAWGY_LOCAL_BEARER__"));
assert.ok(localShell.includes("window.__BLAWGY_LOCAL_AUTH__"));
assert.ok(localShell.includes('localStorage.removeItem("useMockData")'));
assert.ok(!localShell.includes('localStorage.setItem("useMockData"'));

for (const asset of [
  "static/media/blawgy-logo.8629adf7cf1c32596a3fee67bdcb4741.svg",
  "static/media/stock-sample-image.4696bc76dae75f1059ad.jpg",
  "static/media/ai-sample-image.4970afabcef514a10331.jpeg",
  "static/media/fonnts.com-Articulat_CF_Bold.93a8fd960ebd1f8a34fc.otf",
  "static/media/fonnts.com-Articulat_CF_Light.79754df9f29823981a81.otf",
  "static/media/fonnts.com-Articulat_CF_Medium.de6ce0674a80f2bc2e46.otf",
  "static/media/fonnts.com-Articulat_CF_Normal.6da55ac404b39d275186.otf",
  "static/media/fonnts.com-Articulat_CF_Regular.6d2212da4d006d124c6d.otf",
]) {
  assert.ok(fs.existsSync(path.join(root, asset)), `Missing ${asset}`);
}

console.log(`Blawgy static contract checks passed (${endpoints.size} client endpoints).`);
