const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
const navLinks = Array.from(document.querySelectorAll("[data-route]"));
const routePages = Array.from(document.querySelectorAll("[data-route-page]"));
const successPanels = Array.from(document.querySelectorAll("[data-success-panel]"));
const dropdown = document.querySelector("[data-nav-dropdown]");
const dropdownToggle = document.querySelector("[data-nav-dropdown-toggle]");
const dropdownMenu = document.querySelector("[data-nav-dropdown-menu]");
const dropdownBridge = document.querySelector("[data-nav-dropdown-bridge]");
const NAV_DROPDOWN_CLOSE_DELAY_MS = 240;
const desktopDropdownQuery = window.matchMedia ? window.matchMedia("(min-width: 981px)") : { matches: true };
const publicPromo = document.querySelector("[data-public-promo]");
const publicPromoClose = document.querySelector("[data-public-promo-close]");
const billingButtons = Array.from(document.querySelectorAll("[data-billing-toggle]"));
const priceValues = Array.from(document.querySelectorAll("[data-price]"));
const priceNotes = Array.from(document.querySelectorAll("[data-price-note]"));
const faqLists = Array.from(document.querySelectorAll(".faq-list"));
const faqMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
const authMessage = document.querySelector("[data-auth-message]");
const authStatus = document.querySelector("[data-auth-status]");
const googleSignIn = document.querySelector("[data-google-signin]");
const loginLink = document.querySelector("[data-auth-login]");
const signupLink = document.querySelector("[data-auth-signup]");
const trialLinks = Array.from(document.querySelectorAll("[data-auth-trial]"));
const accountLink = document.querySelector("[data-auth-account]");
const logoutButtons = Array.from(document.querySelectorAll("[data-auth-logout]"));
const accountBusyRoot = document.querySelector("[data-account-busy-root]");
const accountNavToggle = document.querySelector("[data-account-nav-toggle]");
const accountCreateToggle = document.querySelector("[data-account-create-toggle]");
const accountCreateMenu = document.querySelector("[data-account-create-menu]");
const accountCreateActionButtons = Array.from(document.querySelectorAll("[data-account-create-action]"));
const accountName = document.querySelector("[data-account-name]");
const accountEmail = document.querySelector("[data-account-email]");
const accountRole = document.querySelector("[data-account-role]");
const accountAvatar = document.querySelector("[data-account-avatar]");
const accountInitial = document.querySelector("[data-account-initial]");
const accountUpdated = document.querySelector("[data-account-updated]");
const accountWorkspace = document.querySelector("[data-account-workspace]");
const accountWorkspaceIcon = document.querySelector("[data-account-workspace-icon]");
const accountTeamEmail = document.querySelector("[data-account-team-email]");
const accountTeamInitial = document.querySelector("[data-account-team-initial]");
const accountViewButtons = Array.from(document.querySelectorAll("[data-account-view]"));
const accountPanels = Array.from(document.querySelectorAll("[data-account-panel]"));
const settingsTabButtons = Array.from(document.querySelectorAll("[data-settings-tab]"));
const settingsTabsShell = document.querySelector(".settings-tabs");
const settingsPanels = Array.from(document.querySelectorAll("[data-settings-panel]"));
const accountDirtyInputs = Array.from(document.querySelectorAll("[data-account-dirty]"));
const accountSaveButton = document.querySelector("[data-account-save]");
const toggleButtons = Array.from(document.querySelectorAll("[data-toggle-button]"));
const accountOperation = document.querySelector("[data-account-operation]");
const reportSummary = document.querySelector("[data-report-summary]");
const reportStatePanel = document.querySelector("[data-report-state-panel]");
const reportList = document.querySelector("[data-report-list]");
const seoScore = document.querySelector("[data-seo-score]");
const seoChart = document.querySelector("[data-seo-chart]");
const seoChecks = document.querySelector("[data-seo-checks]");
const seoIssues = document.querySelector("[data-seo-issues]");
const seoOpportunities = document.querySelector("[data-seo-opportunities]");
const reportChart = document.querySelector("[data-report-chart]");
const reportTemplates = document.querySelector("[data-report-templates]");
const reportShare = document.querySelector("[data-report-share]");
const reportSchedule = document.querySelector("[data-report-schedule]");
const reportProgress = document.querySelector("[data-report-progress]");
const reportShareAction = document.querySelector('[data-account-action="share-report"]');
const reportScheduleAction = document.querySelector('[data-account-action="schedule-report"]');
const reportExportAction = document.querySelector('[data-account-action="export-reports"]');
const contentCalendar = document.querySelector("[data-content-calendar]");
const contentPlanHeadline = document.querySelector("[data-content-plan-headline]");
const contentPlanStats = document.querySelector("[data-content-plan-stats]");
const contentToolsToggle = document.querySelector("[data-content-tools-toggle]");
const contentToolsMenu = document.querySelector("[data-content-tools-menu]");
const contentToolsActionButtons = Array.from(document.querySelectorAll("[data-content-tools-action]"));
const contentToolsModeButtons = Array.from(document.querySelectorAll("[data-content-tools-mode]"));
const contentStrategy = document.querySelector("[data-content-strategy]");
const contentPlanSummary = document.querySelector("[data-content-plan-summary]");
const contentWindow = document.querySelector("[data-content-window]");
const contentCountLabels = Array.from(document.querySelectorAll("[data-content-count]"));
const strategyCard = document.querySelector("[data-strategy-card]");
const bulkScheduleAction = document.querySelector('[data-account-action="bulk-schedule"]');
const addTopicToPlanAction = document.querySelector('[data-account-action="add-topic-to-plan"]');
const calendarModeButtons = Array.from(document.querySelectorAll("[data-calendar-mode]"));
const calendarShiftButtons = Array.from(document.querySelectorAll("[data-calendar-shift]"));
const blogStatusFilterButtons = Array.from(document.querySelectorAll("[data-blog-status-filter]"));
const blogTableShell = document.querySelector("[data-blog-table-shell]");
const blogTableBody = document.querySelector("[data-blog-table-body]");
const blogSelectAllControls = Array.from(document.querySelectorAll("[data-blog-select-all]"));
const blogBulkBar = document.querySelector("[data-blog-bulk-bar]");
const blogSelectedLabel = document.querySelector("[data-blog-selected]");
const blogBulkStatusInput = document.querySelector("[data-blog-bulk-status]");
const blogBulkUpdateAction = document.querySelector('[data-blog-action="bulk-update"]');
const blogBulkClearAction = document.querySelector('[data-blog-action="bulk-clear"]');
const settingsFieldInputs = Array.from(document.querySelectorAll("[data-settings-field]"));
const settingsToggleButtons = Array.from(document.querySelectorAll("[data-settings-toggle]"));
const keywordList = document.querySelector("[data-keyword-list]");
const keywordMixLabel = document.querySelector("[data-keyword-mix-label]");
const descriptionProgress = document.querySelector("[data-description-progress]");
const writeFieldInputs = Array.from(document.querySelectorAll("[data-write-field]"));
const writeStatus = document.querySelector("[data-write-status]");
const writePreview = document.querySelector("[data-write-preview]");
const writeProgress = document.querySelector("[data-write-progress]");
const articleGeneratedActions = document.querySelector("[data-article-generated-actions]");
const articleSourceSummary = document.querySelector("[data-article-source-summary]");
const articleBuilderOutputState = document.querySelector("[data-article-builder-output-state]");
const articleBuilderReadinessSummary = document.querySelector("[data-article-builder-readiness-summary]");
const articleBuilderScheduleSummary = document.querySelector("[data-article-builder-schedule-summary]");
const articleBuilderUrlSummary = document.querySelector("[data-article-builder-url-summary]");
const writeSaveAction = document.querySelector('[data-account-action="save-builder-draft"]');
const writePreviewAction = document.querySelector('[data-account-action="preview-article"]');
const writeStartAction = document.querySelector('[data-account-action="start-article"]');
const articlePreview = document.querySelector("[data-article-preview]");
const articlePreviewTitle = document.querySelector("[data-article-preview-title]");
const articlePreviewMeta = document.querySelector("[data-article-preview-meta]");
const articlePreviewReadiness = document.querySelector("[data-article-preview-readiness]");
const articlePreviewBody = document.querySelector("[data-article-preview-body]");
const articlePreviewSchedule = document.querySelector("[data-article-preview-schedule]");
const topicList = document.querySelector("[data-topic-list]");
const topicSearchInput = document.querySelector("[data-topic-search-input]");
const topicFilterInputs = Array.from(document.querySelectorAll("[data-topic-filter]"));
const topicSortButtons = Array.from(document.querySelectorAll("[data-topic-sort]"));
const topicSelectAllControls = Array.from(document.querySelectorAll("[data-topic-select-all]"));
const keywordTotal = document.querySelector("[data-keyword-total]");
const keywordFiltered = document.querySelector("[data-keyword-filtered]");
const keywordSelected = document.querySelector("[data-keyword-selected]");
const keywordProgress = document.querySelector("[data-keyword-progress]");
const keywordSearchAction = document.querySelector('[data-account-action="search-keywords"]');
const keywordFindTopicsAction = document.querySelector('[data-account-action="find-topics"]');
const keywordMagicSelectAction = document.querySelector('[data-account-action="magic-select-keywords"]');
const keywordSaveAction = document.querySelector('[data-account-action="save-keywords"]');
const descriptionGenerateAction = document.querySelector('[data-account-action="generate-description"]');
const keywordAddAction = document.querySelector('[data-account-action="add-keywords"]');
const productAddAction = document.querySelector('[data-account-action="add-product"]');
const locationAddAction = document.querySelector('[data-account-action="add-location"]');
const inviteGenerateAction = document.querySelector('[data-account-action="generate-invite"]');
const productsList = document.querySelector("[data-products-list]");
const productsManualControls = document.querySelector("[data-products-manual-controls]");
const productSearchInput = document.querySelector("[data-product-search]");
const productFilterButtons = Array.from(document.querySelectorAll("[data-product-filter]"));
const locationsList = document.querySelector("[data-locations-list]");
const pagesGeneratorList = document.querySelector("[data-pages-generator-list]");
const pagesGeneratorCount = document.querySelector("[data-pages-generator-count]");
const invitesList = document.querySelector("[data-invites-list]");
const membersList = document.querySelector("[data-members-list]");
const teamActivitySection = document.querySelector("[data-team-activity-section]");
const teamActivityList = document.querySelector("[data-team-activity-list]");
const inviteEmailInput = document.querySelector("[data-invite-email]");
const inviteRoleInput = document.querySelector("[data-invite-role]");
const inviteMessage = document.querySelector("[data-invite-message]");
const inviteDetail = document.querySelector("[data-invite-detail]");
const inviteLogin = document.querySelector("[data-invite-login]");
const inviteAcceptAction = document.querySelector('[data-account-action="accept-invite"]');
const billingPlanLabel = document.querySelector("[data-billing-plan]");
const billingStatusLabel = document.querySelector("[data-billing-status]");
const billingSummary = document.querySelector("[data-billing-summary]");
const billingPayment = document.querySelector("[data-billing-payment]");
const billingPortalStatus = document.querySelector("[data-billing-portal-status]");
const billingAlert = document.querySelector("[data-billing-alert]");
const billingStatePanel = document.querySelector("[data-billing-state-panel]");
const billingInvoiceList = document.querySelector("[data-billing-invoices]");
const billingProgress = document.querySelector("[data-billing-progress]");
const billingPlanActions = Array.from(document.querySelectorAll("[data-billing-plan-action]"));
const billingPeriodActions = Array.from(document.querySelectorAll("[data-billing-period-action]"));
const billingPortalAction = document.querySelector('[data-account-action="billing-portal"]');
const billingCancelAction = document.querySelector('[data-account-action="cancel-billing"]');
const billingReactivateAction = document.querySelector('[data-account-action="reactivate-billing"]');
const searchClicks = document.querySelector("[data-search-clicks]");
const searchImpressions = document.querySelector("[data-search-impressions]");
const searchIndexed = document.querySelector("[data-search-indexed]");
const searchStatus = document.querySelector("[data-search-status]");
const searchDetails = document.querySelector("[data-search-details]");
const searchPagesList = document.querySelector("[data-search-pages-list]");
const searchQueriesList = document.querySelector("[data-search-queries-list]");
const searchPagesCount = document.querySelector("[data-search-pages-count]");
const searchQueriesCount = document.querySelector("[data-search-queries-count]");
const searchChart = document.querySelector("[data-search-chart]");
const searchRangeInput = document.querySelector("[data-search-range]");
const searchViewButtons = Array.from(document.querySelectorAll("[data-search-view]"));
const searchRowLimitInputs = Array.from(document.querySelectorAll("[data-search-row-limit]"));
const searchRowLimitInput = searchRowLimitInputs[0];
const searchFilterInput = document.querySelector("[data-search-filter]");
const searchListTitle = document.querySelector("[data-search-list-title]");
const searchProgress = document.querySelector("[data-search-progress]");
const searchConnectAction = document.querySelector('[data-account-action="connect-search-console"]');
const searchSyncAction = document.querySelector('[data-account-action="sync-search-console"]');
const searchExportAction = document.querySelector('[data-account-action="export-search-console"]');
const searchDisconnectAction = document.querySelector('[data-account-action="disconnect-search-console"]');
const rankingsSummary = document.querySelector("[data-rankings-summary]");
const rankingsChart = document.querySelector("[data-rankings-chart]");
const rankingsRangeInput = document.querySelector("[data-rankings-range]");
const rankingsList = document.querySelector("[data-rankings-list]");
const rankingsFilterButtons = Array.from(document.querySelectorAll("[data-rankings-filter]"));
const rankingsSearchInput = document.querySelector("[data-rankings-search]");
const rankingsProgress = document.querySelector("[data-rankings-progress]");
const rankingsRefreshAction = document.querySelector('[data-account-action="refresh-rankings"]');
const rankingsExportAction = document.querySelector('[data-account-action="export-rankings"]');
const mentionsSummary = document.querySelector("[data-mentions-summary]");
const mentionsChart = document.querySelector("[data-mentions-chart]");
const mentionsRangeInput = document.querySelector("[data-mentions-range]");
const mentionsSourceInput = document.querySelector("[data-mentions-source]");
const mentionsModelInput = document.querySelector("[data-mentions-model]");
const mentionsList = document.querySelector("[data-mentions-list]");
const mentionsFilterButtons = Array.from(document.querySelectorAll("[data-mentions-filter]"));
const mentionsSearchInput = document.querySelector("[data-mentions-search]");
const mentionsProgress = document.querySelector("[data-mentions-progress]");
const mentionsRefreshAction = document.querySelector('[data-account-action="refresh-ai-mentions"]');
const mentionsExportAction = document.querySelector('[data-account-action="export-ai-mentions"]');
const cmsStatus = document.querySelector("[data-cms-status]");
const cmsValidation = document.querySelector("[data-cms-validation]");
const cmsDetails = document.querySelector("[data-cms-details]");
const cmsProgress = document.querySelector("[data-cms-progress]");
const cmsConnectAction = document.querySelector('[data-account-action="connect-cms"]');
const cmsTestAction = document.querySelector('[data-account-action="test-cms"]');
const cmsDisconnectAction = document.querySelector('[data-account-action="disconnect-cms"]');
const ctaPreview = document.querySelector("[data-cta-preview]");
const imageDetails = document.querySelector("[data-image-details]");
const imageProviderState = document.querySelector("[data-image-provider-state]");
const imageProgress = document.querySelector("[data-image-progress]");
const imageGuidelinesEditor = document.querySelector("[data-image-guidelines-editor]");
const imageTestAction = document.querySelector('[data-account-action="test-image-settings"]');
const imageClearAction = document.querySelector('[data-account-action="clear-image-tests"]');
const inventoryStatus = document.querySelector("[data-inventory-status]");
const inventoryStatePanel = document.querySelector("[data-inventory-state-panel]");
const inventoryDetails = document.querySelector("[data-inventory-details]");
const inventoryProgress = document.querySelector("[data-inventory-progress]");
const inventoryConnectAction = document.querySelector('[data-account-action="connect-inventory"]');
const inventorySyncAction = document.querySelector('[data-account-action="sync-inventory"]');
const inventoryDisconnectAction = document.querySelector('[data-account-action="disconnect-inventory"]');
const ctaEditAction = document.querySelector('[data-account-action="edit-cta"]');
const ctaResetAction = document.querySelector('[data-account-action="reset-cta"]');
const supportList = document.querySelector("[data-support-list]");
const supportCreateAction = document.querySelector('[data-account-action="create-support-ticket"]');
const supportHelpAction = document.querySelector('[data-account-action="help-chat"]');
const setupProgress = document.querySelector("[data-setup-progress]");
const setupList = document.querySelector("[data-setup-list]");
const tourOverlay = document.querySelector("[data-tour-overlay]");
const tourEyebrow = document.querySelector("[data-tour-eyebrow]");
const tourTitle = document.querySelector("[data-tour-title]");
const tourBody = document.querySelector("[data-tour-body]");
const tourDots = document.querySelector("[data-tour-dots]");
const tourProgress = document.querySelector("[data-tour-progress]");
const tourBackAction = document.querySelector('[data-account-action="tour-back"]');
const tourNextAction = document.querySelector('[data-account-action="tour-next"]');
const tourFinishAction = document.querySelector('[data-account-action="tour-finish"]');
const caseStudyMeta = document.querySelector("[data-case-study-meta]");
const caseStudyTitle = document.querySelector("[data-case-study-title]");
const caseStudySummary = document.querySelector("[data-case-study-summary]");
const caseStudyStatValues = document.querySelectorAll("[data-case-study-stat-value]");
const caseStudyStatLabels = document.querySelectorAll("[data-case-study-stat-label]");
const caseStudyAvatar = document.querySelector("[data-case-study-avatar]");
const caseStudyPerson = document.querySelector("[data-case-study-person]");
const caseStudyRole = document.querySelector("[data-case-study-role]");
const caseStudyLocation = document.querySelector("[data-case-study-location]");
const caseStudyCategory = document.querySelector("[data-case-study-category]");
const caseStudyContext = document.querySelector("[data-case-study-context]");
const caseStudyResult = document.querySelector("[data-case-study-result]");
const caseStudyResultCopy = document.querySelector("[data-case-study-result-copy]");
const caseStudyQuote = document.querySelector("[data-case-study-quote]");
const caseStudyMoreList = document.querySelector("[data-case-study-more-list]");
const accountDialog = document.querySelector("[data-account-dialog]");
const accountDialogTitle = document.querySelector("[data-dialog-title]");
const accountDialogBody = document.querySelector("[data-dialog-body]");
const accountDialogClose = document.querySelector("[data-dialog-close]");
const accountDialogForm = document.querySelector("[data-dialog-form]");

const routes = new Map([
  ["/blog", "blog"],
  ["/features", "features"],
  ["/pricing", "pricing"],
  ["/login", "login"],
  ["/signup", "signup"],
  ["/success", "success"],
  ["/affiliate", "affiliate"],
  ["/changelog", "changelog"],
  ["/case-studies", "case-studies"],
  ["/privacy", "privacy"],
  ["/terms", "terms"],
  ["/account", "account"],
]);

const dashboardRouteAliases = new Map([
  ["/dashboard", "/account?view=plan"],
  ["/content-plan", "/account?view=plan"],
  ["/articles", "/account?view=plan"],
  ["/write", "/account?view=write"],
  ["/article-builder", "/account?view=write"],
  ["/pages", "/account?view=pages"],
  ["/page-generator", "/account?view=pages"],
  ["/pages-generator", "/account?view=pages"],
  ["/topics", "/account?view=topics"],
  ["/keyword-finder", "/account?view=topics"],
  ["/settings", "/account?view=settings&tab=site"],
  ["/settings/site-settings", "/account?view=settings&tab=site"],
  ["/settings/products", "/account?view=settings&tab=products"],
  ["/settings/images", "/account?view=settings&tab=images"],
  ["/settings/image-settings", "/account?view=settings&tab=images"],
  ["/settings/image-style", "/account?view=settings&tab=images&section=image-style"],
  ["/settings/cms", "/account?view=settings&tab=cms"],
  ["/settings/cms-connect", "/account?view=settings&tab=cms"],
  ["/settings/locations", "/account?view=settings&tab=locations"],
  ["/settings/business-locations", "/account?view=settings&tab=locations"],
  ["/settings/call-to-action", "/account?view=settings&tab=cta"],
  ["/settings/cta", "/account?view=settings&tab=cta"],
  ["/settings/invite-users", "/account?view=settings&tab=invite"],
  ["/settings/invite", "/account?view=settings&tab=invite"],
  ["/rankings", "/account?view=rankings"],
  ["/search-console", "/account?view=search"],
  ["/google-search-console", "/account?view=search"],
  ["/ai-mentions", "/account?view=mentions"],
  ["/reports", "/account?view=reports"],
  ["/seo-analysis", "/account?view=seo-analysis"],
  ["/onboarding", "/account?view=getting-started"],
  ["/tours", "/account?view=getting-started"],
  ["/getting-started", "/account?view=getting-started"],
  ["/subscribe", "/account?view=billing"],
  ["/upgrade", "/account?view=billing"],
  ["/billing", "/account?view=billing"],
  ["/help", "/account?view=help"],
]);
const billingDashboardAliases = new Set(["/subscribe", "/upgrade", "/billing"]);
const billingAliasParams = ["checkoutPlan", "billingPeriod", "invoice"];
const accountViewQueryAliases = new Map([
  ["articles", "plan"],
  ["content-plan", "plan"],
  ["dashboard", "plan"],
  ["write", "write"],
  ["article-builder", "write"],
  ["pages", "pages"],
  ["page-generator", "pages"],
  ["pages-generator", "pages"],
  ["topics", "topics"],
  ["keyword-finder", "topics"],
  ["search-console", "search"],
  ["google-search-console", "search"],
  ["ai-mentions", "mentions"],
  ["seo-analysis", "seo-analysis"],
  ["onboarding", "getting-started"],
  ["tours", "getting-started"],
  ["getting-started", "getting-started"],
  ["subscribe", "billing"],
  ["upgrade", "billing"],
  ["billing", "billing"],
  ["help", "help"],
  ["reports", "reports"],
  ["settings", "settings"],
]);
const settingsTabQueryAliases = new Map([
  ["site-settings", "site"],
  ["site", "site"],
  ["products", "products"],
  ["images", "images"],
  ["image-settings", "images"],
  ["image-style", "images"],
  ["cms", "cms"],
  ["cms-connect", "cms"],
  ["locations", "locations"],
  ["business-locations", "locations"],
  ["call-to-action", "cta"],
  ["cta", "cta"],
  ["invite-users", "invite"],
  ["invite", "invite"],
]);

const authState = {
  ready: false,
  config: null,
  user: null,
};
let publicBillingPeriod = "annual";
let dropdownCloseTimer = null;
const publicPromoDismissKey = "sirbloggs_public_promo_dismissed";
const publicPromoDismissValue = "2026-08-31";
const reportTemplateCatalog = [
  {
    key: "performance",
    label: "Performance summary",
    description: "Content, traffic, rankings, and AI mentions for weekly review.",
  },
  {
    key: "inventory",
    label: "Content inventory",
    description: "Article status, keywords, public URLs, and publishing readiness.",
  },
  {
    key: "executive",
    label: "Executive digest",
    description: "A concise monthly stakeholder summary with top local signals.",
  },
];

const caseStudies = {
  natureva: {
    title: "Natureva",
    meta: "Ecommerce Shopify Home Goods Australia & US",
    summary: "A Shopify home goods brand hit #1 rankings in Australia and grew US traffic 1,962% in six months.",
    category: "Shopify home goods",
    context: "Natureva sells diatomite stone bath mats, dish drying mats, and bamboo home goods across Australia and the US.",
    result: "1,962% US traffic growth",
    resultCopy: "The case study reports 421% AU traffic growth, seven page-one rankings, and six months to results.",
    stats: [
      { value: "1,962%", label: "US Traffic Growth" },
      { value: "421%", label: "AU Traffic Growth" },
      { value: "7", label: "Page 1 Rankings" },
      { value: "6 months", label: "Time to Results" },
    ],
    person: "Arsene Becu",
    role: "Founder, Natureva",
    location: "naturevahome.com",
    quote: "Daily publishing became a repeatable asset instead of another manual content task.",
  },
  foodbuddy: {
    title: "MyFoodBuddy",
    meta: "iOS App Health & Fitness Denver, CO",
    summary: "Brand new domain to 3.65M impressions and 71 paying customers in 16 months. All from blog content.",
    category: "iOS app",
    context: "MyFoodBuddy is a voice-powered calorie tracking app in Denver that launched with a brand new domain in October 2024.",
    result: "3.65M blog impressions",
    resultCopy: "The case study reports 13.9K blog clicks, average position 6, 400+ free trials, and 71 paying customers.",
    stats: [
      { value: "3.65M", label: "Blog Impressions" },
      { value: "13.9K", label: "Blog Clicks" },
      { value: "6", label: "Avg. Position" },
      { value: "71", label: "Paying Customers" },
    ],
    person: "Adam",
    role: "Founder, MyFoodBuddy",
    location: "Denver, CO",
    quote: "Consistent helpful articles turned a brand-new domain into a reliable customer-acquisition channel.",
  },
  "kush-groove": {
    title: "Kush Groove",
    meta: "Local Business Greater Boston, MA",
    summary: "A local business blog went from minimal traction to 321K impressions in six months.",
    category: "Local business",
    context: "Kush Groove is a local retailer with two Greater Boston locations and needed stronger organic visibility in a competitive local market.",
    result: "321K blog impressions",
    resultCopy: "The case study reports 1.71K blog clicks, average position 11.8, and six months to results.",
    stats: [
      { value: "321K", label: "Blog Impressions" },
      { value: "1.71K", label: "Blog Clicks" },
      { value: "11.8", label: "Avg. Position" },
      { value: "6 months", label: "Time to Results" },
    ],
    person: "Marcus",
    role: "Owner, Kush Groove",
    location: "2 locations in Greater Boston",
    quote: "Focused local content helped bring more nearby customers in through organic search.",
  },
};

const accountState = {
  loading: false,
  busyCount: 0,
  ready: false,
  data: null,
  workspaces: [],
  selectedWorkspaceId: "",
  dirty: false,
  productFilter: "all",
  productSearch: "",
  topicFilters: {
    query: "",
    difficultyMin: "",
    difficultyMax: "",
    cpcMin: "",
    cpcMax: "",
    volumeMin: "",
    volumeMax: "",
    competitionMin: "",
    competitionMax: "",
  },
  topicSort: {
    field: "volume",
    direction: "desc",
  },
  topicSearchResults: null,
  selectedTopicIds: new Set(),
  selectedBlogIds: new Set(),
  calendarOffset: 0,
  blogStatusFilter: "all",
  searchView: "queries",
  searchFilter: "",
  searchRowLimit: 10,
  rankingsFilter: "all",
  rankingsRange: "30",
  rankingsSearch: "",
  mentionsFilter: "all",
  mentionsRange: "30",
  mentionsSource: "all",
  mentionsModel: "all",
  mentionsSearch: "",
  dialogSubmit: null,
  invite: null,
  lastDownload: null,
  lastShareUrl: "",
  lastInviteUrl: "",
  tourStep: -1,
  strategyDismissed: false,
};

const topicDifficultyOptions = ["Easy", "Easy to rank", "Medium", "Hard", "Needs review", "Needs research"];
const tourSteps = [
  {
    view: "plan",
    eyebrow: "Dashboard tour",
    title: "Welcome to Sir Bloggsalot!",
    body: "Let's take a quick tour to help you get the most out of your AI-powered blog. This will only take about 2 minutes.",
  },
  {
    view: "plan",
    eyebrow: "Content Plan",
    title: "Your Article Command Center",
    body: "This is where all your blog posts live. You can see what's scheduled, what's been generated, and what's already published. Your content pipeline at a glance!",
  },
  {
    view: "plan",
    eyebrow: "Status filters",
    title: "Filter by Status",
    body: "Quickly filter your articles by status. See scheduled posts, ones being processed, freshly generated drafts, or your published content.",
  },
  {
    view: "plan",
    eyebrow: "Bulk schedule",
    title: "Bulk Schedule Articles",
    body: "This is the magic button! Click here to schedule multiple articles at once. Our AI will research, write, and publish them automatically on your chosen dates.",
  },
  {
    view: "write",
    sidebarTarget: true,
    eyebrow: "Write",
    title: "Write",
    body: "Want more control? Write lets you craft one article yourself, step by step. Perfect for cornerstone content.",
  },
  {
    view: "topics",
    sidebarTarget: true,
    eyebrow: "Topics",
    title: "Topics Worth Writing",
    body: "Topics pulls real search-volume data so you know what your audience is actually typing into Google. Add the winners and they land on your content plan automatically.",
  },
  {
    view: "settings",
    sidebarTarget: true,
    eyebrow: "Settings",
    title: "Let's Check Your Settings",
    body: "Now let's head to Settings where you can customize how Sir Bloggsalot writes for your brand. This is where the magic happens!",
  },
  {
    view: "settings",
    sidebarTarget: true,
    tab: "site",
    tabStripTarget: true,
    eyebrow: "Site Settings",
    title: "Customize Your Content",
    body: "Here you can set up your business description, add keywords to target, and tell Sir Bloggsalot about your competitors. The more context you give, the better your articles!",
  },
  {
    view: "settings",
    sidebarTarget: true,
    tab: "cms",
    eyebrow: "CMS Connect",
    title: "Connect Your Blog Platform",
    body: "Connect your WordPress, Webflow, Shopify, or other CMS to auto-publish articles directly to your blog. No copy-pasting needed!",
  },
  {
    view: "settings",
    sidebarTarget: true,
    tab: "images",
    eyebrow: "Image Settings",
    title: "Customize Your Images",
    body: "Choose how images are generated for your articles. Pick between stock photos, AI-generated art, or a custom style that matches your brand.",
  },
  {
    view: "settings",
    sidebarTarget: true,
    tab: "site",
    eyebrow: "All set",
    title: "You're All Set!",
    body: "You now know the essentials! Start creating amazing content by clicking 'Bulk Schedule' or explore more features on your own. Happy blogging!",
  },
];

function resolveRoute(pathname) {
  if (dashboardRouteAliases.has(pathname)) return "account";
  if (pathname.startsWith("/case-studies/")) {
    const slug = pathname.split("/").filter(Boolean).pop() || "";
    return Object.prototype.hasOwnProperty.call(caseStudies, slug) ? "case-study" : "not-found";
  }
  if (pathname.startsWith("/invite/")) {
    try {
      return /^\/invite\/[^/]+$/.test(decodeURIComponent(pathname)) ? "invite" : "not-found";
    } catch {
      return "not-found";
    }
  }
  if (pathname === "/" || pathname === "") return "home";
  return routes.get(pathname) || "not-found";
}

function canonicalDashboardRoute(pathname, search = "") {
  const canonical = dashboardRouteAliases.get(pathname);
  if (!canonical) return "";
  if (!billingDashboardAliases.has(pathname) || !search) return canonical;

  const inputParams = new URLSearchParams(search);
  const outputParams = new URLSearchParams(canonical.split("?")[1] || "");
  billingAliasParams.forEach((key) => {
    if (inputParams.has(key)) outputParams.set(key, inputParams.get(key));
  });
  return `/account?${outputParams.toString()}`;
}

function safeAuthNextPath(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  try {
    const url = new URL(rawValue, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    const dashboardAlias = canonicalDashboardRoute(url.pathname, url.search);
    if (dashboardAlias) return dashboardAlias;
    const next = `${url.pathname}${url.search || ""}`;
    const decodedPathname = decodeURIComponent(url.pathname);
    const isSafeAccount = decodedPathname === "/account";
    const isSafeInvite = /^\/invite\/[^/]+$/.test(decodedPathname);
    return isSafeAccount || isSafeInvite ? next : "";
  } catch {
    return "";
  }
}

function setActiveNav(route) {
  navLinks.forEach((link) => {
    const linkRoute = link.dataset.route;
    if (linkRoute === route) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function isDesktopDropdownMode() {
  return desktopDropdownQuery.matches;
}

function clearDropdownCloseTimer() {
  if (!dropdownCloseTimer) return;
  window.clearTimeout(dropdownCloseTimer);
  dropdownCloseTimer = null;
}

function openDropdown() {
  if (!dropdown || !dropdownToggle) return;
  clearDropdownCloseTimer();
  dropdown.classList.add("is-open");
  dropdownToggle.setAttribute("aria-expanded", "true");
}

function closeDropdown() {
  if (!dropdown || !dropdownToggle) return;
  clearDropdownCloseTimer();
  dropdown.classList.remove("is-open");
  dropdownToggle.setAttribute("aria-expanded", "false");
}

function scheduleDropdownClose() {
  if (!dropdown || !dropdownToggle) return;
  clearDropdownCloseTimer();
  dropdownCloseTimer = window.setTimeout(() => {
    dropdownCloseTimer = null;
    if (dropdown.matches(":hover") || dropdownMenu?.matches(":hover") || dropdownBridge?.matches(":hover") || dropdown.contains(document.activeElement)) return;
    closeDropdown();
  }, NAV_DROPDOWN_CLOSE_DELAY_MS);
}

function toggleDropdown() {
  if (!dropdown || !dropdownToggle) return;
  clearDropdownCloseTimer();
  const open = !dropdown.classList.contains("is-open");
  dropdown.classList.toggle("is-open", open);
  dropdownToggle.setAttribute("aria-expanded", String(open));
}

function setBilling(period) {
  publicBillingPeriod = selectedBillingPeriod(period, publicBillingPeriod);
  billingButtons.forEach((button) => {
    const active = button.dataset.billingToggle === period;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  priceValues.forEach((price) => {
    price.textContent = price.dataset[period] || price.textContent;
  });

  priceNotes.forEach((note) => {
    note.textContent = note.dataset[period] || note.textContent;
  });

  updateTrialLinks();
}

function publicPromoDismissed() {
  try {
    return window.localStorage?.getItem(publicPromoDismissKey) === publicPromoDismissValue;
  } catch {
    return false;
  }
}

function setPublicPromoDismissed() {
  try {
    window.localStorage?.setItem(publicPromoDismissKey, publicPromoDismissValue);
  } catch {
    // Dismissal still works for the current page if storage is unavailable.
  }
}

function applyPublicPromoState() {
  if (!publicPromo) return;
  publicPromo.hidden = publicPromoDismissed();
}

function animateFaqItem(item, open) {
  const summary = item.querySelector("summary");
  const canAnimate = typeof item.animate === "function" && !faqMotionQuery.matches;

  item.getAnimations?.().forEach((animation) => animation.cancel());

  if (!summary || !canAnimate) {
    item.open = open;
    item.classList.remove("is-animating");
    return;
  }

  const startHeight = `${item.offsetHeight}px`;
  if (open) {
    item.open = true;
  }
  const endHeight = open ? `${item.offsetHeight}px` : `${summary.offsetHeight}px`;

  item.classList.add("is-animating");
  const animation = item.animate(
    {
      height: [startHeight, endHeight],
      opacity: open ? [0.88, 1] : [1, 0.88],
    },
    {
      duration: 240,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    }
  );

  animation.onfinish = () => {
    item.open = open;
    item.classList.remove("is-animating");
  };

  animation.oncancel = () => {
    item.classList.remove("is-animating");
  };
}

function initFaqAccordions() {
  faqLists.forEach((list) => {
    const items = Array.from(list.querySelectorAll("details"));
    const openItems = items.filter((item) => item.open);

    openItems.slice(1).forEach((item) => {
      item.open = false;
    });

    items.forEach((item) => {
      const summary = item.querySelector("summary");
      if (!summary) return;

      summary.addEventListener("click", (event) => {
        event.preventDefault();
        const shouldOpen = !item.open;

        if (shouldOpen) {
          items.forEach((otherItem) => {
            if (otherItem !== item && otherItem.open) {
              animateFaqItem(otherItem, false);
            }
          });
        }

        animateFaqItem(item, shouldOpen);
      });
    });
  });
}

function renderRoute() {
  if (accountDialog && !accountDialog.hidden) hideAccountDialog();
  setAccountNavOpen(false);
  setAccountCreateMenuOpen(false);
  setContentToolsMenuOpen(false);
  const canonicalAccountRoute = canonicalDashboardRoute(window.location.pathname, window.location.search);
  if (canonicalAccountRoute) {
    window.history.replaceState({}, "", canonicalAccountRoute);
  }

  const route = resolveRoute(window.location.pathname);

  if (route === "account" && authState.ready && !authState.user) {
    const next = `${window.location.pathname}${window.location.search || ""}`;
    window.history.replaceState({}, "", `/login?next=${encodeURIComponent(next)}`);
    renderRoute();
    return;
  }

  if ((route === "login" || route === "signup") && authState.ready && authState.user) {
    const next = safeAuthNextPath(new URLSearchParams(window.location.search).get("next"));
    window.history.replaceState({}, "", next || "/account?view=billing");
    renderRoute();
    return;
  }

  document.body.classList.toggle("route-active", route !== "home");
  document.body.classList.toggle("route-account", route === "account");
  document.body.classList.toggle("route-success", route === "success");

  routePages.forEach((page) => {
    page.hidden = page.dataset.routePage !== route;
  });

  if (route === "success") {
    renderSuccessState();
  }

  setActiveNav(route);
  if (route === "account") {
    applyAccountParams({ persist: false });
    applyAccountQueryActions();
  } else if (route === "invite") {
    loadInvite();
  } else if (route === "case-study") {
    renderCaseStudy();
  }
  if (route !== "home") {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

function renderSuccessState() {
  const showPreparing = new URLSearchParams(window.location.search).get("state") === "preparing";
  successPanels.forEach((panel) => {
    panel.hidden = panel.dataset.successPanel === "preparing" ? !showPreparing : showPreparing;
  });
}

function renderCaseStudy() {
  const slug = window.location.pathname.split("/").filter(Boolean).pop() || "";
  const study = caseStudies[slug] || {
    title: "Case study",
    meta: "Business SEO",
    summary: "See how daily, structured publishing can grow search visibility for niche businesses.",
    category: "Business",
    context: "Consistent content builds topical depth and gives search engines more high-intent pages to index.",
    result: "Visibility growth",
    resultCopy: "Content plans focus on searches that can turn into qualified visitors, leads, or customers.",
    stats: [
      { value: "Visibility", label: "Organic growth" },
      { value: "Clicks", label: "Qualified visits" },
      { value: "Rankings", label: "Search position" },
      { value: "6 months", label: "Time to results" },
    ],
    person: "Founder",
    role: "Customer",
    location: "Search visibility case study",
    quote: "Consistent publishing turned content from an occasional task into a repeatable growth channel.",
  };

  if (caseStudyMeta) caseStudyMeta.textContent = study.meta;
  if (caseStudyTitle) caseStudyTitle.textContent = study.title;
  if (caseStudySummary) caseStudySummary.textContent = study.summary;
  caseStudyStatValues.forEach((node, index) => {
    node.textContent = study.stats[index]?.value || "";
  });
  caseStudyStatLabels.forEach((node, index) => {
    node.textContent = study.stats[index]?.label || "";
  });
  if (caseStudyAvatar) caseStudyAvatar.textContent = (study.person || study.title || "S").trim().charAt(0).toUpperCase();
  if (caseStudyPerson) caseStudyPerson.textContent = study.person;
  if (caseStudyRole) caseStudyRole.textContent = study.role;
  if (caseStudyLocation) caseStudyLocation.textContent = study.location;
  if (caseStudyCategory) caseStudyCategory.textContent = study.category;
  if (caseStudyContext) caseStudyContext.textContent = study.context;
  if (caseStudyResult) caseStudyResult.textContent = study.result;
  if (caseStudyResultCopy) caseStudyResultCopy.textContent = study.resultCopy;
  if (caseStudyQuote) caseStudyQuote.textContent = study.quote;
  renderCaseStudyRelatedLinks(slug);
}

function renderCaseStudyRelatedLinks(slug) {
  if (!caseStudyMoreList) return;
  const relatedStudies = Object.entries(caseStudies).filter(([candidateSlug]) => candidateSlug !== slug);
  caseStudyMoreList.innerHTML = relatedStudies
    .map(([candidateSlug, study]) => {
      const result = escapeHtml(study.result);
      return `<a href="/case-studies/${encodeURIComponent(candidateSlug)}"><small>${escapeHtml(study.title)}</small><strong>${result}</strong><span>Read case study</span></a>`;
    })
    .join("");
}

function currentInviteToken() {
  const match = window.location.pathname.match(/^\/invite\/([^/?#]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function currentPathWithSearch() {
  return `${window.location.pathname}${window.location.search || ""}`;
}

function normalizedAccountView(value) {
  const raw = String(value || "").trim().toLowerCase();
  const candidate = accountViewQueryAliases.get(raw) || raw;
  return accountViewButtons.some((button) => button.dataset.accountView === candidate) ? candidate : "";
}

function normalizedSettingsTab(value) {
  const raw = String(value || "").trim().toLowerCase();
  const candidate = settingsTabQueryAliases.get(raw) || raw;
  return settingsTabButtons.some((button) => button.dataset.settingsTab === candidate) ? candidate : "";
}

function accountParams() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const tab = params.get("tab");
  const section = params.get("section") === "image-style" ? "image-style" : "";
  return {
    view: normalizedAccountView(view),
    tab: normalizedSettingsTab(tab),
    section,
  };
}

function selectedCheckoutPlan(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (normalized === "pro") return "Pro";
  if (normalized === "pro+" || normalized === "pro-plus" || normalized === "proplus") return "Pro+";
  return "";
}

function selectedBillingPeriod(value, fallback = "annual") {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "monthly" || normalized === "annual" ? normalized : fallback;
}

function billingCheckoutMonthlyAmount(plan, billingPeriod) {
  if (plan === "Pro+") return billingPeriod === "annual" ? "$69.00" : "$99.00";
  return billingPeriod === "annual" ? "$49.00" : "$79.00";
}

function formatBillingCheckoutDateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function billingCheckoutDialogBody(updatedBilling = {}, fallbackPlan = "Pro", invoice = {}) {
  const plan = updatedBilling.plan || fallbackPlan || "Pro";
  const billingPeriod = selectedBillingPeriod(updatedBilling.billingPeriod, "annual");
  const trialStart = formatBillingCheckoutDateLabel(updatedBilling.trialEndsAt);
  const renewalLine = `Then ${billingCheckoutMonthlyAmount(plan, billingPeriod)} per month${
    trialStart ? ` starting ${trialStart}` : ""
  }${billingPeriod === "annual" ? " on the annual plan" : ""}.`;
  return [
    `Try Sir Bloggsalot ${plan}`,
    "3 days free",
    renewalLine,
    "Unlimited access: Publish AI blog posts to your site daily",
    invoice.id ? `Latest local invoice: ${invoice.id} (${invoice.status || "created"}).` : "",
    "Link payment confirmation still needs provider integration.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function signupCheckoutHref(plan, billingPeriod) {
  const next = `/account?view=billing&checkoutPlan=${encodeURIComponent(plan)}&billingPeriod=${encodeURIComponent(billingPeriod)}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

function updateTrialLinks() {
  const signedIn = Boolean(authState.user);
  trialLinks.forEach((link) => {
    const plan = selectedCheckoutPlan(link.dataset.authTrialPlan);
    link.href = signedIn ? "/account?view=billing" : plan ? signupCheckoutHref(plan, publicBillingPeriod) : "/signup";
    link.textContent = signedIn ? "Open billing" : "Start free trial";
  });
}

function clearCheckoutParams() {
  if (window.location.pathname !== "/account") return;
  const params = new URLSearchParams(window.location.search);
  params.delete("checkoutPlan");
  params.delete("billingPeriod");
  const next = `/account${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function clearInvoiceParam() {
  if (window.location.pathname !== "/account") return;
  const params = new URLSearchParams(window.location.search);
  params.delete("invoice");
  const next = `/account${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function updateAccountUrl(view, tab, mode = "replace") {
  if (window.location.pathname !== "/account") return;
  const params = new URLSearchParams(window.location.search);

  if (view && (view !== "plan" || params.has("view"))) {
    params.set("view", view);
  } else {
    params.delete("view");
  }

  if (tab && view === "settings") {
    params.set("tab", tab);
  } else {
    params.delete("tab");
  }

  if (!(view === "settings" && tab === "images" && params.get("section") === "image-style")) {
    params.delete("section");
  }

  const next = `/account${params.toString() ? `?${params.toString()}` : ""}`;
  if (`${window.location.pathname}${window.location.search}` === next) return;

  if (mode === "push") {
    window.history.pushState({}, "", next);
  } else {
    window.history.replaceState({}, "", next);
  }
}

function applyAccountParams(options = {}) {
  const params = accountParams();
  const view = params.view || accountState.data?.ui?.activeView || "plan";
  const tab = params.tab || accountState.data?.ui?.activeSettingsTab || "site";
  const imageSection = params.section === "image-style" ? "image-style" : "";

  if (view === "settings") {
    setSettingsTab(tab, { persist: options.persist !== false, updateUrl: false, imageSection });
  } else {
    setAccountView(view, { persist: options.persist !== false, updateUrl: false });
    setImageSettingsSection("");
  }

  updateAccountUrl(view, view === "settings" ? tab : "", "replace");
}

async function applyCheckoutParams() {
  if (window.location.pathname !== "/account" || !accountState.data) return;
  const params = new URLSearchParams(window.location.search);
  const hasCheckoutParams = params.has("checkoutPlan") || params.has("billingPeriod");
  if (isReadOnlyWorkspace()) {
    if (hasCheckoutParams) clearCheckoutParams();
    return;
  }
  const plan = selectedCheckoutPlan(params.get("checkoutPlan"));
  if (!plan) {
    if (hasCheckoutParams) clearCheckoutParams();
    return;
  }

  const billing = accountState.data.billing || {};
  const billingPeriod = selectedBillingPeriod(params.get("billingPeriod"), billing.billingPeriod || "annual");
  try {
    const payload = await postAccountAction("/api/account/billing/checkout", {
      plan,
      billingPeriod,
    });
    const updatedBilling = payload.billing || accountState.data.billing || {};
    const invoice = (updatedBilling.invoices || [])[0] || {};
    showAccountDialog(
      "Billing checkout",
      billingCheckoutDialogBody(updatedBilling, plan, invoice)
    );
    setAccountOperation(`${plan} billing state saved locally.`);
  } catch (error) {
    setAccountOperation(error.message, true);
  } finally {
    clearCheckoutParams();
  }
}

async function applyInvoiceParam() {
  if (window.location.pathname !== "/account" || !accountState.data) return;
  const params = new URLSearchParams(window.location.search);
  const invoiceId = String(params.get("invoice") || "").trim();
  if (!invoiceId) return;
  if (!/^[A-Za-z0-9_-]+$/.test(invoiceId)) {
    clearInvoiceParam();
    return;
  }

  try {
    await openInvoiceDetails(invoiceId);
    clearInvoiceParam();
  } catch (error) {
    setAccountOperation(error.message, true);
    clearInvoiceParam();
  }
}

async function applyAccountQueryActions(options = {}) {
  if (window.location.pathname !== "/account" || !accountState.data) return;
  if (accountState.loading && options.allowWhileLoading !== true) return;
  await applyCheckoutParams();
  await applyInvoiceParam();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function setAccountOperation(message, isError = false) {
  if (!accountOperation) return;
  accountOperation.textContent = message || "";
  accountOperation.classList.toggle("is-error", isError);
}

function setAccountBusy(active, message = "") {
  if (!accountBusyRoot) return;
  if (active) {
    accountState.busyCount += 1;
    if (accountState.busyCount > 1) {
      if (message) setAccountOperation(message);
      return;
    }
  } else {
    accountState.busyCount = Math.max(0, accountState.busyCount - 1);
    if (accountState.busyCount > 0) return;
  }

  accountBusyRoot.classList.toggle("is-busy", active);
  accountBusyRoot.setAttribute("aria-busy", String(active));

  accountBusyRoot.querySelectorAll("button, input, textarea, select").forEach((control) => {
    if (active) {
      control.dataset.busyWasDisabled = control.disabled ? "true" : "false";
      control.disabled = true;
    } else {
      const wasDisabled = control.dataset.busyWasDisabled === "true";
      delete control.dataset.busyWasDisabled;
      control.disabled = wasDisabled;
    }
  });

  if (!active && accountSaveButton && accountState.dirty && !isReadOnlyWorkspace()) {
    accountSaveButton.disabled = false;
  }

  if (message) setAccountOperation(message);
}

function setWriteProgress(active, message = "") {
  if (!writeProgress) return;
  writeProgress.hidden = !active;
  writeProgress.textContent = active ? message : "";
  writeProgress.setAttribute("aria-busy", String(active));
}

function setDescriptionProgress(active, message = "") {
  if (!descriptionProgress) return;
  descriptionProgress.hidden = !active;
  descriptionProgress.textContent = active ? message : "";
  descriptionProgress.setAttribute("aria-busy", String(active));
}

function setKeywordProgress(active, message = "") {
  if (!keywordProgress) return;
  keywordProgress.hidden = !active;
  keywordProgress.textContent = active ? message : "";
  keywordProgress.setAttribute("aria-busy", String(active));
}

function setReportProgress(active, message = "") {
  if (!reportProgress) return;
  reportProgress.hidden = !active;
  reportProgress.textContent = active ? message : "";
  reportProgress.setAttribute("aria-busy", String(active));
}

function setTrackingProgress(element, active, message = "") {
  if (!element) return;
  element.hidden = !active;
  element.textContent = active ? message : "";
  element.setAttribute("aria-busy", String(active));
}

function setSettingsPanelProgress(element, active, message = "") {
  if (!element) return;
  element.hidden = !active;
  element.textContent = active ? message : "";
  element.setAttribute("aria-busy", String(active));
}

function showAccountDialog(title, body) {
  if (!accountDialog || !accountDialogTitle || !accountDialogBody) {
    const summary = String(body || "").split("\n").filter(Boolean)[0] || "";
    setAccountOperation(summary ? `${title}: ${summary}` : title);
    return;
  }

  accountDialogTitle.textContent = title;
  accountDialogBody.innerHTML = "";
  accountDialogBody.textContent = body;
  if (accountDialogForm) {
    accountDialogForm.hidden = true;
    accountDialogForm.innerHTML = "";
  }
  accountState.dialogSubmit = null;
  accountDialog.hidden = false;
}

function showReportShareDialog(shareUrl) {
  const normalizedUrl = normalizeLocalReportPath(shareUrl);
  accountState.lastShareUrl = normalizedUrl;
  if (!normalizedUrl) {
    showAccountDialog("Reports share link", "No local report link created.");
    return;
  }

  if (!accountDialog || !accountDialogTitle || !accountDialogBody) {
    showAccountDialog("Reports share link", normalizedUrl);
    return;
  }

  accountDialogTitle.textContent = "Reports share link";
  accountDialogBody.innerHTML = `
    <p>Your local report share link is ready.</p>
    <p><a href="${escapeAttribute(normalizedUrl)}" target="_blank" rel="noreferrer" data-report-share-link>${escapeHtml(normalizedUrl)}</a></p>
    <button type="button" data-report-share-copy="${escapeAttribute(normalizedUrl)}">Copy link</button>
  `;
  if (accountDialogForm) {
    accountDialogForm.hidden = true;
    accountDialogForm.innerHTML = "";
  }
  accountState.dialogSubmit = null;
  accountDialog.hidden = false;
}

function renderReportScheduleChecklist(schedule = {}, template = {}) {
  const recipients = Array.isArray(schedule.recipients) ? schedule.recipients.filter(Boolean) : [];
  const scheduleRows = [
    ["Schedule state", schedule.enabled ? `${schedule.cadence || "weekly"} locally` : "Disabled locally"],
    ["Template", template.label || "Performance summary"],
    ["Recipients", recipients.length ? `${recipients.length} saved recipient${recipients.length === 1 ? "" : "s"}` : "Recipients required before delivery"],
    ["Delivery", "Local schedule metadata only"],
    ["Provider-backed", "Email delivery remains provider-backed"],
  ];
  return `
    <section class="report-schedule-checklist" data-report-schedule-checklist>
      <strong>Delivery setup</strong>
      <p>Save schedule metadata for this workspace. Live email delivery still depends on the connected reporting provider.</p>
      <dl>
        ${scheduleRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    </section>
  `;
}

function showInviteLinkDialog(invite) {
  const inviteUrl = normalizeLocalInviteUrl(invite?.link);
  accountState.lastInviteUrl = inviteUrl;
  if (!inviteUrl) {
    showAccountDialog("Invite link", "Invite link is unavailable.");
    return;
  }

  if (!accountDialog || !accountDialogTitle || !accountDialogBody) {
    showAccountDialog("Invite link", inviteUrl);
    return;
  }

  accountDialogTitle.textContent = "Invite link";
  accountDialogBody.innerHTML = `
    <p>Send this local invite link to ${escapeHtml(invite.email || "your teammate")}.</p>
    <p><a href="${escapeAttribute(inviteUrl)}" target="_blank" rel="noreferrer" data-invite-link>${escapeHtml(inviteUrl)}</a></p>
    <button type="button" data-invite-link-copy="${escapeAttribute(inviteUrl)}">Copy link</button>
  `;
  if (accountDialogForm) {
    accountDialogForm.hidden = true;
    accountDialogForm.innerHTML = "";
  }
  accountState.dialogSubmit = null;
  accountDialog.hidden = false;
}

function showSupportOptionsDialog() {
  const tickets = accountState.data?.supportTickets || [];
  const openTickets = tickets.filter((ticket) => ticket.status !== "resolved").length;
  const totalTickets = tickets.length;
  if (!accountDialog || !accountDialogTitle || !accountDialogBody) {
    showAccountDialog("Support options", "Live chat is not connected yet. Create a local support ticket from the Help panel.");
    return;
  }

  accountDialogTitle.textContent = "Support options";
  accountDialogBody.innerHTML = `
    <p>Live chat is not connected yet. Use the local support queue to keep setup, publishing, billing, and account-access issues attached to this workspace.</p>
    <p class="account-muted" data-support-panel-summary>${openTickets} open · ${totalTickets} total local ticket${totalTickets === 1 ? "" : "s"}</p>
    <div class="support-option-grid">
      <button type="button" data-support-panel-create>Create support ticket</button>
      <button type="button" data-support-panel-view>View ${openTickets || "all"} ticket${openTickets === 1 ? "" : "s"}</button>
    </div>
    <p class="account-muted">Tickets stay local until email or chat delivery is integrated.</p>
  `;
  if (accountDialogForm) {
    accountDialogForm.hidden = true;
    accountDialogForm.innerHTML = "";
  }
  accountState.dialogSubmit = null;
  accountDialog.hidden = false;
}

function showCmsTestDialog(payload = {}) {
  const result = payload.testResult || {};
  const cms = payload.cms || accountState.data?.settings?.cms || {};
  const status = result.status === "provider-pending" ? "Provider pending" : result.status || "Local check";
  const rows = [
    ["Platform", result.platform || cms.platform || "CMS"],
    ["Website", result.websiteUrl || cms.websiteUrl || "Not set"],
    ["Target", result.blogTarget || cms.blogTarget || "Default blog"],
    ["Collection", result.collectionName || cms.collectionName || "Default collection"],
    ["Publishing mode", result.draftFirst === false ? "Auto-publish after approval" : "Draft first"],
    ["Credentials", result.hasCredentials || cms.hasCredentials ? "configured locally" : "missing"],
  ];
  if (!accountDialog || !accountDialogTitle || !accountDialogBody) {
    showAccountDialog("CMS setup", payload.message || "CMS setup checked.");
    return;
  }

  accountDialogTitle.textContent = "CMS setup";
  accountDialogBody.innerHTML = `
    <p>${escapeHtml(payload.message || "CMS setup checked locally.")}</p>
    <div class="provider-result-card" data-cms-test-result>
      <div><strong>${escapeHtml(status)}</strong><span>${escapeHtml(result.checkedAt ? formatDateLabel(result.checkedAt.slice(0, 10)) : "Local test")}</span></div>
      ${rows.map(([label, value]) => `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</p>`).join("")}
    </div>
  `;
  if (accountDialogForm) {
    accountDialogForm.hidden = true;
    accountDialogForm.innerHTML = "";
  }
  accountState.dialogSubmit = null;
  accountDialog.hidden = false;
}

function downloadCsvExport(payload, fallbackFilename, title) {
  const filename = payload.filename || fallbackFilename;
  const content = payload.csv || "";
  accountState.lastDownload = { filename, content, contentType: "text/csv;charset=utf-8" };

  if (content) {
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
    link.download = filename;
    link.hidden = true;
    document.body?.appendChild(link);
    if (typeof link.click === "function") link.click();
    link.remove?.();
  }

  showAccountDialog(title, `${filename} is ready locally.\n\n${content}`);
}

async function copyTextToClipboard(value) {
  const text = String(value || "");
  if (!text || typeof navigator.clipboard?.writeText !== "function") return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function hideAccountDialog() {
  if (!accountDialog) return;
  accountDialog.hidden = true;
  accountState.dialogSubmit = null;
}

function createDialogField(field) {
  const label = document.createElement("label");
  label.textContent = field.label;

  let control;
  if (field.type === "textarea") {
    control = document.createElement("textarea");
    control.rows = field.rows || 4;
  } else if (field.type === "select") {
    control = document.createElement("select");
    (field.options || []).forEach((optionValue) => {
      const optionData = typeof optionValue === "object" ? optionValue : { value: optionValue, label: optionValue };
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      control.appendChild(option);
    });
  } else {
    control = document.createElement("input");
    control.type = field.type || "text";
  }

  control.name = field.name;
  control.value = field.value == null ? "" : field.value;
  control.placeholder = field.placeholder || "";
  control.required = field.required === true;
  if (field.min !== undefined) control.min = field.min;
  if (field.max !== undefined) control.max = field.max;
  if (field.step !== undefined) control.step = field.step;
  label.appendChild(control);
  return label;
}

function showAccountForm({ title, body, bodyHtml = "", fields = [], submitText = "Save", dangerText = "", extraActions = [], onSubmit, onDanger }) {
  if (!accountDialog || !accountDialogTitle || !accountDialogBody || !accountDialogForm) return;

  accountDialogTitle.textContent = title;
  if (bodyHtml) {
    accountDialogBody.innerHTML = bodyHtml;
  } else {
    accountDialogBody.textContent = body || "";
  }
  accountDialogForm.innerHTML = "";
  fields.forEach((field) => accountDialogForm.appendChild(createDialogField(field)));

  const actions = document.createElement("div");
  actions.className = "account-dialog-actions";

  if (dangerText) {
    const dangerButton = document.createElement("button");
    dangerButton.type = "button";
    dangerButton.className = "account-dialog-danger";
    dangerButton.textContent = dangerText;
    dangerButton.addEventListener("click", async () => {
      try {
        await onDanger?.();
        hideAccountDialog();
      } catch (error) {
        setAccountOperation(error.message, true);
      }
    });
    actions.appendChild(dangerButton);
  }

  extraActions.forEach((action) => {
    const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.textContent = action.label;
    actionButton.addEventListener("click", async () => {
      try {
        await action.onClick?.();
        if (!action.keepOpenAfterClick) hideAccountDialog();
      } catch (error) {
        setAccountOperation(error.message, true);
      }
    });
    actions.appendChild(actionButton);
  });

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", hideAccountDialog);
  actions.appendChild(cancelButton);

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.className = "account-dialog-submit";
  submitButton.textContent = submitText;
  actions.appendChild(submitButton);
  accountDialogForm.appendChild(actions);

  accountState.dialogSubmit = onSubmit;
  accountDialogForm.hidden = false;
  accountDialog.hidden = false;

  const firstControl = accountDialogForm.querySelector("input, textarea, select");
  if (firstControl) firstControl.focus();
}

function showConfirmDialog(title, body, confirmText, onConfirm, options = {}) {
  showAccountForm({
    title,
    body,
    bodyHtml: options.bodyHtml || "",
    submitText: confirmText,
    onSubmit: onConfirm,
  });
}

function renderArticleLifecycleConfirmHtml({ summary = "", rows = [] } = {}) {
  const actionRows = [
    ["Request", "Protected account API"],
    ["Progress", "Shows progress while the protected request runs"],
    ["Failure", "Protected request errors appear in the account status line"],
    ["Success", "Refreshes local account state after success"],
  ];
  return `
    <section class="article-lifecycle-confirm" data-article-lifecycle-confirm>
      <strong>Lifecycle confirmation</strong>
      <p>${escapeHtml(summary)}</p>
      <dl>
        ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <div class="article-confirm-action-state" data-article-confirm-action-state>
        <strong>Action readiness</strong>
        <dl>
          ${actionRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    </section>
  `;
}

function renderArticleLifecycleRows(item = {}) {
  const status = item.status || "draft";
  const readiness = articleReadiness(item);
  const publishBlockers = status === "published" ? [] : articlePublishBlockers(item);
  const publicPath = item.publicPath && isLocalBlogPath(item.publicPath) ? item.publicPath : "";
  const generatedLabel = item.generatedAt ? `Generated ${formatDateLabel(item.generatedAt.slice(0, 10))}` : "Not generated";
  const updatedLabel = item.updatedAt ? `Updated ${formatDateLabel(item.updatedAt.slice(0, 10))}` : "Not updated";
  const cms = accountState.data?.settings?.cms || {};
  const cmsConnected = cms.status === "connected";
  const cmsMode = cmsConnected ? (cms.draftFirst === false ? "Auto-publish" : "Draft first") : "CMS pending";
  return [
    ["Title", item.title || "Untitled article"],
    ["Status", articleStatusLabel(status)],
    ["Schedule", formatScheduledDateTimeLabel(item.scheduledDate, item.scheduledTime)],
    ["Public URL", publicPath || "Not published"],
    ["CMS", cmsConnected ? "CMS connected" : "CMS not connected"],
    ["Publish mode", cmsMode],
    ["Readiness", readinessText(readiness)],
    ["Blockers", publishBlockers.length ? publishBlockers.join(" ") : "No lifecycle blocker"],
    ["Generation", generatedLabel],
    ["Last update", updatedLabel],
    ["Issue", item.lastError || "No active issue"],
    ["SEO title", item.seoTitle || "Not set"],
    ["Meta description", item.metaDescription || "Not set"],
    ["Body", item.body || item.brief || "Not generated yet"],
    ["Action progress", "Shows progress while the protected request runs"],
    ["Target evidence gap", "Exact drawer loading and success states still need target screenshot evidence"],
  ];
}

async function showArticleLifecycleDetail(postId) {
  if (!postId) return;
  const detail = await requestJson(`/api/account/blog/posts/${postId}`);
  const item = detail.post;
  if (!item) return;
  const rows = renderArticleLifecycleRows(item);

  showAccountForm({
    title: "Article lifecycle detail",
    bodyHtml: `
      <div class="article-lifecycle-detail-card" data-article-lifecycle-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function workspaceRoleSummary(workspaces = []) {
  return Object.entries(workspaces.reduce((counts, workspace) => {
    const role = workspace.role || "member";
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {}))
    .sort(([a], [b]) => (a === "owner" ? -1 : b === "owner" ? 1 : a.localeCompare(b)))
    .map(([role, count]) => `${count} ${role}${count === 1 ? "" : "s"}`)
    .join(" · ");
}

function selectedWorkspaceForActions(workspaces = []) {
  const selectedId = accountState.selectedWorkspaceId || workspaces.find((workspace) => workspace.selected)?.id || workspaces[0]?.id || "";
  return workspaces.find((workspace) => workspace.id === selectedId) || workspaces.find((workspace) => workspace.selected) || workspaces[0] || {};
}

function workspaceActionDetailRows(workspaces = accountState.workspaces || []) {
  const safeWorkspaces = workspaces.length
    ? workspaces
    : accountState.data
      ? [{ id: accountState.data.id, workspaceName: accountState.data.workspaceName, ownerEmail: accountState.data.ownerEmail, role: "owner", selected: true }]
      : [];
  const selectedWorkspace = selectedWorkspaceForActions(safeWorkspaces);
  const selectedName = selectedWorkspace.workspaceName || selectedWorkspace.ownerEmail || "Untitled workspace";
  const account = accountState.data || {};
  const activeMembers = (account.members || []).filter((member) => (member.status || "active") === "active").length;
  const pendingInvites = (account.invites || []).filter((invite) => (invite.status || "pending") === "pending").length;
  const activityCount = (account.activityLog || []).length;
  const readOnly = (selectedWorkspace.role || "member") === "member";

  return [
    ["Selected workspace", selectedName],
    ["Workspace count", `${safeWorkspaces.length.toLocaleString()} workspace${safeWorkspaces.length === 1 ? "" : "s"}`],
    ["Role mix", workspaceRoleSummary(safeWorkspaces) || "1 member"],
    ["Add site", readOnly ? "Owner access required" : "Available locally"],
    ["Invite team", `${readOnly ? "Owner access required · " : ""}${pendingInvites.toLocaleString()} pending invite${pendingInvites === 1 ? "" : "s"}`],
    ["Role control", `${readOnly ? "Owner access required · " : ""}${activeMembers.toLocaleString()} active member${activeMembers === 1 ? "" : "s"}`],
    ["Team activity", `${activityCount.toLocaleString()} recent update${activityCount === 1 ? "" : "s"}`],
    ["Target evidence gap", "Exact workspace selector order and multi-site add flow still need target screenshot evidence"],
  ];
}

function showWorkspaceActionDetail() {
  const rows = workspaceActionDetailRows();

  showAccountForm({
    title: "Workspace actions detail",
    bodyHtml: `
      <div class="workspace-action-detail-card" data-workspace-action-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function renderWorkspaceSwitchList(workspaces = []) {
  if (!workspaces.length) {
    return '<p class="account-muted">No available workspaces were found for this account.</p>';
  }

  const selectedId = accountState.selectedWorkspaceId || workspaces.find((workspace) => workspace.selected)?.id || workspaces[0]?.id || "";
  const selectedWorkspace = selectedWorkspaceForActions(workspaces);
  const selectedName = selectedWorkspace?.workspaceName || selectedWorkspace?.ownerEmail || "Untitled workspace";
  const roleSummary = workspaceRoleSummary(workspaces);
  const account = accountState.data || {};
  const activeMembers = (account.members || []).filter((member) => (member.status || "active") === "active").length;
  const pendingInvites = (account.invites || []).filter((invite) => (invite.status || "pending") === "pending").length;
  const activityCount = (account.activityLog || []).length;
  const teamSummaryRows = [
    ["Team members", `${activeMembers.toLocaleString()} active`],
    ["Pending invites", `${pendingInvites.toLocaleString()} pending`],
    ["Recent activity", `${activityCount.toLocaleString()} update${activityCount === 1 ? "" : "s"}`],
  ];
  const readOnly = (selectedWorkspace?.role || "member") === "member";
  const workspaceActionRows = [
    ["Add site", readOnly ? "Owner access required" : "Ready to create workspace"],
    ["Invite team", readOnly ? "Owner access required" : `${pendingInvites.toLocaleString()} pending invite${pendingInvites === 1 ? "" : "s"}`],
    ["Role controls", readOnly ? "Owner access required" : `${activeMembers.toLocaleString()} active member${activeMembers === 1 ? "" : "s"}`],
    ["Activity", `${activityCount.toLocaleString()} recent update${activityCount === 1 ? "" : "s"}`],
  ];
  return `
    <div class="workspace-switch-summary" data-workspace-switch-summary>
      <span>Selected workspace</span>
      <strong>${escapeHtml(selectedName)}</strong>
      <p>${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"} · ${escapeHtml(roleSummary || "1 member")} · Add site workspace</p>
      <dl>
        ${teamSummaryRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <section class="workspace-action-state" data-workspace-action-state>
        <button class="workspace-action-detail-link" type="button" data-workspace-action-detail="true">
          <strong>Workspace actions</strong>
        </button>
        <dl>
          ${workspaceActionRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </section>
    </div>
    <p>${workspaces.length > 1 ? "Choose which accepted workspace this account should manage." : "This account currently has one available workspace."}</p>
    <div class="workspace-switch-list" data-workspace-switch-list>
      ${workspaces
        .map((workspace) => {
          const selected = workspace.id === selectedId || (!selectedId && workspace.selected);
          const name = workspace.workspaceName || workspace.ownerEmail || "Untitled workspace";
          const owner = workspace.ownerEmail || "No owner email";
          const role = workspace.role || "member";
          return `<div class="workspace-switch-row">
            <button type="button" data-workspace-switch-select="${escapeAttribute(workspace.id)}" ${selected ? "disabled" : ""}>
              <span><strong>${escapeHtml(name)}</strong><p>${escapeHtml(owner)} · ${escapeHtml(role)}</p></span>
              <em>${selected ? "Selected" : "Switch"}</em>
            </button>
          </div>`;
        })
        .join("")}
    </div>
  `;
}

function showCreateWorkspaceForm() {
  showAccountForm({
    title: "Add site workspace",
    body: "Create another local workspace for a separate site. This is local account state; billing and publishing providers are not changed.",
    submitText: "Create workspace",
    fields: [
      { name: "workspaceName", label: "Workspace name", placeholder: "Second Site", required: true },
      { name: "websiteUrl", label: "Website URL", placeholder: "https://example.com" },
    ],
    onSubmit: async (values) => {
      await postAccountAction("/api/account/workspaces", {
        workspaceName: values.workspaceName,
        websiteUrl: values.websiteUrl,
      });
      setAccountOperation("Workspace added locally.");
    },
  });
}

function showCtaForm() {
  const cta = accountState.data?.settings?.cta || {};
  showAccountForm({
    title: "Edit call to action",
    body: "Save the CTA that generated articles can include. URL, placement, style, and tracking are validated by the local settings API.",
    submitText: "Save CTA",
    fields: [
      { name: "enabled", label: "Enabled", type: "select", value: cta.enabled ? "true" : "false", options: [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }] },
      { name: "label", label: "CTA label", value: cta.label || "", placeholder: "Free consultation" },
      { name: "text", label: "CTA text", value: cta.text || "", placeholder: "Book a call" },
      { name: "url", label: "CTA URL", type: "url", value: cta.url || "", placeholder: "https://example.com/contact" },
      { name: "placement", label: "Placement", type: "select", value: cta.placement || "end", options: [{ value: "end", label: "End of article" }, { value: "start", label: "Start of article" }, { value: "inline", label: "After intro" }, { value: "sidebar", label: "Sidebar card" }] },
      { name: "style", label: "Style", type: "select", value: cta.style || "button", options: [{ value: "button", label: "Button" }, { value: "banner", label: "Banner" }, { value: "text-link", label: "Text link" }] },
      { name: "openInNewTab", label: "Open behavior", type: "select", value: cta.openInNewTab === false ? "false" : "true", options: [{ value: "true", label: "Open in new tab" }, { value: "false", label: "Same tab" }] },
      { name: "trackingLabel", label: "Tracking label", value: cta.trackingLabel || "", placeholder: "pricing_cta" },
    ],
    onSubmit: async (values) => {
      const payload = {
        cta: {
          enabled: values.enabled === "true",
          label: values.label || "",
          text: values.text || "",
          url: values.url || "",
          placement: values.placement || "end",
          style: values.style || "button",
          openInNewTab: values.openInNewTab !== "false",
          trackingLabel: values.trackingLabel || "",
        },
      };
      const response = await requestJson("/api/account/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (response.account) {
        accountState.data = response.account;
        renderAccountData();
      } else {
        accountState.data.settings = response.settings || { ...(accountState.data.settings || {}), ...payload };
        renderSettings(accountState.data);
      }
      setAccountOperation("CTA saved locally.");
    },
  });
}

function ctaPlacementLabels() {
  return {
    start: "Start of article",
    inline: "After intro",
    sidebar: "Sidebar card",
    end: "End of article",
  };
}

function ctaStyleLabel(style) {
  if (style === "text-link") return "Text link";
  if (style === "banner") return "Banner";
  return "Button";
}

function showCtaDetail() {
  const cta = accountState.data?.settings?.cta || {};
  const placementLabels = ctaPlacementLabels();
  const enabled = Boolean(cta.enabled);
  const text = cta.text || "Get started";
  const bodyHtml = `
    <div class="cta-detail-card" data-cta-detail-card>
      <p><b>Status:</b> ${enabled ? "Enabled" : "Disabled"}</p>
      <p><b>Label:</b> ${escapeHtml(cta.label || "Not set")}</p>
      <p><b>Text:</b> ${escapeHtml(text)}</p>
      <p><b>URL:</b> ${cta.url ? `<a href="${escapeAttribute(cta.url)}" target="_blank" rel="noopener">${escapeHtml(cta.url)}</a>` : "Not set"}</p>
      <p><b>Placement:</b> ${escapeHtml(placementLabels[cta.placement] || placementLabels.end)}</p>
      <p><b>Style:</b> ${escapeHtml(ctaStyleLabel(cta.style))}</p>
      <p><b>Open behavior:</b> ${cta.openInNewTab === false ? "Same tab" : "Open in new tab"}</p>
      <p><b>Tracking label:</b> ${escapeHtml(cta.trackingLabel || "Not set")}</p>
    </div>
  `;
  const extraActions = isReadOnlyWorkspace()
    ? []
    : [
        {
          label: "Edit CTA",
          keepOpenAfterClick: true,
          onClick: showCtaForm,
        },
      ];

  showAccountForm({
    title: "CTA detail",
    bodyHtml,
    submitText: "Close",
    extraActions,
    onSubmit: async () => {},
  });
}

function cmsPlatformMeta(platform = "WordPress") {
  const meta = {
    WordPress: {
      body: "Use a WordPress application password or publishing token. Local setup stores metadata only and keeps draft-first publishing on.",
      urlLabel: "WordPress site URL",
      usernameLabel: "WordPress username or account email",
      targetLabel: "Blog or post type target",
      collectionLabel: "Category or collection name",
      secretLabel: "Application password or publishing token",
      credentialRequirement: "Application password or publishing token",
    },
    Webflow: {
      body: "Use the Webflow site URL and API token metadata. Real collection selection still needs provider comparison.",
      urlLabel: "Webflow site URL",
      usernameLabel: "Webflow site ID or account email",
      targetLabel: "Collection target",
      collectionLabel: "Collection ID or slug",
      secretLabel: "Webflow API token",
      credentialRequirement: "Webflow API token with CMS collection access",
    },
    Shopify: {
      body: "Use Shopify Admin API metadata for the blog store. Real Admin API validation and publish targets remain provider work.",
      urlLabel: "Shopify store URL",
      usernameLabel: "Shopify admin email or staff account",
      targetLabel: "Blog or collection target",
      collectionLabel: "Collection or post type",
      secretLabel: "Admin API access token",
      credentialRequirement: "Admin API access token",
    },
    Wix: {
      body: "Use Wix site metadata and an API token placeholder. Real Wix app/OAuth validation remains provider work.",
      urlLabel: "Wix site URL",
      usernameLabel: "Wix account email or site ID",
      targetLabel: "Blog target",
      collectionLabel: "Collection or category",
      secretLabel: "Wix API token",
      credentialRequirement: "Wix API token or app credential",
    },
    Ghost: {
      body: "Use Ghost Admin API metadata for draft-first publishing. Real Ghost key validation remains provider work.",
      urlLabel: "Ghost site URL",
      usernameLabel: "Ghost admin email",
      targetLabel: "Publication target",
      collectionLabel: "Tag or collection",
      secretLabel: "Ghost Admin API key",
      credentialRequirement: "Ghost Admin API key",
    },
    "Custom API": {
      body: "Use a custom HTTPS endpoint and token metadata. Real request mapping, headers, and payload schema still need capture.",
      urlLabel: "Custom API base URL",
      usernameLabel: "Account identifier or integration name",
      targetLabel: "Endpoint target",
      collectionLabel: "Content type or route",
      secretLabel: "Bearer token or API key",
      credentialRequirement: "Bearer token or API key for the publishing endpoint",
    },
  };

  return meta[platform] || meta.WordPress;
}

function renderCmsProviderChecklist(platformMeta = cmsPlatformMeta()) {
  const checklistRows = [
    ["Store URL", platformMeta.urlLabel],
    ["Admin account", platformMeta.usernameLabel],
    ["Blog or collection target", platformMeta.targetLabel],
    ["Collection picker", platformMeta.collectionLabel],
    ["Publishing mode", "Draft first until the provider confirms access"],
    ["Required credential", platformMeta.credentialRequirement || platformMeta.secretLabel],
    ["Error surface", "Missing or rejected credentials stay visible as a provider error"],
    ["Secret handling", "Accepted once; never displayed back"],
  ];

  return `
    <div class="cms-provider-checklist" data-cms-provider-checklist>
      <strong>Provider checklist</strong>
      <p>${escapeHtml(platformMeta.body)} Secret values are accepted to mark credentials configured, but the local dashboard does not return or display them.</p>
      <dl>
        ${checklistRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    </div>
  `;
}

function showCmsProviderDetail() {
  const cms = accountState.data?.settings?.cms || {};
  const platform = cms.platform || "WordPress";
  const platformMeta = cmsPlatformMeta(platform);
  const missingChecks = [
    cms.websiteUrl ? "" : "Website URL required",
    cms.platform ? "" : "Platform required",
    cms.hasCredentials ? "" : "Credential metadata missing",
  ].filter(Boolean);
  const status = cms.lastError ? "Needs attention" : cms.status === "connected" ? "Provider test pending" : "Local setup only";
  const publishMode = cms.draftFirst === false ? "Auto-publish after approval" : "Draft first";
  const rows = [
    ["Platform", platform],
    ["Provider URL field", platformMeta.urlLabel],
    ["Website URL", cms.websiteUrl || "Not set"],
    ["Admin account", cms.username || "Not set"],
    ["Target", cms.blogTarget || platformMeta.targetLabel],
    ["Collection", cms.collectionName || platformMeta.collectionLabel],
    ["Publishing mode", publishMode],
    ["Required credential", platformMeta.credentialRequirement || platformMeta.secretLabel],
    ["Credentials", cms.hasCredentials ? "configured" : "missing"],
    ["Missing checks", missingChecks.length ? missingChecks.join(" · ") : "No local metadata gaps"],
    ["Provider status", status],
    ["Provider error", cms.lastError || "Missing or rejected credentials stay visible as a provider error"],
    ["Error surface", "Missing or rejected credentials stay visible as a provider error"],
    ["Secret handling", "Secret values are never displayed"],
    ["Target evidence gap", "Exact provider-form validation copy still needs target screenshot evidence"],
  ];

  showAccountForm({
    title: "CMS provider detail",
    bodyHtml: `
      <div class="cms-provider-detail-card" data-cms-provider-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function showTopicForm({ addToPlan = false } = {}) {
  showAccountForm({
    title: addToPlan ? "Add topic to plan" : "Add topic",
    body: addToPlan
      ? "Create a topic and schedule it on the content plan immediately."
      : "Save a topic idea so it can be added to the plan later.",
    submitText: addToPlan ? "Create and schedule" : "Save topic",
    fields: [
      { name: "title", label: "Topic title", required: true },
      { name: "keyword", label: "Target keyword" },
      { name: "volume", label: "Search volume", type: "number", value: 0 },
      { name: "cpc", label: "CPC", type: "number", value: 0, min: 0, step: 0.01 },
      { name: "difficultyScore", label: "Difficulty score", type: "number", value: 50, min: 0, max: 100, step: 1 },
      { name: "difficulty", label: "Difficulty", type: "select", value: "Needs review", options: topicDifficultyOptions },
      { name: "competition", label: "Competition", type: "number", value: 0, min: 0, max: 1, step: 0.01 },
    ],
    onSubmit: async (values) => {
      const created = await postAccountAction("/api/account/topics", values);
      const topic = created.topics?.[0];

      if (addToPlan && topic) {
        await postAccountAction(`/api/account/topics/${topic.id}/add`);
        setAccountView("plan");
        setAccountOperation("Topic created and scheduled.");
      } else {
        setAccountView("topics");
        setAccountOperation("Topic saved.");
      }

      if (topicSearchInput) topicSearchInput.value = "";
    },
  });
}

function formatVolume(value) {
  const number = Number(value || 0);
  return number >= 1000 ? `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k/mo` : `${number}/mo`;
}

function contentCardDifficultyLabel(value) {
  const label = String(value || "").trim();
  return label === "Easy" ? "Easy to rank" : label || "Needs review";
}

function isLocalBlogPath(value) {
  return /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || "").trim());
}

function normalizeLocalReportPath(value) {
  const path = String(value || "").trim();
  return /^\/reports\/report_[A-Za-z0-9_-]+$/.test(path) ? path : "";
}

function normalizeLocalInviteUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  try {
    const url = new URL(rawValue, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    if (!/^\/invite\/[A-Za-z0-9_-]+$/.test(url.pathname)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function formatDateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || "Unscheduled";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatScheduledDateTimeLabel(dateValue, timeValue) {
  const dateLabel = formatDateLabel(dateValue);
  const timeLabel = String(timeValue || "").trim();
  return timeLabel ? `${dateLabel} at ${timeLabel}` : dateLabel;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === '"') return "&quot;";
    return "&#39;";
  });
}

const blockedAccountCopyPatterns = [
  ["Dut", "chie"].join(""),
  ["dispen", "sary"].join(""),
  ["can", "nabis"].join(""),
  ["live ", "P", "OS"].join(""),
  ["\\b", "P", "OS", "\\b"].join(""),
  ["point of ", "sale"].join(""),
].map((source) => new RegExp(source, "i"));

function hasBlockedAccountCopy(value) {
  return blockedAccountCopyPatterns.some((pattern) => pattern.test(String(value || "")));
}

function productHasBlockedAccountCopy(product = {}) {
  return ["name", "category", "description", "sku", "audience", "source", "url"].some((field) => hasBlockedAccountCopy(product[field]));
}

function scrubAccountData(account) {
  if (!account || typeof account !== "object") return account;
  const inventoryFeed = account.inventoryFeed || {};
  const blockedInventoryFeed = hasBlockedAccountCopy([inventoryFeed.retailerName, inventoryFeed.accountId, inventoryFeed.lastError].join(" "));

  if (blockedInventoryFeed) {
    account.inventoryFeed = {
      status: "disconnected",
      retailerName: "",
      accountId: "",
      hasCredentials: false,
      lastConnectedAt: "",
      lastSyncedAt: "",
      lastError: "",
    };
  }

  if (Array.isArray(account.products)) {
    account.products = account.products.filter((product) => {
      if (productHasBlockedAccountCopy(product)) return false;
      if (blockedInventoryFeed && product.source === "inventory-feed") return false;
      return true;
    });
  }

  return account;
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function weekRangeLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatDateLabel(start.toISOString().slice(0, 10))} - ${formatDateLabel(end.toISOString().slice(0, 10))}`;
}

function startOfWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function currentAccount() {
  return accountState.data || {};
}

function getNested(source, path) {
  return path.split(".").reduce((value, key) => (value == null ? value : value[key]), source);
}

function setToggle(button, active) {
  button.classList.toggle("is-on", active);
  button.setAttribute("aria-pressed", String(active));
}

function getSettingsPayload() {
  const account = currentAccount();
  const settings = account.settings || {};
  const site = settings.site || {};
  const images = settings.images || {};
  const cms = settings.cms || {};
  const cta = settings.cta || {};

  const payload = {
    site: {
      ...site,
      keywords: Array.isArray(site.keywords) ? site.keywords : [],
    },
    images: { ...images },
    cms: { ...cms },
    cta: { ...cta },
  };

  settingsFieldInputs.forEach((input) => {
    const [section, field] = input.dataset.settingsField.split(".");
    if (!payload[section]) payload[section] = {};
    payload[section][field] = section === "cta" && field === "openInNewTab" ? input.value === "true" : input.type === "range" ? Number(input.value) : input.value;
  });

  settingsToggleButtons.forEach((button) => {
    const [section, field] = button.dataset.settingsToggle.split(".");
    if (!payload[section]) payload[section] = {};
    payload[section][field] = button.classList.contains("is-on");
  });

  return payload;
}

function getWriteDraftPayload(extra = {}) {
  const payload = Object.fromEntries(writeFieldInputs.map((input) => [input.dataset.writeField, input.value]));
  if (payload.wordCount) payload.wordCount = Number(payload.wordCount);
  const sourcePostId = accountState.data?.writeDraft?.sourcePostId || "";
  if (sourcePostId) payload.sourcePostId = sourcePostId;
  const sourceStatus = accountState.data?.writeDraft?.sourceStatus || "";
  if (sourceStatus) payload.sourceStatus = sourceStatus;
  return { ...payload, ...extra };
}

function blogPostToWriteDraft(post = {}) {
  return {
    sourcePostId: post.id || "",
    title: post.title || "",
    slug: post.slug || "",
    keyword: post.keyword || "",
    category: post.category || "",
    excerpt: post.excerpt || "",
    canonicalUrl: post.canonicalUrl || "",
    authorName: post.authorName || "",
    scheduledDate: post.scheduledDate || "",
    scheduledTime: post.scheduledTime || "",
    template: post.template || "how-to",
    audience: post.audience || "Local small business owners",
    wordCount: post.wordCount || 1200,
    volume: post.volume || 0,
    difficulty: post.difficulty || "Needs review",
    estimatedVisits: post.estimatedVisits || 0,
    internalLinks: post.internalLinks || "",
    seoTitle: post.seoTitle || "",
    metaDescription: post.metaDescription || "",
    featuredImageUrl: post.featuredImageUrl || "",
    featuredImageAlt: post.featuredImageAlt || "",
    brief: post.brief || "",
    body: post.body || "",
    notes: post.notes || "",
    preview: post.preview || "",
    previewedAt: post.previewedAt || "",
    previewStatus: post.previewStatus || "",
    generatedAt: post.generatedAt || "",
    updatedAt: post.updatedAt || "",
    lastError: post.lastError || "",
    sourceStatus: post.status || "draft",
    status: "draft",
  };
}

function openFreshArticleBuilderDraft() {
  if (!accountState.data) return;
  accountState.data.writeDraft = {};
  renderWriteDraft(accountState.data);
  setAccountView("write");
}

function writeDraftToEditorPostPayload(draft = {}) {
  return {
    title: draft.title,
    slug: draft.slug,
    keyword: draft.keyword,
    category: draft.category,
    excerpt: draft.excerpt,
    canonicalUrl: draft.canonicalUrl,
    authorName: draft.authorName,
    scheduledDate: draft.scheduledDate,
    scheduledTime: draft.scheduledTime,
    volume: draft.volume || 0,
    difficulty: draft.difficulty || "Needs review",
    estimatedVisits: draft.estimatedVisits || 0,
    internalLinks: draft.internalLinks,
    seoTitle: draft.seoTitle,
    metaDescription: draft.metaDescription,
    featuredImageUrl: draft.featuredImageUrl,
    featuredImageAlt: draft.featuredImageAlt,
    brief: draft.brief,
    body: draft.body || draft.preview || "",
    notes: draft.notes,
    status: draft.sourcePostId ? draft.sourceStatus || draft.status || "draft" : "draft",
  };
}

function articleReadiness(draft = {}) {
  if (draft.readiness) return draft.readiness;
  const links = String(draft.internalLinks || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const checks = [
    ["Working title", draft.title],
    ["Target keyword", draft.keyword],
    ["Slug", draft.slug],
    ["Schedule date", draft.scheduledDate],
    ["SEO title", draft.seoTitle],
    ["Meta description", draft.metaDescription],
    ["Draft body or brief", draft.body || draft.brief],
    ["Internal links", links.length ? links.join(", ") : ""],
  ];
  const complete = checks.filter(([, value]) => Boolean(String(value || "").trim())).map(([label]) => label);
  const missing = checks.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
  const score = Math.round((complete.length / checks.length) * 100);
  return {
    score,
    status: missing.length === 0 ? "ready" : score >= 70 ? "nearly_ready" : "needs_work",
    complete,
    missing,
  };
}

function readinessText(readiness) {
  const missing = readiness.missing || [];
  return `${Number(readiness.score || 0)}% ready${missing.length ? ` · Missing: ${missing.slice(0, 3).join(", ")}` : " · All core fields set"}`;
}

function articlePublishBlockers(item = {}) {
  const blockers = [];
  if (!String(item.title || "").trim()) blockers.push("Article title is required before publishing.");
  if (!String(item.slug || "").trim()) blockers.push("Article slug is required before publishing.");
  if (!String(item.body || "").trim()) blockers.push("Article body is required before publishing.");
  if (item.scheduledDate && Date.parse(`${item.scheduledDate}T00:00:00Z`) > Date.now()) {
    blockers.push("Scheduled date must be today or in the past before publishing.");
  }
  return blockers;
}

function renderArticleBuilderPreview(draft = {}) {
  if (!articlePreview) return;

  const title = draft.title || "Untitled article";
  const readiness = articleReadiness(draft);
  const meta = [
    draft.keyword || "No keyword set",
    draft.category || "Uncategorized",
    draft.slug ? `/blog/${draft.slug}` : "Slug pending",
  ];
  const body = draft.body || draft.preview || draft.brief || "Draft body or brief preview will appear here.";
  const schedule = draft.scheduledDate
    ? `${formatDateLabel(draft.scheduledDate)}${draft.scheduledTime ? ` at ${draft.scheduledTime}` : ""}`
    : "Unscheduled";

  if (articlePreviewTitle) articlePreviewTitle.textContent = title;
  if (articlePreviewMeta) articlePreviewMeta.textContent = meta.join(" · ");
  if (articlePreviewReadiness) articlePreviewReadiness.textContent = readinessText(readiness);
  if (articlePreviewBody) articlePreviewBody.textContent = body;
  if (articlePreviewSchedule) articlePreviewSchedule.textContent = schedule;
  if (articleBuilderReadinessSummary) articleBuilderReadinessSummary.textContent = readinessText(readiness);
  if (articleBuilderScheduleSummary) articleBuilderScheduleSummary.textContent = schedule;
  if (articleBuilderUrlSummary) articleBuilderUrlSummary.textContent = draft.slug ? `/blog/${draft.slug}` : "Slug pending";
}

function renderArticleGeneratedActions(draft = {}, readOnly = false) {
  if (!articleGeneratedActions) return;

  const hasGeneratedState = Boolean(draft.sourcePostId || draft.body || draft.preview || draft.status === "queued");
  articleGeneratedActions.hidden = !hasGeneratedState;
  if (!hasGeneratedState) {
    articleGeneratedActions.innerHTML = "";
    return;
  }

  const sourceDisabled = readOnly || !draft.sourcePostId;
  const disabled = readOnly ? "disabled" : "";
  const sourceDisabledAttribute = sourceDisabled ? "disabled" : "";
  articleGeneratedActions.innerHTML = `
    <button type="button" data-account-action="save-builder-draft" ${disabled}>Save draft</button>
    <button type="button" data-account-action="schedule-builder-article" ${sourceDisabledAttribute}>Schedule</button>
    <button type="button" data-account-action="publish-builder-article" ${sourceDisabledAttribute}>Publish</button>
    <button type="button" data-account-action="regenerate-builder-article" ${sourceDisabledAttribute}>Regenerate</button>
  `;
}

function renderIconActionButton({ action, postId, label, icon, disabled = "" }) {
  const className = action === "delete" ? "icon-action is-danger" : "icon-action";
  return `<button class="${className}" type="button" data-blog-action="${escapeAttribute(action)}" data-blog-post-id="${escapeAttribute(postId)}" aria-label="${escapeAttribute(label)}" title="${escapeAttribute(label)}" ${disabled}><span aria-hidden="true">${escapeHtml(icon)}</span></button>`;
}

function renderBlogMenuActionButton({ action, postId, label, disabled = "" }) {
  return `<button type="button" data-blog-menu-action="${escapeAttribute(action)}" data-blog-post-id="${escapeAttribute(postId)}" ${disabled}>${escapeHtml(label)}</button>`;
}

function updateInviteGenerateState() {
  if (!inviteGenerateAction) return;
  const hasEmail = Boolean(String(inviteEmailInput?.value || "").trim());
  inviteGenerateAction.disabled = isReadOnlyWorkspace() || !hasEmail;
}

function articleStatusLabel(status) {
  const value = String(status || "scheduled");
  const labels = {
    draft: "Generated",
    failed: "Needs attention",
  };
  return labels[value] || value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderArticleSourceSummary(draft = {}) {
  if (!articleSourceSummary) return;

  const hasGeneratedState = Boolean(draft.sourcePostId || draft.body || draft.preview || draft.status === "queued");
  articleSourceSummary.hidden = !hasGeneratedState;
  if (!hasGeneratedState) {
    articleSourceSummary.innerHTML = "";
    return;
  }

  const readiness = articleReadiness(draft);
  const schedule = draft.scheduledDate
    ? `${formatDateLabel(draft.scheduledDate)}${draft.scheduledTime ? ` at ${draft.scheduledTime}` : ""}`
    : "Unscheduled";
  const publicUrl = draft.slug ? `/blog/${draft.slug}` : "Slug pending";
  const sourceLabel = draft.sourcePostId ? "Content Plan source" : draft.preview ? "Brief preview source" : "Local editor source";

  articleSourceSummary.innerHTML = `
    <div>
      <span>Generated article</span>
      <strong>${escapeHtml(draft.title || "Untitled article")}</strong>
      <p>${escapeHtml(sourceLabel)} · ${escapeHtml(readinessText(readiness))}</p>
    </div>
    <dl>
      <div><dt>Status</dt><dd>${escapeHtml(articleStatusLabel(draft.status || draft.sourceStatus || "draft"))}</dd></div>
      <div><dt>Schedule</dt><dd>${escapeHtml(schedule)}</dd></div>
      <div><dt>URL</dt><dd>${escapeHtml(publicUrl)}</dd></div>
    </dl>
  `;
}

function showArticleGenerationDetail() {
  const draft = accountState.data?.writeDraft || {};
  const defaultPublishTime = accountState.data?.settings?.site?.defaultPublishTime || "";
  const scheduledTime = draft.scheduledTime || defaultPublishTime;
  const schedule = draft.scheduledDate
    ? `${formatDateLabel(draft.scheduledDate)}${scheduledTime ? ` at ${scheduledTime}` : ""}`
    : "Unscheduled";
  const readiness = articleReadiness({ ...draft, scheduledTime });
  const previewStatus = draft.previewStatus === "provider-pending"
    ? "Provider pending"
    : draft.previewStatus === "error"
      ? "Provider error"
      : draft.preview
        ? "Local preview"
        : "Editor body";
  const cms = accountState.data?.settings?.cms || {};
  const providerHandoff = cms.status === "connected" ? "CMS metadata connected" : "Local only; CMS pending";
  const publicUrl = draft.canonicalUrl || (draft.slug ? `/blog/${draft.slug}` : "Slug pending");
  const rows = [
    ["Title", draft.title || "Untitled article"],
    ["Body", draft.body || draft.preview || draft.brief || "Body empty"],
    ["SEO title", draft.seoTitle || "Not set"],
    ["Meta description", draft.metaDescription || "Not set"],
    ["Featured image", draft.featuredImageAlt || draft.featuredImageUrl || "No featured image"],
    ["Schedule", schedule],
    ["Public URL", publicUrl],
    ["Readiness", readinessText(readiness)],
    ["Preview", previewStatus],
    ["Provider handoff", providerHandoff],
    ["Target evidence gap", "Provider-generated long-form body fidelity still needs target screenshot evidence"],
  ];
  if (draft.lastError) rows.splice(8, 0, ["Issue", draft.lastError]);

  showAccountForm({
    title: "Article generation detail",
    bodyHtml: `
      <div class="article-generation-detail-card" data-article-generation-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function renderArticleBuilderOutputState(draft = {}) {
  if (!articleBuilderOutputState) return;

  const hasGeneratedState = Boolean(draft.sourcePostId || draft.body || draft.preview || draft.status === "queued");
  articleBuilderOutputState.hidden = !hasGeneratedState;
  if (!hasGeneratedState) {
    articleBuilderOutputState.innerHTML = "";
    return;
  }

  const generation = draft.generatedAt
    ? `Generated ${formatDateLabel(draft.generatedAt.slice(0, 10))}`
    : draft.body
      ? "Generated locally"
      : draft.preview
        ? "Preview only"
        : "Not generated";
  const source = draft.sourcePostId ? `Source ${articleStatusLabel(draft.sourceStatus || draft.status || "draft")}` : "Local draft";
  const previewState = draft.previewStatus === "provider-pending"
    ? "Provider pending"
    : draft.previewStatus === "error"
      ? "Provider error"
      : draft.preview
        ? "Local preview"
        : "Editor body";
  const issue = draft.lastError || "No active issue";
  const readiness = articleReadiness(draft);
  const validation = readiness.missing?.length ? `Missing ${readiness.missing.slice(0, 3).join(", ")}` : "All core fields set";
  const imageState = draft.featuredImageUrl
    ? (draft.featuredImageAlt ? "Featured image and alt text saved" : "Featured image saved; alt text missing")
    : "No featured image saved";
  const seoState = draft.seoTitle && draft.metaDescription
    ? "SEO title and meta description saved"
    : "SEO fields need review";
  const cms = accountState.data?.settings?.cms || {};
  const providerHandoff = cms.status === "connected" ? "CMS metadata connected" : "Local only; CMS pending";
  const qaRows = [
    ["Save target", draft.sourcePostId ? "Opened content plan article" : "New local draft"],
    ["Validation", validation],
    ["Image", imageState],
    ["SEO", seoState],
    ["Provider handoff", providerHandoff],
  ];
  const fieldRows = [
    ["Body", draft.body ? `${draft.body.length.toLocaleString()} characters` : "Body empty"],
    ["SEO title", draft.seoTitle || "Not set"],
    ["Meta description", draft.metaDescription || "Not set"],
    ["Canonical URL", draft.canonicalUrl || (draft.slug ? `/blog/${draft.slug}` : "Slug pending")],
    ["Featured image", draft.featuredImageUrl || "No featured image"],
    ["Preview", draft.preview ? "Local preview saved" : "No preview saved"],
  ];

  articleBuilderOutputState.innerHTML = `
    <button class="article-generation-detail-link" type="button" data-article-generation-detail="true">
      <strong>Output state</strong>
      <p>Review generated article fields, readiness, and provider limits.</p>
    </button>
    <dl>
      <div><dt>Generation</dt><dd>${escapeHtml(generation)}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(source)}</dd></div>
      <div><dt>Preview</dt><dd>${escapeHtml(previewState)}</dd></div>
      <div><dt>Issue</dt><dd>${escapeHtml(issue)}</dd></div>
    </dl>
    <section class="article-editor-qa" data-article-editor-qa>
      <strong>Editor QA</strong>
      <dl>
        ${qaRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    </section>
    <section class="article-editor-fields" data-article-editor-fields>
      <strong>Editor fields</strong>
      <dl>
        ${fieldRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    </section>
  `;
}

function imagePreviewStatus(images = {}) {
  const preview = images.samplePreview || {};
  const previewError = preview.providerStatus === "error" || preview.providerStatus === "failed" || preview.lastError || images.lastError;
  if (previewError) return "Needs attention";
  if (preview.providerStatus === "provider-pending") return "Provider pending";
  return images.samplePrompt ? "Local preview" : "Not tested";
}

function showImageOutputDetail(kind = "latest", indexValue = "") {
  const images = accountState.data?.settings?.images || {};
  const isHistory = kind === "history";
  const index = Number(indexValue);
  const historyEntry = isHistory && Number.isInteger(index) ? (images.promptHistory || [])[index] : null;
  const preview = images.samplePreview || {};
  const source = historyEntry || preview;
  const prompt = historyEntry?.prompt || preview.prompt || images.samplePrompt || "No prompt saved";
  const title = historyEntry?.stylePreset || preview.title || "Latest image prompt";
  const status = isHistory ? "Saved prompt" : (preview.providerStatus || imagePreviewStatus(images));
  const aspectRatio = historyEntry?.aspectRatio || preview.aspectRatio || images.aspectRatio || "16:9";
  const imageCadence = historyEntry?.imageCadence || preview.imageCadence || images.imageCadence || "featured-only";
  const rows = [
    ["Title", title],
    ["Status", status],
    ["Format", `${aspectRatio} · ${imageCadence}`],
    ["Style preset", source.stylePreset || images.stylePreset || "editorial"],
    ["Alt text", preview.altText || "No alt text saved"],
    ["Prompt", prompt],
    ["Save target", isHistory ? "Prompt history only" : "Article preview only"],
    ["Provider-backed", "Final generation stays pending until the image provider is connected"],
  ];
  if (!isHistory && (preview.lastError || images.lastError)) rows.splice(2, 0, ["Issue", preview.lastError || images.lastError]);

  showAccountForm({
    title: isHistory ? "Image prompt detail" : "Image output detail",
    bodyHtml: `
      <div class="image-output-detail-card" data-image-output-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function imageProviderDetailRows(images = {}, account = {}) {
  const preview = images.samplePreview || {};
  const previewError = preview.providerStatus === "error" || preview.providerStatus === "failed" || preview.lastError || images.lastError;
  const providerStatus = previewError
    ? "Needs attention"
    : preview.providerStatus === "provider-pending"
      ? "Provider pending"
      : images.samplePrompt
        ? "Local preview"
        : "Not tested";
  const aspectRatio = preview.aspectRatio || images.aspectRatio || "16:9";
  const imageCadence = preview.imageCadence || images.imageCadence || "featured-only";
  const historyCount = (images.promptHistory || []).length;
  const productCount = (account.products || []).filter((product) => !product.hidden).length;
  const productImageState = images.useProductImages
    ? `enabled · ${productCount.toLocaleString()} product${productCount === 1 ? "" : "s"}`
    : "disabled";

  return [
    ["Provider status", providerStatus],
    ["Preview title", preview.title || (images.samplePrompt ? "Local preview result" : "No preview output")],
    ["Style preset", preview.stylePreset || images.stylePreset || "editorial"],
    ["Format", `${aspectRatio} · ${imageCadence}`],
    ["Product images", productImageState],
    ["Prompt history", `${historyCount.toLocaleString()} saved prompt${historyCount === 1 ? "" : "s"}`],
    ["Last test", images.lastTestedAt ? formatDateLabel(String(images.lastTestedAt).slice(0, 10)) : "Not tested"],
    ["Alt text", preview.altText || "No alt text saved"],
    ["Prompt", preview.prompt || images.samplePrompt || "No prompt saved"],
    ["Issue", previewError ? preview.lastError || images.lastError || "Image provider error." : "No active issue"],
    ["Test action", isReadOnlyWorkspace() ? "Owner access required" : "Test image prompt"],
    ["Clear history action", historyCount || images.samplePrompt ? "Clear prompt history" : "No prompt history"],
    ["Provider-backed", "Final generation and asset-library selection remain provider-backed"],
    ["Target evidence gap", "Exact generated thumbnails, failure rows, and asset-library selection still need target screenshot evidence"],
  ];
}

function showImageProviderDetail() {
  const images = accountState.data?.settings?.images || {};
  const rows = imageProviderDetailRows(images, accountState.data || {});

  showAccountForm({
    title: "Image provider detail",
    bodyHtml: `
      <div class="image-provider-detail-card" data-image-provider-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function renderSettings(account) {
  const settings = account.settings || {};
  const readOnly = isReadOnlyWorkspace();
  const hasProductsForImages = Boolean((account.products || []).length);

  settingsFieldInputs.forEach((input) => {
    const value = getNested(settings, input.dataset.settingsField);
    input.value = value == null ? "" : value;
    input.disabled = readOnly;
  });

  settingsToggleButtons.forEach((button) => {
    const productImagesUnavailable = button.dataset.settingsToggle === "images.useProductImages" && !hasProductsForImages;
    setToggle(button, productImagesUnavailable ? false : Boolean(getNested(settings, button.dataset.settingsToggle)));
    button.disabled = readOnly || productImagesUnavailable;
  });
  if (descriptionGenerateAction) descriptionGenerateAction.disabled = readOnly;
  if (keywordAddAction) keywordAddAction.disabled = readOnly;
  if (productAddAction) productAddAction.disabled = readOnly;
  if (locationAddAction) locationAddAction.disabled = readOnly;
  if (inviteEmailInput) inviteEmailInput.disabled = readOnly;
  if (inviteRoleInput) inviteRoleInput.disabled = readOnly;
  updateInviteGenerateState();

  const keywords = settings.site?.keywords || [];
  if (keywordList) {
    keywordList.innerHTML = "";
    keywords.forEach((keyword) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.disabled = readOnly;
      chip.textContent = `${keyword} ×`;
      chip.dataset.keywordRemove = keyword;
      keywordList.appendChild(chip);
    });
  }

  if (keywordMixLabel) {
    keywordMixLabel.textContent = `${settings.site?.keywordMix ?? 45}%`;
  }

  renderCtaPreview(settings.cta || {});

  if (imageDetails) {
    const images = settings.images || {};
    const hasImageHistory = Boolean(images.samplePrompt || (images.promptHistory || []).length);
    if (imageGuidelinesEditor) imageGuidelinesEditor.hidden = !Boolean(images.useCustomGuidelines);
    if (imageTestAction) imageTestAction.disabled = readOnly;
    if (imageClearAction) imageClearAction.disabled = readOnly || !hasImageHistory;
    renderImageProviderState(images, account);
    imageDetails.innerHTML = "";

    if (!images.samplePrompt) {
      imageDetails.innerHTML = '<div class="empty-state bordered"><span>▧</span><strong>No image test yet</strong><p>Test image settings to preview the prompt that will be sent to the image generator.</p></div>';
    } else {
      const row = document.createElement("article");
      row.className = "entity-row";
      const imageMeta = [images.aspectRatio || "16:9", images.imageCadence || "featured-only"].filter(Boolean).join(" · ");
      const preview = images.samplePreview || {};
      const previewError = preview.providerStatus === "error" || preview.providerStatus === "failed" || preview.lastError || images.lastError;
      const previewStatus = previewError ? "Needs attention" : preview.providerStatus === "provider-pending" ? "Provider pending" : "Local preview";
      const previewStatusClass = previewError ? "image-status-error" : preview.providerStatus === "provider-pending" ? "image-status-pending" : "image-status-local";
      const previewErrorText = previewError ? `<em>${escapeHtml(preview.lastError || images.lastError || "Image provider error.")}</em>` : "";
      const previewHtml = preview.prompt
        ? `<div class="image-preview-card" data-image-preview><div><strong>${escapeHtml(preview.title || "Local image preview")}</strong><span class="image-status-badge ${previewStatusClass}">${escapeHtml(previewStatus)}</span></div><p>${escapeHtml(preview.altText || "Local image preview")}</p>${previewErrorText}<small>${escapeHtml([preview.stylePreset || "editorial", preview.aspectRatio || images.aspectRatio || "16:9", preview.imageCadence || images.imageCadence || "featured-only"].filter(Boolean).join(" · "))}</small></div>`
        : "";
      row.innerHTML = `<button class="image-output-detail-link" type="button" data-image-output-detail="latest"><div>${previewHtml}<strong>Latest image prompt</strong><p>${escapeHtml(imageMeta)} · ${escapeHtml(images.samplePrompt)}</p></div></button><button type="button" data-image-history-clear data-account-action="clear-image-tests" ${readOnly ? "disabled" : ""}>Clear history</button><span>${images.lastTestedAt ? formatDateLabel(images.lastTestedAt.slice(0, 10)) : "Not tested"}</span>`;
      imageDetails.appendChild(row);
      (images.promptHistory || []).forEach((entry, index) => {
        const historyRow = document.createElement("article");
        historyRow.className = "entity-row";
        const historyMeta = [entry.aspectRatio, entry.imageCadence].filter(Boolean).join(" · ");
        historyRow.innerHTML = `<button class="image-output-detail-link" type="button" data-image-history-detail="${escapeAttribute(String(index))}"><div><strong>${escapeHtml(entry.stylePreset || "Image prompt")}</strong><p>${historyMeta ? `${escapeHtml(historyMeta)} · ` : ""}${escapeHtml(entry.prompt || "")}</p></div></button><span>${entry.createdAt ? formatDateLabel(entry.createdAt.slice(0, 10)) : "Saved"}</span>`;
        imageDetails.appendChild(historyRow);
      });
    }
  }

  function renderImageProviderState(images = {}, account = {}) {
    if (!imageProviderState) return;
    const preview = images.samplePreview || {};
    const previewError = preview.providerStatus === "error" || preview.providerStatus === "failed" || preview.lastError || images.lastError;
    const providerStatus = previewError
      ? "Needs attention"
      : preview.providerStatus === "provider-pending"
        ? "Provider pending"
        : images.samplePrompt
          ? "Local preview"
          : "Not tested";
    const outputTitle = preview.title || (images.samplePrompt ? "Latest image prompt" : "No preview output");
    const aspectRatio = preview.aspectRatio || images.aspectRatio || "16:9";
    const imageCadence = preview.imageCadence || images.imageCadence || "featured-only";
    const historyCount = (images.promptHistory || []).length;
    const issue = previewError ? preview.lastError || images.lastError || "Image provider error." : "No active issue";
    const productCount = (account.products || []).filter((product) => !product.hidden).length;
    const productImageState = images.useProductImages
      ? `enabled · ${productCount.toLocaleString()} product${productCount === 1 ? "" : "s"}`
      : "disabled";
    const imageStateRows = [
      ["Format", `${aspectRatio} · ${imageCadence}`],
      ["Preview status", preview.providerStatus || providerStatus],
      ["Style preset", preview.stylePreset || images.stylePreset || "editorial"],
      ["Alt text", preview.altText || "No alt text saved"],
      ["Prompt", preview.prompt || images.samplePrompt || "No prompt saved"],
      ["Product images", productImageState],
      ["History", `${historyCount.toLocaleString()} saved`],
      ["Last test", images.lastTestedAt ? formatDateLabel(images.lastTestedAt.slice(0, 10)) : "Not tested"],
      ["Issue", issue],
    ];
    const outputRows = [
      ["Thumbnail", preview.title || (images.samplePrompt ? "Local preview result" : "No thumbnail yet")],
      ["Result status", providerStatus],
      ["History rows", `${historyCount.toLocaleString()} saved prompt${historyCount === 1 ? "" : "s"}`],
      ["Save target", "Article preview only"],
      ["Product input", productImageState],
      ["Provider-backed", "Final generation stays pending until the image provider is connected"],
    ];
    imageProviderState.className = previewError ? "image-provider-state-panel is-error" : "image-provider-state-panel";
    imageProviderState.innerHTML = `
      <button class="image-provider-detail-link" type="button" data-image-provider-detail="true">
        <span>Image provider</span>
        <strong>${escapeHtml(providerStatus)}</strong>
        <p>${escapeHtml(outputTitle)}</p>
      </button>
      <dl>
        ${imageStateRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <section class="image-output-state" data-image-output-state>
        <strong>Generated output</strong>
        <dl>
          ${outputRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </section>
    `;
  }

  if (cmsStatus) {
    const cms = settings.cms || {};
    const platform = cms.platform;
    const hasCmsMetadata = Boolean(cms.platform || cms.websiteUrl);
    if (cmsConnectAction) cmsConnectAction.disabled = readOnly;
    if (cmsTestAction) cmsTestAction.disabled = readOnly || !hasCmsMetadata;
    if (cmsDisconnectAction) cmsDisconnectAction.disabled = readOnly || !hasCmsMetadata;
    cmsStatus.textContent = platform
      ? `${platform} local setup is ${cms.status || "draft-first"} for ${cms.websiteUrl || "this site"}. Real CMS publishing is not connected yet. ${cms.hasCredentials ? "Credentials are marked configured; secret values are not stored or displayed." : "Add credentials metadata before publishing."}`
      : "Connect WordPress, Webflow, Shopify, or another CMS to auto-publish approved articles directly to your blog. Draft-first mode stays on until publishing is confirmed.";
  }

  if (cmsValidation) {
    const cms = settings.cms || {};
    const missingChecks = [
      cms.websiteUrl ? "" : "Website URL required",
      cms.platform ? "" : "Platform required",
      cms.hasCredentials ? "" : "Credential metadata missing",
    ].filter(Boolean);
    const hasCmsError = Boolean(cms.lastError);
    const providerStatus = hasCmsError ? "Needs attention" : cms.status === "connected" ? "Provider test pending" : "Local setup only";
    const platformLabel = cms.platform || "Select a platform";
    const publishMode = cms.draftFirst === false ? "Auto-publish after approval" : "Draft first";
    const targetLabel = cms.blogTarget || "Default blog";
    const collectionLabel = cms.collectionName || "Default collection";
    const credentialsLabel = cms.hasCredentials ? "configured" : "missing";
    const lastTestLabel = cms.lastTestedAt ? formatDateLabel(cms.lastTestedAt.slice(0, 10)) : "Not tested";
    const validationCopy = hasCmsError
      ? cms.lastError
      : missingChecks.length
      ? missingChecks.join(" · ")
      : "Provider test pending; real publishing remains disabled until the external CMS confirms access.";

    cmsValidation.className = hasCmsError ? "cms-validation-card is-error" : "cms-validation-card";
    cmsValidation.innerHTML = `
      <div>
        <span>Provider validation</span>
        <strong>${escapeHtml(platformLabel)}</strong>
        <p>${escapeHtml(validationCopy)}</p>
      </div>
      <dl>
        <div><dt>Status</dt><dd>${escapeHtml(providerStatus)}</dd></div>
        <div><dt>Publishing mode</dt><dd>${escapeHtml(publishMode)}</dd></div>
        <div><dt>Credentials</dt><dd>${escapeHtml(credentialsLabel)}</dd></div>
        <div><dt>Target</dt><dd>${escapeHtml(targetLabel)}</dd></div>
        <div><dt>Collection</dt><dd>${escapeHtml(collectionLabel)}</dd></div>
        <div><dt>Last test</dt><dd>${escapeHtml(lastTestLabel)}</dd></div>
      </dl>
    `;
  }

  if (cmsDetails) {
    const cms = settings.cms || {};
    cmsDetails.innerHTML = "";

    if (!cms.platform && !cms.websiteUrl) {
      cmsDetails.innerHTML = '<div class="empty-state bordered"><span>▱</span><strong>No CMS configured</strong><p>Choose a platform and website URL, then connect in draft-first mode.</p></div>';
    } else {
      const row = document.createElement("article");
      const hasCmsError = Boolean(cms.lastError);
      const cmsConnected = cms.status === "connected";
      row.className = hasCmsError ? "entity-row cms-error-row" : "entity-row cms-row";
      const statusBadge = hasCmsError
        ? '<span class="cms-status-badge cms-status-error">Needs attention</span>'
        : `<span class="cms-status-badge ${cmsConnected ? "cms-status-connected" : "cms-status-pending"}">${cmsConnected ? "Connected" : "Local setup"}</span>`;
      const cmsTargetMeta = [
        cms.blogTarget ? `Target: ${cms.blogTarget}` : "",
        cms.collectionName ? `Collection: ${cms.collectionName}` : "",
      ].filter(Boolean).join(" · ");
      row.innerHTML = `<button class="cms-provider-detail-link" type="button" data-cms-provider-detail="true"><div><strong>${escapeHtml(cms.platform || "Platform not selected")}</strong>${statusBadge}<p>${escapeHtml(cms.websiteUrl || "No website URL")} · ${escapeHtml(cms.status || "disconnected")} · Local setup only · real publisher pending · ${cms.hasCredentials ? "credentials configured" : "credentials missing"}${cmsTargetMeta ? ` · ${escapeHtml(cmsTargetMeta)}` : ""}${cms.lastTestedAt ? ` · tested ${formatDateLabel(cms.lastTestedAt.slice(0, 10))}` : ""}${cms.lastError ? ` · ${escapeHtml(cms.lastError)}` : ""}</p></div></button><span>${cms.draftFirst === false ? "Auto-publish" : "Draft first"}</span>`;
      cmsDetails.appendChild(row);
    }
  }

  if (inventoryStatus) {
    const inventoryFeed = account.inventoryFeed || {};
    const inventoryConnected = inventoryFeed.status === "connected";
    if (inventoryConnectAction) {
      inventoryConnectAction.hidden = inventoryConnected;
      inventoryConnectAction.disabled = readOnly;
    }
    if (inventorySyncAction) {
      inventorySyncAction.hidden = !inventoryConnected;
      inventorySyncAction.disabled = readOnly || !inventoryConnected;
    }
    if (inventoryDisconnectAction) {
      inventoryDisconnectAction.hidden = !inventoryConnected;
      inventoryDisconnectAction.disabled = readOnly || !inventoryConnected;
    }
    inventoryStatus.textContent =
      inventoryConnected
        ? `${inventoryFeed.retailerName || "Inventory feed"} is connected locally. Sync pulls placeholder product rows without storing secret values.`
        : "Connect product or service inventory to pull current offers into content.";
    renderInventoryStatePanel(account);
  }

  if (inventoryDetails) {
    const inventoryFeed = account.inventoryFeed || {};
    inventoryDetails.innerHTML = "";
    const shouldShowInventoryDetails = inventoryFeed.status === "connected" || Boolean(inventoryFeed.accountId || inventoryFeed.lastError);
    inventoryDetails.hidden = !shouldShowInventoryDetails;

    if (shouldShowInventoryDetails) {
      const row = document.createElement("article");
      const hasInventoryError = Boolean(inventoryFeed.lastError);
      const connected = inventoryFeed.status === "connected";
      row.className = hasInventoryError ? "entity-row inventory-feed-error-row" : "entity-row inventory-feed-row";
      const statusBadge = hasInventoryError
        ? '<span class="inventory-status-badge inventory-status-error">Needs attention</span>'
        : `<span class="inventory-status-badge ${connected ? "inventory-status-connected" : "inventory-status-disconnected"}">${connected ? "Connected" : "Disconnected"}</span>`;
      row.innerHTML = `<div><strong>${escapeHtml(inventoryFeed.retailerName || "Inventory feed")}</strong>${statusBadge}<p>${escapeHtml(inventoryFeed.accountId || "No account id")} · ${escapeHtml(inventoryFeed.status || "disconnected")} · ${inventoryFeed.hasCredentials ? "credentials configured" : "credentials missing"}${inventoryFeed.lastSyncedAt ? ` · synced ${formatDateLabel(inventoryFeed.lastSyncedAt.slice(0, 10))}` : ""}${inventoryFeed.lastError ? ` · ${escapeHtml(inventoryFeed.lastError)}` : ""}</p></div><span>${account.products?.filter((product) => product.source === "inventory-feed").length || 0} synced</span>`;
      inventoryDetails.appendChild(row);
    }
  }
}

function renderInventoryStatePanel(account) {
  if (!inventoryStatePanel) return;
  const inventoryFeed = account.inventoryFeed || {};
  const inventoryConnected = inventoryFeed.status === "connected";
  const inventoryProducts = account.products?.filter((product) => product.source === "inventory-feed") || [];
  const manualProducts = account.products?.filter((product) => product.source === "manual") || [];
  const hiddenProducts = account.products?.filter((product) => product.hidden) || [];
  const hasError = Boolean(inventoryFeed.lastError);
  const statusLabel = hasError ? "Needs attention" : inventoryConnected ? "Connected" : "Disconnected";
  const feedName = inventoryFeed.retailerName || "Inventory feed";
  const lastSyncLabel = inventoryFeed.lastSyncedAt ? formatDateLabel(String(inventoryFeed.lastSyncedAt).slice(0, 10)) : "Not synced";
  const latestSyncedProduct = inventoryProducts.find((product) => !product.hidden) || inventoryProducts[0] || {};
  const inventoryStateRows = [
    ["Feed", feedName],
    ["Account", inventoryFeed.accountId || "No account id"],
    ["Sync mode", inventoryFeed.syncMode || "manual"],
    ["Credentials", inventoryFeed.hasCredentials ? "credentials configured" : "credentials missing"],
    ["Products", `${manualProducts.length.toLocaleString()} manual · ${inventoryProducts.length.toLocaleString()} synced`],
    ["Manual products", manualProducts.length.toLocaleString()],
    ["Synced products", inventoryProducts.length.toLocaleString()],
    ["Hidden products", hiddenProducts.length.toLocaleString()],
    ["Last sync", lastSyncLabel],
    ["Latest SKU", latestSyncedProduct.sku || latestSyncedProduct.name || "No synced SKU"],
    ["Issue", inventoryFeed.lastError || "No active issue"],
  ];
  inventoryStatePanel.className = hasError ? "inventory-state-panel is-error" : "inventory-state-panel";
  inventoryStatePanel.innerHTML = `
    <button class="inventory-feed-detail-link" type="button" data-inventory-feed-detail="true">
      <span>Inventory state</span>
      <strong>${escapeHtml(statusLabel)}</strong>
      <p>${escapeHtml(`${feedName} · ${inventoryFeed.accountId || "No account id"}`)}</p>
    </button>
    <dl>
      ${inventoryStateRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
    </dl>
  `;
}

function inventoryFeedDetailRows(account) {
  const readOnly = isReadOnlyWorkspace();
  const inventoryFeed = account.inventoryFeed || {};
  const inventoryProducts = account.products?.filter((product) => product.source === "inventory-feed") || [];
  const manualProducts = account.products?.filter((product) => product.source === "manual") || [];
  const hiddenProducts = account.products?.filter((product) => product.hidden) || [];
  const hasError = Boolean(inventoryFeed.lastError);
  const connected = inventoryFeed.status === "connected";
  const statusLabel = hasError ? "Needs attention" : connected ? "Connected" : "Disconnected";
  const latestSyncedProduct = inventoryProducts.find((product) => !product.hidden) || inventoryProducts[0] || {};
  const lastSyncLabel = inventoryFeed.lastSyncedAt ? formatDateLabel(String(inventoryFeed.lastSyncedAt).slice(0, 10)) : "Not synced";

  return [
    ["Feed", inventoryFeed.retailerName || "Inventory feed"],
    ["Status", statusLabel],
    ["Account", inventoryFeed.accountId || "No account id"],
    ["Sync mode", inventoryFeed.syncMode || "manual"],
    ["Credentials", inventoryFeed.hasCredentials ? "credentials configured" : "credentials missing"],
    ["Product counts", `${manualProducts.length.toLocaleString()} manual · ${inventoryProducts.length.toLocaleString()} synced · ${hiddenProducts.length.toLocaleString()} hidden`],
    ["Last sync", lastSyncLabel],
    ["Latest SKU", latestSyncedProduct.sku || latestSyncedProduct.name || "No synced SKU"],
    ["Issue", inventoryFeed.lastError || "No active issue"],
    ["Connect action", readOnly ? "Owner access required" : connected ? "Already connected locally" : "Save inventory connection"],
    ["Sync action", readOnly ? "Owner access required" : connected ? "Sync inventory products" : "Connect inventory before syncing"],
    ["Disconnect action", readOnly ? "Owner access required" : connected ? "Disconnect inventory feed" : "No connected feed"],
    ["Provider-backed", "Real inventory API sync remains provider-backed"],
    ["Target evidence gap", "Exact product add/edit and synced-product detail states still need target screenshot evidence"],
  ];
}

function showInventoryFeedDetail() {
  if (!accountState.data) return;
  const rows = inventoryFeedDetailRows(accountState.data);

  showAccountForm({
    title: "Inventory feed detail",
    bodyHtml: `
      <div class="inventory-feed-detail-card" data-inventory-feed-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function renderCtaPreview(cta = {}) {
  if (!ctaPreview) return;
  const readOnly = isReadOnlyWorkspace();

  const placementLabels = ctaPlacementLabels();

  ctaPreview.innerHTML = "";
  const row = document.createElement("article");
  row.className = "entity-row";

  const enabled = Boolean(cta.enabled);
  const label = cta.label || "";
  const text = cta.text || "Get started";
  const url = cta.url || "";
  const placement = placementLabels[cta.placement] || placementLabels.end;
  const styleLabel = ctaStyleLabel(cta.style);
  const openLabel = cta.openInNewTab === false ? "same tab" : "opens in new tab";
  const tracking = cta.trackingLabel ? ` · ${cta.trackingLabel}` : "";
  const hasResettableCta = Boolean(
    enabled ||
      label ||
      cta.text ||
      url ||
      cta.trackingLabel ||
      (cta.placement && cta.placement !== "end") ||
      (cta.style && cta.style !== "button") ||
      cta.openInNewTab === false
  );
  if (ctaEditAction) ctaEditAction.disabled = readOnly;
  if (ctaResetAction) ctaResetAction.disabled = readOnly || !hasResettableCta;
  const metaText = enabled
    ? `${label ? `${label} · ` : ""}${placement} · ${styleLabel} · ${openLabel}${url ? ` · ${url}` : " · no URL set"}${tracking}`
    : "Generated articles will not include a CTA until this is enabled.";
  const action = enabled && url
    ? `<a href="${escapeAttribute(url)}" ${cta.openInNewTab === false ? "" : 'target="_blank" rel="noreferrer"'}>${escapeHtml(text)}</a>`
    : `<span>${enabled ? "URL needed" : "Off"}</span>`;
  row.innerHTML = `<button class="cta-detail-link" type="button" data-cta-detail="true"><strong>${escapeHtml(enabled ? text : "CTA disabled")}</strong><p>${escapeHtml(metaText)}</p></button>${action}`;

  ctaPreview.appendChild(row);
}

function renderWriteDraft(account) {
  const draft = account.writeDraft || {};
  const defaultPublishTime = account.settings?.site?.defaultPublishTime || "";
  const readOnly = isReadOnlyWorkspace();
  writeFieldInputs.forEach((input) => {
    input.value = input.dataset.writeField === "scheduledTime" ? draft.scheduledTime || defaultPublishTime : draft[input.dataset.writeField] || "";
    input.disabled = readOnly;
  });
  if (writeSaveAction) writeSaveAction.disabled = readOnly;
  if (writePreviewAction) writePreviewAction.disabled = readOnly;
  if (writeStartAction) writeStartAction.disabled = readOnly;
  renderArticleBuilderPreview({ ...draft, scheduledTime: draft.scheduledTime || defaultPublishTime });
  renderArticleGeneratedActions({ ...draft, scheduledTime: draft.scheduledTime || defaultPublishTime }, readOnly);
  renderArticleSourceSummary({ ...draft, scheduledTime: draft.scheduledTime || defaultPublishTime });
  renderArticleBuilderOutputState({ ...draft, scheduledTime: draft.scheduledTime || defaultPublishTime });

  if (writePreview) {
    writePreview.innerHTML = "";
    if (!draft.preview) {
      writePreview.innerHTML = '<div class="empty-state bordered"><span>▱</span><strong>No preview yet</strong><p>Preview the brief before adding the article to the content plan.</p></div>';
    } else {
      const row = document.createElement("article");
      row.className = "entity-row";
      const details = document.createElement("div");
      const title = document.createElement("strong");
      const body = document.createElement("p");
      const status = document.createElement("span");
      const previewStatus = draft.previewStatus === "provider-pending" ? "Provider pending" : draft.previewStatus === "error" ? "Provider error" : "Local preview";
      const previewSource = draft.previewSource === "local-brief" ? "Local brief preview" : draft.previewSource === "provider" ? "Provider result" : "";
      const previewDate = draft.previewedAt ? formatDateLabel(draft.previewedAt.slice(0, 10)) : "Previewed";
      title.textContent = "Generated brief preview";
      body.textContent = draft.preview;
      body.style.whiteSpace = "pre-line";
      status.textContent = [previewStatus, previewSource, previewDate].filter(Boolean).join(" · ");
      details.append(title, body);
      row.append(details, status);
      writePreview.appendChild(row);
    }
  }

  if (writeStatus) {
    const readiness = articleReadiness({ ...draft, scheduledTime: draft.scheduledTime || defaultPublishTime });
    const title = draft.status === "queued" ? "Article queued" : readiness.status === "ready" ? "Ready to start" : "Draft status";
    const statusBody =
      readOnly
        ? "This workspace is read-only for your role. You can review this draft, but editing and article creation are disabled."
        : draft.status === "queued"
        ? "This brief has been added to the content plan as a draft."
        : draft.status === "previewed"
        ? "Brief preview generated. Start article to add it to the content plan."
        : "Save settings first, then start an article to create a content-plan draft from this brief.";
    writeStatus.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(`${readinessText(readiness)}. ${statusBody}`)}</p>`;
  }
}

function renderBlogTable(account, items) {
  let activeFilter = accountState.blogStatusFilter || "all";
  const readOnly = isReadOnlyWorkspace();
  const statusCounts = items.reduce(
    (counts, item) => {
      const status = item.status || "scheduled";
      counts.all += 1;
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { all: 0, scheduled: 0, processing: 0, draft: 0, published: 0, failed: 0, paused: 0 }
  );
  const advancedStatuses = new Set(["failed", "paused"]);
  const shouldHideStatusFilter = (status) => advancedStatuses.has(status) && Number(statusCounts[status] || 0) === 0;
  if (shouldHideStatusFilter(activeFilter)) {
    activeFilter = "all";
    accountState.blogStatusFilter = "all";
  }
  blogStatusFilterButtons.forEach((button) => {
    const status = button.dataset.blogStatusFilter || "all";
    const hidden = shouldHideStatusFilter(status);
    button.hidden = hidden;
    const active = !hidden && status === activeFilter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    const label = button.dataset.blogStatusLabel || button.textContent.trim() || status;
    button.innerHTML = `${escapeHtml(label)} <span data-blog-status-count="${escapeAttribute(status)}">${Number(statusCounts[status] || 0).toLocaleString()}</span>`;
  });

  if (!blogTableBody) return;
  blogTableBody.innerHTML = "";
  const filteredItems = activeFilter === "all" ? items : items.filter((item) => (item.status || "scheduled") === activeFilter);
  accountState.selectedBlogIds = new Set(Array.from(accountState.selectedBlogIds).filter((id) => items.some((item) => item.id === id)));
  if (readOnly) accountState.selectedBlogIds.clear();
  const selectedCount = Array.from(accountState.selectedBlogIds).length;
  if (blogBulkBar) blogBulkBar.hidden = selectedCount === 0;
  if (blogSelectedLabel) blogSelectedLabel.textContent = `${selectedCount} selected`;
  if (blogBulkStatusInput && !blogBulkStatusInput.value) blogBulkStatusInput.value = "draft";
  if (blogBulkStatusInput) blogBulkStatusInput.disabled = readOnly || selectedCount === 0;
  if (blogBulkUpdateAction) blogBulkUpdateAction.disabled = readOnly || selectedCount === 0;
  if (blogBulkClearAction) blogBulkClearAction.disabled = readOnly || selectedCount === 0;
  blogSelectAllControls.forEach((control) => {
    const visibleSelected = filteredItems.filter((item) => accountState.selectedBlogIds.has(item.id)).length;
    control.checked = Boolean(filteredItems.length) && visibleSelected === filteredItems.length;
    control.indeterminate = visibleSelected > 0 && visibleSelected < filteredItems.length;
    control.disabled = readOnly || filteredItems.length === 0;
  });

  if (!filteredItems.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5">No articles match this status.</td>';
    blogTableBody.appendChild(row);
    return;
  }

  filteredItems.forEach((item) => {
    const row = document.createElement("tr");
    const status = item.status || "scheduled";
    const publicLink = status === "published" && isLocalBlogPath(item.publicPath)
      ? `<a href="${escapeAttribute(item.publicPath)}" data-public-post-link>Open</a>`
      : "";
    const readOnlyDisabled = readOnly ? "disabled" : "";
    const menuPublishAction = status === "published"
      ? renderBlogMenuActionButton({ action: "unpublish", postId: item.id, label: "Unpublish", disabled: readOnlyDisabled })
      : renderBlogMenuActionButton({ action: "publish", postId: item.id, label: "Publish", disabled: readOnlyDisabled });
    const generateLabel = item.body || item.generatedAt || item.preview ? "Regenerate" : "Generate";
    const generatedPrimaryActions = status === "draft" || status === "processing";
    const primaryActions = generatedPrimaryActions
      ? `
        ${renderIconActionButton({ action: "generate", postId: item.id, label: generateLabel, icon: "✦", disabled: readOnlyDisabled })}
        ${renderIconActionButton({ action: "delete", postId: item.id, label: "Delete article", icon: "×", disabled: readOnlyDisabled })}
      `
      : `
        ${renderIconActionButton({ action: "view", postId: item.id, label: "View article", icon: "⊙" })}
        ${renderIconActionButton({ action: "edit", postId: item.id, label: "Edit article", icon: "✎", disabled: readOnlyDisabled })}
        ${renderIconActionButton({ action: "delete", postId: item.id, label: "Delete article", icon: "×", disabled: readOnlyDisabled })}
      `;

    row.dataset.blogRowId = item.id;
    row.innerHTML = `
      <td><input type="checkbox" data-blog-select="${escapeAttribute(item.id)}" aria-label="Select ${escapeAttribute(item.title)}" ${accountState.selectedBlogIds.has(item.id) ? "checked" : ""} ${readOnly ? "disabled" : ""} /></td>
      <td><strong>${escapeHtml(item.title)}</strong>${publicLink}</td>
      <td>${escapeHtml(item.keyword || "No keyword")}</td>
      <td class="blog-table-actions">
        ${primaryActions}
        <details class="blog-row-menu">
          <summary aria-label="Open article actions menu">More</summary>
          <div>
            ${renderBlogMenuActionButton({ action: "view", postId: item.id, label: "View article" })}
            ${renderBlogMenuActionButton({ action: "edit", postId: item.id, label: "Edit article", disabled: readOnlyDisabled })}
            ${renderBlogMenuActionButton({ action: "open-builder", postId: item.id, label: "Open article builder" })}
            ${renderBlogMenuActionButton({ action: "schedule", postId: item.id, label: "Schedule", disabled: readOnlyDisabled })}
            ${renderBlogMenuActionButton({ action: "generate", postId: item.id, label: generateLabel, disabled: readOnlyDisabled })}
            ${menuPublishAction}
            ${renderBlogMenuActionButton({ action: "delete", postId: item.id, label: "Delete", disabled: readOnlyDisabled })}
          </div>
        </details>
      </td>
      <td>${escapeHtml(formatScheduledDateTimeLabel(item.scheduledDate, item.scheduledTime))}</td>
    `;
    blogTableBody.appendChild(row);
  });
}

function contentPlanCadenceLabel(cadence) {
  if (cadence === "Daily") return "Publishing daily";
  if (cadence === "3 per week") return "Publishing 3 articles a week";
  if (cadence === "Weekly") return "Publishing weekly";
  if (cadence === "Manual approval only") return "Publishing after manual approval";
  return "Publishing 3 articles a week";
}

function contentPlanSpacingLabel(cadence) {
  if (cadence === "Daily") return "daily";
  if (cadence === "Weekly") return "weekly";
  if (cadence === "Manual approval only") return "after manual approval";
  return "3 per week";
}

function contentPlanVisitRangeLabel(visits) {
  const high = Math.max(0, Math.round(Number(visits || 0)));
  const low = Math.max(0, Math.round(high * 0.456));
  return `${low.toLocaleString()} to ${high.toLocaleString()}`;
}

function renderContentPlan(account) {
  const plan = account.contentPlan || { items: [] };
  const readOnly = isReadOnlyWorkspace();
  const items = [...(plan.items || [])].sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)));
  const visits = items.reduce((sum, item) => sum + Number(item.estimatedVisits || 0), 0);
  const statusCounts = plan.statusCounts || items.reduce((counts, item) => {
    const status = item.status || "scheduled";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const windowStart = addDays(startOfWeek(new Date()), accountState.calendarOffset * 7);
  const windowEnd = addDays(windowStart, 21);
  const visibleItems = items.filter((item) => {
    const time = Date.parse(`${item.scheduledDate}T00:00:00`);
    return Number.isFinite(time) && time >= windowStart.getTime() && time < windowEnd.getTime();
  });

  if (contentPlanHeadline) {
    const cadence = contentPlanCadenceLabel(account.settings?.site?.publishingCadence);
    contentPlanHeadline.textContent = `${cadence}, targeting keywords worth up to ~${visits.toLocaleString()} visits a month.`;
  }

  if (contentPlanStats) {
    const scheduled = Number(statusCounts.scheduled || 0);
    const writing = Number(statusCounts.draft || 0) + Number(statusCounts.processing || 0);
    const published = Number(statusCounts.published || 0);
    contentPlanStats.textContent = `${scheduled} scheduled · ${writing} writing · ${published} published`;
  }

  if (contentStrategy) {
    contentStrategy.textContent =
      plan.strategy ||
      `${items.length} from your keyword research topics. Picked as topics your site can realistically rank for and spaced ${contentPlanSpacingLabel(account.settings?.site?.publishingCadence)}. If these land where we are aiming, that is roughly ${contentPlanVisitRangeLabel(visits)} extra visits every month.`;
  }
  if (strategyCard) strategyCard.hidden = accountState.strategyDismissed || !items.length;

  contentCountLabels.forEach((label) => {
    label.textContent = String(statusCounts[label.dataset.contentCount] || 0);
  });

  if (contentPlanSummary) {
    contentPlanSummary.textContent = items.length
      ? "Articles write and publish themselves on their dates. New topics are added for you every week. You can jump ahead anytime."
      : "No articles are scheduled yet. Add topics or start an article to build the plan.";
  }
  if (bulkScheduleAction) bulkScheduleAction.disabled = readOnly;
  if (addTopicToPlanAction) addTopicToPlanAction.disabled = readOnly;

  if (contentWindow) {
    contentWindow.textContent = items.length
      ? `${formatDateLabel(windowStart.toISOString().slice(0, 10))} - ${formatDateLabel(addDays(windowEnd, -1).toISOString().slice(0, 10))}`
      : "No scheduled articles";
  }

  renderBlogTable(account, items);

  if (!contentCalendar) return;
  contentCalendar.innerHTML = "";
  const calendarMode = account.ui?.calendarMode === "list" ? "list" : "grid";
  contentCalendar.hidden = calendarMode === "list";
  if (blogTableShell) blogTableShell.hidden = calendarMode !== "list";
  contentCalendar.classList.toggle("is-list", calendarMode === "list");
  calendarModeButtons.forEach((button) => {
    const active = button.dataset.calendarMode === calendarMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (!items.length) {
    contentCalendar.innerHTML = '<article class="empty-state bordered"><span>▱</span><strong>No articles yet</strong><p>Add a topic or start an article to create the first draft.</p></article>';
    return;
  }

  if (!visibleItems.length) {
    contentCalendar.innerHTML = '<article class="empty-state bordered"><span>▱</span><strong>No articles in this window</strong><p>Use Today or add a topic to schedule new articles.</p></article>';
    return;
  }

  const groups = new Map();
  visibleItems.forEach((item) => {
    const label = calendarMode === "list" ? "All scheduled articles" : weekRangeLabel(item.scheduledDate);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  });

  Array.from(groups.entries()).forEach(([label, group], groupIndex) => {
    const column = document.createElement("article");
    const header = document.createElement("header");
    header.innerHTML = `<strong>${label}</strong>${groupIndex === 0 && calendarMode !== "list" ? "<span>This week</span>" : ""}`;
    column.appendChild(header);

    group.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "content-card";
      card.dataset.planItemId = item.id;
      card.innerHTML = `<strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.keyword || "No keyword")}</small><p>${formatVolume(item.volume)} · <b>${escapeHtml(contentCardDifficultyLabel(item.difficulty))}</b><span class="content-card-visits">up to ~${Number(item.estimatedVisits || 0).toLocaleString()} visits/mo</span></p><span class="content-card-footer"><time>${formatDateLabel(item.scheduledDate)}</time><span class="content-card-source" data-content-card-source>✧ Added by Sir Bloggsalot</span></span>`;
      column.appendChild(card);
      const publicLink = item.status === "published" && isLocalBlogPath(item.publicPath)
        ? `<a class="content-card-link" href="${escapeAttribute(item.publicPath)}" data-public-post-link>Open post</a>`
        : "";
      if (publicLink) {
        const template = document.createElement("template");
        template.innerHTML = publicLink;
        column.appendChild(template.content.firstElementChild);
      }
    });

    contentCalendar.appendChild(column);
  });
}

function getTopicDifficultyScore(topic) {
  if (Number.isFinite(Number(topic.difficultyScore))) return Number(topic.difficultyScore);
  const fallback = {
    Easy: 24,
    "Easy to rank": 22,
    Medium: 48,
    Hard: 72,
    "Needs review": 50,
    "Needs research": 58,
  };
  return fallback[topic.difficulty] || 50;
}

function topicFilterNumber(value) {
  if (value === "" || value === undefined || value === null) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function topicMatchesFilters(topic) {
  const filters = accountState.topicFilters;
  const query = (filters.query || "").toLowerCase();
  const haystack = `${topic.title || ""} ${topic.keyword || ""}`.toLowerCase();
  if (query && !haystack.includes(query)) return false;

  const checks = [
    [getTopicDifficultyScore(topic), "difficultyMin", "difficultyMax"],
    [Number(topic.cpc || 0), "cpcMin", "cpcMax"],
    [Number(topic.volume || 0), "volumeMin", "volumeMax"],
    [Number(topic.competition || 0), "competitionMin", "competitionMax"],
  ];

  return checks.every(([value, minKey, maxKey]) => {
    const min = topicFilterNumber(filters[minKey]);
    const max = topicFilterNumber(filters[maxKey]);
    if (min !== "" && value < min) return false;
    if (max !== "" && value > max) return false;
    return true;
  });
}

function visibleTopics(account, topics = account.topics || []) {
  const sort = accountState.topicSort || { field: "volume", direction: "desc" };
  const direction = sort.direction === "asc" ? 1 : -1;
  return topics
    .filter((topic) => topicMatchesFilters(topic))
    .sort((a, b) => {
      if (sort.field === "keyword") {
        return String(a.keyword || a.title || "").localeCompare(String(b.keyword || b.title || "")) * direction;
      }
      const aValue = sort.field === "difficultyScore" ? getTopicDifficultyScore(a) : Number(a[sort.field] || 0);
      const bValue = sort.field === "difficultyScore" ? getTopicDifficultyScore(b) : Number(b[sort.field] || 0);
      return (aValue - bValue) * direction;
    });
}

function currentTopicFilterPayload() {
  return {
    query: accountState.topicFilters.query || "",
    filters: { ...accountState.topicFilters, query: undefined },
  };
}

function renderKeywordMetricBar(type, value, maxValue, label) {
  const numeric = Math.max(0, Number(value || 0));
  const max = Math.max(1, Number(maxValue || 1));
  const percent = Math.min(100, Math.round((numeric / max) * 100));
  return `<span class="keyword-metric"><span class="keyword-metric-track"><span class="keyword-metric-bar ${escapeAttribute(type)}" style="width: ${percent}%"></span></span><span>${escapeHtml(label)}</span></span>`;
}

function findTopicById(topicId) {
  const persistedTopic = accountState.data?.topics?.find((topic) => topic.id === topicId);
  const transientTopic = accountState.topicSearchResults?.find((topic) => topic.id === topicId);
  return { persistedTopic, transientTopic, topic: persistedTopic || transientTopic };
}

async function addTopicToPlan(topicId) {
  const { persistedTopic, transientTopic } = findTopicById(topicId);
  if (!persistedTopic && transientTopic) {
    const created = await postAccountAction("/api/account/topics", transientTopic);
    const createdTopic = created.topics?.[0];
    if (createdTopic) {
      await postAccountAction(`/api/account/topics/${createdTopic.id}/add`);
    }
  } else if (persistedTopic) {
    await postAccountAction(`/api/account/topics/${topicId}/add`);
  }
  setAccountOperation("Topic added to the content plan.");
}

function showTopicDetail(topicId) {
  const { topic } = findTopicById(topicId);
  if (!topic) return;

  const readOnly = isReadOnlyWorkspace();
  const difficultyScore = getTopicDifficultyScore(topic);
  const cpc = Number(topic.cpc || 0);
  const competition = Number(topic.competition || 0);
  const bodyHtml = `
    <div class="topic-detail-card" data-topic-detail-card>
      <p><b>Keyword:</b> ${escapeHtml(topic.keyword || topic.title || "Untitled keyword")}</p>
      <p><b>Topic:</b> ${escapeHtml(topic.title || "Untitled topic")}</p>
      <p><b>Search volume:</b> ${Number(topic.volume || 0).toLocaleString()}</p>
      <p><b>CPC:</b> $${cpc.toFixed(2)}</p>
      <p><b>Difficulty:</b> ${escapeHtml(topic.difficulty || "Needs review")} (${difficultyScore})</p>
      <p><b>Competition:</b> ${competition.toFixed(2)}</p>
      <p><b>Status:</b> ${topic.added ? "Already in content plan" : "Ready to add to plan"}</p>
    </div>
  `;
  const extraActions =
    readOnly || topic.added
      ? []
      : [
          {
            label: "Add to plan",
            onClick: async () => {
              await addTopicToPlan(topic.id);
            },
          },
        ];

  showAccountForm({
    title: "Keyword detail",
    bodyHtml,
    submitText: "Close",
    extraActions,
    onSubmit: async () => {},
  });
}

function findProductById(productId) {
  return accountState.data?.products?.find((product) => product.id === productId);
}

function showProductForm(product) {
  if (!product) return;

  showAccountForm({
    title: "Edit product",
    body: "Update product details used by generated articles and image prompts.",
    submitText: "Save product",
    fields: [
      { name: "name", label: "Product name", value: product.name, required: true },
      { name: "category", label: "Category", value: product.category || "Service", required: true },
      { name: "price", label: "Price", value: product.price || "" },
      { name: "sku", label: "SKU", value: product.sku || "" },
      { name: "audience", label: "Audience or use case", value: product.audience || "" },
      { name: "description", label: "Short description", type: "textarea", rows: 3, value: product.description || "" },
      { name: "url", label: "Product URL", type: "url", value: product.url || "" },
      { name: "featured", label: "Featured product", type: "select", value: product.featured ? "true" : "false", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }] },
      { name: "hidden", label: "Visibility", type: "select", value: product.hidden ? "hidden" : "visible", options: ["visible", "hidden"] },
    ],
    onSubmit: async (values) => {
      const payload = await requestJson(`/api/account/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...product, ...values, featured: values.featured === "true", hidden: values.hidden === "hidden" }),
      });
      if (payload.account) accountState.data = payload.account;
      else accountState.data.products = payload.products;
      renderAccountData();
      setAccountOperation("Product updated.");
    },
  });
}

function showProductDetail(productId) {
  const product = findProductById(productId);
  if (!product) return;

  const sourceLabel = product.source === "manual" ? "Manual" : product.source || "Synced";
  const bodyHtml = `
    <div class="product-detail-card" data-product-detail-card>
      <p><b>Name:</b> ${escapeHtml(product.name || "Untitled product")}</p>
      <p><b>Category:</b> ${escapeHtml(product.category || "Uncategorized")}</p>
      <p><b>Price:</b> ${escapeHtml(product.price || "Not set")}</p>
      <p><b>SKU:</b> ${escapeHtml(product.sku || "Not set")}</p>
      <p><b>Audience:</b> ${escapeHtml(product.audience || "Not set")}</p>
      <p><b>Source:</b> ${escapeHtml(sourceLabel)}</p>
      <p><b>Visibility:</b> ${product.hidden ? "Hidden" : "Visible"}${product.featured ? " · Featured" : ""}</p>
      <p><b>Product URL:</b> ${product.url ? `<a href="${escapeAttribute(product.url)}" target="_blank" rel="noopener">${escapeHtml(product.url)}</a>` : "Not set"}</p>
      <p><b>Description:</b> ${escapeHtml(product.description || "Not set")}</p>
    </div>
  `;
  const extraActions = isReadOnlyWorkspace()
    ? []
    : [
        {
          label: "Edit product",
          keepOpenAfterClick: true,
          onClick: () => showProductForm(product),
        },
      ];

  showAccountForm({
    title: "Product detail",
    bodyHtml,
    submitText: "Close",
    extraActions,
    onSubmit: async () => {},
  });
}

function renderInventoryConnectChecklist(inventoryFeed = {}) {
  const inventoryRows = [
    ["Feed state", inventoryFeed.status === "connected" ? "Connected locally" : "Disconnected"],
    ["Credential state", inventoryFeed.hasCredentials ? "Credentials configured" : "Credentials missing"],
    ["Secret handling", "Secret values are never displayed"],
    ["Sync behavior", "Local sync creates placeholder product rows"],
    ["Provider-backed", "Real inventory API sync remains provider-backed"],
  ];
  return `
    <section class="inventory-connect-checklist" data-inventory-connect-checklist>
      <strong>Connection setup</strong>
      <p>Store feed metadata for product-aware content. Live provider sync stays pending until the inventory API is connected.</p>
      <dl>
        ${inventoryRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    </section>
  `;
}

function findLocationById(locationId) {
  return accountState.data?.locations?.find((location) => location.id === locationId);
}

function showLocationForm(location) {
  if (!location) return;

  showAccountForm({
    title: "Edit business location",
    body: "Update the facts generated articles can use for addresses, phone numbers, and service areas.",
    submitText: "Save location",
    fields: [
      { name: "name", label: "Location name", value: location.name, required: true },
      { name: "city", label: "City", value: location.city || "", required: true },
      { name: "state", label: "State", value: location.state || "", placeholder: "CA", required: true },
      { name: "address", label: "Address", value: location.address || "" },
      { name: "phone", label: "Phone", value: location.phone || "" },
      { name: "serviceArea", label: "Service area", value: location.serviceArea || "" },
      { name: "isPrimary", label: "Primary location", type: "select", value: location.isPrimary ? "true" : "false", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }] },
    ],
    onSubmit: async (values) => {
      const payload = await requestJson(`/api/account/locations/${location.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...location, ...values, isPrimary: values.isPrimary === "true" }),
      });
      if (payload.account) accountState.data = payload.account;
      else accountState.data.locations = payload.locations;
      renderAccountData();
      setAccountOperation("Location updated.");
    },
  });
}

function showLocationDetail(locationId) {
  const location = findLocationById(locationId);
  if (!location) return;

  const cityState = [location.city, location.state].filter(Boolean).join(", ") || "Not set";
  const bodyHtml = `
    <div class="location-detail-card" data-location-detail-card>
      <p><b>Name:</b> ${escapeHtml(location.name || "Untitled location")}</p>
      <p><b>City/state:</b> ${escapeHtml(cityState)}</p>
      <p><b>Address:</b> ${escapeHtml(location.address || "Not set")}</p>
      <p><b>Phone:</b> ${escapeHtml(location.phone || "Not set")}</p>
      <p><b>Service area:</b> ${escapeHtml(location.serviceArea || "Not set")}</p>
      <p><b>Status:</b> ${location.isPrimary ? "Primary" : "Secondary"}</p>
    </div>
  `;
  const extraActions = isReadOnlyWorkspace()
    ? []
    : [
        {
          label: "Edit location",
          keepOpenAfterClick: true,
          onClick: () => showLocationForm(location),
        },
      ];

  showAccountForm({
    title: "Location detail",
    bodyHtml,
    submitText: "Close",
    extraActions,
    onSubmit: async () => {},
  });
}

function findSupportTicketById(ticketId) {
  return accountState.data?.supportTickets?.find((ticket) => ticket.id === ticketId);
}

function showSupportReplyForm(ticket) {
  if (!ticket) return;

  showAccountForm({
    title: "Reply to support ticket",
    body: ticket.subject || "Add local support notes.",
    submitText: "Save reply",
    fields: [{ name: "reply", label: "Reply", type: "textarea", rows: 4, required: true }],
    onSubmit: async (values) => {
      const payload = await requestJson(`/api/account/support/${ticket.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: ticket.status || "open", reply: values.reply }),
      });
      if (payload.account) {
        accountState.data = payload.account;
        renderAccountData();
      } else {
        accountState.data.supportTickets = payload.supportTickets;
        renderSupport(accountState.data);
      }
      setAccountOperation("Support reply saved locally.");
    },
  });
}

function showSupportTicketDetail(ticketId) {
  const ticket = findSupportTicketById(ticketId);
  if (!ticket) return;

  const replies = Array.isArray(ticket.replies) ? ticket.replies : [];
  const threadHtml = replies.length
    ? replies
        .map((reply) => {
          const author = reply.authorEmail || ticket.requesterEmail || "local account";
          const created = reply.createdAt ? new Date(reply.createdAt).toLocaleString() : "recently";
          return `<article class="support-thread-entry"><strong>${escapeHtml(author)}</strong><small>${escapeHtml(created)}</small><p>${escapeHtml(reply.message || "")}</p></article>`;
        })
        .join("")
    : '<p class="account-muted">No replies yet.</p>';
  const bodyHtml = `
    <div class="support-detail-card" data-support-detail-card>
      <p><b>Subject:</b> ${escapeHtml(ticket.subject || "Untitled support ticket")}</p>
      <p><b>Status:</b> ${escapeHtml(ticket.status || "open")}</p>
      <p><b>Category:</b> ${escapeHtml(ticket.category || "Setup")}</p>
      <p><b>Priority:</b> ${escapeHtml(ticket.priority || "normal")}</p>
      <p><b>Page context:</b> ${escapeHtml(ticket.pageContext || "Not set")}</p>
      <p><b>Requester:</b> ${escapeHtml(ticket.requesterEmail || "Not set")}</p>
      <p><b>Initial details:</b> ${escapeHtml(ticket.message || "No details provided")}</p>
      <div class="support-thread-list"><b>Thread</b>${threadHtml}</div>
    </div>
  `;
  const extraActions = isReadOnlyWorkspace()
    ? []
    : [
        {
          label: "Reply",
          keepOpenAfterClick: true,
          onClick: () => showSupportReplyForm(ticket),
        },
      ];

  showAccountForm({
    title: "Support ticket detail",
    bodyHtml,
    submitText: "Close",
    extraActions,
    onSubmit: async () => {},
  });
}

function findInviteById(inviteId) {
  return accountState.data?.invites?.find((invite) => invite.id === inviteId);
}

function findMemberById(memberId) {
  return accountState.data?.members?.find((member) => member.id === memberId);
}

function findTeamActivityById(activityId) {
  return accountState.data?.activityLog?.find((event) => event.id === activityId);
}

function showTeamActivityDetail(activityId) {
  const event = findTeamActivityById(activityId);
  if (!event) return;

  const created = event.createdAt ? new Date(event.createdAt).toLocaleString() : "recently";
  const bodyHtml = `
    <div class="team-activity-detail-card" data-team-activity-detail-card>
      <p><b>Event:</b> ${escapeHtml(event.label || "Team update")}</p>
      <p><b>Type:</b> ${escapeHtml(event.type || "activity")}</p>
      <p><b>Target:</b> ${escapeHtml(event.targetEmail || "Not set")}</p>
      <p><b>Actor:</b> ${escapeHtml(event.actorEmail || "Not set")}</p>
      <p><b>Role:</b> ${escapeHtml(event.role || "Not set")}</p>
      <p><b>Created:</b> ${escapeHtml(created)}</p>
    </div>
  `;

  showAccountForm({
    title: "Team activity detail",
    bodyHtml,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function showMemberDetail(memberId) {
  const member = findMemberById(memberId);
  if (!member) return;

  const roleUpdatedAt = member.roleUpdatedAt ? new Date(member.roleUpdatedAt).toLocaleString() : "";
  const bodyHtml = `
    <div class="member-detail-card" data-member-detail-card>
      <p><b>Name:</b> ${escapeHtml(member.name || member.email || "Team member")}</p>
      <p><b>Email:</b> ${escapeHtml(member.email || "No email")}</p>
      <p><b>Role:</b> ${escapeHtml(member.role || "member")}</p>
      <p><b>Status:</b> ${escapeHtml(member.status || "active")}</p>
      <p><b>Role updated by:</b> ${escapeHtml(member.roleUpdatedBy || "No role changes recorded")}${roleUpdatedAt ? ` · ${escapeHtml(roleUpdatedAt)}` : ""}</p>
    </div>
  `;

  showAccountForm({
    title: "Member detail",
    bodyHtml,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function showInviteDetail(inviteId) {
  const invite = findInviteById(inviteId);
  if (!invite) return;

  const inviteUrl = normalizeLocalInviteUrl(invite.link);
  const bodyHtml = `
    <div class="invite-detail-card" data-invite-detail-card>
      <p><b>Recipient:</b> ${escapeHtml(invite.email || "No email")}</p>
      <p><b>Role:</b> ${escapeHtml(invite.role || "member")}</p>
      <p><b>Status:</b> ${escapeHtml(invite.status || "pending")}</p>
      <p><b>Invite link:</b> ${inviteUrl ? `<a href="${escapeAttribute(inviteUrl)}" target="_blank" rel="noopener">${escapeHtml(inviteUrl)}</a>` : "Unavailable"}</p>
      <p><b>Delivery:</b> Local link only. Email delivery remains provider integration work.</p>
    </div>
  `;
  const extraActions = inviteUrl
    ? [
        {
          label: "Copy link",
          keepOpenAfterClick: true,
          onClick: async () => {
            const copied = await copyTextToClipboard(inviteUrl);
            setAccountOperation(copied ? "Invite link copied." : "Invite link could not be copied.", !copied);
          },
        },
      ]
    : [];

  showAccountForm({
    title: "Invite detail",
    bodyHtml,
    submitText: "Close",
    extraActions,
    onSubmit: async () => {},
  });
}

function renderTopics(account, topics = accountState.topicSearchResults || account.topics || []) {
  if (!topicList) return;
  const readOnly = isReadOnlyWorkspace();
  const allTopics = topics || [];
  const filteredTopics = visibleTopics(account, allTopics);
  if (readOnly) accountState.selectedTopicIds.clear();
  const selectedCount = Array.from(accountState.selectedTopicIds).filter((id) => allTopics.some((topic) => topic.id === id)).length;
  topicSortButtons.forEach((button) => {
    const active = button.dataset.topicSort === accountState.topicSort.field;
    button.setAttribute("aria-sort", active ? (accountState.topicSort.direction === "asc" ? "ascending" : "descending") : "none");
    button.classList.toggle("is-active", active);
  });
  if (keywordTotal) keywordTotal.textContent = String(allTopics.length);
  if (keywordFiltered) keywordFiltered.textContent = `${filteredTopics.length} of ${allTopics.length} keywords`;
  if (keywordSelected) keywordSelected.textContent = `${selectedCount} selected`;
  if (keywordSearchAction) keywordSearchAction.disabled = readOnly;
  if (keywordFindTopicsAction) keywordFindTopicsAction.disabled = readOnly;
  if (keywordMagicSelectAction) keywordMagicSelectAction.disabled = readOnly || filteredTopics.length === 0;
  if (keywordSaveAction) keywordSaveAction.disabled = readOnly || selectedCount === 0;
  topicSelectAllControls.forEach((control) => {
    control.disabled = readOnly || filteredTopics.length === 0;
    if ("checked" in control) {
      control.checked = Boolean(filteredTopics.length) && filteredTopics.every((topic) => accountState.selectedTopicIds.has(topic.id));
      control.indeterminate = filteredTopics.some((topic) => accountState.selectedTopicIds.has(topic.id)) && !control.checked;
    }
  });

  topicList.innerHTML = "";

  if (!filteredTopics.length) {
    topicList.innerHTML = allTopics.length
      ? '<tr><td colspan="7">No keywords match these filters.</td></tr>'
      : '<tr><td colspan="7">No topic ideas yet. Add a topic or search keywords to start planning.</td></tr>';
    return;
  }

  filteredTopics.forEach((topic) => {
    const row = document.createElement("tr");
    const difficultyScore = getTopicDifficultyScore(topic);
    const cpc = Number(topic.cpc || 0);
    const competition = Number(topic.competition || 0);
    const readOnlyDisabled = readOnly ? "disabled" : "";
    row.innerHTML = `<td><input type="checkbox" data-topic-select="${escapeAttribute(topic.id)}" ${accountState.selectedTopicIds.has(topic.id) ? "checked" : ""} ${readOnlyDisabled} aria-label="Select ${escapeAttribute(topic.keyword || topic.title)}" /></td><td><button class="topic-detail-link" type="button" data-topic-detail="${escapeAttribute(topic.id)}"><strong>${escapeHtml(topic.keyword || topic.title)}</strong><p>${escapeHtml(topic.title)}</p></button></td><td>${formatVolume(topic.volume)}</td><td>$${cpc.toFixed(2)}</td><td>${renderKeywordMetricBar("difficulty", difficultyScore, 100, String(difficultyScore))}<small>${escapeHtml(topic.difficulty || "Needs review")}</small></td><td>${renderKeywordMetricBar("competition", competition, 1, competition.toFixed(2))}</td><td data-topic-actions-cell hidden><div class="blog-table-actions"><button type="button" data-topic-edit="${escapeAttribute(topic.id)}" ${readOnlyDisabled}>Edit</button><button type="button" data-topic-add="${escapeAttribute(topic.id)}" ${readOnly || topic.added ? "disabled" : ""}>${topic.added ? "Added" : "Add"}</button><button type="button" data-topic-delete="${escapeAttribute(topic.id)}" ${readOnlyDisabled}>Delete</button></div></td>`;
    topicList.appendChild(row);
  });
}

function renderProducts(account) {
  if (!productsList) return;
  const readOnlyDisabled = isReadOnlyWorkspace() ? "disabled" : "";
  const inventoryFeed = account.inventoryFeed || {};
  const allProducts = account.products || [];
  const hasProductListContext = allProducts.length > 0 || inventoryFeed.status === "connected";
  renderInventoryStatePanel(account);
  if (productsManualControls) productsManualControls.hidden = false;
  productsList.hidden = false;
  if (!hasProductListContext) {
    accountState.productFilter = "all";
    accountState.productSearch = "";
    if (productSearchInput) productSearchInput.value = "";
    productFilterButtons.forEach((button) => {
      const active = button.dataset.productFilter === "all";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    productsList.innerHTML = '<div class="empty-state"><span class="products-empty-icon" aria-hidden="true"><svg><use href="#account-icon-cube"></use></svg></span><strong>No products yet</strong><p>Add your first product</p></div>';
    return;
  }
  const activeFilter = accountState.productFilter || "all";
  productFilterButtons.forEach((button) => {
    const active = button.dataset.productFilter === activeFilter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const products = allProducts.filter((product) => {
    const filter = activeFilter;
    const matchesFilter =
      filter === "all" ||
      (filter === "hidden" && product.hidden) ||
      (filter === "manual" && product.source === "manual" && !product.hidden) ||
      (filter === "synced" && product.source !== "manual" && !product.hidden);
    const query = accountState.productSearch.toLowerCase();
    const matchesQuery = !query || `${product.name} ${product.category} ${product.description} ${product.price} ${product.sku} ${product.audience}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  productsList.innerHTML = "";
  if (!products.length) {
    productsList.innerHTML = allProducts.length
      ? '<div class="empty-state"><span class="products-empty-icon" aria-hidden="true"><svg><use href="#account-icon-cube"></use></svg></span><strong>No products match</strong><p>Adjust the product filters or search term.</p></div>'
      : '<div class="empty-state"><span class="products-empty-icon" aria-hidden="true"><svg><use href="#account-icon-cube"></use></svg></span><strong>No products yet</strong><p>Add your first product</p></div>';
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("article");
    row.className = "entity-row product-row";
    if (row.classList) row.classList.add("product-row");
    const sourceLabel = product.source === "manual" ? "Manual" : "Synced";
    const details = [product.category || "Service", product.price, product.sku, product.audience, product.description, product.url].filter(Boolean);
    const productMetaRows = [
      ["Category", product.category || "Service"],
      ["Price", product.price || "Not set"],
      ["SKU", product.sku || "No SKU"],
      ["Audience", product.audience || "General audience"],
      ["Source", sourceLabel],
      ["Visibility", product.hidden ? "Hidden" : "Visible"],
      product.url ? ["URL", product.url] : null,
    ].filter(Boolean);
    const badges = [
      `<span class="product-badge product-badge-source">${escapeHtml(sourceLabel)}</span>`,
      product.featured ? '<span class="product-badge product-badge-featured">Featured</span>' : "",
      `<span class="product-badge ${product.hidden ? "product-badge-hidden" : "product-badge-visible"}">${product.hidden ? "Hidden" : "Visible"}</span>`,
    ].filter(Boolean).join("");
    row.innerHTML = `<button class="product-detail-link" type="button" data-product-detail="${escapeAttribute(product.id)}"><span class="product-row-heading"><strong>${escapeHtml(product.name)}</strong><span class="product-badges">${badges}</span></span><p>${details.map((detail) => escapeHtml(detail)).join(" · ")}</p><dl class="product-meta-grid">${productMetaRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></button><button type="button" data-product-edit="${escapeAttribute(product.id)}" ${readOnlyDisabled}>Edit</button><button type="button" data-product-toggle="${escapeAttribute(product.id)}" ${readOnlyDisabled}>${product.hidden ? "Show" : "Hide"}</button><button type="button" data-product-delete="${escapeAttribute(product.id)}" ${readOnlyDisabled}>Delete</button>`;
    productsList.appendChild(row);
  });
}

function renderLocations(account) {
  if (!locationsList) return;
  const readOnlyDisabled = isReadOnlyWorkspace() ? "disabled" : "";
  const locations = account.locations || [];
  locationsList.innerHTML = "";

  if (!locations.length) {
    locationsList.innerHTML = '<div class="empty-state locations-empty-state"><span class="locations-empty-icon" aria-hidden="true"><svg><use href="#account-icon-shield-check"></use></svg></span><strong>No locations yet</strong><p>Add your first business location so generated pages and articles use accurate details.</p></div>';
    return;
  }

  locations.forEach((location) => {
    const row = document.createElement("article");
    row.className = "entity-row";
    const cityState = [location.city, location.state].filter(Boolean).join(", ");
    const details = [cityState, location.address || "No address", location.phone, location.serviceArea, location.isPrimary ? "Primary" : ""].filter(Boolean);
    row.innerHTML = `<button class="location-detail-link" type="button" data-location-detail="${escapeAttribute(location.id)}"><strong>${escapeHtml(location.name)}</strong><p>${details.map((detail) => escapeHtml(detail)).join(" · ")}</p></button><button type="button" data-location-edit="${escapeAttribute(location.id)}" ${readOnlyDisabled}>Edit</button><button type="button" data-location-delete="${escapeAttribute(location.id)}" ${readOnlyDisabled}>Delete</button>`;
    locationsList.appendChild(row);
  });
}

function pageSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pagesForLocation(location, account) {
  const city = location.city || location.name || "Location";
  const serviceArea = location.serviceArea || [location.city, location.state].filter(Boolean).join(", ") || "your service area";
  const keyword = account.settings?.site?.keywords?.[0] || "web design";
  const base = [
    {
      title: `${city} ${keyword} page`,
      keyword: `${keyword} ${city}`.trim(),
      intent: "Primary location page",
    },
    {
      title: `${serviceArea} service area page`,
      keyword: `${keyword} ${serviceArea}`.trim(),
      intent: "Service-area landing page",
    },
    {
      title: `${city} local FAQ page`,
      keyword: `${city} ${keyword} questions`.trim(),
      intent: "Local FAQ support page",
    },
  ];
  return base.map((page) => ({
    ...page,
    slug: pageSlug(page.keyword || page.title),
    location,
  }));
}

function pageGeneratorTargets(account) {
  return (account.locations || []).flatMap((location) => pagesForLocation(location, account));
}

function renderPagesGenerator(account) {
  if (!pagesGeneratorList) return;
  const targets = pageGeneratorTargets(account);
  if (pagesGeneratorCount) pagesGeneratorCount.textContent = `${targets.length} local page target${targets.length === 1 ? "" : "s"}`;
  pagesGeneratorList.innerHTML = "";

  if (!targets.length) {
    pagesGeneratorList.innerHTML = '<div class="empty-state bordered"><span>▦</span><strong>No page targets yet</strong><p>Add a business location to choose which location a batch of pages targets.</p></div>';
    return;
  }

  const readOnlyDisabled = isReadOnlyWorkspace() ? "disabled" : "";
  targets.forEach((target) => {
    const row = document.createElement("article");
    row.className = "entity-row pages-generator-row";
    const location = target.location || {};
    const details = [
      target.intent,
      [location.city, location.state].filter(Boolean).join(", "),
      location.serviceArea,
      target.slug ? `/pages/${target.slug}` : "",
    ].filter(Boolean);
    row.innerHTML = `<div><strong>${escapeHtml(target.title)}</strong><p>${details.map((detail) => escapeHtml(detail)).join(" · ")}</p></div><button type="button" data-page-generator-action="open-location" data-page-generator-location="${escapeAttribute(location.id || "")}">Location</button><button type="button" data-page-generator-action="open-builder" data-page-generator-location="${escapeAttribute(location.id || "")}" data-page-generator-keyword="${escapeAttribute(target.keyword)}" data-page-generator-title="${escapeAttribute(target.title)}" ${readOnlyDisabled}>Draft page</button>`;
    pagesGeneratorList.appendChild(row);
  });
}

function renderMembers(account) {
  if (!membersList) return;
  const readOnlyDisabled = isReadOnlyWorkspace() ? "disabled" : "";
  const members = account.members || [];
  membersList.innerHTML = "";

  if (!members.length) {
    return;
  }

  members.forEach((member) => {
    const row = document.createElement("article");
    row.className = "entity-row member-row";
    const role = member.role || "member";
    const memberName = member.name || member.email || "Team member";
    const memberInitial = String(memberName).trim().charAt(0).toUpperCase() || "?";
    const nextRole = role === "member" ? "editor" : role === "editor" ? "admin" : "member";
    const audit = member.roleUpdatedBy
      ? `<small>Role updated by ${escapeHtml(member.roleUpdatedBy)}${member.roleUpdatedAt ? ` · ${escapeHtml(new Date(member.roleUpdatedAt).toLocaleString())}` : ""}</small>`
      : "";
    row.innerHTML = `<span class="member-avatar" data-member-avatar="${escapeAttribute(member.id)}">${escapeHtml(memberInitial)}</span><button class="member-detail-link" type="button" data-member-detail="${escapeAttribute(member.id)}"><strong>${escapeHtml(memberName)}</strong><p>${escapeHtml(member.email)} · ${escapeHtml(role)} · ${escapeHtml(member.status || "active")}</p>${audit}</button><button type="button" data-member-role="${escapeAttribute(member.id)}" data-member-next-role="${escapeAttribute(nextRole)}" ${readOnlyDisabled}>Make ${escapeHtml(nextRole)}</button><button type="button" data-member-delete="${escapeAttribute(member.id)}" ${readOnlyDisabled}>Remove</button>`;
    membersList.appendChild(row);
  });
}

function renderInvites(account) {
  if (!invitesList) return;
  const readOnlyDisabled = isReadOnlyWorkspace() ? "disabled" : "";
  const invites = account.invites || [];
  invitesList.innerHTML = "";

  if (!invites.length) {
    return;
  }

  invites.forEach((invite) => {
    const row = document.createElement("article");
    row.className = "entity-row member-row invite-row";
    if (row.classList) row.classList.add("invite-row");
    const inviteName = invite.email || "Pending invite";
    const inviteInitial = String(inviteName).trim().charAt(0).toUpperCase() || "?";
    row.innerHTML = `<span class="member-avatar invite-avatar" data-invite-avatar="${escapeAttribute(invite.id)}">${escapeHtml(inviteInitial)}</span><button class="invite-detail-link" type="button" data-invite-detail="${escapeAttribute(invite.id)}"><strong>${escapeHtml(invite.email)}</strong><p>${escapeHtml(invite.role || "member")} · ${escapeHtml(invite.status)} · ${escapeHtml(invite.link)}</p></button><button type="button" data-invite-copy="${escapeAttribute(invite.id)}">Copy</button><button type="button" data-invite-delete="${escapeAttribute(invite.id)}" ${readOnlyDisabled}>Revoke</button>`;
    invitesList.appendChild(row);
  });
}

function renderTeamActivity(account) {
  if (!teamActivityList) return;
  const events = account.activityLog || [];
  teamActivityList.innerHTML = "";
  if (teamActivitySection) teamActivitySection.hidden = !events.length;

  if (!events.length) {
    return;
  }

  events.slice(0, 6).forEach((event) => {
    const row = document.createElement("article");
    row.className = "entity-row";
    const created = event.createdAt ? new Date(event.createdAt).toLocaleString() : "recently";
    const detail = [event.targetEmail, event.role, event.actorEmail ? `by ${event.actorEmail}` : ""].filter(Boolean).join(" · ");
    row.innerHTML = `<button class="team-activity-detail-link" type="button" data-team-activity-detail="${escapeAttribute(event.id)}"><strong>${escapeHtml(event.label || "Team update")}</strong><p>${escapeHtml(detail)}</p><small>${escapeHtml(created)}</small></button>`;
    teamActivityList.appendChild(row);
  });
}

function formatBillingStatusLabel(status) {
  return status === "past_due" ? "Past due" : String(status || "trial").charAt(0).toUpperCase() + String(status || "trial").slice(1);
}

function renderBilling(account) {
  const billing = account.billing || {};
  const plan = billing.plan || "Pro";
  const status = billing.status || "trial";
  const period = billing.billingPeriod || "annual";
  const readOnly = isReadOnlyWorkspace();

  if (billingPlanLabel) billingPlanLabel.textContent = plan;
  if (billingStatusLabel) billingStatusLabel.textContent = formatBillingStatusLabel(status);
  if (billingSummary) {
    billingSummary.textContent = `${billing.price || "$49/mo annual"} · ${period}. ${
      status === "past_due"
        ? "Payment needs attention before the next publish cycle."
        : status === "cancelled"
          ? "Plan is cancelled locally."
          : "Local billing state is active for dashboard gating."
    }`;
  }
  if (billingPayment) billingPayment.textContent = billing.paymentMethod || "Not connected";
  if (billingPortalStatus) {
    billingPortalStatus.textContent =
      billing.portalStatus === "not-connected"
        ? "Stripe portal is not connected in this local dashboard shell."
        : `Billing portal state: ${billing.portalStatus}.`;
  }
  if (billingStatePanel) {
    const invoices = billing.invoices || [];
    const latestInvoice = invoices[0] || {};
    const failedPayment = billing.failedPayment || {};
    const statusLabel = formatBillingStatusLabel(status);
    const latestInvoiceLabel = latestInvoice.id
      ? `${latestInvoice.id} · ${latestInvoice.status || "local"}`
      : "No invoice yet";
    const paymentIssue = status === "past_due"
      ? failedPayment.reason || latestInvoice.failureReason || "Payment needs attention"
      : "No active payment issue";
    const retryLabel = failedPayment.retryAt ? formatDateLabel(String(failedPayment.retryAt).slice(0, 10)) : "No retry scheduled";
    const recordedLabel = failedPayment.recordedAt ? formatDateLabel(String(failedPayment.recordedAt).slice(0, 10)) : "No failure recorded";
    const lifecycleRows = [
      ["Payment method", billing.paymentMethod || "Not connected"],
      ["Portal", billing.portalStatus || "not-connected"],
      ["Latest invoice", latestInvoiceLabel],
      ["Payment issue", paymentIssue],
      ["Retry date", retryLabel],
      ["Failure recorded", recordedLabel],
    ];
    const actionRows = [
      ["Plan change", readOnly ? "Owner access required" : "Local dashboard update"],
      ["Portal handoff", billing.portalStatus === "not-connected" ? "Provider-backed portal pending" : billing.portalStatus],
      ["Payment retry", status === "past_due" ? retryLabel : "No retry needed"],
      ["Provider-backed", "Stripe checkout and invoice payment still require integration"],
    ];
    billingStatePanel.className = status === "past_due" ? "billing-state-panel is-error" : "billing-state-panel";
    billingStatePanel.innerHTML = `
      <div>
        <span>Billing state</span>
        <strong>${escapeHtml(plan)}</strong>
        <p>${escapeHtml(`${statusLabel} · ${period} · ${billing.price || "$49/mo annual"}`)}</p>
      </div>
      <dl>
        ${lifecycleRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <section class="billing-action-checklist" data-billing-action-checklist>
        <button class="billing-action-detail-link" type="button" data-billing-action-detail="true">
          <strong>Billing actions</strong>
          <p>Review plan changes, portal handoff, retry, cancel, and provider limits.</p>
        </button>
        <dl>
          ${actionRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </section>
    `;
  }
  if (billingAlert) {
    const failedPayment = billing.failedPayment || {};
    if (status === "past_due") {
      billingAlert.hidden = false;
      billingAlert.innerHTML = `<strong>Payment failed</strong><p>${escapeHtml(failedPayment.reason || "The latest local payment attempt failed.")}${failedPayment.retryAt ? ` Retry scheduled for ${escapeHtml(formatDateLabel(failedPayment.retryAt))}.` : ""}</p><button type="button" data-account-action="billing-portal" ${readOnly ? "disabled" : ""}>Open billing portal</button>`;
    } else {
      billingAlert.hidden = true;
      billingAlert.innerHTML = "";
    }
  }

  billingPlanActions.forEach((button) => {
    const active = button.dataset.billingPlanAction === plan;
    button.textContent = active ? `Current ${button.dataset.billingPlanAction}` : `Use ${button.dataset.billingPlanAction}`;
    button.disabled = readOnly || (active && status !== "cancelled");
  });

  billingPeriodActions.forEach((button) => {
    const active = button.dataset.billingPeriodAction === period;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.disabled = readOnly;
  });

  if (billingPortalAction) billingPortalAction.disabled = readOnly;
  if (billingCancelAction) billingCancelAction.disabled = readOnly || status === "cancelled";
  if (billingReactivateAction) billingReactivateAction.disabled = readOnly || status !== "cancelled";

  if (billingInvoiceList) {
    const invoices = billing.invoices || [];
    billingInvoiceList.innerHTML = "";

    if (!invoices.length) {
      billingInvoiceList.innerHTML = '<div class="empty-state bordered"><span>▭</span><strong>No invoices yet</strong><p>Invoices appear after a checkout or billing portal sync.</p></div>';
    } else {
      invoices.forEach((invoice) => {
        const row = document.createElement("article");
        row.className = "entity-row";
        row.innerHTML = `<div><strong>${escapeHtml(invoice.plan)} · ${escapeHtml(invoice.amount)}</strong><p>${escapeHtml(invoice.date)} · ${escapeHtml(invoice.status)}${invoice.failureReason ? ` · ${escapeHtml(invoice.failureReason)}` : ""}</p></div><button type="button" data-invoice-detail="${escapeAttribute(invoice.id)}">View details</button><span>${escapeHtml(invoice.id)}</span>`;
        billingInvoiceList.appendChild(row);
      });
    }
  }
}

function showBillingActionDetail() {
  const billing = accountState.data?.billing || {};
  const status = billing.status || "trial";
  const invoices = billing.invoices || [];
  const latestInvoice = invoices[0] || {};
  const failedPayment = billing.failedPayment || {};
  const retryLabel = failedPayment.retryAt ? formatDateLabel(String(failedPayment.retryAt).slice(0, 10)) : "No retry scheduled";
  const latestInvoiceLabel = latestInvoice.id
    ? `${latestInvoice.id} · ${latestInvoice.status || "local"}`
    : "No invoice yet";
  const paymentIssue = status === "past_due"
    ? failedPayment.reason || latestInvoice.failureReason || "Payment needs attention"
    : "No active payment issue";
  const rows = [
    ["Plan", billing.plan || "Pro"],
    ["Status", formatBillingStatusLabel(status)],
    ["Billing period", billing.billingPeriod || "annual"],
    ["Payment method", billing.paymentMethod || "Not connected"],
    ["Portal", billing.portalStatus || "not-connected"],
    ["Latest invoice", latestInvoiceLabel],
    ["Payment issue", paymentIssue],
    ["Retry date", retryLabel],
    ["Plan change", isReadOnlyWorkspace() ? "Owner access required" : "Local dashboard update"],
    ["Portal action", "Open billing portal"],
    ["Cancel action", status === "cancelled" ? "Already cancelled locally" : "Cancel disabled until payment state is resolved by owner action"],
    ["Reactivate action", status === "cancelled" ? "Available locally" : "Requires cancelled billing status"],
    ["Provider-backed", "Stripe checkout and real payment-method management still need provider integration"],
    ["Target evidence gap", "Exact billing portal and cancellation copy still needs target screenshot evidence"],
  ];

  showAccountForm({
    title: "Billing action detail",
    bodyHtml: `
      <div class="billing-action-detail-card" data-billing-action-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function chartPolyline(points, field, maxValue) {
  if (!points.length) return "";
  const width = 640;
  const height = 180;
  return points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
      const y = height - (Number(point[field] || 0) / Math.max(1, maxValue)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderSearchChart(search) {
  if (!searchChart) return;
  const points = Array.isArray(search.trend) ? search.trend : [];
  if (search.status !== "connected" || !points.length) {
    searchChart.innerHTML = '<div class="empty-state bordered"><span>☷</span><strong>No traffic trend yet</strong><p>Connect and sync Search Console to render local trend data.</p></div>';
    return;
  }

  const maxClicks = Math.max(...points.map((point) => Number(point.clicks || 0)), 1);
  const maxImpressions = Math.max(...points.map((point) => Number(point.impressions || 0)), 1);
  const clickPoints = chartPolyline(points, "clicks", maxClicks);
  const impressionPoints = chartPolyline(points, "impressions", maxImpressions);
  const firstDate = formatDateLabel(points[0]?.date);
  const lastDate = formatDateLabel(points[points.length - 1]?.date);
  searchChart.innerHTML = `<svg viewBox="0 0 700 230" role="img" aria-label="Search Console clicks and impressions trend"><g class="search-chart-grid"><line x1="30" y1="20" x2="30" y2="200"></line><line x1="30" y1="200" x2="670" y2="200"></line><line x1="30" y1="110" x2="670" y2="110"></line></g><polyline data-search-chart-line="impressions" points="${escapeAttribute(impressionPoints)}" transform="translate(30 20)"></polyline><polyline data-search-chart-line="clicks" points="${escapeAttribute(clickPoints)}" transform="translate(30 20)"></polyline><text x="30" y="222">${escapeHtml(firstDate)}</text><text x="610" y="222">${escapeHtml(lastDate)}</text></svg>`;
}

function renderPublicBlogPath(value) {
  const path = String(value || "").trim();
  if (isLocalBlogPath(path)) {
    return `<a href="${escapeAttribute(path)}">${escapeHtml(path)}</a>`;
  }
  return escapeHtml(path || "No public URL");
}

function selectedReportTemplate(value) {
  const key = typeof value === "object" && value ? value.key : value;
  return reportTemplateCatalog.find((template) => template.key === key) || reportTemplateCatalog[0];
}

function formatSearchPropertyLabel(value) {
  const property = String(value || "").trim();
  if (!property) return "";
  try {
    const url = new URL(property);
    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  } catch {
    return property.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function searchRowDetailAttributes(rowData, kind) {
  return `data-search-row-detail="${escapeAttribute(kind)}" data-search-row-label="${escapeAttribute(rowData.label || "Unknown")}" data-search-row-clicks="${escapeAttribute(String(Number(rowData.clicks || 0)))}" data-search-row-impressions="${escapeAttribute(String(Number(rowData.impressions || 0)))}"`;
}

function showSearchRowDetail(rowData = {}) {
  const kind = rowData.searchRowDetail === "page" ? "Top Performing Post" : "Top Search Query";
  const label = rowData.searchRowLabel || "Unknown";
  const clicks = Number(rowData.searchRowClicks || 0);
  const impressions = Number(rowData.searchRowImpressions || 0);
  const bodyHtml = `
    <div class="search-row-detail-card" data-search-row-detail-card>
      <p><b>Type:</b> ${escapeHtml(kind)}</p>
      <p><b>Label:</b> ${escapeHtml(label)}</p>
      <p><b>Clicks:</b> ${escapeHtml(clicks.toLocaleString())}</p>
      <p><b>Impressions:</b> ${escapeHtml(impressions.toLocaleString())}</p>
      <p><b>Source:</b> Local Search Console snapshot. Real Google OAuth and freshness validation remain integration work.</p>
    </div>
  `;

  showAccountForm({
    title: "Search Console row detail",
    bodyHtml,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function showRankingDetail(indexValue) {
  const index = Number(indexValue);
  const keyword = Number.isInteger(index) ? accountState.data?.rankings?.keywords?.[index] : null;
  if (!keyword) return;

  const position = Number(keyword.position || 0);
  const change = Number(keyword.change || 0);
  const bodyHtml = `
    <div class="ranking-detail-card" data-ranking-detail-card>
      <p><b>Keyword:</b> ${escapeHtml(keyword.keyword || "Tracked keyword")}</p>
      <p><b>URL:</b> ${isLocalBlogPath(keyword.url) ? `<a href="${escapeAttribute(keyword.url)}">${escapeHtml(keyword.url)}</a>` : escapeHtml(keyword.url || "No URL")}</p>
      <p><b>Position:</b> #${escapeHtml(String(position || "Not ranked"))}</p>
      <p><b>Change:</b> ${escapeHtml(`${change >= 0 ? "+" : ""}${change}`)}</p>
      <p><b>Date range:</b> ${escapeHtml(accountState.data?.rankings?.dateRange || accountState.rankingsRange || "30")} days</p>
      <p><b>Source:</b> Local ranking snapshot. Real rank-tracking provider data remains integration work.</p>
    </div>
  `;

  showAccountForm({
    title: "Ranking detail",
    bodyHtml,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function showMentionDetail(indexValue) {
  const index = Number(indexValue);
  const mention = Number.isInteger(index) ? accountState.data?.aiMentions?.mentions?.[index] : null;
  if (!mention) return;

  const bodyHtml = `
    <div class="mention-detail-card" data-mention-detail-card>
      <p><b>Source:</b> ${escapeHtml(mention.source || "Unknown source")}</p>
      <p><b>Model:</b> ${escapeHtml(mention.model || "Local model")}</p>
      <p><b>Prompt:</b> ${escapeHtml(mention.prompt || "No prompt")}</p>
      <p><b>Status:</b> ${escapeHtml(mention.status || "monitoring")}</p>
      <p><b>Date range:</b> ${escapeHtml(accountState.data?.aiMentions?.dateRange || accountState.mentionsRange || "30")} days</p>
      <p><b>Source:</b> Local AI mention snapshot. Real assistant/source monitoring remains integration work.</p>
    </div>
  `;

  showAccountForm({
    title: "AI mention detail",
    bodyHtml,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function showReportRowDetail(indexValue) {
  const index = Number(indexValue);
  const rows = buildLocalReports(accountState.data || {}).rows;
  const reportRows = accountState.data?.reports?.rows || rows;
  const item = Number.isInteger(index) ? reportRows[index] : null;
  if (!item) return;

  const publicPath = String(item.publicPath || "").trim();
  const bodyHtml = `
    <div class="report-detail-card" data-report-detail-card>
      <p><b>Section:</b> ${escapeHtml(item.section || "report")}</p>
      <p><b>Label:</b> ${escapeHtml(item.label || "Report row")}</p>
      <p><b>Value:</b> ${escapeHtml(item.value || "Not set")}</p>
      <p><b>Detail:</b> ${escapeHtml(item.detail || "No detail")}</p>
      <p><b>Public path:</b> ${isLocalBlogPath(publicPath) ? `<a href="${escapeAttribute(publicPath)}">${escapeHtml(publicPath)}</a>` : escapeHtml(publicPath || "No public path")}</p>
      <p><b>Source:</b> Local dashboard rollup. Scheduled email delivery and richer provider exports remain integration work.</p>
    </div>
  `;

  showAccountForm({
    title: "Report row detail",
    bodyHtml,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function showSeoDetail(detailValue) {
  const [kind, rawIndex] = String(detailValue || "").split(":");
  const index = Number(rawIndex);
  const analysis = accountState.data?.seoAnalysis || buildLocalSeoAnalysis(accountState.data || {});
  const source = kind === "check" ? analysis.checks : kind === "opportunity" ? analysis.opportunities : analysis.issues;
  const item = Number.isInteger(index) ? source?.[index] : null;
  if (!item) return;

  const publicPath = String(item.publicPath || "").trim();
  const titleKind = kind === "opportunity" ? "opportunity" : kind === "check" ? "check" : "issue";
  const bodyHtml = `
    <div class="seo-detail-card" data-seo-detail-card>
      <p><b>Type:</b> ${escapeHtml(titleKind)}</p>
      <p><b>Label:</b> ${escapeHtml(item.label || "SEO row")}</p>
      ${item.status ? `<p><b>Status:</b> ${escapeHtml(item.status)}</p>` : ""}
      <p><b>Detail:</b> ${escapeHtml(item.detail || "No detail")}</p>
      <p><b>Public path:</b> ${isLocalBlogPath(publicPath) ? `<a href="${escapeAttribute(publicPath)}">${escapeHtml(publicPath)}</a>` : escapeHtml(publicPath || "No public path")}</p>
      <p><b>Source:</b> Local SEO readiness analysis. Real crawler data and live schema validation remain integration work.</p>
    </div>
  `;

  showAccountForm({
    title: `SEO ${titleKind} detail`,
    bodyHtml,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function renderSearchRows(target, rows, emptyCopy) {
  if (!target) return;
  target.innerHTML = "";
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state bordered";
    empty.innerHTML = `<span>☷</span><strong>${escapeHtml(emptyCopy.title)}</strong><p>${escapeHtml(emptyCopy.body)}</p>`;
    target.appendChild(empty);
    return;
  }
  rows.forEach((rowData) => {
    const row = document.createElement("article");
    row.className = "search-table-row";
    const kind = rowData.isPublicPath ? "page" : "query";
    const label = rowData.label || "Unknown";
    const publicLink = rowData.isPublicPath && isLocalBlogPath(label) ? `<a href="${escapeAttribute(label)}">Open</a>` : "";
    row.innerHTML = `<span class="search-table-primary"><button class="search-row-detail-link" type="button" ${searchRowDetailAttributes(rowData, kind)}>${escapeHtml(label)}</button>${publicLink}</span><span class="search-table-clicks">${Number(rowData.clicks || 0).toLocaleString()}</span><span class="search-table-impressions">${Number(rowData.impressions || 0).toLocaleString()}</span>`;
    target.appendChild(row);
  });
}

function renderSearchConsole(account) {
  const search = account.searchConsole || {};
  const isConnected = search.status === "connected";
  const readOnly = isReadOnlyWorkspace();
  const activeView = accountState.searchView || "queries";
  const filter = (accountState.searchFilter || "").toLowerCase();
  if (searchConnectAction) {
    searchConnectAction.hidden = isConnected;
    searchConnectAction.disabled = readOnly;
  }
  if (searchSyncAction) {
    searchSyncAction.hidden = true;
    searchSyncAction.disabled = readOnly || !isConnected;
  }
  if (searchExportAction) {
    searchExportAction.hidden = true;
    searchExportAction.disabled = !isConnected;
  }
  if (searchDisconnectAction) {
    searchDisconnectAction.hidden = !isConnected;
    searchDisconnectAction.disabled = readOnly || !isConnected;
  }
  if (searchRangeInput) searchRangeInput.disabled = !isConnected;
  searchRowLimitInputs.forEach((input) => {
    input.disabled = !isConnected;
  });
  if (searchFilterInput) searchFilterInput.disabled = !isConnected;
  if (searchClicks) searchClicks.textContent = Number(search.clicks || 0).toLocaleString();
  if (searchImpressions) searchImpressions.textContent = Number(search.impressions || 0).toLocaleString();
  if (searchIndexed) searchIndexed.textContent = Number(search.indexedPages || 0).toLocaleString();
  if (searchStatus) {
    searchStatus.textContent = isConnected && search.propertyUrl
      ? `Connected to: ${formatSearchPropertyLabel(search.propertyUrl)}`
      : "Connect Google Search Console to measure impressions, clicks, and indexed content.";
  }
  if (searchRangeInput) searchRangeInput.value = search.dateRange || "28";
  searchRowLimitInputs.forEach((input) => {
    input.value = String(accountState.searchRowLimit || 10);
  });
  if (searchListTitle) searchListTitle.textContent = activeView === "pages" ? "Top Performing Posts" : "Top Search Queries";
  renderSearchChart(search);
  searchViewButtons.forEach((button) => {
    const active = button.dataset.searchView === activeView;
    button.disabled = !isConnected;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const rowLimit = Number(accountState.searchRowLimit || 10);
  const pageRows = (search.topPages || [])
    .map((page) => ({ label: page.page, detail: `${Number(page.clicks || 0).toLocaleString()} clicks${page.impressions ? ` · ${Number(page.impressions || 0).toLocaleString()} impressions` : ""}`, clicks: page.clicks, impressions: page.impressions, isPublicPath: true }))
    .filter((row) => !filter || `${row.label || ""} ${row.detail || ""}`.toLowerCase().includes(filter))
    .slice(0, rowLimit);
  const queryRows = (search.topQueries || [])
    .map((query) => ({
      label: query.query,
      detail: `${Number(query.clicks || 0).toLocaleString()} clicks · ${Number(query.impressions || 0).toLocaleString()} impressions`,
      clicks: query.clicks,
      impressions: query.impressions,
    }))
    .filter((row) => !filter || `${row.label || ""} ${row.detail || ""}`.toLowerCase().includes(filter))
    .slice(0, rowLimit);

  if (searchPagesCount) searchPagesCount.textContent = `${pageRows.length} rows`;
  if (searchQueriesCount) searchQueriesCount.textContent = `${queryRows.length} rows`;

  if (!searchDetails) return;
  searchDetails.innerHTML = "";

  if (!isConnected) {
    searchDetails.innerHTML = '<div class="empty-state bordered"><span>☷</span><strong>Search Console is disconnected</strong><p>Connect a property locally to populate dashboard metrics. Real Google token handling still needs integration.</p></div>';
    renderSearchRows(searchPagesList, [], {
      title: "No top posts yet",
      body: "Connect and sync Search Console to show top performing posts.",
    });
    renderSearchRows(searchQueriesList, [], {
      title: "No top queries yet",
      body: "Connect and sync Search Console to show top search queries.",
    });
    return;
  }

  const summary = document.createElement("article");
  summary.className = "entity-row";
  summary.innerHTML = `<div><strong>${escapeHtml(search.propertyUrl)}</strong><p>Local snapshot only · Google OAuth not connected · synced ${search.lastSyncedAt ? new Date(search.lastSyncedAt).toLocaleString() : "not yet"}</p></div><span>Provider pending</span>`;
  searchDetails.appendChild(summary);

  renderSearchRows(searchPagesList, pageRows, {
    title: "No matching top posts",
    body: "Adjust the search term or increase the row limit.",
  });
  renderSearchRows(searchQueriesList, queryRows, {
    title: "No matching top queries",
    body: "Adjust the search term or increase the row limit.",
  });

  const filtered = activeView === "pages" ? pageRows : queryRows;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state bordered";
    empty.innerHTML = "<span>☷</span><strong>No matching Search Console rows</strong><p>Adjust the search term or switch between queries and pages.</p>";
    searchDetails.appendChild(empty);
    return;
  }

  filtered.forEach((rowData) => {
    const row = document.createElement("article");
    row.className = "entity-row";
    const kind = rowData.isPublicPath ? "page" : "query";
    const publicLink = rowData.isPublicPath && isLocalBlogPath(rowData.label) ? `<a href="${escapeAttribute(rowData.label)}">Open post</a>` : "";
    row.innerHTML = `<button class="search-row-detail-link" type="button" ${searchRowDetailAttributes(rowData, kind)}><strong>${escapeHtml(rowData.label)}</strong><p>${escapeHtml(rowData.detail)}</p></button>${publicLink}`;
    searchDetails.appendChild(row);
  });
}

function renderRankingsChart(rankings) {
  if (!rankingsChart) return;
  const points = Array.isArray(rankings.trend) ? rankings.trend : [];
  if (rankings.gated) {
    rankingsChart.innerHTML = '<div class="empty-state bordered"><span>↗</span><strong>Rankings are locked</strong><p>Upgrade billing to Pro+ to unlock local ranking trends.</p></div>';
    return;
  }
  if (!points.length) {
    rankingsChart.innerHTML = '<div class="empty-state bordered"><span>↗</span><strong>No ranking trend yet</strong><p>Refresh rankings after articles are planned to render a local trend.</p></div>';
    return;
  }
  const maxPosition = Math.max(...points.map((point) => Number(point.averagePosition || 0)), 1);
  const linePoints = chartPolyline(points, "averagePosition", maxPosition);
  const firstDate = formatDateLabel(points[0]?.date);
  const lastDate = formatDateLabel(points[points.length - 1]?.date);
  rankingsChart.innerHTML = `<svg viewBox="0 0 700 230" role="img" aria-label="Average ranking position trend"><g class="search-chart-grid"><line x1="30" y1="20" x2="30" y2="200"></line><line x1="30" y1="200" x2="670" y2="200"></line><line x1="30" y1="110" x2="670" y2="110"></line></g><polyline data-rankings-chart-line="average" points="${escapeAttribute(linePoints)}" transform="translate(30 20)"></polyline><text x="30" y="222">${escapeHtml(firstDate)}</text><text x="610" y="222">${escapeHtml(lastDate)}</text></svg>`;
}

function renderRankings(account) {
  if (!rankingsList) return;
  const rankings = account.rankings || {};
  const isGated = Boolean(rankings.gated);
  const keywords = rankings.keywords || [];
  const activeFilter = accountState.rankingsFilter || "all";
  const search = (accountState.rankingsSearch || "").toLowerCase();
  rankingsList.innerHTML = "";
  if (rankingsSummary) rankingsSummary.innerHTML = "";
  accountState.rankingsRange = rankings.dateRange || accountState.rankingsRange || "30";
  if (rankingsRefreshAction) rankingsRefreshAction.disabled = isGated;
  if (rankingsExportAction) rankingsExportAction.disabled = isGated;
  if (rankingsRangeInput) {
    rankingsRangeInput.value = accountState.rankingsRange;
    rankingsRangeInput.disabled = isGated;
  }
  if (rankingsSearchInput) rankingsSearchInput.disabled = isGated;
  renderRankingsChart(rankings);
  rankingsFilterButtons.forEach((button) => {
    const active = button.dataset.rankingsFilter === activeFilter;
    button.disabled = isGated;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (isGated) {
    rankingsList.innerHTML = '<div class="empty-state bordered"><span>↗</span><strong>Rankings require Pro+</strong><p>Upgrade billing to Pro+ to unlock local ranking snapshots. Real rank tracking still needs integration.</p></div>';
    return;
  }

  if (!keywords.length) {
    rankingsList.innerHTML = '<div class="empty-state bordered"><span>↗</span><strong>No ranking data yet</strong><p>Connect Search Console and sync the account to populate rankings.</p></div>';
    return;
  }

  const improved = keywords.filter((keyword) => Number(keyword.change || 0) > 0).length;
  const declined = keywords.filter((keyword) => Number(keyword.change || 0) < 0).length;
  const averagePosition = Math.round(keywords.reduce((sum, keyword) => sum + Number(keyword.position || 0), 0) / keywords.length);
  if (rankingsSummary) {
    rankingsSummary.innerHTML = `<span>${keywords.length} keywords</span><span>${averagePosition} avg. position</span><span>${improved} improved</span><span>${declined} declined</span>`;
  }

  const filtered = keywords
    .map((keyword, index) => ({ ...keyword, sourceIndex: index }))
    .filter((keyword) => {
    const change = Number(keyword.change || 0);
    const matchesFilter = activeFilter === "improved" ? change > 0 : activeFilter === "declined" ? change < 0 : true;
    const matchesSearch = !search || `${keyword.keyword || ""} ${keyword.url || ""}`.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
    });

  if (!filtered.length) {
    rankingsList.innerHTML = '<div class="empty-state bordered"><span>↗</span><strong>No matching rankings</strong><p>Adjust the filter or search term to see tracked keywords.</p></div>';
    return;
  }

  filtered.forEach((keyword) => {
    const row = document.createElement("article");
    row.className = "entity-row";
    const publicLink = isLocalBlogPath(keyword.url) ? `<a href="${escapeAttribute(keyword.url)}">Open post</a>` : "";
    row.innerHTML = `<button class="ranking-detail-link" type="button" data-ranking-detail="${escapeAttribute(String(keyword.sourceIndex))}"><strong>${escapeHtml(keyword.keyword)}</strong><p>${escapeHtml(keyword.url || "No public URL")}</p></button>${publicLink}<span>#${keyword.position}</span><span>${keyword.change >= 0 ? "+" : ""}${keyword.change}</span>`;
    rankingsList.appendChild(row);
  });
}

function renderMentionsChart(mentions) {
  if (!mentionsChart) return;
  const points = Array.isArray(mentions.trend) ? mentions.trend : [];
  if (mentions.gated) {
    mentionsChart.innerHTML = '<div class="empty-state bordered"><span>✦</span><strong>AI Mentions are locked</strong><p>Upgrade billing to Pro+ to unlock local mention trends.</p></div>';
    return;
  }
  if (!points.length) {
    mentionsChart.innerHTML = '<div class="empty-state bordered"><span>✦</span><strong>No mention trend yet</strong><p>Refresh AI Mentions after adding keywords to render local trend data.</p></div>';
    return;
  }
  const maxMentions = Math.max(...points.map((point) => Number(point.mentions || 0)), 1);
  const linePoints = chartPolyline(points, "mentions", maxMentions);
  const firstDate = formatDateLabel(points[0]?.date);
  const lastDate = formatDateLabel(points[points.length - 1]?.date);
  mentionsChart.innerHTML = `<svg viewBox="0 0 700 230" role="img" aria-label="AI mention count trend"><g class="search-chart-grid"><line x1="30" y1="20" x2="30" y2="200"></line><line x1="30" y1="200" x2="670" y2="200"></line><line x1="30" y1="110" x2="670" y2="110"></line></g><polyline data-mentions-chart-line="mentions" points="${escapeAttribute(linePoints)}" transform="translate(30 20)"></polyline><text x="30" y="222">${escapeHtml(firstDate)}</text><text x="610" y="222">${escapeHtml(lastDate)}</text></svg>`;
}

function renderMentionsFilterSelect(select, values, activeValue, allLabel) {
  if (!select) return;
  const options = ["all", ...values.filter(Boolean)];
  select.innerHTML = options.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value === "all" ? allLabel : value)}</option>`).join("");
  select.value = options.includes(activeValue) ? activeValue : "all";
}

function renderAiMentions(account) {
  if (!mentionsList) return;
  const mentions = account.aiMentions || {};
  const isGated = Boolean(mentions.gated);
  const items = mentions.mentions || [];
  const activeFilter = accountState.mentionsFilter || "all";
  accountState.mentionsRange = mentions.dateRange || accountState.mentionsRange || "30";
  const activeSource = accountState.mentionsSource || "all";
  const activeModel = accountState.mentionsModel || "all";
  const search = (accountState.mentionsSearch || "").toLowerCase();
  mentionsList.innerHTML = "";
  if (mentionsSummary) mentionsSummary.innerHTML = "";
  renderMentionsChart(mentions);
  if (mentionsRefreshAction) mentionsRefreshAction.disabled = isGated;
  if (mentionsExportAction) mentionsExportAction.disabled = isGated;
  if (mentionsRangeInput) {
    mentionsRangeInput.value = accountState.mentionsRange;
    mentionsRangeInput.disabled = isGated;
  }
  renderMentionsFilterSelect(mentionsSourceInput, mentions.sources || [], activeSource, "All sources");
  renderMentionsFilterSelect(mentionsModelInput, mentions.models || [], activeModel, "All models");
  if (mentionsSourceInput) mentionsSourceInput.disabled = isGated;
  if (mentionsModelInput) mentionsModelInput.disabled = isGated;
  if (mentionsSearchInput) mentionsSearchInput.disabled = isGated;
  mentionsFilterButtons.forEach((button) => {
    const active = button.dataset.mentionsFilter === activeFilter;
    button.disabled = isGated;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (isGated) {
    mentionsList.innerHTML = '<div class="empty-state bordered"><span>✦</span><strong>AI Mentions require Pro+</strong><p>Upgrade billing to Pro+ to unlock local mention snapshots. Real assistant/source monitoring still needs integration.</p></div>';
    return;
  }

  if (!items.length) {
    mentionsList.innerHTML = '<div class="empty-state bordered"><span>✦</span><strong>No AI mentions yet</strong><p>Add site keywords and sync tracking to populate local mention rows.</p></div>';
    return;
  }

  const mentioned = items.filter((mention) => mention.status === "mentioned").length;
  const monitoring = items.filter((mention) => mention.status === "monitoring").length;
  const sources = new Set(items.map((mention) => mention.source).filter(Boolean)).size;
  if (mentionsSummary) {
    mentionsSummary.innerHTML = `<span>${items.length} prompts</span><span>${mentioned} mentioned</span><span>${monitoring} monitoring</span><span>${sources} sources</span>`;
  }

  const filtered = items
    .map((mention, index) => ({ ...mention, sourceIndex: index }))
    .filter((mention) => {
    const matchesFilter = activeFilter === "all" ? true : mention.status === activeFilter;
    const matchesSource = activeSource === "all" || mention.source === activeSource;
    const matchesModel = activeModel === "all" || mention.model === activeModel;
    const matchesSearch = !search || `${mention.source || ""} ${mention.model || ""} ${mention.prompt || ""} ${mention.status || ""}`.toLowerCase().includes(search);
    return matchesFilter && matchesSource && matchesModel && matchesSearch;
    });

  if (!filtered.length) {
    mentionsList.innerHTML = '<div class="empty-state bordered"><span>✦</span><strong>No matching AI mentions</strong><p>Adjust the filter or search term to see monitored prompts.</p></div>';
    return;
  }

  filtered.forEach((mention) => {
    const row = document.createElement("article");
    row.className = "entity-row";
    row.innerHTML = `<button class="mention-detail-link" type="button" data-mention-detail="${escapeAttribute(String(mention.sourceIndex))}"><strong>${escapeHtml(mention.source)}</strong><p>${escapeHtml(mention.model || "Local model")} · ${escapeHtml(mention.prompt)}</p></button><span>${escapeHtml(mention.status)}</span>`;
    mentionsList.appendChild(row);
  });
}

function renderSupport(account) {
  if (!supportList) return;
  const readOnlyDisabled = isReadOnlyWorkspace() ? "disabled" : "";
  if (supportCreateAction) supportCreateAction.disabled = Boolean(readOnlyDisabled);
  if (supportHelpAction && accountState.data) supportHelpAction.disabled = Boolean(readOnlyDisabled);
  const tickets = account.supportTickets || [];
  supportList.innerHTML = "";

  if (!tickets.length) {
    supportList.innerHTML = '<div class="empty-state bordered"><span>?</span><strong>No support tickets yet</strong><p>Create a ticket when setup, publishing, billing, or account access needs attention.</p></div>';
    return;
  }

  tickets.forEach((ticket) => {
    const row = document.createElement("article");
    row.className = "entity-row";
    const status = ticket.status || "open";
    const nextStatus = status === "resolved" ? "open" : "resolved";
    const replies = Array.isArray(ticket.replies) ? ticket.replies : [];
    const latestReply = replies[replies.length - 1];
    const meta = [ticket.category || "Setup", ticket.priority || "normal", ticket.pageContext, ticket.requesterEmail || "", `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`].filter(Boolean);
    row.innerHTML = `<button class="support-detail-link" type="button" data-support-detail="${escapeAttribute(ticket.id)}"><strong>${escapeHtml(ticket.subject)}</strong><p>${meta.map((item) => escapeHtml(item)).join(" · ")}</p><p>${escapeHtml(latestReply?.message || ticket.message || "No details provided")}</p></button><button type="button" data-support-reply="${escapeAttribute(ticket.id)}" ${readOnlyDisabled}>Reply</button><button type="button" data-support-status="${escapeAttribute(ticket.id)}" data-support-next-status="${escapeAttribute(nextStatus)}" ${readOnlyDisabled}>${status === "resolved" ? "Reopen" : "Resolve"}</button><span>${escapeHtml(status)}</span>`;
    supportList.appendChild(row);
  });
}

function buildLocalReports(account) {
  const items = account.contentPlan?.items || [];
  const rankings = account.rankings?.keywords || [];
  const mentions = account.aiMentions?.mentions || [];
  const search = account.searchConsole || {};
  const template = selectedReportTemplate(account.reports?.template || account.reports?.schedule?.template);
  const summary = {
    articles: items.length,
    clicks: Number(search.clicks || 0),
    impressions: Number(search.impressions || 0),
    rankings: rankings.length,
    aiMentions: mentions.length,
  };
  const rows = [
    ...items
      .slice()
      .sort((a, b) => (a.status === "published" ? -1 : 0) - (b.status === "published" ? -1 : 0))
      .slice(0, 5)
      .map((item) => ({
        section: "content",
        label: item.title || item.keyword || "Untitled article",
        value: item.status || "draft",
        detail: `${item.keyword || "No keyword"} · ${Number(item.estimatedVisits || 0).toLocaleString()} estimated visits`,
        publicPath: item.publicPath || item.publishedUrl || "",
      })),
    ...rankings.slice(0, 3).map((keyword) => ({
      section: "ranking",
      label: keyword.keyword,
      value: `#${keyword.position}`,
      detail: `${keyword.change >= 0 ? "+" : ""}${keyword.change} · ${keyword.url}`,
    })),
    ...mentions.slice(0, 3).map((mention) => ({
      section: "AI mention",
      label: mention.source,
      value: mention.status,
      detail: mention.prompt,
    })),
  ];
  return {
    template,
    summary,
    chart: [
      { label: "Articles", value: summary.articles },
      { label: "Clicks", value: summary.clicks },
      { label: "Impressions", value: summary.impressions },
      { label: "Rankings", value: summary.rankings },
      { label: "AI mentions", value: summary.aiMentions },
    ],
    sharing: account.reports?.sharing || { shareUrl: "", shareCreatedAt: "" },
    schedule: account.reports?.schedule || { enabled: false, cadence: "weekly", template: template.key, recipients: [], lastScheduledAt: "" },
    rows,
  };
}

function reportActionDetailRows(account) {
  const readOnly = isReadOnlyWorkspace();
  const localReports = buildLocalReports(account);
  const reports = {
    ...localReports,
    ...(account.reports || {}),
    sharing: account.reports?.sharing || localReports.sharing,
    schedule: account.reports?.schedule || localReports.schedule,
    rows: account.reports?.rows || localReports.rows,
    chart: account.reports?.chart || localReports.chart,
    summary: account.reports?.summary || localReports.summary,
  };
  reports.template = selectedReportTemplate(reports.template || reports.schedule?.template || localReports.template);
  const search = account.searchConsole || {};
  const searchConnected = search.status === "connected" || Number(search.clicks || 0) > 0 || Number(search.impressions || 0) > 0 || Number(search.indexedPages || 0) > 0;
  const rankingsCount = (account.rankings?.keywords || []).length;
  const mentionsCount = (account.aiMentions?.mentions || []).length;
  const shareUrl = normalizeLocalReportPath(reports.sharing?.shareUrl || "");
  const schedule = reports.schedule || {};
  const scheduledRecipients = Array.isArray(schedule.recipients) ? schedule.recipients.length : 0;
  const scheduleLabel = schedule.enabled
    ? `${schedule.cadence || "weekly"} to ${scheduledRecipients || 1} recipient${(scheduledRecipients || 1) === 1 ? "" : "s"}`
    : "No schedule";
  const lastExport = reports.lastExportedAt ? formatDateLabel(String(reports.lastExportedAt).slice(0, 10)) : "Not exported";

  return [
    ["Template", reports.template.label],
    ["Search Console", searchConnected ? "connected" : "disconnected"],
    ["Rankings", `${rankingsCount.toLocaleString()} keyword${rankingsCount === 1 ? "" : "s"}`],
    ["AI Mentions", `${mentionsCount.toLocaleString()} prompt${mentionsCount === 1 ? "" : "s"}`],
    ["Share link", shareUrl || "No share link"],
    ["Schedule", scheduleLabel],
    ["Last export", lastExport],
    ["Export action", "Export local CSV"],
    ["Share action", readOnly ? "Owner access required" : shareUrl ? "Copyable local link" : "Generate local link"],
    ["Schedule action", readOnly ? "Owner access required" : scheduleLabel],
    ["Provider-backed", "Live analytics and scheduled email delivery still need provider integrations"],
    ["Target evidence gap", "Exact export, share, and schedule modal copy still needs target screenshot evidence"],
  ];
}

function showReportActionDetail() {
  if (!accountState.data) return;
  const rows = reportActionDetailRows(accountState.data);

  showAccountForm({
    title: "Reports actions detail",
    bodyHtml: `
      <div class="report-action-detail-card" data-report-action-detail-card>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
    `,
    submitText: "Close",
    onSubmit: async () => {},
  });
}

function renderReports(account) {
  if (!reportSummary || !reportList) return;
  const readOnly = isReadOnlyWorkspace();
  const localReports = buildLocalReports(account);
  const reports = {
    ...localReports,
    ...(account.reports || {}),
    sharing: account.reports?.sharing || localReports.sharing,
    schedule: account.reports?.schedule || localReports.schedule,
    rows: account.reports?.rows || localReports.rows,
    chart: account.reports?.chart || localReports.chart,
    summary: account.reports?.summary || localReports.summary,
  };
  reports.template = selectedReportTemplate(reports.template || reports.schedule?.template || localReports.template);
  if (reportShareAction) reportShareAction.disabled = readOnly;
  if (reportScheduleAction) reportScheduleAction.disabled = readOnly;
  if (reportExportAction) reportExportAction.disabled = false;
  const summary = reports.summary || {};
  reportSummary.innerHTML = `<span>${Number(summary.articles || 0).toLocaleString()} articles</span><span>${Number(summary.clicks || 0).toLocaleString()} clicks</span><span>${Number(summary.rankings || 0).toLocaleString()} ranking${Number(summary.rankings || 0) === 1 ? "" : "s"}</span><span>${Number(summary.aiMentions || 0).toLocaleString()} AI mention${Number(summary.aiMentions || 0) === 1 ? "" : "s"}</span>`;
  if (reportStatePanel) {
    const search = account.searchConsole || {};
    const searchConnected = search.status === "connected" || Number(search.clicks || 0) > 0 || Number(search.impressions || 0) > 0 || Number(search.indexedPages || 0) > 0;
    const rankingsCount = (account.rankings?.keywords || []).length;
    const mentionsCount = (account.aiMentions?.mentions || []).length;
    const shareUrl = normalizeLocalReportPath(reports.sharing?.shareUrl || "");
    const schedule = reports.schedule || {};
    const scheduledRecipients = Array.isArray(schedule.recipients) ? schedule.recipients.length : 0;
    const deliveryDetail = schedule.enabled
      ? `${schedule.cadence || "weekly"}${shareUrl ? ` · ${shareUrl}` : ""}`
      : `Manual${shareUrl ? ` · ${shareUrl}` : " · no share link"}`;
    const reportStateRows = [
      ["Search Console", searchConnected ? "connected" : "disconnected"],
      ["Rankings", `${rankingsCount.toLocaleString()} keyword${rankingsCount === 1 ? "" : "s"}`],
      ["AI Mentions", `${mentionsCount.toLocaleString()} prompt${mentionsCount === 1 ? "" : "s"}`],
      ["Delivery", deliveryDetail],
      ["Share link", shareUrl || "No share link"],
      ["Schedule", schedule.enabled ? `${schedule.cadence || "weekly"} to ${scheduledRecipients || 1} recipient${(scheduledRecipients || 1) === 1 ? "" : "s"}` : "No schedule"],
      ["Last export", reports.lastExportedAt ? formatDateLabel(String(reports.lastExportedAt).slice(0, 10)) : "Not exported"],
      ["Search synced", search.lastSyncedAt ? formatDateLabel(String(search.lastSyncedAt).slice(0, 10)) : "Not synced"],
      ["Rankings synced", account.rankings?.lastSyncedAt ? formatDateLabel(String(account.rankings.lastSyncedAt).slice(0, 10)) : "Not synced"],
      ["Mentions synced", account.aiMentions?.lastSyncedAt ? formatDateLabel(String(account.aiMentions.lastSyncedAt).slice(0, 10)) : "Not synced"],
    ];
    const actionRows = [
      ["Export CSV", reports.lastExportedAt ? `Ready - last ${formatDateLabel(String(reports.lastExportedAt).slice(0, 10))}` : "Ready for local CSV"],
      ["Share link", readOnly ? "Owner access required" : shareUrl ? "Copyable local link" : "Generate local link"],
      ["Schedule delivery", readOnly ? "Owner access required" : schedule.enabled ? `${schedule.cadence || "weekly"} to ${scheduledRecipients || 1} recipient${(scheduledRecipients || 1) === 1 ? "" : "s"}` : "No schedule"],
      ["Provider-backed", "Live analytics and email delivery stay pending until integrations are connected"],
    ];
    reportStatePanel.innerHTML = `
      <div>
        <span>Tracking state</span>
        <strong>${searchConnected ? "Active" : "Setup pending"}</strong>
        <p>${escapeHtml(reports.template.label)} report signals.</p>
      </div>
      <dl>
        ${reportStateRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <section class="report-action-state" data-report-action-state>
        <button class="report-action-detail-link" type="button" data-report-action-detail="true">
          <strong>Reports actions</strong>
          <p>Review export, share, schedule, and provider handoff state.</p>
        </button>
        <dl>
          ${actionRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </section>
    `;
  }
  if (reportChart) {
    const chart = reports.chart || [];
    const max = Math.max(1, ...chart.map((point) => Number(point.value || 0)));
    reportChart.innerHTML = chart
      .map((point) => {
        const value = Number(point.value || 0);
        const width = Math.max(3, (value / max) * 100);
        return `<div class="report-bar-row" data-report-bar><span>${escapeHtml(point.label)}</span><div><i style="width:${width.toFixed(1)}%"></i></div><strong>${value.toLocaleString()}</strong></div>`;
      })
      .join("");
  }
  if (reportTemplates) {
    reportTemplates.innerHTML = reportTemplateCatalog
      .map((template) => {
        const active = template.key === reports.template.key;
        return `<button type="button" class="report-template-card${active ? " is-active" : ""}" data-report-template="${escapeAttribute(template.key)}" aria-pressed="${active ? "true" : "false"}"><strong>${escapeHtml(template.label)}</strong><span>${escapeHtml(template.description)}</span></button>`;
      })
      .join("");
  }
  if (reportShare) {
    const sharing = reports.sharing || {};
    const shareUrl = normalizeLocalReportPath(sharing.shareUrl);
    reportShare.innerHTML = shareUrl
      ? `<h2>Share link</h2><p><a href="${escapeAttribute(shareUrl)}">${escapeHtml(shareUrl)}</a></p><small>${escapeHtml(reports.template.label)} · ${sharing.shareCreatedAt ? `Created ${escapeHtml(formatDateLabel(sharing.shareCreatedAt.slice(0, 10)))}` : "Local report link"}</small>`
      : `<h2>Share link</h2><p>No local report link created yet.</p><small>${escapeHtml(reports.template.label)} ready for stakeholder review.</small>`;
  }
  if (reportSchedule) {
    const schedule = reports.schedule || {};
    reportSchedule.innerHTML = schedule.enabled
      ? `<h2>Scheduled report</h2><p>${escapeHtml(schedule.cadence || "weekly")} to ${escapeHtml((schedule.recipients || []).join(", ") || "account owner")}</p><small>${escapeHtml(reports.template.label)} · ${schedule.lastScheduledAt ? `Updated ${escapeHtml(formatDateLabel(schedule.lastScheduledAt.slice(0, 10)))}` : "Local schedule active"}</small>`
      : `<h2>Scheduled report</h2><p>No report email schedule is active.</p><small>${escapeHtml(reports.template.label)} · scheduling is local until email delivery is integrated.</small>`;
  }
  reportList.innerHTML = "";

  if (!reports.rows?.length) {
    reportList.innerHTML = '<div class="empty-state bordered"><span>▤</span><strong>No report rows yet</strong><p>Publish articles, connect Search Console, or sync tracking to populate this report.</p></div>';
    return;
  }

  reports.rows.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "entity-row";
    const publicPath = String(item.publicPath || "").trim();
    const publicLink = isLocalBlogPath(publicPath) ? `<a href="${escapeAttribute(publicPath)}">Open post</a>` : "";
    row.innerHTML = `<button class="report-detail-link" type="button" data-report-detail="${escapeAttribute(String(index))}"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.section)} · ${escapeHtml(item.detail || "")}</p></button>${publicLink}<span>${escapeHtml(item.value || "")}</span>`;
    reportList.appendChild(row);
  });
}

function buildLocalSeoAnalysis(account) {
  const items = account.contentPlan?.items || [];
  const issues = [];
  const opportunities = [];
  const hasInternalLinks = (item) => {
    if (Array.isArray(item.internalLinks)) return item.internalLinks.some(Boolean);
    return Boolean(String(item.internalLinks || "").trim());
  };
  const hasSchema = (item) => Boolean(String(item.schemaType || item.structuredDataType || item.schema || "").trim());
  const publicUrl = (item) => String(item.publishedUrl || item.publicPath || "").trim();
  const issueFor = (item, detail) => ({ label: item.title || item.keyword || "Untitled article", detail, publicPath: publicUrl(item) });
  items.forEach((item) => {
    if (!item.keyword) issues.push(issueFor(item, "Missing target keyword."));
    if (!item.seoTitle) issues.push(issueFor(item, "Missing SEO title."));
    if (!item.metaDescription) issues.push(issueFor(item, "Missing meta description."));
    if (!hasSchema(item)) issues.push(issueFor(item, "Missing schema type."));
    if (!hasInternalLinks(item)) issues.push(issueFor(item, "Missing internal links."));
    if (!item.body && item.status !== "scheduled") issues.push(issueFor(item, "Missing draft body."));
    if (item.status === "published" && !publicUrl(item)) issues.push(issueFor(item, "Published article is missing a public URL."));
  });
  if (!account.settings?.site?.keywords?.length) opportunities.push({ label: "Site keywords", detail: "Add saved site keywords to guide article planning." });
  if (account.searchConsole?.status !== "connected") opportunities.push({ label: "Search Console", detail: "Connect Search Console to measure indexed content." });
  if (account.settings?.cms?.status !== "connected") opportunities.push({ label: "CMS", detail: "Connect CMS metadata before publishing articles." });
  if (!items.some((item) => item.status === "published")) opportunities.push({ label: "Published content", detail: "Publish at least one reviewed article to unlock public SEO feedback." });
  const totalChecks = Math.max(1, items.length * 4 + 4);
  const deductions = Math.min(totalChecks, issues.length + opportunities.length);
  const chart = [
    { label: "Metadata", passed: items.filter((item) => item.keyword && item.seoTitle && item.metaDescription).length, total: items.length },
    { label: "Schema", passed: items.filter((item) => hasSchema(item)).length, total: items.length },
    { label: "Internal links", passed: items.filter((item) => hasInternalLinks(item)).length, total: items.length },
    { label: "Crawl readiness", passed: items.filter((item) => item.status !== "published" || publicUrl(item)).length, total: items.length },
  ];
  return {
    summary: {
      score: Math.max(0, Math.round(((totalChecks - deductions) / totalChecks) * 100)),
      issueCount: issues.length,
      opportunityCount: opportunities.length,
      articleCount: items.length,
    },
    chart,
    checks: chart.map((item) => ({
      label: item.label,
      status: item.total === 0 || item.passed === item.total ? "pass" : item.passed > 0 ? "warning" : "fail",
      detail: `${item.passed} of ${item.total} article checks passed.`,
    })),
    issues,
    opportunities,
  };
}

function renderSeoAnalysis(account) {
  if (!seoScore || !seoIssues || !seoOpportunities) return;
  const analysis = account.seoAnalysis || buildLocalSeoAnalysis(account);
  seoScore.textContent = `${Number(analysis.summary?.score || 0)}%`;
  if (seoChart) {
    const chart = analysis.chart || [];
    seoChart.innerHTML = chart
      .map((item) => {
        const total = Math.max(1, Number(item.total || 0));
        const passed = Number(item.passed || 0);
        const width = Math.max(3, (passed / total) * 100);
        return `<div class="report-bar-row" data-seo-bar><span>${escapeHtml(item.label)}</span><div><i style="width:${width.toFixed(1)}%"></i></div><strong>${passed.toLocaleString()}/${Number(item.total || 0).toLocaleString()}</strong></div>`;
      })
      .join("");
  }
  if (seoChecks) {
    seoChecks.innerHTML = "";
    (analysis.checks || []).forEach((check, index) => {
      const row = document.createElement("article");
      row.className = "entity-row";
      row.innerHTML = `<button class="seo-detail-link" type="button" data-seo-detail="check:${escapeAttribute(String(index))}"><strong>${escapeHtml(check.label)}</strong><p>${escapeHtml(check.detail || "")}</p></button><span>${escapeHtml(check.status || "check")}</span>`;
      seoChecks.appendChild(row);
    });
  }
  seoIssues.innerHTML = "";
  seoOpportunities.innerHTML = "";

  const renderRows = (target, rows, emptyTitle, emptyBody) => {
    if (!rows.length) {
      target.innerHTML = `<div class="empty-state bordered"><span>◇</span><strong>${escapeHtml(emptyTitle)}</strong><p>${escapeHtml(emptyBody)}</p></div>`;
      return;
    }
    rows.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "entity-row";
      const publicPath = String(item.publicPath || "").trim();
      const publicLink = isLocalBlogPath(publicPath) ? `<a href="${escapeAttribute(publicPath)}">Open post</a>` : "";
      const kind = target === seoOpportunities ? "opportunity" : "issue";
      row.innerHTML = `<button class="seo-detail-link" type="button" data-seo-detail="${escapeAttribute(`${kind}:${index}`)}"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.detail || "")}</p></button>${publicLink}`;
      target.appendChild(row);
    });
  };

  renderRows(seoIssues, analysis.issues || [], "No SEO issues found", "Local metadata checks did not find article-level blockers.");
  renderRows(seoOpportunities, analysis.opportunities || [], "No SEO opportunities found", "Connect providers and publish content to unlock deeper recommendations.");
}

function setTourTarget(view, tab = "") {
  accountViewButtons.forEach((button) => {
    button.classList.toggle("is-tour-target", Boolean(view) && button.dataset.accountView === view);
  });
  settingsTabButtons.forEach((button) => {
    button.classList.toggle("is-tour-target", Boolean(tab) && button.dataset.settingsTab === tab);
  });
  if (settingsTabsShell) settingsTabsShell.classList.remove("is-tour-target");
}

function setTourTabStripTarget(active) {
  if (settingsTabsShell) settingsTabsShell.classList.toggle("is-tour-target", Boolean(active));
}

function renderTourStep(index) {
  if (!tourOverlay || !tourTitle || !tourBody || !tourProgress) return;
  const stepIndex = Math.max(0, Math.min(tourSteps.length - 1, Number(index || 0)));
  const step = tourSteps[stepIndex];
  accountState.tourStep = stepIndex;

  if (step.view === "settings") {
    setSettingsTab(step.tab || "site", { persist: false });
  } else {
    setAccountView(step.view, { persist: false });
  }

  tourOverlay.hidden = false;
  const targetTab = step.view === "settings" && step.tab ? step.tab : "";
  tourOverlay.classList.toggle("has-pointer", Boolean(step.sidebarTarget));
  tourOverlay.classList.toggle("has-tab-pointer", Boolean(targetTab));
  setTourTarget(step.sidebarTarget && !targetTab ? step.view : "", targetTab);
  setTourTabStripTarget(step.tabStripTarget);
  if (tourEyebrow) tourEyebrow.textContent = step.eyebrow;
  tourTitle.textContent = step.title;
  tourBody.textContent = step.body;
  if (tourDots) {
    tourDots.innerHTML = tourSteps
      .map((_, dotIndex) => `<i data-tour-dot${dotIndex === stepIndex ? ' class="is-active"' : ""}></i>`)
      .join("");
  }
  tourProgress.textContent = `${stepIndex + 1} of ${tourSteps.length}`;
  if (tourBackAction) {
    tourBackAction.hidden = stepIndex === 0;
    tourBackAction.disabled = stepIndex === 0;
  }
  if (tourNextAction) tourNextAction.hidden = stepIndex === tourSteps.length - 1;
  if (tourFinishAction) tourFinishAction.hidden = stepIndex !== tourSteps.length - 1;
  setAccountOperation(step.title);
}

function hideTour() {
  accountState.tourStep = -1;
  if (tourOverlay) {
    tourOverlay.hidden = true;
    tourOverlay.classList.remove("has-pointer");
    tourOverlay.classList.remove("has-tab-pointer");
  }
  setTourTabStripTarget(false);
  setTourTarget("");
  if (tourNextAction) tourNextAction.hidden = false;
  if (tourFinishAction) tourFinishAction.hidden = true;
  if (tourBackAction) {
    tourBackAction.hidden = false;
    tourBackAction.disabled = false;
  }
}

function renderSetupChecklist(account) {
  if (!setupProgress || !setupList) return;
  const checklist = account.setupChecklist || { completed: 0, total: 0, percent: 0, items: [] };
  setupProgress.textContent = `${Number(checklist.completed || 0)} of ${Number(checklist.total || 0)} complete · ${Number(checklist.percent || 0)}%`;
  setupList.innerHTML = "";

  (checklist.items || []).forEach((item) => {
    const row = document.createElement("li");
    const action = item.action || {};
    row.innerHTML = `<strong>${item.complete ? "Done: " : ""}${escapeHtml(item.label)}</strong><p>${escapeHtml(item.detail || "")}</p><button type="button" data-setup-jump-view="${escapeAttribute(action.view || "plan")}" data-setup-jump-tab="${escapeAttribute(action.tab || "")}">${item.complete ? "Review" : "Finish"}</button>`;
    setupList.appendChild(row);
  });
}

function renderAccountData() {
  const account = scrubAccountData(accountState.data);
  if (!account) return;
  accountState.data = account;
  const workspace = selectedWorkspace();

  if (accountWorkspace) accountWorkspace.textContent = workspace?.workspaceName || account.workspaceName || "sirbloggsalot.com";
  if (accountWorkspaceIcon) {
    const workspaceImage = workspace?.picture || workspace?.avatar || account.workspaceImage || account.avatar || authState.user?.picture || "";
    const initial = (accountWorkspace?.textContent || "S").trim().charAt(0).toUpperCase() || "S";
    accountWorkspaceIcon.textContent = workspaceImage ? "" : initial;
    accountWorkspaceIcon.style.backgroundImage = workspaceImage ? `url("${workspaceImage.replace(/"/g, "%22")}")` : "";
    accountWorkspaceIcon.classList.toggle("has-image", Boolean(workspaceImage));
  }
  if (accountTeamEmail) accountTeamEmail.textContent = workspace?.ownerEmail || account.ownerEmail || authState.user?.email || "";
  if (accountTeamInitial) accountTeamInitial.textContent = (accountWorkspace?.textContent || "S").trim().charAt(0).toUpperCase() || "S";
  if (accountRole && workspace?.role) accountRole.textContent = workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1);

  renderAccountCreateMenu();
  renderContentToolsMenu();
  renderSettings(account);
  renderWriteDraft(account);
  renderContentPlan(account);
  renderTopics(account);
  renderProducts(account);
  renderLocations(account);
  renderPagesGenerator(account);
  renderMembers(account);
  renderInvites(account);
  renderTeamActivity(account);
  renderBilling(account);
  renderSearchConsole(account);
  renderRankings(account);
  renderAiMentions(account);
  renderReports(account);
  renderSeoAnalysis(account);
  renderSupport(account);
  renderSetupChecklist(account);

  calendarModeButtons.forEach((button) => {
    const active = button.dataset.calendarMode === (account.ui?.calendarMode || "grid");
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  accountState.dirty = false;
  markAccountSaved(false);
}

async function loadAccountData() {
  if (!authState.user || accountState.loading) return;
  accountState.loading = true;
  setAccountBusy(true, "Loading account workspace...");

  try {
    const payload = await requestJson("/api/account/summary");
    accountState.data = payload.account;
    accountState.workspaces = payload.workspaces || [];
    accountState.selectedWorkspaceId = payload.selectedWorkspaceId || payload.account?.id || "";
    accountState.ready = true;
    renderAccountData();
    setAccountOperation("");
    applyAccountParams({ persist: false });
    await applyAccountQueryActions({ allowWhileLoading: true });
    return true;
  } catch (error) {
    setAccountOperation(error.message, true);
    return false;
  } finally {
    accountState.loading = false;
    setAccountBusy(false);
  }
}

async function persistAccountUi() {
  if (!accountState.data) return;
  if (isReadOnlyWorkspace()) return;
  await requestJson("/api/account/ui", {
    method: "PUT",
    body: JSON.stringify(accountState.data.ui || {}),
  }).catch(() => {});
}

async function saveAccountSettings() {
  if (!accountState.data) return false;
  if (isReadOnlyWorkspace()) {
    setAccountOperation("This workspace is read-only for your role.", true);
    return false;
  }
  try {
    setAccountBusy(true, "Saving changes...");
    const payload = await requestJson("/api/account/settings", {
      method: "PUT",
      body: JSON.stringify(getSettingsPayload()),
    });
    if (payload.account) {
      accountState.data = { ...accountState.data, ...payload.account };
    } else {
      accountState.data.settings = payload.settings;
      accountState.data.updatedAt = payload.updatedAt;
    }
    const draftPayload = getWriteDraftPayload();
    const draftResponse = await requestJson("/api/account/write-draft", {
      method: "PUT",
      body: JSON.stringify(draftPayload),
    });
    if (draftResponse.account) {
      accountState.data = { ...accountState.data, ...draftResponse.account };
    } else {
      accountState.data.writeDraft = draftResponse.writeDraft;
    }
    renderAccountData();
    markAccountSaved();
    setAccountOperation("Changes saved.");
    return true;
  } catch (error) {
    setAccountOperation(error.message, true);
    markAccountDirty();
    return false;
  } finally {
    setAccountBusy(false);
  }
}

async function postAccountAction(url, body = {}) {
  setAccountBusy(true, "Working...");
  try {
    const payload = await requestJson(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (payload.account) accountState.data = payload.account;
    if (payload.workspaces) accountState.workspaces = payload.workspaces;
    if (payload.selectedWorkspaceId) accountState.selectedWorkspaceId = payload.selectedWorkspaceId;
    if (payload.settings) accountState.data.settings = payload.settings;
    if (payload.images) accountState.data.settings.images = payload.images;
    if (payload.contentPlan) accountState.data.contentPlan = payload.contentPlan;
    if (payload.topics) {
      accountState.data.topics = payload.topics;
      accountState.topicSearchResults = null;
    }
    if (payload.products) accountState.data.products = payload.products;
    if (payload.locations) accountState.data.locations = payload.locations;
    if (payload.inventoryFeed) accountState.data.inventoryFeed = payload.inventoryFeed;
    if (payload.invites) accountState.data.invites = payload.invites;
    if (payload.members) accountState.data.members = payload.members;
    if (payload.supportTickets) accountState.data.supportTickets = payload.supportTickets;
    if (payload.billing) accountState.data.billing = payload.billing;
    if (payload.searchConsole) accountState.data.searchConsole = payload.searchConsole;
    if (payload.rankings) accountState.data.rankings = payload.rankings;
    if (payload.aiMentions) accountState.data.aiMentions = payload.aiMentions;
    renderAccountData();
    return payload;
  } finally {
    setAccountBusy(false);
  }
}

function rankingsUrl() {
  return `/api/account/rankings?range=${encodeURIComponent(accountState.rankingsRange || "30")}`;
}

function mentionsUrl() {
  const params = new URLSearchParams();
  params.set("source", accountState.mentionsSource || "all");
  params.set("model", accountState.mentionsModel || "all");
  params.set("range", accountState.mentionsRange || "30");
  return `/api/account/ai-mentions?${params.toString()}`;
}

async function loadTrackingPanel(view) {
  try {
    if (view === "rankings") {
      const payload = await requestJson(rankingsUrl());
      accountState.data.rankings = payload.rankings;
      renderRankings(accountState.data);
      renderTrackingDependents();
    }

    if (view === "mentions") {
      const payload = await requestJson(mentionsUrl());
      accountState.data.aiMentions = payload.aiMentions;
      renderAiMentions(accountState.data);
      renderTrackingDependents();
    }
  } catch (error) {
    setAccountOperation(error.message, true);
  }
}

async function loadInvite() {
  if (!inviteMessage || !inviteDetail) return;
  const token = currentInviteToken();

  if (!token) {
    inviteMessage.textContent = "Invite link is missing.";
    inviteDetail.textContent = "Ask the workspace owner to generate a new invitation link.";
    if (inviteAcceptAction) inviteAcceptAction.disabled = true;
    return;
  }

  try {
    const payload = await requestJson(`/api/invite/${encodeURIComponent(token)}`);
    accountState.invite = payload.invite;
    if (inviteAcceptAction) inviteAcceptAction.disabled = payload.invite.status !== "pending";
    inviteMessage.textContent = `Join ${payload.invite.workspaceName}`;
    inviteDetail.textContent =
      payload.invite.status === "pending"
        ? `This invite is for ${payload.invite.email}. Sign in with that Google account, then accept.`
        : `This invite is ${payload.invite.status}. Ask ${payload.invite.ownerEmail} for a new link if needed.`;

    if (inviteLogin) {
      inviteLogin.hidden = Boolean(authState.user);
      inviteLogin.href = `/login?next=${encodeURIComponent(currentPathWithSearch())}`;
    }
  } catch (error) {
    accountState.invite = null;
    inviteMessage.textContent = "Invite not found.";
    inviteDetail.textContent = error.message;
    if (inviteAcceptAction) inviteAcceptAction.disabled = true;
  }
}

function setAuthMessage(message, isError = false) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.classList.toggle("is-error", isError);
}

function renderAuthState() {
  const signedIn = Boolean(authState.user);

  if (loginLink) loginLink.hidden = signedIn;
  if (signupLink) signupLink.hidden = signedIn;
  if (accountLink) accountLink.hidden = !signedIn;
  updateTrialLinks();
  logoutButtons.forEach((button) => {
    button.hidden = !signedIn;
  });

  if (authStatus) {
    authStatus.textContent = signedIn ? authState.user.email : "";
  }

  if (signedIn) {
    setAuthMessage(`Signed in as ${authState.user.email}.`);
  }

  renderAccountState();

  if (signedIn) {
    loadAccountData();
  } else {
    accountState.data = null;
    accountState.ready = false;
  }

  if (resolveRoute(window.location.pathname) === "invite") {
    loadInvite();
  }
}

function renderAccountState() {
  const user = authState.user;

  if (!accountName || !accountEmail || !accountRole || !accountInitial || !accountUpdated) return;

  if (!user) {
    accountName.textContent = "Account";
    accountEmail.textContent = "Sign in to view account details.";
    accountRole.textContent = "Signed out";
    accountInitial.textContent = "S";
    accountUpdated.textContent = "Waiting for sign-in";
    if (accountWorkspace) accountWorkspace.textContent = "sirbloggsalot.com";
    if (accountTeamEmail) accountTeamEmail.textContent = "Checking session...";
    if (accountTeamInitial) accountTeamInitial.textContent = "S";
    if (accountAvatar) {
      accountAvatar.hidden = true;
      accountAvatar.removeAttribute("src");
    }
    return;
  }

  const displayName = user.name || user.email;
  accountName.textContent = displayName;
  accountEmail.textContent = user.email;
  accountRole.textContent = user.role === "admin" ? "Admin" : "Owner";
  accountInitial.textContent = displayName.trim().charAt(0).toUpperCase() || "S";
  accountUpdated.textContent = `Session checked ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (accountWorkspace) accountWorkspace.textContent = user.email.split("@")[0] || "sirbloggsalot.com";
  if (accountTeamEmail) accountTeamEmail.textContent = user.email;
  if (accountTeamInitial) accountTeamInitial.textContent = accountInitial.textContent;

  if (accountAvatar) {
    if (user.picture) {
      accountAvatar.src = user.picture;
      accountAvatar.alt = "";
      accountAvatar.hidden = false;
    } else {
      accountAvatar.hidden = true;
      accountAvatar.removeAttribute("src");
    }
  }
}

function selectedWorkspace() {
  return (
    accountState.workspaces.find((workspace) => workspace.id === accountState.selectedWorkspaceId) ||
    accountState.workspaces.find((workspace) => workspace.selected)
  );
}

function selectedWorkspaceRole() {
  const workspace = selectedWorkspace();
  return workspace?.role || "owner";
}

function isReadOnlyWorkspace() {
  return selectedWorkspaceRole() === "member";
}

function isReadOnlyDynamicControl(event) {
  if (!accountState.data || !isReadOnlyWorkspace()) return false;
  const blogAction = event.target.closest("[data-blog-action]");
  if (blogAction && !["article-builder", "open-builder", "view"].includes(blogAction.dataset.blogAction)) return true;
  const blogMenuAction = event.target.closest("[data-blog-menu-action]");
  if (blogMenuAction && !["open-builder", "view"].includes(blogMenuAction.dataset.blogMenuAction)) return true;
  const mutatingSelectors = [
    "[data-keyword-remove]",
    "[data-topic-edit]",
    "[data-topic-add]",
    "[data-topic-delete]",
    "[data-plan-item-id]",
    "[data-product-edit]",
    "[data-product-toggle]",
    "[data-product-delete]",
    "[data-location-edit]",
    "[data-location-delete]",
    "[data-invite-delete]",
    "[data-member-role]",
    "[data-member-delete]",
    "[data-support-status]",
    "[data-support-reply]",
  ];
  const pageGeneratorAction = event.target.closest("[data-page-generator-action]");
  if (pageGeneratorAction && pageGeneratorAction.dataset.pageGeneratorAction === "open-builder") return true;
  return mutatingSelectors.some((selector) => event.target.closest(selector));
}

function setAccountNavOpen(open) {
  if (!accountBusyRoot || !accountNavToggle) return;
  accountBusyRoot.classList.toggle("is-account-nav-open", open);
  accountNavToggle.setAttribute("aria-expanded", String(open));
}

function setAccountCreateMenuOpen(open) {
  if (!accountCreateToggle || !accountCreateMenu) return;
  accountCreateMenu.hidden = !open;
  accountCreateToggle.setAttribute("aria-expanded", String(open));
}

function renderAccountCreateMenu() {
  accountCreateActionButtons.forEach((button) => {
    button.disabled = isReadOnlyWorkspace();
  });
}

function setContentToolsMenuOpen(open) {
  if (!contentToolsToggle || !contentToolsMenu) return;
  contentToolsMenu.hidden = !open;
  contentToolsToggle.setAttribute("aria-expanded", String(open));
}

function renderContentToolsMenu() {
  const readOnly = isReadOnlyWorkspace();
  contentToolsActionButtons.forEach((button) => {
    const action = button.dataset.contentToolsAction || "";
    button.disabled = readOnly && !["strategy", "refresh"].includes(action);
  });
  const mode = accountState.data?.ui?.calendarMode === "list" ? "list" : "grid";
  contentToolsModeButtons.forEach((button) => {
    const active = button.dataset.contentToolsMode === mode;
    button.disabled = false;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setAccountView(view, options = {}) {
  accountViewButtons.forEach((button) => {
    const active = button.dataset.accountView === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  accountPanels.forEach((panel) => {
    const active = panel.dataset.accountPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  if (accountState.data) {
    accountState.data.ui = { ...(accountState.data.ui || {}), activeView: view };
    if (options.persist !== false) persistAccountUi();
  }

  if (options.updateUrl !== false) {
    updateAccountUrl(view, view === "settings" ? accountState.data?.ui?.activeSettingsTab || "site" : "", "push");
  }

  if (options.loadTracking !== false && accountState.data && (view === "rankings" || view === "mentions")) {
    loadTrackingPanel(view);
  }
}

function setImageSettingsSection(section = "") {
  const imagePanel = settingsPanels.find((panel) => panel.dataset.settingsPanel === "images");
  if (!imagePanel) return;
  imagePanel.classList.toggle("is-image-style-section", section === "image-style");
}

function setSettingsTab(tab, options = {}) {
  settingsTabButtons.forEach((button) => {
    const active = button.dataset.settingsTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  settingsPanels.forEach((panel) => {
    const active = panel.dataset.settingsPanel === tab;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  if (accountState.data) {
    accountState.data.ui = { ...(accountState.data.ui || {}), activeSettingsTab: tab };
  }

  setImageSettingsSection(tab === "images" ? options.imageSection || "" : "");

  if (accountPanels.length) {
    setAccountView("settings", { ...options, persist: false, updateUrl: false });
  }

  if (accountState.data && options.persist !== false) {
    persistAccountUi();
  }

  if (options.updateUrl !== false) {
    updateAccountUrl("settings", tab, "push");
  }
}

function setSettingsView(tab = "") {
  const candidate = tab || accountState.data?.ui?.activeSettingsTab || "site";
  const normalized = settingsTabButtons.some((button) => button.dataset.settingsTab === candidate) ? candidate : "site";
  setSettingsTab(normalized);
}

function markAccountDirty() {
  if (!accountSaveButton) return;
  if (isReadOnlyWorkspace()) {
    accountState.dirty = false;
    accountSaveButton.disabled = true;
    accountSaveButton.textContent = "Save Changes";
    setAccountOperation("This workspace is read-only for your role.", true);
    return;
  }
  accountState.dirty = true;
  accountSaveButton.disabled = false;
  accountSaveButton.textContent = "Save Changes";
}

function markAccountSaved(showSaved = true) {
  if (!accountSaveButton) return;
  accountSaveButton.disabled = true;
  accountState.dirty = false;
  accountSaveButton.textContent = showSaved ? "Saved" : "Save Changes";
  if (!showSaved) return;
  window.setTimeout(() => {
    if (!accountSaveButton.disabled) return;
    accountSaveButton.textContent = "Save Changes";
  }, 1400);
}

function renderTrackingDependents() {
  if (!accountState.data) return;
  renderReports(accountState.data);
  renderSeoAnalysis(accountState.data);
}

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in could not be loaded."));
    document.head.appendChild(script);
  });
}

async function handleGoogleCredential(response) {
  try {
    setAuthMessage("Signing in...");
    const payload = await requestJson("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential }),
    });

    authState.user = payload.user;
    renderAuthState();

    const next = safeAuthNextPath(new URLSearchParams(window.location.search).get("next"));
    window.history.pushState({}, "", next || "/account?view=billing");
    renderRoute();
  } catch (error) {
    setAuthMessage(error.message, true);
  }
}

async function renderGoogleSignIn() {
  if (!googleSignIn || !authState.config?.googleAuthEnabled || authState.user) return;

  await loadGoogleIdentityScript();
  window.google.accounts.id.initialize({
    client_id: authState.config.googleClientId,
    callback: handleGoogleCredential,
  });
  window.google.accounts.id.renderButton(googleSignIn, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    width: Math.min(360, googleSignIn.offsetWidth || 360),
  });
}

async function initAuth() {
  try {
    const [config, session] = await Promise.all([
      requestJson("/api/auth/config"),
      requestJson("/api/auth/session"),
    ]);

    authState.config = config;
    authState.user = session.authenticated ? session.user : null;
    authState.ready = true;
    renderAuthState();

    if (!config.googleAuthEnabled) {
      setAuthMessage("Google auth is not configured yet. Set SIR_BLOGGS_GOOGLE_CLIENT_ID on the server.", true);
    } else if (!authState.user) {
      setAuthMessage("Use your Google account to continue.");
      await renderGoogleSignIn();
    }
  } catch (error) {
    authState.ready = true;
    setAuthMessage(error.message, true);
  } finally {
    renderRoute();
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.target && link.target !== "_self") return;

  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  if (url.pathname === "/" && url.hash) {
    closeDropdown();
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    return;
  }

  if (url.pathname === "/blog" || url.pathname.startsWith("/blog/") || url.pathname === "/reports" || url.pathname.startsWith("/reports/")) {
    closeDropdown();
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    return;
  }

  event.preventDefault();
  window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  header.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  setAccountNavOpen(false);
  closeDropdown();
  renderRoute();
});

toggle.addEventListener("click", () => {
  const open = !header.classList.contains("is-open");
  header.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  if (!open) closeDropdown();
});

if (dropdownToggle) {
  dropdownToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDropdown();
  });
}

if (dropdown) {
  dropdown.addEventListener("mouseenter", () => {
    if (!isDesktopDropdownMode()) return;
    openDropdown();
  });
  dropdown.addEventListener("mouseleave", () => {
    if (!isDesktopDropdownMode()) return;
    scheduleDropdownClose();
  });
  dropdown.addEventListener("focusin", () => {
    if (!isDesktopDropdownMode()) return;
    openDropdown();
  });
  dropdown.addEventListener("focusout", () => {
    if (!isDesktopDropdownMode()) return;
    window.setTimeout(() => {
      if (dropdown.contains(document.activeElement)) return;
      scheduleDropdownClose();
    }, 0);
  });
}

if (dropdownMenu) {
  dropdownMenu.addEventListener("mouseenter", () => {
    if (!isDesktopDropdownMode()) return;
    openDropdown();
  });
  dropdownMenu.addEventListener("mouseleave", () => {
    if (!isDesktopDropdownMode()) return;
    scheduleDropdownClose();
  });
  dropdownMenu.addEventListener("focusin", () => {
    if (!isDesktopDropdownMode()) return;
    openDropdown();
  });
  dropdownMenu.addEventListener("focusout", () => {
    if (!isDesktopDropdownMode()) return;
    window.setTimeout(() => {
      if (dropdownMenu.contains(document.activeElement)) return;
      scheduleDropdownClose();
    }, 0);
  });
}

if (dropdownBridge) {
  dropdownBridge.addEventListener("mouseenter", () => {
    if (!isDesktopDropdownMode()) return;
    openDropdown();
  });
  dropdownBridge.addEventListener("mouseleave", () => {
    if (!isDesktopDropdownMode()) return;
    scheduleDropdownClose();
  });
}

applyPublicPromoState();

if (publicPromoClose) {
  publicPromoClose.addEventListener("click", () => {
    setPublicPromoDismissed();
    if (publicPromo) publicPromo.hidden = true;
  });
}

billingButtons.forEach((button) => {
  button.addEventListener("click", () => setBilling(button.dataset.billingToggle));
});

accountViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.accountView === "settings") {
      setSettingsView();
      setAccountNavOpen(false);
      return;
    }
    setAccountView(button.dataset.accountView);
    setAccountNavOpen(false);
  });
});

if (accountNavToggle) {
  accountNavToggle.addEventListener("click", () => {
    const open = !accountBusyRoot?.classList.contains("is-account-nav-open");
    setAccountNavOpen(open);
  });
}

if (accountCreateToggle) {
  setAccountCreateMenuOpen(false);
  accountCreateToggle.addEventListener("click", (event) => {
    event?.stopPropagation?.();
    setAccountCreateMenuOpen(Boolean(accountCreateMenu?.hidden));
  });
}

accountCreateActionButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    const action = button.dataset.accountCreateAction || "";
    setAccountCreateMenuOpen(false);
    setAccountNavOpen(false);
    if (action === "article") {
      openFreshArticleBuilderDraft();
      setAccountOperation("Opening Article Builder.");
      return;
    }
    if (action === "topic") {
      setAccountView("topics");
      await handleAccountAction("find-topics", button);
      return;
    }
    if (action === "product") {
      setSettingsView("products");
      await handleAccountAction("add-product", button);
      return;
    }
    if (action === "location") {
      setSettingsView("locations");
      await handleAccountAction("add-location", button);
      return;
    }
    if (action === "ticket") {
      setAccountView("help");
      await handleAccountAction("create-support-ticket", button);
    }
  });
});

if (contentToolsToggle) {
  setContentToolsMenuOpen(false);
  contentToolsToggle.addEventListener("click", (event) => {
    event?.stopPropagation?.();
    setContentToolsMenuOpen(Boolean(contentToolsMenu?.hidden));
  });
}

contentToolsActionButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    const action = button.dataset.contentToolsAction || "";
    setContentToolsMenuOpen(false);
    await handleAccountAction(action, button);
  });
});

contentToolsModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.contentToolsMode || "grid";
    setContentToolsMenuOpen(false);
    setCalendarMode(mode);
  });
});

settingsTabButtons.forEach((button) => {
  button.addEventListener("click", () => setSettingsTab(button.dataset.settingsTab));
});

accountDirtyInputs.forEach((input) => {
  input.addEventListener("input", markAccountDirty);
  input.addEventListener("change", markAccountDirty);
});

if (inviteEmailInput) {
  inviteEmailInput.addEventListener("input", updateInviteGenerateState);
  inviteEmailInput.addEventListener("change", updateInviteGenerateState);
}

writeFieldInputs.forEach((input) => {
  const updateBuilderPreview = () => renderArticleBuilderPreview(getWriteDraftPayload());
  input.addEventListener("input", updateBuilderPreview);
  input.addEventListener("change", updateBuilderPreview);
});

settingsFieldInputs.forEach((input) => {
  if (input.dataset.settingsField === "site.keywordMix") {
    input.addEventListener("input", () => {
      if (keywordMixLabel) keywordMixLabel.textContent = `${input.value}%`;
    });
  }
  if (input.dataset.settingsField.startsWith("cta.")) {
    input.addEventListener("input", () => renderCtaPreview(getSettingsPayload().cta));
    input.addEventListener("change", () => renderCtaPreview(getSettingsPayload().cta));
  }
});

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const active = !button.classList.contains("is-on");
    button.classList.toggle("is-on", active);
    button.setAttribute("aria-pressed", String(active));
    if (button.dataset.settingsToggle === "images.useCustomGuidelines" && imageGuidelinesEditor) {
      imageGuidelinesEditor.hidden = !active;
    }
    if (button.dataset.settingsToggle?.startsWith("cta.")) {
      renderCtaPreview(getSettingsPayload().cta);
    }
    markAccountDirty();
  });
});

if (accountSaveButton) {
  accountSaveButton.addEventListener("click", saveAccountSettings);
}

function setCalendarMode(mode) {
  if (!accountState.data) return;
  const nextMode = mode === "list" ? "list" : "grid";
  accountState.data.ui = { ...(accountState.data.ui || {}), calendarMode: nextMode };
  renderContentPlan(accountState.data);
  calendarModeButtons.forEach((candidate) => {
    const active = candidate.dataset.calendarMode === nextMode;
    candidate.classList.toggle("is-active", active);
    candidate.setAttribute("aria-pressed", String(active));
  });
  renderContentToolsMenu();
  persistAccountUi();
}

calendarModeButtons.forEach((button) => {
  button.addEventListener("click", () => setCalendarMode(button.dataset.calendarMode));
});

calendarShiftButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!accountState.data) return;
    const shift = button.dataset.calendarShift;
    accountState.calendarOffset = shift === "today" ? 0 : accountState.calendarOffset + Number(shift || 0);
    renderContentPlan(accountState.data);
    setAccountOperation(shift === "today" ? "Calendar returned to today." : "Calendar window updated.");
  });
});

blogStatusFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!accountState.data) return;
    accountState.blogStatusFilter = button.dataset.blogStatusFilter || "all";
    renderContentPlan(accountState.data);
    setAccountOperation(`Showing ${accountState.blogStatusFilter === "all" ? "all" : accountState.blogStatusFilter} articles.`);
  });
});

searchViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!accountState.data) return;
    accountState.searchView = button.dataset.searchView || "queries";
    renderSearchConsole(accountState.data);
    setAccountOperation(`Showing Search Console ${accountState.searchView}.`);
  });
});

rankingsFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!accountState.data) return;
    accountState.rankingsFilter = button.dataset.rankingsFilter || "all";
    renderRankings(accountState.data);
    setAccountOperation(`Showing ${accountState.rankingsFilter === "all" ? "all" : accountState.rankingsFilter} rankings.`);
  });
});

if (rankingsRangeInput) {
  rankingsRangeInput.addEventListener("change", async () => {
    if (!accountState.data) return;
    try {
      accountState.rankingsRange = rankingsRangeInput.value || "30";
      const payload = await requestJson(rankingsUrl());
      accountState.data.rankings = payload.rankings;
      renderRankings(accountState.data);
      renderTrackingDependents();
      setAccountOperation(`Showing rankings for the last ${accountState.rankingsRange} days.`);
    } catch (error) {
      setAccountOperation(error.message, true);
    }
  });
}

mentionsFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!accountState.data) return;
    accountState.mentionsFilter = button.dataset.mentionsFilter || "all";
    renderAiMentions(accountState.data);
    setAccountOperation(`Showing ${accountState.mentionsFilter === "all" ? "all" : accountState.mentionsFilter} AI mentions.`);
  });
});

if (mentionsSourceInput) {
  mentionsSourceInput.addEventListener("change", () => {
    if (!accountState.data) return;
    accountState.mentionsSource = mentionsSourceInput.value || "all";
    renderAiMentions(accountState.data);
    setAccountOperation(`Filtering AI Mentions by ${accountState.mentionsSource === "all" ? "all sources" : accountState.mentionsSource}.`);
  });
}

if (mentionsRangeInput) {
  mentionsRangeInput.addEventListener("change", async () => {
    if (!accountState.data) return;
    try {
      accountState.mentionsRange = mentionsRangeInput.value || "30";
      const payload = await requestJson(mentionsUrl());
      accountState.data.aiMentions = payload.aiMentions;
      renderAiMentions(accountState.data);
      renderTrackingDependents();
      setAccountOperation(`Showing AI Mentions for the last ${accountState.mentionsRange} days.`);
    } catch (error) {
      setAccountOperation(error.message, true);
    }
  });
}

if (mentionsModelInput) {
  mentionsModelInput.addEventListener("change", () => {
    if (!accountState.data) return;
    accountState.mentionsModel = mentionsModelInput.value || "all";
    renderAiMentions(accountState.data);
    setAccountOperation(`Filtering AI Mentions by ${accountState.mentionsModel === "all" ? "all models" : accountState.mentionsModel}.`);
  });
}

productFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    accountState.productFilter = button.dataset.productFilter;
    productFilterButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    if (accountState.data) renderProducts(accountState.data);
  });
});

billingPlanActions.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!accountState.data) return;
    if (isReadOnlyWorkspace()) {
      setAccountOperation("This workspace is read-only for your role.", true);
      return;
    }

    try {
      const billing = accountState.data.billing || {};
      const payload = await postAccountAction("/api/account/billing/checkout", {
        plan: button.dataset.billingPlanAction,
        billingPeriod: billing.billingPeriod || "annual",
      });
      const updatedBilling = payload.billing || accountState.data.billing || {};
      const invoice = (updatedBilling.invoices || [])[0] || {};
      showAccountDialog(
        "Billing checkout",
        billingCheckoutDialogBody(updatedBilling, button.dataset.billingPlanAction, invoice)
      );
      setAccountOperation(`${button.dataset.billingPlanAction} billing state saved locally.`);
    } catch (error) {
      setAccountOperation(error.message, true);
    }
  });
});

billingPeriodActions.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!accountState.data) return;
    if (isReadOnlyWorkspace()) {
      setAccountOperation("This workspace is read-only for your role.", true);
      return;
    }

    try {
      const billing = accountState.data.billing || {};
      const payload = await requestJson("/api/account/billing", {
        method: "PUT",
        body: JSON.stringify({
          ...billing,
          billingPeriod: button.dataset.billingPeriodAction,
        }),
      });
      if (payload.account) {
        accountState.data = payload.account;
        renderAccountData();
      } else {
        accountState.data.billing = payload.billing;
        renderBilling(accountState.data);
      }
      setAccountOperation("Billing period saved locally.");
    } catch (error) {
      setAccountOperation(error.message, true);
    }
  });
});

if (productSearchInput) {
  productSearchInput.addEventListener("input", () => {
    accountState.productSearch = productSearchInput.value;
    if (accountState.data) renderProducts(accountState.data);
  });
}

if (searchFilterInput) {
  searchFilterInput.addEventListener("input", () => {
    accountState.searchFilter = searchFilterInput.value;
    if (accountState.data) renderSearchConsole(accountState.data);
  });
}

if (searchRangeInput) {
  searchRangeInput.addEventListener("change", async () => {
    if (accountState.data) {
      try {
        const range = searchRangeInput.value || "28";
        const payload = await requestJson(`/api/account/search-console?range=${encodeURIComponent(range)}`);
        accountState.data.searchConsole = payload.searchConsole || {
          ...(accountState.data.searchConsole || {}),
          dateRange: range,
        };
        renderSearchConsole(accountState.data);
        renderTrackingDependents();
        setAccountOperation(`Showing Search Console last ${range} days.`);
      } catch (error) {
        setAccountOperation(error.message, true);
      }
    }
  });
}

searchRowLimitInputs.forEach((input) => {
  input.addEventListener("change", () => {
    accountState.searchRowLimit = Number(input.value || 10);
    if (accountState.data) renderSearchConsole(accountState.data);
  });
});

if (rankingsSearchInput) {
  rankingsSearchInput.addEventListener("input", () => {
    accountState.rankingsSearch = rankingsSearchInput.value;
    if (accountState.data) renderRankings(accountState.data);
  });
}

if (mentionsSearchInput) {
  mentionsSearchInput.addEventListener("input", () => {
    accountState.mentionsSearch = mentionsSearchInput.value;
    if (accountState.data) renderAiMentions(accountState.data);
  });
}

if (topicSearchInput) {
  topicSearchInput.addEventListener("input", () => {
    if (!accountState.data) return;
    accountState.topicFilters.query = topicSearchInput.value;
    accountState.topicSearchResults = null;
    renderTopics(accountState.data);
  });
  topicSearchInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    accountState.topicFilters.query = topicSearchInput.value;
    await handleAccountAction("search-keywords");
  });
}

topicFilterInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (!accountState.data) return;
    accountState.topicFilters[input.dataset.topicFilter] = input.value;
    accountState.topicSearchResults = null;
    renderTopics(accountState.data);
  });
});

topicSortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!accountState.data) return;
    const field = button.dataset.topicSort || "volume";
    accountState.topicSort = {
      field,
      direction: accountState.topicSort.field === field && accountState.topicSort.direction === "desc" ? "asc" : "desc",
    };
    accountState.topicSearchResults = null;
    renderTopics(accountState.data);
  });
});

if (accountDialogClose) {
  accountDialogClose.addEventListener("click", hideAccountDialog);
}

if (accountDialog) {
  accountDialog.addEventListener("click", (event) => {
    if (event.target === accountDialog) hideAccountDialog();
  });
}

if (accountDialogForm) {
  accountDialogForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!accountState.dialogSubmit) return;
    if (typeof accountDialogForm.checkValidity === "function" && !accountDialogForm.checkValidity()) {
      accountDialogForm.reportValidity?.();
      return;
    }

    const formData = new FormData(accountDialogForm);
    const values = Object.fromEntries(formData.entries());

    try {
      const result = await accountState.dialogSubmit(values);
      if (result !== false) hideAccountDialog();
    } catch (error) {
      setAccountOperation(error.message, true);
    }
  });
}

async function handleAccountAction(action, target) {
  if (!accountState.data && !["help-chat", "accept-invite"].includes(action)) return;
  if (action === "help-chat" && !accountState.data) {
    if (!authState.user) {
      window.history.pushState({}, "", `/login?next=${encodeURIComponent("/account?view=help")}`);
      renderRoute();
      return;
    }
    const loaded = await loadAccountData();
    if (!loaded) return;
  }
  const readOnlyActions = new Set(["workspace", "strategy", "dismiss-strategy", "refresh", "export-keywords", "export-search-console", "refresh-rankings", "export-rankings", "refresh-ai-mentions", "export-ai-mentions", "export-reports", "export-seo-analysis", "start-tour", "tour-back", "tour-next", "tour-finish", "tour-close"]);

  if (accountState.data && isReadOnlyWorkspace() && !readOnlyActions.has(action)) {
    setAccountOperation("This workspace is read-only for your role.", true);
    return;
  }

  try {
    if (action === "workspace") {
      const workspaces = accountState.workspaces.length
        ? accountState.workspaces
        : [{ id: accountState.data.id, workspaceName: accountState.data.workspaceName, ownerEmail: accountState.data.ownerEmail, role: "owner", selected: true }];
      const workspaceExtraActions = isReadOnlyWorkspace()
        ? []
        : [
            {
              label: "Add site workspace",
              keepOpenAfterClick: true,
              onClick: showCreateWorkspaceForm,
            },
          ];

      showAccountForm({
        title: "Switch workspace",
        bodyHtml: renderWorkspaceSwitchList(workspaces),
        fields: [
          {
            name: "workspaceId",
            label: "Workspace",
            type: "select",
            value: accountState.selectedWorkspaceId || workspaces.find((workspace) => workspace.selected)?.id || workspaces[0]?.id,
            options: workspaces.map((workspace) => ({
              value: workspace.id,
              label: `${workspace.workspaceName || workspace.ownerEmail} - ${workspace.role}`,
            })),
          },
        ],
        submitText: "Switch",
        onSubmit: async (values) => {
          await postAccountAction("/api/account/workspaces/select", { workspaceId: values.workspaceId });
          setAccountOperation("Workspace switched.");
        },
        extraActions: workspaceExtraActions,
      });
      return;
    }

    if (action === "strategy") {
      accountState.strategyDismissed = false;
      if (strategyCard) strategyCard.hidden = false;
      const strategy = accountState.data.contentPlan?.strategy || "This plan is built from saved keywords, topics, products, locations, and CMS settings.";
      if (isReadOnlyWorkspace()) {
        showAccountDialog("Content strategy", strategy);
        return;
      }
      showAccountForm({
        title: "Edit content strategy",
        body: "Update the planning rationale shown on the account dashboard.",
        submitText: "Save strategy",
        fields: [{ name: "strategy", label: "Strategy", type: "textarea", rows: 5, value: strategy, required: true }],
        onSubmit: async (values) => {
          const payload = await requestJson("/api/account/content-plan/strategy", {
            method: "PUT",
            body: JSON.stringify({ strategy: values.strategy }),
          });
          if (payload.account) {
            accountState.data = payload.account;
            renderAccountData();
          } else {
            if (payload.contentPlan) accountState.data.contentPlan = payload.contentPlan;
            renderContentPlan(accountState.data);
          }
          setAccountOperation("Content strategy updated.");
        },
      });
      return;
    }

    if (action === "dismiss-strategy") {
      accountState.strategyDismissed = true;
      if (strategyCard) strategyCard.hidden = true;
      return;
    }

    if (action === "refresh") {
      const refreshed = await loadAccountData();
      if (refreshed) setAccountOperation("Account data refreshed.");
      return;
    }

    if (action === "start-tour") {
      renderTourStep(0);
      return;
    }

    if (action === "tour-close") {
      hideTour();
      setAccountOperation("Walkthrough dismissed.");
      return;
    }

    if (action === "tour-back") {
      renderTourStep(accountState.tourStep <= 0 ? 0 : accountState.tourStep - 1);
      return;
    }

    if (action === "tour-next") {
      renderTourStep(accountState.tourStep < 0 ? 0 : accountState.tourStep + 1);
      return;
    }

    if (action === "tour-finish") {
      hideTour();
      setAccountOperation("Walkthrough finished.");
      return;
    }

    if (action === "add-topic-to-plan") {
      showTopicForm({ addToPlan: true });
      return;
    }

    if (action === "bulk-schedule") {
      showAccountForm({
        title: "Bulk schedule articles",
        body: "Schedule multiple saved topics at once. Unused topics are selected first; filler drafts use saved keywords if you request more than you have.",
        submitText: "Schedule articles",
        fields: [
          { name: "count", label: "Number of articles", type: "number", value: 6, min: 1, max: 24, step: 1, required: true },
          { name: "startDate", label: "Start date", type: "date", value: new Date().toISOString().slice(0, 10), required: true },
          { name: "frequencyDays", label: "Days between articles", type: "number", value: 2, min: 1, max: 14, step: 1, required: true },
          { name: "status", label: "Initial status", type: "select", value: "scheduled", options: ["scheduled", "draft", "paused"] },
        ],
        onSubmit: async (values) => {
          await postAccountAction("/api/account/content-plan/bulk-schedule", values);
          setAccountView("plan");
          setAccountOperation("Bulk schedule created.");
        },
      });
      return;
    }

    if (action === "save-builder-draft") {
      setWriteProgress(true, "Saving Article Builder draft...");
      try {
        const draftResponse = await requestJson("/api/account/write-draft", {
          method: "PUT",
          body: JSON.stringify(getWriteDraftPayload({ status: "draft" })),
        });
        const savedDraft = draftResponse.writeDraft || getWriteDraftPayload({ status: "draft" });
        const sourcePostId = savedDraft.sourcePostId || "";
        if (sourcePostId) {
          const postPayload = writeDraftToEditorPostPayload(savedDraft);
          const postResponse = await requestJson(`/api/account/blog/posts/${encodeURIComponent(sourcePostId)}`, {
            method: "PUT",
            body: JSON.stringify(postPayload),
          });
          if (postResponse.account) {
            accountState.data = { ...accountState.data, ...postResponse.account, ui: postResponse.account.ui || accountState.data.ui || {} };
            accountState.data.writeDraft = savedDraft;
            renderAccountData();
          }
          markAccountSaved();
          setAccountOperation("Article draft saved to opened article.");
          return;
        }
        if (draftResponse.account) {
          accountState.data = draftResponse.account;
          renderAccountData();
        } else {
          accountState.data.writeDraft = savedDraft;
          renderWriteDraft(accountState.data);
        }
        markAccountSaved();
        setAccountOperation("Article Builder draft saved.");
        return;
      } finally {
        setWriteProgress(false);
      }
    }

    if (action === "start-article") {
      const draft = getWriteDraftPayload();
      if (!draft.title || !draft.keyword) {
        setAccountOperation("Add a title and target keyword before starting an article.");
        return;
      }
      setWriteProgress(true, "Starting article draft...");
      try {
        const draftResponse = await requestJson("/api/account/write-draft", {
          method: "PUT",
          body: JSON.stringify({ ...draft, status: "queued" }),
        });
        const savedDraft = draftResponse.writeDraft || draft;
        const postPayload = writeDraftToEditorPostPayload(savedDraft);
        const sourcePostId = savedDraft.sourcePostId || draft.sourcePostId || "";
        if (sourcePostId) {
          const payload = await requestJson(`/api/account/blog/posts/${encodeURIComponent(sourcePostId)}`, {
            method: "PUT",
            body: JSON.stringify(postPayload),
          });
          if (payload.account) accountState.data = { ...accountState.data, ...payload.account, ui: payload.account.ui || accountState.data.ui || {} };
        } else {
          await postAccountAction("/api/account/blog/posts", postPayload);
        }
        accountState.data.writeDraft = savedDraft;
        renderAccountData();
        setAccountView("plan");
        setAccountOperation(sourcePostId ? "Article updated from Article Builder." : "Article draft added to Articles.");
        return;
      } finally {
        setWriteProgress(false);
      }
    }

    if (action === "preview-article") {
      setWriteProgress(true, "Generating brief preview...");
      try {
        const draft = getWriteDraftPayload({ status: "draft" });
        await requestJson("/api/account/write-draft", {
          method: "PUT",
          body: JSON.stringify(draft),
        });
        const payload = await postAccountAction("/api/account/write-draft/preview");
        accountState.data.writeDraft = payload.writeDraft;
        renderWriteDraft(accountState.data);
        setAccountOperation("Brief preview generated.");
        return;
      } finally {
        setWriteProgress(false);
      }
    }

    if (action === "schedule-builder-article") {
      const draft = accountState.data.writeDraft || {};
      const sourcePostId = draft.sourcePostId || "";
      if (!sourcePostId) {
        setAccountOperation("Generate or open an article before scheduling from Article Builder.", true);
        return;
      }
      showAccountForm({
        title: "Schedule article",
        body: "Choose when this generated article should appear in the content plan.",
        submitText: "Schedule",
        fields: [
          { name: "scheduledDate", label: "Scheduled date", type: "date", value: draft.scheduledDate || new Date().toISOString().slice(0, 10), required: true },
          { name: "scheduledTime", label: "Scheduled time", type: "time", value: draft.scheduledTime || accountState.data.settings?.site?.defaultPublishTime || "09:00" },
          { name: "status", label: "Status", type: "select", value: "scheduled", options: ["scheduled", "draft", "paused"] },
        ],
        onSubmit: async (values) => {
          setWriteProgress(true, "Scheduling article...");
          try {
            const payload = await requestJson(`/api/account/blog/posts/${encodeURIComponent(sourcePostId)}/schedule`, {
              method: "POST",
              body: JSON.stringify({
                scheduledDate: values.scheduledDate,
                scheduledTime: values.scheduledTime,
                status: values.status || "scheduled",
              }),
            });
            if (payload.account) accountState.data = payload.account;
            if (payload.post) accountState.data.writeDraft = blogPostToWriteDraft(payload.post);
            renderAccountData();
            setAccountView("write");
            setAccountOperation("Article scheduled from Article Builder.");
          } finally {
            setWriteProgress(false);
          }
        },
      });
      return;
    }

    if (action === "publish-builder-article") {
      const draft = accountState.data.writeDraft || {};
      const sourcePostId = draft.sourcePostId || "";
      if (!sourcePostId) {
        setAccountOperation("Generate or open an article before publishing from Article Builder.", true);
        return;
      }
      showConfirmDialog(
        "Publish article",
        `Publish "${draft.title || "this article"}" to the public blog when it passes backend validation.`,
        "Publish",
        async () => {
          setWriteProgress(true, "Publishing article...");
          try {
            const payload = await requestJson(`/api/account/blog/posts/${encodeURIComponent(sourcePostId)}/publish`, { method: "POST", body: "{}" });
            if (payload.account) accountState.data = payload.account;
            if (payload.post) accountState.data.writeDraft = blogPostToWriteDraft(payload.post);
            renderAccountData();
            setAccountView("write");
            setAccountOperation("Article marked published locally from Article Builder.");
          } finally {
            setWriteProgress(false);
          }
        }
      );
      return;
    }

    if (action === "regenerate-builder-article") {
      const draft = accountState.data.writeDraft || {};
      const sourcePostId = draft.sourcePostId || "";
      if (!sourcePostId) {
        setAccountOperation("Generate or open an article before regenerating from Article Builder.", true);
        return;
      }
      setWriteProgress(true, "Regenerating article...");
      try {
        const payload = await requestJson(`/api/account/blog/posts/${encodeURIComponent(sourcePostId)}/generate`, { method: "POST", body: "{}" });
        if (payload.account) accountState.data = payload.account;
        if (payload.post) accountState.data.writeDraft = blogPostToWriteDraft(payload.post);
        renderAccountData();
        setAccountView("write");
        setAccountOperation("Article regenerated locally from Article Builder.");
        return;
      } finally {
        setWriteProgress(false);
      }
    }

    if (action === "find-topics") {
      showTopicForm({ addToPlan: false });
      return;
    }

    if (action === "magic-select-keywords") {
      const topicSource = accountState.topicSearchResults || accountState.data.topics || [];
      const candidates = visibleTopics(accountState.data, topicSource).filter((topic) => !topic.added);
      const preferred = candidates.filter((topic) => getTopicDifficultyScore(topic) <= 35 && Number(topic.volume || 0) >= 500 && Number(topic.competition || 0) <= 0.6);
      accountState.selectedTopicIds = new Set((preferred.length ? preferred : candidates).slice(0, 10).map((topic) => topic.id));
      renderTopics(accountState.data, topicSource);
      setAccountOperation(accountState.selectedTopicIds.size ? "Best visible keywords selected." : "No visible keywords available to select.");
      return;
    }

    if (action === "search-keywords") {
      setKeywordProgress(true, "Searching keywords...");
      try {
        const payload = await requestJson("/api/account/topics/search", {
          method: "POST",
          body: JSON.stringify(currentTopicFilterPayload()),
        });
        if (payload.topics && accountState.data) {
          accountState.topicSearchResults = payload.topics;
          accountState.selectedTopicIds = new Set(Array.from(accountState.selectedTopicIds).filter((id) => payload.topics.some((topic) => topic.id === id)));
          renderTopics(accountState.data, payload.topics);
        }
        const count = Number(payload.summary?.filtered ?? payload.topics?.length ?? 0);
        setAccountOperation(`Keyword search returned ${count} result${count === 1 ? "" : "s"}.`);
      } finally {
        setKeywordProgress(false);
      }
      return;
    }

    if (action === "export-keywords") {
      const payload = await requestJson("/api/account/topics/export", {
        method: "POST",
        body: JSON.stringify(currentTopicFilterPayload()),
      });
      downloadCsvExport(payload, "keywords.csv", "Keyword export");
      setAccountOperation("Keyword export generated.");
      return;
    }

    if (action === "save-keywords") {
      const topicIds = Array.from(accountState.selectedTopicIds);
      const selectedTopicPool = [...(accountState.data.topics || []), ...(accountState.topicSearchResults || [])];
      const keywords = topicIds
        .map((topicId) => selectedTopicPool.find((topic) => topic.id === topicId))
        .map((topic) => String(topic?.keyword || topic?.title || "").trim())
        .filter(Boolean);
      const payload = await requestJson("/api/account/topics/save-keywords", {
        method: "POST",
        body: JSON.stringify({ topicIds, keywords }),
      });
      if (payload.account) accountState.data = payload.account;
      if (payload.settings && accountState.data) accountState.data.settings = payload.settings;
      if (payload.topics && accountState.data) {
        accountState.data.topics = payload.topics;
        accountState.topicSearchResults = null;
      }
      renderAccountData();
      setAccountOperation(`${topicIds.length} keyword${topicIds.length === 1 ? "" : "s"} saved to Site Settings.`);
      return;
    }

    if (action === "generate-description") {
      setDescriptionProgress(true, "Generating product description...");
      try {
        if (!(await saveAccountSettings())) return;
        await postAccountAction("/api/account/settings/generate-description");
        setAccountOperation("Generated and saved a starter description.");
      } finally {
        setDescriptionProgress(false);
      }
      return;
    }

    if (action === "test-image-settings") {
      setSettingsPanelProgress(imageProgress, true, "Testing image prompt...");
      try {
        if (!(await saveAccountSettings())) return;
        await postAccountAction("/api/account/images/test");
        setAccountOperation("Image prompt generated locally.");
      } finally {
        setSettingsPanelProgress(imageProgress, false);
      }
      return;
    }

    if (action === "clear-image-tests") {
      setSettingsPanelProgress(imageProgress, true, "Clearing image prompt history...");
      try {
        const payload = await requestJson("/api/account/images/test-history", { method: "DELETE" });
        if (payload.account) {
          accountState.data = payload.account;
          renderAccountData();
        } else {
          if (payload.images) accountState.data.settings.images = payload.images;
          renderSettings(accountState.data);
        }
        setAccountOperation("Image prompt history cleared.");
      } finally {
        setSettingsPanelProgress(imageProgress, false);
      }
      return;
    }

    if (action === "reset-image-visual-style") {
      const visualStyleInput = settingsFieldInputs.find((input) => input.dataset.settingsField === "images.visualStyle");
      if (visualStyleInput) visualStyleInput.value = "";
      accountState.data.settings = accountState.data.settings || {};
      accountState.data.settings.images = { ...(accountState.data.settings.images || {}), visualStyle: "" };
      markAccountDirty();
      setAccountOperation("Visual style reset locally.");
      return;
    }

    if (action === "suggest-image-visual-style") {
      const suggestion = "professional photography, clean composition, natural lighting, practical business context";
      const visualStyleInput = settingsFieldInputs.find((input) => input.dataset.settingsField === "images.visualStyle");
      if (visualStyleInput) visualStyleInput.value = suggestion;
      accountState.data.settings = accountState.data.settings || {};
      accountState.data.settings.images = { ...(accountState.data.settings.images || {}), visualStyle: suggestion };
      markAccountDirty();
      setAccountOperation("Visual style suggestion added locally.");
      return;
    }

    if (action === "add-keywords") {
      const payload = getSettingsPayload();
      const additions = payload.site.keywordDraft
        .split(/[\n,]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean);
      if (!additions.length) {
        setAccountOperation("Add at least one keyword first.", true);
        return;
      }
      payload.site.keywords = Array.from(new Set([...(payload.site.keywords || []), ...additions]));
      payload.site.keywordDraft = "";
      const response = await requestJson("/api/account/settings", { method: "PUT", body: JSON.stringify(payload) });
      if (response.account) accountState.data = response.account;
      else accountState.data.settings = response.settings;
      renderAccountData();
      setAccountOperation("Keywords added and saved.");
      return;
    }

    if (action === "reset-cta") {
      const payload = getSettingsPayload();
      payload.cta = { enabled: false, label: "", text: "", url: "", placement: "end", style: "button", openInNewTab: true, trackingLabel: "" };
      const response = await requestJson("/api/account/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (response.account) accountState.data = response.account;
      else accountState.data.settings = response.settings;
      renderAccountData();
      setAccountOperation("CTA reset.");
      return;
    }

    if (action === "edit-cta") {
      showCtaForm();
      return;
    }

    if (action === "connect-inventory") {
      const inventoryFeed = accountState.data.inventoryFeed || {};
      showAccountForm({
        title: "Connect inventory feed",
        bodyHtml: renderInventoryConnectChecklist(inventoryFeed),
        submitText: "Save inventory connection",
        fields: [
          { name: "retailerName", label: "Feed name", value: inventoryFeed.retailerName || "", required: true },
          { name: "accountId", label: "Feed account id", value: inventoryFeed.accountId || "", required: true },
          { name: "secret", label: "API key or token", type: "password", placeholder: inventoryFeed.hasCredentials ? "Already configured" : "" },
        ],
        onSubmit: async (values) => {
          setSettingsPanelProgress(inventoryProgress, true, "Saving inventory connection...");
          try {
            await postAccountAction("/api/account/inventory-feed/connect", values);
            setAccountOperation("Inventory connection saved locally.");
          } finally {
            setSettingsPanelProgress(inventoryProgress, false);
          }
        },
      });
      return;
    }

    if (action === "sync-inventory") {
      setSettingsPanelProgress(inventoryProgress, true, "Syncing inventory products...");
      try {
        await postAccountAction("/api/account/inventory-feed/sync");
        const feed = accountState.data.inventoryFeed || {};
        setAccountOperation(feed.status === "connected" ? "Inventory products synced locally." : feed.lastError || "Connect inventory before syncing.");
      } finally {
        setSettingsPanelProgress(inventoryProgress, false);
      }
      return;
    }

    if (action === "disconnect-inventory") {
      showConfirmDialog("Disconnect inventory feed", "This clears local inventory credential metadata. Synced product rows stay available until you delete or hide them.", "Disconnect", async () => {
        setSettingsPanelProgress(inventoryProgress, true, "Disconnecting inventory feed...");
        try {
          await postAccountAction("/api/account/inventory-feed/disconnect");
          setAccountOperation("Inventory feed disconnected locally.");
        } finally {
          setSettingsPanelProgress(inventoryProgress, false);
        }
      });
      return;
    }

    if (action === "connect-cms") {
      const settings = getSettingsPayload();
      const cms = settings.cms || {};
      const platform = cms.platform || "WordPress";
      const platformMeta = cmsPlatformMeta(platform);
      showAccountForm({
        title: "Connect CMS",
        bodyHtml: renderCmsProviderChecklist(platformMeta),
        submitText: "Save CMS connection",
        fields: [
          { name: "websiteUrl", label: platformMeta.urlLabel, type: "url", value: cms.websiteUrl || "", required: true },
          { name: "platform", label: "Platform", type: "select", value: platform, options: ["WordPress", "Webflow", "Shopify", "Wix", "Ghost", "Custom API"], required: true },
          { name: "username", label: platformMeta.usernameLabel, value: cms.username || "" },
          { name: "blogTarget", label: platformMeta.targetLabel, value: cms.blogTarget || "", placeholder: "Main blog" },
          { name: "collectionName", label: platformMeta.collectionLabel, value: cms.collectionName || "", placeholder: "Articles" },
          {
            name: "draftFirst",
            label: "Publishing mode",
            type: "select",
            value: cms.draftFirst === false ? "false" : "true",
            options: [
              { value: "true", label: "Draft first" },
              { value: "false", label: "Auto-publish after approval" },
            ],
          },
          { name: "secret", label: platformMeta.secretLabel, type: "password", placeholder: cms.hasCredentials ? "Already configured" : "" },
        ],
        onSubmit: async (values) => {
          setSettingsPanelProgress(cmsProgress, true, "Saving CMS connection...");
          try {
            if (!(await saveAccountSettings())) return false;
            await postAccountAction("/api/account/cms/connect", { ...values, draftFirst: values.draftFirst !== "false" });
            setAccountOperation("CMS connection saved locally.");
            return true;
          } finally {
            setSettingsPanelProgress(cmsProgress, false);
          }
        },
      });
      return;
    }

    if (action === "add-product") {
      showAccountForm({
        title: "Add product",
        body: "Products can be referenced by generated articles and image rules.",
        submitText: "Save product",
        fields: [
          { name: "name", label: "Product name", required: true },
          { name: "category", label: "Category", value: "Service", required: true },
          { name: "price", label: "Price" },
          { name: "sku", label: "SKU" },
          { name: "audience", label: "Audience or use case" },
          { name: "description", label: "Short description", type: "textarea", rows: 3 },
          { name: "url", label: "Product URL", type: "url" },
          { name: "featured", label: "Featured product", type: "select", value: "false", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }] },
          { name: "hidden", label: "Visibility", type: "select", value: "visible", options: ["visible", "hidden"] },
        ],
        onSubmit: async (values) => {
          await postAccountAction("/api/account/products", { ...values, featured: values.featured === "true", hidden: values.hidden === "hidden", source: "manual" });
          setAccountOperation("Product saved.");
        },
      });
      return;
    }

    if (action === "test-cms") {
      setSettingsPanelProgress(cmsProgress, true, "Testing CMS setup...");
      try {
        if (!(await saveAccountSettings())) return;
        const payload = await postAccountAction("/api/account/cms/test");
        showCmsTestDialog(payload);
      } finally {
        setSettingsPanelProgress(cmsProgress, false);
      }
      return;
    }

    if (action === "disconnect-cms") {
      showConfirmDialog("Disconnect CMS", "This clears local CMS credential metadata. It does not revoke credentials in the external platform.", "Disconnect", async () => {
        setSettingsPanelProgress(cmsProgress, true, "Disconnecting CMS...");
        try {
          await postAccountAction("/api/account/cms/disconnect");
          setAccountOperation("CMS disconnected locally.");
        } finally {
          setSettingsPanelProgress(cmsProgress, false);
        }
      });
      return;
    }

    if (action === "add-location") {
      showAccountForm({
        title: "Add business location",
        body: "Locations give generated articles accurate real-world facts.",
        submitText: "Save location",
        fields: [
          { name: "name", label: "Location name", value: "Main location", required: true },
          { name: "city", label: "City", required: true },
          { name: "state", label: "State", placeholder: "CA", required: true },
          { name: "address", label: "Address" },
          { name: "phone", label: "Phone" },
          { name: "serviceArea", label: "Service area" },
          { name: "isPrimary", label: "Primary location", type: "select", value: "false", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }] },
        ],
        onSubmit: async (values) => {
          await postAccountAction("/api/account/locations", { ...values, isPrimary: values.isPrimary === "true" });
          setAccountOperation("Location saved.");
        },
      });
      return;
    }

    if (action === "generate-invite") {
      const email = inviteEmailInput?.value || "";
      const role = inviteRoleInput?.value || "member";
      const payload = await postAccountAction("/api/account/invites", { email, role });
      if (inviteEmailInput) inviteEmailInput.value = "";
      if (inviteRoleInput) inviteRoleInput.value = "member";
      updateInviteGenerateState();
      const invite = payload.invites?.[0];
      showInviteLinkDialog(invite);
      setAccountOperation(invite ? `Invite link generated for ${invite.email} as ${invite.role || "member"}.` : "Invite generated.");
      return;
    }

    if (action === "accept-invite") {
      const token = currentInviteToken();
      if (!token) {
        if (inviteMessage) inviteMessage.textContent = "Invite link is missing.";
        if (inviteDetail) inviteDetail.textContent = "Ask the workspace owner to generate a new invitation link.";
        if (inviteAcceptAction) inviteAcceptAction.disabled = true;
        setAccountOperation("Invite link is missing.", true);
        return;
      }
      if (!authState.user) {
        window.history.pushState({}, "", `/login?next=${encodeURIComponent(currentPathWithSearch())}`);
        renderRoute();
        return;
      }

      const payload = await requestJson(`/api/invite/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        body: "{}",
      });
      await loadAccountData();
      inviteMessage.textContent = `Joined ${payload.workspaceName}`;
      inviteDetail.textContent = `Accepted as ${payload.member.email} (${payload.member.role || "member"}). The owner workspace is now available from your account workspace switcher.`;
      if (inviteAcceptAction) inviteAcceptAction.disabled = true;
      showAccountDialog("Invite accepted", `You joined ${payload.workspaceName}. Open Account to manage or switch workspaces.`);
      return;
    }

    if (action === "billing-portal") {
      setSettingsPanelProgress(billingProgress, true, "Opening billing portal...");
      try {
        const payload = await postAccountAction("/api/account/billing/portal");
        showAccountDialog(
          "Billing portal",
          payload.portalUrl
            ? `Local billing portal session opened at ${payload.portalUrl}. Stripe checkout and real payment-method management still need provider integration.`
            : "Local billing portal session opened. Stripe checkout and real payment-method management still need provider integration."
        );
        setAccountOperation("Billing portal opened locally.");
      } finally {
        setSettingsPanelProgress(billingProgress, false);
      }
      return;
    }

    if (action === "connect-search-console") {
      const currentProperty = accountState.data.searchConsole?.propertyUrl || accountState.data.settings?.cms?.websiteUrl || "https://sirbloggsalot.com";
      showAccountForm({
        title: "Connect Search Console",
        body: "This creates a local metrics snapshot. Real Google OAuth/Search Console API token storage still needs to be wired.",
        submitText: "Connect locally",
        fields: [{ name: "propertyUrl", label: "Property URL", type: "url", value: currentProperty, required: true }],
        onSubmit: async (values) => {
          setTrackingProgress(searchProgress, true, "Connecting Search Console...");
          try {
            await postAccountAction("/api/account/search-console/connect", values);
            setAccountOperation("Search Console connected locally.");
          } finally {
            setTrackingProgress(searchProgress, false);
          }
        },
      });
      return;
    }

    if (action === "sync-search-console") {
      setTrackingProgress(searchProgress, true, "Syncing tracking data...");
      try {
        await postAccountAction("/api/account/search-console/sync");
        const rankings = await requestJson(rankingsUrl());
        const mentions = await requestJson(mentionsUrl());
        accountState.data.rankings = rankings.rankings;
        accountState.data.aiMentions = mentions.aiMentions;
        renderAccountData();
        setAccountOperation("Tracking data synced locally.");
      } finally {
        setTrackingProgress(searchProgress, false);
      }
      return;
    }

    if (action === "export-search-console") {
      const payload = await requestJson("/api/account/search-console/export");
      downloadCsvExport(payload, "search-console.csv", "Search Console export");
      setAccountOperation("Search Console export generated.");
      return;
    }

    if (action === "refresh-rankings") {
      setTrackingProgress(rankingsProgress, true, "Refreshing rankings...");
      try {
        const payload = await requestJson(rankingsUrl());
        accountState.data.rankings = payload.rankings;
        renderRankings(accountState.data);
        renderTrackingDependents();
        setAccountOperation("Rankings refreshed.");
      } finally {
        setTrackingProgress(rankingsProgress, false);
      }
      return;
    }

    if (action === "export-rankings") {
      const payload = await requestJson("/api/account/rankings/export");
      downloadCsvExport(payload, "rankings.csv", "Rankings export");
      setAccountOperation("Rankings export generated.");
      return;
    }

    if (action === "refresh-ai-mentions") {
      setTrackingProgress(mentionsProgress, true, "Refreshing AI Mentions...");
      try {
        const payload = await requestJson(mentionsUrl());
        accountState.data.aiMentions = payload.aiMentions;
        renderAiMentions(accountState.data);
        renderTrackingDependents();
        setAccountOperation("AI Mentions refreshed.");
      } finally {
        setTrackingProgress(mentionsProgress, false);
      }
      return;
    }

    if (action === "export-ai-mentions") {
      const payload = await requestJson("/api/account/ai-mentions/export");
      downloadCsvExport(payload, "ai-mentions.csv", "AI Mentions export");
      setAccountOperation("AI Mentions export generated.");
      return;
    }

    if (action === "export-reports") {
      const payload = await requestJson("/api/account/reports/export");
      downloadCsvExport(payload, "reports.csv", "Reports export");
      setAccountOperation("Reports export generated.");
      return;
    }

    if (action === "share-report") {
      const template = selectedReportTemplate(accountState.data.reports?.template || accountState.data.reports?.schedule?.template);
      setReportProgress(true, "Creating report share link...");
      try {
        const payload = await postAccountAction("/api/account/reports/share", { template: template.key });
        if (payload.reports) accountState.data.reports = payload.reports;
        renderReports(accountState.data);
        showReportShareDialog(payload.reports?.sharing?.shareUrl || "");
        setAccountOperation("Reports share link created locally.");
      } finally {
        setReportProgress(false);
      }
      return;
    }

    if (action === "schedule-report") {
      const schedule = accountState.data.reports?.schedule || {};
      const template = selectedReportTemplate(accountState.data.reports?.template || schedule.template);
      showAccountForm({
        title: "Schedule report",
        bodyHtml: renderReportScheduleChecklist(schedule, template),
        submitText: "Save schedule",
        fields: [
          { name: "template", label: "Template", type: "select", value: template.key, options: reportTemplateCatalog.map((item) => ({ value: item.key, label: item.label })) },
          { name: "cadence", label: "Cadence", type: "select", value: schedule.cadence || "weekly", options: ["weekly", "monthly"] },
          {
            name: "recipients",
            label: "Recipients",
            type: "textarea",
            rows: 3,
            value: (schedule.recipients || [accountState.data.ownerEmail]).filter(Boolean).join(", "),
            placeholder: "owner@example.com, teammate@example.com",
          },
        ],
        onSubmit: async (values) => {
          const recipients = String(values.recipients || "")
            .split(/[\n,]/)
            .map((recipient) => recipient.trim())
            .filter(Boolean);
          setReportProgress(true, "Saving report schedule...");
          try {
            const payload = await postAccountAction("/api/account/reports/schedule", {
              cadence: values.cadence || "weekly",
              template: values.template || template.key,
              recipients,
            });
            if (payload.reports) accountState.data.reports = payload.reports;
            renderReports(accountState.data);
            setAccountOperation(`${values.cadence === "monthly" ? "Monthly" : "Weekly"} report schedule saved locally.`);
          } finally {
            setReportProgress(false);
          }
        },
      });
      return;
    }

    if (action === "export-seo-analysis") {
      const payload = await requestJson("/api/account/seo-analysis/export");
      downloadCsvExport(payload, "seo-analysis.csv", "SEO Analysis export");
      setAccountOperation("SEO Analysis export generated.");
      return;
    }

    if (action === "disconnect-search-console") {
      showConfirmDialog("Disconnect Search Console", "This clears local Search Console metrics. It does not revoke Google permissions.", "Disconnect", async () => {
        await postAccountAction("/api/account/search-console/disconnect");
        setAccountOperation("Search Console disconnected locally.");
      });
      return;
    }

    if (action === "cancel-billing") {
      showConfirmDialog("Cancel plan", "This marks the local billing state as cancelled. It does not cancel a real Stripe subscription.", "Cancel locally", async () => {
        setSettingsPanelProgress(billingProgress, true, "Cancelling billing...");
        try {
          await postAccountAction("/api/account/billing/cancel");
          setAccountOperation("Billing marked cancelled locally.");
        } finally {
          setSettingsPanelProgress(billingProgress, false);
        }
      });
      return;
    }

    if (action === "reactivate-billing") {
      setSettingsPanelProgress(billingProgress, true, "Reactivating billing...");
      try {
        await postAccountAction("/api/account/billing/reactivate");
        setAccountOperation("Billing reactivated locally.");
      } finally {
        setSettingsPanelProgress(billingProgress, false);
      }
      return;
    }

    if (action === "help-chat") {
      showSupportOptionsDialog();
      return;
    }

    if (action === "create-support-ticket") {
      showAccountForm({
        title: "Create support ticket",
        body: "Tickets are saved to this account workspace. Live chat and email delivery still need provider integration.",
        submitText: "Create ticket",
        fields: [
          { name: "subject", label: "Subject", value: "Publishing setup help", required: true },
          { name: "category", label: "Category", type: "select", value: "Publishing", options: ["Setup", "Publishing", "Billing", "Account access", "Bug"] },
          { name: "priority", label: "Priority", type: "select", value: "normal", options: [{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }] },
          { name: "pageContext", label: "Page or workflow", value: window.location.pathname + (window.location.search || "") },
          { name: "message", label: "What happened?", type: "textarea", rows: 4, placeholder: "Include the site, platform, article, and action you were trying.", required: true },
        ],
        onSubmit: async (values) => {
          await postAccountAction("/api/account/support", values);
          setAccountView("help");
          setAccountOperation("Support ticket created.");
        },
      });
    }
  } catch (error) {
    setAccountOperation(error.message, true);
  }
}

async function openBlogPostEditor(postId) {
  if (!postId) return;
  const detail = await requestJson(`/api/account/blog/posts/${postId}`);
  const item = detail.post;
  if (!item) return;

  showAccountForm({
    title: "Edit article",
    body: "Update article metadata, schedule, draft body, and private editorial notes.",
    submitText: "Save article",
    dangerText: "Delete article",
    fields: [
      { name: "title", label: "Title", value: item.title, required: true },
      { name: "slug", label: "Slug", value: item.slug || "" },
      { name: "keyword", label: "Target keyword", value: item.keyword || "" },
      { name: "category", label: "Category", value: item.category || "" },
      { name: "excerpt", label: "Excerpt", type: "textarea", rows: 2, value: item.excerpt || "" },
      { name: "canonicalUrl", label: "Canonical URL", type: "url", value: item.canonicalUrl || "" },
      { name: "authorName", label: "Author name", value: item.authorName || "" },
      { name: "seoTitle", label: "SEO title", value: item.seoTitle || "" },
      { name: "metaDescription", label: "Meta description", type: "textarea", rows: 2, value: item.metaDescription || "" },
      { name: "internalLinks", label: "Internal links", type: "textarea", rows: 3, value: item.internalLinks || "" },
      { name: "schemaType", label: "Schema type", value: item.schemaType || "" },
      { name: "featuredImageUrl", label: "Featured image URL", type: "url", value: item.featuredImageUrl || "" },
      { name: "featuredImageAlt", label: "Featured image alt", value: item.featuredImageAlt || "" },
      { name: "body", label: "Draft body", type: "textarea", rows: 8, value: item.body || "" },
      { name: "scheduledDate", label: "Scheduled date", type: "date", value: item.scheduledDate || "" },
      { name: "scheduledTime", label: "Scheduled time", type: "time", value: item.scheduledTime || "" },
      { name: "status", label: "Status", type: "select", value: item.status || "draft", options: ["scheduled", "draft", "processing", "published", "failed", "paused"] },
      { name: "volume", label: "Search volume", type: "number", value: item.volume || 0, min: 0, step: 1 },
      { name: "difficulty", label: "Difficulty", value: item.difficulty || "Needs review" },
      { name: "estimatedVisits", label: "Estimated visits", type: "number", value: item.estimatedVisits || 0, min: 0, step: 1 },
      { name: "notes", label: "Private notes", type: "textarea", rows: 3, value: item.notes || "" },
    ],
    extraActions: [
      {
        label: "Generate draft",
        onClick: async () => {
          const payload = await requestJson(`/api/account/blog/posts/${item.id}/generate`, { method: "POST", body: "{}" });
          if (payload.account) accountState.data = payload.account;
          renderAccountData();
          setAccountOperation("Article draft generated locally.");
        },
      },
      {
        label: item.status === "published" ? "Unpublish" : "Publish",
        onClick: async () => {
          const action = item.status === "published" ? "unpublish" : "publish";
          const payload = await requestJson(`/api/account/blog/posts/${item.id}/${action}`, { method: "POST", body: "{}" });
          if (payload.account) accountState.data = payload.account;
          renderAccountData();
          setAccountOperation(action === "publish" ? "Article marked published locally." : "Article moved back to draft.");
        },
      },
    ],
    onSubmit: async (values) => {
      const payload = await requestJson(`/api/account/blog/posts/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...item, ...values }),
      });
      if (payload.account) accountState.data = payload.account;
      renderAccountData();
      setAccountOperation("Article updated.");
    },
    onDanger: async () => {
      const payload = await requestJson(`/api/account/blog/posts/${item.id}`, { method: "DELETE" });
      if (payload.account) accountState.data = payload.account;
      renderAccountData();
      setAccountOperation("Article deleted.");
    },
  });
}

async function openBlogPostPreview(postId) {
  if (!postId) return;
  const detail = await requestJson(`/api/account/blog/posts/${postId}`);
  const item = detail.post;
  if (!item) return;

  if (!accountDialog || !accountDialogTitle || !accountDialogBody) {
    showAccountDialog("Article detail", item.title || "Untitled article");
    return;
  }

  const readOnly = isReadOnlyWorkspace();
  const disabled = readOnly ? "disabled" : "";
  const status = item.status || "draft";
  const readiness = articleReadiness(item);
  const publishBlockers = status === "published" ? [] : articlePublishBlockers(item);
  const publishDisabled = readOnly || publishBlockers.length ? "disabled" : "";
  const publicPath = item.publicPath && isLocalBlogPath(item.publicPath) ? item.publicPath : "";
  const cms = accountState.data?.settings?.cms || {};
  const cmsConnected = cms.status === "connected";
  const cmsMode = cmsConnected ? (cms.draftFirst === false ? "Auto-publish" : "Draft first") : "CMS pending";
  const lifecycleRows = [
    ["Status", articleStatusLabel(status)],
    ["Schedule", formatScheduledDateTimeLabel(item.scheduledDate, item.scheduledTime)],
    ["Public URL", publicPath || "Not published"],
    ["CMS", cmsConnected ? "CMS connected" : "CMS not connected"],
    ["Publish mode", cmsMode],
  ];
  const generatedLabel = item.generatedAt ? `Generated ${formatDateLabel(item.generatedAt.slice(0, 10))}` : "Not generated";
  const updatedLabel = item.updatedAt ? `Updated ${formatDateLabel(item.updatedAt.slice(0, 10))}` : "Not updated";
  const actionStateRows = [
    ["Generation", generatedLabel],
    ["Last update", updatedLabel],
    ["Issue", item.lastError || "No active issue"],
  ];
  const rows = [
    ["Target keyword", item.keyword || "No keyword"],
    ["Status", articleStatusLabel(status)],
    ["Scheduled", formatScheduledDateTimeLabel(item.scheduledDate, item.scheduledTime)],
    ["Category", item.category || "Uncategorized"],
    ["Author", item.authorName || "Editorial Team"],
    ["SEO title", item.seoTitle || "Not set"],
    ["Meta description", item.metaDescription || "Not set"],
    ["Canonical URL", item.canonicalUrl || "Not set"],
    ["Public path", publicPath || "Not published"],
  ];

  accountDialogTitle.textContent = "Article detail";
  accountDialogBody.innerHTML = `
    <article class="article-detail-dialog" data-article-detail-dialog>
      <header>
        <span>${escapeHtml(articleStatusLabel(status))}</span>
        <h3>${escapeHtml(item.title || "Untitled article")}</h3>
        <p>${escapeHtml(item.excerpt || "No excerpt saved yet.")}</p>
      </header>
      <div class="article-detail-readiness" data-article-detail-readiness>
        <strong>${escapeHtml(readinessText(readiness))}</strong>
        <p>${escapeHtml(publishBlockers.length ? `Publishing blocked: ${publishBlockers.join(" ")}` : readiness.missing?.length ? "Complete the missing fields before publishing." : "Core article fields are ready for the next lifecycle action.")}</p>
      </div>
      <div class="article-lifecycle" data-article-lifecycle>
        <strong>Lifecycle</strong>
        <dl>
          ${lifecycleRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
      <div class="article-action-state" data-article-action-state>
        <button class="article-lifecycle-detail-link" type="button" data-article-lifecycle-detail="${escapeAttribute(item.id)}">
          <strong>Action state</strong>
          <p>Review lifecycle requests, readiness, progress, and evidence gaps.</p>
        </button>
        <dl>
          ${actionStateRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
      <div class="article-detail-actions">
        <button type="button" data-blog-action="edit" data-blog-post-id="${escapeAttribute(item.id)}" ${disabled}>Edit article</button>
        <button type="button" data-blog-action="open-builder" data-blog-post-id="${escapeAttribute(item.id)}">Open in Article Builder</button>
        <button type="button" data-blog-action="schedule" data-blog-post-id="${escapeAttribute(item.id)}" ${disabled}>Schedule</button>
        <button type="button" data-blog-action="generate" data-blog-post-id="${escapeAttribute(item.id)}" ${disabled}>${status === "draft" && item.body ? "Regenerate" : "Generate"}</button>
        <button type="button" data-blog-action="${status === "published" ? "unpublish" : "publish"}" data-blog-post-id="${escapeAttribute(item.id)}" ${status === "published" ? disabled : publishDisabled}>${status === "published" ? "Unpublish" : "Publish"}</button>
        <button class="is-danger" type="button" data-blog-action="delete" data-blog-post-id="${escapeAttribute(item.id)}" ${disabled}>Delete</button>
      </div>
      <dl>
        ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <section>
        <strong>Draft body</strong>
        <p>${escapeHtml(item.body || item.brief || "Not generated yet.")}</p>
      </section>
      ${publicPath ? `<a href="${escapeAttribute(publicPath)}" data-public-post-link>Open public post</a>` : ""}
    </article>
  `;
  if (accountDialogForm) {
    accountDialogForm.hidden = true;
    accountDialogForm.innerHTML = "";
  }
  accountState.dialogSubmit = null;
  accountDialog.hidden = false;
}

async function openInvoiceDetails(invoiceId) {
  if (!invoiceId) return;
  const payload = await requestJson(`/api/account/billing/invoices/${encodeURIComponent(invoiceId)}`);
  const invoice = payload.invoice;
  if (!invoice) return;
  if (!accountDialog || !accountDialogTitle || !accountDialogBody) {
    showAccountDialog(`Invoice ${invoice.id || invoiceId}`, `Status: ${invoice.status || "local"}`);
    return;
  }

  const detailRows = [
    ["Plan", invoice.plan || "Unknown"],
    ["Amount", invoice.amount || "Unknown"],
    ["Date", invoice.date || "Unknown"],
    ["Status", invoice.status || "local"],
    ["Failure reason", invoice.failureReason || "No failure recorded"],
    ["Local invoice URL", invoice.hostedInvoiceUrl || "No local invoice URL"],
  ];
  const handoffRows = [
    ["Payment", "Stripe invoice payment remains provider-backed"],
    ["Retry", "Retry or payment-method changes happen in the billing portal"],
    ["Portal", "Open billing portal from Billing to manage real payment details"],
    ["Local result", "This dialog only reflects saved local invoice metadata"],
  ];

  accountDialogTitle.textContent = `Invoice ${invoice.id || invoiceId}`;
  accountDialogBody.innerHTML = `
    <section class="billing-invoice-detail" data-billing-invoice-detail>
      <strong>Invoice detail</strong>
      <dl>
        ${detailRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <section class="billing-payment-handoff" data-billing-payment-handoff>
        <strong>Payment handoff</strong>
        <dl>
          ${handoffRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </section>
    </section>
  `;
  if (accountDialogForm) {
    accountDialogForm.hidden = true;
    accountDialogForm.innerHTML = "";
  }
  accountState.dialogSubmit = null;
  accountDialog.hidden = false;
}

async function handleBlogAction(action, postId = "") {
  if (!accountState.data) return;

  if (action === "article-builder") {
    openFreshArticleBuilderDraft();
    return;
  }

  if (action === "view") {
    await openBlogPostPreview(postId);
    return;
  }

  if (action === "open-builder") {
    const detail = await requestJson(`/api/account/blog/posts/${postId}`);
    if (!detail.post) return;
    accountState.data.writeDraft = blogPostToWriteDraft(detail.post);
    renderWriteDraft(accountState.data);
    setAccountView("write");
    hideAccountDialog();
    setAccountOperation("Article opened in Article Builder.");
    return;
  }

  if (action === "bulk-clear") {
    accountState.selectedBlogIds.clear();
    renderContentPlan(accountState.data);
    setAccountOperation("Article selection cleared.");
    return;
  }

  if (action === "bulk-update") {
    const ids = Array.from(accountState.selectedBlogIds);
    if (!ids.length) {
      setAccountOperation("Select at least one article first.", true);
      return;
    }
    const status = blogBulkStatusInput?.value || "draft";
    const payload = await requestJson("/api/account/content-plan/bulk-update", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    });
    if (payload.account) accountState.data = payload.account;
    if (payload.contentPlan && accountState.data) accountState.data.contentPlan = payload.contentPlan;
    accountState.selectedBlogIds.clear();
    renderAccountData();
    setAccountOperation(`${ids.length} article${ids.length === 1 ? "" : "s"} updated.`);
    return;
  }

  if (action === "edit") {
    await openBlogPostEditor(postId);
    return;
  }

  if (action === "schedule") {
    const item = (accountState.data.contentPlan?.items || []).find((candidate) => candidate.id === postId) || {};
    showAccountForm({
      title: "Schedule article",
      body: "Choose when this article should appear in the content plan.",
      submitText: "Schedule",
      fields: [
        { name: "scheduledDate", label: "Scheduled date", type: "date", value: item.scheduledDate || new Date().toISOString().slice(0, 10), required: true },
        { name: "scheduledTime", label: "Scheduled time", type: "time", value: item.scheduledTime || "09:00" },
        { name: "status", label: "Status", type: "select", value: "scheduled", options: ["scheduled", "draft", "paused"] },
      ],
      onSubmit: async (values) => {
        const payload = await requestJson(`/api/account/blog/posts/${postId}/schedule`, {
          method: "POST",
          body: JSON.stringify({
            scheduledDate: values.scheduledDate,
            scheduledTime: values.scheduledTime,
            status: values.status || "scheduled",
          }),
        });
        if (payload.account) accountState.data = payload.account;
        renderAccountData();
        setAccountOperation("Article scheduled.");
      },
    });
    return;
  }

  if (action === "generate") {
    const payload = await requestJson(`/api/account/blog/posts/${postId}/generate`, { method: "POST", body: "{}" });
    if (payload.account) accountState.data = payload.account;
    renderAccountData();
    hideAccountDialog();
    setAccountOperation("Article draft generated locally.");
    return;
  }

  if (["publish", "unpublish"].includes(action)) {
    const isPublish = action === "publish";
    const item = (accountState.data.contentPlan?.items || []).find((candidate) => candidate.id === postId) || {};
    if (isPublish) {
      const publishBlockers = articlePublishBlockers(item);
      if (publishBlockers.length) {
        setAccountOperation(publishBlockers[0], true);
        return;
      }
    }
    showConfirmDialog(
      isPublish ? "Publish article" : "Unpublish article",
      isPublish
        ? `Publish "${item.title || "this article"}" to the public blog when it passes backend validation.`
        : `Move "${item.title || "this article"}" back to draft and remove its public blog URL.`,
      isPublish ? "Publish" : "Unpublish",
      async () => {
        const payload = await requestJson(`/api/account/blog/posts/${postId}/${action}`, { method: "POST", body: "{}" });
        if (payload.account) accountState.data = payload.account;
        renderAccountData();
        setAccountOperation(isPublish ? "Article marked published locally." : "Article moved back to draft.");
      },
      {
        bodyHtml: renderArticleLifecycleConfirmHtml({
          summary: isPublish
            ? `Publish "${item.title || "this article"}" to the public blog when it passes backend validation.`
            : `Move "${item.title || "this article"}" back to draft and remove its public blog URL.`,
          rows: isPublish
            ? [
                ["Action", "Publish to public blog"],
                ["Current status", articleStatusLabel(item.status || "draft")],
                ["Schedule", formatScheduledDateTimeLabel(item.scheduledDate, item.scheduledTime)],
                ["Validation", "Backend validation required"],
              ]
            : [
                ["Action", "Move back to draft"],
                ["Current status", articleStatusLabel(item.status || "published")],
                ["Public URL", item.publicPath || "Public URL removed locally"],
                ["Result", "Public URL removed locally"],
              ],
        }),
      }
    );
    return;
  }

  if (action === "delete") {
    const item = (accountState.data.contentPlan?.items || []).find((candidate) => candidate.id === postId) || {};
    showConfirmDialog("Delete article", "This removes the article from the active local Articles table and public blog output.", "Delete article", async () => {
      const payload = await requestJson(`/api/account/blog/posts/${postId}`, { method: "DELETE" });
      if (payload.account) accountState.data = payload.account;
      renderAccountData();
      setAccountOperation("Article deleted.");
    }, {
      bodyHtml: renderArticleLifecycleConfirmHtml({
        summary: `Remove "${item.title || "this article"}" from the active local Articles table and public blog output.`,
        rows: [
          ["Action", "Delete from active table"],
          ["Current status", articleStatusLabel(item.status || "draft")],
          ["Public output", item.publicPath ? "Public output removed locally" : "No public URL"],
          ["Warning", "Cannot be undone locally"],
        ],
      }),
    });
  }
}

async function handleDynamicAccountClick(event) {
  const setupJump = event.target.closest("[data-setup-jump-view]");
  if (setupJump) {
    const rawView = setupJump.dataset.setupJumpView || "plan";
    const view = accountViewButtons.some((button) => button.dataset.accountView === rawView) ? rawView : "plan";
    const rawTab = setupJump.dataset.setupJumpTab || "";
    const tab = settingsTabButtons.some((button) => button.dataset.settingsTab === rawTab) ? rawTab : "";
    if (view === "settings") {
      setSettingsView(tab);
    } else {
      setAccountView(view);
    }
    return;
  }

  const actionTarget = event.target.closest("[data-account-action]");
  if (actionTarget) {
    await handleAccountAction(actionTarget.dataset.accountAction, actionTarget);
    return;
  }

	  const reportTemplateTarget = event.target.closest("[data-report-template]");
	  if (reportTemplateTarget && accountState.data) {
    const template = selectedReportTemplate(reportTemplateTarget.dataset.reportTemplate);
    accountState.data.reports = accountState.data.reports || {};
    accountState.data.reports.template = template.key;
    renderReports(accountState.data);
    setAccountOperation(`${template.label} selected locally.`);
	    return;
	  }

  const workspaceSwitchTarget = event.target.closest("[data-workspace-switch-select]");
  if (workspaceSwitchTarget && accountState.data) {
    const workspaceId = workspaceSwitchTarget.dataset.workspaceSwitchSelect || "";
    if (!workspaceId || workspaceId === accountState.selectedWorkspaceId) return;
    await postAccountAction("/api/account/workspaces/select", { workspaceId });
    hideAccountDialog();
    setAccountOperation("Workspace switched.");
    return;
  }

  const workspaceActionDetailTarget = event.target.closest("[data-workspace-action-detail]");
  if (workspaceActionDetailTarget && accountState.data) {
    showWorkspaceActionDetail();
    return;
  }

	  const supportPanelCreate = event.target.closest("[data-support-panel-create]");
  if (supportPanelCreate && accountState.data) {
    await handleAccountAction("create-support-ticket", supportPanelCreate);
    return;
  }

  const supportPanelView = event.target.closest("[data-support-panel-view]");
  if (supportPanelView && accountState.data) {
    hideAccountDialog();
    setAccountView("help", "Support tickets opened.");
    return;
  }

  const blogActionTarget = event.target.closest("[data-blog-action]");
  const blogMenuActionTarget = event.target.closest("[data-blog-menu-action]");

  if (isReadOnlyDynamicControl(event)) {
    setAccountOperation("This workspace is read-only for your role.", true);
    return;
  }

  if (blogActionTarget && accountState.data) {
    await handleBlogAction(blogActionTarget.dataset.blogAction, blogActionTarget.dataset.blogPostId);
    return;
  }

  if (blogMenuActionTarget && accountState.data) {
    await handleBlogAction(blogMenuActionTarget.dataset.blogMenuAction, blogMenuActionTarget.dataset.blogPostId);
    return;
  }

  const reportShareCopy = event.target.closest("[data-report-share-copy]");
  if (reportShareCopy) {
    const reportPath = normalizeLocalReportPath(reportShareCopy.dataset.reportShareCopy);
    if (reportPath) {
      const copied = await copyTextToClipboard(reportPath);
      setAccountOperation(copied ? "Reports share link copied." : "Reports share link could not be copied.", !copied);
    } else {
      setAccountOperation("Reports share link is unavailable.", true);
    }
    return;
  }

  const inviteLinkCopy = event.target.closest("[data-invite-link-copy]");
  if (inviteLinkCopy) {
    const inviteUrl = normalizeLocalInviteUrl(inviteLinkCopy.dataset.inviteLinkCopy || accountState.lastInviteUrl);
    if (inviteUrl) {
      const copied = await copyTextToClipboard(inviteUrl);
      setAccountOperation(copied ? "Invite link copied." : "Invite link could not be copied.", !copied);
    } else {
      setAccountOperation("Invite link is unavailable.", true);
    }
    return;
  }

  const invoiceDetail = event.target.closest("[data-invoice-detail]");
  if (invoiceDetail && accountState.data) {
    const invoiceId = invoiceDetail.dataset.invoiceDetail;
    await openInvoiceDetails(invoiceId);
    return;
  }

  const billingActionDetail = event.target.closest("[data-billing-action-detail]");
  if (billingActionDetail && accountState.data) {
    showBillingActionDetail();
    return;
  }

  const searchRowDetail = event.target.closest("[data-search-row-detail]");
  if (searchRowDetail && accountState.data) {
    showSearchRowDetail(searchRowDetail.dataset);
    return;
  }

  const rankingDetail = event.target.closest("[data-ranking-detail]");
  if (rankingDetail && accountState.data) {
    showRankingDetail(rankingDetail.dataset.rankingDetail);
    return;
  }

  const mentionDetail = event.target.closest("[data-mention-detail]");
  if (mentionDetail && accountState.data) {
    showMentionDetail(mentionDetail.dataset.mentionDetail);
    return;
  }

  const reportDetail = event.target.closest("[data-report-detail]");
  if (reportDetail && accountState.data) {
    showReportRowDetail(reportDetail.dataset.reportDetail);
    return;
  }

  const reportActionDetail = event.target.closest("[data-report-action-detail]");
  if (reportActionDetail && accountState.data) {
    showReportActionDetail();
    return;
  }

  const seoDetail = event.target.closest("[data-seo-detail]");
  if (seoDetail && accountState.data) {
    showSeoDetail(seoDetail.dataset.seoDetail);
    return;
  }

  const blogSelectAll = event.target.closest("[data-blog-select-all]");
  if (blogSelectAll && accountState.data) {
    const items = accountState.data.contentPlan?.items || [];
    const activeFilter = accountState.blogStatusFilter || "all";
    const visible = activeFilter === "all" ? items : items.filter((item) => (item.status || "scheduled") === activeFilter);
    const allSelected = visible.length && visible.every((item) => accountState.selectedBlogIds.has(item.id));
    visible.forEach((item) => {
      if (allSelected) {
        accountState.selectedBlogIds.delete(item.id);
      } else {
        accountState.selectedBlogIds.add(item.id);
      }
    });
    renderContentPlan(accountState.data);
    return;
  }

  const blogSelect = event.target.closest("[data-blog-select]");
  if (blogSelect && accountState.data) {
    const itemId = blogSelect.dataset.blogSelect;
    if (blogSelect.checked) {
      accountState.selectedBlogIds.add(itemId);
    } else {
      accountState.selectedBlogIds.delete(itemId);
    }
    renderContentPlan(accountState.data);
    return;
  }

  const keywordRemove = event.target.closest("[data-keyword-remove]");
  if (keywordRemove && accountState.data) {
    const payload = getSettingsPayload();
    payload.site.keywords = (payload.site.keywords || []).filter((keyword) => keyword !== keywordRemove.dataset.keywordRemove);
    const response = await requestJson("/api/account/settings", { method: "PUT", body: JSON.stringify(payload) });
    if (response.account) accountState.data = response.account;
    else accountState.data.settings = response.settings;
    renderAccountData();
    setAccountOperation("Keyword removed.");
    return;
  }

  const topicSelectAll = event.target.closest("[data-topic-select-all]");
  if (topicSelectAll && accountState.data) {
    const visible = visibleTopics(accountState.data);
    const allSelected = visible.length && visible.every((topic) => accountState.selectedTopicIds.has(topic.id));
    visible.forEach((topic) => {
      if (allSelected) {
        accountState.selectedTopicIds.delete(topic.id);
      } else {
        accountState.selectedTopicIds.add(topic.id);
      }
    });
    renderTopics(accountState.data);
    return;
  }

  const topicSelect = event.target.closest("[data-topic-select]");
  if (topicSelect && accountState.data) {
    const topicId = topicSelect.dataset.topicSelect;
    if (topicSelect.checked) {
      accountState.selectedTopicIds.add(topicId);
    } else {
      accountState.selectedTopicIds.delete(topicId);
    }
    renderTopics(accountState.data);
    return;
  }

  const topicDetail = event.target.closest("[data-topic-detail]");
  if (topicDetail && accountState.data) {
    showTopicDetail(topicDetail.dataset.topicDetail);
    return;
  }

  const topicEdit = event.target.closest("[data-topic-edit]");
  if (topicEdit && accountState.data) {
    const topicId = topicEdit.dataset.topicEdit;
    const persistedTopic = accountState.data.topics.find((candidate) => candidate.id === topicId);
    const transientTopic = accountState.topicSearchResults?.find((candidate) => candidate.id === topicId);
    const topic = persistedTopic || transientTopic;
    if (!topic) return;
    showAccountForm({
      title: "Edit topic",
      body: "Update the topic idea before adding it to the content plan.",
      submitText: "Save topic",
      fields: [
        { name: "title", label: "Topic title", value: topic.title, required: true },
        { name: "keyword", label: "Keyword", value: topic.keyword || topic.title },
        { name: "volume", label: "Search volume", type: "number", value: topic.volume || 0 },
        { name: "cpc", label: "CPC", type: "number", value: topic.cpc || 0, min: 0, step: 0.01 },
        { name: "difficultyScore", label: "Difficulty score", type: "number", value: getTopicDifficultyScore(topic), min: 0, max: 100, step: 1 },
        { name: "difficulty", label: "Difficulty", type: "select", value: topic.difficulty || "Needs review", options: topicDifficultyOptions },
        { name: "competition", label: "Competition", type: "number", value: topic.competition || 0, min: 0, max: 1, step: 0.01 },
        { name: "added", label: "Plan status", type: "select", value: topic.added ? "added" : "not-added", options: ["not-added", "added"] },
      ],
      onSubmit: async (values) => {
        if (!persistedTopic && transientTopic) {
          accountState.topicSearchResults = (accountState.topicSearchResults || []).map((candidate) =>
            candidate.id === topic.id ? { ...candidate, ...values, volume: Number(values.volume || 0), added: values.added === "added" } : candidate
          );
          renderTopics(accountState.data, accountState.topicSearchResults);
          setAccountOperation("Search result updated.");
          return;
        }
        const payload = await requestJson(`/api/account/topics/${topic.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...topic, ...values, added: values.added === "added" }),
        });
        if (payload.account) accountState.data = payload.account;
        else accountState.data.topics = payload.topics;
        accountState.topicSearchResults = null;
        renderAccountData();
        setAccountOperation("Topic updated.");
      },
    });
    return;
  }

  const topicAdd = event.target.closest("[data-topic-add]");
  if (topicAdd && accountState.data) {
    await addTopicToPlan(topicAdd.dataset.topicAdd);
    return;
  }

  const topicDelete = event.target.closest("[data-topic-delete]");
  if (topicDelete && accountState.data) {
    const topicId = topicDelete.dataset.topicDelete;
    const transientTopic = accountState.topicSearchResults?.find((topic) => topic.id === topicId);
    showConfirmDialog("Delete topic", "This removes the topic idea from the local account store. Scheduled articles already created from it stay on the content plan.", "Delete topic", async () => {
      if (transientTopic && !accountState.data.topics.some((topic) => topic.id === topicId)) {
        accountState.topicSearchResults = (accountState.topicSearchResults || []).filter((topic) => topic.id !== topicId);
        accountState.selectedTopicIds.delete(topicId);
        renderTopics(accountState.data, accountState.topicSearchResults);
        setAccountOperation("Search result removed.");
        return;
      }
      const payload = await requestJson(`/api/account/topics/${topicId}`, { method: "DELETE" });
      if (payload.account) accountState.data = payload.account;
      else accountState.data.topics = payload.topics;
      accountState.topicSearchResults = null;
      renderAccountData();
      setAccountOperation("Topic deleted.");
    });
    return;
  }

  const planCard = event.target.closest("[data-plan-item-id]");
  if (planCard && accountState.data) {
    const item = accountState.data.contentPlan.items.find((candidate) => candidate.id === planCard.dataset.planItemId);
    if (!item) return;
    await openBlogPostPreview(item.id);
    return;
  }

  const ctaDetail = event.target.closest("[data-cta-detail]");
  if (ctaDetail && accountState.data) {
    showCtaDetail();
    return;
  }

  const articleGenerationDetail = event.target.closest("[data-article-generation-detail]");
  if (articleGenerationDetail && accountState.data) {
    showArticleGenerationDetail();
    return;
  }

  const articleLifecycleDetail = event.target.closest("[data-article-lifecycle-detail]");
  if (articleLifecycleDetail && accountState.data) {
    await showArticleLifecycleDetail(articleLifecycleDetail.dataset.articleLifecycleDetail);
    return;
  }

  const cmsProviderDetail = event.target.closest("[data-cms-provider-detail]");
  if (cmsProviderDetail && accountState.data) {
    showCmsProviderDetail();
    return;
  }

  const imageOutputDetail = event.target.closest("[data-image-output-detail]");
  if (imageOutputDetail && accountState.data) {
    showImageOutputDetail("latest");
    return;
  }

  const imageHistoryDetail = event.target.closest("[data-image-history-detail]");
  if (imageHistoryDetail && accountState.data) {
    showImageOutputDetail("history", imageHistoryDetail.dataset.imageHistoryDetail);
    return;
  }

  const imageProviderDetail = event.target.closest("[data-image-provider-detail]");
  if (imageProviderDetail && accountState.data) {
    showImageProviderDetail();
    return;
  }

  const inventoryFeedDetail = event.target.closest("[data-inventory-feed-detail]");
  if (inventoryFeedDetail && accountState.data) {
    showInventoryFeedDetail();
    return;
  }

  const productDetail = event.target.closest("[data-product-detail]");
  if (productDetail && accountState.data) {
    showProductDetail(productDetail.dataset.productDetail);
    return;
  }

  const productEdit = event.target.closest("[data-product-edit]");
  if (productEdit && accountState.data) {
    const product = findProductById(productEdit.dataset.productEdit);
    if (!product) return;
    showProductForm(product);
    return;
  }

  const productToggle = event.target.closest("[data-product-toggle]");
  if (productToggle && accountState.data) {
    const product = findProductById(productToggle.dataset.productToggle);
    if (!product) return;
    const payload = await requestJson(`/api/account/products/${product.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...product, hidden: !product.hidden }),
    });
    if (payload.account) accountState.data = payload.account;
    else accountState.data.products = payload.products;
    renderAccountData();
    setAccountOperation(product.hidden ? "Product shown." : "Product hidden.");
    return;
  }

  const productDelete = event.target.closest("[data-product-delete]");
  if (productDelete && accountState.data) {
    showConfirmDialog("Delete product", "This removes the product from the local account store.", "Delete product", async () => {
      const payload = await requestJson(`/api/account/products/${productDelete.dataset.productDelete}`, { method: "DELETE" });
      if (payload.account) accountState.data = payload.account;
      else accountState.data.products = payload.products;
      renderAccountData();
      setAccountOperation("Product deleted.");
    });
    return;
  }

  const locationDetail = event.target.closest("[data-location-detail]");
  if (locationDetail && accountState.data) {
    showLocationDetail(locationDetail.dataset.locationDetail);
    return;
  }

  const locationEdit = event.target.closest("[data-location-edit]");
  if (locationEdit && accountState.data) {
    const location = findLocationById(locationEdit.dataset.locationEdit);
    if (!location) return;
    showLocationForm(location);
    return;
  }

  const locationDelete = event.target.closest("[data-location-delete]");
  if (locationDelete && accountState.data) {
    showConfirmDialog("Delete location", "This removes the location from the local account store.", "Delete location", async () => {
      const payload = await requestJson(`/api/account/locations/${locationDelete.dataset.locationDelete}`, { method: "DELETE" });
      if (payload.account) accountState.data = payload.account;
      else accountState.data.locations = payload.locations;
      renderAccountData();
      setAccountOperation("Location deleted.");
    });
    return;
  }

  const pageGeneratorTarget = event.target.closest("[data-page-generator-location]");
  const pageGeneratorAction = event.target.closest("[data-page-generator-action]");
  if (pageGeneratorTarget && pageGeneratorAction && accountState.data) {
    const location = findLocationById(pageGeneratorTarget.dataset.pageGeneratorLocation);
    if (pageGeneratorAction.dataset.pageGeneratorAction === "open-location") {
      if (location) showLocationDetail(location.id);
      else setSettingsView("locations");
      return;
    }
    if (pageGeneratorAction.dataset.pageGeneratorAction === "open-builder") {
      const title = pageGeneratorAction.dataset.pageGeneratorTitle || "Local landing page";
      const keyword = pageGeneratorAction.dataset.pageGeneratorKeyword || title;
      const cityState = location ? [location.city, location.state].filter(Boolean).join(", ") : "";
      const serviceArea = location?.serviceArea || cityState || "the target service area";
      accountState.data.writeDraft = {
        title,
        slug: pageSlug(keyword || title),
        keyword,
        template: "local",
        audience: accountState.data.settings?.site?.targetAudience || "Local customers",
        wordCount: 1200,
        difficulty: "Needs review",
        brief: `Draft a local landing page for ${serviceArea}. Use the saved business location facts, products, CTA, and CMS rules. Keep the page fact-based, location-specific, and ready for human review before publishing.`,
        notes: "Seeded from the local Pages generator.",
        status: "draft",
      };
      renderWriteDraft(accountState.data);
      setAccountView("write");
      setAccountOperation("Page target opened in Article Builder.");
      return;
    }
  }

  const inviteDetailTarget = event.target.closest("[data-invite-detail]");
  if (inviteDetailTarget && accountState.data) {
    showInviteDetail(inviteDetailTarget.dataset.inviteDetail);
    return;
  }

  const inviteCopy = event.target.closest("[data-invite-copy]");
  if (inviteCopy && accountState.data) {
    const invite = findInviteById(inviteCopy.dataset.inviteCopy);
    const inviteUrl = normalizeLocalInviteUrl(invite?.link);
    if (inviteUrl) {
      const copied = await copyTextToClipboard(inviteUrl);
      setAccountOperation(copied ? "Invite link copied." : "Invite link could not be copied.", !copied);
    } else {
      setAccountOperation("Invite link is unavailable.", true);
    }
    return;
  }

  const inviteDelete = event.target.closest("[data-invite-delete]");
  if (inviteDelete && accountState.data) {
    const payload = await requestJson(`/api/account/invites/${inviteDelete.dataset.inviteDelete}`, { method: "DELETE" });
    if (payload.account) {
      accountState.data = payload.account;
      renderAccountData();
    } else {
      accountState.data.invites = payload.invites;
      renderInvites(accountState.data);
      renderTeamActivity(accountState.data);
    }
    setAccountOperation("Invite revoked.");
    return;
  }

  const memberDetailTarget = event.target.closest("[data-member-detail]");
  if (memberDetailTarget && accountState.data) {
    showMemberDetail(memberDetailTarget.dataset.memberDetail);
    return;
  }

  const teamActivityDetailTarget = event.target.closest("[data-team-activity-detail]");
  if (teamActivityDetailTarget && accountState.data) {
    showTeamActivityDetail(teamActivityDetailTarget.dataset.teamActivityDetail);
    return;
  }

  const memberRole = event.target.closest("[data-member-role]");
  if (memberRole && accountState.data) {
    const payload = await requestJson(`/api/account/members/${memberRole.dataset.memberRole}`, {
      method: "PUT",
      body: JSON.stringify({ role: memberRole.dataset.memberNextRole || "member" }),
    });
    if (payload.account) {
      accountState.data = payload.account;
      renderAccountData();
    } else {
      accountState.data.members = payload.members;
      renderMembers(accountState.data);
      renderTeamActivity(accountState.data);
    }
    setAccountOperation(`Member role updated to ${memberRole.dataset.memberNextRole || "member"}.`);
    return;
  }

  const memberDelete = event.target.closest("[data-member-delete]");
  if (memberDelete && accountState.data) {
    showConfirmDialog("Remove member", "This removes the accepted team member from the local account store.", "Remove member", async () => {
      const payload = await requestJson(`/api/account/members/${memberDelete.dataset.memberDelete}`, { method: "DELETE" });
      if (payload.account) {
        accountState.data = payload.account;
        renderAccountData();
      } else {
        accountState.data.members = payload.members;
        renderMembers(accountState.data);
        renderTeamActivity(accountState.data);
      }
      setAccountOperation("Member removed.");
    });
    return;
  }

  const supportDetail = event.target.closest("[data-support-detail]");
  if (supportDetail && accountState.data) {
    showSupportTicketDetail(supportDetail.dataset.supportDetail);
    return;
  }

  const supportStatus = event.target.closest("[data-support-status]");
  if (supportStatus && accountState.data) {
    const payload = await requestJson(`/api/account/support/${supportStatus.dataset.supportStatus}`, {
      method: "PUT",
      body: JSON.stringify({ status: supportStatus.dataset.supportNextStatus || "resolved" }),
    });
    if (payload.account) {
      accountState.data = payload.account;
      renderAccountData();
    } else {
      accountState.data.supportTickets = payload.supportTickets;
      renderSupport(accountState.data);
    }
    setAccountOperation(supportStatus.dataset.supportNextStatus === "open" ? "Support ticket reopened." : "Support ticket resolved.");
    return;
  }

  const supportReply = event.target.closest("[data-support-reply]");
  if (supportReply && accountState.data) {
    const ticket = findSupportTicketById(supportReply.dataset.supportReply);
    if (!ticket) return;
    showSupportReplyForm(ticket);
    return;
  }
}

document.addEventListener("click", async (event) => {
  try {
    await handleDynamicAccountClick(event);
  } catch (error) {
    setAccountOperation(error.message, true);
  }
});

logoutButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const wasAccountRoute = resolveRoute(window.location.pathname) === "account";
    const next = `${window.location.pathname}${window.location.search || ""}`;
    try {
      await requestJson("/api/auth/logout", { method: "POST", body: "{}" });
    } finally {
      authState.user = null;
      renderAuthState();
      setAuthMessage("Signed out.");

      if (wasAccountRoute) {
        window.history.pushState({}, "", `/login?next=${encodeURIComponent(next)}`);
        renderRoute();
      }
    }
  });
});

document.addEventListener("click", (event) => {
  if (accountCreateMenu && !accountCreateMenu.hidden && !accountCreateMenu.contains(event.target) && !accountCreateToggle?.contains(event.target)) {
    setAccountCreateMenuOpen(false);
  }
  if (contentToolsMenu && !contentToolsMenu.hidden && !contentToolsMenu.contains(event.target) && !contentToolsToggle?.contains(event.target)) {
    setContentToolsMenuOpen(false);
  }
  if (!dropdown || dropdown.contains(event.target)) return;
  closeDropdown();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (accountCreateMenu && !accountCreateMenu.hidden) {
    setAccountCreateMenuOpen(false);
    return;
  }
  if (contentToolsMenu && !contentToolsMenu.hidden) {
    setContentToolsMenuOpen(false);
    return;
  }
  if (accountDialog && !accountDialog.hidden) {
    hideAccountDialog();
    return;
  }
  closeDropdown();
});

window.addEventListener("popstate", () => {
  renderRoute();
});

window.addEventListener("beforeunload", (event) => {
  if (!accountState.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

initFaqAccordions();
initAuth();
