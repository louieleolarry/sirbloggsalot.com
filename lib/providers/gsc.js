"use strict";

// Real Google Search Console provider. `createGsc(env)` returns null unless BOTH
// SIR_BLOGGS_GSC_CLIENT_ID and SIR_BLOGGS_GSC_CLIENT_SECRET are set, so callers
// degrade to the deterministic placeholder when GSC is not configured.
//
// Every network method accepts an injected transport ({ fetchImpl = fetch }) and
// throws on response.ok===false (status + a short body slice), so the unit test in
// scripts/check-provider-gsc.js runs with zero real network access. Only the
// fields each caller needs are parsed out of the Google responses.
//
// Dependency-free by design (built-in fetch/URL only). State signing lives in the
// server (HMAC over {site,userId,nonce}); this module never signs or verifies it.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TIMEOUT_MS = 15000;
const FORM_HEADERS = { "content-type": "application/x-www-form-urlencoded" };

function signal() {
  return typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
}

// Real Date is fine in this module (the Date.now() ban is workflow-scripts only),
// but tests inject a clock so token expiry is deterministic.
function resolveNow(now) {
  if (typeof now === "function") return Number(now());
  if (Number.isFinite(now)) return Number(now);
  return Date.now();
}

function expiryFrom(data, now) {
  return resolveNow(now) + (Number(data && data.expires_in) || 0) * 1000;
}

async function readJson(response, label) {
  if (!response || typeof response.json !== "function") {
    throw new Error(`${label} transport returned no response.`);
  }
  if (response.ok === false) {
    const detail = typeof response.text === "function" ? await response.text().catch(() => "") : "";
    throw new Error(`${label} request failed (${response.status}). ${String(detail).slice(0, 200)}`.trim());
  }
  return response.json();
}

// A readable label for a GSC property id (sc-domain:example.com | https URL-prefix).
function siteDisplayName(siteUrl) {
  const raw = String(siteUrl || "");
  if (raw.startsWith("sc-domain:")) return raw.slice("sc-domain:".length);
  try {
    const u = new URL(raw);
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
    return `${u.host}${path}`;
  } catch (error) {
    return raw;
  }
}

function createGsc(env = process.env) {
  const source = env || {};
  const clientId = source.SIR_BLOGGS_GSC_CLIENT_ID;
  const clientSecret = source.SIR_BLOGGS_GSC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    // Sync: build the Google consent URL. State is signed by the server, not here.
    authorizeUrl({ redirectUri, state } = {}) {
      const query =
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(String(redirectUri || ""))}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(SCOPE)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(String(state || ""))}`;
      return `${AUTH_URL}?${query}`;
    },

    async exchangeCode({ code, redirectUri } = {}, { fetchImpl = fetch, now } = {}) {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code || ""),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: String(redirectUri || ""),
      }).toString();
      const response = await fetchImpl(TOKEN_URL, { method: "POST", headers: FORM_HEADERS, body, signal: signal() });
      const data = await readJson(response, "Google OAuth token");
      return {
        access_token: String(data.access_token || ""),
        refresh_token: String(data.refresh_token || ""),
        expiry: expiryFrom(data, now),
      };
    },

    async refresh({ refresh_token } = {}, { fetchImpl = fetch, now } = {}) {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: String(refresh_token || ""),
        client_id: clientId,
        client_secret: clientSecret,
      }).toString();
      const response = await fetchImpl(TOKEN_URL, { method: "POST", headers: FORM_HEADERS, body, signal: signal() });
      const data = await readJson(response, "Google OAuth refresh");
      return {
        access_token: String(data.access_token || ""),
        expiry: expiryFrom(data, now),
      };
    },

    async listSites(access_token, { fetchImpl = fetch } = {}) {
      const response = await fetchImpl(SITES_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${access_token}` },
        signal: signal(),
      });
      const data = await readJson(response, "Search Console sites");
      const entries = Array.isArray(data.siteEntry) ? data.siteEntry : [];
      return entries
        .filter((entry) => entry && entry.permissionLevel !== "siteUnverifiedUser")
        .map((entry) => {
          const url = String(entry.siteUrl || "");
          return {
            displayName: siteDisplayName(url),
            url,
            permissionLevel: String(entry.permissionLevel || ""),
          };
        });
    },

    async searchAnalytics(
      access_token,
      property,
      { startDate, endDate, dimensions, rowLimit } = {},
      { fetchImpl = fetch } = {}
    ) {
      const limit = Number(rowLimit);
      const body = {
        startDate: String(startDate || ""),
        endDate: String(endDate || ""),
        dimensions: Array.isArray(dimensions) ? dimensions : [],
        rowLimit: Number.isFinite(limit) && limit > 0 ? limit : 1000,
      };
      const url = `${SITES_URL}/${encodeURIComponent(property)}/searchAnalytics/query`;
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: signal(),
      });
      const data = await readJson(response, "Search Console searchAnalytics");
      const rows = Array.isArray(data.rows) ? data.rows : [];
      return rows.map((row) => ({
        keys: Array.isArray(row.keys) ? row.keys : [],
        clicks: Number(row.clicks) || 0,
        impressions: Number(row.impressions) || 0,
        ctr: Number(row.ctr) || 0,
        position: Number(row.position) || 0,
      }));
    },

    // Best-effort: 200 = revoked, 400 = token already invalid/expired. Treat both
    // as success so disconnect never fails on an already-dead token.
    async revoke(token, { fetchImpl = fetch } = {}) {
      const body = new URLSearchParams({ token: String(token || "") }).toString();
      await fetchImpl(REVOKE_URL, { method: "POST", headers: FORM_HEADERS, body, signal: signal() });
      return true;
    },
  };
}

module.exports = { createGsc };
