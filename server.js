const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 5187);
const host = process.env.HOST || "127.0.0.1";

const googleClientId = process.env.SIR_BLOGGS_GOOGLE_CLIENT_ID || "";
const authSessionSecret = process.env.SIR_BLOGGS_AUTH_SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const authStorePath = process.env.SIR_BLOGGS_AUTH_STORE_PATH || path.join(root, "data", "auth-store.json");
const accountStorePath = process.env.SIR_BLOGGS_ACCOUNT_STORE_PATH || path.join(root, "data", "account-store.json");
function configuredPublicOwnerEmail() {
  return normalizeEmail(process.env.SIR_BLOGGS_PUBLIC_OWNER_EMAIL || "");
}

function configuredPublicAccountId() {
  return String(process.env.SIR_BLOGGS_PUBLIC_ACCOUNT_ID || "").trim();
}
const authAdminEmails = (process.env.SIR_BLOGGS_AUTH_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const googleAllowedDomains = (process.env.SIR_BLOGGS_GOOGLE_ALLOWED_DOMAINS || "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const authCookieName = "sirbloggs_session";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;
const googleJwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
const googleTokenIssuers = new Set(["accounts.google.com", "https://accounts.google.com"]);
const maxBodyBytes = 64 * 1024;
const maxJwksBytes = 128 * 1024;
const allowedAccountViews = new Set(["plan", "write", "topics", "rankings", "search", "mentions", "reports", "seo-analysis", "settings", "pages", "getting-started", "billing", "help"]);
const allowedSettingsTabs = new Set(["site", "products", "images", "cms", "locations", "cta", "invite"]);
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
const allowedBillingPlans = new Set(["Pro", "Pro+"]);
const allowedBillingPeriods = new Set(["monthly", "annual"]);
const allowedBillingStatuses = new Set(["trial", "active", "cancelled", "past_due"]);
const allowedInvoiceStatuses = new Set(["local", "paid", "open", "failed", "refunded"]);
const allowedSupportTicketStatuses = new Set(["open", "resolved"]);
const allowedSupportPriorities = new Set(["low", "normal", "high", "urgent"]);
const allowedContentStatuses = new Set(["scheduled", "draft", "processing", "published", "failed", "paused"]);
const allowedSiteLanguages = new Set(["English", "Spanish", "French", "German", "Portuguese"]);
const allowedPublishingCadences = new Set(["Daily", "3 per week", "Weekly", "Manual approval only"]);
const allowedSiteTimezones = new Set(["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "UTC"]);
const allowedImageStylePresets = new Set(["editorial", "product", "local", "technical"]);
const allowedImageAspectRatios = new Set(["16:9", "4:3", "1:1", "3:4"]);
const allowedImageCadences = new Set(["featured-only", "key-sections", "every-section", "none"]);
const allowedCmsPlatforms = new Set(["WordPress", "Webflow", "Shopify", "Wix", "Ghost", "Custom API"]);
const allowedCmsStatuses = new Set(["disconnected", "draft-first", "connected"]);
const allowedCtaPlacements = new Set(["end", "start", "inline", "sidebar"]);
const allowedCtaStyles = new Set(["button", "banner", "text-link"]);
const allowedInviteRoles = new Set(["member", "editor", "admin"]);
const allowedInviteStatuses = new Set(["pending", "accepted", "revoked"]);
const allowedMemberRoles = new Set(["owner", "member", "editor", "admin"]);
const mutableWorkspaceRoles = new Set(["owner", "editor", "admin"]);
const allowedSupportCategories = new Set(["Setup", "Publishing", "Billing", "Account access", "Bug"]);
const allowedReportCadences = new Set(["weekly", "monthly"]);
const allowedReportTemplates = new Set(["performance", "inventory", "executive"]);
const allowedSearchConsoleRanges = new Set(["7", "28", "90"]);
const allowedInventoryFeedStatuses = new Set(["disconnected", "connected"]);
const allowedTopicDifficulties = new Set(["Easy", "Easy to rank", "Medium", "Hard", "Needs review", "Needs research"]);
const allowedWriteTemplates = new Set(["how-to", "comparison", "listicle", "local"]);
const allowedWriteStatuses = new Set(["draft", "queued", "previewed"]);
const allowedWritePreviewStatuses = new Set(["provider-pending", "ready", "error"]);
const allowedWritePreviewSources = new Set(["local-brief", "provider"]);
const topicDifficultyScores = {
  Easy: 24,
  "Easy to rank": 22,
  Medium: 48,
  Hard: 72,
  "Needs review": 50,
  "Needs research": 58,
};

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

const reportTemplateCatalog = {
  performance: {
    key: "performance",
    label: "Performance summary",
    description: "Content, traffic, rankings, and AI mentions for weekly review.",
  },
  inventory: {
    key: "inventory",
    label: "Content inventory",
    description: "Article status, keywords, public URLs, and publishing readiness.",
  },
  executive: {
    key: "executive",
    label: "Executive digest",
    description: "A concise monthly stakeholder summary with top local signals.",
  },
};

let googleJwksCache = {
  expiresAt: 0,
  keys: [],
};

const types = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, data, headers = {}) {
  send(
    res,
    status,
    {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    JSON.stringify(data)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeUrlPathComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw authError("Malformed URL path.", 400);
  }
}

function safeFile(urlPath) {
  const decoded = decodeUrlPathComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return path.join(root, normalized === "/" ? "/index.html" : normalized);
}

const appShellRoutes = new Set(["/", "/features", "/pricing", "/login", "/signup", "/success", "/affiliate", "/changelog", "/case-studies", "/privacy", "/terms", "/account"]);
const appShellCaseStudySlugs = new Set(["natureva", "foodbuddy", "kush-groove"]);

function isKnownAppShellPath(pathname) {
  if (appShellRoutes.has(pathname)) return true;
  const caseStudyMatch = pathname.match(/^\/case-studies\/([^/]+)$/);
  if (caseStudyMatch) return appShellCaseStudySlugs.has(caseStudyMatch[1]);
  try {
    return /^\/invite\/[^/]+$/.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

function displayNameForUser(user) {
  return normalizeText(user?.name || user?.email, "Account");
}

function renderAuthenticatedHomeHtml(html) {
  return html
    .replace(
      "Feed the AI across ChatGPT, Google AI, Claude, Perplexity &amp; Gemini",
      "AI SEO content built around your brand"
    )
    .replace(
      `<h1>
            <span>Feed the AI.</span>
            <span class="gradient-text">Get cited.</span>
          </h1>`,
      `<h1>
            <span>SEO content built</span>
            <span class="gradient-text">around your brand,</span>
            <span>not just a keyword.</span>
          </h1>`
    )
    .replace(
      `Connect your site. Tell us your industry. Sir Bloggsalot starts publishing
            the content AI tools quote, so your business becomes the source they cite.`,
      `Sir Bloggsalot writes SEO articles using your site, services, locations, tone, and internal links,
            then humanizes the output so it never reads like a ChatGPT draft. Every post lands as a draft
            you can preview before it publishes.`
    )
    .replace(
      `<p class="hero-proof-points"><span>Preview before publishing</span><span>5-minute setup</span><span>Cancel anytime</span><span>Full refund within 30 days</span></p>`,
      `<p>3-day free trial, then <a href="#pricing">from $49/mo</a>. Preview every post before it publishes.</p>`
    );
}

function personalizeAppShellHtml(html, user) {
  if (!user) return html;
  const displayName = escapeHtml(displayNameForUser(user));

  return html
    .replace(
      '<span class="auth-status" data-auth-status aria-live="polite"></span>',
      `<span class="auth-status" data-auth-status aria-live="polite">${escapeHtml(user.email)}</span>`
    )
    .replace(
      '<a class="login-link" href="/login" data-route="login" data-auth-login>Log in</a>',
      '<a class="login-link" href="/login" data-route="login" data-auth-login hidden>Log in</a>'
    )
    .replace(
      '<a class="button button-outline" href="/signup" data-route="signup" data-auth-signup>Sign up</a>',
      '<a class="button button-outline" href="/signup" data-route="signup" data-auth-signup hidden>Sign up</a>'
    )
    .replace(
      '<a class="login-link" href="/account?view=plan" data-route="account" data-auth-account hidden>Account</a>',
      `<a class="login-link" href="/account?view=plan" data-route="account" data-auth-account>${displayName}</a>`
    )
    .replace(
      '<button class="auth-logout" type="button" data-auth-logout hidden>Log out</button>',
      '<button class="auth-logout" type="button" data-auth-logout>Log out</button>'
    )
    .replace(/<a\b([^>]*\bdata-auth-trial\b[^>]*)>[\s\S]*?<\/a>/g, (_match, attrs) => {
      const signedInAttrs = attrs
        .replace(/\sdata-auth-trial(?:-[a-z-]+)?(?:="[^"]*")?/g, "")
        .replace(/\shref="\/signup"/, ' href="/account?view=billing"');
      return `<a${signedInAttrs}>Open billing</a>`;
    });
}

function authError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function parseJwtPart(value) {
  return JSON.parse(decodeBase64Url(value).toString("utf8"));
}

function signSessionId(sessionId) {
  return crypto.createHmac("sha256", authSessionSecret).update(sessionId).digest("base64url");
}

function encodeSessionCookie(sessionId) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

function decodeSessionCookie(value) {
  const [sessionId, signature] = String(value || "").split(".", 2);

  if (!sessionId || !signature) {
    return "";
  }

  const expected = signSessionId(sessionId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return "";
  }

  return sessionId;
}

function parseCookies(header) {
  const cookies = {};
  String(header || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .forEach((cookie) => {
      const index = cookie.indexOf("=");
      try {
        const name = index === -1 ? decodeURIComponent(cookie) : decodeURIComponent(cookie.slice(0, index));
        const value = index === -1 ? "" : decodeURIComponent(cookie.slice(index + 1));
        if (name) cookies[name] = value;
      } catch {}
    });
  return cookies;
}

function safeAuthNextPath(value) {
  const next = String(value || "").trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "";

  try {
    const url = new URL(next, "http://localhost");
    const dashboardAlias = canonicalDashboardRoute(url);
    if (dashboardAlias) return dashboardAlias;
    const decodedPathname = decodeURIComponent(url.pathname);
    const isSafeAccount = decodedPathname === "/account";
    const isSafeInvite = /^\/invite\/[^/]+$/.test(decodedPathname);
    if (!isSafeAccount && !isSafeInvite) return "";
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

function canonicalDashboardRoute(url) {
  const canonical = dashboardRouteAliases.get(url.pathname);
  if (!canonical) return "";
  if (!billingDashboardAliases.has(url.pathname) || !url.search) return canonical;

  const outputParams = new URLSearchParams(canonical.split("?")[1] || "");
  billingAliasParams.forEach((key) => {
    if (url.searchParams.has(key)) outputParams.set(key, url.searchParams.get(key));
  });
  return `/account?${outputParams.toString()}`;
}

function cookieHeader(request, value, maxAge) {
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `${authCookieName}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: user.role,
  };
}

function normalizeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeEnum(value, allowedValues, { label = "Value", fallback = "" } = {}) {
  const text = normalizeText(value, fallback);
  if (!text) return "";
  if (!allowedValues.has(text)) throw authError(`${label} is not supported.`, 400);
  return text;
}

function normalizeOptionalWebUrl(value, label) {
  const text = normalizeText(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // Surface the validation error below.
  }

  throw authError(`${label} must be a valid http or https URL.`, 400);
}

function normalizeNumber(value, { label, fallback = 0, min = -Infinity, max = Infinity } = {}) {
  const raw = value === undefined || value === null || value === "" ? fallback : value;
  const number = Number(raw);
  if (!Number.isFinite(number)) throw authError(`${label || "Value"} must be a valid number.`, 400);
  if (number < min || number > max) throw authError(`${label || "Value"} must be between ${min} and ${max}.`, 400);
  return number;
}

function normalizeIsoDate(value, { label = "Date", fallback = "" } = {}) {
  const text = normalizeText(value, fallback);
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw authError(`${label} must use YYYY-MM-DD format.`, 400);

  const date = new Date(`${text}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw authError(`${label} must be a real calendar date.`, 400);
  }

  return text;
}

function normalizeTime(value, { label = "Time", fallback = "" } = {}) {
  const text = normalizeText(value, fallback);
  if (!text) return "";
  if (!/^\d{2}:\d{2}$/.test(text)) throw authError(`${label} must use HH:MM format.`, 400);

  const [hours, minutes] = text.split(":").map(Number);
  if (hours > 23 || minutes > 59) throw authError(`${label} must be a real time.`, 400);

  return text;
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function normalizeEmailRecipients(value, fallback = []) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(/[\n,]/)
    : [];
  const recipients = raw.map((item) => normalizeEmail(item)).filter(Boolean);
  const invalid = recipients.find((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (invalid) throw authError("Report recipients must be valid email addresses.", 400);
  const unique = Array.from(new Set(recipients));
  return unique.length ? unique : fallback.map((item) => normalizeEmail(item)).filter(Boolean);
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function slugify(value, fallback = "article") {
  return (
    normalizeText(value, fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

function defaultAccount(user) {
  const now = new Date().toISOString();
  return {
    id: user.id,
    ownerEmail: normalizeEmail(user.email),
    workspaceName: normalizeEmail(user.email).split("@")[0] || "sirbloggsalot",
    createdAt: now,
    updatedAt: now,
    ui: {
      activeView: "plan",
      activeSettingsTab: "site",
      calendarMode: "grid",
    },
    settings: {
      site: {
        productDescription:
          "Sir Bloggsalot publishes brand-aware articles that help companies get found across search, answer engines, and their own blog. It uses services, locations, tone, products, and internal links to produce draft-first SEO content.",
        targetAudience:
          "Local small business owners, ecommerce entrepreneurs, real estate agents, local restaurants and cafes, and service businesses that need consistent search visibility.",
        brandVoice: "Direct, practical, and confident without sounding generic.",
        competitors: "",
        language: "English",
        publishingCadence: "3 per week",
        timezone: "America/Los_Angeles",
        defaultPublishTime: "09:00",
        keywords: [],
        keywordDraft: "",
        keywordMix: 45,
      },
      images: {
        includeImages: true,
        useProductImages: false,
        stylePreset: "editorial",
        aspectRatio: "16:9",
        imageCadence: "featured-only",
        visualStyle: "",
        useCustomGuidelines: false,
        guidelines: "Create specific, meaningful visuals. Avoid generic icons, fake dashboards, unreadable text, and stock-photo cliches.",
        samplePrompt: "",
        samplePreview: {},
        lastTestedAt: "",
        promptHistory: [],
      },
      cms: {
        websiteUrl: "https://sirbloggsalot.com",
        platform: "",
        status: "disconnected",
        draftFirst: true,
        hasCredentials: false,
        username: "",
        blogTarget: "",
        collectionName: "",
        lastTestedAt: "",
        lastConnectedAt: "",
        lastError: "",
      },
      cta: {
        enabled: false,
        label: "",
        text: "",
        url: "",
        placement: "end",
        style: "button",
        openInNewTab: true,
        trackingLabel: "",
      },
    },
    contentPlan: {
      updatedAt: now,
      strategy:
        "16 from your keyword research topics. Picked as topics your site can realistically rank for and spaced 3 per week.",
      items: [
        {
          id: "plan_canva_builder",
          title: "Canva Website Builder vs Other Options for Small Businesses",
          keyword: "canva website builder",
          volume: 8100,
          difficulty: "Easy to rank",
          estimatedVisits: 891,
          scheduledDate: "2026-08-08",
          status: "scheduled",
        },
        {
          id: "plan_local_agencies",
          title: "Best Local Web Design Agencies for Small Businesses",
          keyword: "local web design agency",
          volume: 720,
          difficulty: "Easy to rank",
          estimatedVisits: 79,
          scheduledDate: "2026-08-12",
          status: "scheduled",
        },
        {
          id: "plan_pricing_guide",
          title: "Web Design for Small Business: Pricing Guide",
          keyword: "small business web design pricing",
          volume: 1300,
          difficulty: "Easy to rank",
          estimatedVisits: 143,
          scheduledDate: "2026-08-10",
          status: "draft",
        },
        {
          id: "plan_oc_checklist",
          title: "Orange County Website Design Checklist",
          keyword: "orange county website design",
          volume: 900,
          difficulty: "Medium",
          estimatedVisits: 99,
          scheduledDate: "2026-08-14",
          status: "scheduled",
        },
        {
          id: "plan_marketing_help",
          title: "Business Marketing Guide for Choosing Help",
          keyword: "business marketing companies",
          volume: 1000,
          difficulty: "Easy to rank",
          estimatedVisits: 110,
          scheduledDate: "2026-08-19",
          status: "scheduled",
        },
        {
          id: "plan_sem_questions",
          title: "Search Engine Marketing Agency Questions",
          keyword: "sem agency near me",
          volume: 590,
          difficulty: "Medium",
          estimatedVisits: 65,
          scheduledDate: "2026-08-21",
          status: "scheduled",
        },
      ],
    },
    topics: [
      { id: "topic_ai_seo", title: "AI SEO for small business", keyword: "AI SEO for small business", volume: 1600, cpc: 2.35, difficultyScore: 24, difficulty: "Easy to rank", competition: 0.42, added: false },
      { id: "topic_content_calendar", title: "Local SEO content calendar", keyword: "local SEO content calendar", volume: 880, cpc: 1.85, difficultyScore: 28, difficulty: "Easy to rank", competition: 0.39, added: false },
      { id: "topic_copywriting", title: "Website copywriting for service businesses", keyword: "website copywriting for service businesses", volume: 720, cpc: 2.05, difficultyScore: 46, difficulty: "Medium", competition: 0.51, added: false },
    ],
    writeDraft: {
      title: "How local businesses can get cited by AI search",
      slug: "",
      keyword: "AI SEO for local business",
      category: "",
      excerpt: "",
      scheduledDate: "",
      scheduledTime: "",
      brief:
        "Use the business description, target audience, products, locations, CTA, and CMS settings to generate a draft-ready article brief.",
      template: "how-to",
      audience: "Local small business owners",
      wordCount: 1200,
      internalLinks: "",
      seoTitle: "",
      metaDescription: "",
      featuredImageUrl: "",
      featuredImageAlt: "",
      body: "",
      notes: "",
      preview: "",
      previewStatus: "",
      previewSource: "",
      previewedAt: "",
      sourcePostId: "",
      sourceStatus: "",
      status: "draft",
    },
    products: [],
    locations: [],
    inventoryFeed: {
      status: "disconnected",
      retailerName: "",
      accountId: "",
      hasCredentials: false,
      lastConnectedAt: "",
      lastSyncedAt: "",
      lastError: "",
    },
    invites: [],
    members: [],
    activityLog: [],
    supportTickets: [],
    billing: {
      plan: "Pro",
      status: "trial",
      trialEndsAt: "",
      price: "$49/mo annual",
      billingPeriod: "annual",
      paymentMethod: "",
      portalStatus: "not-connected",
      failedPayment: {
        reason: "",
        retryAt: "",
        recordedAt: "",
      },
      invoices: [],
    },
    searchConsole: {
      status: "disconnected",
      propertyUrl: "",
      lastSyncedAt: "",
      clicks: 0,
      impressions: 0,
      indexedPages: 0,
      dateRange: "28",
      trend: [],
      topQueries: [],
      topPages: [],
    },
    rankings: {
      gated: true,
      planRequired: "Pro+",
      keywords: [],
      updatedAt: "",
    },
    aiMentions: {
      gated: true,
      planRequired: "Pro+",
      mentions: [],
      updatedAt: "",
    },
    reports: {
      template: "performance",
      sharing: {
        shareUrl: "",
        shareCreatedAt: "",
      },
      schedule: {
        enabled: false,
        cadence: "weekly",
        template: "performance",
        recipients: [],
        lastScheduledAt: "",
      },
    },
  };
}

function normalizeAccount(account, user) {
  const fallback = defaultAccount(user);
  const normalizedBilling = normalizeStoredBilling(account?.billing || {}, fallback.billing);
  const inventoryFeed = normalizeStoredInventoryFeed(account?.inventoryFeed || {}, fallback.inventoryFeed);
  const blockedInventoryFeed = hasBlockedAccountCopy([
    account?.inventoryFeed?.retailerName,
    account?.inventoryFeed?.accountId,
    account?.inventoryFeed?.lastError,
  ].join(" "));
  const normalized = {
    ...fallback,
    ...account,
    id: user.id,
    ownerEmail: normalizeEmail(user.email),
    workspaceName: normalizeText(account?.workspaceName) || fallback.workspaceName,
    ui: normalizeStoredUi(account?.ui || {}, fallback.ui),
    settings: normalizeStoredSettings(account?.settings || {}, fallback.settings),
    contentPlan: normalizeStoredContentPlan(account?.contentPlan || {}, fallback.contentPlan),
    topics: normalizeStoredTopics(account?.topics || fallback.topics),
    products: (Array.isArray(account?.products) ? account.products : fallback.products)
      .map((product) => normalizeStoredProduct(product))
      .filter((product) => !productHasBlockedAccountCopy(product) && !(blockedInventoryFeed && product.source === "inventory-feed")),
    locations: (Array.isArray(account?.locations) ? account.locations : fallback.locations).map((location) => normalizeStoredLocation(location)),
    inventoryFeed,
    invites: normalizeStoredInvites(account?.invites || fallback.invites),
    members: normalizeStoredMembers(account?.members || fallback.members),
    activityLog: Array.isArray(account?.activityLog) ? account.activityLog.map((event) => normalizeActivityEvent(event)).filter(Boolean).slice(0, 20) : fallback.activityLog,
    supportTickets: (Array.isArray(account?.supportTickets) ? account.supportTickets : fallback.supportTickets).map((ticket) =>
      normalizeSupportTicket(ticket, user, { requireMessage: false })
    ),
    writeDraft: normalizeStoredWriteDraft(account?.writeDraft || {}, fallback.writeDraft),
    billing: normalizedBilling,
    searchConsole: normalizeStoredSearchConsole(account?.searchConsole || {}, fallback.searchConsole),
    rankings: normalizeStoredRankings(account?.rankings || {}, fallback.rankings, normalizedBilling),
    aiMentions: normalizeStoredAiMentions(account?.aiMentions || {}, fallback.aiMentions, normalizedBilling),
    reports: normalizeStoredReports(account?.reports || {}, fallback.reports, user),
  };
    return normalized;
}

function publicAccount(account) {
  const output = JSON.parse(JSON.stringify(account));
  output.contentPlan = publicContentPlan(output.contentPlan);
  output.setupChecklist = setupChecklist(output);
  return output;
}

function accountMutationResponse(account, extra = {}) {
  return { ok: true, account: publicAccount(account), ...extra };
}

function setupChecklist(account) {
  const site = account.settings?.site || {};
  const images = account.settings?.images || {};
  const cms = account.settings?.cms || {};
  const contentPlan = account.contentPlan || {};
  const billing = account.billing || {};
  const search = account.searchConsole || {};
  const products = account.products || [];
  const locations = account.locations || [];
  const items = contentPlan.items || [];
  const checklist = [
    {
      id: "site-profile",
      label: "Customize site profile",
      detail: "Business description, audience, brand voice, and language are set.",
      complete: Boolean(site.productDescription && site.targetAudience && site.brandVoice && site.language),
      action: { view: "settings", tab: "site" },
    },
    {
      id: "keywords",
      label: "Add target keywords",
      detail: "Saved keywords help plan topics and generated articles.",
      complete: Array.isArray(site.keywords) && site.keywords.length > 0,
      action: { view: "settings", tab: "site" },
    },
    {
      id: "business-assets",
      label: "Add products or locations",
      detail: "Products and locations give articles concrete business facts.",
      complete: products.length > 0 || locations.length > 0,
      action: { view: "settings", tab: products.length ? "locations" : "products" },
    },
    {
      id: "images",
      label: "Set image rules",
      detail: "Image style and guidelines are ready for generated articles.",
      complete: Boolean(images.includeImages === false || images.stylePreset || images.visualStyle || images.guidelines),
      action: { view: "settings", tab: "images" },
    },
    {
      id: "cms",
      label: "Connect CMS",
      detail: "CMS metadata and credentials are configured for draft-first publishing.",
      complete: cms.status === "connected" && Boolean(cms.websiteUrl && cms.platform && cms.hasCredentials),
      action: { view: "settings", tab: "cms" },
    },
    {
      id: "content-plan",
      label: "Schedule articles",
      detail: "At least one article exists on the content plan.",
      complete: items.length > 0,
      action: { view: "plan" },
    },
    {
      id: "tracking",
      label: "Connect tracking",
      detail: "Search Console is connected so results can be measured.",
      complete: search.status === "connected" && Boolean(search.propertyUrl),
      action: { view: "search" },
    },
  ];
  const completed = checklist.filter((item) => item.complete).length;
  return {
    completed,
    total: checklist.length,
    percent: Math.round((completed / checklist.length) * 100),
    billingReady: billing.status !== "cancelled",
    items: checklist,
  };
}

function publicPlanItem(item) {
  return {
    ...item,
    slug: articleSlug(item),
    publicPath: isPublishedPublicPost(item) ? articlePublicPath(item) : "",
    readiness: buildArticleReadiness(item),
  };
}

function publicContentPlan(contentPlan = {}) {
  const items = Array.isArray(contentPlan.items) ? contentPlan.items.filter((item) => !item.deletedAt).map(publicPlanItem) : [];
  const statusCounts = items.reduce(
    (counts, item) => {
      const status = allowedContentStatuses.has(item.status) ? item.status : "scheduled";
      counts[status] += 1;
      return counts;
    },
    Object.fromEntries(Array.from(allowedContentStatuses).map((status) => [status, 0]))
  );

  return {
    ...contentPlan,
    items,
    statusCounts,
  };
}

function roleForEmail(email) {
  return authAdminEmails.includes(normalizeEmail(email)) ? "admin" : "client";
}

function isAllowedGoogleDomain(payload) {
  if (!googleAllowedDomains.length) {
    return true;
  }

  const emailDomain = normalizeEmail(payload.email).split("@").pop();
  const hostedDomain = normalizeEmail(payload.hd);
  return googleAllowedDomains.includes(emailDomain) || googleAllowedDomains.includes(hostedDomain);
}

async function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body) > maxBodyBytes) {
        reject(authError("Request body is too large.", 413));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(authError("Request body must be valid JSON.", 400));
      }
    });
    request.on("error", reject);
  });
}

async function readAuthStore() {
  try {
    const parsed = JSON.parse(await fsp.readFile(authStorePath, "utf8"));
    return {
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { users: {}, sessions: {} };
    }

    throw error;
  }
}

async function writeAuthStore(store) {
  await fsp.mkdir(path.dirname(authStorePath), { recursive: true });
  await fsp.writeFile(authStorePath, `${JSON.stringify(store, null, 2)}\n`);
}

async function mutateAuthStore(mutator) {
  const store = await readAuthStore();
  const result = await mutator(store);
  await writeAuthStore(store);
  return result;
}

async function readAccountStore() {
  try {
    const parsed = JSON.parse(await fsp.readFile(accountStorePath, "utf8"));
    return {
      accounts: parsed.accounts && typeof parsed.accounts === "object" ? parsed.accounts : {},
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { accounts: {} };
    }

    throw error;
  }
}

async function writeAccountStore(store) {
  await fsp.mkdir(path.dirname(accountStorePath), { recursive: true });
  await fsp.writeFile(accountStorePath, `${JSON.stringify(store, null, 2)}\n`);
}

function accountOwnerUser(accountId, rawAccount, fallbackUser) {
  return {
    id: accountId,
    email: rawAccount?.ownerEmail || fallbackUser.email,
    name: rawAccount?.workspaceName || fallbackUser.name || fallbackUser.email,
  };
}

function ensureOwnAccount(store, user) {
  if (!store.accounts[user.id]) {
    store.accounts[user.id] = normalizeAccount(null, user);
  }

  return store.accounts[user.id];
}

function accessibleWorkspaceIds(store, user) {
  const email = normalizeEmail(user.email);
  const ids = Object.entries(store.accounts)
    .filter(([accountId, account]) => {
      if (accountId === user.id) return true;
      if (normalizeEmail(account.ownerEmail) === email) return true;
      return (account.members || []).some((member) => member.id === user.id || normalizeEmail(member.email) === email);
    })
    .map(([accountId]) => accountId);

  return Array.from(new Set(ids));
}

function workspaceSummary(store, accountId, user, selectedWorkspaceId) {
  const rawAccount = store.accounts[accountId];
  const account = normalizeAccount(rawAccount, accountOwnerUser(accountId, rawAccount, user));

  return {
    id: account.id,
    workspaceName: account.workspaceName,
    ownerEmail: account.ownerEmail,
    role: workspaceRole(account, user),
    selected: account.id === selectedWorkspaceId,
  };
}

function workspaceRole(account, user) {
  const owner = account.id === user.id || normalizeEmail(account.ownerEmail) === normalizeEmail(user.email);
  if (owner) return "owner";
  const member = (account.members || []).find((candidate) => candidate.id === user.id || normalizeEmail(candidate.email) === normalizeEmail(user.email));
  return member?.role || "member";
}

function assertCanMutateWorkspace(account, user) {
  const role = workspaceRole(account, user);
  if (!mutableWorkspaceRoles.has(role)) {
    throw authError("You do not have permission to change this workspace.", 403);
  }
}

function resolveSelectedWorkspaceId(store, user) {
  const ownAccount = ensureOwnAccount(store, user);
  const accessibleIds = accessibleWorkspaceIds(store, user);
  const selected = ownAccount.ui?.selectedWorkspaceId;

  if (selected && accessibleIds.includes(selected)) {
    return selected;
  }

  const memberWorkspace = accessibleIds.find((accountId) => accountId !== user.id);
  const fallback = memberWorkspace || user.id;
  ownAccount.ui = { ...(ownAccount.ui || {}), selectedWorkspaceId: fallback };
  return fallback;
}

function resolveAccountContext(store, user) {
  ensureOwnAccount(store, user);
  const selectedWorkspaceId = resolveSelectedWorkspaceId(store, user);
  const rawAccount = store.accounts[selectedWorkspaceId];
  const account = normalizeAccount(rawAccount, accountOwnerUser(selectedWorkspaceId, rawAccount, user));
  store.accounts[selectedWorkspaceId] = account;

  return {
    accountId: selectedWorkspaceId,
    account,
    workspaces: accessibleWorkspaceIds(store, user).map((accountId) => workspaceSummary(store, accountId, user, selectedWorkspaceId)),
  };
}

async function mutateAccount(user, mutator) {
  const store = await readAccountStore();
  const context = resolveAccountContext(store, user);
  const current = context.account;
  assertCanMutateWorkspace(current, user);
  const result = await mutator(current);
  current.updatedAt = new Date().toISOString();
  store.accounts[context.accountId] = current;
  await writeAccountStore(store);
  return result === undefined ? current : result;
}

async function readAccount(user) {
  const store = await readAccountStore();
  const context = resolveAccountContext(store, user);

  await writeAccountStore(store);
  return context.account;
}

async function readAccountContext(user) {
  const store = await readAccountStore();
  const context = resolveAccountContext(store, user);
  await writeAccountStore(store);
  return context;
}

async function selectWorkspace(user, workspaceId) {
  const store = await readAccountStore();
  const ownAccount = ensureOwnAccount(store, user);
  const accessibleIds = accessibleWorkspaceIds(store, user);

  if (!accessibleIds.includes(workspaceId)) {
    throw authError("Workspace not found or not available to this user.", 404);
  }

  ownAccount.ui = { ...(ownAccount.ui || {}), selectedWorkspaceId: workspaceId };
  const context = resolveAccountContext(store, user);
  await writeAccountStore(store);
  return context;
}

async function createWorkspace(user, payload = {}) {
  const store = await readAccountStore();
  const ownAccount = ensureOwnAccount(store, user);
  const workspaceName = normalizeText(payload.workspaceName);
  const websiteUrl = hasOwn(payload, "websiteUrl") ? normalizeOptionalWebUrl(payload.websiteUrl, "Workspace website URL") : "";

  if (!workspaceName) {
    throw authError("Workspace name is required.", 400);
  }

  const workspaceId = createId("workspace");
  const accountUser = {
    id: workspaceId,
    email: normalizeEmail(user.email),
    name: workspaceName,
  };
  const account = normalizeAccount(
    {
      id: workspaceId,
      ownerEmail: normalizeEmail(user.email),
      workspaceName,
      settings: websiteUrl ? { cms: { websiteUrl } } : {},
    },
    accountUser
  );

  store.accounts[workspaceId] = account;
  ownAccount.ui = { ...(ownAccount.ui || {}), selectedWorkspaceId: workspaceId };
  const context = resolveAccountContext(store, user);
  await writeAccountStore(store);
  return context;
}

async function workspaceList(user) {
  const store = await readAccountStore();
  const context = resolveAccountContext(store, user);
  await writeAccountStore(store);
  return context.workspaces;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: { accept: "application/json" },
        timeout: 5000,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;

          if (Buffer.byteLength(body) > maxJwksBytes) {
            request.destroy(authError("Google key response was too large.", 502));
          }
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(authError("Could not fetch Google signing keys.", 502));
            return;
          }

          try {
            resolve({ headers: response.headers, json: JSON.parse(body) });
          } catch {
            reject(authError("Google signing keys were not valid JSON.", 502));
          }
        });
      }
    );

    request.on("timeout", () => request.destroy(authError("Timed out fetching Google signing keys.", 502)));
    request.on("error", reject);
  });
}

async function getGoogleJwks({ forceRefresh = false } = {}) {
  if (!forceRefresh && googleJwksCache.expiresAt > Date.now() && googleJwksCache.keys.length) {
    return googleJwksCache.keys;
  }

  const { headers, json } = await getJson(googleJwksUrl);
  const maxAgeMatch = String(headers["cache-control"] || "").match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  googleJwksCache = {
    expiresAt: Date.now() + Math.max(60, maxAgeSeconds) * 1000,
    keys: Array.isArray(json.keys) ? json.keys : [],
  };

  return googleJwksCache.keys;
}

async function findGoogleJwk(kid) {
  let keys = await getGoogleJwks();
  let jwk = keys.find((key) => key.kid === kid);

  if (!jwk) {
    keys = await getGoogleJwks({ forceRefresh: true });
    jwk = keys.find((key) => key.kid === kid);
  }

  return jwk;
}

async function verifyGoogleIdToken(credential) {
  if (!googleClientId) {
    throw authError("Google auth is not configured.", 503);
  }

  const [encodedHeader, encodedPayload, encodedSignature] = String(credential || "").split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw authError("Google credential is not a valid ID token.", 400);
  }

  let header;
  let payload;

  try {
    header = parseJwtPart(encodedHeader);
    payload = parseJwtPart(encodedPayload);
  } catch {
    throw authError("Google credential could not be decoded.", 400);
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw authError("Google credential uses an unsupported signature.", 401);
  }

  const jwk = await findGoogleJwk(header.kid);

  if (!jwk) {
    throw authError("Google signing key was not found.", 401);
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  if (!verifier.verify(crypto.createPublicKey({ key: jwk, format: "jwk" }), decodeBase64Url(encodedSignature))) {
    throw authError("Google credential signature is invalid.", 401);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!googleTokenIssuers.has(payload.iss)) {
    throw authError("Google credential issuer is invalid.", 401);
  }

  if (payload.aud !== googleClientId) {
    throw authError("Google credential audience is invalid.", 401);
  }

  if (Number(payload.exp) <= nowSeconds) {
    throw authError("Google credential is expired.", 401);
  }

  if (payload.nbf && Number(payload.nbf) > nowSeconds) {
    throw authError("Google credential is not active yet.", 401);
  }

  if (!payload.sub || !payload.email) {
    throw authError("Google token is missing required identity claims.", 401);
  }

  if (payload.email_verified !== true) {
    throw authError("Google account email is not verified.", 403);
  }

  if (!isAllowedGoogleDomain(payload)) {
    throw authError("This Google account is not allowed for this site.", 403);
  }

  return payload;
}

async function createSession(googlePayload) {
  return mutateAuthStore((store) => {
    const now = new Date().toISOString();
    const userId = `google:${googlePayload.sub}`;
    const user = {
      id: userId,
      provider: "google",
      providerSubject: googlePayload.sub,
      email: normalizeEmail(googlePayload.email),
      emailVerified: googlePayload.email_verified === true,
      name: String(googlePayload.name || "").trim(),
      picture: String(googlePayload.picture || "").trim(),
      role: roleForEmail(googlePayload.email),
      createdAt: store.users[userId]?.createdAt || now,
      updatedAt: now,
      lastLoginAt: now,
    };
    const sessionId = crypto.randomBytes(32).toString("base64url");

    store.users[userId] = user;
    store.sessions[sessionId] = {
      id: sessionId,
      userId,
      createdAt: now,
      expiresAt: new Date(Date.now() + sessionTtlMs).toISOString(),
    };

    return { sessionId, user };
  });
}

async function readSessionUser(request) {
  const cookieValue = parseCookies(request.headers.cookie)[authCookieName];
  const sessionId = decodeSessionCookie(cookieValue);

  if (!sessionId) {
    return null;
  }

  const store = await readAuthStore();
  const session = store.sessions[sessionId];

  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }

  return store.users[session.userId] || null;
}

