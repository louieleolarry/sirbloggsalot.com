const fs = require("fs");
const path = require("path");
const assert = require("assert");

const indexPath = path.join(__dirname, "..", "index.html");
const appPath = path.join(__dirname, "..", "app.js");
const serverPath = path.join(__dirname, "..", "server.js");
const stylesPath = path.join(__dirname, "..", "styles.css");
const repoRoot = path.join(__dirname, "..");
const html = fs.readFileSync(indexPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");
const server = fs.readFileSync(serverPath, "utf8");
const styles = fs.readFileSync(stylesPath, "utf8");

function listTextFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git"].includes(entry.name)) return [];
      return listTextFiles(filePath);
    }
    if (!entry.isFile()) return [];
    if (/\.(png|jpe?g|gif|webp|ico|pdf|zip)$/i.test(entry.name)) return [];
    return [filePath];
  });
}

const forbiddenCopy = [
  ["Dut", "chie"].join(""),
  ["dispen", "sary"].join(""),
  ["can", "nabis"].join(""),
  ["\\b", "str", "ain", "\\b"].join(""),
  ["live ", "P", "OS"].join(""),
  ["\\b", "P", "OS", "\\b"].join(""),
].map((source) => ({ label: source.replace(/\\/g, ""), pattern: new RegExp(source, "i") }));

listTextFiles(repoRoot).forEach((filePath) => {
  const contents = fs.readFileSync(filePath, "utf8");
  const offender = forbiddenCopy.find(({ pattern }) => pattern.test(contents));
  if (offender) {
    assert.fail(`${path.relative(repoRoot, filePath)} should not include ${offender.label}`);
  }
});

