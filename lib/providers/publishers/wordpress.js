"use strict";

// Real WordPress publisher — REST API v2 + Application Password.
//
// Credentials are PER SITE (user-supplied via Settings), not env: every call
// takes a `conn = { site, username, appPassword }`. Mirrors the provider
// pattern in ../keywords.js / ../llm.js: a factory that returns null when the
// connection is incomplete or an object otherwise; every network method accepts
// an injected transport ({ fetchImpl = fetch }) and throws on response.ok===false.
// No npm dependencies — built-in fetch / Buffer / URL / AbortSignal only.

// --- helpers ----------------------------------------------------------------

function reqSignal() {
  return typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined;
}

function baseUrl(site) {
  const host = String(site || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!host) throw new Error("WordPress connection is missing a site domain.");
  return `https://${host}/wp-json/wp/v2`;
}

// Basic base64(username:appPassword) over HTTPS.
function authHeader(conn) {
  return `Basic ${Buffer.from(`${conn.username}:${conn.appPassword}`).toString("base64")}`;
}

// Typed error carrying the HTTP status + a stable code for callers/routes.
function wpError(status, action) {
  const s = Number(status);
  let message;
  if (s === 401) message = `WordPress rejected the credentials (401) during ${action}. Check the username and application password.`;
  else if (s === 403) message = `WordPress denied access (403) during ${action}. The account lacks the required permissions (needs edit access).`;
  else if (s === 404) message = `WordPress REST API not found (404) during ${action}. Check the site domain and that the wp-json REST API is enabled.`;
  else message = `WordPress request failed (${status || "unknown"}) during ${action}.`;
  const err = new Error(message);
  err.name = "WordPressError";
  err.provider = "wordpress";
  err.status = Number.isFinite(s) ? s : undefined;
  err.code = s === 401 ? "invalid_credentials" : s === 403 ? "forbidden" : s === 404 ? "not_found" : "wordpress_error";
  return err;
}

function jsonHeaders(conn) {
  return { Authorization: authHeader(conn), "Content-Type": "application/json", Accept: "application/json" };
}

function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function filenameFromUrl(url) {
  try {
    const name = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
    return /\.[a-z0-9]+$/i.test(name) ? name : "image.jpg";
  } catch (_) {
    return "image.jpg";
  }
}

// --- categories: resolve by slug, create when absent ------------------------