async function deleteSession(request) {
  const cookieValue = parseCookies(request.headers.cookie)[authCookieName];
  const sessionId = decodeSessionCookie(cookieValue);

  if (!sessionId) {
    return;
  }

  await mutateAuthStore((store) => {
    delete store.sessions[sessionId];
  });
}

function nextScheduledDate(account) {
  const dates = account.contentPlan.items
    .map((item) => Date.parse(item.scheduledDate))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a);
  const base = dates[0] || Date.now();
  const date = new Date(base + 2 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function normalizePlanItem(input, account) {
  const title = normalizeText(input.title);
  if (!title) throw authError("Content item title is required.", 400);
  const status = normalizeText(input.status, "scheduled").toLowerCase();
  if (!allowedContentStatuses.has(status)) throw authError("Content item status is not supported.", 400);
  const slug = slugify(input.slug || input.keyword || title);

  return {
    id: normalizeText(input.id) || createId("plan"),
    title,
    slug,
    keyword: normalizeText(input.keyword),
    category: normalizeText(input.category),
    excerpt: normalizeText(input.excerpt),
    brief: normalizeText(input.brief),
    body: normalizeText(input.body),
    internalLinks: normalizeText(input.internalLinks),
    schemaType: normalizeText(input.schemaType || input.structuredDataType || input.schema),
    seoTitle: normalizeText(input.seoTitle),
    metaDescription: normalizeText(input.metaDescription),
    canonicalUrl: normalizeOptionalWebUrl(input.canonicalUrl, "Canonical URL"),
    featuredImageUrl: normalizeOptionalWebUrl(input.featuredImageUrl, "Featured image URL"),
    featuredImageAlt: normalizeText(input.featuredImageAlt),
    authorName: normalizeText(input.authorName),
    volume: normalizeNumber(input.volume, { label: "Article volume", fallback: 0, min: 0 }),
    difficulty: normalizeText(input.difficulty, "Needs review"),
    estimatedVisits: normalizeNumber(input.estimatedVisits, { label: "Estimated visits", fallback: 0, min: 0 }),
    scheduledDate: normalizeIsoDate(input.scheduledDate, { label: "Scheduled date", fallback: nextScheduledDate(account) }),
    scheduledTime: normalizeTime(input.scheduledTime),
    status,
    generatedAt: normalizeText(input.generatedAt),
    updatedAt: normalizeText(input.updatedAt),
    publishedAt: normalizeText(input.publishedAt),
    publishedUrl: normalizeText(input.publishedUrl),
    deletedAt: normalizeText(input.deletedAt),
    notes: normalizeText(input.notes),
  };
}

function normalizePlanItemForWrite(input, account) {
  let item = normalizePlanItem(input, account);
  if (item.status === "published" && !item.body) {
    item = normalizePlanItem(
      {
        ...buildArticleDraft(account, item),
        status: "published",
        publishedAt: item.publishedAt,
      },
      account
    );
  }
  if (item.status === "published" && !item.publishedAt) item.publishedAt = new Date().toISOString();
  if (item.status !== "published") {
    item.publishedAt = "";
    item.publishedUrl = "";
  }
  item.updatedAt = new Date().toISOString();
  return item;
}

function normalizePublishablePlanItemForWrite(input, account) {
  const item = normalizePlanItemForWrite(input, account);
  if (item.status === "published") {
    assertPublishableArticle(item);
    item.publishedUrl = articlePublicPath(item);
  }
  return item;
}

function normalizeStoredPlanItem(input = {}) {
  const title = normalizeText(input.title || input.keyword);
  if (!title) return null;
  const status = normalizeStoredEnum(normalizeText(input.status).toLowerCase(), allowedContentStatuses, "scheduled");
  const publishedUrl = isLocalBlogPath(input.publishedUrl) ? normalizeText(input.publishedUrl) : "";
  return {
    id: normalizeText(input.id) || createId("plan"),
    title,
    slug: slugify(input.slug || input.keyword || title),
    keyword: normalizeText(input.keyword),
    category: normalizeText(input.category),
    excerpt: normalizeText(input.excerpt),
    brief: normalizeText(input.brief),
    body: normalizeText(input.body),
    internalLinks: normalizeText(input.internalLinks),
    schemaType: normalizeText(input.schemaType || input.structuredDataType || input.schema),
    seoTitle: normalizeText(input.seoTitle),
    metaDescription: normalizeText(input.metaDescription),
    canonicalUrl: normalizeStoredOptionalWebUrl(input.canonicalUrl, "Canonical URL"),
    featuredImageUrl: normalizeStoredOptionalWebUrl(input.featuredImageUrl, "Featured image URL"),
    featuredImageAlt: normalizeText(input.featuredImageAlt),
    authorName: normalizeText(input.authorName),
    volume: normalizeStoredNumberRange(input.volume, 0, { min: 0 }),
    difficulty: normalizeText(input.difficulty, "Needs review"),
    estimatedVisits: normalizeStoredNumberRange(input.estimatedVisits, 0, { min: 0 }),
    scheduledDate: normalizeStoredIsoDate(input.scheduledDate, "Scheduled date"),
    scheduledTime: normalizeStoredTime(input.scheduledTime),
    status,
    generatedAt: normalizeStoredTimestamp(input.generatedAt),
    updatedAt: normalizeStoredTimestamp(input.updatedAt),
    publishedAt: normalizeStoredTimestamp(input.publishedAt),
    publishedUrl,
    deletedAt: normalizeStoredTimestamp(input.deletedAt),
    notes: normalizeText(input.notes),
  };
}

function normalizeStoredContentPlan(input = {}, fallback = {}) {
  const rawItems = Array.isArray(input.items) ? input.items : fallback.items || [];
  return {
    ...fallback,
    strategy: normalizeText(input.strategy, fallback.strategy),
    updatedAt: normalizeStoredTimestamp(input.updatedAt),
    items: rawItems.map((item) => normalizeStoredPlanItem(item)).filter(Boolean),
  };
}

function articleSlug(item) {
  return slugify(item.slug || item.keyword || item.title || "article");
}

function ensureUniqueArticleSlug(account, requestedSlug, articleId = "") {
  const base = slugify(requestedSlug || "article");
  const taken = new Set(
    (account.contentPlan.items || [])
      .filter((item) => item.id !== articleId && !item.deletedAt)
      .map((item) => articleSlug(item))
  );

  if (!taken.has(base)) return base;

  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

function articlePublicPath(item) {
  return `/blog/${articleSlug(item)}`;
}

function isLocalBlogPath(value) {
  return /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizeText(value));
}

function isPublishedPublicPost(item, now = Date.now()) {
  if (!item || item.status !== "published") return false;
  if (item.deletedAt) return false;
  const publishedAt = Date.parse(item.publishedAt);
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

function publicBlogPost(item) {
  const slug = articleSlug(item);
  return {
    slug,
    title: normalizeText(item.title),
    keyword: normalizeText(item.keyword),
    category: normalizeText(item.category),
    excerpt: normalizeText(item.excerpt || item.metaDescription || item.brief),
    body: normalizeText(item.body),
    seoTitle: normalizeText(item.seoTitle || item.title),
    metaDescription: normalizeText(item.metaDescription),
    canonicalUrl: normalizeText(item.canonicalUrl),
    featuredImageUrl: normalizeText(item.featuredImageUrl),
    featuredImageAlt: normalizeText(item.featuredImageAlt),
    authorName: normalizeText(item.authorName),
    scheduledDate: normalizeText(item.scheduledDate),
    scheduledTime: normalizeText(item.scheduledTime),
    updatedAt: normalizeText(item.updatedAt),
    publishedAt: normalizeText(item.publishedAt),
  };
}

function publicEditorPost(item) {
  return publicPlanItem(item);
}

function activeEditorPosts(account) {
  return (account.contentPlan.items || []).filter((item) => !item.deletedAt).map(publicEditorPost);
}

function findArticleIndex(account, articleId) {
  const index = (account.contentPlan.items || []).findIndex((item) => item.id === articleId && !item.deletedAt);
  if (index === -1) throw authError("Article not found.", 404);
  return index;
}

function assertPublishableArticle(item) {
  if (!normalizeText(item.title)) throw authError("Article title is required before publishing.", 400);
  if (!articleSlug(item)) throw authError("Article slug is required before publishing.", 400);
  if (!normalizeText(item.body)) throw authError("Article body is required before publishing.", 400);

  const scheduledDate = normalizeIsoDate(item.scheduledDate, { label: "Scheduled date" });
  if (scheduledDate && Date.parse(`${scheduledDate}T00:00:00Z`) > Date.now()) {
    throw authError("Scheduled date must be today or in the past before publishing.", 400);
  }
}

async function readPublicBlogAccount() {
  const publicAccountId = configuredPublicAccountId();
  const publicOwnerEmail = configuredPublicOwnerEmail();
  if (!publicOwnerEmail && !publicAccountId) return null;

  const store = await readAccountStore();
  const accountEntries = Object.entries(store.accounts);
  const entry = publicAccountId
    ? accountEntries.find(([accountId]) => accountId === publicAccountId)
    : accountEntries.find(([, account]) => normalizeEmail(account?.ownerEmail) === publicOwnerEmail);

  if (!entry) return null;

  const [accountId, account] = entry;
  return normalizeAccount(account, accountOwnerUser(accountId, account, { id: accountId, email: account?.ownerEmail || "", name: account?.workspaceName || "" }));
}

async function readPublicBlogPosts() {
  const account = await readPublicBlogAccount();
  return (account?.contentPlan?.items || [])
    .filter((item) => isPublishedPublicPost(item))
    .map(publicBlogPost)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

async function servePublicBlogApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = decodeUrlPathComponent(parts[3] || "");

  if (parts[0] !== "api" || parts[1] !== "blog" || parts[2] !== "posts" || parts[4]) return false;
  if (req.method !== "GET") return false;

  const posts = await readPublicBlogPosts();

  if (!slug) {
    sendJson(res, 200, { ok: true, posts: posts.map(({ body, ...post }) => post) });
    return true;
  }

  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) {
    sendJson(res, 404, { ok: false, error: "Post not found." });
    return true;
  }

  sendJson(res, 200, { ok: true, post });
  return true;
}

function markdownToHtml(markdown) {
  const lines = normalizeText(markdown).split(/\r?\n/);
  const html = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${escapeHtml(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      return;
    }

    paragraph.push(trimmed);
  });
  flushParagraph();

  return html.join("\n") || "<p>This post is being prepared for publication.</p>";
}

