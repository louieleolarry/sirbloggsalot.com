# Blawgy Backend Architecture Parity Notes

Date: 2026-08-05

## Evidence Boundary

This is a best-effort architecture map based on the recovered Blawgy client bundle, sanitized authenticated production HAR/API fixtures, and local compatibility checks. It is not a copy of Blawgy private backend source or database internals.

## Inferred Blawgy Production Shape

The recovered client behaves like a React single-page app hosted separately from the marketing site. It calls a JSON API at `https://app.blawgy.com`, uses Firebase-style identity tokens, and expects a server-side account model scoped by user email plus selected site/domain.

The API surface implies these backend domains:

- Authentication and session bootstrap: identity state, login tracking, `/me`, user details, selected site, onboarding status.
- Site settings: business description, target audience, tone, market, keywords, competitors, internal links, publishing mode, image settings, CTA, CMS connection state, and platform-specific private fields.
- Content plan: scheduled article entries, status changes, publish dates, strategy/config, topic add outcomes, bulk scheduling, draft/published state, and update history.
- Keyword research: clusters, rankings, saved keywords, onboarding previews, exclusions, topic additions, and refresh/status jobs.
- Products and business locations: manual records, hidden status, sync settings, Dutchie-style POS connection, and generated local pages.
- Article builder: saved drafts, generated outlines/articles/images, publish actions, sample/preview routes, and published article list.
- Tracking and reporting: SEO snapshots/scans, Search Console connection states, rankings, AI mentions gates/history, reports, tours, assistant, webhooks, billing/subscription, partner/admin areas.

## Inferred Database Model

The client contracts point to a document-oriented model, likely MongoDB-style based on `_id` fields and nested site/account payloads. A plausible production data model is:

- `users`: auth id/email, role/admin flags, site memberships, selected site, onboarding state.
- `sites`: domain, owner email, settings, CMS config, subscription status, market, GSC connection, product sync state.
- `plans` or `content_plan_entries`: site id/domain, keyword, title, publish date, status, SEO metrics, why/upside metadata, article content references.
- `keyword_clusters`, `saved_keywords`, and `rankings`: site-scoped keyword research rows, SERP/GSC metrics, exclusion lists, refresh status.
- `articles` and `drafts`: builder drafts, generated content, media, preview/published URLs, publish state.
- `products`, `business_profiles`, and `pages`: catalog items, local-business profiles, generated page previews/results.
- `subscriptions` and `billing_events`: Stripe/customer ids, plan ids, trial/frozen/failure fields, invoice metadata.
- `webhooks`, `tour_progress`, `ai_mentions_history`, `seo_snapshots`, and `admin_partner_records`.

## Local Compatibility Implementation

Sir Bloggsalot currently uses a conservative JSON-backed approximation:

- `data/auth-store.json` stores local Google-auth sessions and users. It is gitignored.
- `data/account-store.json` stores the earlier `/api/account/*` dashboard API. It is gitignored.
- `data/blawgy-store.json` stores the recovered Blawgy client compatibility state. It is gitignored.
- `lib/blawgy-compat.js` owns the Blawgy route surface and persists nested account/site state with queued atomic JSON writes.
- `blawgy-app.html` loads the recovered Blawgy React bundle and installs a local Firebase-compatible auth/session shim.
- `server.js` routes Blawgy app paths to `blawgy-app.html`, protects anonymous `/account`, and serves the public homepage snapshot.

## Known Non-Identical Backend Boundaries

The local backend is intentionally not a real clone of private Blawgy infrastructure. These areas are parity-shaped but locally simulated:

- Real Firebase, Stripe, Search Console, CMS, POS, PostHog, Intercom, and email/SMS integrations are not connected.
- Generated SEO, ranking, AI mention, article, image, and page data are deterministic local placeholders unless backed by a captured fixture.
- Billing, GSC, AI mentions, CMS connection, Dutchie, webhooks, assistant, and admin/partner flows return contract-compatible local states, not live third-party side effects.
- Private integration fields are redacted or accepted without being returned to the browser.

## Current Verification Coverage

`npm run check:blawgy-strict` verifies:

- Recovered Blawgy upstream app assets still match expected hashes.
- Local Blawgy app static contract and patched API base/auth shim are present.
- Anonymous `/account` redirects to `/login?next=/account`.
- Major Blawgy app routes load `blawgy-app.html`.
- Recovered client endpoint references are covered by `lib/blawgy-compat.js`.
- 174 method-and-URL endpoint smoke cases are served locally.
- Sanitized authenticated production fixture parity checks pass where fixtures exist.
- Browser smoke covers desktop app routes and mobile dashboard framing.
- Local auth session bridging works.
- The public homepage matches the transformed live Blawgy homepage with the Sir Bloggsalot logo swapped.
