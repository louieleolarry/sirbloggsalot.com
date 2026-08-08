"use strict";

// Phase 1 (1b) account-store hardening smoke test.
//
// Verifies the historical flaky-login/EACCES fix:
//   * SIR_BLOGGS_ACCOUNT_STORE_PATH is honored (account store is relocatable to a
//     writable StateDirectory)
//   * GET /api/account/summary is READ-ONLY — it does not create/write the store
//   * the store is written lazily on the first real mutation (PUT settings)
//   * writes are atomic (tmp file is renamed into place, no .tmp left behind)
//
// Run: node scripts/check-account-store.js  (added to `npm run check`).

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const runtime = process.env;
const SECRET = "account-store-smoke-secret";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sba-account-store-"));
const authStorePath = path.join(tmpDir, "auth-store.json");
const blawgyStorePath = path.join(tmpDir, "blawgy-store.json");
// Point the account store at a NON-default, nested path to prove the env override
// and lazy directory creation.
const accountStorePath = path.join(tmpDir, "state", "account-store.json");

runtime.SIR_BLOGGS_AUTH_SESSION_SECRET = SECRET;
runtime.SIR_BLOGGS_GOOGLE_CLIENT_ID = "smoke.apps.googleusercontent.com";
runtime.SIR_BLOGGS_AUTH_STORE_PATH = authStorePath;
runtime.SIR_BLOGGS_BLAWGY_STORE_PATH = blawgyStorePath;
runtime.SIR_BLOGGS_ACCOUNT_STORE_PATH = accountStorePath;

const SESSION_ID = crypto.randomBytes(32).toString("base64url");
const USER_ID = "google:account-store-smoke";
const USER_EMAIL = "user@sirbloggsalot.test";

function seedAuthStore() {
  const now = new Date().toISOString();
  fs.writeFileSync(
    authStorePath,
    JSON.stringify({
      users: {
        [USER_ID]: {
          id: USER_ID,
          provider: "google",
          providerSubject: "account-store-smoke",
          email: USER_EMAIL,
          emailVerified: true,
          name: "Account Store Smoke",
          picture: "",
          role: "client",
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        },
      },
      sessions: {
        [SESSION_ID]: { id: SESSION_ID, userId: USER_ID, createdAt: now, expiresAt: new Date(Date.now() + 3600000).toISOString() },
      },
    })
  );
}

function cookie() {
  const sig = crypto.createHmac("sha256", SECRET).update(SESSION_ID).digest("base64url");
  return `sirbloggs_session=${SESSION_ID}.${sig}`;
}

function req(baseUrl, method, pathname, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, baseUrl);
    const request = http.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    request.on("error", reject);
    if (body !== undefined) request.end(JSON.stringify(body));
    else request.end();
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

function noTmpLeftBehind(dir) {
  if (!fs.existsSync(dir)) return true;
  return !fs.readdirSync(dir).some((name) => name.includes(".tmp"));
}

async function main() {
  seedAuthStore();
  const { createServer } = require("../server");
  const server = createServer();
  const baseUrl = await listen(server);
  const auth = { cookie: cookie() };

  try {
    // 1. GET summary is read-only: 200, but the store file is NOT created.
    const summary = await req(baseUrl, "GET", "/api/account/summary", auth);
    assert.strictEqual(summary.status, 200, "GET summary should be 200");
    assert.ok(!fs.existsSync(accountStorePath), "GET must NOT create the account store (read-only)");

    // 2. First mutation creates the store at the env path (nested dir auto-created).
    const put = await req(
      baseUrl,
      "PUT",
      "/api/account/settings",
      { ...auth, "content-type": "application/json" },
      { site: { productDescription: "Hardening smoke test." } }
    );
    assert.strictEqual(put.status, 200, "PUT settings should be 200");
    assert.ok(fs.existsSync(accountStorePath), "mutation should create the store at SIR_BLOGGS_ACCOUNT_STORE_PATH");

    // 3. Persisted content is valid JSON reflecting the write; no atomic .tmp left.
    const persisted = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    assert.ok(persisted.accounts[USER_ID], "account should be persisted under the user id");
    assert.ok(noTmpLeftBehind(path.dirname(accountStorePath)), "atomic write should leave no .tmp file");

    console.log("Account store checks passed (env path honored, read-only GET, atomic write on mutation).");
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Account store check FAILED:", error.message);
  process.exit(1);
});