function publicBlogLayout({ title, description, canonicalPath, body, user = null }) {
  const canonicalUrl = `https://sirbloggsalot.com${canonicalPath}`;
  const headerActions = user
    ? `<a class="login-link" href="/account?view=plan">Account</a>
        <form class="auth-logout-form" method="post" action="/api/auth/logout">
          <button class="auth-logout" type="submit">Log out</button>
        </form>`
    : `<a class="login-link" href="/login">Log in</a>
        <a class="button button-outline" href="/signup">Sign up</a>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Sir Bloggsalot" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="stylesheet" href="/styles.css?v=20260814-account-scrub" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Sir Bloggsalot home">
        <span class="brand-mark">S</span>
        <span>sirbloggsalot</span>
      </a>
      <nav id="primary-nav" aria-label="Primary navigation" data-primary-nav>
        <a href="/#features">Features</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
        <a href="/blog" aria-current="page">Blog</a>
      </nav>
      <div class="header-actions">
        ${headerActions}
      </div>
    </header>
    <main class="public-blog">
      ${body}
    </main>
  </body>
</html>`;
}

function renderPublicBlogIndex(posts, user = null) {
  const cards = posts.length
    ? posts
        .map((post) => {
          const excerpt = post.excerpt || "A practical note from the Sir Bloggsalot publishing workflow.";
          return `<article>
            <small>${escapeHtml(post.keyword || "Publishing")}</small>
            <h2><a href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
            <p>${escapeHtml(excerpt)}</p>
            <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(post.publishedAt.slice(0, 10))}</time>
          </article>`;
        })
        .join("\n")
    : `<article><small>Publishing</small><h2>Posts are being prepared</h2><p>Published account articles will appear here after they pass review and publish.</p></article>`;

  return publicBlogLayout({
    title: "Blog | Sir Bloggsalot",
    description: "Practical notes on AI search, daily publishing, and building a blog that earns citations.",
    canonicalPath: "/blog",
    user,
    body: `<section class="route-page public-blog-page">
        <h1>Blog</h1>
        <p>Practical notes on AI search, daily publishing, and building a blog that earns citations from search engines and answer tools.</p>
        <div class="route-grid">
          ${cards}
        </div>
      </section>`,
  });
}

function renderPublicBlogDetail(post, user = null) {
  const description = post.metaDescription || post.excerpt || "A practical Sir Bloggsalot article.";
  return publicBlogLayout({
    title: `${post.seoTitle || post.title} | Sir Bloggsalot`,
    description,
    canonicalPath: `/blog/${post.slug}`,
    user,
    body: `<article class="route-page public-blog-page public-blog-article">
        <a href="/blog">Blog</a>
        <h1>${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(description)}</p>
        <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(post.publishedAt.slice(0, 10))}</time>
        <div class="article-body">
${markdownToHtml(post.body)}
        </div>
      </article>`,
  });
}

async function servePublicBlogPage(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "blog") return false;

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, { "content-type": "text/plain; charset=utf-8" }, "Method not allowed");
    return true;
  }

  const user = await readSessionUser(req);
  const posts = await readPublicBlogPosts();
  let status = 200;
  let html = "";

  if (parts.length === 1) {
    html = renderPublicBlogIndex(posts, user);
  } else if (parts.length === 2) {
    const slug = decodeUrlPathComponent(parts[1] || "");
    const post = posts.find((candidate) => candidate.slug === slug);
    if (post) {
      html = renderPublicBlogDetail(post, user);
    } else {
      status = 404;
      html = publicBlogLayout({
        title: "Post not found | Sir Bloggsalot",
        description: "The requested Sir Bloggsalot article was not found.",
        canonicalPath: "/blog",
        user,
        body: `<section class="route-page public-blog-page"><h1>Post not found</h1><p>The requested article is not published.</p><p><a href="/blog">Return to the blog</a></p></section>`,
      });
    }
  } else {
    status = 404;
    html = publicBlogLayout({
      title: "Post not found | Sir Bloggsalot",
      description: "The requested Sir Bloggsalot article was not found.",
      canonicalPath: "/blog",
      user,
      body: `<section class="route-page public-blog-page"><h1>Post not found</h1><p>The requested article is not published.</p><p><a href="/blog">Return to the blog</a></p></section>`,
    });
  }

  send(res, status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, req.method === "HEAD" ? "" : html);
  return true;
}

function buildArticleDraft(account, item) {
  const settings = account.settings || {};
  const site = settings.site || {};
  const cta = settings.cta || {};
  const cms = settings.cms || {};
  const product = account.products?.find((candidate) => !candidate.hidden);
  const location = account.locations?.[0];
  const audience = site.targetAudience || "your target audience";
  const description = site.productDescription || "This business helps customers solve practical problems.";
  const voiceLine = site.brandVoice ? `\n\nBrand voice: ${site.brandVoice}.` : "";
  const competitorLine = site.competitors ? `\n\nCompetitive context: ${site.competitors}.` : "";
  const languageLine = site.language ? `\n\nLanguage: ${site.language}.` : "";
  const ctaTracking = cta.trackingLabel ? ` Tracking label: ${cta.trackingLabel}.` : "";
  const ctaLabel = cta.label ? `${cta.label}\n` : "";
  const ctaLine = cta.enabled && cta.text ? `\n\n## Next step\n${ctaLabel}${cta.text}${cta.url ? `: ${cta.url}` : ""}${ctaTracking}` : "";
  const productLine = product ? `\n\nMentioned offer: ${product.name}${product.description ? ` - ${product.description}` : ""}.` : "";
  const locationLine = location ? `\n\nLocal context: ${location.name}${location.serviceArea ? ` serves ${location.serviceArea}` : ""}.` : "";
  const cmsLine = cms.status === "connected" ? `\n\nPublishing target: ${cms.platform} in draft-first mode for ${cms.websiteUrl}.` : "\n\nPublishing target: draft only until CMS is connected.";

  return {
    ...item,
    status: "draft",
    seoTitle: item.seoTitle || `${item.title} | Sir Bloggsalot`,
    metaDescription:
      item.metaDescription ||
      `A practical guide for ${audience} about ${item.keyword || item.title}.`,
    body:
      item.body ||
      `# ${item.title}\n\n${description}\n\n## Who this helps\n${audience}\n\n## What to know about ${item.keyword || item.title}\nUse this article to answer buyer questions, cite real business details, and link readers to the next useful step.${voiceLine}${competitorLine}${languageLine}${productLine}${locationLine}${cmsLine}${ctaLine}\n\n## Draft notes\nReview facts, add source links, confirm brand voice, and approve before publishing.`,
    generatedAt: new Date().toISOString(),
  };
}

function buildSiteDescription(account) {
  const site = account.settings.site;
  const audience = site.targetAudience || "business owners who need consistent content";
  const keyword = site.keywords[0] || account.contentPlan.items[0]?.keyword || "search visibility";
  const product = account.products.find((item) => !item.hidden);
  const location = account.locations[0];
  const voiceLine = site.brandVoice ? ` The voice should stay ${site.brandVoice.toLowerCase()}.` : "";
  const cadenceLine = site.publishingCadence ? ` The content plan is tuned for ${site.publishingCadence.toLowerCase()} publishing.` : "";
  const competitorLine = site.competitors ? ` It can position against alternatives such as ${site.competitors}.` : "";
  const productLine = product ? ` It can highlight offers like ${product.name} without losing the brand voice.` : "";
  const locationLine = location ? ` It also uses local details from ${location.name} to make articles more specific.` : "";
  return `Sir Bloggsalot helps ${audience} publish useful, brand-aware articles for ${keyword}. It turns services, locations, products, calls to action, and publishing rules into a repeatable content plan for search and answer engines.${voiceLine}${cadenceLine}${competitorLine}${productLine}${locationLine}`;
}

function buildImagePrompt(account) {
  const images = account.settings.images || {};
  const style = images.visualStyle || "clean editorial photography with practical business context";
  const preset = images.stylePreset || "editorial";
  const aspectRatio = images.aspectRatio || "16:9";
  const cadenceLabels = {
    "featured-only": "featured image only",
    "key-sections": "key sections",
    "every-section": "every section",
    none: "no generated images",
  };
  const imageCadence = cadenceLabels[images.imageCadence] || cadenceLabels["featured-only"];
  const defaultGuidelines = "Avoid generic icons, random notification badges, fake dashboards, and unreadable text.";
  const guidelines = images.useCustomGuidelines && images.guidelines ? images.guidelines : defaultGuidelines;
  const topic = account.contentPlan.items[0]?.title || account.writeDraft.title || "a business blog article";
  const product = images.useProductImages ? account.products.find((item) => !item.hidden) : null;
  const productLine = product ? ` Include the product context: ${product.name}.` : "";
  return `Create a specific ${preset} ${aspectRatio} image plan for "${topic}" in this style: ${style}. Cadence: ${imageCadence}. Image guidelines: ${guidelines}${productLine}`;
}

function buildImagePreview(account, prompt, testedAt) {
  const images = account.settings.images || {};
  const topic = account.contentPlan.items[0]?.title || account.writeDraft.title || "Local image preview";
  return {
    title: `${topic} image preview`,
    providerStatus: "provider-pending",
    aspectRatio: images.aspectRatio || "16:9",
    imageCadence: images.imageCadence || "featured-only",
    stylePreset: images.stylePreset || "editorial",
    visualStyle: images.visualStyle || "",
    prompt,
    altText: `${topic} local image preview`,
    createdAt: testedAt,
  };
}

function buildCmsTestResult(cms = {}) {
  return {
    status: "provider-pending",
    platform: cms.platform || "CMS",
    websiteUrl: cms.websiteUrl || "",
    blogTarget: cms.blogTarget || "",
    collectionName: cms.collectionName || "",
    draftFirst: cms.draftFirst !== false,
    hasCredentials: Boolean(cms.hasCredentials),
    checkedAt: cms.lastTestedAt || "",
  };
}

function buildWriteDraftPreview(account) {
  const draft = account.writeDraft || {};
  const settings = account.settings || {};
  const links = normalizeArray(String(draft.internalLinks || "").split(/[\n,]/));
  const readiness = buildArticleReadiness(draft);
  const templateLabels = {
    "how-to": "How-to guide",
    comparison: "Comparison",
    listicle: "Listicle",
    local: "Local service article",
  };

  return [
    `# ${draft.title || "Untitled article"}`,
    "",
    `Template: ${templateLabels[draft.template] || draft.template || "Article"}`,
    `Target keyword: ${draft.keyword || "No keyword set"}`,
    `Slug: ${draft.slug || "Auto-generated"}`,
    `Category: ${draft.category || "Uncategorized"}`,
    `Audience: ${draft.audience || settings.site?.targetAudience || "General audience"}`,
    `Target length: ${draft.wordCount || 1200} words`,
    `Schedule: ${draft.scheduledDate || "Unscheduled"}${draft.scheduledTime ? ` at ${draft.scheduledTime}` : ""}`,
    `Readiness: ${readiness.score}%${readiness.missing.length ? `, missing ${readiness.missing.join(", ")}` : ", ready"}`,
    "",
    "Search preview:",
    `SEO title: ${draft.seoTitle || draft.title || "Untitled article"}`,
    `Meta description: ${draft.metaDescription || draft.excerpt || "No description yet."}`,
    "",
    "Brief:",
    draft.brief || "Use saved site settings, products, locations, and CTA details to produce a draft-first article.",
    "",
    "Context to include:",
    `- Site positioning: ${settings.site?.productDescription || "No product description saved."}`,
    `- Brand voice: ${settings.site?.brandVoice || "Not set."}`,
    `- Language: ${settings.site?.language || "English"}`,
    `- Competitors: ${settings.site?.competitors || "None listed."}`,
    `- Publishing cadence: ${settings.site?.publishingCadence || "Not set."}`,
    `- CTA: ${settings.cta?.enabled ? `${settings.cta.text || "CTA"} -> ${settings.cta.url || "URL needed"}` : "No CTA enabled."}`,
    `- Internal links: ${links.length ? links.join(", ") : "No internal links provided."}`,
  ].join("\n");
}

function buildArticleReadiness(input = {}) {
  const links = normalizeArray(String(input.internalLinks || "").split(/[\n,]/));
  const checks = [
    ["Working title", normalizeText(input.title)],
    ["Target keyword", normalizeText(input.keyword)],
    ["Slug", normalizeText(input.slug)],
    ["Schedule date", normalizeText(input.scheduledDate)],
    ["SEO title", normalizeText(input.seoTitle)],
    ["Meta description", normalizeText(input.metaDescription)],
    ["Draft body or brief", normalizeText(input.body || input.brief)],
    ["Internal links", links.length ? links.join(", ") : ""],
  ];
  const complete = checks.filter(([, value]) => Boolean(value)).map(([label]) => label);
  const missing = checks.filter(([, value]) => !value).map(([label]) => label);
  const score = Math.round((complete.length / checks.length) * 100);
  return {
    score,
    status: missing.length === 0 ? "ready" : score >= 70 ? "nearly_ready" : "needs_work",
    complete,
    missing,
  };
}

function normalizeTopic(input) {
  const title = normalizeText(input.title);
  if (!title) throw authError("Topic title is required.", 400);
  const difficulty = normalizeEnum(input.difficulty, allowedTopicDifficulties, { label: "Topic difficulty", fallback: "Needs review" });
  const difficultyScore = normalizeNumber(input.difficultyScore, {
    label: "Topic difficulty score",
    fallback: topicDifficultyScores[difficulty] || 50,
    min: 0,
    max: 100,
  });
  return {
    id: normalizeText(input.id) || createId("topic"),
    title,
    keyword: normalizeText(input.keyword) || title,
    volume: normalizeNumber(input.volume, { label: "Topic volume", fallback: 0, min: 0 }),
    cpc: normalizeNumber(input.cpc, { label: "Topic CPC", fallback: 0, min: 0 }),
    difficultyScore,
    difficulty,
    competition: normalizeNumber(input.competition, { label: "Topic competition", fallback: 0, min: 0, max: 1 }),
    added: normalizeBoolean(input.added),
  };
}

function normalizeStoredTopic(input = {}) {
  const title = normalizeText(input.title || input.keyword);
  if (!title) return null;
  const difficulty = normalizeStoredEnum(input.difficulty, allowedTopicDifficulties, "Needs review");
  return {
    id: normalizeText(input.id) || createId("topic"),
    title,
    keyword: normalizeText(input.keyword) || title,
    volume: normalizeStoredNumberRange(input.volume, 0, { min: 0 }),
    cpc: normalizeStoredNumberRange(input.cpc, 0, { min: 0 }),
    difficultyScore: normalizeStoredNumberRange(input.difficultyScore, topicDifficultyScores[difficulty] || 50, { min: 0, max: 100 }),
    difficulty,
    competition: normalizeStoredNumberRange(input.competition, 0, { min: 0, max: 1 }),
    added: normalizeStoredBoolean(input.added),
  };
}

function normalizeStoredTopics(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((topic) => normalizeStoredTopic(topic)).filter(Boolean).slice(0, 200);
}

