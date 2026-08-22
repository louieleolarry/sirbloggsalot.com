const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirbloggs-account-"));
const authStorePath = path.join(tmpDir, "auth.json");
const accountStorePath = path.join(tmpDir, "account.json");
const sessionSecret = "account-api-test-secret";
const sessionId = "session-test";
const signature = crypto.createHmac("sha256", sessionSecret).update(sessionId).digest("base64url");
const cookie = `sirbloggs_session=${encodeURIComponent(`${sessionId}.${signature}`)}`;
const invitedSessionId = "session-invited";
const invitedSignature = crypto.createHmac("sha256", sessionSecret).update(invitedSessionId).digest("base64url");
const invitedCookie = `sirbloggs_session=${encodeURIComponent(`${invitedSessionId}.${invitedSignature}`)}`;
const now = new Date();
const user = {
  id: "google:test-user",
  email: "louieleolarry@gmail.com",
  name: "LouieLeoLarry",
  picture: "",
  role: "admin",
};
const invitedUser = {
  id: "google:invited-user",
  email: "teammate@example.com",
  name: "Team Mate",
  picture: "",
  role: "client",
};
const memberUser = {
  id: "google:member-user",
  email: "readonly@example.com",
  name: "Read Only",
  picture: "",
  role: "client",
};
const memberSessionId = "session-member";
const memberSignature = crypto.createHmac("sha256", sessionSecret).update(memberSessionId).digest("base64url");
const memberCookie = `sirbloggs_session=${encodeURIComponent(`${memberSessionId}.${memberSignature}`)}`;
const htmlLogoutSessionId = "session-html-logout";
const htmlLogoutSignature = crypto.createHmac("sha256", sessionSecret).update(htmlLogoutSessionId).digest("base64url");
const htmlLogoutCookie = `sirbloggs_session=${encodeURIComponent(`${htmlLogoutSessionId}.${htmlLogoutSignature}`)}`;

process.env.SIR_BLOGGS_AUTH_STORE_PATH = authStorePath;
process.env.SIR_BLOGGS_ACCOUNT_STORE_PATH = accountStorePath;
process.env.SIR_BLOGGS_AUTH_SESSION_SECRET = sessionSecret;
process.env.SIR_BLOGGS_PUBLIC_OWNER_EMAIL = user.email;

fs.writeFileSync(
  authStorePath,
  JSON.stringify(
    {
      users: { [user.id]: user, [invitedUser.id]: invitedUser, [memberUser.id]: memberUser },
      sessions: {
        [sessionId]: {
          id: sessionId,
          userId: user.id,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 600000).toISOString(),
        },
        [invitedSessionId]: {
          id: invitedSessionId,
          userId: invitedUser.id,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 600000).toISOString(),
        },
        [memberSessionId]: {
          id: memberSessionId,
          userId: memberUser.id,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 600000).toISOString(),
        },
        [htmlLogoutSessionId]: {
          id: htmlLogoutSessionId,
          userId: user.id,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 600000).toISOString(),
        },
      },
    },
    null,
    2
  )
);

const { createServer } = require("../server");

function request(server, { method = "GET", path: requestPath, body, authenticated = true, cookieValue = cookie, headers = {} }) {
  return new Promise((resolve, reject) => {
    const rawBody = body ? JSON.stringify(body) : "";
    const req = Readable.from(rawBody ? [rawBody] : []);
    req.method = method;
    req.url = requestPath;
    req.headers = {
      host: "sirbloggsalot.com",
      ...(authenticated ? { cookie: cookieValue } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    };

    const res = {
      statusCode: 200,
      headers: {},
      writeHead(status, headers = {}) {
        this.statusCode = status;
        this.headers = headers;
      },
      end(payload = "") {
        const raw = Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload || "");
        let json = null;
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch {}

        resolve({
          status: this.statusCode,
          headers: this.headers,
          json,
          raw,
        });
      },
    };

    const handler = server.listeners("request")[0];
    handler(req, res);
  });
}

function assertHtml(response) {
  assert.strictEqual(response.headers["content-type"], "text/html; charset=utf-8");
  return response.raw;
}

async function assertStaticAppShellStatusRoutes(server) {
  const features = await request(server, { path: "/features", authenticated: false });
  assert.strictEqual(features.status, 200);
  assert.ok(assertHtml(features).includes('data-route-page="features"'));

  const knownCaseStudy = await request(server, { path: "/case-studies/natureva", authenticated: false });
  assert.strictEqual(knownCaseStudy.status, 200);
  assert.ok(assertHtml(knownCaseStudy).includes('data-route-page="case-study"'));

  const unknownCaseStudy = await request(server, { path: "/case-studies/not-real", authenticated: false });
  assert.strictEqual(unknownCaseStudy.status, 404);
  assert.ok(assertHtml(unknownCaseStudy).includes('data-route-page="not-found"'));
}

async function assertMalformedUrlPaths(server) {
  for (const requestPath of ["/api/blog/posts/%", "/blog/%", "/reports/%", "/invite/%", "/%"]) {
    const response = await request(server, { path: requestPath, authenticated: false });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.raw.includes("Server error"), false);
  }
}

/*
Production change this catches: /blog falling back to the static SPA route
instead of rendering published owner posts into crawlable HTML.
*/
async function assertPublicBlogHtmlRoutes(server, publishedItem) {
  const blogIndex = await request(server, {
    path: "/blog",
    authenticated: false,
  });
  assert.strictEqual(blogIndex.status, 200);
  const blogIndexHtml = assertHtml(blogIndex);
  assert.ok(blogIndexHtml.includes(publishedItem.title));
  assert.ok(blogIndexHtml.includes('href="/blog/canva-website-builder"'));
  assert.strictEqual(blogIndexHtml.includes(user.email), false);
  assert.strictEqual(blogIndexHtml.includes("Small business web design pricing"), false);

  const authenticatedBlogIndex = await request(server, {
    path: "/blog",
  });
  assert.strictEqual(authenticatedBlogIndex.status, 200);
  const authenticatedBlogIndexHtml = assertHtml(authenticatedBlogIndex);
  assert.ok(authenticatedBlogIndexHtml.includes('href="/account?view=plan"'));
  assert.ok(authenticatedBlogIndexHtml.includes('action="/api/auth/logout"'));
  assert.ok(authenticatedBlogIndexHtml.includes('method="post"'));
  assert.ok(authenticatedBlogIndexHtml.includes("Log out"));
  assert.strictEqual(authenticatedBlogIndexHtml.includes('href="/login"'), false);
  assert.strictEqual(authenticatedBlogIndexHtml.includes('href="/signup"'), false);

  const blogDetail = await request(server, {
    path: "/blog/canva-website-builder",
    authenticated: false,
  });
  assert.strictEqual(blogDetail.status, 200);
  const blogDetailHtml = assertHtml(blogDetail);
  assert.ok(blogDetailHtml.includes(`<h1>${publishedItem.title}</h1>`));
  assert.ok(blogDetailHtml.includes("Use this article to answer buyer questions"));
  assert.strictEqual(blogDetailHtml.includes(user.email), false);

  const missingPost = await request(server, {
    path: "/blog/small-business-web-design-pricing",
    authenticated: false,
  });
  assert.strictEqual(missingPost.status, 404);
}

async function assertSharedReportHtmlRoutes(server, shareUrl) {
  assert.ok(shareUrl.startsWith("/reports/"));

  const sharedReport = await request(server, {
    path: shareUrl,
    authenticated: false,
  });
  assert.strictEqual(sharedReport.status, 200);
  const sharedReportHtml = assertHtml(sharedReport);
  assert.ok(sharedReportHtml.includes("data-shared-report"));
  assert.ok(sharedReportHtml.includes("Shared Report"));
  assert.ok(sharedReportHtml.includes("Articles"));
  assert.ok(sharedReportHtml.includes('href="/blog/canva-website-builder"'));
  assert.strictEqual(sharedReportHtml.includes(user.email), false);
  assert.strictEqual(sharedReportHtml.includes("secret"), false);

  const authenticatedSharedReport = await request(server, {
    path: shareUrl,
  });
  assert.strictEqual(authenticatedSharedReport.status, 200);
  const authenticatedSharedReportHtml = assertHtml(authenticatedSharedReport);
  assert.ok(authenticatedSharedReportHtml.includes('href="/account?view=plan"'));
  assert.ok(authenticatedSharedReportHtml.includes('action="/api/auth/logout"'));
  assert.ok(authenticatedSharedReportHtml.includes('method="post"'));
  assert.ok(authenticatedSharedReportHtml.includes("Log out"));
  assert.strictEqual(authenticatedSharedReportHtml.includes('href="/login"'), false);
  assert.strictEqual(authenticatedSharedReportHtml.includes('href="/signup"'), false);

  const missingReport = await request(server, {
    path: "/reports/report_missing",
    authenticated: false,
  });
  assert.strictEqual(missingReport.status, 404);

  const originalStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
  const sharedEntry = Object.entries(originalStore.accounts).find(([, account]) => {
    const sharing = account?.reports?.sharing || {};
    return sharing.shareUrl === shareUrl;
  });
  assert.ok(sharedEntry);
  const [accountId] = sharedEntry;
  const mutatedStore = JSON.parse(JSON.stringify(originalStore));
  mutatedStore.accounts[accountId].contentPlan.items = [
    {
      id: "malformed-report-link",
      title: "Malformed report link",
      keyword: "bad path",
      status: "published",
      publishedAt: now.toISOString(),
      publicPath: "/blog/../account",
      estimatedVisits: 1,
    },
    ...(mutatedStore.accounts[accountId].contentPlan.items || []),
  ];
  fs.writeFileSync(accountStorePath, JSON.stringify(mutatedStore, null, 2));

  try {
    const malformedReport = await request(server, {
      path: shareUrl,
      authenticated: false,
    });
    assert.strictEqual(malformedReport.status, 200);
    const malformedReportHtml = assertHtml(malformedReport);
    assert.ok(malformedReportHtml.includes("Malformed report link"));
    assert.strictEqual(malformedReportHtml.includes('href="/blog/../account"'), false);
  } finally {
    fs.writeFileSync(accountStorePath, JSON.stringify(originalStore, null, 2));
  }
}

