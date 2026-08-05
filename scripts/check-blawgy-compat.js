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

    const webhook = await request(base, "POST", "/api/webhooks", { name: "Compat Hook", webhookUrl: "https://example.com/hook" });
    assert.ok(webhook.webhook.id);
    assert.ok(Array.isArray((await request(base, "GET", "/api/webhooks")).webhooks));
    assert.strictEqual((await request(base, "POST", `/api/webhooks/${webhook.webhook.id}/test`, { event: "blog.created" })).success, true);

    assert.ok((await request(base, "GET", `/api/dutchie/${site}/status`)).dutchie);
    const dutchie = await request(base, "POST", `/api/dutchie/${site}/connect`, { apiKey: "local", label: "Compat" });
    assert.strictEqual(dutchie.success, true);
    assert.strictEqual((await request(base, "POST", `/api/dutchie/${site}/sync`)).success, true);

    assert.strictEqual((await request(base, "GET", `/api/updates/${site}`)).success, true);
    assert.strictEqual((await request(base, "POST", `/api/tour/progress`, { userId: "owner@example.com", tours: {} })).success, true);
    assert.strictEqual((await request(base, "GET", `/api/tour/progress?userId=owner@example.com`)).success, true);

    const stream = await request(base, "POST", "/api/assistant/chat", { message: "status", site });
    assert.ok(String(stream).includes("\"type\":\"done\""));

    assert.strictEqual((await request(base, "POST", "/api/save-keywords", { site, keywords: [{ kw: "gsc query" }] })).success, true);
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
    assert.ok((await request(base, "GET", "/site-settings")).settings);
    assert.ok(Array.isArray((await request(base, "GET", "/gsc/sites/local")).sites));
    assert.strictEqual((await request(base, "POST", "/gsc/connect", { site })).success, true);

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
