"use strict";

// Git-based publisher for Astro content collections (and any static site whose
// posts live as Markdown/MDX files in a GitHub repo). There is no CMS API: to
// "publish" we commit a Markdown file to the repo and let the static host rebuild.
//
// Mirrors the other providers (keywords.js / llm.js): a factory that returns
// null when the connection is unusable or an object of methods; every network
// method accepts an injected transport ({ fetchImpl = fetch }) and throws when
// response.ok === false. No new dependencies — built-in fetch + Buffer only.

const API_BASE = "https://api.github.com";
const API_VERSION = "2022-11-28";
const USER_AGENT = "SirBloggsAlot";

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": USER_AGENT,
  };
}

function makeError(message, status, code) {
  const error = new Error(message);
  error.provider = "astro";
  error.status = status;
  error.code = code;
  return error;
}

async function ensureOk(response, label) {
  if (response.ok === false) {
    const detail = typeof response.text === "function" ? await response.text().catch(() => "") : "";
    throw makeError(`${label} failed (${response.status}). ${String(detail).slice(0, 200)}`.trim(), response.status, "http_error");
  }
  return response;
}

// Encode a repo-relative path for the contents API: encode each segment but keep
// the slashes between them.
function encodePath(filePath) {
  return String(filePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

function normalizeConn(conn = {}) {
  let contentDir = String(conn.contentDir || "src/content/blog/").replace(/^\/+/, "");
  if (!contentDir.endsWith("/")) contentDir += "/";
  return {
    githubToken: conn.githubToken || "",
    repoOwner: conn.repoOwner || "",
    repoName: conn.repoName || "",
    branch: conn.branch || "main",
    contentDir,
    commitMode: conn.commitMode === "pr" ? "pr" : "direct",
    authorName: conn.authorName || "",
    authorEmail: conn.authorEmail || "",
  };
}

function slugify(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "post";
}

// Safe double-quoted YAML scalar: JSON string quoting is a valid YAML flow
// scalar and escapes quotes/backslashes/newlines for us.
function yamlScalar(value) {
  return JSON.stringify(String(value));
}

// Build the Markdown file (Astro content-collection frontmatter + body) and its
// repo path. Frontmatter fields match Astro's content collections:
// { title, description, pubDate, slug, heroImage, tags, draft, author }.
function buildMarkdownFile(article = {}, conn) {
  const c = normalizeConn(conn);
  const slug = String(article.slug || slugify(article.title));
  const tags = Array.isArray(article.tags) ? article.tags.filter(Boolean) : [];

  const lines = ["---"];
  lines.push(`title: ${yamlScalar(article.title || "")}`);
  if (article.excerpt) lines.push(`description: ${yamlScalar(article.excerpt)}`);
  if (article.date) lines.push(`pubDate: ${yamlScalar(article.date)}`);
  lines.push(`slug: ${yamlScalar(slug)}`);
  if (article.featuredImageUrl) lines.push(`heroImage: ${yamlScalar(article.featuredImageUrl)}`);
  if (tags.length) lines.push(`tags: [${tags.map(yamlScalar).join(", ")}]`);
  lines.push(`draft: ${article.status === "draft" ? "true" : "false"}`);
  if (article.author) lines.push(`author: ${yamlScalar(article.author)}`);
  lines.push("---");

  const body = String(article.markdown || article.html || "");
  const content = `${lines.join("\n")}\n\n${body}\n`;
  const path = `${c.contentDir}${slug}.md`;
  return { slug, path, content };
}

function toBase64(text) {
  return Buffer.from(String(text), "utf8").toString("base64");
}

// --- low-level GitHub REST calls (each throws on !ok) ------------------------

async function getRepo(conn, fetchImpl) {
  const response = await fetchImpl(`${API_BASE}/repos/${conn.repoOwner}/${conn.repoName}`, {
    headers: ghHeaders(conn.githubToken),
  });
  if (response.status === 401) throw makeError("GitHub authentication failed — check the fine-grained token.", 401, "unauthorized");
  if (response.status === 404) throw makeError(`GitHub repo ${conn.repoOwner}/${conn.repoName} not found or token lacks access.`, 404, "not_found");
  await ensureOk(response, "GitHub repo lookup");
  return response.json();
}

// GET the file to read its blob sha; null when the file does not yet exist.
async function getFileSha(conn, filePath, ref, fetchImpl) {
  const url = `${API_BASE}/repos/${conn.repoOwner}/${conn.repoName}/contents/${encodePath(filePath)}?ref=${encodeURIComponent(ref)}`;
  const response = await fetchImpl(url, { headers: ghHeaders(conn.githubToken) });
  if (response.status === 404) return null;
  await ensureOk(response, "GitHub contents read");
  const data = await response.json();
  return (data && data.sha) || null;
}

async function putContents(conn, { filePath, content, message, sha, branch }, fetchImpl) {
  const body = { message, content, branch };
  if (sha) body.sha = sha;
  if (conn.authorName && conn.authorEmail) {
    body.committer = { name: conn.authorName, email: conn.authorEmail };
  }
  const url = `${API_BASE}/repos/${conn.repoOwner}/${conn.repoName}/contents/${encodePath(filePath)}`;
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: { ...ghHeaders(conn.githubToken), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await ensureOk(response, "GitHub contents write");
  const data = await response.json();
  const contentInfo = (data && data.content) || {};
  const commitInfo = (data && data.commit) || {};
  return {
    path: contentInfo.path || filePath,
    sha: contentInfo.sha || null,
    commitSha: commitInfo.sha || null,
    htmlUrl: contentInfo.html_url || null,
  };
}

// Create a new branch (ref) from the tip of `base`; returns the base commit sha.
async function createBranch(conn, base, newBranch, fetchImpl) {
  const refUrl = `${API_BASE}/repos/${conn.repoOwner}/${conn.repoName}/git/ref/heads/${encodeURIComponent(base)}`;
  const refResponse = await fetchImpl(refUrl, { headers: ghHeaders(conn.githubToken) });
  await ensureOk(refResponse, "GitHub get ref");
  const refData = await refResponse.json();
  const baseSha = refData && refData.object && refData.object.sha;
  if (!baseSha) throw makeError(`Could not resolve base branch ${base}.`, 422, "no_base_sha");

  const createResponse = await fetchImpl(`${API_BASE}/repos/${conn.repoOwner}/${conn.repoName}/git/refs`, {
    method: "POST",
    headers: { ...ghHeaders(conn.githubToken), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
  });
  await ensureOk(createResponse, "GitHub create ref");
  return baseSha;
}

async function openPullRequest(conn, { base, head, title, body }, fetchImpl) {
  const response = await fetchImpl(`${API_BASE}/repos/${conn.repoOwner}/${conn.repoName}/pulls`, {
    method: "POST",
    headers: { ...ghHeaders(conn.githubToken), "Content-Type": "application/json" },
    body: JSON.stringify({ title, head, base, body }),
  });
  await ensureOk(response, "GitHub create pull request");
  const data = await response.json();
  return { number: data.number, htmlUrl: data.html_url || null };
}

function commitMessage(article, slug, isUpdate) {
  if (article && article.commitMessage) return String(article.commitMessage);
  const verb = isUpdate ? "Update" : "Add";
  return `${verb} blog post: ${(article && article.title) || slug}`;
}

function createAstro(conn) {
  const base = normalizeConn(conn);
  if (!base.githubToken || !base.repoOwner || !base.repoName) return null;

  return {
    provider: "astro",

    async validate(connArg = base, { fetchImpl = fetch } = {}) {
      const c = normalizeConn(connArg);
      const repo = await getRepo(c, fetchImpl);
      return {
        ok: true,
        repo: {
          id: repo.id,
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
          private: repo.private,
        },
      };
    },

    async publish(article, connArg = base, { fetchImpl = fetch } = {}) {
      const c = normalizeConn(connArg);
      const { slug, path, content } = buildMarkdownFile(article, c);
      const encoded = toBase64(content);

      if (c.commitMode === "pr") {
        const prBranch = (article && article.prBranch) || `post/${slug}-${Date.now()}`;
        await createBranch(c, c.branch, prBranch, fetchImpl);
        const existingSha = await getFileSha(c, path, prBranch, fetchImpl);
        const message = commitMessage(article, slug, Boolean(existingSha));
        const written = await putContents(c, { filePath: path, content: encoded, message, sha: existingSha, branch: prBranch }, fetchImpl);
        const pr = await openPullRequest(c, {
          base: c.branch,
          head: prBranch,
          title: message,
          body: (article && article.excerpt) || `Publishes ${slug}.`,
        }, fetchImpl);
        return {
          cmsPostId: { path: written.path, sha: written.sha, branch: prBranch, pullRequestNumber: pr.number, pullRequestUrl: pr.htmlUrl },
          publishedUrl: null,
          status: "committed",
        };
      }

      const existingSha = await getFileSha(c, path, c.branch, fetchImpl);
      const message = commitMessage(article, slug, Boolean(existingSha));
      const written = await putContents(c, { filePath: path, content: encoded, message, sha: existingSha, branch: c.branch }, fetchImpl);
      return {
        cmsPostId: { path: written.path, sha: written.sha },
        publishedUrl: null,
        status: "committed",
      };
    },

    async update(idOrPath, article, connArg = base, { fetchImpl = fetch } = {}) {
      const c = normalizeConn(connArg);

      let path;
      let sha;
      if (idOrPath && typeof idOrPath === "object") {
        path = idOrPath.path;
        sha = idOrPath.sha;
      } else if (typeof idOrPath === "string" && idOrPath) {
        path = idOrPath;
      }
      if (!path) path = buildMarkdownFile(article, c).path;
      if (!sha) sha = await getFileSha(c, path, c.branch, fetchImpl);
      if (!sha) throw makeError(`Cannot update ${path}: file not found on ${c.branch}.`, 404, "not_found");

      const { content } = buildMarkdownFile(article, c);
      const encoded = toBase64(content);
      const message = commitMessage(article, path, true);
      const written = await putContents(c, { filePath: path, content: encoded, message, sha, branch: c.branch }, fetchImpl);
      return {
        cmsPostId: { path: written.path, sha: written.sha },
        publishedUrl: null,
        status: "committed",
      };
    },
  };
}

module.exports = { createAstro, buildMarkdownFile };
