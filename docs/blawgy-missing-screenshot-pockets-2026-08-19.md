# Blawgy Missing Screenshot Pockets - 2026-08-19 Checkpoint

This checkpoint updates the August 14 capture packet after the current Sir Bloggsalot local state review. The public Blawgy page remains visible and current enough to confirm the product surface around dashboard, keyword finder, CMS integrations, Search Console, custom images, CTAs, and annual pricing. Authenticated Blawgy dashboard routes still need screenshots for exact 1:1 backend/dashboard fidelity.

## Highest-Value Screenshots To Capture Next

Please capture these first. They are the pockets most likely to block exact dashboard matching because Sir Bloggsalot currently has functional local versions but not enough authenticated Blawgy evidence for pixel/copy fidelity.

1. `article-builder-generated-editor.png`
   - Route/click path: Write / Article Builder after generating or opening an existing draft.
   - Need: generated body editor, SEO fields, image fields, preview/readiness panel, save, schedule, publish, regenerate, and validation/error copy.
   - Current SBA status: `partially matches`; local SBA now exposes a generated/source status strip plus an output-state panel with generation timestamp, source status, preview/provider state, issue state, lifecycle status, schedule, readiness, public URL, an editor QA panel for save target, validation blockers, image state, SEO state, and provider handoff, plus an Editor fields panel summarizing body, SEO title, meta description, canonical URL, featured image, and preview state when a generated/source article is open. The output panel now opens an Article generation detail dialog summarizing body, SEO, featured-image, schedule/public URL, readiness, preview/provider state, and the remaining Blawgy evidence gap.

2. `content-plan-article-drawer.png`
   - Route/click path: Content Plan or Articles table, open one article/detail row.
   - Need: drawer/modal layout, lifecycle actions, publish/schedule confirmation copy, delete/unpublish behavior, loading and success/failure states.
   - Current SBA status: `partially matches`; local SBA now shows an article lifecycle strip with status, schedule, public URL, CMS connection, publish mode, generated/updated timestamps, active issue state, and lifecycle confirmation panels for publish, unpublish, and delete actions inside the detail/modal flow. The modal action-state panel now opens an Article lifecycle detail dialog covering title, status, schedule, public URL, CMS/publish mode, readiness, blockers, generation/update state, issue state, SEO, body, protected-request progress, and the remaining exact drawer loading/success screenshot gap. Those confirmation panels also expose action-readiness feedback for the protected request, visible progress expectation, account status-line failure surface, and local account refresh result.

3. `settings-cms-provider-error.png`
   - Route/click path: Settings -> CMS Connect, choose WordPress/Webflow/Shopify/etc. and safely trigger missing-credential validation.
   - Need: platform-specific fields, exact validation copy, test result panel, draft-first/auto-publish controls, collection/blog picker if visible.
   - Current SBA status: `partially matches`; local SBA now shows visible provider validation with missing-field, credential, target, collection, last-test, provider-test, draft-first/auto-publish state, and a platform-aware connect-dialog checklist covering URL, admin account, target, collection, publishing mode, required provider credential, missing/rejected credential error surface, and secret handling, while provider success remains unfaked. CMS detail rows now open a CMS provider detail dialog summarizing selected platform, provider-specific URL/admin/target/collection labels, publishing mode, required credential, missing checks, provider status/error surface, secret handling, and the remaining exact provider-form validation screenshot gap.

4. `billing-plan-invoice-failure.png`
   - Route/click path: Billing, plan change, invoice detail, cancel/reactivate, failed-payment state, Stripe portal/checkout/link handoff with payment data redacted.
   - Need: exact Blawgy billing and Stripe copy/states beyond the local trial/checkout mock.
   - Current SBA status: `partially matches`; local SBA now shows a billing state panel with plan/status, payment method, portal state, latest invoice, failed-payment reason, retry date, failure-recorded date, and a Billing actions checklist for local plan changes, portal handoff, payment retry state, and provider-backed Stripe/payment limits. Billing actions now open a structured detail dialog covering plan, status, payment method, latest invoice, failed-payment reason, retry date, portal action, cancel/reactivate availability, provider-backed Stripe limits, and the remaining exact billing-portal/cancellation screenshot gap. Invoice detail now opens a structured local detail panel with invoice metadata plus a payment-handoff section that keeps Stripe invoice payment, retry, and payment-method changes provider-backed.

5. `tracking-reports-active-states.png`
   - Route/click path: Search Console connected, Rankings active Pro+ state, AI Mentions active state, Reports share/schedule/export, SEO Analysis issue/detail views.
   - Need: real data tables/charts, row details, empty/error states, export/share/schedule modals.
   - Current SBA status: `partially matches`; local SBA now shows a Reports tracking-state panel tying Search Console, Rankings, AI Mentions, delivery cadence, share-link state, schedule recipients, last export, and provider sync timestamps together, plus a Reports actions panel for export CSV, share-link, schedule-delivery, and provider-backed limits. Reports actions now open a structured detail dialog covering template, Search Console, Rankings, AI Mentions, share link, schedule, last export, export/share/schedule action availability, provider-backed analytics/email limits, and the remaining exact Blawgy export/share/schedule modal copy gap. The schedule modal now also shows delivery setup, schedule state, recipients, local-only schedule metadata, and provider-backed email-delivery limits before saving. Provider data remains synthetic unless integration evidence exists, and exact Blawgy export/share/schedule modals still need screenshots.

