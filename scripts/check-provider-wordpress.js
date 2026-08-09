"use strict";

// Unit smoke test for the WordPress publisher (lib/providers/publishers/wordpress.js).
//
// Runs with ZERO real network: every call is driven through an injected
// fetchImpl that RECORDS the request and returns canned WP REST responses. No
// real site/credentials are touched — the connection is passed explicitly.
//
// Run: node scripts/check-provider-wordpress.js

const assert = require("assert");
const {
  createWordPressPublisher,
  validate,
  publish,
  update,
} = require("../lib/providers/publishers/wordpress");

const CONN = { site: "example.com", username: "editor", appPassword: "abcd 1234 wxyz" };

function json(payload, status = 200) {
  return { ok: true, status, async json() { return payload; } };
}

// A canned WordPress backend that also records every request it receives.
// options.imageOk=false makes the featured-image fetch fail (to prove the
// media sideload is best-effort / non-fatal).
function makeFakeFetch(recorder, options = {}) {
  const imageOk = options.imageOk !== false;
  return async function fakeFetch(url, opts = {}) {
    const method = (opts.method || "GET").toUpperCase();
    recorder.push({ url: String(url), method, headers: opts.headers || {}, body: opts.body });
    const u = String(url);

    // Featured image bytes (external URL).
    if (u === "https://cdn.example.com/hero.png") {
      if (!imageOk) return { ok: false, status: 500, async json() { return {}; } };
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (String(h).toLowerCase() === "content-type" ? "image/png" : null) },
        async arrayBuffer() { return Uint8Array.from([137, 80, 78, 71]).buffer; },
      };
    }

    if (u.includes("/wp-json/wp/v2/users/me")) {
      return json({ id: 1, name: "Editor", slug: "editor", roles: ["editor"] });
    }

    if (method === "GET" && u.includes("/wp-json/wp/v2/categories")) {
      if (u.includes("slug=guides")) return json([{ id: 7, slug: "guides", name: "Guides" }]);
      return json([]); // "news" not found -> triggers create
    }

    if (method === "POST" && /\/wp-json\/wp\/v2\/categories$/.test(u)) {
      const parsed = JSON.parse(opts.body);
      return json({ id: 42, name: parsed.name, slug: parsed.slug });
    }

    if (method === "POST" && u.endsWith("/wp-json/wp/v2/media")) {
      return json({ id: 99, source_url: "https://example.com/wp-content/uploads/hero.png" });
    }

    if (method === "POST" && /\/wp-json\/wp\/v2\/posts\/\d+$/.test(u)) {
      return json({ id: 123, link: "https://example.com/updated-post", status: "publish" });
    }

    if (method === "POST" && u.endsWith("/wp-json/wp/v2/posts")) {
      return json({ id: 123, link: "https://example.com/?p=123", status: "draft" });
    }

    throw new Error(`unexpected request: ${method} ${u}`);
  };
}

function decodeBasic(header) {
  assert.ok(typeof header === "string" && header.startsWith("Basic "), "Authorization must be Basic");
  return Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
}

