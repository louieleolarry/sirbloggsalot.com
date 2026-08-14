const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

class FakeClassList {
  constructor() {
    this.classes = new Set();
  }

  add(name) {
    this.classes.add(name);
  }

  remove(name) {
    this.classes.delete(name);
  }

  toggle(name, force) {
    if (force === true) {
      this.add(name);
      return true;
    }
    if (force === false) {
      this.remove(name);
      return false;
    }
    if (this.classes.has(name)) {
      this.remove(name);
      return false;
    }
    this.add(name);
    return true;
  }

  contains(name) {
    return this.classes.has(name);
  }
}

class FakeElement {
  constructor() {
    this.children = [];
    this.classList = new FakeClassList();
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.textContent = "";
    this._innerHTML = "";
    this.offsetWidth = 360;
    this.listeners = {};
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  removeAttribute() {}
  remove() {}
  contains() {
    return false;
  }
  closest() {
    return null;
  }
  querySelector() {
    return new FakeElement();
  }
  querySelectorAll() {
    return [];
  }
  focus() {}
}

const elements = {
  "[data-public-promo]": new FakeElement(),
  "[data-public-promo-close]": new FakeElement(),
  "[data-account-busy-root]": new FakeElement(),
  "[data-account-nav-toggle]": new FakeElement(),
  "[data-account-create-toggle]": new FakeElement(),
  "[data-account-create-menu]": new FakeElement(),
  "[data-account-workspace]": new FakeElement(),
  "[data-account-team-email]": new FakeElement(),
  "[data-account-team-initial]": new FakeElement(),
  "[data-account-role]": new FakeElement(),
  "[data-content-plan-headline]": new FakeElement(),
  "[data-content-plan-stats]": new FakeElement(),
  "[data-content-tools-toggle]": new FakeElement(),
  "[data-content-tools-menu]": new FakeElement(),
  "[data-content-calendar]": new FakeElement(),
  "[data-blog-table-shell]": new FakeElement(),
  "[data-blog-table-body]": new FakeElement(),
  "[data-blog-bulk-bar]": new FakeElement(),
  "[data-blog-selected]": new FakeElement(),
  "[data-blog-bulk-status]": new FakeElement(),
  '[data-blog-action="bulk-update"]': new FakeElement(),
  '[data-blog-action="bulk-clear"]': new FakeElement(),
  "[data-strategy-card]": new FakeElement(),
  "[data-content-strategy]": new FakeElement(),
  '[data-account-action="bulk-schedule"]': new FakeElement(),
  '[data-account-action="add-topic-to-plan"]': new FakeElement(),
  "[data-content-plan-summary]": new FakeElement(),
  "[data-content-window]": new FakeElement(),
  "[data-account-operation]": new FakeElement(),
  "[data-setup-progress]": new FakeElement(),
  "[data-setup-list]": new FakeElement(),
  "[data-report-summary]": new FakeElement(),
  "[data-report-chart]": new FakeElement(),
  "[data-report-templates]": new FakeElement(),
  "[data-report-share]": new FakeElement(),
  "[data-report-schedule]": new FakeElement(),
  "[data-report-progress]": new FakeElement(),
  "[data-report-list]": new FakeElement(),
  '[data-account-action="share-report"]': new FakeElement(),
  '[data-account-action="schedule-report"]': new FakeElement(),
  '[data-account-action="export-reports"]': new FakeElement(),
  "[data-seo-score]": new FakeElement(),
  "[data-seo-chart]": new FakeElement(),
  "[data-seo-checks]": new FakeElement(),
  "[data-seo-issues]": new FakeElement(),
  "[data-seo-opportunities]": new FakeElement(),
  "[data-image-details]": new FakeElement(),
  "[data-image-progress]": new FakeElement(),
  "[data-image-guidelines-editor]": new FakeElement(),
  '[data-account-action="test-image-settings"]': new FakeElement(),
  '[data-account-action="clear-image-tests"]': new FakeElement(),
  '[data-account-action="reset-image-visual-style"]': new FakeElement(),
  '[data-account-action="suggest-image-visual-style"]': new FakeElement(),
  "[data-cms-status]": new FakeElement(),
  "[data-cms-details]": new FakeElement(),
  "[data-cms-progress]": new FakeElement(),
  '[data-account-action="connect-cms"]': new FakeElement(),
  '[data-account-action="test-cms"]': new FakeElement(),
  '[data-account-action="disconnect-cms"]': new FakeElement(),
  "[data-inventory-status]": new FakeElement(),
  "[data-inventory-details]": new FakeElement(),
  "[data-inventory-progress]": new FakeElement(),
  '[data-account-action="connect-inventory"]': new FakeElement(),
  '[data-account-action="sync-inventory"]': new FakeElement(),
  '[data-account-action="disconnect-inventory"]': new FakeElement(),
  "[data-cta-preview]": new FakeElement(),
  '[data-account-action="edit-cta"]': new FakeElement(),
  '[data-account-action="reset-cta"]': new FakeElement(),
  "[data-search-clicks]": new FakeElement(),
  "[data-search-impressions]": new FakeElement(),
  "[data-search-indexed]": new FakeElement(),
  "[data-search-status]": new FakeElement(),
  "[data-search-list-title]": new FakeElement(),
  "[data-search-details]": new FakeElement(),
  "[data-search-pages-list]": new FakeElement(),
  "[data-search-queries-list]": new FakeElement(),
  "[data-search-filter]": new FakeElement(),
  "[data-search-chart]": new FakeElement(),
  "[data-search-range]": new FakeElement(),
  "[data-search-row-limit]": new FakeElement(),
  "[data-search-progress]": new FakeElement(),
  '[data-account-action="connect-search-console"]': new FakeElement(),
  '[data-account-action="sync-search-console"]': new FakeElement(),
  '[data-account-action="export-search-console"]': new FakeElement(),
  '[data-account-action="disconnect-search-console"]': new FakeElement(),
  "[data-billing-alert]": new FakeElement(),
  "[data-billing-status]": new FakeElement(),
  "[data-billing-summary]": new FakeElement(),
  "[data-billing-portal-status]": new FakeElement(),
  "[data-billing-invoices]": new FakeElement(),
  "[data-billing-progress]": new FakeElement(),
  '[data-account-action="billing-portal"]': new FakeElement(),
  '[data-account-action="cancel-billing"]': new FakeElement(),
  '[data-account-action="reactivate-billing"]': new FakeElement(),
  "[data-write-preview]": new FakeElement(),
  "[data-write-status]": new FakeElement(),
  "[data-write-progress]": new FakeElement(),
  "[data-article-generated-actions]": new FakeElement(),
  '[data-account-action="save-builder-draft"]': new FakeElement(),
  '[data-account-action="preview-article"]': new FakeElement(),
  '[data-account-action="start-article"]': new FakeElement(),
  "[data-article-preview-title]": new FakeElement(),
  "[data-article-preview-meta]": new FakeElement(),
  "[data-article-preview-readiness]": new FakeElement(),
  "[data-article-preview-body]": new FakeElement(),
  "[data-article-preview-schedule]": new FakeElement(),
  "[data-article-builder-readiness-summary]": new FakeElement(),
  "[data-article-builder-schedule-summary]": new FakeElement(),
  "[data-article-builder-url-summary]": new FakeElement(),
  "[data-rankings-summary]": new FakeElement(),
  "[data-rankings-chart]": new FakeElement(),
  "[data-rankings-range]": new FakeElement(),
  "[data-rankings-list]": new FakeElement(),
  "[data-rankings-search]": new FakeElement(),
  "[data-rankings-progress]": new FakeElement(),
  '[data-account-action="refresh-rankings"]': new FakeElement(),
  '[data-account-action="export-rankings"]': new FakeElement(),
  "[data-mentions-summary]": new FakeElement(),
  "[data-mentions-chart]": new FakeElement(),
  "[data-mentions-range]": new FakeElement(),
  "[data-mentions-source]": new FakeElement(),
  "[data-mentions-model]": new FakeElement(),
  "[data-mentions-list]": new FakeElement(),
  "[data-mentions-search]": new FakeElement(),
  "[data-mentions-progress]": new FakeElement(),
  '[data-account-action="refresh-ai-mentions"]': new FakeElement(),
  '[data-account-action="export-ai-mentions"]': new FakeElement(),
  "[data-products-list]": new FakeElement(),
  "[data-products-manual-controls]": new FakeElement(),
  "[data-product-search]": new FakeElement(),
  "[data-locations-list]": new FakeElement(),
  "[data-pages-generator-list]": new FakeElement(),
  "[data-pages-generator-count]": new FakeElement(),
  "[data-members-list]": new FakeElement(),
  "[data-invites-list]": new FakeElement(),
  "[data-invite-email]": new FakeElement(),
  "[data-invite-role]": new FakeElement(),
  "[data-invite-message]": new FakeElement(),
  "[data-invite-detail]": new FakeElement(),
  "[data-invite-login]": new FakeElement(),
  '[data-account-action="accept-invite"]': new FakeElement(),
  "[data-team-activity-section]": new FakeElement(),
  "[data-team-activity-list]": new FakeElement(),
  "[data-support-list]": new FakeElement(),
  '[data-account-action="create-support-ticket"]': new FakeElement(),
  '[data-account-action="help-chat"]': new FakeElement(),
  "[data-topic-list]": new FakeElement(),
  "[data-keyword-total]": new FakeElement(),
  "[data-keyword-filtered]": new FakeElement(),
  "[data-keyword-selected]": new FakeElement(),
  "[data-keyword-progress]": new FakeElement(),
  '[data-account-action="magic-select-keywords"]': new FakeElement(),
  '[data-account-action="save-keywords"]': new FakeElement(),
  "[data-description-progress]": new FakeElement(),
  '[data-account-action="generate-description"]': new FakeElement(),
  '[data-account-action="add-keywords"]': new FakeElement(),
  '[data-account-action="add-product"]': new FakeElement(),
  '[data-account-action="add-location"]': new FakeElement(),
  '[data-account-action="generate-invite"]': new FakeElement(),
  "[data-keyword-list]": new FakeElement(),
  "[data-topic-search-input]": new FakeElement(),
  '[data-account-action="search-keywords"]': new FakeElement(),
  '[data-account-action="find-topics"]': new FakeElement(),
  "[data-account-dialog]": new FakeElement(),
  "[data-dialog-title]": new FakeElement(),
  "[data-dialog-body]": new FakeElement(),
  "[data-dialog-form]": new FakeElement(),
  "[data-dialog-close]": new FakeElement(),
  "[data-account-save]": new FakeElement(),
  "[data-tour-overlay]": new FakeElement(),
  "[data-tour-eyebrow]": new FakeElement(),
  "[data-tour-title]": new FakeElement(),
  "[data-tour-body]": new FakeElement(),
  "[data-tour-dots]": new FakeElement(),
  "[data-tour-progress]": new FakeElement(),
  '[data-account-action="start-tour"]': new FakeElement(),
  '[data-account-action="tour-back"]': new FakeElement(),
  '[data-account-action="tour-next"]': new FakeElement(),
  '[data-account-action="tour-finish"]': new FakeElement(),
  '[data-account-action="tour-close"]': new FakeElement(),
};
const contentCounts = ["scheduled", "draft", "processing", "published", "failed", "paused"].map((status) => {
  const element = new FakeElement();
  element.dataset.contentCount = status;
  return element;
});
const calendarModeButtons = ["grid", "list"].map((mode) => {
  const element = new FakeElement();
  element.dataset.calendarMode = mode;
  return element;
});
const calendarShiftButtons = ["-1", "today", "1"].map((shift) => {
  const element = new FakeElement();
  element.dataset.calendarShift = shift;
  return element;
});
const blogStatusFilters = ["all", "scheduled", "processing", "draft", "published", "failed", "paused"].map((status) => {
  const element = new FakeElement();
  element.dataset.blogStatusFilter = status;
  element.dataset.blogStatusLabel = status === "all" ? "All" : status === "draft" ? "Generated" : status === "failed" ? "Needs attention" : status.charAt(0).toUpperCase() + status.slice(1);
  return element;
});
const blogSelectAllControls = [new FakeElement()];
blogSelectAllControls[0].dataset.blogSelectAll = "";
const searchViews = ["queries", "pages"].map((view) => {
  const element = new FakeElement();
  element.dataset.searchView = view;
  return element;
});
const searchRowLimitInputs = [elements["[data-search-row-limit]"], new FakeElement()];
searchRowLimitInputs[0].dataset.searchRowLimit = "pages";
searchRowLimitInputs[1].dataset.searchRowLimit = "queries";
const rankingsFilters = ["all", "improved", "declined"].map((status) => {
  const element = new FakeElement();
  element.dataset.rankingsFilter = status;
  return element;
});
const mentionsFilters = ["all", "mentioned", "monitoring"].map((status) => {
  const element = new FakeElement();
  element.dataset.mentionsFilter = status;
  return element;
});
const productFilterButtons = ["all", "synced", "manual", "hidden"].map((filter) => {
  const element = new FakeElement();
  element.dataset.productFilter = filter;
  return element;
});
const topicFilterInputs = ["difficultyMin", "difficultyMax", "cpcMin", "cpcMax", "volumeMin", "volumeMax", "competitionMin", "competitionMax"].map((field) => {
  const element = new FakeElement();
  element.dataset.topicFilter = field;
  element.value = "";
  return element;
});
const topicSortButtons = ["keyword", "volume", "cpc", "difficultyScore", "competition"].map((field) => {
  const element = new FakeElement();
  element.dataset.topicSort = field;
  return element;
});
const topicSelectAllControls = [new FakeElement(), new FakeElement()];
topicSelectAllControls.forEach((element) => {
  element.dataset.topicSelectAll = "";
});
const settingsFieldInputs = ["site.keywordDraft", "images.visualStyle", "images.guidelines"].map((field) => {
  const element = new FakeElement();
  element.dataset.settingsField = field;
  element.value = "";
  return element;
});
const settingsToggleButtons = ["images.includeImages", "images.useProductImages", "images.useCustomGuidelines", "cta.enabled"].map((field) => {
  const element = new FakeElement();
  element.dataset.settingsToggle = field;
  return element;
});
const writeFieldInputs = [
  "title",
  "slug",
  "keyword",
  "category",
  "excerpt",
  "scheduledDate",
  "scheduledTime",
  "canonicalUrl",
  "authorName",
  "template",
  "audience",
  "wordCount",
  "volume",
  "difficulty",
  "estimatedVisits",
  "internalLinks",
  "seoTitle",
  "metaDescription",
  "featuredImageUrl",
  "featuredImageAlt",
  "brief",
  "body",
  "notes",
].map((field) => {
  const element = new FakeElement();
  element.dataset.writeField = field;
  element.value = "";
  return element;
});
const billingPlanActions = ["Pro", "Pro+"].map((plan) => {
  const element = new FakeElement();
  element.dataset.billingPlanAction = plan;
  return element;
});
const billingPeriodActions = ["annual", "monthly"].map((period) => {
  const element = new FakeElement();
  element.dataset.billingPeriodAction = period;
  return element;
});
const accountViewButtons = ["plan", "write", "topics", "rankings", "search", "mentions", "reports", "seo-analysis", "settings", "pages", "getting-started", "billing", "help"].map((view) => {
  const element = new FakeElement();
  element.dataset.accountView = view;
  return element;
});
const accountCreateActionButtons = ["article", "topic", "product", "location", "ticket"].map((action) => {
  const element = new FakeElement();
  element.dataset.accountCreateAction = action;
  return element;
});
const contentToolsActionButtons = ["strategy", "refresh", "add-topic-to-plan", "bulk-schedule"].map((action) => {
  const element = new FakeElement();
  element.dataset.contentToolsAction = action;
  return element;
});
const contentToolsModeButtons = ["grid", "list"].map((mode) => {
  const element = new FakeElement();
  element.dataset.contentToolsMode = mode;
  return element;
});
const accountPanels = ["plan", "write", "topics", "rankings", "search", "mentions", "reports", "seo-analysis", "settings", "pages", "getting-started", "billing", "help"].map((panel) => {
  const element = new FakeElement();
  element.dataset.accountPanel = panel;
  return element;
});
const settingsTabButtons = ["site", "products", "images", "cms", "locations", "cta", "invite"].map((tab) => {
  const element = new FakeElement();
  element.dataset.settingsTab = tab;
  return element;
});
const settingsTabsShell = new FakeElement();
const settingsPanels = ["site", "products", "images", "cms", "locations", "cta", "invite"].map((panel) => {
  const element = new FakeElement();
  element.dataset.settingsPanel = panel;
  return element;
});
const logoutButtons = [new FakeElement(), new FakeElement()];
const trialLinks = [
  { plan: "", label: "hero" },
  { plan: "Pro", label: "pro" },
  { plan: "Pro+", label: "pro-plus" },
].map(({ plan, label }) => {
  const element = new FakeElement();
  element.dataset.authTrial = "";
  element.dataset.authTrialLabel = label;
  if (plan) element.dataset.authTrialPlan = plan;
  element.href = "/signup";
  return element;
});
const windowHandlers = {};
const documentHandlers = {};
const fetchCalls = [];
const clipboardWrites = [];
const historyWrites = [];
const localStorageValues = new Map();

const document = {
  body: new FakeElement(),
  head: new FakeElement(),
  addEventListener(type, handler) {
    documentHandlers[type] = documentHandlers[type] || [];
    documentHandlers[type].push(handler);
  },
  createElement(tagName) {
    const element = new FakeElement();
    if (tagName === "template") {
      element.content = { firstElementChild: new FakeElement() };
    }
    return element;
  },
  querySelector(selector) {
    if (selector === ".settings-tabs") return settingsTabsShell;
    return elements[selector] || new FakeElement();
  },
  querySelectorAll(selector) {
    if (selector === "[data-content-count]") return contentCounts;
    if (selector === "[data-calendar-mode]") return calendarModeButtons;
    if (selector === "[data-calendar-shift]") return calendarShiftButtons;
    if (selector === "[data-blog-status-filter]") return blogStatusFilters;
    if (selector === "[data-blog-select-all]") return blogSelectAllControls;
    if (selector === "[data-search-view]") return searchViews;
    if (selector === "[data-search-row-limit]") return searchRowLimitInputs;
    if (selector === "[data-rankings-filter]") return rankingsFilters;
    if (selector === "[data-mentions-filter]") return mentionsFilters;
    if (selector === "[data-product-filter]") return productFilterButtons;
    if (selector === "[data-topic-filter]") return topicFilterInputs;
    if (selector === "[data-topic-sort]") return topicSortButtons;
    if (selector === "[data-topic-select-all]") return topicSelectAllControls;
    if (selector === "[data-settings-field]") return settingsFieldInputs;
    if (selector === "[data-settings-toggle]") return settingsToggleButtons;
    if (selector === "[data-write-field]") return writeFieldInputs;
    if (selector === "[data-billing-plan-action]") return billingPlanActions;
    if (selector === "[data-billing-period-action]") return billingPeriodActions;
    if (selector === "[data-account-view]") return accountViewButtons;
    if (selector === "[data-account-create-action]") return accountCreateActionButtons;
    if (selector === "[data-content-tools-action]") return contentToolsActionButtons;
    if (selector === "[data-content-tools-mode]") return contentToolsModeButtons;
    if (selector === "[data-account-panel]") return accountPanels;
    if (selector === "[data-settings-tab]") return settingsTabButtons;
    if (selector === "[data-settings-panel]") return settingsPanels;
    if (selector === "[data-auth-logout]") return logoutButtons;
    if (selector === "[data-auth-trial]") return trialLinks;
    return [];
  },
};

const location = { pathname: "/account", search: "", origin: "https://sirbloggsalot.com" };
let formEntries = [];
function setLocation(next) {
  const url = new URL(next, location.origin);
  location.pathname = url.pathname;
  location.search = url.search;
}

const context = {
  console,
  document,
  window: {
    addEventListener(type, handler) {
      windowHandlers[type] = handler;
    },
    matchMedia: () => ({ matches: false }),
    scrollTo() {},
    setTimeout(callback) {
      callback();
      return 0;
    },
    localStorage: {
      getItem(key) {
        return localStorageValues.has(key) ? localStorageValues.get(key) : null;
      },
      setItem(key, value) {
        localStorageValues.set(key, String(value));
      },
      removeItem(key) {
        localStorageValues.delete(key);
      },
    },
    location,
    history: {
      pushState(_state, _title, next) {
        historyWrites.push({ mode: "push", next });
        setLocation(next);
      },
      replaceState(_state, _title, next) {
        historyWrites.push({ mode: "replace", next });
        setLocation(next);
      },
    },
  },
  navigator: {
    clipboard: {
      writeText(value) {
        clipboardWrites.push(value);
        return Promise.resolve();
      },
    },
  },
  fetch: (url, options) => {
    fetchCalls.push({ url, options });
    return Promise.reject(new Error("network disabled in render test"));
  },
  URL,
  URLSearchParams,
  Date,
  Promise,
  FormData: class {
    entries() {
      return formEntries;
    }
  },
  requestAnimationFrame: (callback) => callback(),
};

vm.createContext(context);
const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
assert.ok(indexHtml.includes("<h1>Content Plan</h1>"), "Account dashboard should use Blawgy's Content Plan heading.");
assert.strictEqual(indexHtml.includes("<h1>Scheduled Articles</h1>"), false, "Account dashboard should not retain the older Scheduled Articles heading.");
assert.ok(
  indexHtml.includes('<button type="button" data-account-action="strategy"><span class="toolbar-sliders-icon" aria-hidden="true"></span>Strategy</button>') &&
    indexHtml.includes('aria-label="Grid view" data-calendar-mode="grid"><span class="toolbar-grid-icon" aria-hidden="true"></span></button>') &&
    indexHtml.includes('aria-label="List view" data-calendar-mode="list"><span class="toolbar-list-icon" aria-hidden="true"></span></button>') &&
    indexHtml.includes('aria-label="Refresh" data-account-action="refresh"><span class="toolbar-refresh-icon" aria-hidden="true"></span></button>') &&
    indexHtml.includes('data-content-tools-toggle aria-expanded="false"><span class="toolbar-more-icon" aria-hidden="true"></span></button>') &&
    indexHtml.includes('class="account-calendar-tools"') &&
    indexHtml.includes('data-account-action="add-topic-to-plan">+ Add topics</button>'),
  "Content Plan first fold should expose Blawgy's Strategy, view, refresh, overflow, date-window, and Add topics controls."
);
assert.ok(
  indexHtml.includes('<button class="account-primary" type="button" data-account-action="bulk-schedule" hidden>Bulk Schedule</button>') &&
    indexHtml.includes('<button type="button" data-blog-action="article-builder" hidden>Article Builder</button>'),
  "Bulk Schedule and Article Builder should remain hidden compatibility actions until exact menu placement is captured."
);
const accountSidebarStart = indexHtml.indexOf('<aside class="account-sidebar"');
const visibleSidebarHtml = indexHtml
  .slice(accountSidebarStart, indexHtml.indexOf("</aside>", accountSidebarStart))
  .replace(/\s+/g, " ");
assert.ok(
  visibleSidebarHtml.includes('<small>CREATE</small>') &&
  visibleSidebarHtml.includes('data-account-view="plan"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-home"></use></svg>Content Plan</button>') &&
    visibleSidebarHtml.includes('data-account-view="write"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-write"></use></svg>Write</button>') &&
    visibleSidebarHtml.includes('data-account-view="topics"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-topics"></use></svg>Topics</button>') &&
    visibleSidebarHtml.includes('<small>TRACK</small>') &&
    visibleSidebarHtml.includes('data-account-view="rankings"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-rankings"></use></svg>Rankings <em>Pro+</em></button>') &&
    visibleSidebarHtml.includes('data-account-view="search"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-search-console"></use></svg>Search Console</button>') &&
    visibleSidebarHtml.includes('data-account-view="mentions"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-mentions"></use></svg>AI Mentions <em>Pro+</em></button>') &&
    visibleSidebarHtml.includes('data-account-view="settings"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-settings"></use></svg>Settings</button>') &&
    visibleSidebarHtml.includes('data-account-view="getting-started" title="Guided walkthroughs of each section"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-help-circle"></use></svg>Getting started</button>') &&
    visibleSidebarHtml.includes('data-account-view="billing"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-billing"></use></svg>Billing</button>') &&
    visibleSidebarHtml.includes('data-account-view="help"><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-help"></use></svg>Help</button>') &&
    visibleSidebarHtml.includes('data-auth-logout><svg class="account-line-icon" aria-hidden="true"><use href="#account-icon-log-out"></use></svg>Log out</button>'),
  "Sidebar should match the Blawgy screenshots: CREATE, TRACK, Settings, Getting started, Billing, Help, and Log out with visible route controls."
);
assert.ok(
  indexHtml.includes('data-content-plan-stats'),
  "Account dashboard should expose Blawgy-style scheduled/writing/published headline stats."
);
assert.ok(
  indexHtml.includes('<fieldset class="keyword-filter-group"><legend>DIFFICULTY (KD) <span aria-hidden="true">i</span></legend>'),
  "Keyword Finder should group difficulty filters under the Blawgy DIFFICULTY (KD) heading."
);
assert.ok(
  indexHtml.includes('<fieldset class="keyword-filter-group"><legend>CPC ($) <span aria-hidden="true">i</span></legend>'),
  "Keyword Finder should group CPC filters under the Blawgy CPC ($) heading."
);
assert.ok(
  indexHtml.includes('<fieldset class="keyword-filter-group"><legend>VOLUME <span aria-hidden="true">i</span></legend>'),
  "Keyword Finder should group volume filters under the Blawgy VOLUME heading."
);
assert.ok(
  indexHtml.includes('<fieldset class="keyword-filter-group"><legend>COMPETITION <span aria-hidden="true">i</span></legend>'),
  "Keyword Finder should group competition filters under the Blawgy COMPETITION heading."
);
assert.strictEqual(
  indexHtml.includes('<label>Search<input type="search" placeholder="Search keywords..." data-topic-search-input /></label>'),
  false,
  "Keyword Finder filter card should not show a search input in the captured Blawgy layout."
);
assert.ok(
  indexHtml.includes('data-account-action="strategy"><span class="toolbar-sliders-icon" aria-hidden="true"></span>Strategy</button>'),
  "Content Plan should expose the Blawgy Strategy control in the first fold."
);
assert.ok(
  indexHtml.includes('aria-label="Grid view" data-calendar-mode="grid"><span class="toolbar-grid-icon" aria-hidden="true"></span></button>'),
  "Content Plan should expose the Blawgy grid view control in the first fold."
);
assert.ok(
  indexHtml.includes('aria-label="List view" data-calendar-mode="list"><span class="toolbar-list-icon" aria-hidden="true"></span></button>'),
  "Content Plan should expose the Blawgy list view control in the first fold."
);
assert.ok(
  indexHtml.includes('aria-label="Refresh" data-account-action="refresh"><span class="toolbar-refresh-icon" aria-hidden="true"></span></button>'),
  "Content Plan should expose the Blawgy refresh control in the first fold."
);
assert.ok(
  indexHtml.includes('data-blog-table-shell'),
  "Content Plan should expose a dedicated table shell that can toggle with grid/list mode."
);
assert.ok(
  indexHtml.includes('<div class="blog-table-shell" aria-label="Articles table" data-blog-table-shell hidden>'),
  "Articles should keep the table shell available for list mode."
);
assert.ok(
  indexHtml.includes('<button class="is-active" type="button" aria-label="Grid view" data-calendar-mode="grid"><span class="toolbar-grid-icon" aria-hidden="true"></span></button>') &&
    indexHtml.includes('<button type="button" aria-label="List view" data-calendar-mode="list"><span class="toolbar-list-icon" aria-hidden="true"></span></button>') &&
    indexHtml.includes('<div class="blog-table-shell" aria-label="Articles table" data-blog-table-shell hidden>') &&
    indexHtml.includes('<div class="content-calendar" aria-label="Content calendar" data-content-calendar>'),
  "The screenshot-backed Content Plan default should show the calendar/card grid with the grid control active before account data loads."
);
assert.ok(
  indexHtml.includes('data-article-generated-actions'),
  "Article Builder should expose a generated-state action rail for save, schedule, publish, and regenerate controls."
);
assert.ok(
  indexHtml.includes('data-article-editor-shell'),
  "Article Builder should expose a Blawgy-style generated editor shell around the draft body."
);
assert.ok(
  indexHtml.includes('data-article-builder-status-grid'),
  "Article Builder should expose generated-state readiness and schedule summary blocks."
);
assert.ok(
  indexHtml.includes('data-article-seo-panel') && indexHtml.includes('data-article-image-panel'),
  "Article Builder should group SEO and image metadata into generated editor side panels."
);
assert.ok(
  indexHtml.includes('data-products-manual-controls'),
  "Products should group manual add/filter/list controls so the disconnected empty state can match the Blawgy capture."
);
assert.ok(
  indexHtml.includes('data-account-view="pages"') &&
    indexHtml.includes('data-account-panel="pages"') &&
    indexHtml.includes("<h1>Pages</h1>") &&
    indexHtml.includes("Generate location pages from your saved business locations.") &&
    indexHtml.includes("Pick which location a batch of pages targets.") &&
    indexHtml.includes("data-pages-generator-list") &&
    indexHtml.includes("data-page-generator-location"),
  "Pages generator should exist as a route-compatible Blawgy destination for the Business Locations tab promise."
);
assert.ok(
  indexHtml.includes('<symbol id="account-icon-store"') &&
    indexHtml.includes('<span class="integration-icon"><svg aria-hidden="true"><use href="#account-icon-store"></use></svg></span><strong>Inventory Feed</strong>'),
  "Products source card should use a Blawgy-style storefront line icon inside the neutral integration tile."
);
const targetAudienceIndex = indexHtml.indexOf('data-settings-field="site.targetAudience"');
const keywordDraftIndex = indexHtml.indexOf('data-settings-field="site.keywordDraft"');
const keywordMixIndex = indexHtml.indexOf('data-settings-field="site.keywordMix"');
const brandVoiceIndex = indexHtml.indexOf('data-settings-field="site.brandVoice"');
assert.ok(
  indexHtml.includes("Who your articles should speak to. Sir Bloggsalot uses this to guide topics, titles, and writing when it is filled in."),
  "Site Settings should include the Blawgy-style Target Audience helper text."
);
assert.ok(
  indexHtml.includes("Your own keywords. Sir Bloggsalot turns these into articles at the rate the mix below sets. At 0, it writes from your discovered topics only. Use terms your audience actually searches for. Here's a guide on how to find good keywords."),
  "Site Settings should include the full Blawgy-style keyword helper text."
);
assert.ok(
  indexHtml.includes("Choose how much of each week comes from your keywords versus the topics Sir Bloggsalot discovers."),
  "Site Settings should include the Blawgy-style keyword mix helper text."
);
assert.ok(
  indexHtml.includes('<div class="settings-field-head"><label>Product Description</label><div class="settings-field-actions"><button type="button" data-account-action="generate-description"'),
  "Site Settings Product Description should use the Blawgy-style label/action header row."
);
assert.ok(
  indexHtml.includes('data-account-action="generate-description"><svg class="account-action-icon" aria-hidden="true"><use href="#account-icon-sparkles"></use></svg>Generate using AI</button>'),
  "Site Settings Generate using AI action should use the Blawgy-style line sparkle icon instead of a text glyph."
);
assert.ok(
  indexHtml.includes('<article class="settings-guidelines invite-guidelines"><span class="guidelines-info-icon" aria-hidden="true">i</span>'),
  "Invite Users guidance card should include the Blawgy-style leading info icon."
);
assert.ok(
  indexHtml.includes('<div class="invite-section-divider" aria-hidden="true"></div><h2>Current Team Members</h2>'),
  "Invite Users should include the Blawgy-style divider before Current Team Members."
);
assert.ok(
  !/\.settings-panel\s*\{[^}]*max-width:\s*1080px;/s.test(styles),
  "Settings panels should not keep the old narrow 1080px cap."
);
assert.ok(
  !/\.invite-user-row\s*\{[^}]*max-width:\s*840px;/s.test(styles),
  "Invite Users email row should not keep the old narrow 840px cap."
);
assert.ok(
  /\.settings-guidelines\.invite-guidelines\s*\{[^}]*min-height:\s*128px;/s.test(styles),
  "Invite Users guidance card should use the taller Blawgy card treatment."
);
assert.ok(
  /\.settings-guidelines\.invite-guidelines p\s*\{[^}]*max-width:\s*1450px;[^}]*font-size:\s*20px;/s.test(styles),
  "Invite Users guidance copy should use the Blawgy wrap and type treatment."
);
assert.ok(
  /\.invite-user-row \.account-primary\s*\{[^}]*min-width:\s*258px;/s.test(styles),
  "Invite Users Generate button should match the wider Blawgy button treatment."
);
assert.ok(
  /\.image-style-settings-shell\s*\{[^}]*display:\s*none;/s.test(styles),
  "Image-style controls should stay hidden on the generic Image Settings route."
);
assert.ok(
  /\.settings-panel\.is-image-style-section \.image-style-settings-shell\s*\{[^}]*display:\s*grid;/s.test(styles),
  "Image-style controls should become visible only for the /settings/image-style section route."
);
assert.ok(
  indexHtml.includes('<div class="settings-keyword-row"><textarea rows="2" placeholder="Add keywords (comma or new line separated)" data-settings-field="site.keywordDraft" data-account-dirty></textarea><button class="account-primary keyword-add-button" type="button" data-account-action="add-keywords">Add</button></div>'),
  "Site Settings keywords should use the Blawgy side-by-side Add row."
);
assert.ok(
  !indexHtml.includes('data-account-action="add-keywords">Add</button></label>') &&
    !indexHtml.includes('class="account-primary inline" type="button" data-account-action="add-keywords"'),
  "Site Settings keyword Add button should not use the old inline absolute treatment."
);
assert.ok(
  /\.settings-keyword-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*96px;/s.test(styles),
  "Site Settings keyword row should match the Blawgy input plus fixed Add button layout."
);
assert.ok(
  /\.settings-keyword-row \.keyword-add-button\s*\{[^}]*min-height:\s*82px;[^}]*align-self:\s*stretch;/s.test(styles),
  "Site Settings keyword Add button should match the taller Blawgy button treatment."
);
assert.ok(
  /\.account-form-card input,\s*\.account-form-card textarea,\s*\.settings-field input,\s*\.settings-field textarea,\s*\.settings-field select,\s*\.filter-row select,\s*\.filter-row input\s*\{[^}]*font:\s*inherit;[^}]*font-weight:\s*400;/s.test(styles),
  "Settings form control text should use the regular Blawgy input weight instead of inheriting bold labels."
);
assert.ok(targetAudienceIndex > -1 && keywordDraftIndex > targetAudienceIndex, "Your keywords should follow Target Audience in Site Settings.");
assert.ok(keywordMixIndex > keywordDraftIndex, "Keyword mix should follow Your keywords in Site Settings.");
assert.ok(brandVoiceIndex > keywordMixIndex, "Advanced Site Settings fields should follow the visible Blawgy keyword sequence.");
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8"), context);

assert.strictEqual(elements["[data-public-promo]"].hidden, false);
elements["[data-public-promo-close]"].listeners.click[0]();
assert.strictEqual(elements["[data-public-promo]"].hidden, true);
assert.strictEqual(localStorageValues.get("sirbloggs_public_promo_dismissed"), "2026-08-31");

console.log("Public promo dismissal checks passed.");

