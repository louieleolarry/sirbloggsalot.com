"use strict";

// Unit smoke test for the Google Search Console provider (lib/providers/gsc.js).
//
// Runs with ZERO real network: every method is driven through an injected
// fetchImpl that returns canned Google responses. No client id/secret is read
// from the real environment — dummy creds are passed explicitly to createGsc.
//
// Run: node scripts/check-provider-gsc.js

const assert = require("assert");
const { createGsc } = require("../lib/providers/gsc");
const { createProviders } = require("../lib/providers");

// A fetch double that records the last request and returns a canned response.
function stub(response) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts: opts || {} });
    return response;
  };
  return { fetchImpl, calls };
}

function okJson(payload) {
  return { ok: true, status: 200, json: async () => payload, text: async () => JSON.stringify(payload) };
}

function errJson(status, body) {
  return { ok: false, status, json: async () => ({}), text: async () => body };
}

const CREDS = { SIR_BLOGGS_GSC_CLIENT_ID: "cid.apps.googleusercontent.com", SIR_BLOGGS_GSC_CLIENT_SECRET: "secret-xyz" };

function parseForm(body) {
  return Object.fromEntries(new URLSearchParams(String(body || "")));
}

async function main() {
  // (a) Credential gating.
  assert.strictEqual(createGsc({}), null, "createGsc({}) must be null with no creds");
  assert.strictEqual(createGsc({ SIR_BLOGGS_GSC_CLIENT_ID: "cid" }), null, "client id alone -> null");
  assert.strictEqual(createGsc({ SIR_BLOGGS_GSC_CLIENT_SECRET: "s" }), null, "client secret alone -> null");

  const gsc = createGsc(CREDS);
  assert.strictEqual(typeof gsc, "object", "both creds -> provider object");
  for (const m of ["authorizeUrl", "exchangeCode", "refresh", "listSites", "searchAnalytics", "revoke"]) {
    assert.strictEqual(typeof gsc[m], "function", `provider exposes ${m}()`);
  }

  // index.js registration: gsc + gscAvailable, without disturbing existing providers.
  const provs = createProviders(CREDS);
  assert.ok(provs.gsc && typeof provs.gsc === "object", "createProviders exposes gsc");
  assert.strictEqual(provs.gscAvailable, true, "gscAvailable true when creds set");
  assert.strictEqual(provs.scrape, require("../lib/providers/scrape"), "scrape still wired");
  assert.ok("llm" in provs && "keywords" in provs, "llm/keywords still present");
  assert.strictEqual(createProviders({}).gscAvailable, false, "gscAvailable false without creds");
  assert.strictEqual(createProviders({}).gsc, null, "gsc null without creds");

  // authorizeUrl(): exact query shape, url-encoded redirect + state, fixed scope.
  const authUrl = gsc.authorizeUrl({ redirectUri: "https://sirbloggsalot.com/gsc/oauth2callback", state: "st a+te/1" });
  assert.ok(authUrl.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"), "authorize base url");
  assert.ok(authUrl.includes("client_id=cid.apps.googleusercontent.com"), "carries client id");
  assert.ok(
    authUrl.includes("redirect_uri=https%3A%2F%2Fsirbloggsalot.com%2Fgsc%2Foauth2callback"),
    "redirect_uri is url-encoded"
  );
  assert.ok(authUrl.includes("response_type=code"), "response_type=code");
  assert.ok(
    authUrl.includes("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fwebmasters.readonly"),
    "fixed webmasters.readonly scope, encoded"
  );
  assert.ok(authUrl.includes("access_type=offline"), "access_type=offline");
  assert.ok(authUrl.includes("prompt=consent"), "prompt=consent");
  assert.ok(authUrl.includes("state=st%20a%2Bte%2F1"), "state is url-encoded");

  // exchangeCode(): POST token endpoint, form body, injected clock -> deterministic expiry.
  {
    const { fetchImpl, calls } = stub(
      okJson({ access_token: "at-1", refresh_token: "rt-1", expires_in: 3600, token_type: "Bearer" })
    );
    const now = 1_700_000_000_000;
    const out = await gsc.exchangeCode(
      { code: "auth-code-123", redirectUri: "https://sirbloggsalot.com/gsc/oauth2callback" },
      { fetchImpl, now }
    );
    assert.strictEqual(calls[0].url, "https://oauth2.googleapis.com/token", "exchangeCode hits token url");
    assert.strictEqual(calls[0].opts.method, "POST", "exchangeCode is POST");
    assert.strictEqual(
      calls[0].opts.headers["content-type"],
      "application/x-www-form-urlencoded",
      "form-encoded content-type"
    );
    const form = parseForm(calls[0].opts.body);
    assert.strictEqual(form.grant_type, "authorization_code", "grant_type=authorization_code");
    assert.strictEqual(form.code, "auth-code-123", "code echoed");
    assert.strictEqual(form.client_id, CREDS.SIR_BLOGGS_GSC_CLIENT_ID, "client_id sent");
    assert.strictEqual(form.client_secret, CREDS.SIR_BLOGGS_GSC_CLIENT_SECRET, "client_secret sent");
    assert.strictEqual(form.redirect_uri, "https://sirbloggsalot.com/gsc/oauth2callback", "redirect_uri sent");
    assert.strictEqual(out.access_token, "at-1");
    assert.strictEqual(out.refresh_token, "rt-1");
    assert.strictEqual(out.expiry, now + 3600 * 1000, "expiry = injected now + expires_in");
  }

  // refresh(): grant_type=refresh_token; returns access_token + expiry (no refresh_token).
  {
    const { fetchImpl, calls } = stub(okJson({ access_token: "at-2", expires_in: 3599 }));
    const now = 1_700_000_500_000;
    const out = await gsc.refresh({ refresh_token: "rt-1" }, { fetchImpl, now });
    assert.strictEqual(calls[0].url, "https://oauth2.googleapis.com/token", "refresh hits token url");
    assert.strictEqual(calls[0].opts.method, "POST", "refresh is POST");
    const form = parseForm(calls[0].opts.body);
    assert.strictEqual(form.grant_type, "refresh_token", "grant_type=refresh_token");
    assert.strictEqual(form.refresh_token, "rt-1", "refresh_token sent");
    assert.strictEqual(form.client_id, CREDS.SIR_BLOGGS_GSC_CLIENT_ID, "client_id sent on refresh");
    assert.strictEqual(out.access_token, "at-2");
    assert.strictEqual(out.expiry, now + 3599 * 1000, "refresh expiry from injected now");
    assert.ok(!("refresh_token" in out), "refresh() does not return a refresh_token");
  }

  // listSites(): GET w/ Bearer; filters siteUnverifiedUser; parses displayName/url/permissionLevel.
  {
    const { fetchImpl, calls } = stub(
      okJson({
        siteEntry: [
          { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
          { siteUrl: "https://www.example.com/", permissionLevel: "siteFullUser" },
          { siteUrl: "https://blocked.example.net/", permissionLevel: "siteUnverifiedUser" },
        ],
      })
    );
    const sites = await gsc.listSites("at-1", { fetchImpl });
    assert.strictEqual(calls[0].url, "https://www.googleapis.com/webmasters/v3/sites", "listSites GET url");
    assert.strictEqual(calls[0].opts.method, "GET", "listSites is GET");
    assert.strictEqual(calls[0].opts.headers.Authorization, "Bearer at-1", "Bearer auth header");
    assert.strictEqual(sites.length, 2, "siteUnverifiedUser filtered out");
    assert.deepStrictEqual(sites[0], {
      displayName: "example.com",
      url: "sc-domain:example.com",
      permissionLevel: "siteOwner",
    });
    assert.deepStrictEqual(sites[1], {
      displayName: "www.example.com",
      url: "https://www.example.com/",
      permissionLevel: "siteFullUser",
    });
    assert.ok(!sites.some((s) => s.permissionLevel === "siteUnverifiedUser"), "no unverified rows survive");
  }

  // searchAnalytics(): POST to per-property query url (property encoded); parses rows.
  {
    const { fetchImpl, calls } = stub(
      okJson({
        rows: [
          { keys: ["local seo"], clicks: 12, impressions: 340, ctr: 0.0353, position: 8.4 },
          { keys: ["seo audit"], clicks: 3, impressions: 120, ctr: 0.025, position: 14.1 },
        ],
      })
    );
    const rows = await gsc.searchAnalytics(
      "at-1",
      "sc-domain:example.com",
      { startDate: "2026-07-01", endDate: "2026-07-31", dimensions: ["query"], rowLimit: 100 },
      { fetchImpl }
    );
    assert.strictEqual(
      calls[0].url,
      "https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query",
      "property is encodeURIComponent'd into the path"
    );
    assert.strictEqual(calls[0].opts.method, "POST", "searchAnalytics is POST");
    assert.strictEqual(calls[0].opts.headers.Authorization, "Bearer at-1", "Bearer auth on query");
    assert.strictEqual(calls[0].opts.headers["content-type"], "application/json", "json content-type");
    const sent = JSON.parse(calls[0].opts.body);
    assert.deepStrictEqual(sent, {
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      dimensions: ["query"],
      rowLimit: 100,
    }, "request body carries date range + dimensions + rowLimit");
    assert.strictEqual(rows.length, 2, "parses both rows");
    assert.deepStrictEqual(rows[0], { keys: ["local seo"], clicks: 12, impressions: 340, ctr: 0.0353, position: 8.4 });

    // Missing rows -> [].
    const empty = stub(okJson({}));
    const noRows = await gsc.searchAnalytics("at-1", "https://www.example.com/", {}, { fetchImpl: empty.fetchImpl });
    assert.deepStrictEqual(noRows, [], "no rows -> empty array");
    assert.strictEqual(JSON.parse(empty.calls[0].opts.body).rowLimit, 1000, "rowLimit defaults to 1000");
  }

  // revoke(): POST form token=; resolves true on 200 and on already-invalid 400.
  {
    const okStub = stub({ ok: true, status: 200, json: async () => ({}), text: async () => "" });
    assert.strictEqual(await gsc.revoke("at-1", { fetchImpl: okStub.fetchImpl }), true, "revoke true on 200");
    assert.strictEqual(okStub.calls[0].url, "https://oauth2.googleapis.com/revoke", "revoke url");
    assert.strictEqual(okStub.calls[0].opts.method, "POST", "revoke is POST");
    assert.strictEqual(parseForm(okStub.calls[0].opts.body).token, "at-1", "token in form body");

    const badStub = stub({ ok: false, status: 400, json: async () => ({}), text: async () => "invalid_token" });
    assert.strictEqual(await gsc.revoke("dead", { fetchImpl: badStub.fetchImpl }), true, "revoke true on already-invalid 400");
  }

  // Non-ok responses throw with status + a short body slice (except revoke).
  {
    const bad = stub(errJson(401, "invalid_grant: token expired"));
    await assert.rejects(
      () => gsc.exchangeCode({ code: "x", redirectUri: "y" }, { fetchImpl: bad.fetchImpl }),
      (err) => err instanceof Error && /\(401\)/.test(err.message) && /invalid_grant/.test(err.message),
      "exchangeCode throws on non-ok with status + body slice"
    );

    const bad2 = stub(errJson(403, "insufficientPermissions"));
    await assert.rejects(
      () => gsc.listSites("at-1", { fetchImpl: bad2.fetchImpl }),
      (err) => /\(403\)/.test(err.message),
      "listSites throws on non-ok"
    );
  }

  console.log("GSC provider checks passed.");
}

main().catch((error) => {
  console.error("GSC provider check FAILED:", error && error.stack ? error.stack : error);
  process.exit(1);
});
