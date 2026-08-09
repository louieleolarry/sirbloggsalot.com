"use strict";

const assert = require("assert");

const { createWebflow, buildFieldData } = require("../lib/providers/publishers/webflow");

// (1) Factory shape.
const webflow = createWebflow({});
assert.strictEqual(typeof webflow, "object");
for (const method of ["listFields", "validate", "publish", "update"]) {
  assert.strictEqual(typeof webflow[method], "function", `exposes ${method}()`);
}

const conn = { apiToken: "wf-token", collectionId: "col_123" };

// Canned Webflow collection schema (GET /v2/collections/{id}).
const collectionSchema = {
  id: "col_123",
  displayName: "Blog Posts",
  slug: "blog-posts",
  fields: [
    { id: "f1", slug: "name", displayName: "Name", type: "PlainText", isRequired: true },
    { id: "f2", slug: "slug", displayName: "Slug", type: "PlainText", isRequired: true },
    { id: "f3", slug: "post-body", displayName: "Post Body", type: "RichText", isRequired: false },
    { id: "f4", slug: "post-summary", displayName: "Post Summary", type: "PlainText", isRequired: false },
  ],
};

// Canned item create response (POST /v2/collections/{id}/items).
const createdItem = {
  id: "item_789",
  isDraft: true,
  fieldData: { name: "My Title", slug: "my-title" },
};

const article = {
  title: "My Title",
  slug: "my-title",
  html: "<p>Body</p>",
  excerpt: "Summary text",
  featuredImageUrl: "https://cdn.example.com/img.png",
  date: "2026-08-09",
  status: "draft",
};