const defaultGridPlanFixture = {
  id: "owner",
  ownerEmail: "owner@example.com",
  workspaceName: "Owner",
  settings: { site: { publishingCadence: "Weekly" } },
  ui: {},
  contentPlan: {
    items: [
      {
        id: "default-grid",
        title: "Default grid article",
        keyword: "default grid",
        volume: 120,
        difficulty: "Easy",
        estimatedVisits: 44,
        scheduledDate: "2026-08-10",
        status: "scheduled",
      },
    ],
  },
  products: [],
  locations: [],
  members: [],
  invites: [],
  billing: {},
  searchConsole: {},
  rankings: {},
  aiMentions: {},
  supportTickets: [],
};
context.defaultGridPlanFixture = defaultGridPlanFixture;
vm.runInContext(
  `accountState.data = defaultGridPlanFixture;
  accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
  accountState.selectedWorkspaceId = "owner";`,
  context
);
context.renderContentPlan(context.defaultGridPlanFixture);
assert.strictEqual(calendarModeButtons[0].classList.contains("is-active"), true);
assert.strictEqual(calendarModeButtons[0].attributes["aria-pressed"], "true");
assert.strictEqual(calendarModeButtons[1].classList.contains("is-active"), false);
assert.strictEqual(calendarModeButtons[1].attributes["aria-pressed"], "false");
assert.strictEqual(elements["[data-content-calendar]"].hidden, false);
assert.strictEqual(elements["[data-blog-table-shell]"].hidden, true);
assert.ok(elements["[data-content-calendar]"].children[0].children[0].innerHTML.includes("This week"));
assert.ok(elements["[data-content-calendar]"].children[0].children[1].innerHTML.includes("Default grid article"));

context.planFixture = {
  id: "owner",
  ownerEmail: "owner@example.com",
  workspaceName: "Owner",
  settings: {
    site: {
      publishingCadence: "Weekly",
    },
  },
  ui: {
    calendarMode: "list",
  },
  contentPlan: {
    items: [
      {
        id: "one",
        title: "One",
        keyword: "one",
        volume: 100,
        difficulty: "Easy",
        estimatedVisits: 111,
        scheduledDate: "2026-08-10",
        scheduledTime: "10:30",
        status: "published",
        publicPath: "/blog/one",
      },
      {
        id: "two",
        title: "Two",
        keyword: "two",
        volume: 200,
        difficulty: "Medium",
        estimatedVisits: 222,
        scheduledDate: "2026-08-11",
        status: "published",
        publicPath: "https://external.example.com/two",
      },
      {
        id: "failed-one",
        title: "Failed one",
        keyword: "failed",
        scheduledDate: "2026-08-12",
        status: "failed",
      },
      {
        id: "processing-one",
        title: "Processing one",
        keyword: "processing",
        scheduledDate: "2026-08-12",
        status: "processing",
      },
      {
        id: "paused-one",
        title: "Paused one",
        keyword: "paused",
        scheduledDate: "2026-08-13",
        status: "paused",
      },
    ],
  },
  products: [],
  locations: [],
  members: [],
  invites: [],
  billing: {},
  searchConsole: {},
  rankings: {},
  aiMentions: {},
  supportTickets: [],
};
vm.runInContext(
  `accountState.data = planFixture;
  accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
  accountState.selectedWorkspaceId = "owner";`,
  context
);
context.renderContentPlan(context.planFixture);

assert.strictEqual(
  elements["[data-content-plan-headline]"].textContent,
  "Publishing weekly, targeting keywords worth up to ~333 visits a month."
);
assert.strictEqual(
  elements["[data-content-plan-stats]"].textContent,
  "0 scheduled · 1 writing · 2 published"
);
assert.strictEqual(calendarModeButtons[0].classList.contains("is-active"), false);
assert.strictEqual(calendarModeButtons[0].attributes["aria-pressed"], "false");
assert.strictEqual(calendarModeButtons[1].classList.contains("is-active"), true);
assert.strictEqual(calendarModeButtons[1].attributes["aria-pressed"], "true");
assert.strictEqual(elements["[data-content-calendar]"].hidden, true);
assert.strictEqual(elements["[data-blog-table-shell]"].hidden, false);
assert.strictEqual(blogStatusFilters[0].classList.contains("is-active"), true);
assert.strictEqual(blogStatusFilters[0].attributes["aria-pressed"], "true");
assert.ok(blogStatusFilters[0].innerHTML.includes("All"));
assert.ok(blogStatusFilters[0].innerHTML.includes(">5<"));
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "draft").innerHTML.includes("Generated"));
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "draft").innerHTML.includes(">0<"));
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "published").innerHTML.includes(">2<"));
assert.strictEqual(contentCounts.find((label) => label.dataset.contentCount === "processing").textContent, "1");
assert.strictEqual(contentCounts.find((label) => label.dataset.contentCount === "paused").textContent, "1");
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "processing").innerHTML.includes(">1<"));
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "failed").innerHTML.includes("Needs attention"));
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "failed").innerHTML.includes(">1<"));
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "paused").innerHTML.includes("Paused"));
assert.ok(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "paused").innerHTML.includes(">1<"));
assert.strictEqual(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "failed").hidden, false);
assert.strictEqual(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "paused").hidden, false);
assert.strictEqual(elements["[data-blog-table-body]"].children.length, 5);
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("One"));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("Aug 10 at 10:30"));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes('href="/blog/one"'));
assert.strictEqual(elements["[data-blog-table-body]"].children[1].innerHTML.includes('href="https://external.example.com/two"'), false);
assert.strictEqual(elements["[data-blog-selected]"].textContent, "0 selected");
assert.strictEqual(elements["[data-blog-bulk-bar]"].hidden, true);
assert.strictEqual(elements["[data-blog-bulk-status]"].value, "draft");
assert.strictEqual(elements["[data-blog-bulk-status]"].disabled, true);
assert.strictEqual(elements['[data-blog-action="bulk-update"]'].disabled, true);
assert.strictEqual(elements['[data-blog-action="bulk-clear"]'].disabled, true);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("disabled"), false);
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-select=\"one\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"view\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"edit\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"delete\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("class=\"icon-action\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes('aria-label="View article"'));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("blog-row-menu"));
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"open-builder\""), false);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"schedule\""), false);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"generate\""), false);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"unpublish\""), false);
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-menu-action=\"edit\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-menu-action=\"open-builder\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-menu-action=\"schedule\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-menu-action=\"generate\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-menu-action=\"unpublish\""));
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("status-chip"), false);
assert.ok(
  elements["[data-blog-table-body]"].children[0].innerHTML.indexOf("blog-table-actions") <
    elements["[data-blog-table-body]"].children[0].innerHTML.indexOf("Aug 10 at 10:30")
);
assert.strictEqual(elements["[data-content-tools-menu]"].hidden, true);
assert.strictEqual(elements["[data-content-tools-toggle]"].attributes["aria-expanded"], "false");
elements["[data-content-tools-toggle]"].listeners.click[0]();
assert.strictEqual(elements["[data-content-tools-menu]"].hidden, false);
assert.strictEqual(elements["[data-content-tools-toggle]"].attributes["aria-expanded"], "true");
documentHandlers.keydown.forEach((handler) => handler({ key: "Escape" }));
assert.strictEqual(elements["[data-content-tools-menu]"].hidden, true);
assert.strictEqual(elements["[data-content-tools-toggle]"].attributes["aria-expanded"], "false");
elements["[data-content-tools-toggle]"].listeners.click[0]();
contentToolsActionButtons.find((button) => button.dataset.contentToolsAction === "strategy").listeners.click[0]();
assert.strictEqual(elements["[data-content-tools-menu]"].hidden, true);
assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit content strategy");
elements["[data-dialog-title]"].textContent = "";
elements["[data-content-tools-toggle]"].listeners.click[0]();
contentToolsModeButtons.find((button) => button.dataset.contentToolsMode === "grid").listeners.click[0]();
assert.strictEqual(elements["[data-content-tools-menu]"].hidden, true);
assert.strictEqual(vm.runInContext("accountState.data.ui.calendarMode", context), "grid");
assert.strictEqual(calendarModeButtons[0].classList.contains("is-active"), true);
assert.strictEqual(elements["[data-content-calendar]"].hidden, false);
assert.strictEqual(elements["[data-blog-table-shell]"].hidden, true);

context.renderContentPlan({
  settings: { site: { publishingCadence: "Weekly" } },
  ui: { calendarMode: "list" },
  contentPlan: {
    items: [
      { id: "generated-row", title: "Generated row", keyword: "generated", body: "Existing generated draft", generatedAt: "2026-08-10T10:00:00.000Z", status: "draft" },
    ],
  },
});
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes('aria-label="Regenerate"'));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"generate\""));
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"delete\""));
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"view\""), false);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("data-blog-action=\"edit\""), false);

elements["[data-strategy-card]"].hidden = true;
context.renderContentPlan({
  settings: { site: { publishingCadence: "3 per week" } },
  ui: { calendarMode: "grid" },
  contentPlan: {
    items: [
      { id: "scheduled-row", title: "Scheduled row", keyword: "scheduled", volume: 8100, estimatedVisits: 891, scheduledDate: "2026-08-14", status: "scheduled", difficulty: "Easy" },
      { id: "processing-row", title: "Processing row", keyword: "processing", scheduledDate: "2026-08-15", status: "processing" },
      { id: "generated-row", title: "Generated row", keyword: "generated", scheduledDate: "2026-08-16", status: "draft" },
      { id: "published-row", title: "Published row", keyword: "published", scheduledDate: "2026-08-17", status: "published" },
    ],
  },
});
assert.strictEqual(
  elements["[data-content-plan-summary]"].textContent,
  "Articles write and publish themselves on their dates. New topics are added for you every week. You can jump ahead anytime.",
);
assert.strictEqual(elements["[data-strategy-card]"].hidden, false);
const strategyText = elements["[data-content-strategy]"].textContent;
assert.strictEqual(strategyText.includes("4 from your keyword research topics."), true);
assert.strictEqual(strategyText.includes("spaced 3 per week."), true);
assert.strictEqual(strategyText.includes("roughly"), true);
assert.strictEqual(strategyText.includes("891 extra visits every month."), true);
const firstCalendarCard = elements["[data-content-calendar]"].children[0].children.find((child) => child.className === "content-card");
assert.ok(firstCalendarCard.innerHTML.includes("Added by Sir Bloggsalot"));
assert.ok(firstCalendarCard.innerHTML.includes("<b>Easy to rank</b>"));
assert.strictEqual(firstCalendarCard.innerHTML.includes("<b>Easy</b>"), false);
assert.ok(firstCalendarCard.innerHTML.includes('<span class="content-card-visits">up to ~891 visits/mo</span>'));
assert.ok(firstCalendarCard.innerHTML.includes('class="content-card-footer"'));
assert.ok(firstCalendarCard.innerHTML.includes("<time>Aug 14</time>"));
assert.strictEqual(firstCalendarCard.innerHTML.includes(" · Scheduled"), false);
["all", "scheduled", "processing", "draft", "published"].forEach((status) => {
  assert.strictEqual(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === status).hidden, false);
});
assert.strictEqual(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "failed").hidden, true);
assert.strictEqual(blogStatusFilters.find((button) => button.dataset.blogStatusFilter === "paused").hidden, true);

vm.runInContext("accountState.selectedBlogIds = new Set(['one']);", context);
context.renderContentPlan({
  settings: { site: { publishingCadence: "Weekly" } },
  ui: { calendarMode: "list" },
  contentPlan: {
    items: [
      { id: "one", title: "One", keyword: "one", volume: 100, difficulty: "Easy", estimatedVisits: 111, scheduledDate: "2026-08-10", status: "scheduled" },
      { id: "two", title: "Two", keyword: "two", volume: 200, difficulty: "Medium", estimatedVisits: 222, scheduledDate: "2026-08-11", status: "draft" },
    ],
  },
});
assert.strictEqual(elements["[data-blog-selected]"].textContent, "1 selected");
assert.strictEqual(elements["[data-blog-bulk-bar]"].hidden, false);
assert.strictEqual(elements["[data-blog-bulk-status]"].disabled, false);
assert.strictEqual(elements['[data-blog-action="bulk-update"]'].disabled, false);
assert.strictEqual(elements['[data-blog-action="bulk-clear"]'].disabled, false);
assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("checked"));

console.log("Content plan render checks passed.");

context.renderSetupChecklist({
  setupChecklist: {
    completed: 2,
    total: 4,
    percent: 50,
    items: [
      {
        id: "site-profile",
        label: "Customize site profile",
        detail: "Business facts are ready.",
        complete: true,
        action: { view: "settings", tab: "site" },
      },
      {
        id: "cms",
        label: "Connect CMS",
        detail: "Add CMS credentials.",
        complete: false,
        action: { view: "settings", tab: "cms" },
      },
    ],
  },
});

assert.strictEqual(elements["[data-setup-progress]"].textContent, "2 of 4 complete · 50%");
assert.ok(elements["[data-setup-list]"].children[0].innerHTML.includes("Customize site profile"));
assert.ok(elements["[data-setup-list]"].children[1].innerHTML.includes("data-setup-jump-view=\"settings\""));
assert.ok(elements["[data-setup-list]"].children[1].innerHTML.includes("data-setup-jump-tab=\"cms\""));

console.log("Setup checklist render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [{ id: "topic_alpha", title: "Alpha keyword", keyword: "alpha service", volume: 1400, cpc: 2.5, difficultyScore: 55, difficulty: "Hard", competition: 0.72, added: false }, { id: "topic_beta", title: "Beta keyword", keyword: "beta service", volume: 300, cpc: 1.1, difficultyScore: 24, difficulty: "Easy", competition: 0.42, added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.selectedTopicIds = new Set(["topic_alpha"]);
accountState.topicFilters = { query: "", difficultyMin: "", difficultyMax: "", cpcMin: "", cpcMax: "", volumeMin: "", volumeMax: "", competitionMin: "", competitionMax: "" };
accountState.topicSort = { field: "volume", direction: "desc" };`,
  context
);
vm.runInContext("renderTopics(accountState.data);", context);
assert.strictEqual(elements["[data-keyword-total]"].textContent, "2");
assert.strictEqual(elements["[data-keyword-filtered]"].textContent, "2 of 2 keywords");
assert.strictEqual(elements["[data-keyword-selected]"].textContent, "1 selected");
assert.strictEqual(elements['[data-account-action="magic-select-keywords"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="save-keywords"]'].disabled, false);
topicSelectAllControls.forEach((control) => assert.strictEqual(control.disabled, false));
assert.strictEqual(elements["[data-topic-list]"].children.length, 2);
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("alpha service"));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("$2.50"));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes('class="keyword-metric-bar difficulty"'));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes('class="keyword-metric-bar competition"'));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes('style="width: 55%"'));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes('style="width: 72%"'));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("data-topic-select=\"topic_alpha\""));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes('data-topic-detail="topic_alpha"'));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes('data-topic-actions-cell hidden'));
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("data-topic-edit=\"topic_alpha\""));
assert.strictEqual(topicSortButtons.find((button) => button.dataset.topicSort === "volume").attributes["aria-sort"], "descending");
vm.runInContext("accountState.topicSort = { field: 'difficultyScore', direction: 'asc' }; renderTopics(accountState.data);", context);
assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("beta service"));
assert.strictEqual(topicSortButtons.find((button) => button.dataset.topicSort === "difficultyScore").attributes["aria-sort"], "ascending");
vm.runInContext("accountState.selectedTopicIds = new Set(); accountState.topicFilters = { query: 'no-match', difficultyMin: '', difficultyMax: '', cpcMin: '', cpcMax: '', volumeMin: '', volumeMax: '', competitionMin: '', competitionMax: '' }; renderTopics(accountState.data);", context);
assert.strictEqual(elements["[data-keyword-filtered]"].textContent, "0 of 2 keywords");
assert.strictEqual(elements["[data-keyword-selected]"].textContent, "0 selected");
assert.strictEqual(elements['[data-account-action="magic-select-keywords"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="save-keywords"]'].disabled, true);
topicSelectAllControls.forEach((control) => assert.strictEqual(control.disabled, true));

console.log("Keyword Finder render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], inventoryFeed: { status: "disconnected" }, locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.productFilter = "hidden";
accountState.productSearch = "stale search";
productSearchInput.value = "stale search";
renderProducts(accountState.data);`,
  context
);
assert.strictEqual(elements["[data-products-manual-controls]"].hidden, false);
assert.strictEqual(elements["[data-products-list]"].hidden, false);
assert.ok(elements["[data-products-list]"].innerHTML.includes("No products yet"));
assert.ok(elements["[data-products-list]"].innerHTML.includes("Add your first product"));
assert.ok(elements["[data-products-list]"].innerHTML.includes('class="products-empty-icon"'));
assert.ok(elements["[data-products-list]"].innerHTML.includes('href="#account-icon-cube"'));
assert.strictEqual(elements["[data-products-list]"].innerHTML.includes("<span>▱</span>"), false);
assert.strictEqual(vm.runInContext("accountState.productFilter", context), "all");
assert.strictEqual(vm.runInContext("accountState.productSearch", context), "");
assert.strictEqual(elements["[data-product-search]"].value, "");
assert.strictEqual(productFilterButtons.find((button) => button.dataset.productFilter === "all").classList.contains("is-active"), true);

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [{ id: "product-1", name: "Starter SEO Plan", category: "Service", description: "Monthly content", price: "$99/mo", sku: "SEO-STARTER", audience: "local contractors", featured: true, source: "manual", hidden: false }], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.productFilter = "all";
accountState.productSearch = "";`,
  context
);
vm.runInContext("renderProducts(accountState.data);", context);
assert.strictEqual(elements["[data-products-manual-controls]"].hidden, false);
assert.strictEqual(elements["[data-products-list]"].hidden, false);
assert.strictEqual(elements["[data-products-list]"].children.length, 1);
assert.ok(elements["[data-products-list]"].children[0].classList.contains("product-row"));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("$99/mo"));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("SEO-STARTER"));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("local contractors"));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("Featured"));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes('class="product-badge product-badge-source"'));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes('class="product-badge product-badge-featured"'));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes('class="product-badge product-badge-visible"'));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes('data-product-detail="product-1"'));
assert.strictEqual(productFilterButtons.find((button) => button.dataset.productFilter === "all").classList.contains("is-active"), true);
assert.strictEqual(productFilterButtons.find((button) => button.dataset.productFilter === "all").attributes["aria-pressed"], "true");
vm.runInContext('accountState.productSearch = "contractors"; renderProducts(accountState.data);', context);
assert.strictEqual(elements["[data-products-list]"].children.length, 1);
vm.runInContext('accountState.productSearch = "no matching product"; renderProducts(accountState.data);', context);
assert.ok(elements["[data-products-list]"].innerHTML.includes("No products match"));
assert.ok(elements["[data-products-list]"].innerHTML.includes('class="products-empty-icon"'));
assert.ok(elements["[data-products-list]"].innerHTML.includes('href="#account-icon-cube"'));
assert.strictEqual(elements["[data-products-list]"].innerHTML.includes("<span>▱</span>"), false);
vm.runInContext(
  `accountState.productSearch = "";
accountState.productFilter = "hidden";
accountState.data.products = [
  { id: "product-1", name: "Starter SEO Plan", category: "Service", description: "Monthly content", price: "$99/mo", sku: "SEO-STARTER", audience: "local contractors", featured: true, source: "manual", hidden: false },
  { id: "product-2", name: "Archived Plan", category: "Service", description: "Paused offer", price: "$49/mo", sku: "SEO-ARCHIVE", audience: "legacy customers", featured: false, source: "manual", hidden: true }
];
renderProducts(accountState.data);`,
  context
);
assert.strictEqual(elements["[data-products-list]"].children.length, 1);
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("Archived Plan"));
assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes('class="product-badge product-badge-hidden"'));
assert.strictEqual(productFilterButtons.find((button) => button.dataset.productFilter === "hidden").classList.contains("is-active"), true);
assert.strictEqual(productFilterButtons.find((button) => button.dataset.productFilter === "hidden").attributes["aria-pressed"], "true");

console.log("Product render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderLocations(accountState.data);", context);
assert.ok(elements["[data-locations-list]"].innerHTML.includes("No locations yet"));
assert.ok(elements["[data-locations-list]"].innerHTML.includes("Add your first business location so generated pages and articles use accurate details."));
assert.ok(elements["[data-locations-list]"].innerHTML.includes('class="locations-empty-icon"'));
assert.ok(elements["[data-locations-list]"].innerHTML.includes('href="#account-icon-shield-check"'));
assert.strictEqual(elements["[data-locations-list]"].innerHTML.includes("♙"), false);

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [{ id: "location-1", name: "Main office", city: "Dana Point", state: "CA", address: "1 Market St", phone: "555-0100", serviceArea: "South Orange County", isPrimary: true }], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderLocations(accountState.data);", context);
assert.strictEqual(elements["[data-locations-list]"].children.length, 1);
assert.ok(elements["[data-locations-list]"].children[0].innerHTML.includes("Dana Point, CA"));
assert.ok(elements["[data-locations-list]"].children[0].innerHTML.includes("Primary"));
assert.ok(elements["[data-locations-list]"].children[0].innerHTML.includes("South Orange County"));
assert.ok(elements["[data-locations-list]"].children[0].innerHTML.includes('data-location-detail="location-1"'));

console.log("Location render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: ["web design"], productDescription: "Web design and SEO content for local companies." } }, products: [], locations: [{ id: "location-1", name: "Main office", city: "Dana Point", state: "CA", address: "1 Market St", phone: "555-0100", serviceArea: "South Orange County", isPrimary: true }], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderPagesGenerator(accountState.data);", context);
assert.strictEqual(elements["[data-pages-generator-count]"].textContent, "3 local page targets");
assert.strictEqual(elements["[data-pages-generator-list]"].children.length, 3);
assert.ok(elements["[data-pages-generator-list]"].children[0].innerHTML.includes("Dana Point web design page"));
assert.ok(elements["[data-pages-generator-list]"].children[0].innerHTML.includes("South Orange County"));
assert.ok(elements["[data-pages-generator-list]"].children[0].innerHTML.includes('data-page-generator-location="location-1"'));
assert.ok(elements["[data-pages-generator-list]"].children[0].innerHTML.includes('data-page-generator-action="open-location"'));
assert.ok(elements["[data-pages-generator-list]"].children[0].innerHTML.includes('data-page-generator-action="open-builder"'));
vm.runInContext(
  `accountState.data.locations = [];
renderPagesGenerator(accountState.data);`,
  context
);
assert.ok(elements["[data-pages-generator-list]"].innerHTML.includes("No page targets yet"));
assert.ok(elements["[data-pages-generator-list]"].innerHTML.includes("Add a business location to choose which location a batch of pages targets."));
console.log("Pages generator render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ title: "Scheduled article", keyword: "scheduled keyword", status: "scheduled", estimatedVisits: 50 }, { title: "Published article", keyword: "published keyword", status: "published", estimatedVisits: 80 }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "active" }, searchConsole: { clicks: 120, impressions: 2400, indexedPages: 7 }, rankings: { gated: false, keywords: [{ keyword: "scheduled keyword", url: "/blog/scheduled", position: 4, change: 3 }] }, aiMentions: { gated: false, mentions: [{ source: "ChatGPT", prompt: "best scheduled keyword", status: "mentioned" }] }, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
vm.runInContext(
  `accountState.data.reports = {
    summary: { articles: 2, clicks: 120, impressions: 2400, rankings: 1, aiMentions: 1 },
    chart: [{ label: "Articles", value: 2 }, { label: "Clicks", value: 120 }, { label: "AI mentions", value: 1 }],
    sharing: { shareId: "report_local", shareUrl: "/reports/report_local", shareCreatedAt: "2026-08-10T10:00:00.000Z" },
    schedule: { enabled: true, cadence: "weekly", recipients: ["owner@example.com"], lastScheduledAt: "2026-08-10T10:00:00.000Z" },
    rows: [
      { section: "content", label: "Published article", value: "published", detail: "published keyword", publicPath: "/blog/published-article" },
      { section: "content", label: "Scheduled article", value: "scheduled", detail: "scheduled keyword" },
      { section: "ranking", label: "scheduled keyword", value: "#4", detail: "+3" },
      { section: "ai mention", label: "ChatGPT", value: "mentioned", detail: "best scheduled keyword" }
    ]
  };
  renderReports(accountState.data);`,
  context
);
assert.ok(elements["[data-report-summary]"].innerHTML.includes("2 articles"));
assert.ok(elements["[data-report-summary]"].innerHTML.includes("120 clicks"));
assert.ok(elements["[data-report-summary]"].innerHTML.includes("1 ranking"));
assert.ok(elements["[data-report-summary]"].innerHTML.includes("1 AI mention"));
assert.ok(elements["[data-report-chart]"].innerHTML.includes("Articles"));
assert.ok(elements["[data-report-chart]"].innerHTML.includes("data-report-bar"));
assert.ok(elements["[data-report-templates]"].innerHTML.includes("Performance summary"));
assert.ok(elements["[data-report-templates]"].innerHTML.includes("Executive digest"));
assert.ok(elements["[data-report-templates]"].innerHTML.includes('data-report-template="performance"'));
assert.ok(elements["[data-report-templates]"].innerHTML.includes('aria-pressed="true"'));
assert.ok(elements["[data-report-share]"].innerHTML.includes("/reports/report_local"));
assert.ok(elements["[data-report-share]"].innerHTML.includes('href="/reports/report_local"'));
assert.ok(elements["[data-report-share]"].innerHTML.includes("Performance summary"));
assert.ok(elements["[data-report-schedule]"].innerHTML.includes("weekly"));
assert.ok(elements["[data-report-schedule]"].innerHTML.includes("Performance summary"));
assert.strictEqual(elements["[data-report-list]"].children.length, 4);
assert.ok(elements["[data-report-list]"].children[0].innerHTML.includes("Published article"));
assert.ok(elements["[data-report-list]"].children[0].innerHTML.includes('data-report-detail="0"'));
assert.ok(elements["[data-report-list]"].children[0].innerHTML.includes('href="/blog/published-article"'));
assert.strictEqual(elements['[data-account-action="share-report"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="schedule-report"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="export-reports"]'].disabled, false);

const reportTemplateTarget = {
  closest(selector) {
    if (selector === "[data-report-template]") {
      return { dataset: { reportTemplate: "executive" } };
    }
    return null;
  },
};
context.handleDynamicAccountClick({ target: reportTemplateTarget });
assert.strictEqual(vm.runInContext("accountState.data.reports.template", context), "executive");
assert.ok(elements["[data-report-templates]"].innerHTML.includes("Executive digest"));
assert.ok(elements["[data-report-templates]"].innerHTML.includes('data-report-template="executive" aria-pressed="true"'));

vm.runInContext(
  `accountState.data.reports.sharing = { shareUrl: "https://external.example.com/report" };
  renderReports(accountState.data);`,
  context
);
assert.ok(!elements["[data-report-share]"].innerHTML.includes('href="https://external.example.com/report"'));
assert.ok(elements["[data-report-share]"].innerHTML.includes("No local report link created yet."));

vm.runInContext(
  `accountState.workspaces = [{ id: "owner", role: "member", selected: true }];
accountState.selectedWorkspaceId = "owner";
renderReports(accountState.data);`,
  context
);
assert.strictEqual(elements['[data-account-action="share-report"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="schedule-report"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="export-reports"]'].disabled, false);

console.log("Reports render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ title: "Optimized article", keyword: "optimized keyword", status: "published", seoTitle: "Optimized title", metaDescription: "Useful meta description", body: "Long useful article body with enough context for the test.", publishedUrl: "/blog/optimized", internalLinks: "/blog/weak", schemaType: "Article" }, { title: "Weak article", keyword: "", status: "draft", seoTitle: "", metaDescription: "", body: "", internalLinks: "", schemaType: "", publicPath: "/blog/weak" }] }, settings: { site: { keywords: ["optimized keyword"], productDescription: "Useful product description" }, cms: { status: "connected" } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: { status: "disconnected" }, rankings: {}, aiMentions: {}, supportTickets: [], seoAnalysis: { summary: { score: 62, articleCount: 2, issueCount: 2, opportunityCount: 1 }, chart: [{ label: "Metadata", passed: 1, total: 2 }, { label: "Schema", passed: 1, total: 2 }, { label: "Internal links", passed: 1, total: 2 }, { label: "Crawl readiness", passed: 1, total: 2 }], checks: [{ label: "Metadata", status: "warning", detail: "1 of 2 article checks passed." }, { label: "Schema", status: "warning", detail: "1 of 2 articles have schema type metadata." }, { label: "Internal links", status: "warning", detail: "1 of 2 articles include internal links." }, { label: "Crawl readiness", status: "warning", detail: "1 of 2 public URLs are crawl-ready." }], issues: [{ label: "Weak article", detail: "Missing SEO title.", publicPath: "/blog/weak" }, { label: "Weak article", detail: "Missing schema type." }], opportunities: [{ label: "Search Console", detail: "Connect Search Console to measure indexed content." }] } };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
vm.runInContext("renderSeoAnalysis(accountState.data);", context);
assert.ok(elements["[data-seo-score]"].textContent.includes("%"));
assert.ok(elements["[data-seo-chart]"].innerHTML.includes("Metadata"));
assert.ok(elements["[data-seo-chart]"].innerHTML.includes("data-seo-bar"));
assert.strictEqual(elements["[data-seo-checks]"].children.length, 4);
assert.ok(elements["[data-seo-checks]"].children[1].innerHTML.includes("Schema"));
assert.ok(elements["[data-seo-issues]"].children.length >= 2);
assert.ok(elements["[data-seo-issues]"].children[0].innerHTML.includes("Weak article"));
assert.ok(elements["[data-seo-issues]"].children[0].innerHTML.includes('href="/blog/weak"'));
assert.ok(elements["[data-seo-issues]"].children[0].innerHTML.includes('data-seo-detail="issue:0"'));
assert.ok(elements["[data-seo-opportunities]"].children.length >= 1);
assert.ok(elements["[data-seo-opportunities]"].children[0].innerHTML.includes('data-seo-detail="opportunity:0"'));

context.handleDynamicAccountClick({
  target: {
    closest(selector) {
      if (selector === "[data-seo-detail]") return { dataset: { seoDetail: "issue:0" } };
      return null;
    },
  },
});
assert.strictEqual(elements["[data-dialog-title]"].textContent, "SEO issue detail");
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Weak article"));
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Missing SEO title."));
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("/blog/weak"));

context.handleDynamicAccountClick({
  target: {
    closest(selector) {
      if (selector === "[data-seo-detail]") return { dataset: { seoDetail: "opportunity:0" } };
      return null;
    },
  },
});
assert.strictEqual(elements["[data-dialog-title]"].textContent, "SEO opportunity detail");
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Search Console"));
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Connect Search Console"));

console.log("SEO Analysis render checks passed.");

assert.strictEqual(typeof windowHandlers.beforeunload, "function");
context.markAccountDirty();
const unloadEvent = {
  defaultPrevented: false,
  returnValue: undefined,
  preventDefault() {
    this.defaultPrevented = true;
  },
};
windowHandlers.beforeunload(unloadEvent);
assert.strictEqual(unloadEvent.defaultPrevented, true);
assert.strictEqual(unloadEvent.returnValue, "");

console.log("Unsaved settings warning checks passed.");

setLocation("/account?view=billing");
vm.runInContext("authState.ready = true; authState.user = null; renderRoute();", context);
assert.strictEqual(location.pathname, "/login");
assert.strictEqual(location.search, "?next=%2Faccount%3Fview%3Dbilling");

console.log("Account redirect preservation checks passed.");

setLocation("/account?view=settings&tab=cms");
vm.runInContext(
  `authState.ready = true;
authState.user = { email: "owner@example.com" };
accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: { activeView: "plan", activeSettingsTab: "site" }, contentPlan: { items: [] }, settings: {}, topics: [], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
const fetchCountBeforePopstate = fetchCalls.length;
windowHandlers.popstate();
assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "settings");
assert.strictEqual(vm.runInContext("accountState.data.ui.activeSettingsTab", context), "cms");
assert.strictEqual(fetchCalls.length, fetchCountBeforePopstate);

console.log("Account popstate view restore checks passed.");

setLocation("/login?next=%2Faccount%3Fview%3Dhelp");
vm.runInContext('authState.ready = true; authState.user = { email: "owner@example.com" }; renderRoute();', context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=help");
setLocation("/login?next=%2Fsettings%2Fcms-connect");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=settings&tab=cms");
setLocation("/login?next=%2Fkeyword-finder");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=topics");
setLocation("/login?next=%2Fsubscribe%3FcheckoutPlan%3DPro%252B%26billingPeriod%3Dannual");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=billing&checkoutPlan=Pro%2B&billingPeriod=annual");
setLocation("/signup");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=billing");
setLocation("/login?next=%2Finvite%2F%25");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=billing");
setLocation("/login?next=%2Finvite%2Ftoken%2Fextra");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=billing");
setLocation("/login?next=%2Finvite%2F%252F");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname, "/account");
assert.strictEqual(location.search, "?view=billing");

console.log("Signed-in auth next redirect checks passed.");

