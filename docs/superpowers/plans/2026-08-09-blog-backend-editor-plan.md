# Blog Backend Editor Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Blawgy-inspired backend blog editor for Sir Bloggsalot that turns the current static `/blog` placeholder into a protected article management workflow plus public published blog pages.

**Architecture:** Reuse the existing dependency-free Node/static app and the authenticated, owner-scoped JSON account store. Treat account content-plan items as the canonical draft/article records, add the minimum missing article fields, expose protected blog-editor APIs, and render only approved published posts publicly. Keep external CMS, Stripe, Search Console, and real AI-provider calls outside this plan unless an approved follow-up wires them.

**Tech Stack:** Node built-ins (`http`, `https`, `fs`, `crypto`), `server.js`, `index.html`, `app.js`, `styles.css`, existing `scripts/check-*.js` smoke checks, and local JSON state under `data/`.

## Global Constraints

- Scope is blog editing functionality only.
- Preserve the current dependency-free architecture unless the user explicitly approves new dependencies.
- Do not deploy from this plan. Production mutation requires a fresh live inventory, exact overwrite/add/remove scope, backup, hash comparison, `/api/health`, and browser checks.
- This checkout has no Git metadata. Do not assume branch, commit, or PR workflows are available.
- Keep account data owner-scoped and session-authenticated.
- Never return, print, store in docs, or commit secrets, tokens, cookies, CMS passwords, payment data, or generated local stores.
- Public `/blog` must show only posts explicitly in `published` status and eligible by publish date.
- Generated content must stay draft-first until a user publishes it.
- Live Blawgy access was blocked during planning because the in-app browser and both Chrome profiles exposed to Codex reached `https://app.blawgy.com/login`. The exposed Chrome profiles were `Brad` and `LouieLeoLarry`; the user clarified `LouieLeoLarry` is the `L3` profile and is logged into the RWD Blawgy account in their visible browser, but Codex could not see an open Blawgy tab in that profile and direct navigation still returned the Blawgy login screen. Use saved screenshots, browser history route evidence, and `docs/blawgy-dashboard-handoff.md` until the logged-in tab can be claimed or the session becomes visible to Codex.

## Research Summary

### Current Sir Bloggsalot State

- `index.html` has a static `/blog` route with three hardcoded article cards.
- `/account` already has a Blawgy-like dashboard shell with Content Plan, Write, Topics, Settings, Billing, Search Console, Rankings, AI Mentions, and Help panels.
- `server.js` already stores authenticated account data in `data/account-store.json` and protects `/api/account/*`.
- `contentPlan.items[]` already contains article-like fields: `id`, `title`, `keyword`, `brief`, `body`, `seoTitle`, `metaDescription`, `volume`, `difficulty`, `estimatedVisits`, `scheduledDate`, `status`, `generatedAt`, and `publishedAt`.
- Existing endpoints already support content-plan item create, update, delete, generate, and publish. Publish currently marks an item `published` only when CMS is locally connected; otherwise it remains a draft.
- Existing checks include syntax, route/action coverage, auth helpers, account API smoke coverage, and FAQ behavior through `npm run check`.

### Browser Access Notes

- The user reports that the visible `LouieLeoLarry`/`L3` Chrome window is already logged into the RWD Blawgy account.
- Codex-side browser control could see Chrome profiles named `Brad` and `LouieLeoLarry`, but neither exposed an open Blawgy tab through the connector.
- Local AppleScript checks on the accessible Mac reported the frontmost app as `Telegram`, the front `Google Chrome` tab as a Google Doc, and no `blawgy` URLs in any local `Google Chrome` tab.
- A process scan showed only local `Google Chrome` as an active browser app; no Arc, Brave, Safari, Chrome Canary, Firefox, or Edge app was available to inspect.
- The user provided a screenshot showing the logged-in Blawgy dashboard visible behind Codex at `https://app.blawgy.com/dashboard`. That screenshot is usable visual evidence even though browser automation could not claim the tab.
- To complete a higher-fidelity Blawgy pass later, attach/mention the logged-in tab through Codex's Chrome tab picker or provide screenshots for `/article-builder` and `/article-builder?draftId=...`.

### Blawgy Evidence

