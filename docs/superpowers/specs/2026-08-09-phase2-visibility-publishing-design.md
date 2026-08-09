# Blawgy Parity — Phase 2 Design: Visibility & Publishing

**Date:** 2026-08-09
**Goal (overall):** Make SirBloggsAlot (SBA) a functional mirror of Blawgy; the only intended differences are branding and where Stripe payments go.
**This spec covers Phase 2:** turn two faked subsystems real — (A) **Google Search Console** as the first *visibility* integration, and (B) **CMS publishing** so generated articles actually reach the customer's site (WordPress + Shopify first, then Webflow + Astro). Real **rank tracking** rides on GSC data as a P1 follow-on. Commerce (Stripe), AI-mentions, assistant, and platform hardening (SQLite, dedicated user, CI) remain **out of scope** (later phases).

Builds directly on Phase 1 (shipped + live): the SPA is the product surface, cookie-only auth, real providers (`scrape`/`keywords`/`llm=codex`) behind `lib/providers/` with graceful degradation. Phase 2 extends that exact seam. See `2026-08-08-blawgy-parity-phase1-design.md`.

---

## 1. Locked decisions

- **First visibility integration:** Google Search Console (GSC). Rank tracking comes *from* GSC (your own property, free) before any paid SERP source.
- **CMS targets (priority):** WordPress (P0), Shopify (P0), Webflow (P1), **Astro** (P1, git-based — this is the "Astral" ask; confirm at key-time). Framer/Wix stay P2 (leave existing stubs).
- **Provider pattern:** reuse Phase 1's `createX(env) → null when unconfigured`, injectable `fetchImpl`, throw-on-non-ok, and **graceful degradation** to today's placeholder. No new npm deps unless a platform SDK is unavoidable (prefer built-in `fetch`).
- **Draft-first:** every first publish honors the SPA's existing global `settings.draft` toggle.
- **Security is in-scope, not deferred:** stop leaking tokens/secrets to the browser (current bug), encrypt refresh tokens at rest.

## 2. The parity gap (as-built)

The **SPA is already written for the real flows** — only the backend is hollow.

**GSC (`lib/blawgy-compat.js`):** entirely simulated. `POST /gsc/connect` mints a fake `local_gsc_<sha1>` token (:1750); `gscRows()` fabricates clicks/impressions/CTR/position and **ignores the requested date range** (:1022); `GET /gsc/sites/:token` returns one hardcoded `sc-domain` property (:1746); `GET /gsc/data` only gates on token truthiness (:1741). **The real OAuth callback the SPA sends Google to — `/gsc/oauth2callback` — does not exist**; the SPA (`ReportsPage.js`) already redirects to `accounts.google.com` with `webmasters.readonly + access_type=offline + prompt=consent`, then branches on `?select_domain=true&token=… | ?connected=true | ?error=…`, makes three `/gsc/data` calls (date|page|query), and distinguishes `401 {needsReconnect:true}` from a plain `401`. `apiClient.js` deliberately **exempts `/gsc/*` from the global 401 auto-reauth** so GSC owns its reconnect UX.

**CMS (`lib/blawgy-compat.js`):** entirely faked. `/test-connection` always returns success and just stores pasted creds (:1403); `/shopify/blogs` (:1635), `/wix/details` (:1636), `/framer/collections` (:1637), `/webflow/fields` (:1638) return hardcoded stubs (and `/shopify/blogs` + `/wix/details` return the **wrong shape**, so those dropdowns are silently empty today); every publish path (`/publish-draft`, `/republish-article` :1712; `PATCH /api/article-builder/drafts/:id/publish` :2206; `runArticleJob` :2546) just flips `blogStatus='published'` and mints a fabricated `https://{site}/blog/{slug}` URL. Media (`/upload-image`, `/generate-featured-image` :1647) all return one static placeholder PNG.

**Rankings:** `rankingRows()` fabricates `position = 6 + index` (:1186), never persisted; `availableSources:['local','gsc']` advertises a GSC source that has no real path.