const expectedAccountViews = [
  "plan",
  "write",
  "topics",
  "rankings",
  "search",
  "mentions",
  "reports",
  "seo-analysis",
  "settings",
  "pages",
  "getting-started",
  "billing",
  "help",
];
const expectedSettingsTabs = ["site", "products", "images", "cms", "locations", "cta", "invite"];
const expectedTopicFilters = ["difficultyMin", "difficultyMax", "cpcMin", "cpcMax", "volumeMin", "volumeMax", "competitionMin", "competitionMax"];
assert.deepStrictEqual(accountViewButtons.map((button) => button.dataset.accountView), expectedAccountViews);
assert.deepStrictEqual(accountPanels.map((panel) => panel.dataset.accountPanel), expectedAccountViews);
assert.deepStrictEqual(settingsTabButtons.map((button) => button.dataset.settingsTab), expectedSettingsTabs);
assert.deepStrictEqual(settingsPanels.map((panel) => panel.dataset.settingsPanel), expectedSettingsTabs);
assert.deepStrictEqual(topicFilterInputs.map((input) => input.dataset.topicFilter), expectedTopicFilters);
vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, topics: [], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
  accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
  accountState.selectedWorkspaceId = "owner";`,
  context
);
historyWrites.length = 0;
expectedAccountViews.forEach((view) => {
  context.setAccountView(view, { loadTracking: false });
  assert.strictEqual(accountViewButtons.find((button) => button.dataset.accountView === view).classList.contains("is-active"), true);
  assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === view).hidden, false);
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), view);
});
assert.strictEqual(historyWrites[historyWrites.length - 1].next, "/account?view=help");
expectedSettingsTabs.forEach((tab) => {
  context.setSettingsTab(tab);
  assert.strictEqual(settingsTabButtons.find((button) => button.dataset.settingsTab === tab).classList.contains("is-active"), true);
  assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === tab).hidden, false);
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeSettingsTab", context), tab);
});
assert.strictEqual(historyWrites[historyWrites.length - 1].next, "/account?view=settings&tab=invite");

context.setSettingsTab("site", { persist: false, updateUrl: false });
vm.runInContext('accountState.data.ui.activeSettingsTab = "cms";', context);
historyWrites.length = 0;
accountViewButtons.find((button) => button.dataset.accountView === "settings").listeners.click[0]();
assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === "settings").hidden, false);
assert.strictEqual(settingsTabButtons.find((button) => button.dataset.settingsTab === "cms").classList.contains("is-active"), true);
assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === "cms").hidden, false);
assert.strictEqual(historyWrites[historyWrites.length - 1].next, "/account?view=settings&tab=cms");

assert.strictEqual(elements["[data-account-nav-toggle]"].attributes["aria-expanded"], "false");
elements["[data-account-nav-toggle]"].listeners.click[0]();
assert.strictEqual(elements["[data-account-busy-root]"].classList.contains("is-account-nav-open"), true);
assert.strictEqual(elements["[data-account-nav-toggle]"].attributes["aria-expanded"], "true");
elements["[data-account-nav-toggle]"].listeners.click[0]();
assert.strictEqual(elements["[data-account-busy-root]"].classList.contains("is-account-nav-open"), false);
assert.strictEqual(elements["[data-account-nav-toggle]"].attributes["aria-expanded"], "false");
assert.strictEqual(elements["[data-account-create-menu]"].hidden, true);
assert.strictEqual(elements["[data-account-create-toggle]"].attributes["aria-expanded"], "false");
elements["[data-account-create-toggle]"].listeners.click[0]();
assert.strictEqual(elements["[data-account-create-menu]"].hidden, false);
assert.strictEqual(elements["[data-account-create-toggle]"].attributes["aria-expanded"], "true");
documentHandlers.keydown.forEach((handler) => handler({ key: "Escape" }));
assert.strictEqual(elements["[data-account-create-menu]"].hidden, true);
assert.strictEqual(elements["[data-account-create-toggle]"].attributes["aria-expanded"], "false");
elements["[data-account-create-toggle]"].listeners.click[0]();
vm.runInContext(
  `accountState.data.writeDraft = {
    sourcePostId: "stale-post",
    sourceStatus: "scheduled",
    title: "Stale opened article",
    keyword: "stale keyword",
    body: "Stale body"
  };
  renderWriteDraft(accountState.data);`,
  context
);
accountCreateActionButtons.find((button) => button.dataset.accountCreateAction === "article").listeners.click[0]();
assert.strictEqual(elements["[data-account-create-menu]"].hidden, true);
assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "write");
assert.strictEqual(historyWrites[historyWrites.length - 1].next, "/account?view=write");
assert.strictEqual(vm.runInContext("accountState.data.writeDraft.sourcePostId || ''", context), "");
assert.strictEqual(vm.runInContext("accountState.data.writeDraft.sourceStatus || ''", context), "");
assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "title").value, "");
assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "keyword").value, "");
elements["[data-account-nav-toggle]"].listeners.click[0]();
assert.strictEqual(elements["[data-account-busy-root]"].classList.contains("is-account-nav-open"), true);
const accountBrandClick = {
  defaultPrevented: false,
  target: {
    closest(selector) {
      if (selector === "a[href]") return { href: "https://sirbloggsalot.com/account?view=plan" };
      return null;
    },
  },
  preventDefault() {
    this.defaultPrevented = true;
  },
};
documentHandlers.click.forEach((handler) => handler(accountBrandClick));
assert.strictEqual(accountBrandClick.defaultPrevented, true);
assert.strictEqual(location.pathname + location.search, "/account?view=plan");
assert.strictEqual(elements["[data-account-busy-root]"].classList.contains("is-account-nav-open"), false);
assert.strictEqual(elements["[data-account-nav-toggle]"].attributes["aria-expanded"], "false");
vm.runInContext('showAccountDialog("Keyboard close", "Close this dialog with Escape.");', context);
assert.strictEqual(elements["[data-account-dialog]"].hidden, false);
documentHandlers.keydown.forEach((handler) => handler({ key: "Escape" }));
assert.strictEqual(elements["[data-account-dialog]"].hidden, true);

console.log("Full account view and settings tab switch checks passed.");

const accountQueryAliasExpectations = [
  ["/account?view=articles", "/account?view=plan", "plan", ""],
  ["/account?view=article-builder", "/account?view=write", "write", ""],
  ["/account?view=page-generator", "/account?view=pages", "pages", ""],
  ["/account?view=keyword-finder", "/account?view=topics", "topics", ""],
  ["/account?view=tours", "/account?view=getting-started", "getting-started", ""],
  ["/account?view=subscribe", "/account?view=billing", "billing", ""],
  ["/account?view=settings&tab=business-locations", "/account?view=settings&tab=locations", "settings", "locations"],
  ["/account?view=settings&tab=cms-connect", "/account?view=settings&tab=cms", "settings", "cms"],
  ["/account?view=settings&tab=call-to-action", "/account?view=settings&tab=cta", "settings", "cta"],
  ["/account?view=settings&tab=invite-users", "/account?view=settings&tab=invite", "settings", "invite"],
];
accountQueryAliasExpectations.forEach(([inputPath, expectedPath, expectedView, expectedTab]) => {
  setLocation(inputPath);
  historyWrites.length = 0;
  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, topics: [], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
    accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
    accountState.selectedWorkspaceId = "owner";`,
    context
  );
  vm.runInContext("applyAccountParams({ persist: false });", context);
  assert.strictEqual(location.pathname + location.search, expectedPath);
  assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === expectedView).hidden, false);
  if (expectedTab) {
    assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === expectedTab).hidden, false);
  }
});
console.log("Account query alias checks passed.");

const dashboardAliasExpectations = [
  ["/dashboard", "/account?view=plan", "plan", ""],
  ["/content-plan", "/account?view=plan", "plan", ""],
  ["/articles", "/account?view=plan", "plan", ""],
  ["/write", "/account?view=write", "write", ""],
  ["/article-builder", "/account?view=write", "write", ""],
  ["/pages", "/account?view=pages", "pages", ""],
  ["/page-generator", "/account?view=pages", "pages", ""],
  ["/topics", "/account?view=topics", "topics", ""],
  ["/keyword-finder", "/account?view=topics", "topics", ""],
  ["/settings", "/account?view=settings&tab=site", "settings", "site"],
  ["/settings/site-settings", "/account?view=settings&tab=site", "settings", "site"],
  ["/settings/products", "/account?view=settings&tab=products", "settings", "products"],
  ["/settings/images", "/account?view=settings&tab=images", "settings", "images"],
  ["/settings/image-settings", "/account?view=settings&tab=images", "settings", "images"],
  ["/settings/image-style", "/account?view=settings&tab=images&section=image-style", "settings", "images"],
  ["/settings/cms", "/account?view=settings&tab=cms", "settings", "cms"],
  ["/settings/cms-connect", "/account?view=settings&tab=cms", "settings", "cms"],
  ["/settings/locations", "/account?view=settings&tab=locations", "settings", "locations"],
  ["/settings/business-locations", "/account?view=settings&tab=locations", "settings", "locations"],
  ["/settings/call-to-action", "/account?view=settings&tab=cta", "settings", "cta"],
  ["/settings/cta", "/account?view=settings&tab=cta", "settings", "cta"],
  ["/settings/invite-users", "/account?view=settings&tab=invite", "settings", "invite"],
  ["/settings/invite", "/account?view=settings&tab=invite", "settings", "invite"],
  ["/rankings", "/account?view=rankings", "rankings", ""],
  ["/search-console", "/account?view=search", "search", ""],
  ["/google-search-console", "/account?view=search", "search", ""],
  ["/ai-mentions", "/account?view=mentions", "mentions", ""],
  ["/seo-analysis", "/account?view=seo-analysis", "seo-analysis", ""],
  ["/onboarding", "/account?view=getting-started", "getting-started", ""],
  ["/tours", "/account?view=getting-started", "getting-started", ""],
  ["/getting-started", "/account?view=getting-started", "getting-started", ""],
  ["/subscribe", "/account?view=billing", "billing", ""],
  ["/upgrade", "/account?view=billing", "billing", ""],
  ["/billing", "/account?view=billing", "billing", ""],
  ["/help", "/account?view=help", "help", ""],
];
dashboardAliasExpectations.forEach(([aliasPath, canonicalPath, expectedView, expectedTab]) => {
  setLocation(aliasPath);
  historyWrites.length = 0;
  vm.runInContext("renderRoute();", context);
  assert.strictEqual(location.pathname + location.search, canonicalPath);
  assert.strictEqual(historyWrites[0].next, canonicalPath);
  assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === expectedView).hidden, false);
  if (expectedTab) {
    assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === expectedTab).hidden, false);
  }
});
setLocation("/settings/image-style");
historyWrites.length = 0;
vm.runInContext("renderRoute();", context);
assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === "images").classList.contains("is-image-style-section"), true);
setLocation("/settings/images");
historyWrites.length = 0;
vm.runInContext("renderRoute();", context);
assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === "images").classList.contains("is-image-style-section"), false);

setLocation("/subscribe?checkoutPlan=Pro%2B&billingPeriod=annual");
historyWrites.length = 0;
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname + location.search, "/account?view=billing&checkoutPlan=Pro%2B&billingPeriod=annual");
assert.strictEqual(historyWrites[0].next, "/account?view=billing&checkoutPlan=Pro%2B&billingPeriod=annual");

setLocation("/success?planId=price_local&amount=79&session_id=local");
vm.runInContext("renderRoute();", context);
assert.strictEqual(location.pathname + location.search, "/success?planId=price_local&amount=79&session_id=local");
assert.strictEqual(document.body.classList.contains("route-success"), true);
assert.strictEqual(document.body.classList.contains("route-account"), false);

vm.runInContext('showAccountDialog("Stale route dialog", "This should close on navigation.");', context);
assert.strictEqual(elements["[data-account-dialog]"].hidden, false);
elements["[data-account-nav-toggle]"].listeners.click[0]();
assert.strictEqual(elements["[data-account-busy-root]"].classList.contains("is-account-nav-open"), true);
setLocation("/account?view=help");
vm.runInContext("renderRoute();", context);
assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === "help").hidden, false);
assert.strictEqual(elements["[data-account-dialog]"].hidden, true);
assert.strictEqual(elements["[data-account-busy-root]"].classList.contains("is-account-nav-open"), false);
assert.strictEqual(elements["[data-account-nav-toggle]"].attributes["aria-expanded"], "false");

console.log("Dashboard alias route checks passed.");

vm.runInContext(
  `accountState.data = { id: "shared", ownerEmail: "owner@example.com", workspaceName: "Shared Workspace", ui: {}, contentPlan: { items: [] }, settings: {}, topics: [], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [
  { id: "owner", workspaceName: "Owner Workspace", ownerEmail: "owner@example.com", role: "owner", selected: true },
  { id: "shared", workspaceName: "Shared Workspace", ownerEmail: "owner@example.com", role: "member", selected: false }
];
accountState.selectedWorkspaceId = "shared";
renderAccountData();`,
  context
);
assert.strictEqual(elements["[data-account-workspace]"].textContent, "Shared Workspace");
assert.strictEqual(elements["[data-account-role]"].textContent, "Member");
assert.strictEqual(vm.runInContext("selectedWorkspaceRole()", context), "member");
vm.runInContext('handleAccountAction("workspace");', context);
assert.strictEqual(elements["[data-dialog-title]"].textContent, "Switch workspace");
assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-workspace-switch-list'));
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Owner Workspace"));
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Shared Workspace"));
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Selected"));
assert.ok(elements["[data-dialog-body]"].innerHTML.includes("member"));

console.log("Explicit selected workspace checks passed.");

assert.strictEqual(vm.runInContext('resolveRoute("/case-studies/natureva")', context), "case-study");
assert.strictEqual(vm.runInContext('resolveRoute("/case-studies/not-real")', context), "not-found");
assert.strictEqual(vm.runInContext('resolveRoute("/invite/invite-token")', context), "invite");
assert.strictEqual(vm.runInContext('resolveRoute("/invite/invite-token/extra")', context), "not-found");
assert.strictEqual(vm.runInContext('resolveRoute("/invite/%2F")', context), "not-found");

console.log("Case study route validation checks passed.");

assert.strictEqual(vm.runInContext('isLocalBlogPath("/blog/alpha-post")', context), true);
assert.strictEqual(vm.runInContext('isLocalBlogPath("/blog/")', context), false);
assert.strictEqual(vm.runInContext('isLocalBlogPath("/blog/../account")', context), false);
assert.strictEqual(vm.runInContext('isLocalBlogPath("/blog/alpha-post?draft=true")', context), false);

console.log("Local blog path validation checks passed.");

setLocation("/");
const blogClick = {
  defaultPrevented: false,
  target: {
    closest(selector) {
      if (selector === "a[href]") return { href: "https://sirbloggsalot.com/blog" };
      return null;
    },
  },
  preventDefault() {
    this.defaultPrevented = true;
  },
};
documentHandlers.click.forEach((handler) => handler(blogClick));
assert.strictEqual(blogClick.defaultPrevented, false);
assert.strictEqual(location.pathname, "/");

const reportClick = {
  defaultPrevented: false,
  target: {
    closest(selector) {
      if (selector === "a[href]") return { href: "https://sirbloggsalot.com/reports/report_local" };
      return null;
    },
  },
  preventDefault() {
    this.defaultPrevented = true;
  },
};
documentHandlers.click.forEach((handler) => handler(reportClick));
assert.strictEqual(reportClick.defaultPrevented, false);
assert.strictEqual(location.pathname, "/");

const reportIndexClick = {
  defaultPrevented: false,
  target: {
    closest(selector) {
      if (selector === "a[href]") return { href: "https://sirbloggsalot.com/reports" };
      return null;
    },
  },
  preventDefault() {
    this.defaultPrevented = true;
  },
};
documentHandlers.click.forEach((handler) => handler(reportIndexClick));
assert.strictEqual(reportIndexClick.defaultPrevented, false);
assert.strictEqual(location.pathname, "/");

const targetBlankInviteClick = {
  defaultPrevented: false,
  target: {
    closest(selector) {
      if (selector === "a[href]") return { href: "https://sirbloggsalot.com/invite/generated-token", target: "_blank" };
      return null;
    },
  },
  preventDefault() {
    this.defaultPrevented = true;
  },
};
documentHandlers.click.forEach((handler) => handler(targetBlankInviteClick));
assert.strictEqual(targetBlankInviteClick.defaultPrevented, false);
assert.strictEqual(location.pathname, "/");

const modifiedAccountClick = {
  defaultPrevented: false,
  metaKey: true,
  target: {
    closest(selector) {
      if (selector === "a[href]") return { href: "https://sirbloggsalot.com/account" };
      return null;
    },
  },
  preventDefault() {
    this.defaultPrevented = true;
  },
};
documentHandlers.click.forEach((handler) => handler(modifiedAccountClick));
assert.strictEqual(modifiedAccountClick.defaultPrevented, false);
assert.strictEqual(location.pathname, "/");

console.log("Public blog navigation checks passed.");

vm.runInContext("authState.ready = true; authState.user = null; renderAuthState();", context);
assert.strictEqual(trialLinks[0].href, "/signup");
assert.strictEqual(trialLinks[1].href, "/login?next=%2Faccount%3Fview%3Dbilling%26checkoutPlan%3DPro%26billingPeriod%3Dannual");
assert.strictEqual(trialLinks[2].href, "/login?next=%2Faccount%3Fview%3Dbilling%26checkoutPlan%3DPro%252B%26billingPeriod%3Dannual");
vm.runInContext('setBilling("monthly")', context);
assert.strictEqual(trialLinks[1].href, "/login?next=%2Faccount%3Fview%3Dbilling%26checkoutPlan%3DPro%26billingPeriod%3Dmonthly");
assert.strictEqual(trialLinks[2].href, "/login?next=%2Faccount%3Fview%3Dbilling%26checkoutPlan%3DPro%252B%26billingPeriod%3Dmonthly");
vm.runInContext('authState.user = { email: "owner@example.com" }; renderAuthState();', context);
assert.strictEqual(trialLinks[1].href, "/account?view=billing");
assert.strictEqual(trialLinks[2].textContent, "Open billing");

console.log("Pricing trial intent checks passed.");

const checkoutDialog = vm.runInContext(
  'billingCheckoutDialogBody({ plan: "Pro", billingPeriod: "monthly", trialEndsAt: "2026-08-17" }, "Pro", { id: "invoice_local", status: "local" })',
  context
);
assert.ok(checkoutDialog.includes("Try Sir Bloggsalot Pro"));
assert.ok(checkoutDialog.includes("3 days free"));
assert.ok(checkoutDialog.includes("Then $79.00 per month starting August 17, 2026"));
assert.ok(checkoutDialog.includes("Unlimited access: Publish AI blog posts to your site daily"));
assert.ok(checkoutDialog.includes("Link payment confirmation still needs provider integration."));

console.log("Billing checkout trial-copy render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "past_due", price: "$99/mo monthly", billingPeriod: "monthly", paymentMethod: "Visa ending 4242", portalStatus: "payment-failed", failedPayment: { reason: "Card declined", retryAt: "2026-08-12" }, invoices: [{ id: "invoice_failed", date: "2026-08-10", plan: "Pro+", amount: "$99/mo monthly", status: "failed", failureReason: "Card declined", hostedInvoiceUrl: "/account?view=billing&invoice=invoice_failed" }] }, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";
renderBilling(accountState.data);`,
  context
);
assert.ok(elements["[data-billing-alert]"].innerHTML.includes("Payment failed"));
assert.ok(elements["[data-billing-alert]"].innerHTML.includes("Card declined"));
assert.ok(elements["[data-billing-summary]"].textContent.includes("Payment needs attention"));
assert.ok(elements["[data-billing-invoices]"].children[0].innerHTML.includes("View details"));
assert.ok(elements["[data-billing-invoices]"].children[0].innerHTML.includes("data-invoice-detail=\"invoice_failed\""));
assert.strictEqual(elements['[data-account-action="cancel-billing"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="reactivate-billing"]'].disabled, true);

vm.runInContext(
  `accountState.data.billing.status = "cancelled"; renderBilling(accountState.data);`,
  context
);
assert.strictEqual(elements['[data-account-action="cancel-billing"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="reactivate-billing"]'].disabled, false);

console.log("Billing failed-payment render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { images: {} }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="test-image-settings"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="clear-image-tests"]'].disabled, true);
assert.ok(elements["[data-image-details]"].innerHTML.includes("No image test yet"));

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { images: { aspectRatio: "16:9", imageCadence: "key-sections", samplePrompt: "Latest clean prompt", samplePreview: { title: "Local preview result", providerStatus: "provider-pending", aspectRatio: "16:9", imageCadence: "key-sections", stylePreset: "editorial", prompt: "Latest clean prompt", altText: "Latest local image preview" }, lastTestedAt: "2026-08-09T12:00:00.000Z", promptHistory: [{ id: "prompt-1", prompt: "Older editorial prompt", aspectRatio: "1:1", imageCadence: "featured-only", createdAt: "2026-08-08T12:00:00.000Z" }, { id: "prompt-2", prompt: "Latest clean prompt", aspectRatio: "16:9", imageCadence: "key-sections", createdAt: "2026-08-09T12:00:00.000Z" }] } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="test-image-settings"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="clear-image-tests"]'].disabled, false);
assert.strictEqual(elements["[data-image-details]"].children.length, 3);
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Latest image prompt"));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("data-image-preview"));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Local preview result"));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Provider pending"));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("16:9"));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("key-sections"));
assert.ok(elements["[data-image-details]"].children[1].innerHTML.includes("Older editorial prompt"));
assert.ok(elements["[data-image-details]"].children[1].innerHTML.includes("1:1"));
assert.ok(elements["[data-image-details]"].children[2].innerHTML.includes("Latest clean prompt"));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("data-image-history-clear"));

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { images: { aspectRatio: "1:1", imageCadence: "featured-only", samplePrompt: "Failed image prompt", samplePreview: { title: "Failed image preview", providerStatus: "error", aspectRatio: "1:1", imageCadence: "featured-only", stylePreset: "editorial", prompt: "Failed image prompt", altText: "Failed local image preview", lastError: "Image provider rejected the prompt." }, lastTestedAt: "2026-08-10T12:00:00.000Z", promptHistory: [] } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes('class="image-status-badge image-status-error"'));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Needs attention"));
assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Image provider rejected the prompt."));

console.log("Image prompt history render checks passed.");

vm.runInContext("renderCtaPreview({ enabled: false, label: '', text: '', url: '', placement: 'end', style: 'button', openInNewTab: true, trackingLabel: '' });", context);
assert.strictEqual(elements['[data-account-action="edit-cta"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="reset-cta"]'].disabled, true);
assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("CTA disabled"));

vm.runInContext("renderCtaPreview({ enabled: true, label: 'Free consultation', text: 'Book a call', url: 'https://sirbloggsalot.com/#pricing', placement: 'inline', style: 'banner', openInNewTab: true, trackingLabel: 'pricing_cta' });", context);
assert.strictEqual(elements['[data-account-action="edit-cta"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="reset-cta"]'].disabled, false);
assert.strictEqual(elements["[data-cta-preview]"].children.length, 1);
assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("Free consultation"));
assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("Banner"));
assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("opens in new tab"));
assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("pricing_cta"));
assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes('data-cta-detail="true"'));

console.log("CTA preview render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [{ id: "ticket-1", subject: "Publishing help", category: "Publishing", priority: "high", pageContext: "/account?view=settings&tab=cms", requesterEmail: "owner@example.com", message: "Draft did not publish.", status: "open", replies: [{ message: "Draft did not publish.", authorEmail: "owner@example.com", createdAt: "2026-08-09T12:00:00.000Z" }, { message: "Added CMS screenshot details.", authorEmail: "owner@example.com", createdAt: "2026-08-10T12:00:00.000Z" }] }] };`,
  context
);
vm.runInContext("renderSupport(accountState.data);", context);
assert.strictEqual(elements["[data-support-list]"].children.length, 1);
assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("high"));
assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("/account?view=settings&amp;tab=cms") || elements["[data-support-list]"].children[0].innerHTML.includes("/account?view=settings&tab=cms"));
assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("2 replies"));
assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("Added CMS screenshot details."));
assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes('data-support-detail="ticket-1"'));
assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("data-support-reply=\"ticket-1\""));

console.log("Support render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [{ id: "member-1", email: "editor@example.com", name: "Editor User", role: "editor", status: "active", roleUpdatedBy: "owner@example.com", roleUpdatedAt: "2026-08-10T12:00:00.000Z" }], invites: [{ id: "invite-1", email: "pending@example.com", role: "member", status: "pending", link: "https://sirbloggsalot.com/invite/invite-1" }], activityLog: [{ id: "activity-2", type: "member_role_updated", label: "Role changed to admin", targetEmail: "editor@example.com", actorEmail: "owner@example.com", role: "admin", createdAt: "2026-08-10T12:00:00.000Z" }, { id: "activity-1", type: "invite_created", label: "Invite created", targetEmail: "pending@example.com", actorEmail: "owner@example.com", role: "member", createdAt: "2026-08-09T12:00:00.000Z" }], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderMembers(accountState.data); renderInvites(accountState.data); renderTeamActivity(accountState.data);", context);
assert.strictEqual(elements["[data-members-list]"].children.length, 1);
assert.ok(elements["[data-members-list]"].children[0].innerHTML.includes('data-member-detail="member-1"'));
assert.ok(elements["[data-members-list]"].children[0].innerHTML.includes('class="member-avatar"'));
assert.ok(elements["[data-members-list]"].children[0].innerHTML.includes('data-member-avatar="member-1"'));
assert.ok(elements["[data-members-list]"].children[0].innerHTML.includes("data-member-role"));
assert.ok(elements["[data-members-list]"].children[0].innerHTML.includes("Make admin"));
assert.ok(elements["[data-members-list]"].children[0].innerHTML.includes("Role updated by owner@example.com"));
assert.strictEqual(elements["[data-invites-list]"].children.length, 1);
assert.ok(elements["[data-invites-list]"].children[0].innerHTML.includes("pending@example.com"));
assert.ok(elements["[data-invites-list]"].children[0].classList.contains("invite-row"));
assert.ok(elements["[data-invites-list]"].children[0].innerHTML.includes('class="member-avatar invite-avatar"'));
assert.ok(elements["[data-invites-list]"].children[0].innerHTML.includes('data-invite-avatar="invite-1"'));
assert.ok(elements["[data-invites-list]"].children[0].innerHTML.includes('data-invite-detail="invite-1"'));
assert.strictEqual(elements["[data-team-activity-section]"].hidden, false);
assert.strictEqual(elements["[data-team-activity-list]"].children.length, 2);
assert.ok(elements["[data-team-activity-list]"].children[0].innerHTML.includes("Role changed to admin"));
assert.ok(elements["[data-team-activity-list]"].children[0].innerHTML.includes("editor@example.com"));
assert.ok(elements["[data-team-activity-list]"].children[0].innerHTML.includes('data-team-activity-detail="activity-2"'));

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], activityLog: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderMembers(accountState.data); renderInvites(accountState.data); renderTeamActivity(accountState.data);", context);
assert.strictEqual(elements["[data-members-list]"].children.length, 0);
assert.strictEqual(elements["[data-invites-list]"].children.length, 0);
assert.strictEqual(elements["[data-team-activity-section]"].hidden, true);
assert.strictEqual(elements["[data-team-activity-list]"].children.length, 0);

console.log("Members and invites render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
elements["[data-invite-email]"].value = "";
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="generate-invite"]'].disabled, true);
elements["[data-invite-email]"].value = "editor@example.com";
elements["[data-invite-email]"].listeners.input[0]();
assert.strictEqual(elements['[data-account-action="generate-invite"]'].disabled, false);

console.log("Invite generate form state checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { cms: {} }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="connect-cms"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="test-cms"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="disconnect-cms"]'].disabled, true);
assert.ok(elements["[data-cms-details]"].innerHTML.includes("No CMS configured"));

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { cms: { websiteUrl: "https://sirbloggsalot.com", platform: "WordPress", status: "connected", hasCredentials: true, lastTestedAt: "2026-08-10T12:00:00.000Z" } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="connect-cms"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="test-cms"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="disconnect-cms"]'].disabled, false);
assert.ok(elements["[data-cms-status]"].textContent.includes("local setup"));
assert.ok(elements["[data-cms-status]"].textContent.includes("Real CMS publishing is not connected yet"));
assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("Local setup only"));
assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("real publisher pending"));

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { cms: { websiteUrl: "https://sirbloggsalot.com", platform: "WordPress", status: "missing-config", hasCredentials: false, lastError: "Website URL and platform are required before connecting." } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements["[data-cms-details]"].children[0].className, "entity-row cms-error-row");
assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes('class="cms-status-badge cms-status-error"'));
assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("Needs attention"));
assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("Website URL and platform are required before connecting."));

console.log("CMS local provider state render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, inventoryFeed: { status: "disconnected", retailerName: "", accountId: "", hasCredentials: false }, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="connect-inventory"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="sync-inventory"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="disconnect-inventory"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="connect-inventory"]'].hidden, false);
assert.strictEqual(elements['[data-account-action="sync-inventory"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="disconnect-inventory"]'].hidden, true);
assert.strictEqual(elements["[data-inventory-details]"].hidden, true);
assert.strictEqual(elements["[data-inventory-details]"].innerHTML.includes("Inventory feed not connected"), false);
assert.strictEqual(elements["[data-inventory-status]"].textContent.includes(["dispen", "sary"].join("")), false);
assert.strictEqual(elements["[data-inventory-status]"].textContent.includes(["Dut", "chie"].join("")), false);

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, inventoryFeed: { status: "connected", retailerName: "Test Catalog", accountId: "retailer-123", hasCredentials: true }, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="connect-inventory"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="sync-inventory"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="disconnect-inventory"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="connect-inventory"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="sync-inventory"]'].hidden, false);
assert.strictEqual(elements['[data-account-action="disconnect-inventory"]'].hidden, false);
assert.strictEqual(elements["[data-inventory-details]"].hidden, false);
assert.ok(elements["[data-inventory-status]"].textContent.includes("Test Catalog is connected locally"));

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, inventoryFeed: { status: "disconnected", retailerName: "Test Catalog", accountId: "retailer-123", hasCredentials: false, lastError: "Provider credentials need review" }, supportTickets: [] };`,
  context
);
vm.runInContext("renderSettings(accountState.data);", context);
assert.strictEqual(elements["[data-inventory-details]"].hidden, false);
assert.strictEqual(elements["[data-inventory-details]"].children[0].className, "entity-row inventory-feed-error-row");
assert.ok(elements["[data-inventory-details]"].children[0].innerHTML.includes('class="inventory-status-badge inventory-status-error"'));
assert.ok(elements["[data-inventory-details]"].children[0].innerHTML.includes("Needs attention"));
assert.ok(elements["[data-inventory-details]"].children[0].innerHTML.includes("Provider credentials need review"));

const blockedProviderName = ["Dut", "chie"].join("");
const blockedProviderDetail = ["dispen", "sary"].join("");
vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [{ id: "blocked-product", name: "${blockedProviderName} synced item", category: "Service", description: "${blockedProviderDetail} menu item", source: "inventory-feed", hidden: false }], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, inventoryFeed: { status: "connected", retailerName: "${blockedProviderName}", accountId: "${blockedProviderDetail}-123", hasCredentials: true }, supportTickets: [] };`,
  context
);
vm.runInContext("renderAccountData();", context);
assert.strictEqual(elements['[data-account-action="connect-inventory"]'].hidden, false);
assert.strictEqual(elements['[data-account-action="sync-inventory"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="disconnect-inventory"]'].hidden, true);
assert.strictEqual(elements["[data-inventory-details]"].hidden, true);
assert.strictEqual(elements["[data-inventory-status]"].textContent.includes(blockedProviderName), false);
assert.strictEqual(elements["[data-inventory-status]"].textContent.includes(blockedProviderDetail), false);
assert.strictEqual(elements["[data-products-list]"].innerHTML.includes(blockedProviderName), false);
assert.strictEqual(elements["[data-products-list]"].innerHTML.includes(blockedProviderDetail), false);

console.log("Inventory feed disconnected control render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "member", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
context.handleAccountAction("add-product");
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");
assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);
vm.runInContext("renderAccountCreateMenu();", context);
accountCreateActionButtons.forEach((button) => assert.strictEqual(button.disabled, true));

elements["[data-account-operation]"].textContent = "";
elements["[data-dialog-title]"].textContent = "";
const fetchCountBeforeReadOnlyStrategy = fetchCalls.length;
context.handleAccountAction("strategy");
assert.strictEqual(elements["[data-dialog-title]"].textContent, "Content strategy");
assert.strictEqual(vm.runInContext("accountState.dialogSubmit", context), null);
assert.strictEqual(fetchCalls.length, fetchCountBeforeReadOnlyStrategy);

elements["[data-dialog-title]"].textContent = "";
elements["[data-dialog-form]"].children = [];
context.handleAccountAction("workspace");
assert.strictEqual(elements["[data-dialog-title]"].textContent, "Switch workspace");
const readOnlyWorkspaceActions = elements["[data-dialog-form]"].children[elements["[data-dialog-form]"].children.length - 1];
assert.ok(!readOnlyWorkspaceActions.children.some((button) => button.textContent === "Add site workspace"));

console.log("Read-only workspace action checks passed.");

vm.runInContext(
  `accountState.data.products = [{ id: "prod-1", name: "Read-only product", category: "Service", hidden: false }];
accountState.data.locations = [{ id: "loc-1", name: "Read-only location", city: "Dana Point", state: "CA" }];
accountState.data.members = [{ id: "member-1", email: "member@example.com", role: "member", status: "active" }];
accountState.data.invites = [{ id: "invite-1", email: "pending@example.com", role: "member", status: "pending", link: "https://sirbloggsalot.com/invite/token" }];
accountState.data.supportTickets = [{ id: "ticket-1", subject: "Read-only support", status: "open", category: "Setup", priority: "normal", message: "Review only." }];
accountState.data.settings = { images: { samplePrompt: "Readonly prompt", lastTestedAt: "2026-08-13T12:00:00.000Z" } };
accountState.productFilter = "all";
accountState.productSearch = "";
renderProducts(accountState.data);
renderLocations(accountState.data);
renderMembers(accountState.data);
renderInvites(accountState.data);
renderSupport(accountState.data);
renderSettings(accountState.data);`,
  context
);
assert.match(elements["[data-products-list]"].children[0].innerHTML, /data-product-edit="prod-1"[^>]*disabled/);
assert.match(elements["[data-products-list]"].children[0].innerHTML, /data-product-toggle="prod-1"[^>]*disabled/);
assert.match(elements["[data-products-list]"].children[0].innerHTML, /data-product-delete="prod-1"[^>]*disabled/);
assert.match(elements["[data-locations-list]"].children[0].innerHTML, /data-location-edit="loc-1"[^>]*disabled/);
assert.match(elements["[data-locations-list]"].children[0].innerHTML, /data-location-delete="loc-1"[^>]*disabled/);
assert.match(elements["[data-members-list]"].children[0].innerHTML, /data-member-role="member-1"[^>]*disabled/);
assert.match(elements["[data-members-list]"].children[0].innerHTML, /data-member-delete="member-1"[^>]*disabled/);
assert.match(elements["[data-invites-list]"].children[0].innerHTML, /data-invite-copy="invite-1"/);
assert.doesNotMatch(elements["[data-invites-list]"].children[0].innerHTML, /data-invite-copy="invite-1"[^>]*disabled/);
assert.match(elements["[data-invites-list]"].children[0].innerHTML, /data-invite-delete="invite-1"[^>]*disabled/);
assert.match(elements["[data-support-list]"].children[0].innerHTML, /data-support-reply="ticket-1"[^>]*disabled/);
assert.match(elements["[data-support-list]"].children[0].innerHTML, /data-support-status="ticket-1"[^>]*disabled/);
assert.strictEqual(elements['[data-account-action="create-support-ticket"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="help-chat"]'].disabled, true);
assert.match(elements["[data-image-details]"].children[0].innerHTML, /data-account-action="clear-image-tests"[^>]*disabled/);

elements["[data-account-operation]"].textContent = "";
context.handleDynamicAccountClick({
  target: {
    closest(selector) {
      if (selector === "[data-product-edit]") return { dataset: { productEdit: "prod-1" } };
      return null;
    },
  },
});
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");
assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);

elements["[data-account-operation]"].textContent = "";
elements["[data-dialog-title]"].textContent = "";
context.handleDynamicAccountClick({
  target: {
    closest(selector) {
      if (selector === "[data-support-reply]") return { dataset: { supportReply: "ticket-1" } };
      return null;
    },
  },
});
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");
assert.strictEqual(elements["[data-dialog-title]"].textContent, "");

elements["[data-account-operation]"].textContent = "";
context.handleDynamicAccountClick({
  target: {
    closest(selector) {
      if (selector === "[data-member-role]") return { dataset: { memberRole: "member-1", memberNextRole: "admin" } };
      return null;
    },
  },
});
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");

console.log("Read-only workspace row-control checks passed.");

vm.runInContext(
  `accountState.data.contentPlan = { items: [{ id: "readonly-post", title: "Read-only post", keyword: "readonly keyword", status: "scheduled", scheduledDate: "2026-08-24" }] };
accountState.selectedBlogIds = new Set(["readonly-post"]);
accountState.blogStatusFilter = "all";
renderContentPlan(accountState.data);`,
  context
);
assert.strictEqual(elements['[data-account-action="bulk-schedule"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="add-topic-to-plan"]'].disabled, true);
assert.strictEqual(elements["[data-blog-selected]"].textContent, "0 selected");
assert.strictEqual(elements["[data-blog-bulk-bar]"].hidden, true);
assert.strictEqual(elements["[data-blog-bulk-status]"].disabled, true);
assert.strictEqual(elements['[data-blog-action="bulk-update"]'].disabled, true);
assert.strictEqual(elements['[data-blog-action="bulk-clear"]'].disabled, true);
assert.strictEqual(blogSelectAllControls[0].disabled, true);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-select="readonly-post"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-action="view"(?:(?!disabled).)*>/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-action="edit"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-action="delete"[^>]*disabled/);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes('data-blog-action="schedule"'), false);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes('data-blog-action="generate"'), false);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes('data-blog-action="publish"'), false);
assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes('data-blog-action="open-builder"'), false);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="view"(?:(?!disabled).)*>/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="open-builder"(?:(?!disabled).)*>/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="edit"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="schedule"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="generate"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="publish"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="generate"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="publish"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="delete"[^>]*disabled/);
assert.match(elements["[data-blog-table-body]"].children[0].innerHTML, /data-blog-menu-action="open-builder"(?:(?!disabled).)*>/);

console.log("Read-only blog bulk selection checks passed.");

vm.runInContext(
  `accountState.data.topics = [{ id: "readonly-topic", title: "Read-only topic", keyword: "readonly keyword", volume: 900, difficulty: "Easy", added: false }];
accountState.topicSearchResults = null;
accountState.selectedTopicIds = new Set(["readonly-topic"]);
accountState.topicFilters = { query: "", difficultyMin: "", difficultyMax: "", cpcMin: "", cpcMax: "", volumeMin: "", volumeMax: "", competitionMin: "", competitionMax: "" };
renderTopics(accountState.data);`,
  context
);
assert.strictEqual(elements["[data-keyword-selected]"].textContent, "0 selected");
assert.strictEqual(elements['[data-account-action="search-keywords"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="find-topics"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="magic-select-keywords"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="save-keywords"]'].disabled, true);
assert.strictEqual(topicSelectAllControls[0].disabled, true);
assert.match(elements["[data-topic-list]"].children[0].innerHTML, /data-topic-select="readonly-topic"[^>]*disabled/);
assert.match(elements["[data-topic-list]"].children[0].innerHTML, /data-topic-edit="readonly-topic"[^>]*disabled/);
assert.match(elements["[data-topic-list]"].children[0].innerHTML, /data-topic-add="readonly-topic"[^>]*disabled/);
assert.match(elements["[data-topic-list]"].children[0].innerHTML, /data-topic-delete="readonly-topic"[^>]*disabled/);
elements["[data-account-operation]"].textContent = "";
context.handleAccountAction("magic-select-keywords");
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");