[
  ["Dut", "chie"].join(""),
  ["dispen", "sary"].join(""),
].forEach((needle) => {
  assert(!html.includes(needle), `Public HTML should not include ${needle}`);
});
[
  ["Bla", "wgy"].join(""),
].forEach((needle) => {
  assert(!html.includes(needle), `Public HTML should preserve SBA branding and not include ${needle}`);
  assert(!app.includes(needle), `Client app should preserve SBA branding and not include ${needle}`);
});
const required = [
  'data-primary-nav',
  'class="public-promo" data-public-promo',
  '<strong>Limited Time</strong>',
  'Annual plan special pricing ends August 31st. Lock in $49/mo and start getting cited.',
  'class="public-promo-cta" href="/signup" data-auth-trial data-auth-trial-plan="Pro"',
  'aria-label="Dismiss limited-time pricing notice" data-public-promo-close',
  "Feed the AI across ChatGPT, Google AI, Claude, Perplexity &amp; Gemini",
  "<span>Feed the AI.</span>",
  '<span class="gradient-text">Get cited.</span>',
  "Connect your site. Tell us your industry. Sir Bloggsalot starts publishing",
  '<p class="hero-proof-points"><span>Preview before publishing</span><span>5-minute setup</span><span>Cancel anytime</span><span>Full refund within 30 days</span></p>',
  "People ask ChatGPT, Google AI, and Perplexity before they ever click a link.",
  "Whoever's indexed wins, and Sir Bloggsalot makes sure that's you.",
  '<span>MedSpa Receptionist</span>',
  '<span>BoilerplateHub</span>',
  '<span class="case-link-text">Read case study</span>',
  "Arsene Founder, Natureva",
  "Australia &amp; US Ecommerce · Shopify Home Goods",
  "Adam Founder, MyFoodBuddy",
  "Denver, CO · iOS App · Health &amp; Fitness",
  "Marcus Owner, Kush Groove",
  "Greater Boston, MA · Local Business",
  'id="features"',
  'id="pricing"',
  'id="faq"',
  'class="compare-stack" aria-label="Comparison summary"',
  "<h3>Sir Bloggsalot</h3>",
  "The goal is simple: make your site the source ChatGPT, Google AI, Claude, Perplexity, and Gemini can point to.",
  "WordPress, Webflow, Framer, Shopify, Wix, Ghost, custom APIs. The faster you're indexed, the faster AI can cite you.",
  "1,962% US traffic in 6 months",
  "321K impressions in 6 months",
  'class="quote-link" href="/case-studies/natureva">Read the case study</a>',
  'class="quote-link" href="/case-studies/kush-groove">Read the case study</a>',
  "800% traffic, content AI now cites",
  "Full-service setup",
  "Daily citation fuel",
  '<p class="section-kicker">Launch pricing</p>',
  "<span>Most Popular</span>",
  "Outrank the businesses AI currently cites.",
  '<div class="ready-cta">',
  '<p class="bottom-cta-note">Preview before publishing</p>',
  "Ready to get more customers from AI search?",
  "Join 100+ businesses already using Sir Bloggsalot to automate their content marketing and drive real results.",
  'href="/blog"',
  'href="/login"',
  'href="/signup"',
  'href="/login?next=%2Faccount%3Fview%3Dbilling%26checkoutPlan%3DPro%26billingPeriod%3Dannual"',
  'href="/login?next=%2Faccount%3Fview%3Dbilling%26checkoutPlan%3DPro%252B%26billingPeriod%3Dannual"',
  'data-route-page="success"',
  'data-route-page="case-studies"',
  '<h1>Case Studies</h1>',
  '<a href="/case-studies">Case studies</a>',
  '<a href="/case-studies">Case Studies</a>',
  'class="case-study-back" href="/case-studies">Back to Case Studies</a>',
  'data-case-study-meta',
  'class="case-study-stats" aria-label="Case study results"',
  'data-case-study-stat-value',
  'data-case-study-person',
  'data-case-study-quote',
  'data-case-study-more-list',
  'class="case-study-more"',
  'class="case-study-cta"',
  "success-topbar",
  "Your free trial has started. You won't be charged for 3 days and you can cancel anytime",
  'data-success-panel="complete"',
  "<h1>You're all set</h1>",
  "Your account is ready. Your content plan is being built in the background, usually within 10 minutes. Refresh your calendar, or it'll be there next time you log in.",
  "Your plan is still being built, usually within 10 minutes. Refresh your calendar, or it'll be there next time you log in.",
  'data-success-panel="preparing" hidden',
  "<h1>Your plan is being prepared</h1>",
  "We're turning everything you told us into a month of content, scheduled and ready to go.",
  "Scoring your topics",
  "Scheduling the next 6 weeks",
  "Writing your titles",
  "Putting your plan together",
  "This usually takes under a minute",
  "4s",
  'href="/account?view=plan" data-success-content-plan',
  "Open your content plan",
  "One last step on your dashboard: connect your website platform (about 2 minutes) so we can publish these for you automatically.",
  'class="assistant-widget"',
  '<symbol id="account-icon-chat"',
  '<button class="account-help-bubble" type="button" aria-label="Open support ticket" data-account-action="help-chat"><svg aria-hidden="true"><use href="#account-icon-chat"></use></svg></button>',
  'data-auth-login',
  'data-auth-trial',
  'href="/account?view=plan" data-route="account" data-auth-account hidden',
  'data-route-page="account"',
  'href="/account?view=plan" aria-label="Sir Bloggsalot account home"',
  'data-account-email',
  'class="account-topbar" hidden',
  'data-account-role>Owner</span>',
  'data-account-updated>Session checked</span>',
  'data-account-busy-root',
  'data-account-nav-toggle',
  'class="account-create-shell" hidden',
  'data-account-create-menu',
  'data-account-create-action="article"',
  'data-account-create-action="topic"',
  'data-account-create-action="product"',
  'data-account-create-action="location"',
  'data-account-create-action="ticket"',
  'data-account-view="settings"',
  'data-account-view="pages"',
  'data-account-panel="pages"',
  '<h1>Pages</h1>',
  "Generate location pages from your saved business locations.",
  "Pick which location a batch of pages targets.",
  'data-pages-generator-list',
  'data-pages-generator-count',
  'data-page-generator-location',
  'data-page-generator-action="open-location"',
  'data-page-generator-action="open-builder"',
  'data-account-view="reports"',
  'data-account-panel="reports"',
  'data-account-action="export-reports"',
  'data-account-action="share-report"',
  'data-account-action="schedule-report"',
  'data-report-chart',
  'data-report-summary',
  'data-report-state-panel',
  'data-report-share',
  'data-report-schedule',
  'data-report-progress',
  'data-report-list',
  'data-account-view="seo-analysis"',
  'data-account-panel="seo-analysis"',
  'data-account-action="export-seo-analysis"',
  'data-seo-score',
  'data-seo-chart',
  'data-seo-checks',
  'data-seo-issues',
  'data-seo-opportunities',
  'data-settings-tab="cms"',
  'data-settings-field="site.brandVoice"',
  'data-settings-field="site.competitors"',
  'data-settings-field="site.language"',
  'data-settings-field="site.publishingCadence"',
  'data-content-calendar',
  'data-content-card-source',
  'Added by Sir Bloggsalot',
  'data-content-tools-toggle',
  'data-content-tools-menu',
  'data-content-tools-action="strategy"',
  'data-content-tools-mode="list"',
  'data-content-tools-mode="grid"',
  'data-content-tools-action="refresh"',
  'data-content-tools-action="add-topic-to-plan"',
  'data-content-tools-action="bulk-schedule"',
  'data-blog-status-filter="all"',
  'data-blog-status-filter="scheduled"',
  'data-blog-status-filter="draft"',
  'data-blog-status-filter="processing"',
  'data-blog-status-filter="published"',
  'data-blog-status-filter="failed"',
  'data-blog-status-filter="paused"',
  'data-blog-status-count="all"',
  'data-blog-status-count="draft"',
  'data-blog-status-count="failed"',
  'data-blog-status-count="paused"',
  'data-blog-table-body',
  'data-blog-select-all',
  'class="blog-bulk-bar" aria-label="Bulk article actions" hidden',
  'data-blog-selected',
  'data-blog-bulk-status',
  '<option value="failed">Needs attention</option>',
  'data-blog-action="bulk-update"',
  'data-blog-action="bulk-clear"',
  'data-blog-action="article-builder"',
  'data-write-progress',
  '<th>Scheduled Date</th>',
  'data-content-count="scheduled"',
  'data-content-count="draft">0</strong> generated',
  'data-content-count="processing"',
  'data-content-count="published"',
  'data-content-count="failed"',
  'data-content-count="paused"',
  'data-products-list',
  'data-products-manual-controls',
  'data-account-action="add-product">+ Add Product</button>',
  'data-product-filter="all">All</button>',
  'data-product-filter="synced">Synced</button>',
  'data-product-filter="manual">Manual</button>',
  'data-product-filter="hidden">Hidden</button>',
  'placeholder="Search products..." data-product-search',
  'data-locations-list',
  'class="locations-panel-head"',
  "The Pages generator and Write use these as real-world facts.",
  '<symbol id="account-icon-shield-check"',
  'class="locations-empty-icon" aria-hidden="true"><svg><use href="#account-icon-shield-check"></use></svg></span>',
  'class="locations-empty-action account-primary"',
  "Add your first business location so generated pages and articles use accurate details.",
  'class="invite-user-row"',
  "We'll generate an invite link for the email, but you need to send it manually.",
  'data-invite-role hidden',
  'data-invites-list',
  'data-invite-role',
  'data-members-list',
  'data-team-activity-list',
  "Share these invitation links with your team members. When they click the link, they'll be able to create an account and access your site. Links are valid for 7 days and can only be used once.",
  'data-route-page="invite"',
  'data-account-action="accept-invite"',
  'data-dialog-form',
  'data-calendar-mode="list"',
  'data-account-action="bulk-schedule"',
  'data-account-action="add-topic-to-plan"',
  '<h1>Content Plan</h1>',
  'data-content-plan-stats',
  'data-account-action="strategy"><span class="toolbar-sliders-icon" aria-hidden="true"></span>Strategy</button>',
  'data-content-tools-toggle aria-expanded="false"><span class="toolbar-more-icon" aria-hidden="true"></span></button>',
  'class="is-active" type="button" aria-label="Grid view" data-calendar-mode="grid"><span class="toolbar-grid-icon" aria-hidden="true"></span></button>',
  'type="button" aria-label="List view" data-calendar-mode="list"><span class="toolbar-list-icon" aria-hidden="true"></span></button>',
  'aria-label="Refresh" data-account-action="refresh"><span class="toolbar-refresh-icon" aria-hidden="true"></span></button>',
  'class="account-calendar-tools"',
  '<small>CREATE</small>',
  'data-account-view="plan"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-home"></use></svg>Content Plan</button>',
  'data-account-view="write"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-write"></use></svg>Write</button>',
  'data-account-view="topics"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-topics"></use></svg>Topics</button>',
  '<small>TRACK</small>',
  'data-account-view="rankings"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-rankings"></use></svg>Rankings <em>Pro+</em></button>',
  'data-account-view="search"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-search-console"></use></svg>Search Console</button>',
  'data-account-view="mentions"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-mentions"></use></svg>AI Mentions <em>Pro+</em></button>',
  'data-account-view="settings"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-settings"></use></svg>Settings</button>',
  'data-account-view="billing"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-billing"></use></svg>Billing</button>',
  'data-account-view="getting-started" title="Guided walkthroughs of each section"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-help-circle"></use></svg>Getting started</button>',
  'data-account-view="help"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-help"></use></svg>Help</button>',
  'data-auth-logout><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-log-out"></use></svg>Log out</button>',
  'class="account-calendar-tools"',
  '<div class="blog-table-shell" aria-label="Articles table" data-blog-table-shell hidden>',
  'data-strategy-card',
  'aria-label="Content calendar" data-content-calendar>',
  'data-account-action="start-article"',
  'data-account-action="preview-article"',
  'data-account-action="save-builder-draft"',
  '<h1>Article Builder</h1>',
  'data-account-action="start-article">Generate article</button>',
  'data-write-field="slug"',
  'data-write-field="category"',
  'data-write-field="excerpt"',
  'data-write-field="scheduledDate"',
  'data-write-field="scheduledTime"',
  'data-write-field="template"',
  'data-write-field="audience"',
  'data-write-field="wordCount"',
  'data-write-field="internalLinks"',
  'data-write-field="seoTitle"',
  'data-write-field="metaDescription"',
  'data-write-field="featuredImageUrl"',
  'data-write-field="featuredImageAlt"',
  'data-write-field="body"',
  'data-write-field="notes"',
  'data-write-preview',
  'data-article-preview',
  'data-article-preview-title',
  'data-article-preview-meta',
  'data-article-preview-readiness',
  'data-article-preview-body',
  'data-article-preview-schedule',
  'data-article-source-summary',
  'data-article-builder-output-state',
  'data-account-action="find-topics"',
  'data-account-action="search-keywords"',
  'data-account-action="search-keywords" hidden',
  'data-account-action="find-topics" hidden',
  'data-account-action="magic-select-keywords"',
  'data-account-action="export-keywords"',
  'data-account-action="save-keywords"',
  'data-description-progress',
  'data-keyword-progress',
  '<h1>Keyword Finder</h1>',
  "Find high-value keywords with real search volume and competition data",
  'aria-label="Keyword finder summary"',
  "keywords found",
  '<fieldset class="keyword-filter-group"><legend>DIFFICULTY (KD) <span aria-hidden="true">i</span></legend>',
  '<fieldset class="keyword-filter-group"><legend>CPC ($) <span aria-hidden="true">i</span></legend>',
  '<fieldset class="keyword-filter-group"><legend>VOLUME <span aria-hidden="true">i</span></legend>',
  '<fieldset class="keyword-filter-group"><legend>COMPETITION <span aria-hidden="true">i</span></legend>',
  'data-topic-filter="difficultyMin"',
  'data-topic-filter="volumeMin"',
  'data-topic-sort="keyword"',
  'Keyword ↕',
  'data-topic-sort="volume"',
  'Volume ↕',
  'CPC ↕',
  'Difficulty ↕',
  'Competition ↕',
  'data-topic-actions-column hidden',
  'data-keyword-filter-head',
  'data-topic-select-all',
  'data-keyword-tip',
  "Saved keywords appear in your site settings",
  'data-keyword-selected',
  'class="keyword-filter-foot"',
  'data-billing-plan',
  'data-billing-state-panel',
  'data-billing-alert',
  'data-billing-progress',
  'data-auth-trial-plan="Pro"',
  'data-auth-trial-plan="Pro+"',
  'data-billing-plan-action="Pro+"',
  'data-account-action="billing-portal"',
  'data-account-action="cancel-billing"',
  'data-billing-invoices',
  'data-inventory-state-panel',
  'data-settings-field="cta.placement"',
  'data-account-action="edit-cta"',
  'data-account-action="reset-cta"',
  'data-cta-preview',
  'class="cta-settings-head"',
  '<h2>Call to Action</h2>',
  'class="cta-edit-action" type="button" data-account-action="edit-cta">Edit CTA</button>',
  'class="cta-field-compat" hidden',
  "💡 CTA Best Practices",
  'Use action-oriented language ("Get Started", "Download Now", "Learn More")',
  "Keep your message clear and concise",
  "Make sure the CTA stands out visually from your content",
  "Test different positions to see what works best for your audience",
  'data-account-action="connect-cms"',
  'data-account-action="disconnect-cms"',
  'class="cms-connect-fields"',
  'class="cms-provider-compat" hidden',
  'Website URL<input type="url" value="https://sirbloggsalot.com" data-settings-field="cms.websiteUrl" data-account-dirty />',
  'Website Platform<select data-settings-field="cms.platform" data-account-dirty><option value="">Select your website platform</option>',
  'data-cms-validation',
  'data-cms-progress',
  'data-cms-details',
  'value="https://sirbloggsalot.com"',
  'class="image-test-generation-card"',
  "Test Image Generation",
  "Preview how your style and guidelines affect generated images",
  'class="image-settings-visible-shell"',
  "<h2>In-Article Images</h2>",
  "Configure the style and guidelines for images generated throughout your articles",
  "In-Article Image Style",
  "Define the artistic style for images within your articles",
  "Reuse style from featured image",
  "In-Article Image Guidelines",
  "Set constraints for images generated within your article content",
  "Use Sir Bloggsalot's default guidelines (recommended)",
  "CRITICAL GUIDELINES:",
  "Text and numbers are ALLOWED if they directly help explain the content",
  "NO generic icons, emojis, or standard symbols",
  'class="image-style-settings-shell"',
  "Include Images in Articles",
  "Automatically generate and include relevant images throughout your blog articles",
  "Product Images",
  "Use your synced product images instead of AI-generated images",
  "Use product images for featured image",
  "When products are linked to an article, use their image as the featured image",
  "In-article images automatically use product photos when mentioned, AI images otherwise.",
  "Visual Style",
  "Define the artistic style for generated images (e.g., realistic, cartoon, 3D)",
  'class="image-style-field-head"',
  'class="image-style-tool-actions"',
  'aria-label="Reset visual style"',
  'data-account-action="reset-image-visual-style"',
  'aria-label="Suggest visual style"',
  'data-account-action="suggest-image-visual-style"',
  "Use custom guidelines",
  'data-image-provider-state',
  'data-settings-toggle="images.useCustomGuidelines"',
  'data-settings-field="images.stylePreset"',
  'data-settings-field="images.visualStyle"',
  'data-settings-field="images.guidelines"',
  'data-account-action="clear-image-tests"',
  'data-image-history',
  'data-account-action="connect-search-console"',
  'data-account-view="search"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-search-console"></use></svg>Search Console</button>',
  '<h1>Google Search Console</h1>',
  'data-search-status>Connect Google Search Console to measure impressions, clicks, and indexed content.',
  'data-account-action="sync-search-console" hidden',
  'data-account-action="export-search-console" hidden',
  'aria-label="Disconnect Search Console" title="Disconnect Search Console" data-account-action="disconnect-search-console" hidden>⊘</button>',
  'data-search-range',
  'value="7"',
  'value="90"',
  'data-search-status',
  'data-search-progress',
  'data-search-chart',
  'data-search-chart-legend',
  'data-search-view="queries"',
  'data-search-view="pages"',
  'data-search-row-limit',
  'data-search-filter',
  'data-search-list-title',
  'data-search-list-title hidden',
  'data-search-pages-list',
  'data-search-queries-list',
  'data-search-details hidden',
  'data-search-row-limit="pages"',
  'data-search-row-limit="queries"',
  'data-search-pages-header',
  'data-search-queries-header',
  'data-account-action="refresh-rankings"',
  'data-account-action="export-rankings"',
  'data-rankings-range',
  'data-rankings-chart',
  'data-search-clicks',
  'data-search-metrics hidden',
  'data-rankings-summary',
  'data-rankings-progress',
  'data-rankings-filter="all"',
  'data-rankings-filter="improved"',
  'data-rankings-filter="declined"',
  'data-rankings-search',
  'data-rankings-list',
  'data-account-action="refresh-ai-mentions"',
  'data-account-action="export-ai-mentions"',
  'data-mentions-chart',
  'data-mentions-summary',
  'data-mentions-progress',
  'data-mentions-range',
  'data-mentions-source',
  'data-mentions-model',
  'data-mentions-filter="all"',
  'data-mentions-filter="mentioned"',
  'data-mentions-filter="monitoring"',
  'data-mentions-search',
  'data-mentions-list',
  'data-inventory-details',
  'data-inventory-progress',
  '<symbol id="account-icon-store"',
  '<symbol id="account-icon-calendar"',
  '<span class="integration-icon"><svg aria-hidden="true"><use href="#account-icon-store"></use></svg></span><strong>Inventory Feed</strong>',
  '<svg class="success-cta-icon" aria-hidden="true"><use href="#account-icon-calendar"></use></svg>Open your content plan',
  'data-support-list',
  'data-image-details',
  'data-image-progress',
  'data-team-activity-section hidden',
  'data-case-study-title',
  'app.js?v=20260819-nav-handoff',
  'styles.css?v=20260819-nav-hover-bridge',
  '<option value="draft">Generated</option>',
  "Articles",
  'data-blog-action="article-builder" hidden>Article Builder</button>',
  "CMS Connect",
  "Tours",
  'data-account-panel="getting-started"',
  'data-account-action="start-tour"',
  'data-tour-dots',
  'class="tour-footer"',
  'data-account-action="tour-next">Next <span class="tour-next-icon" aria-hidden="true">&rsaquo;</span></button>',
  'data-tour-eyebrow hidden',
  'aria-label="Close tour" data-account-action="tour-close"',
  'data-account-view="billing"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-billing"></use></svg>Billing</button>',
];

