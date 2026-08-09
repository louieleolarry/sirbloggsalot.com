const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const path = require("path");

const root = path.join(__dirname, "..");
const discoveryDir = require("./discovery-dir");
const upstreamOrigin = "https://app.blawgy.com";
const localAssets = {
  "/static/js/main.715d1cb0.js": path.join(discoveryDir, "research", "blawgy", "main.715d1cb0.js"),
  "/static/css/main.371b1f5a.css": path.join(discoveryDir, "research", "blawgy", "main.371b1f5a.css"),
};

function getText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { accept: "*/*" }, timeout: 15000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`${url} returned ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => req.destroy(new Error(`${url} timed out`)));
    req.on("error", reject);
  });
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function main() {
  const index = await getText(`${upstreamOrigin}/`);
  const advertised = [...index.matchAll(/\/(static\/(?:js|css)\/main\.[^"<>]+\.(?:js|css))/g)]
    .map((match) => `/${match[1]}`)
    .sort();

  assert.deepStrictEqual(advertised, Object.keys(localAssets).sort());

  const mismatches = [];
  for (const [assetPath, localPath] of Object.entries(localAssets)) {
    const upstream = await getText(`${upstreamOrigin}${assetPath}`);
    const local = fs.readFileSync(localPath, "utf8");
    if (digest(upstream) !== digest(local)) {
      mismatches.push(assetPath);
    }
  }

  assert.deepStrictEqual(mismatches, []);
  console.log(`Blawgy upstream asset check passed (${advertised.length} assets).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
