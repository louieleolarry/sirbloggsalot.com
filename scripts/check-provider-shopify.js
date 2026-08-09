"use strict";

const assert = require("assert");

const {
  createShopifyPublisher,
  getAccessToken,
  validate,
  publish,
  update,
} = require("../lib/providers/publishers/shopify");

// --- fake transport ---------------------------------------------------------

function jsonResponse(body, status = 200) {
  return {
    ok: status < 400,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

// Canned Shopify Admin API: token exchange, blogs list, article create/update.
// The authors endpoint 404s so validate() exercises its best-effort fallback.
function makeFetch() {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    const method = opts.method || "GET";
    calls.push({ url, method, opts });

    if (url.endsWith("/admin/oauth/access_token")) {
      return jsonResponse({ access_token: "shpat_faketoken", scope: "write_content,read_content" });
    }
    if (url.includes("/articles/authors.json")) {
      return jsonResponse({ errors: "Not Found" }, 404);
    }
    if (url.endsWith("/blogs.json") && method === "GET") {
      return jsonResponse({
        blogs: [
          { id: 123, handle: "news", title: "News" },
          { id: 456, handle: "updates", title: "Updates" },
        ],
      });
    }
    if (/\/blogs\/\d+\/articles\.json$/.test(url) && method === "POST") {
      const sent = JSON.parse(opts.body);
      const published = sent.article.published === true;
      return jsonResponse({
        article: {
          id: 999,
          handle: "my-first-post",
          blog_id: 123,
          published_at: published ? "2026-08-09T12:00:00-04:00" : null,
        },
      });
    }
    if (/\/blogs\/\d+\/articles\/\d+\.json$/.test(url) && method === "PUT") {
      const sent = JSON.parse(opts.body);
      const published = sent.article.published === true;
      return jsonResponse({
        article: {
          id: sent.article.id,
          handle: "my-first-post-updated",
          blog_id: 123,
          published_at: published ? "2026-08-09T13:00:00-04:00" : null,
        },
      });
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  };
  return { fetchImpl, calls };
}

(async () => {
  // (1) Factory credential gating: null unless siteName + (authToken | clientId+secret).
  assert.strictEqual(createShopifyPublisher(null), null);
  assert.strictEqual(createShopifyPublisher({}), null);
  assert.strictEqual(createShopifyPublisher({ siteName: "mystore" }), null, "no creds -> null");
  assert.strictEqual(
    createShopifyPublisher({ siteName: "mystore", shopifyClientId: "id" }),
    null,
    "client id without secret -> null"
  );
  assert.strictEqual(typeof createShopifyPublisher({ siteName: "mystore", authToken: "shpat_x" }), "object");
  const pub = createShopifyPublisher({
    siteName: "mystore",
    shopifyClientId: "id",
    shopifyClientSecret: "secret",
  });
  assert.strictEqual(typeof pub, "object");
  for (const name of ["getAccessToken", "validate", "publish", "update"]) {
    assert.strictEqual(typeof pub[name], "function", `${name} is a method`);
  }

  // (2) Token exchange via client_credentials, cached per-conn.
  {
    const { fetchImpl, calls } = makeFetch();
    const conn = { siteName: "mystore", shopifyClientId: "id-1", shopifyClientSecret: "sec-1" };
    const token = await getAccessToken(conn, { fetchImpl });
    assert.strictEqual(token, "shpat_faketoken");
    const oauthCalls = calls.filter((c) => c.url.endsWith("/admin/oauth/access_token"));
    assert.strictEqual(oauthCalls.length, 1, "exchanges exactly once");
    assert.strictEqual(oauthCalls[0].url, "https://mystore.myshopify.com/admin/oauth/access_token");
    assert.strictEqual(oauthCalls[0].method, "POST");
    const sent = JSON.parse(oauthCalls[0].opts.body);
    assert.strictEqual(sent.client_id, "id-1");
    assert.strictEqual(sent.client_secret, "sec-1");
    assert.strictEqual(sent.grant_type, "client_credentials");

    // Second call is served from the in-memory cache (no new exchange).
    const again = await getAccessToken(conn, { fetchImpl });
    assert.strictEqual(again, "shpat_faketoken");
    assert.strictEqual(
      calls.filter((c) => c.url.endsWith("/admin/oauth/access_token")).length,
      1,
      "cached token skips re-exchange"
    );
  }

  // (2b) Legacy direct authToken is used verbatim, no exchange.
  {
    const { fetchImpl, calls } = makeFetch();
    const conn = { siteName: "legacy", authToken: "shpat_legacy" };
    const token = await getAccessToken(conn, { fetchImpl });
    assert.strictEqual(token, "shpat_legacy");
    assert.strictEqual(calls.length, 0, "authToken path makes no network call");
  }

  // (3) validate() -> { ok, blogs, authors } with the access-token header.
  {
    const { fetchImpl, calls } = makeFetch();
    const conn = {
      siteName: "mystore",
      shopifyClientId: "id",
      shopifyClientSecret: "secret",
      author: "Jane Writer",
    };
    const out = await validate(conn, { fetchImpl });
    assert.strictEqual(out.ok, true);
    assert.ok(Array.isArray(out.blogs) && out.blogs.length === 2, "returns the blogs list");
    assert.strictEqual(out.blogs[0].id, 123);
    // authors is best-effort: the authors endpoint 404s, so it falls back to conn.author.
    assert.deepStrictEqual(out.authors, ["Jane Writer"]);
    const blogsCall = calls.find((c) => c.url.endsWith("/admin/api/2024-10/blogs.json") && c.method === "GET");
    assert.ok(blogsCall, "hits the versioned blogs endpoint");
    assert.strictEqual(blogsCall.opts.headers["X-Shopify-Access-Token"], "shpat_faketoken");
    assert.ok(
      calls.some((c) => c.url.includes("/articles/authors.json")),
      "attempts the best-effort authors lookup"
    );
  }

  // (3b) validate() throws a typed error on 401/403/404.
  {
    const conn = { siteName: "mystore", authToken: "bad" };
    const denyFetch = async () => jsonResponse({ errors: "unauthorized" }, 401);
    await assert.rejects(
      () => validate(conn, { fetchImpl: denyFetch }),
      (err) => {
        assert.strictEqual(err.provider, "shopify");
        assert.strictEqual(err.status, 401);
        return true;
      }
    );
  }

  // (4) publish() a DRAFT: published flag false, tags joined, image + published_at set.
  {
    const { fetchImpl, calls } = makeFetch();
    const conn = {
      siteName: "mystore",
      shopifyClientId: "id",
      shopifyClientSecret: "secret",
      blogId: 123,
      blogHandle: "news",
    };
    const article = {
      title: "How to Bake Sourdough",
      author: "Jane Writer",
      html: "<p>Feed your starter.</p>",
      tags: ["baking", "bread"],
      status: "draft",
      featuredImageUrl: "https://cdn.example.com/hero.png",
      date: "2026-08-09T09:00:00-04:00",
    };
    const res = await publish(article, conn, { fetchImpl });

    const createCall = calls.find((c) => /\/blogs\/123\/articles\.json$/.test(c.url) && c.method === "POST");
    assert.ok(createCall, "POSTs to the blog's articles endpoint");
    assert.strictEqual(createCall.opts.headers["X-Shopify-Access-Token"], "shpat_faketoken");
    const body = JSON.parse(createCall.opts.body).article;
    assert.strictEqual(body.title, "How to Bake Sourdough");
    assert.strictEqual(body.author, "Jane Writer");
    assert.strictEqual(body.body_html, "<p>Feed your starter.</p>");
    assert.strictEqual(body.tags, "baking,bread");
    assert.strictEqual(body.published, false, "draft -> published:false");
    assert.deepStrictEqual(body.image, { src: "https://cdn.example.com/hero.png" });
    assert.strictEqual(body.published_at, "2026-08-09T09:00:00-04:00");

    assert.strictEqual(res.cmsPostId, 999);
    assert.strictEqual(res.status, "draft", "response published_at null -> draft");
    assert.strictEqual(res.publishedUrl, "https://mystore.myshopify.com/blogs/news/my-first-post");
  }

  // (4b) publish() a PUBLISHED article: no tags, no image; blog segment falls back to blogId.
  {
    const { fetchImpl, calls } = makeFetch();
    const conn = {
      siteName: "mystore",
      shopifyClientId: "id",
      shopifyClientSecret: "secret",
      blogId: 123,
      author: "House Author",
    };
    const article = { title: "Announcing X", html: "<p>News.</p>", status: "published" };
    const res = await publish(article, conn, { fetchImpl });

    const createCall = calls.find((c) => /\/blogs\/123\/articles\.json$/.test(c.url) && c.method === "POST");
    const body = JSON.parse(createCall.opts.body).article;
    assert.strictEqual(body.published, true, "non-draft -> published:true");
    assert.strictEqual(body.author, "House Author", "falls back to conn.author");
    assert.ok(!("tags" in body), "no tags key when article has none");
    assert.ok(!("image" in body), "no image key when no featured image");
    assert.strictEqual(res.status, "published");
    assert.strictEqual(res.publishedUrl, "https://mystore.myshopify.com/blogs/123/my-first-post");
  }

  // (5) update() PUTs to the article id with the mutated payload.
  {
    const { fetchImpl, calls } = makeFetch();
    const conn = {
      siteName: "mystore",
      shopifyClientId: "id",
      shopifyClientSecret: "secret",
      blogId: 123,
      blogHandle: "news",
    };
    const article = {
      title: "How to Bake Sourdough (v2)",
      author: "Jane Writer",
      html: "<p>Updated.</p>",
      status: "published",
    };
    const res = await update(999, article, conn, { fetchImpl });

    const putCall = calls.find((c) => c.method === "PUT");
    assert.ok(putCall, "issues a PUT");
    assert.strictEqual(putCall.url, "https://mystore.myshopify.com/admin/api/2024-10/blogs/123/articles/999.json");
    const body = JSON.parse(putCall.opts.body).article;
    assert.strictEqual(body.id, 999, "includes the article id in the payload");
    assert.strictEqual(body.body_html, "<p>Updated.</p>");
    assert.strictEqual(body.published, true);
    assert.strictEqual(res.cmsPostId, 999);
    assert.strictEqual(res.status, "published");
  }

  console.log("Shopify publisher checks passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