const missing = required.filter((needle) => !html.includes(needle));
if (missing.length) {
  console.error(`Missing required homepage markers: ${missing.join(", ")}`);
  process.exit(1);
}

const accountOperationIndex = html.indexOf("data-account-operation");
const firstAccountPanelIndex = html.indexOf('data-account-panel="plan"');
if (accountOperationIndex === -1 || firstAccountPanelIndex === -1 || accountOperationIndex > firstAccountPanelIndex) {
  console.error("Account operation live region must be outside hidden account panels.");
  process.exit(1);
}

const desktopDropdownRule = styles.match(/\.nav-dropdown-menu\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body || "";
const desktopDropdownOffset = desktopDropdownRule.match(/top:\s*calc\(100%\s*\+\s*(?<gap>\d+)px\)/);
if (!/top:\s*100%;/.test(desktopDropdownRule)
  || !/padding:\s*34px 12px 12px;/.test(desktopDropdownRule)
  || !/\.nav-dropdown-menu::before\s*\{[\s\S]*top:\s*22px;[\s\S]*border:\s*1px solid var\(--line\);[\s\S]*background:\s*white;[\s\S]*\}/.test(styles)) {
  console.error("Desktop nav dropdown hitbox must begin at the parent edge while preserving the 22px visual offset.");
  process.exit(1);
}
if (desktopDropdownOffset && Number(desktopDropdownOffset.groups.gap) > 0) {
  if (Number(desktopDropdownOffset.groups.gap) !== 22) {
    console.error("Desktop nav dropdown submenu must keep the known 22px hover handoff gap.");
    process.exit(1);
  }
  const bridgeRule = styles.match(/\.nav-dropdown::before\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body || "";
  const bridgeHeight = bridgeRule.match(/height:\s*(?<height>\d+)px/)?.groups?.height || "0";
  const menuTranslate = desktopDropdownRule.match(/transform:\s*translate\(-50%,\s*(?<offset>\d+)px\)/)?.groups?.offset || "0";
  const requiredOverlap = Number(menuTranslate) + 8;
  if (
    !bridgeRule.includes('content: ""')
    || !bridgeRule.includes("position: absolute")
    || !bridgeRule.includes("top: 100%")
    || !bridgeRule.includes("left: 50%")
    || !bridgeRule.includes("width: max(100%, 250px)")
    || !bridgeRule.includes("transform: translateX(-50%)")
    || !bridgeRule.includes("z-index: 24")
    || !bridgeRule.includes("pointer-events: none")
    || !bridgeRule.includes("visibility: hidden")
    || Number(bridgeHeight) < Number(desktopDropdownOffset.groups.gap) + requiredOverlap
  ) {
    console.error("Desktop nav dropdown must overlap the submenu handoff gap so pointer movement cannot close it.");
    process.exit(1);
  }
  if (!/\.nav-dropdown\.is-open::before,\s*\.nav-dropdown:hover::before,\s*\.nav-dropdown:focus-within::before\s*\{[\s\S]*pointer-events:\s*auto;[\s\S]*visibility:\s*visible;[\s\S]*\}/.test(styles)) {
    console.error("Desktop nav dropdown hover bridge must activate during open, hover, and focus handoff.");
    process.exit(1);
  }
}

if (!/\.nav-dropdown:hover \.nav-dropdown-menu/.test(styles) || !/\.nav-dropdown:focus-within \.nav-dropdown-menu/.test(styles)) {
  console.error("Desktop nav dropdown must stay open while hovering or focusing the full dropdown container.");
  process.exit(1);
}
if (!/NAV_DROPDOWN_CLOSE_DELAY_MS\s*=\s*240/.test(app)
  || !/function\s+scheduleDropdownClose/.test(app)
  || !/dropdown\.addEventListener\("mouseenter"/.test(app)
  || !/dropdown\.addEventListener\("mouseleave"/.test(app)
  || !/dropdownMenu\.addEventListener\("mouseenter"/.test(app)
  || !/dropdownMenu\.addEventListener\("mouseleave"/.test(app)
  || !/dropdownMenu\.addEventListener\("focusin"/.test(app)
  || !/dropdownMenu\.addEventListener\("focusout"/.test(app)
  || !/dropdown\.addEventListener\("focusin"/.test(app)
  || !/dropdown\.addEventListener\("focusout"/.test(app)) {
  console.error("Desktop nav dropdown must delay close across the parent-to-submenu handoff path.");
  process.exit(1);
}
if (!/dropdown\.matches\(":hover"\)/.test(app)
  || !/dropdownMenu\?\.matches\(":hover"\)/.test(app)
  || !/dropdownBridge\?\.matches\(":hover"\)/.test(app)
  || !/dropdown\.contains\(document\.activeElement\)/.test(app)) {
  console.error("Desktop nav dropdown close timer must preserve the submenu while pointer or focus is inside the handoff path.");
  process.exit(1);
}
if (!html.includes("data-nav-dropdown-bridge")
  || !/const\s+dropdownBridge\s*=\s*document\.querySelector\("\[data-nav-dropdown-bridge\]"\)/.test(app)
  || !/dropdownBridge\.addEventListener\("mouseenter"/.test(app)
  || !/dropdownBridge\.addEventListener\("mouseleave"/.test(app)
  || !/\.nav-dropdown-bridge\s*\{[\s\S]*position:\s*absolute;[\s\S]*top:\s*calc\(100% - 8px\);[\s\S]*width:\s*min\(82vw, 420px\);[\s\S]*height:\s*72px;[\s\S]*pointer-events:\s*none;[\s\S]*visibility:\s*hidden;[\s\S]*\}/.test(styles)
  || !/\.nav-dropdown\.is-open \.nav-dropdown-bridge,\s*\.nav-dropdown:hover \.nav-dropdown-bridge,\s*\.nav-dropdown:focus-within \.nav-dropdown-bridge\s*\{[\s\S]*pointer-events:\s*auto;[\s\S]*visibility:\s*visible;[\s\S]*\}/.test(styles)) {
  console.error("Desktop nav dropdown must use a real, wide hover bridge that overlaps the parent-to-submenu handoff.");
  process.exit(1);
}
if (!/@media \(max-width: 980px\)[\s\S]*\.nav-dropdown::before\s*\{[\s\S]*content: none;[\s\S]*\}/.test(styles)) {
  console.error("Mobile nav must disable the desktop dropdown hover bridge so it cannot cover stacked links.");
  process.exit(1);
}

if (!/@media \(max-width: 980px\)[\s\S]*\.billing-state-panel,\s*\.billing-state-panel dl[\s\S]*grid-template-columns:\s*1fr;/.test(styles)) {
  console.error("Billing state panel must collapse to one column in the account mobile breakpoint.");
  process.exit(1);
}

if (!/\.compare-stack\s*\{[\s\S]*display:\s*none;[\s\S]*\}/.test(styles) || !/@media \(max-width: 640px\)[\s\S]*\.compare-table\s*\{[\s\S]*display:\s*none;[\s\S]*\}[\s\S]*\.compare-stack\s*\{[\s\S]*display:\s*grid;[\s\S]*\}/.test(styles)) {
  console.error("Comparison stack must be hidden on desktop and replace the table on small screens.");
  process.exit(1);
}

if (!html.includes('<span class="account-brand-mark">S</span>')) {
  console.error("Account sidebar brand mark must use the Sir Bloggsalot S mark.");
  process.exit(1);
}
if (!styles.includes(".account-brand-mark::after") || !styles.includes("border-top: 7px solid #8cf4d3;")) {
  console.error("Account sidebar brand mark must use the Blawgy-style speech-bubble tail while preserving SBA branding.");
  process.exit(1);
}

[
  '<span class="account-site-icon" data-account-workspace-icon aria-hidden="true">S</span>',
  '<span class="account-switch-chevrons" aria-hidden="true"><span>⌃</span><span>⌄</span></span>',
  ".account-site-switch {\n  justify-content: space-between;\n  gap: 16px;\n  min-width: 0;\n  min-height: 92px;",
  "border-radius: 16px;",
  ".account-site-icon.has-image {",
].forEach((needle) => {
  if (!html.includes(needle) && !styles.includes(needle)) {
    console.error(`Account workspace switcher must match Blawgy selector styling: missing ${needle}`);
    process.exit(1);
  }
});

if (styles.includes(".account-site-icon {\n  width: 20px;")) {
  console.error("Account workspace switcher icon must not be shrunk by the legacy 20px icon rule.");
  process.exit(1);
}

if (!html.includes('data-account-view="getting-started" title="Guided walkthroughs of each section"')) {
  console.error("Getting started sidebar item must expose the Blawgy guided-walkthrough tooltip.");
  process.exit(1);
}

[
  'data-account-view="plan"><span>⌂</span>Articles</button>',
  'data-account-view="write" hidden><span>✎</span>Article Builder</button>',
  'data-account-view="topics"><span>⌕</span>Keyword Finder',
  'data-account-view="search"><span>☷</span>Google Search Console</button>',
  'data-account-view="billing"><span>▭</span>Subscribe <em class="upgrade-pill">Upgrade</em></button>',
  'data-account-view="getting-started"><span>?</span>Tours</button>',
  '<h1>Scheduled Articles</h1>',
  '<h1>Write</h1>',
  '<h1>Topics</h1>',
  '<h1>Search Console</h1>',
  'data-blog-action="article-builder">Write</button>',
  "open the Article Builder from the main table.",
  'data-account-action="start-article">Start article</button>',
  'data-account-role>Client</span>',
  'data-account-updated>Session active</span>',
].forEach((needle) => {
  if (html.includes(needle)) {
    console.error(`Sidebar should not retain old Blawgy-mismatched marker: ${needle}`);
    process.exit(1);
  }
});

const ctaPanelStart = html.indexOf('data-settings-panel="cta"');
const ctaPanelEnd = html.indexOf('data-settings-panel="invite"', ctaPanelStart);
const ctaPanelHtml = ctaPanelStart === -1 ? "" : html.slice(ctaPanelStart, ctaPanelEnd === -1 ? undefined : ctaPanelEnd);
const visibleCtaFirstFold = ctaPanelHtml.split('<div class="cta-field-compat" hidden>')[0] || "";
if (visibleCtaFirstFold.includes('data-settings-field="cta.label"')) {
  console.error("CTA first fold should use the Blawgy header/card shell, not visible inline CTA fields.");
  process.exit(1);
}

const cmsPanelStart = html.indexOf('data-settings-panel="cms"');
const cmsPanelEnd = html.indexOf('data-settings-panel="locations"', cmsPanelStart);
const cmsPanelHtml = cmsPanelStart === -1 ? "" : html.slice(cmsPanelStart, cmsPanelEnd === -1 ? undefined : cmsPanelEnd);
const visibleCmsFirstFold = cmsPanelHtml.split('<div class="cms-provider-compat" hidden>')[0] || "";
[
  "Connect Your Blog Platform",
  'data-account-action="connect-cms"',
  'data-account-action="test-cms"',
  'data-account-action="disconnect-cms"',
  "data-cms-progress",
  "data-cms-details",
].forEach((needle) => {
  if (visibleCmsFirstFold.includes(needle)) {
    console.error(`CMS Connect first fold should only show URL/platform fields before hidden provider wiring: ${needle}`);
    process.exit(1);
  }
});

const imagePanelStart = html.indexOf('data-settings-panel="images"');
const imagePanelEnd = html.indexOf('data-settings-panel="cms"', imagePanelStart);
const imagePanelHtml = imagePanelStart === -1 ? "" : html.slice(imagePanelStart, imagePanelEnd === -1 ? undefined : imagePanelEnd);
const visibleImageFirstFold = imagePanelHtml.split('<div class="image-style-action-compat" hidden>')[0] || "";
[
  'data-settings-field="images.aspectRatio"',
  'data-settings-field="images.imageCadence"',
  'data-account-action="clear-image-tests"',
  "data-image-progress",
  "data-image-details",
  "image-status-badge",
].forEach((needle) => {
  if (visibleImageFirstFold.includes(needle)) {
    console.error(`Image Settings first fold should expose the Blawgy image-style controls before hidden local action/history wiring only: ${needle}`);
    process.exit(1);
  }
});
[
  "Include Images in Articles",
  "Product Images",
  "Visual Style",
  'class="image-style-field-head"',
  'class="image-style-tool-actions"',
  'data-account-action="reset-image-visual-style"',
  'data-account-action="suggest-image-visual-style"',
  "Add specific constraints for what should or shouldn't appear in generated images",
  "Use custom guidelines",
  'data-settings-toggle="images.useCustomGuidelines"',
  'data-settings-field="images.visualStyle"',
  'data-settings-field="images.guidelines"',
].forEach((needle) => {
  if (!visibleImageFirstFold.includes(needle)) {
    console.error(`Image Settings first fold is missing visible Blawgy image-style evidence: ${needle}`);
    process.exit(1);
  }
});

const tourOverlayIndex = html.indexOf("data-tour-overlay");
if (tourOverlayIndex === -1 || firstAccountPanelIndex === -1 || tourOverlayIndex > firstAccountPanelIndex) {
  console.error("Tour overlay must be outside hidden account panels so walkthrough steps remain visible.");
  process.exit(1);
}

[
  ".account-tour-overlay {\n  position: fixed;",
  "left: calc(var(--account-sidebar-width) + (100vw - var(--account-sidebar-width)) / 2);",
  "top: 50%;",
  "transform: translate(-50%, -50%);",
  "z-index: 60;",
  "width: min(632px, calc(100vw - 32px));",
  "border-radius: 24px;",
  "box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24), 0 0 0 100vmax rgba(15, 23, 42, 0.46);",
  ".account-tour-overlay.has-pointer::before",
  ".account-tour-overlay.has-tab-pointer::before",
  ".tour-footer {\n  display: flex;",
  ".tour-next-icon",
  ".account-tour-overlay .account-primary {\n  min-width: 152px;",
  "min-height: 60px;",
  "justify-content: space-between;",
  "border-right: 12px solid white;",
  "border-bottom: 12px solid white;",
  ".account-nav-item.is-tour-target",
  "z-index: 70;",
  "box-shadow: 0 0 0 8px rgba(15, 23, 42, 0.08), 0 14px 30px rgba(15, 23, 42, 0.18);",
  ".account-nav-item.is-tour-target::after",
  "linear-gradient(90deg, rgba(255, 255, 255, 0), white 55%)",
  "@media (max-width: 700px)",
  ".account-tour-overlay.has-pointer::before,\n  .account-tour-overlay.has-tab-pointer::before {\n    display: none;",
].forEach((needle) => {
  if (!styles.includes(needle)) {
    console.error(`Tour overlay must use Blawgy-style modal/backdrop styling: missing ${needle}`);
    process.exit(1);
  }
});

[
  "@media (max-width: 640px)",
  ".account-dialog-backdrop {\n    place-items: stretch;",
  ".account-dialog {\n    width: 100%;",
  "max-height: calc(100dvh - 16px);",
  "grid-template-rows: auto auto minmax(0, 1fr);",
  ".account-dialog [data-dialog-body] {\n    min-height: 0;",
  "overflow-y: auto;",
  ".billing-invoice-detail dl",
  ".billing-payment-handoff dl",
  ".account-dialog-form {\n    min-height: 0;",
  "overflow-y: auto;",
  ".account-dialog-actions {\n    position: sticky;",
  "bottom: 0;",
  ".account-dialog-actions button {\n    flex: 1 1 120px;",
  ".article-confirm-action-state dl",
].forEach((needle) => {
  if (!styles.includes(needle)) {
    console.error(`Mobile account long modal must keep long forms scrollable with reachable actions: missing ${needle}`);
    process.exit(1);
  }
});

[
  "body.route-success .site-header",
  ".success-topbar",
  ".success-brand",
  ".success-cta-icon",
  ".account-help-bubble svg",
].forEach((needle) => {
  if (!styles.includes(needle)) {
    console.error(`Success route must use its own compact checkout-success shell: missing ${needle}`);
    process.exit(1);
  }
});

const requiredAppMarkers = [
  "data-product-edit",
  "data-location-edit",
  "data-topic-edit",
  "data-support-status",
  "data-image-history-clear",
  "data-article-generation-detail",
  "data-article-generation-detail-card",
  "data-article-lifecycle-detail",
  "data-article-lifecycle-detail-card",
  "data-cms-provider-detail",
  "data-cms-provider-detail-card",
  "data-image-provider-detail",
  "data-image-provider-detail-card",
  "data-image-output-detail",
  "data-image-history-detail",
  "data-image-output-detail-card",
  "handleDynamicAccountClick",
  "control.min = field.min",
  "control.max = field.max",
  "control.step = field.step",
  'const topicDifficultyOptions = ["Easy", "Easy to rank", "Medium", "Hard", "Needs review", "Needs research"];',
  "trialLinks.forEach",
  '["/success", "success"]',
  'document.body.classList.toggle("route-success", route === "success")',
  "function renderSuccessState()",
  'new URLSearchParams(window.location.search).get("state") === "preparing"',
  "setAccountBusy",
  'postAccountAction("/api/account/billing/portal"',
  'requestJson(`/api/account/billing/invoices/${encodeURIComponent(invoiceId)}`',
  "data-billing-invoice-detail",
  "Payment handoff",
  "Stripe invoice payment remains provider-backed",
  "Retry or payment-method changes happen in the billing portal",
  "data-billing-action-detail",
  "data-billing-action-detail-card",
  "Stripe checkout and real payment-method management still need provider integration",
  'postAccountAction("/api/account/blog/posts"',
  'requestJson(`/api/account/search-console?range=${encodeURIComponent(range)}`',
  'requestJson("/api/account/search-console/export"',
  'requestJson("/api/account/rankings/export"',
  'requestJson("/api/account/ai-mentions/export"',
  'requestJson("/api/account/reports/export"',
  'postAccountAction("/api/account/reports/share"',
  'postAccountAction("/api/account/reports/schedule"',
  "data-report-schedule-checklist",
  "data-report-action-detail",
  "data-report-action-detail-card",
  "Live analytics and scheduled email delivery still need provider integrations",
  "Email delivery remains provider-backed",
  'requestJson("/api/account/seo-analysis/export"',
  'requestJson("/api/account/topics/search"',
  'requestJson("/api/account/topics/export"',
  'requestJson("/api/account/topics/save-keywords"',
  "await openBlogPostPreview(item.id)",
  "credentialRequirement",
  "Required credential",
  "Missing or rejected credentials stay visible as a provider error",
  "data-inventory-connect-checklist",
  "data-inventory-feed-detail",
  "data-inventory-feed-detail-card",
  "data-workspace-action-detail",
  "data-workspace-action-detail-card",
  "Exact workspace selector order and multi-site add flow still need target screenshot evidence",
  "Sync inventory products",
  "Secret values are never displayed",
  "Real inventory API sync remains provider-backed",
  'requestJson("/api/account/content-plan/bulk-update"',
  'action: "open-builder"',
  'action: "schedule"',
  '"Regenerate"',
  '"Publish article"',
  "data-article-confirm-action-state",
  "Action readiness",
  "Shows progress while the protected request runs",
  "Protected request errors appear in the account status line",
  "requestJson(`/api/account/blog/posts/${postId}/schedule`",
  "requestJson(`/api/account/blog/posts/${postId}`)",
  "renderCaseStudyRelatedLinks",
  "relatedStudies = Object.entries(caseStudies).filter(([candidateSlug]) => candidateSlug !== slug)",
  "blogPostToWriteDraft",
  "data-setup-jump-view",
  "setupJump",
  'window.addEventListener("beforeunload"',
  "encodeURIComponent(next)",
  'url.pathname === "/blog" || url.pathname.startsWith("/blog/")',
  "isReadOnlyWorkspace",
  "isReadOnlyDynamicControl",
  "persistAccountUi",
  "This workspace is read-only for your role.",
  "sidebarTarget: true",
  'tourOverlay.classList.toggle("has-pointer", Boolean(step.sidebarTarget))',
  "settingsTabButtons.forEach",
  'setTourTarget(step.sidebarTarget && !targetTab ? step.view : "", targetTab)',
  "A Shopify home goods brand hit #1 rankings in Australia and grew US traffic 1,962% in six months.",
  "The case study reports 421% AU traffic growth, seven page-one rankings, and six months to results.",
  "Brand new domain to 3.65M impressions and 71 paying customers in 16 months. All from blog content.",
  "The case study reports 13.9K blog clicks, average position 6, 400+ free trials, and 71 paying customers.",
  "A local business blog went from minimal traction to 321K impressions in six months.",
  "The case study reports 1.71K blog clicks, average position 11.8, and six months to results.",
];
const requiredCopyMarkers = ['Accepted as ${payload.member.email} (${payload.member.role'];
const missingAppMarkers = requiredAppMarkers.filter((needle) => !app.includes(needle));
if (missingAppMarkers.length) {
  console.error(`Missing required app markers: ${missingAppMarkers.join(", ")}`);
  process.exit(1);
}
const missingCopyMarkers = requiredCopyMarkers.filter((needle) => !app.includes(needle));
if (missingCopyMarkers.length) {
  console.error(`Missing required app copy markers: ${missingCopyMarkers.join(", ")}`);
  process.exit(1);
}

const requiredServerMarkers = [
  "serveSharedReportPage",
  "readSharedReportAccount",
  "data-shared-report",
  "`/reports/${shareId}`",
];
const missingServerMarkers = requiredServerMarkers.filter((needle) => !server.includes(needle));
if (missingServerMarkers.length) {
  console.error(`Missing required server markers: ${missingServerMarkers.join(", ")}`);
  process.exit(1);
}

const declaredDashboardAliases = Array.from(server.matchAll(/\["(\/[^"]+)", "\/account\?view=[^"]+"\]/g)).map((match) => match[1]);
const publicRouteSmoke = fs.readFileSync(path.join(__dirname, "check-public-routes.js"), "utf8");
if (!server.includes('"/case-studies"') || !publicRouteSmoke.includes('"/case-studies"')) {
  console.error("Public case-studies index must be recognized by both the server app shell and public route smoke.");
  process.exit(1);
}
const untestedDashboardAliases = declaredDashboardAliases.filter((alias) => !publicRouteSmoke.includes(`"${alias}"`));
if (untestedDashboardAliases.length) {
  console.error(`Dashboard aliases missing from public route smoke: ${untestedDashboardAliases.join(", ")}`);
  process.exit(1);
}

const invalidClientPayloadMarkers = [
  'difficulty: "Draft"',
];
const presentInvalidClientPayloadMarkers = invalidClientPayloadMarkers.filter((needle) => app.includes(needle));
if (presentInvalidClientPayloadMarkers.length) {
  console.error(`Client action payloads use unsupported account API values: ${presentInvalidClientPayloadMarkers.join(", ")}`);
  process.exit(1);
}

const forbiddenAppMarkers = [
  "window.alert(",
];
const presentForbiddenAppMarkers = forbiddenAppMarkers.filter((needle) => app.includes(needle));
if (presentForbiddenAppMarkers.length) {
  console.error(`Dashboard actions must use in-app dialogs/live regions instead of browser alerts: ${presentForbiddenAppMarkers.join(", ")}`);
  process.exit(1);
}

const forbidden = [
  "Route placeholder",
  "Standalone route placeholder",
  "Draft article placeholder",
  "Basic case-study route placeholder",
  "first-pass local map",
  "Plan selection and onboarding can attach to the authenticated account next.",
  "data-strategy-card hidden",
];
const presentForbidden = forbidden.filter((needle) => html.includes(needle));
if (presentForbidden.length) {
  console.error(`Visible placeholder route copy remains: ${presentForbidden.join(", ")}`);
  process.exit(1);
}

const staleAssetVersion = ["20260810", "dashboard", "hardening"].join("-");
if ([html, app, server, styles].some((contents) => contents.includes(staleAssetVersion))) {
  console.error(`Stale browser-cache asset version remains: ${staleAssetVersion}`);
  process.exit(1);
}

if (html.includes("Schedule weekly")) {
  console.error("Reports schedule button must not imply weekly-only scheduling.");
  process.exit(1);
}

if (html.includes("Open help chat")) {
  console.error("Help controls must not imply live chat before a chat provider is wired.");
  process.exit(1);
}

const requiredResponsiveMarkers = [
  "max-height: calc(100dvh - 40px);",
  "overflow-y: auto;",
  "overscroll-behavior: contain;",
  ".account-mobile-menu",
  ".account-app.is-account-nav-open .account-nav-group",
];
const missingResponsiveMarkers = requiredResponsiveMarkers.filter((needle) => !styles.includes(needle));
if (missingResponsiveMarkers.length) {
  console.error(`Missing mobile-safe account dialog markers: ${missingResponsiveMarkers.join(", ")}`);
  process.exit(1);
}

const actions = Array.from(html.matchAll(/data-account-action="([^"]+)"/g)).map((match) => match[1]);
const unhandledActions = Array.from(new Set(actions)).filter((action) => !app.includes(`action === "${action}"`));
if (unhandledActions.length) {
  console.error(`Unhandled account actions: ${unhandledActions.join(", ")}`);
  process.exit(1);
}

const createActions = Array.from(html.matchAll(/data-account-create-action="([^"]+)"/g)).map((match) => match[1]);
const unhandledCreateActions = Array.from(new Set(createActions)).filter((action) => !app.includes(`action === "${action}"`));
if (unhandledCreateActions.length) {
  console.error(`Unhandled account create actions: ${unhandledCreateActions.join(", ")}`);
  process.exit(1);
}

const contentToolsActions = Array.from(html.matchAll(/data-content-tools-action="([^"]+)"/g)).map((match) => match[1]);
const unhandledContentToolsActions = Array.from(new Set(contentToolsActions)).filter((action) => !app.includes(`action === "${action}"`));
if (unhandledContentToolsActions.length) {
  console.error(`Unhandled content tools actions: ${unhandledContentToolsActions.join(", ")}`);
  process.exit(1);
}

function attributeValues(source, attribute) {
  return Array.from(new Set(Array.from(source.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))).map((match) => match[1]))).sort();
}

function assertPairedAttributes(buttonAttribute, panelAttribute, routeOnlyPanels = []) {
  const buttons = attributeValues(html, buttonAttribute);
  const panels = attributeValues(html, panelAttribute);
  const missingPanels = buttons.filter((value) => !panels.includes(value));
  const missingButtons = panels.filter((value) => !buttons.includes(value) && !routeOnlyPanels.includes(value));

  if (missingPanels.length || missingButtons.length) {
    console.error(
      `Dashboard attribute mismatch for ${buttonAttribute}/${panelAttribute}: missing panels ${missingPanels.join(", ") || "none"}; missing buttons ${missingButtons.join(", ") || "none"}`
    );
    process.exit(1);
  }
}

assertPairedAttributes("data-account-view", "data-account-panel", ["getting-started"]);
assertPairedAttributes("data-settings-tab", "data-settings-panel");

const dynamicControlAttributes = Array.from(new Set(Array.from(app.matchAll(/data-([a-z-]+)="\$\{escapeAttribute/g)).map((match) => `data-${match[1]}`))).sort();
const dependentDynamicAttributes = new Set([
  "data-blog-post-id",
  "data-blog-status-count",
  "data-invite-avatar",
  "data-member-avatar",
  "data-member-next-role",
  "data-search-row-clicks",
  "data-search-row-impressions",
  "data-search-row-label",
  "data-page-generator-keyword",
  "data-page-generator-title",
  "data-setup-jump-tab",
  "data-support-next-status",
]);
const unhandledDynamicControls = dynamicControlAttributes.filter((attribute) => {
  return !dependentDynamicAttributes.has(attribute) && !app.includes(`closest("[${attribute}]`);
});

if (unhandledDynamicControls.length) {
  console.error(`Generated dynamic row controls without click handlers: ${unhandledDynamicControls.join(", ")}`);
  process.exit(1);
}

const handledButtonPatterns = [
  "menu-toggle",
  "data-nav-dropdown-toggle",
  "data-auth-logout",
  "data-public-promo-close",
  "data-billing-toggle",
  "data-account-action",
  "data-account-nav-toggle",
  "data-account-create-toggle",
  "data-account-create-action",
  "data-content-tools-toggle",
  "data-content-tools-action",
  "data-content-tools-mode",
  "data-account-view",
  "data-calendar-mode",
  "data-blog-status-filter",
  "data-search-view",
  "data-rankings-filter",
  "data-mentions-filter",
  "data-blog-action",
  "data-blog-menu-action",
  "data-page-generator-action",
  "data-calendar-shift",
  "data-product-filter",
  "data-topic-select-all",
  "data-topic-sort",
  "data-settings-tab",
  "data-account-save",
  "data-toggle-button",
  "data-billing-plan-action",
  "data-billing-period-action",
  "data-dialog-close",
];
const buttonTags = Array.from(html.matchAll(/<button\b[^>]*>/g)).map((match) => match[0]);
const unhandledButtons = buttonTags.filter((button) => {
  if (button.includes("disabled") || button.includes('aria-hidden="true"')) return false;
  return !handledButtonPatterns.some((pattern) => button.includes(pattern));
});

if (unhandledButtons.length) {
  console.error(`Visible buttons without handlers or disabled state: ${unhandledButtons.join(", ")}`);
  process.exit(1);
}

if (/<article class="account-form-card">\s*<article class="account-form-card">/.test(html)) {
  console.error("Nested account form card markup detected");
  process.exit(1);
}

const routePages = new Set(Array.from(html.matchAll(/data-route-page="([^"]+)"/g)).map((match) => match[1]));
const localHrefs = Array.from(new Set(Array.from(html.matchAll(/href="([^"]+)"/g)).map((match) => match[1]))).filter((href) => {
  return href.startsWith("/") || href.startsWith("#");
});
const hashRouteLinks = Array.from(html.matchAll(/<a\b[^>]*href="(?:\/)?#[^"]+"[^>]*data-route="[^"]+"[^>]*>/g)).map((match) => match[0]);
if (hashRouteLinks.length) {
  console.error(`Hash scroll links should not carry route metadata: ${hashRouteLinks.join(", ")}`);
  process.exit(1);
}
const missingRoutes = [];

for (const href of localHrefs) {
  if (href.startsWith("/styles.css")) continue;
  if (href === "/" || href.startsWith("/#") || href.startsWith("#")) continue;

  const pathname = href.split("?")[0].split("#")[0];
  if (pathname.startsWith("/case-studies/")) {
    if (!routePages.has("case-study")) missingRoutes.push(href);
    continue;
  }
  if (pathname.startsWith("/invite/")) {
    if (!routePages.has("invite")) missingRoutes.push(href);
    continue;
  }

  const routeName = pathname.slice(1) || "home";
  if (!routePages.has(routeName)) {
    missingRoutes.push(href);
  }
}

if (missingRoutes.length) {
  console.error(`Internal links without route pages: ${missingRoutes.join(", ")}`);
  process.exit(1);
}

const blogHeaderOrder = [
  "<th>Article Title</th>",
  "<th>Target Keyword</th>",
  "<th>Actions</th>",
  "<th>Scheduled Date</th>",
].map((marker) => html.indexOf(marker));
if (blogHeaderOrder.some((index) => index === -1)) {
  console.error("Missing Content Plan table header markers");
  process.exit(1);
}
if (!blogHeaderOrder.every((index, offset, indexes) => offset === 0 || index > indexes[offset - 1])) {
  console.error("Expected Content Plan table headers to place Actions before Scheduled Date");
  process.exit(1);
}
if (html.includes("<th>Status</th>")) {
  console.error("Expected Content Plan row status to live in filters, not a table Status column");
  process.exit(1);
}
if (html.includes('<label class="settings-field">Role<select data-invite-role>')) {
  console.error("Invite Users first fold should not show a visible Role selector");
  process.exit(1);
}
if (html.includes("Share generated links with team members manually. Links are valid for 7 days and can only be used once.")) {
  console.error("Invite Users guideline copy should match the Blawgy first-fold wording");
  process.exit(1);
}
if (!html.includes('<article class="settings-guidelines invite-guidelines">') || !html.includes('<span class="guidelines-info-icon" aria-hidden="true">i</span>')) {
  console.error("Invite Users guidance card should include the Blawgy-style leading info icon.");
  process.exit(1);
}
if (!html.includes('<div class="invite-section-divider" aria-hidden="true"></div><h2>Current Team Members</h2>')) {
  console.error("Invite Users should include the Blawgy-style divider before Current Team Members.");
  process.exit(1);
}
if (/\.settings-panel\s*\{[^}]*max-width:\s*1080px;/s.test(styles)) {
  console.error("Settings panels should not keep the old narrow 1080px cap.");
  process.exit(1);
}
if (/\.invite-user-row\s*\{[^}]*max-width:\s*840px;/s.test(styles)) {
  console.error("Invite Users email row should not keep the old narrow 840px cap.");
  process.exit(1);
}
if (!/\.settings-guidelines\.invite-guidelines\s*\{[^}]*min-height:\s*128px;/s.test(styles)) {
  console.error("Invite Users guidance card should use the taller Blawgy card treatment.");
  process.exit(1);
}
if (!/\.settings-guidelines\.invite-guidelines p\s*\{[^}]*max-width:\s*1450px;[^}]*font-size:\s*20px;/s.test(styles)) {
  console.error("Invite Users guidance copy should use the Blawgy wrap and type treatment.");
  process.exit(1);
}
if (!/\.invite-user-row \.account-primary\s*\{[^}]*min-width:\s*258px;/s.test(styles)) {
  console.error("Invite Users Generate button should match the wider Blawgy button treatment.");
  process.exit(1);
}
if (!/\.image-style-settings-shell\s*\{[^}]*display:\s*none;/s.test(styles)) {
  console.error("Image-style controls should stay hidden on the generic Image Settings route.");
  process.exit(1);
}
if (!/\.settings-panel\.is-image-style-section \.image-style-settings-shell\s*\{[^}]*display:\s*grid;/s.test(styles)) {
  console.error("Image-style controls should become visible only for the /settings/image-style section route.");
  process.exit(1);
}
if (!/\.image-style-field-head\s*\{[^}]*display:\s*flex;/s.test(styles)) {
  console.error("Image Style visual card should expose the Blawgy header row with utility buttons.");
  process.exit(1);
}
if (!/\.image-style-tool-actions\s*\{[^}]*display:\s*inline-flex;/s.test(styles)) {
  console.error("Image Style visual utility buttons should use a compact inline action rail.");
  process.exit(1);
}
if (!/\.image-guidelines-editor\s*\[hidden\]\s*\{[^}]*display:\s*none;/s.test(styles)) {
  console.error("Image guidelines editor should hide when custom guidelines are off.");
  process.exit(1);
}
if (!html.includes('<div class="settings-keyword-row"><textarea rows="2" placeholder="Add keywords (comma or new line separated)" data-settings-field="site.keywordDraft" data-account-dirty></textarea><button class="account-primary keyword-add-button" type="button" data-account-action="add-keywords">Add</button></div>')) {
  console.error("Site Settings keywords should use the Blawgy side-by-side Add row.");
  process.exit(1);
}
if (html.includes('data-account-action="add-keywords">Add</button></label>') || html.includes('class="account-primary inline" type="button" data-account-action="add-keywords"')) {
  console.error("Site Settings keyword Add button should not use the old inline absolute treatment.");
  process.exit(1);
}
if (!/\.settings-keyword-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*96px;/s.test(styles)) {
  console.error("Site Settings keyword row should match the Blawgy input plus fixed Add button layout.");
  process.exit(1);
}
if (!/\.settings-keyword-row \.keyword-add-button\s*\{[^}]*min-height:\s*82px;[^}]*align-self:\s*stretch;/s.test(styles)) {
  console.error("Site Settings keyword Add button should match the taller Blawgy button treatment.");
  process.exit(1);
}
if (!/\.locations-empty-card \.locations-empty-icon svg\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;/s.test(styles)) {
  console.error("Business Locations empty state should use the Blawgy shield icon treatment.");
  process.exit(1);
}
if (html.includes("<span>♙</span>") || app.includes("<span>♙</span>")) {
  console.error("Business Locations empty state should not use the old placeholder chess glyph.");
  process.exit(1);
}
if (!/\.account-form-card input,\s*\.account-form-card textarea,\s*\.settings-field input,\s*\.settings-field textarea,\s*\.settings-field select,\s*\.filter-row select,\s*\.filter-row input\s*\{[^}]*font:\s*inherit;[^}]*font-weight:\s*400;/s.test(styles)) {
  console.error("Settings form control text should use the regular Blawgy input weight instead of inheriting bold labels.");
  process.exit(1);
}
if (!styles.includes(".settings-field[hidden]")) {
  console.error("Hidden Settings fields must stay visually hidden even when .settings-field sets display.");
  process.exit(1);
}
if (!styles.includes(".account-topbar[hidden]")) {
  console.error("Hidden account topbar must stay visually hidden even when .account-topbar sets display.");
  process.exit(1);
}
if (!styles.includes(".account-nav-item[hidden]")) {
  console.error("Hidden account nav items must stay visually hidden even when .account-nav-item sets display.");
  process.exit(1);
}
if (!styles.includes(".account-create-shell[hidden]")) {
  console.error("Hidden Create shell must stay visually hidden even when .account-create-shell sets display.");
  process.exit(1);
}

if (!html.includes('<button class="account-primary" type="button" data-account-action="bulk-schedule" hidden>Bulk Schedule</button>')) {
  console.error("Expected Bulk Schedule to remain wired as a hidden Content Plan compatibility action");
  process.exit(1);
}
if (!html.includes('<button type="button" data-blog-action="article-builder" hidden>Article Builder</button>')) {
  console.error("Expected Article Builder to remain wired as a hidden Content Plan compatibility action");
  process.exit(1);
}
const contentToolsStrategyCount = (html.match(/data-content-tools-action="strategy"/g) || []).length;
if (contentToolsStrategyCount !== 1) {
  console.error(`Expected exactly one Strategy item in the Content Plan tools menu, found ${contentToolsStrategyCount}`);
  process.exit(1);
}
if (!html.includes('<div class="content-status-strip" aria-label="Content plan status" hidden>')) {
  console.error("Expected redundant Content Plan status strip to be hidden in favor of filter badges");
  process.exit(1);
}

console.log("Route, action, and homepage markers present.");