(async () => {
  const server = createServer();

  try {
    const health = await request(server, { path: "/api/health", authenticated: false });
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.json.ok, true);
    assert.strictEqual(health.json.service, "sirbloggsalot");

    await assertStaticAppShellStatusRoutes(server);
    await assertMalformedUrlPaths(server);

    const healthHead = await request(server, { method: "HEAD", path: "/api/health", authenticated: false });
    assert.strictEqual(healthHead.status, 200);
    assert.strictEqual(healthHead.raw, "");

    const malformedCookieSession = await request(server, {
      path: "/api/auth/session",
      authenticated: false,
      headers: { cookie: "sirbloggs_session=%" },
    });
    assert.strictEqual(malformedCookieSession.status, 200);
    assert.strictEqual(malformedCookieSession.json.authenticated, false);

    const malformedCookieAccount = await request(server, {
      path: "/api/account/summary",
      authenticated: false,
      headers: { cookie: "sirbloggs_session=%" },
    });
    assert.strictEqual(malformedCookieAccount.status, 401);

    const malformedCookieAccountPage = await request(server, {
      path: "/account",
      authenticated: false,
      headers: { cookie: "sirbloggs_session=%" },
    });
    assert.strictEqual(malformedCookieAccountPage.status, 302);
    assert.strictEqual(malformedCookieAccountPage.headers.location, "/login?next=%2Faccount");

    assert.strictEqual((await request(server, { path: "/api/account/summary", authenticated: false })).status, 401);

    const loggedOutAccountDeepLink = await request(server, {
      path: "/account?view=billing&tab=site",
      authenticated: false,
    });
    assert.strictEqual(loggedOutAccountDeepLink.status, 302);
    assert.strictEqual(loggedOutAccountDeepLink.headers.location, "/login?next=%2Faccount%3Fview%3Dbilling%26tab%3Dsite");

    const htmlLogout = await request(server, {
      method: "POST",
      path: "/api/auth/logout",
      cookieValue: htmlLogoutCookie,
      headers: { accept: "text/html" },
    });
    assert.strictEqual(htmlLogout.status, 303);
    assert.strictEqual(htmlLogout.headers.location, "/login");
    assert.strictEqual(htmlLogout.raw, "");
    assert.ok(String(htmlLogout.headers["set-cookie"] || "").includes("Max-Age=0"));

    const summary = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(summary.status, 200);
    assert.strictEqual(summary.json.account.ownerEmail, "louieleolarry@gmail.com");
    assert.strictEqual(summary.json.account.ui.calendarMode, "grid");
    assert.ok(summary.json.account.contentPlan.items.length > 0);
    assert.strictEqual(summary.json.account.setupChecklist.completed, 3);
    assert.strictEqual(summary.json.account.setupChecklist.total, 7);
    assert.strictEqual(summary.json.account.setupChecklist.items.find((item) => item.id === "site-profile").complete, true);
    assert.strictEqual(summary.json.account.setupChecklist.items.find((item) => item.id === "keywords").complete, false);
    assert.strictEqual(summary.json.account.setupChecklist.items.find((item) => item.id === "cms").action.view, "settings");
    assert.strictEqual(summary.json.account.setupChecklist.items.find((item) => item.id === "cms").action.tab, "cms");

    const legacyShellStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyShellStore.accounts[user.id].ui = {
      activeView: "broken-view",
      activeSettingsTab: "danger",
      calendarMode: "carousel",
      selectedWorkspaceId: "missing-workspace",
    };
    delete legacyShellStore.accounts[user.id].inventoryFeed;
    legacyShellStore.accounts[user.id].inventoryFeed = {
      status: "connected",
      retailerName: "",
      accountId: "",
      hasCredentials: "true",
      lastConnectedAt: "recently",
      lastSyncedAt: "recently",
      lastError: " stale error ",
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyShellStore, null, 2)}\n`);
    const legacyShell = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyShell.status, 200);
    assert.strictEqual(legacyShell.json.account.ui.activeView, "plan");
    assert.strictEqual(legacyShell.json.account.ui.activeSettingsTab, "site");
    assert.strictEqual(legacyShell.json.account.ui.calendarMode, "grid");
    assert.strictEqual(legacyShell.json.selectedWorkspaceId, user.id);
        assert.strictEqual(legacyShell.json.account.inventoryFeed.status, "disconnected");
    assert.strictEqual(legacyShell.json.account.inventoryFeed.retailerName, "");
    assert.strictEqual(legacyShell.json.account.inventoryFeed.accountId, "");
    assert.strictEqual(legacyShell.json.account.inventoryFeed.hasCredentials, false);
    assert.strictEqual(legacyShell.json.account.inventoryFeed.lastConnectedAt, "");
    assert.strictEqual(legacyShell.json.account.inventoryFeed.lastSyncedAt, "");
    assert.strictEqual(legacyShell.json.account.inventoryFeed.lastError, "stale error");

    const blockedFeedName = ["Dut", "chie"].join("");
    const blockedFeedDetail = ["dispen", "sary"].join("");
    const blockedInventoryStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    blockedInventoryStore.accounts[user.id].inventoryFeed = {
      status: "connected",
      retailerName: blockedFeedName,
      accountId: `${blockedFeedDetail}-123`,
      hasCredentials: true,
      lastConnectedAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
      lastError: "",
    };
    blockedInventoryStore.accounts[user.id].products = [
      { id: "blocked-product", name: `${blockedFeedName} synced item`, description: blockedFeedDetail, source: "inventory-feed" },
      { id: "manual-product", name: "Manual service", description: "Allowed", source: "manual" },
    ];
    fs.writeFileSync(accountStorePath, `${JSON.stringify(blockedInventoryStore, null, 2)}\n`);
    const blockedInventorySummary = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(blockedInventorySummary.status, 200);
    assert.strictEqual(blockedInventorySummary.json.account.inventoryFeed.status, "disconnected");
    assert.strictEqual(blockedInventorySummary.json.account.inventoryFeed.retailerName, "");
    assert.strictEqual(blockedInventorySummary.json.account.inventoryFeed.accountId, "");
    assert.strictEqual(blockedInventorySummary.json.account.products.some((item) => JSON.stringify(item).includes(blockedFeedName)), false);
    assert.strictEqual(blockedInventorySummary.json.account.products.some((item) => JSON.stringify(item).includes(blockedFeedDetail)), false);
    assert.strictEqual(blockedInventorySummary.json.account.products.some((item) => item.id === "manual-product"), true);

    const legacyStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyStore.accounts[user.id].settings.images = {
      includeImages: true,
      includeProductImages: true,
      stylePreset: "product",
      aspectRatio: "1:1",
      imageCadence: "key-sections",
      visualStyle: "Local product photography",
      customGuidelines: "Use real menu products and local context.",
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyStore, null, 2)}\n`);
    const legacyImageSettings = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyImageSettings.status, 200);
    assert.strictEqual(legacyImageSettings.json.account.settings.images.useProductImages, true);
    assert.strictEqual(legacyImageSettings.json.account.settings.images.useCustomGuidelines, true);
    assert.strictEqual(legacyImageSettings.json.account.settings.images.guidelines, "Use real menu products and local context.");

    const legacySettingsStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacySettingsStore.accounts[user.id].settings = {
      site: {
        productDescription: " Legacy description ",
        targetAudience: " Operators ",
        brandVoice: " Clear ",
        competitors: " Competitor ",
        language: "Klingon",
        publishingCadence: "Hourly",
        timezone: "Mars/Olympus",
        defaultPublishTime: "25:00",
        keywords: "not-an-array",
        keywordDraft: " draft ",
        keywordMix: "not-a-number",
      },
      images: {
        includeImages: "yes",
        useProductImages: "on",
        stylePreset: "space",
        aspectRatio: "21:9",
        imageCadence: "every-paragraph",
        visualStyle: " Screenshots ",
        guidelines: " Use product context ",
        samplePrompt: " Old prompt ",
        lastTestedAt: "recently",
        samplePreview: { providerStatus: "live", aspectRatio: "21:9", prompt: "Unsafe stale preview" },
        promptHistory: [{ prompt: "ok" }, "bad"],
      },
      cms: {
        websiteUrl: "not-a-url",
        platform: "Drupal",
        status: "connected",
        draftFirst: "yes",
        hasCredentials: "true",
        username: " publisher ",
        lastTestedAt: "recently",
        lastConnectedAt: "recently",
        lastError: " old error ",
      },
      cta: {
        enabled: "true",
        label: " Call ",
        text: " Book ",
        url: "javascript:alert(1)",
        placement: "middle",
        style: "modal",
        openInNewTab: "false",
        trackingLabel: " lead ",
      },
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacySettingsStore, null, 2)}\n`);
    const legacySettings = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacySettings.status, 200);
    assert.strictEqual(legacySettings.json.account.settings.site.language, "English");
    assert.strictEqual(legacySettings.json.account.settings.site.publishingCadence, "3 per week");
    assert.strictEqual(legacySettings.json.account.settings.site.timezone, "America/Los_Angeles");
    assert.strictEqual(legacySettings.json.account.settings.site.defaultPublishTime, "09:00");
    assert.deepStrictEqual(legacySettings.json.account.settings.site.keywords, []);
    assert.strictEqual(legacySettings.json.account.settings.site.keywordMix, 45);
    assert.strictEqual(legacySettings.json.account.settings.images.includeImages, true);
    assert.strictEqual(legacySettings.json.account.settings.images.useProductImages, true);
    assert.strictEqual(legacySettings.json.account.settings.images.stylePreset, "editorial");
    assert.strictEqual(legacySettings.json.account.settings.images.aspectRatio, "16:9");
    assert.strictEqual(legacySettings.json.account.settings.images.imageCadence, "featured-only");
    assert.strictEqual(legacySettings.json.account.settings.images.lastTestedAt, "");
    assert.deepStrictEqual(legacySettings.json.account.settings.images.samplePreview, {});
    assert.deepStrictEqual(legacySettings.json.account.settings.images.promptHistory, []);
    assert.strictEqual(legacySettings.json.account.settings.cms.websiteUrl, "");
    assert.strictEqual(legacySettings.json.account.settings.cms.platform, "");
    assert.strictEqual(legacySettings.json.account.settings.cms.status, "disconnected");
    assert.strictEqual(legacySettings.json.account.settings.cms.hasCredentials, false);
    assert.strictEqual(legacySettings.json.account.settings.cms.lastConnectedAt, "");
    assert.strictEqual(legacySettings.json.account.settings.cta.url, "");
    assert.strictEqual(legacySettings.json.account.settings.cta.placement, "end");
    assert.strictEqual(legacySettings.json.account.settings.cta.style, "button");
    assert.strictEqual(legacySettings.json.account.settings.cta.openInNewTab, false);

    const legacySupportStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacySupportStore.accounts[user.id].supportTickets = [
      {
        id: "ticket_legacy_setup",
        subject: "Legacy setup ticket",
        category: "Unknown category",
        priority: "panic",
        status: "waiting-on-provider",
        message: "",
        requesterEmail: "other@example.com",
        createdAt: "not-a-date",
        updatedAt: "also-not-a-date",
        resolvedAt: "still-not-a-date",
        replies: [
          { message: "", authorEmail: "other@example.com" },
          { message: "Legacy reply", authorEmail: "not-an-email", createdAt: "bad-reply-date" },
        ],
      },
    ];
    legacySupportStore.accounts[user.id].activityLog = [
      {
        id: "activity_bad_date",
        type: "invite_created",
        label: "Bad activity date",
        targetEmail: "not-an-email",
        actorEmail: "also-not-email",
        createdAt: "not-a-date",
      },
      {
        id: "activity_legacy",
        type: "member_role_updated",
        label: "Legacy team activity",
        targetEmail: invitedUser.email,
        actorEmail: user.email,
        role: "admin",
        createdAt: "2026-08-01T12:00:00.000Z",
      },
    ];
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacySupportStore, null, 2)}\n`);
    const legacySupportTickets = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacySupportTickets.status, 200);
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].category, "Setup");
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].priority, "normal");
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].status, "open");
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].requesterEmail, user.email);
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].createdAt, "");
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].updatedAt, "");
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].resolvedAt, "");
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].replies.length, 1);
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].replies[0].message, "Legacy reply");
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].replies[0].authorEmail, user.email);
    assert.strictEqual(legacySupportTickets.json.account.supportTickets[0].replies[0].createdAt, "");
    assert.strictEqual(legacySupportTickets.json.account.activityLog.length, 1);
    assert.strictEqual(legacySupportTickets.json.account.activityLog[0].label, "Legacy team activity");
    assert.strictEqual(legacySupportTickets.json.account.activityLog[0].createdAt, "2026-08-01T12:00:00.000Z");
    const restoredSupportStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredSupportStore.accounts[user.id].supportTickets = [];
    restoredSupportStore.accounts[user.id].activityLog = [];
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredSupportStore, null, 2)}\n`);

    const legacyEntityStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyEntityStore.accounts[user.id].products = [
      {
        id: "product_legacy",
        name: "Legacy product",
        category: "Services",
        url: "not-a-url",
        featured: "yes",
        hidden: "",
      },
    ];
    legacyEntityStore.accounts[user.id].locations = [
      {
        id: "location_legacy",
        name: "Legacy office",
        city: "Dana Point",
        state: "california",
        isPrimary: "yes",
      },
    ];
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyEntityStore, null, 2)}\n`);
    const legacyEntities = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyEntities.status, 200);
    assert.strictEqual(legacyEntities.json.account.products[0].url, "");
    assert.strictEqual(legacyEntities.json.account.products[0].featured, true);
    assert.strictEqual(legacyEntities.json.account.products[0].hidden, false);
    assert.strictEqual(legacyEntities.json.account.locations[0].state, "");
    assert.strictEqual(legacyEntities.json.account.locations[0].isPrimary, true);
    const restoredEntityStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredEntityStore.accounts[user.id].products = [];
    restoredEntityStore.accounts[user.id].locations = [];
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredEntityStore, null, 2)}\n`);

    const legacyPlanStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    const originalTopics = legacyPlanStore.accounts[user.id].topics;
    const originalContentPlan = legacyPlanStore.accounts[user.id].contentPlan;
    legacyPlanStore.accounts[user.id].topics = [
      {
        id: "topic_legacy",
        title: " Legacy topic ",
        keyword: "",
        volume: "bad",
        cpc: "bad",
        difficulty: "Impossible",
        difficultyScore: "bad",
        competition: "bad",
        added: "yes",
      },
      {
        id: "topic_invalid",
        title: "",
        keyword: "",
        volume: 100,
        difficulty: "Easy",
      },
    ];
    legacyPlanStore.accounts[user.id].contentPlan = {
      strategy: " Legacy strategy ",
      updatedAt: "recently",
      items: [
        {
          id: "plan_legacy",
          title: " Legacy article ",
          slug: "../account",
          keyword: "",
          volume: "many",
          difficulty: "",
          estimatedVisits: "lots",
          scheduledDate: "tomorrow-ish",
          scheduledTime: "25:99",
          status: "published",
          canonicalUrl: "javascript:alert(1)",
          featuredImageUrl: "not-a-url",
          publishedAt: "2026-08-01T12:00:00.000Z",
          publishedUrl: "https://external.example/article",
          publicPath: "https://external.example/article",
        },
        {
          id: "plan_invalid",
          title: "",
          keyword: "",
          status: "scheduled",
        },
      ],
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyPlanStore, null, 2)}\n`);
    const legacyPlan = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyPlan.status, 200);
    assert.strictEqual(legacyPlan.json.account.topics.length, 1);
    assert.strictEqual(legacyPlan.json.account.topics[0].title, "Legacy topic");
    assert.strictEqual(legacyPlan.json.account.topics[0].keyword, "Legacy topic");
    assert.strictEqual(legacyPlan.json.account.topics[0].difficulty, "Needs review");
    assert.strictEqual(legacyPlan.json.account.topics[0].difficultyScore, 50);
    assert.strictEqual(legacyPlan.json.account.topics[0].volume, 0);
    assert.strictEqual(legacyPlan.json.account.topics[0].added, true);
    assert.strictEqual(legacyPlan.json.account.contentPlan.strategy, "Legacy strategy");
    assert.strictEqual(legacyPlan.json.account.contentPlan.updatedAt, "");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items.length, 1);
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].title, "Legacy article");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].slug, "account");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].status, "published");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].scheduledDate, "");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].scheduledTime, "");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].canonicalUrl, "");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].featuredImageUrl, "");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].publishedUrl, "");
    assert.strictEqual(legacyPlan.json.account.contentPlan.items[0].publicPath, "/blog/account");
    const restoredPlanStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredPlanStore.accounts[user.id].topics = originalTopics;
    restoredPlanStore.accounts[user.id].contentPlan = originalContentPlan;
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredPlanStore, null, 2)}\n`);

    const legacyBillingStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    const originalWorkspaceName = legacyBillingStore.accounts[user.id].workspaceName;
    legacyBillingStore.accounts[user.id].workspaceName = "";
    legacyBillingStore.accounts[user.id].billing = {
      plan: "Enterprise",
      status: "free-forever",
      billingPeriod: "weekly",
      price: "$0",
      paymentMethod: "Invoice",
      portalStatus: "unknown-provider-state",
      failedPayment: { reason: "Old failure", retryAt: "not-a-date", recordedAt: "then" },
      invoices: [
        {
          id: "",
          date: "not-a-date",
          plan: "Enterprise",
          amount: "=HYPERLINK(\"https://evil.example\",\"invoice\")",
          status: "overdue-now",
          failureReason: "<script>alert(1)</script>",
          hostedInvoiceUrl: "javascript:alert(1)",
        },
        {
          id: "invoice_legacy",
          date: "2026-08-01",
          plan: "Pro+",
          amount: "$69/mo annual",
          status: "paid",
          failureReason: "",
          hostedInvoiceUrl: "/account?view=billing&invoice=legacy",
        },
      ],
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyBillingStore, null, 2)}\n`);
    const legacyBilling = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyBilling.status, 200);
    assert.strictEqual(legacyBilling.json.account.workspaceName, "louieleolarry");
    assert.strictEqual(legacyBilling.json.account.billing.plan, "Pro");
    assert.strictEqual(legacyBilling.json.account.billing.status, "trial");
    assert.strictEqual(legacyBilling.json.account.billing.billingPeriod, "annual");
    assert.strictEqual(legacyBilling.json.account.billing.price, "$49/mo annual");
    assert.strictEqual(legacyBilling.json.account.billing.invoices.length, 1);
    assert.deepStrictEqual(legacyBilling.json.account.billing.invoices[0], {
      id: "invoice_legacy",
      date: "2026-08-01",
      plan: "Pro+",
      amount: "$69/mo annual",
      status: "paid",
      failureReason: "",
      hostedInvoiceUrl: "/account?view=billing&invoice=legacy",
    });
    assert.strictEqual(legacyBilling.json.account.rankings.gated, true);
    assert.strictEqual(legacyBilling.json.account.aiMentions.gated, true);
    const restoredBillingStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredBillingStore.accounts[user.id].workspaceName = originalWorkspaceName;
    restoredBillingStore.accounts[user.id].billing = {
      plan: "Pro",
      status: "trial",
      trialEndsAt: "",
      price: "$49/mo annual",
      billingPeriod: "annual",
      paymentMethod: "",
      portalStatus: "not-connected",
      failedPayment: { reason: "", retryAt: "", recordedAt: "" },
      invoices: [],
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredBillingStore, null, 2)}\n`);

    const legacySearchStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacySearchStore.accounts[user.id].searchConsole = {
      status: "connected",
      propertyUrl: "not-a-url",
      dateRange: "365",
      lastSyncedAt: "not-a-date",
      clicks: "bad",
      impressions: "nope",
      indexedPages: "many",
      trend: [{ date: "not-a-date", clicks: "ten", impressions: "lots" }],
      topQueries: [{ query: "<script>", clicks: "bad", impressions: "bad" }],
      topPages: [{ page: "https://external.example/bad", clicks: "bad" }],
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacySearchStore, null, 2)}\n`);
    const legacySearch = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacySearch.status, 200);
    assert.strictEqual(legacySearch.json.account.searchConsole.status, "disconnected");
    assert.strictEqual(legacySearch.json.account.searchConsole.propertyUrl, "");
    assert.strictEqual(legacySearch.json.account.searchConsole.lastSyncedAt, "");
    assert.strictEqual(legacySearch.json.account.searchConsole.dateRange, "28");
    assert.strictEqual(legacySearch.json.account.searchConsole.clicks, 0);
    assert.strictEqual(legacySearch.json.account.searchConsole.impressions, 0);
    assert.strictEqual(legacySearch.json.account.searchConsole.indexedPages, 0);
    assert.deepStrictEqual(legacySearch.json.account.searchConsole.trend, []);
    assert.deepStrictEqual(legacySearch.json.account.searchConsole.topPages, []);
    const restoredSearchStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredSearchStore.accounts[user.id].searchConsole = {
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
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredSearchStore, null, 2)}\n`);

    const legacyConnectedSearchStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyConnectedSearchStore.accounts[user.id].searchConsole = {
      status: "connected",
      propertyUrl: "https://sirbloggsalot.com",
      dateRange: "28",
      lastSyncedAt: "not-a-date",
      clicks: "12",
      impressions: "120",
      indexedPages: "4",
      trend: [{ date: "2026-08-01", clicks: "3", impressions: "40" }],
      topQueries: [{ query: "legacy query", clicks: "2", impressions: "10" }],
      topPages: [{ page: "/blog/account", clicks: "2" }],
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyConnectedSearchStore, null, 2)}\n`);
    const legacyConnectedSearch = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyConnectedSearch.status, 200);
    assert.strictEqual(legacyConnectedSearch.json.account.searchConsole.status, "connected");
    assert.strictEqual(legacyConnectedSearch.json.account.searchConsole.lastSyncedAt, "");
    const restoredConnectedSearchStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredConnectedSearchStore.accounts[user.id].searchConsole = {
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
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredConnectedSearchStore, null, 2)}\n`);

    const legacyTrackingStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyTrackingStore.accounts[user.id].billing = {
      plan: "Pro+",
      status: "active",
      billingPeriod: "annual",
      price: "$69/mo annual",
      paymentMethod: "",
      portalStatus: "local-checkout",
      failedPayment: { reason: "", retryAt: "", recordedAt: "" },
      invoices: [],
    };
    legacyTrackingStore.accounts[user.id].rankings = {
      gated: false,
      dateRange: "365",
      updatedAt: "recently",
      trend: [{ date: "bad-date", averagePosition: "top" }, { date: "2026-08-09", averagePosition: "7" }],
      keywords: [
        { keyword: "", url: "https://external.example/rank", position: "first", change: "up" },
        { keyword: "legacy topic", url: "https://external.example/rank", position: "4", change: "-2" },
      ],
    };
    legacyTrackingStore.accounts[user.id].aiMentions = {
      gated: false,
      dateRange: "365",
      updatedAt: "recently",
      sources: ["ChatGPT", "", "<script>"],
      models: ["GPT-4o", ""],
      trend: [{ date: "bad-date", mentions: "many" }, { date: "2026-08-09", mentions: "2" }],
      mentions: [
        { source: "", model: "", prompt: "", status: "unknown" },
        { source: "ChatGPT", model: "GPT-4o", prompt: "best legacy topic", status: "unknown" },
      ],
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyTrackingStore, null, 2)}\n`);
    const legacyTracking = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyTracking.status, 200);
    assert.strictEqual(legacyTracking.json.account.rankings.gated, false);
    assert.strictEqual(legacyTracking.json.account.rankings.dateRange, "30");
    assert.deepStrictEqual(legacyTracking.json.account.rankings.trend, [{ date: "2026-08-09", averagePosition: 7 }]);
    assert.deepStrictEqual(legacyTracking.json.account.rankings.keywords, [{ keyword: "legacy topic", url: "", position: 4, change: -2 }]);
    assert.strictEqual(legacyTracking.json.account.aiMentions.gated, false);
    assert.strictEqual(legacyTracking.json.account.aiMentions.dateRange, "30");
    assert.deepStrictEqual(legacyTracking.json.account.aiMentions.trend, [{ date: "2026-08-09", mentions: 2 }]);
    assert.deepStrictEqual(legacyTracking.json.account.aiMentions.mentions, [{ source: "ChatGPT", model: "GPT-4o", prompt: "best legacy topic", status: "monitoring" }]);
    const restoredTrackingStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredTrackingStore.accounts[user.id].billing = {
      plan: "Pro",
      status: "trial",
      trialEndsAt: "",
      price: "$49/mo annual",
      billingPeriod: "annual",
      paymentMethod: "",
      portalStatus: "not-connected",
      failedPayment: { reason: "", retryAt: "", recordedAt: "" },
      invoices: [],
    };
    restoredTrackingStore.accounts[user.id].rankings = { gated: true, planRequired: "Pro+", keywords: [], updatedAt: "" };
    restoredTrackingStore.accounts[user.id].aiMentions = { gated: true, planRequired: "Pro+", mentions: [], updatedAt: "" };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredTrackingStore, null, 2)}\n`);

    const legacyReportsStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyReportsStore.accounts[user.id].reports = {
      template: "unknown",
      sharing: {
        shareId: "https://external.example/report",
        shareUrl: "https://external.example/report",
        shareCreatedAt: "recently",
      },
      schedule: {
        enabled: true,
        cadence: "daily",
        recipients: ["not-an-email", "owner@example.com", "OWNER@example.com"],
        lastScheduledAt: "recently",
      },
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyReportsStore, null, 2)}\n`);
    const legacyReports = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyReports.status, 200);
    assert.strictEqual(legacyReports.json.account.reports.sharing.shareId, "");
    assert.strictEqual(legacyReports.json.account.reports.sharing.shareUrl, "");
    assert.strictEqual(legacyReports.json.account.reports.sharing.shareCreatedAt, "");
    assert.strictEqual(legacyReports.json.account.reports.schedule.enabled, true);
    assert.strictEqual(legacyReports.json.account.reports.schedule.cadence, "weekly");
    assert.deepStrictEqual(legacyReports.json.account.reports.schedule.recipients, ["owner@example.com"]);
    assert.strictEqual(legacyReports.json.account.reports.schedule.lastScheduledAt, "");
    assert.strictEqual(legacyReports.json.account.reports.template, "performance");
    const restoredReportsStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredReportsStore.accounts[user.id].reports = {
      template: "performance",
      sharing: { shareUrl: "", shareCreatedAt: "" },
      schedule: { enabled: false, cadence: "weekly", recipients: [], lastScheduledAt: "" },
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredReportsStore, null, 2)}\n`);

    const unsupportedSummaryExtraPath = await request(server, { path: "/api/account/summary/extra" });
    assert.strictEqual(unsupportedSummaryExtraPath.status, 404);

    const unsupportedWorkspaceChildRead = await request(server, { path: "/api/account/workspaces/select" });
    assert.strictEqual(unsupportedWorkspaceChildRead.status, 404);

    const unsupportedWorkspaceSelectExtraPath = await request(server, {
      method: "POST",
      path: "/api/account/workspaces/select/extra",
      body: { workspaceId: user.id },
    });
    assert.strictEqual(unsupportedWorkspaceSelectExtraPath.status, 404);

    const unsupportedUiChildUpdate = await request(server, {
      method: "PUT",
      path: "/api/account/ui/active-view",
      body: { activeView: "billing" },
    });
    assert.strictEqual(unsupportedUiChildUpdate.status, 404);

    const unsupportedSettingsChildRead = await request(server, { path: "/api/account/settings/generate-description" });
    assert.strictEqual(unsupportedSettingsChildRead.status, 404);

    const unsupportedSettingsChildUpdate = await request(server, {
      method: "PUT",
      path: "/api/account/settings/generate-description",
      body: { site: { brandVoice: "Wrong route should not save." } },
    });
    assert.strictEqual(unsupportedSettingsChildUpdate.status, 404);

    const unsupportedSettingsGenerateExtraPath = await request(server, {
      method: "POST",
      path: "/api/account/settings/generate-description/extra",
    });
    assert.strictEqual(unsupportedSettingsGenerateExtraPath.status, 404);

    const invalidStrategy = await request(server, {
      method: "PUT",
      path: "/api/account/content-plan/strategy",
      body: { strategy: "" },
    });
    assert.strictEqual(invalidStrategy.status, 400);

    const updatedStrategy = await request(server, {
      method: "PUT",
      path: "/api/account/content-plan/strategy",
      body: { strategy: "Prioritize comparison posts before location pages this month." },
    });
    assert.strictEqual(updatedStrategy.status, 200);
    assert.strictEqual(updatedStrategy.json.contentPlan.strategy, "Prioritize comparison posts before location pages this month.");
    assert.strictEqual(updatedStrategy.json.account.contentPlan.strategy, "Prioritize comparison posts before location pages this month.");

    const unconfiguredCmsTest = await request(server, { method: "POST", path: "/api/account/cms/test" });
    assert.strictEqual(unconfiguredCmsTest.status, 400);

    const invalidCtaUrl = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        cta: { enabled: true, text: "Book a call", url: "not-a-url", placement: "inline" },
      },
    });
    assert.strictEqual(invalidCtaUrl.status, 400);

    const invalidCtaStyle = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        cta: { enabled: true, text: "Book a call", url: "https://sirbloggsalot.com/#pricing", placement: "inline", style: "modal" },
      },
    });
    assert.strictEqual(invalidCtaStyle.status, 400);

    const invalidCmsSettingsUrl = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        cms: { websiteUrl: "not-a-url", platform: "WordPress" },
      },
    });
    assert.strictEqual(invalidCmsSettingsUrl.status, 400);

    const invalidKeywordMix = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        site: { keywordMix: "not-a-number" },
      },
    });
    assert.strictEqual(invalidKeywordMix.status, 400);

    const invalidLanguage = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        site: { language: "Klingon" },
      },
    });
    assert.strictEqual(invalidLanguage.status, 400);

    const invalidPublishingCadence = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        site: { publishingCadence: "Hourly" },
      },
    });
    assert.strictEqual(invalidPublishingCadence.status, 400);

    const invalidTimezone = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        site: { timezone: "Mars/Olympus" },
      },
    });
    assert.strictEqual(invalidTimezone.status, 400);

    const invalidDefaultPublishTime = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        site: { defaultPublishTime: "25:00" },
      },
    });
    assert.strictEqual(invalidDefaultPublishTime.status, 400);

    const invalidImagePreset = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        images: { stylePreset: "space" },
      },
    });
    assert.strictEqual(invalidImagePreset.status, 400);

    const invalidImageAspectRatio = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        images: { aspectRatio: "21:9" },
      },
    });
    assert.strictEqual(invalidImageAspectRatio.status, 400);

    const invalidImageCadence = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        images: { imageCadence: "every-paragraph" },
      },
    });
    assert.strictEqual(invalidImageCadence.status, 400);

    const invalidCmsPlatform = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        cms: { websiteUrl: "https://sirbloggsalot.com", platform: "Drupal" },
      },
    });
    assert.strictEqual(invalidCmsPlatform.status, 400);

    const invalidCtaPlacement = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        cta: { enabled: true, text: "Book a call", url: "https://sirbloggsalot.com/#pricing", placement: "middle" },
      },
    });
    assert.strictEqual(invalidCtaPlacement.status, 400);

    const settings = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        site: {
          productDescription: "Test description",
          targetAudience: "Operators",
          brandVoice: "Direct and practical",
          competitors: "Blawgy, Jasper",
          language: "English",
          publishingCadence: "3 per week",
          timezone: "America/Los_Angeles",
          defaultPublishTime: "10:30",
          keywords: ["ai seo"],
          keywordDraft: "",
          keywordMix: 61,
        },
        images: {
          includeImages: true,
          useProductImages: false,
          stylePreset: "editorial",
          aspectRatio: "16:9",
          imageCadence: "key-sections",
          visualStyle: "Clean screenshots",
          useCustomGuidelines: true,
          guidelines: "No stock-photo handshakes",
        },
        cms: { websiteUrl: "https://sirbloggsalot.com", platform: "WordPress" },
        cta: { enabled: true, label: "Free consultation", text: "Book a call", url: "https://sirbloggsalot.com/#pricing", placement: "inline", style: "button", openInNewTab: true, trackingLabel: "pricing_cta" },
      },
    });
    assert.strictEqual(settings.status, 200);
    assert.strictEqual(settings.json.settings.site.keywordMix, 61);
    assert.strictEqual(settings.json.settings.site.brandVoice, "Direct and practical");
    assert.strictEqual(settings.json.settings.site.competitors, "Blawgy, Jasper");
    assert.strictEqual(settings.json.settings.site.language, "English");
    assert.strictEqual(settings.json.settings.site.publishingCadence, "3 per week");
    assert.strictEqual(settings.json.settings.site.timezone, "America/Los_Angeles");
    assert.strictEqual(settings.json.settings.site.defaultPublishTime, "10:30");
    assert.strictEqual(settings.json.settings.images.stylePreset, "editorial");
    assert.strictEqual(settings.json.settings.images.aspectRatio, "16:9");
    assert.strictEqual(settings.json.settings.images.imageCadence, "key-sections");
    assert.strictEqual(settings.json.settings.images.useCustomGuidelines, true);
    assert.strictEqual(settings.json.settings.images.guidelines, "No stock-photo handshakes");
    assert.strictEqual(settings.json.settings.cta.placement, "inline");
    assert.strictEqual(settings.json.settings.cta.label, "Free consultation");
    assert.strictEqual(settings.json.settings.cta.style, "button");
    assert.strictEqual(settings.json.settings.cta.openInNewTab, true);
    assert.strictEqual(settings.json.settings.cta.trackingLabel, "pricing_cta");
    assert.strictEqual(settings.json.settings.cms.status, "draft-first");

    const partialSettings = await request(server, {
      method: "PUT",
      path: "/api/account/settings",
      body: {
        cta: { enabled: true, text: "Schedule now", url: "https://sirbloggsalot.com/#pricing", placement: "end", style: "banner", openInNewTab: false },
      },
    });
    assert.strictEqual(partialSettings.status, 200);
    assert.strictEqual(partialSettings.json.settings.cta.style, "banner");
    assert.strictEqual(partialSettings.json.settings.cta.openInNewTab, false);
    assert.strictEqual(partialSettings.json.settings.cms.websiteUrl, "https://sirbloggsalot.com/");
    assert.strictEqual(partialSettings.json.settings.cms.platform, "WordPress");
    assert.strictEqual(partialSettings.json.settings.cms.status, "draft-first");

    const cmsConnect = await request(server, {
      method: "POST",
      path: "/api/account/cms/connect",
      body: {
        websiteUrl: "https://sirbloggsalot.com",
        platform: "WordPress",
        username: "publisher@example.com",
        blogTarget: "Main blog",
        collectionName: "SEO Articles",
        secret: "do-not-store-this",
      },
    });
    assert.strictEqual(cmsConnect.status, 200);
    assert.strictEqual(cmsConnect.json.cms.status, "connected");
    assert.strictEqual(cmsConnect.json.cms.blogTarget, "Main blog");
    assert.strictEqual(cmsConnect.json.cms.collectionName, "SEO Articles");
    assert.strictEqual(cmsConnect.json.cms.hasCredentials, true);
    assert.strictEqual(cmsConnect.json.account.setupChecklist.items.find((item) => item.id === "cms").complete, true);
    assert.strictEqual(JSON.stringify(cmsConnect.json).includes("do-not-store-this"), false);

    const cmsTest = await request(server, { method: "POST", path: "/api/account/cms/test" });
    assert.strictEqual(cmsTest.status, 200);
    assert.strictEqual(cmsTest.json.status, "provider-pending");
    assert.strictEqual(cmsTest.json.testResult.status, "provider-pending");
    assert.strictEqual(cmsTest.json.testResult.platform, "WordPress");
    assert.strictEqual(cmsTest.json.testResult.websiteUrl, "https://sirbloggsalot.com/");
    assert.strictEqual(cmsTest.json.testResult.blogTarget, "Main blog");
    assert.strictEqual(cmsTest.json.testResult.collectionName, "SEO Articles");
    assert.ok(cmsTest.json.cms.lastTestedAt);

    const cmsDisconnect = await request(server, { method: "POST", path: "/api/account/cms/disconnect" });
    assert.strictEqual(cmsDisconnect.status, 200);
    assert.strictEqual(cmsDisconnect.json.cms.status, "disconnected");
    assert.strictEqual(cmsDisconnect.json.cms.hasCredentials, false);
    assert.strictEqual(cmsDisconnect.json.account.setupChecklist.items.find((item) => item.id === "cms").complete, false);

    const invalidCmsConnect = await request(server, {
      method: "POST",
      path: "/api/account/cms/connect",
      body: { websiteUrl: "", platform: "", username: "publisher@example.com", secret: "do-not-store-invalid" },
    });
    assert.strictEqual(invalidCmsConnect.status, 400);
    assert.strictEqual(JSON.stringify(invalidCmsConnect.json).includes("do-not-store-invalid"), false);

    const malformedCmsConnect = await request(server, {
      method: "POST",
      path: "/api/account/cms/connect",
      body: { websiteUrl: "not-a-url", platform: "WordPress", username: "publisher@example.com", secret: "do-not-store-malformed" },
    });
    assert.strictEqual(malformedCmsConnect.status, 400);
    assert.strictEqual(JSON.stringify(malformedCmsConnect.json).includes("do-not-store-malformed"), false);

    const articleId = summary.json.account.contentPlan.items[0].id;
    const generatedArticle = await request(server, {
      method: "POST",
      path: `/api/account/content-plan/items/${articleId}/generate`,
    });
    assert.strictEqual(generatedArticle.status, 200);
    const generatedItem = generatedArticle.json.contentPlan.items.find((item) => item.id === articleId);
    assert.ok(generatedItem.body.includes("# "));
    assert.ok(generatedItem.seoTitle);

    const blockedPublish = await request(server, {
      method: "POST",
      path: `/api/account/content-plan/items/${articleId}/publish`,
    });
    assert.strictEqual(blockedPublish.status, 200);
    assert.strictEqual(blockedPublish.json.cmsStatus, "disconnected");
    assert.strictEqual(blockedPublish.json.contentPlan.items.find((item) => item.id === articleId).status, "draft");

    await request(server, {
      method: "POST",
      path: "/api/account/cms/connect",
      body: {
        websiteUrl: "https://sirbloggsalot.com",
        platform: "WordPress",
        username: "publisher@example.com",
        blogTarget: "Main blog",
        collectionName: "SEO Articles",
        secret: "do-not-store-this-either",
      },
    });
    const publishedArticle = await request(server, {
      method: "POST",
      path: `/api/account/content-plan/items/${articleId}/publish`,
    });
    assert.strictEqual(publishedArticle.status, 200);
    const publishedItem = publishedArticle.json.contentPlan.items.find((item) => item.id === articleId);
    assert.strictEqual(publishedItem.status, "published");
    assert.ok(publishedItem.publishedAt);
    assert.strictEqual(publishedItem.publicPath, "/blog/canva-website-builder");
    assert.strictEqual(publishedItem.publishedUrl, "/blog/canva-website-builder");

    const publicBlogPosts = await request(server, {
      path: "/api/blog/posts",
      authenticated: false,
    });
    assert.strictEqual(publicBlogPosts.status, 200);
    assert.strictEqual(publicBlogPosts.json.posts.length, 1);
    assert.strictEqual(publicBlogPosts.json.posts[0].title, publishedItem.title);
    assert.strictEqual(publicBlogPosts.json.posts[0].slug, "canva-website-builder");
    assert.strictEqual(JSON.stringify(publicBlogPosts.json).includes(user.email), false);
    assert.strictEqual(JSON.stringify(publicBlogPosts.json).includes("plan_pricing_guide"), false);

    const publicBlogPost = await request(server, {
      path: `/api/blog/posts/${publicBlogPosts.json.posts[0].slug}`,
      authenticated: false,
    });
    assert.strictEqual(publicBlogPost.status, 200);
    assert.strictEqual(publicBlogPost.json.post.title, publishedItem.title);
    assert.ok(publicBlogPost.json.post.body.includes("# "));
    assert.strictEqual(JSON.stringify(publicBlogPost.json).includes(user.email), false);

    const unpublishedPublicBlogPost = await request(server, {
      path: "/api/blog/posts/small-business-web-design-pricing",
      authenticated: false,
    });
    assert.strictEqual(unpublishedPublicBlogPost.status, 404);
    await assertPublicBlogHtmlRoutes(server, publishedItem);

    const manualPublishId = summary.json.account.contentPlan.items[1].id;
    const manualPublishedArticle = await request(server, {
      method: "PUT",
      path: `/api/account/content-plan/items/${manualPublishId}`,
      body: { ...summary.json.account.contentPlan.items[1], status: "published" },
    });
    assert.strictEqual(manualPublishedArticle.status, 200);
    const manualPublishedItem = manualPublishedArticle.json.contentPlan.items.find((item) => item.id === manualPublishId);
    assert.strictEqual(manualPublishedItem.status, "published");
    assert.ok(manualPublishedItem.publishedAt);
    assert.ok(manualPublishedItem.body.includes("# "));
    assert.strictEqual(manualPublishedItem.publicPath, "/blog/local-web-design-agency");

    const manualPublishedPublicPost = await request(server, {
      path: "/api/blog/posts/local-web-design-agency",
      authenticated: false,
    });
    assert.strictEqual(manualPublishedPublicPost.status, 200);
    assert.ok(manualPublishedPublicPost.json.post.body.includes("# "));
    assert.strictEqual(manualPublishedArticle.json.contentPlan.statusCounts.published, 2);
    assert.strictEqual(manualPublishedArticle.json.contentPlan.statusCounts.scheduled >= 1, true);

    const regeneratedPublishedPlanItem = await request(server, {
      method: "POST",
      path: `/api/account/content-plan/items/${manualPublishId}/generate`,
    });
    assert.strictEqual(regeneratedPublishedPlanItem.status, 200);
    const regeneratedPublishedItem = regeneratedPublishedPlanItem.json.contentPlan.items.find((item) => item.id === manualPublishId);
    assert.strictEqual(regeneratedPublishedItem.status, "published");
    assert.strictEqual(regeneratedPublishedItem.publicPath, "/blog/local-web-design-agency");
    assert.strictEqual(regeneratedPublishedItem.publishedUrl, "/blog/local-web-design-agency");

    const invitedPublisherPost = await request(server, {
      method: "POST",
      path: "/api/account/blog/posts",
      cookieValue: invitedCookie,
      body: {
        title: "Invited Publisher Article",
        slug: "invited-publisher-article",
        keyword: "invited publisher article",
        body: "Published from the account selected by public account id.",
        scheduledDate: now.toISOString().slice(0, 10),
        status: "draft",
      },
    });
    assert.strictEqual(invitedPublisherPost.status, 201);
    const invitedPublisherPublished = await request(server, {
      method: "POST",
      path: `/api/account/blog/posts/${invitedPublisherPost.json.post.id}/publish`,
      cookieValue: invitedCookie,
    });
    assert.strictEqual(invitedPublisherPublished.status, 200);
    process.env.SIR_BLOGGS_PUBLIC_ACCOUNT_ID = invitedUser.id;
    try {
      const accountIdPublicPosts = await request(server, {
        path: "/api/blog/posts",
        authenticated: false,
      });
      assert.strictEqual(accountIdPublicPosts.status, 200);
      assert.ok(accountIdPublicPosts.json.posts.some((post) => post.slug === "invited-publisher-article"));
      assert.strictEqual(accountIdPublicPosts.json.posts.some((post) => post.slug === "canva-website-builder"), false);
    } finally {
      process.env.SIR_BLOGGS_PUBLIC_ACCOUNT_ID = "";
    }

    const unauthenticatedBlogPosts = await request(server, {
      path: "/api/account/blog/posts",
      authenticated: false,
    });
    assert.strictEqual(unauthenticatedBlogPosts.status, 401);

    const futurePublishedBlogCreate = await request(server, {
      method: "POST",
      path: "/api/account/blog/posts",
      body: {
        title: "Future Published Blog Create",
        slug: "future-published-blog-create",
        body: "Ready body",
        scheduledDate: "2999-01-01",
        status: "published",
      },
    });
    assert.strictEqual(futurePublishedBlogCreate.status, 400);

    const createdBlogPost = await request(server, {
      method: "POST",
      path: "/api/account/blog/posts",
      body: {
        title: "Blog API Launch Guide",
        slug: "blog-api-launch-guide",
        keyword: "blog api",
        category: "Operations",
        excerpt: "How the protected editor should manage article records.",
        canonicalUrl: "https://sirbloggsalot.com/blog/blog-api-launch-guide",
        authorName: "Editorial Team",
        internalLinks: "https://sirbloggsalot.com/pricing",
        schemaType: "Article",
        volume: 1200,
        difficulty: "Medium",
        estimatedVisits: 90,
        scheduledDate: "2026-08-09",
        scheduledTime: "09:30",
        notes: "private editorial note",
        status: "draft",
      },
    });
    assert.strictEqual(createdBlogPost.status, 201);
    assert.strictEqual(createdBlogPost.json.post.title, "Blog API Launch Guide");
    assert.strictEqual(createdBlogPost.json.post.slug, "blog-api-launch-guide");
    assert.strictEqual(createdBlogPost.json.post.category, "Operations");
    assert.strictEqual(createdBlogPost.json.post.canonicalUrl, "https://sirbloggsalot.com/blog/blog-api-launch-guide");
    assert.strictEqual(createdBlogPost.json.post.authorName, "Editorial Team");
    assert.strictEqual(createdBlogPost.json.post.internalLinks, "https://sirbloggsalot.com/pricing");
    assert.strictEqual(createdBlogPost.json.post.schemaType, "Article");
    assert.strictEqual(createdBlogPost.json.post.volume, 1200);
    assert.strictEqual(createdBlogPost.json.post.difficulty, "Medium");
    assert.strictEqual(createdBlogPost.json.post.estimatedVisits, 90);
    assert.strictEqual(createdBlogPost.json.post.notes, "private editorial note");
    assert.ok(createdBlogPost.json.account.contentPlan.items.some((item) => item.id === createdBlogPost.json.post.id));

    const missingKeywordBlogPost = await request(server, {
      method: "POST",
      path: "/api/account/blog/posts",
      body: {
        title: "Missing keyword article",
        keyword: "",
        status: "draft",
      },
    });
    assert.strictEqual(missingKeywordBlogPost.status, 400);
    assert.strictEqual(missingKeywordBlogPost.json.error, "Target keyword is required before starting an article.");

    const duplicateSlugBlogPost = await request(server, {
      method: "POST",
      path: "/api/account/blog/posts",
      body: {
        title: "Blog API Launch Guide",
        slug: "blog-api-launch-guide",
        keyword: "blog api duplicate",
        status: "draft",
      },
    });
    assert.strictEqual(duplicateSlugBlogPost.status, 201);
    assert.notStrictEqual(duplicateSlugBlogPost.json.post.id, createdBlogPost.json.post.id);
    assert.strictEqual(duplicateSlugBlogPost.json.post.slug, "blog-api-launch-guide-2");
    assert.ok(duplicateSlugBlogPost.json.account.contentPlan.items.some((item) => item.slug === "blog-api-launch-guide"));
    assert.ok(duplicateSlugBlogPost.json.account.contentPlan.items.some((item) => item.slug === "blog-api-launch-guide-2"));

    const blogPostList = await request(server, { path: "/api/account/blog/posts?status=draft" });
    assert.strictEqual(blogPostList.status, 200);
    assert.ok(blogPostList.json.posts.some((post) => post.id === createdBlogPost.json.post.id));

    const updatedBlogPost = await request(server, {
      method: "PUT",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}`,
      body: {
        ...createdBlogPost.json.post,
        title: "Updated Blog API Launch Guide",
        metaDescription: "Updated protected editor article metadata.",
        canonicalUrl: "https://sirbloggsalot.com/blog/updated-blog-api-launch-guide",
        authorName: "Updated Editorial Team",
        internalLinks: "https://sirbloggsalot.com/pricing\n/blog/blog-api-launch-guide",
        schemaType: "HowTo",
        volume: 1800,
        difficulty: "Easy to rank",
        estimatedVisits: 140,
        featuredImageUrl: "https://sirbloggsalot.com/assets/sirbloggsalot-og.png",
        featuredImageAlt: "Sir Bloggsalot dashboard",
      },
    });
    assert.strictEqual(updatedBlogPost.status, 200);
    assert.strictEqual(updatedBlogPost.json.post.title, "Updated Blog API Launch Guide");
    assert.strictEqual(updatedBlogPost.json.post.canonicalUrl, "https://sirbloggsalot.com/blog/updated-blog-api-launch-guide");
    assert.strictEqual(updatedBlogPost.json.post.authorName, "Updated Editorial Team");
    assert.strictEqual(updatedBlogPost.json.post.internalLinks, "https://sirbloggsalot.com/pricing\n/blog/blog-api-launch-guide");
    assert.strictEqual(updatedBlogPost.json.post.schemaType, "HowTo");
    assert.strictEqual(updatedBlogPost.json.post.volume, 1800);
    assert.strictEqual(updatedBlogPost.json.post.difficulty, "Easy to rank");
    assert.strictEqual(updatedBlogPost.json.post.estimatedVisits, 140);
    assert.strictEqual(updatedBlogPost.json.post.featuredImageAlt, "Sir Bloggsalot dashboard");

    const futurePublishedBlogUpdate = await request(server, {
      method: "PUT",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}`,
      body: {
        ...updatedBlogPost.json.post,
        status: "published",
        scheduledDate: "2999-01-01",
        body: "Ready body",
      },
    });
    assert.strictEqual(futurePublishedBlogUpdate.status, 400);

    const generatedBlogPost = await request(server, {
      method: "POST",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}/generate`,
    });
    assert.strictEqual(generatedBlogPost.status, 200);
    assert.ok(generatedBlogPost.json.post.body.includes("# Updated Blog API Launch Guide"));
    assert.ok(generatedBlogPost.json.post.generatedAt);

    const scheduledBlogPost = await request(server, {
      method: "POST",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}/schedule`,
      body: { scheduledDate: "2026-08-09", scheduledTime: "10:15" },
    });
    assert.strictEqual(scheduledBlogPost.status, 200);
    assert.strictEqual(scheduledBlogPost.json.post.status, "scheduled");
    assert.strictEqual(scheduledBlogPost.json.post.scheduledTime, "10:15");

    const publishedBlogPost = await request(server, {
      method: "POST",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}/publish`,
    });
    assert.strictEqual(publishedBlogPost.status, 200);
    assert.strictEqual(publishedBlogPost.json.post.status, "published");
    assert.ok(publishedBlogPost.json.post.publishedAt);
    assert.strictEqual(publishedBlogPost.json.post.publicPath, "/blog/blog-api-launch-guide");

    const renamedPublishedBlogPost = await request(server, {
      method: "PUT",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}`,
      body: {
        ...publishedBlogPost.json.post,
        slug: "renamed-blog-api-launch-guide",
        status: "published",
        scheduledDate: "2026-08-09",
        body: publishedBlogPost.json.post.body || "Ready body",
      },
    });
    assert.strictEqual(renamedPublishedBlogPost.status, 200);
    assert.strictEqual(renamedPublishedBlogPost.json.post.publicPath, "/blog/renamed-blog-api-launch-guide");
    assert.strictEqual(renamedPublishedBlogPost.json.post.publishedUrl, "/blog/renamed-blog-api-launch-guide");

    const draftEditedBlogPost = await request(server, {
      method: "PUT",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}`,
      body: {
        ...renamedPublishedBlogPost.json.post,
        status: "draft",
      },
    });
    assert.strictEqual(draftEditedBlogPost.status, 200);
    assert.strictEqual(draftEditedBlogPost.json.post.status, "draft");
    assert.strictEqual(draftEditedBlogPost.json.post.publishedAt, "");
    assert.strictEqual(draftEditedBlogPost.json.post.publicPath, "");
    assert.strictEqual(draftEditedBlogPost.json.post.publishedUrl, "");

    const unpublishedBlogPost = await request(server, {
      method: "POST",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}/unpublish`,
    });
    assert.strictEqual(unpublishedBlogPost.status, 200);
    assert.strictEqual(unpublishedBlogPost.json.post.status, "draft");
    assert.strictEqual(unpublishedBlogPost.json.post.publishedAt, "");

    const deletedBlogPost = await request(server, {
      method: "DELETE",
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}`,
    });
    assert.strictEqual(deletedBlogPost.status, 200);
    assert.strictEqual(deletedBlogPost.json.post.deletedAt.length > 0, true);

    const deletedBlogPostDetail = await request(server, {
      path: `/api/account/blog/posts/${createdBlogPost.json.post.id}`,
    });
    assert.strictEqual(deletedBlogPostDetail.status, 404);

    const unsupportedBlogPostAction = await request(server, {
      method: "POST",
      path: `/api/account/blog/posts/${summary.json.account.contentPlan.items[0].id}/publish/extra`,
    });
    assert.strictEqual(unsupportedBlogPostAction.status, 404);

    const invalidProductName = await request(server, {
      method: "POST",
      path: "/api/account/products",
      body: { name: "", category: "Service", description: "Monthly content" },
    });
    assert.strictEqual(invalidProductName.status, 400);

    const invalidProductCategory = await request(server, {
      method: "POST",
      path: "/api/account/products",
      body: { name: "Starter SEO Plan", category: "", description: "Monthly content" },
    });
    assert.strictEqual(invalidProductCategory.status, 400);

    const invalidProductUrl = await request(server, {
      method: "POST",
      path: "/api/account/products",
      body: { name: "Starter SEO Plan", category: "Service", url: "not-a-url" },
    });
    assert.strictEqual(invalidProductUrl.status, 400);

    const product = await request(server, {
      method: "POST",
      path: "/api/account/products",
      body: { name: "Starter SEO Plan", category: "Service", description: "Monthly content", price: "$99/mo", sku: "SEO-STARTER", audience: "local contractors", featured: true },
    });
    assert.strictEqual(product.status, 200);
    assert.strictEqual(product.json.products.length, 1);
    assert.strictEqual(product.json.products[0].price, "$99/mo");
    assert.strictEqual(product.json.products[0].sku, "SEO-STARTER");
    assert.strictEqual(product.json.products[0].audience, "local contractors");
    assert.strictEqual(product.json.products[0].featured, true);
    const productId = product.json.products[0].id;

    const updatedProduct = await request(server, {
      method: "PUT",
      path: `/api/account/products/${productId}`,
      body: { ...product.json.products[0], name: "Updated SEO Plan", category: "Service", url: "https://sirbloggsalot.com/pricing", price: "$149/mo", audience: "service businesses", featured: false },
    });
    assert.strictEqual(updatedProduct.status, 200);
    assert.strictEqual(updatedProduct.json.products[0].name, "Updated SEO Plan");
    assert.strictEqual(updatedProduct.json.products[0].url, "https://sirbloggsalot.com/pricing");
    assert.strictEqual(updatedProduct.json.products[0].price, "$149/mo");
    assert.strictEqual(updatedProduct.json.products[0].audience, "service businesses");
    assert.strictEqual(updatedProduct.json.products[0].featured, false);

    const unsupportedProductAction = await request(server, {
      method: "POST",
      path: `/api/account/products/${productId}`,
      body: { name: "False success" },
    });
    assert.strictEqual(unsupportedProductAction.status, 404);

    const unsupportedProductDetailRead = await request(server, { path: `/api/account/products/${productId}` });
    assert.strictEqual(unsupportedProductDetailRead.status, 404);

    const unsupportedProductExtraPathUpdate = await request(server, {
      method: "PUT",
      path: `/api/account/products/${productId}/extra`,
      body: { ...product.json.products[0], name: "False success", category: "Service" },
    });
    assert.strictEqual(unsupportedProductExtraPathUpdate.status, 404);

    const generatedDescription = await request(server, { method: "POST", path: "/api/account/settings/generate-description" });
    assert.strictEqual(generatedDescription.status, 200);
    assert.ok(generatedDescription.json.settings.site.productDescription.includes("Operators"));
    assert.ok(generatedDescription.json.settings.site.productDescription.includes("Updated SEO Plan"));

    const imageTest = await request(server, { method: "POST", path: "/api/account/images/test" });
    assert.strictEqual(imageTest.status, 200);
    assert.ok(imageTest.json.images.samplePrompt.includes("Clean screenshots"));
    assert.ok(imageTest.json.images.samplePrompt.includes("editorial"));
    assert.ok(imageTest.json.images.samplePrompt.includes("16:9"));
    assert.ok(imageTest.json.images.samplePrompt.includes("key sections"));
    assert.ok(imageTest.json.images.samplePrompt.includes("No stock-photo handshakes"));
    assert.ok(imageTest.json.images.lastTestedAt);
    assert.strictEqual(imageTest.json.images.samplePreview.providerStatus, "provider-pending");
    assert.strictEqual(imageTest.json.images.samplePreview.aspectRatio, "16:9");
    assert.strictEqual(imageTest.json.images.samplePreview.imageCadence, "key-sections");
    assert.ok(imageTest.json.images.samplePreview.prompt.includes("Clean screenshots"));
    assert.ok(imageTest.json.images.samplePreview.altText.includes("local image preview"));
    assert.strictEqual(imageTest.json.images.promptHistory.length, 1);
    assert.strictEqual(imageTest.json.images.promptHistory[0].aspectRatio, "16:9");
    assert.strictEqual(imageTest.json.images.promptHistory[0].imageCadence, "key-sections");

    const secondImageTest = await request(server, { method: "POST", path: "/api/account/images/test" });
    assert.strictEqual(secondImageTest.status, 200);
    assert.strictEqual(secondImageTest.json.images.promptHistory.length, 2);
    assert.ok(secondImageTest.json.images.promptHistory[1].prompt.includes("Clean screenshots"));

    const clearedImageHistory = await request(server, { method: "DELETE", path: "/api/account/images/test-history" });
    assert.strictEqual(clearedImageHistory.status, 200);
    assert.deepStrictEqual(clearedImageHistory.json.images.promptHistory, []);
    assert.strictEqual(clearedImageHistory.json.images.samplePrompt, "");
    assert.deepStrictEqual(clearedImageHistory.json.images.samplePreview, {});

    const unsupportedImageTestExtraPath = await request(server, { method: "POST", path: "/api/account/images/test/extra" });
    assert.strictEqual(unsupportedImageTestExtraPath.status, 404);

    const inventoryConnect = await request(server, {
      method: "POST",
      path: "/api/account/inventory-feed/connect",
      body: { retailerName: "Test Catalog", accountId: "retailer-123", secret: "do-not-return-inventory" },
    });
    assert.strictEqual(inventoryConnect.status, 200);
            assert.strictEqual(inventoryConnect.json.inventoryFeed.status, "connected");
    assert.strictEqual(inventoryConnect.json.inventoryFeed.hasCredentials, true);
    assert.strictEqual(JSON.stringify(inventoryConnect.json).includes("do-not-return-inventory"), false);

    const inventorySync = await request(server, { method: "POST", path: "/api/account/inventory-feed/sync" });
    assert.strictEqual(inventorySync.status, 200);
    assert.strictEqual(inventorySync.json.products.filter((item) => item.source === "inventory-feed").length, 3);
    assert.strictEqual(inventorySync.json.products.some((item) => JSON.stringify(item).includes(["Dut", "chie"].join(""))), false);
            assert.ok(inventorySync.json.inventoryFeed.lastSyncedAt);

    const inventoryDisconnect = await request(server, { method: "POST", path: "/api/account/inventory-feed/disconnect" });
    assert.strictEqual(inventoryDisconnect.status, 200);
            assert.strictEqual(inventoryDisconnect.json.inventoryFeed.status, "disconnected");
    assert.strictEqual(inventoryDisconnect.json.inventoryFeed.hasCredentials, false);

    const disconnectedInventorySync = await request(server, { method: "POST", path: "/api/account/inventory-feed/sync" });
    assert.strictEqual(disconnectedInventorySync.status, 400);

    const invalidInventoryConnect = await request(server, {
      method: "POST",
      path: "/api/account/inventory-feed/connect",
      body: { retailerName: "", accountId: "", secret: "do-not-return-invalid-inventory" },
    });
    assert.strictEqual(invalidInventoryConnect.status, 400);
    assert.strictEqual(JSON.stringify(invalidInventoryConnect.json).includes("do-not-return-invalid-inventory"), false);

    const blockedInventoryConnect = await request(server, {
      method: "POST",
      path: "/api/account/inventory-feed/connect",
      body: { retailerName: blockedFeedName, accountId: `${blockedFeedDetail}-account`, secret: "do-not-return-blocked-inventory" },
    });
    assert.strictEqual(blockedInventoryConnect.status, 400);
    assert.strictEqual(JSON.stringify(blockedInventoryConnect.json).includes("do-not-return-blocked-inventory"), false);

    const invalidInviteRole = await request(server, {
      method: "POST",
      path: "/api/account/invites",
      body: { email: "role-test@example.com", role: "owner" },
    });
    assert.strictEqual(invalidInviteRole.status, 400);

    const legacyCollaborationStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyCollaborationStore.accounts[user.id].invites = [
      {
        id: "invite_legacy",
        email: "pending@example.com",
        role: "owner",
        status: "sent",
        link: "https://external.example.com/invite/invite_legacy",
        createdAt: "recently",
      },
      {
        id: "invite_invalid",
        email: "not-an-email",
        role: "admin",
        status: "pending",
        link: "/invite/invite_invalid",
      },
    ];
    legacyCollaborationStore.accounts[user.id].members = [
      {
        id: "legacy_member",
        email: "legacy@example.com",
        name: " Legacy Member ",
        role: "owner",
        status: "suspended",
        joinedAt: "recently",
        roleUpdatedAt: "recently",
        roleUpdatedBy: "OWNER@EXAMPLE.COM",
      },
      {
        id: "invalid_member",
        email: "not-an-email",
        name: "Invalid Member",
        role: "editor",
        status: "active",
      },
    ];
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyCollaborationStore, null, 2)}\n`);
    const legacyInviteLookup = await request(server, {
      path: "/api/invite/invite_legacy",
      authenticated: false,
    });
    assert.strictEqual(legacyInviteLookup.status, 200);
    assert.strictEqual(legacyInviteLookup.json.invite.role, "member");
    assert.strictEqual(legacyInviteLookup.json.invite.status, "pending");
    const legacyCollaboration = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyCollaboration.status, 200);
    assert.strictEqual(legacyCollaboration.json.account.invites.length, 1);
    assert.strictEqual(legacyCollaboration.json.account.invites[0].id, "invite_legacy");
    assert.strictEqual(legacyCollaboration.json.account.invites[0].email, "pending@example.com");
    assert.strictEqual(legacyCollaboration.json.account.invites[0].role, "member");
    assert.strictEqual(legacyCollaboration.json.account.invites[0].status, "pending");
    assert.strictEqual(legacyCollaboration.json.account.invites[0].link, "/invite/invite_legacy");
    assert.strictEqual(legacyCollaboration.json.account.members.length, 1);
    assert.strictEqual(legacyCollaboration.json.account.members[0].id, "legacy_member");
    assert.strictEqual(legacyCollaboration.json.account.members[0].email, "legacy@example.com");
    assert.strictEqual(legacyCollaboration.json.account.members[0].role, "member");
    assert.strictEqual(legacyCollaboration.json.account.members[0].status, "active");
    assert.strictEqual(legacyCollaboration.json.account.members[0].joinedAt, "");
    assert.strictEqual(legacyCollaboration.json.account.members[0].roleUpdatedAt, "");
    const restoredCollaborationStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    restoredCollaborationStore.accounts[user.id].invites = [];
    restoredCollaborationStore.accounts[user.id].members = [];
    fs.writeFileSync(accountStorePath, `${JSON.stringify(restoredCollaborationStore, null, 2)}\n`);

    const invite = await request(server, {
      method: "POST",
      path: "/api/account/invites",
      body: { email: invitedUser.email, role: "editor" },
    });
    assert.strictEqual(invite.status, 200);
    assert.strictEqual(invite.json.invites[0].email, invitedUser.email);
    assert.strictEqual(invite.json.invites[0].role, "editor");
    assert.ok(invite.json.account.activityLog.some((event) => event.type === "invite_created" && event.targetEmail === invitedUser.email));

    const memberInvite = await request(server, {
      method: "POST",
      path: "/api/account/invites",
      body: { email: memberUser.email, role: "member" },
    });
    assert.strictEqual(memberInvite.status, 200);

    const acceptedMemberInvite = await request(server, {
      method: "POST",
      path: `/api/invite/${memberInvite.json.invites[0].id}/accept`,
      cookieValue: memberCookie,
    });
    assert.strictEqual(acceptedMemberInvite.status, 200);
    assert.strictEqual(acceptedMemberInvite.json.member.role, "member");

    const memberReadSummary = await request(server, { path: "/api/account/summary", cookieValue: memberCookie });
    assert.strictEqual(memberReadSummary.status, 200);
    assert.strictEqual(memberReadSummary.json.account.ownerEmail, user.email);

    const memberReadRankings = await request(server, { path: "/api/account/rankings", cookieValue: memberCookie });
    assert.strictEqual(memberReadRankings.status, 200);
    assert.strictEqual(typeof memberReadRankings.json.rankings.gated, "boolean");

    const memberReadMentions = await request(server, { path: "/api/account/ai-mentions", cookieValue: memberCookie });
    assert.strictEqual(memberReadMentions.status, 200);
    assert.strictEqual(typeof memberReadMentions.json.aiMentions.gated, "boolean");

    const memberBlockedProductCreate = await request(server, {
      method: "POST",
      path: "/api/account/products",
      cookieValue: memberCookie,
      body: { name: "Unauthorized product", category: "Manual" },
    });
    assert.strictEqual(memberBlockedProductCreate.status, 403);

    const inviteLookup = await request(server, {
      path: `/api/invite/${invite.json.invites[0].id}`,
      authenticated: false,
    });
    assert.strictEqual(inviteLookup.status, 200);
    assert.strictEqual(inviteLookup.json.invite.email, invitedUser.email);

    const unsupportedInviteAcceptExtraPath = await request(server, {
      method: "POST",
      path: `/api/invite/${invite.json.invites[0].id}/accept/extra`,
      cookieValue: invitedCookie,
    });
    assert.strictEqual(unsupportedInviteAcceptExtraPath.status, 404);

    const acceptedInvite = await request(server, {
      method: "POST",
      path: `/api/invite/${invite.json.invites[0].id}/accept`,
      cookieValue: invitedCookie,
    });
    assert.strictEqual(acceptedInvite.status, 200);
    assert.strictEqual(acceptedInvite.json.member.email, invitedUser.email);
    assert.strictEqual(acceptedInvite.json.member.role, "editor");

    const invitedSummary = await request(server, { path: "/api/account/summary", cookieValue: invitedCookie });
    assert.strictEqual(invitedSummary.status, 200);
    assert.strictEqual(invitedSummary.json.account.ownerEmail, user.email);
    assert.strictEqual(invitedSummary.json.selectedWorkspaceId, user.id);
    assert.strictEqual(invitedSummary.json.workspaces.some((workspace) => workspace.id === user.id && workspace.selected), true);
    assert.strictEqual(invitedSummary.json.workspaces.some((workspace) => workspace.id === invitedUser.id), true);

    const invitedWorkspaces = await request(server, { path: "/api/account/workspaces", cookieValue: invitedCookie });
    assert.strictEqual(invitedWorkspaces.status, 200);
    assert.ok(invitedWorkspaces.json.workspaces.length >= 2);

    const switchedWorkspace = await request(server, {
      method: "POST",
      path: "/api/account/workspaces/select",
      cookieValue: invitedCookie,
      body: { workspaceId: invitedUser.id },
    });
    assert.strictEqual(switchedWorkspace.status, 200);
    assert.strictEqual(switchedWorkspace.json.account.ownerEmail, invitedUser.email);
    assert.strictEqual(switchedWorkspace.json.selectedWorkspaceId, invitedUser.id);

    const createdWorkspace = await request(server, {
      method: "POST",
      path: "/api/account/workspaces",
      cookieValue: invitedCookie,
      body: { workspaceName: "Second Site", websiteUrl: "https://second.example.com" },
    });
    assert.strictEqual(createdWorkspace.status, 200);
    assert.strictEqual(createdWorkspace.json.account.workspaceName, "Second Site");
    assert.strictEqual(createdWorkspace.json.account.ownerEmail, invitedUser.email);
    assert.strictEqual(createdWorkspace.json.account.settings.cms.websiteUrl, "https://second.example.com/");
    assert.strictEqual(createdWorkspace.json.selectedWorkspaceId, createdWorkspace.json.account.id);
    assert.strictEqual(createdWorkspace.json.workspaces.some((workspace) => workspace.id === user.id), true);
    assert.strictEqual(createdWorkspace.json.workspaces.some((workspace) => workspace.id === invitedUser.id), true);
    assert.strictEqual(createdWorkspace.json.workspaces.some((workspace) => workspace.id === createdWorkspace.json.account.id && workspace.selected), true);

    const invalidWorkspaceCreate = await request(server, {
      method: "POST",
      path: "/api/account/workspaces",
      cookieValue: invitedCookie,
      body: { workspaceName: "", websiteUrl: "ftp://bad.example.com" },
    });
    assert.strictEqual(invalidWorkspaceCreate.status, 400);

    const resetInvitedWorkspace = await request(server, {
      method: "POST",
      path: "/api/account/workspaces/select",
      cookieValue: invitedCookie,
      body: { workspaceId: invitedUser.id },
    });
    assert.strictEqual(resetInvitedWorkspace.status, 200);
    assert.strictEqual(resetInvitedWorkspace.json.selectedWorkspaceId, invitedUser.id);

    const members = await request(server, { path: "/api/account/members" });
    assert.strictEqual(members.status, 200);
    assert.strictEqual(members.json.members.some((member) => member.email === invitedUser.email), true);
    assert.strictEqual(members.json.members.find((member) => member.email === invitedUser.email).role, "editor");

    const invalidMemberRole = await request(server, {
      method: "PUT",
      path: `/api/account/members/${encodeURIComponent(invitedUser.id)}`,
      body: { role: "owner" },
    });
    assert.strictEqual(invalidMemberRole.status, 400);

    const updatedMemberRole = await request(server, {
      method: "PUT",
      path: `/api/account/members/${encodeURIComponent(invitedUser.id)}`,
      body: { role: "admin" },
    });
    assert.strictEqual(updatedMemberRole.status, 200);
    const promotedMember = updatedMemberRole.json.members.find((member) => member.email === invitedUser.email);
    assert.strictEqual(promotedMember.role, "admin");
    assert.strictEqual(promotedMember.roleUpdatedBy, user.email);
    assert.ok(promotedMember.roleUpdatedAt);
    assert.ok(updatedMemberRole.json.account.activityLog.some((event) => event.type === "member_role_updated" && event.targetEmail === invitedUser.email && event.role === "admin"));

    const unsupportedMemberDetailRead = await request(server, { path: `/api/account/members/${encodeURIComponent(invitedUser.id)}` });
    assert.strictEqual(unsupportedMemberDetailRead.status, 404);

    const removedMember = await request(server, {
      method: "DELETE",
      path: `/api/account/members/${encodeURIComponent(invitedUser.id)}`,
    });
    assert.strictEqual(removedMember.status, 200);
    assert.strictEqual(removedMember.json.members.some((member) => member.email === invitedUser.email), false);
    assert.ok(removedMember.json.account.activityLog.some((event) => event.type === "member_removed" && event.targetEmail === invitedUser.email));

    const removedMemberSummary = await request(server, { path: "/api/account/summary", cookieValue: invitedCookie });
    assert.strictEqual(removedMemberSummary.status, 200);
    assert.strictEqual(removedMemberSummary.json.account.ownerEmail, invitedUser.email);
    assert.strictEqual(removedMemberSummary.json.selectedWorkspaceId, invitedUser.id);
    assert.strictEqual(removedMemberSummary.json.workspaces.some((workspace) => workspace.id === user.id), false);

    const removedMemberBlockedSwitch = await request(server, {
      method: "POST",
      path: "/api/account/workspaces/select",
      cookieValue: invitedCookie,
      body: { workspaceId: user.id },
    });
    assert.strictEqual(removedMemberBlockedSwitch.status, 404);

    const missingMemberDelete = await request(server, {
      method: "DELETE",
      path: `/api/account/members/${encodeURIComponent(invitedUser.id)}`,
    });
    assert.strictEqual(missingMemberDelete.status, 404);

    const revokedInvite = await request(server, {
      method: "DELETE",
      path: `/api/account/invites/${invite.json.invites[0].id}`,
    });
    assert.strictEqual(revokedInvite.status, 200);
    assert.strictEqual(revokedInvite.json.invites.some((candidate) => candidate.id === invite.json.invites[0].id), false);
    assert.ok(revokedInvite.json.account.activityLog.some((event) => event.type === "invite_revoked" && event.targetEmail === invitedUser.email));

    const missingInviteDelete = await request(server, {
      method: "DELETE",
      path: `/api/account/invites/${invite.json.invites[0].id}`,
    });
    assert.strictEqual(missingInviteDelete.status, 404);

    const invalidSupportCategory = await request(server, {
      method: "POST",
      path: "/api/account/support",
      body: { subject: "Publishing help", category: "Refunds", message: "Draft did not publish." },
    });
    assert.strictEqual(invalidSupportCategory.status, 400);

    const invalidSupportStatus = await request(server, {
      method: "POST",
      path: "/api/account/support",
      body: { subject: "Publishing help", category: "Publishing", message: "Draft did not publish.", status: "closed" },
    });
    assert.strictEqual(invalidSupportStatus.status, 400);

    const invalidSupportPriority = await request(server, {
      method: "POST",
      path: "/api/account/support",
      body: { subject: "Publishing help", category: "Publishing", priority: "panic", message: "Draft did not publish." },
    });
    assert.strictEqual(invalidSupportPriority.status, 400);

    const emptySupportMessage = await request(server, {
      method: "POST",
      path: "/api/account/support",
      body: { subject: "Publishing help", category: "Publishing", priority: "high", message: "" },
    });
    assert.strictEqual(emptySupportMessage.status, 400);

    const supportTicket = await request(server, {
      method: "POST",
      path: "/api/account/support",
      body: { subject: "Publishing help", category: "Publishing", priority: "high", pageContext: "/account?view=settings&tab=cms", message: "Draft did not publish." },
    });
    assert.strictEqual(supportTicket.status, 200);
    assert.strictEqual(supportTicket.json.supportTickets[0].subject, "Publishing help");
    assert.strictEqual(supportTicket.json.supportTickets[0].requesterEmail, user.email);
    assert.strictEqual(supportTicket.json.supportTickets[0].priority, "high");
    assert.strictEqual(supportTicket.json.supportTickets[0].pageContext, "/account?view=settings&tab=cms");
    assert.strictEqual(supportTicket.json.supportTickets[0].replies.length, 1);
    assert.strictEqual(supportTicket.json.account.supportTickets[0].subject, "Publishing help");

    const supportTickets = await request(server, { path: "/api/account/support" });
    assert.strictEqual(supportTickets.status, 200);
    assert.strictEqual(supportTickets.json.supportTickets.length, 1);

    const unsupportedSupportDetailRead = await request(server, { path: `/api/account/support/${supportTicket.json.supportTickets[0].id}` });
    assert.strictEqual(unsupportedSupportDetailRead.status, 404);

    const resolvedTicket = await request(server, {
      method: "PUT",
      path: `/api/account/support/${supportTicket.json.supportTickets[0].id}`,
      body: { status: "resolved" },
    });
    assert.strictEqual(resolvedTicket.status, 200);
    assert.strictEqual(resolvedTicket.json.supportTickets[0].status, "resolved");
    assert.strictEqual(resolvedTicket.json.account.supportTickets[0].status, "resolved");
    assert.ok(resolvedTicket.json.supportTickets[0].resolvedAt);

    const reopenedTicket = await request(server, {
      method: "PUT",
      path: `/api/account/support/${supportTicket.json.supportTickets[0].id}`,
      body: { status: "open" },
    });
    assert.strictEqual(reopenedTicket.status, 200);
    assert.strictEqual(reopenedTicket.json.supportTickets[0].status, "open");
    assert.strictEqual(reopenedTicket.json.supportTickets[0].resolvedAt, "");

    const repliedTicket = await request(server, {
      method: "PUT",
      path: `/api/account/support/${supportTicket.json.supportTickets[0].id}`,
      body: { status: "open", reply: "Added CMS screenshot details." },
    });
    assert.strictEqual(repliedTicket.status, 200);
    assert.strictEqual(repliedTicket.json.supportTickets[0].replies.length, 2);
    assert.strictEqual(repliedTicket.json.account.supportTickets[0].replies.length, 2);
    assert.strictEqual(repliedTicket.json.supportTickets[0].replies[1].message, "Added CMS screenshot details.");
    assert.strictEqual(repliedTicket.json.supportTickets[0].replies[1].authorEmail, user.email);

    const missingTicketUpdate = await request(server, {
      method: "PUT",
      path: "/api/account/support/not-a-ticket",
      body: { status: "resolved" },
    });
    assert.strictEqual(missingTicketUpdate.status, 404);

    const invalidLocationName = await request(server, {
      method: "POST",
      path: "/api/account/locations",
      body: { name: "", address: "1 Market St", phone: "555-0100", serviceArea: "Orange County" },
    });
    assert.strictEqual(invalidLocationName.status, 400);

    const invalidLocationCity = await request(server, {
      method: "POST",
      path: "/api/account/locations",
      body: { name: "No city office", address: "1 Market St", phone: "555-0100", serviceArea: "Orange County" },
    });
    assert.strictEqual(invalidLocationCity.status, 400);

    const invalidLocationState = await request(server, {
      method: "POST",
      path: "/api/account/locations",
      body: { name: "Long state office", city: "Dana Point", state: "California", address: "1 Market St", phone: "555-0100", serviceArea: "Orange County" },
    });
    assert.strictEqual(invalidLocationState.status, 400);

    const location = await request(server, {
      method: "POST",
      path: "/api/account/locations",
      body: { name: "Main office", city: "Dana Point", state: "CA", address: "1 Market St", phone: "555-0100", serviceArea: "Orange County", isPrimary: true },
    });
    assert.strictEqual(location.status, 200);
    assert.strictEqual(location.json.locations.length, 1);
    assert.strictEqual(location.json.locations[0].city, "Dana Point");
    assert.strictEqual(location.json.locations[0].state, "CA");
    assert.strictEqual(location.json.locations[0].isPrimary, true);

    const locationId = location.json.locations[0].id;
    const updatedLocation = await request(server, {
      method: "PUT",
      path: `/api/account/locations/${locationId}`,
      body: { ...location.json.locations[0], name: "South County office", city: "San Clemente", state: "CA", serviceArea: "South Orange County", isPrimary: false },
    });
    assert.strictEqual(updatedLocation.status, 200);
    assert.strictEqual(updatedLocation.json.locations[0].name, "South County office");
    assert.strictEqual(updatedLocation.json.locations[0].city, "San Clemente");
    assert.strictEqual(updatedLocation.json.locations[0].serviceArea, "South Orange County");
    assert.strictEqual(updatedLocation.json.locations[0].isPrimary, false);

    const unsupportedLocationAction = await request(server, {
      method: "POST",
      path: `/api/account/locations/${locationId}`,
      body: { name: "False success" },
    });
    assert.strictEqual(unsupportedLocationAction.status, 404);

    const unsupportedLocationDetailRead = await request(server, { path: `/api/account/locations/${locationId}` });
    assert.strictEqual(unsupportedLocationDetailRead.status, 404);

    const unsupportedLocationExtraPathUpdate = await request(server, {
      method: "PUT",
      path: `/api/account/locations/${locationId}/extra`,
      body: { ...location.json.locations[0], name: "False success" },
    });
    assert.strictEqual(unsupportedLocationExtraPathUpdate.status, 404);

    const invalidCheckoutPlan = await request(server, {
      method: "POST",
      path: "/api/account/billing/checkout",
      body: { plan: "Enterprise", billingPeriod: "monthly" },
    });
    assert.strictEqual(invalidCheckoutPlan.status, 400);

    const invalidBillingPeriod = await request(server, {
      method: "PUT",
      path: "/api/account/billing",
      body: { plan: "Pro", billingPeriod: "weekly" },
    });
    assert.strictEqual(invalidBillingPeriod.status, 400);

    const invalidBillingStatus = await request(server, {
      method: "PUT",
      path: "/api/account/billing",
      body: { plan: "Pro", billingPeriod: "monthly", status: "free-forever" },
    });
    assert.strictEqual(invalidBillingStatus.status, 400);

    const portalSession = await request(server, {
      method: "POST",
      path: "/api/account/billing/portal",
    });
    assert.strictEqual(portalSession.status, 200);
    assert.strictEqual(portalSession.json.portalUrl, "/account?view=billing&portal=local");
    assert.strictEqual(portalSession.json.billing.portalStatus, "local-portal-opened");
    assert.ok(portalSession.json.portalSession.expiresAt);
    assert.strictEqual(JSON.stringify(portalSession.json).includes("secret"), false);

    const unsupportedBillingActionRead = await request(server, { path: "/api/account/billing/cancel" });
    assert.strictEqual(unsupportedBillingActionRead.status, 404);

    const unsupportedBillingActionUpdate = await request(server, {
      method: "PUT",
      path: "/api/account/billing/cancel",
      body: { plan: "Pro", billingPeriod: "monthly", status: "active" },
    });
    assert.strictEqual(unsupportedBillingActionUpdate.status, 404);

    const unsupportedBillingCancelExtraPath = await request(server, { method: "POST", path: "/api/account/billing/cancel/extra" });
    assert.strictEqual(unsupportedBillingCancelExtraPath.status, 404);

    const checkout = await request(server, {
      method: "POST",
      path: "/api/account/billing/checkout",
      body: { plan: "Pro+", billingPeriod: "monthly" },
    });
    assert.strictEqual(checkout.status, 200);
    assert.strictEqual(checkout.json.billing.plan, "Pro+");
    assert.strictEqual(checkout.json.billing.status, "active");
    assert.strictEqual(checkout.json.billing.invoices.length, 1);
    assert.match(checkout.json.billing.trialEndsAt, /^\d{4}-\d{2}-\d{2}$/);
    const trialStart = new Date(`${checkout.json.billing.trialEndsAt}T00:00:00.000Z`);
    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const trialDaysAway = Math.round((trialStart.getTime() - todayUtc) / 86400000);
    assert.ok(trialDaysAway >= 2 && trialDaysAway <= 4);

    const billingPeriod = await request(server, {
      method: "PUT",
      path: "/api/account/billing",
      body: { plan: "Pro+", billingPeriod: "annual", status: "active", paymentMethod: "Visa ending 4242" },
    });
    assert.strictEqual(billingPeriod.status, 200);
    assert.strictEqual(billingPeriod.json.billing.billingPeriod, "annual");
    assert.strictEqual(billingPeriod.json.billing.price, "$69/mo annual");

    const failedPayment = await request(server, {
      method: "POST",
      path: "/api/account/billing/payment-failed",
      body: { reason: "Card declined" },
    });
    assert.strictEqual(failedPayment.status, 200);
    assert.strictEqual(failedPayment.json.billing.status, "past_due");
    assert.strictEqual(failedPayment.json.billing.portalStatus, "payment-failed");
    assert.strictEqual(failedPayment.json.billing.failedPayment.reason, "Card declined");
    assert.strictEqual(failedPayment.json.billing.invoices[0].status, "failed");
    assert.strictEqual(JSON.stringify(failedPayment.json).includes("secret"), false);

    const invoiceDetail = await request(server, { path: `/api/account/billing/invoices/${failedPayment.json.billing.invoices[0].id}` });
    assert.strictEqual(invoiceDetail.status, 200);
    assert.strictEqual(invoiceDetail.json.invoice.status, "failed");
    assert.strictEqual(invoiceDetail.json.invoice.failureReason, "Card declined");
    assert.ok(invoiceDetail.json.invoice.hostedInvoiceUrl.includes("/account?view=billing&invoice="));
    assert.strictEqual(invoiceDetail.json.invoice.hostedInvoiceUrl, `/account?view=billing&invoice=${invoiceDetail.json.invoice.id}`);

    const missingInvoiceDetail = await request(server, { path: "/api/account/billing/invoices/missing_invoice" });
    assert.strictEqual(missingInvoiceDetail.status, 404);

    const unsupportedInvoiceExtraPath = await request(server, { path: `/api/account/billing/invoices/${failedPayment.json.billing.invoices[0].id}/extra` });
    assert.strictEqual(unsupportedInvoiceExtraPath.status, 404);

    const cancelled = await request(server, { method: "POST", path: "/api/account/billing/cancel" });
    assert.strictEqual(cancelled.status, 200);
    assert.strictEqual(cancelled.json.billing.status, "cancelled");

    const reactivated = await request(server, { method: "POST", path: "/api/account/billing/reactivate" });
    assert.strictEqual(reactivated.status, 200);
    assert.strictEqual(reactivated.json.billing.status, "active");

    const invalidSearchConnect = await request(server, {
      method: "POST",
      path: "/api/account/search-console/connect",
      body: { propertyUrl: "" },
    });
    assert.strictEqual(invalidSearchConnect.status, 400);

    const malformedSearchConnect = await request(server, {
      method: "POST",
      path: "/api/account/search-console/connect",
      body: { propertyUrl: "not-a-url" },
    });
    assert.strictEqual(malformedSearchConnect.status, 400);

    const searchConnect = await request(server, {
      method: "POST",
      path: "/api/account/search-console/connect",
      body: { propertyUrl: "https://sirbloggsalot.com" },
    });
    assert.strictEqual(searchConnect.status, 200);
    assert.strictEqual(searchConnect.json.searchConsole.status, "connected");
    assert.ok(searchConnect.json.searchConsole.impressions > 0);
    assert.strictEqual(searchConnect.json.searchConsole.dateRange, "28");
    assert.strictEqual(searchConnect.json.searchConsole.trend.length, 28);
    assert.ok(searchConnect.json.searchConsole.trend[0].date);
    assert.strictEqual(typeof searchConnect.json.searchConsole.trend[0].clicks, "number");
    assert.strictEqual(searchConnect.json.searchConsole.topPages.some((page) => page.page === "/blog/canva-website-builder"), true);
    assert.strictEqual(searchConnect.json.account.setupChecklist.items.find((item) => item.id === "tracking").complete, true);

    const searchSync = await request(server, { method: "POST", path: "/api/account/search-console/sync" });
    assert.strictEqual(searchSync.status, 200);
    assert.ok(searchSync.json.searchConsole.lastSyncedAt);
    assert.strictEqual(searchSync.json.searchConsole.topPages.some((page) => page.page === "/blog/canva-website-builder"), true);

    const searchRange90 = await request(server, { path: "/api/account/search-console?range=90" });
    assert.strictEqual(searchRange90.status, 200);
    assert.strictEqual(searchRange90.json.searchConsole.dateRange, "90");
    assert.strictEqual(searchRange90.json.searchConsole.trend.length, 90);

    const searchRange7 = await request(server, { path: "/api/account/search-console?range=7" });
    assert.strictEqual(searchRange7.status, 200);
    assert.strictEqual(searchRange7.json.searchConsole.dateRange, "7");
    assert.strictEqual(searchRange7.json.searchConsole.trend.length, 7);

    const searchExport = await request(server, { path: "/api/account/search-console/export" });
    assert.strictEqual(searchExport.status, 200);
    assert.strictEqual(searchExport.json.filename, "sirbloggsalot-search-console.csv");
    assert.ok(searchExport.json.csv.startsWith("type,label,clicks,impressions"));
    assert.ok(searchExport.json.csv.includes("trend,"));
    assert.ok(searchExport.json.csv.includes("canva website builder"));

    const unsupportedSearchSyncRead = await request(server, { path: "/api/account/search-console/sync" });
    assert.strictEqual(unsupportedSearchSyncRead.status, 404);

    const unsupportedSearchSyncExtraPath = await request(server, { method: "POST", path: "/api/account/search-console/sync/extra" });
    assert.strictEqual(unsupportedSearchSyncExtraPath.status, 404);

    const rankings = await request(server, { path: "/api/account/rankings?range=90" });
    assert.strictEqual(rankings.status, 200);
    assert.strictEqual(rankings.json.rankings.gated, false);
    assert.strictEqual(rankings.json.rankings.dateRange, "90");
    assert.strictEqual(rankings.json.rankings.trend.length, 90);
    assert.strictEqual(typeof rankings.json.rankings.trend[0].averagePosition, "number");
    assert.ok(rankings.json.rankings.keywords.length > 0);
    assert.strictEqual(rankings.json.rankings.keywords.some((keyword) => keyword.url === "/blog/canva-website-builder"), true);

    const rankingsExport = await request(server, { path: "/api/account/rankings/export" });
    assert.strictEqual(rankingsExport.status, 200);
    assert.strictEqual(rankingsExport.json.filename, "sirbloggsalot-rankings.csv");
    assert.ok(rankingsExport.json.csv.startsWith("type,keyword,url,position,change,date,averagePosition"));
    assert.ok(rankingsExport.json.csv.includes("trend,"));
    assert.ok(rankingsExport.json.csv.includes("canva website builder"));

    const unsupportedRankingsDetailRead = await request(server, { path: "/api/account/rankings/details" });
    assert.strictEqual(unsupportedRankingsDetailRead.status, 404);

    const mentions = await request(server, { path: "/api/account/ai-mentions?source=ChatGPT&model=GPT-4o" });
    assert.strictEqual(mentions.status, 200);
    assert.strictEqual(mentions.json.aiMentions.gated, false);
    assert.ok(mentions.json.aiMentions.trend.length > 0);
    assert.strictEqual(mentions.json.aiMentions.dateRange, "30");
    assert.strictEqual(typeof mentions.json.aiMentions.trend[0].mentions, "number");
    assert.ok(mentions.json.aiMentions.sources.includes("ChatGPT"));
    assert.ok(mentions.json.aiMentions.models.includes("GPT-4o"));
    assert.ok(mentions.json.aiMentions.mentions.length > 0);
    assert.strictEqual(mentions.json.aiMentions.mentions.every((mention) => mention.source === "ChatGPT" && mention.model === "GPT-4o"), true);

    const mentionsRange = await request(server, { path: "/api/account/ai-mentions?range=90" });
    assert.strictEqual(mentionsRange.status, 200);
    assert.strictEqual(mentionsRange.json.aiMentions.dateRange, "90");
    assert.strictEqual(mentionsRange.json.aiMentions.trend.length, 90);

    const mentionsExport = await request(server, { path: "/api/account/ai-mentions/export" });
    assert.strictEqual(mentionsExport.status, 200);
    assert.strictEqual(mentionsExport.json.filename, "sirbloggsalot-ai-mentions.csv");
    assert.ok(mentionsExport.json.csv.startsWith("type,source,model,prompt,status,date,mentions"));
    assert.ok(mentionsExport.json.csv.includes("trend,"));
    assert.ok(mentionsExport.json.csv.includes("ChatGPT"));

    const reports = await request(server, { path: "/api/account/reports" });
    assert.strictEqual(reports.status, 200);
    assert.ok(reports.json.reports.summary.articles > 0);
    assert.ok(reports.json.reports.summary.clicks > 0);
    assert.ok(reports.json.reports.chart.some((point) => point.label === "Clicks"));
    assert.strictEqual(reports.json.reports.sharing.shareUrl, "");
    assert.strictEqual(reports.json.reports.schedule.enabled, false);
    assert.strictEqual(reports.json.reports.template.key, "performance");
    assert.strictEqual(reports.json.reports.template.label, "Performance summary");
    assert.ok(reports.json.reports.rows.some((row) => row.section === "content"));

    const reportShare = await request(server, { method: "POST", path: "/api/account/reports/share", body: { template: "inventory" } });
    assert.strictEqual(reportShare.status, 200);
    assert.ok(reportShare.json.reports.sharing.shareUrl.startsWith("/reports/"));
    assert.strictEqual(reportShare.json.reports.template.key, "inventory");
    assert.strictEqual(reportShare.json.account.reports.template, "inventory");
    assert.strictEqual(JSON.stringify(reportShare.json).includes("secret"), false);
    await assertSharedReportHtmlRoutes(server, reportShare.json.reports.sharing.shareUrl);

    const reportSchedule = await request(server, { method: "POST", path: "/api/account/reports/schedule" });
    assert.strictEqual(reportSchedule.status, 200);
    assert.strictEqual(reportSchedule.json.reports.schedule.enabled, true);
    assert.strictEqual(reportSchedule.json.reports.schedule.cadence, "weekly");
    assert.deepStrictEqual(reportSchedule.json.reports.schedule.recipients, [user.email]);

    const customReportSchedule = await request(server, {
      method: "POST",
      path: "/api/account/reports/schedule",
      body: { cadence: "monthly", template: "executive", recipients: ["owner@example.com", "team@example.com"] },
    });
    assert.strictEqual(customReportSchedule.status, 200);
    assert.strictEqual(customReportSchedule.json.reports.schedule.enabled, true);
    assert.strictEqual(customReportSchedule.json.reports.schedule.cadence, "monthly");
    assert.strictEqual(customReportSchedule.json.reports.template.key, "executive");
    assert.strictEqual(customReportSchedule.json.reports.schedule.template, "executive");
    assert.deepStrictEqual(customReportSchedule.json.reports.schedule.recipients, ["owner@example.com", "team@example.com"]);

    const invalidReportScheduleRecipient = await request(server, {
      method: "POST",
      path: "/api/account/reports/schedule",
      body: { cadence: "weekly", recipients: ["not-an-email"] },
    });
    assert.strictEqual(invalidReportScheduleRecipient.status, 400);

    const unsupportedReportsShareRead = await request(server, { path: "/api/account/reports/share" });
    assert.strictEqual(unsupportedReportsShareRead.status, 404);

    const unsupportedReportsScheduleExtraPath = await request(server, { method: "POST", path: "/api/account/reports/schedule/extra" });
    assert.strictEqual(unsupportedReportsScheduleExtraPath.status, 404);

    const reportsExport = await request(server, { path: "/api/account/reports/export" });
    assert.strictEqual(reportsExport.status, 200);
    assert.strictEqual(reportsExport.json.filename, "sirbloggsalot-reports.csv");
    assert.ok(reportsExport.json.csv.startsWith("template,section,label,value,detail,publicPath"));
    assert.ok(reportsExport.json.csv.includes("Executive digest"));
    assert.ok(reportsExport.json.csv.includes("content"));
    assert.ok(reportsExport.json.csv.includes("/blog/canva-website-builder"));

    const seoAnalysis = await request(server, { path: "/api/account/seo-analysis" });
    assert.strictEqual(seoAnalysis.status, 200);
    assert.strictEqual(typeof seoAnalysis.json.seoAnalysis.summary.score, "number");
    assert.ok(seoAnalysis.json.seoAnalysis.chart.some((item) => item.label === "Schema"));
    assert.ok(seoAnalysis.json.seoAnalysis.checks.some((item) => item.label === "Internal links"));
    assert.ok(Array.isArray(seoAnalysis.json.seoAnalysis.issues));
    assert.ok(Array.isArray(seoAnalysis.json.seoAnalysis.opportunities));

    const seoAnalysisExport = await request(server, { path: "/api/account/seo-analysis/export" });
    assert.strictEqual(seoAnalysisExport.status, 200);
    assert.strictEqual(seoAnalysisExport.json.filename, "sirbloggsalot-seo-analysis.csv");
    assert.ok(seoAnalysisExport.json.csv.startsWith("type,label,status,detail,passed,total,publicPath"));
    assert.ok(seoAnalysisExport.json.csv.includes("check,Schema"));
    assert.ok(seoAnalysisExport.json.csv.includes("chart,Internal links"));
    assert.ok(seoAnalysisExport.json.csv.includes("/blog/local-web-design-agency"));

    const searchDisconnect = await request(server, { method: "POST", path: "/api/account/search-console/disconnect" });
    assert.strictEqual(searchDisconnect.status, 200);
    assert.strictEqual(searchDisconnect.json.searchConsole.status, "disconnected");
    assert.strictEqual(searchDisconnect.json.searchConsole.clicks, 0);
    assert.strictEqual(searchDisconnect.json.account.setupChecklist.items.find((item) => item.id === "tracking").complete, false);

    const disconnectedSearchSync = await request(server, { method: "POST", path: "/api/account/search-console/sync" });
    assert.strictEqual(disconnectedSearchSync.status, 400);

    const invalidTopicTitle = await request(server, {
      method: "POST",
      path: "/api/account/topics",
      body: { title: "", keyword: "manual keyword", volume: 500, difficulty: "Medium" },
    });
    assert.strictEqual(invalidTopicTitle.status, 400);

    const invalidTopicVolume = await request(server, {
      method: "POST",
      path: "/api/account/topics",
      body: { title: "Manual topic", keyword: "manual keyword", volume: "not-a-number", difficulty: "Medium" },
    });
    assert.strictEqual(invalidTopicVolume.status, 400);

    const invalidTopicDifficulty = await request(server, {
      method: "POST",
      path: "/api/account/topics",
      body: { title: "Manual topic", keyword: "manual keyword", volume: 500, difficulty: "Impossible" },
    });
    assert.strictEqual(invalidTopicDifficulty.status, 400);

    const keywordSearch = await request(server, {
      method: "POST",
      path: "/api/account/topics/search",
      body: { query: "seo", filters: { volumeMin: 1000, difficultyMax: 30 } },
    });
    assert.strictEqual(keywordSearch.status, 200);
    assert.strictEqual(keywordSearch.json.topics.length, 1);
    assert.strictEqual(keywordSearch.json.topics[0].id, "topic_ai_seo");
    assert.strictEqual(keywordSearch.json.summary.filtered, 1);

    const formulaTopic = await request(server, {
      method: "POST",
      path: "/api/account/topics",
      body: { title: "Formula keyword", keyword: '=HYPERLINK("https://evil.example","formula")', volume: 1000, difficulty: "Medium" },
    });
    assert.strictEqual(formulaTopic.status, 200);

    const keywordExport = await request(server, {
      method: "POST",
      path: "/api/account/topics/export",
      body: { query: "seo", filters: { volumeMin: 1000, difficultyMax: 30 } },
    });
    assert.strictEqual(keywordExport.status, 200);
    assert.strictEqual(keywordExport.json.filename, "sirbloggsalot-keywords.csv");
    assert.ok(keywordExport.json.csv.startsWith("keyword,volume,cpc,difficulty,competition"));
    assert.ok(keywordExport.json.csv.includes("AI SEO for small business"));
    assert.strictEqual(keywordExport.json.csv.includes("local SEO content calendar"), false);

    const formulaKeywordExport = await request(server, {
      method: "POST",
      path: "/api/account/topics/export",
      body: { query: "formula" },
    });
    assert.strictEqual(formulaKeywordExport.status, 200);
    assert.ok(formulaKeywordExport.json.csv.includes('"\'=HYPERLINK(""https://evil.example"",""formula"")"'));

    const savedKeywords = await request(server, {
      method: "POST",
      path: "/api/account/topics/save-keywords",
      body: { topicIds: ["topic_ai_seo", "topic_content_calendar"] },
    });
    assert.strictEqual(savedKeywords.status, 200);
    assert.ok(savedKeywords.json.settings.site.keywords.includes("AI SEO for small business"));
    assert.ok(savedKeywords.json.settings.site.keywords.includes("local SEO content calendar"));
    assert.strictEqual(savedKeywords.json.account.setupChecklist.items.find((item) => item.id === "keywords").complete, true);

    const contentPlanBeforeTopicAdd = await request(server, { path: "/api/account/content-plan" });
    const planUpdatedAtBeforeTopicAdd = contentPlanBeforeTopicAdd.json.contentPlan.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const topic = await request(server, { method: "POST", path: "/api/account/topics/topic_ai_seo/add" });
    assert.strictEqual(topic.status, 200);
    assert.strictEqual(topic.json.topics.find((item) => item.id === "topic_ai_seo").added, true);
    assert.notStrictEqual(topic.json.contentPlan.updatedAt, planUpdatedAtBeforeTopicAdd);
    const planCountAfterTopicAdd = topic.json.contentPlan.items.length;

    const repeatedTopicAdd = await request(server, { method: "POST", path: "/api/account/topics/topic_ai_seo/add" });
    assert.strictEqual(repeatedTopicAdd.status, 409);
    const summaryAfterRepeatedTopicAdd = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(summaryAfterRepeatedTopicAdd.json.account.contentPlan.items.length, planCountAfterTopicAdd);

    const unsupportedTopicAction = await request(server, { method: "POST", path: "/api/account/topics/topic_ai_seo/archive" });
    assert.strictEqual(unsupportedTopicAction.status, 404);

    const unsupportedTopicDetailRead = await request(server, { path: "/api/account/topics/topic_ai_seo" });
    assert.strictEqual(unsupportedTopicDetailRead.status, 404);

    const createdTopic = await request(server, {
      method: "POST",
      path: "/api/account/topics",
      body: { title: "Manual topic", keyword: "manual keyword", volume: 500, difficulty: "Medium" },
    });
    assert.strictEqual(createdTopic.status, 200);
    assert.strictEqual(createdTopic.json.topics[0].title, "Manual topic");

    const updatedTopic = await request(server, {
      method: "PUT",
      path: `/api/account/topics/${createdTopic.json.topics[0].id}`,
      body: { ...createdTopic.json.topics[0], title: "Updated manual topic", keyword: "updated keyword", volume: 900, difficulty: "Easy" },
    });
    assert.strictEqual(updatedTopic.status, 200);
    assert.strictEqual(updatedTopic.json.topics[0].title, "Updated manual topic");
    assert.strictEqual(updatedTopic.json.topics[0].keyword, "updated keyword");
    assert.strictEqual(updatedTopic.json.topics[0].volume, 900);

    const deletedTopic = await request(server, { method: "DELETE", path: `/api/account/topics/${createdTopic.json.topics[0].id}` });
    assert.strictEqual(deletedTopic.status, 200);
    assert.strictEqual(deletedTopic.json.topics.some((item) => item.title === "Manual topic"), false);

    const missingTopicDelete = await request(server, { method: "DELETE", path: `/api/account/topics/${createdTopic.json.topics[0].id}` });
    assert.strictEqual(missingTopicDelete.status, 404);

    const invalidBulkCount = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-schedule",
      body: { count: 0, startDate: "2026-08-25", frequencyDays: 3, status: "scheduled" },
    });
    assert.strictEqual(invalidBulkCount.status, 400);

    const invalidBulkFrequency = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-schedule",
      body: { count: 2, startDate: "2026-08-25", frequencyDays: 0, status: "scheduled" },
    });
    assert.strictEqual(invalidBulkFrequency.status, 400);

    const invalidBulkStartDate = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-schedule",
      body: { count: 2, startDate: "not-a-date", frequencyDays: 3, status: "scheduled" },
    });
    assert.strictEqual(invalidBulkStartDate.status, 400);

    const invalidBulkStatus = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-schedule",
      body: { count: 2, startDate: "2026-08-25", frequencyDays: 3, status: "nonsense" },
    });
    assert.strictEqual(invalidBulkStatus.status, 400);

    const invalidArticleStatus = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/items",
      body: { title: "Bad status article", status: "nonsense" },
    });
    assert.strictEqual(invalidArticleStatus.status, 400);

    const invalidArticleTitle = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/items",
      body: { title: "", status: "draft" },
    });
    assert.strictEqual(invalidArticleTitle.status, 400);

    const invalidArticleVolume = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/items",
      body: { title: "Bad volume article", volume: "not-a-number", estimatedVisits: 10, status: "draft" },
    });
    assert.strictEqual(invalidArticleVolume.status, 400);

    const invalidArticleEstimatedVisits = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/items",
      body: { title: "Bad visits article", volume: 10, estimatedVisits: "not-a-number", status: "draft" },
    });
    assert.strictEqual(invalidArticleEstimatedVisits.status, 400);

    const invalidArticleScheduledDate = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/items",
      body: { title: "Bad date article", scheduledDate: "tomorrow-ish", status: "draft" },
    });
    assert.strictEqual(invalidArticleScheduledDate.status, 400);

    const futurePublishedPlanCreate = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/items",
      body: { title: "Future Published Plan Create", slug: "future-published-plan-create", body: "Ready body", scheduledDate: "2999-01-01", status: "published" },
    });
    assert.strictEqual(futurePublishedPlanCreate.status, 400);

    const futurePublishedBulkSchedule = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-schedule",
      body: { count: 1, startDate: "2999-01-01", frequencyDays: 1, status: "published" },
    });
    assert.strictEqual(futurePublishedBulkSchedule.status, 400);

    const bulk = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-schedule",
      body: { count: 2, startDate: "2026-08-25", frequencyDays: 3, status: "scheduled" },
    });
    assert.strictEqual(bulk.status, 200);
    assert.ok(bulk.json.contentPlan.items.some((item) => item.scheduledDate === "2026-08-25"));
    const bulkScheduledItem = bulk.json.contentPlan.items.find((item) => item.scheduledDate === "2026-08-25");

    const emptyBulkUpdate = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-update",
      body: { ids: [], status: "draft" },
    });
    assert.strictEqual(emptyBulkUpdate.status, 400);

    const invalidBulkUpdateStatus = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-update",
      body: { ids: [bulkScheduledItem.id], status: "nonsense" },
    });
    assert.strictEqual(invalidBulkUpdateStatus.status, 400);

    const bulkUpdatedArticles = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-update",
      body: { ids: [bulkScheduledItem.id], status: "draft" },
    });
    assert.strictEqual(bulkUpdatedArticles.status, 200);
    assert.strictEqual(bulkUpdatedArticles.json.contentPlan.items.find((item) => item.id === bulkScheduledItem.id).status, "draft");

    const bulkDraftedPublishedArticle = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-update",
      body: { ids: [manualPublishedItem.id], status: "draft" },
    });
    assert.strictEqual(bulkDraftedPublishedArticle.status, 200);
    const bulkDraftedPublishedItem = bulkDraftedPublishedArticle.json.contentPlan.items.find((item) => item.id === manualPublishedItem.id);
    assert.strictEqual(bulkDraftedPublishedItem.status, "draft");
    assert.strictEqual(bulkDraftedPublishedItem.publishedAt, "");
    assert.strictEqual(bulkDraftedPublishedItem.publicPath, "");
    assert.strictEqual(bulkDraftedPublishedItem.publishedUrl, "");

    const invalidArticleUpdateStatus = await request(server, {
      method: "PUT",
      path: `/api/account/content-plan/items/${bulkScheduledItem.id}`,
      body: { ...bulkScheduledItem, status: "nonsense" },
    });
    assert.strictEqual(invalidArticleUpdateStatus.status, 400);

    const unsupportedArticleAction = await request(server, {
      method: "POST",
      path: `/api/account/content-plan/items/${bulkScheduledItem.id}`,
      body: { title: "False success" },
    });
    assert.strictEqual(unsupportedArticleAction.status, 404);

    const articleDetail = await request(server, {
      path: `/api/account/content-plan/items/${bulkScheduledItem.id}`,
    });
    assert.strictEqual(articleDetail.status, 200);
    assert.strictEqual(articleDetail.json.item.id, bulkScheduledItem.id);
    assert.strictEqual(articleDetail.json.item.publicPath, "");
    assert.strictEqual(JSON.stringify(articleDetail.json).includes(user.email), false);

    const cmsReadyForPlanPublish = await request(server, {
      method: "POST",
      path: "/api/account/cms/connect",
      body: { websiteUrl: "https://sirbloggsalot.com", platform: "WordPress", username: "publisher", secret: "local-only" },
    });
    assert.strictEqual(cmsReadyForPlanPublish.status, 200);
    const futurePlanArticle = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/items",
      body: { title: "Future scheduled publish", slug: "future-scheduled-publish", body: "Ready body", scheduledDate: "2999-01-01", status: "draft" },
    });
    assert.strictEqual(futurePlanArticle.status, 200);
    const futurePlanItem = futurePlanArticle.json.contentPlan.items.find((item) => item.slug === "future-scheduled-publish");
    assert.ok(futurePlanItem);
    const futurePlanPublish = await request(server, {
      method: "POST",
      path: `/api/account/content-plan/items/${futurePlanItem.id}/publish`,
    });
    assert.strictEqual(futurePlanPublish.status, 400);
    const futurePlanBulkPublish = await request(server, {
      method: "POST",
      path: "/api/account/content-plan/bulk-update",
      body: { ids: [futurePlanItem.id], status: "published" },
    });
    assert.strictEqual(futurePlanBulkPublish.status, 400);
    const futurePlanEditPublish = await request(server, {
      method: "PUT",
      path: `/api/account/content-plan/items/${futurePlanItem.id}`,
      body: { ...futurePlanItem, status: "published", body: "Ready body" },
    });
    assert.strictEqual(futurePlanEditPublish.status, 400);

    const missingArticleDetail = await request(server, {
      path: "/api/account/content-plan/items/not-real",
    });
    assert.strictEqual(missingArticleDetail.status, 404);

    const legacyWriteDraftStore = JSON.parse(fs.readFileSync(accountStorePath, "utf8"));
    legacyWriteDraftStore.accounts[user.id].writeDraft = {
      title: " Legacy draft ",
      slug: "legacy-draft",
      keyword: " legacy keyword ",
      category: " Guides ",
      excerpt: " Legacy excerpt ",
      scheduledDate: "tomorrow",
      scheduledTime: "25:99",
      brief: " Legacy brief ",
      template: "press-release",
      audience: " Operators ",
      wordCount: "lots",
      internalLinks: " Legacy links ",
      seoTitle: " Legacy SEO ",
      metaDescription: " Legacy meta ",
      featuredImageUrl: "javascript:alert(1)",
      featuredImageAlt: " Legacy image ",
      body: " Legacy body ",
      notes: " Legacy note ",
      preview: " Legacy preview ",
      previewedAt: "recently",
      status: "published",
    };
    fs.writeFileSync(accountStorePath, `${JSON.stringify(legacyWriteDraftStore, null, 2)}\n`);
    const legacyWriteDraft = await request(server, { path: "/api/account/summary" });
    assert.strictEqual(legacyWriteDraft.status, 200);
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.title, "Legacy draft");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.keyword, "legacy keyword");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.scheduledDate, "");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.scheduledTime, "");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.template, "how-to");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.wordCount, 1200);
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.featuredImageUrl, "");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.previewedAt, "");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.status, "draft");
    assert.strictEqual(legacyWriteDraft.json.account.writeDraft.readiness.status, "nearly_ready");
    assert.ok(legacyWriteDraft.json.account.writeDraft.readiness.missing.includes("Schedule date"));

    const unsupportedArticleGenerateExtraPath = await request(server, {
      method: "POST",
      path: `/api/account/content-plan/items/${bulk.json.contentPlan.items[0].id}/generate/extra`,
    });
    assert.strictEqual(unsupportedArticleGenerateExtraPath.status, 404);

    const invalidWordCount = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        title: "Smoke title",
        keyword: "smoke keyword",
        brief: "Smoke brief",
        wordCount: "not-a-number",
      },
    });
    assert.strictEqual(invalidWordCount.status, 400);

    const invalidWriteTemplate = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        title: "Smoke title",
        keyword: "smoke keyword",
        brief: "Smoke brief",
        template: "press-release",
        wordCount: 1400,
      },
    });
    assert.strictEqual(invalidWriteTemplate.status, 400);

    const invalidWriteStatus = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        title: "Smoke title",
        keyword: "smoke keyword",
        brief: "Smoke brief",
        template: "comparison",
        wordCount: 1400,
        status: "published",
      },
    });
    assert.strictEqual(invalidWriteStatus.status, 400);

    const invalidWriteFeaturedImage = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        title: "Smoke title",
        keyword: "smoke keyword",
        brief: "Smoke brief",
        template: "comparison",
        wordCount: 1400,
        featuredImageUrl: "not-a-url",
      },
    });
    assert.strictEqual(invalidWriteFeaturedImage.status, 400);

    const draft = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        title: "Smoke title",
        slug: "smoke-title",
        keyword: "smoke keyword",
        category: "Guides",
        excerpt: "Smoke excerpt",
        canonicalUrl: "https://sirbloggsalot.com/blog/smoke-title",
        authorName: "Smoke Author",
        scheduledDate: "2026-08-09",
        scheduledTime: "09:45",
        brief: "Smoke brief",
        template: "comparison",
        audience: "Operations teams",
        wordCount: 1400,
        volume: 1600,
        difficulty: "Medium",
        estimatedVisits: 120,
        internalLinks: "https://sirbloggsalot.com/pricing",
        seoTitle: "Smoke SEO title",
        metaDescription: "Smoke meta description",
        featuredImageUrl: "https://sirbloggsalot.com/assets/sirbloggsalot-og.png",
        featuredImageAlt: "Smoke image alt",
        body: "Smoke draft body",
        notes: "Private smoke note",
        sourcePostId: "source-article",
        sourceStatus: "scheduled",
        status: "draft",
      },
    });
    assert.strictEqual(draft.status, 200);
    assert.strictEqual(draft.json.writeDraft.title, "Smoke title");
    assert.strictEqual(draft.json.writeDraft.slug, "smoke-title");
    assert.strictEqual(draft.json.writeDraft.category, "Guides");
    assert.strictEqual(draft.json.writeDraft.excerpt, "Smoke excerpt");
    assert.strictEqual(draft.json.writeDraft.canonicalUrl, "https://sirbloggsalot.com/blog/smoke-title");
    assert.strictEqual(draft.json.writeDraft.authorName, "Smoke Author");
    assert.strictEqual(draft.json.writeDraft.scheduledDate, "2026-08-09");
    assert.strictEqual(draft.json.writeDraft.scheduledTime, "09:45");
    assert.strictEqual(draft.json.writeDraft.template, "comparison");
    assert.strictEqual(draft.json.writeDraft.audience, "Operations teams");
    assert.strictEqual(draft.json.writeDraft.wordCount, 1400);
    assert.strictEqual(draft.json.writeDraft.volume, 1600);
    assert.strictEqual(draft.json.writeDraft.difficulty, "Medium");
    assert.strictEqual(draft.json.writeDraft.estimatedVisits, 120);
    assert.strictEqual(draft.json.writeDraft.internalLinks, "https://sirbloggsalot.com/pricing");
    assert.strictEqual(draft.json.writeDraft.seoTitle, "Smoke SEO title");
    assert.strictEqual(draft.json.writeDraft.metaDescription, "Smoke meta description");
    assert.strictEqual(draft.json.writeDraft.featuredImageUrl, "https://sirbloggsalot.com/assets/sirbloggsalot-og.png");
    assert.strictEqual(draft.json.writeDraft.featuredImageAlt, "Smoke image alt");
    assert.strictEqual(draft.json.writeDraft.body, "Smoke draft body");
    assert.strictEqual(draft.json.writeDraft.notes, "Private smoke note");
    assert.strictEqual(draft.json.writeDraft.sourcePostId, "source-article");
    assert.strictEqual(draft.json.writeDraft.sourceStatus, "scheduled");
    assert.strictEqual(draft.json.writeDraft.readiness.status, "ready");
    assert.strictEqual(draft.json.writeDraft.readiness.score, 100);
    assert.deepStrictEqual(draft.json.writeDraft.readiness.missing, []);

    const clearedCanonicalDraft = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        ...draft.json.writeDraft,
        canonicalUrl: "",
      },
    });
    assert.strictEqual(clearedCanonicalDraft.status, 200);
    assert.strictEqual(clearedCanonicalDraft.json.writeDraft.canonicalUrl, "");

    const clearedFeaturedImageDraft = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        ...draft.json.writeDraft,
        featuredImageUrl: "",
      },
    });
    assert.strictEqual(clearedFeaturedImageDraft.status, 200);
    assert.strictEqual(clearedFeaturedImageDraft.json.writeDraft.featuredImageUrl, "");

    const thinDraft = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft",
      body: {
        title: "Thin title",
        slug: "",
        keyword: "",
        category: "",
        excerpt: "",
        scheduledDate: "",
        scheduledTime: "",
        brief: "",
        template: "how-to",
        audience: "",
        wordCount: 1200,
        internalLinks: "",
        seoTitle: "",
        metaDescription: "",
        featuredImageUrl: "",
        featuredImageAlt: "",
        body: "",
        notes: "",
        status: "draft",
      },
    });
    assert.strictEqual(thinDraft.status, 200);
    assert.strictEqual(thinDraft.json.writeDraft.readiness.status, "needs_work");
    assert.ok(thinDraft.json.writeDraft.readiness.score < 100);
    assert.ok(thinDraft.json.writeDraft.readiness.missing.includes("Target keyword"));
    assert.ok(thinDraft.json.writeDraft.readiness.missing.includes("Draft body or brief"));

    const previewDraft = await request(server, { method: "POST", path: "/api/account/write-draft/preview" });
    assert.strictEqual(previewDraft.status, 200);
    assert.ok(previewDraft.json.writeDraft.preview.includes("Thin title"));
    assert.ok(previewDraft.json.writeDraft.preview.includes("No keyword set"));
    assert.strictEqual(previewDraft.json.writeDraft.previewStatus, "provider-pending");
    assert.strictEqual(previewDraft.json.writeDraft.previewSource, "local-brief");
    assert.strictEqual(previewDraft.json.writeDraft.readiness.status, "needs_work");
    assert.ok(previewDraft.json.writeDraft.previewedAt);

    const unsupportedWriteDraftPreviewRead = await request(server, { path: "/api/account/write-draft/preview" });
    assert.strictEqual(unsupportedWriteDraftPreviewRead.status, 404);

    const unsupportedWriteDraftPreviewUpdate = await request(server, {
      method: "PUT",
      path: "/api/account/write-draft/preview",
      body: {
        title: "Wrong route",
        keyword: "wrong route",
        brief: "This should not update from a child path.",
        template: "comparison",
        wordCount: 1400,
        status: "draft",
      },
    });
    assert.strictEqual(unsupportedWriteDraftPreviewUpdate.status, 404);

    console.log("Account API checks passed.");
  } finally {
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