function normalizeTopicFilterNumber(value, { min = 0, max = Infinity } = {}) {
  if (value === undefined || value === null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Math.min(max, Math.max(min, number));
}

function topicMatchesFilters(topic, query, filters = {}) {
  const haystack = `${topic.title} ${topic.keyword}`.toLowerCase();
  if (query && !haystack.includes(query)) return false;

  const checks = [
    ["difficultyScore", "difficultyMin", "difficultyMax"],
    ["cpc", "cpcMin", "cpcMax"],
    ["volume", "volumeMin", "volumeMax"],
    ["competition", "competitionMin", "competitionMax"],
  ];

  return checks.every(([field, minKey, maxKey]) => {
    const value = Number(topic[field] || 0);
    const min = normalizeTopicFilterNumber(filters[minKey]);
    const max = normalizeTopicFilterNumber(filters[maxKey]);
    if (min !== "" && value < min) return false;
    if (max !== "" && value > max) return false;
    return true;
  });
}

function filteredTopics(account, payload = {}) {
  const query = normalizeText(payload.query).toLowerCase();
  const filters = payload.filters && typeof payload.filters === "object" ? payload.filters : payload;
  const topics = (account.topics || []).filter((topic) => topicMatchesFilters(topic, query, filters));
  return {
    topics,
    summary: {
      total: account.topics?.length || 0,
      filtered: topics.length,
    },
  };
}

function buildKeywordExport(account, payload = {}) {
  const { topics, summary } = filteredTopics(account, payload);
  const header = ["keyword", "volume", "cpc", "difficulty", "competition", "title", "added"];
  const rows = topics.map((topic) => [
    topic.keyword,
    topic.volume,
    topic.cpc,
    topic.difficultyScore,
    topic.competition,
    topic.title,
    topic.added ? "yes" : "no",
  ]);
  return {
    filename: "sirbloggsalot-keywords.csv",
    csv: [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
    summary,
  };
}

function normalizeProduct(input) {
  const name = normalizeText(input.name);
  if (!name) throw authError("Product name is required.", 400);
  const category = normalizeText(input.category);
  if (!category) throw authError("Product category is required.", 400);

  return {
    id: normalizeText(input.id) || createId("product"),
    name,
    category,
    url: normalizeOptionalWebUrl(input.url, "Product URL"),
    description: normalizeText(input.description),
    price: normalizeText(input.price),
    sku: normalizeText(input.sku),
    audience: normalizeText(input.audience),
    featured: normalizeBoolean(input.featured),
    source: normalizeProductSource(input.source),
    hidden: normalizeBoolean(input.hidden),
  };
}

function normalizeStoredBoolean(value) {
  if (value === true) return true;
  const text = normalizeText(value).toLowerCase();
  return text === "true" || text === "yes" || text === "1" || text === "on";
}

function normalizeProductSource(value) {
  const source = normalizeText(value, "manual");
  return source;
}

function normalizeStoredOptionalWebUrl(value, label) {
  try {
    return normalizeOptionalWebUrl(value, label);
  } catch {
    return "";
  }
}

function normalizeStoredEnum(value, allowedValues, fallback = "") {
  const text = normalizeText(value);
  return allowedValues.has(text) ? text : fallback;
}

function normalizeStoredNumberRange(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

function normalizeStoredTime(value, fallback = "") {
  try {
    return normalizeTime(value, { fallback });
  } catch {
    return fallback;
  }
}

function normalizeStoredTimestamp(value) {
  const text = normalizeText(value);
  if (!text) return "";
  return Number.isFinite(Date.parse(text)) ? text : "";
}

function normalizeStoredSiteSettings(input = {}, fallback = {}) {
  return {
    ...fallback,
    productDescription: normalizeText(input.productDescription, fallback.productDescription),
    targetAudience: normalizeText(input.targetAudience, fallback.targetAudience),
    brandVoice: normalizeText(input.brandVoice, fallback.brandVoice),
    competitors: normalizeText(input.competitors, fallback.competitors),
    language: normalizeStoredEnum(input.language, allowedSiteLanguages, fallback.language || "English"),
    publishingCadence: normalizeStoredEnum(input.publishingCadence, allowedPublishingCadences, fallback.publishingCadence || "3 per week"),
    timezone: normalizeStoredEnum(input.timezone, allowedSiteTimezones, fallback.timezone || "America/Los_Angeles"),
    defaultPublishTime: normalizeStoredTime(input.defaultPublishTime, fallback.defaultPublishTime || "09:00"),
    keywords: Array.isArray(input.keywords) ? normalizeArray(input.keywords) : fallback.keywords || [],
    keywordDraft: normalizeText(input.keywordDraft, fallback.keywordDraft),
    keywordMix: normalizeStoredNumberRange(input.keywordMix, fallback.keywordMix ?? 45, { min: 0, max: 100 }),
  };
}

function normalizeStoredImagePromptHistory(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const prompt = normalizeText(row?.prompt);
      const createdAt = normalizeStoredTimestamp(row?.createdAt);
      if (!prompt || !createdAt) return null;
      return {
        prompt,
        createdAt,
        stylePreset: normalizeStoredEnum(row.stylePreset, allowedImageStylePresets, "editorial"),
        aspectRatio: normalizeStoredEnum(row.aspectRatio, allowedImageAspectRatios, "16:9"),
        imageCadence: normalizeStoredEnum(row.imageCadence, allowedImageCadences, "featured-only"),
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeStoredImagePreview(input = {}) {
  if (!input || typeof input !== "object") return {};
  const prompt = normalizeText(input.prompt);
  const providerStatus = normalizeText(input.providerStatus);
  if (!prompt || providerStatus !== "provider-pending") return {};
  const aspectRatio = normalizeStoredEnum(input.aspectRatio, allowedImageAspectRatios, "16:9");
  const imageCadence = normalizeStoredEnum(input.imageCadence, allowedImageCadences, "featured-only");
  const stylePreset = normalizeStoredEnum(input.stylePreset, allowedImageStylePresets, "editorial");
  const title = normalizeText(input.title, "Local image preview");
  return {
    title,
    providerStatus,
    aspectRatio,
    imageCadence,
    stylePreset,
    visualStyle: normalizeText(input.visualStyle),
    prompt,
    altText: normalizeText(input.altText, `${title} local image preview`),
    createdAt: normalizeStoredTimestamp(input.createdAt),
  };
}

function normalizeStoredImageSettings(input = {}, fallback = {}) {
  const useProductImages = hasOwn(input, "useProductImages")
    ? normalizeStoredBoolean(input.useProductImages)
    : hasOwn(input, "includeProductImages")
    ? normalizeStoredBoolean(input.includeProductImages)
    : fallback.useProductImages;
  const guidelines = hasOwn(input, "guidelines") ? normalizeText(input.guidelines) : hasOwn(input, "customGuidelines") ? normalizeText(input.customGuidelines) : fallback.guidelines;
  const useCustomGuidelines = hasOwn(input, "useCustomGuidelines")
    ? normalizeStoredBoolean(input.useCustomGuidelines)
    : hasOwn(input, "customGuidelines")
    ? Boolean(guidelines)
    : fallback.useCustomGuidelines;

  return {
    ...fallback,
    includeImages: hasOwn(input, "includeImages") ? normalizeStoredBoolean(input.includeImages) : fallback.includeImages,
    useProductImages,
    useCustomGuidelines,
    stylePreset: normalizeStoredEnum(input.stylePreset, allowedImageStylePresets, fallback.stylePreset || "editorial"),
    aspectRatio: normalizeStoredEnum(input.aspectRatio, allowedImageAspectRatios, fallback.aspectRatio || "16:9"),
    imageCadence: normalizeStoredEnum(input.imageCadence, allowedImageCadences, fallback.imageCadence || "featured-only"),
    visualStyle: normalizeText(input.visualStyle, fallback.visualStyle),
    guidelines,
    samplePrompt: normalizeText(input.samplePrompt, fallback.samplePrompt),
    samplePreview: normalizeStoredImagePreview(input.samplePreview || fallback.samplePreview),
    lastTestedAt: normalizeStoredTimestamp(input.lastTestedAt),
    promptHistory: normalizeStoredImagePromptHistory(input.promptHistory),
  };
}

function normalizeStoredCmsSettings(input = {}, fallback = {}) {
  const websiteUrl = normalizeStoredOptionalWebUrl(input.websiteUrl, "CMS website URL");
  const platform = normalizeStoredEnum(input.platform, allowedCmsPlatforms, "");
  const rawStatus = normalizeStoredEnum(input.status, allowedCmsStatuses, fallback.status || "disconnected");
  const configured = Boolean(websiteUrl && platform);
  const status = configured ? rawStatus : "disconnected";

  return {
    ...fallback,
    websiteUrl,
    platform,
    status,
    draftFirst: hasOwn(input, "draftFirst") ? normalizeStoredBoolean(input.draftFirst) : fallback.draftFirst,
    hasCredentials: status === "connected" && normalizeStoredBoolean(input.hasCredentials),
    username: normalizeText(input.username, fallback.username),
    blogTarget: normalizeText(input.blogTarget, fallback.blogTarget),
    collectionName: normalizeText(input.collectionName, fallback.collectionName),
    lastTestedAt: normalizeStoredTimestamp(input.lastTestedAt),
    lastConnectedAt: status === "connected" ? normalizeStoredTimestamp(input.lastConnectedAt) : "",
    lastError: status === "connected" ? "" : normalizeText(input.lastError),
  };
}

function normalizeStoredCtaSettings(input = {}, fallback = {}) {
  return {
    ...fallback,
    enabled: hasOwn(input, "enabled") ? normalizeStoredBoolean(input.enabled) : fallback.enabled,
    label: normalizeText(input.label, fallback.label),
    text: normalizeText(input.text, fallback.text),
    url: normalizeStoredOptionalWebUrl(input.url, "CTA URL"),
    placement: normalizeStoredEnum(input.placement, allowedCtaPlacements, fallback.placement || "end"),
    style: normalizeStoredEnum(input.style, allowedCtaStyles, fallback.style || "button"),
    openInNewTab: hasOwn(input, "openInNewTab") ? normalizeStoredBoolean(input.openInNewTab) : fallback.openInNewTab,
    trackingLabel: normalizeText(input.trackingLabel, fallback.trackingLabel),
  };
}

function normalizeStoredSettings(input = {}, fallback = {}) {
  return {
    site: normalizeStoredSiteSettings(input.site || {}, fallback.site || {}),
    images: normalizeStoredImageSettings(input.images || {}, fallback.images || {}),
    cms: normalizeStoredCmsSettings(input.cms || {}, fallback.cms || {}),
    cta: normalizeStoredCtaSettings(input.cta || {}, fallback.cta || {}),
  };
}

function normalizeStoredUi(input = {}, fallback = {}) {
  return {
    ...fallback,
    activeView: normalizeStoredEnum(input.activeView, allowedAccountViews, fallback.activeView || "plan"),
    activeSettingsTab: normalizeStoredEnum(input.activeSettingsTab, allowedSettingsTabs, fallback.activeSettingsTab || "site"),
    calendarMode: ["grid", "list"].includes(input.calendarMode) ? input.calendarMode : fallback.calendarMode || "grid",
    selectedWorkspaceId: normalizeText(input.selectedWorkspaceId, fallback.selectedWorkspaceId),
  };
}

function normalizeStoredInventoryFeed(input = {}, fallback = {}) {
  const retailerName = normalizeText(input.retailerName, fallback.retailerName);
  const accountId = normalizeText(input.accountId, fallback.accountId);
  const rawStatus = normalizeStoredEnum(input.status, allowedInventoryFeedStatuses, fallback.status || "disconnected");
  const blocked = hasBlockedAccountCopy([retailerName, accountId, input.lastError].join(" "));
  const connected = !blocked && rawStatus === "connected" && Boolean(retailerName && accountId);
  return {
    ...fallback,
    status: connected ? "connected" : "disconnected",
    retailerName: connected ? retailerName : "",
    accountId: connected ? accountId : "",
    hasCredentials: connected && normalizeStoredBoolean(input.hasCredentials),
    lastConnectedAt: connected ? normalizeStoredTimestamp(input.lastConnectedAt) : "",
    lastSyncedAt: connected ? normalizeStoredTimestamp(input.lastSyncedAt) : "",
    lastError: connected || blocked ? "" : normalizeText(input.lastError),
  };
}

function normalizeStoredProduct(input = {}) {
  return {
    id: normalizeText(input.id) || createId("product"),
    name: normalizeText(input.name, "Untitled product"),
    category: normalizeText(input.category, "Uncategorized"),
    url: normalizeStoredOptionalWebUrl(input.url, "Product URL"),
    description: normalizeText(input.description),
    price: normalizeText(input.price),
    sku: normalizeText(input.sku),
    audience: normalizeText(input.audience),
    featured: normalizeStoredBoolean(input.featured),
    source: normalizeProductSource(input.source),
    hidden: normalizeStoredBoolean(input.hidden),
  };
}

function normalizeLocation(input) {
  const name = normalizeText(input.name);
  if (!name) throw authError("Location name is required.", 400);
  const city = normalizeText(input.city);
  if (!city) throw authError("Location city is required.", 400);
  const state = normalizeText(input.state).toUpperCase();
  if (state && !/^[A-Z]{2}$/.test(state)) throw authError("Location state must use a 2-letter code.", 400);

  return {
    id: normalizeText(input.id) || createId("location"),
    name,
    city,
    state,
    address: normalizeText(input.address),
    phone: normalizeText(input.phone),
    serviceArea: normalizeText(input.serviceArea),
    isPrimary: normalizeBoolean(input.isPrimary),
  };
}

function normalizeStoredLocation(input = {}) {
  const state = normalizeText(input.state).toUpperCase();
  return {
    id: normalizeText(input.id) || createId("location"),
    name: normalizeText(input.name, "Untitled location"),
    city: normalizeText(input.city, "Unknown city"),
    state: /^[A-Z]{2}$/.test(state) ? state : "",
    address: normalizeText(input.address),
    phone: normalizeText(input.phone),
    serviceArea: normalizeText(input.serviceArea),
    isPrimary: normalizeStoredBoolean(input.isPrimary),
  };
}

function billingPrice(plan, billingPeriod) {
  if (plan === "Pro+") return billingPeriod === "annual" ? "$69/mo annual" : "$99/mo monthly";
  return billingPeriod === "annual" ? "$49/mo annual" : "$79/mo monthly";
}

function isoDateDaysFromNow(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeStoredIsoDate(value, label) {
  try {
    return normalizeIsoDate(value, { label });
  } catch {
    return "";
  }
}

function normalizeStoredBilling(input = {}, fallback = {}) {
  const plan = allowedBillingPlans.has(input.plan) ? input.plan : fallback.plan || "Pro";
  const billingPeriod = allowedBillingPeriods.has(input.billingPeriod) ? input.billingPeriod : fallback.billingPeriod || "annual";
  const status = allowedBillingStatuses.has(input.status) ? input.status : fallback.status || "trial";
  const failedPayment = input.failedPayment && typeof input.failedPayment === "object" ? input.failedPayment : {};
  const fallbackInvoices = Array.isArray(fallback.invoices) ? fallback.invoices : [];
  const invoices = Array.isArray(input.invoices) ? input.invoices : fallbackInvoices;
  return {
    ...fallback,
    ...input,
    plan,
    status,
    billingPeriod,
    trialEndsAt: normalizeStoredIsoDate(input.trialEndsAt || fallback.trialEndsAt, "Trial end date"),
    price: billingPrice(plan, billingPeriod),
    paymentMethod: normalizeText(input.paymentMethod, fallback.paymentMethod),
    portalStatus: normalizeText(input.portalStatus, fallback.portalStatus || "not-connected"),
    failedPayment: {
      reason: normalizeText(failedPayment.reason),
      retryAt: normalizeStoredIsoDate(failedPayment.retryAt, "Retry date"),
      recordedAt: normalizeText(failedPayment.recordedAt),
    },
    invoices: invoices.map((invoice) => normalizeStoredBillingInvoice(invoice)).filter(Boolean).slice(0, 50),
  };
}

function normalizeStoredBillingInvoice(input = {}) {
  if (!input || typeof input !== "object") return null;
  const date = normalizeStoredIsoDate(input.date, "Invoice date");
  const plan = allowedBillingPlans.has(input.plan) ? input.plan : "";
  const amount = normalizeText(input.amount);
  const status = allowedInvoiceStatuses.has(input.status) ? input.status : "";
  const id = normalizeText(input.id);
  if (!id || !date || !plan || !amount || !status) return null;

  const hostedInvoiceUrl = normalizeText(input.hostedInvoiceUrl);
  return {
    id,
    date,
    plan,
    amount,
    status,
    failureReason: normalizeText(input.failureReason),
    hostedInvoiceUrl: hostedInvoiceUrl.startsWith("/account?") ? hostedInvoiceUrl : "",
  };
}

function normalizeStoredNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeStoredSearchTrend(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const date = normalizeStoredIsoDate(row?.date, "Trend date");
      if (!date) return null;
      return {
        date,
        clicks: normalizeStoredNumber(row.clicks),
        impressions: normalizeStoredNumber(row.impressions),
      };
    })
    .filter(Boolean);
}

function normalizeStoredSearchQueries(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      query: normalizeText(row?.query),
      clicks: normalizeStoredNumber(row?.clicks),
      impressions: normalizeStoredNumber(row?.impressions),
    }))
    .filter((row) => row.query);
}

function normalizeStoredSearchPages(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      page: normalizeText(row?.page),
      clicks: normalizeStoredNumber(row?.clicks),
    }))
    .filter((row) => isLocalBlogPath(row.page));
}

function normalizeStoredSearchConsole(input = {}, fallback = {}) {
  const propertyUrl = normalizeStoredOptionalWebUrl(input.propertyUrl, "Search Console property URL");
  const connected = input.status === "connected" && Boolean(propertyUrl);
  if (!connected) {
    return {
      ...fallback,
      status: "disconnected",
      propertyUrl: "",
      lastSyncedAt: "",
      clicks: 0,
      impressions: 0,
      indexedPages: 0,
      dateRange: normalizedSearchConsoleRange(input.dateRange, fallback.dateRange || "28"),
      trend: [],
      topQueries: [],
      topPages: [],
    };
  }

  return {
    ...fallback,
    ...input,
    status: "connected",
    propertyUrl,
    lastSyncedAt: normalizeStoredTimestamp(input.lastSyncedAt),
    clicks: normalizeStoredNumber(input.clicks),
    impressions: normalizeStoredNumber(input.impressions),
    indexedPages: normalizeStoredNumber(input.indexedPages),
    dateRange: normalizedSearchConsoleRange(input.dateRange, fallback.dateRange || "28"),
    trend: normalizeStoredSearchTrend(input.trend),
    topQueries: normalizeStoredSearchQueries(input.topQueries),
    topPages: normalizeStoredSearchPages(input.topPages),
  };
}

function isProPlusBilling(billing = {}) {
  return billing.plan === "Pro+" && billing.status !== "cancelled";
}

function normalizeStoredTrackingTrend(rows, field) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const date = normalizeStoredIsoDate(row?.date, "Trend date");
      if (!date) return null;
      return {
        date,
        [field]: normalizeStoredNumber(row?.[field]),
      };
    })
    .filter(Boolean);
}

function normalizeStoredRankings(input = {}, fallback = {}, billing = {}) {
  const proPlus = isProPlusBilling(billing);
  const dateRange = normalizedTrackingRange(input.dateRange, fallback.dateRange || "30");
  if (!proPlus) {
    return {
      ...fallback,
      gated: true,
      planRequired: "Pro+",
      dateRange,
      updatedAt: normalizeText(input.updatedAt),
      trend: [],
      keywords: [],
    };
  }

  const keywords = Array.isArray(input.keywords)
    ? input.keywords
        .map((keyword) => ({
          keyword: normalizeText(keyword?.keyword),
          url: isLocalBlogPath(keyword?.url) ? normalizeText(keyword.url) : "",
          position: Math.max(1, normalizeStoredNumber(keyword?.position, 1)),
          change: Number.isFinite(Number(keyword?.change)) ? Number(keyword.change) : 0,
        }))
        .filter((keyword) => keyword.keyword)
    : [];

  return {
    ...fallback,
    ...input,
    gated: false,
    planRequired: "Pro+",
    dateRange,
    updatedAt: normalizeText(input.updatedAt),
    trend: normalizeStoredTrackingTrend(input.trend, "averagePosition"),
    keywords,
  };
}

function normalizeStoredAiMentions(input = {}, fallback = {}, billing = {}) {
  const proPlus = isProPlusBilling(billing);
  const dateRange = normalizedTrackingRange(input.dateRange, fallback.dateRange || "30");
  if (!proPlus) {
    return {
      ...fallback,
      gated: true,
      planRequired: "Pro+",
      dateRange,
      updatedAt: normalizeText(input.updatedAt),
      sources: [],
      models: [],
      trend: [],
      mentions: [],
    };
  }

  const mentions = Array.isArray(input.mentions)
    ? input.mentions
        .map((mention) => ({
          source: normalizeText(mention?.source),
          model: normalizeText(mention?.model),
          prompt: normalizeText(mention?.prompt),
          status: mention?.status === "mentioned" ? "mentioned" : "monitoring",
        }))
        .filter((mention) => mention.source && mention.prompt)
    : [];

  return {
    ...fallback,
    ...input,
    gated: false,
    planRequired: "Pro+",
    dateRange,
    updatedAt: normalizeText(input.updatedAt),
    sources: Array.from(new Set(mentions.map((mention) => mention.source).filter(Boolean))),
    models: Array.from(new Set(mentions.map((mention) => mention.model).filter(Boolean))),
    trend: normalizeStoredTrackingTrend(input.trend, "mentions"),
    mentions,
  };
}

function normalizeStoredReportSharing(input = {}, fallback = {}) {
  const shareId = normalizeText(input.shareId);
  const shareUrl = normalizeText(input.shareUrl);
  const idFromUrl = shareUrl.match(/^\/reports\/(report_[a-f0-9]{16})$/)?.[1] || "";
  const normalizedShareId = /^report_[a-f0-9]{16}$/.test(shareId) ? shareId : idFromUrl;
  return {
    ...fallback,
    shareId: normalizedShareId,
    shareUrl: normalizedShareId ? `/reports/${normalizedShareId}` : "",
    shareCreatedAt: normalizeStoredIsoDate(String(input.shareCreatedAt || "").slice(0, 10), "Report share date") ? normalizeText(input.shareCreatedAt) : "",
  };
}

function normalizeStoredReportRecipients(value, fallback = []) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : fallback;
  return Array.from(
    new Set(
      raw
        .map((recipient) => normalizeEmail(recipient))
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );
}

function normalizeStoredReportSchedule(input = {}, fallback = {}, user = {}) {
  const cadence = allowedReportCadences.has(input.cadence) ? input.cadence : fallback.cadence || "weekly";
  const template = allowedReportTemplates.has(input.template) ? input.template : fallback.template || "performance";
  const recipients = normalizeStoredReportRecipients(input.recipients, fallback.recipients || []);
  const enabled = normalizeStoredBoolean(input.enabled);
  return {
    ...fallback,
    enabled,
    cadence,
    template,
    recipients: enabled && !recipients.length ? [normalizeEmail(user.email)].filter(Boolean) : recipients,
    lastScheduledAt: normalizeStoredIsoDate(String(input.lastScheduledAt || "").slice(0, 10), "Report schedule date") ? normalizeText(input.lastScheduledAt) : "",
  };
}

function normalizeStoredReports(input = {}, fallback = {}, user = {}) {
  const template = allowedReportTemplates.has(input.template) ? input.template : fallback.template || "performance";
  return {
    template,
    sharing: normalizeStoredReportSharing(input.sharing || {}, fallback.sharing || {}),
    schedule: normalizeStoredReportSchedule(input.schedule || {}, { ...(fallback.schedule || {}), template }, user),
  };
}

function buildInventoryFeedProducts(account) {
  const retailer = account.inventoryFeed.retailerName || "Inventory feed";
  return ["Featured service", "Popular package", "Seasonal offer"].map((name, index) =>
    normalizeProduct({
      id: `inventory_feed_${index + 1}`,
      name: `${retailer} ${name}`,
      category: index === 1 ? "Package" : index === 2 ? "Offer" : "Service",
      description: "Locally synced product placeholder for content planning. Replace with live inventory feed data when credentials are wired.",
      source: "inventory-feed",
      hidden: false,
    })
  );
}

function normalizeSupportTicketEnum(value, allowedValues, { label, fallback, allowInvalidFallback = false }) {
  try {
    return normalizeEnum(value, allowedValues, { label, fallback });
  } catch (error) {
    if (!allowInvalidFallback) throw error;
    return fallback;
  }
}