console.log("Read-only topic selection checks passed.");

vm.runInContext(
  `accountState.data.writeDraft = { title: "Read-only draft", keyword: "readonly keyword", brief: "Read-only brief", body: "" };
renderWriteDraft(accountState.data);`,
  context
);
assert.strictEqual(elements['[data-account-action="save-builder-draft"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="preview-article"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="start-article"]'].disabled, true);
writeFieldInputs.forEach((input) => assert.strictEqual(input.disabled, true));
assert.ok(elements["[data-write-status]"].innerHTML.includes("read-only"));

console.log("Read-only Article Builder control checks passed.");

vm.runInContext(
  `accountState.data.billing = { plan: "Pro+", status: "past_due", billingPeriod: "monthly", failedPayment: { reason: "Card declined" }, invoices: [] };
renderBilling(accountState.data);`,
  context
);
assert.strictEqual(elements['[data-account-action="billing-portal"]'].disabled, true);
assert.match(elements["[data-billing-alert]"].innerHTML, /data-account-action="billing-portal"[^>]*disabled/);
billingPlanActions.forEach((button) => assert.strictEqual(button.disabled, true));
billingPeriodActions.forEach((button) => assert.strictEqual(button.disabled, true));

elements["[data-account-operation]"].textContent = "";
billingPlanActions[0].listeners.click[0]();
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");
assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);

elements["[data-account-operation]"].textContent = "";
billingPeriodActions[0].listeners.click[0]();
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");
assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);

console.log("Read-only billing control checks passed.");

elements["[data-account-operation]"].textContent = "";
elements["[data-account-save]"].disabled = true;
vm.runInContext("accountState.dirty = false; markAccountDirty();", context);
assert.strictEqual(vm.runInContext("accountState.dirty", context), false);
assert.strictEqual(elements["[data-account-save]"].disabled, true);
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");

elements["[data-account-operation]"].textContent = "";
context.saveAccountSettings();
assert.strictEqual(elements["[data-account-operation]"].textContent, "This workspace is read-only for your role.");
assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);

console.log("Read-only settings save checks passed.");

const fetchCountBeforeReadOnlySettingsTab = fetchCalls.length;
vm.runInContext('setSettingsTab("cms")', context);
assert.strictEqual(fetchCalls.length, fetchCountBeforeReadOnlySettingsTab);

console.log("Read-only settings tab checks passed.");

vm.runInContext(
  `accountState.data.settings = { site: { keywordDraft: "readonly keyword", keywords: ["existing keyword"] }, images: { includeImages: true }, cta: { enabled: true }, cms: { platform: "WordPress", websiteUrl: "https://sirbloggsalot.com" } };
accountState.data.inventoryFeed = { status: "connected", retailerName: "Read Only Inventory", accountId: "retailer-1", hasCredentials: true };
renderSettings(accountState.data);`,
  context
);
settingsFieldInputs.forEach((input) => assert.strictEqual(input.disabled, true));
settingsToggleButtons.forEach((button) => assert.strictEqual(button.disabled, true));
assert.strictEqual(elements['[data-account-action="generate-description"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="add-keywords"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="add-product"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="add-location"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="generate-invite"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="test-image-settings"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="clear-image-tests"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="connect-cms"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="test-cms"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="disconnect-cms"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="connect-inventory"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="sync-inventory"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="disconnect-inventory"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="edit-cta"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="reset-cta"]'].disabled, true);
assert.strictEqual(elements["[data-keyword-list]"].children[0].disabled, true);

console.log("Read-only settings control render checks passed.");

const fetchCountBeforeCalendarMode = fetchCalls.length;
calendarModeButtons[0].listeners.click[0]();
assert.strictEqual(fetchCalls.length, fetchCountBeforeCalendarMode);
assert.strictEqual(calendarModeButtons[0].classList.contains("is-active"), true);

