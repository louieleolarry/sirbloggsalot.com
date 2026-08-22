const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sba-public-routes-"));
process.env.SIR_BLOGGS_ACCOUNT_STORE_PATH = path.join(tempDir, "account-store.json");
process.env.SIR_BLOGGS_AUTH_STORE_PATH = path.join(tempDir, "auth-store.json");
process.env.SIR_BLOGGS_AUTH_SESSION_SECRET = "public-route-smoke-secret";

const { createServer } = require("../server");
const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const linkedCaseStudyRoutes = Array.from(
  new Set([...indexHtml.matchAll(/href="(\/case-studies\/[^"]+)"/g)].map((match) => match[1]))
).sort();

const now = new Date();
const signedInUser = {
  id: "google:public-route-smoke",
  email: "route-smoke@example.com",
  name: "Route Smoke",
  picture: "",
  role: "client",
};
const signedInSessionId = "session-public-route-smoke";
const signedInSignature = crypto.createHmac("sha256", process.env.SIR_BLOGGS_AUTH_SESSION_SECRET).update(signedInSessionId).digest("base64url");
const signedInCookie = `sirbloggs_session=${encodeURIComponent(`${signedInSessionId}.${signedInSignature}`)}`;

fs.writeFileSync(
  process.env.SIR_BLOGGS_AUTH_STORE_PATH,
  `${JSON.stringify(
    {
      users: { [signedInUser.id]: signedInUser },
      sessions: {
        [signedInSessionId]: {
          id: signedInSessionId,
          userId: signedInUser.id,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 600000).toISOString(),
        },
      },
    },
    null,
    2
  )}\n`
);

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function fetchRoute(baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual", ...options });
  const contentType = response.headers.get("content-type") || "";
  const location = response.headers.get("location") || "";
  const body = options.method === "HEAD" ? "" : await response.text();
  return { response, contentType, location, body };
}

(async () => {
  const server = createServer();
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const shellRoutes = ["/", "/features", "/pricing", "/affiliate", "/changelog", "/case-studies", "/privacy", "/terms", "/signup", "/login", "/success?planId=price_local&amount=79&session_id=local", ...linkedCaseStudyRoutes];
    for (const route of shellRoutes) {
      const { response, contentType, body } = await fetchRoute(baseUrl, route);
      assert.strictEqual(response.status, 200, `${route} should return 200`);
      assert.ok(contentType.includes("text/html"), `${route} should return HTML`);
      assert.ok(body.includes("Sir Bloggsalot"), `${route} should render the app shell`);
    }

    const anonymousHome = await fetchRoute(baseUrl, "/");
    assert.ok(anonymousHome.body.includes("Get recommended in ChatGPT, Google AI, Claude, Perplexity &amp; Gemini"));
    assert.ok(anonymousHome.body.includes("<span>Be the brand</span>"));
    assert.ok(anonymousHome.body.includes('<span class="gradient-text">AI recommends.</span>'));
    assert.ok(anonymousHome.body.includes("AI builds its answers from indexed articles, so Sir Bloggsalot publishes them for your site daily"));
    assert.ok(anonymousHome.body.includes("structured the way AI cites, and tracks when AI mentions your business."));
    assert.ok(!anonymousHome.body.includes("AI SEO content built around your brand"));
    assert.ok(!anonymousHome.body.includes("<span>SEO content built</span>"));

    const signup = await fetchRoute(baseUrl, "/signup");
    assert.ok(signup.body.includes("Start Pro trial"));
    assert.ok(signup.body.includes("Start Pro+ trial"));
    assert.ok(!signup.body.includes("Plan selection and onboarding can attach to the authenticated account next."));

    const checkoutSuccess = await fetchRoute(baseUrl, "/success?planId=price_local&amount=79&session_id=local");
    assert.strictEqual(checkoutSuccess.response.status, 200);
    assert.ok(checkoutSuccess.body.includes('data-route-page="success"'));
    assert.ok(checkoutSuccess.body.includes("Your free trial has started"));
    assert.ok(checkoutSuccess.body.includes("You're all set"));
    assert.ok(checkoutSuccess.body.includes("Your content plan is being built in the background, usually within 10 minutes."));
    assert.ok(checkoutSuccess.body.includes("Your plan is still being built, usually within 10 minutes."));
    assert.ok(checkoutSuccess.body.includes("Open your content plan"));
    assert.ok(checkoutSuccess.body.includes("connect your website platform (about 2 minutes)"));
    assert.ok(checkoutSuccess.body.includes('href="/account?view=plan" data-success-content-plan'));

    const checkoutPreparing = await fetchRoute(baseUrl, "/success?state=preparing&planId=price_local&amount=79&session_id=local");
    assert.strictEqual(checkoutPreparing.response.status, 200);
    assert.ok(checkoutPreparing.body.includes('data-success-panel="preparing" hidden'));
    assert.ok(checkoutPreparing.body.includes("Your plan is being prepared"));
    assert.ok(checkoutPreparing.body.includes("We're turning everything you told us into a month of content, scheduled and ready to go."));
    assert.ok(checkoutPreparing.body.includes("Scoring your topics"));
    assert.ok(checkoutPreparing.body.includes("This usually takes under a minute"));

    const missingCaseStudy = await fetchRoute(baseUrl, "/case-studies/not-real");
    assert.strictEqual(missingCaseStudy.response.status, 404);
    assert.ok(missingCaseStudy.body.includes('data-route-page="not-found"'));

    const encodedSlashInvite = await fetchRoute(baseUrl, "/invite/%2F");
    assert.strictEqual(encodedSlashInvite.response.status, 404);
    assert.ok(encodedSlashInvite.body.includes('data-route-page="not-found"'));

    const account = await fetchRoute(baseUrl, "/account");
    assert.strictEqual(account.response.status, 302);
    assert.strictEqual(account.location, "/login?next=%2Faccount");

    const dashboardAliases = [
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
    ];
    for (const [aliasPath, canonicalPath] of dashboardAliases) {
      const anonymousAlias = await fetchRoute(baseUrl, aliasPath);
      assert.strictEqual(anonymousAlias.response.status, 302, `${aliasPath} should redirect anonymously`);
      assert.strictEqual(anonymousAlias.location, canonicalPath, `${aliasPath} should redirect to canonical account route`);

      const signedInAlias = await fetchRoute(baseUrl, aliasPath, {
        headers: { cookie: signedInCookie },
      });
      assert.strictEqual(signedInAlias.response.status, 302, `${aliasPath} should canonicalize for signed-in users`);
      assert.strictEqual(signedInAlias.location, canonicalPath);
    }

    const billingAliasWithCheckout = await fetchRoute(baseUrl, "/subscribe?checkoutPlan=Pro%2B&billingPeriod=annual");
    assert.strictEqual(billingAliasWithCheckout.response.status, 302);
    assert.strictEqual(billingAliasWithCheckout.location, "/account?view=billing&checkoutPlan=Pro%2B&billingPeriod=annual");

    const signedInReportsRoute = await fetchRoute(baseUrl, "/reports", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInReportsRoute.response.status, 302);
    assert.strictEqual(signedInReportsRoute.location, "/account?view=reports");

    const signedInAccount = await fetchRoute(baseUrl, "/account?view=billing", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInAccount.response.status, 200);
    assert.ok(signedInAccount.contentType.includes("text/html"));
    assert.ok(signedInAccount.body.includes('data-route-page="account"'));
    assert.ok(signedInAccount.body.includes('data-account-panel="billing"'));
    assert.ok(signedInAccount.body.includes('data-auth-account'));
    assert.ok(!signedInAccount.body.includes('data-auth-login>Log in</a>'));
    assert.ok(!signedInAccount.body.includes('data-auth-signup>Sign up</a>'));
    assert.ok(!signedInAccount.body.includes('data-auth-account hidden'));
    assert.ok(!signedInAccount.body.includes('data-auth-logout hidden'));

    for (const route of ["/", "/features", "/pricing", "/case-studies", ...linkedCaseStudyRoutes]) {
      const signedInShell = await fetchRoute(baseUrl, route, {
        headers: { cookie: signedInCookie },
      });
      assert.strictEqual(signedInShell.response.status, 200, `${route} should return 200 for signed-in users`);
      assert.ok(!signedInShell.body.includes('data-auth-login>Log in</a>'), `${route} should not send signed-in users the anonymous login link`);
      assert.ok(!signedInShell.body.includes('data-auth-signup>Sign up</a>'), `${route} should not send signed-in users the anonymous signup link`);
      assert.ok(!signedInShell.body.includes('data-auth-account hidden'), `${route} should send signed-in users a visible account link`);
      assert.ok(signedInShell.body.includes('href="/account?view=plan" data-route="account" data-auth-account>Route Smoke</a>'), `${route} should send signed-in users an account home link named for the user`);
      assert.ok(!signedInShell.body.includes('data-auth-logout hidden'), `${route} should send signed-in users a visible logout button`);
      assert.ok(!signedInShell.body.includes('href="/signup" data-auth-trial'), `${route} should not send signed-in users trial CTAs back to signup`);
      assert.ok(!signedInShell.body.includes("data-auth-trial"), `${route} should not send signed-in users anonymous trial CTA markers`);
      assert.ok(!signedInShell.body.includes("Start free trial"), `${route} should not send signed-in users anonymous trial CTA copy`);
      assert.ok(signedInShell.body.includes('href="/account?view=billing"'), `${route} should send signed-in users account billing CTAs`);
    }

    const signedInHome = await fetchRoute(baseUrl, "/", {
      headers: { cookie: signedInCookie },
    });
    assert.ok(signedInHome.body.includes("AI SEO content built around your brand"));
    assert.ok(signedInHome.body.includes('class="hero hero-authenticated page-panel"'));
    assert.ok(signedInHome.body.includes("<span>SEO content built</span>"));
    assert.ok(signedInHome.body.includes('<span class="gradient-text">around your brand,</span>'));
    assert.ok(!signedInHome.body.includes("Get recommended in ChatGPT, Google AI, Claude, Perplexity &amp; Gemini"));
    assert.ok(!signedInHome.body.includes("<span>Be the brand</span>"));
    assert.ok(signedInHome.body.includes('href="/account?view=plan" data-route="account" data-auth-account>Route Smoke</a>'));

    const signedInLogin = await fetchRoute(baseUrl, "/login?next=%2Faccount%3Fview%3Dhelp", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInLogin.response.status, 302);
    assert.strictEqual(signedInLogin.location, "/account?view=help");

    const signedInLoginSettingsAlias = await fetchRoute(baseUrl, "/login?next=%2Fsettings%2Fcms-connect", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInLoginSettingsAlias.response.status, 302);
    assert.strictEqual(signedInLoginSettingsAlias.location, "/account?view=settings&tab=cms");

    const signedInLoginKeywordAlias = await fetchRoute(baseUrl, "/login?next=%2Fkeyword-finder", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInLoginKeywordAlias.response.status, 302);
    assert.strictEqual(signedInLoginKeywordAlias.location, "/account?view=topics");

    const signedInLoginSubscribeAlias = await fetchRoute(baseUrl, "/login?next=%2Fsubscribe%3FcheckoutPlan%3DPro%252B%26billingPeriod%3Dannual", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInLoginSubscribeAlias.response.status, 302);
    assert.strictEqual(signedInLoginSubscribeAlias.location, "/account?view=billing&checkoutPlan=Pro%2B&billingPeriod=annual");

    const signedInSignup = await fetchRoute(baseUrl, "/signup", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInSignup.response.status, 302);
    assert.strictEqual(signedInSignup.location, "/account?view=billing");

    const signedInLoginMalformedInvite = await fetchRoute(baseUrl, "/login?next=%2Finvite%2F%25", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInLoginMalformedInvite.response.status, 302);
    assert.strictEqual(signedInLoginMalformedInvite.location, "/account?view=billing");

    const signedInLoginExtraInvite = await fetchRoute(baseUrl, "/login?next=%2Finvite%2Ftoken%2Fextra", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInLoginExtraInvite.response.status, 302);
    assert.strictEqual(signedInLoginExtraInvite.location, "/account?view=billing");

    const signedInLoginEncodedSlashInvite = await fetchRoute(baseUrl, "/login?next=%2Finvite%2F%252F", {
      headers: { cookie: signedInCookie },
    });
    assert.strictEqual(signedInLoginEncodedSlashInvite.response.status, 302);
    assert.strictEqual(signedInLoginEncodedSlashInvite.location, "/account?view=billing");

    const blog = await fetchRoute(baseUrl, "/blog");
    assert.strictEqual(blog.response.status, 200);
    assert.ok(blog.contentType.includes("text/html"));
    assert.ok(blog.body.includes("<h1>Blog</h1>"));
    assert.ok(blog.body.includes("Posts are being prepared"));
    assert.ok(blog.body.includes("Published account articles will appear here after they pass review and publish."));

    const health = await fetchRoute(baseUrl, "/api/health");
    assert.strictEqual(health.response.status, 200);
    assert.deepStrictEqual(JSON.parse(health.body), {
      ok: true,
      service: "sirbloggsalot",
      googleAuthEnabled: false,
    });

    const posts = await fetchRoute(baseUrl, "/api/blog/posts");
    assert.strictEqual(posts.response.status, 200);
    assert.deepStrictEqual(JSON.parse(posts.body), { ok: true, posts: [] });

    const assetRoutes = ["/app-screenshots/dashboard.png", "/app-screenshots/gsc-traffic.png", "/app-screenshots/keyword-finder.png", "/assets/sirbloggsalot-og.png"];
    for (const route of assetRoutes) {
      const response = await fetch(`${baseUrl}${route}`);
      assert.strictEqual(response.status, 200, `${route} should return 200`);
      assert.ok((response.headers.get("content-type") || "").includes("image/png"), `${route} should return a png`);
      assert.ok((await response.arrayBuffer()).byteLength > 1000, `${route} should not be empty`);
    }

    console.log("Public route smoke checks passed.");
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
