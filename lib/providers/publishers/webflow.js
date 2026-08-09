"use strict";

// Real Webflow CMS publisher (Data API v2). Mirrors the provider pattern used by
// lib/providers/keywords.js and lib/providers/llm.js: a factory returning an
// object, every network method taking an injected transport ({ fetchImpl }), and
// throwing whenever `response.ok === false`. Only the fields we actually consume
// are parsed. No npm dependencies — built-in fetch only.
//
// Webflow credentials are per-site (carried on `conn`, user-supplied via
// Settings), so unlike the env-keyed keywords/LLM factories there is no
// server-side key to gate on: the client is always available and each method
// validates the connection it is handed. `env` is accepted for parity with the
// other provider factories (and for `createPublishers(env)` wiring).

const BASE_URL = "https://api.webflow.com/v2";
const TIMEOUT_MS = 15000;

// Canonical Blawgy field slug -> article property that fills it. `conn.fields`
// remaps the LEFT (canonical) slug to the actual Webflow field slug in the
// customer's collection when it differs from these defaults.
const DEFAULT_FIELD_MAP = {
  name: "title",
  slug: "slug",
  "post-body": "html",
  "post-summary": "excerpt",
  image: "featuredImageUrl",
  date: "date",
};

function timeoutSignal() {
  return typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(TIMEOUT_MS)
    : undefined;
}

function webflowError(status, message) {
  const err = new Error(message);
  err.status = status;
  if (status === 401) err.code = "unauthorized";
  else if (status === 403) err.code = "forbidden";
  else if (status === 404) err.code = "not_found";
  else err.code = "webflow_error";
  return err;
}

function requireConn(conn) {
  if (!conn || !conn.apiToken || !conn.collectionId) {
    const err = new Error("Webflow connection requires apiToken and collectionId.");
    err.status = 400;
    err.code = "invalid_connection";
    throw err;
  }
}

async function requestJson(method, url, { apiToken, body, fetchImpl }) {
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    accept: "application/json",
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetchImpl(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: timeoutSignal(),
  });
  if (response.ok === false) {
    const detail = typeof response.text === "function" ? await response.text().catch(() => "") : "";
    throw webflowError(
      response.status,
      `Webflow ${method} ${url} failed (${response.status}). ${String(detail).slice(0, 200)}`.trim()
    );
  }
  return response.json();
}

// Map an article onto Webflow `fieldData`, applying the customer's field-slug
// overrides and dropping empty values so we never overwrite a field with "".
function buildFieldData(article = {}, conn = {}) {
  const overrides = conn && conn.fields && typeof conn.fields === "object" ? conn.fields : {};
  const fieldData = {};
  for (const [blawgySlug, articleProp] of Object.entries(DEFAULT_FIELD_MAP)) {
    const value = article[articleProp];
    if (value === undefined || value === null || value === "") continue;
    const targetSlug = overrides[blawgySlug] || blawgySlug;
    fieldData[targetSlug] = value;
  }
  return fieldData;
}

// GET /v2/collections/{id} -> the collection's field schema. Backs /webflow/fields.
async function listFields(conn, { fetchImpl = fetch } = {}) {
  requireConn(conn);
  const data = await requestJson("GET", `${BASE_URL}/collections/${conn.collectionId}`, {
    apiToken: conn.apiToken,
    fetchImpl,
  });
  const fields = data && Array.isArray(data.fields) ? data.fields : [];
  return fields.map((f) => ({
    slug: f && f.slug ? String(f.slug) : "",
    displayName: f && f.displayName ? String(f.displayName) : "",
    type: f && f.type ? String(f.type) : "",
    isRequired: Boolean(f && f.isRequired),
  }));
}

// Read-only round-trip. Propagates the typed 401/403/404 thrown by requestJson.
async function validate(conn, { fetchImpl = fetch } = {}) {
  const fields = await listFields(conn, { fetchImpl });
  return { ok: true, fields };
}

// Create a CMS item; publish it live when the article is not a draft.
async function publish(article = {}, conn, { fetchImpl = fetch } = {}) {
  requireConn(conn);
  const isDraft = article.status === "draft";
  const fieldData = buildFieldData(article, conn);

  const created = await requestJson("POST", `${BASE_URL}/collections/${conn.collectionId}/items`, {
    apiToken: conn.apiToken,
    body: { isDraft, fieldData },
    fetchImpl,
  });

  const id = created && created.id ? created.id : null;
  if (!isDraft && id) {
    await requestJson("POST", `${BASE_URL}/collections/${conn.collectionId}/items/publish`, {
      apiToken: conn.apiToken,
      body: { itemIds: [id] },
      fetchImpl,
    });
  }

  const slug = created && created.fieldData ? created.fieldData.slug : null;
  return {
    cmsPostId: id,
    publishedUrl: slug ? `/${slug}` : null,
    status: isDraft ? "draft" : "published",
  };
}

// PATCH an existing item's fieldData.
async function update(cmsPostId, article = {}, conn, { fetchImpl = fetch } = {}) {
  requireConn(conn);
  const fieldData = buildFieldData(article, conn);
  const updated = await requestJson(
    "PATCH",
    `${BASE_URL}/collections/${conn.collectionId}/items/${cmsPostId}`,
    { apiToken: conn.apiToken, body: { fieldData }, fetchImpl }
  );
  const slug = updated && updated.fieldData ? updated.fieldData.slug : null;
  return {
    cmsPostId: (updated && updated.id) || cmsPostId,
    publishedUrl: slug ? `/${slug}` : null,
    status: article.status === "draft" ? "draft" : "published",
  };
}

function createWebflow(env = process.env) {
  void env; // reserved for parity with the other provider factories; no server key needed
  return { listFields, validate, publish, update };
}

module.exports = { createWebflow, buildFieldData };
