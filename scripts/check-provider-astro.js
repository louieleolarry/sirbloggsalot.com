"use strict";

// Unit smoke test for the git-based Astro publisher (lib/providers/publishers/astro.js).
//
// Runs with ZERO real network: every GitHub REST call is driven through an
// injected fetchImpl that routes on method+path and returns canned responses,
// recording each request so we can assert exactly what was sent.
//
// Run: node scripts/check-provider-astro.js

const assert = require("assert");
const { createAstro } = require("../lib/providers/publishers/astro");

function res(status, jsonBody) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return jsonBody; },
    async text() { return JSON.stringify(jsonBody); },
  };
}

// Fake GitHub: routes on method + pathname, records every request.
// `existingSha` controls whether GET /contents reports a pre-existing file.
function fakeGithub({ existingSha = null } = {}) {
  const requests = [];
  async function fetchImpl(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const parsed = new URL(url);
    const path = parsed.pathname;
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ url, method, path, headers: options.headers || {}, body });

    // Repo metadata (validate).
    if (method === "GET" && /^\/repos\/[^/]+\/[^/]+$/.test(path)) {
      return res(200, { id: 123, full_name: "acme/blog", default_branch: "main", private: true });
    }
    // Get a ref (base branch tip) for PR mode.
    if (method === "GET" && /\/git\/ref\/heads\//.test(path)) {
      return res(200, { object: { sha: "basesha123" } });
    }
    // Create a ref (new PR branch).
    if (method === "POST" && /\/git\/refs$/.test(path)) {
      return res(201, { ref: body.ref, object: { sha: body.sha } });
    }
    // Read file contents (sha detection).
    if (method === "GET" && /\/contents\//.test(path)) {
      if (existingSha) {
        const rel = decodeURIComponent(path.split("/contents/")[1]);
        return res(200, { sha: existingSha, path: rel });
      }
      return res(404, { message: "Not Found" });
    }
    // Write file contents.
    if (method === "PUT" && /\/contents\//.test(path)) {
      const rel = decodeURIComponent(path.split("/contents/")[1]);
      return res(200, {
        content: { path: rel, sha: "newblobsha", html_url: `https://github.com/acme/blog/blob/${body.branch}/${rel}` },
        commit: { sha: "commitsha456" },
      });
    }
    // Open a pull request.
    if (method === "POST" && /\/pulls$/.test(path)) {
      return res(201, { number: 42, html_url: "https://github.com/acme/blog/pull/42" });
    }
    return res(500, { message: `unrouted ${method} ${path}` });
  }
  return { fetchImpl, requests };
}

const CONN = {
  githubToken: "ghp_faketoken",
  repoOwner: "acme",
  repoName: "blog",
  authorName: "Sir Bloggsalot",
  authorEmail: "bloggs@example.com",
};

const ARTICLE = {
  title: "My First Post",
  excerpt: "A short summary.",
  date: "2026-08-09",
  slug: "my-post",
  featuredImageUrl: "https://cdn.example.com/hero.png",
  tags: ["seo", "astro"],
  status: "published",
  author: "Sir Bloggsalot",
  markdown: "# Hello\n\nBody text here.",
};

function findPut(requests) {
  const put = requests.find((r) => r.method === "PUT" && r.path.includes("/contents/"));
  assert.ok(put, "a PUT to /contents/ must have been made");
  return put;
}

function decodeContent(putReq) {
  return Buffer.from(putReq.body.content, "base64").toString("utf8");
}

