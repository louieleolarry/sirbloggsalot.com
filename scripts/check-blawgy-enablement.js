"use strict";

// Phase 1 (1a) enablement smoke test — no browser required.
//
// Verifies that, with the Blawgy SPA enabled:
//   * /api/auth/config advertises blawgyClientEnabled
//   * /dashboard serves the SPA shell, while /login serves the custom Google
//     sign-in (index.html) — the SPA's Firebase login is intentionally bypassed
//   * the compat surface authenticates ONLY via the real signed-cookie session
//     (no unsigned-Bearer bypass), returning 401 without a cookie and the real
//     user with a valid cookie.
//
// Run: node scripts/check-blawgy-enablement.js  (added to `npm run check`).

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const runtime = process.env;
const SECRET = "enablement-smoke-secret";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sba-enablement-"));
const authStorePath = path.join(tmpDir, "auth-store.json");
const blawgyStorePath = path.join(tmpDir, "blawgy-store.json");
const accountStorePath = path.join(tmpDir, "account-store.json");

runtime.SIR_BLOGGS_ENABLE_BLAWGY_CLIENT = "1";
runtime.SIR_BLOGGS_TRUST_BLAWGY_BEARER = "0";
runtime.SIR_BLOGGS_AUTH_SESSION_SECRET = SECRET;
runtime.SIR_BLOGGS_GOOGLE_CLIENT_ID = "smoke.apps.googleusercontent.com";
runtime.SIR_BLOGGS_AUTH_ADMIN_EMAILS = "owner@sirbloggsalot.test";
runtime.SIR_BLOGGS_AUTH_STORE_PATH = authStorePath;
runtime.SIR_BLOGGS_BLAWGY_STORE_PATH = blawgyStorePath;
runtime.SIR_BLOGGS_ACCOUNT_STORE_PATH = accountStorePath;

const SESSION_ID = crypto.randomBytes(32).toString("base64url");
const USER_ID = "google:enablement-smoke";
const USER_EMAIL = "owner@sirbloggsalot.test";

function seedAuthStore() {
  const now = new Date().toISOString();
  const store = {
    users: {
      [USER_ID]: {
        id: USER_ID,
        provider: "google",
        providerSubject: "enablement-smoke",
        email: USER_EMAIL,
        emailVerified: true,
        name: "Enablement Smoke Owner",
        picture: "",
        role: "admin",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      },
    },
    sessions: {
      [SESSION_ID]: {
        id: SESSION_ID,
        userId: USER_ID,
        createdAt: now,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    },
  };
  fs.writeFileSync(authStorePath, JSON.stringify(store, null, 2));
}

function sessionCookie() {
  const sig = crypto.createHmac("sha256", SECRET).update(SESSION_ID).digest("base64url");
  return `sirbloggs_session=${SESSION_ID}.${sig}`;
}

function request(baseUrl, pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, baseUrl);
    const req = http.get({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function main() {
  seedAuthStore();
  const { createServer } = require("../server");
  const server = createServer();
  const baseUrl = await listen(server);
  const cookie = sessionCookie();

  try {
    // 1. Config advertises the enabled SPA.
    const config = await request(baseUrl, "/api/auth/config");
    assert.strictEqual(config.status, 200, "/api/auth/config should be 200");
    assert.strictEqual(JSON.parse(config.body).blawgyClientEnabled, true, "blawgyClientEnabled should be true");

    // 2. /dashboard serves the SPA shell; /login serves the custom Google sign-in.
    const dashboard = await request(baseUrl, "/dashboard");
    assert.ok(dashboard.body.includes("loadBlawgyBundle"), "/dashboard should serve the Blawgy SPA shell");
    assert.ok(!dashboard.body.includes("data-route-page"), "/dashboard should NOT be the custom index");

    const login = await request(baseUrl, "/login");
    assert.ok(login.body.includes("data-route-page"), "/login should serve the custom index sign-in");
    assert.ok(!login.body.includes("loadBlawgyBundle"), "/login should NOT serve the SPA");

    // 3. Session endpoint: unauthenticated vs authenticated.
    const anonSession = await request(baseUrl, "/api/auth/session");
    assert.strictEqual(JSON.parse(anonSession.body).authenticated, false, "no cookie => not authenticated");

    const authedSession = await request(baseUrl, "/api/auth/session", { cookie });
    const authedBody = JSON.parse(authedSession.body);
    assert.strictEqual(authedBody.authenticated, true, "valid cookie => authenticated");
    assert.strictEqual(authedBody.user.email, USER_EMAIL, "session should reflect the real user");
    assert.strictEqual(authedBody.user.role, "admin", "role should come from the server session");

    // 4. Compat auth is cookie-ONLY: 401 without a cookie, 200 with it.
    const anonMe = await request(baseUrl, "/me");
    assert.strictEqual(anonMe.status, 401, "compat /me should 401 without a session cookie");

    // 4b. A forged unsigned Bearer must NOT grant access (bypass removed).
    const forgedBearer =
      "Bearer local." +
      Buffer.from(JSON.stringify({ email: "attacker@evil.test", role: "admin" })).toString("base64url") +
      ".sig";
    const bearerMe = await request(baseUrl, "/me", { authorization: forgedBearer });
    assert.strictEqual(bearerMe.status, 401, "forged Bearer must be rejected (no unsigned-bearer bypass)");

    const authedMe = await request(baseUrl, "/me", { cookie });
    assert.strictEqual(authedMe.status, 200, "compat /me should be 200 with a valid session cookie");
    const meBody = JSON.parse(authedMe.body);
    assert.ok(
      JSON.stringify(meBody).toLowerCase().includes(USER_EMAIL),
      "compat /me should reflect the cookie user"
    );

    console.log("Blawgy enablement checks passed (SPA on, cookie-only auth, no bearer bypass).");
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Blawgy enablement check FAILED:", error.message);
  process.exit(1);
});
