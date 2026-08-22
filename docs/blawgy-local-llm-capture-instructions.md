# Blawgy Capture Instructions For Local LLM

Date: 2026-08-14

Use this file with the local LLM or operator that can access the real authenticated Blawgy dashboard. The goal is to capture enough evidence to finish Sir Bloggsalot's account dashboard without guessing from incomplete screens. For the current highest-priority screenshot list, start with `docs/blawgy-missing-screenshot-pockets-2026-08-19.md`. For the current progress and WFS task-card packet, see `docs/blawgy-clone-progress-2026-08-14.md`.

## Rules

- Do not implement code in Blawgy.
- Do not submit actions that publish content, change billing, revoke credentials, invite real users, send email, sync a live provider, or connect a live provider unless the owner explicitly says it is safe.
- Redact passwords, API keys, tokens, cookies, billing details, private addresses, private customer records, and secret credential fields.
- Prefer full-page desktop screenshots around 1440px wide with overlays closed unless the requested state is the overlay itself.
- Include mobile screenshots for the mobile section at a phone viewport.
- For every clicked control, record the route, click path, visible before/after state, required fields, validation copy, success copy, error copy, and safe DevTools endpoint shapes if visible.
- For modal or drawer captures, note every close path: close button, cancel button, backdrop click, Escape key, route change, or any unsaved-change warning.
- Note where success/error feedback appears after each action, such as a toast, inline live region, modal banner, or field-level validation.
- Mark each comparison as `matches`, `partially matches`, `missing`, or `intentionally local placeholder`.

## Capture Packet To Return

Return a folder or zip with these files:

- `README.md`: capture date, Blawgy account type, browser, viewport sizes, and setup notes.
- `screenshots/`: descriptive filenames such as `content-plan-article-drawer.png`, `write-generated-editor.png`, `settings-cms-wordpress-error.png`, and `billing-cancel-confirmation.png`.
- `routes.md`: every Blawgy route and whether it is a page, tab, modal, drawer, or external provider handoff.
- `fields.md`: field labels, defaults, required/optional status, validation errors, and saved-state rendering.
- `network.md`: safe endpoint paths, methods, request keys, response keys, status codes, and redacted example shapes.
- `comparison.md`: compare Blawgy to Sir Bloggsalot using the status labels above.
- `build-next.md`: prioritized Sir Bloggsalot implementation steps, each tied to screenshot or network evidence.

## Immediate Screenshot Ask For Brad

Brad, please capture these first if time is limited. These are the highest-leverage gaps for the Sir Bloggsalot dashboard because they cover the areas most likely to be visibly wrong when clicking around.

1. `article-builder-generated-editor.png`: Write or Article Builder after a draft has been generated, including the editor, SEO fields, image metadata, preview, save, schedule, publish, and regenerate controls.
2. `content-plan-article-drawer.png`: An opened article/detail drawer or modal, including edit fields, generate/regenerate, schedule, publish/unpublish, delete, validation, loading, and success/failure copy if those states are reachable safely.
3. `settings-cms-provider-error.png`: CMS Connect with a provider selected, required credential fields visible, Test setup result panel, and a safe validation/error state for missing or bad credentials. Do not submit real credentials.
4. `billing-plan-invoice-failure.png`: Billing page showing current plan/trial, plan change controls, period toggle, invoice detail, payment failure, cancel/reactivate, Stripe portal handoff, and Stripe Checkout and Link confirmation screens with payment details redacted.
5. `tracking-reports-active-states.png`: Search Console connected state, Rankings active Pro+ state, AI Mentions active state, Reports template/share/schedule/export, and SEO Analysis issues/detail views.
6. `products-inventory-sync-states.png`: Products screen with one manual product, product edit/add form, Inventory feed connect form, connected/sync result if safe, failed sync if reachable, and disconnect state.
7. `image-settings-generated-output.png`: Image Settings with preset controls, guideline editor, product-image toggle, generated image or provider-preview output, history, and provider failure if reachable. Sir Bloggsalot now has a local provider-pending preview card, so capture Blawgy's exact generated thumbnail/result state.
8. `team-workspace-switcher-open.png`: Workspace switcher open, exact Create/overflow menu labels and destinations, add-site flow, invite generation, pending invite row, revoke, accepted member row, role controls, remove member, and team activity.
9. `mobile-account-long-modal.png`: Phone-width screenshot of the sidebar/nav plus one long modal/form, preferably CMS connect, article edit, report schedule, support options/ticket, or invoice detail.