6. `products-inventory-sync-states.png`
   - Route/click path: Settings -> Products with one manual product, product add/edit form, inventory feed connect/sync/disconnect/failure states.
   - Need: exact product fields, card/list layout, synced-product metadata, and inventory connection form.
   - Current SBA status: `partially matches`; local SBA now shows a provider-neutral inventory state panel with connection status, feed/account identifiers, sync mode, credential state, manual/synced/hidden product counts, last sync, latest synced SKU, and error state. The inventory state panel now opens a structured feed detail dialog covering feed status, account, sync mode, credential state, product counts, last sync, latest SKU, issue state, connect/sync/disconnect action availability, provider-backed real API limits, and the remaining exact product add/edit plus synced-product detail screenshot gap. The Connect inventory feed modal now also shows a connection setup checklist covering feed state, credential state, secret handling, local placeholder sync behavior, and provider-backed real API limits before saving metadata. Product rows now expose labeled operational metadata for category, price, SKU, audience, source, visibility, and URL when present. Industry-specific inventory platform copy must stay out of SBA, and exact Blawgy add/edit forms plus synced-product detail states still need screenshots.

7. `image-settings-generated-output.png`
   - Route/click path: Settings -> Image Settings and `/settings/image-style`, after generating a preview if safe.
   - Need: real generated thumbnail/result state, failure state, history rows, preset labels, asset/product-image behavior.
   - Current SBA status: `partially matches`; local SBA now shows a visible image provider/output state panel with provider status, preview status, style preset, alt text, prompt, product-image mode, format/cadence, last test, saved prompt count, and provider error state, plus a Generated output panel for thumbnail/result status, history rows, save target, product input, and provider-backed generation limits. The provider state panel now opens a structured detail dialog covering preview status/title, style preset, format/cadence, product-image inputs, prompt history, last test, alt text, prompt, issue state, test/clear action availability, provider-backed final generation/asset-library limits, and the remaining generated-thumbnail/failure-row/asset-library screenshot gap. Latest output and prompt-history rows also open provider-safe detail dialogs with prompt, format, save-target, preview, status, and provider-backed limits. Generated thumbnails remain honest local/provider-pending previews instead of fake success, and exact Blawgy generated result thumbnails plus failure/history rows still need screenshots.

8. `team-workspace-switcher-open.png`
   - Route/click path: workspace/site selector open, Create menu open, team invite/member controls visible.
   - Need: exact selector labels/order, add-site flow, invite link rows, revoke/remove/role controls, team activity layout.
   - Current SBA status: `partially matches`; local SBA now shows a workspace switcher open-state summary with selected workspace, workspace count, owner/member role mix, add-site workspace affordance text, active member count, pending invite count, recent activity count, and selectable workspace rows, plus a Workspace actions panel for add-site, invite-team, role-control, and activity readiness/permission state. The Workspace actions panel now opens a structured detail dialog with selected workspace, workspace count, role mix, add-site availability, invite status, role-control status, team activity count, and the remaining selector/add-flow evidence gap. Exact Blawgy selector order and full multi-site add flow still need screenshot evidence.

9. `mobile-account-long-modal.png`
   - Route/click path: phone-width dashboard with one long modal/form open, preferably article edit, CMS connect, support ticket, report schedule, or invoice detail.
   - Need: mobile sidebar behavior, settings tabs, table overflow, modal scrolling, button placement, and form readability.
   - Current SBA status: `partially matches`; local SBA now has a phone-width account modal shell that stretches to the viewport, bounds modal height, scrolls long forms internally, keeps action buttons sticky/reachable, and scrolls long detail/body-only modal content inside the dialog instead of letting it overflow the viewport. Exact Blawgy mobile sidebar/tab/table/modal screenshots are still needed for pixel/order parity.

## Screenshots That Are Lower Priority Now

- Public marketing/pricing sections: current SBA markup already follows the public Blawgy copy structure and pricing evidence closely while preserving SBA branding.
- Public case-study index/detail routes: current SBA now has a dedicated `/case-studies` index, direct server route coverage, Blawgy-style stat cards, related case-study links that exclude the current slug, and provider-neutral public proof copy.
- Empty business locations and sparse CTA first folds: current SBA implementation is screenshot-backed and functional enough for local MVP.
- Disconnected Google Search Console first fold: current SBA implementation is already aligned with the captured disconnected state; connected/provider states are the useful next capture.

## WFS Board Status

- Target board: `https://workflowshortcuts.com/?boardId=6a730c30a79c66da51798593`.
- 2026-08-19 live read attempt through `wfs_board_snapshot.py` failed with DNS resolution error before any board data was returned.
- 2026-08-19 follow-up read attempt after the Reports actions-detail slice hit the same DNS resolution error before board data was returned.
- 2026-08-19 follow-up read attempt after the Products inventory-detail slice hit the same DNS resolution error before board data was returned.
- 2026-08-19 follow-up read attempt after the Image Settings provider-detail slice hit the same DNS resolution error before board data was returned.
- 2026-08-19 follow-up read attempt after the Workspace actions-detail slice hit the same DNS resolution error before board data was returned.
- The local WFS mirror at `/Users/bradmin/Sites/WorkFlowShortcuts.com/html/data/local-db.json` is readable but does not contain this board id, so it is not valid evidence for moving cards.
- No live board updates were made in this checkpoint. The next WFS step needs a reachable WFS API/Hermes board tool or an authenticated browser path that exposes the target board.

## Next Build Slice

Do the next implementation slice from the first screenshot we can obtain in this order:

1. Article Builder generated/editor state.
2. Article/detail drawer and lifecycle confirmations.
3. CMS provider form/error states.
4. Billing/Stripe states.
5. Tracking/reporting active states.

Until those screenshots exist, keep provider-backed behavior honest: local placeholders can show pending/error/read-only states, but should not claim real provider success.