- Public Blawgy page confirms the product positioning around daily indexed articles and preview-before-publish.
- Chrome history for the `LouieLeoLarry`/`L3` profile shows real app routes: `/dashboard`, `/article-builder`, `/article-builder?draftId=...`, `/onboarding`, `/success`, `/settings/site-settings`, `/settings/products`, `/settings/image-style`, `/settings/cms-connect`, `/settings/business-locations`, `/settings/cta`, `/settings/invite`, `/seo-analysis`, `/ai-mentions`, `/search-console`, `/reports`, and `/subscribe`. Query strings containing session or draft identifiers were treated as private and not copied into this plan.
- Current browser-control evidence: Codex can see Chrome profiles `Brad` and `LouieLeoLarry` (`L3`), but no open Blawgy tabs are visible through the connector. Direct navigation in `LouieLeoLarry` to `/dashboard` redirects to `/login`, despite the user's visible Chrome window being logged into the RWD Blawgy account.
- User-provided logged-in dashboard screenshot evidence:
  - route: `https://app.blawgy.com/dashboard`
  - workspace selector: `ranchowebdesigns...`
  - page title: `Content Plan`
  - status summary: `15 scheduled · 0 writing · 1 published`
  - strategy summary: publishing 3 articles a week, targeting keywords worth up to about 1,526 visits a month
  - top controls: `Strategy`, grid/list segmented view, refresh, overflow menu
  - plan copy: articles write and publish themselves on their dates; new topics are added weekly; user can jump ahead
  - card-style grid is visible behind the Codex window, including article cards with "Added by Blawgy" attribution
- Saved dashboard screenshot shows the blog-editor list-mode baseline:
  - left sidebar with logo, site/workspace selector, Articles, Keyword Finder, Google Search Console, Settings, Tours, Subscribe, Log out
  - article list/table mode as an alternate view
  - status chips: All, Scheduled, Processing, Generated, Published
  - bulk checkbox column
  - columns for Article Title, Target Keyword, Actions, Scheduled Date
  - row actions for view, edit, delete, and generation/processing
  - top-right Bulk Schedule and Article Builder buttons
- `docs/blawgy-dashboard-handoff.md` says the highest-value missing evidence is the Write/article-builder generated draft/editor/preview state and overlay-free article detail/edit/publish states.

## Useful Skills And Plugins

- `superpowers:brainstorming`: used for planning discipline and to avoid implementation before plan approval.
- `superpowers:writing-plans`: used for this implementation plan format.
- `chrome:control-chrome`: useful for authenticated Blawgy UI research. It was available, but the session was logged out at planning time.
- `browser:control-in-app-browser`: useful for public Blawgy page inspection. It was available, but also unauthenticated for app routes.
- `superpowers:test-driven-development`: recommended at implementation time for API and rendering changes.
- `superpowers:systematic-debugging`: recommended if route/auth/editor behavior breaks during implementation.
- `superpowers:verification-before-completion`: required before claiming implementation complete.
- `ssh-target-resolver`: required before any production deployment or server-side mutation.
- `sites:sites-building` and `sites:sites-hosting`: not useful unless `.openai/hosting.json` is introduced or found. This project currently targets the existing QuickSites/EC2 deployment path from memory.
- `github:github`: not useful in the current local checkout because there is no `.git` metadata.
- `google-drive:google-drive` and `google-drive:google-docs`: useful only if the plan or screenshots need to be shared through Drive; not required for implementation.
- `openai-developers:openai-platform-api-key`: useful only for a later real AI article-generation integration. The MVP should keep deterministic local generation.
- Recommended but uninstalled plugins: Figma could help only if Blawgy design files exist; Notion/Slack/Teams/Outlook/SharePoint/Box/Atlassian are not needed for this local backend-editor plan.

## Assumptions

- The first approved implementation should publish articles to the Sir Bloggsalot public site, not to an external customer CMS.
- One configured owner workspace should be the public blog publisher. Add `SIR_BLOGGS_PUBLIC_OWNER_EMAIL` or `SIR_BLOGGS_PUBLIC_ACCOUNT_ID`; do not expose all users' published posts.
- The account UI should mimic Blawgy's article-management UI more closely by presenting an `Articles` table and an `Article Builder` flow, while preserving existing deep links for compatibility.
- Article generation remains local and deterministic for now. The editor should be built so a real generator can replace the draft builder later.