function normalizeSupportTicket(input, user, options = {}) {
  const requireMessage = options.requireMessage !== false;
  const allowInvalidFallback = !requireMessage;
  const storedRead = !requireMessage;
  const subject = normalizeText(input.subject, "Account support request");
  const message = normalizeText(input.message);
  if (requireMessage && !message) throw authError("Support ticket details are required.", 400);
  const now = new Date().toISOString();
  const createdAt = storedRead ? normalizeStoredTimestamp(input.createdAt) : normalizeText(input.createdAt, now);
  const requesterEmail = normalizeEmail(user.email);
  const existingReplies = Array.isArray(input.replies) ? input.replies : [];
  const replies = existingReplies
    .map((reply) => normalizeSupportReply(reply, user, { storedRead }))
    .filter((reply) => reply.message);
  if (message && !replies.length) {
    replies.push(normalizeSupportReply({ message, authorEmail: requesterEmail, createdAt }, user));
  }
  return {
    id: normalizeText(input.id) || createId("ticket"),
    subject,
    category: normalizeSupportTicketEnum(input.category, allowedSupportCategories, {
      label: "Support category",
      fallback: "Setup",
      allowInvalidFallback,
    }),
    message,
    status: normalizeSupportTicketEnum(input.status, allowedSupportTicketStatuses, {
      label: "Support ticket status",
      fallback: "open",
      allowInvalidFallback,
    }),
    priority: normalizeSupportTicketEnum(input.priority, allowedSupportPriorities, {
      label: "Support priority",
      fallback: "normal",
      allowInvalidFallback,
    }),
    pageContext: normalizeText(input.pageContext),
    replies,
    createdAt,
    updatedAt: storedRead ? normalizeStoredTimestamp(input.updatedAt) : normalizeText(input.updatedAt, now),
    resolvedAt: storedRead ? normalizeStoredTimestamp(input.resolvedAt) : normalizeText(input.resolvedAt),
    requesterEmail,
  };
}

function normalizeSupportReply(input, user, options = {}) {
  const authorEmail = normalizeEmail(input.authorEmail || user.email);
  return {
    id: normalizeText(input.id) || createId("reply"),
    message: normalizeText(input.message),
    authorEmail: options.storedRead && !isValidEmail(authorEmail) ? normalizeEmail(user.email) : authorEmail,
    createdAt: options.storedRead ? normalizeStoredTimestamp(input.createdAt) : normalizeText(input.createdAt, new Date().toISOString()),
  };
}

function normalizeWriteDraft(input, fallback = {}) {
  const draft = {
    ...fallback,
    title: normalizeText(input.title, fallback.title),
    slug: normalizeText(input.slug, fallback.slug),
    keyword: normalizeText(input.keyword, fallback.keyword),
    category: normalizeText(input.category, fallback.category),
    excerpt: normalizeText(input.excerpt, fallback.excerpt),
    canonicalUrl: normalizeOptionalWebUrl(input.canonicalUrl === undefined ? fallback.canonicalUrl : input.canonicalUrl, "Canonical URL"),
    authorName: normalizeText(input.authorName, fallback.authorName),
    scheduledDate: normalizeIsoDate(input.scheduledDate, { label: "Scheduled date", fallback: fallback.scheduledDate }),
    scheduledTime: normalizeTime(input.scheduledTime, { label: "Scheduled time", fallback: fallback.scheduledTime }),
    brief: normalizeText(input.brief, fallback.brief),
    template: normalizeEnum(input.template, allowedWriteTemplates, { label: "Write template", fallback: fallback.template || "how-to" }),
    audience: normalizeText(input.audience, fallback.audience),
    wordCount: normalizeNumber(input.wordCount, { label: "Target words", fallback: fallback.wordCount || 1200, min: 500, max: 4000 }),
    volume: normalizeNumber(input.volume, { label: "Article volume", fallback: fallback.volume || 0, min: 0 }),
    difficulty: normalizeText(input.difficulty, fallback.difficulty || "Needs review"),
    estimatedVisits: normalizeNumber(input.estimatedVisits, { label: "Estimated visits", fallback: fallback.estimatedVisits || 0, min: 0 }),
    internalLinks: normalizeText(input.internalLinks, fallback.internalLinks),
    seoTitle: normalizeText(input.seoTitle, fallback.seoTitle),
    metaDescription: normalizeText(input.metaDescription, fallback.metaDescription),
    featuredImageUrl: normalizeOptionalWebUrl(input.featuredImageUrl === undefined ? fallback.featuredImageUrl : input.featuredImageUrl, "Featured image URL"),
    featuredImageAlt: normalizeText(input.featuredImageAlt, fallback.featuredImageAlt),
    body: normalizeText(input.body, fallback.body),
    notes: normalizeText(input.notes, fallback.notes),
    preview: normalizeText(input.preview, fallback.preview),
    previewStatus: normalizeEnum(input.previewStatus, allowedWritePreviewStatuses, { label: "Write preview status", fallback: fallback.previewStatus }),
    previewSource: normalizeEnum(input.previewSource, allowedWritePreviewSources, { label: "Write preview source", fallback: fallback.previewSource }),
    previewedAt: normalizeText(input.previewedAt, fallback.previewedAt),
    sourcePostId: normalizeText(input.sourcePostId, fallback.sourcePostId),
    sourceStatus: normalizeEnum(input.sourceStatus || fallback.sourceStatus || "draft", allowedContentStatuses, { label: "Source article status", fallback: fallback.sourceStatus || "draft" }),
    status: normalizeEnum(input.status, allowedWriteStatuses, { label: "Write draft status", fallback: fallback.status || "draft" }),
  };
  return {
    ...draft,
    readiness: buildArticleReadiness(draft),
  };
}

function normalizeStoredWriteDraft(input = {}, fallback = {}) {
  const draft = {
    ...fallback,
    title: normalizeText(input.title, fallback.title),
    slug: normalizeText(input.slug, fallback.slug),
    keyword: normalizeText(input.keyword, fallback.keyword),
    category: normalizeText(input.category, fallback.category),
    excerpt: normalizeText(input.excerpt, fallback.excerpt),
    canonicalUrl: normalizeStoredOptionalWebUrl(input.canonicalUrl, "Canonical URL"),
    authorName: normalizeText(input.authorName, fallback.authorName),
    scheduledDate: normalizeStoredIsoDate(input.scheduledDate, "Scheduled date"),
    scheduledTime: normalizeStoredTime(input.scheduledTime, fallback.scheduledTime),
    brief: normalizeText(input.brief, fallback.brief),
    template: normalizeStoredEnum(input.template, allowedWriteTemplates, fallback.template || "how-to"),
    audience: normalizeText(input.audience, fallback.audience),
    wordCount: normalizeStoredNumberRange(input.wordCount, fallback.wordCount || 1200, { min: 500, max: 4000 }),
    volume: normalizeStoredNumberRange(input.volume, fallback.volume || 0, { min: 0 }),
    difficulty: normalizeText(input.difficulty, fallback.difficulty || "Needs review"),
    estimatedVisits: normalizeStoredNumberRange(input.estimatedVisits, fallback.estimatedVisits || 0, { min: 0 }),
    internalLinks: normalizeText(input.internalLinks, fallback.internalLinks),
    seoTitle: normalizeText(input.seoTitle, fallback.seoTitle),
    metaDescription: normalizeText(input.metaDescription, fallback.metaDescription),
    featuredImageUrl: normalizeStoredOptionalWebUrl(input.featuredImageUrl, "Featured image URL"),
    featuredImageAlt: normalizeText(input.featuredImageAlt, fallback.featuredImageAlt),
    body: normalizeText(input.body, fallback.body),
    notes: normalizeText(input.notes, fallback.notes),
    preview: normalizeText(input.preview, fallback.preview),
    previewStatus: normalizeStoredEnum(input.previewStatus, allowedWritePreviewStatuses, fallback.previewStatus),
    previewSource: normalizeStoredEnum(input.previewSource, allowedWritePreviewSources, fallback.previewSource),
    previewedAt: normalizeStoredTimestamp(input.previewedAt),
    sourcePostId: normalizeText(input.sourcePostId, fallback.sourcePostId),
    sourceStatus: normalizeStoredEnum(input.sourceStatus, allowedContentStatuses, fallback.sourceStatus || "draft"),
    status: normalizeStoredEnum(input.status, allowedWriteStatuses, fallback.status || "draft"),
  };
  return {
    ...draft,
    readiness: buildArticleReadiness(draft),
  };
}

function normalizeInvite(input, req) {
  const email = normalizeEmail(input.email);

  if (!email || !email.includes("@")) {
    throw authError("Enter a valid invite email.", 400);
  }

  const token = createId("invite");
  const origin = `https://${req.headers.host || "sirbloggsalot.com"}`;
  return {
    id: token,
    email,
    role: normalizeEnum(input.role, allowedInviteRoles, { label: "Invite role", fallback: "member" }),
    status: "pending",
    createdAt: new Date().toISOString(),
    link: `${origin}/invite/${token}`,
  };
}

function normalizeStoredInvite(input = {}) {
  const id = normalizeText(input.id);
  const email = normalizeEmail(input.email);
  if (!id || !isValidEmail(email)) return null;
  return {
    id,
    email,
    role: normalizeStoredEnum(input.role, allowedInviteRoles, "member"),
    status: normalizeStoredEnum(input.status, allowedInviteStatuses, "pending"),
    createdAt: normalizeStoredTimestamp(input.createdAt),
    acceptedAt: normalizeStoredTimestamp(input.acceptedAt),
    acceptedBy: normalizeText(input.acceptedBy),
    link: `/invite/${id}`,
  };
}

function normalizeStoredInvites(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((invite) => normalizeStoredInvite(invite)).filter(Boolean).slice(0, 25);
}

function normalizedSearchConsoleRange(value, fallback = "28") {
  const range = normalizeText(value, fallback);
  return allowedSearchConsoleRanges.has(range) ? range : fallback;
}

function buildSearchConsoleSnapshot(account, propertyUrl, options = {}) {
  const items = account.contentPlan.items || [];
  const clicks = Math.max(12, items.reduce((sum, item) => sum + Math.round(Number(item.estimatedVisits || 0) * 0.08), 0));
  const impressions = Math.max(420, items.reduce((sum, item) => sum + Math.round(Number(item.volume || 0) * 0.32), 0));
  const indexedPages = Math.max(1, Math.min(items.length, items.filter((item) => item.status !== "paused").length));
  const dateRange = normalizedSearchConsoleRange(options.dateRange || account.searchConsole?.dateRange || "28");
  const days = Number(dateRange);
  const trend = Array.from({ length: days }, (_item, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    const progress = (index + 1) / days;
    const wave = index % 6 === 0 ? 1.18 : index % 4 === 0 ? 0.86 : 1;
    return {
      date: date.toISOString().slice(0, 10),
      clicks: Math.max(1, Math.round((clicks / days) * (0.42 + progress) * wave)),
      impressions: Math.max(12, Math.round((impressions / days) * (0.48 + progress) * wave)),
    };
  });
  const topQueries = items.slice(0, 5).map((item) => ({
    query: item.keyword || item.title,
    clicks: Math.max(1, Math.round(Number(item.estimatedVisits || 0) * 0.08)),
    impressions: Math.max(20, Math.round(Number(item.volume || 0) * 0.32)),
  }));
  const topPages = items.slice(0, 5).map((item) => ({
    page: articlePublicPath(item),
    clicks: Math.max(1, Math.round(Number(item.estimatedVisits || 0) * 0.06)),
  }));

  return {
    status: "connected",
    propertyUrl,
    lastSyncedAt: new Date().toISOString(),
    dateRange,
    clicks,
    impressions,
    indexedPages,
    trend,
    topQueries,
    topPages,
  };
}

function buildSearchConsoleExport(account) {
  const searchConsole = account.searchConsole || {};
  const header = ["type", "label", "clicks", "impressions"];
  const trendRows = (searchConsole.trend || []).map((point) => ["trend", point.date, point.clicks, point.impressions]);
  const queryRows = (searchConsole.topQueries || []).map((query) => ["query", query.query, query.clicks, query.impressions]);
  const pageRows = (searchConsole.topPages || []).map((page) => ["page", page.page, page.clicks, ""]);
  return {
    filename: "sirbloggsalot-search-console.csv",
    csv: [header, ...trendRows, ...queryRows, ...pageRows].map((row) => row.map(csvCell).join(",")).join("\n"),
    searchConsole,
  };
}

function normalizedTrackingRange(value, fallback = "30") {
  const range = normalizeText(value, fallback);
  return ["30", "90"].includes(range) ? range : fallback;
}

function buildRankingsSnapshot(account, options = {}) {
  const proPlus = account.billing.plan === "Pro+" && account.billing.status !== "cancelled";
  const items = account.contentPlan.items || [];
  const dateRange = normalizedTrackingRange(options.dateRange || account.rankings.dateRange || "30");
  const keywords = proPlus
    ? items.slice(0, 8).map((item, index) => ({
        keyword: item.keyword || item.title,
        position: 8 + index * 3,
        change: index % 2 === 0 ? 2 : -1,
        url: articlePublicPath(item),
      }))
    : [];
  const averagePosition = keywords.length
    ? Math.round(keywords.reduce((sum, keyword) => sum + Number(keyword.position || 0), 0) / keywords.length)
    : 0;
  const days = Number(dateRange);
  const today = new Date();
  const trend = proPlus
    ? Array.from({ length: days }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - index - 1));
        const drift = Math.round((days - index) / Math.max(6, Math.ceil(days / 10)));
        return {
          date: date.toISOString().slice(0, 10),
          averagePosition: Math.max(1, averagePosition + drift),
        };
      })
    : [];
  return {
    gated: !proPlus,
    planRequired: "Pro+",
    dateRange,
    updatedAt: proPlus ? new Date().toISOString() : account.rankings.updatedAt || "",
    trend,
    keywords,
  };
}

function csvCell(value) {
  const rawText = String(value ?? "");
  const text = /^[=+\-@\t\r]/.test(rawText) ? `'${rawText}` : rawText;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildRankingsExport(account) {
  const rankings = buildRankingsSnapshot(account);
  const header = ["type", "keyword", "url", "position", "change", "date", "averagePosition"];
  const rows = [
    ...rankings.keywords.map((keyword) => ["keyword", keyword.keyword, keyword.url, keyword.position, keyword.change, "", ""]),
    ...rankings.trend.map((point) => ["trend", "", "", "", "", point.date, point.averagePosition]),
  ];
  return {
    filename: "sirbloggsalot-rankings.csv",
    csv: [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
    rankings,
  };
}

function buildAiMentionsSnapshot(account, options = {}) {
  const proPlus = account.billing.plan === "Pro+" && account.billing.status !== "cancelled";
  const keywords = account.settings.site.keywords || [];
  const dateRange = normalizedTrackingRange(options.dateRange || account.aiMentions.dateRange || "30");
  const generatedMentions = proPlus
    ? (keywords.length ? keywords : ["AI SEO", "local search", "content automation"]).slice(0, 5).map((keyword, index) => ({
        source: ["ChatGPT", "Perplexity", "Google AI"][index % 3],
        model: ["GPT-4o", "Claude 3.5", "Gemini 1.5"][index % 3],
        prompt: `best ${keyword} tools`,
        status: index % 2 === 0 ? "mentioned" : "monitoring",
      }))
    : [];
  const sourceFilter = normalizeText(options.source);
  const modelFilter = normalizeText(options.model);
  const mentions = generatedMentions.filter((mention) => {
    const sourceMatches = !sourceFilter || sourceFilter === "all" || mention.source === sourceFilter;
    const modelMatches = !modelFilter || modelFilter === "all" || mention.model === modelFilter;
    return sourceMatches && modelMatches;
  });
  const days = Number(dateRange);
  const today = new Date();
  const trend = proPlus
    ? Array.from({ length: days }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - index - 1));
        return {
          date: date.toISOString().slice(0, 10),
          mentions: Math.min(generatedMentions.length, Math.max(0, Math.ceil(((index + 1) / days) * generatedMentions.filter((mention) => mention.status === "mentioned").length))),
        };
      })
    : [];
  return {
    gated: !proPlus,
    planRequired: "Pro+",
    dateRange,
    updatedAt: proPlus ? new Date().toISOString() : account.aiMentions.updatedAt || "",
    sources: Array.from(new Set(generatedMentions.map((mention) => mention.source))),
    models: Array.from(new Set(generatedMentions.map((mention) => mention.model))),
    trend,
    mentions,
  };
}

function buildAiMentionsExport(account) {
  const aiMentions = buildAiMentionsSnapshot(account);
  const header = ["type", "source", "model", "prompt", "status", "date", "mentions"];
  const rows = [
    ...aiMentions.mentions.map((mention) => ["mention", mention.source, mention.model, mention.prompt, mention.status, "", ""]),
    ...aiMentions.trend.map((point) => ["trend", "", "", "", "", point.date, point.mentions]),
  ];
  return {
    filename: "sirbloggsalot-ai-mentions.csv",
    csv: [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
    aiMentions,
  };
}

function buildReportsSnapshot(account) {
  const items = account.contentPlan.items || [];
  const rankings = buildRankingsSnapshot(account);
  const aiMentions = buildAiMentionsSnapshot(account);
  const search = account.searchConsole || {};
  const templateKey = allowedReportTemplates.has(account.reports?.template) ? account.reports.template : "performance";
  const template = reportTemplateCatalog[templateKey] || reportTemplateCatalog.performance;
  const summary = {
    articles: items.length,
    clicks: Number(search.clicks || 0),
    impressions: Number(search.impressions || 0),
    rankings: rankings.keywords.length,
    aiMentions: aiMentions.mentions.length,
  };
  const chart = [
    { label: "Articles", value: summary.articles },
    { label: "Clicks", value: summary.clicks },
    { label: "Impressions", value: summary.impressions },
    { label: "Rankings", value: summary.rankings },
    { label: "AI mentions", value: summary.aiMentions },
  ];
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
        publicPath: item.publicPath || item.publishedUrl || (isPublishedPublicPost(item) ? articlePublicPath(item) : ""),
      })),
    ...rankings.keywords.slice(0, 3).map((keyword) => ({
      section: "ranking",
      label: keyword.keyword,
      value: `#${keyword.position}`,
      detail: `${keyword.change >= 0 ? "+" : ""}${keyword.change} · ${keyword.url}`,
    })),
    ...aiMentions.mentions.slice(0, 3).map((mention) => ({
      section: "ai mention",
      label: mention.source,
      value: mention.status,
      detail: mention.prompt,
    })),
  ];
  return {
    template,
    summary,
    chart,
    sharing: account.reports?.sharing || { shareUrl: "", shareCreatedAt: "" },
    schedule: account.reports?.schedule || { enabled: false, cadence: "weekly", template: template.key, recipients: [], lastScheduledAt: "" },
    rows,
  };
}

function buildReportsExport(account) {
  const reports = buildReportsSnapshot(account);
  const header = ["template", "section", "label", "value", "detail", "publicPath"];
  const rows = reports.rows.map((row) => [reports.template?.label || "Performance summary", row.section, row.label, row.value, row.detail, row.publicPath || ""]);
  return {
    filename: "sirbloggsalot-reports.csv",
    csv: [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
    reports,
  };
}

async function readSharedReportAccount(shareId) {
  const normalizedShareId = normalizeText(shareId);
  if (!/^report_[a-f0-9]+$/i.test(normalizedShareId)) return null;

  const store = await readAccountStore();
  const entry = Object.entries(store.accounts).find(([, account]) => {
    const sharing = account?.reports?.sharing || {};
    if (sharing.shareId === normalizedShareId) return true;
    return sharing.shareUrl === `/reports/${normalizedShareId}`;
  });

  if (!entry) return null;

  const [accountId, account] = entry;
  return normalizeAccount(account, accountOwnerUser(accountId, account, { id: accountId, email: account?.ownerEmail || "", name: account?.workspaceName || "" }));
}

function renderSharedReportPage(account, user = null) {
  const reports = buildReportsSnapshot(account);
  const summary = reports.summary || {};
  const summaryCards = [
    ["Articles", summary.articles || 0],
    ["Clicks", summary.clicks || 0],
    ["Impressions", summary.impressions || 0],
    ["Rankings", summary.rankings || 0],
    ["AI mentions", summary.aiMentions || 0],
  ]
    .map(([label, value]) => `<article><small>${escapeHtml(label)}</small><h2>${Number(value || 0).toLocaleString()}</h2></article>`)
    .join("\n");
  const rows = reports.rows?.length
    ? reports.rows
        .map(
          (row) => {
            const publicPath = normalizeText(row.publicPath || "");
            const label = isLocalBlogPath(publicPath) ? `<a href="${escapeHtml(publicPath)}">${escapeHtml(row.label || "Untitled")}</a>` : escapeHtml(row.label || "Untitled");
            return `<article>
            <small>${escapeHtml(row.section || "report")}</small>
            <h2>${label}</h2>
            <p>${escapeHtml(row.detail || "")}</p>
            <strong>${escapeHtml(row.value || "")}</strong>
          </article>`;
          }
        )
        .join("\n")
    : `<article><small>Report</small><h2>No report rows yet</h2><p>Publish articles or sync tracking data to populate this shared report.</p></article>`;

  return publicBlogLayout({
    title: "Shared Report | Sir Bloggsalot",
    description: "A shared local Sir Bloggsalot report snapshot.",
    canonicalPath: reports.sharing?.shareUrl || "/reports",
    user,
    body: `<section class="route-page public-blog-page public-report-page" data-shared-report>
        <h1>Shared Report</h1>
        <p>A local snapshot of content, search, ranking, and AI mention signals.</p>
        <div class="route-grid">
          ${summaryCards}
        </div>
        <div class="route-grid">
          ${rows}
        </div>
      </section>`,
  });
}

async function serveSharedReportPage(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "reports") return false;

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, { "content-type": "text/plain; charset=utf-8" }, "Method not allowed");
    return true;
  }

  const user = await readSessionUser(req);

  if (parts.length !== 2) {
    const html = publicBlogLayout({
      title: "Report not found | Sir Bloggsalot",
      description: "The requested Sir Bloggsalot report was not found.",
      canonicalPath: "/reports",
      user,
      body: `<section class="route-page public-blog-page"><h1>Report not found</h1><p>The requested shared report is not available.</p></section>`,
    });
    send(res, 404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, req.method === "HEAD" ? "" : html);
    return true;
  }

  const account = await readSharedReportAccount(decodeUrlPathComponent(parts[1] || ""));
  if (!account) {
    const html = publicBlogLayout({
      title: "Report not found | Sir Bloggsalot",
      description: "The requested Sir Bloggsalot report was not found.",
      canonicalPath: "/reports",
      user,
      body: `<section class="route-page public-blog-page"><h1>Report not found</h1><p>The requested shared report is not available.</p></section>`,
    });
    send(res, 404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, req.method === "HEAD" ? "" : html);
    return true;
  }

  const html = renderSharedReportPage(account, user);
  send(res, 200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, req.method === "HEAD" ? "" : html);
  return true;
}

