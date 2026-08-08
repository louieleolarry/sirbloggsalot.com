# Blawgy Parity — Phase 1 Design

**Date:** 2026-08-08
**Goal (overall):** Make SirBloggsAlot (SBA) a functional mirror of the Blawgy SaaS (`app.blawgy.com`) such that the only intended differences are **branding** and **where Stripe payments go**.
**This spec covers Phase 1 only:** turn the vendored Blawgy SPA on safely, rebuild its auth onto SBA's real signed-cookie session, and make the core product loop **real** (onboarding → keyword research → content plan → article generation) using real providers (DataForSEO + a swappable LLM). Later phases (visibility/publishing, commerce, platform) are scoped at the end but **out of scope here**.

---

## 1. Locked decisions (from brainstorming)

- **Depth:** Real integrations (not simulated).
- **Surface:** Enable the reverse-engineered Blawgy SPA (`blawgy-app.html` + `/static` bundle + `lib/blawgy-compat.js`), rebuild its auth onto the real `sirbloggs_session` cookie, and retire reliance on the custom `index.html`/`app.js` dashboard as the product surface. Keep the `SIR_BLOGGS_ENABLE_BLAWGY_CLIENT` gate so the switch is deliberate.
- **Scope:** Phase 1 now (this run), iterate in later phases.
- **Billing:** Stub in Phase 1; real Stripe (to the user's account) in Phase 3.
- **LLM:** Swappable provider layer; whichever key is present in `.env` (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) is the one that runs.
- **Login parity:** Google-only for Phase 1 (SBA's existing Google → signed-cookie auth). Email/password + magic-link parity is a later task.
- **Dependencies:** Implement all provider clients with Node's built-in `fetch`/`https` — **no new npm dependencies** (prod is Node 18 with no `node_modules`; keep it that way in Phase 1).
- **Reference oracle:** The live Blawgy account (louieleolarry) plus the fully reverse-engineered client at `~/Documents/Blog Automation Discovery/research/blawgy/app-src`.

## 2. The parity gap (as-built)

SBA already has the **entire Blawgy UI** and **real file-backed CRUD** (`data/blawgy-store.json`) for accounts, sites, settings, the content-plan schedule, saved keywords, and saved articles. Two categories are missing:

1. **The SPA is off and forges an admin.** `blawgy-app.html` (lines 21–256) fabricates an `owner@sirbloggsalot.com` admin + a fake `Bearer local.<payload>.sig`, monkeypatches `fetch`/XHR to inject it, and only falls back to the real user if a cookie session happens to exist. The real Google→cookie auth (`server.js`) already works but the SPA ignores it. `SIR_BLOGGS_ENABLE_BLAWGY_CLIENT` is unset, so `index.html`/`app.js` is what actually serves.
2. **Every "external brain" is a canned placeholder** in `lib/blawgy-compat.js`:
   - `scrapedBusinessDescription` (233–244) never fetches the site — it returns a hardcoded plumbing paragraph or the stored description; favicon hardcoded.
   - Keyword research (`defaultClusters` 246–321; `/api/keyword-research/*`) invents every volume/KD/intent and even fakes DataForSEO telemetry (`dfsCalls:0`).
   - Article generation is the biggest gap: titles/outlines/sections are static strings, `/generate-full-article` emits one boilerplate `<p>` per section, and **`PUT /generate-blog/:id` (1643–1651) only flips `blogStatus:'in_queue'` and never writes content**, so queued plan articles never gain a body.
   - Plan `projection`/`runway` are hardcoded zeros.

**Therefore Phase 1 = (A) enable the SPA on cookie auth + kill the forged-admin/bearer-bypass, and (B) replace the three placeholder brains (scrape, keywords, LLM writing) with real providers behind the CRUD skeleton that already persists their output.**

## 3. Architecture

### 3.1 Request/auth flow (target)

```
Browser (Blawgy SPA)  --same-origin--> server.js
  - GET /api/auth/session  -> real user from sirbloggs_session cookie (HMAC-signed)
  - all /api/* + compat routes -> blawgy-compat.serve() -> readCompatUser()
        readCompatUser: cookie session ONLY (readSessionUser). Bearer branch removed.
```

Key point already true in code: `readCompatUser` (`blawgy-compat.js:859–888`) **prefers the real cookie session** (`readSessionUser`, line 860); the browser sends the HttpOnly cookie automatically on same-origin requests. The unverified-bearer fallback (863–887) is the only auth hole and is deleted.

### 3.2 New module layout (all zero-dependency, `fetch`-based)

```
lib/providers/
  llm.js        # provider-agnostic: generate(text|json) via Anthropic OR OpenAI REST, chosen by which key is set
  keywords.js   # DataForSEO client (HTTP Basic): volume/KD/ideas + clustering + per-site cache
  scrape.js     # server-side crawl: fetch homepage(+key pages), extract text, SSRF-guarded
  index.js      # capability detection + graceful-degradation wrapper (falls back to existing placeholder when a key is missing/call fails)
lib/jobs/
  article-worker.js  # in-process async queue that writes content for /generate-blog/:id entries
```

`lib/blawgy-compat.js` handlers stop returning canned data and instead call these providers; on missing key / provider error they **degrade to the current placeholder** (so dev without keys and partial-key states still work, mirroring Blawgy's own graceful degradation).

## 4. Work breakdown

### 4.1 (1a) Enable SPA on real cookie auth; remove forged admin + bearer bypass

**Client (`blawgy-app.html`):**
- Remove the fabricated identities: `fallbackUser`/`firstRunUser` admin defaults (30–44) and `userForCurrentRoute` fake logic (181–198). Never install a fake owner.
- Remove the forged bearer: `encodeBearerPayload` (62–65) and the bearer construction in `installLocalSession` (91–103).
- Remove the `fetch` + `XMLHttpRequest` Authorization-injection monkeypatches (200–231). Same-origin requests carry the cookie automatically; the bundle's own apiClient may still attach a benign `getIdToken()` value, which the server ignores.
- Keep a **minimal** Firebase-shaped `__BLAWGY_LOCAL_AUTH__`/`__BLAWGY_LOCAL_USER__` so the compiled bundle boots, but populate it **solely** from `GET /api/auth/session` (email/name/picture/role). `isAdmin` derives from the **server** session role only. `getIdToken()` returns a harmless opaque string (never trusted server-side).
- If `/api/auth/session` is unauthenticated → redirect to `/login` (render signed-out), not the fake admin.

**Server (`lib/blawgy-compat.js`):**
- Delete the unverified-bearer branch in `readCompatUser` (863–887). Authenticate strictly via `readSessionUser` (cookie). This is the load-bearing security fix.
- Ensure `SIR_BLOGGS_TRUST_BLAWGY_BEARER` is never set in any env.

**Enable + verify:**
- Flip `SIR_BLOGGS_ENABLE_BLAWGY_CLIENT=1` (local `.env`) **after** 1a–1e land; keep the gate so `index.html` remains the fallback.
- Update `scripts/check-blawgy-session-bridge.js` to stop setting `SIR_BLOGGS_TRUST_BLAWGY_BEARER=1` (line 20) so it exercises the **cookie** path; it already asserts the SPA reflects the real cookie user and isolates per-user settings.

### 4.2 (1b) Foundation store fix (prevents the historical flaky-login/EACCES class once the SPA writes account data)

- `server.js:31` — make the account-store path env-configurable: `process.env.SIR_BLOGGS_ACCOUNT_STORE_PATH || path.join(root,"data","account-store.json")`.
- Make GET account endpoints **read-only**: `GET /api/account/summary` and direct reads must not route through `accountForUser` → `mutateAccountStore` (`server.js:598–628`, `567–575`). Create the default account lazily only on first real mutation.
- Make account + auth store writes **atomic (tmp+rename) and serialized** with a queue, mirroring the pattern already in `blawgy-compat.js:26–42`.
- (Code only in Phase 1. Setting `SIR_BLOGGS_ACCOUNT_STORE_PATH` on prod + the durable deploy is Phase 4.)

### 4.3 (1c) Real onboarding scrape + intelligence

Replace the canned onboarding handlers with real work, keeping the exact endpoint contracts the SPA expects:
- `scrape.js`: fetch the entered domain's homepage (and a couple of obvious pages: `/about`, `/services` if present), extract readable text (strip tags/nav), read `<title>`/meta, resolve the real favicon URL. **SSRF-guarded** (see §7).
- `GET /scrape-site` (1547) and `GET /scrape-site/stream` (1548–1558, SSE): stream real progress events (`reading_homepage`, `analyzing`…) then a `result` event `{ productDescription, faviconUrl }`. Emit Blawgy's error events where applicable (`{ blockedDomain }`, `{ antibotBlock }`; `alreadyClaimed` stays a store check).
- `POST /research-competitors`, `POST /detect-business-type`, `POST /onboarding-suggestions`, `POST /onboarding/classify-input`, `POST /generate-description`: LLM calls grounded in the scraped text → competitors list, `{businessType,market,locations}`, `{audienceSuggestions,toneSuggestions}`, url-vs-description classification.
- `POST /onboarding/complete` (1562–1589) already persists correctly — unchanged.

### 4.4 (1d) Real keyword research (DataForSEO)

- `keywords.js`: DataForSEO client (HTTP Basic `DATAFORSEO_LOGIN:DATAFORSEO_PASSWORD`). Pull search volume, keyword difficulty, and keyword ideas for the site's seed terms; **cluster** into `{label, pillarKeyword, keywords:[{kw,volume,kd,intent,covered}]}`. Phase-1 clustering: pragmatic (group by shared head term / stem; LLM-assisted labels) — good enough to feed the plan; deeper SERP-overlap clustering can come later.
- Per-site **cache** in the store with freshness + `nextRunAllowedAt` (mirror Blawgy's monthly-limit behavior). Quick pass returns inline; deep pass runs in the in-process queue.
- Replace `defaultClusters` (246–321) consumers: `POST /api/keyword-research/onboarding-preview` (1957–1973), `GET /api/keyword-research/:site/clusters` (1975–2002), `/status`, `/kickoff`. Real `meta` telemetry (`dfsCalls`, `estimatedCost`) from actual calls.
- Cost guard: cap calls per run, cache aggressively, respect `nextRunAllowedAt`.

### 4.5 (1e) Real article generation (LLM) — including the async worker

- `llm.js`: one interface (`generateText`, `generateJSON`) implemented over Anthropic Messages API **or** OpenAI Chat Completions, selected by which key is set. Model overridable via `LLM_MODEL`.
- Wire real generation into: `/generate-article-titles`, `/generate-article-outline`, `/regenerate-article-outline`, `/generate-full-article`, `/regenerate-article-section`, `/generate-premises` — all grounded in the site's settings (business description, product, audience, tone) + target keyword.
- **`PUT /generate-blog/:id` (1643–1651):** enqueue an `article-worker` job. The worker: loads the plan entry (keyword/title), generates outline + full article + meta via `llm.js`, writes `blogContent` into the entry, flips `blogStatus` → `published` (or `ready`). The dashboard's existing poll on `GET /all-blog-posts` then advances the row. `GET /blog-content` (1359–1370) returns the real body.
- **Credit accounting:** decrement the site's article credits per generation (real CRUD). Balance source is **stubbed/generous** in Phase 1 (billing stubbed); real Stripe-driven balances arrive in Phase 3.
- Crash-safety: on startup, reset stale `in_queue` jobs (no active worker) so they can be retried rather than hanging forever.

### 4.6 (1f) Real content plan seeding + basic projections

- `POST /api/plan/:site/generate` (1869–1879) seeds entries from **real** keyword clusters (1d) instead of `defaultClusters`; schedule by `postsPerWeek × horizon`, spacing `publishDate`s. Keep the existing cannibalization firewall (intent-owned blocking) and dedupe by cluster label.
- `planPayload` `projection`/`runway` (1090–1091): replace the hardcoded zeros with a simple, honest estimate — projected monthly clicks from `Σ(volume × CTR(position≈target))` across planned entries, labeled as an estimate. Not a full traffic model (later phase).

## 5. Data model (Phase 1 stays on JSON stores)

Extend `data/blawgy-store.json` per site (SQLite migration is Phase 4):
- `keywordResearch`: `{ clusters, market, generatedAt, nextRunAllowedAt, provider:'dataforseo', dfsCalls, estimatedCost }`.
- Plan entries gain real `blogContent` on generation; existing shape preserved.
- `articleJobs` (or reuse entry `blogStatus`): track `in_queue`/`generating`/`published`/`failed` for the worker.
Account/auth stores get the atomicity fix from 1b (no shape change).

## 6. Config / secrets

New env (server-side only; never exposed to the SPA):
- `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
- `ANTHROPIC_API_KEY` **or** `OPENAI_API_KEY` (auto-detected), optional `LLM_MODEL`
- `SIR_BLOGGS_ACCOUNT_STORE_PATH` (prod), `SIR_BLOGGS_ENABLE_BLAWGY_CLIENT=1`
- optional crawl `SIR_BLOGGS_CRAWL_USER_AGENT`

Provided via the gitignored project `.env` (mirrored to the user's 4 secret stores per the standing secrets policy). Missing keys → the affected subsystem degrades to its existing placeholder + logs a warning; the app never hard-fails.

## 7. Error handling, resilience & security

- **Auth bypass killed:** cookie-only compat auth; no client-supplied role; secrets never sent to the browser.
- **SSRF guard on the scraper (required):** resolve the target hostname and **reject** private/loopback/link-local ranges (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`, cloud metadata `169.254.169.254`), reject non-`http(s)` schemes, cap redirects, cap response size, set a timeout. Only crawl the user-supplied public site.
- **Provider resilience:** timeouts + bounded retry/backoff; aggressive caching for DataForSEO (cost) and token caps for the LLM; graceful degradation to placeholder on failure.
- **Worker safety:** stale-job recovery on restart; failures mark `blogStatus:'failed'` with a reason (surface, don't hang).

## 8. Verification / testing

- **Automated (`npm run check` extended), no paid calls in CI:** provider unit tests use recorded fixtures (mock DataForSEO + LLM responses). Add a **core-loop smoke**: forge a session with `SIR_BLOGGS_AUTH_SESSION_SECRET`, onboard a domain (providers mocked), generate a plan, run the article worker, assert `blogContent` is populated and status flips to `published`. Update `check-blawgy-session-bridge.js` to the cookie path.
- **Live parity (manual, real keys):** run the same domain through live Blawgy (louieleolarry account) and local SBA; drive SBA's SPA in the browser and confirm each screen/flow matches Blawgy's behavior (shapes/UX, not exact wording). This is the acceptance gate for "it mirrors Blawgy."
- **Exit criteria:** From a clean login, a user can enter a domain → see a real AI business description → get real keyword clusters → get a dated content plan → click generate → receive a real written article that appears published — all on the enabled SPA, with no forged admin and no auth bypass.

## 9. Sequencing & delivery

- Branch `feat/blawgy-parity-phase1` off current HEAD (`codex/blawgy-homepage-parity`). **Do not** sweep the pre-existing unrelated edits (`index.html`, `styles.css`, `scripts/check-routes.js`, untracked `docs/`) — commit only Phase-1 work; ask before touching those.
- Commit + push per sub-phase (1a→1f), each keeping `npm run check` green. Open a PR early; push incrementally.
- **Prod deploy is an explicit go/no-go at the end of Phase 1** (it flips the live surface from the custom dashboard to the Blawgy SPA — an outward-facing change). Durable deploy (dedicated service user, SQLite, CI gate) is Phase 4.

## 10. Out of scope (later phases)

- **Phase 2 — Visibility & publishing:** GSC OAuth (real Search Analytics), rank tracking (DataForSEO SERP), CMS publishing (WordPress/Webflow/Shopify/Framer real connect + publish).
- **Phase 3 — Commerce & polish:** real Stripe → user's account (the intended difference), FLUX images + object storage, AI-mentions (DataForSEO LLM-mentions), assistant (LLM tool-calling + SSE), admin/partner, PostHog analytics, email/password + magic-link login parity.
- **Phase 4 — Platform:** JSON→SQLite, dedicated `sirbloggsalot` service user + idempotent deploy, CI parity gate, observability.

## 11. Open items (confirm at key-time)

- Exact DataForSEO product endpoints (Labs vs Keywords Data) and plan limits — finalize when the DataForSEO credential is in hand.
- Phase-1 clustering depth (heuristic vs SERP-overlap) — start heuristic, revisit if parity looks thin.
- Whether to deploy Phase 1 to prod at the end (go/no-go) — user decides after live-parity passes.
