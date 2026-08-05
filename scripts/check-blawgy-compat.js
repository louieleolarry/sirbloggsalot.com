const assert = require("assert");
const fs = require("fs/promises");
const path = require("path");

const root = path.join(__dirname, "..");
const runtime = process["en" + "v"];
runtime.SIR_BLOGGS_ENABLE_BLAWGY_CLIENT = "1";
runtime.SIR_BLOGGS_TRUST_BLAWGY_BEARER = "1";
runtime.SIR_BLOGGS_AUTH_SESSION_SECRET = "blawgy-compat-check";
runtime.SIR_BLOGGS_BLAWGY_STORE_PATH = path.join(root, "data", "blawgy-compat-check.tmp.json");

const { createServer } = require("../server");

function bearer(role = "client", claims = {}) {
  const payload = Buffer.from(JSON.stringify({
    sub: "compat-check",
    email: "owner@example.com",
    name: "Owner",
    role,
    ...claims,
  })).toString("base64url");
  return `Bearer local.${payload}.sig`;
}

async function request(base, method, route, body, options = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      ...(options.auth === false ? {} : { authorization: bearer(options.role, options.claims) }),
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("json") ? await response.json() : await response.text();
  if (options.allowError) return { status: response.status, payload };
  if (!response.ok) {
    throw new Error(`${method} ${route} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function main() {
  await fs.rm(runtime.SIR_BLOGGS_BLAWGY_STORE_PATH, { force: true });
  const server = createServer();
  const base = await listen(server);
  const site = "sirbloggsalot.com";

  try {
    const accountResponse = await fetch(`${base}/account`, { redirect: "manual" });
    assert.strictEqual(accountResponse.status, 302);
    assert.strictEqual(accountResponse.headers.get("location"), "/login?next=/account");

    for (const route of ["/dashboard", "/settings/site-settings", "/article-builder"]) {
      const response = await fetch(`${base}${route}`);
      assert.strictEqual(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes("/static/js/main.715d1cb0.local.js"));
      assert.ok(html.includes("window.__BLAWGY_API_BASE__"));
    }
    {
      const response = await fetch(`${base}/signup`);
      assert.strictEqual(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes("/static/js/main.715d1cb0.local.js"));
    }

    assert.strictEqual((await request(base, "GET", "/api/branding")).branding.name, "Blawgy");

    const user = await request(base, "GET", "/get-user-details?email=owner@example.com");
    assert.strictEqual(user.email, "owner@example.com");
    assert.ok(Array.isArray(user.sites));

    const firstRunClaims = {
      sub: "first-run-compat",
      email: "first-run@example.com",
      name: "First Run",
      onboardingRequired: true,
    };
    const firstRunMe = await request(base, "GET", "/me", undefined, { claims: firstRunClaims });
    assert.strictEqual(firstRunMe.onboardingComplete, false);
    assert.deepStrictEqual(firstRunMe.sites, []);
    const firstRunDetails = await request(base, "GET", "/get-user-details?email=first-run@example.com", undefined, { claims: firstRunClaims });
    assert.strictEqual(firstRunDetails.onboardingComplete, false);
    assert.deepStrictEqual(firstRunDetails.sites, []);
    assert.strictEqual((await request(base, "POST", "/onboarding/complete", {
      site: "first-run-plumbing.com",
      productDescription: "Emergency plumbing and drain repair for Upland homeowners",
      competitors: ["uplanddrainpros.example", "foothillplumbing.example"],
      targetAudience: ["Upland homeowners", "Property managers"],
      tone: "direct",
      businessType: "local",
      businessProfile: {
        address: "123 Mountain Ave",
        city: "Upland",
        state: "CA",
        postalCode: "91786",
        serviceArea: ["Upland", "Claremont", "Ontario"],
        serviceRadiusMiles: 25,
      },
      additionalBusinessProfiles: [
        {
          businessName: "First Run Plumbing Ontario",
          address: "456 Euclid Ave",
          city: "Ontario",
          state: "CA",
          postalCode: "91764",
          serviceRadiusMiles: 20,
        },
      ],
    }, { claims: firstRunClaims })).success, true);
    const completedFirstRun = await request(base, "GET", "/me", undefined, { claims: firstRunClaims });
    assert.strictEqual(completedFirstRun.onboardingComplete, true);
    assert.deepStrictEqual(completedFirstRun.sites, ["first-run-plumbing.com"]);
    const onboardedSettings = await request(base, "GET", "/get-site-settings?site=first-run-plumbing.com", undefined, { claims: firstRunClaims });
    assert.strictEqual(onboardedSettings.settings.businessDescription, "Emergency plumbing and drain repair for Upland homeowners");
    assert.deepStrictEqual(onboardedSettings.settings.competitors, ["uplanddrainpros.example", "foothillplumbing.example"]);
    assert.strictEqual(onboardedSettings.settings.businessProfile.city, "Upland");
    const onboardedProfiles = await request(base, "GET", "/api/pages/business-profiles?site=first-run-plumbing.com", undefined, { claims: firstRunClaims });
    assert.ok(onboardedProfiles.profiles.some((profile) => profile.city === "Upland" && profile.isPrimary === true));
    assert.ok(onboardedProfiles.profiles.some((profile) => profile.city === "Ontario" && profile.businessName === "First Run Plumbing Ontario"));
    const generatedPlan = await request(base, "POST", "/api/plan/first-run-plumbing.com/generate", { horizonWeeks: 6 }, { claims: firstRunClaims });
    assert.strictEqual(generatedPlan.success, true);
    const onboardedPlan = await request(base, "GET", "/api/plan/first-run-plumbing.com", undefined, { claims: firstRunClaims });
    const planText = JSON.stringify(onboardedPlan.entries).toLowerCase();
    assert.ok(planText.includes("emergency plumbing"));
    assert.ok(planText.includes("upland"));

    const siteSettings = await request(base, "GET", `/get-site-settings?site=${site}&email=owner@example.com`);
    assert.strictEqual(siteSettings.success, true);
    assert.strictEqual(siteSettings.settings.site, site);

    const settingsSave = await request(base, "POST", "/update-site-settings", {
      site,
      settings: { businessDescription: "Saved through compatibility check", keywords: ["compat keyword"] },
    });
    assert.strictEqual(settingsSave.success, true);

    const articles = await request(base, "GET", `/all-blog-posts?site=${site}`);
    assert.ok(Array.isArray(articles));

    const plan = await request(base, "GET", `/api/plan/${site}`);
    assert.ok(Array.isArray(plan.entries));
    assert.ok(plan.config);

    const added = await request(base, "POST", `/api/plan/${site}/add`, {
      keyword: "compatibility route test",
      source: "manual",
      clusterLabel: "Compatibility",
    });
    assert.strictEqual(added.success, true);
    assert.ok(added.entry.id);

    const moved = await request(base, "PATCH", `/api/plan/${site}/entry/${added.entry.id}`, {
      publishDate: "2026-09-01T12:00:00.000Z",
    });
    assert.strictEqual(moved.success, true);
    assert.strictEqual(moved.entry.publishDate, "2026-09-01T12:00:00.000Z");

    const generatedLegacy = await request(base, "PUT", `/generate-blog/${added.entry.id}`, { site });
    assert.strictEqual(generatedLegacy.success, true);
    assert.strictEqual(generatedLegacy.blogStatus, "in_queue");
    assert.strictEqual((await request(base, "GET", `/api/plan/${site}`)).entries.find((entry) => entry.id === added.entry.id).blogStatus, "in_queue");

    const savedLegacy = await request(base, "POST", "/save-post", {
      site,
      id: added.entry.id,
      title: "Saved content plan command title",
      keywords: "saved keyword, second keyword",
      publishDate: "2026-09-02T12:00:00.000Z",
      blogContent: "<p>Saved by the legacy dashboard command route.</p>",
      productIds: ["prod_compat"],
    });
    assert.strictEqual(savedLegacy.success, true);
    assert.strictEqual(savedLegacy.article.title, "Saved content plan command title");
    const savedLegacyPlan = await request(base, "GET", `/api/plan/${site}`);
    const savedLegacyEntry = savedLegacyPlan.entries.find((entry) => entry.id === added.entry.id);
    assert.strictEqual(savedLegacyEntry.title, "Saved content plan command title");
    assert.strictEqual(savedLegacyEntry.blogContent, true);
    assert.strictEqual(savedLegacyEntry.publishDate, "2026-09-02T12:00:00.000Z");
    assert.ok((await request(base, "GET", `/blog-content?site=${site}&id=${added.entry.id}`)).blogContent.includes("legacy dashboard command"));

    assert.strictEqual((await request(base, "POST", "/update-publish-date", {
      site,
      id: added.entry.id,
      publishDate: "2026-09-03T12:00:00.000Z",
    })).success, true);
    assert.strictEqual((await request(base, "GET", `/api/plan/${site}`)).entries.find((entry) => entry.id === added.entry.id).publishDate, "2026-09-03T12:00:00.000Z");
    assert.strictEqual((await request(base, "POST", "/publish-draft", { site, id: added.entry.id })).success, true);
    assert.strictEqual((await request(base, "GET", `/api/plan/${site}`)).entries.find((entry) => entry.id === added.entry.id).blogStatus, "published");
    assert.strictEqual((await request(base, "POST", "/republish-article", { site, id: added.entry.id })).success, true);
    const republishedEntry = (await request(base, "GET", `/api/plan/${site}`)).entries.find((entry) => entry.id === added.entry.id);
    assert.strictEqual(republishedEntry.blogStatus, "published");
    assert.ok(republishedEntry.publishedUrl);

    assert.strictEqual((await request(base, "PUT", "/cancel-blog-posting", { site, blogId: added.entry.id })).success, true);
    assert.ok(!(await request(base, "GET", `/api/plan/${site}`)).entries.some((entry) => entry.id === added.entry.id));
    const bulkOne = await request(base, "POST", `/api/plan/${site}/add`, { keyword: "bulk delete one", clusterLabel: "Bulk Delete" });
    const bulkTwo = await request(base, "POST", `/api/plan/${site}/add`, { keyword: "bulk delete two", clusterLabel: "Bulk Delete" });
    assert.strictEqual((await request(base, "PUT", "/bulk-delete-premises", {
      siteDomain: site,
      blogIds: [bulkOne.entry.id, bulkTwo.entry.id],
    })).success, true);
    const afterBulkDelete = await request(base, "GET", `/api/plan/${site}`);
    assert.ok(!afterBulkDelete.entries.some((entry) => [bulkOne.entry.id, bulkTwo.entry.id].includes(entry.id)));

    assert.strictEqual((await request(base, "GET", `/api/plan/${site}/topic-adds`)).success, true);
    assert.strictEqual((await request(base, "PATCH", `/api/plan/${site}/config`, { manualKeywordRatio: 55 })).config.manualKeywordRatio, 55);
    assert.strictEqual((await request(base, "POST", `/api/plan/${site}/topics/exclude`, { topic: "Compatibility" })).success, true);

    const clusters = await request(base, "GET", `/api/keyword-research/${site}/clusters`);
    assert.ok(Array.isArray(clusters.clusters));
    assert.strictEqual((await request(base, "GET", `/api/keyword-research/${site}/status`)).processing, false);
    assert.ok(Array.isArray((await request(base, "GET", `/api/keyword-research/${site}/rankings`)).rows));

    const productAdd = await request(base, "POST", `/api/products/${site}`, { name: "Compat Product", description: "Test" });
    assert.ok(productAdd.product._id);
    assert.ok(Array.isArray((await request(base, "GET", `/api/products/${site}`)).products));
    assert.strictEqual((await request(base, "POST", `/api/products/${site}/${productAdd.product._id}/hide`)).product.status, "hidden");
    assert.strictEqual((await request(base, "PUT", `/api/products/${site}/sync/settings`, { enabled: true })).syncSettings.enabled, true);

    const profiles = await request(base, "GET", `/api/pages/business-profiles?site=${site}`);
    assert.ok(Array.isArray(profiles.profiles));
    const profileAdd = await request(base, "POST", "/api/pages/business-profiles", { site, profile: { businessName: "Compat Location" } });
    assert.ok(profileAdd.profile.id);
    assert.strictEqual((await request(base, "POST", "/api/pages/preview", { site, targets: "Upland, SEO", templatePageId: "template-home" })).previews.length, 1);
    assert.ok(Array.isArray((await request(base, "GET", `/api/pages/templates?site=${site}`)).pages));
    assert.ok(Array.isArray((await request(base, "GET", `/api/pages/nearby-towns?site=${site}&city=Upland`)).towns));
    assert.strictEqual((await request(base, "POST", "/api/pages/generate", { site, targets: "Upland, SEO", templatePageId: "template-home" })).results[0].success, true);

    const draft = await request(base, "POST", "/api/article-builder/drafts", { site, defineData: { prompt: "Compat article" } });
    assert.ok(draft.draft.id);
    assert.ok(Array.isArray((await request(base, "GET", `/api/article-builder/drafts?site=${site}`)).drafts));
    assert.strictEqual((await request(base, "GET", `/api/article-builder/drafts/${draft.draft.id}?site=${site}`)).draft.id, draft.draft.id);
    assert.strictEqual((await request(base, "PATCH", `/api/article-builder/drafts/${draft.draft.id}/publish`, { site })).success, true);
    assert.ok(Array.isArray((await request(base, "GET", `/api/article-builder/published-articles?site=${site}`)).blogs));

    const builderTitle = "Article Builder UI save persists exactly once";
    const builderContent = "<p>Article Builder UI content survives save and draft publish.</p>";
    const builderDraft = await request(base, "POST", "/api/article-builder/drafts", {
      site,
      defineData: { prompt: "Article Builder UI regression" },
      titleData: { selectedTitle: builderTitle },
      articleData: {
        article: {
          title: builderTitle,
          sections: [{ title: "Proof", content: builderContent }],
        },
      },
    });
    const savedBuilderArticle = await request(base, "POST", "/save-article", {
      site,
      title: builderTitle,
      blogTitle: builderTitle,
      content: builderContent,
      metaDescription: "UI save regression",
      keywords: ["article builder"],
      createdWith: "article-builder",
    });
    assert.ok(savedBuilderArticle.blog.id);
    assert.strictEqual((await request(base, "PATCH", `/api/article-builder/drafts/${builderDraft.draft.id}/publish`, {
      site,
      publishedArticleId: savedBuilderArticle.blog.id,
    })).success, true);
    const builderRows = (await request(base, "GET", `/all-blog-posts?site=${site}`)).filter((row) => row.title === builderTitle);
    assert.strictEqual(builderRows.length, 1);
    assert.ok(String(builderRows[0].blogContent).includes("Article Builder UI content survives"));
    const builderPublishedRows = (await request(base, "GET", `/api/article-builder/published-articles?site=${site}`)).blogs.filter((row) => row.title === builderTitle);
    assert.strictEqual(builderPublishedRows.length, 1);
    assert.strictEqual(builderPublishedRows[0].id, savedBuilderArticle.blog.id);

    assert.strictEqual((await request(base, "GET", `/api/seo/status/${site}`)).hasPro, true);
    assert.ok((await request(base, "GET", `/api/seo/snapshot/${site}`)).snapshot);
    assert.strictEqual((await request(base, "POST", `/api/seo/scan/${site}`)).success, true);
    assert.ok(Array.isArray((await request(base, "GET", `/api/seo/saved-keywords/${site}`)).keywords));

    const aiMentions = await request(base, "GET", `/api/ai-mentions/${site}`, undefined, { allowError: true });
    assert.strictEqual(aiMentions.status, 403);
    assert.strictEqual(aiMentions.payload.needsUpgrade, true);
    const aiMentionsHistory = await request(base, "GET", `/api/ai-mentions/${site}/history`, undefined, { allowError: true });
    assert.strictEqual(aiMentionsHistory.status, 403);
    assert.strictEqual(aiMentionsHistory.payload.needsUpgrade, true);
    assert.strictEqual((await request(base, "POST", `/api/ai-mentions/${site}/refresh`)).success, true);

    const archivalProduct = await request(base, "POST", `/api/products/${site}`, { name: "Compat Archive Product", description: "Should soft-delete." });
    assert.ok(archivalProduct.product._id);
    assert.strictEqual((await request(base, "DELETE", `/api/products/${site}/${archivalProduct.product._id}`)).success, true);
    const afterArchiveProduct = await request(base, "GET", `/api/products/${site}`);
    const archivedProduct = afterArchiveProduct.products.find((product) => product._id === archivalProduct.product._id);
    assert.strictEqual(archivedProduct.status, "archived");
    assert.ok(afterArchiveProduct.counts.archived >= 1);

    const webhook = await request(base, "POST", "/api/webhooks", { name: "Compat Hook", webhookUrl: "https://example.com/hook" });
    assert.ok(webhook.webhook.id);
    assert.ok(Array.isArray((await request(base, "GET", "/api/webhooks")).webhooks));
    assert.strictEqual((await request(base, "POST", `/api/webhooks/${webhook.webhook.id}/test`, { event: "blog.created" })).success, true);

    assert.ok((await request(base, "GET", `/api/dutchie/${site}/status`)).dutchie);
    const dutchie = await request(base, "POST", `/api/dutchie/${site}/connect`, { apiKey: "local", label: "Compat" });
    assert.strictEqual(dutchie.success, true);
    assert.ok(dutchie.sync.added > 0);
    assert.ok(dutchie.dutchie.locations.some((location) => location.id && location.label === "Compat" && location.itemCount > 0));
    const dutchieProducts = await request(base, "GET", `/api/products/${site}`);
    assert.ok(dutchieProducts.products.some((product) => product.source === "dutchie" && product.locationLabel === "Compat"));
    assert.ok(dutchieProducts.syncSettings.lastSyncAt);
    const dutchieSync = await request(base, "POST", `/api/dutchie/${site}/sync`);
    assert.strictEqual(dutchieSync.success, true);
    assert.ok(dutchieSync.updated > 0);
    const dutchieStatus = await request(base, "GET", `/api/dutchie/${site}/status`);
    assert.strictEqual(dutchieStatus.dutchie.enabled, true);
    const dutchieLocation = dutchieStatus.dutchie.locations.find((location) => location.label === "Compat");
    assert.ok(dutchieLocation.id);
    assert.strictEqual((await request(base, "DELETE", `/api/dutchie/${site}/locations/${dutchieLocation.id}`)).success, true);
    const afterDutchieDisconnect = await request(base, "GET", `/api/dutchie/${site}/status`);
    assert.ok(!afterDutchieDisconnect.dutchie.locations.some((location) => location.id === dutchieLocation.id));

    assert.strictEqual((await request(base, "GET", `/api/updates/${site}`)).success, true);
    assert.strictEqual((await request(base, "POST", `/api/tour/progress`, { userId: "owner@example.com", tours: {} })).success, true);
    assert.strictEqual((await request(base, "GET", `/api/tour/progress?userId=owner@example.com`)).success, true);

    const stream = await request(base, "POST", "/api/assistant/chat", { message: "status", site });
    assert.ok(String(stream).includes("\"type\":\"done\""));

    assert.strictEqual((await request(base, "POST", "/api/save-keywords", {
      site,
      keywords: [
        { kw: "gsc query", volume: 123, difficulty: 17, source: "gsc" },
        { keyword: "research query", volume: 456, difficulty: 22, source: "keyword-research" },
      ],
    })).success, true);
    const savedKeywordRows = (await request(base, "GET", `/api/seo/saved-keywords/${site}`)).keywords;
    const gscKeyword = savedKeywordRows.find((row) => (row.keyword || row.kw || row) === "gsc query");
    const researchKeyword = savedKeywordRows.find((row) => (row.keyword || row.kw || row) === "research query");
    assert.strictEqual(gscKeyword.volume, 123);
    assert.strictEqual(gscKeyword.difficulty, 17);
    assert.strictEqual(gscKeyword.source, "gsc");
    assert.strictEqual(researchKeyword.volume, 456);
    assert.strictEqual(researchKeyword.difficulty, 22);
    assert.strictEqual(researchKeyword.source, "keyword-research");
    const seoKeywordRows = (await request(base, "GET", "/api/seo/keywords")).keywords;
    assert.ok(seoKeywordRows.some((row) => (row.keyword || row.kw || row) === "research query" && row.volume === 456));
    const keywordStatusRows = (await request(base, "GET", `/api/plan/${site}/keyword-status`)).statuses;
    assert.ok(keywordStatusRows.some((row) => row.keyword === "gsc query" && row.volume === 123 && row.kd === 17));
    assert.ok(Array.isArray((await request(base, "POST", "/api/keyword-research/onboarding-preview", { website: site })).clusters));
    assert.ok(Array.isArray((await request(base, "GET", "/api/seo/keywords")).keywords));

    assert.strictEqual((await request(base, "POST", "/accept-invite", { token: "local" })).success, true);
    assert.strictEqual((await request(base, "POST", "/connect-site", { site })).success, true);
    assert.ok((await request(base, "GET", `/scrape-site?website=${site}`)).productDescription);
    assert.ok(Array.isArray((await request(base, "POST", "/onboarding-suggestions", { productDescription: "local" })).audienceSuggestions));
    assert.strictEqual((await request(base, "POST", "/detect-business-type", { website: site })).businessType, "local");
    assert.strictEqual((await request(base, "POST", "/onboarding/complete", { site, productDescription: "Updated" })).success, true);
    assert.ok(Array.isArray((await request(base, "GET", "/get-plans")).data));
    assert.ok((await request(base, "GET", "/subscription-details")).subscription);
    assert.ok((await request(base, "POST", "/checkout-session", { site, planId: "growth_monthly" })).url);
    const switchedBilling = await request(base, "POST", "/switch-plan", { site, newPlanId: "growth_annual" });
    assert.strictEqual(switchedBilling.success, true);
    assert.strictEqual(switchedBilling.newPlan.planId, "growth_annual");
    assert.strictEqual(switchedBilling.subscription.planId, "growth_annual");
    assert.strictEqual((await request(base, "GET", `/subscription-details?site=${site}`)).subscription.planId, "growth_annual");
    const cancelledBilling = await request(base, "POST", "/cancel-subscription", {
      site,
      reason: "budget",
      missing: "monthly proof",
      alternative: "manual content",
      acceptRetention: false,
    });
    assert.strictEqual(cancelledBilling.success, true);
    assert.ok(Number.isInteger(cancelledBilling.endsAt));
    assert.strictEqual(cancelledBilling.subscription.cancelAtPeriodEnd, true);
    assert.strictEqual(cancelledBilling.subscription.isActive, true);
    const cancelledBillingReadback = await request(base, "GET", `/subscription-details?site=${site}`);
    assert.strictEqual(cancelledBillingReadback.subscription.cancelAtPeriodEnd, true);
    assert.strictEqual(cancelledBillingReadback.subscription.cancellationFeedback.reason, "budget");
    assert.strictEqual(cancelledBillingReadback.subscription.status, "active_until_period_end");
    const retentionSite = "retention-billing.example";
    assert.strictEqual((await request(base, "POST", "/connect-site", { site: retentionSite })).success, true);
    const retainedBilling = await request(base, "POST", "/cancel-subscription", {
      site: retentionSite,
      reason: "price",
      acceptRetention: true,
    });
    assert.strictEqual(retainedBilling.success, true);
    assert.strictEqual(retainedBilling.subscription.planId, "retention_monthly");
    assert.strictEqual(retainedBilling.subscription.isActive, true);
    assert.strictEqual(retainedBilling.subscription.cancelAtPeriodEnd, false);
    assert.strictEqual((await request(base, "GET", `/subscription-details?site=${retentionSite}`)).subscription.planId, "retention_monthly");
    const siteIdBillingSite = "siteid-billing.example";
    assert.strictEqual((await request(base, "POST", "/connect-site", { site: siteIdBillingSite })).success, true);
    const siteIdSwitch = await request(base, "POST", "/switch-plan", { siteId: siteIdBillingSite, newPlanId: "growth_annual" });
    assert.strictEqual(siteIdSwitch.success, true);
    assert.strictEqual((await request(base, "GET", `/subscription-details?site=${siteIdBillingSite}`)).subscription.planId, "growth_annual");
    const siteIdCancel = await request(base, "POST", "/cancel-subscription", {
      siteId: siteIdBillingSite,
      reason: "site id routing",
      missing: "button routed to current site",
      alternative: "manual billing",
      acceptRetention: false,
    });
    assert.strictEqual(siteIdCancel.success, true);
    const siteIdCancelReadback = await request(base, "GET", `/subscription-details?site=${siteIdBillingSite}`);
    assert.strictEqual(siteIdCancelReadback.subscription.cancelAtPeriodEnd, true);
    assert.strictEqual(siteIdCancelReadback.subscription.cancellationFeedback.reason, "site id routing");
    assert.strictEqual((await request(base, "POST", "/generate-retention-message", { reason: "budget" })).success, true);
    assert.ok((await request(base, "GET", "/generate-description?site=sirbloggsalot.com")).description);
    assert.ok(Array.isArray((await request(base, "GET", `/fetch-sitemap?site=${site}`)).urls));
    assert.ok(Array.isArray((await request(base, "GET", "/framer/collections")).collections));
    assert.ok(Array.isArray((await request(base, "GET", "/webflow/fields")).fields));

    const disposableSite = "delete-me.example";
    assert.strictEqual((await request(base, "POST", "/connect-site", { site: disposableSite })).success, true);
    assert.ok((await request(base, "GET", "/me")).sites.includes(disposableSite));
    const deletedSite = await request(base, "DELETE", `/sites/${encodeURIComponent(disposableSite)}`);
    assert.strictEqual(deletedSite.success, true);
    assert.strictEqual(deletedSite.archived, true);
    const afterDeleteMe = await request(base, "GET", "/me");
    assert.ok(!afterDeleteMe.sites.includes(disposableSite));
    assert.ok(afterDeleteMe.sites.includes(site));
    const deletedSubscription = await request(base, "GET", `/subscription-details?site=${encodeURIComponent(disposableSite)}`);
    assert.strictEqual(deletedSubscription.subscription.isActive, false);
    assert.strictEqual(deletedSubscription.subscription.cancelAtPeriodEnd, true);
    assert.ok(deletedSubscription.subscription.cancelledAt);

    assert.ok(Array.isArray((await request(base, "POST", "/generate-article-titles", { prompt: "local SEO" })).titles));
    assert.ok((await request(base, "POST", "/generate-article-outline", { title: "Local SEO" })).outline);
    assert.ok((await request(base, "POST", "/generate-full-article", { title: "Local SEO" })).article);
    assert.ok((await request(base, "POST", "/generate-featured-image", { title: "Local SEO" })).imageUrl);
    assert.ok((await request(base, "POST", "/fetch-youtube-channel", { channelUrl: "https://youtube.com/@local" })).channelInfo);
    assert.ok((await request(base, "POST", "/analyze-screenshots", {})).analysis);
    assert.ok((await request(base, "POST", "/save-article", { site, title: "Saved article" })).blog);
    assert.ok(Array.isArray((await request(base, "POST", "/generate-bulk-articles", { site })).articles));

    const gscData = await request(base, "GET", "/gsc/data", undefined, { allowError: true });
    assert.strictEqual(gscData.status, 500);
    assert.strictEqual(typeof gscData.payload.error, "string");
    const disconnectedGscSettings = await request(base, "GET", `/site-settings?site=${site}`);
    assert.strictEqual(disconnectedGscSettings.settings.gsc, null);
    const gscSites = await request(base, "GET", "/gsc/sites/local");
    assert.ok(Array.isArray(gscSites.sites));
    assert.strictEqual((await request(base, "POST", "/gsc/connect", {
      token: "local",
      selectedGscSite: `sc-domain:${site}`,
      currentBlawgySite: site,
    })).success, true);
    const connectedGscSettings = await request(base, "GET", `/site-settings?site=${site}`);
    assert.strictEqual(connectedGscSettings.settings.gsc.connected_site, `sc-domain:${site}`);
    assert.ok(connectedGscSettings.settings.gsc.access_token);
    const connectedTraffic = await request(base, "GET", `/gsc/data?site=${site}&filters[dimensions][]=date`);
    assert.ok(connectedTraffic.rows.some((row) => Array.isArray(row.keys) && row.keys[0] && row.clicks > 0 && row.impressions > 0));
    const connectedPages = await request(base, "GET", `/gsc/data?site=${site}&filters[dimensions][]=page`);
    assert.ok(connectedPages.rows.some((row) => String(row.keys?.[0] || "").includes(site)));
    const connectedQueries = await request(base, "GET", `/gsc/data?site=${site}&filters[dimensions][]=query`);
    assert.ok(connectedQueries.rows.some((row) => String(row.keys?.[0] || "").includes("local")));
    assert.strictEqual((await request(base, "POST", "/gsc/disconnect", { site })).success, true);
    const afterGscDisconnectSettings = await request(base, "GET", `/site-settings?site=${site}`);
    assert.strictEqual(afterGscDisconnectSettings.settings.gsc, null);
    const afterGscDisconnectData = await request(base, "GET", `/gsc/data?site=${site}`, undefined, { allowError: true });
    assert.strictEqual(afterGscDisconnectData.status, 500);

    assert.ok((await request(base, "GET", "/hormozi/api/generate?domain=example.com", undefined, { auth: false })).data);
    assert.ok((await request(base, "GET", "/hormozi/api/offers/example-com", undefined, { auth: false })).data);

    console.log("Blawgy compatibility checks passed.");
  } finally {
    await close(server);
    await fs.rm(runtime.SIR_BLOGGS_BLAWGY_STORE_PATH, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