**Security debt to fix here:** `publicSiteSettings` returns the **raw GSC token** (:944) and **raw CMS secrets** — `apiToken`, `appPassword`, `authToken`, `shopifyClientSecret`, `framerApiKey` (:988-999) — to the browser.

## 3. Architecture

### 3.1 New provider modules (mirror `lib/providers/{keywords,llm}.js`)
```
lib/providers/
  gsc.js                     # OAuth code exchange / refresh / sites.list / searchanalytics.query / revoke
  publishers/
    index.js                 # createPublishers(env); resolve per-site by settings.blogType
    wordpress.js             # REST API v2 + Application Password
    shopify.js               # Admin API blogs/articles + custom-app token
    webflow.js               # CMS API v2 + field map
    astro.js                 # git commit MDX to GitHub repo (net-new)
  media.js                   # durable upload (S3/R2) — prerequisite for real publish
```
Each returns `null` when unconfigured; `blawgy-compat.js`'s existing `activeProviders` + `serveProviderRoute` (:2851) real-first/placeholder-fallback seam plugs them in, so a site with no/invalid creds keeps today's local-only behavior.

### 3.2 CRITICAL constraint — the SPA is a vendored compiled bundle
The served SPA is `static/js/main.715d1cb0.local.js` (built by `scripts/prepare-blawgy-local-app.js` from the discovery tree). We **cannot edit React source and rebuild** it cleanly. Two SPA-side facts must therefore be handled by **patching the bundle string** in `prepare-blawgy-local-app.js` (there is precedent — it already produces a *patched* `.local.js`):
- `ReportsPage.js:589-599` hardcodes **Blawgy's GSC client id `751735189062-…` and `app.blawgy.com`**. We can't register `app.blawgy.com` on our OAuth client. **Fix:** patch the bundle so "connect GSC" hits our server route **`GET /gsc/connect/start`** (server builds the authorize URL with *our* client id + signed state), OR string-replace the client id + origin. The server-route approach is strongly preferred (keeps client id/secret + CSRF state server-side).
- Any other `app.blawgy.com` / Blawgy-domain references in GSC/CMS flows get the same treatment. **Action:** audit the bundle for `blawgy.com` and `751735189062` during 2a.

This bundle-patch step is the single biggest execution risk in Phase 2 and must be spiked first.

## 4. Work breakdown

### 4.1 (2a) GSC — real OAuth + Search Analytics (P0)
**Provider `lib/providers/gsc.js`:** `createGsc(env)` → null unless `SIR_BLOGGS_GSC_CLIENT_ID` + `SIR_BLOGGS_GSC_CLIENT_SECRET` set. Methods (inject `fetchImpl`, throw on non-ok):
- `exchangeCode(code, redirectUri)` → `{access_token, refresh_token, expiry}` (`POST https://oauth2.googleapis.com/token`, `grant_type=authorization_code`)
- `refresh(refresh_token)` → new access token (`grant_type=refresh_token`)
- `listSites(access_token)` → `GET https://www.googleapis.com/webmasters/v3/sites`
- `searchAnalytics(access_token, property, {startDate,endDate,dimensions,rowLimit})` → `POST …/sites/{encodedProperty}/searchAnalytics/query` (Google returns exactly `{keys,clicks,impressions,ctr,position}` — no reshaping)
- `revoke(token)` → `POST https://oauth2.googleapis.com/revoke`

Register in `lib/providers/index.js` as `gsc` + `gscAvailable`.