For each screenshot, also give the route, click path, and one sentence that says whether Sir Bloggsalot currently `matches`, `partially matches`, is `missing`, or is an `intentionally local placeholder`.

## What To Build Next From The Packet

Use the returned evidence to update Sir Bloggsalot in this order:

1. Close obvious click-through breaks first: buttons that do nothing, links that land on the wrong page, missing disabled/loading states, and modals that cannot submit or close.
2. Match Blawgy's Article Builder and Content Plan workflow next: opened article editing, generated editor state, schedule/publish/regenerate/cancel copy, and grid/list/calendar behavior.
3. Improve setup integrations without faking provider success: CMS, inventory feeds, Search Console, Rankings, AI Mentions, Reports, and Billing should either have real integration evidence or clear local-placeholder copy with disabled unsafe controls.
4. Polish account-level navigation: logged-in public nav, workspace switcher, Create/overflow menu fidelity, Billing/Account links, sign-up/log-in redirects, logout, and mobile navigation.
5. Harden mobile layouts after desktop behavior is correct: Sir Bloggsalot now has a phone-width account Menu toggle for the sidebar nav, so compare Blawgy's exact mobile sidebar behavior, settings tabs, tables, dialogs, and long forms for readability and operability.

Every build step should name the Blawgy screenshot or network note that proves the gap, the Sir Bloggsalot file or endpoint likely affected, and the verification command or browser smoke that would prove the fix.

## Do Not Touch

- Do not overwrite production or deploy from this packet.
- Do not replace Sir Bloggsalot local files from a Blawgy export.
- Do not store or share cookies, tokens, passwords, API keys, Stripe data, private customer data, or live provider secrets.
- Do not click actions that publish content, change billing, invite real users, revoke credentials, send email, sync a live provider, or mutate a real CMS unless the owner explicitly authorizes that exact action.
- Do not mark provider-backed behavior as complete unless there is real provider evidence. Local placeholder behavior is acceptable when it is honest, disabled where needed, and covered by tests.

## Current Detailed Screenshot Packet

Use `docs/blawgy-missing-screenshot-pockets-2026-08-19.md` as the canonical detailed screenshot list. Do not maintain a second priority list here; update that packet first, then keep this capture prompt pointed at it.

## Questions To Answer

1. What are the real Blawgy routes for each major view?
2. Which sidebar/settings controls are links, tabs, modals, drawers, or external provider redirects?
3. Which fields are stored for site settings, images, products, locations, CTA, CMS, invites, billing, reports, and articles?
4. Which visible controls are client-only state changes, and which trigger network requests?
5. Which endpoints and payload keys appear for save, create, update, delete, connect, generate, schedule, publish, export, invite, and billing actions?
6. Which screens are Pro+ gated, provider-gated, billing-gated, CMS-gated, or Search-Console-gated?
7. What default values appear for a brand-new account immediately after checkout and after content-plan preparation finishes?
8. What exact errors appear for invalid email, missing website URL, failed CMS connection, failed topic generation, failed article generation, failed Search Console connection, failed billing, and failed save?
9. What exact success/toast copy appears after save, connect, invite, add product, add location, generate article, schedule, publish, delete, cancel, and reactivate?
10. What should happen when a logged-in user clicks Sign up, Log in, Account, Billing, public Blog, public pricing CTAs, and Log out?

## Sir Bloggsalot Reference

Use `docs/blawgy-dashboard-handoff.md` as the larger Sir Bloggsalot reference. It lists the current local account API, existing local MVP behavior, known screenshots, current partial-match areas, provider placeholders, and production deployment cautions.

Do not use the public production site alone to decide whether local Sir Bloggsalot work exists. A narrow runtime deploy happened on 2026-08-14, but the local source of truth for this handoff remains `/Users/bradmin/Documents/sirbloggsalot.com` because it includes the tests, docs, and working notes that are not copied to production.