## Approach Options

### Option 1: Minimal Static Blog Replacement

Replace the hardcoded `/blog` cards with client-rendered posts fetched from existing `contentPlan.items`.

Tradeoffs: fastest, but weak for SEO, unclear publisher selection, and less faithful to Blawgy's editor workflow. Not recommended.

### Option 2: Recommended Blawgy-Like Local Editor

Reuse `contentPlan.items` as the article records, add missing blog fields, create protected `/api/account/blog/*` endpoints as a focused editor facade, and server-render public `/blog` and `/blog/:slug` from the configured publisher's published posts.

Tradeoffs: slightly more work, but it gives a real backend editor, avoids duplicating storage, keeps account scoping, and gives public blog pages crawlable HTML. Recommended.

### Option 3: Full CMS/Product Clone

Add a richer database, real AI article generation, CMS publishing adapters, Search Console feedback, Stripe gates, and external image generation in one pass.

Tradeoffs: closer to Blawgy long-term, but too broad for the user's stated scope. Not recommended for this plan.

## Recommended Product Design

### Account Sidebar And Routes

- Rename the visible `Content Plan` label to `Articles` to match Blawgy, but keep `data-account-view="plan"` and `/account?view=plan` for compatibility.
- Rename visible `Write` to `Article Builder`, but keep `data-account-view="write"` and `/account?view=write`.
- Keep Topics, Settings, Search Console, Billing, Help, and other existing panels out of scope except where article editor fields consume saved settings.

### Articles List

Build the primary editor screen as a Blawgy-style article list view, preserving the dashboard's screenshot-backed calendar/card grid as the default when current evidence supports it:

- Header: `Scheduled Articles` or `Articles`
- Subtext: count of scheduled/published/draft articles
- Status chips: All, Scheduled, Processing, Generated, Published, Draft
- Top actions: Bulk Schedule, Article Builder
- Table columns: selection checkbox, Article Title, Target Keyword, Status, Scheduled Date, Actions
- Actions: Preview, Edit, Generate, Publish, Unpublish, Delete
- Empty state: direct CTA into Article Builder
- Loading, saving, error, and success messages through existing `data-account-operation`

### Article Builder / Editor

Use one editor surface for both new articles and existing article edits:

- Fields: title, slug, target keyword, category, excerpt, scheduled date/time, status, SEO title, meta description, canonical URL, featured image URL, featured image alt, body markdown/plain text, internal notes
- Context selectors: product, location, CTA enabled, image settings enabled
- Buttons: Save Draft, Generate Draft, Preview, Schedule, Publish, Unpublish, Delete
- Preview pane: rendered title, metadata, body, CTA, and public URL state
- Validation: title required, slug unique within public publisher, body required before publish, scheduled date valid when scheduled, public URL derived from slug
- Dirty-state warning before switching panels or leaving with unsaved changes

### Public Blog

- `/blog` returns real published posts from the configured publisher workspace.
- `/blog/:slug` returns one published post.
- Draft, generated, scheduled future, processing, and deleted posts are not public.
- Public posts include canonical URL, meta description, title, publish date, updated date, excerpt, and article body.
- Add RSS and sitemap entries only after the public route exists and tests cover them.

### Backend Data Model

Extend `normalizePlanItem` with these fields:

- `slug`
- `category`
- `excerpt`
- `canonicalUrl`
- `featuredImageUrl`
- `featuredImageAlt`
- `authorName`
- `updatedAt`
- `deletedAt`
- `publishedUrl`
- `scheduledTime`
- `notes`

Keep existing fields intact. Use helpers:

- `normalizeArticleInput(input, account)`
- `ensureUniqueArticleSlug(account, slug, articleId)`
- `publicPostFromArticle(article, account)`
- `publishedPostsForPublicBlog(store)`
- `renderBlogIndexHtml(posts)`
- `renderBlogPostHtml(post)`

### Protected API

Add a focused blog facade while preserving existing content-plan endpoints:

- `GET /api/account/blog/posts`
- `POST /api/account/blog/posts`
- `GET /api/account/blog/posts/:id`
- `PUT /api/account/blog/posts/:id`
- `DELETE /api/account/blog/posts/:id`
- `POST /api/account/blog/posts/:id/generate`
- `POST /api/account/blog/posts/:id/publish`
- `POST /api/account/blog/posts/:id/unpublish`
- `POST /api/account/blog/posts/:id/schedule`
- `POST /api/account/blog/posts/bulk-schedule`

Responses must never include secrets and must remain scoped to the selected authenticated workspace.

### Public API Or Server Routes

- Prefer server-rendered `/blog` and `/blog/:slug` HTML for SEO.
- Optional: `GET /api/blog/posts` and `GET /api/blog/posts/:slug` can expose sanitized public JSON for client enhancement.
- Public JSON must include only sanitized published fields.

## Implementation Tasks

### Task 1: Article Model And Publisher Resolution

**Files:**
- Modify: `server.js`
- Test: `scripts/check-account-api.js`

**Interfaces:**
- Consumes: existing `readAccountStore`, `normalizePlanItem`, `mutateAccount`, `readAccount`.
- Produces: normalized article records with slug, excerpt, public metadata, updated timestamps, and configured publisher resolution.

- [ ] Add `SIR_BLOGGS_PUBLIC_OWNER_EMAIL` and `SIR_BLOGGS_PUBLIC_ACCOUNT_ID` constants near the existing env vars.
- [ ] Extend `normalizePlanItem` with the article fields listed above.
- [ ] Add slug creation from title/keyword and unique slug enforcement within an account.
- [ ] Add `updatedAt` on every article create/update/generate/publish/unpublish/schedule mutation.
- [ ] Add test coverage that two articles with the same title produce distinct slugs.
- [ ] Add test coverage that publisher selection does not expose posts from an unrelated account.

### Task 2: Protected Blog Editor API

**Files:**
- Modify: `server.js`
- Test: `scripts/check-account-api.js`

**Interfaces:**
- Consumes: helpers from Task 1.
- Produces: `/api/account/blog/*` endpoints for editor CRUD and state transitions.

- [ ] Write failing checks for unauthenticated `GET /api/account/blog/posts` returning `401`.
- [ ] Write failing checks for create, update, generate, publish, unpublish, schedule, and delete.
- [ ] Implement `GET /api/account/blog/posts` with optional `status` filtering.
- [ ] Implement `POST /api/account/blog/posts` to create a draft article.
- [ ] Implement `GET/PUT/DELETE /api/account/blog/posts/:id`.
- [ ] Implement `generate`, reusing the current deterministic draft builder.
- [ ] Implement `publish` with validation: title, slug, body, and current-or-past publish date.
- [ ] Implement `unpublish` by moving status back to `draft` and clearing public timestamps.
- [ ] Implement `schedule` with scheduled date/time validation.
- [ ] Keep existing `/api/account/content-plan/*` endpoints working.

### Task 3: Public Blog Rendering

**Files:**
- Modify: `server.js`
- Modify: `index.html`
- Modify: `app.js`
- Test: `scripts/check-routes.js`
- Test: `scripts/check-account-api.js`

**Interfaces:**
- Consumes: published-post helpers from Task 1.
- Produces: `/blog`, `/blog/:slug`, and optional public JSON for sanitized posts.

- [ ] Replace static `/blog` cards with an empty container that can be hydrated when JavaScript is available.
- [ ] Add server handling for `/blog` that renders published post cards into HTML.
- [ ] Add server handling for `/blog/:slug` that renders a published post detail page.
- [ ] Add `404` behavior for unpublished, deleted, or unknown slugs.
- [x] Add optional `GET /api/blog/posts` and `GET /api/blog/posts/:slug` sanitized public JSON.
- [ ] Update route checks to reject the old hardcoded placeholder cards.
- [ ] Add checks that public responses do not include private notes, draft body for unpublished posts, account owner email, or secret state.

### Task 4: Blawgy-Style Articles Table

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Test: `scripts/check-routes.js`

**Interfaces:**
- Consumes: `/api/account/blog/posts`.
- Produces: a Blawgy-like article table with status filters and row actions.