(async () => {
  // (2) listFields parses the collection schema into the mapper-facing shape.
  let capturedUrl = null;
  let capturedOpts = null;
  const schemaFetch = async (url, opts) => {
    capturedUrl = url;
    capturedOpts = opts;
    return { async json() { return collectionSchema; } };
  };

  const fields = await webflow.listFields(conn, { fetchImpl: schemaFetch });
  assert.ok(capturedUrl.endsWith("/v2/collections/col_123"), "GETs the collection endpoint");
  assert.strictEqual(capturedOpts.method, "GET");
  assert.ok(capturedOpts.headers.Authorization.startsWith("Bearer "), "sends Bearer token");
  assert.strictEqual(capturedOpts.headers.Authorization, "Bearer wf-token");
  assert.strictEqual(fields.length, 4);
  assert.deepStrictEqual(fields[0], {
    slug: "name",
    displayName: "Name",
    type: "PlainText",
    isRequired: true,
  });
  assert.strictEqual(fields[2].slug, "post-body");
  assert.strictEqual(fields[2].type, "RichText");
  assert.strictEqual(fields[2].isRequired, false);

  // (3) validate() round-trips the same GET and returns { ok, fields }.
  const v = await webflow.validate(conn, { fetchImpl: schemaFetch });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.fields.length, 4);

  // validate throws a TYPED error on 401 / 403 / 404.
  const errorFetch = (status, text) => async () => ({
    ok: false,
    status,
    async text() { return text; },
    async json() { return {}; },
  });
  await assert.rejects(
    () => webflow.validate(conn, { fetchImpl: errorFetch(401, "Unauthorized") }),
    (err) => err.status === 401 && err.code === "unauthorized"
  );
  await assert.rejects(
    () => webflow.validate(conn, { fetchImpl: errorFetch(403, "Forbidden") }),
    (err) => err.status === 403 && err.code === "forbidden"
  );
  await assert.rejects(
    () => webflow.validate(conn, { fetchImpl: errorFetch(404, "Not Found") }),
    (err) => err.status === 404 && err.code === "not_found"
  );

  // (4) publish() as a DRAFT: one create call, isDraft=true, fields mapped by default.
  const draftCalls = [];
  const draftFetch = async (url, opts) => {
    draftCalls.push({ url, method: opts.method, body: JSON.parse(opts.body) });
    return { async json() { return createdItem; } };
  };
  const draftRes = await webflow.publish(article, conn, { fetchImpl: draftFetch });

  assert.strictEqual(draftCalls.length, 1, "draft: create only, no publish call");
  assert.ok(draftCalls[0].url.endsWith("/v2/collections/col_123/items"));
  assert.strictEqual(draftCalls[0].method, "POST");
  assert.strictEqual(draftCalls[0].body.isDraft, true, "isDraft set from article.status");
  const fd = draftCalls[0].body.fieldData;
  assert.strictEqual(fd.name, "My Title", "name <- title");
  assert.strictEqual(fd.slug, "my-title", "slug <- slug");
  assert.strictEqual(fd["post-body"], "<p>Body</p>", "post-body <- html");
  assert.strictEqual(fd["post-summary"], "Summary text", "post-summary <- excerpt");
  assert.strictEqual(fd.image, "https://cdn.example.com/img.png", "image <- featuredImageUrl");
  assert.strictEqual(fd.date, "2026-08-09", "date <- date");
  assert.strictEqual(draftRes.cmsPostId, "item_789");
  assert.strictEqual(draftRes.status, "draft");
  assert.strictEqual(draftRes.publishedUrl, "/my-title");

  // (5) publish() LIVE with a custom field map: create + publish, overrides applied.
  const connOverride = {
    apiToken: "wf-token",
    collectionId: "col_123",
    fields: { "post-body": "body-content", "post-summary": "summary" },
  };
  const liveArticle = { ...article, status: "published" };
  const liveCalls = [];
  const liveFetch = async (url, opts) => {
    liveCalls.push({ url, method: opts.method, body: JSON.parse(opts.body) });
    if (url.endsWith("/items/publish")) {
      return { async json() { return { publishedItemIds: ["item_789"] }; } };
    }
    return { async json() { return createdItem; } };
  };
  const liveRes = await webflow.publish(liveArticle, connOverride, { fetchImpl: liveFetch });

  assert.strictEqual(liveCalls.length, 2, "live: create + publish");
  assert.strictEqual(liveCalls[0].body.isDraft, false, "live: isDraft=false");
  const liveFd = liveCalls[0].body.fieldData;
  assert.strictEqual(liveFd["body-content"], "<p>Body</p>", "override remaps post-body -> body-content");
  assert.strictEqual(liveFd["summary"], "Summary text", "override remaps post-summary -> summary");
  assert.ok(!("post-body" in liveFd), "default post-body slug replaced by override");
  assert.strictEqual(liveFd.name, "My Title", "unmapped fields keep default slug");
  assert.ok(liveCalls[1].url.endsWith("/v2/collections/col_123/items/publish"));
  assert.strictEqual(liveCalls[1].method, "POST");
  assert.deepStrictEqual(liveCalls[1].body.itemIds, ["item_789"]);
  assert.strictEqual(liveRes.status, "published");
  assert.strictEqual(liveRes.cmsPostId, "item_789");

  // (6) update() PATCHes the item's fieldData.
  const updateCalls = [];
  const updateFetch = async (url, opts) => {
    updateCalls.push({ url, method: opts.method, body: JSON.parse(opts.body) });
    return { async json() { return { id: "item_789", fieldData: { slug: "my-title" } }; } };
  };
  const updateRes = await webflow.update("item_789", article, conn, { fetchImpl: updateFetch });

  assert.strictEqual(updateCalls.length, 1);
  assert.strictEqual(updateCalls[0].method, "PATCH");
  assert.ok(updateCalls[0].url.endsWith("/v2/collections/col_123/items/item_789"));
  assert.ok(updateCalls[0].body.fieldData, "PATCH body carries fieldData");
  assert.strictEqual(updateCalls[0].body.fieldData.name, "My Title");
  assert.strictEqual(updateCalls[0].body.fieldData["post-body"], "<p>Body</p>");
  assert.strictEqual(updateRes.cmsPostId, "item_789");

  // (7) buildFieldData drops empty values so publish never blanks a field.
  const sparse = buildFieldData({ title: "T", slug: "", html: null, excerpt: undefined }, {});
  assert.deepStrictEqual(sparse, { name: "T" }, "empty/null/undefined values omitted");

  console.log("Webflow provider checks passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