console.log("Read-only calendar mode checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: { status: "disconnected" }, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";
accountState.searchView = "queries";
accountState.searchFilter = "";`,
  context
);
vm.runInContext("renderSearchConsole(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="connect-search-console"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="connect-search-console"]'].hidden, false);
assert.strictEqual(elements["[data-search-status]"].textContent, "Connect Google Search Console to measure impressions, clicks, and indexed content.");
assert.strictEqual(elements['[data-account-action="sync-search-console"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="sync-search-console"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="export-search-console"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="export-search-console"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="disconnect-search-console"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="disconnect-search-console"]'].hidden, true);
assert.strictEqual(elements["[data-search-range]"].disabled, true);
assert.strictEqual(elements["[data-search-row-limit]"].disabled, true);
searchRowLimitInputs.forEach((input) => assert.strictEqual(input.disabled, true));
assert.strictEqual(elements["[data-search-filter]"].disabled, true);
searchViews.forEach((button) => assert.strictEqual(button.disabled, true));

console.log("Disconnected Search Console control checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: { status: "connected", propertyUrl: "https://sirbloggsalot.com", dateRange: "28", lastSyncedAt: "2026-08-09T12:00:00.000Z", clicks: 120, impressions: 2400, indexedPages: 7, trend: [{ date: "2026-08-08", clicks: 10, impressions: 200 }, { date: "2026-08-09", clicks: 18, impressions: 340 }], topQueries: [{ query: "alpha query", clicks: 20, impressions: 400 }, { query: "beta query", clicks: 10, impressions: 200 }], topPages: [{ page: "/blog/alpha", clicks: 12 }, { page: "/blog/beta", clicks: 8 }] }, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
vm.runInContext("renderSearchConsole(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="connect-search-console"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="connect-search-console"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="sync-search-console"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="sync-search-console"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="export-search-console"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="export-search-console"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="disconnect-search-console"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="disconnect-search-console"]'].hidden, false);
assert.strictEqual(elements["[data-search-range]"].disabled, false);
assert.strictEqual(elements["[data-search-row-limit]"].disabled, false);
searchRowLimitInputs.forEach((input) => assert.strictEqual(input.disabled, false));
assert.strictEqual(elements["[data-search-filter]"].disabled, false);
searchViews.forEach((button) => assert.strictEqual(button.disabled, false));
assert.strictEqual(elements["[data-search-clicks]"].textContent, "120");
assert.strictEqual(elements["[data-search-impressions]"].textContent, "2,400");
assert.strictEqual(elements["[data-search-indexed]"].textContent, "7");
assert.strictEqual(elements["[data-search-range]"].value, "28");
assert.strictEqual(elements["[data-search-row-limit]"].value, "10");
searchRowLimitInputs.forEach((input) => assert.strictEqual(input.value, "10"));
assert.ok(elements["[data-search-chart]"].innerHTML.includes("<svg"));
assert.ok(elements["[data-search-chart]"].innerHTML.includes("data-search-chart-line=\"clicks\""));
assert.ok(elements["[data-search-chart]"].innerHTML.includes("data-search-chart-line=\"impressions\""));
assert.strictEqual(elements["[data-search-details]"].children.length, 3);
assert.ok(elements["[data-search-details]"].children[0].innerHTML.includes("Google OAuth not connected"));
assert.ok(elements["[data-search-details]"].children[0].innerHTML.includes("Provider pending"));
assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("alpha query"));
assert.strictEqual(elements["[data-search-pages-list]"].children.length, 2);
assert.ok(elements["[data-search-pages-list]"].children[0].innerHTML.includes("/blog/alpha"));
assert.ok(elements["[data-search-pages-list]"].children[0].innerHTML.includes('href="/blog/alpha"'));
assert.strictEqual(elements["[data-search-pages-list]"].children[0].className, "search-table-row");
assert.ok(elements["[data-search-pages-list]"].children[0].innerHTML.includes('class="search-table-primary"'));
assert.ok(elements["[data-search-pages-list]"].children[0].innerHTML.includes('class="search-table-clicks">12</span>'));
assert.ok(elements["[data-search-pages-list]"].children[0].innerHTML.includes('class="search-table-impressions">0</span>'));
assert.strictEqual(elements["[data-search-queries-list]"].children.length, 2);
assert.ok(elements["[data-search-queries-list]"].children[0].innerHTML.includes("alpha query"));
assert.strictEqual(elements["[data-search-queries-list]"].children[0].className, "search-table-row");
assert.ok(elements["[data-search-queries-list]"].children[0].innerHTML.includes('class="search-table-primary"'));
assert.ok(elements["[data-search-queries-list]"].children[0].innerHTML.includes('class="search-table-clicks">20</span>'));
assert.ok(elements["[data-search-queries-list]"].children[0].innerHTML.includes('class="search-table-impressions">400</span>'));
vm.runInContext("accountState.searchRowLimit = 1; renderSearchConsole(accountState.data);", context);
assert.strictEqual(elements["[data-search-details]"].children.length, 2);
assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("alpha query"));
assert.strictEqual(elements["[data-search-pages-list]"].children.length, 1);
assert.strictEqual(elements["[data-search-queries-list]"].children.length, 1);
searchRowLimitInputs[1].value = "10";
searchRowLimitInputs[1].listeners.change[0]();
assert.strictEqual(elements["[data-search-details]"].children.length, 3);
assert.strictEqual(elements["[data-search-pages-list]"].children.length, 2);
assert.strictEqual(elements["[data-search-queries-list]"].children.length, 2);
searchViews.find((button) => button.dataset.searchView === "pages").listeners.click[0]();
assert.strictEqual(elements["[data-search-details]"].children.length, 3);
assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("/blog/alpha"));
assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes('href="/blog/alpha"'));
elements["[data-search-row-limit]"].value = "10";
elements["[data-search-row-limit]"].listeners.change[0]();
assert.strictEqual(elements["[data-search-details]"].children.length, 3);
elements["[data-search-filter]"].value = "beta";
elements["[data-search-filter]"].listeners.input[0]();
assert.strictEqual(elements["[data-search-details]"].children.length, 2);
assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("/blog/beta"));
assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes('href="/blog/beta"'));
assert.strictEqual(elements["[data-search-pages-list]"].children.length, 1);
assert.ok(elements["[data-search-pages-list]"].children[0].innerHTML.includes("/blog/beta"));
assert.strictEqual(elements["[data-search-queries-list]"].children.length, 1);
assert.ok(elements["[data-search-queries-list]"].children[0].innerHTML.includes("beta query"));

console.log("Search Console dashboard render checks passed.");

vm.runInContext(
  `accountState.workspaces = [{ id: "owner", role: "member", selected: true }];
accountState.selectedWorkspaceId = "owner";
accountState.searchView = "queries";
accountState.searchFilter = "";
accountState.searchRowLimit = 10;
renderSearchConsole(accountState.data);`,
  context
);
assert.strictEqual(elements['[data-account-action="connect-search-console"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="sync-search-console"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="sync-search-console"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="export-search-console"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="export-search-console"]'].hidden, true);
assert.strictEqual(elements['[data-account-action="disconnect-search-console"]'].disabled, true);
assert.strictEqual(elements["[data-search-range]"].disabled, false);
assert.strictEqual(elements["[data-search-row-limit]"].disabled, false);
assert.strictEqual(elements["[data-search-filter]"].disabled, false);
searchViews.forEach((button) => assert.strictEqual(button.disabled, false));

console.log("Read-only Search Console control checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro", status: "active" }, searchConsole: {}, rankings: { gated: true }, aiMentions: { gated: true }, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";
accountState.rankingsFilter = "all";
accountState.rankingsSearch = "";
accountState.mentionsFilter = "all";
accountState.mentionsSource = "all";
accountState.mentionsModel = "all";
accountState.mentionsSearch = "";`,
  context
);
vm.runInContext("renderRankings(accountState.data); renderAiMentions(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="refresh-rankings"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="export-rankings"]'].disabled, true);
assert.strictEqual(elements["[data-rankings-range]"].disabled, true);
assert.strictEqual(elements["[data-rankings-search]"].disabled, true);
rankingsFilters.forEach((button) => assert.strictEqual(button.disabled, true));
assert.strictEqual(elements['[data-account-action="refresh-ai-mentions"]'].disabled, true);
assert.strictEqual(elements['[data-account-action="export-ai-mentions"]'].disabled, true);
assert.strictEqual(elements["[data-mentions-range]"].disabled, true);
assert.strictEqual(elements["[data-mentions-source]"].disabled, true);
assert.strictEqual(elements["[data-mentions-model]"].disabled, true);
assert.strictEqual(elements["[data-mentions-search]"].disabled, true);
mentionsFilters.forEach((button) => assert.strictEqual(button.disabled, true));

console.log("Gated Pro+ tracking control checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "active" }, searchConsole: {}, rankings: { gated: false, dateRange: "90", updatedAt: "2026-08-09T12:00:00.000Z", trend: [{ date: "2026-08-08", averagePosition: 10 }, { date: "2026-08-09", averagePosition: 8 }], keywords: [{ keyword: "alpha topic", url: "/blog/alpha", position: 4, change: 3 }, { keyword: "beta topic", url: "/blog/beta", position: 12, change: -2 }] }, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
vm.runInContext("renderRankings(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="refresh-rankings"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="export-rankings"]'].disabled, false);
assert.strictEqual(elements["[data-rankings-range]"].disabled, false);
assert.strictEqual(elements["[data-rankings-search]"].disabled, false);
rankingsFilters.forEach((button) => assert.strictEqual(button.disabled, false));
assert.strictEqual(elements["[data-rankings-range]"].value, "90");
assert.ok(elements["[data-rankings-chart]"].innerHTML.includes("<svg"));
assert.ok(elements["[data-rankings-chart]"].innerHTML.includes("data-rankings-chart-line=\"average\""));
assert.ok(elements["[data-rankings-summary]"].innerHTML.includes("2 keywords"));
assert.ok(elements["[data-rankings-summary]"].innerHTML.includes("8 avg. position"));
assert.strictEqual(elements["[data-rankings-list]"].children.length, 2);
assert.ok(elements["[data-rankings-list]"].children[0].innerHTML.includes('data-ranking-detail="0"'));
assert.ok(elements["[data-rankings-list]"].children[0].innerHTML.includes('href="/blog/alpha"'));
rankingsFilters.find((button) => button.dataset.rankingsFilter === "improved").listeners.click[0]();
assert.strictEqual(elements["[data-rankings-list]"].children.length, 1);
assert.ok(elements["[data-rankings-list]"].children[0].innerHTML.includes("alpha topic"));
elements["[data-rankings-search]"].value = "beta";
elements["[data-rankings-search]"].listeners.input[0]();
assert.strictEqual(elements["[data-rankings-list]"].children.length, 0);
  rankingsFilters.find((button) => button.dataset.rankingsFilter === "all").listeners.click[0]();
  assert.strictEqual(elements["[data-rankings-list]"].children.length, 1);
  assert.ok(elements["[data-rankings-list]"].children[0].innerHTML.includes("beta topic"));
  assert.ok(elements["[data-rankings-list]"].children[0].innerHTML.includes('href="/blog/beta"'));

  console.log("Rankings dashboard render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "active" }, searchConsole: {}, rankings: {}, aiMentions: { gated: false, updatedAt: "2026-08-09T12:00:00.000Z", trend: [{ date: "2026-08-08", mentions: 1 }, { date: "2026-08-09", mentions: 2 }], sources: ["ChatGPT", "Perplexity"], models: ["GPT-4o", "Claude 3.5"], mentions: [{ source: "ChatGPT", model: "GPT-4o", prompt: "best alpha tools", status: "mentioned" }, { source: "Perplexity", model: "Claude 3.5", prompt: "best beta tools", status: "monitoring" }] }, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
vm.runInContext("renderAiMentions(accountState.data);", context);
assert.strictEqual(elements['[data-account-action="refresh-ai-mentions"]'].disabled, false);
assert.strictEqual(elements['[data-account-action="export-ai-mentions"]'].disabled, false);
assert.strictEqual(elements["[data-mentions-range]"].disabled, false);
assert.strictEqual(elements["[data-mentions-source]"].disabled, false);
assert.strictEqual(elements["[data-mentions-model]"].disabled, false);
assert.strictEqual(elements["[data-mentions-search]"].disabled, false);
mentionsFilters.forEach((button) => assert.strictEqual(button.disabled, false));
assert.ok(elements["[data-mentions-chart]"].innerHTML.includes("<svg"));
assert.ok(elements["[data-mentions-chart]"].innerHTML.includes("data-mentions-chart-line=\"mentions\""));
assert.ok(elements["[data-mentions-source]"].innerHTML.includes("ChatGPT"));
assert.ok(elements["[data-mentions-model]"].innerHTML.includes("GPT-4o"));
assert.ok(elements["[data-mentions-summary]"].innerHTML.includes("2 prompts"));
assert.ok(elements["[data-mentions-summary]"].innerHTML.includes("1 mentioned"));
assert.strictEqual(elements["[data-mentions-list]"].children.length, 2);
assert.ok(elements["[data-mentions-list]"].children[0].innerHTML.includes('data-mention-detail="0"'));
mentionsFilters.find((button) => button.dataset.mentionsFilter === "mentioned").listeners.click[0]();
assert.strictEqual(elements["[data-mentions-list]"].children.length, 1);
assert.ok(elements["[data-mentions-list]"].children[0].innerHTML.includes("ChatGPT"));
elements["[data-mentions-source]"].value = "Perplexity";
elements["[data-mentions-source]"].listeners.change[0]();
assert.strictEqual(elements["[data-mentions-list]"].children.length, 0);
mentionsFilters.find((button) => button.dataset.mentionsFilter === "all").listeners.click[0]();
assert.strictEqual(elements["[data-mentions-list]"].children.length, 1);
assert.ok(elements["[data-mentions-list]"].children[0].innerHTML.includes("Perplexity"));
elements["[data-mentions-model]"].value = "GPT-4o";
elements["[data-mentions-model]"].listeners.change[0]();
assert.strictEqual(elements["[data-mentions-list]"].children.length, 0);
elements["[data-mentions-model]"].value = "all";
elements["[data-mentions-model]"].listeners.change[0]();
elements["[data-mentions-search]"].value = "beta";
elements["[data-mentions-search]"].listeners.input[0]();
assert.strictEqual(elements["[data-mentions-list]"].children.length, 1);
assert.ok(elements["[data-mentions-list]"].children[0].innerHTML.includes("Perplexity"));

console.log("AI Mentions dashboard render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { defaultPublishTime: "10:30", timezone: "America/Los_Angeles" } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [], writeDraft: { title: "Default time title", scheduledDate: "2026-08-09", scheduledTime: "" } };`,
  context
);
vm.runInContext("renderWriteDraft(accountState.data);", context);
assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "scheduledTime").value, "10:30");
assert.ok(elements["[data-article-preview-schedule]"].textContent.includes("10:30"));

console.log("Default publish time render checks passed.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [], writeDraft: { title: "Saved title", slug: "saved-title", keyword: "saved keyword", category: "Guides", excerpt: "Saved excerpt", scheduledDate: "2026-08-09", scheduledTime: "09:30", seoTitle: "Saved SEO title", metaDescription: "Saved meta", featuredImageUrl: "https://sirbloggsalot.com/assets/sirbloggsalot-og.png", featuredImageAlt: "Saved image alt", brief: "Saved brief", body: "Saved body", notes: "Saved notes", preview: "Saved preview", status: "draft", readiness: { score: 87, status: "needs_work", missing: ["Internal links"], complete: ["Working title", "Target keyword"] } } };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
  context
);
vm.runInContext("renderWriteDraft(accountState.data);", context);
assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "slug").value, "saved-title");
assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "category").value, "Guides");
assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "body").value, "Saved body");
assert.strictEqual(elements["[data-write-preview]"].children.length, 1);
assert.strictEqual(elements["[data-article-preview-title]"].textContent, "Saved title");
assert.ok(elements["[data-article-preview-meta]"].textContent.includes("saved keyword"));
assert.ok(elements["[data-article-preview-readiness]"].textContent.includes("87%"));
assert.ok(elements["[data-article-preview-readiness]"].textContent.includes("Internal links"));
assert.ok(elements["[data-article-preview-body]"].textContent.includes("Saved body"));
assert.strictEqual(elements["[data-article-preview-schedule]"].textContent, "Aug 9 at 09:30");
assert.ok(elements["[data-article-builder-readiness-summary]"].textContent.includes("87%"));
assert.strictEqual(elements["[data-article-builder-schedule-summary]"].textContent, "Aug 9 at 09:30");
assert.strictEqual(elements["[data-article-builder-url-summary]"].textContent, "/blog/saved-title");
assert.ok(elements["[data-write-status]"].innerHTML.includes("87% ready"));
assert.ok(elements["[data-write-status]"].innerHTML.includes("Internal links"));
const startArticleCalls = [];
let failNextSettingsSave = false;
let completeSetupOnNextSettingsSave = false;
let summarySupportTickets = [];
context.fetch = (url, options) => {
  startArticleCalls.push({ url, options });
  if (url === "/api/auth/logout") {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  }
  if (url === "/api/auth/google") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          user: { email: "owner@example.com" },
        }),
    });
  }
  if (url === "/api/account/summary") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          account: {
            id: "owner",
            ownerEmail: "owner@example.com",
            workspaceName: "Refreshed Workspace",
            ui: {},
            contentPlan: { items: [] },
            settings: {},
            topics: [],
            products: [],
            locations: [],
            members: [],
            invites: [],
            billing: {},
            searchConsole: {},
            rankings: {},
            aiMentions: {},
            supportTickets: summarySupportTickets,
          },
          workspaces: [{ id: "owner", workspaceName: "Refreshed Workspace", ownerEmail: "owner@example.com", role: "owner", selected: true }],
          selectedWorkspaceId: "owner",
        }),
    });
  }
  if (url === "/api/account/write-draft" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const writeDraft = {
      ...body,
      preview: body.preview || "Saved preview",
      readiness: body.readiness || {
        score: 87,
        status: "needs_work",
        missing: ["Internal links"],
        complete: ["Working title", "Target keyword"],
      },
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          writeDraft,
          account: {
            ...context.accountState?.data,
            writeDraft,
            setupChecklist: {
              completed: 1,
              total: 1,
              percent: 100,
              items: [
                {
                  label: "Save Article Builder draft",
                  detail: "Draft basics are saved.",
                  complete: true,
                  action: { view: "write" },
                },
              ],
            },
          },
        }),
    });
  }
  if (url === "/api/account/write-draft/preview") {
    const lastSavedDraftCall = [...startArticleCalls].reverse().find((call) => call.url === "/api/account/write-draft" && call.options?.method === "PUT");
    const currentDraft = lastSavedDraftCall ? JSON.parse(lastSavedDraftCall.options.body || "{}") : {};
    const writeDraft = {
      ...currentDraft,
      preview: `Generated local brief preview for ${currentDraft.title || "this article"}.`,
      previewStatus: "provider-pending",
      previewSource: "local-brief",
      readiness: {
        score: 72,
        status: "needs_work",
        missing: ["Internal links"],
        complete: ["Working title", "Target keyword"],
      },
      status: "draft",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          writeDraft,
          account: {
            ...context.accountState?.data,
            writeDraft,
          },
        }),
    });
  }
	  if (url === "/api/account/blog/posts") {
	    const body = JSON.parse(options.body);
	    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          account: {
            id: "owner",
            ownerEmail: "owner@example.com",
            workspaceName: "Owner",
            ui: {},
            settings: {},
            products: [],
            locations: [],
            members: [],
            invites: [],
            billing: {},
            searchConsole: {},
            rankings: {},
            aiMentions: {},
            supportTickets: [],
            writeDraft: { status: "queued" },
            contentPlan: { items: [{ id: "plan-1", ...body }] },
          },
          post: { id: "plan-1", ...body },
        }),
    });
  }
  if (url === "/api/account/blog/posts/builder-generated-post/schedule") {
    const body = JSON.parse(options.body || "{}");
    const post = {
      id: "builder-generated-post",
      title: "Generated builder post",
      slug: "generated-builder-post",
      keyword: "builder keyword",
      status: body.status || "scheduled",
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      body: "Generated body",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [post] },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/builder-generated-post/publish") {
    const post = {
      id: "builder-generated-post",
      title: "Generated builder post",
      slug: "generated-builder-post",
      keyword: "builder keyword",
      status: "published",
      body: "Generated body",
      publicPath: "/blog/generated-builder-post",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [post] },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/builder-generated-post/generate") {
    const post = {
      id: "builder-generated-post",
      title: "Generated builder post",
      slug: "generated-builder-post",
      keyword: "builder keyword",
      status: "draft",
      body: "Regenerated builder body",
      generatedAt: "2026-08-14T12:00:00.000Z",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [post] },
          },
        }),
    });
  }
  if (url === "/api/account/content-plan/strategy") {
    const body = JSON.parse(options.body || "{}");
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          contentPlan: { items: [], strategy: body.strategy, updatedAt: "2026-08-10T12:00:00.000Z" },
          account: {
            ...context.accountState?.data,
            contentPlan: { ...(context.accountState?.data?.contentPlan || {}), strategy: body.strategy, updatedAt: "2026-08-10T12:00:00.000Z" },
            setupChecklist: {
              completed: 1,
              total: 1,
              percent: 100,
              items: [
                {
                  label: "Save content strategy",
                  detail: "Content strategy is saved.",
                  complete: true,
                  action: { view: "plan" },
                },
              ],
            },
          },
        }),
    });
  }
	  if (url === "/api/account/workspaces") {
	    const body = JSON.parse(options.body || "{}");
	    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          account: {
            id: "workspace-new",
            ownerEmail: "owner@example.com",
            workspaceName: body.workspaceName || "Second Site",
            ui: {},
            settings: { cms: { websiteUrl: body.websiteUrl || "" } },
            contentPlan: { items: [] },
            topics: [],
            products: [],
            locations: [],
            members: [],
            invites: [],
            activityLog: [],
            billing: {},
            searchConsole: {},
            rankings: {},
            aiMentions: {},
            reports: {},
            supportTickets: [],
          },
          workspaces: [
            { id: "owner", workspaceName: "Owner", ownerEmail: "owner@example.com", role: "owner", selected: false },
            { id: "workspace-new", workspaceName: body.workspaceName || "Second Site", ownerEmail: "owner@example.com", role: "owner", selected: true },
          ],
          selectedWorkspaceId: "workspace-new",
	        }),
	    });
	  }
  if (url === "/api/account/workspaces/select") {
    const body = JSON.parse(options.body || "{}");
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          account: {
            id: body.workspaceId,
            ownerEmail: "owner@example.com",
            workspaceName: body.workspaceId === "client" ? "Client Workspace" : "Owner",
            ui: {},
            contentPlan: { items: [] },
            settings: {},
            topics: [],
            products: [],
            locations: [],
            members: [],
            invites: [],
            activityLog: [],
            billing: {},
            searchConsole: {},
            rankings: {},
            aiMentions: {},
            reports: {},
            supportTickets: [],
          },
          workspaces: [
            { id: "owner", workspaceName: "Owner", ownerEmail: "owner@example.com", role: "owner", selected: body.workspaceId === "owner" },
            { id: "client", workspaceName: "Client Workspace", ownerEmail: "client@example.com", role: "editor", selected: body.workspaceId === "client" },
          ],
          selectedWorkspaceId: body.workspaceId,
        }),
    });
  }
	  if (url === "/api/account/settings") {
    if (failNextSettingsSave) {
      failNextSettingsSave = false;
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ ok: false, error: "Settings validation failed." }),
      });
    }
    const body = JSON.parse(options.body || "{}");
    const setupChecklist = completeSetupOnNextSettingsSave
      ? {
          completed: 1,
          total: 1,
          percent: 100,
          items: [{ label: "Save business basics", detail: "Business basics are complete.", complete: true, action: { view: "settings", tab: "site" } }],
        }
      : context.accountState?.data?.setupChecklist;
    completeSetupOnNextSettingsSave = false;
    const settings = {
      ...(context.accountState?.data?.settings || {}),
      ...body,
      site: {
        ...(context.accountState?.data?.settings?.site || {}),
        ...(body.site || {}),
      },
      images: {
        ...(context.accountState?.data?.settings?.images || {}),
        ...(body.images || {}),
      },
      cms: {
        ...(context.accountState?.data?.settings?.cms || {}),
        ...(body.cms || {}),
      },
      cta: {
        ...(context.accountState?.data?.settings?.cta || {}),
        ...(body.cta || {}),
      },
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          settings,
          account: {
            ...context.accountState?.data,
            settings,
            setupChecklist,
          },
        }),
    });
  }
  if (url === "/api/account/settings/generate-description") {
    const settings = {
      ...(context.accountState?.data?.settings || {}),
      site: {
        ...(context.accountState?.data?.settings?.site || {}),
        productDescription: "Generated local product description for existing keyword and new keyword.",
      },
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          settings,
          account: {
            ...context.accountState?.data,
            settings,
          },
        }),
    });
  }
  if (url === "/api/account/images/test") {
    const images = {
      ...(context.accountState?.data?.settings?.images || {}),
      aspectRatio: "3:4",
      imageCadence: "key-sections",
      samplePrompt: "Editorial local retail shelf image with neighborhood service context.",
      samplePreview: {
        title: "Local image preview",
        providerStatus: "provider-pending",
        aspectRatio: "3:4",
        imageCadence: "key-sections",
        stylePreset: "editorial",
        prompt: "Editorial local retail shelf image with neighborhood service context.",
        altText: "Editorial local retail shelf image preview",
      },
      lastTestedAt: "2026-08-12T12:00:00.000Z",
      promptHistory: [
        {
          id: "prompt-test-1",
          stylePreset: "Editorial",
          prompt: "Editorial local retail shelf image with neighborhood service context.",
          aspectRatio: "3:4",
          imageCadence: "key-sections",
          createdAt: "2026-08-12T12:00:00.000Z",
        },
      ],
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          images,
          account: {
            ...context.accountState?.data,
            settings: {
              ...(context.accountState?.data?.settings || {}),
              images,
            },
          },
        }),
    });
  }
  if (url === "/api/account/images/test-history" && options.method === "DELETE") {
    const images = {
      ...(context.accountState?.data?.settings?.images || {}),
      samplePrompt: "",
      samplePreview: {},
      lastTestedAt: "",
      promptHistory: [],
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          images,
          account: {
            ...context.accountState?.data,
            settings: {
              ...(context.accountState?.data?.settings || {}),
              images,
            },
            setupChecklist: {
              completed: 1,
              total: 1,
              percent: 100,
              items: [
                {
                  label: "Review image settings",
                  detail: "Image prompt history was reviewed.",
                  complete: true,
                  action: { view: "settings", tab: "images" },
                },
              ],
            },
          },
        }),
    });
  }
  if (url === "/api/account/cms/connect") {
    const body = JSON.parse(options.body || "{}");
    const cms = {
      ...(context.accountState?.data?.settings?.cms || {}),
      websiteUrl: body.websiteUrl || "https://shop.example.com",
      platform: body.platform || "Shopify",
      username: body.username || "",
      blogTarget: body.blogTarget || "",
      collectionName: body.collectionName || "",
      status: "connected",
      hasCredentials: Boolean(body.secret),
      lastConnectedAt: "2026-08-12T12:00:00.000Z",
      draftFirst: body.draftFirst !== false,
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          cms,
          settings: {
            ...(context.accountState?.data?.settings || {}),
            cms,
          },
          account: {
            ...context.accountState?.data,
            settings: {
              ...(context.accountState?.data?.settings || {}),
              cms,
            },
          },
        }),
    });
  }
  if (url === "/api/account/cms/test") {
    const cms = {
      ...(context.accountState?.data?.settings?.cms || {}),
      status: "connected",
      lastTestedAt: "2026-08-12T12:30:00.000Z",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          status: "provider-pending",
          testResult: {
            status: "provider-pending",
            platform: cms.platform || "CMS",
            websiteUrl: cms.websiteUrl || "this site",
            blogTarget: cms.blogTarget || "",
            collectionName: cms.collectionName || "",
            checkedAt: "2026-08-12T12:30:00.000Z",
          },
          message: `${cms.platform || "CMS"} local setup checked for ${cms.websiteUrl || "this site"}. Real publishing remains disabled.`,
          cms,
          settings: {
            ...(context.accountState?.data?.settings || {}),
            cms,
          },
          account: {
            ...context.accountState?.data,
            settings: {
              ...(context.accountState?.data?.settings || {}),
              cms,
            },
          },
        }),
    });
  }
  if (url === "/api/account/cms/disconnect") {
    const cms = {
      ...(context.accountState?.data?.settings?.cms || {}),
      websiteUrl: context.accountState?.data?.settings?.cms?.websiteUrl || "https://shop.example.com",
      platform: context.accountState?.data?.settings?.cms?.platform || "Shopify",
      status: "disconnected",
      hasCredentials: false,
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          cms,
          settings: {
            ...(context.accountState?.data?.settings || {}),
            cms,
          },
          account: {
            ...context.accountState?.data,
            settings: {
              ...(context.accountState?.data?.settings || {}),
              cms,
            },
          },
        }),
    });
  }
  if (url === "/api/account/products") {
    const body = JSON.parse(options.body || "{}");
    const product = {
      id: "product-1",
      name: body.name || "Starter SEO Plan",
      category: body.category || "Service",
      description: body.description || "",
      price: body.price || "",
      sku: body.sku || "",
      audience: body.audience || "",
      url: body.url || "",
      featured: Boolean(body.featured),
      source: body.source || "manual",
      hidden: Boolean(body.hidden),
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          products: [product],
          account: {
            ...context.accountState?.data,
            products: [product],
          },
        }),
    });
  }
  if (url === "/api/account/products/product-1" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const product = {
      id: "product-1",
      name: body.name || "Starter SEO Plan",
      category: body.category || "Service",
      description: body.description || "",
      price: body.price || "",
      sku: body.sku || "",
      audience: body.audience || "",
      url: body.url || "",
      featured: Boolean(body.featured),
      source: body.source || "manual",
      hidden: Boolean(body.hidden),
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          products: [product],
        }),
    });
  }
  if (url === "/api/account/products/product-1" && options.method === "DELETE") {
    const account = {
      ...context.accountState?.data,
      products: [],
      setupChecklist: {
        completed: 0,
        total: 1,
        percent: 0,
        items: [{ label: "Add products", detail: "Add at least one product.", complete: false, action: { view: "settings", tab: "products" } }],
      },
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          products: [],
          account,
        }),
    });
  }
  if (url === "/api/account/locations") {
    const body = JSON.parse(options.body || "{}");
    const location = {
      id: "location-1",
      name: body.name || "Main office",
      city: body.city || "Dana Point",
      state: body.state || "CA",
      address: body.address || "",
      phone: body.phone || "",
      serviceArea: body.serviceArea || "",
      isPrimary: Boolean(body.isPrimary),
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          locations: [location],
          account: {
            ...context.accountState?.data,
            locations: [location],
          },
        }),
    });
  }
  if (url === "/api/account/locations/location-1" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const location = {
      id: "location-1",
      name: body.name || "Main office",
      city: body.city || "Dana Point",
      state: body.state || "CA",
      address: body.address || "",
      phone: body.phone || "",
      serviceArea: body.serviceArea || "",
      isPrimary: Boolean(body.isPrimary),
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          locations: [location],
        }),
    });
  }
  if (url === "/api/account/locations/location-1" && options.method === "DELETE") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          locations: [],
        }),
    });
  }
  if (url === "/api/account/inventory-feed/connect") {
    const body = JSON.parse(options.body || "{}");
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          inventoryFeed: {
            retailerName: body.retailerName || "Test Catalog",
            accountId: body.accountId || "retailer-123",
            status: "connected",
            hasCredentials: Boolean(body.secret),
            lastConnectedAt: "2026-08-12T12:00:00.000Z",
            lastError: "",
          },
          account: {
            ...context.accountState?.data,
            inventoryFeed: {
              retailerName: body.retailerName || "Test Catalog",
              accountId: body.accountId || "retailer-123",
              status: "connected",
              hasCredentials: Boolean(body.secret),
              lastConnectedAt: "2026-08-12T12:00:00.000Z",
              lastError: "",
            },
          },
        }),
    });
  }
  if (url === "/api/account/inventory-feed/sync") {
    const inventoryFeed = context.accountState?.data?.inventoryFeed || {};
    const products = [
      {
        id: "inventory-1",
        name: "Catalog Service",
        category: "Service",
        description: "Synced local inventory placeholder.",
        price: "$45",
        sku: "INV-SERVICE",
        source: "inventory-feed",
        featured: true,
        hidden: false,
      },
      {
        id: "inventory-2",
        name: "Catalog Package",
        category: "Package",
        description: "Synced local inventory placeholder.",
        price: "$25",
        sku: "INV-PACKAGE",
        source: "inventory-feed",
        featured: false,
        hidden: false,
      },
    ];
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          inventoryFeed: {
            ...inventoryFeed,
            status: "connected",
            lastSyncedAt: "2026-08-12T12:30:00.000Z",
            lastError: "",
          },
          products,
          account: {
            ...context.accountState?.data,
            inventoryFeed: {
              ...inventoryFeed,
              status: "connected",
              lastSyncedAt: "2026-08-12T12:30:00.000Z",
              lastError: "",
            },
            products,
          },
        }),
    });
  }
  if (url === "/api/account/inventory-feed/disconnect") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          inventoryFeed: {
            ...(context.accountState?.data?.inventoryFeed || {}),
            status: "disconnected",
            hasCredentials: false,
            lastError: "",
          },
          account: {
            ...context.accountState?.data,
            inventoryFeed: {
              ...(context.accountState?.data?.inventoryFeed || {}),
              status: "disconnected",
              hasCredentials: false,
              lastError: "",
            },
          },
        }),
    });
  }
  if (url === "/api/account/billing/checkout") {
    const body = JSON.parse(options.body || "{}");
    if (body.plan === "Pro" && body.billingPeriod === "annual") {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ ok: false, error: "Checkout unavailable." }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          billing: {
            plan: body.plan,
            status: "active",
            billingPeriod: body.billingPeriod,
            price: body.plan === "Pro+" ? "$99/mo monthly" : "$79/mo monthly",
            paymentMethod: "Payment method pending",
            portalStatus: "local-checkout",
            invoices: [{ id: "invoice_checkout", date: "2026-08-10", plan: body.plan, amount: body.plan === "Pro+" ? "$99/mo monthly" : "$79/mo monthly", status: "paid", hostedInvoiceUrl: "/account?view=billing&invoice=invoice_checkout" }],
          },
        }),
    });
  }
  if (url === "/api/account/billing" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const billing = {
      ...(context.accountState?.data?.billing || {}),
      ...body,
      portalStatus: "local-billing-updated",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          billing,
          account: {
            ...context.accountState?.data,
            billing,
            setupChecklist: {
              completed: 1,
              total: 1,
              percent: 100,
              items: [{ label: "Choose billing period", detail: "Billing period selected.", complete: true, action: { view: "billing" } }],
            },
          },
        }),
    });
  }
  if (url === "/api/account/billing/portal") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          portalUrl: "/account?view=billing&portal=local",
          portalSession: { expiresAt: "2026-08-12T13:00:00.000Z" },
          billing: {
            ...(context.accountState?.data?.billing || {}),
            portalStatus: "local-portal-opened",
            lastPortalOpenedAt: "2026-08-12T12:00:00.000Z",
          },
        }),
    });
  }
  if (url === "/api/account/billing/cancel") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          billing: {
            ...(context.accountState?.data?.billing || {}),
            status: "cancelled",
            portalStatus: "local-cancelled",
          },
        }),
    });
  }
  if (url === "/api/account/billing/reactivate") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          billing: {
            ...(context.accountState?.data?.billing || {}),
            status: "active",
            portalStatus: "local-reactivated",
          },
        }),
    });
  }
  if (url === "/api/account/billing/invoices/invoice_failed") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          invoice: {
            id: "invoice_failed",
            date: "2026-08-10",
            plan: "Pro+",
            amount: "$99/mo monthly",
            status: "failed",
            failureReason: "Card declined",
            hostedInvoiceUrl: "/account?view=billing&invoice=invoice_failed",
          },
        }),
    });
  }
  if (url === "/api/account/billing/invoices/missing_invoice") {
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ ok: false, error: "Invoice not found." }),
    });
  }
  if (url === "/api/account/search-console/export") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          filename: "search-console-owner.csv",
          csv: "type,label,clicks,impressions\\nquery,alpha query,20,400",
        }),
    });
  }
  if (url === "/api/account/search-console/connect") {
    const body = JSON.parse(options.body || "{}");
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          searchConsole: {
            status: "connected",
            propertyUrl: body.propertyUrl || "https://sirbloggsalot.com",
            dateRange: "28",
            clicks: 120,
            impressions: 2400,
            indexedPages: 7,
            lastSyncedAt: "2026-08-11T12:00:00.000Z",
            trend: [{ date: "2026-08-11", clicks: 20, impressions: 400 }],
            topQueries: [{ query: "connected query", clicks: 20, impressions: 400 }],
            topPages: [{ page: "/blog/connected", clicks: 12 }],
          },
          account: {
            ...context.accountState?.data,
            searchConsole: {
              status: "connected",
              propertyUrl: body.propertyUrl || "https://sirbloggsalot.com",
              dateRange: "28",
              clicks: 120,
              impressions: 2400,
              indexedPages: 7,
              lastSyncedAt: "2026-08-11T12:00:00.000Z",
              trend: [{ date: "2026-08-11", clicks: 20, impressions: 400 }],
              topQueries: [{ query: "connected query", clicks: 20, impressions: 400 }],
              topPages: [{ page: "/blog/connected", clicks: 12 }],
            },
          },
        }),
    });
  }
  if (url === "/api/account/search-console/sync") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          searchConsole: {
            status: "connected",
            propertyUrl: "https://sirbloggsalot.com",
            dateRange: "28",
            clicks: 180,
            impressions: 3600,
            indexedPages: 9,
            lastSyncedAt: "2026-08-12T12:00:00.000Z",
            trend: [{ date: "2026-08-12", clicks: 28, impressions: 560 }],
            topQueries: [{ query: "synced query", clicks: 28, impressions: 560 }],
            topPages: [{ page: "/blog/synced", clicks: 18 }],
          },
          account: {
            ...context.accountState?.data,
            searchConsole: {
              status: "connected",
              propertyUrl: "https://sirbloggsalot.com",
              dateRange: "28",
              clicks: 180,
              impressions: 3600,
              indexedPages: 9,
              lastSyncedAt: "2026-08-12T12:00:00.000Z",
              trend: [{ date: "2026-08-12", clicks: 28, impressions: 560 }],
              topQueries: [{ query: "synced query", clicks: 28, impressions: 560 }],
              topPages: [{ page: "/blog/synced", clicks: 18 }],
            },
          },
        }),
    });
  }
  if (url === "/api/account/search-console/disconnect") {
    const searchConsole = {
      status: "disconnected",
      propertyUrl: "",
      dateRange: "28",
      clicks: 0,
      impressions: 0,
      indexedPages: 0,
      trend: [],
      topQueries: [],
      topPages: [],
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          searchConsole,
          account: {
            ...context.accountState?.data,
            searchConsole,
          },
        }),
    });
  }
  if (url === "/api/account/rankings?range=30") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          rankings: {
            gated: false,
            dateRange: "30",
            updatedAt: "2026-08-12T12:00:00.000Z",
            trend: [{ date: "2026-08-12", averagePosition: 8 }],
            keywords: [{ keyword: "synced keyword", url: "/blog/synced", position: 8, change: 2 }],
          },
        }),
    });
  }
  if (url === "/api/account/ai-mentions?source=all&model=all&range=30") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          aiMentions: {
            gated: false,
            dateRange: "30",
            updatedAt: "2026-08-12T12:00:00.000Z",
            trend: [{ date: "2026-08-12", mentions: 2 }],
            sources: ["ChatGPT"],
            models: ["GPT-4o"],
            mentions: [{ source: "ChatGPT", model: "GPT-4o", prompt: "synced AI mention", status: "mentioned" }],
          },
        }),
    });
  }
  if (url === "/api/account/search-console?range=90") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          searchConsole: {
            status: "connected",
            propertyUrl: "https://sirbloggsalot.com",
            dateRange: "90",
            clicks: 900,
            impressions: 18000,
            indexedPages: 11,
            lastSyncedAt: "2026-08-10T12:00:00.000Z",
            trend: Array.from({ length: 90 }, (_item, index) => ({ date: `2026-05-${String(index + 1).padStart(2, "0")}`, clicks: index + 1, impressions: (index + 1) * 10 })),
            topQueries: [{ query: "ninety day query", clicks: 90, impressions: 900 }],
            topPages: [{ page: "/blog/ninety", clicks: 45 }],
          },
        }),
    });
  }
  if (url === "/api/account/ai-mentions?source=all&model=all&range=90") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          aiMentions: {
            gated: false,
            dateRange: "90",
            updatedAt: "2026-08-10T12:00:00.000Z",
            trend: Array.from({ length: 90 }, (_item, index) => ({ date: `2026-05-${String(index + 1).padStart(2, "0")}`, mentions: index + 1 })),
            sources: ["ChatGPT"],
            models: ["GPT-4o"],
            mentions: [{ source: "ChatGPT", model: "GPT-4o", prompt: "ninety day AI mention", status: "mentioned" }],
          },
        }),
    });
  }
  if (url === "/api/account/rankings/export") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          filename: "rankings-owner.csv",
          csv: "keyword,url,position,change\\nalpha topic,/blog/alpha,4,3",
        }),
    });
  }
  if (url === "/api/account/ai-mentions/export") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          filename: "ai-mentions-owner.csv",
          csv: "source,prompt,status\\nChatGPT,best alpha tools,mentioned",
        }),
    });
  }
  if (url === "/api/account/support/ticket-1") {
    const body = JSON.parse(options.body || "{}");
    const replies = [
      { message: "Draft did not publish.", authorEmail: "owner@example.com", createdAt: "2026-08-09T12:00:00.000Z" },
    ];
    if (body.reply) {
      replies.push({ message: body.reply, authorEmail: "owner@example.com", createdAt: "2026-08-11T12:00:00.000Z" });
    }
    const ticket = {
      id: "ticket-1",
      subject: "Publishing help",
      category: "Publishing",
      priority: "high",
      pageContext: "/account?view=settings&tab=cms",
      requesterEmail: "owner@example.com",
      message: "Draft did not publish.",
      status: body.status || "open",
      replies,
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          supportTickets: [ticket],
          account: {
            ...context.accountState?.data,
            supportTickets: [ticket],
            setupChecklist: {
              completed: 1,
              total: 1,
              percent: 100,
              items: [{ label: "Create support ticket", detail: "Support follow-up is logged.", complete: true, action: { view: "help" } }],
            },
          },
        }),
    });
  }
  if (url === "/api/account/support") {
    const body = JSON.parse(options.body || "{}");
    const ticket = {
      id: "ticket-created",
      subject: body.subject || "Publishing setup help",
      category: body.category || "Publishing",
      priority: body.priority || "normal",
      pageContext: body.pageContext || "/account?view=help",
      requesterEmail: "owner@example.com",
      message: body.message || "",
      status: "open",
      replies: [
        {
          message: body.message || "",
          authorEmail: "owner@example.com",
          createdAt: "2026-08-12T12:00:00.000Z",
        },
      ],
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          supportTickets: [ticket],
          account: {
            ...context.accountState?.data,
            supportTickets: [ticket],
          },
        }),
    });
  }
  if (url === "/api/account/reports/export") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          filename: "reports-owner.csv",
          csv: "template,section,label,value,detail,publicPath\\nPerformance summary,content,Published article,published,published keyword,/blog/canva-website-builder",
        }),
    });
  }
  if (url === "/api/account/reports/share") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          reports: {
            summary: { articles: 2, clicks: 120, rankings: 1, aiMentions: 1 },
            chart: [{ label: "Articles", value: 2 }],
            sharing: { shareId: "report_local", shareUrl: "/reports/report_local" },
            schedule: { enabled: false },
            rows: [],
          },
          account: {
            ...context.accountState?.data,
            reports: {
              summary: { articles: 2, clicks: 120, rankings: 1, aiMentions: 1 },
              chart: [{ label: "Articles", value: 2 }],
              sharing: { shareId: "report_local", shareUrl: "/reports/report_local" },
              schedule: { enabled: false },
              rows: [],
            },
          },
        }),
    });
  }
  if (url === "/api/account/reports/schedule") {
    const body = JSON.parse(options.body || "{}");
    const recipients = Array.isArray(body.recipients) ? body.recipients : ["owner@example.com"];
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          reports: {
            summary: { articles: 2, clicks: 120, rankings: 1, aiMentions: 1 },
            chart: [{ label: "Articles", value: 2 }],
            sharing: { shareId: "report_local", shareUrl: "/reports/report_local" },
            schedule: { enabled: true, cadence: body.cadence || "weekly", recipients },
            rows: [],
          },
          account: {
            ...context.accountState?.data,
            reports: {
              summary: { articles: 2, clicks: 120, rankings: 1, aiMentions: 1 },
              chart: [{ label: "Articles", value: 2 }],
              sharing: { shareId: "report_local", shareUrl: "/reports/report_local" },
              schedule: { enabled: true, cadence: body.cadence || "weekly", recipients },
              rows: [],
            },
          },
        }),
    });
  }
  if (url === "/api/account/invites") {
    const body = JSON.parse(options.body || "{}");
    const invite = {
      id: "invite-generated",
      email: body.email || "new@example.com",
      role: body.role || "member",
      status: "pending",
      link: "https://sirbloggsalot.com/invite/generated-token",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          invites: [invite],
          account: {
            ...context.accountState?.data,
            invites: [invite],
            activityLog: [
              {
                id: "activity-generated",
                type: "invite_created",
                label: "Invite created",
                targetEmail: invite.email,
                actorEmail: "owner@example.com",
                role: invite.role,
                createdAt: "2026-08-11T12:00:00.000Z",
              },
            ],
          },
        }),
    });
  }
  if (url === "/api/account/invites/invite-1" && options.method === "DELETE") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          invites: [],
          account: {
            ...context.accountState?.data,
            invites: [],
            setupChecklist: {
              completed: 1,
              total: 1,
              percent: 100,
              items: [{ label: "Invite teammate", detail: "Invite follow-up complete.", complete: true, action: { view: "settings", tab: "invite" } }],
            },
            activityLog: [
              {
                id: "activity-revoked",
                type: "invite_revoked",
                label: "Invite revoked",
                targetEmail: "pending@example.com",
                actorEmail: "owner@example.com",
                createdAt: "2026-08-12T12:00:00.000Z",
              },
            ],
          },
        }),
    });
  }
  if (url === "/api/invite/invite-token") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          invite: {
            id: "invite-token",
            email: "editor@example.com",
            ownerEmail: "owner@example.com",
            role: "member",
            status: "pending",
            workspaceName: "Client Workspace",
          },
        }),
    });
  }
  if (url === "/api/invite/invite-token/accept") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          workspaceName: "Client Workspace",
          member: { email: "editor@example.com", role: "member" },
        }),
    });
  }
  if (url === "/api/account/members/member-1" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const member = {
      id: "member-1",
      email: "editor@example.com",
      name: "Editor User",
      role: body.role || "member",
      status: "active",
      roleUpdatedBy: "owner@example.com",
      roleUpdatedAt: "2026-08-12T12:00:00.000Z",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          members: [member],
          account: {
            ...context.accountState?.data,
            members: [member],
            activityLog: [
              {
                id: "activity-role",
                type: "member_role_updated",
                label: `Role changed to ${member.role}`,
                targetEmail: member.email,
                actorEmail: "owner@example.com",
                role: member.role,
                createdAt: "2026-08-12T12:00:00.000Z",
              },
            ],
          },
        }),
    });
  }
  if (url === "/api/account/members/member-1" && options.method === "DELETE") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          members: [],
          account: {
            ...context.accountState?.data,
            members: [],
            activityLog: [
              {
                id: "activity-member-removed",
                type: "member_removed",
                label: "Member removed",
                targetEmail: "editor@example.com",
                actorEmail: "owner@example.com",
                createdAt: "2026-08-12T12:00:00.000Z",
              },
            ],
          },
        }),
    });
  }
  if (url === "/api/account/seo-analysis/export") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          filename: "seo-analysis-owner.csv",
          csv: "type,label,status,detail,passed,total,publicPath\\nissue,Weak article,,Missing SEO title,,,/blog/weak",
        }),
    });
  }
  if (url === "/api/account/topics") {
    const body = JSON.parse(options.body || "{}");
    const topic = {
      id: body.title === "Scheduled topic" ? "topic-scheduled" : "topic-created",
      title: body.title || "Local SEO topic",
      keyword: body.keyword || body.title || "local seo",
      volume: Number(body.volume || 0),
      cpc: 0,
      difficulty: body.difficulty || "Needs review",
      difficultyScore: body.difficulty === "Easy to rank" ? 24 : 55,
      competition: 0.35,
      added: false,
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          topics: [topic],
          account: {
            ...context.accountState?.data,
            topics: [topic],
          },
        }),
    });
  }
  if (url === "/api/account/topics/topic-created" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const topic = {
      id: "topic-created",
      title: body.title || "Updated SEO topic",
      keyword: body.keyword || "updated seo",
      volume: Number(body.volume || 0),
      cpc: 0,
      difficulty: body.difficulty || "Medium",
      difficultyScore: 55,
      competition: 0.35,
      added: Boolean(body.added),
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          topics: [topic],
        }),
    });
  }
  if (url === "/api/account/topics/topic-created/add" || url === "/api/account/topics/topic-scheduled/add") {
    const topicId = url.includes("topic-scheduled") ? "topic-scheduled" : "topic-created";
    const topicTitle = topicId === "topic-scheduled" ? "Scheduled topic" : "Updated SEO topic";
    const topicKeyword = topicId === "topic-scheduled" ? "scheduled seo" : "updated seo";
    const topic = {
      id: topicId,
      title: topicTitle,
      keyword: topicKeyword,
      volume: topicId === "topic-scheduled" ? 800 : 1200,
      cpc: 0,
      difficulty: topicId === "topic-scheduled" ? "Easy to rank" : "Medium",
      difficultyScore: topicId === "topic-scheduled" ? 24 : 55,
      competition: 0.35,
      added: true,
    };
    const planItem = {
      id: `plan-${topicId}`,
      topicId,
      title: topicTitle,
      keyword: topicKeyword,
      status: "scheduled",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          topics: [topic],
          contentPlan: { items: [planItem] },
          account: {
            ...context.accountState?.data,
            topics: [topic],
            contentPlan: { items: [planItem] },
          },
        }),
    });
  }
  if (url === "/api/account/topics/topic-created" && options.method === "DELETE") {
    const account = {
      ...context.accountState?.data,
      topics: [],
      setupChecklist: {
        completed: 0,
        total: 1,
        percent: 0,
        items: [{ label: "Add keywords", detail: "Add at least one keyword idea.", complete: false, action: { view: "topics" } }],
      },
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          topics: [],
          account,
        }),
    });
  }
	  if (url === "/api/account/topics/export") {
	    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          filename: "keywords-owner.csv",
          csv: "keyword,volume,cpc,difficulty,competition\\nalpha service,1400,2.5,24,0.42",
        }),
	    });
	  }
  if (url === "/api/account/topics/search") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          topics: [
            {
              id: "topic_search_result",
              title: "Search result title",
              keyword: "searched keyword",
              volume: 2400,
              cpc: 3.2,
              difficultyScore: 21,
              difficulty: "Easy",
              competition: 0.35,
              added: false,
            },
          ],
          summary: { total: 2, filtered: 1 },
        }),
    });
  }
	  if (url === "/api/account/topics/save-keywords") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          settings: { site: { keywords: ["alpha service"] } },
          account: { ...context.accountState?.data, settings: { site: { keywords: ["alpha service"] } } },
        }),
    });
  }
	  if (url === "/api/account/content-plan/bulk-update") {
	    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [{ id: "one", title: "One", status: "draft" }] },
          },
          contentPlan: { items: [{ id: "one", title: "One", status: "draft" }] },
        }),
	    });
	  }
  if (url === "/api/account/content-plan/bulk-schedule") {
    const body = JSON.parse(options.body || "{}");
    const items = [
      {
        id: "bulk-plan-1",
        topicId: "bulk-topic-1",
        title: "Bulk topic one",
        keyword: "bulk keyword one",
        status: body.status || "scheduled",
        scheduledDate: body.startDate || "2026-08-25",
      },
      {
        id: "bulk-plan-2",
        topicId: "bulk-topic-2",
        title: "Bulk topic two",
        keyword: "bulk keyword two",
        status: body.status || "scheduled",
        scheduledDate: "2026-08-28",
      },
    ];
    const topics = (context.accountState?.data?.topics || []).map((topic) => ({ ...topic, added: true }));
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          topics,
          contentPlan: { items },
          account: {
            ...context.accountState?.data,
            topics,
            contentPlan: { items },
          },
        }),
    });
  }
  if (url === "/api/account/content-plan/items/plan-card" && !options.method) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          item: {
            id: "plan-card",
            title: "Calendar card article",
            keyword: "calendar keyword",
            seoTitle: "Calendar SEO",
            metaDescription: "Calendar meta",
            brief: "Calendar brief",
            body: "",
            status: "scheduled",
            scheduledDate: "2026-08-24",
            volume: 900,
            difficulty: "Easy",
            estimatedVisits: 99,
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/plan-card" && !options.method) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post: {
            id: "plan-card",
            title: "Calendar card article",
            slug: "calendar-card-article",
            keyword: "calendar keyword",
            category: "Guides",
            excerpt: "Calendar excerpt",
            scheduledDate: "2026-08-24",
            scheduledTime: "09:30",
            seoTitle: "Calendar SEO",
            metaDescription: "Calendar meta",
            brief: "Calendar brief",
            body: "Calendar body",
            status: "scheduled",
          },
        }),
    });
  }
  if (url === "/api/account/content-plan/items/plan-card/generate") {
    const item = {
      id: "plan-card",
      title: "Calendar card article",
      keyword: "calendar keyword",
      status: "draft",
      scheduledDate: "2026-08-24",
      body: "Generated planned-card body.",
      generatedAt: "2026-08-12T12:00:00.000Z",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          contentPlan: { items: [item] },
          account: { ...context.accountState?.data, contentPlan: { items: [item] } },
        }),
    });
  }
  if (url === "/api/account/content-plan/items/plan-card/publish") {
    const item = {
      id: "plan-card",
      title: "Calendar card article",
      keyword: "calendar keyword",
      status: "published",
      scheduledDate: "2026-08-24",
      body: "Published planned-card body.",
      publicPath: "/blog/calendar-card-article",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          cmsStatus: "connected",
          contentPlan: { items: [item] },
          account: { ...context.accountState?.data, contentPlan: { items: [item] } },
        }),
    });
  }
  if (url === "/api/account/content-plan/items/plan-card" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const item = { id: "plan-card", ...body };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          contentPlan: { items: [item] },
          account: { ...context.accountState?.data, contentPlan: { items: [item] } },
        }),
    });
  }
  if (url === "/api/account/content-plan/items/plan-card" && options.method === "DELETE") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          contentPlan: { items: [] },
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [] },
            setupChecklist: {
              completed: 0,
              total: 1,
              percent: 0,
              items: [{ label: "Schedule articles", detail: "No articles scheduled.", complete: false, action: { view: "plan" } }],
            },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/scheduled-post/schedule") {
    const body = JSON.parse(options.body);
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          account: {
            ...context.accountState?.data,
            contentPlan: {
              items: [
                {
                  id: "scheduled-post",
                  title: "Scheduled post",
                  status: "scheduled",
                  scheduledDate: body.scheduledDate,
                  scheduledTime: body.scheduledTime,
                },
              ],
            },
          },
          post: {
            id: "scheduled-post",
            title: "Scheduled post",
            status: "scheduled",
            scheduledDate: body.scheduledDate,
            scheduledTime: body.scheduledTime,
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/publish-post/publish") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          account: {
            ...context.accountState?.data,
            contentPlan: {
              items: [
                {
                  id: "publish-post",
                  title: "Publish post",
                  status: "published",
                  body: "Ready body",
                  publishedAt: "2026-08-10T12:00:00.000Z",
                  publicPath: "/blog/publish-post",
                },
              ],
            },
          },
          post: {
            id: "publish-post",
            title: "Publish post",
            status: "published",
            publicPath: "/blog/publish-post",
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/edit-post" && !options.method) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post: {
            id: "edit-post",
            title: "Edit me",
            slug: "edit-me",
            keyword: "edit keyword",
            category: "Guides",
            excerpt: "Original excerpt",
            scheduledDate: "2999-01-01",
            scheduledTime: "09:00",
            seoTitle: "Original SEO title",
            metaDescription: "Original meta",
            internalLinks: "https://sirbloggsalot.com/pricing",
            schemaType: "Article",
            featuredImageUrl: "https://sirbloggsalot.com/assets/original.png",
            featuredImageAlt: "Original image alt",
            brief: "Original brief",
            body: "Original body",
            notes: "Original notes",
            status: "scheduled",
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/edit-post" && options.method === "PUT") {
    const body = JSON.parse(options.body || "{}");
    const post = { id: "edit-post", ...body };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [post] },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/edit-post/generate") {
    const post = {
      id: "edit-post",
      title: "Edit me",
      keyword: "edit keyword",
      status: "draft",
      body: "Generated edit article body.",
      generatedAt: "2026-08-12T12:00:00.000Z",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [post] },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/generate-post/generate") {
    const post = {
      id: "generate-post",
      title: "Generate post",
      keyword: "generate keyword",
      status: "draft",
      body: "Generated local article body.",
      generatedAt: "2026-08-12T12:00:00.000Z",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [post] },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/unpublish-post/unpublish") {
    const post = {
      id: "unpublish-post",
      title: "Published post",
      slug: "published-post",
      status: "draft",
      publicPath: "",
      publishedAt: "",
    };
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post,
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [post] },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/delete-post" && options.method === "DELETE") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post: { id: "delete-post", title: "Delete post", status: "draft", deletedAt: "2026-08-12T12:00:00.000Z" },
          account: {
            ...context.accountState?.data,
            contentPlan: { items: [] },
          },
        }),
    });
  }
  if (url === "/api/account/blog/posts/builder-post") {
    if (options.method === "PUT") {
      const body = JSON.parse(options.body || "{}");
      const post = { id: "builder-post", ...body };
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            post,
            account: {
              ...context.accountState?.data,
              writeDraft: { sourcePostId: "builder-post", status: "queued" },
              contentPlan: { items: [post] },
            },
          }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          post: {
            id: "builder-post",
            title: "Builder loaded title",
            slug: "builder-loaded-title",
            keyword: "builder keyword",
            category: "Playbooks",
            excerpt: "Builder excerpt",
            canonicalUrl: "https://sirbloggsalot.com/blog/builder-loaded-title",
            authorName: "Builder Author",
            scheduledDate: "2026-08-14",
            scheduledTime: "11:15",
            volume: 2400,
            difficulty: "Medium",
            estimatedVisits: 180,
            seoTitle: "Builder SEO title",
            metaDescription: "Builder meta",
            featuredImageUrl: "https://sirbloggsalot.com/assets/builder.png",
            featuredImageAlt: "Builder image alt",
            brief: "Builder brief",
            body: "Builder body",
            notes: "Builder notes",
            status: "scheduled",
          },
        }),
    });
  }
		  return Promise.reject(new Error(`Unexpected fetch ${url}`));
			};
	(async () => {
  startArticleCalls.length = 0;
  setLocation("/invite/%");
  vm.runInContext("authState.ready = true; authState.user = null;", context);
  await vm.runInContext("loadInvite();", context);
  assert.strictEqual(elements["[data-invite-message]"].textContent, "Invite link is missing.");
  assert.strictEqual(elements["[data-invite-detail]"].textContent, "Ask the workspace owner to generate a new invitation link.");
  assert.strictEqual(elements['[data-account-action="accept-invite"]'].disabled, true);

  console.log("Malformed invite route checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner Workspace", ui: {}, contentPlan: { items: [] }, settings: { site: {}, images: {} }, topics: [], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
renderAccountData();`,
    context
  );
  await context.handleAccountAction("start-tour");
  assert.strictEqual(elements["[data-tour-overlay]"].hidden, false);
  assert.strictEqual(elements["[data-tour-title]"].textContent, "Welcome to Sir Bloggsalot!");
  assert.ok(elements["[data-tour-body]"].textContent.includes("This will only take about 2 minutes."));
  assert.strictEqual(elements["[data-tour-progress]"].textContent, "1 of 11");
  assert.strictEqual((elements["[data-tour-dots]"].innerHTML.match(/data-tour-dot/g) || []).length, 11);
  assert.strictEqual(elements["[data-tour-overlay]"].classList.contains("has-pointer"), false);
  assert.strictEqual(accountViewButtons.some((button) => button.classList.contains("is-tour-target")), false);
  assert.strictEqual(elements['[data-account-action="tour-back"]'].hidden, true);
  assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === "plan").hidden, false);
  await context.handleAccountAction("tour-close");
  assert.strictEqual(elements["[data-tour-overlay]"].hidden, true);
  assert.strictEqual(elements['[data-account-action="tour-next"]'].hidden, false);
  assert.strictEqual(elements['[data-account-action="tour-finish"]'].hidden, true);
  await context.handleAccountAction("start-tour");
  const screenshotBackedTourSteps = [
    ["Your Article Command Center", "This is where all your blog posts live.", "2 of 11", "plan", "", false, "", false, false],
    ["Filter by Status", "Quickly filter your articles by status.", "3 of 11", "plan", "", false, "", false, false],
    ["Bulk Schedule Articles", "This is the magic button!", "4 of 11", "plan", "", false, "", false, false],
    ["Write", "Write lets you craft one article yourself, step by step.", "5 of 11", "write", "", true, "", false, false],
    ["Topics Worth Writing", "Topics pulls real search-volume data", "6 of 11", "topics", "", true, "", false, false],
    ["Let's Check Your Settings", "customize how Sir Bloggsalot writes for your brand", "7 of 11", "settings", "", true, "", false, false],
    ["Customize Your Content", "set up your business description", "8 of 11", "settings", "site", true, "site", true, true],
    ["Connect Your Blog Platform", "Connect your WordPress, Webflow, Shopify", "9 of 11", "settings", "cms", true, "cms", false, true],
    ["Customize Your Images", "Choose how images are generated for your articles.", "10 of 11", "settings", "images", true, "images", false, true],
    ["You're All Set!", "Start creating amazing content by clicking 'Bulk Schedule'", "11 of 11", "settings", "site", true, "site", false, true],
  ];
  for (const [title, bodySnippet, progress, view, tab, hasPointer, tabTarget, tabStripTarget, hasTabPointer] of screenshotBackedTourSteps) {
    await context.handleAccountAction("tour-next");
    assert.strictEqual(elements["[data-tour-title]"].textContent, title);
    assert.ok(elements["[data-tour-body]"].textContent.includes(bodySnippet));
    assert.strictEqual(elements["[data-tour-progress]"].textContent, progress);
    assert.strictEqual(elements["[data-tour-overlay]"].classList.contains("has-pointer"), hasPointer);
    assert.strictEqual(elements["[data-tour-overlay]"].classList.contains("has-tab-pointer"), hasTabPointer);
    accountViewButtons.forEach((button) => {
      assert.strictEqual(button.classList.contains("is-tour-target"), hasPointer && !tabTarget && button.dataset.accountView === view);
    });
    settingsTabButtons.forEach((button) => {
      assert.strictEqual(button.classList.contains("is-tour-target"), Boolean(tabTarget) && button.dataset.settingsTab === tabTarget);
    });
    assert.strictEqual(settingsTabsShell.classList.contains("is-tour-target"), tabStripTarget);
    assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === view).hidden, false);
    if (tab) assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === tab).hidden, false);
  }
  assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === "settings").hidden, false);
  assert.strictEqual(settingsPanels.find((panel) => panel.dataset.settingsPanel === "site").hidden, false);
  assert.strictEqual(elements['[data-account-action="tour-back"]'].hidden, false);
  assert.strictEqual(elements['[data-account-action="tour-next"]'].hidden, true);
  assert.strictEqual(elements['[data-account-action="tour-finish"]'].hidden, false);
  await context.handleAccountAction("tour-finish");
  assert.strictEqual(elements["[data-tour-overlay]"].hidden, true);
  assert.strictEqual(accountViewButtons.some((button) => button.classList.contains("is-tour-target")), false);
  assert.strictEqual(settingsTabButtons.some((button) => button.classList.contains("is-tour-target")), false);
  assert.strictEqual(elements['[data-account-action="tour-finish"]'].hidden, true);

  console.log("Onboarding tour overlay checks passed.");

  setLocation("/login?next=%2Fprivacy");
  vm.runInContext("authState.user = null;", context);
  await context.handleGoogleCredential({ credential: "credential-test" });
  assert.ok(startArticleCalls.find((call) => call.url === "/api/auth/google"));
  assert.strictEqual(location.pathname, "/account");
  assert.strictEqual(location.search, "?view=billing");
  setLocation("/login");
  vm.runInContext("authState.user = null;", context);
  await context.handleGoogleCredential({ credential: "credential-test" });
  assert.strictEqual(location.pathname, "/account");
  assert.strictEqual(location.search, "?view=billing");

  console.log("Google credential next fallback checks passed.");

  setLocation("/account?view=billing");
  vm.runInContext('authState.ready = true; authState.user = { email: "owner@example.com" };', context);
  await logoutButtons[0].listeners.click[0]();
  assert.strictEqual(location.pathname, "/login");
  assert.strictEqual(location.search, "?next=%2Faccount%3Fview%3Dbilling");
  setLocation("/account");
  vm.runInContext(
    `authState.user = { email: "owner@example.com" };
accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [], strategy: "Draft strategy" }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
    context
  );
  historyWrites.length = 0;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-setup-jump-view]") return { dataset: { setupJumpView: "settings", setupJumpTab: "cms" } };
        return null;
      },
    },
  });
  assert.deepStrictEqual(
    historyWrites.filter((write) => write.mode === "push").map((write) => write.next),
    ["/account?view=settings&tab=cms"]
  );
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "settings");
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeSettingsTab", context), "cms");
  historyWrites.length = 0;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-setup-jump-view]") return { dataset: { setupJumpView: "missing-view", setupJumpTab: "bad-tab" } };
        return null;
      },
    },
  });
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "plan");
  assert.strictEqual(accountPanels.find((panel) => panel.dataset.accountPanel === "plan").hidden, false);
  assert.deepStrictEqual(
    historyWrites.filter((write) => write.mode === "push").map((write) => write.next),
    ["/account?view=plan"]
  );

  vm.runInContext(
    `accountState.data.setupChecklist = {
      completed: 0,
      total: 1,
      percent: 0,
      items: [{ label: "Save content strategy", detail: "Content strategy is missing.", complete: false, action: { view: "plan" } }]
    };
    renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  await context.handleAccountAction("strategy");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit content strategy");
  await vm.runInContext('accountState.dialogSubmit({ strategy: "Focus on comparison articles before local pages." })', context);
  const strategyCall = startArticleCalls.find((call) => call.url === "/api/account/content-plan/strategy");
  assert.ok(strategyCall);
  assert.strictEqual(JSON.parse(strategyCall.options.body).strategy, "Focus on comparison articles before local pages.");
  assert.strictEqual(elements["[data-content-strategy]"].textContent, "Focus on comparison articles before local pages.");
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Content strategy updated.");

  elements["[data-strategy-card]"].hidden = false;
  await context.handleAccountAction("dismiss-strategy");
  assert.strictEqual(elements["[data-strategy-card]"].hidden, true);

  vm.runInContext(
    `authState.user = { email: "owner@example.com" };
accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.loading = false;`,
    context
  );
  await context.handleAccountAction("refresh");
  const refreshSummaryCall = startArticleCalls.find((call) => call.url === "/api/account/summary");
  assert.ok(refreshSummaryCall);
  assert.strictEqual(elements["[data-account-workspace]"].textContent, "Refreshed Workspace");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Account data refreshed.");

  vm.runInContext(
    `accountState.data = {
      id: "owner",
      ownerEmail: "owner@example.com",
      workspaceName: "Owner",
      ui: {},
      contentPlan: { items: [] },
      settings: {
        site: {
          productDescription: "",
          targetAudience: "Local business owners",
          brandVoice: "Helpful",
          competitors: "",
          language: "English",
          publishingCadence: "weekly",
          timezone: "America/Los_Angeles",
          defaultPublishTime: "09:00",
          keywords: []
        },
        images: {},
        cms: {},
        cta: {}
      },
      writeDraft: {},
      products: [],
      locations: [],
      members: [],
      invites: [],
      billing: {},
      searchConsole: {},
      rankings: {},
      aiMentions: {},
      supportTickets: [],
      setupChecklist: {
        completed: 0,
        total: 1,
        percent: 0,
        items: [{ label: "Save business basics", detail: "Business basics are missing.", complete: false, action: { view: "settings", tab: "site" } }]
      }
    };
    renderAccountData();`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  completeSetupOnNextSettingsSave = true;
  await context.saveAccountSettings();
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/settings" && call.options.method === "PUT"));
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/write-draft" && call.options.method === "PUT"));
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Changes saved.");
  console.log("Account refresh and strategy dismiss action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { cms: { websiteUrl: "https://shop.example.com", platform: "Shopify", status: "draft-first", hasCredentials: false } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] }; renderSettings(accountState.data);`,
    context
  );
  await context.handleAccountAction("connect-cms");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Connect CMS");
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Shopify Admin API"));
  assert.strictEqual(elements["[data-dialog-form]"].children[0].textContent, "Shopify store URL");
  assert.strictEqual(elements["[data-dialog-form]"].children[2].textContent, "Shopify admin email or staff account");
  assert.strictEqual(elements["[data-dialog-form]"].children[3].textContent, "Blog or collection target");
  assert.strictEqual(elements["[data-dialog-form]"].children[4].textContent, "Collection or post type");
  assert.strictEqual(elements["[data-dialog-form]"].children[5].textContent, "Publishing mode");
  assert.strictEqual(elements["[data-dialog-form]"].children[6].textContent, "Admin API access token");
  console.log("CMS platform-specific form checks passed.");
  const cmsConnectCallsBeforeFailedSave = startArticleCalls.filter((call) => call.url === "/api/account/cms/connect").length;
  failNextSettingsSave = true;
  formEntries = [
    ["websiteUrl", "https://shop.example.com"],
    ["platform", "Shopify"],
    ["username", "owner@example.com"],
    ["blogTarget", "News"],
    ["collectionName", "Articles"],
    ["draftFirst", "false"],
    ["secret", "local-secret"],
  ];
  await elements["[data-dialog-form]"].listeners.submit[0]({ preventDefault() {} });
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/cms/connect").length, cmsConnectCallsBeforeFailedSave);
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Connect CMS");
  assert.strictEqual(elements["[data-account-dialog]"].hidden, false);
  assert.strictEqual(typeof vm.runInContext("accountState.dialogSubmit", context), "function");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Settings validation failed.");

  await context.handleAccountAction("connect-cms");
  const cmsConnectSubmit = vm.runInContext('accountState.dialogSubmit({ websiteUrl: "https://shop.example.com", platform: "Shopify", username: "owner@example.com", blogTarget: "News", collectionName: "Articles", draftFirst: "false", secret: "local-secret" })', context);
  assert.strictEqual(elements["[data-cms-progress]"].hidden, false);
  assert.strictEqual(elements["[data-cms-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-cms-progress]"].textContent.includes("Saving CMS connection"));
  await cmsConnectSubmit;
  const cmsConnectCall = startArticleCalls.find((call) => call.url === "/api/account/cms/connect");
  assert.ok(cmsConnectCall);
  assert.deepStrictEqual(JSON.parse(cmsConnectCall.options.body), {
    websiteUrl: "https://shop.example.com",
    platform: "Shopify",
    username: "owner@example.com",
    blogTarget: "News",
    collectionName: "Articles",
    draftFirst: false,
    secret: "local-secret",
  });
  assert.ok(elements["[data-cms-status]"].textContent.includes("Shopify local setup is connected"));
  assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("credentials configured"));
  assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("Target: News"));
  assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("Collection: Articles"));
  assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("Auto-publish"));
  assert.strictEqual(elements["[data-cms-progress]"].hidden, true);
  assert.strictEqual(elements["[data-cms-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "CMS connection saved locally.");

  const cmsTestAction = context.handleAccountAction("test-cms");
  assert.strictEqual(elements["[data-cms-progress]"].hidden, false);
  assert.strictEqual(elements["[data-cms-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-cms-progress]"].textContent.includes("Testing CMS setup"));
  await cmsTestAction;
  const cmsTestCall = startArticleCalls.find((call) => call.url === "/api/account/cms/test");
  assert.ok(cmsTestCall);
  assert.strictEqual(elements["[data-cms-progress]"].hidden, true);
  assert.strictEqual(elements["[data-cms-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "CMS setup");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-cms-test-result"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Provider pending"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Platform"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Website"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Target"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Collection"));

  await context.handleAccountAction("disconnect-cms");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Disconnect CMS");
  const cmsDisconnectSubmit = vm.runInContext("accountState.dialogSubmit({})", context);
  assert.strictEqual(elements["[data-cms-progress]"].hidden, false);
  assert.strictEqual(elements["[data-cms-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-cms-progress]"].textContent.includes("Disconnecting CMS"));
  await cmsDisconnectSubmit;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/cms/disconnect"));
  assert.strictEqual(elements["[data-cms-progress]"].hidden, true);
  assert.strictEqual(elements["[data-cms-progress]"].attributes["aria-busy"], "false");
  assert.ok(elements["[data-cms-status]"].textContent.includes("disconnected"));
  assert.ok(elements["[data-cms-details]"].children[0].innerHTML.includes("credentials missing"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "CMS disconnected locally.");
  console.log("CMS connect test disconnect action checks passed.");

  vm.runInContext(
	    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
	accountState.workspaces = [
	  { id: "owner", workspaceName: "Owner", ownerEmail: "owner@example.com", role: "owner", selected: true },
	  { id: "client", workspaceName: "Client Workspace", ownerEmail: "client@example.com", role: "editor", selected: false }
	];
	accountState.selectedWorkspaceId = "owner";`,
    context
  );
	  await context.handleAccountAction("workspace");
	  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Switch workspace");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-workspace-switch-select="client"'));
  const workspaceSelectCallsBeforeRowClick = startArticleCalls.filter((call) => call.url === "/api/account/workspaces/select").length;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-workspace-switch-select]") return { dataset: { workspaceSwitchSelect: "client" } };
        return null;
      },
    },
  });
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/workspaces/select").length, workspaceSelectCallsBeforeRowClick + 1);
  const workspaceSelectCall = [...startArticleCalls].reverse().find((call) => call.url === "/api/account/workspaces/select");
  assert.deepStrictEqual(JSON.parse(workspaceSelectCall.options.body), { workspaceId: "client" });
  assert.strictEqual(vm.runInContext("accountState.selectedWorkspaceId", context), "client");
  assert.strictEqual(elements["[data-account-workspace]"].textContent, "Client Workspace");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Workspace switched.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], activityLog: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [
  { id: "owner", workspaceName: "Owner", ownerEmail: "owner@example.com", role: "owner", selected: true },
  { id: "client", workspaceName: "Client Workspace", ownerEmail: "client@example.com", role: "editor", selected: false }
];
accountState.selectedWorkspaceId = "owner";`,
    context
  );
  await context.handleAccountAction("workspace");
	  const workspaceActions = elements["[data-dialog-form]"].children[elements["[data-dialog-form]"].children.length - 1];
  const addWorkspaceButton = workspaceActions.children.find((button) => button.textContent === "Add site workspace");
  assert.ok(addWorkspaceButton);
  await addWorkspaceButton.listeners.click[0]();
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Add site workspace");
  const createWorkspaceCallsBeforeInvalidSubmit = startArticleCalls.filter((call) => call.url === "/api/account/workspaces").length;
  let invalidWorkspaceFormReported = false;
  elements["[data-dialog-form]"].checkValidity = () => false;
  elements["[data-dialog-form]"].reportValidity = () => {
    invalidWorkspaceFormReported = true;
    return false;
  };
  formEntries = [
    ["workspaceName", ""],
    ["websiteUrl", "https://second.example.com"],
  ];
  await elements["[data-dialog-form]"].listeners.submit[0]({ preventDefault() {} });
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/workspaces").length, createWorkspaceCallsBeforeInvalidSubmit);
  assert.strictEqual(invalidWorkspaceFormReported, true);
  assert.strictEqual(elements["[data-account-dialog]"].hidden, false);
  elements["[data-dialog-form]"].checkValidity = () => true;
  await vm.runInContext('accountState.dialogSubmit({ workspaceName: "Second Site", websiteUrl: "https://second.example.com" })', context);
  const createWorkspaceCall = startArticleCalls.find((call) => call.url === "/api/account/workspaces");
  assert.ok(createWorkspaceCall);
  assert.deepStrictEqual(JSON.parse(createWorkspaceCall.options.body), { workspaceName: "Second Site", websiteUrl: "https://second.example.com" });
  assert.strictEqual(vm.runInContext("accountState.selectedWorkspaceId", context), "workspace-new");
  assert.strictEqual(elements["[data-account-workspace]"].textContent, "Second Site");
  assert.strictEqual(elements["[data-account-role]"].textContent, "Owner");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Workspace added locally.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { cta: { enabled: false, label: "", text: "", url: "", placement: "end", style: "button", openInNewTab: true, trackingLabel: "" } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, setupChecklist: { completed: 0, total: 1, percent: 0, items: [{ label: "Configure CTA", detail: "Article CTA is missing.", complete: false, action: { view: "settings", tab: "cta" } }] }, supportTickets: [] };
renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  await context.handleAccountAction("edit-cta");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit call to action");
  completeSetupOnNextSettingsSave = true;
  await vm.runInContext('accountState.dialogSubmit({ enabled: "true", label: "Free consultation", text: "Book a call", url: "https://sirbloggsalot.com/#pricing", placement: "inline", style: "banner", openInNewTab: "false", trackingLabel: "pricing_cta" })', context);
  const ctaSettingsCall = startArticleCalls.find((call) => call.url === "/api/account/settings" && JSON.parse(call.options.body).cta?.text === "Book a call");
  assert.ok(ctaSettingsCall);
  assert.deepStrictEqual(JSON.parse(ctaSettingsCall.options.body).cta, {
    enabled: true,
    label: "Free consultation",
    text: "Book a call",
    url: "https://sirbloggsalot.com/#pricing",
    placement: "inline",
    style: "banner",
    openInNewTab: false,
    trackingLabel: "pricing_cta",
  });
  assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("Book a call"));
  assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("same tab"));
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "CTA saved locally.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-cta-detail]") return { dataset: { ctaDetail: "true" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "CTA detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Free consultation"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Book a call"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("https://sirbloggsalot.com/#pricing"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("After intro"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Banner"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Same tab"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("pricing_cta"));

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { images: { includeImages: true, useProductImages: true, stylePreset: "editorial", aspectRatio: "3:4", imageCadence: "key-sections", visualStyle: "Clean local product photography", guidelines: "Use real products and local context." } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] }; renderSettings(accountState.data);`,
    context
  );
  const visualStyleInput = settingsFieldInputs.find((input) => input.dataset.settingsField === "images.visualStyle");
  const productImagesToggle = settingsToggleButtons.find((button) => button.dataset.settingsToggle === "images.useProductImages");
  const customGuidelinesToggle = settingsToggleButtons.find((button) => button.dataset.settingsToggle === "images.useCustomGuidelines");
  assert.strictEqual(productImagesToggle.classList.contains("is-on"), false);
  assert.strictEqual(productImagesToggle.attributes["aria-pressed"], "false");
  assert.strictEqual(productImagesToggle.disabled, true);
  assert.strictEqual(customGuidelinesToggle.classList.contains("is-on"), false);
  assert.strictEqual(elements["[data-image-guidelines-editor]"].hidden, true);
  await context.handleAccountAction("suggest-image-visual-style");
  assert.ok(visualStyleInput.value.includes("professional photography"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Visual style suggestion added locally.");
  await context.handleAccountAction("reset-image-visual-style");
  assert.strictEqual(visualStyleInput.value, "");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Visual style reset locally.");
  vm.runInContext(
    `accountState.data.settings.images.useCustomGuidelines = true; renderSettings(accountState.data);`,
    context
  );
  assert.strictEqual(customGuidelinesToggle.classList.contains("is-on"), true);
  assert.strictEqual(elements["[data-image-guidelines-editor]"].hidden, false);

  vm.runInContext(
    `accountState.data.settings.images.useCustomGuidelines = false; renderSettings(accountState.data);`,
    context
  );
  const imageTestCallsBeforeFailedSave = startArticleCalls.filter((call) => call.url === "/api/account/images/test").length;
  failNextSettingsSave = true;
  await context.handleAccountAction("test-image-settings");
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/images/test").length, imageTestCallsBeforeFailedSave);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Settings validation failed.");
  assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "plan-1", title: "Local delivery guide", keyword: "local delivery", status: "draft" }] }, settings: { images: { includeImages: true, useProductImages: true, stylePreset: "editorial", aspectRatio: "3:4", imageCadence: "key-sections", visualStyle: "Clean local product photography", guidelines: "Use real products and local context." } }, products: [{ id: "product-1", name: "Premium Service Package", category: "Service" }], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] }; renderSettings(accountState.data);`,
    context
  );
  const imageTestAction = context.handleAccountAction("test-image-settings");
  assert.strictEqual(elements["[data-image-progress]"].hidden, false);
  assert.strictEqual(elements["[data-image-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-image-progress]"].textContent.includes("Testing image prompt"));
  await imageTestAction;
  const imageTestCall = startArticleCalls.find((call) => call.url === "/api/account/images/test");
  const imageSettingsCall = startArticleCalls.find((call) => call.url === "/api/account/settings" && JSON.parse(call.options.body).images?.useProductImages === true);
  assert.ok(imageTestCall);
  assert.ok(imageSettingsCall);
  assert.strictEqual(JSON.parse(imageSettingsCall.options.body).images.useCustomGuidelines, false);
  assert.strictEqual(JSON.parse(imageSettingsCall.options.body).images.guidelines, "Use real products and local context.");
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Latest image prompt"));
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("data-image-preview"));
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Local image preview"));
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Provider pending"));
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("3:4"));
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("key-sections"));
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("Editorial local retail shelf image"));
  assert.ok(elements["[data-image-details]"].children[0].innerHTML.includes("data-image-history-clear"));
  assert.strictEqual(elements["[data-image-progress]"].hidden, true);
  assert.strictEqual(elements["[data-image-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Image prompt generated locally.");

  vm.runInContext(
    `accountState.data.setupChecklist = {
      completed: 0,
      total: 1,
      percent: 0,
      items: [{ label: "Review image settings", detail: "Image prompt history needs review.", complete: false, action: { view: "settings", tab: "images" } }]
    };
    renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  const imageClearAction = context.handleAccountAction("clear-image-tests");
  assert.strictEqual(elements["[data-image-progress]"].hidden, false);
  assert.strictEqual(elements["[data-image-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-image-progress]"].textContent.includes("Clearing image prompt history"));
  await imageClearAction;
  const imageClearCall = startArticleCalls.find((call) => call.url === "/api/account/images/test-history" && call.options.method === "DELETE");
  assert.ok(imageClearCall);
  assert.ok(elements["[data-image-details]"].innerHTML.includes("No image test yet"));
  assert.strictEqual(elements["[data-image-details]"].children.length, 0);
  assert.strictEqual(elements["[data-image-progress]"].hidden, true);
  assert.strictEqual(elements["[data-image-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Image prompt history cleared.");
  console.log("Image settings action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.productFilter = "all";
accountState.productSearch = "";`,
    context
  );
  await context.handleAccountAction("add-product");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Add product");
  const addProductVisibilityField = elements["[data-dialog-form]"].children.find((child) => child.children?.[0]?.name === "hidden")?.children?.[0];
  assert.ok(addProductVisibilityField);
  assert.strictEqual(addProductVisibilityField.value, "visible");
  await vm.runInContext('accountState.dialogSubmit({ name: "Starter SEO Plan", category: "Service", description: "Monthly content", price: "$99/mo", sku: "SEO-STARTER", audience: "local contractors", url: "https://sirbloggsalot.com/pricing", featured: "true", hidden: "hidden" })', context);
  const productCreateCall = startArticleCalls.find((call) => call.url === "/api/account/products");
  assert.ok(productCreateCall);
  assert.deepStrictEqual(JSON.parse(productCreateCall.options.body), {
    name: "Starter SEO Plan",
    category: "Service",
    description: "Monthly content",
    price: "$99/mo",
    sku: "SEO-STARTER",
    audience: "local contractors",
    url: "https://sirbloggsalot.com/pricing",
    featured: true,
    hidden: true,
    source: "manual",
  });
  assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("Starter SEO Plan"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Product saved.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-product-detail]") return { dataset: { productDetail: "product-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Product detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Starter SEO Plan"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("SEO-STARTER"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("local contractors"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("https://sirbloggsalot.com/pricing"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Hidden"));

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-product-edit]") return { dataset: { productEdit: "product-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit product");
  await vm.runInContext('accountState.dialogSubmit({ name: "Updated SEO Plan", category: "Service", description: "Updated monthly content", price: "$149/mo", sku: "SEO-PRO", audience: "service businesses", url: "https://sirbloggsalot.com/pro", featured: "false", hidden: "visible" })', context);
  const productUpdateCall = startArticleCalls.find((call) => call.url === "/api/account/products/product-1" && JSON.parse(call.options.body).name === "Updated SEO Plan");
  assert.ok(productUpdateCall);
  assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("Updated SEO Plan"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Product updated.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-product-toggle]") return { dataset: { productToggle: "product-1" } };
        return null;
      },
    },
  });
  const productHideCall = startArticleCalls.find((call) => call.url === "/api/account/products/product-1" && JSON.parse(call.options.body).hidden === true);
  assert.ok(productHideCall);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Product hidden.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-product-delete]") return { dataset: { productDelete: "product-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Delete product");
  vm.runInContext(
    `accountState.data.setupChecklist = {
      completed: 1,
      total: 1,
      percent: 100,
      items: [{ label: "Add products", detail: "One product exists.", complete: true, action: { view: "settings", tab: "products" } }]
    };
    renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/products/product-1" && call.options.method === "DELETE"));
  assert.strictEqual(elements["[data-products-manual-controls]"].hidden, false);
  assert.strictEqual(elements["[data-products-list]"].hidden, false);
  assert.ok(elements["[data-products-list]"].innerHTML.includes("No products yet"));
  assert.ok(elements["[data-products-list]"].innerHTML.includes("Add your first product"));
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Product deleted.");
  console.log("Product CRUD action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
    context
  );
  await context.handleAccountAction("add-location");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Add business location");
  await vm.runInContext('accountState.dialogSubmit({ name: "Main office", city: "Dana Point", state: "CA", address: "1 Market St", phone: "555-0100", serviceArea: "Orange County", isPrimary: "true" })', context);
  const locationCreateCall = startArticleCalls.find((call) => call.url === "/api/account/locations");
  assert.ok(locationCreateCall);
  assert.deepStrictEqual(JSON.parse(locationCreateCall.options.body), {
    name: "Main office",
    city: "Dana Point",
    state: "CA",
    address: "1 Market St",
    phone: "555-0100",
    serviceArea: "Orange County",
    isPrimary: true,
  });
  assert.ok(elements["[data-locations-list]"].children[0].innerHTML.includes("Main office"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Location saved.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-location-detail]") return { dataset: { locationDetail: "location-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Location detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Main office"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Dana Point, CA"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("1 Market St"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("555-0100"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Orange County"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Primary"));

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-location-edit]") return { dataset: { locationEdit: "location-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit business location");
  await vm.runInContext('accountState.dialogSubmit({ name: "South County office", city: "San Clemente", state: "CA", address: "2 Camino Real", phone: "555-0200", serviceArea: "South Orange County", isPrimary: "false" })', context);
  const locationUpdateCall = startArticleCalls.find((call) => call.url === "/api/account/locations/location-1" && JSON.parse(call.options.body).name === "South County office");
  assert.ok(locationUpdateCall);
  assert.ok(elements["[data-locations-list]"].children[0].innerHTML.includes("San Clemente, CA"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Location updated.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-location-delete]") return { dataset: { locationDelete: "location-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Delete location");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/locations/location-1" && call.options.method === "DELETE"));
  assert.ok(elements["[data-locations-list]"].innerHTML.includes("No locations yet"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Location deleted.");
  console.log("Location CRUD action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, inventoryFeed: { status: "disconnected", retailerName: "", accountId: "", hasCredentials: false }, supportTickets: [] };
accountState.productFilter = "all";
accountState.productSearch = "";`,
    context
  );
  await context.handleAccountAction("connect-inventory");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Connect inventory feed");
  const inventoryConnectSubmit = vm.runInContext('accountState.dialogSubmit({ retailerName: "Test Catalog", accountId: "retailer-123", secret: "local-token" })', context);
  assert.strictEqual(elements["[data-inventory-progress]"].hidden, false);
  assert.strictEqual(elements["[data-inventory-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-inventory-progress]"].textContent.includes("Saving inventory connection"));
  await inventoryConnectSubmit;
  const inventoryConnectCall = startArticleCalls.find((call) => call.url === "/api/account/inventory-feed/connect");
  assert.ok(inventoryConnectCall);
  assert.deepStrictEqual(JSON.parse(inventoryConnectCall.options.body), { retailerName: "Test Catalog", accountId: "retailer-123", secret: "local-token" });
  assert.strictEqual(elements["[data-inventory-status]"].textContent.includes("Test Catalog is connected locally"), true);
  assert.strictEqual(elements["[data-inventory-progress]"].hidden, true);
  assert.strictEqual(elements["[data-inventory-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Inventory connection saved locally.");

  const inventorySyncAction = context.handleAccountAction("sync-inventory");
  assert.strictEqual(elements["[data-inventory-progress]"].hidden, false);
  assert.strictEqual(elements["[data-inventory-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-inventory-progress]"].textContent.includes("Syncing inventory products"));
  await inventorySyncAction;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/inventory-feed/sync"));
  assert.ok(elements["[data-products-list]"].children[0].innerHTML.includes("Catalog Service"));
  assert.ok(elements["[data-inventory-details]"].children[0].innerHTML.includes("2 synced"));
  assert.strictEqual(elements["[data-inventory-progress]"].hidden, true);
  assert.strictEqual(elements["[data-inventory-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Inventory products synced locally.");

  await context.handleAccountAction("disconnect-inventory");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Disconnect inventory feed");
  const inventoryDisconnectSubmit = vm.runInContext("accountState.dialogSubmit({})", context);
  assert.strictEqual(elements["[data-inventory-progress]"].hidden, false);
  assert.strictEqual(elements["[data-inventory-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-inventory-progress]"].textContent.includes("Disconnecting inventory feed"));
  await inventoryDisconnectSubmit;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/inventory-feed/disconnect"));
  assert.strictEqual(elements["[data-inventory-progress]"].hidden, true);
  assert.strictEqual(elements["[data-inventory-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Inventory feed disconnected locally.");
  console.log("Inventory feed connect sync disconnect checks passed.");

  elements["[data-account-operation]"].textContent = "";
  elements["[data-dialog-title]"].textContent = "";
  elements["[data-dialog-body]"].textContent = "";
  vm.runInContext(
    `accountState.role = "owner";
accountState.selectedWorkspaceId = "owner";
accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro", status: "trial", billingPeriod: "monthly", invoices: [] }, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
    context
  );
  await billingPlanActions[1].listeners.click[0]();
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/checkout"));
  assert.strictEqual(vm.runInContext("accountState.data.billing.plan", context), "Pro+");
  assert.ok(elements["[data-billing-invoices]"].children[0].innerHTML.includes("invoice_checkout"));
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Billing checkout");
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Pro+"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Try Sir Bloggsalot Pro+"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("3 days free"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Then $99.00 per month"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Unlimited access: Publish AI blog posts to your site daily"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("invoice_checkout"));

  console.log("Billing checkout render checks passed.");

  startArticleCalls.length = 0;
  setLocation("/account?view=billing&checkoutPlan=Pro%2B&billingPeriod=annual");
  vm.runInContext(
    `authState.user = { email: "owner@example.com" };
accountState.loading = false;
accountState.data = null;
accountState.workspaces = [];`,
    context
  );
  await context.loadAccountData();
  const signupCheckoutCall = startArticleCalls.find((call) => call.url === "/api/account/billing/checkout" && JSON.parse(call.options.body).plan === "Pro+");
  assert.ok(signupCheckoutCall);
  assert.strictEqual(JSON.parse(signupCheckoutCall.options.body).billingPeriod, "annual");
  assert.strictEqual(vm.runInContext("accountState.data.billing.plan", context), "Pro+");
  assert.strictEqual(new URLSearchParams(location.search).has("checkoutPlan"), false);

  console.log("Signup selected-plan checkout checks passed.");

  startArticleCalls.length = 0;
  setLocation("/account?view=billing&checkoutPlan=Enterprise&billingPeriod=annual");
  vm.runInContext(
    `authState.user = { email: "owner@example.com" };
accountState.loading = false;
accountState.data = null;
accountState.workspaces = [];`,
    context
  );
  await context.loadAccountData();
  assert.strictEqual(startArticleCalls.some((call) => call.url === "/api/account/billing/checkout"), false);
  assert.strictEqual(new URLSearchParams(location.search).has("checkoutPlan"), false);
  assert.strictEqual(new URLSearchParams(location.search).has("billingPeriod"), false);

  console.log("Invalid signup checkout params checks passed.");

  startArticleCalls.length = 0;
  elements["[data-account-operation]"].textContent = "";
  setLocation("/account?view=billing&checkoutPlan=Pro&billingPeriod=annual");
  vm.runInContext(
    `authState.user = { email: "owner@example.com" };
accountState.loading = false;
accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro", billingPeriod: "monthly", invoices: [] }, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
accountState.selectedWorkspaceId = "owner";`,
    context
  );
  await context.applyCheckoutParams();
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/checkout" && JSON.parse(call.options.body).plan === "Pro"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Checkout unavailable.");
  assert.strictEqual(new URLSearchParams(location.search).has("checkoutPlan"), false);
  assert.strictEqual(new URLSearchParams(location.search).has("billingPeriod"), false);

  console.log("Failed checkout handoff cleanup checks passed.");

  startArticleCalls.length = 0;
  setLocation("/account?view=billing&checkoutPlan=Pro&billingPeriod=annual");
  vm.runInContext(
    `authState.user = { email: "member@example.com" };
accountState.loading = false;
accountState.data = { id: "member-workspace", ownerEmail: "owner@example.com", workspaceName: "Shared", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro", billingPeriod: "monthly" }, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.workspaces = [{ id: "member-workspace", role: "member", selected: true }];
accountState.selectedWorkspaceId = "member-workspace";`,
    context
  );
  await context.applyCheckoutParams();
  assert.strictEqual(startArticleCalls.some((call) => call.url === "/api/account/billing/checkout"), false);
  assert.strictEqual(new URLSearchParams(location.search).has("checkoutPlan"), false);
  assert.strictEqual(new URLSearchParams(location.search).has("billingPeriod"), false);

  console.log("Read-only signup checkout params checks passed.");

  startArticleCalls.length = 0;
  setLocation("/account?view=billing");
  vm.runInContext(
    `authState.user = { email: "owner@example.com" };
	accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "active", billingPeriod: "monthly", invoices: [] }, searchConsole: {}, rankings: {}, aiMentions: {}, setupChecklist: { completed: 0, total: 1, percent: 0, items: [{ label: "Choose billing period", detail: "Billing period is pending.", complete: false, action: { view: "billing" } }] }, supportTickets: [] };
	accountState.workspaces = [{ id: "owner", role: "owner", selected: true }];
	accountState.selectedWorkspaceId = "owner";
	renderBilling(accountState.data);
	renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  await billingPeriodActions[0].listeners.click[0]();
  const billingPeriodCall = startArticleCalls.find((call) => call.url === "/api/account/billing" && call.options.method === "PUT" && JSON.parse(call.options.body).billingPeriod === "annual");
  assert.ok(billingPeriodCall);
  assert.strictEqual(JSON.parse(billingPeriodCall.options.body).billingPeriod, "annual");
  assert.strictEqual(vm.runInContext("accountState.data.billing.billingPeriod", context), "annual");
  assert.strictEqual(billingPeriodActions[0].classList.contains("is-active"), true);
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Billing period saved locally.");
  console.log("Billing period toggle action checks passed.");

  const billingPortalAction = context.handleAccountAction("billing-portal");
  assert.strictEqual(elements["[data-billing-progress]"].hidden, false);
  assert.strictEqual(elements["[data-billing-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-billing-progress]"].textContent.includes("Opening billing portal"));
  await billingPortalAction;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/portal"));
  assert.strictEqual(elements["[data-billing-progress]"].hidden, true);
  assert.strictEqual(elements["[data-billing-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Billing portal");
  assert.ok(elements["[data-dialog-body]"].textContent.includes("/account?view=billing&portal=local"));
  assert.ok(elements["[data-billing-portal-status]"].textContent.includes("local-portal-opened"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Billing portal opened locally.");

  await context.handleAccountAction("cancel-billing");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Cancel plan");
  const billingCancelSubmit = vm.runInContext("accountState.dialogSubmit({})", context);
  assert.strictEqual(elements["[data-billing-progress]"].hidden, false);
  assert.strictEqual(elements["[data-billing-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-billing-progress]"].textContent.includes("Cancelling billing"));
  await billingCancelSubmit;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/cancel"));
  assert.strictEqual(elements["[data-billing-progress]"].hidden, true);
  assert.strictEqual(elements["[data-billing-progress]"].attributes["aria-busy"], "false");
  assert.ok(elements["[data-billing-summary]"].textContent.includes("cancelled locally"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Billing marked cancelled locally.");

  const billingReactivateAction = context.handleAccountAction("reactivate-billing");
  assert.strictEqual(elements["[data-billing-progress]"].hidden, false);
  assert.strictEqual(elements["[data-billing-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-billing-progress]"].textContent.includes("Reactivating billing"));
  await billingReactivateAction;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/reactivate"));
  assert.strictEqual(elements["[data-billing-progress]"].hidden, true);
  assert.strictEqual(elements["[data-billing-progress]"].attributes["aria-busy"], "false");
  assert.ok(elements["[data-billing-summary]"].textContent.includes("active for dashboard gating"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Billing reactivated locally.");
  console.log("Billing portal cancel reactivate checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "past_due", price: "$99/mo monthly", billingPeriod: "monthly", paymentMethod: "Visa ending 4242", portalStatus: "payment-failed", failedPayment: { reason: "Card declined", retryAt: "2026-08-12" }, invoices: [{ id: "invoice_failed", date: "2026-08-10", plan: "Pro+", amount: "$99/mo monthly", status: "failed", failureReason: "Card declined", hostedInvoiceUrl: "/account?view=billing&invoice=invoice_failed" }] }, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] }; renderBilling(accountState.data);`,
    context
  );
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-invoice-detail]") return { dataset: { invoiceDetail: "invoice_failed" } };
        return null;
      },
    },
  });
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/invoices/invoice_failed"));
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Invoice invoice_failed");
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Failure reason: Card declined"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Local invoice URL: /account?view=billing&invoice=invoice_failed"));
  console.log("Billing invoice detail checks passed.");

  startArticleCalls.length = 0;
  elements["[data-dialog-title]"].textContent = "";
  elements["[data-dialog-body]"].textContent = "";
  setLocation("/account?view=billing&invoice=invoice_failed");
  await vm.runInContext("applyInvoiceParam()", context);
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/invoices/invoice_failed"));
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Invoice invoice_failed");
  assert.strictEqual(new URLSearchParams(location.search).has("invoice"), false);
  assert.strictEqual(location.pathname, "/account");
  assert.strictEqual(location.search, "?view=billing");
  console.log("Billing invoice deep-link checks passed.");

  startArticleCalls.length = 0;
  elements["[data-account-operation]"].textContent = "";
  setLocation("/account?view=billing&invoice=missing_invoice");
  await vm.runInContext("applyInvoiceParam()", context);
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/invoices/missing_invoice"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invoice not found.");
  assert.strictEqual(new URLSearchParams(location.search).has("invoice"), false);
  assert.strictEqual(location.search, "?view=billing");
  console.log("Missing billing invoice deep-link cleanup checks passed.");

  startArticleCalls.length = 0;
  elements["[data-dialog-title]"].textContent = "";
  elements["[data-dialog-body]"].textContent = "";
  setLocation("/account?view=billing&invoice=invoice_failed");
  windowHandlers.popstate();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/billing/invoices/invoice_failed"));
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Invoice invoice_failed");
  assert.strictEqual(new URLSearchParams(location.search).has("invoice"), false);
  console.log("Billing invoice popstate deep-link checks passed.");

	  await context.handleAccountAction("export-search-console");
	  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/search-console/export"));
  assert.strictEqual(vm.runInContext("accountState.lastDownload.filename", context), "search-console-owner.csv");
  assert.ok(vm.runInContext("accountState.lastDownload.content", context).includes("alpha query"));

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { cms: { websiteUrl: "https://sirbloggsalot.com" } }, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "active" }, searchConsole: { status: "disconnected" }, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.searchView = "queries";
accountState.searchFilter = "";
accountState.searchRowLimit = 10;
accountState.rankingsRange = "30";
accountState.rankingsFilter = "all";
accountState.rankingsSearch = "";
accountState.mentionsRange = "30";
accountState.mentionsFilter = "all";
accountState.mentionsSource = "all";
accountState.mentionsModel = "all";
accountState.mentionsSearch = "";`,
    context
  );
  await context.handleAccountAction("connect-search-console");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Connect Search Console");
  const searchConnectSubmit = vm.runInContext('accountState.dialogSubmit({ propertyUrl: "https://sirbloggsalot.com" })', context);
  assert.strictEqual(elements["[data-search-progress]"].hidden, false);
  assert.strictEqual(elements["[data-search-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-search-progress]"].textContent.includes("Connecting Search Console"));
  await searchConnectSubmit;
  const searchConnectCall = startArticleCalls.find((call) => call.url === "/api/account/search-console/connect");
  assert.ok(searchConnectCall);
  assert.deepStrictEqual(JSON.parse(searchConnectCall.options.body), { propertyUrl: "https://sirbloggsalot.com" });
  assert.strictEqual(elements["[data-search-progress]"].hidden, true);
  assert.strictEqual(elements["[data-search-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-search-clicks]"].textContent, "120");
  assert.strictEqual(elements["[data-search-status]"].textContent, "Connected to: sirbloggsalot.com");
  assert.strictEqual(elements["[data-search-list-title]"].textContent, "Top Search Queries");
  assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("connected query"));
  assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("data-search-row-detail"));
  assert.ok(elements["[data-search-queries-list]"].children[0].innerHTML.includes("connected query"));
  assert.ok(elements["[data-search-pages-list]"].children[0].innerHTML.includes("/blog/connected"));
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-search-row-detail]") {
          return {
            dataset: {
              searchRowDetail: "query",
              searchRowLabel: "connected query",
              searchRowClicks: "20",
              searchRowImpressions: "400",
            },
          };
        }
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Search Console row detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("connected query"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("20"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("400"));
  vm.runInContext('accountState.searchView = "pages"; renderSearchConsole(accountState.data);', context);
  assert.strictEqual(elements["[data-search-list-title]"].textContent, "Top Performing Posts");
  assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("/blog/connected"));
  vm.runInContext('accountState.searchView = "queries"; renderSearchConsole(accountState.data);', context);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Search Console connected locally.");

  const searchSyncAction = context.handleAccountAction("sync-search-console");
  assert.strictEqual(elements["[data-search-progress]"].hidden, false);
  assert.strictEqual(elements["[data-search-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-search-progress]"].textContent.includes("Syncing tracking data"));
  await searchSyncAction;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/search-console/sync"));
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/rankings?range=30"));
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/ai-mentions?source=all&model=all&range=30"));
  assert.strictEqual(elements["[data-search-clicks]"].textContent, "180");
  assert.ok(elements["[data-rankings-list]"].children[0].innerHTML.includes("synced keyword"));
  assert.ok(elements["[data-mentions-list]"].children[0].innerHTML.includes("synced AI mention"));
  assert.strictEqual(elements["[data-search-progress]"].hidden, true);
  assert.strictEqual(elements["[data-search-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Tracking data synced locally.");
  console.log("Search Console connect and sync action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "active" }, searchConsole: {}, rankings: { gated: false, dateRange: "30", trend: [], keywords: [] }, aiMentions: { gated: false, dateRange: "30", trend: [], mentions: [] }, supportTickets: [] };
accountState.rankingsRange = "30";
accountState.rankingsFilter = "all";
accountState.rankingsSearch = "";
accountState.mentionsRange = "30";
accountState.mentionsFilter = "all";
accountState.mentionsSource = "all";
accountState.mentionsModel = "all";
accountState.mentionsSearch = "";
renderReports(accountState.data);`,
    context
  );
  assert.ok(elements["[data-report-summary]"].innerHTML.includes("0 rankings"));
  const rankingsRefreshAction = context.handleAccountAction("refresh-rankings");
  assert.strictEqual(elements["[data-rankings-progress]"].hidden, false);
  assert.strictEqual(elements["[data-rankings-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-rankings-progress]"].textContent.includes("Refreshing rankings"));
  await rankingsRefreshAction;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/rankings?range=30"));
  assert.ok(elements["[data-rankings-list]"].children[0].innerHTML.includes("synced keyword"));
  assert.strictEqual(elements["[data-rankings-progress]"].hidden, true);
  assert.strictEqual(elements["[data-rankings-progress]"].attributes["aria-busy"], "false");
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-ranking-detail]") return { dataset: { rankingDetail: "0" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Ranking detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("synced keyword"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("/blog/synced"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Position"));
  assert.ok(elements["[data-report-summary]"].innerHTML.includes("1 ranking"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Rankings refreshed.");

  elements["[data-rankings-range]"].value = "120";
  let rankingsRangeRejected = false;
  try {
    await elements["[data-rankings-range]"].listeners.change[0]();
  } catch (error) {
    rankingsRangeRejected = true;
  }
  assert.strictEqual(rankingsRangeRejected, false);
  assert.ok(elements["[data-account-operation]"].textContent.includes("Unexpected fetch /api/account/rankings?range=120"));
  assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);

  const mentionsRefreshAction = context.handleAccountAction("refresh-ai-mentions");
  assert.strictEqual(elements["[data-mentions-progress]"].hidden, false);
  assert.strictEqual(elements["[data-mentions-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-mentions-progress]"].textContent.includes("Refreshing AI Mentions"));
  await mentionsRefreshAction;
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/ai-mentions?source=all&model=all&range=30"));
  assert.ok(elements["[data-mentions-list]"].children[0].innerHTML.includes("synced AI mention"));
  assert.strictEqual(elements["[data-mentions-progress]"].hidden, true);
  assert.strictEqual(elements["[data-mentions-progress]"].attributes["aria-busy"], "false");
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-mention-detail]") return { dataset: { mentionDetail: "0" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "AI mention detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("ChatGPT"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("GPT-4o"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("synced AI mention"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("mentioned"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "AI Mentions refreshed.");
  console.log("Rankings and AI Mentions refresh action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: { status: "connected", propertyUrl: "https://sirbloggsalot.com", dateRange: "28", clicks: 120, impressions: 2400, indexedPages: 7, trend: [{ date: "2026-08-08", clicks: 10, impressions: 200 }], topQueries: [{ query: "alpha query", clicks: 20, impressions: 400 }], topPages: [{ page: "/blog/alpha", clicks: 12 }] }, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.searchView = "queries";
accountState.searchFilter = "";
accountState.searchRowLimit = 10;`,
    context
  );
  await context.handleAccountAction("disconnect-search-console");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Disconnect Search Console");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  const searchDisconnectCall = startArticleCalls.find((call) => call.url === "/api/account/search-console/disconnect");
  assert.ok(searchDisconnectCall);
  assert.ok(elements["[data-search-details]"].innerHTML.includes("Search Console is disconnected"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Search Console disconnected locally.");
  console.log("Search Console disconnect action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: { status: "connected", propertyUrl: "https://sirbloggsalot.com", dateRange: "28", lastSyncedAt: "2026-08-09T12:00:00.000Z", clicks: 120, impressions: 2400, indexedPages: 7, trend: [{ date: "2026-08-08", clicks: 10, impressions: 200 }, { date: "2026-08-09", clicks: 18, impressions: 340 }], topQueries: [{ query: "alpha query", clicks: 20, impressions: 400 }], topPages: [{ page: "/blog/alpha", clicks: 12 }] }, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.searchView = "queries";
accountState.searchFilter = "";
accountState.searchRowLimit = 10;`,
    context
  );
  elements["[data-search-range]"].value = "90";
  await elements["[data-search-range]"].listeners.change[0]();
  const searchRangeCall = startArticleCalls.find((call) => call.url === "/api/account/search-console?range=90");
  assert.ok(searchRangeCall);
  assert.strictEqual(elements["[data-search-clicks]"].textContent, "900");
  assert.strictEqual(elements["[data-search-impressions]"].textContent, "18,000");
  assert.strictEqual(elements["[data-search-indexed]"].textContent, "11");
  assert.strictEqual(elements["[data-search-range]"].value, "90");
  assert.ok(elements["[data-search-details]"].children[1].innerHTML.includes("ninety day query"));

	  await context.handleAccountAction("export-rankings");
	  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/rankings/export"));
  assert.strictEqual(vm.runInContext("accountState.lastDownload.filename", context), "rankings-owner.csv");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: { plan: "Pro+", status: "active" }, searchConsole: {}, rankings: {}, aiMentions: { gated: false, dateRange: "30", trend: [{ date: "2026-08-09", mentions: 1 }], sources: ["ChatGPT"], models: ["GPT-4o"], mentions: [{ source: "ChatGPT", model: "GPT-4o", prompt: "best alpha tools", status: "mentioned" }] }, supportTickets: [] };
accountState.mentionsFilter = "all";
accountState.mentionsSource = "all";
accountState.mentionsModel = "all";
accountState.mentionsSearch = "";`,
    context
  );
  vm.runInContext("renderAiMentions(accountState.data);", context);
  elements["[data-mentions-range]"].value = "90";
  await elements["[data-mentions-range]"].listeners.change[0]();
  const mentionsRangeCall = startArticleCalls.find((call) => call.url === "/api/account/ai-mentions?source=all&model=all&range=90");
  assert.ok(mentionsRangeCall);
  assert.strictEqual(elements["[data-mentions-range]"].value, "90");
  assert.ok(elements["[data-mentions-summary]"].innerHTML.includes("1 prompts"));
  assert.ok(elements["[data-mentions-list]"].children[0].innerHTML.includes("ninety day AI mention"));

	  await context.handleAccountAction("export-ai-mentions");
	  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/ai-mentions/export"));
  assert.strictEqual(vm.runInContext("accountState.lastDownload.filename", context), "ai-mentions-owner.csv");

	  await context.handleAccountAction("export-reports");
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/reports/export"));
  assert.strictEqual(vm.runInContext("accountState.lastDownload.filename", context), "reports-owner.csv");
  assert.ok(vm.runInContext("accountState.lastDownload.content", context).startsWith("template,section,label,value,detail,publicPath"));
  assert.ok(vm.runInContext("accountState.lastDownload.content", context).includes("/blog/canva-website-builder"));

  vm.runInContext(
    `accountState.data.reports = {
      rows: [{ section: "content", label: "Published article", value: "published", detail: "published keyword", publicPath: "/blog/published-article" }]
    };
    renderReports(accountState.data);`,
    context
  );
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-report-detail]") return { dataset: { reportDetail: "0" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Report row detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Published article"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("content"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("published keyword"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("/blog/published-article"));

  vm.runInContext("accountState.data.reports = accountState.data.reports || {}; accountState.data.reports.template = 'executive';", context);
  const reportShareAction = context.handleAccountAction("share-report");
  assert.strictEqual(elements["[data-report-progress]"].hidden, false);
  assert.strictEqual(elements["[data-report-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-report-progress]"].textContent.includes("Creating report share link"));
	  await reportShareAction;
  const reportShareCall = startArticleCalls.find((call) => call.url === "/api/account/reports/share");
	  assert.ok(reportShareCall);
  assert.deepStrictEqual(JSON.parse(reportShareCall.options.body), { template: "executive" });
  assert.strictEqual(elements["[data-report-progress]"].hidden, true);
  assert.strictEqual(elements["[data-report-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(vm.runInContext("accountState.lastShareUrl", context), "/reports/report_local");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-report-share-link"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('href="/reports/report_local"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-report-share-copy"));
  const reportShareCopyTarget = {
    closest(selector) {
      if (selector === "[data-report-share-copy]") {
        return { dataset: { reportShareCopy: "/reports/report_local" } };
      }
      return null;
    },
  };
  await context.handleDynamicAccountClick({ target: reportShareCopyTarget });
  assert.deepStrictEqual(clipboardWrites, ["/reports/report_local"]);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Reports share link copied.");

  const reportClipboardCountBeforeBadCopy = clipboardWrites.length;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-report-share-copy]") {
          return { dataset: { reportShareCopy: "https://external.example.com/report" } };
        }
        return null;
      },
    },
  });
  assert.strictEqual(clipboardWrites.length, reportClipboardCountBeforeBadCopy);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Reports share link is unavailable.");

  const savedClipboard = context.navigator.clipboard;
  context.navigator.clipboard = null;
  const reportClipboardCountBeforeMissingApi = clipboardWrites.length;
  await context.handleDynamicAccountClick({ target: reportShareCopyTarget });
  assert.strictEqual(clipboardWrites.length, reportClipboardCountBeforeMissingApi);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Reports share link could not be copied.");
  context.navigator.clipboard = savedClipboard;

  vm.runInContext('showReportShareDialog("https://external.example.com/report")', context);
  assert.strictEqual(vm.runInContext("accountState.lastShareUrl", context), "");
  assert.ok(!elements["[data-dialog-body]"].innerHTML.includes('href="https://external.example.com/report"'));
  assert.ok(!elements["[data-dialog-body]"].innerHTML.includes("data-report-share-copy"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("No local report link created."));

  elements["[data-dialog-title]"].textContent = "";
  elements["[data-dialog-body]"].innerHTML = "";
  setLocation("/invite/invite-token?workspace=client");
  vm.runInContext(
    `authState.user = null;
accountState.data = null;`,
    context
  );
  await context.handleAccountAction("accept-invite");
  assert.strictEqual(location.pathname, "/login");
  assert.strictEqual(location.search, "?next=%2Finvite%2Finvite-token%3Fworkspace%3Dclient");

  setLocation("/invite/invite-token?workspace=client");
  await context.loadInvite();
  assert.strictEqual(elements["[data-invite-login]"].href, "/login?next=%2Finvite%2Finvite-token%3Fworkspace%3Dclient");
  assert.notStrictEqual(elements['[data-account-action="accept-invite"]'].disabled, true);

  setLocation("/invite/invite-token");
  vm.runInContext(
    `authState.user = { email: "editor@example.com", name: "Editor User" };
accountState.data = null;`,
    context
  );
  await context.handleAccountAction("accept-invite");
  assert.ok(startArticleCalls.find((call) => call.url === "/api/invite/invite-token/accept" && call.options.method === "POST"));
  assert.strictEqual(elements["[data-invite-message]"].textContent, "Joined Client Workspace");
  assert.ok(elements["[data-invite-detail]"].textContent.includes("Accepted as editor@example.com (member)."));
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Invite accepted");

  setLocation("/invite");
  vm.runInContext(
    `authState.user = { email: "editor@example.com", name: "Editor User" };
accountState.data = null;`,
    context
  );
  const fetchCountBeforeMissingInviteToken = startArticleCalls.length;
  await context.handleAccountAction("accept-invite");
  assert.strictEqual(startArticleCalls.length, fetchCountBeforeMissingInviteToken);
  assert.strictEqual(elements["[data-invite-message]"].textContent, "Invite link is missing.");
  assert.strictEqual(elements["[data-invite-detail]"].textContent, "Ask the workspace owner to generate a new invitation link.");
  assert.strictEqual(elements['[data-account-action="accept-invite"]'].disabled, true);

  elements["[data-dialog-title]"].textContent = "";
  elements["[data-dialog-body]"].innerHTML = "";
  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], activityLog: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
    context
  );
  elements["[data-invite-email]"].value = "new@example.com";
  elements["[data-invite-role]"].value = "editor";
  await context.handleAccountAction("generate-invite");
  const inviteCall = startArticleCalls.find((call) => call.url === "/api/account/invites");
  assert.ok(inviteCall);
  assert.deepStrictEqual(JSON.parse(inviteCall.options.body), { email: "new@example.com", role: "editor" });
  assert.strictEqual(elements["[data-invite-email]"].value, "");
  assert.strictEqual(elements["[data-invite-role]"].value, "member");
  assert.strictEqual(vm.runInContext("accountState.lastInviteUrl", context), "https://sirbloggsalot.com/invite/generated-token");
  assert.ok(elements["[data-invites-list]"].children[0].innerHTML.includes("new@example.com"));
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Invite link");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-invite-link"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("https://sirbloggsalot.com/invite/generated-token"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-invite-link-copy"));
  const inviteLinkCopyTarget = {
    closest(selector) {
      if (selector === "[data-invite-link-copy]") {
        return { dataset: { inviteLinkCopy: "https://sirbloggsalot.com/invite/generated-token" } };
      }
      return null;
    },
  };
  await context.handleDynamicAccountClick({ target: inviteLinkCopyTarget });
  assert.deepStrictEqual(clipboardWrites, ["/reports/report_local", "https://sirbloggsalot.com/invite/generated-token"]);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invite link copied.");

  context.navigator.clipboard = null;
  const inviteClipboardCountBeforeMissingApi = clipboardWrites.length;
  await context.handleDynamicAccountClick({ target: inviteLinkCopyTarget });
  assert.strictEqual(clipboardWrites.length, inviteClipboardCountBeforeMissingApi);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invite link could not be copied.");
  context.navigator.clipboard = savedClipboard;

  const inviteClipboardCountBeforeBadDialogCopy = clipboardWrites.length;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-invite-link-copy]") {
          return { dataset: { inviteLinkCopy: "https://external.example.com/invite/generated-token" } };
        }
        return null;
      },
    },
  });
  assert.strictEqual(clipboardWrites.length, inviteClipboardCountBeforeBadDialogCopy);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invite link is unavailable.");

  vm.runInContext('showInviteLinkDialog({ email: "bad@example.com", link: "https://external.example.com/invite/generated-token" })', context);
  assert.strictEqual(vm.runInContext("accountState.lastInviteUrl", context), "");
  assert.ok(!elements["[data-dialog-body]"].innerHTML.includes('href="https://external.example.com/invite/generated-token"'));
  assert.ok(!elements["[data-dialog-body]"].innerHTML.includes("data-invite-link-copy"));
  assert.ok(elements["[data-dialog-body]"].textContent.includes("Invite link is unavailable."));

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [{ id: "member-1", email: "editor@example.com", name: "Editor User", role: "editor", status: "active" }], invites: [{ id: "invite-1", email: "pending@example.com", role: "member", status: "pending", link: "https://sirbloggsalot.com/invite/invite-1" }], activityLog: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
    context
  );
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-invite-detail]") return { dataset: { inviteDetail: "invite-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Invite detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("pending@example.com"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("member"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("pending"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("https://sirbloggsalot.com/invite/invite-1"));

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-invite-copy]") return { dataset: { inviteCopy: "invite-1" } };
        return null;
      },
    },
  });
  assert.deepStrictEqual(clipboardWrites, ["/reports/report_local", "https://sirbloggsalot.com/invite/generated-token", "https://sirbloggsalot.com/invite/invite-1"]);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invite link copied.");

  context.navigator.clipboard = null;
  const inviteRowClipboardCountBeforeMissingApi = clipboardWrites.length;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-invite-copy]") return { dataset: { inviteCopy: "invite-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(clipboardWrites.length, inviteRowClipboardCountBeforeMissingApi);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invite link could not be copied.");
  context.navigator.clipboard = savedClipboard;

  vm.runInContext(
    `accountState.data.invites = [{ id: "bad-invite", email: "bad@example.com", role: "member", status: "pending", link: "https://external.example.com/invite/bad-invite" }];`,
    context
  );
  const clipboardWritesBeforeBadInvite = clipboardWrites.length;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-invite-copy]") return { dataset: { inviteCopy: "bad-invite" } };
        return null;
      },
    },
  });
  assert.strictEqual(clipboardWrites.length, clipboardWritesBeforeBadInvite);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invite link is unavailable.");

  vm.runInContext(
    `accountState.data.setupChecklist = {
      completed: 0,
      total: 1,
      percent: 0,
      items: [{ label: "Invite teammate", detail: "Invite follow-up is pending.", complete: false, action: { view: "settings", tab: "invite" } }]
    };
    renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-invite-delete]") return { dataset: { inviteDelete: "invite-1" } };
        return null;
      },
    },
  });
  const inviteDeleteCall = startArticleCalls.find((call) => call.url === "/api/account/invites/invite-1" && call.options.method === "DELETE");
  assert.ok(inviteDeleteCall);
  assert.strictEqual(elements["[data-invites-list]"].children.length, 0);
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Invite revoked.");

  vm.runInContext(
    `accountState.data.members = [{ id: "member-1", email: "editor@example.com", name: "Editor User", role: "editor", status: "active", roleUpdatedBy: "owner@example.com", roleUpdatedAt: "2026-08-10T12:00:00.000Z" }]; renderMembers(accountState.data);`,
    context
  );
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-member-detail]") return { dataset: { memberDetail: "member-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Member detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Editor User"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("editor@example.com"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("editor"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Role updated by"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("owner@example.com"));

  vm.runInContext(
    `accountState.data.activityLog = [{ id: "activity-2", type: "member_role_updated", label: "Role changed to admin", targetEmail: "editor@example.com", actorEmail: "owner@example.com", role: "admin", createdAt: "2026-08-10T12:00:00.000Z" }]; renderTeamActivity(accountState.data);`,
    context
  );
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-team-activity-detail]") return { dataset: { teamActivityDetail: "activity-2" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Team activity detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Role changed to admin"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("member_role_updated"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("editor@example.com"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("owner@example.com"));

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-member-role]") return { dataset: { memberRole: "member-1", memberNextRole: "admin" } };
        return null;
      },
    },
  });
  const memberRoleCall = startArticleCalls.find((call) => call.url === "/api/account/members/member-1" && call.options.method === "PUT");
  assert.ok(memberRoleCall);
  assert.deepStrictEqual(JSON.parse(memberRoleCall.options.body), { role: "admin" });
  assert.ok(elements["[data-members-list]"].children[0].innerHTML.includes("admin"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Member role updated to admin.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-member-delete]") return { dataset: { memberDelete: "member-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Remove member");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  const memberDeleteCall = startArticleCalls.find((call) => call.url === "/api/account/members/member-1" && call.options.method === "DELETE");
  assert.ok(memberDeleteCall);
  assert.strictEqual(elements["[data-members-list]"].children.length, 0);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Member removed.");
  console.log("Invite and member row action checks passed.");

  elements["[data-dialog-title]"].textContent = "";
  setLocation("/account?view=plan");
  const supportLoadCallsBeforeHelpBubble = startArticleCalls.filter((call) => call.url === "/api/account/summary").length;
  vm.runInContext(
    `authState.user = { email: "owner@example.com" };
accountState.data = null;
accountState.loading = false;
accountState.workspaces = [];
accountState.selectedWorkspaceId = "";`,
    context
  );
  summarySupportTickets = [
    { id: "ticket-open", subject: "Open setup help", status: "open" },
    { id: "ticket-resolved", subject: "Resolved billing help", status: "resolved" },
  ];
  await context.handleAccountAction("help-chat");
  summarySupportTickets = [];
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/summary").length, supportLoadCallsBeforeHelpBubble + 1);
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Support options");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-support-panel-create"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Live chat is not connected yet"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("1 open"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("2 total"));
  assert.strictEqual(vm.runInContext("Boolean(accountState.data)", context), true);
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-support-panel-create]") return { dataset: { supportPanelCreate: "true" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Create support ticket");

  console.log("Help bubble account-load checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
    context
  );
  await context.handleAccountAction("create-support-ticket");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Create support ticket");
  const supportMessageField = elements["[data-dialog-form]"].children[4].children[0];
  assert.strictEqual(supportMessageField.name, "message");
  assert.strictEqual(supportMessageField.required, true);
  await vm.runInContext('accountState.dialogSubmit({ subject: "Publishing setup help", category: "Publishing", priority: "high", pageContext: "/account?view=settings&tab=cms", message: "Draft did not publish." })', context);
  const supportCreateCall = startArticleCalls.find((call) => call.url === "/api/account/support");
  assert.ok(supportCreateCall);
  assert.deepStrictEqual(JSON.parse(supportCreateCall.options.body), {
    subject: "Publishing setup help",
    category: "Publishing",
    priority: "high",
    pageContext: "/account?view=settings&tab=cms",
    message: "Draft did not publish.",
  });
  assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("Publishing setup help"));
  assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("Draft did not publish."));
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "help");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Support ticket created.");
  console.log("Support ticket create action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, setupChecklist: { completed: 0, total: 1, percent: 0, items: [{ label: "Create support ticket", detail: "Support follow-up is missing.", complete: false, action: { view: "help" } }] }, supportTickets: [{ id: "ticket-1", subject: "Publishing help", category: "Publishing", priority: "high", pageContext: "/account?view=settings&tab=cms", requesterEmail: "owner@example.com", message: "Draft did not publish.", status: "open", replies: [{ message: "Draft did not publish.", authorEmail: "owner@example.com", createdAt: "2026-08-09T12:00:00.000Z" }] }] };
renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-support-detail]") return { dataset: { supportDetail: "ticket-1" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Support ticket detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Publishing help"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Publishing"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("high"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("/account?view=settings&amp;tab=cms") || elements["[data-dialog-body]"].innerHTML.includes("/account?view=settings&tab=cms"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Draft did not publish."));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("owner@example.com"));

  const supportStatusTarget = {
    closest(selector) {
      if (selector === "[data-support-status]") {
        return { dataset: { supportStatus: "ticket-1", supportNextStatus: "resolved" } };
      }
      return null;
    },
  };
  await context.handleDynamicAccountClick({ target: supportStatusTarget });
  const supportResolveCall = startArticleCalls.find((call) => call.url === "/api/account/support/ticket-1" && JSON.parse(call.options.body).status === "resolved");
  assert.ok(supportResolveCall);
  assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("resolved"));
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Support ticket resolved.");

  const supportReplyTarget = {
    closest(selector) {
      if (selector === "[data-support-reply]") {
        return { dataset: { supportReply: "ticket-1" } };
      }
      return null;
    },
  };
  await context.handleDynamicAccountClick({ target: supportReplyTarget });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Reply to support ticket");
  await vm.runInContext('accountState.dialogSubmit({ reply: "Added more context from the CMS screen." })', context);
  const supportReplyCall = startArticleCalls.find((call) => call.url === "/api/account/support/ticket-1" && JSON.parse(call.options.body).reply === "Added more context from the CMS screen.");
  assert.ok(supportReplyCall);
  assert.ok(elements["[data-support-list]"].children[0].innerHTML.includes("Added more context from the CMS screen."));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Support reply saved locally.");

