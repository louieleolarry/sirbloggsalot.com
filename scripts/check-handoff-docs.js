const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const capturePath = path.join(root, "docs", "blawgy-local-llm-capture-instructions.md");
const engineeringPath = path.join(root, "docs", "blawgy-dashboard-handoff.md");
const missingPocketsPath = path.join(root, "docs", "blawgy-missing-screenshot-pockets-2026-08-14.md");
const progressPath = path.join(root, "docs", "blawgy-clone-progress-2026-08-14.md");
const capture = fs.readFileSync(capturePath, "utf8");
const engineering = fs.readFileSync(engineeringPath, "utf8");
const missingPockets = fs.readFileSync(missingPocketsPath, "utf8");
const progress = fs.readFileSync(progressPath, "utf8");

[
  "## Immediate Screenshot Ask For Brad",
  "## What To Build Next From The Packet",
  "## Do Not Touch",
  "content-plan-overview-no-overlay.png",
  "article-builder-generated-editor.png",
  "billing-plan-invoice-failure.png",
  "Stripe Checkout and Link confirmation screens",
  "settings-cms-provider-error.png",
  "mobile-account-long-modal.png",
].forEach((needle) => {
  assert.ok(capture.includes(needle), `Missing capture handoff marker: ${needle}`);
});

[
  "Highest-Priority Screenshots To Capture Next",
  "content-plan-overview-no-overlay.png",
  "article-builder-generated-editor.png",
  "keyword-finder-results-flow.png",
  "cms-provider-forms-and-errors.png",
  "mobile-account-long-modal.png",
].forEach((needle) => {
  assert.ok(missingPockets.includes(needle), `Missing current screenshot-pocket marker: ${needle}`);
});

[
  "docs/blawgy-local-llm-capture-instructions.md",
  "docs/blawgy-missing-screenshot-pockets-2026-08-14.md",
  "docs/blawgy-clone-progress-2026-08-14.md",
  "A narrow production deploy on 2026-08-14 copied only",
  "deploy-20260814T011042Z",
  "dashboard aliases such as `/dashboard`, `/article-builder`, `/keyword-finder`, `/reports`, `/search-console`, `/rankings`, `/ai-mentions`, `/seo-analysis`, `/help`, and `/billing`",
  "app.js?v=20260814-pages-generator",
  "styles.css?v=20260814-pages-generator",
  "Article detail modal parity slice",
  "Article Builder generated editor shell parity slice",
  "Billing checkout trial-start parity slice",
  "Image Settings image-style controls parity slice",
  "Image Settings route-alias parity slice",
  "Image Settings route split parity slice",
  "Image Settings image-style tools/toggle parity slice",
  "Image Settings product-image empty-state parity slice",
  "Business Locations empty-state shield-icon parity slice",
  "Invite Users pending-invite avatar parity slice",
].forEach((needle) => {
  assert.ok(engineering.includes(needle), `Missing engineering handoff marker: ${needle}`);
});

const toursMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| Tours / onboarding |"));
assert.ok(toursMatrixRow, "Missing Tours / onboarding comparison matrix row");
[
  "full Settings tab-strip highlight",
  "top tab-pointer",
  "settings-tab tour steps",
  "right-edge fade",
].forEach((needle) => {
  assert.ok(toursMatrixRow.includes(needle), `Tours / onboarding matrix row missing current tour evidence: ${needle}`);
});

const imageSettingsMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| Image Settings |"));
assert.ok(imageSettingsMatrixRow, "Missing Image Settings comparison matrix row");
[
  "collapsed Test Image Generation card",
  "`/settings/image-style`",
  "Use custom guidelines",
  "Needs attention",
  "Add specific constraints",
].forEach((needle) => {
  assert.ok(imageSettingsMatrixRow.includes(needle), `Image Settings matrix row missing current image evidence: ${needle}`);
});

const cmsConnectMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| CMS Connect |"));
assert.ok(cmsConnectMatrixRow, "Missing CMS Connect comparison matrix row");
[
  "Website URL",
  "Website Platform",
  "Publishing mode",
  "Draft first",
  "Auto-publish after approval",
  "Needs attention",
].forEach((needle) => {
  assert.ok(cmsConnectMatrixRow.includes(needle), `CMS Connect matrix row missing current CMS evidence: ${needle}`);
});

const locationsMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| Locations |"));
assert.ok(locationsMatrixRow, "Missing Locations comparison matrix row");
[
  "Business locations",
  "No locations yet",
  "shield/check",
  "`/pages`",
  "`/page-generator`",
  "`/pages-generator`",
  "Draft page",
].forEach((needle) => {
  assert.ok(locationsMatrixRow.includes(needle), `Locations matrix row missing current locations evidence: ${needle}`);
});

const ctaMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| CTA |"));
assert.ok(ctaMatrixRow, "Missing CTA comparison matrix row");
[
  "left enable toggle",
  "Call to Action",
  "right-aligned `Edit CTA`",
  "CTA Best Practices",
  "hidden compatibility",
  "Edit CTA modal",
].forEach((needle) => {
  assert.ok(ctaMatrixRow.includes(needle), `CTA matrix row missing current CTA evidence: ${needle}`);
});

const productsMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| Products |"));
assert.ok(productsMatrixRow, "Missing Products comparison matrix row");
[
  "visible `+ Add Product`",
  "All/Synced/Manual/Hidden filters",
  "search field",
  "`No products yet` / `Add your first product`",
].forEach((needle) => {
  assert.ok(productsMatrixRow.includes(needle), `Products matrix row missing current Products evidence: ${needle}`);
});
assert.ok(
  !engineering.includes("lower manual Add Product/filter/list controls are hidden"),
  "Products handoff should not contradict the Blawgy empty-state controls that are visible in the current parity slice."
);

const invitesMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| Invites and members |"));
assert.ok(invitesMatrixRow, "Missing Invites and members comparison matrix row");
[
  "Email Address row",
  "Generate Invite Link",
  "Current Team Members",
  "invitation-link instructions",
  "grey circular initial chip",
  "pending invite rows",
  "dark circular info icon",
  "horizontal divider",
].forEach((needle) => {
  assert.ok(invitesMatrixRow.includes(needle), `Invites and members matrix row missing current invite evidence: ${needle}`);
});

const billingMatrixRow = engineering
  .split("\n")
  .find((line) => line.startsWith("| Billing |"));
assert.ok(billingMatrixRow, "Missing Billing comparison matrix row");
[
  "Try Sir Bloggsalot",
  "3 days free",
  "monthly renewal copy",
  "trialEndsAt",
  "`/success`",
  "Open your content plan",
  "invoice deep links",
  "cancel/reactivate progress feedback",
].forEach((needle) => {
  assert.ok(billingMatrixRow.includes(needle), `Billing matrix row missing current billing evidence: ${needle}`);
});