- [ ] Update sidebar visible copy to `Articles` and `Article Builder` while keeping existing data attributes.
- [ ] Replace the current card calendar markup with a table shell: status chips, checkbox column, title, keyword, status, scheduled date, actions.
- [ ] Add DOM markers for blog filters, selected rows, row actions, and editor launch.
- [ ] Implement `loadBlogPosts`, `renderBlogTable`, `setBlogFilter`, and row action handlers in `app.js`.
- [ ] Wire Preview, Edit, Generate, Publish, Unpublish, Delete, Bulk Schedule, and Article Builder buttons to the protected blog API.
- [ ] Preserve existing content-plan state enough that old account smoke checks still pass or are updated to the new facade.
- [ ] Add route/action checks so every `data-blog-action` and `data-account-action` has a handler.

### Task 5: Article Builder And Editor

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Test: `scripts/check-routes.js`

**Interfaces:**
- Consumes: `/api/account/blog/posts/:id` and editor API actions.
- Produces: a single editor flow for new and existing posts.

- [ ] Replace the simple Write fields with a structured Article Builder layout.
- [ ] Add inputs for title, slug, keyword, category, excerpt, schedule, SEO title, meta description, featured image URL/alt, body, and notes.
- [ ] Add context controls for product/location/CTA/image usage as display-only selectors if deeper persistence is out of scope.
- [ ] Add editor buttons: Save Draft, Generate Draft, Preview, Schedule, Publish, Unpublish, Delete.
- [ ] Add a preview pane that renders sanitized article body and public metadata.
- [ ] Add client-side validation messages matching backend requirements.
- [ ] Add dirty-state handling before leaving the editor.

### Task 6: Verification

**Files:**
- Modify: `scripts/check-account-api.js`
- Modify: `scripts/check-routes.js`
- Optional create: `scripts/check-blog-rendering.js`
- Modify: `package.json` only if adding a new check script.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a repeatable local verification command.

- [ ] Extend `npm run check` if a new blog-rendering script is added.
- [ ] Verify syntax: `node --check server.js && node --check app.js`.
- [ ] Verify API smoke coverage with authenticated and unauthenticated requests.
- [ ] Verify public blog rendering hides unpublished posts and private fields.
- [ ] Verify old routes still resolve and no stale placeholder copy remains.
- [ ] Run `npm run check` and save the exact result in the implementation notes.

## Acceptance Criteria

- `npm run check` passes.
- Anonymous `/api/account/blog/*` calls return `401`.
- Authenticated users can create, edit, generate, preview, schedule, publish, unpublish, and delete their own articles.
- Published posts render at `/blog` and `/blog/:slug` from the configured public publisher only.
- Draft, generated, scheduled future, deleted, and other users' posts do not render publicly.
- The account article UI visually follows the Blawgy article table and article-builder flow: left rail, site switcher, status chips, table columns, row actions, Bulk Schedule, and Article Builder.
- The editor has loading, empty, error, saved, dirty, preview, and validation states.
- No visible editor button is inert.
- Existing account settings, products, locations, image settings, CMS metadata, and CTA settings can be used as generation context without rebuilding those modules.
- No secrets or private notes are present in public HTML or public JSON.
- Production deployment remains a separate approved step with live inventory and backup.

## Open Sign-Off Questions

1. Should the public publisher be selected by `SIR_BLOGGS_PUBLIC_OWNER_EMAIL` or by `SIR_BLOGGS_PUBLIC_ACCOUNT_ID`?
2. Should the visible dashboard label be changed from `Content Plan` to `Articles`, matching Blawgy, or should we keep `Content Plan` and only make the layout Blawgy-like?
3. Should `/blog/:slug` be server-rendered immediately for SEO, as recommended, or is a client-rendered MVP acceptable for the first pass?
4. Once Chrome is signed into Blawgy, should we do one more capture pass before implementation to refine the Article Builder/editor details?

## Self-Review

- Placeholder scan: no `TBD` or unresolved implementation placeholders remain.
- Scope check: this plan is limited to blog editor, protected article APIs, and public blog rendering. Billing, Search Console, CMS, inventory feeds, and real AI generation remain outside scope.
- Consistency check: public posts come only from a configured publisher workspace; account editor posts remain owner-scoped.
- Risk check: the largest implementation risk is public publisher resolution. This is why the plan requires explicit env configuration and tests for cross-account isolation.