vm.runInContext(
  `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, reports: { schedule: { enabled: false, cadence: "weekly", recipients: [] } }, supportTickets: [] };`,
  context
);
  const reportScheduleCallsBeforeSubmit = startArticleCalls.filter((call) => call.url === "/api/account/reports/schedule").length;
	  await context.handleAccountAction("schedule-report");
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/reports/schedule").length, reportScheduleCallsBeforeSubmit);
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Schedule report");
  const reportScheduleSubmit = vm.runInContext('accountState.dialogSubmit({ cadence: "monthly", template: "executive", recipients: "owner@example.com, team@example.com" })', context);
  assert.strictEqual(elements["[data-report-progress]"].hidden, false);
  assert.strictEqual(elements["[data-report-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-report-progress]"].textContent.includes("Saving report schedule"));
  await reportScheduleSubmit;
  const reportScheduleCall = startArticleCalls.find((call) => call.url === "/api/account/reports/schedule");
	  assert.ok(reportScheduleCall);
  assert.deepStrictEqual(JSON.parse(reportScheduleCall.options.body), { cadence: "monthly", template: "executive", recipients: ["owner@example.com", "team@example.com"] });
  assert.strictEqual(elements["[data-report-progress]"].hidden, true);
  assert.strictEqual(elements["[data-report-progress]"].attributes["aria-busy"], "false");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Monthly report schedule saved locally.");

	  await context.handleAccountAction("export-seo-analysis");
	  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/seo-analysis/export"));
  assert.strictEqual(vm.runInContext("accountState.lastDownload.filename", context), "seo-analysis-owner.csv");
  assert.ok(vm.runInContext("accountState.lastDownload.content", context).startsWith("type,label,status,detail,passed,total,publicPath"));
  assert.ok(vm.runInContext("accountState.lastDownload.content", context).includes("/blog/weak"));

	  await context.handleAccountAction("export-keywords");
	  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/topics/export"));
  assert.strictEqual(vm.runInContext("accountState.lastDownload.filename", context), "keywords-owner.csv");
  assert.ok(vm.runInContext("accountState.lastDownload.content", context).includes("alpha service"));

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [{ id: "topic_alpha", title: "Alpha keyword", keyword: "alpha service", volume: 1400, cpc: 2.5, difficultyScore: 55, difficulty: "Hard", competition: 0.72, added: false }, { id: "topic_beta", title: "Beta keyword", keyword: "beta service", volume: 300, cpc: 1.1, difficultyScore: 24, difficulty: "Easy", competition: 0.42, added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.topicFilters = { query: "searched", difficultyMin: "10", difficultyMax: "", cpcMin: "", cpcMax: "", volumeMin: "", volumeMax: "", competitionMin: "", competitionMax: "" };
accountState.topicSort = { field: "volume", direction: "desc" };`,
    context
  );
  const keywordSearchAction = context.handleAccountAction("search-keywords");
  assert.strictEqual(elements["[data-keyword-progress]"].hidden, false);
  assert.strictEqual(elements["[data-keyword-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-keyword-progress]"].textContent.includes("Searching keywords"));
  await keywordSearchAction;
  assert.strictEqual(elements["[data-keyword-progress]"].hidden, true);
  assert.strictEqual(elements["[data-keyword-progress]"].attributes["aria-busy"], "false");
  const topicSearchCall = startArticleCalls.find((call) => call.url === "/api/account/topics/search");
  assert.ok(topicSearchCall);
  assert.deepStrictEqual(JSON.parse(topicSearchCall.options.body), {
    query: "searched",
    filters: {
      difficultyMin: "10",
      difficultyMax: "",
      cpcMin: "",
      cpcMax: "",
      volumeMin: "",
      volumeMax: "",
      competitionMin: "",
      competitionMax: "",
    },
  });
  assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("searched keyword"));
  assert.strictEqual(vm.runInContext("accountState.data.topics.length", context), 2);
  assert.strictEqual(vm.runInContext('accountState.data.topics.some((topic) => topic.id === "topic_alpha")', context), true);
	  assert.strictEqual(elements["[data-account-operation]"].textContent, "Keyword search returned 1 result.");
  startArticleCalls.length = 0;
  elements["[data-topic-search-input]"].value = "entered search";
  let keywordSearchDefaultPrevented = false;
  await elements["[data-topic-search-input]"].listeners.keydown[0]({
    key: "Enter",
    preventDefault() {
      keywordSearchDefaultPrevented = true;
    },
  });
  const enterTopicSearchCall = startArticleCalls.find((call) => call.url === "/api/account/topics/search");
  assert.ok(enterTopicSearchCall);
  assert.strictEqual(keywordSearchDefaultPrevented, true);
  assert.strictEqual(JSON.parse(enterTopicSearchCall.options.body).query, "entered search");
  elements["[data-topic-search-input]"].value = "";
  elements["[data-topic-search-input]"].listeners.input[0]();
  assert.strictEqual(vm.runInContext("accountState.topicSearchResults", context), null);
  assert.strictEqual(elements["[data-topic-list]"].children.length, 2);
  assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("alpha service"));

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [{ id: "topic_alpha", title: "Alpha keyword", keyword: "alpha service", volume: 1400, cpc: 2.5, difficultyScore: 55, difficulty: "Hard", competition: 0.72, added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.topicSearchResults = [{ id: "topic_search_result", title: "Search result title", keyword: "searched keyword", volume: 2400, cpc: 3.2, difficultyScore: 21, difficulty: "Easy", competition: 0.35, added: false }];
accountState.selectedTopicIds = new Set(["topic_search_result"]);`,
    context
  );
  const saveKeywordCallsBeforeSearchResult = startArticleCalls.filter((call) => call.url === "/api/account/topics/save-keywords").length;
  await context.handleAccountAction("save-keywords");
  const searchResultSaveCall = startArticleCalls.filter((call) => call.url === "/api/account/topics/save-keywords")[saveKeywordCallsBeforeSearchResult];
  assert.ok(searchResultSaveCall);
  assert.deepStrictEqual(JSON.parse(searchResultSaveCall.options.body), {
    topicIds: ["topic_search_result"],
    keywords: ["searched keyword"],
  });

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [{ id: "topic_alpha", title: "Alpha keyword", keyword: "alpha service", volume: 1400, cpc: 2.5, difficultyScore: 55, difficulty: "Hard", competition: 0.72, added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.topicSearchResults = [{ id: "topic_search_result", title: "Search result title", keyword: "searched keyword", volume: 2400, cpc: 3.2, difficultyScore: 21, difficulty: "Easy", competition: 0.35, added: false }];
accountState.selectedTopicIds = new Set();`,
    context
  );
  await context.handleAccountAction("magic-select-keywords");
  assert.strictEqual(vm.runInContext("JSON.stringify(Array.from(accountState.selectedTopicIds))", context), '["topic_search_result"]');
  assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes('data-topic-select="topic_search_result" checked'));

  const transientTopicCreateCallsBeforeAdd = startArticleCalls.filter((call) => call.url === "/api/account/topics").length;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-add]") return { dataset: { topicAdd: "topic_search_result" } };
        return null;
      },
    },
  });
  const transientTopicCreateCall = startArticleCalls.filter((call) => call.url === "/api/account/topics")[transientTopicCreateCallsBeforeAdd];
  assert.ok(transientTopicCreateCall);
  assert.strictEqual(JSON.parse(transientTopicCreateCall.options.body).keyword, "searched keyword");
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/topics/topic-created/add"));
  assert.strictEqual(vm.runInContext('accountState.data.contentPlan.items.some((item) => item.topicId === "topic-created")', context), true);

  settingsFieldInputs.find((input) => input.dataset.settingsField === "site.keywordDraft").value = "";
  elements["[data-account-operation]"].textContent = "";
  elements["[data-account-operation]"].classList.remove("is-error");
  const settingsCallsBeforeEmptyKeywordAdd = startArticleCalls.filter((call) => call.url === "/api/account/settings").length;
  await context.handleAccountAction("add-keywords");
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/settings").length, settingsCallsBeforeEmptyKeywordAdd);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Add at least one keyword first.");
  assert.strictEqual(elements["[data-account-operation]"].classList.contains("is-error"), true);

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: ["existing keyword"], keywordDraft: "", productDescription: "" }, cta: { enabled: true, label: "Book now", text: "Book a call", url: "https://sirbloggsalot.com/#pricing", placement: "inline", style: "banner", openInNewTab: true, trackingLabel: "pricing_cta" } }, topics: [], products: [{ id: "product-1", name: "SEO Plan" }], locations: [{ id: "location-1", city: "Dana Point", state: "CA" }], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, setupChecklist: { completed: 0, total: 1, percent: 0, items: [{ label: "Add keywords", detail: "Keyword list is incomplete.", complete: false, action: { view: "settings", tab: "site" } }] }, supportTickets: [] };
renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  settingsFieldInputs.find((input) => input.dataset.settingsField === "site.keywordDraft").value = "new keyword, existing keyword";
  elements["[data-account-operation]"].classList.remove("is-error");
  completeSetupOnNextSettingsSave = true;
  await context.handleAccountAction("add-keywords");
  const keywordSettingsCall = startArticleCalls.find((call) => call.url === "/api/account/settings" && JSON.parse(call.options.body).site?.keywords?.includes("new keyword"));
  assert.ok(keywordSettingsCall);
  assert.deepStrictEqual(vm.runInContext("accountState.data.settings.site.keywords", context), ["existing keyword", "new keyword"]);
  assert.strictEqual(settingsFieldInputs.find((input) => input.dataset.settingsField === "site.keywordDraft").value, "");
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Keywords added and saved.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-keyword-remove]") return { dataset: { keywordRemove: "new keyword" } };
        return null;
      },
    },
  });
  const keywordRemoveCall = startArticleCalls.find((call) => call.url === "/api/account/settings" && JSON.parse(call.options.body).site?.keywords?.length === 1);
  assert.ok(keywordRemoveCall);
  assert.strictEqual(JSON.stringify(JSON.parse(keywordRemoveCall.options.body).site.keywords), '["existing keyword"]');
  assert.strictEqual(vm.runInContext("JSON.stringify(accountState.data.settings.site.keywords)", context), '["existing keyword"]');
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Keyword removed.");

  const generateDescriptionAction = context.handleAccountAction("generate-description");
  assert.strictEqual(elements["[data-description-progress]"].hidden, false);
  assert.strictEqual(elements["[data-description-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-description-progress]"].textContent.includes("Generating product description"));
  await generateDescriptionAction;
  assert.strictEqual(elements["[data-description-progress]"].hidden, true);
  assert.strictEqual(elements["[data-description-progress]"].attributes["aria-busy"], "false");
  const generateDescriptionCall = startArticleCalls.find((call) => call.url === "/api/account/settings/generate-description");
  assert.ok(generateDescriptionCall);
  assert.ok(vm.runInContext("accountState.data.settings.site.productDescription", context).includes("Generated local product description"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Generated and saved a starter description.");

  await context.handleAccountAction("reset-cta");
  const resetCtaCall = startArticleCalls.find((call) => call.url === "/api/account/settings" && JSON.parse(call.options.body).cta?.enabled === false);
  assert.ok(resetCtaCall);
  assert.strictEqual(vm.runInContext("accountState.data.settings.cta.enabled", context), false);
  assert.ok(elements["[data-cta-preview]"].children[0].innerHTML.includes("CTA disabled"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "CTA reset.");
  console.log("Site Settings utility action checks passed.");

	  await context.handleAccountAction("save-keywords");
	  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/topics/save-keywords"));

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.topicSearchResults = null;
accountState.selectedTopicIds = new Set();`,
    context
  );
  await context.handleAccountAction("find-topics");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Add topic");
  const addTopicFieldNames = elements["[data-dialog-form]"].children
    .map((child) => child.children?.[0]?.name)
    .filter(Boolean);
  assert.ok(addTopicFieldNames.includes("cpc"));
  assert.ok(addTopicFieldNames.includes("difficultyScore"));
  assert.ok(addTopicFieldNames.includes("competition"));
  await vm.runInContext('accountState.dialogSubmit({ title: "Local SEO topic", keyword: "local seo", volume: "900", cpc: "2.75", difficultyScore: "31", difficulty: "Easy to rank", competition: "0.42" })', context);
  const topicCreateCall = startArticleCalls.find((call) => call.url === "/api/account/topics" && JSON.parse(call.options.body).title === "Local SEO topic");
  assert.ok(topicCreateCall);
  assert.strictEqual(JSON.parse(topicCreateCall.options.body).cpc, "2.75");
  assert.strictEqual(JSON.parse(topicCreateCall.options.body).difficultyScore, "31");
  assert.strictEqual(JSON.parse(topicCreateCall.options.body).competition, "0.42");
  assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("local seo"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Topic saved.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-edit]") return { dataset: { topicEdit: "topic-created" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit topic");
  const editTopicFieldNames = elements["[data-dialog-form]"].children
    .map((child) => child.children?.[0]?.name)
    .filter(Boolean);
  assert.ok(editTopicFieldNames.includes("cpc"));
  assert.ok(editTopicFieldNames.includes("difficultyScore"));
  assert.ok(editTopicFieldNames.includes("competition"));
  await vm.runInContext('accountState.dialogSubmit({ title: "Updated SEO topic", keyword: "updated seo", volume: "1200", cpc: "3.15", difficultyScore: "47", difficulty: "Medium", competition: "0.58", added: "not-added" })', context);
  const topicUpdateCall = startArticleCalls.find((call) => call.url === "/api/account/topics/topic-created" && call.options.method === "PUT");
  assert.ok(topicUpdateCall);
	  assert.strictEqual(JSON.parse(topicUpdateCall.options.body).keyword, "updated seo");
  assert.strictEqual(JSON.parse(topicUpdateCall.options.body).cpc, "3.15");
  assert.strictEqual(JSON.parse(topicUpdateCall.options.body).difficultyScore, "47");
  assert.strictEqual(JSON.parse(topicUpdateCall.options.body).competition, "0.58");
	  assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("updated seo"));
	  assert.strictEqual(elements["[data-account-operation]"].textContent, "Topic updated.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-detail]") return { dataset: { topicDetail: "topic-created" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Keyword detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Updated SEO topic"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("updated seo"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Search volume"));
  let topicDetailActions = elements["[data-dialog-form]"].children[elements["[data-dialog-form]"].children.length - 1];
  const detailAddButton = topicDetailActions.children.find((button) => button.textContent === "Add to plan");
  assert.ok(detailAddButton);
  const detailAddCallsBefore = startArticleCalls.filter((call) => call.url === "/api/account/topics/topic-created/add").length;
  await detailAddButton.listeners.click[0]();
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/topics/topic-created/add").length, detailAddCallsBefore + 1);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Topic added to the content plan.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [{ id: "topic-created", title: "Updated SEO topic", keyword: "updated seo", volume: 1200, difficulty: "Medium", added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
    context
  );

	  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-add]") return { dataset: { topicAdd: "topic-created" } };
        return null;
      },
    },
  });
  const topicAddCall = startArticleCalls.find((call) => call.url === "/api/account/topics/topic-created/add");
  assert.ok(topicAddCall);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Topic added to the content plan.");
  assert.strictEqual(vm.runInContext('accountState.data.contentPlan.items.some((item) => item.topicId === "topic-created")', context), true);

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [{ id: "topic-created", title: "Updated SEO topic", keyword: "updated seo", volume: 1200, difficulty: "Medium", added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.topicSearchResults = [{ id: "topic_search_result", title: "Search result title", keyword: "searched keyword", volume: 2400, cpc: 3.2, difficultyScore: 21, difficulty: "Easy", competition: 0.35, added: false }];
accountState.selectedTopicIds = new Set(["topic_search_result"]);`,
    context
  );
  const persistedTopicDeletesBeforeTransientDelete = startArticleCalls.filter((call) => call.url === "/api/account/topics/topic_search_result" && call.options.method === "DELETE").length;
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-delete]") return { dataset: { topicDelete: "topic_search_result" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Delete topic");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/topics/topic_search_result" && call.options.method === "DELETE").length, persistedTopicDeletesBeforeTransientDelete);
  assert.strictEqual(vm.runInContext("accountState.topicSearchResults.length", context), 0);
  assert.strictEqual(vm.runInContext('accountState.selectedTopicIds.has("topic_search_result")', context), false);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Search result removed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [{ id: "topic-created", title: "Updated SEO topic", keyword: "updated seo", volume: 1200, difficulty: "Medium", added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.topicSearchResults = [{ id: "topic_search_result", title: "Search result title", keyword: "searched keyword", volume: 2400, cpc: 3.2, difficultyScore: 21, difficulty: "Easy", competition: 0.35, added: false }];
accountState.selectedTopicIds = new Set();`,
    context
  );
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-edit]") return { dataset: { topicEdit: "topic_search_result" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit topic");
  await vm.runInContext('accountState.dialogSubmit({ title: "Edited search result", keyword: "edited searched keyword", volume: "1800", difficulty: "Medium", added: "not-added" })', context);
  assert.strictEqual(vm.runInContext("accountState.topicSearchResults[0].keyword", context), "edited searched keyword");
  assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("edited searched keyword"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Search result updated.");

  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-delete]") return { dataset: { topicDelete: "topic-created" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Delete topic");
  vm.runInContext(
    `accountState.data.setupChecklist = {
      completed: 1,
      total: 1,
      percent: 100,
      items: [{ label: "Add keywords", detail: "One keyword idea exists.", complete: true, action: { view: "topics" } }]
    };
    renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  const topicDeleteCall = startArticleCalls.find((call) => call.url === "/api/account/topics/topic-created" && call.options.method === "DELETE");
  assert.ok(topicDeleteCall);
  assert.ok(elements["[data-topic-list]"].innerHTML.includes("No topic ideas yet"));
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Topic deleted.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: { activeView: "plan" }, contentPlan: { items: [] }, settings: { site: { keywords: [] } }, topics: [], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.topicSearchResults = null;
accountState.selectedTopicIds = new Set();`,
    context
  );
  await context.handleAccountAction("add-topic-to-plan");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Add topic to plan");
  await vm.runInContext('accountState.dialogSubmit({ title: "Scheduled topic", keyword: "scheduled seo", volume: "800", difficulty: "Easy to rank" })', context);
  const scheduledTopicCreateCall = startArticleCalls.find((call) => call.url === "/api/account/topics" && JSON.parse(call.options.body).title === "Scheduled topic");
  assert.ok(scheduledTopicCreateCall);
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/topics/topic-scheduled/add"));
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "plan");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Topic created and scheduled.");
  console.log("Topic create edit add delete action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "selected-one", title: "Selected one", status: "scheduled" }] }, settings: { site: { keywords: ["fallback keyword"] } }, topics: [{ id: "bulk-topic-1", title: "Bulk topic one", keyword: "bulk keyword one", volume: 1000, difficulty: "Easy", added: false }, { id: "bulk-topic-2", title: "Bulk topic two", keyword: "bulk keyword two", volume: 800, difficulty: "Medium", added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.selectedBlogIds = new Set(["selected-one"]);`,
    context
  );
  await context.handleBlogAction("bulk-clear");
  assert.strictEqual(vm.runInContext("accountState.selectedBlogIds.size", context), 0);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article selection cleared.");

  await context.handleAccountAction("bulk-schedule");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Bulk schedule articles");
  await vm.runInContext('accountState.dialogSubmit({ count: "2", startDate: "2026-08-25", frequencyDays: "3", status: "scheduled" })', context);
  const bulkScheduleCall = startArticleCalls.find((call) => call.url === "/api/account/content-plan/bulk-schedule");
  assert.ok(bulkScheduleCall);
  assert.deepStrictEqual(JSON.parse(bulkScheduleCall.options.body), {
    count: "2",
    startDate: "2026-08-25",
    frequencyDays: "3",
    status: "scheduled",
  });
  assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("Bulk topic one"));
  assert.ok(elements["[data-blog-table-body]"].children[1].innerHTML.includes("Bulk topic two"));
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "plan");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Bulk schedule created.");
  console.log("Content Plan bulk utility action checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: { calendarMode: "list" }, contentPlan: { items: [{ id: "visible-one", title: "Visible one", keyword: "visible keyword", status: "scheduled", scheduledDate: "2026-08-24" }, { id: "visible-two", title: "Visible two", keyword: "second keyword", status: "draft", scheduledDate: "2026-08-25" }] }, settings: {}, topics: [{ id: "topic-a", title: "Topic A", keyword: "topic a", volume: 700, difficulty: "Easy", added: false }, { id: "topic-b", title: "Topic B", keyword: "topic b", volume: 300, difficulty: "Medium", added: false }], products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };
accountState.calendarOffset = 0;
accountState.blogStatusFilter = "all";
accountState.selectedBlogIds = new Set();
accountState.topicFilters = { query: "", difficultyMin: "", difficultyMax: "", cpcMin: "", cpcMax: "", volumeMin: "", volumeMax: "", competitionMin: "", competitionMax: "" };
accountState.topicSearchResults = null;
accountState.selectedTopicIds = new Set();`,
    context
  );
  calendarShiftButtons.find((button) => button.dataset.calendarShift === "1").listeners.click[0]();
  assert.strictEqual(vm.runInContext("accountState.calendarOffset", context), 1);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Calendar window updated.");
  calendarShiftButtons.find((button) => button.dataset.calendarShift === "today").listeners.click[0]();
  assert.strictEqual(vm.runInContext("accountState.calendarOffset", context), 0);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Calendar returned to today.");
  await context.handleDynamicAccountClick({
    target: {
      checked: true,
      closest(selector) {
        if (selector === "[data-blog-select]") return { dataset: { blogSelect: "visible-one" }, checked: true };
        return null;
      },
    },
  });
  assert.strictEqual(vm.runInContext("JSON.stringify(Array.from(accountState.selectedBlogIds).sort())", context), '["visible-one"]');
  assert.strictEqual(elements["[data-blog-selected]"].textContent, "1 selected");
  await context.handleDynamicAccountClick({
    target: {
      checked: false,
      closest(selector) {
        if (selector === "[data-blog-select]") return { dataset: { blogSelect: "visible-one" }, checked: false };
        return null;
      },
    },
  });
  assert.strictEqual(vm.runInContext("JSON.stringify(Array.from(accountState.selectedBlogIds).sort())", context), "[]");
  assert.strictEqual(elements["[data-blog-selected]"].textContent, "0 selected");
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-blog-select-all]") return { dataset: { blogSelectAll: "" } };
        return null;
      },
    },
  });
  assert.strictEqual(vm.runInContext("JSON.stringify(Array.from(accountState.selectedBlogIds).sort())", context), '["visible-one","visible-two"]');
  assert.strictEqual(elements["[data-blog-selected]"].textContent, "2 selected");
  await context.handleDynamicAccountClick({
    target: {
      checked: true,
      closest(selector) {
        if (selector === "[data-topic-select]") return { dataset: { topicSelect: "topic-a" }, checked: true };
        return null;
      },
    },
  });
  assert.strictEqual(vm.runInContext("JSON.stringify(Array.from(accountState.selectedTopicIds).sort())", context), '["topic-a"]');
  assert.strictEqual(elements["[data-keyword-selected]"].textContent, "1 selected");
  await context.handleDynamicAccountClick({
    target: {
      checked: false,
      closest(selector) {
        if (selector === "[data-topic-select]") return { dataset: { topicSelect: "topic-a" }, checked: false };
        return null;
      },
    },
  });
  assert.strictEqual(vm.runInContext("JSON.stringify(Array.from(accountState.selectedTopicIds).sort())", context), "[]");
  assert.strictEqual(elements["[data-keyword-selected]"].textContent, "0 selected");
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-topic-select-all]") return { dataset: { topicSelectAll: "" } };
        return null;
      },
    },
  });
  assert.strictEqual(vm.runInContext("JSON.stringify(Array.from(accountState.selectedTopicIds).sort())", context), '["topic-a","topic-b"]');
  assert.strictEqual(elements["[data-keyword-selected]"].textContent, "2 selected");
  vm.runInContext('accountState.topicSort = { field: "volume", direction: "desc" }; renderTopics(accountState.data);', context);
  topicSortButtons.find((button) => button.dataset.topicSort === "volume").listeners.click[0]();
  assert.strictEqual(vm.runInContext("accountState.topicSort.direction", context), "asc");
  assert.ok(elements["[data-topic-list]"].children[0].innerHTML.includes("topic b"));
  console.log("Calendar and select-all control checks passed.");

  vm.runInContext(
    `accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "plan-card", title: "Calendar card article", keyword: "calendar keyword", status: "scheduled", scheduledDate: "2026-08-24", volume: 900, difficulty: "Easy", estimatedVisits: 99 }] }, settings: { cms: { status: "connected" } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`,
    context
  );
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-plan-item-id]") return { dataset: { planItemId: "plan-card" } };
        return null;
      },
    },
  });
  assert.ok(startArticleCalls.find((call) => call.url === "/api/account/blog/posts/plan-card"));
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Article detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-article-detail-dialog"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Calendar card article"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Calendar SEO"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Aug 24 at 09:30"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="edit"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="open-builder"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="schedule"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="generate"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="publish"'));
  console.log("Planned article card detail checks passed.");

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "edit-post", title: "Edit me", keyword: "edit keyword", status: "draft" }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`, context);
  await context.handleDynamicAccountClick({
    target: {
      closest(selector) {
        if (selector === "[data-blog-menu-action]") return { dataset: { blogMenuAction: "schedule", blogPostId: "edit-post" } };
        return null;
      },
    },
  });
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Schedule article");
  await context.handleBlogAction("edit", "edit-post");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Edit article");
  const editArticleFieldNames = elements["[data-dialog-form]"].children
    .map((child) => child.children?.[0]?.name)
    .filter(Boolean);
  assert.ok(editArticleFieldNames.includes("canonicalUrl"));
  assert.ok(editArticleFieldNames.includes("authorName"));
  assert.ok(editArticleFieldNames.includes("internalLinks"));
  assert.ok(editArticleFieldNames.includes("schemaType"));
  assert.ok(editArticleFieldNames.includes("volume"));
  assert.ok(editArticleFieldNames.includes("difficulty"));
  assert.ok(editArticleFieldNames.includes("estimatedVisits"));
  await vm.runInContext('accountState.dialogSubmit({ title: "Edited article", slug: "edited-article", keyword: "edited keyword", category: "Guides", excerpt: "Edited excerpt", canonicalUrl: "https://sirbloggsalot.com/blog/edited-article", authorName: "Editorial Team", seoTitle: "Edited SEO title", metaDescription: "Edited meta", internalLinks: "https://sirbloggsalot.com/pricing\\n/blog/edited-article", schemaType: "HowTo", featuredImageUrl: "https://sirbloggsalot.com/assets/edited.png", featuredImageAlt: "Edited image alt", body: "Edited body", scheduledDate: "2026-08-22", scheduledTime: "10:45", status: "draft", volume: "1800", difficulty: "Medium", estimatedVisits: "120", notes: "Edited notes" })', context);
  const editPostCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/edit-post" && call.options.method === "PUT");
  assert.ok(editPostCall);
  assert.strictEqual(JSON.parse(editPostCall.options.body).title, "Edited article");
  assert.strictEqual(JSON.parse(editPostCall.options.body).canonicalUrl, "https://sirbloggsalot.com/blog/edited-article");
  assert.strictEqual(JSON.parse(editPostCall.options.body).authorName, "Editorial Team");
  assert.strictEqual(JSON.parse(editPostCall.options.body).internalLinks, "https://sirbloggsalot.com/pricing\n/blog/edited-article");
  assert.strictEqual(JSON.parse(editPostCall.options.body).schemaType, "HowTo");
  assert.strictEqual(JSON.parse(editPostCall.options.body).volume, "1800");
  assert.strictEqual(JSON.parse(editPostCall.options.body).difficulty, "Medium");
  assert.strictEqual(JSON.parse(editPostCall.options.body).estimatedVisits, "120");
  assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes("Edited article"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article updated.");

  await context.handleBlogAction("view", "edit-post");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Article detail");
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-article-detail-dialog"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("data-article-detail-readiness"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("100% ready"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Edit me"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Original SEO title"));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes("Scheduled date must be today or in the past before publishing."));
  assert.match(elements["[data-dialog-body]"].innerHTML, /data-blog-action="publish"[^>]*disabled/);
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="edit"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="open-builder"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="schedule"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="generate"'));
  assert.ok(elements["[data-dialog-body]"].innerHTML.includes('data-blog-action="publish"'));
  await context.handleBlogAction("open-builder", "edit-post");
  assert.strictEqual(elements["[data-account-dialog]"].hidden, true);
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "write");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article opened in Article Builder.");
  await context.handleBlogAction("view", "edit-post");
  await context.handleBlogAction("generate", "edit-post");
  assert.strictEqual(elements["[data-account-dialog]"].hidden, true);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article draft generated locally.");

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "generate-post", title: "Generate post", keyword: "generate keyword", status: "draft" }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`, context);
  await context.handleBlogAction("generate", "generate-post");
  const generatePostCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/generate-post/generate");
  assert.ok(generatePostCall);
  assert.ok(elements["[data-blog-table-body]"].children[0].innerHTML.includes('aria-label="Regenerate"'));
  assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("status-chip"), false);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article draft generated locally.");

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "unpublish-post", title: "Published post", slug: "published-post", status: "published", publicPath: "/blog/published-post" }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`, context);
  const unpublishCallsBeforeConfirm = startArticleCalls.filter((call) => call.url === "/api/account/blog/posts/unpublish-post/unpublish").length;
  await context.handleBlogAction("unpublish", "unpublish-post");
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/blog/posts/unpublish-post/unpublish").length, unpublishCallsBeforeConfirm);
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Unpublish article");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  const unpublishPostCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/unpublish-post/unpublish");
  assert.ok(unpublishPostCall);
  assert.strictEqual(elements["[data-blog-table-body]"].children[0].innerHTML.includes("status-chip"), false);
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article moved back to draft.");

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "delete-post", title: "Delete post", status: "draft" }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`, context);
  const deleteCallsBeforeConfirm = startArticleCalls.filter((call) => call.url === "/api/account/blog/posts/delete-post" && call.options.method === "DELETE").length;
  await context.handleBlogAction("delete", "delete-post");
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/blog/posts/delete-post" && call.options.method === "DELETE").length, deleteCallsBeforeConfirm);
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Delete article");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  const deletePostCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/delete-post" && call.options.method === "DELETE");
  assert.ok(deletePostCall);
  assert.ok(elements["[data-content-calendar]"].innerHTML.includes("No articles yet"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article deleted.");
  console.log("Article edit generate unpublish delete action checks passed.");

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "one", title: "One", status: "scheduled" }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] }; accountState.selectedBlogIds = new Set(["one"]);`, context);
  elements["[data-blog-bulk-status]"].value = "draft";
	  await context.handleBlogAction("bulk-update");
	  const bulkUpdateCall = startArticleCalls.find((call) => call.url === "/api/account/content-plan/bulk-update");
	  assert.ok(bulkUpdateCall);
  assert.deepStrictEqual(JSON.parse(bulkUpdateCall.options.body), { ids: ["one"], status: "draft" });

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "failed-bulk", title: "Failed bulk", status: "scheduled" }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] }; accountState.selectedBlogIds = new Set(["failed-bulk"]);`, context);
  elements["[data-blog-bulk-status]"].value = "failed";
  await context.handleBlogAction("bulk-update");
  const failedBulkUpdateCall = startArticleCalls.find((call) => call.url === "/api/account/content-plan/bulk-update" && JSON.parse(call.options.body).status === "failed");
  assert.ok(failedBulkUpdateCall);
  assert.deepStrictEqual(JSON.parse(failedBulkUpdateCall.options.body), { ids: ["failed-bulk"], status: "failed" });

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "scheduled-post", title: "Scheduled post", scheduledDate: "2026-08-12", scheduledTime: "09:00", status: "draft" }] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`, context);
  await context.handleBlogAction("schedule", "scheduled-post");
  await vm.runInContext('accountState.dialogSubmit({ scheduledDate: "2026-08-20", scheduledTime: "14:30", status: "scheduled" })', context);
  const schedulePostCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/scheduled-post/schedule");
  assert.ok(schedulePostCall);
  assert.deepStrictEqual(JSON.parse(schedulePostCall.options.body), { scheduledDate: "2026-08-20", scheduledTime: "14:30", status: "scheduled" });
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article scheduled.");

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "future-publish-post", title: "Future publish post", slug: "future-publish-post", scheduledDate: "2999-01-01", scheduledTime: "09:00", status: "draft", body: "Ready body" }] }, settings: { cms: { status: "connected" } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`, context);
  elements["[data-dialog-title]"].textContent = "";
  await context.handleBlogAction("publish", "future-publish-post");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Scheduled date must be today or in the past before publishing.");

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: {}, contentPlan: { items: [{ id: "publish-post", title: "Publish post", slug: "publish-post", scheduledDate: "2026-08-01", scheduledTime: "09:00", status: "draft", body: "Ready body" }] }, settings: { cms: { status: "connected" } }, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [] };`, context);
  const publishCallsBeforeConfirm = startArticleCalls.filter((call) => call.url === "/api/account/blog/posts/publish-post/publish").length;
  await context.handleBlogAction("publish", "publish-post");
  assert.strictEqual(startArticleCalls.filter((call) => call.url === "/api/account/blog/posts/publish-post/publish").length, publishCallsBeforeConfirm);
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Publish article");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  const publishPostCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/publish-post/publish");
  assert.ok(publishPostCall);
  assert.strictEqual(publishPostCall.options.body, "{}");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article marked published locally.");

  await context.handleBlogAction("open-builder", "builder-post");
  const builderOpenCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/builder-post");
  assert.ok(builderOpenCall);
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "title").value, "Builder loaded title");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "slug").value, "builder-loaded-title");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "keyword").value, "builder keyword");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "category").value, "Playbooks");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "canonicalUrl").value, "https://sirbloggsalot.com/blog/builder-loaded-title");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "authorName").value, "Builder Author");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "scheduledDate").value, "2026-08-14");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "scheduledTime").value, "11:15");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "volume").value, 2400);
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "difficulty").value, "Medium");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "estimatedVisits").value, 180);
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "body").value, "Builder body");
  assert.strictEqual(elements["[data-article-preview-title]"].textContent, "Builder loaded title");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article opened in Article Builder.");
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "write");
  assert.strictEqual(vm.runInContext("accountState.data.writeDraft.sourcePostId", context), "builder-post");
  assert.strictEqual(vm.runInContext("accountState.data.writeDraft.sourceStatus", context), "scheduled");
  assert.strictEqual(vm.runInContext("accountState.data.writeDraft.status", context), "draft");

  writeFieldInputs.find((input) => input.dataset.writeField === "title").value = "Builder saved title";
  writeFieldInputs.find((input) => input.dataset.writeField === "keyword").value = "builder saved keyword";
  writeFieldInputs.find((input) => input.dataset.writeField === "canonicalUrl").value = "https://sirbloggsalot.com/blog/builder-saved-title";
  writeFieldInputs.find((input) => input.dataset.writeField === "authorName").value = "Saved Builder Author";
  writeFieldInputs.find((input) => input.dataset.writeField === "volume").value = "2600";
  writeFieldInputs.find((input) => input.dataset.writeField === "difficulty").value = "Easy to rank";
  writeFieldInputs.find((input) => input.dataset.writeField === "estimatedVisits").value = "210";
  writeFieldInputs.find((input) => input.dataset.writeField === "body").value = "Builder saved body";
  await context.handleAccountAction("save-builder-draft");
  const builderSaveCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/builder-post" && call.options.method === "PUT");
  assert.ok(builderSaveCall);
  const builderSavePayload = JSON.parse(builderSaveCall.options.body);
  assert.strictEqual(builderSavePayload.title, "Builder saved title");
  assert.strictEqual(builderSavePayload.keyword, "builder saved keyword");
  assert.strictEqual(builderSavePayload.canonicalUrl, "https://sirbloggsalot.com/blog/builder-saved-title");
  assert.strictEqual(builderSavePayload.authorName, "Saved Builder Author");
  assert.strictEqual(builderSavePayload.volume, "2600");
  assert.strictEqual(builderSavePayload.difficulty, "Easy to rank");
  assert.strictEqual(builderSavePayload.estimatedVisits, "210");
  assert.strictEqual(builderSavePayload.body, "Builder saved body");
  assert.strictEqual(builderSavePayload.status, "scheduled");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article draft saved to opened article.");
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "write");

  writeFieldInputs.find((input) => input.dataset.writeField === "title").value = "Builder updated title";
  writeFieldInputs.find((input) => input.dataset.writeField === "keyword").value = "builder updated keyword";
  writeFieldInputs.find((input) => input.dataset.writeField === "canonicalUrl").value = "https://sirbloggsalot.com/blog/builder-updated-title";
  writeFieldInputs.find((input) => input.dataset.writeField === "authorName").value = "Updated Builder Author";
  writeFieldInputs.find((input) => input.dataset.writeField === "volume").value = "2800";
  writeFieldInputs.find((input) => input.dataset.writeField === "difficulty").value = "Hard";
  writeFieldInputs.find((input) => input.dataset.writeField === "estimatedVisits").value = "230";
  writeFieldInputs.find((input) => input.dataset.writeField === "body").value = "Builder updated body";
  await context.handleAccountAction("start-article");
  const builderUpdateCall = [...startArticleCalls].reverse().find((call) => call.url === "/api/account/blog/posts/builder-post" && call.options.method === "PUT");
  assert.ok(builderUpdateCall);
  assert.ok(!startArticleCalls.find((call) => call.url === "/api/account/blog/posts" && call.options.method === "POST"));
  const builderUpdatePayload = JSON.parse(builderUpdateCall.options.body);
  assert.strictEqual(builderUpdatePayload.title, "Builder updated title");
  assert.strictEqual(builderUpdatePayload.keyword, "builder updated keyword");
  assert.strictEqual(builderUpdatePayload.canonicalUrl, "https://sirbloggsalot.com/blog/builder-updated-title");
  assert.strictEqual(builderUpdatePayload.authorName, "Updated Builder Author");
  assert.strictEqual(builderUpdatePayload.volume, "2800");
  assert.strictEqual(builderUpdatePayload.difficulty, "Hard");
  assert.strictEqual(builderUpdatePayload.estimatedVisits, "230");
  assert.strictEqual(builderUpdatePayload.body, "Builder updated body");
  assert.strictEqual(builderUpdatePayload.status, "scheduled");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article updated from Article Builder.");

  vm.runInContext('accountState.workspaces = [{ id: "owner", role: "member", selected: true }]; accountState.selectedWorkspaceId = "owner";', context);
  const readOnlyOpenBuilder = context.isReadOnlyDynamicControl({
    target: {
      closest(selector) {
        if (selector === "[data-blog-action]") return { dataset: { blogAction: "open-builder" } };
        return null;
      },
    },
  });
  assert.strictEqual(readOnlyOpenBuilder, false);
  vm.runInContext('accountState.workspaces = [{ id: "owner", role: "owner", selected: true }]; accountState.selectedWorkspaceId = "owner";', context);

  vm.runInContext(`accountState.data = { id: "owner", ownerEmail: "owner@example.com", workspaceName: "Owner", ui: { activeView: "plan" }, contentPlan: { items: [] }, settings: {}, products: [], locations: [], members: [], invites: [], billing: {}, searchConsole: {}, rankings: {}, aiMentions: {}, supportTickets: [], writeDraft: { sourcePostId: "stale-header-post", sourceStatus: "scheduled", title: "Stale header article", keyword: "stale header keyword" } }; renderWriteDraft(accountState.data);`, context);
  await context.handleBlogAction("article-builder");
  assert.strictEqual(vm.runInContext("accountState.data.ui.activeView", context), "write");
  assert.strictEqual(vm.runInContext("accountState.data.writeDraft.sourcePostId || ''", context), "");
  assert.strictEqual(vm.runInContext("accountState.data.writeDraft.sourceStatus || ''", context), "");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "title").value, "");
  assert.strictEqual(writeFieldInputs.find((input) => input.dataset.writeField === "keyword").value, "");

  writeFieldInputs.forEach((input) => {
    input.value = "";
  });
  writeFieldInputs.find((input) => input.dataset.writeField === "title").value = "Preview title";
  writeFieldInputs.find((input) => input.dataset.writeField === "slug").value = "preview-title";
  writeFieldInputs.find((input) => input.dataset.writeField === "keyword").value = "preview keyword";
  writeFieldInputs.find((input) => input.dataset.writeField === "category").value = "Guides";
  writeFieldInputs.find((input) => input.dataset.writeField === "brief").value = "Preview brief";
  const previewAction = context.handleAccountAction("preview-article");
  assert.strictEqual(elements["[data-write-progress]"].hidden, false);
  assert.strictEqual(elements["[data-write-progress]"].attributes["aria-busy"], "true");
  assert.ok(elements["[data-write-progress]"].textContent.includes("Generating brief preview"));
  await previewAction;
  assert.strictEqual(elements["[data-write-progress]"].hidden, true);
  assert.strictEqual(elements["[data-write-progress]"].attributes["aria-busy"], "false");
  const previewSaveCall = startArticleCalls.find((call) => call.url === "/api/account/write-draft" && JSON.parse(call.options.body || "{}").title === "Preview title");
  assert.ok(previewSaveCall);
  const previewCall = startArticleCalls.find((call) => call.url === "/api/account/write-draft/preview");
  assert.ok(previewCall);
  assert.strictEqual(vm.runInContext("accountState.data.writeDraft.preview", context), "Generated local brief preview for Preview title.");
  assert.strictEqual(elements["[data-write-preview]"].children[0].children[0].children[1].textContent, "Generated local brief preview for Preview title.");
  assert.ok(elements["[data-write-preview]"].children[0].children[1].textContent.includes("Provider pending"));
  assert.ok(elements["[data-write-preview]"].children[0].children[1].textContent.includes("Local brief preview"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Brief preview generated.");
  assert.strictEqual(elements["[data-article-generated-actions]"].hidden, false);
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes("Save draft"));
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes("Schedule"));
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes("Publish"));
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes("Regenerate"));
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes('data-account-action="schedule-builder-article" disabled'));
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes('data-account-action="publish-builder-article" disabled'));
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes('data-account-action="regenerate-builder-article" disabled'));
  console.log("Article Builder preview and navigation action checks passed.");

  startArticleCalls.length = 0;
  vm.runInContext(
    `accountState.data = {
      id: "owner",
      ownerEmail: "owner@example.com",
      workspaceName: "Owner",
      ui: { activeView: "write" },
      contentPlan: { items: [{ id: "builder-generated-post", title: "Generated builder post", slug: "generated-builder-post", keyword: "builder keyword", scheduledDate: "2026-08-20", scheduledTime: "09:30", status: "draft", body: "Generated body" }] },
      settings: {},
      products: [],
      locations: [],
      members: [],
      invites: [],
      billing: {},
      searchConsole: {},
      rankings: {},
      aiMentions: {},
      supportTickets: [],
      writeDraft: {
        sourcePostId: "builder-generated-post",
        sourceStatus: "draft",
        title: "Generated builder post",
        slug: "generated-builder-post",
        keyword: "builder keyword",
        scheduledDate: "2026-08-20",
        scheduledTime: "09:30",
        body: "Generated body",
        status: "draft"
      }
    };
    renderWriteDraft(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-article-generated-actions]"].hidden, false);
  assert.ok(elements["[data-article-generated-actions]"].innerHTML.includes('data-account-action="schedule-builder-article"'));
  assert.strictEqual(elements["[data-article-generated-actions]"].innerHTML.includes('data-account-action="schedule-builder-article" disabled'), false);
  assert.strictEqual(elements["[data-article-generated-actions]"].innerHTML.includes('data-account-action="publish-builder-article" disabled'), false);
  assert.strictEqual(elements["[data-article-generated-actions]"].innerHTML.includes('data-account-action="regenerate-builder-article" disabled'), false);
  await context.handleAccountAction("schedule-builder-article");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Schedule article");
  await vm.runInContext("accountState.dialogSubmit({ scheduledDate: '2026-08-22', scheduledTime: '10:15', status: 'scheduled' })", context);
  const builderScheduleCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/builder-generated-post/schedule");
  assert.ok(builderScheduleCall);
  assert.deepStrictEqual(JSON.parse(builderScheduleCall.options.body), { scheduledDate: "2026-08-22", scheduledTime: "10:15", status: "scheduled" });
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article scheduled from Article Builder.");

  await context.handleAccountAction("publish-builder-article");
  assert.strictEqual(elements["[data-dialog-title]"].textContent, "Publish article");
  await vm.runInContext("accountState.dialogSubmit({})", context);
  const builderPublishCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/builder-generated-post/publish");
  assert.ok(builderPublishCall);
  assert.strictEqual(builderPublishCall.options.body, "{}");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article marked published locally from Article Builder.");

  await context.handleAccountAction("regenerate-builder-article");
  const builderRegenerateCall = startArticleCalls.find((call) => call.url === "/api/account/blog/posts/builder-generated-post/generate");
  assert.ok(builderRegenerateCall);
  assert.strictEqual(builderRegenerateCall.options.body, "{}");
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Article regenerated locally from Article Builder.");

  startArticleCalls.length = 0;
  vm.runInContext(
    `accountState.data.writeDraft = {
      title: "Setup draft",
      slug: "setup-draft",
      keyword: "setup keyword",
      status: "draft"
    };
    accountState.data.setupChecklist = {
      completed: 0,
      total: 1,
      percent: 0,
      items: [{ label: "Save Article Builder draft", detail: "Draft basics are missing.", complete: false, action: { view: "write" } }]
    };
    renderWriteDraft(accountState.data);
    renderSetupChecklist(accountState.data);`,
    context
  );
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "0 of 1 complete · 0%");
  await context.handleAccountAction("save-builder-draft");
  const saveDraftCall = startArticleCalls.find((call) => call.url === "/api/account/write-draft" && JSON.parse(call.options.body || "{}").status === "draft");
  assert.ok(saveDraftCall);
  assert.strictEqual(JSON.parse(saveDraftCall.options.body).status, "draft");
  assert.strictEqual(elements["[data-setup-progress]"].textContent, "1 of 1 complete · 100%");

  startArticleCalls.length = 0;
  writeFieldInputs.forEach((input) => {
    input.value = "";
  });
  writeFieldInputs.find((input) => input.dataset.writeField === "title").value = "Missing keyword title";
  await context.handleAccountAction("start-article");
  assert.ok(!startArticleCalls.find((call) => call.url === "/api/account/write-draft"));
  assert.ok(!startArticleCalls.find((call) => call.url === "/api/account/blog/posts"));
  assert.strictEqual(elements["[data-account-operation]"].textContent, "Add a title and target keyword before starting an article.");

  writeFieldInputs.forEach((input) => {
    input.value = "";
  });
  writeFieldInputs.find((input) => input.dataset.writeField === "title").value = "Saved title";
  writeFieldInputs.find((input) => input.dataset.writeField === "slug").value = "saved-title";
  writeFieldInputs.find((input) => input.dataset.writeField === "keyword").value = "saved keyword";
  writeFieldInputs.find((input) => input.dataset.writeField === "category").value = "Guides";
  writeFieldInputs.find((input) => input.dataset.writeField === "internalLinks").value = "https://sirbloggsalot.com/pricing";
  writeFieldInputs.find((input) => input.dataset.writeField === "body").value = "Saved body";
  writeFieldInputs.find((input) => input.dataset.writeField === "notes").value = "Saved notes";
  await context.handleAccountAction("start-article");
  const blogCreate = startArticleCalls.find((call) => call.url === "/api/account/blog/posts");
  assert.ok(blogCreate);
  const createdPayload = JSON.parse(blogCreate.options.body);
  assert.strictEqual(createdPayload.title, "Saved title");
  assert.strictEqual(createdPayload.slug, "saved-title");
  assert.strictEqual(createdPayload.category, "Guides");
  assert.strictEqual(createdPayload.internalLinks, "https://sirbloggsalot.com/pricing");
  assert.strictEqual(createdPayload.body, "Saved body");
  assert.strictEqual(createdPayload.notes, "Saved notes");

  console.log("Start article normalized draft checks passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