async function main() {
  // (0) Factory gating: null unless site + username + appPassword all present.
  assert.strictEqual(createWordPressPublisher({}), null, "empty conn -> null");
  assert.strictEqual(createWordPressPublisher({ site: "x" }), null, "missing username/appPassword -> null");
  assert.strictEqual(createWordPressPublisher({ site: "x", username: "u" }), null, "missing appPassword -> null");
  const publisher = createWordPressPublisher(CONN);
  assert.strictEqual(typeof publisher, "object", "complete conn -> object");
  assert.strictEqual(typeof publisher.validate, "function");
  assert.strictEqual(typeof publisher.publish, "function");
  assert.strictEqual(typeof publisher.update, "function");

  // (1) validate: GET /users/me?context=edit with Basic auth.
  {
    const rec = [];
    const res = await validate(CONN, { fetchImpl: makeFakeFetch(rec) });
    assert.strictEqual(rec.length, 1, "validate makes exactly one request");
    const call = rec[0];
    assert.strictEqual(call.method, "GET");
    assert.strictEqual(
      call.url,
      "https://example.com/wp-json/wp/v2/users/me?context=edit",
      "validate hits users/me?context=edit on the https wp-json base"
    );
    assert.strictEqual(decodeBasic(call.headers.Authorization), "editor:abcd 1234 wxyz", "Basic auth encodes user:appPassword");
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.id, 1, "returns the parsed user id");
    assert.strictEqual(res.user.slug, "editor");
  }

  // (1b) Site normalization: protocol + trailing slash are stripped.
  {
    const rec = [];
    await validate({ ...CONN, site: "https://example.com/" }, { fetchImpl: makeFakeFetch(rec) });
    assert.strictEqual(
      rec[0].url,
      "https://example.com/wp-json/wp/v2/users/me?context=edit",
      "site is normalized to a single https base"
    );
  }

  // (2) validate error typing on 401 / 403 / 404.
  for (const [status, code] of [[401, "invalid_credentials"], [403, "forbidden"], [404, "not_found"]]) {
    const failing = async () => ({ ok: false, status, async json() { return {}; } });
    let thrown = null;
    try {
      await validate(CONN, { fetchImpl: failing });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, `validate must throw on ${status}`);
    assert.strictEqual(thrown.status, status, `error carries HTTP status ${status}`);
    assert.strictEqual(thrown.code, code, `error code for ${status}`);
    assert.ok(thrown.message.includes(String(status)), "message names the status");
  }

  // (3) publish: categories resolve/create, media sideload, POST /posts body + return shape.
  const ARTICLE = {
    title: "Hello World",
    html: "<p>Body</p>",
    excerpt: "A short excerpt",
    slug: "hello-world",
    status: "draft",
    date: "2026-08-09T12:00:00",
    categories: ["News", "Guides"],
    featuredImageUrl: "https://cdn.example.com/hero.png",
  };
  {
    const rec = [];
    const out = await publish(ARTICLE, CONN, { fetchImpl: makeFakeFetch(rec) });

    // Return shape.
    assert.deepStrictEqual(
      out,
      { cmsPostId: 123, publishedUrl: "https://example.com/?p=123", status: "draft" },
      "publish returns { cmsPostId, publishedUrl, status } from the WP response"
    );

    // Category "News" was looked up then created; "Guides" was found (no create).
    const catGets = rec.filter((r) => r.method === "GET" && r.url.includes("/categories?slug="));
    const catPosts = rec.filter((r) => r.method === "POST" && /\/categories$/.test(r.url));
    assert.ok(catGets.some((r) => r.url.includes("slug=news")), "looked up News by slug");
    assert.ok(catGets.some((r) => r.url.includes("slug=guides")), "looked up Guides by slug");
    assert.strictEqual(catPosts.length, 1, "only the missing category (News) is created");
    assert.strictEqual(JSON.parse(catPosts[0].body).slug, "news", "created News with slug 'news'");

    // Media sideload: image bytes fetched, then POSTed to /media with a filename.
    const mediaPost = rec.find((r) => r.method === "POST" && r.url.endsWith("/wp-json/wp/v2/media"));
    assert.ok(mediaPost, "posted media");
    assert.ok(Buffer.isBuffer(mediaPost.body), "media body is raw bytes (Buffer)");
    assert.strictEqual(mediaPost.headers["Content-Type"], "image/png", "media Content-Type from the image");
    assert.ok(
      /filename="hero\.png"/.test(mediaPost.headers["Content-Disposition"]),
      "media Content-Disposition carries the filename"
    );

    // The create-post request body.
    const postCall = rec.find((r) => r.method === "POST" && r.url.endsWith("/wp-json/wp/v2/posts"));
    assert.ok(postCall, "created a post");
    assert.strictEqual(decodeBasic(postCall.headers.Authorization), "editor:abcd 1234 wxyz", "post uses Basic auth");
    const body = JSON.parse(postCall.body);
    assert.strictEqual(body.title, "Hello World");
    assert.strictEqual(body.content, "<p>Body</p>", "html maps to content");
    assert.strictEqual(body.excerpt, "A short excerpt");
    assert.strictEqual(body.slug, "hello-world");
    assert.strictEqual(body.status, "draft");
    assert.strictEqual(body.date, "2026-08-09T12:00:00");
    assert.deepStrictEqual(body.categories, [42, 7], "resolved category ids in order");
    assert.strictEqual(body.featured_media, 99, "featured_media set from sideloaded media id");
  }

  // (4) Media sideload is best-effort: an image failure must not block the post.
  {
    const rec = [];
    const out = await publish(ARTICLE, CONN, { fetchImpl: makeFakeFetch(rec, { imageOk: false }) });
    assert.strictEqual(out.cmsPostId, 123, "publish still succeeds when media fails");
    assert.ok(
      !rec.some((r) => r.method === "POST" && r.url.endsWith("/wp-json/wp/v2/media")),
      "no media POST after the image fetch failed"
    );
    const postCall = rec.find((r) => r.method === "POST" && r.url.endsWith("/wp-json/wp/v2/posts"));
    const body = JSON.parse(postCall.body);
    assert.ok(!("featured_media" in body), "featured_media omitted when sideload fails");
    assert.deepStrictEqual(body.categories, [42, 7], "categories still resolved");
  }

  // (5) update: POST /posts/{id} with the same fields; returns the updated shape.
  {
    const rec = [];
    const out = await update(123, { ...ARTICLE, status: "publish" }, CONN, { fetchImpl: makeFakeFetch(rec) });
    const postCall = rec.find((r) => r.method === "POST" && /\/wp-json\/wp\/v2\/posts\/123$/.test(r.url));
    assert.ok(postCall, "update POSTs to /posts/{id}");
    assert.strictEqual(
      postCall.url,
      "https://example.com/wp-json/wp/v2/posts/123",
      "update targets the numeric post id"
    );
    const body = JSON.parse(postCall.body);
    assert.strictEqual(body.title, "Hello World");
    assert.strictEqual(body.content, "<p>Body</p>");
    assert.strictEqual(body.status, "publish");
    assert.deepStrictEqual(
      out,
      { cmsPostId: 123, publishedUrl: "https://example.com/updated-post", status: "publish" },
      "update returns the refreshed { cmsPostId, publishedUrl, status }"
    );
  }

  // (6) The bound factory methods route through the same code path.
  {
    const rec = [];
    const res = await publisher.validate({ fetchImpl: makeFakeFetch(rec) });
    assert.strictEqual(res.user.id, 1, "factory-bound validate works with the bound conn");
    assert.strictEqual(decodeBasic(rec[0].headers.Authorization), "editor:abcd 1234 wxyz");
  }

  console.log("WordPress publisher checks passed.");
}

main().catch((error) => {
  console.error("WordPress provider check FAILED:", error && error.stack ? error.stack : error);
  process.exit(1);
});