function buildSeoAnalysisSnapshot(account) {
  const items = account.contentPlan.items || [];
  const issues = [];
  const opportunities = [];
  const hasInternalLinks = (item) => {
    if (Array.isArray(item.internalLinks)) return item.internalLinks.some((link) => normalizeText(link));
    return normalizeText(item.internalLinks).length > 0;
  };
  const hasSchema = (item) => Boolean(normalizeText(item.schemaType || item.structuredDataType || item.schema));
  const publicUrl = (item) => normalizeText(item.publishedUrl || item.publicPath || (isPublishedPublicPost(item) ? articlePublicPath(item) : ""));
  const issueFor = (item, detail) => ({ label: item.title || item.keyword || "Untitled article", detail, publicPath: publicUrl(item) });
  items.forEach((item) => {
    if (!normalizeText(item.keyword)) issues.push(issueFor(item, "Missing target keyword."));
    if (!normalizeText(item.seoTitle)) issues.push(issueFor(item, "Missing SEO title."));
    if (!normalizeText(item.metaDescription)) issues.push(issueFor(item, "Missing meta description."));
    if (!hasSchema(item)) issues.push(issueFor(item, "Missing schema type."));
    if (!hasInternalLinks(item)) issues.push(issueFor(item, "Missing internal links."));
    if (!normalizeText(item.body) && item.status !== "scheduled") issues.push(issueFor(item, "Missing draft body."));
    if (item.status === "published" && !publicUrl(item)) {
      issues.push(issueFor(item, "Published article is missing a public URL."));
    }
  });

  if (!account.settings.site.keywords?.length) opportunities.push({ label: "Site keywords", detail: "Add saved site keywords to guide article planning." });
  if (account.searchConsole.status !== "connected") opportunities.push({ label: "Search Console", detail: "Connect Search Console to measure indexed content." });
  if (account.settings.cms.status !== "connected") opportunities.push({ label: "CMS", detail: "Connect CMS metadata before publishing articles." });
  if (!items.some((item) => item.status === "published")) opportunities.push({ label: "Published content", detail: "Publish at least one reviewed article to unlock public SEO feedback." });

  const totalChecks = Math.max(1, items.length * 4 + 4);
  const deductions = Math.min(totalChecks, issues.length + opportunities.length);
  const score = Math.max(0, Math.round(((totalChecks - deductions) / totalChecks) * 100));
  const metadataPassed = items.filter((item) => normalizeText(item.keyword) && normalizeText(item.seoTitle) && normalizeText(item.metaDescription)).length;
  const schemaPassed = items.filter((item) => hasSchema(item)).length;
  const internalLinksPassed = items.filter((item) => hasInternalLinks(item)).length;
  const crawlPassed = items.filter((item) => item.status !== "published" || publicUrl(item)).length;
  const chart = [
    { label: "Metadata", passed: metadataPassed, total: items.length },
    { label: "Schema", passed: schemaPassed, total: items.length },
    { label: "Internal links", passed: internalLinksPassed, total: items.length },
    { label: "Crawl readiness", passed: crawlPassed, total: items.length },
  ];
  const checks = chart.map((item) => ({
    label: item.label,
    status: item.total === 0 || item.passed === item.total ? "pass" : item.passed > 0 ? "warning" : "fail",
    detail: `${item.passed} of ${item.total} article checks passed.`,
  }));
  return {
    summary: {
      score,
      articleCount: items.length,
      issueCount: issues.length,
      opportunityCount: opportunities.length,
    },
    chart,
    checks,
    issues,
    opportunities,
  };
}