**Routes (`blawgy-compat.js`):**
- **NEW** `GET /gsc/connect/start?site=<site>` → 302 to Google authorize URL with our `client_id`, `redirect_uri=<origin>/gsc/oauth2callback`, `scope=webmasters.readonly`, `access_type=offline`, `prompt=consent`, `state=<HMAC({site,userId,nonce}) using SIR_BLOGGS_AUTH_SESSION_SECRET>`.
- **NEW** `GET /gsc/oauth2callback` → **direct `res` 302** (like the `/api/branding` direct-write path, not `sendJson`). Verify `state`, `exchangeCode`, `listSites`, stash `{tokens, sites, userId, blawgySite}` in a short-TTL (~10 min) single-use `selectionToken` map. Redirect to the SPA reports route with `?connected=true` (single owned property → auto-persist), `?select_domain=true&token=<selectionToken>` (multiple), or `?error=<code>`.
- `GET /gsc/sites/:token` (:1746) → return the stash's real `sites` (`displayName`, `url` = `sc-domain:…`|URL-prefix, `permissionLevel`); filter out `siteUnverifiedUser`.
- `POST /gsc/connect` (:1750) → validate `selectedGscSite` ∈ stash, persist `site.settings.gsc = {access_token, refresh_token(encrypted), expiry, connected_at, connected_site, propertyUrl, property_type}`; delete stash; return **redacted** gsc.
- `POST /gsc/disconnect` (:1761) → `gsc.revoke()` then null the record (tolerate revoke failure).
- `GET /gsc/data` (:1741) → parse `filters[startDate]/[endDate]/[dimensions]/[limit]` (**must read the dates the stub ignores**), refresh the token if expired (persist new token), call `searchAnalytics`, return `{success, rows, connectedSite}`. On `invalid_grant`/refresh failure → **`401 {needsReconnect:true}`**; on revoked → plain `401` (SPA handles both).

**Security:** `publicSiteSettings` (:944) emits `gsc = {connected:true, access_token:'connected'(marker), connected_at, connected_site, propertyUrl}` — never the real token; `refresh_token` never leaves the server, AES-256-GCM encrypted at rest with `SIR_BLOGGS_GSC_TOKEN_KEY`.

### 4.2 (2b) CMS publishers (P0: WordPress, Shopify — P1: Webflow, Astro)
`createPublishers(env)` + per-site dispatch by `settings.blogType`. Each exposes `validate()` (real read-only round-trip), `publish({title,html,excerpt,slug,featuredImage,contextualImages,tags,date,draft}) → {cmsPostId, publishedUrl, status}`, `update(cmsPostId, …)`. Invoke from the four publish sites (`runArticleJob` :2546, `/publish-draft` + `/republish-article` :1712, `PATCH …/drafts/:id/publish` :2206). Persist `cmsPostId` + the **real** returned `publishedUrl` on the plan entry (replace fabricated URL :1719) so republish updates instead of duplicating.

- **WordPress (P0):** base `https://{site}/wp-json/wp/v2`. Auth = Basic `base64(username:appPassword)` over HTTPS. `validate`: `GET /users/me?context=edit`. Media: `POST /media` → `featured_media` + `source_url` (rewrite in-body `<img>`). Categories: `GET|POST /categories?slug=`. Create: `POST /posts {title,content,excerpt,slug,status(draft|publish|future),featured_media,categories}`; `link`→publishedUrl, `id`→cmsPostId. Republish: `POST /posts/{id}`.
- **Shopify (P0):** custom app per store (the 2026 flow the SPA already documents in `SettingsPage.js`), scopes `write_content,read_content,read_products`. Exchange `shopifyClientId/Secret` → Admin API token (`client_credentials`); legacy sites may pass `authToken`. `validate` + dropdowns: `GET /admin/api/{ver}/blogs.json` — and **fix `/shopify/blogs` to return `{data:[blogs], authors:[]}`** to match the SPA. Create: `POST /admin/api/{ver}/blogs/{categoryId}/articles.json {article:{title,author,body_html,tags,published:(!draft),image}}`. Prefer GraphQL `articleCreate` where REST is deprecated. `publishedUrl = https://{store}/blogs/{blog}/{article}`.
- **Webflow (P1):** base `https://api.webflow.com/v2`, Bearer `apiToken` (`cms:read/write`). **Fix `/webflow/fields`** to return the real collection schema (`GET /v2/collections/{id}` → `fields[]`) so `WebflowFieldMapper` maps live fields. Apply `settings.fields` map. Images = hosted URL (upload to our media store first, or `POST /v2/sites/{id}/assets`). Create: `POST /v2/collections/{id}/items {isDraft, fieldData}`; live → `POST /items/publish`. Update: `PATCH /items/{id}`.
- **Astro / "Astral" (P1, net-new):** no CMS API — publish = commit MDX to the site's GitHub repo; the static host rebuilds. **Add an `astro` blogType + credential form to the SPA** (not in `SettingsPage.js` today). Creds: fine-grained GitHub PAT (`contents:write` on one repo) or GitHub App token; `repoOwner, repoName, branch, contentDir (e.g. src/content/blog/), commitMode(direct|pr), authorName/email`. Frontmatter matches Astro content collections (`title, description, pubDate, slug, heroImage, tags, draft, author`); body = HTML→Markdown. File `{contentDir}/{slug}.md(x)`. Atomic commit via Git Data API (blobs→tree→commit→update ref); simple case `PUT /repos/{o}/{r}/contents/{path}`. Draft-first → `commitMode:'pr'` (`POST /pulls`) or `draft:true`. Media committed to `public/images/blog/{slug}/` in the same commit.

