"use strict";

// Real Shopify blog publisher via the Admin REST API. Mirrors the provider
// pattern in ../keywords.js and ../llm.js: a factory that returns null (when the
// per-site connection isn't Shopify-capable) or an object of methods. Every
// network method accepts an injected transport ({ fetchImpl = fetch }) so unit
// checks run with zero real network access, and every method throws when the
// response is not ok. Only the fields we need are parsed. No new dependencies
// (built-in fetch only).
//
// Per-site conn shape:
//   { siteName (store handle), shopifyClientId, shopifyClientSecret,
//     authToken? (legacy direct token), apiVersion? (default 2024-10),
//     blogId (categoryId), blogHandle?, author? }
//
// The factory gates on the connection; each method still takes conn explicitly
// so a single import can serve many sites and the integrator can wire the
// resolved connection through per call.

const DEFAULT_API_VERSION = "2024-10";

// Cache the exchanged access token in-memory, keyed by the conn object, so a
// single publish flow (validate -> publish) exchanges once. A WeakMap avoids
// mutating conn, which the SPA serializes to the browser and must not leak the
// resolved secret token through.
const tokenCache = new WeakMap();

function storeHandle(conn) {
  return String((conn && conn.siteName) || "").trim().replace(/\.myshopify\.com$/i, "");
}

function storeHost(conn) {
  return `${storeHandle(conn)}.myshopify.com`;
}

function apiVersion(conn) {
  return (conn && conn.apiVersion) || DEFAULT_API_VERSION;
}

function timeoutSignal(ms = 15000) {
  return typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
}

function shopifyError(message, status) {
  const err = new Error(message);
  err.provider = "shopify";
  if (status !== undefined) err.status = status;
  return err;
}

async function throwForStatus(response, action) {
  const status = response.status;
  let detail = "";
  if (typeof response.text === "function") detail = await response.text().catch(() => "");
  detail = String(detail || "").slice(0, 200);
  let message;
  if (status === 401) message = `Shopify ${action} failed: invalid or expired access token (401).`;
  else if (status === 403) message = `Shopify ${action} failed: access token missing required scope (403).`;
  else if (status === 404) message = `Shopify ${action} failed: store, blog, or resource not found (404).`;
  else message = `Shopify ${action} failed (${status}).`;
  throw shopifyError(detail ? `${message} ${detail}` : message, status);
}

async function readJson(response, action) {
  if (!response || typeof response.json !== "function") {
    throw shopifyError(`Shopify ${action} returned no response.`);
  }
  if (response.ok === false) await throwForStatus(response, action);
  return response.json();
}

// getAccessToken -> token. Legacy sites pass authToken directly; otherwise
// exchange shopifyClientId/Secret for a custom-app token via client_credentials.
async function getAccessToken(conn, { fetchImpl = fetch } = {}) {
  if (!conn || !conn.siteName) throw shopifyError("Shopify connection is missing siteName.");
  if (conn.authToken) return conn.authToken;

  const cached = tokenCache.get(conn);
  if (cached) return cached;

  if (!conn.shopifyClientId || !conn.shopifyClientSecret) {
    throw shopifyError("Shopify connection is missing shopifyClientId/shopifyClientSecret.");
  }

  const url = `https://${storeHost(conn)}/admin/oauth/access_token`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: conn.shopifyClientId,
      client_secret: conn.shopifyClientSecret,
      grant_type: "client_credentials",
    }),
    signal: timeoutSignal(),
  });
  const data = await readJson(response, "token exchange");
  const token = data && data.access_token;
  if (typeof token !== "string" || !token) {
    throw shopifyError("Shopify token exchange returned no access_token.");
  }
  tokenCache.set(conn, token);
  return token;
}

// Best-effort author list for the Settings dropdown. Shopify exposes authors via
// the articles endpoint; if that call is unavailable we fall back to the
// connection's configured author (or an empty list).
async function fetchAuthors(conn, token, fetchImpl) {
  try {
    const url = `https://${storeHost(conn)}/admin/api/${apiVersion(conn)}/articles/authors.json`;
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { "X-Shopify-Access-Token": token, Accept: "application/json" },
      signal: timeoutSignal(),
    });
    if (response && response.ok !== false && typeof response.json === "function") {
      const data = await response.json();
      const list = data && Array.isArray(data.authors)
        ? data.authors.map((name) => String(name)).filter(Boolean)
        : [];
      if (list.length) return list;
    }
  } catch (_) {
    // best-effort: ignore and fall back
  }
  return conn && conn.author ? [String(conn.author)] : [];
}