function buildSeoAnalysisExport(account) {
  const seoAnalysis = buildSeoAnalysisSnapshot(account);
  const header = ["type", "label", "status", "detail", "passed", "total", "publicPath"];
  const rows = [
    ...seoAnalysis.checks.map((check) => ["check", check.label, check.status, check.detail, "", "", ""]),
    ...seoAnalysis.chart.map((item) => ["chart", item.label, "", "", item.passed, item.total, ""]),
    ...seoAnalysis.issues.map((issue) => ["issue", issue.label, "", issue.detail, "", "", issue.publicPath || ""]),
    ...seoAnalysis.opportunities.map((opportunity) => ["opportunity", opportunity.label, "", opportunity.detail, "", "", ""]),
  ];
  return {
    filename: "sirbloggsalot-seo-analysis.csv",
    csv: [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
    seoAnalysis,
  };
}

function normalizeMember(user, input = {}) {
  return {
    id: normalizeText(input.id, user.id),
    email: normalizeEmail(input.email || user.email),
    name: normalizeText(input.name, user.name || user.email),
    role: normalizeEnum(input.role, allowedMemberRoles, { label: "Member role", fallback: "member" }),
    status: normalizeText(input.status, "active"),
    joinedAt: normalizeText(input.joinedAt, new Date().toISOString()),
    roleUpdatedAt: normalizeText(input.roleUpdatedAt),
    roleUpdatedBy: normalizeText(input.roleUpdatedBy),
  };
}

function normalizeStoredMember(input = {}) {
  const id = normalizeText(input.id);
  const email = normalizeEmail(input.email);
  if (!id || !isValidEmail(email)) return null;
  return {
    id,
    email,
    name: normalizeText(input.name, email),
    role: normalizeStoredEnum(input.role, allowedInviteRoles, "member"),
    status: "active",
    joinedAt: normalizeStoredTimestamp(input.joinedAt),
    roleUpdatedAt: normalizeStoredTimestamp(input.roleUpdatedAt),
    roleUpdatedBy: normalizeEmail(input.roleUpdatedBy),
  };
}

function normalizeStoredMembers(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((member) => normalizeStoredMember(member)).filter(Boolean).slice(0, 25);
}

function normalizeActivityEvent(input = {}) {
  const type = normalizeText(input.type);
  const label = normalizeText(input.label);
  const createdAt = normalizeStoredTimestamp(input.createdAt);
  if (!type || !label || !createdAt) return null;

  return {
    id: normalizeText(input.id, createId("activity")),
    type,
    label,
    targetEmail: normalizeEmail(input.targetEmail),
    actorEmail: normalizeEmail(input.actorEmail),
    role: normalizeText(input.role),
    createdAt,
  };
}

function addAccountActivity(account, event) {
  const createdAt = new Date().toISOString();
  const normalized = normalizeActivityEvent({
    id: createId("activity"),
    createdAt,
    ...event,
  });
  if (!normalized) return;
  account.activityLog = [normalized, ...(account.activityLog || [])].slice(0, 20);
}

async function findInviteAccount(token) {
  const store = await readAccountStore();

  for (const [accountId, rawAccount] of Object.entries(store.accounts)) {
    const account = normalizeAccount(rawAccount, accountOwnerUser(accountId, rawAccount, { id: accountId, email: rawAccount?.ownerEmail || "", name: rawAccount?.workspaceName || "" }));
    const invite = account.invites?.find((candidate) => candidate.id === token);
    if (invite) {
      store.accounts[accountId] = account;
      return { store, accountId, rawAccount: account, invite };
    }
  }

  return { store, accountId: "", rawAccount: null, invite: null };
}

async function serveAccountApi(req, res, url) {
  const user = await readSessionUser(req);

  if (!user) {
    sendJson(res, 401, { ok: false, error: "Sign in required." });
    return true;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const section = parts[2] || "summary";
  const child = decodeUrlPathComponent(parts[3] || "");
  const id = decodeUrlPathComponent(parts[4] || "");

  if (req.method === "GET" && section === "summary" && !child) {
    const context = await readAccountContext(user);
    sendJson(res, 200, { ok: true, account: publicAccount(context.account), workspaces: context.workspaces, selectedWorkspaceId: context.accountId });
    return true;
  }

  if (section === "workspaces") {
    if (req.method === "GET" && !child) {
      sendJson(res, 200, { ok: true, workspaces: await workspaceList(user) });
      return true;
    }

    if (req.method === "POST" && !child) {
      const payload = await readRequestJson(req);
      const context = await createWorkspace(user, payload);
      sendJson(res, 200, { ok: true, account: publicAccount(context.account), workspaces: context.workspaces, selectedWorkspaceId: context.accountId });
      return true;
    }

    if (req.method === "POST" && child === "select" && !id) {
      const payload = await readRequestJson(req);
      const context = await selectWorkspace(user, normalizeText(payload.workspaceId));
      sendJson(res, 200, { ok: true, account: publicAccount(context.account), workspaces: context.workspaces, selectedWorkspaceId: context.accountId });
      return true;
    }

    return false;
  }

  if (section === "ui" && req.method === "PUT" && !child) {
    const payload = await readRequestJson(req);
    const account = await mutateAccount(user, (current) => {
      if (allowedAccountViews.has(payload.activeView)) current.ui.activeView = payload.activeView;
      if (allowedSettingsTabs.has(payload.activeSettingsTab)) current.ui.activeSettingsTab = payload.activeSettingsTab;
      if (["grid", "list"].includes(payload.calendarMode)) current.ui.calendarMode = payload.calendarMode;
    });
    sendJson(res, 200, { ok: true, ui: account.ui });
    return true;
  }

  if (section === "blog" && child === "posts") {
    const action = parts[5] || "";
    if (req.method === "GET" && !id) {
      const status = normalizeText(url.searchParams.get("status"));
      if (status && status !== "all" && !allowedContentStatuses.has(status)) throw authError("Article status filter is not supported.", 400);
      const account = await readAccount(user);
      const posts = activeEditorPosts(account).filter((post) => !status || status === "all" || post.status === status);
      sendJson(res, 200, { ok: true, posts, account: publicAccount(account) });
      return true;
    }

    if (req.method === "POST" && !id) {
      const payload = await readRequestJson(req);
      if (!normalizeText(payload.keyword)) throw authError("Target keyword is required before starting an article.", 400);
      let post = null;
      const account = await mutateAccount(user, (current) => {
        const item = normalizePublishablePlanItemForWrite(
          {
            ...payload,
            status: normalizeText(payload.status, "draft"),
            slug: ensureUniqueArticleSlug(current, payload.slug || payload.keyword || payload.title),
            createdAt: new Date().toISOString(),
          },
          current
        );
        current.contentPlan.items.push(item);
        current.contentPlan.updatedAt = new Date().toISOString();
        post = publicEditorPost(item);
      });
      sendJson(res, 201, accountMutationResponse(account, { post, posts: activeEditorPosts(account) }));
      return true;
    }

    if (req.method === "GET" && id && !action) {
      const account = await readAccount(user);
      const index = findArticleIndex(account, id);
      sendJson(res, 200, { ok: true, post: publicEditorPost(account.contentPlan.items[index]) });
      return true;
    }

    if (req.method === "PUT" && id && !action) {
      const payload = await readRequestJson(req);
      let post = null;
      const account = await mutateAccount(user, (current) => {
        const index = findArticleIndex(current, id);
        const existing = current.contentPlan.items[index];
        const nextSlug = hasOwn(payload, "slug") ? payload.slug : existing.slug || existing.keyword || existing.title;
        const item = normalizePublishablePlanItemForWrite(
          {
            ...existing,
            ...payload,
            id,
            slug: ensureUniqueArticleSlug(current, nextSlug, id),
          },
          current
        );
        current.contentPlan.items[index] = item;
        current.contentPlan.updatedAt = new Date().toISOString();
        post = publicEditorPost(item);
      });
      sendJson(res, 200, accountMutationResponse(account, { post, posts: activeEditorPosts(account) }));
      return true;
    }

    if (req.method === "DELETE" && id && !action) {
      let post = null;
      const account = await mutateAccount(user, (current) => {
        const index = findArticleIndex(current, id);
        current.contentPlan.items[index] = {
          ...current.contentPlan.items[index],
          status: "draft",
          publishedAt: "",
          publishedUrl: "",
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        current.contentPlan.updatedAt = new Date().toISOString();
        post = publicEditorPost(current.contentPlan.items[index]);
      });
      sendJson(res, 200, accountMutationResponse(account, { post, posts: activeEditorPosts(account) }));
      return true;
    }

    if (req.method === "POST" && id && action === "generate" && !parts[6]) {
      let post = null;
      const account = await mutateAccount(user, (current) => {
        const index = findArticleIndex(current, id);
        const existing = current.contentPlan.items[index];
        const item = normalizePlanItemForWrite(
          {
            ...existing,
            ...buildArticleDraft(current, existing),
            id,
            slug: ensureUniqueArticleSlug(current, existing.slug || existing.keyword || existing.title, id),
            status: existing.status === "published" ? "published" : "draft",
            generatedAt: new Date().toISOString(),
          },
          current
        );
        current.contentPlan.items[index] = item;
        current.contentPlan.updatedAt = new Date().toISOString();
        post = publicEditorPost(item);
      });
      sendJson(res, 200, accountMutationResponse(account, { post, posts: activeEditorPosts(account) }));
      return true;
    }

    if (req.method === "POST" && id && action === "publish" && !parts[6]) {
      let post = null;
      const account = await mutateAccount(user, (current) => {
        const index = findArticleIndex(current, id);
        const existing = current.contentPlan.items[index];
        assertPublishableArticle(existing);
        const publishedAt = new Date().toISOString();
        const item = normalizePlanItemForWrite(
          {
            ...existing,
            id,
            slug: ensureUniqueArticleSlug(current, existing.slug || existing.keyword || existing.title, id),
            status: "published",
            publishedAt,
            publishedUrl: articlePublicPath(existing),
          },
          current
        );
        current.contentPlan.items[index] = item;
        current.contentPlan.updatedAt = new Date().toISOString();
        post = publicEditorPost(item);
      });
      sendJson(res, 200, accountMutationResponse(account, { post, posts: activeEditorPosts(account) }));
      return true;
    }

    if (req.method === "POST" && id && action === "unpublish" && !parts[6]) {
      let post = null;
      const account = await mutateAccount(user, (current) => {
        const index = findArticleIndex(current, id);
        const existing = current.contentPlan.items[index];
        const item = normalizePlanItemForWrite(
          {
            ...existing,
            id,
            slug: ensureUniqueArticleSlug(current, existing.slug || existing.keyword || existing.title, id),
            status: "draft",
            publishedAt: "",
            publishedUrl: "",
          },
          current
        );
        current.contentPlan.items[index] = item;
        current.contentPlan.updatedAt = new Date().toISOString();
        post = publicEditorPost(item);
      });
      sendJson(res, 200, accountMutationResponse(account, { post, posts: activeEditorPosts(account) }));
      return true;
    }

    if (req.method === "POST" && id && action === "schedule" && !parts[6]) {
      const payload = await readRequestJson(req);
      let post = null;
      const account = await mutateAccount(user, (current) => {
        const index = findArticleIndex(current, id);
        const existing = current.contentPlan.items[index];
        const item = normalizePlanItemForWrite(
          {
            ...existing,
            id,
            slug: ensureUniqueArticleSlug(current, existing.slug || existing.keyword || existing.title, id),
            scheduledDate: normalizeIsoDate(payload.scheduledDate, { label: "Scheduled date", fallback: existing.scheduledDate }),
            scheduledTime: normalizeTime(payload.scheduledTime, { label: "Scheduled time", fallback: existing.scheduledTime }),
            status: "scheduled",
            publishedAt: "",
            publishedUrl: "",
          },
          current
        );
        current.contentPlan.items[index] = item;
        current.contentPlan.updatedAt = new Date().toISOString();
        post = publicEditorPost(item);
      });
      sendJson(res, 200, accountMutationResponse(account, { post, posts: activeEditorPosts(account) }));
      return true;
    }

    return false;
  }

  if (section === "settings") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, { ok: true, settings: account.settings });
      return true;
    }

    if (req.method === "PUT" && !child) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        const site = payload.site || {};
        const images = payload.images || {};
        const cms = payload.cms || {};
        const cta = payload.cta || {};
        const cmsProvided = hasOwn(payload, "cms");
        const cmsWebsiteUrl = hasOwn(cms, "websiteUrl")
          ? normalizeOptionalWebUrl(cms.websiteUrl, "CMS website URL")
          : current.settings.cms.websiteUrl;
        const cmsPlatform = hasOwn(cms, "platform")
          ? normalizeEnum(cms.platform, allowedCmsPlatforms, { label: "CMS platform" })
          : current.settings.cms.platform;
        const cmsConfigChanged =
          cmsProvided &&
          (cmsWebsiteUrl !== current.settings.cms.websiteUrl || cmsPlatform !== current.settings.cms.platform);
        const cmsStatus = cmsProvided
          ? cmsPlatform
            ? cmsConfigChanged
              ? "draft-first"
              : current.settings.cms.status || "draft-first"
            : "disconnected"
          : current.settings.cms.status;

        current.settings.site = {
          ...current.settings.site,
          productDescription: hasOwn(site, "productDescription")
            ? normalizeText(site.productDescription)
            : current.settings.site.productDescription,
          targetAudience: hasOwn(site, "targetAudience") ? normalizeText(site.targetAudience) : current.settings.site.targetAudience,
          brandVoice: hasOwn(site, "brandVoice") ? normalizeText(site.brandVoice) : current.settings.site.brandVoice,
          competitors: hasOwn(site, "competitors") ? normalizeText(site.competitors) : current.settings.site.competitors,
          language: hasOwn(site, "language")
            ? normalizeEnum(site.language, allowedSiteLanguages, { label: "Language", fallback: current.settings.site.language || "English" })
            : current.settings.site.language,
          publishingCadence: hasOwn(site, "publishingCadence")
            ? normalizeEnum(site.publishingCadence, allowedPublishingCadences, {
                label: "Publishing cadence",
                fallback: current.settings.site.publishingCadence,
              })
            : current.settings.site.publishingCadence,
          timezone: hasOwn(site, "timezone")
            ? normalizeEnum(site.timezone, allowedSiteTimezones, { label: "Timezone", fallback: current.settings.site.timezone || "America/Los_Angeles" })
            : current.settings.site.timezone,
          defaultPublishTime: hasOwn(site, "defaultPublishTime")
            ? normalizeTime(site.defaultPublishTime, { label: "Default publish time", fallback: current.settings.site.defaultPublishTime || "09:00" })
            : current.settings.site.defaultPublishTime,
          keywords: hasOwn(site, "keywords") ? normalizeArray(site.keywords) : current.settings.site.keywords,
          keywordDraft: hasOwn(site, "keywordDraft") ? normalizeText(site.keywordDraft) : current.settings.site.keywordDraft,
          keywordMix: hasOwn(site, "keywordMix")
            ? normalizeNumber(site.keywordMix, { label: "Keyword mix", fallback: current.settings.site.keywordMix, min: 0, max: 100 })
            : current.settings.site.keywordMix,
        };
        current.settings.images = {
          ...current.settings.images,
          includeImages: hasOwn(images, "includeImages") ? normalizeBoolean(images.includeImages) : current.settings.images.includeImages,
          useProductImages: hasOwn(images, "useProductImages")
            ? normalizeBoolean(images.useProductImages)
            : current.settings.images.useProductImages,
          stylePreset: hasOwn(images, "stylePreset")
            ? normalizeEnum(images.stylePreset, allowedImageStylePresets, {
                label: "Image style preset",
                fallback: current.settings.images.stylePreset || "editorial",
              })
            : current.settings.images.stylePreset,
          aspectRatio: hasOwn(images, "aspectRatio")
            ? normalizeEnum(images.aspectRatio, allowedImageAspectRatios, { label: "Image aspect ratio", fallback: current.settings.images.aspectRatio || "16:9" })
            : current.settings.images.aspectRatio,
          imageCadence: hasOwn(images, "imageCadence")
            ? normalizeEnum(images.imageCadence, allowedImageCadences, { label: "Image cadence", fallback: current.settings.images.imageCadence || "featured-only" })
            : current.settings.images.imageCadence,
          visualStyle: hasOwn(images, "visualStyle") ? normalizeText(images.visualStyle) : current.settings.images.visualStyle,
          useCustomGuidelines: hasOwn(images, "useCustomGuidelines")
            ? normalizeBoolean(images.useCustomGuidelines)
            : current.settings.images.useCustomGuidelines,
          guidelines: hasOwn(images, "guidelines") ? normalizeText(images.guidelines) : current.settings.images.guidelines,
        };
        current.settings.cms = {
          ...current.settings.cms,
          websiteUrl: cmsWebsiteUrl,
          platform: cmsPlatform,
          blogTarget: hasOwn(cms, "blogTarget") ? normalizeText(cms.blogTarget) : current.settings.cms.blogTarget,
          collectionName: hasOwn(cms, "collectionName") ? normalizeText(cms.collectionName) : current.settings.cms.collectionName,
          status: cmsStatus,
          draftFirst: cmsProvided ? true : current.settings.cms.draftFirst,
          hasCredentials: cmsConfigChanged ? false : current.settings.cms.hasCredentials,
          lastConnectedAt: cmsConfigChanged ? "" : current.settings.cms.lastConnectedAt,
          lastError: cmsConfigChanged ? "" : current.settings.cms.lastError,
        };
        current.settings.cta = {
          ...current.settings.cta,
          enabled: hasOwn(cta, "enabled") ? normalizeBoolean(cta.enabled) : current.settings.cta.enabled,
          label: hasOwn(cta, "label") ? normalizeText(cta.label) : current.settings.cta.label,
          text: hasOwn(cta, "text") ? normalizeText(cta.text) : current.settings.cta.text,
          url: hasOwn(cta, "url") ? normalizeOptionalWebUrl(cta.url, "CTA URL") : current.settings.cta.url,
          placement: hasOwn(cta, "placement")
            ? normalizeEnum(cta.placement, allowedCtaPlacements, { label: "CTA placement", fallback: current.settings.cta.placement || "end" })
            : current.settings.cta.placement,
          style: hasOwn(cta, "style")
            ? normalizeEnum(cta.style, allowedCtaStyles, { label: "CTA style", fallback: current.settings.cta.style || "button" })
            : current.settings.cta.style,
          openInNewTab: hasOwn(cta, "openInNewTab") ? normalizeBoolean(cta.openInNewTab) : current.settings.cta.openInNewTab,
          trackingLabel: hasOwn(cta, "trackingLabel") ? normalizeText(cta.trackingLabel) : current.settings.cta.trackingLabel,
        };
      });
      sendJson(res, 200, accountMutationResponse(account, { settings: account.settings, updatedAt: account.updatedAt }));
      return true;
    }

    if (req.method === "POST" && child === "generate-description" && !id) {
      const account = await mutateAccount(user, (current) => {
        current.settings.site.productDescription = buildSiteDescription(current);
      });
      sendJson(res, 200, accountMutationResponse(account, { settings: account.settings, updatedAt: account.updatedAt }));
      return true;
    }
  }

  if (section === "images" && req.method === "POST" && child === "test" && !id) {
    const account = await mutateAccount(user, (current) => {
      const prompt = buildImagePrompt(current);
      const testedAt = new Date().toISOString();
      const history = Array.isArray(current.settings.images.promptHistory) ? current.settings.images.promptHistory : [];
      current.settings.images.samplePrompt = prompt;
      current.settings.images.samplePreview = buildImagePreview(current, prompt, testedAt);
      current.settings.images.lastTestedAt = testedAt;
      current.settings.images.promptHistory = [
        ...history,
        {
          id: `prompt-${Date.now().toString(36)}`,
          prompt,
          createdAt: testedAt,
          stylePreset: current.settings.images.stylePreset || "editorial",
          aspectRatio: current.settings.images.aspectRatio || "16:9",
          imageCadence: current.settings.images.imageCadence || "featured-only",
        },
      ].slice(-10);
    });
    sendJson(res, 200, accountMutationResponse(account, { images: account.settings.images, settings: account.settings }));
    return true;
  }

  if (section === "images" && req.method === "DELETE" && child === "test-history" && !id) {
    const account = await mutateAccount(user, (current) => {
      current.settings.images.samplePrompt = "";
      current.settings.images.samplePreview = {};
      current.settings.images.lastTestedAt = "";
      current.settings.images.promptHistory = [];
    });
    sendJson(res, 200, accountMutationResponse(account, { images: account.settings.images, settings: account.settings }));
    return true;
  }

  if (section === "content-plan") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, { ok: true, contentPlan: publicContentPlan(account.contentPlan) });
      return true;
    }

    if (req.method === "PUT" && child === "strategy" && !id) {
      const payload = await readRequestJson(req);
      const strategy = normalizeText(payload.strategy);
      if (!strategy) throw authError("Content strategy is required.", 400);
      const account = await mutateAccount(user, (current) => {
        current.contentPlan.strategy = strategy;
        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { contentPlan: publicContentPlan(account.contentPlan) }));
      return true;
    }

    if (req.method === "POST" && child === "bulk-schedule" && !id) {
      const payload = await readRequestJson(req);
      const count = Number(payload.count ?? 6);
      const frequencyDays = Number(payload.frequencyDays ?? 2);
      if (!Number.isFinite(count) || count < 1 || count > 24) throw authError("Bulk schedule count must be between 1 and 24.", 400);
      if (!Number.isFinite(frequencyDays) || frequencyDays < 1 || frequencyDays > 14) throw authError("Bulk schedule frequency must be between 1 and 14 days.", 400);
      const startDateText = hasOwn(payload, "startDate")
        ? normalizeIsoDate(payload.startDate, { label: "Bulk schedule start date" })
        : nextScheduledDate(await readAccount(user));
      const startDate = new Date(`${startDateText}T00:00:00`);
      const account = await mutateAccount(user, (current) => {
        let cursor = new Date(startDate);
        let scheduled = 0;
        const candidates = current.topics.filter((topic) => !topic.added);

        while (scheduled < count) {
          const topic = candidates[scheduled] || normalizeTopic({
            title: `Planned article ${current.contentPlan.items.length + scheduled + 1}`,
            keyword: current.settings.site.keywords[scheduled % Math.max(current.settings.site.keywords.length, 1)] || "content marketing",
            volume: 0,
            difficulty: "Needs research",
            added: true,
          });

          topic.added = true;
          current.contentPlan.items.push(
            normalizePublishablePlanItemForWrite(
              {
                title: topic.title,
                keyword: topic.keyword,
                volume: topic.volume,
                difficulty: topic.difficulty,
                estimatedVisits: Math.round(Number(topic.volume || 0) * 0.11),
                scheduledDate: cursor.toISOString().slice(0, 10),
                status: normalizeText(payload.status, "scheduled"),
              },
              current
            )
          );
          scheduled += 1;
          cursor = new Date(cursor.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
        }

        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { topics: account.topics, contentPlan: publicContentPlan(account.contentPlan) }));
      return true;
    }

    if (req.method === "POST" && child === "bulk-update" && !id) {
      const payload = await readRequestJson(req);
      const ids = Array.isArray(payload.ids) ? payload.ids.map((value) => normalizeText(value)).filter(Boolean) : [];
      if (!ids.length) throw authError("Select at least one content item.", 400);
      const status = normalizeText(payload.status, "draft").toLowerCase();
      if (!allowedContentStatuses.has(status)) throw authError("Bulk status is not supported.", 400);
      const account = await mutateAccount(user, (current) => {
        const selectedIds = new Set(ids);
        let updated = 0;
        current.contentPlan.items = current.contentPlan.items.map((item) => {
          if (!selectedIds.has(item.id)) return item;
          updated += 1;
          return normalizePublishablePlanItemForWrite({ ...item, status }, current);
        });
        if (!updated) throw authError("Selected content items were not found.", 404);
        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { contentPlan: publicContentPlan(account.contentPlan) }));
      return true;
    }

    if (req.method === "POST" && child === "items" && !id) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        current.contentPlan.items.push(normalizePublishablePlanItemForWrite(payload, current));
        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { contentPlan: publicContentPlan(account.contentPlan) }));
      return true;
    }

    if (req.method === "GET" && child === "items" && id && !parts[5]) {
      const account = await readAccount(user);
      const item = account.contentPlan.items.find((candidate) => candidate.id === id);
      if (!item) throw authError("Content item not found.", 404);
      sendJson(res, 200, { ok: true, item: publicPlanItem(item) });
      return true;
    }

    if ((req.method === "PUT" || req.method === "DELETE") && child === "items" && id && !parts[5]) {
      const payload = req.method === "PUT" ? await readRequestJson(req) : {};
      const account = await mutateAccount(user, (current) => {
        const index = current.contentPlan.items.findIndex((item) => item.id === id);
        if (index === -1) throw authError("Content item not found.", 404);

        if (req.method === "DELETE") {
          current.contentPlan.items.splice(index, 1);
        } else if (req.method === "PUT") {
          current.contentPlan.items[index] = normalizePublishablePlanItemForWrite({ ...current.contentPlan.items[index], ...payload, id }, current);
        }
        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { contentPlan: publicContentPlan(account.contentPlan) }));
      return true;
    }

    if (child === "items" && id && parts[5] === "generate" && req.method === "POST" && !parts[6]) {
      const account = await mutateAccount(user, (current) => {
        const index = current.contentPlan.items.findIndex((item) => item.id === id);
        if (index === -1) throw authError("Content item not found.", 404);
        const existing = current.contentPlan.items[index];
        current.contentPlan.items[index] = normalizePublishablePlanItemForWrite(
          {
            ...buildArticleDraft(current, existing),
            status: existing.status === "published" ? "published" : "draft",
            publishedAt: existing.publishedAt,
          },
          current
        );
        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { contentPlan: publicContentPlan(account.contentPlan) }));
      return true;
    }

    if (child === "items" && id && parts[5] === "publish" && req.method === "POST" && !parts[6]) {
      const account = await mutateAccount(user, (current) => {
        const index = current.contentPlan.items.findIndex((item) => item.id === id);
        if (index === -1) throw authError("Content item not found.", 404);
        const item = current.contentPlan.items[index];

        if (!item.body) {
          current.contentPlan.items[index] = normalizePlanItem(buildArticleDraft(current, item), current);
        }

        if (current.settings.cms.status === "connected") {
          assertPublishableArticle(current.contentPlan.items[index]);
        }

        current.contentPlan.items[index] = normalizePublishablePlanItemForWrite(
          {
            ...current.contentPlan.items[index],
            status: current.settings.cms.status === "connected" ? "published" : "draft",
            publishedAt: current.settings.cms.status === "connected" ? new Date().toISOString() : "",
          },
          current
        );
        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { contentPlan: publicContentPlan(account.contentPlan), cmsStatus: account.settings.cms.status }));
      return true;
    }
  }

  if (section === "topics") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, accountMutationResponse(account, { topics: account.topics }));
      return true;
    }

    if (req.method === "POST" && !child) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        current.topics.unshift(normalizeTopic(payload));
      });
      sendJson(res, 200, accountMutationResponse(account, { topics: account.topics }));
      return true;
    }

    if (req.method === "POST" && child === "search" && !id) {
      const payload = await readRequestJson(req);
      const account = await readAccount(user);
      sendJson(res, 200, { ok: true, ...filteredTopics(account, payload) });
      return true;
    }

    if (req.method === "POST" && child === "export" && !id) {
      const payload = await readRequestJson(req);
      const account = await readAccount(user);
      sendJson(res, 200, { ok: true, ...buildKeywordExport(account, payload) });
      return true;
    }

    if (req.method === "POST" && child === "save-keywords" && !id) {
      const payload = await readRequestJson(req);
      const ids = new Set(Array.isArray(payload.topicIds) ? payload.topicIds.map((value) => normalizeText(value)).filter(Boolean) : []);
      const directKeywords = normalizeArray(payload.keywords || []);
      const account = await mutateAccount(user, (current) => {
        const selectedKeywords = current.topics
          .filter((topic) => ids.has(topic.id))
          .map((topic) => topic.keyword || topic.title)
          .concat(directKeywords)
          .map((keyword) => normalizeText(keyword))
          .filter(Boolean);
        if (!selectedKeywords.length) throw authError("Select at least one keyword to save.", 400);
        current.settings.site.keywords = Array.from(new Set([...(current.settings.site.keywords || []), ...selectedKeywords]));
        current.settings.site.keywordDraft = "";
      });
      sendJson(res, 200, accountMutationResponse(account, { settings: account.settings, topics: account.topics }));
      return true;
    }

    if (req.method === "PUT" && child && !id) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        const index = current.topics.findIndex((topic) => topic.id === child);
        if (index === -1) throw authError("Topic not found.", 404);
        current.topics[index] = normalizeTopic({ ...current.topics[index], ...payload, id: child });
      });
      sendJson(res, 200, accountMutationResponse(account, { topics: account.topics }));
      return true;
    }

    if (req.method === "POST" && child && id === "add" && !parts[5]) {
      const account = await mutateAccount(user, (current) => {
        const topic = current.topics.find((candidate) => candidate.id === child);
        if (!topic) throw authError("Topic not found.", 404);
        if (topic.added) throw authError("Topic is already in the content plan.", 409);
        topic.added = true;
        current.contentPlan.items.push(
          normalizePlanItemForWrite(
            {
              title: topic.title,
              keyword: topic.keyword,
              volume: topic.volume,
              difficulty: topic.difficulty,
              estimatedVisits: Math.round(Number(topic.volume || 0) * 0.11),
              status: "scheduled",
            },
            current
          )
        );
        current.contentPlan.updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, accountMutationResponse(account, { topics: account.topics, contentPlan: publicContentPlan(account.contentPlan) }));
      return true;
    }

    if (req.method === "DELETE" && child && !id) {
      const account = await mutateAccount(user, (current) => {
        const index = current.topics.findIndex((topic) => topic.id === child);
        if (index === -1) throw authError("Topic not found.", 404);
        current.topics.splice(index, 1);
      });
      sendJson(res, 200, accountMutationResponse(account, { topics: account.topics }));
      return true;
    }
  }

  if (section === "write-draft") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, accountMutationResponse(account, { writeDraft: account.writeDraft }));
      return true;
    }

    if (req.method === "PUT" && !child) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        current.writeDraft = normalizeWriteDraft(payload, current.writeDraft);
      });
      sendJson(res, 200, accountMutationResponse(account, { writeDraft: account.writeDraft }));
      return true;
    }

    if (req.method === "POST" && child === "preview" && !id) {
      const account = await mutateAccount(user, (current) => {
        current.writeDraft.preview = buildWriteDraftPreview(current);
        current.writeDraft.previewStatus = "provider-pending";
        current.writeDraft.previewSource = "local-brief";
        current.writeDraft.previewedAt = new Date().toISOString();
        current.writeDraft.status = "previewed";
        current.writeDraft.readiness = buildArticleReadiness(current.writeDraft);
      });
      sendJson(res, 200, accountMutationResponse(account, { writeDraft: account.writeDraft }));
      return true;
    }
  }

  if (section === "products") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, accountMutationResponse(account, { products: account.products }));
      return true;
    }

    if (req.method === "POST" && !child) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        current.products.push(normalizeProduct(payload));
      });
      sendJson(res, 200, accountMutationResponse(account, { products: account.products }));
      return true;
    }

    if ((req.method === "PUT" || req.method === "DELETE") && child && !id) {
      const payload = req.method === "PUT" ? await readRequestJson(req) : {};
      const account = await mutateAccount(user, (current) => {
        const index = current.products.findIndex((item) => item.id === child);
        if (index === -1) throw authError("Product not found.", 404);
        if (req.method === "DELETE") current.products.splice(index, 1);
        if (req.method === "PUT") current.products[index] = normalizeProduct({ ...current.products[index], ...payload, id: child });
      });
      sendJson(res, 200, accountMutationResponse(account, { products: account.products }));
      return true;
    }
  }

  if (section === "locations") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, accountMutationResponse(account, { locations: account.locations }));
      return true;
    }

    if (req.method === "POST" && !child) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        const nextLocation = normalizeLocation(payload);
        if (nextLocation.isPrimary) current.locations.forEach((location) => (location.isPrimary = false));
        current.locations.push(nextLocation);
      });
      sendJson(res, 200, accountMutationResponse(account, { locations: account.locations }));
      return true;
    }

    if ((req.method === "PUT" || req.method === "DELETE") && child && !id) {
      const payload = req.method === "PUT" ? await readRequestJson(req) : {};
      const account = await mutateAccount(user, (current) => {
        const index = current.locations.findIndex((item) => item.id === child);
        if (index === -1) throw authError("Location not found.", 404);
        if (req.method === "DELETE") current.locations.splice(index, 1);
        if (req.method === "PUT") {
          const nextLocation = normalizeLocation({ ...current.locations[index], ...payload, id: child });
          if (nextLocation.isPrimary) current.locations.forEach((location) => (location.isPrimary = false));
          current.locations[index] = nextLocation;
        }
      });
      sendJson(res, 200, accountMutationResponse(account, { locations: account.locations }));
      return true;
    }
  }

  if (section === "inventory-feed") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, { ok: true, inventoryFeed: account.inventoryFeed });
      return true;
    }

    if (req.method === "POST" && child === "connect" && !id) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        const retailerName = Object.prototype.hasOwnProperty.call(payload, "retailerName")
          ? normalizeText(payload.retailerName)
          : normalizeText(current.inventoryFeed.retailerName);
        const accountId = Object.prototype.hasOwnProperty.call(payload, "accountId")
          ? normalizeText(payload.accountId)
          : normalizeText(current.inventoryFeed.accountId);
        const secretValue = normalizeText(payload.secret || payload.apiKey || payload.token);

        if (hasBlockedAccountCopy([retailerName, accountId].join(" "))) {
          current.inventoryFeed = {
            ...current.inventoryFeed,
            retailerName: "",
            accountId: "",
            status: "disconnected",
            hasCredentials: false,
            lastConnectedAt: "",
            lastSyncedAt: "",
            lastError: "",
          };
          current.products = current.products.filter((product) => product.source !== "inventory-feed" && !productHasBlockedAccountCopy(product));
          throw authError("That inventory connection is not allowed for this account.", 400);
        }

        if (!retailerName || !accountId) {
          current.inventoryFeed = {
            ...current.inventoryFeed,
            retailerName,
            accountId,
            status: "missing-config",
            hasCredentials: current.inventoryFeed.hasCredentials,
            lastError: "Feed name and account id are required before connecting inventory.",
          };
          throw authError(current.inventoryFeed.lastError, 400);
        }

        current.inventoryFeed = {
          ...current.inventoryFeed,
          retailerName,
          accountId,
          status: "connected",
          hasCredentials: Boolean(secretValue) || current.inventoryFeed.hasCredentials,
          lastConnectedAt: new Date().toISOString(),
          lastError: "",
        };
      });
      sendJson(res, 200, accountMutationResponse(account, { inventoryFeed: account.inventoryFeed }));
      return true;
    }

    if (req.method === "POST" && child === "sync" && !id) {
      const account = await mutateAccount(user, (current) => {
        if (current.inventoryFeed.status !== "connected") {
          current.inventoryFeed.lastError = "Connect inventory before syncing products.";
          throw authError(current.inventoryFeed.lastError, 400);
        }

        const synced = buildInventoryFeedProducts(current);
        current.products = [
          ...current.products.filter((product) => product.source !== "inventory-feed"),
          ...synced,
        ];
        current.inventoryFeed.lastSyncedAt = new Date().toISOString();
        current.inventoryFeed.lastError = "";
      });
      sendJson(res, 200, accountMutationResponse(account, { inventoryFeed: account.inventoryFeed, products: account.products }));
      return true;
    }

    if (req.method === "POST" && child === "disconnect" && !id) {
      const account = await mutateAccount(user, (current) => {
        current.inventoryFeed = {
          ...current.inventoryFeed,
          status: "disconnected",
          hasCredentials: false,
          lastError: "",
        };
      });
      sendJson(res, 200, accountMutationResponse(account, { inventoryFeed: account.inventoryFeed }));
      return true;
    }

    return false;
  }

  if (section === "cms" && req.method === "POST" && child === "test" && !id) {
    const account = await mutateAccount(user, (current) => {
      current.settings.cms.lastTestedAt = new Date().toISOString();
      current.settings.cms.lastError =
        current.settings.cms.platform && current.settings.cms.websiteUrl
          ? ""
          : "Choose a website platform and website URL before testing the connection.";
      if (current.settings.cms.lastError) throw authError(current.settings.cms.lastError, 400);
    });
    const testResult = buildCmsTestResult(account.settings.cms);
    sendJson(res, 200, accountMutationResponse(account, {
      cms: account.settings.cms,
      status: testResult.status,
      testResult,
      message: "CMS draft-first setup is ready locally. Real provider validation and publishing remain pending.",
    }));
    return true;
  }

  if (section === "cms" && req.method === "POST" && child === "connect" && !id) {
    const payload = await readRequestJson(req);
    const account = await mutateAccount(user, (current) => {
      const websiteUrl = hasOwn(payload, "websiteUrl")
        ? normalizeOptionalWebUrl(payload.websiteUrl, "CMS website URL")
        : normalizeOptionalWebUrl(current.settings.cms.websiteUrl, "CMS website URL");
      const platform = hasOwn(payload, "platform")
        ? normalizeEnum(payload.platform, allowedCmsPlatforms, { label: "CMS platform" })
        : normalizeText(current.settings.cms.platform);
      const username = normalizeText(payload.username, current.settings.cms.username);
      const blogTarget = normalizeText(payload.blogTarget, current.settings.cms.blogTarget);
      const collectionName = normalizeText(payload.collectionName, current.settings.cms.collectionName);
      const secretValue = normalizeText(payload.secret || payload.password || payload.token);

      if (!websiteUrl || !platform) {
        current.settings.cms = {
          ...current.settings.cms,
          websiteUrl,
          platform,
          username,
          blogTarget,
          collectionName,
          status: "missing-config",
          hasCredentials: current.settings.cms.hasCredentials,
          draftFirst: payload.draftFirst !== false,
          lastError: "Website URL and platform are required before connecting.",
        };
        throw authError(current.settings.cms.lastError, 400);
      }

      current.settings.cms = {
        ...current.settings.cms,
        websiteUrl,
        platform,
        username,
        blogTarget,
        collectionName,
        status: "connected",
        hasCredentials: Boolean(secretValue) || current.settings.cms.hasCredentials,
        draftFirst: payload.draftFirst !== false,
        lastConnectedAt: new Date().toISOString(),
        lastError: "",
      };
    });
    sendJson(res, 200, accountMutationResponse(account, { cms: account.settings.cms }));
    return true;
  }

  if (section === "cms" && req.method === "POST" && child === "disconnect" && !id) {
    const account = await mutateAccount(user, (current) => {
      current.settings.cms = {
        ...current.settings.cms,
        status: "disconnected",
        hasCredentials: false,
        username: "",
        lastError: "",
      };
    });
    sendJson(res, 200, accountMutationResponse(account, { cms: account.settings.cms }));
    return true;
  }

  if (section === "invites") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, { ok: true, invites: account.invites });
      return true;
    }

    if (req.method === "POST" && !child) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        const invite = normalizeInvite(payload, req);
        current.invites.unshift(invite);
        addAccountActivity(current, {
          type: "invite_created",
          label: "Invite created",
          targetEmail: invite.email,
          actorEmail: user.email,
          role: invite.role,
        });
      });
      sendJson(res, 200, accountMutationResponse(account, { invites: account.invites }));
      return true;
    }

    if (req.method === "DELETE" && child && !id) {
      const account = await mutateAccount(user, (current) => {
        const index = current.invites.findIndex((invite) => invite.id === child);
        if (index === -1) throw authError("Invite not found.", 404);
        const invite = current.invites[index];
        current.invites = current.invites.filter((invite) => invite.id !== child);
        addAccountActivity(current, {
          type: "invite_revoked",
          label: "Invite revoked",
          targetEmail: invite.email,
          actorEmail: user.email,
          role: invite.role,
        });
      });
      sendJson(res, 200, accountMutationResponse(account, { invites: account.invites }));
      return true;
    }
  }

  if (section === "members") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, { ok: true, members: account.members });
      return true;
    }

    if (req.method === "PUT" && child && !id) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        const index = current.members.findIndex((member) => member.id === child);
        if (index === -1) throw authError("Member not found.", 404);
        const role = normalizeEnum(payload.role, allowedInviteRoles, { label: "Member role" });
        current.members[index] = {
          ...current.members[index],
          role,
          roleUpdatedAt: new Date().toISOString(),
          roleUpdatedBy: user.email,
        };
        addAccountActivity(current, {
          type: "member_role_updated",
          label: `Role changed to ${role}`,
          targetEmail: current.members[index].email,
          actorEmail: user.email,
          role,
        });
      });
      sendJson(res, 200, accountMutationResponse(account, { members: account.members }));
      return true;
    }

    if (req.method === "DELETE" && child && !id) {
      const account = await mutateAccount(user, (current) => {
        const index = current.members.findIndex((member) => member.id === child);
        if (index === -1) throw authError("Member not found.", 404);
        const member = current.members[index];
        current.members = current.members.filter((member) => member.id !== child);
        addAccountActivity(current, {
          type: "member_removed",
          label: "Member removed",
          targetEmail: member.email,
          actorEmail: user.email,
          role: member.role,
        });
      });
      sendJson(res, 200, accountMutationResponse(account, { members: account.members }));
      return true;
    }
  }

  if (section === "support") {
    if (req.method === "GET" && !child) {
      const account = await readAccount(user);
      sendJson(res, 200, accountMutationResponse(account, { supportTickets: account.supportTickets }));
      return true;
    }

    if (req.method === "POST" && !child) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        current.supportTickets.unshift(normalizeSupportTicket(payload, user));
      });
      sendJson(res, 200, accountMutationResponse(account, { supportTickets: account.supportTickets }));
      return true;
    }

    if (req.method === "PUT" && child && !id) {
      const payload = await readRequestJson(req);
      const account = await mutateAccount(user, (current) => {
        const index = current.supportTickets.findIndex((ticket) => ticket.id === child);
        if (index === -1) throw authError("Support ticket not found.", 404);

        const status = normalizeText(payload.status, current.supportTickets[index].status);
        if (!allowedSupportTicketStatuses.has(status)) throw authError("Support ticket status is not supported.", 400);

        const reply = normalizeText(payload.reply);
        const replies = Array.isArray(current.supportTickets[index].replies) ? current.supportTickets[index].replies : [];
        const nextReplies = reply ? [...replies, normalizeSupportReply({ message: reply }, user)] : replies;
        current.supportTickets[index] = {
          ...current.supportTickets[index],
          status,
          replies: nextReplies,
          updatedAt: new Date().toISOString(),
          resolvedAt: status === "resolved" ? new Date().toISOString() : "",
        };
      });
      sendJson(res, 200, accountMutationResponse(account, { supportTickets: account.supportTickets }));
      return true;
    }
  }

  if (req.method === "GET" && section === "billing" && !child) {
    const account = await readAccount(user);
    sendJson(res, 200, accountMutationResponse(account, { billing: account.billing }));
    return true;
  }

  if (section === "billing" && req.method === "PUT" && !child) {
    const payload = await readRequestJson(req);
    const account = await mutateAccount(user, (current) => {
      const plan = normalizeText(payload.plan, current.billing.plan);
      const billingPeriod = normalizeText(payload.billingPeriod, current.billing.billingPeriod);
      if (!allowedBillingPlans.has(plan)) throw authError("Billing plan is not supported.", 400);
      if (!allowedBillingPeriods.has(billingPeriod)) throw authError("Billing period is not supported.", 400);
      current.billing = {
        ...current.billing,
        plan,
        billingPeriod,
        status: normalizeEnum(payload.status, allowedBillingStatuses, { label: "Billing status", fallback: current.billing.status }),
        paymentMethod: normalizeText(payload.paymentMethod, current.billing.paymentMethod),
      };
      current.billing.price =
        current.billing.plan === "Pro+"
          ? current.billing.billingPeriod === "annual"
            ? "$69/mo annual"
            : "$99/mo monthly"
          : current.billing.billingPeriod === "annual"
            ? "$49/mo annual"
            : "$79/mo monthly";
    });
    sendJson(res, 200, accountMutationResponse(account, { billing: account.billing }));
    return true;
  }

  if (section === "billing" && req.method === "POST" && child === "checkout" && !id) {
    const payload = await readRequestJson(req);
    const account = await mutateAccount(user, (current) => {
      const plan = normalizeText(payload.plan, current.billing.plan);
      const billingPeriod = normalizeText(payload.billingPeriod, current.billing.billingPeriod);
      if (!allowedBillingPlans.has(plan)) throw authError("Billing plan is not supported.", 400);
      if (!allowedBillingPeriods.has(billingPeriod)) throw authError("Billing period is not supported.", 400);
      current.billing.plan = plan;
      current.billing.billingPeriod = billingPeriod;
      current.billing.status = "active";
      current.billing.trialEndsAt = current.billing.trialEndsAt || isoDateDaysFromNow(3);
      current.billing.portalStatus = "local-checkout";
      current.billing.paymentMethod = current.billing.paymentMethod || "Payment method pending";
      current.billing.failedPayment = { reason: "", retryAt: "", recordedAt: "" };
      current.billing.price =
        current.billing.plan === "Pro+"
          ? current.billing.billingPeriod === "annual"
            ? "$69/mo annual"
            : "$99/mo monthly"
          : current.billing.billingPeriod === "annual"
            ? "$49/mo annual"
            : "$79/mo monthly";
      current.billing.invoices.unshift({
        id: createId("invoice"),
        date: new Date().toISOString().slice(0, 10),
        plan: current.billing.plan,
        amount: current.billing.price,
        status: "local",
      });
    });
    sendJson(res, 200, accountMutationResponse(account, { billing: account.billing, portalUrl: "" }));
    return true;
  }

  if (section === "billing" && req.method === "GET" && child === "invoices" && id && !parts[5]) {
    const account = await readAccount(user);
    const invoice = (account.billing.invoices || []).find((candidate) => candidate.id === id);
    if (!invoice) throw authError("Invoice not found.", 404);
    sendJson(res, 200, { ok: true, invoice });
    return true;
  }

  if (section === "billing" && req.method === "POST" && child === "portal" && !id) {
    const createdAt = new Date();
    const account = await mutateAccount(user, (current) => {
      current.billing.portalStatus = "local-portal-opened";
      current.billing.lastPortalOpenedAt = createdAt.toISOString();
    });
    sendJson(res, 200, accountMutationResponse(account, {
      billing: account.billing,
      portalUrl: "/account?view=billing&portal=local",
      portalSession: {
        id: createId("portal"),
        mode: "local",
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(createdAt.getTime() + 30 * 60 * 1000).toISOString(),
      },
    }));
    return true;
  }

  if (section === "billing" && req.method === "POST" && child === "payment-failed" && !id) {
    const payload = await readRequestJson(req);
    const recordedAt = new Date();
    const reason = normalizeText(payload.reason, "Payment method was declined.");
    const retryAt = normalizeIsoDate(payload.retryAt, { label: "Retry date" }) || new Date(recordedAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const account = await mutateAccount(user, (current) => {
      const invoiceId = createId("invoice");
      current.billing.status = "past_due";
      current.billing.portalStatus = "payment-failed";
      current.billing.failedPayment = {
        reason,
        retryAt,
        recordedAt: recordedAt.toISOString(),
      };
      current.billing.invoices.unshift({
        id: invoiceId,
        date: recordedAt.toISOString().slice(0, 10),
        plan: current.billing.plan,
        amount: current.billing.price,
        status: "failed",
        failureReason: reason,
        hostedInvoiceUrl: `/account?view=billing&invoice=${invoiceId}`,
      });
    });
    sendJson(res, 200, accountMutationResponse(account, { billing: account.billing }));
    return true;
  }

  if (section === "billing" && req.method === "POST" && child === "cancel" && !id) {
    const account = await mutateAccount(user, (current) => {
      current.billing.status = "cancelled";
      current.billing.portalStatus = "local-cancelled";
    });
    sendJson(res, 200, accountMutationResponse(account, { billing: account.billing }));
    return true;
  }

  if (section === "billing" && req.method === "POST" && child === "reactivate" && !id) {
    const account = await mutateAccount(user, (current) => {
      current.billing.status = "active";
      current.billing.portalStatus = "local-reactivated";
      current.billing.failedPayment = { reason: "", retryAt: "", recordedAt: "" };
    });
    sendJson(res, 200, accountMutationResponse(account, { billing: account.billing }));
    return true;
  }

  if (req.method === "GET" && section === "search-console" && !child) {
    const account = await readAccount(user);
    const requestedRange = url.searchParams.get("range");
    const searchConsole =
      requestedRange && account.searchConsole.status === "connected" && account.searchConsole.propertyUrl
        ? buildSearchConsoleSnapshot(account, account.searchConsole.propertyUrl, { dateRange: requestedRange })
        : account.searchConsole;
    sendJson(res, 200, accountMutationResponse(account, { searchConsole }));
    return true;
  }

  if (req.method === "GET" && section === "search-console" && child === "export" && !id) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, ...buildSearchConsoleExport(account) });
    return true;
  }

  if (section === "search-console" && req.method === "POST" && child === "connect" && !id) {
    const payload = await readRequestJson(req);
    const account = await mutateAccount(user, (current) => {
      const submittedProperty = Object.prototype.hasOwnProperty.call(payload, "propertyUrl");
      const propertyUrl = submittedProperty
        ? normalizeOptionalWebUrl(payload.propertyUrl, "Search Console property URL")
        : normalizeOptionalWebUrl(current.searchConsole.propertyUrl || current.settings.cms.websiteUrl, "Search Console property URL");
      if (!propertyUrl) {
        current.searchConsole = {
          ...current.searchConsole,
          status: "missing-property",
          propertyUrl: "",
          lastError: "Search Console property URL is required before connecting.",
        };
        throw authError(current.searchConsole.lastError, 400);
      }

      const url = propertyUrl;
      current.searchConsole = buildSearchConsoleSnapshot(current, url);
    });
    sendJson(res, 200, accountMutationResponse(account, { searchConsole: account.searchConsole }));
    return true;
  }

  if (section === "search-console" && req.method === "POST" && child === "sync" && !id) {
    const account = await mutateAccount(user, (current) => {
      const url = normalizeText(current.searchConsole.propertyUrl);
      if (current.searchConsole.status !== "connected" || !url) {
        throw authError("Connect Search Console before syncing.", 400);
      }
      current.searchConsole = buildSearchConsoleSnapshot(current, url, { dateRange: current.searchConsole.dateRange });
    });
    sendJson(res, 200, accountMutationResponse(account, { searchConsole: account.searchConsole }));
    return true;
  }

  if (section === "search-console" && req.method === "POST" && child === "disconnect" && !id) {
    const account = await mutateAccount(user, (current) => {
      current.searchConsole = {
        ...current.searchConsole,
        status: "disconnected",
        propertyUrl: "",
        lastSyncedAt: "",
        clicks: 0,
        impressions: 0,
        indexedPages: 0,
        dateRange: "28",
        trend: [],
        topQueries: [],
        topPages: [],
      };
    });
    sendJson(res, 200, accountMutationResponse(account, { searchConsole: account.searchConsole }));
    return true;
  }

  if (req.method === "GET" && section === "rankings" && child === "export" && !id) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, ...buildRankingsExport(account) });
    return true;
  }

  if (req.method === "GET" && section === "rankings" && !child) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, rankings: buildRankingsSnapshot(account, { dateRange: url.searchParams.get("range") }) });
    return true;
  }

  if (req.method === "GET" && section === "ai-mentions" && !child) {
    const account = await readAccount(user);
    sendJson(res, 200, {
      ok: true,
      aiMentions: buildAiMentionsSnapshot(account, {
        source: url.searchParams.get("source"),
        model: url.searchParams.get("model"),
        dateRange: url.searchParams.get("range"),
      }),
    });
    return true;
  }

  if (req.method === "GET" && section === "ai-mentions" && child === "export" && !id) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, ...buildAiMentionsExport(account) });
    return true;
  }

  if (req.method === "GET" && section === "reports" && !child) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, reports: buildReportsSnapshot(account) });
    return true;
  }

  if (req.method === "GET" && section === "reports" && child === "export" && !id) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, ...buildReportsExport(account) });
    return true;
  }

  if (section === "reports" && req.method === "POST" && child === "share" && !id) {
    const payload = await readRequestJson(req);
    const createdAt = new Date().toISOString();
    const shareId = createId("report");
    const account = await mutateAccount(user, (current) => {
      current.reports.template = normalizeEnum(payload.template || current.reports.template || "performance", allowedReportTemplates, { label: "Report template", fallback: "performance" });
      current.reports.sharing = {
        shareId,
        shareUrl: `/reports/${shareId}`,
        shareCreatedAt: createdAt,
      };
    });
    sendJson(res, 200, accountMutationResponse(account, { reports: buildReportsSnapshot(account) }));
    return true;
  }

  if (section === "reports" && req.method === "POST" && child === "schedule" && !id) {
    const payload = await readRequestJson(req);
    const scheduledAt = new Date().toISOString();
    const account = await mutateAccount(user, (current) => {
      const cadence = normalizeEnum(payload.cadence || "weekly", allowedReportCadences, { label: "Report cadence", fallback: "weekly" });
      const template = normalizeEnum(payload.template || current.reports.template || "performance", allowedReportTemplates, { label: "Report template", fallback: "performance" });
      const recipients = normalizeEmailRecipients(payload.recipients, [current.ownerEmail]);
      current.reports.template = template;
      current.reports.schedule = {
        enabled: true,
        cadence,
        template,
        recipients,
        lastScheduledAt: scheduledAt,
      };
    });
    sendJson(res, 200, accountMutationResponse(account, { reports: buildReportsSnapshot(account) }));
    return true;
  }

  if (req.method === "GET" && section === "seo-analysis" && !child) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, seoAnalysis: buildSeoAnalysisSnapshot(account) });
    return true;
  }

  if (req.method === "GET" && section === "seo-analysis" && child === "export" && !id) {
    const account = await readAccount(user);
    sendJson(res, 200, { ok: true, ...buildSeoAnalysisExport(account) });
    return true;
  }

  return false;
}