### 4.3 (2c) Real `/test-connection` + fix metadata contracts (P0)
Rewrite `/test-connection` (:1403) to delegate to the resolved publisher's `validate()` → structured errors (`401` bad creds, `403` missing scope, `404` wrong store/collection/repo, `200` only on a live round-trip); keep persisting creds. Fix the shape mismatches: `/shopify/blogs` → `{data,authors}`, `/wix/details` → `{data:{members,sites}}`, `/webflow/fields` → real schema. Keep returning `collections` for Framer (the SPA uses it as the picker source).

### 4.4 (2d) Durable media pipeline (P1, prerequisite for real publish)
Replace the placeholder-PNG stub (:1647) with real image generation + upload to durable object storage (S3 or Cloudflare R2), returning the real hosted URL. Publishers then upload bytes to the CMS (WordPress media, Shopify attachment) or reference the hosted URL (Webflow, Astro). Rewrite in-article `<img src>` to final URLs before publish. Env: `MEDIA_S3_BUCKET/REGION/ACCESS_KEY/SECRET` (or R2 equivalents).

### 4.5 (2e) Rank tracking from GSC (P1)
Persist `site.rankings = {source, asOf, history:[{date, rows:[{keyword,position,previousPosition,volume,url}]}]}` (reuse the Phase-1 `keywordResearch` 24h-freshness pattern). Wire the `'gsc'` source (:2051, `SiteRankingsTable`) to `gsc.searchAnalytics(dimensions:['query'])`/`['page']` so "Google (your data)" shows real positions. `'local'` source falls back to the DataForSEO/keywords provider (P2, once keys land). Serve `/api/keyword-research/:site/rankings` + `/api/seo/snapshot` from the store with real `asOf`/`stale`.

### 4.6 (2f) Security hardening (P0, cross-cutting)
`publicSiteSettings` (:944-1006): stop returning raw `access_token`, `apiToken`, `appPassword`, `authToken`, `shopifyClientSecret`, `framerApiKey`. Return masked values or `hasX` presence flags (mirror `cmsUtils.hasWordPressConnection`); credential inputs become write-only. Encrypt GSC refresh tokens at rest.

## 5. Data model (Phase 2 stays on the JSON store; SQLite is Phase 4)
Extend `data/blawgy-store.json` per site:
- `settings.gsc`: add `refresh_token(encrypted), expiry, scope, tokenType, property_type`.
- `settings.cmsConnections[blogType] = {verified, verifiedAt, lastError, externalBlogId, externalCollectionId, fieldMap}`.
- `site.rankings = {source, asOf, history:[…]}`.
- Plan entry gains `publish = {target, cmsPostId|{path,sha}, publishedUrl, status, publishedAt, error}` (replaces fabricated URL).

