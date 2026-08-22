# Blawgy Missing Screenshot Pockets

Date: 2026-08-14

Use this as the current screenshot ask for the authenticated Blawgy dashboard. The goal is to capture only the dashboard pockets that are still under-evidenced for a 1:1 Sir Bloggsalot clone. Do not resend the existing public marketing screenshots, sidebar crops, base Settings tabs, or onboarding-tour overlays unless the state has changed.

## Current Evidence Already On Hand

- Public Blawgy homepage and blog copy: enough for high-level offer, pricing, public nav, CMS integrations, keyword finder, Search Console, AI mentions, images, CTAs, and trial CTA comparison.
- Existing Blawgy screenshots in `/Users/bradmin/.codex/attachments/8b38b1cd-7cb7-4c3e-838c-d70a3a4e87aa`: useful for public pages, sidebar structure, Settings base tabs, onboarding/tour overlays, and one Content Plan view with overlay.
- Current Sir Bloggsalot source: `/Users/bradmin/Documents/sirbloggsalot.com`.
- Current Sir Bloggsalot production deploy: `quicksites-prod:/var/www/sirbloggsalot.com/html`, latest cleanup backup `/home/ec2-user/sirbloggsalot-backups/deploy-20260814T011042Z`.

## Highest-Priority Screenshots To Capture Next

1. `content-plan-overview-no-overlay.png`
   Capture the Content Plan with all onboarding/tour overlays closed. Include sidebar, workspace switcher area, strategy/plan summary, status counts, filters, tools or overflow menu labels, table/list/calendar controls, and rows/cards in every available status.

2. `content-plan-article-actions.png`
   Open a row/card action menu and an article detail drawer/modal. Capture edit fields, row menu label/order, generate/regenerate, schedule, publish/unpublish, delete, validation, loading, success, and failure copy where safe.

3. `article-builder-generated-editor.png`
   Capture Article Builder/Write after generation. Include template/type choices, brief/source fields, generated editor, SEO fields, image fields, preview, save, schedule, publish, regenerate, and any review/approval states.

4. `keyword-finder-results-flow.png`
   Capture a real Keyword Finder search/discovery result. Include filters, metric columns, selected rows, keyword detail, saved batches, add-to-plan before/after, pagination if present, empty/loading/provider-error states.

5. `cms-provider-forms-and-errors.png`
   Capture CMS Connect with platform picker open and each available provider form. At minimum include WordPress plus any Webflow/Shopify/Wix/Ghost/Custom API variants, required credential fields, target blog/collection selection, Test setup, provider success, provider failure, and disconnect. Redact secrets.

6. `products-populated-and-inventory-feed.png`
   Capture Products after at least one manual product exists. Include Add Product, Edit Product, product detail/list layout, hide/show/delete, filters/search, inventory feed connect form, connected state, sync result, failed sync if reachable, and disconnect. Do not use any sensitive-industry account or copy for this capture.

7. `image-settings-generated-output.png`
   Capture exact Blawgy Image Settings output after a test/generation. Include presets, product-image toggle, guideline editor, generated thumbnail or prompt/result card, history, provider failure, and clear/reset behavior.

8. `billing-plan-invoice-failure.png`
   Capture in-app Billing with current plan/trial, upgrade/downgrade, monthly/annual toggle, invoice detail, failed payment if available, cancel, reactivate, and Stripe portal handoff. Also capture the external Stripe Checkout and Link confirmation screens after a trial CTA when safely reachable, including the product/title, trial duration, monthly price, start-trial action, Link verification state, and return/success path. Redact payment details.

9. `tracking-reports-active-states.png`
   Capture Search Console connected state, Rankings active Pro+ state, AI Mentions active state, Reports template/share/schedule/export, and SEO Analysis issue/detail views. Include locked/gated versions only if active versions are unavailable.

10. `team-workspace-switcher-open.png`
    Capture workspace switcher open, add-site flow, exact Create/overflow menu labels and destinations, invite generation, pending invite row, revoke, accepted member row, role controls, remove member, and team activity.

11. `mobile-account-long-modal.png`
    Capture phone-width sidebar/nav, Settings tabs, Content Plan, Article Builder, Billing, and one long modal/form such as CMS connect, article edit, report schedule, support ticket, or invoice detail.

## Notes To Include With Every Screenshot

- Route or URL.
- Click path from the dashboard home.
- Whether the screen is a route, tab, modal, drawer, popover, or external provider redirect.
- Fields shown, default values, required fields, validation copy, success copy, error copy, and loading state.
- Safe DevTools endpoint shapes: method, path, request keys, response keys, and status codes. Redact cookies, tokens, passwords, API keys, billing data, and private customer data.
- A one-line comparison status against Sir Bloggsalot: `matches`, `partially matches`, `missing`, or `intentionally local placeholder`.

## Lower-Priority Captures

Capture these after the list above, or only if they differ from existing screenshots:

- Exact onboarding/tour final state and completed checklist outside the overlay.
- Logged-in public nav behavior when clicking Blog, Pricing, Log in, Sign up, Account, Billing, and Log out.
- Help/live-chat provider opened, including ticket fallback and unread/reply states.
- Brand-new account state immediately after checkout and after content-plan preparation completes.

## Do Not Capture Or Share

- Secrets, cookies, tokens, passwords, API keys, payment details, private addresses, or private customer records.
- Actions that actually publish content, change billing, invite real users, revoke credentials, send email, mutate a live CMS, or connect a live provider unless explicitly authorized.
- Sensitive-industry examples for Rancho Web Designs or Sir Bloggsalot comparison work.