async function serveApi(req, res, url) {
  if (url.pathname.startsWith("/api/blog/")) {
    return servePublicBlogApi(req, res, url);
  }

  if (url.pathname.startsWith("/api/invite/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const token = parts[2] || "";
    const action = parts[3] || "";

    if (!token) {
      sendJson(res, 404, { ok: false, error: "Invite not found." });
      return true;
    }

    if (req.method === "GET" && !action) {
      const { rawAccount, invite } = await findInviteAccount(token);

      if (!invite) {
        sendJson(res, 404, { ok: false, error: "Invite not found." });
        return true;
      }

      sendJson(res, 200, {
        ok: true,
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          workspaceName: rawAccount.workspaceName || rawAccount.ownerEmail || "sirbloggsalot",
          ownerEmail: rawAccount.ownerEmail,
        },
      });
      return true;
    }

    if (req.method === "POST" && action === "accept" && !parts[4]) {
      const user = await readSessionUser(req);

      if (!user) {
        sendJson(res, 401, { ok: false, error: "Sign in required to accept this invite." });
        return true;
      }

      const { store, accountId, rawAccount, invite } = await findInviteAccount(token);

      if (!invite || !rawAccount) {
        sendJson(res, 404, { ok: false, error: "Invite not found." });
        return true;
      }

      if (invite.status !== "pending" && invite.acceptedBy !== user.id) {
        sendJson(res, 409, { ok: false, error: "This invite has already been used." });
        return true;
      }

      if (normalizeEmail(invite.email) !== normalizeEmail(user.email)) {
        sendJson(res, 403, { ok: false, error: "Sign in with the email address this invite was sent to." });
        return true;
      }

      const account = normalizeAccount(rawAccount, { id: accountId, email: rawAccount.ownerEmail, name: rawAccount.workspaceName });
      const member = normalizeMember(user, { role: invite.role });
      account.members = [...account.members.filter((candidate) => candidate.id !== member.id), member];
      account.invites = account.invites.map((candidate) =>
        candidate.id === token
          ? {
              ...candidate,
              status: "accepted",
              acceptedAt: new Date().toISOString(),
              acceptedBy: user.id,
            }
          : candidate
      );
      addAccountActivity(account, {
        type: "invite_accepted",
        label: "Invite accepted",
        targetEmail: member.email,
        actorEmail: user.email,
        role: member.role,
      });
      account.updatedAt = new Date().toISOString();
      store.accounts[accountId] = account;
      const ownAccount = ensureOwnAccount(store, user);
      ownAccount.ui = { ...(ownAccount.ui || {}), selectedWorkspaceId: accountId };
      await writeAccountStore(store);

      sendJson(res, 200, {
        ok: true,
        member,
        workspaceName: account.workspaceName,
        ownerEmail: account.ownerEmail,
      });
      return true;
    }

    return false;
  }

  if (url.pathname.startsWith("/api/account/")) {
    return serveAccountApi(req, res, url);
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/api/health") {
    const payload = {
      ok: true,
      service: "sirbloggsalot",
      googleAuthEnabled: Boolean(googleClientId),
    };
    if (req.method === "HEAD") {
      send(res, 200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, "");
    } else {
      sendJson(res, 200, payload);
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/config") {
    sendJson(res, 200, {
      ok: true,
      googleAuthEnabled: Boolean(googleClientId),
      googleClientId,
      allowedDomains: googleAllowedDomains,
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/session") {
    const user = await readSessionUser(req);
    sendJson(res, 200, {
      ok: true,
      authenticated: Boolean(user),
      user: publicUser(user),
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/google") {
    const payload = await readRequestJson(req);
    const credential = String(payload.credential || payload.idToken || "").trim();

    if (!credential) {
      sendJson(res, 400, { ok: false, error: "Missing Google credential." });
      return true;
    }

    const googlePayload = await verifyGoogleIdToken(credential);
    const { sessionId, user } = await createSession(googlePayload);

    sendJson(
      res,
      200,
      {
        ok: true,
        user: publicUser(user),
      },
      {
        "set-cookie": cookieHeader(req, encodeSessionCookie(sessionId), Math.floor(sessionTtlMs / 1000)),
      }
    );
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    await deleteSession(req);
    const headers = {
      "set-cookie": cookieHeader(req, "", 0),
    };
    const accept = String(req.headers.accept || "");
    const contentType = String(req.headers["content-type"] || "");
    const wantsHtml = accept.includes("text/html") || contentType.includes("application/x-www-form-urlencoded");
    if (wantsHtml) {
      send(res, 303, { ...headers, location: "/login", "cache-control": "no-store" }, "");
    } else {
      sendJson(res, 200, { ok: true }, headers);
    }
    return true;
  }

  return false;
}

async function serveStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, { "content-type": "text/plain; charset=utf-8" }, "Method not allowed");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let sessionUser = null;
  let sessionChecked = false;
  const getSessionUser = async () => {
    if (!sessionChecked) {
      sessionUser = await readSessionUser(req);
      sessionChecked = true;
    }
    return sessionUser;
  };

  const dashboardAlias = canonicalDashboardRoute(url);
  if (dashboardAlias) {
    send(res, 302, { location: dashboardAlias, "cache-control": "no-store" }, "");
    return;
  }

  if (url.pathname === "/login" || url.pathname === "/signup") {
    const user = await getSessionUser();

    if (user) {
      const next = safeAuthNextPath(url.searchParams.get("next")) || "/account?view=billing";
      send(res, 302, { location: next, "cache-control": "no-store" }, "");
      return;
    }
  }

  if (url.pathname === "/account") {
    const user = await getSessionUser();

    if (!user) {
      send(res, 302, { location: `/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`, "cache-control": "no-store" }, "");
      return;
    }
  }

  if (url.pathname === "/blog" || url.pathname.startsWith("/blog/")) {
    const handled = await servePublicBlogPage(req, res, url);
    if (handled) return;
  }

  if (url.pathname === "/reports") {
    const user = await getSessionUser();
    if (user) {
      send(res, 302, { location: "/account?view=reports", "cache-control": "no-store" }, "");
      return;
    }
  }

  if (url.pathname === "/reports" || url.pathname.startsWith("/reports/")) {
    const handled = await serveSharedReportPage(req, res, url);
    if (handled) return;
  }

  let status = 200;
  let filePath = safeFile(req.url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(root, "index.html");
    status = isKnownAppShellPath(url.pathname) ? 200 : 404;
  }

  let data;
  try {
    data = await fsp.readFile(filePath);
  } catch {
    send(res, 500, { "content-type": "text/plain; charset=utf-8" }, "Server error");
    return;
  }

  const contentType = types[path.extname(filePath)] || "application/octet-stream";
  let body = data;
  if (req.method !== "HEAD" && contentType.includes("text/html")) {
    const user = await getSessionUser();
    body = data.toString("utf8");
    if (user && url.pathname === "/" && path.basename(filePath) === "index.html") {
      body = renderAuthenticatedHomeHtml(body);
    }
    body = personalizeAppShellHtml(body, user);
  }
  send(res, status, { "content-type": contentType, "cache-control": "no-store" }, req.method === "HEAD" ? "" : body);
}

function createServer() {
  return http.createServer((req, res) => {
    (async () => {
      if (!req.url) {
        send(res, 400, { "content-type": "text/plain; charset=utf-8" }, "Bad request");
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

      if (url.pathname.startsWith("/api/")) {
        const handled = await serveApi(req, res, url);

        if (!handled) {
          sendJson(res, 404, { ok: false, error: "Not found." });
        }
        return;
      }

      await serveStatic(req, res);
    })().catch((error) => {
      const status = error.status || 500;
      sendJson(res, status, {
        ok: false,
        error: status === 500 ? "Server error." : error.message,
      });

      if (status >= 500) {
        console.error(error);
      }
    });
  });
}

if (require.main === module) {
  createServer().listen(port, host, () => {
    if (!process.env.SIR_BLOGGS_AUTH_SESSION_SECRET) {
      console.warn("SIR_BLOGGS_AUTH_SESSION_SECRET is not set; local auth sessions reset when the server restarts.");
    }

    console.log(`Sir Bloggsalot local server: http://${host}:${port}`);
  });
}

module.exports = {
  createServer,
  decodeSessionCookie,
  encodeSessionCookie,
  isAllowedGoogleDomain,
  parseCookies,
  publicUser,
  roleForEmail,
};