// validate -> { ok:true, blogs, authors }. Lists the store's blogs so the
// integrator can wire { success, data: blogs, authors } into GET /shopify/blogs.
async function validate(conn, { fetchImpl = fetch } = {}) {
  const token = await getAccessToken(conn, { fetchImpl });
  const url = `https://${storeHost(conn)}/admin/api/${apiVersion(conn)}/blogs.json`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { "X-Shopify-Access-Token": token, Accept: "application/json" },
    signal: timeoutSignal(),
  });
  const data = await readJson(response, "blogs lookup");
  const blogs = Array.isArray(data.blogs) ? data.blogs : [];
  const authors = await fetchAuthors(conn, token, fetchImpl);
  return { ok: true, blogs, authors };
}

function buildArticlePayload(article, conn) {
  const a = article || {};
  const payload = {
    title: a.title,
    author: a.author || (conn && conn.author) || undefined,
    body_html: a.html,
    tags: Array.isArray(a.tags) ? a.tags.join(",") : undefined,
    published: a.status !== "draft",
    published_at: a.date || undefined,
  };
  if (a.featuredImageUrl) payload.image = { src: a.featuredImageUrl };
  return payload;
}

function formatArticleResult(data, conn) {
  const created = (data && data.article) || {};
  const blogSegment = conn.blogHandle || String(conn.blogId);
  const handle = created.handle || "";
  return {
    cmsPostId: created.id,
    publishedUrl: `https://${storeHost(conn)}/blogs/${blogSegment}/${handle}`,
    status: created.published_at ? "published" : "draft",
  };
}

// publish -> { cmsPostId, publishedUrl, status }. Creates a blog article; the
// `published` flag is derived from the draft status (draft -> false).
async function publish(article, conn, { fetchImpl = fetch } = {}) {
  if (!conn || !conn.blogId) throw shopifyError("Shopify connection is missing blogId.");
  const token = await getAccessToken(conn, { fetchImpl });
  const url = `https://${storeHost(conn)}/admin/api/${apiVersion(conn)}/blogs/${conn.blogId}/articles.json`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ article: buildArticlePayload(article, conn) }),
    signal: timeoutSignal(),
  });
  const data = await readJson(response, "article create");
  return formatArticleResult(data, conn);
}

// update -> { cmsPostId, publishedUrl, status }. Updates an existing article.
async function update(cmsPostId, article, conn, { fetchImpl = fetch } = {}) {
  if (!conn || !conn.blogId) throw shopifyError("Shopify connection is missing blogId.");
  if (cmsPostId === undefined || cmsPostId === null || cmsPostId === "") {
    throw shopifyError("Shopify update requires a cmsPostId.");
  }
  const token = await getAccessToken(conn, { fetchImpl });
  const url = `https://${storeHost(conn)}/admin/api/${apiVersion(conn)}/blogs/${conn.blogId}/articles/${cmsPostId}.json`;
  const payload = buildArticlePayload(article, conn);
  payload.id = cmsPostId;
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ article: payload }),
    signal: timeoutSignal(),
  });
  const data = await readJson(response, "article update");
  return formatArticleResult(data, conn);
}

function isConfigured(conn) {
  if (!conn || !conn.siteName) return false;
  if (conn.authToken) return true;
  return Boolean(conn.shopifyClientId && conn.shopifyClientSecret);
}

// Factory: null when the connection isn't Shopify-capable, otherwise an object
// whose methods are bound to this connection (mirrors createWordPressPublisher).
// The raw conn-taking functions are exported too for callers that resolve a
// connection per call.
function createShopifyPublisher(conn = {}) {
  if (!isConfigured(conn)) return null;
  const c = conn;
  return {
    getAccessToken: (transport) => getAccessToken(c, transport),
    validate: (transport) => validate(c, transport),
    publish: (article, transport) => publish(article, c, transport),
    update: (cmsPostId, article, transport) => update(cmsPostId, article, c, transport),
  };
}

module.exports = {
  createShopifyPublisher,
  getAccessToken,
  validate,
  publish,
  update,
  SHOPIFY_DEFAULT_API_VERSION: DEFAULT_API_VERSION,
};