[
  "WFS Board Update",
  "6a730c30a79c66da51798593",
  "Hermes/WFS bridge config",
  "column-1786675759686-w74sll",
  "column-1786676628143-gcnchg",
  "Cards verified in `Progress Over 90%`",
  "Cards verified in `Progress Over 50%`",
  "Products and source-provider flows parity",
  "Progress Over 50%",
  "Progress Over 90%",
  "Dashboard screenshot vocabulary restoration slice",
  "Sidebar brand mark parity slice",
  "Sidebar Create shell parity slice",
  "Sidebar Write visible-nav parity slice",
  "Content Plan first-fold parity slice",
  "Content Plan screenshot-source correction slice",
  "Content Plan summary-copy parity slice",
  "Content Plan strategy-card visibility parity slice",
  "Content Plan strategy-copy parity slice",
  "Content Plan Strategy icon parity slice",
  "Content Plan toolbar icon parity slice",
  "Content Plan grid-default parity slice",
  "Content Plan card-source parity slice",
  "Content Plan card-difficulty wording parity slice",
  "Content Plan card-visits emphasis parity slice",
  "Content Plan card-footer parity slice",
  "Content Plan row-action parity slice",
  "Content Plan calendar-card detail parity slice",
  "Article Builder label parity slice",
  "Content Plan Article Builder compatibility slice",
  "Article Builder generated action rail parity slice",
  "Keyword Finder label parity slice",
  "Keyword Finder filter-card parity slice",
  "Google Search Console label parity slice",
  "Google Search Console header-action parity slice",
  "Billing sidebar label parity slice",
  "Getting started sidebar restoration slice",
  "Tour overlay parity slice",
  "Tour overlay close-control parity slice",
  "Tour overlay no-eyebrow parity slice",
  "Tour overlay centered-modal parity slice",
  "Tour overlay modal-width parity slice",
  "Tour overlay corner-radius parity slice",
  "Tour overlay first-step-actions parity slice",
  "Tour overlay pointer parity slice",
  "Tour overlay target-highlight parity slice",
  "Tour overlay sidebar-highlight fade parity slice",
  "Tour overlay settings-tab target parity slice",
  "Tour overlay tab-strip highlight parity slice",
  "Tour overlay tab-pointer parity slice",
  "Handoff comparison matrix tour-evidence parity slice",
  "Tour overlay target-scope parity slice",
  "Tour overlay footer parity slice",
  "Tour overlay next-button parity slice",
  "Tour overlay primary-button sizing parity slice",
  "screenshot-backed sequence",
  "Account topbar hidden-shell parity slice",
  "Sidebar workspace selector parity slice",
  "Sidebar workspace selector cascade fix",
  "Getting started tooltip parity slice",
  "Settings sidebar icon parity slice",
  "Sidebar line-icon parity slice",
  "Products empty-state parity slice",
  "Products empty-state cube-icon parity slice",
  "Products source-card icon parity slice",
  "Products populated-row badge parity slice",
  "Inventory feed failure-state parity slice",
  "Site Settings visible sequence parity slice",
  "Site Settings Generate using AI icon parity slice",
  "Site Settings Product Description header-row parity slice",
  "Site Settings keyword-helper parity slice",
  "Image Settings first-fold parity slice",
  "Image Settings image-style controls parity slice",
  "Image Settings route-alias parity slice",
  "Image Settings route split parity slice",
  "Image Settings image-style tools/toggle parity slice",
  "Image Settings image-guidelines helper-copy parity slice",
  "Image Settings product-image empty-state parity slice",
  "Image Settings provider-error preview slice",
  "Handoff comparison matrix Image Settings evidence parity slice",
  "CMS Connect first-fold parity slice",
  "CMS publishing-mode dialog parity slice",
  "CMS provider-error state parity slice",
  "Handoff comparison matrix CMS Connect evidence parity slice",
  "Business Locations empty-state parity slice",
  "Business Locations empty-state shield-icon parity slice",
  "Pages generator route-compatible parity slice",
  "Handoff comparison matrix Business Locations evidence parity slice",
  "Call to Action first-fold parity slice",
  "Handoff comparison matrix CTA evidence parity slice",
  "Invite Users first-fold parity slice",
  "Post-checkout success preparation parity slice",
  "Checkout success exact-copy parity slice",
  "Checkout success CTA icon parity slice",
  "Checkout success preparation-state parity slice",
  "Billing checkout trial-copy parity slice",
  "Billing checkout trial-start parity slice",
  "Handoff comparison matrix Billing evidence parity slice",
  "Help bubble icon parity slice",
  "Invite Users member-avatar parity slice",
  "Invite Users pending-invite avatar parity slice",
  "Invite Users empty-list visibility parity slice",
  "Invite Users guidance icon parity slice",
  "Invite Users divider parity slice",
  "Settings full-width panel parity slice",
  "Invite Users guidance-card spacing parity slice",
  "Invite Users button-width parity slice",
  "Handoff comparison matrix Invite Users evidence parity slice",
  "Site Settings keyword Add row parity slice",
  "Settings form-control typography parity slice",
  "Account topbar hidden cascade fix",
  "Sidebar hidden local panels cascade fix",
  "Sidebar Create shell hidden cascade fix",
  "docs/blawgy-missing-screenshot-pockets-2026-08-14.md",
].forEach((needle) => {
  assert.ok(progress.includes(needle), `Missing progress handoff marker: ${needle}`);
});

console.log("Blawgy handoff doc checks passed.");