## 6. Config / secrets (mirror to `~/.env` + Obsidian + creds GDoc + project `.env` per policy)
- **GSC (server-side):** `SIR_BLOGGS_GSC_CLIENT_ID`, `SIR_BLOGGS_GSC_CLIENT_SECRET` (distinct from the login-only `SIR_BLOGGS_GOOGLE_CLIENT_ID`), `SIR_BLOGGS_GSC_TOKEN_KEY` (32-byte AES). Google Cloud: enable **Search Console API**, OAuth consent screen with `webmasters.readonly` (sensitive → verification or test users), redirect URIs `https://sirbloggsalot.com/gsc/oauth2callback` + `http://localhost:8080/gsc/oauth2callback`.
- **CMS (per-site, user-supplied via Settings):** WordPress `username`+`appPassword`; Shopify `siteName`+`shopifyClientId`+`shopifyClientSecret`(+`categoryId`,`author`); Webflow `apiToken`+`collectionId`+`fields`; Astro GitHub PAT + repo config.
- **Media (server-side):** `MEDIA_S3_BUCKET/REGION/ACCESS_KEY/SECRET` (or R2).

## 7. Verification / testing
- **Automated (`npm run check` extended), no live calls:** provider unit tests with recorded fixtures (mock Google token + searchanalytics, mock WP/Shopify/Webflow/GitHub responses via injected `fetchImpl`). Add: a GSC OAuth-flow smoke (start→callback→sites→connect→data, mocked); a per-publisher publish smoke asserting the real request shape + that `publishedUrl`/`cmsPostId` persist; a redaction test proving `publicSiteSettings` emits no raw token/secret.
- **Live acceptance (manual, real keys):** connect a real GSC property → `/reports` shows real clicks/impressions/position; publish a generated article to a real WordPress + Shopify (draft-first) and confirm it appears in the CMS with correct media; repeat for Webflow + Astro. Mirror against live Blawgy where behavior parity matters.
- **Exit criteria:** from the live SPA, a user connects Search Console (real data in Reports), and a generated article publishes to their connected CMS as a real draft with a working URL and correct featured image.

## 8. Sequencing & delivery
1. **Spike the bundle patch (2a prerequisite):** prove we can make the SPA's GSC connect hit `/gsc/connect/start` (patch in `prepare-blawgy-local-app.js`). If infeasible, fall back to string-replacing the client id + origin. **Gate the rest of GSC on this.**
2. 2a GSC end-to-end → 2f redaction (ship together; redaction is required the moment tokens are real).
3. 2d media → 2b WordPress → 2b Shopify → 2c real test-connection (P0 publish set).
4. 2b Webflow → 2b Astro (P1) → 2e rank tracking (P1).
- Branch `feat/blawgy-parity-phase2` off Phase-1 HEAD; commit per sub-phase, `npm run check` green each step; deploy via the same `git archive HEAD` + backup + env + restart flow; **prod deploy is an explicit go/no-go** (GSC + publishing touch third parties). Remember the cache-buster: bump `index.html`'s `?v=` on any `app.js`/bundle change.

## 9. Out of scope (later phases)
- **Phase 3 — Commerce & polish:** real Stripe → the user's account, AI-mentions, assistant (LLM tool-calling), Framer/Wix real publish, PostHog, email/password + magic-link login parity, DataForSEO SERP (absolute rank).
- **Phase 4 — Platform:** JSON→SQLite, dedicated `sirbloggsalot` service user + idempotent deploy, CI parity gate, observability, codex-on-EC2 durability.

## 10. Open items (confirm at key-time)
- **"Astral" = Astro?** Confirm before building the git-based publisher (materially different from a CMS API). If it's a different platform, re-scope 2b's fourth adapter.
- **GSC app verification:** `webmasters.readonly` is a sensitive scope — decide test-users (fast, limited) vs full Google verification (needed for public GA). Affects launch timing.
- **Media store:** S3 vs Cloudflare R2 (R2 = no egress fees, fits the Cloudflare tooling already in the environment).
- **Shopify/Webflow model:** per-user creds (spec'd) vs one distributed app (`SHOPIFY_APP_*` / Webflow OAuth) — per-user is simpler to ship first.
- **Astro auth:** fine-grained PAT (simplest) vs a GitHub App (better for many customers later).