async function resolveCategoryId(name, conn, fetchImpl) {
  const slug = slugify(name);
  const base = baseUrl(conn.site);
  const getResp = await fetchImpl(`${base}/categories?slug=${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: { Authorization: authHeader(conn), Accept: "application/json" },
    signal: reqSignal(),
  });
  if (getResp.ok === false) throw wpError(getResp.status, "resolve category");
  const found = await getResp.json();
  if (Array.isArray(found) && found.length && found[0] && found[0].id != null) return found[0].id;

  const postResp = await fetchImpl(`${base}/categories`, {
    method: "POST",
    headers: jsonHeaders(conn),
    body: JSON.stringify({ name: String(name), slug }),
    signal: reqSignal(),
  });
  if (postResp.ok === false) throw wpError(postResp.status, "create category");
  const created = await postResp.json();
  return created && created.id;
}

async function resolveCategoryIds(names, conn, fetchImpl) {
  const list = Array.isArray(names) ? names.map((n) => String(n).trim()).filter(Boolean) : [];
  const ids = [];
  for (const name of list) {
    const id = await resolveCategoryId(name, conn, fetchImpl);
    if (id != null) ids.push(id);
  }
  return ids;
}

// --- media sideload (best-effort, non-fatal) --------------------------------

// Fetch the image bytes, then POST them to /media with a Content-Disposition
// filename. Returns { id, sourceUrl }. Any failure propagates to the caller,
// which swallows it so a media hiccup never blocks the publish.
async function sideloadMedia(featuredImageUrl, conn, fetchImpl) {
  const imgResp = await fetchImpl(featuredImageUrl, { method: "GET", signal: reqSignal() });
  if (imgResp.ok === false) throw wpError(imgResp.status, "fetch featured image");
  if (typeof imgResp.arrayBuffer !== "function") throw new Error("Featured image response has no body bytes.");
  const bytes = Buffer.from(await imgResp.arrayBuffer());
  const filename = filenameFromUrl(featuredImageUrl);
  const contentType = (imgResp.headers && typeof imgResp.headers.get === "function" && imgResp.headers.get("content-type")) || "application/octet-stream";

  const mediaResp = await fetchImpl(`${baseUrl(conn.site)}/media`, {
    method: "POST",
    headers: {
      Authorization: authHeader(conn),
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body: bytes,
    signal: reqSignal(),
  });
  if (mediaResp.ok === false) throw wpError(mediaResp.status, "upload media");
  const media = await mediaResp.json();
  return { id: media && media.id, sourceUrl: media && (media.source_url || (media.guid && media.guid.rendered)) };
}

// Build the shared /posts payload used by both publish and update. Resolves
// categories (create-on-miss) and, best-effort, a featured image.
async function buildPostBody(article, conn, fetchImpl) {
  const a = article || {};
  const body = {
    title: a.title,
    content: a.html,
    excerpt: a.excerpt,
    slug: a.slug,
    status: a.status || "draft",
  };
  if (a.date) body.date = a.date;

  const categoryIds = await resolveCategoryIds(a.categories, conn, fetchImpl);
  if (categoryIds.length) body.categories = categoryIds;

  if (a.featuredImageUrl) {
    try {
      const media = await sideloadMedia(a.featuredImageUrl, conn, fetchImpl);
      if (media && media.id != null) body.featured_media = media.id;
    } catch (_) {
      // Media sideload is best-effort: never block publishing on an image error.
    }
  }
  return body;
}

// --- exported network methods -----------------------------------------------

// Read-only credential round-trip: GET /users/me?context=edit.
async function validate(conn, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${baseUrl(conn.site)}/users/me?context=edit`, {
    method: "GET",
    headers: { Authorization: authHeader(conn), Accept: "application/json" },
    signal: reqSignal(),
  });
  if (response.ok === false) throw wpError(response.status, "validate");
  const data = await response.json();
  return {
    ok: true,
    user: {
      id: data && data.id,
      name: data && (data.name || data.slug),
      slug: data && data.slug,
      roles: Array.isArray(data && data.roles) ? data.roles : undefined,
    },
  };
}

// Create a post. article = { title, html, excerpt, slug, status, date,
// categories:[names], featuredImageUrl? }.
async function publish(article, conn, { fetchImpl = fetch } = {}) {
  const body = await buildPostBody(article, conn, fetchImpl);
  const response = await fetchImpl(`${baseUrl(conn.site)}/posts`, {
    method: "POST",
    headers: jsonHeaders(conn),
    body: JSON.stringify(body),
    signal: reqSignal(),
  });
  if (response.ok === false) throw wpError(response.status, "publish");
  const data = await response.json();
  return { cmsPostId: data && data.id, publishedUrl: data && data.link, status: data && data.status };
}

// Republish/update an existing post: POST /posts/{id} with the same fields.
async function update(cmsPostId, article, conn, { fetchImpl = fetch } = {}) {
  if (cmsPostId == null || cmsPostId === "") throw new Error("update requires a cmsPostId.");
  const body = await buildPostBody(article, conn, fetchImpl);
  const response = await fetchImpl(`${baseUrl(conn.site)}/posts/${encodeURIComponent(cmsPostId)}`, {
    method: "POST",
    headers: jsonHeaders(conn),
    body: JSON.stringify(body),
    signal: reqSignal(),
  });
  if (response.ok === false) throw wpError(response.status, "update");
  const data = await response.json();
  return { cmsPostId: data && data.id, publishedUrl: data && data.link, status: data && data.status };
}

// Factory: null when the connection is incomplete, else an object whose methods
// are bound to this connection (mirrors createKeywords/createLlm gating).
function createWordPressPublisher(conn = {}) {
  const c = conn || {};
  if (!c.site || !c.username || !c.appPassword) return null;
  return {
    validate: (transport) => validate(c, transport),
    publish: (article, transport) => publish(article, c, transport),
    update: (cmsPostId, article, transport) => update(cmsPostId, article, c, transport),
  };
}

module.exports = { createWordPressPublisher, validate, publish, update };