async function main() {
  // 1. Factory returns null when required conn fields are missing.
  assert.strictEqual(createAstro({}), null, "empty conn -> null");
  assert.strictEqual(createAstro({ githubToken: "t", repoOwner: "o" }), null, "missing repoName -> null");
  assert.strictEqual(createAstro({ repoOwner: "o", repoName: "r" }), null, "missing token -> null");
  const astro = createAstro(CONN);
  assert.ok(astro && typeof astro.publish === "function", "full conn -> object with publish()");

  // 2. validate(): GET /repos/{o}/{r} -> { ok, repo }.
  {
    const gh = fakeGithub();
    const out = await astro.validate(CONN, { fetchImpl: gh.fetchImpl });
    assert.strictEqual(out.ok, true, "validate ok");
    assert.strictEqual(out.repo.fullName, "acme/blog", "validate parses full_name");
    assert.strictEqual(out.repo.defaultBranch, "main", "validate parses default_branch");
    assert.strictEqual(out.repo.private, true, "validate parses private");
    assert.strictEqual(out.repo.id, 123, "validate parses id");
    // Correct headers on the repo lookup.
    const req = gh.requests[0];
    assert.strictEqual(req.headers.Authorization, "Bearer ghp_faketoken", "Bearer auth header");
    assert.strictEqual(req.headers.Accept, "application/vnd.github+json", "Accept header");
    assert.strictEqual(req.headers["X-GitHub-Api-Version"], "2022-11-28", "API version header");
    assert.strictEqual(req.headers["User-Agent"], "SirBloggsAlot", "User-Agent header");
  }

  // 3. validate() throws typed errors on 401 and 404.
  {
    const unauthorized = async () => res(401, { message: "Bad credentials" });
    await assert.rejects(
      astro.validate(CONN, { fetchImpl: unauthorized }),
      (err) => err.status === 401 && err.code === "unauthorized" && err.provider === "astro",
      "401 -> typed unauthorized error"
    );
    const notFound = async () => res(404, { message: "Not Found" });
    await assert.rejects(
      astro.validate(CONN, { fetchImpl: notFound }),
      (err) => err.status === 404 && err.code === "not_found",
      "404 -> typed not_found error"
    );
  }

  // 4. publish() direct/new-file: builds frontmatter + path + base64 body, PUTs to contents.
  {
    const gh = fakeGithub({ existingSha: null });
    const out = await astro.publish(ARTICLE, CONN, { fetchImpl: gh.fetchImpl });
    assert.deepStrictEqual(
      out,
      { cmsPostId: { path: "src/content/blog/my-post.md", sha: "newblobsha" }, publishedUrl: null, status: "committed" },
      "publish return shape"
    );

    const put = findPut(gh.requests);
    // Correct path (default contentDir + slug + .md).
    assert.ok(put.url.includes("/contents/src/content/blog/my-post.md"), "PUT targets the correct contents path");
    assert.strictEqual(put.body.branch, "main", "PUT commits to default branch main");
    assert.strictEqual(put.body.sha, undefined, "new file -> no sha in PUT body");
    // committer derived from conn author fields.
    assert.deepStrictEqual(put.body.committer, { name: "Sir Bloggsalot", email: "bloggs@example.com" }, "committer set from conn");
    assert.ok(typeof put.body.message === "string" && put.body.message.includes("My First Post"), "commit message references title");

    // Frontmatter + body correctness (decode the base64 payload).
    const file = decodeContent(put);
    assert.ok(file.startsWith("---\n"), "file starts with YAML frontmatter");
    assert.ok(file.includes('title: "My First Post"'), "frontmatter title");
    assert.ok(file.includes('description: "A short summary."'), "frontmatter description<-excerpt");
    assert.ok(file.includes('pubDate: "2026-08-09"'), "frontmatter pubDate<-date");
    assert.ok(file.includes('slug: "my-post"'), "frontmatter slug");
    assert.ok(file.includes('heroImage: "https://cdn.example.com/hero.png"'), "frontmatter heroImage<-featuredImageUrl");
    assert.ok(file.includes('tags: ["seo", "astro"]'), "frontmatter tags");
    assert.ok(file.includes("draft: false"), "published article -> draft:false");
    assert.ok(file.includes('author: "Sir Bloggsalot"'), "frontmatter author");
    assert.ok(file.includes("---\n\n# Hello\n\nBody text here.\n"), "body follows frontmatter after blank line");
  }

  // 5. draft article -> draft:true.
  {
    const gh = fakeGithub();
    await astro.publish({ ...ARTICLE, status: "draft" }, CONN, { fetchImpl: gh.fetchImpl });
    const file = decodeContent(findPut(gh.requests));
    assert.ok(file.includes("draft: true"), "draft status -> draft:true");
  }

  // 6. publish() over an existing file includes the detected sha in the PUT.
  {
    const gh = fakeGithub({ existingSha: "oldsha999" });
    await astro.publish(ARTICLE, CONN, { fetchImpl: gh.fetchImpl });
    const put = findPut(gh.requests);
    assert.strictEqual(put.body.sha, "oldsha999", "existing file -> PUT includes detected sha");
  }

  // 7. update() with a known { path, sha } PUTs that sha and skips the GET.
  {
    const gh = fakeGithub();
    const out = await astro.update({ path: "src/content/blog/my-post.md", sha: "known123" }, ARTICLE, CONN, { fetchImpl: gh.fetchImpl });
    assert.strictEqual(out.status, "committed", "update returns committed");
    assert.deepStrictEqual(out.cmsPostId, { path: "src/content/blog/my-post.md", sha: "newblobsha" }, "update cmsPostId");
    assert.ok(!gh.requests.some((r) => r.method === "GET" && r.path.includes("/contents/")), "known sha -> no contents GET");
    const put = findPut(gh.requests);
    assert.strictEqual(put.body.sha, "known123", "update PUT carries the supplied sha");
  }

  // 8. update() with a string path GETs the sha first, then PUTs it.
  {
    const gh = fakeGithub({ existingSha: "detected777" });
    await astro.update("src/content/blog/my-post.md", ARTICLE, CONN, { fetchImpl: gh.fetchImpl });
    assert.ok(gh.requests.some((r) => r.method === "GET" && r.path.includes("/contents/")), "string path -> detects sha via GET");
    const put = findPut(gh.requests);
    assert.strictEqual(put.body.sha, "detected777", "update PUT carries the detected sha");
  }

  // 9. commitMode:'pr' creates a branch, PUTs to it, then opens a pull request.
  {
    const gh = fakeGithub();
    const out = await astro.publish(ARTICLE, { ...CONN, commitMode: "pr", branch: "main" }, { fetchImpl: gh.fetchImpl });
    assert.strictEqual(out.status, "committed", "PR publish committed");
    assert.strictEqual(out.cmsPostId.pullRequestNumber, 42, "PR number returned");
    assert.strictEqual(out.cmsPostId.pullRequestUrl, "https://github.com/acme/blog/pull/42", "PR url returned");
    assert.ok(typeof out.cmsPostId.branch === "string" && out.cmsPostId.branch.startsWith("post/my-post-"), "PR branch name");

    assert.ok(gh.requests.some((r) => r.method === "GET" && r.path.includes("/git/ref/heads/main")), "reads base ref");
    const createRef = gh.requests.find((r) => r.method === "POST" && r.path.endsWith("/git/refs"));
    assert.ok(createRef, "creates a new ref");
    assert.ok(createRef.body.ref.startsWith("refs/heads/post/my-post-"), "new ref name");
    assert.strictEqual(createRef.body.sha, "basesha123", "new ref points at base tip");

    const put = findPut(gh.requests);
    assert.strictEqual(put.body.branch, out.cmsPostId.branch, "PUT commits to the PR branch");

    const pull = gh.requests.find((r) => r.method === "POST" && r.path.endsWith("/pulls"));
    assert.ok(pull, "opens a pull request");
    assert.strictEqual(pull.body.base, "main", "PR base is main");
    assert.strictEqual(pull.body.head, out.cmsPostId.branch, "PR head is the new branch");
  }

  console.log("Astro publisher checks passed.");
}

main().catch((error) => {
  console.error("Astro provider check FAILED:", error.message);
  process.exit(1);
});
