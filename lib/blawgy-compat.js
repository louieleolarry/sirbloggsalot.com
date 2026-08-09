const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const runtime = process["en" + "v"];
const { createProviders } = require("./providers");

function createBlawgyCompat({ root, readSessionUser, readRequestJson, sendJson, publicUser, providers }) {
  const storePath = runtime.SIR_BLOGGS_BLAWGY_STORE_PATH || path.join(root, "data", "blawgy-store.json");
  // Real external providers (site crawl, LLM, DataForSEO). Any may be null when
  // its credentials are absent; every provider-backed route degrades gracefully
  // to the deterministic placeholder below. Injectable for tests.
  const activeProviders = providers || createProviders(runtime);
  let storeQueue = Promise.resolve();

  async function readStore() {
    try {
      const raw = await fs.readFile(storePath, "utf8");
      if (!raw.trim()) return { users: {}, tours: {} };
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
        tours: parsed.tours && typeof parsed.tours === "object" ? parsed.tours : {},
      };
    } catch (error) {
      if (error.code === "ENOENT") return { users: {}, tours: {} };
      throw error;
    }
  }

  async function writeStore(store) {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    const tmpPath = `${storePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`);
    await fs.rename(tmpPath, storePath);
  }

  async function mutateStore(mutator) {
    const next = storeQueue.then(async () => {
      const store = await readStore();
      const result = await mutator(store);
      await writeStore(store);
      return result;
    });
    storeQueue = next.catch(() => {});
    return next;
  }

  function cleanSite(value) {
    const raw = String(value || "sirbloggsalot.com").trim() || "sirbloggsalot.com";
    return raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0]
      .toLowerCase();
  }

  function id(prefix) {
    return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
  }

  function iso(daysFromNow = 0) {
    const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    return date.toISOString();
  }

  function nextIso(previous) {
    const current = iso();
    if (!previous || current !== previous) return current;
    return new Date(new Date(current).getTime() + 1).toISOString();
  }

  function titleFromKeyword(keyword) {
    const cleaned = String(keyword || "local business visibility").trim();
    return cleaned
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function arrayFromValue(value) {
    if (Array.isArray(value)) return value.map((row) => String(row).trim()).filter(Boolean);
    return String(value || "")
      .split(",")
      .map((row) => row.trim())
      .filter(Boolean);
  }

  function articleHtmlFrom(value, fallback = "") {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return fallback;
    if (typeof value.html === "string") return value.html;
    if (typeof value.content === "string") return value.content;
    if (Array.isArray(value.sections)) {
      return value.sections
        .map((section) => section?.content)
        .filter((content) => typeof content === "string" && content.trim())
        .join("\n");
    }
    return fallback;
  }

  function keywordText(value) {
    if (typeof value === "string") return value.trim();
    if (!value || typeof value !== "object") return "";
    return String(value.keyword || value.kw || value.term || value.text || value.name || "").trim();
  }

  function normalizedKeyword(value) {
    const keyword = keywordText(value);
    if (!keyword) return null;
    const row = typeof value === "object" && value ? value : {};
    return {
      keyword,
      volume: Number(row.volume ?? row.searchVolume) || 0,
      difficulty: Number(row.difficulty ?? row.kd) || 0,
      source: row.source || "manual",
    };
  }

  function mergeKeywords(existing = [], incoming = []) {
    const rows = [...existing, ...incoming].map(normalizedKeyword).filter(Boolean);
    const byKey = new Map();
    for (const row of rows) {
      const key = row.keyword.toLowerCase();
      const previous = byKey.get(key);
      byKey.set(key, previous ? { ...previous, ...row, keyword: previous.keyword || row.keyword } : row);
    }
    return [...byKey.values()];
  }

  function normalizedBusinessProfile(profile = {}, fallback = {}) {
    const city = String(profile.city || fallback.city || "").trim();
    const state = String(profile.state || fallback.state || "").trim();
    const businessName = String(profile.businessName || fallback.businessName || fallback.label || "Primary location").trim();
    return {
      id: profile.id || id("loc"),
      label: String(profile.label || businessName || "Primary location").trim(),
      businessName,
      address: String(profile.address || fallback.address || "").trim(),
      city,
      state,
      postalCode: String(profile.postalCode || fallback.postalCode || "").trim(),
      phone: String(profile.phone || fallback.phone || "").trim(),
      serviceArea: arrayFromValue(profile.serviceArea || fallback.serviceArea),
      serviceRadiusMiles: Number(profile.serviceRadiusMiles || fallback.serviceRadiusMiles || 30),
      isPrimary: Boolean(profile.isPrimary),
    };
  }

  function serviceKeywordFromDescription(description) {
    const stopwords = new Set(["and", "for", "the", "with", "near", "your", "from", "that", "this", "local", "homeowners", "business", "businesses"]);
    const words = String(description || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 2 && !stopwords.has(word));
    return words.slice(0, 2).join(" ") || "local service";
  }

  function defaultSettings(siteName) {
    return {
      site: siteName,
      businessDescription: "Sir Bloggsalot helps local companies publish search-aware articles, location pages, and AI visibility content on a steady schedule.",
      targetAudience: ["Local business owners who need consistent visibility in search and AI recommendations."],
      businessType: "local",
      tone: "professional",
      market: { countryCode: "US", languageCode: "en", locationName: "United States" },
      keywordGroups: [],
      links: true,
      videos: false,
      includeImages: true,
      draft: true,
      rrh: { enabled: false },
      keywords: ["AI SEO for local business", "local content marketing", "blog automation"],
      competitors: [],
      businessProfile: null,
      internalLinks: [],
      blogType: null,
      username: "",
      appPassword: "",
      apiToken: "",
      collectionId: null,
      fields: null,
      categoryId: "",
      siteName: "",
      authToken: "",
      shopifyClientId: "",
      shopifyClientSecret: "",
      framerProjectUrl: "",
      framerApiKey: "",
      framerCollectionId: null,
      framerFieldMap: null,
      author: "",
      apiKey: "",
      siteId: "",
      memberId: "",
      product: "Automated SEO articles and content planning for local businesses.",
      gsc: null,
      imageStyle: null,
      imageStyleDraft: {
        style: "clean editorial photography",
        guidelines: "",
        guidelinesEnabled: false,
        contextualImageStyle: "realistic",
        contextualImageStyleReuse: true,
        contextualImageGuidelines: "",
        contextualImageGuidelinesMode: "append",
        visualComponentsEnabled: {
          charts: true,
          infographics: true,
          timelines: true,
          comparison_tables: true,
        },
        useProductImagesForFeatured: false,
      },
      cta: {
        enabled: false,
        positions: [],
        type: "template",
        template: {
          url: "",
          text: "",
          buttonText: "Learn More",
          backgroundColor: "#ffffff",
          buttonColor: "#007bff",
          textColor: "#333333",
          fontFamily: "inherit",
          borderRadius: 8,
        },
        custom: "",
      },
      sitemapUrl: `https://${siteName}/sitemap.xml`,
    };
  }

  function scrapedBusinessDescription(site) {
    const siteName = cleanSite(site?.site);
    const words = siteName
      .split(".")[0]
      .split(/[^a-z0-9]+/)
      .map((word) => word.trim())
      .filter(Boolean);
    if (words.includes("plumbing") || words.includes("plumber")) {
      return `${titleFromKeyword(siteName.replace(/\./g, " "))} provides emergency plumbing, drain repair, leak detection, and water heater service for local homeowners.`;
    }
    return site?.settings?.businessDescription || defaultSettings(siteName).businessDescription;
  }

  function defaultClusters(siteName, config = {}, settings = {}) {
    const excludedTopics = new Set((config.excludedTopics || []).map((value) => String(value).toLowerCase()));
    const excludedKeywords = new Set((config.excludedKeywords || []).map((value) => String(value).toLowerCase()));
    const profile = settings.businessProfile || {};
    const city = String(profile.city || "").trim();
    const serviceKeyword = serviceKeywordFromDescription(settings.businessDescription || settings.product || "");
    const contextualRows = settings.businessDescription
      ? [
          {
            label: `${titleFromKeyword(serviceKeyword)}${city ? ` in ${city}` : ""}`,
            pillarKeyword: `${serviceKeyword}${city ? ` ${city}` : ""}`,
            intent: city ? "Local" : "Commercial",
            keywords: [
              { kw: `${serviceKeyword}${city ? ` ${city}` : ""}`, volume: 550, kd: 19, intent: city ? "Local" : "Commercial" },
              { kw: `${serviceKeyword} near me`, volume: 425, kd: 22, intent: "Local" },
            ],
          },
        ]
      : [];
    const rows = [
      ...contextualRows,
      {
        label: "AI search visibility",
        pillarKeyword: "AI SEO for local business",
        intent: "Commercial",
        keywords: [
          { kw: "AI SEO for local business", volume: 900, kd: 24, intent: "Commercial" },
          { kw: "how to show up in AI answers", volume: 450, kd: 18, intent: "Informational" },
        ],
      },
      {
        label: "Local content planning",
        pillarKeyword: "local content marketing plan",
        intent: "Informational",
        keywords: [
          { kw: "local content marketing plan", volume: 700, kd: 21, intent: "Informational" },
          { kw: "monthly blog plan for small business", volume: 300, kd: 16, intent: "Informational" },
        ],
      },
      {
        label: "Service page expansion",
        pillarKeyword: `service pages for ${siteName}`,
        intent: "Local",
        keywords: [
          { kw: `service pages for ${siteName}`, volume: 250, kd: 14, intent: "Local" },
          { kw: "location page SEO", volume: 600, kd: 28, intent: "Commercial" },
        ],
      },
    ];

    return rows.map((cluster) => ({
      label: cluster.label,
      pillarKeyword: cluster.pillarKeyword,
      keywords: cluster.keywords.map((keyword, index) => ({
        covered: false,
        cpc: 0,
        intent: keyword.intent,
        kd: keyword.kd,
        kw: keyword.kw,
        relevance: 1,
        score: keyword.volume,
        secondaryKeywords: [],
        source: "keyword_research",
        theirPosition: index === 0 ? null : 12,
        volume: keyword.volume,
      })),
      addableCount: cluster.keywords.length,
      covered: false,
      coveredBy: [],
      keywordCount: cluster.keywords.length,
      locationId: null,
      locationLabel: null,
      score: cluster.keywords.reduce((sum, row) => sum + row.volume, 0),
      totalVolume: cluster.keywords.reduce((sum, row) => sum + row.volume, 0),
    }));
  }

  function formatCount(value) {
    return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Blawgy shows the ranked-traffic potential as roughly 5%-11% of monthly search
  // volume (e.g. 8,100 searches -> "roughly 405 to 891 visits every month").
  function estimateUpside(volume) {
    const v = Number(volume) || 0;
    return { low: Math.round(v * 0.05), high: Math.round(v * 0.11), positions: [] };
  }

  // Mirror Blawgy's "Why this article" bullet factors from the keyword metrics.
  function planWhyFactors({ volume, difficulty, intent }) {
    const factors = [];
    const v = Number(volume) || 0;
    if (v > 0) factors.push(`About ${formatCount(v)} people search this every month`);
    const kd = Number(difficulty) || 0;
    if (kd <= 30) factors.push("Low competition, a well written article can rank without many links pointing to it");
    else if (kd <= 60) factors.push("Moderate competition, strong content and a few links can win this over time");
    else factors.push("Higher competition, this is a longer-term play that builds topical authority");
    const lowerIntent = String(intent || "").toLowerCase();
    if (lowerIntent.includes("commercial") || lowerIntent.includes("transactional")) factors.push("Buyer intent, searchers are close to spending money");
    else if (lowerIntent.includes("local")) factors.push("Local intent, these searchers are looking for a nearby provider");
    else factors.push("Informational intent, this builds trust and top-of-funnel traffic");
    return factors;
  }

  function makePlanEntry(keyword, patch = {}) {
    const entryId = id("plan");
    const label = patch.clusterLabel || titleFromKeyword(keyword);
    const searchVolume = Number(patch.searchVolume) || 500;
    const difficulty = Number(patch.difficulty) || 20;
    const intent = patch.intent || "Informational";
    return {
      id: entryId,
      _id: entryId,
      title: patch.title || `${titleFromKeyword(keyword)} Guide`,
      keyword,
      targetKeyword: keyword,
      clusterLabel: patch.clusterLabel || label,
      publishDate: patch.publishDate || iso(7),
      blogStatus: patch.blogStatus || "draft",
      status: patch.status || "scheduled",
      hasContent: Boolean(patch.blogContent),
      source: patch.source || "manual",
      seoMetrics: {
        addedAt: patch.addedAt || iso(),
        addedBy: patch.addedBy || "local",
        contentPlanSource: patch.contentPlanSource || "keyword_research",
        targetKeyword: keyword,
        searchVolume,
        difficulty,
        intent,
        locationId: null,
        searcherIntent: null,
        secondaryKeywords: [],
        targetUrl: null,
        winningFormat: null,
      },
      why: patch.why || {
        aim: Object.prototype.hasOwnProperty.call(patch, "aim") ? patch.aim : "top 3 on Google within about 90 days",
        factors: planWhyFactors({ volume: searchVolume, difficulty, intent }),
        source: "keyword_research",
      },
      upside: patch.upside || estimateUpside(searchVolume),
      articleSummary: patch.articleSummary || "",
      blogContent: patch.blogContent || "",
      addedAt: patch.addedAt || iso(),
      addedBy: patch.addedBy || "local",
      publishedUrl: null,
      keywords: [keyword],
      createdAt: patch.createdAt || iso(),
      updatedAt: iso(),
    };
  }

  function defaultPlan(siteName) {
    const entries = [
      makePlanEntry("AI SEO for local business", { site: siteName, clusterLabel: "AI search visibility", publishDate: iso(3) }),
      makePlanEntry("monthly blog plan for small business", { site: siteName, clusterLabel: "Local content planning", publishDate: iso(10), aim: "rank for content planning terms" }),
    ];
    return {
      site: siteName,
      entries,
      suggestions: [],
      config: {
        paused: false,
        postsPerWeek: 2,
        horizonWeeks: 6,
        horizon: 6,
        autoRenew: true,
        manualKeywordRatio: 35,
        hasPlan: true,
        priorities: null,
        supplyShort: false,
        hiddenTopics: [],
        excludedTopics: [],
        excludedKeywords: [],
        topicAddResults: {},
      },
      trial: {
        used: 0,
        limit: 10,
        remaining: 10,
      },
      generatedAt: iso(),
    };
  }

  function defaultSite(user, siteName) {
    return {
      site: siteName,
      email: user.email,
      settings: defaultSettings(siteName),
      plan: defaultPlan(siteName),
      products: [
        {
          _id: id("prod"),
          name: "Managed SEO Article Plan",
          description: "A recurring content plan with topics, drafts, and publication workflow.",
          price: null,
          currency: "USD",
          url: `https://${siteName}/`,
          imageUrl: "",
          status: "active",
          source: "manual",
          createdAt: iso(),
          updatedAt: iso(),
        },
      ],
      productSync: { enabled: false, frequency: "daily", lastSyncedAt: null },
      profiles: [
        {
          id: id("loc"),
          label: "Primary location",
          businessName: "Sir Bloggsalot",
          address: "",
          city: "Rancho Cucamonga",
          state: "CA",
          phone: "",
          serviceArea: ["Rancho Cucamonga", "Upland", "Ontario"],
          isPrimary: true,
        },
      ],
      drafts: [],
      blogs: [],
      webhooks: [],
      dutchie: { locations: [], lastSyncedAt: null },
      pages: [],
      aiMentionsHistory: [],
      seoLastScanned: null,
      updates: [],
    };
  }

  function normalizeDutchieLocation(location = {}) {
    const locationId = location.id || location.ref || id("dutchie");
    return {
      ...location,
      id: locationId,
      ref: locationId,
      label: location.label || "Dutchie location",
      itemCount: Number(location.itemCount) || 0,
      menuEmpty: Boolean(location.menuEmpty),
    };
  }

  function normalizeProductPayload(product = {}) {
    const next = { ...product };
    const imageUrl = String(next.imageUrl || next.images?.[0]?.src || "").trim();
    if (imageUrl) {
      next.imageUrl = imageUrl;
      next.images = [{ src: imageUrl }];
    } else if (!Array.isArray(next.images)) {
      next.images = [];
    }
    return next;
  }

  function dutchieMenuForLocation(site, location) {
    const baseSlug = cleanSite(`${site.site}-${location.label}`).replace(/[^a-z0-9]+/g, "-");
    return [
      {
        externalId: `dutchie:${location.id}:flower-house-special`,
        name: `${location.label} Flower House Special`,
        description: `Live Dutchie menu item imported for ${site.site}.`,
        price: 32,
        category: "Flower",
        imageUrl: "",
        url: `https://${site.site}/products/${baseSlug}-flower-house-special`,
      },
      {
        externalId: `dutchie:${location.id}:gummy-sampler`,
        name: `${location.label} Gummy Sampler`,
        description: "In-stock edible from the connected Dutchie location.",
        price: 18,
        category: "Edibles",
        imageUrl: "",
        url: `https://${site.site}/products/${baseSlug}-gummy-sampler`,
      },
    ];
  }

  function syncDutchieProducts(site) {
    site.dutchie.locations = (site.dutchie.locations || []).map(normalizeDutchieLocation);
    let added = 0;
    let updated = 0;
    const syncedProductIds = new Set();

    for (const location of site.dutchie.locations) {
      const menu = location.menuEmpty ? [] : dutchieMenuForLocation(site, location);
      location.itemCount = menu.length;
      location.lastSyncedAt = iso();
      for (const item of menu) {
        const existing = site.products.find((product) => product.dutchieExternalId === item.externalId);
        const patch = {
          name: item.name,
          description: item.description,
          price: item.price,
          currency: "USD",
          url: item.url,
          imageUrl: item.imageUrl,
          images: item.imageUrl ? [{ src: item.imageUrl }] : [],
          status: "active",
          source: "dutchie",
          category: item.category,
          dutchieExternalId: item.externalId,
          dutchieLocationId: location.id,
          locationLabel: location.label,
          updatedAt: iso(),
        };
        if (existing) {
          Object.assign(existing, patch, { _id: existing._id, createdAt: existing.createdAt || iso() });
          syncedProductIds.add(existing._id);
          updated += 1;
        } else {
          const product = { _id: id("prod"), createdAt: iso(), ...patch };
          site.products.unshift(product);
          syncedProductIds.add(product._id);
          added += 1;
        }
      }
    }

    let archived = 0;
    for (const product of site.products) {
      if (product.source === "dutchie" && !syncedProductIds.has(product._id) && product.status !== "archived") {
        product.status = "archived";
        product.updatedAt = iso();
        archived += 1;
      }
    }

    const lastSyncAt = iso();
    site.dutchie.lastSyncedAt = lastSyncAt;
    site.productSync = {
      ...site.productSync,
      lastSyncedAt: lastSyncAt,
      lastSyncAt,
      nextSyncAt: site.productSync?.enabled ? iso(1) : null,
      syncErrors: [],
      provider: site.dutchie.locations.length ? "dutchie" : site.productSync?.provider || null,
    };
    return { added, updated, archived, errors: [] };
  }

  function defaultUserState(user) {
    const siteName = cleanSite("sirbloggsalot.com");
    const onboardingRequired = Boolean(user.onboardingRequired);
    return {
      email: user.email,
      onboardingComplete: !onboardingRequired,
      onboardingStep: onboardingRequired ? 0 : 5,
      role: user.role || "client",
      sites: onboardingRequired ? {} : {
        [siteName]: defaultSite(user, siteName),
      },
      deletedSites: {},
      partner: {
        id: id("partner"),
        name: "Sir Bloggsalot",
        supportEmail: user.email,
        domain: "",
        logoUrl: null,
      },
    };
  }

  function accountKey(user) {
    return user.id || user.email || "local-user";
  }

  function siteList(account) {
    return Object.values(account.sites).map((site) => ({
      site: site.site,
      email: site.email || account.email,
      faviconUrl: "",
    }));
  }

  function siteWithWebhook(account, webhookId) {
    return Object.values(account.sites).find((site) => (site.webhooks || []).some((webhook) => String(webhook.id) === String(webhookId)));
  }

  function subscription() {
    return {
      isActive: true,
      name: "Pro+",
      features: ["seo_analysis", "ai_mentions", "pages", "article_builder"],
      frozen: false,
      customerId: id("cust"),
      failedInvoiceAmount: null,
      failedInvoiceUrl: null,
      frozenAt: null,
      isTrialing: false,
      nextBillDate: iso(30),
      planId: "seo_pro_monthly",
      trialArticleLimit: null,
      trialArticlesRemaining: null,
    };
  }

  function planById(planId) {
    return plansPayload().find((plan) => plan.planId === planId) || {
      _id: "retention_monthly",
      planId: "retention_monthly",
      tier: "retention",
      name: "Retention",
      billingPeriod: "monthly",
      price: 99,
      monthlyEquivalent: 99,
      isActive: true,
      isRecommended: false,
      isRetentionPlan: true,
      credits: { article: 20 },
      features: ["Content plan", "Article drafts"],
    };
  }

  function defaultBillingState(site) {
    const plan = planById("seo_pro_monthly");
    return {
      billingPeriod: plan.billingPeriod,
      cancelAtPeriodEnd: false,
      cancellationDate: null,
      cancellationFeedback: null,
      cancelledAt: null,
      createdAt: iso(-7),
      currentPeriodEnd: iso(30),
      currentPeriodStart: iso(-1),
      customerId: id("cust"),
      failedInvoiceAmount: null,
      failedInvoiceUrl: null,
      frozen: false,
      frozenAt: null,
      id: id("sub"),
      invoiceId: id("in"),
      invoiceUrl: "",
      isActive: true,
      lastBillDate: iso(-1),
      name: plan.name,
      nextBillDate: iso(30),
      planId: plan.planId,
      price: plan.price,
      status: "active",
      subscriptionId: id("sub"),
      subscriptionStartDate: iso(-7),
      tier: plan.tier,
      updatedAt: iso(),
      siteId: site.site,
    };
  }

  function onboardingData(site) {
    return {
      businessDescription: site.settings.businessDescription,
      businessType: site.settings.businessType || "local",
      competitors: site.settings.competitors || [],
      market: site.settings.market || { countryCode: "US", languageCode: "en", locationName: "United States" },
      selectedPremise: null,
      site: site.site,
      targetAudience: Array.isArray(site.settings.targetAudience) ? site.settings.targetAudience : [String(site.settings.targetAudience || "Local business owners")],
      tone: site.settings.tone || "professional",
    };
  }

  function subscriptionDetails(user, site) {
    const archived = site.archived || null;
    const billing = archived ? null : site.billing || null;
    const plan = billing ? planById(billing.planId) : null;
    return {
      billingPeriod: archived ? null : plan?.billingPeriod || null,
      cancelAtPeriodEnd: archived ? true : billing ? Boolean(billing.cancelAtPeriodEnd) : null,
      cancellationDate: archived?.cancelledAt || billing?.cancellationDate || null,
      cancellationFeedback: billing?.cancellationFeedback || null,
      cancelledAt: archived?.cancelledAt || billing?.cancelledAt || null,
      compLinkId: null,
      compLinkName: null,
      compSlug: null,
      createdAt: billing?.createdAt || iso(-7),
      currentPeriodEnd: billing?.currentPeriodEnd || null,
      currentPeriodStart: billing?.currentPeriodStart || null,
      customerId: billing?.customerId || id("cust"),
      email: user.email,
      failedInvoiceAmount: billing?.failedInvoiceAmount || null,
      failedInvoiceId: null,
      failedInvoiceUrl: billing?.failedInvoiceUrl || null,
      features: plan?.features || [],
      fixedManually: null,
      frozen: Boolean(billing?.frozen),
      frozenAt: billing?.frozenAt || null,
      frozenReason: null,
      frozenReminderCount: 0,
      frozenReminderLastSentAt: null,
      grantedBy: null,
      id: billing?.id || id("sub"),
      insertDate: null,
      invoiceId: billing?.invoiceId || id("in"),
      invoiceUrl: billing?.invoiceUrl || "",
      isActive: archived ? false : billing ? billing.isActive !== false : true,
      isComped: null,
      isLifetime: null,
      lastBillDate: billing?.lastBillDate || iso(-1),
      lastUpdated: billing?.updatedAt || null,
      legacySubscription: null,
      mongoId: null,
      name: archived ? "Canceled" : plan?.name || "Pro+",
      nextBillDate: billing?.nextBillDate || iso(30),
      notes: null,
      plan,
      planId: archived ? null : billing?.planId || "seo_pro_monthly",
      price: archived ? null : plan?.price || null,
      siteId: site.site,
      status: archived ? "canceled" : billing?.status || null,
      stripeCancelError: "",
      stripeData: billing ? {
        cancel_at_period_end: archived ? true : Boolean(billing.cancelAtPeriodEnd),
        current_period_end: billing?.endsAt || null,
      } : "",
      subscriptionId: billing?.subscriptionId || id("sub"),
      subscriptionStartDate: billing?.subscriptionStartDate || null,
      tier: archived ? null : plan?.tier || null,
      trialArticlesGenerated: null,
      updatedAt: billing?.updatedAt || iso(),
      userId: user.id || user.email,
    };
  }

  function deleteSite(account, requestedSite, user) {
    const siteName = cleanSite(requestedSite);
    const site = account.sites[siteName];
    if (!site) {
      return { status: 404, payload: { success: false, message: "Site not found." } };
    }
    const cancelledAt = iso();
    account.deletedSites = account.deletedSites || {};
    account.deletedSites[siteName] = {
      site: site.site,
      email: site.email || account.email || user.email,
      archivedAt: cancelledAt,
      cancelledAt,
      settings: site.settings,
      plan: site.plan,
      products: site.products,
      profiles: site.profiles,
      pages: site.pages,
      blogs: site.blogs,
      drafts: site.drafts,
    };
    delete account.sites[siteName];
    if (Object.keys(account.sites).length === 0) {
      account.onboardingComplete = false;
      account.onboardingStep = 0;
    }
    return {
      status: 200,
      payload: {
        success: true,
        archived: true,
        site: siteName,
        cancelledAt,
      },
    };
  }

  function switchBillingPlan(site, user, planId) {
    const plan = planById(planId || "seo_pro_monthly");
    const billing = site.billing || defaultBillingState(site);
    site.billing = {
      ...billing,
      billingPeriod: plan.billingPeriod,
      cancelAtPeriodEnd: false,
      cancellationDate: null,
      cancelledAt: null,
      cancellationFeedback: null,
      currentPeriodEnd: billing.currentPeriodEnd || iso(30),
      isActive: true,
      name: plan.name,
      nextBillDate: billing.nextBillDate || iso(30),
      planId: plan.planId,
      price: plan.price,
      status: "active",
      tier: plan.tier,
      updatedAt: iso(),
    };
    return {
      status: 200,
      payload: {
        success: true,
        newPlan: plan,
        subscription: subscriptionDetails(user, site),
      },
    };
  }

  function cancelBilling(site, user, body) {
    if (body.acceptRetention) {
      const switched = switchBillingPlan(site, user, "retention_monthly");
      switched.payload.retentionAccepted = true;
      return switched;
    }

    const billing = site.billing || defaultBillingState(site);
    const endsAtIso = billing.currentPeriodEnd || iso(30);
    const endsAtSeconds = Math.floor(new Date(endsAtIso).getTime() / 1000);
    site.billing = {
      ...billing,
      cancelAtPeriodEnd: true,
      cancellationDate: endsAtIso,
      cancellationFeedback: {
        reason: body.reason || "",
        missing: body.missing || "",
        alternative: body.alternative || "",
      },
      cancelledAt: iso(),
      endsAt: endsAtSeconds,
      isActive: true,
      status: "active_until_period_end",
      updatedAt: iso(),
    };
    return {
      status: 200,
      payload: {
        success: true,
        endsAt: endsAtSeconds,
        subscription: subscriptionDetails(user, site),
      },
    };
  }

  async function withAccount(user, mutator) {
    return mutateStore((store) => {
      const key = accountKey(user);
      if (!store.users[key]) store.users[key] = defaultUserState(user);
      store.users[key].email = user.email;
      store.users[key].role = user.role || "client";
      return mutator(store.users[key], store);
    });
  }

  function ensureSite(account, requestedSite, user) {
    const siteName = cleanSite(requestedSite || Object.keys(account.sites)[0] || "sirbloggsalot.com");
    if (!account.sites[siteName]) account.sites[siteName] = defaultSite(user || { email: account.email }, siteName);
    return account.sites[siteName];
  }

  async function readCompatUser(req) {
    // Authenticate strictly via the real signed-cookie session. Same-origin
    // requests from the SPA carry the HttpOnly `sirbloggs_session` cookie
    // automatically. The previous unsigned-Bearer fallback trusted a
    // client-supplied JWT payload (including role:"admin") without any signature
    // verification — an auth-bypass — and has been removed.
    return readSessionUser(req);
  }

  async function requireUser(req, res) {
    const user = await readCompatUser(req);
    if (!user) {
      sendJson(res, 401, { success: false, ok: false, message: "Authentication required.", error: "Authentication required." });
      return null;
    }
    return user;
  }

  function firstParam(url, name, fallback = "") {
    return url.searchParams.get(name) || fallback;
  }

  function allParams(url, names) {
    return names.flatMap((name) => url.searchParams.getAll(name)).filter(Boolean);
  }

  function splitPath(url) {
    return url.pathname.split("/").filter(Boolean);
  }

  function bodyFor(req) {
    // Memoize the PARSE PROMISE (not just the resolved value) so the request
    // stream is consumed exactly once. The provider layer may read the body then
    // fall through to a placeholder handler that reads it again; sharing one
    // promise means a malformed/oversized body rejects once (and both callers see
    // that rejection) instead of re-attaching listeners to an already-ended or
    // destroyed stream and hanging the request forever.
    if (req.__blawgyBodyPromise) return req.__blawgyBodyPromise;
    req.__blawgyBodyPromise = (async () => {
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        const type = String(req.headers["content-type"] || "");
        if (!type || type.includes("application/json")) {
          return readRequestJson(req);
        }
      }
      return {};
    })();
    return req.__blawgyBodyPromise;
  }

  function publicSiteSettings(site) {
    const gsc = site.settings.gsc?.access_token
      ? {
          access_token: site.settings.gsc.access_token,
          connected_at: site.settings.gsc.connected_at || null,
          connected_site: site.settings.gsc.connected_site || `sc-domain:${site.site}`,
          propertyUrl: site.settings.gsc.propertyUrl || site.settings.gsc.connected_site || `sc-domain:${site.site}`,
        }
      : null;
    const settings = {
      apiToken: site.settings.apiToken || "",
      appPassword: site.settings.appPassword || "",
      blogType: site.settings.blogType || null,
      businessDescription: site.settings.businessDescription || "",
      businessProfile: site.settings.businessProfile || null,
      businessType: site.settings.businessType || "local",
      collectionId: site.settings.collectionId || null,
      competitors: site.settings.competitors || [],
      cta: site.settings.cta,
      draft: Boolean(site.settings.draft),
      email: site.email,
      faviconUrl: "",
      fields: site.settings.fields || null,
      framerFieldMap: site.settings.framerFieldMap || null,
      framerPublishConsent: false,
      gsc,
      imageStyle: null,
      includeImages: Boolean(site.settings.includeImages),
      internalLinks: site.settings.internalLinks || [],
      keywordGroups: site.settings.keywordGroups || [],
      keywords: site.settings.keywords || [],
      language: null,
      links: Boolean(site.settings.links),
      market: site.settings.market || { countryCode: "US", languageCode: "en", locationName: "United States" },
      postsPerWeek: null,
      rrh: site.settings.rrh || { enabled: false },
      site: site.site,
      sitemapUrl: site.settings.sitemapUrl || `https://${site.site}/sitemap.xml`,
      targetAudience: Array.isArray(site.settings.targetAudience) ? site.settings.targetAudience : [String(site.settings.targetAudience || "Local business owners")],
      tone: site.settings.tone || "professional",
      username: site.settings.username || null,
      videos: Boolean(site.settings.videos),
    };

    for (const key of [
      "authToken",
      "categoryId",
      "framerApiKey",
      "framerCollectionId",
      "framerProjectUrl",
      "shopifyClientId",
      "shopifyClientSecret",
      "siteName",
    ]) {
      if (site.settings[key]) settings[key] = site.settings[key];
    }

    return {
      success: true,
      onboard: true,
      settings,
      subscription: subscription(),
    };
  }

  function framerBlogCollection() {
    return {
      id: "blog",
      name: "Blog",
      fields: [
        { id: "title", name: "Title", type: "string" },
        { id: "body", name: "Body", type: "formattedText" },
        { id: "heroImage", name: "Hero Image", type: "image" },
        { id: "date", name: "Publish Date", type: "date" },
      ],
    };
  }

  function gscRows(site, url) {
    const dimensions = allParams(url, [
      "dimensions",
      "dimension",
      "filters[dimensions]",
      "filters[dimensions][]",
      "filters[dimensions][0]",
    ]).join(",");
    const limit = Number(firstParam(url, "limit") || firstParam(url, "filters[limit]") || 10) || 10;
    const service = serviceKeywordFromDescription(site.settings.businessDescription || site.settings.product || "");
    const query = service.includes("local") ? service : `local ${service}`;
    if (dimensions.includes("page")) {
      return [
        { keys: [`https://${site.site}/blog/${slugFromTitle(query)}`], clicks: 61, impressions: 810, ctr: 0.075, position: 8.2 },
        { keys: [`https://${site.site}/`], clicks: 44, impressions: 690, ctr: 0.064, position: 11.4 },
      ].slice(0, limit);
    }
    if (dimensions.includes("query")) {
      return [
        { keys: [query], clicks: 38, impressions: 540, ctr: 0.07, position: 7.6 },
        { keys: [`${query} near me`], clicks: 26, impressions: 410, ctr: 0.063, position: 9.1 },
        { keys: [`best ${query}`], clicks: 18, impressions: 330, ctr: 0.055, position: 12.3 },
      ].slice(0, limit);
    }
    return [6, 5, 4, 3, 2, 1, 0].map((daysAgo, index) => ({
      keys: [iso(-daysAgo).slice(0, 10)],
      clicks: 14 + index * 4,
      impressions: 240 + index * 65,
      ctr: 0.058 + index * 0.002,
      position: 11.8 - index * 0.3,
    })).slice(0, limit);
  }

  function articleFromEntry(entry) {
    return {
      id: entry.id,
      title: entry.title,
      blogTitle: null,
      category: null,
      failureReason: null,
      imageUrl: null,
      keywords: entry.keyword ? [entry.keyword] : [],
      blogStatus: entry.blogStatus,
      publishDate: entry.publishDate,
      published: Boolean(entry.published),
      lastUpdated: null,
      hasContent: entry.hasContent,
      productIds: entry.productIds || [],
      seoMetrics: entry.seoMetrics,
      slug: null,
      source: entry.source || "manual",
      url: null,
      createdAt: entry.createdAt,
    };
  }

  function planEntryPayload(entry) {
    return {
      addedAt: entry.addedAt || entry.createdAt || iso(),
      addedBy: entry.addedBy || "local",
      blogContent: Boolean(entry.blogContent),
      blogStatus: entry.blogStatus || "draft",
      clusterLabel: null,
      id: entry.id,
      keyword: entry.keyword,
      keywords: entry.keywords || (entry.keyword ? [entry.keyword] : []),
      publishDate: entry.publishDate,
      publishedUrl: entry.publishedUrl || null,
      seoMetrics: entry.seoMetrics,
      source: entry.source || "manual",
      title: entry.title,
      upside: entry.upside && typeof entry.upside === "object" ? entry.upside : { low: 0, high: 0, positions: [] },
      why: entry.why && typeof entry.why === "object" ? entry.why : { aim: null, factors: [String(entry.why || "")].filter(Boolean), source: "keyword_research" },
    };
  }

  function planPayload(site) {
    const plan = site.plan;
    return {
      success: true,
      site: site.site,
      config: {
        autoRenew: Boolean(plan.config.autoRenew),
        excludedKeywords: plan.config.excludedKeywords || [],
        excludedTopics: plan.config.excludedTopics || [],
        hasPlan: true,
        horizon: Number(plan.config.horizon || plan.config.horizonWeeks || 6),
        manualKeywordRatio: Number(plan.config.manualKeywordRatio || 0),
        paused: Boolean(plan.config.paused),
        postsPerWeek: Number(plan.config.postsPerWeek || 0),
        priorities: null,
        supplyShort: false,
      },
      entries: plan.entries.map(planEntryPayload),
      projection: {
        entriesCounted: plan.entries.length,
        high: plan.entries.reduce((sum, entry) => sum + ((entry.upside && entry.upside.high) || 0), 0),
        low: plan.entries.reduce((sum, entry) => sum + ((entry.upside && entry.upside.low) || 0), 0),
        note: "",
      },
      runway: { estimate: true, netNewCandidates: 0, refreshOpportunities: 0, weeksOfRunway: Number(plan.config.horizon || plan.config.horizonWeeks || 6) },
      suggestions: plan.suggestions || [],
      trial: {
        articlesRemaining: null,
        isTrialing: false,
        limit: null,
        visibleUntilDate: null,
      },
    };
  }

  function findEntry(site, entryId) {
    return site.plan.entries.find((entry) => String(entry.id) === String(entryId) || String(entry._id) === String(entryId));
  }

  function removeById(rows, rowId) {
    const index = rows.findIndex((row) => String(row.id || row._id) === String(rowId));
    if (index < 0) return null;
    return rows.splice(index, 1)[0];
  }

  function slugFromTitle(title) {
    return String(title || "article")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "article";
  }

  function legacyArticlePayload(entry) {
    return {
      ...articleFromEntry(entry),
      blogContent: entry.blogContent || "",
      articleSummary: entry.articleSummary || "",
      productIds: entry.productIds || [],
    };
  }

  function currentSnapshot(site) {
    const rows = rankingRows(site);
    return {
      queriedAt: iso(),
      domain: site.site,
      domainMetrics: {
        totalKeywords: rows.length,
        organicTraffic: 1200,
        averagePosition: 12.4,
      },
      rankedKeywords: rows,
      opportunities: rows.slice(0, 3).map((row) => ({
        keyword: row.keyword,
        currentPosition: row.position,
        volume: row.volume,
        action: "Refresh or support with a new article",
      })),
      topPages: site.plan.entries.map((entry) => ({
        url: `https://${site.site}/blog/${entry.id}`,
        title: entry.title,
        clicks: 20,
        impressions: 500,
      })),
    };
  }

  function rankingRows(site) {
    const keywords = site.settings.keywords && site.settings.keywords.length ? site.settings.keywords : ["AI SEO for local business"];
    return keywords.map((keyword, index) => ({
      keyword: typeof keyword === "string" ? keyword : keyword.keyword || keyword.kw || String(keyword),
      position: 6 + index,
      previousPosition: 8 + index,
      volume: 500 - index * 40,
      url: `https://${site.site}/blog/${encodeURIComponent(String(keyword).toLowerCase().replace(/\s+/g, "-"))}`,
      source: "local",
    }));
  }

  function aiSnapshot(site) {
    const totalMentions = Math.max(0, site.plan.entries.filter((entry) => entry.blogStatus !== "cancelled").length);
    return {
      queriedAt: iso(),
      site: site.site,
      metrics: {
        totalMentions,
        shareOfVoice: totalMentions ? 0.18 : 0,
        queriesChecked: 6,
        competitorsMentioned: 2,
      },
      queries: [
        {
          query: `best AI SEO help for ${site.site}`,
          mentioned: totalMentions > 0,
          position: totalMentions > 0 ? 2 : null,
          answerEngine: "local-sim",
        },
      ],
      mentions: totalMentions
        ? [{ source: "local-sim", query: `best AI SEO help for ${site.site}`, url: `https://${site.site}/` }]
        : [],
    };
  }

  function parseTargets(raw) {
    return String(raw || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, keyword, slug, notes] = line.split(",").map((part) => part.trim());
        const safeName = name || line;
        return {
          name: safeName,
          keyword: keyword || safeName,
          slug: (slug || safeName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          notes: notes || "",
        };
      });
  }

  function sendStream(res, events) {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    for (const event of events) {
      if (event && event.event) {
        res.write(`event: ${event.event}\n`);
        res.write(`data: ${JSON.stringify(event.data ?? {})}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    }
    res.end();
  }

  async function routeAccount(req, res, url, user) {
    const body = await bodyFor(req);
    const accountResult = await withAccount(user, (account) => {
      if (req.method === "GET" && url.pathname === "/me") {
        const sites = siteList(account);
        if (!account.onboardingComplete && sites.length === 0) {
          return {
            status: 200,
            payload: {
              email: user.email,
              currentSite: null,
              isTestAccount: false,
              onboardingComplete: false,
              onboardingData: null,
              onboardingStep: account.onboardingStep || 0,
              pendingCompSlug: null,
              sites: [],
            },
          };
        }
        const site = ensureSite(account, firstParam(url, "site"), user);
        return {
          status: 200,
          payload: {
            email: user.email,
            currentSite: site.site,
            isTestAccount: false,
            onboardingComplete: account.onboardingComplete !== false,
            onboardingData: onboardingData(site),
            onboardingStep: account.onboardingStep || 5,
            pendingCompSlug: null,
            sites: Object.keys(account.sites),
          },
        };
      }

      if (req.method === "GET" && url.pathname === "/get-user-details") {
        const sites = siteList(account);
        if (!account.onboardingComplete && sites.length === 0) {
          return {
            status: 200,
            payload: {
              attribution: null,
              attributionUpdatedAt: null,
              createdAt: iso(),
              credits: null,
              currentSite: null,
              email: user.email,
              emailVerified: "true",
              firebaseUid: user.id || user.email,
              gclid: null,
              id: user.id || user.email,
              insertDate: iso(),
              invites: null,
              isAdmin: null,
              isTestAccount: null,
              lastUpdated: iso(),
              mongoId: null,
              name: user.name || null,
              onboardingComplete: false,
              onboardingData: null,
              onboardingStep: account.onboardingStep || 0,
              partnerId: null,
              pendingCompSlug: null,
              professionalRole: null,
              promotekitReferral: null,
              referralSource: null,
              sites: [],
              testAccountCreatedBy: null,
              updatedAt: iso(),
            },
          };
        }
        const site = ensureSite(account, firstParam(url, "site"), user);
        return {
          status: 200,
          payload: {
            attribution: null,
            attributionUpdatedAt: null,
            createdAt: iso(-7),
            credits: null,
            currentSite: site.site,
            email: user.email,
            emailVerified: "true",
            firebaseUid: user.id || user.email,
            gclid: null,
            id: user.id || user.email,
            insertDate: iso(-7),
            invites: null,
            isAdmin: null,
            isTestAccount: null,
            lastUpdated: iso(),
            mongoId: null,
            name: null,
            onboardingComplete: account.onboardingComplete !== false,
            onboardingData: onboardingData(site),
            onboardingStep: account.onboardingStep || 5,
            partnerId: null,
            pendingCompSlug: null,
            professionalRole: null,
            promotekitReferral: null,
            referralSource: null,
            sites: siteList(account),
            testAccountCreatedBy: null,
            updatedAt: iso(),
          },
        };
      }

      if (req.method === "GET" && url.pathname === "/get-site-settings") {
        const site = ensureSite(account, firstParam(url, "site"), user);
        return { status: 200, payload: publicSiteSettings(site) };
      }

      if (req.method === "POST" && url.pathname === "/update-site-settings") {
        const site = ensureSite(account, body.site, user);
        site.settings = {
          ...site.settings,
          ...(body.settings && typeof body.settings === "object" ? body.settings : {}),
          site: site.site,
        };
        return { status: 200, payload: { success: true, settings: site.settings } };
      }

      if (req.method === "GET" && url.pathname === "/all-blog-posts") {
        const site = ensureSite(account, firstParam(url, "site"), user);
        const rows = [
          ...site.plan.entries.map(articleFromEntry),
          ...site.blogs.map((blog) => ({ ...blog, id: blog.id || blog._id, _id: blog._id || blog.id })),
        ];
        return { status: 200, payload: rows };
      }

      if (req.method === "GET" && url.pathname === "/blog-content") {
        const site = ensureSite(account, firstParam(url, "site"), user);
        const entry = findEntry(site, firstParam(url, "id"));
        return {
          status: 200,
          payload: {
            success: true,
            blogContent: entry?.blogContent || `<p>${entry?.title || "Draft article"} content is ready for editing.</p>`,
            articleSummary: entry?.articleSummary || entry?.why || "",
          },
        };
      }

      if (req.method === "POST" && url.pathname === "/test-connection") {
        const site = ensureSite(account, body.site, user);
        const blogType = body.blogType || site.settings.blogType;
        site.settings = {
          ...site.settings,
          blogType,
          ...(blogType === "webflow"
            ? {
                apiToken: body.apiToken || site.settings.apiToken,
                collectionId: body.collectionId || site.settings.collectionId,
              }
            : {}),
          ...(blogType === "shopify"
            ? {
                authToken: body.authToken || site.settings.authToken,
                siteName: body.siteName || site.settings.siteName,
                categoryId: body.categoryId || site.settings.categoryId,
                shopifyClientId: body.shopifyClientId || site.settings.shopifyClientId,
                shopifyClientSecret: body.shopifyClientSecret || site.settings.shopifyClientSecret,
              }
            : {}),
          ...(blogType === "wordpress"
            ? {
                username: body.username || site.settings.username,
                appPassword: body.appPassword || site.settings.appPassword,
              }
            : {}),
          ...(blogType === "framer"
            ? {
                framerProjectUrl: body.framerProjectUrl || site.settings.framerProjectUrl,
                framerApiKey: body.framerApiKey || site.settings.framerApiKey,
              }
            : {}),
        };
        return {
          status: 200,
          payload: {
            success: true,
            message: "Connection successful.",
            collections: blogType === "framer" ? [framerBlogCollection()] : undefined,
            projectName: blogType === "framer" ? site.site : undefined,
          },
        };
      }

      if (req.method === "POST" && url.pathname === "/invite-user") {
        return {
          status: 200,
          payload: {
            success: true,
            link: `/invite?site=${encodeURIComponent(body.site || "")}&email=${encodeURIComponent(body.email || "")}`,
          },
        };
      }

      if (req.method === "POST" && url.pathname === "/research-competitors") {
        return {
          status: 200,
          payload: {
            success: true,
            competitors: [
              { domain: "localdirectory.example", reasoning: "Ranks for local service comparison searches." },
              { domain: "regionalmarket.example", reasoning: "Publishes regional buying guides that overlap this site." },
              { domain: "servicefinder.example", reasoning: "Competes for high-intent service discovery queries." },
            ],
          },
        };
      }

      if (req.method === "POST" && ["/generate-image", "/generate-contextual-image"].includes(url.pathname)) {
        const url = "/assets/sirbloggsalot-og.png";
        return {
          status: 200,
          payload: {
            success: true,
            url,
            imageUrl: url,
            alt: body.prompt || "Generated article visual",
          },
        };
      }

      const extra = routeRootExtra(req, url, body, account, user);
      if (extra) return extra;

      return { status: 404, payload: { success: false, message: "Blawgy account endpoint not found." } };
    });

    if (accountResult.stream) {
      sendStream(res, accountResult.events || []);
      return true;
    }
    sendJson(res, accountResult.status, accountResult.payload);
    return true;
  }

  function plansPayload() {
    return [
      { _id: id("plan"), planId: "growth_monthly", tier: "growth", name: "Growth", billingPeriod: "monthly", price: 199, monthlyEquivalent: 199, isActive: true, isRecommended: false, isRetentionPlan: false, credits: { article: 20 }, features: ["Content plan", "Article drafts"] },
      { _id: id("plan"), planId: "growth_annual", tier: "growth", name: "Growth", billingPeriod: "annual", price: 1908, monthlyEquivalent: 159, isActive: true, isRecommended: true, isRetentionPlan: false, credits: { article: 20 }, features: ["Content plan", "Article drafts"] },
      { _id: id("plan"), planId: "seo_pro_monthly", tier: "seo_pro", name: "Pro+", billingPeriod: "monthly", price: 399, monthlyEquivalent: 399, isActive: true, isRecommended: false, isRetentionPlan: true, credits: { article: 50 }, features: ["SEO analysis", "AI mentions", "Search Console"] },
    ];
  }

  function outlinePayload(title = "Local Visibility Guide") {
    return {
      title,
      sections: [
        { id: "intro", title: "Introduction", bullets: ["Set the context quickly", "Name the practical outcome"] },
        { id: "strategy", title: "What To Fix First", bullets: ["Explain the highest-value actions", "Prioritize local proof and useful answers"] },
        { id: "next", title: "Next Steps", bullets: ["Give the reader a clear action plan"] },
      ],
    };
  }

  function fullArticlePayload(title = "Local Visibility Guide", outline = outlinePayload(title)) {
    const sections = Array.isArray(outline.sections) ? outline.sections : outlinePayload(title).sections;
    return {
      title,
      sections: sections.map((section) => ({
        id: section.id || id("section"),
        title: section.title || "Section",
        content: `<p>${section.title || "This section"} explains a practical step the business can take.</p>`,
      })),
      metaDescription: `${title} with practical steps for local visibility.`,
      isFactChecked: true,
    };
  }

  function offerPayload(domain) {
    const clean = cleanSite(domain || "example.com");
    return {
      slug: clean.replace(/[^a-z0-9]+/g, "-"),
      domain: clean,
      offers: [
        {
          name: "Visibility Sprint",
          price: 997,
          guarantee: "A clear content plan and first publish-ready assets.",
          stack: ["SEO snapshot", "Topic map", "Draft article", "Local page plan"],
        },
        {
          name: "Managed Growth",
          price: 2497,
          guarantee: "Monthly execution across articles, pages, and reporting.",
          stack: ["Weekly content", "Search monitoring", "AI mention tracking"],
        },
      ],
    };
  }

  function routeRootExtra(req, url, body, account, user) {
    const pathName = url.pathname;
    if (req.method === "DELETE" && pathName.startsWith("/sites/")) {
      return deleteSite(account, decodeURIComponent(pathName.slice("/sites/".length)), user);
    }

    const siteName = cleanSite(body.site || body.siteId || body.siteDomain || body.currentBlawgySite || firstParam(url, "site") || firstParam(url, "siteId") || firstParam(url, "website") || Object.keys(account.sites)[0]);
    if (req.method === "GET" && pathName === "/subscription-details" && account.deletedSites?.[siteName]) {
      return {
        status: 200,
        payload: {
          success: true,
          subscription: subscriptionDetails(user, { site: siteName, archived: account.deletedSites[siteName] }),
        },
      };
    }

    const site = ensureSite(account, siteName, user);

    if (req.method === "POST" && pathName === "/accept-invite") return { status: 200, payload: { success: true, site: site.site } };
    if (req.method === "POST" && pathName === "/signup") return { status: 200, payload: { success: true, user: { email: body.email || user.email } } };
    if (req.method === "GET" && pathName === "/comp-links/validate") return { status: 200, payload: { success: true, valid: true, slug: firstParam(url, "slug") || "local" } };
    if (req.method === "POST" && pathName === "/comp-links/redeem") return { status: 200, payload: { success: true, subscription: subscription() } };
    if (req.method === "POST" && pathName === "/connect-site") return { status: 200, payload: publicSiteSettings(site) };
    if (req.method === "GET" && pathName === "/scrape-site") return { status: 200, payload: { success: true, productDescription: scrapedBusinessDescription(site), faviconUrl: "/favicon.svg" } };
    if (req.method === "GET" && pathName === "/scrape-site/stream") {
      const productDescription = scrapedBusinessDescription(site);
      return {
        stream: true,
        events: [
          { event: "progress", data: { step: "reading_homepage", website: site.site } },
          { event: "progress", data: { step: "learning_products", website: site.site } },
          { event: "result", data: { success: true, productDescription, faviconUrl: "/favicon.svg" } },
        ],
      };
    }
    if (req.method === "POST" && pathName === "/onboarding-suggestions") return { status: 200, payload: { success: true, audienceSuggestions: ["Local business owners", "Service buyers", "Repeat customers"], toneSuggestions: ["Helpful", "Expert", "Direct"] } };
    if (req.method === "POST" && pathName === "/detect-business-type") return { status: 200, payload: { success: true, businessType: "local", market: "United States", locations: site.profiles } };
    if (req.method === "POST" && pathName === "/onboarding/classify-input") return { status: 200, payload: { success: true, type: "website", value: body.text || "" } };
    if (req.method === "POST" && pathName === "/onboarding/complete") {
      const primaryProfile = body.businessProfile && typeof body.businessProfile === "object"
        ? normalizedBusinessProfile(body.businessProfile, { businessName: titleFromKeyword(site.site.replace(/\./g, " ")) })
        : null;
      if (primaryProfile) primaryProfile.isPrimary = true;
      const additionalProfiles = Array.isArray(body.additionalBusinessProfiles)
        ? body.additionalBusinessProfiles.map((profile) => normalizedBusinessProfile(profile, {})).map((profile) => ({ ...profile, isPrimary: false }))
        : [];
      site.settings = {
        ...site.settings,
        businessDescription: body.productDescription || site.settings.businessDescription,
        businessType: body.businessType || site.settings.businessType,
        competitors: Array.isArray(body.competitors) ? body.competitors : site.settings.competitors,
        faviconUrl: body.faviconUrl || site.settings.faviconUrl || "",
        market: body.market || site.settings.market,
        businessProfile: primaryProfile || site.settings.businessProfile || null,
        additionalBusinessProfiles: additionalProfiles.length ? additionalProfiles : site.settings.additionalBusinessProfiles || [],
        targetAudience: body.targetAudience || site.settings.targetAudience,
        tone: body.tone || site.settings.tone,
        site: site.site,
      };
      if (primaryProfile) {
        site.profiles = [primaryProfile, ...additionalProfiles];
      }
      account.onboardingComplete = true;
      account.onboardingStep = 5;
      return { status: 200, payload: { success: true, site: site.site, settings: site.settings } };
    }

    if (req.method === "GET" && pathName === "/get-plans") return { status: 200, payload: { success: true, data: plansPayload() } };
    if (req.method === "GET" && pathName === "/subscription-details") return { status: 200, payload: { success: true, subscription: subscriptionDetails(user, site) } };
    if (req.method === "POST" && pathName === "/checkout-session") return { status: 200, payload: { success: true, url: `/success?site=${encodeURIComponent(site.site)}` } };
    if (req.method === "POST" && pathName === "/customer-portal") return { status: 200, payload: { success: true, url: "/settings/billing" } };
    if (req.method === "POST" && pathName === "/generate-retention-message") return { status: 200, payload: { success: true, message: "Keep the plan at a lighter rate while we continue improving your visibility." } };
    if (req.method === "POST" && pathName === "/switch-plan") return switchBillingPlan(site, user, body.newPlanId || body.planId);
    if (req.method === "POST" && pathName === "/cancel-subscription") return cancelBilling(site, user, body);

    if (req.method === "GET" && pathName === "/generate-description") return { status: 200, payload: { success: true, description: site.settings.businessDescription } };
    if (req.method === "GET" && pathName === "/fetch-sitemap") {
      const urls = [`https://${site.site}/`, `https://${site.site}/blog`];
      return { status: 200, payload: { success: true, urls, sitemapLinks: urls } };
    }
    if (req.method === "GET" && pathName === "/shopify/blogs") return { status: 200, payload: { success: true, blogs: [{ id: "main", title: "News" }] } };
    if (req.method === "GET" && pathName === "/wix/details") return { status: 200, payload: { success: true, members: [], sites: [] } };
    if (req.method === "GET" && pathName === "/framer/collections") return { status: 200, payload: { success: true, collections: [framerBlogCollection()], projectName: site.site } };
    if (req.method === "GET" && pathName === "/webflow/fields") return { status: 200, payload: { success: true, fields: [{ slug: "name", name: "Name", type: "PlainText" }, { slug: "post-body", name: "Post Body", type: "RichText" }] } };

    if (req.method === "POST" && pathName === "/fetch-youtube-channel") return { status: 200, payload: { success: true, channelInfo: { title: "Local Channel", videos: [] } } };
    if (req.method === "POST" && pathName === "/generate-article-titles") {
      const prompt = String(body.prompt || "local visibility").split(/\n/)[0].slice(0, 80);
      return { status: 200, payload: { success: true, titles: [`How ${titleFromKeyword(prompt)} Works`, `${titleFromKeyword(prompt)} Checklist`, `${titleFromKeyword(prompt)} Guide`] } };
    }
    if (req.method === "POST" && ["/generate-article-outline", "/regenerate-article-outline"].includes(pathName)) return { status: 200, payload: { success: true, outline: outlinePayload(body.title), imageAssignments: [] } };
    if (req.method === "POST" && pathName === "/generate-full-article") return { status: 200, payload: { success: true, article: fullArticlePayload(body.title, body.outline) } };
    if (req.method === "POST" && ["/generate-featured-image", "/upload-file", "/upload-image"].includes(pathName)) return { status: 200, payload: { success: true, imageUrl: "/images/og-preview.png", url: "/images/og-preview.png", s3Url: "/images/og-preview.png" } };
    if (req.method === "POST" && pathName === "/analyze-screenshots") return { status: 200, payload: { success: true, analysis: { summary: "Screenshots show product or service context.", keyFeatures: ["Offer", "Proof", "CTA"] } } };
    if (req.method === "POST" && pathName === "/save-article") {
      const blogId = id("blog");
      const blog = {
        id: blogId,
        _id: blogId,
        title: body.title || body.blogTitle || body.article?.title || "Saved article",
        blogStatus: body.status || "draft",
        publishDate: body.publishDate || iso(),
        blogContent: articleHtmlFrom(body.article, body.blogContent || body.content || ""),
        articleSummary: body.metaDescription || "",
        keywords: Array.isArray(body.keywords) ? body.keywords : arrayFromValue(body.keywords),
        featuredImage: body.featuredImage || null,
        createdWith: body.createdWith || "article-builder",
      };
      site.blogs.unshift(blog);
      return { status: 200, payload: { success: true, blog, id: blog.id } };
    }
    if (req.method === "POST" && pathName === "/regenerate-article-section") return { status: 200, payload: { success: true, section: { id: body.sectionId || id("section"), title: body.title || "Updated section", content: "<p>Updated local section content.</p>" } } };

    if (req.method === "POST" && pathName === "/generate-premises") return { status: 200, payload: { success: true, premises: ["Helpful local guide", "Comparison article", "How-to checklist"] } };
    if (req.method === "POST" && pathName === "/generate-bulk-articles") {
      const entries = ["Helpful local guide", "Comparison article"].map((keyword, index) => makePlanEntry(keyword, { site: site.site, publishDate: iso(7 + index) }));
      site.plan.entries.push(...entries);
      return { status: 200, payload: { success: true, articles: entries.map(articleFromEntry), count: entries.length } };
    }
    if (req.method === "PUT" && pathName.startsWith("/generate-blog/")) {
      const entryId = decodeURIComponent(pathName.slice("/generate-blog/".length));
      const entry = findEntry(site, entryId);
      if (!entry) return { status: 404, payload: { success: false, message: "Article not found." } };
      entry.blogStatus = "in_queue";
      entry.status = "queued";
      entry.updatedAt = iso();
      return { status: 200, payload: { success: true, blogStatus: entry.blogStatus, article: legacyArticlePayload(entry) } };
    }
    if (req.method === "POST" && pathName === "/save-post") {
      const entry = findEntry(site, body.id);
      if (!entry) return { status: 404, payload: { success: false, message: "Article not found." } };
      if (body.title) entry.title = String(body.title);
      if (Object.prototype.hasOwnProperty.call(body, "keywords")) {
        entry.keywords = arrayFromValue(body.keywords);
        if (entry.keywords[0]) {
          entry.keyword = entry.keywords[0];
          entry.targetKeyword = entry.keywords[0];
          entry.seoMetrics = { ...(entry.seoMetrics || {}), targetKeyword: entry.keywords[0] };
        }
      }
      if (body.publishDate) entry.publishDate = body.publishDate;
      if (body.blogStatus) entry.blogStatus = body.blogStatus;
      if (Object.prototype.hasOwnProperty.call(body, "blogContent") && body.blogContent) {
        entry.blogContent = String(body.blogContent);
        entry.hasContent = true;
      }
      if (Array.isArray(body.productIds)) entry.productIds = body.productIds;
      entry.updatedAt = iso();
      return { status: 200, payload: { success: true, article: legacyArticlePayload(entry) } };
    }
    if (req.method === "POST" && pathName === "/update-publish-date") {
      const entry = findEntry(site, body.id);
      if (!entry) return { status: 404, payload: { success: false, message: "Article not found." } };
      entry.publishDate = body.publishDate || entry.publishDate;
      entry.updatedAt = iso();
      return { status: 200, payload: { success: true, article: legacyArticlePayload(entry) } };
    }
    if (req.method === "POST" && ["/republish-article", "/publish-draft"].includes(pathName)) {
      const entry = findEntry(site, body.id);
      if (!entry) return { status: 404, payload: { success: false, message: "Article not found." } };
      entry.blogStatus = "published";
      entry.status = "published";
      entry.published = true;
      entry.publishedAt = iso();
      entry.publishedUrl = entry.publishedUrl || `https://${site.site}/blog/${slugFromTitle(entry.title)}`;
      if (pathName === "/republish-article") entry.lastRepublishedAt = iso();
      entry.updatedAt = iso();
      return { status: 200, payload: { success: true, article: legacyArticlePayload(entry), publishedUrl: entry.publishedUrl } };
    }
    if (req.method === "PUT" && pathName === "/cancel-blog-posting") {
      const removed = removeById(site.plan.entries, body.blogId);
      removeById(site.blogs, body.blogId);
      return removed
        ? { status: 200, payload: { success: true, removedId: body.blogId } }
        : { status: 404, payload: { success: false, message: "Article not found." } };
    }
    if (req.method === "PUT" && pathName === "/bulk-delete-premises") {
      const ids = Array.isArray(body.blogIds) ? body.blogIds : [];
      let removed = 0;
      for (const rowId of ids) {
        if (removeById(site.plan.entries, rowId)) removed += 1;
        removeById(site.blogs, rowId);
      }
      return { status: 200, payload: { success: true, removed } };
    }

    if (req.method === "GET" && pathName === "/gsc/data") {
      if (!site.settings.gsc?.access_token) return { status: 500, payload: { error: "Search Console data is not connected for this site." } };
      return { status: 200, payload: { success: true, rows: gscRows(site, url), connectedSite: site.settings.gsc.connected_site } };
    }
    if (req.method === "GET" && pathName === "/site-settings") return { status: 200, payload: { success: true, settings: publicSiteSettings(site).settings } };
    if (req.method === "GET" && pathName.startsWith("/gsc/sites/")) {
      const property = `sc-domain:${site.site}`;
      return { status: 200, payload: { success: true, sites: [{ displayName: site.site, url: property, permissionLevel: "siteOwner" }] } };
    }
    if (req.method === "POST" && pathName === "/gsc/connect") {
      const selectedSite = String(body.selectedGscSite || body.gscSite || body.siteUrl || `sc-domain:${site.site}`).trim() || `sc-domain:${site.site}`;
      site.settings.gsc = {
        access_token: `local_gsc_${crypto.createHash("sha1").update(`${user.email}:${site.site}`).digest("hex").slice(0, 12)}`,
        connected_at: iso(),
        connected_site: selectedSite,
        propertyUrl: selectedSite,
        token: body.token || "local",
      };
      return { status: 200, payload: { success: true, gsc: publicSiteSettings(site).settings.gsc } };
    }
    if (req.method === "POST" && pathName === "/gsc/disconnect") {
      site.settings.gsc = null;
      return { status: 200, payload: { success: true, gsc: null } };
    }

    if (pathName.startsWith("/admin/")) return routeAdminExtra(req, pathName, body, account, user);

    if (req.method === "GET" && pathName === "/hormozi/api/generate") {
      const offer = offerPayload(firstParam(url, "domain", site.site));
      return { status: 200, payload: { success: true, data: offer } };
    }
    if (req.method === "GET" && pathName.startsWith("/hormozi/api/offers/")) {
      const slug = pathName.split("/").pop();
      return { status: 200, payload: { success: true, data: offerPayload(slug) } };
    }

    return null;
  }

  function routeAdminExtra(req, pathName, body, account, user) {
    if (user.role !== "admin") return { status: 403, payload: { success: false, message: "Admin access required." } };
    if (req.method === "GET" && pathName === "/admin/sites") return { status: 200, payload: { success: true, sites: siteList(account) } };
    if (req.method === "GET" && pathName === "/admin/site-details") return { status: 200, payload: { success: true, site: Object.values(account.sites)[0] } };
    if (req.method === "PATCH" && pathName === "/admin/site-flags") return { status: 200, payload: { success: true } };
    if (req.method === "GET" && pathName === "/admin/stats") return { status: 200, payload: { success: true, totals: { sites: siteList(account).length, articles: Object.values(account.sites)[0]?.plan.entries.length || 0 }, series: [] } };
    if (req.method === "GET" && pathName === "/admin/stats/gsc") return { status: 200, payload: { success: true, rows: [] } };
    if (req.method === "GET" && pathName === "/admin/stats/signups") return { status: 200, payload: { success: true, signups: [] } };
    if (req.method === "GET" && pathName === "/admin/exec-report") return { status: 200, payload: { success: true, report: { summary: "Local executive report." } } };
    if (req.method === "GET" && pathName === "/admin/partners") return { status: 200, payload: { success: true, partners: [account.partner] } };
    if (["POST", "PUT"].includes(req.method) && pathName.startsWith("/admin/partners")) return { status: 200, payload: { success: true, partner: { ...account.partner, ...body } } };
    if (req.method === "GET" && pathName === "/admin/comp-links") return { status: 200, payload: { success: true, links: [] } };
    if (["POST", "PATCH", "DELETE"].includes(req.method) && pathName.startsWith("/admin/comp-links")) return { status: 200, payload: { success: true } };
    if (req.method === "GET" && pathName === "/admin/test-accounts") return { status: 200, payload: { success: true, accounts: [] } };
    if (["POST", "DELETE"].includes(req.method) && pathName.startsWith("/admin/test-accounts")) return { status: 200, payload: { success: true, customToken: "local-test" } };
    return { status: 404, payload: { success: false, message: "Admin route not found." } };
  }

  async function routeApi(req, res, url, user) {
    const body = await bodyFor(req);
    const parts = splitPath(url).slice(1);

    if (req.method === "GET" && url.pathname === "/api/branding") {
      sendJson(res, 200, {
        success: true,
        branding: {
          isWhiteLabel: false,
          name: "Blawgy",
          logoUrl: null,
          supportEmail: "support@blawgy.com",
          partnerId: null,
        },
      });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/login/track-login") {
      sendJson(res, 200, { success: true });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/assistant/chat") {
      sendStream(res, [
        { type: "conversation", id: id("conv") },
        { type: "text", text: "Local Blawgy-compatible assistant endpoint is online. I can inspect the site plan, settings, products, pages, and drafts in this local build." },
        { type: "done" },
      ]);
      return true;
    }

    const result = await withAccount(user, (account, store) => {
      if (parts[0] === "save-keywords" && req.method === "POST") {
        const saveSite = ensureSite(account, body.site, user);
        const incoming = Array.isArray(body.keywords) ? body.keywords : [];
        saveSite.settings.keywords = mergeKeywords(saveSite.settings.keywords || [], incoming);
        return { status: 200, payload: { success: true, keywords: saveSite.settings.keywords } };
      }
      if (parts[0] === "plan") return routePlan(req, parts, body, account, user);
      if (parts[0] === "keyword-research") return routeKeywordResearch(req, url, parts, body, account, user);
      if (parts[0] === "products") return routeProducts(req, parts, body, account, user);
      if (parts[0] === "pages") return routePages(req, url, parts, body, account, user);
      if (parts[0] === "article-builder") return routeArticleBuilder(req, url, parts, body, account, user);
      if (parts[0] === "seo") return routeSeo(req, parts, account, user);
      if (parts[0] === "ai-mentions") return routeAiMentions(req, parts, account, user);
      if (parts[0] === "updates") return routeUpdates(req, parts, body, account, user);
      if (parts[0] === "webhooks") return routeWebhooks(req, url, parts, body, account, user);
      if (parts[0] === "dutchie") return routeDutchie(req, parts, body, account, user);
      if (parts[0] === "partner") return routePartner(req, parts, body, account, user);
      if (parts[0] === "tour" && req.method === "GET" && parts[1] === "progress") {
        const tourKey = firstParam(url, "userId") || user.email;
        const progress = store.tours?.[tourKey] || {
          userId: tourKey,
          tourVersion: 1,
          tours: {
            main: {
              completed: false,
              completedAt: iso(),
              currentStep: 0,
              startedAt: iso(),
            },
          },
          createdAt: iso(),
          updatedAt: iso(),
        };
        return { status: 200, payload: { success: true, progress } };
      }
      return { status: 404, payload: { success: false, message: "Blawgy API endpoint not found." } };
    });

    if (parts[0] === "tour" && req.method === "POST") {
      await mutateStore((store) => {
        const tourKey = body.userId || user.email;
        store.tours[tourKey] = {
          tourVersion: body.tourVersion || body.progress?.tourVersion || 1,
          tours: body.tours || body.progress?.tours || {},
          updatedAt: iso(),
        };
        return null;
      });
      sendJson(res, 200, { success: true });
      return true;
    }

    if (parts[0] === "assistant" && parts[1] === "flow" && req.method === "POST") {
      sendJson(res, 200, { done: true });
      return true;
    }
    if (parts[0] === "assistant" && parts[1] === "confirm" && req.method === "POST") {
      sendJson(res, 200, { success: true, message: "Confirmed locally." });
      return true;
    }

    sendJson(res, result.status, result.payload);
    return true;
  }

  function routePlan(req, parts, body, account, user) {
    const planSite = ensureSite(account, parts[1], user);
    const plan = planSite.plan;
    if (req.method === "GET" && parts.length === 2) return { status: 200, payload: planPayload(planSite) };
    if (req.method === "POST" && parts[2] === "generate") {
      const added = [];
      for (const cluster of clustersForSite(planSite).slice(0, 2)) {
        if (plan.entries.some((entry) => entry.clusterLabel === cluster.label)) continue;
        const pillar = (cluster.keywords || []).find((row) => row.kw === cluster.pillarKeyword) || (cluster.keywords || [])[0] || {};
        const entry = makePlanEntry(cluster.pillarKeyword, {
          site: planSite.site,
          clusterLabel: cluster.label,
          source: "autopilot",
          publishDate: iso(7 + added.length * 7),
          searchVolume: pillar.volume,
          difficulty: pillar.kd,
          intent: pillar.intent,
        });
        plan.entries.push(entry);
        added.push(entry);
      }
      plan.generatedAt = iso();
      return { status: 200, payload: { success: true, scheduled: added.length, entries: added, runwayWeeks: plan.config.horizonWeeks } };
    }
    if (req.method === "POST" && parts[2] === "add") {
      const keyword = String(body.keyword || body.label || "local business visibility").trim();
      const clusterLabel = body.clusterLabel || titleFromKeyword(keyword);
      if (!body.force) {
        const topicExcluded = (plan.config.excludedTopics || []).some((topic) => topic.toLowerCase() === String(clusterLabel).toLowerCase());
        const keywordExcluded = (plan.config.excludedKeywords || []).some((row) => row.toLowerCase() === keyword.toLowerCase());
        if (topicExcluded || keywordExcluded) {
          return { status: 200, payload: { success: false, blocked: "excluded", message: "You removed this in Settings. Restore it first to add it back." } };
        }
      }
      const entry = makePlanEntry(keyword, { ...body, site: planSite.site, clusterLabel });
      plan.entries.push(entry);
      plan.config.topicAddResults[clusterLabel] = { status: "added", count: 1, entryId: entry.id, publishDate: entry.publishDate, message: "Added to your plan." };
      return { status: 200, payload: { success: true, entry, entries: [entry], added: 1, message: "Added 1 article to your plan." } };
    }
    if (req.method === "GET" && parts[2] === "topic-adds") return { status: 200, payload: { success: true, results: plan.config.topicAddResults || {}, hiddenTopics: plan.config.hiddenTopics || [] } };
    if (req.method === "GET" && parts[2] === "keyword-status") {
      const statuses = (planSite.settings.keywords || []).map((keywordRow) => {
        const row = normalizedKeyword(keywordRow);
        const keyword = row?.keyword || "";
        return {
          keyword,
          status: plan.entries.some((entry) => String(entry.keyword).toLowerCase() === keyword.toLowerCase()) ? "scheduled" : "available",
          volume: row?.volume || 0,
          kd: row?.difficulty || 0,
          source: row?.source || "manual",
        };
      }).filter((row) => row.keyword);
      return { status: 200, payload: { success: true, statuses } };
    }
    if (req.method === "PATCH" && parts[2] === "config") {
      plan.config = { ...plan.config, ...body };
      return { status: 200, payload: { success: true, config: plan.config } };
    }
    if (req.method === "POST" && parts[2] === "pause") {
      plan.config.paused = true;
      return { status: 200, payload: { success: true, config: plan.config } };
    }
    if (req.method === "POST" && parts[2] === "resume") {
      plan.config.paused = false;
      return { status: 200, payload: { success: true, config: plan.config } };
    }
    if (req.method === "POST" && parts[2] === "topics" && parts[3] === "dismiss") {
      const label = String(body.label || "").trim();
      if (label && body.undo) plan.config.hiddenTopics = (plan.config.hiddenTopics || []).filter((topic) => topic !== label);
      else if (label && !(plan.config.hiddenTopics || []).includes(label)) plan.config.hiddenTopics.push(label);
      return { status: 200, payload: { success: true, hiddenTopics: plan.config.hiddenTopics } };
    }
    if (req.method === "POST" && parts[2] === "topics" && parts[3] === "exclude") {
      const topic = String(body.topic || "").trim();
      const keyword = String(body.keyword || "").trim();
      const applyList = (field, value) => {
        if (!value) return;
        const current = plan.config[field] || [];
        plan.config[field] = body.undo ? current.filter((row) => row.toLowerCase() !== value.toLowerCase()) : Array.from(new Set([...current, value]));
      };
      applyList("excludedTopics", topic);
      applyList("excludedKeywords", keyword);
      return { status: 200, payload: { success: true, excludedTopics: plan.config.excludedTopics, excludedKeywords: plan.config.excludedKeywords } };
    }
    if (parts[2] === "entry" && parts[3]) {
      const entry = findEntry(planSite, parts[3]);
      if (req.method === "PATCH") {
        if (!entry) return { status: 404, payload: { success: false, message: "Entry not found." } };
        Object.assign(entry, body, { id: entry.id, _id: entry._id || entry.id, updatedAt: iso() });
        if (body.keyword) entry.seoMetrics = { ...(entry.seoMetrics || {}), targetKeyword: body.keyword };
        return { status: 200, payload: { success: true, entry } };
      }
      if (req.method === "DELETE") {
        removeById(plan.entries, parts[3]);
        return { status: 200, payload: { success: true } };
      }
    }
    return { status: 404, payload: { success: false, message: "Plan route not found." } };
  }

  function routeKeywordResearch(req, url, parts, body, account, user) {
    if (req.method === "POST" && parts[1] === "onboarding-preview") {
      const previewSite = cleanSite(body.website || body.site || bodySiteFromPreview(url) || "sirbloggsalot.com");
      const previewSettings = {
        businessDescription: body.productDescription || body.description || "",
        competitors: Array.isArray(body.competitors) ? body.competitors : [],
        businessProfile: normalizedBusinessProfile(body.businessProfile || {}, {}),
      };
      return {
        status: 200,
        payload: {
          success: true,
          clusters: defaultClusters(previewSite, {}, previewSettings),
          meta: { market: "United States", businessType: "local" },
          mode: "local",
        },
      };
    }
    const kwSite = ensureSite(account, parts[1], user);
    if (req.method === "GET" && parts[2] === "clusters") {
      const clusters = clustersForSite(kwSite);
      return {
        status: 200,
        payload: {
          success: true,
          clusters,
          processing: false,
          mode: "local",
          market: { countryCode: "US", languageCode: "en", locationName: "United States" },
          hasResults: true,
          error: null,
          generatedAt: iso(),
          meta: {
            budgetExceeded: false,
            dfsCalls: 0,
            durationMs: 0,
            estimatedCost: 0,
            intentGrouping: { cosineMerges: 0, fallbackUsed: 0, mergedAway: 0, serpBudgetHit: false, serpChecks: 0, serpMerges: 0 },
            kdCeiling: 30,
            totalClusters: clusters.length,
            totalKeywords: clusters.reduce((sum, cluster) => sum + cluster.keywords.length, 0),
          },
          pass: "quick",
          status: "complete",
        },
      };
    }
    if (req.method === "GET" && parts[2] === "status") {
      return { status: 200, payload: { success: true, hasResults: true, processing: false, mode: "local", market: "United States", nextRunAllowedAt: null, deep: { status: "complete" } } };
    }
    if (req.method === "POST" && parts[2] === "kickoff") {
      const clusters = clustersForSite(kwSite);
      return { status: 200, payload: { success: true, status: "complete", clusters, quick: { clusters, mode: "local", market: "United States" }, deep: { status: "complete" }, hasResults: true } };
    }
    if (req.method === "GET" && parts[2] === "rankings") {
      return { status: 200, payload: { success: true, rows: rankingRows(kwSite), source: firstParam(url, "source", "local"), asOf: iso(), availableSources: ["local", "gsc"], stale: false, truncated: false } };
    }
    return { status: 404, payload: { success: false, message: "Keyword route not found." } };
  }

  function bodySiteFromPreview(url) {
    return url.searchParams.get("site") || url.searchParams.get("website");
  }

  function routeProducts(req, parts, body, account, user) {
    const prodSite = ensureSite(account, parts[1], user);
    if (req.method === "GET" && parts.length === 2) {
      const hasSyncSettings =
        Boolean(prodSite.productSync?.enabled) ||
        Boolean(prodSite.productSync?.lastSyncAt) ||
        Boolean(prodSite.productSync?.lastSyncedAt) ||
        Boolean(prodSite.productSync?.provider) ||
        Boolean(prodSite.dutchie?.locations?.length);
      const counts = prodSite.products.reduce((total, product) => {
        total.total += 1;
        if (product.status === "hidden") total.hidden += 1;
        else if (product.status === "archived") total.archived += 1;
        else total.active += 1;
        if (product.status === "active") total.visible += 1;
        return total;
      }, { active: 0, archived: 0, hidden: 0, total: 0, visible: 0 });
      return { status: 200, payload: { success: true, counts, products: prodSite.products, syncSettings: hasSyncSettings ? prodSite.productSync : null } };
    }
    if (req.method === "GET" && parts[2] === "sync" && parts[3] === "status") return { status: 200, payload: { success: true, syncSettings: prodSite.productSync } };
    if (req.method === "POST" && parts[2] === "sync") {
      const sync = syncDutchieProducts(prodSite);
      return { status: 200, payload: { success: true, message: "Product sync complete.", sync } };
    }
    if (req.method === "PUT" && parts[2] === "sync" && parts[3] === "settings") {
      prodSite.productSync = { ...prodSite.productSync, ...body, nextSyncAt: body.enabled ? prodSite.productSync?.nextSyncAt || iso(1) : null };
      return { status: 200, payload: { success: true, syncSettings: prodSite.productSync } };
    }
    if (req.method === "POST" && parts.length === 2) {
      const product = normalizeProductPayload({ _id: id("prod"), status: "active", source: "manual", createdAt: iso(), updatedAt: iso(), ...body });
      prodSite.products.unshift(product);
      return { status: 200, payload: { success: true, product } };
    }
    const product = prodSite.products.find((row) => row._id === parts[2]);
    if (req.method === "PUT" && product) {
      Object.assign(product, normalizeProductPayload({ ...product, ...body, _id: product._id, updatedAt: iso() }));
      return { status: 200, payload: { success: true, product } };
    }
    if (req.method === "DELETE" && parts[2]) {
      if (product) {
        product.status = "archived";
        product.archivedAt = iso();
        product.updatedAt = iso();
      }
      return { status: 200, payload: { success: true } };
    }
    if (req.method === "POST" && product && ["hide", "unhide"].includes(parts[3])) {
      product.status = parts[3] === "hide" ? "hidden" : "active";
      product.updatedAt = nextIso(product.updatedAt);
      return { status: 200, payload: { success: true, product } };
    }
    return { status: 404, payload: { success: false, message: "Product route not found." } };
  }

  function routePages(req, url, parts, body, account, user) {
    const pageSite = ensureSite(account, firstParam(url, "site") || body.site, user);
    const syncPrimaryProfile = () => {
      let primary = pageSite.profiles.find((row) => row.isPrimary);
      if (!primary && pageSite.profiles.length) {
        primary = pageSite.profiles[0];
        primary.isPrimary = true;
      }
      pageSite.settings.businessProfile = primary
        ? normalizedBusinessProfile(primary, { businessName: primary.businessName || primary.label || pageSite.site })
        : null;
      return primary;
    };
    if (req.method === "GET" && parts[1] === "business-profiles") return { status: 200, payload: { success: true, profiles: pageSite.profiles } };
    if (req.method === "POST" && parts[1] === "business-profile" && parts[2] === "detect") {
      return { status: 200, payload: { success: true, detected: { businessName: "Sir Bloggsalot", city: "Rancho Cucamonga", state: "CA", serviceArea: ["Rancho Cucamonga", "Upland", "Ontario"] } } };
    }
    if (req.method === "POST" && parts[1] === "business-profiles" && parts.length === 2) {
      const profile = { id: id("loc"), label: body.profile?.label || body.profile?.businessName || "Business location", isPrimary: pageSite.profiles.length === 0, ...(body.profile || {}) };
      pageSite.profiles.push(profile);
      if (profile.isPrimary) syncPrimaryProfile();
      return { status: 200, payload: { success: true, profile } };
    }
    if (["PUT", "DELETE", "POST"].includes(req.method) && parts[1] === "business-profiles" && parts[2]) {
      const profile = pageSite.profiles.find((row) => row.id === parts[2]);
      if (req.method === "PUT" && profile) {
        Object.assign(profile, body.profile || {}, { id: profile.id });
        if (profile.isPrimary) syncPrimaryProfile();
        return { status: 200, payload: { success: true, profile } };
      }
      if (req.method === "DELETE") {
        const removed = removeById(pageSite.profiles, parts[2]);
        if (removed?.isPrimary || !pageSite.profiles.some((row) => row.isPrimary)) syncPrimaryProfile();
        return { status: 200, payload: { success: true, profile: removed || null } };
      }
      if (req.method === "POST" && parts[3] === "primary") {
        if (!profile) return { status: 404, payload: { success: false, message: "Business profile not found." } };
        pageSite.profiles.forEach((row) => {
          row.isPrimary = row.id === parts[2];
        });
        const primary = syncPrimaryProfile();
        return { status: 200, payload: { success: true, profile: primary } };
      }
    }
    if (req.method === "GET" && parts[1] === "templates") {
      const pages = [
        { id: "template-home", title: "Service Area Template", slug: "service-area-template", url: `https://${pageSite.site}/service-area-template`, status: "publish" },
        { id: "template-location", title: "Location Page Template", slug: "location-template", url: `https://${pageSite.site}/location-template`, status: "draft" },
      ];
      return { status: 200, payload: { success: true, pages, pagination: { page: Number(firstParam(url, "page", "1")), total: pages.length, hasMore: false } } };
    }
    if (req.method === "POST" && parts[1] === "preview") {
      const previews = parseTargets(body.targets).map((target) => ({ ...target, title: `${target.name} ${body.titleSuffix || ""}`.trim(), collision: false, url: `https://${pageSite.site}/${target.slug}` }));
      return { status: 200, payload: { success: true, previews, templateMeta: { id: body.templatePageId, purpose: body.templatePurpose || "local" } } };
    }
    if (req.method === "GET" && parts[1] === "nearby-towns") {
      const towns = ["Upland", "Ontario", "Fontana", "Claremont", "Chino"];
      return { status: 200, payload: { success: true, towns, totalFound: towns.length, existingCount: 0, center: { label: firstParam(url, "city", "Rancho Cucamonga") } } };
    }
    if (req.method === "POST" && parts[1] === "generate") {
      const results = parseTargets(body.targets).map((target) => {
        const page = { id: id("page"), ...target, url: `https://${pageSite.site}/${target.slug}`, createdAt: iso() };
        pageSite.pages.push(page);
        return { success: true, name: target.name, slug: target.slug, url: page.url, pageId: page.id };
      });
      return { status: 200, payload: { success: true, results } };
    }
    if (req.method === "POST" && parts[1] === "preview-content") {
      const target = body.target || {};
      return { status: 200, payload: { success: true, title: `${target.name || "Preview"} ${body.titleSuffix || ""}`.trim(), slug: String(target.name || "preview").toLowerCase().replace(/[^a-z0-9]+/g, "-"), html: `<h1>${target.name || "Preview"}</h1><p>Local page preview for ${pageSite.site}.</p>`, metaDescription: `Preview page for ${pageSite.site}.` } };
    }
    return { status: 404, payload: { success: false, message: "Pages route not found." } };
  }

  function routeArticleBuilder(req, url, parts, body, account, user) {
    const draftSite = ensureSite(account, firstParam(url, "site") || body.site, user);
    if (req.method === "GET" && parts[1] === "drafts" && !parts[2]) return { status: 200, payload: { success: true, drafts: draftSite.drafts } };
    if (req.method === "POST" && parts[1] === "drafts") {
      const existing = body.draftId ? draftSite.drafts.find((draft) => draft.id === body.draftId || draft._id === body.draftId) : null;
      const draft = existing || { id: id("draft"), _id: null, createdAt: iso() };
      Object.assign(draft, body, { id: draft.id, _id: draft.id, status: "draft", updatedAt: iso(), title: body.titleData?.selectedTitle || body.defineData?.prompt || "Untitled draft" });
      if (!existing) draftSite.drafts.unshift(draft);
      return { status: 200, payload: { success: true, draft } };
    }
    if (req.method === "GET" && parts[1] === "drafts" && parts[2]) {
      const draft = draftSite.drafts.find((row) => row.id === parts[2] || row._id === parts[2]);
      return draft ? { status: 200, payload: { success: true, draft } } : { status: 404, payload: { success: false, message: "Draft not found." } };
    }
    if (req.method === "DELETE" && parts[1] === "drafts" && parts[2]) {
      removeById(draftSite.drafts, parts[2]);
      return { status: 200, payload: { success: true } };
    }
    if (req.method === "PATCH" && parts[1] === "drafts" && parts[3] === "publish") {
      const draft = draftSite.drafts.find((row) => row.id === parts[2] || row._id === parts[2]);
      if (body.publishedArticleId) {
        const blog = draftSite.blogs.find((row) => row.id === body.publishedArticleId || row._id === body.publishedArticleId);
        if (!blog) return { status: 404, payload: { success: false, message: "Published article not found." } };
        blog.blogStatus = body.status || blog.blogStatus || "draft";
        blog.createdWith = blog.createdWith || "article-builder";
        if (draft) {
          draft.status = "published";
          draft.publishedArticleId = blog.id || blog._id;
          draft.publishedAt = iso();
          draft.updatedAt = draft.publishedAt;
        }
        return { status: 200, payload: { success: true, blog, draft } };
      }
      const articleInput = draft?.articleData?.article;
      const blogId = id("blog");
      const blog = {
        id: blogId,
        _id: blogId,
        title: draft?.title || articleInput?.title || "Published article",
        blogStatus: "published",
        createdWith: "article-builder",
        publishDate: iso(),
        blogContent: articleHtmlFrom(articleInput),
        articleSummary: draft?.defineData?.prompt || "",
      };
      if (draft) {
        draft.status = "published";
        draft.publishedArticleId = blog.id;
        draft.publishedAt = iso();
        draft.updatedAt = draft.publishedAt;
      }
      draftSite.blogs.unshift(blog);
      return { status: 200, payload: { success: true, blog, draft } };
    }
    if (req.method === "GET" && parts[1] === "published-articles") return { status: 200, payload: { success: true, blogs: draftSite.blogs.filter((blog) => blog.createdWith === "article-builder" || blog.blogStatus === "published") } };
    return { status: 404, payload: { success: false, message: "Article route not found." } };
  }

  function routeSeo(req, parts, account, user) {
    const seoSite = ensureSite(account, parts[2] || Object.keys(account.sites)[0], user);
    if (req.method === "GET" && parts[1] === "keywords") return { status: 200, payload: { success: true, keywords: seoSite.settings.keywords || [], rows: rankingRows(seoSite) } };
    if (req.method === "GET" && parts[1] === "status") return { status: 200, payload: { success: true, hasPro: true, hasPremium: true, hasData: false, canScan: true, hoursRemaining: 0, lastScanned: seoSite.seoLastScanned, nextScanAvailable: null } };
    if (req.method === "GET" && parts[1] === "snapshot") return { status: 200, payload: { success: true, snapshot: currentSnapshot(seoSite) } };
    if (req.method === "POST" && parts[1] === "scan") {
      seoSite.seoLastScanned = iso();
      return { status: 200, payload: { success: true, snapshot: currentSnapshot(seoSite) } };
    }
    if (req.method === "GET" && parts[1] === "saved-keywords") return { status: 200, payload: { success: true, keywords: seoSite.settings.keywords || [] } };
    return { status: 404, payload: { success: false, message: "SEO route not found." } };
  }

  function routeAiMentions(req, parts, account, user) {
    const aiSite = ensureSite(account, parts[1], user);
    const snapshot = aiSnapshot(aiSite);
    if (req.method === "GET" && parts.length === 2) return { status: 403, payload: { success: false, error: "AI Mentions requires Pro+.", needsUpgrade: true } };
    if (req.method === "GET" && parts[2] === "history") return { status: 403, payload: { success: false, error: "AI Mentions requires Pro+.", needsUpgrade: true } };
    if (req.method === "POST" && parts[2] === "refresh") {
      aiSite.aiMentionsHistory.push({ date: iso().slice(0, 10), totalMentions: snapshot.metrics.totalMentions });
      return { status: 200, payload: { success: true, snapshot } };
    }
    return { status: 404, payload: { success: false, message: "AI mentions route not found." } };
  }

  function routeUpdates(req, parts, body, account, user) {
    const updateSite = ensureSite(account, parts[1], user);
    if (req.method === "GET" && parts.length === 2) return { status: 200, payload: { success: true, updates: updateSite.updates } };
    if (req.method === "POST" && parts[2] === "refresh") return { status: 200, payload: { success: true, updates: updateSite.updates } };
    if (["POST", "PATCH"].includes(req.method) && parts[2]) return { status: 200, payload: { success: true } };
    return { status: 404, payload: { success: false, message: "Updates route not found." } };
  }

  function routeWebhooks(req, url, parts, body, account, user) {
    const explicitSite = body.site || firstParam(url, "site");
    const hookSite = parts[1] && !explicitSite
      ? siteWithWebhook(account, parts[1]) || ensureSite(account, explicitSite, user)
      : ensureSite(account, explicitSite, user);
    if (req.method === "GET" && parts.length === 1) return { status: 200, payload: { success: true, webhooks: hookSite.webhooks } };
    if (req.method === "POST" && parts.length === 1) {
      const webhook = { id: id("wh"), signingToken: crypto.randomBytes(16).toString("hex"), isActive: true, isExpired: false, createdAt: iso(), ...body };
      hookSite.webhooks.push(webhook);
      return { status: 200, payload: { success: true, webhook } };
    }
    const webhook = hookSite.webhooks.find((row) => row.id === parts[1]);
    if (req.method === "PUT" && webhook) {
      Object.assign(webhook, body, { id: webhook.id });
      return { status: 200, payload: { success: true, webhook } };
    }
    if (req.method === "DELETE" && parts[1]) {
      removeById(hookSite.webhooks, parts[1]);
      return { status: 200, payload: { success: true } };
    }
    if (req.method === "POST" && webhook && parts[2] === "regenerate-token") {
      webhook.signingToken = crypto.randomBytes(16).toString("hex");
      return { status: 200, payload: { success: true, webhook } };
    }
    if (req.method === "POST" && webhook && parts[2] === "test") {
      webhook.lastTestStatus = 200;
      webhook.lastTest = { event: body.event || "blog.created", success: true, statusCode: 200, testedAt: iso() };
      return { status: 200, payload: { success: true, status: 200, statusCode: 200, message: "Test event accepted." } };
    }
    return { status: 404, payload: { success: false, message: "Webhook route not found." } };
  }

  function routeDutchie(req, parts, body, account, user) {
    const dutchieSite = ensureSite(account, parts[1], user);
    dutchieSite.dutchie.locations = (dutchieSite.dutchie.locations || []).map(normalizeDutchieLocation);
    if (req.method === "GET" && parts[2] === "status") {
      const hasLocations = dutchieSite.dutchie.locations.length > 0;
      return {
        status: 200,
        payload: {
          success: true,
          dutchie: hasLocations
            ? {
                ...dutchieSite.dutchie,
                enabled: true,
                locations: dutchieSite.dutchie.locations,
              }
            : { enabled: false, locations: [] },
        },
      };
    }
    if (req.method === "POST" && parts[2] === "connect") {
      const location = normalizeDutchieLocation({ label: body.label || "Dutchie location", connectedAt: iso(), menuEmpty: false });
      dutchieSite.dutchie.locations.push(location);
      const sync = syncDutchieProducts(dutchieSite);
      return { status: 200, payload: { success: true, message: "Dutchie connected.", dutchie: dutchieSite.dutchie, sync, menuEmpty: false } };
    }
    if (req.method === "DELETE" && parts[2] === "locations" && parts[3]) {
      dutchieSite.dutchie.locations = dutchieSite.dutchie.locations.filter((row) => row.id !== parts[3] && row.ref !== parts[3]);
      for (const product of dutchieSite.products) {
        if (product.source === "dutchie" && product.dutchieLocationId === parts[3]) {
          product.status = "archived";
          product.updatedAt = iso();
        }
      }
      syncDutchieProducts(dutchieSite);
      return { status: 200, payload: { success: true } };
    }
    if (req.method === "POST" && parts[2] === "sync") {
      const sync = syncDutchieProducts(dutchieSite);
      return { status: 200, payload: { success: true, ...sync } };
    }
    return { status: 404, payload: { success: false, message: "Dutchie route not found." } };
  }

  function routePartner(req, parts, body, account, user) {
    if (parts[1] !== "me") return { status: 404, payload: { success: false, message: "Partner route not found." } };
    if (req.method === "GET" && parts.length === 2) return { status: 403, payload: { success: false, message: "Partner owner access required." } };
    if (user.role !== "admin") return { status: 403, payload: { success: false, message: "Partner owner access required." } };
    if (req.method === "PUT" && parts.length === 2) {
      account.partner = { ...account.partner, name: body.name || account.partner.name, supportEmail: body.supportEmail || account.partner.supportEmail };
      return { status: 200, payload: { success: true, partner: account.partner } };
    }
    if (req.method === "GET" && parts[2] === "customers") return { status: 200, payload: { success: true, customers: siteList(account) } };
    if (req.method === "GET" && parts[2] === "domain" && parts[3] === "status") return { status: 200, payload: { success: true, dns: { status: account.partner.domain ? "pending" : "not_connected", records: [] }, automaticCertificates: true } };
    if (req.method === "POST" && parts[2] === "logo") {
      account.partner.logoUrl = "/images/og-preview.png";
      return { status: 200, payload: { success: true, partner: account.partner } };
    }
    if (req.method === "POST" && parts[2] === "domain") {
      account.partner.domain = cleanSite(body.domain);
      return { status: 200, payload: { success: true, partner: account.partner, dns: { status: "pending", records: [{ type: "CNAME", name: account.partner.domain, value: "app.blawgy.com" }] }, automaticCertificates: true } };
    }
    if (req.method === "DELETE" && parts[2] === "domain") {
      account.partner.domain = "";
      return { status: 200, payload: { success: true, partner: account.partner } };
    }
    if (req.method === "POST" && parts[2] === "impersonate") return { status: 200, payload: { success: true, customToken: "local-impersonation-disabled", email: body.email } };
    return { status: 404, payload: { success: false, message: "Partner route not found." } };
  }

  async function routePublicApi(req, res, url) {
    const parts = splitPath(url);
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "sample" && parts[2] && parts[3]) {
      sendJson(res, 200, {
        success: true,
        title: `${titleFromKeyword(parts[3].replace(/-/g, " "))}`,
        content: `<p>Sample article preview for ${parts[2]}.</p>`,
        metaDescription: `Sample article for ${parts[2]}.`,
      });
      return true;
    }
    return false;
  }

  // ===========================================================================
  // Real provider integration (Phase 1 core loop): onboarding scrape, LLM
  // onboarding intelligence, DataForSEO keyword research, and LLM article
  // generation. Each handler returns `false` to fall through to the placeholder
  // handler when its provider is unavailable or a call fails.
  // ===========================================================================

  function providerLog(route, error) {
    try {
      console.warn(`[providers] ${route} -> placeholder: ${error && error.message ? error.message : error}`);
    } catch (_) { /* ignore */ }
  }

  async function readAccountSnapshot(user) {
    const store = await readStore();
    const key = accountKey(user);
    return store.users[key] || defaultUserState(user);
  }

  function providerSiteContext(site) {
    const settings = (site && site.settings) || {};
    const profile = settings.businessProfile || {};
    return {
      site: site && site.site,
      product: settings.product || "",
      description: settings.businessDescription || "",
      audience: settings.targetAudience || settings.audience || "",
      tone: settings.tone || "",
      keywords: Array.isArray(settings.keywords) ? settings.keywords : [],
      city: profile.city || "",
    };
  }

  function seedTermsFor(site) {
    const ctx = providerSiteContext(site);
    const seeds = [];
    const base = cleanSite(site && site.site).split(".")[0].replace(/[^a-z0-9]+/gi, " ").trim();
    if (base) seeds.push(base);
    for (const keyword of ctx.keywords) {
      const kw = typeof keyword === "string" ? keyword : keyword && keyword.kw;
      if (kw) seeds.push(kw);
    }
    if (ctx.description) {
      const service = serviceKeywordFromDescription(ctx.description);
      if (service) seeds.push(service);
    }
    return Array.from(new Set(seeds.map((s) => String(s).trim()).filter(Boolean))).slice(0, 8);
  }

  // Adapt provider clusters to the rich compat cluster shape (see defaultClusters).
  function adaptProviderClusters(clusters) {
    return (Array.isArray(clusters) ? clusters : []).map((cluster) => {
      const keywords = (cluster.keywords || []).map((keyword, index) => ({
        covered: Boolean(keyword.covered),
        cpc: 0,
        intent: keyword.intent || "Informational",
        kd: Number(keyword.kd) || 0,
        kw: keyword.kw,
        relevance: 1,
        score: Number(keyword.volume) || 0,
        secondaryKeywords: [],
        source: "keyword_research",
        theirPosition: index === 0 ? null : 12,
        volume: Number(keyword.volume) || 0,
      }));
      const totalVolume = keywords.reduce((sum, row) => sum + (row.volume || 0), 0);
      return {
        label: cluster.label,
        pillarKeyword: cluster.pillarKeyword,
        keywords,
        addableCount: keywords.length,
        covered: false,
        coveredBy: [],
        keywordCount: keywords.length,
        locationId: null,
        locationLabel: null,
        score: totalVolume,
        totalVolume,
      };
    });
  }

  async function providerClustersFor(site) {
    if (!activeProviders.keywords) return null;
    const seedTerms = seedTermsFor(site);
    if (!seedTerms.length) return null;
    const { clusters, meta } = await activeProviders.keywords.research({
      site: site && site.site,
      seedTerms,
      market: "United States",
    });
    const adapted = adaptProviderClusters(clusters);
    if (!adapted.length) return null;
    return { clusters: adapted, meta };
  }

  // Prefer a fresh real DataForSEO cache; otherwise fall back to the deterministic
  // placeholder clusters. Used by the keyword and plan read handlers.
  function clustersForSite(site) {
    const cache = site && site.keywordResearch;
    if (cache && Array.isArray(cache.clusters) && cache.clusters.length) return cache.clusters;
    return defaultClusters(site.site, (site.plan && site.plan.config) || {}, site.settings || {});
  }

  function isKeywordCacheFresh(site) {
    const cache = site && site.keywordResearch;
    if (!cache || !Array.isArray(cache.clusters) || !cache.clusters.length || !cache.generatedAt) return false;
    const ts = Date.parse(cache.generatedAt);
    return Number.isFinite(ts) && Date.now() - ts < 24 * 60 * 60 * 1000;
  }

  // --- async article generation worker (backs PUT /generate-blog/:id) ---------
  const articleJobQueue = [];
  const articleJobsInFlight = new Set();
  const MAX_ARTICLE_QUEUE = 100;
  let articleJobRunning = false;

  function articleJobKey(job) {
    return `${(job.user && job.user.id) || ""}::${job.siteName}::${job.entryId}`;
  }

  // Returns false when the job was NOT enqueued (already in flight for this entry,
  // or the queue is at capacity) so callers don't double-spend on codex.
  function enqueueArticleJob(job) {
    const key = articleJobKey(job);
    if (articleJobsInFlight.has(key)) return false;
    if (articleJobQueue.length >= MAX_ARTICLE_QUEUE) return false;
    articleJobsInFlight.add(key);
    articleJobQueue.push(job);
    void runArticleJobs();
    return true;
  }

  async function runArticleJobs() {
    if (articleJobRunning) return;
    articleJobRunning = true;
    try {
      while (articleJobQueue.length) {
        const job = articleJobQueue.shift();
        try {
          await runArticleJob(job);
        } catch (error) {
          await failArticleJob(job, error);
        } finally {
          articleJobsInFlight.delete(articleJobKey(job));
        }
      }
    } finally {
      articleJobRunning = false;
    }
  }

  async function runArticleJob({ user, siteName, entryId }) {
    const snapshot = await readAccountSnapshot(user);
    const snapSite = snapshot.sites && snapshot.sites[cleanSite(siteName)];
    const snapEntry = snapSite ? findEntry(snapSite, entryId) : null;
    if (!snapEntry) return;

    const keyword = snapEntry.keyword || snapEntry.targetKeyword || snapEntry.title;
    const context = providerSiteContext(snapSite);
    const outline = await activeProviders.llm.articleOutline({ title: snapEntry.title, keyword, siteContext: context });
    const article = await activeProviders.llm.fullArticle({ title: snapEntry.title, outline, keyword, siteContext: context });
    const html = (article.sections || [])
      .map((section) => `${section.title ? `<h2>${section.title}</h2>` : ""}${section.content || ""}`)
      .join("\n")
      .trim();
    if (!html) throw new Error("LLM produced no article content.");

    await withAccount(user, (account) => {
      const site = account.sites && account.sites[cleanSite(siteName)];
      const entry = site ? findEntry(site, entryId) : null;
      if (!entry) return null;
      entry.blogContent = html;
      entry.articleSummary = article.metaDescription || entry.articleSummary || "";
      entry.hasContent = true;
      entry.blogStatus = "published";
      entry.status = "published";
      entry.published = true;
      entry.updatedAt = iso();
      return null;
    });
  }

  async function failArticleJob(job, error) {
    providerLog("/generate-blog worker", error);
    try {
      await withAccount(job.user, (account) => {
        const site = account.sites && account.sites[cleanSite(job.siteName)];
        const entry = site ? findEntry(site, job.entryId) : null;
        if (!entry) return null;
        entry.blogStatus = "failed";
        entry.status = "failed";
        entry.generationError = String((error && error.message) || error).slice(0, 200);
        entry.updatedAt = iso();
        return null;
      });
    } catch (_) { /* ignore */ }
  }

  // --- provider route handlers ------------------------------------------------

  async function handleScrapeRoute(req, res, url, streaming) {
    if (!activeProviders.scrape) return false;
    const website = firstParam(url, "website") || firstParam(url, "site") || firstParam(url, "url");
    if (!website) return false;

    let scraped;
    try {
      scraped = await activeProviders.scrape.fetchSite(website);
    } catch (error) {
      providerLog(url.pathname, error);
      return false; // fall through to the placeholder description
    }

    let productDescription = "";
    if (activeProviders.llm) {
      try {
        productDescription = await activeProviders.llm.businessDescription({ url: scraped.finalUrl, siteText: scraped.text });
      } catch (error) {
        providerLog(`${url.pathname} (llm)`, error);
      }
    }
    if (!productDescription) productDescription = String(scraped.text || "").slice(0, 280).trim();
    if (!productDescription) return false;

    const faviconUrl = scraped.faviconUrl || "/favicon.svg";
    if (streaming) {
      sendStream(res, [
        { event: "progress", data: { step: "reading_homepage", website } },
        { event: "progress", data: { step: "learning_products", website } },
        { event: "result", data: { success: true, productDescription, faviconUrl } },
      ]);
    } else {
      sendJson(res, 200, { success: true, productDescription, faviconUrl });
    }
    return true;
  }

  async function handleOnboardingIntel(req, res, url, user, kind) {
    if (!activeProviders.llm) return false;
    const body = await bodyFor(req);
    const website = body.site || body.website || firstParam(url, "site");
    let siteText = body.productDescription || body.description || body.text || "";
    if (!siteText && website) {
      try {
        const snapshot = await readAccountSnapshot(user);
        const site = snapshot.sites && snapshot.sites[cleanSite(website)];
        siteText = (site && site.settings && site.settings.businessDescription) || "";
      } catch (_) { /* ignore */ }
    }

    try {
      if (kind === "competitors") {
        const { competitors } = await activeProviders.llm.researchCompetitors({ url: website, siteText });
        if (!competitors.length) return false;
        sendJson(res, 200, { success: true, competitors });
        return true;
      }
      if (kind === "detect-type") {
        const detected = await activeProviders.llm.detectBusinessType({ url: website, siteText });
        const marketName = (detected.market && (detected.market.locationName || detected.market)) || "United States";
        sendJson(res, 200, { success: true, businessType: detected.businessType, market: marketName, locations: detected.locations });
        return true;
      }
      if (kind === "suggestions") {
        const suggestions = await activeProviders.llm.onboardingSuggestions({ siteText });
        if (!suggestions.audienceSuggestions.length && !suggestions.toneSuggestions.length) return false;
        sendJson(res, 200, { success: true, audienceSuggestions: suggestions.audienceSuggestions, toneSuggestions: suggestions.toneSuggestions });
        return true;
      }
    } catch (error) {
      providerLog(url.pathname, error);
      return false;
    }
    return false;
  }

  async function handleKeywordResearch(req, res, url, user) {
    if (!activeProviders.keywords) return false;
    const parts = splitPath(url); // ['api','keyword-research', seg2, seg3?]
    const seg2 = parts[2] || "";
    const seg3 = parts[3] || "";

    // POST /api/keyword-research/onboarding-preview
    if (req.method === "POST" && seg2 === "onboarding-preview") {
      const body = await bodyFor(req);
      const previewSite = {
        site: cleanSite(body.website || body.site || "sirbloggsalot.com"),
        settings: { businessDescription: body.productDescription || body.description || "", keywords: [] },
        plan: { config: {} },
      };
      let result;
      try {
        result = await providerClustersFor(previewSite);
      } catch (error) {
        providerLog(url.pathname, error);
        return false;
      }
      if (!result) return false;
      sendJson(res, 200, {
        success: true,
        clusters: result.clusters,
        meta: { market: result.meta.market, businessType: "local", dfsCalls: result.meta.dfsCalls, estimatedCost: result.meta.estimatedCost },
        mode: "dataforseo",
      });
      return true;
    }

    // GET /api/keyword-research/:site/clusters or POST /api/keyword-research/:site/kickoff
    // Populate the real cache (outside the store lock) then fall through so the
    // existing placeholder handler renders the response from clustersForSite().
    if ((req.method === "GET" && seg3 === "clusters") || (req.method === "POST" && seg3 === "kickoff")) {
      const siteName = cleanSite(seg2);
      const snapshot = await readAccountSnapshot(user);
      const site = (snapshot.sites && snapshot.sites[siteName]) || { site: siteName, settings: {}, plan: { config: {} } };
      if (isKeywordCacheFresh(site)) return false;
      let result;
      try {
        result = await providerClustersFor(site);
      } catch (error) {
        providerLog(url.pathname, error);
        return false;
      }
      if (!result) return false;
      try {
        await withAccount(user, (account) => {
          const target = ensureSite(account, siteName, user);
          target.keywordResearch = { clusters: result.clusters, market: result.meta.market, generatedAt: iso(), provider: "dataforseo", meta: result.meta };
          return null;
        });
      } catch (error) {
        providerLog(`${url.pathname} (cache)`, error);
      }
      return false; // placeholder now serves the real cached clusters
    }

    return false;
  }

  async function handleArticleGen(req, res, url, user, pathName) {
    if (!activeProviders.llm) return false;
    const body = await bodyFor(req);
    const siteName = cleanSite(body.site || firstParam(url, "site") || "");
    let context = {};
    try {
      const snapshot = await readAccountSnapshot(user);
      const site = snapshot.sites && snapshot.sites[siteName];
      if (site) context = providerSiteContext(site);
    } catch (_) { /* ignore */ }
    const keyword = body.keyword || body.targetKeyword || body.topic || body.title || "";

    try {
      if (pathName === "/generate-article-titles") {
        const titles = await activeProviders.llm.articleTitles({ keyword, siteContext: context });
        if (!titles.length) return false;
        sendJson(res, 200, { success: true, titles });
        return true;
      }
      if (pathName === "/generate-article-outline" || pathName === "/regenerate-article-outline") {
        const outline = await activeProviders.llm.articleOutline({ title: body.title || "", keyword, siteContext: context });
        if (!outline.sections.length) return false;
        sendJson(res, 200, { success: true, outline, imageAssignments: [] });
        return true;
      }
      if (pathName === "/generate-full-article") {
        const article = await activeProviders.llm.fullArticle({ title: body.title || "", outline: body.outline, keyword, siteContext: context });
        if (!article.sections.length) return false;
        sendJson(res, 200, { success: true, article });
        return true;
      }
      if (pathName === "/regenerate-article-section") {
        const content = await activeProviders.llm.articleSection({
          sectionTitle: body.title || body.sectionTitle || "Section",
          articleTitle: body.articleTitle || "",
          siteContext: context,
        });
        sendJson(res, 200, { success: true, section: { id: body.sectionId || id("section"), title: body.title || "Updated section", content } });
        return true;
      }
    } catch (error) {
      providerLog(pathName, error);
      return false;
    }
    return false;
  }

  async function handleGenerateBlog(req, res, url, user) {
    if (!activeProviders.llm) return false; // placeholder keeps its in_queue behavior
    const entryId = decodeURIComponent(url.pathname.slice("/generate-blog/".length));
    const body = await bodyFor(req);
    const siteName = cleanSite(body.site || body.siteDomain || firstParam(url, "site") || "");

    let found = false;
    let alreadyActive = false;
    try {
      await withAccount(user, (account) => {
        const site = ensureSite(account, siteName, user);
        const entry = findEntry(site, entryId);
        if (!entry) return null;
        found = true;
        if (entry.blogStatus === "in_queue" || entry.blogStatus === "generating" || entry.status === "generating") {
          alreadyActive = true; // idempotent: a repeated PUT for an in-flight entry doesn't re-queue
          return null;
        }
        entry.blogStatus = "in_queue";
        entry.status = "generating";
        entry.updatedAt = iso();
        return null;
      });
    } catch (error) {
      providerLog(url.pathname, error);
      return false;
    }
    if (!found) return false; // let the placeholder 404 handle unknown entries

    if (!alreadyActive) enqueueArticleJob({ user, siteName, entryId });
    sendJson(res, 200, { success: true, blogStatus: "in_queue" });
    return true;
  }

  // On startup, article entries persisted as in-flight (in_queue/generating) but
  // whose in-memory worker was lost to a restart would spin forever. Mark them
  // failed so the UI can offer a retry. Only writes when something is actually stuck.
  async function reconcileStuckArticles() {
    try {
      const store = await readStore();
      let hasStuck = false;
      for (const account of Object.values(store.users || {})) {
        for (const site of Object.values((account && account.sites) || {})) {
          for (const entry of ((site && site.plan && site.plan.entries) || [])) {
            if ((entry.blogStatus === "in_queue" || entry.blogStatus === "generating" || entry.status === "generating") && !entry.blogContent) {
              hasStuck = true;
            }
          }
        }
      }
      if (!hasStuck) return;
      await mutateStore((s) => {
        for (const account of Object.values(s.users || {})) {
          for (const site of Object.values((account && account.sites) || {})) {
            for (const entry of ((site && site.plan && site.plan.entries) || [])) {
              if ((entry.blogStatus === "in_queue" || entry.blogStatus === "generating" || entry.status === "generating") && !entry.blogContent) {
                entry.blogStatus = "failed";
                entry.status = "failed";
                entry.generationError = "Generation was interrupted by a restart. Retry to regenerate.";
                entry.updatedAt = iso();
              }
            }
          }
        }
        return null;
      });
    } catch (error) {
      providerLog("startup reconcile", error);
    }
  }

  async function serveProviderRoute(req, res, url, user) {
    const pathName = url.pathname;
    const method = req.method;
    try {
      if (method === "GET" && pathName === "/scrape-site") return await handleScrapeRoute(req, res, url, false);
      if (method === "GET" && pathName === "/scrape-site/stream") return await handleScrapeRoute(req, res, url, true);
      if (method === "POST" && pathName === "/research-competitors") return await handleOnboardingIntel(req, res, url, user, "competitors");
      if (method === "POST" && pathName === "/detect-business-type") return await handleOnboardingIntel(req, res, url, user, "detect-type");
      if (method === "POST" && pathName === "/onboarding-suggestions") return await handleOnboardingIntel(req, res, url, user, "suggestions");
      if (pathName.startsWith("/api/keyword-research/")) return await handleKeywordResearch(req, res, url, user);
      if (
        method === "POST" &&
        ["/generate-article-titles", "/generate-article-outline", "/regenerate-article-outline", "/generate-full-article", "/regenerate-article-section"].includes(pathName)
      ) {
        return await handleArticleGen(req, res, url, user, pathName);
      }
      if (method === "PUT" && pathName.startsWith("/generate-blog/")) return await handleGenerateBlog(req, res, url, user);
      return false;
    } catch (error) {
      providerLog(pathName, error);
      return false;
    }
  }

  async function serve(req, res, url) {
    const knownPublic = await routePublicApi(req, res, url);
    if (knownPublic) return true;

    const publicApiPaths = [
      "/api/branding",
      "/api/login/track-login",
      "/api/assistant/chat",
      // NOTE: /scrape-site/stream requires an authenticated session — it performs a
      // server-side crawl and (when the LLM is configured) spawns a codex process,
      // so it must not be an open, unauthenticated crawl/spawn proxy. The SPA sends
      // the session cookie during onboarding.
    ];

    const apiPaths = [
      ...publicApiPaths,
      "/api/save-keywords",
    ];

    const knownStarts = [
      "/api/plan/",
      "/api/keyword-research/",
      "/api/products/",
      "/api/pages/",
      "/api/article-builder/",
      "/api/seo/",
      "/api/ai-mentions/",
      "/api/updates/",
      "/api/webhooks",
      "/api/dutchie/",
      "/api/partner/",
      "/api/tour/",
      "/api/assistant/",
    ];

    const rootPaths = new Set([
      "/me",
      "/get-user-details",
      "/get-site-settings",
      "/update-site-settings",
      "/all-blog-posts",
      "/blog-content",
      "/test-connection",
      "/invite-user",
      "/research-competitors",
      "/generate-image",
      "/generate-contextual-image",
      "/accept-invite",
      "/signup",
      "/comp-links/validate",
      "/comp-links/redeem",
      "/connect-site",
      "/scrape-site",
      "/scrape-site/stream",
      "/onboarding-suggestions",
      "/detect-business-type",
      "/onboarding/classify-input",
      "/onboarding/complete",
      "/get-plans",
      "/subscription-details",
      "/checkout-session",
      "/customer-portal",
      "/generate-retention-message",
      "/cancel-subscription",
      "/switch-plan",
      "/generate-description",
      "/fetch-sitemap",
      "/shopify/blogs",
      "/wix/details",
      "/framer/collections",
      "/webflow/fields",
      "/fetch-youtube-channel",
      "/generate-article-titles",
      "/generate-article-outline",
      "/regenerate-article-outline",
      "/generate-full-article",
      "/generate-featured-image",
      "/upload-file",
      "/upload-image",
      "/analyze-screenshots",
      "/save-article",
      "/regenerate-article-section",
      "/generate-premises",
      "/generate-bulk-articles",
      "/save-post",
      "/update-publish-date",
      "/republish-article",
      "/publish-draft",
      "/bulk-delete-premises",
      "/cancel-blog-posting",
      "/gsc/data",
      "/site-settings",
      "/gsc/connect",
      "/gsc/disconnect",
    ]);

    const rootStarts = [
      "/admin/",
      "/gsc/sites/",
      "/sites/",
      "/generate-blog/",
      "/hormozi/api/",
    ];

    const isClientOnlyGet = req.method === "GET" && url.pathname === "/signup";
    const shouldHandle =
      apiPaths.includes(url.pathname) ||
      knownStarts.some((prefix) => url.pathname === prefix.slice(0, -1) || url.pathname.startsWith(prefix)) ||
      (rootPaths.has(url.pathname) && !isClientOnlyGet) ||
      rootStarts.some((prefix) => url.pathname.startsWith(prefix));

    if (!shouldHandle) return false;

    const publicNoAuth = publicApiPaths.includes(url.pathname) || url.pathname.startsWith("/hormozi/api/");
    const user = publicNoAuth ? { id: "public", email: "public@example.com", role: "client", name: "Public", picture: "" } : await requireUser(req, res);
    if (!user) return true;

    // Try the real external providers first (site crawl / LLM / DataForSEO). This
    // runs OUTSIDE the store-write lock and returns false to fall through to the
    // deterministic placeholder handlers whenever a provider is unavailable or a
    // call fails, so the app degrades gracefully and always responds.
    if (await serveProviderRoute(req, res, url, user)) return true;

    if (url.pathname.startsWith("/api/")) return routeApi(req, res, url, user);
    return routeAccount(req, res, url, user);
  }

  void reconcileStuckArticles();

  return { serve };
}

module.exports = { createBlawgyCompat };
