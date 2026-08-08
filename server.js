const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { createBlawgyCompat } = require("./lib/blawgy-compat");

const root = __dirname;
const port = Number(process.env.PORT || 5187);
const host = process.env.HOST || "127.0.0.1";

const googleClientId = process.env.SIR_BLOGGS_GOOGLE_CLIENT_ID || "";
const authSessionSecret = process.env.SIR_BLOGGS_AUTH_SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const authStorePath = process.env.SIR_BLOGGS_AUTH_STORE_PATH || path.join(root, "data", "auth-store.json");
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
const accountStorePath = path.join(root, "data", "account-store.json");
const enableBlawgyClient = process.env.SIR_BLOGGS_ENABLE_BLAWGY_CLIENT === "1";

const privateStaticRoots = new Set(["data", "docs", "lib", "research", "scripts"]);
const privateStaticFiles = new Set(["blawgy-app.html", "package.json", "server.js"]);

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

const blawgyCompat = createBlawgyCompat({
  root,
  readSessionUser,
  readRequestJson,
  sendJson,
  publicUser,
});

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

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const firstSegment = normalized.split(/[\\/]/).filter(Boolean)[0];
  if (privateStaticRoots.has(firstSegment) || privateStaticFiles.has(firstSegment)) return null;
  return path.join(root, normalized === "/" ? "/index.html" : normalized);
}

function isBlawgyClientRoute(pathname) {
  if (!enableBlawgyClient) return false;

  // NOTE: /login and /signup are intentionally NOT served by the Blawgy SPA.
  // The SPA's own login page is Firebase-based; SBA authenticates with Google
  // Identity Services -> signed cookie, so those routes fall through to the
  // custom index.html sign-in, which then redirects into the SPA.
  const exactRoutes = new Set([
    "/account",
    "/dashboard",
    "/keyword-finder",
    "/pages",
    "/reports",
    "/seo-analysis",
    "/ai-mentions",
    "/api-docs",
    "/invite",
    "/success",
    "/failure",
    "/onboarding",
    "/business",
    "/subscribe",
    "/alex-hormozi-offer-ai",
    "/article-builder",
  ]);

  return (
    exactRoutes.has(pathname) ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/preview/") ||
    pathname.startsWith("/sample/") ||
    pathname.startsWith("/hormozi/offers/")
  );
}

function authError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf("=");
        return index === -1
          ? [decodeURIComponent(cookie), ""]
          : [decodeURIComponent(cookie.slice(0, index)), decodeURIComponent(cookie.slice(index + 1))];
      })
  );
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

async function readAccountStore() {
  try {
    const parsed = JSON.parse(await fsp.readFile(accountStorePath, "utf8"));
    return { accounts: parsed.accounts && typeof parsed.accounts === "object" ? parsed.accounts : {} };
  } catch (error) {
    if (error.code === "ENOENT") return { accounts: {} };
    throw error;
  }
}

async function writeAccountStore(store) {
  await fsp.mkdir(path.dirname(accountStorePath), { recursive: true });
  await fsp.writeFile(accountStorePath, `${JSON.stringify(store, null, 2)}\n`);
}

async function mutateAccountStore(mutator) {
  const store = await readAccountStore();
  const result = await mutator(store);
  await writeAccountStore(store);
  return result;
}

function defaultAccount(user) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    profile: {
      ownerId: user.id,
      ownerEmail: user.email,
      workspaceLabel: user.email.split("@")[0] || "sirbloggsalot.com",
      role: user.role || "client",
    },
    settings: {
      site: {
        productDescription: "Sir Bloggsalot publishes brand-aware articles that help companies get found across search, answer engines, and their own blog.",
        targetAudience: "Local small business owners, ecommerce entrepreneurs, real estate agents, local restaurants and cafes, and service businesses that need consistent search visibility.",
        keywords: [],
        keywordMix: 45,
      },
      images: {
        includeImages: true,
        useProductImages: false,
        visualStyle: "",
      },
      cms: {
        websiteUrl: "sirbloggsalot.com",
        platform: "",
        draftFirst: true,
        status: "disconnected",
        redactedPrivateValueStored: false,
      },
      cta: {
        enabled: false,
        text: "",
      },
    },
    products: [],
    locations: [],
    invites: [],
    topics: [],
    contentPlan: [
      {
        id: `plan_${crypto.randomBytes(8).toString("hex")}`,
        title: "AI search visibility starter article",
        status: "Draft",
        targetDate: today,
        keyword: "AI SEO for local business",
        notes: "Use site settings, target audience, products, locations, CTA, and CMS settings before publishing.",
      },
    ],
    billing: {
      plan: "Free trial",
      proPlus: false,
      portalConnected: false,
    },
    searchConsole: {
      status: "disconnected",
      message: "Search Console connection is not wired yet.",
    },
  };
}

function publicAccountData(account, user) {
  return {
    user: publicUser(user),
    profile: account.profile,
    settings: account.settings,
    products: account.products,
    locations: account.locations,
    invites: account.invites.map(({ privateCode, ...invite }) => invite),
    topics: account.topics,
    contentPlan: account.contentPlan,
    billing: account.billing,
    searchConsole: account.searchConsole,
  };
}

async function accountForUser(user) {
  return mutateAccountStore((store) => {
    const key = user.id;
    if (!store.accounts[key]) store.accounts[key] = defaultAccount(user);
    store.accounts[key].profile.ownerEmail = user.email;
    store.accounts[key].profile.role = user.role || "client";
    return publicAccountData(store.accounts[key], user);
  });
}

function patchObject(base, patch) {
  return { ...base, ...(patch && typeof patch === "object" ? patch : {}) };
}

function removeById(list, id) {
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return false;
  list.splice(index, 1);
  return true;
}

async function serveAccountApi(req, res, url) {
  const user = await readSessionUser(req);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "Authentication required." });
    return true;
  }

  const parts = url.pathname.split("/").filter(Boolean).slice(2);
  const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readRequestJson(req) : {};

  if (req.method === "GET" && parts[0] === "summary") {
    sendJson(res, 200, { ok: true, account: await accountForUser(user) });
    return true;
  }

  if (req.method === "GET") {
    const account = await accountForUser(user);
    const directReads = {
      settings: account.settings,
      products: account.products,
      locations: account.locations,
      invites: account.invites,
      topics: account.topics,
      billing: account.billing,
      "search-console": account.searchConsole,
      rankings: { locked: !account.billing.proPlus, requiredPlan: "Pro+", rows: [] },
      "ai-mentions": { locked: !account.billing.proPlus, requiredPlan: "Pro+", rows: [] },
      cms: account.settings.cms,
      cta: account.settings.cta,
    };

    if (parts[0] === "content-plan") {
      sendJson(res, 200, { ok: true, data: account.contentPlan, account });
      return true;
    }

    if (Object.hasOwn(directReads, parts[0])) {
      sendJson(res, 200, { ok: true, data: directReads[parts[0]], account });
      return true;
    }
  }

  const result = await mutateAccountStore((store) => {
    const key = user.id;
    const account = store.accounts[key] || defaultAccount(user);
    store.accounts[key] = account;
    let response;

    if (req.method === "PUT" && parts[0] === "settings") {
      account.settings.site = patchObject(account.settings.site, body.site);
      account.settings.images = patchObject(account.settings.images, body.images);
      account.settings.cms = patchObject(account.settings.cms, body.cms);
      account.settings.cta = patchObject(account.settings.cta, body.cta);
      account.settings.site.keywords = Array.isArray(body.site?.keywords) ? body.site.keywords.map(String).slice(0, 40) : account.settings.site.keywords;
      account.settings.cms.redactedPrivateValueStored = Boolean(body.cms?.privateValue || account.settings.cms.redactedPrivateValueStored);
      if (account.settings.cms.privateValue) delete account.settings.cms.privateValue;
      response = account.settings;
    } else if (req.method === "PUT" && parts[0] === "cms") {
      account.settings.cms = patchObject(account.settings.cms, body);
      account.settings.cms.redactedPrivateValueStored = Boolean(body.privateValue || account.settings.cms.redactedPrivateValueStored);
      if (account.settings.cms.privateValue) delete account.settings.cms.privateValue;
      response = account.settings.cms;
    } else if (req.method === "PUT" && parts[0] === "cta") {
      account.settings.cta = patchObject(account.settings.cta, body);
      response = account.settings.cta;
    } else if (req.method === "POST" && parts[0] === "content-plan") {
      response = { id: `plan_${crypto.randomBytes(8).toString("hex")}`, title: body.title || "Untitled article", status: body.status || "Draft", targetDate: body.targetDate || "", keyword: body.keyword || "", notes: body.notes || "" };
      account.contentPlan.unshift(response);
    } else if (req.method === "PUT" && parts[0] === "content-plan" && parts[1]) {
      const item = account.contentPlan.find((row) => row.id === parts[1]);
      if (item) Object.assign(item, body, { id: item.id });
      response = item || null;
    } else if (req.method === "DELETE" && parts[0] === "content-plan" && parts[1]) {
      response = { ok: removeById(account.contentPlan, parts[1]) };
    } else if (req.method === "POST" && parts[0] === "topics" && parts[1] === "search") {
      const term = String(body.query || "local visibility").trim() || "local visibility";
      response = ["guide", "checklist", "mistakes", "comparison"].map((kind) => ({
        id: `topic_${crypto.randomBytes(8).toString("hex")}`,
        title: `${term} ${kind} for local buyers`,
        keyword: term,
        intent: kind === "comparison" ? "Consideration" : "Local SEO",
        addedToPlan: false,
      }));
      account.topics = response.concat(account.topics).slice(0, 100);
    } else if (req.method === "POST" && parts[0] === "topics" && parts[2] === "add") {
      const topic = account.topics.find((row) => row.id === parts[1]);
      if (topic) {
        topic.addedToPlan = true;
        response = { id: `plan_${crypto.randomBytes(8).toString("hex")}`, title: topic.title, status: "Draft", targetDate: "", keyword: topic.keyword, notes: "Added from topic discovery." };
        account.contentPlan.unshift(response);
      }
    } else if (["products", "locations"].includes(parts[0])) {
      const list = account[parts[0]];
      if (req.method === "POST") {
        response = { id: `${parts[0]}_${crypto.randomBytes(8).toString("hex")}`, hidden: false, ...body };
        list.unshift(response);
      } else if (req.method === "DELETE" && parts[1]) {
        response = { ok: removeById(list, parts[1]) };
      } else if (req.method === "PUT" && parts[1]) {
        response = list.find((row) => row.id === parts[1]) || null;
        if (response) Object.assign(response, body, { id: response.id });
      }
    } else if (req.method === "POST" && parts[0] === "invites") {
      const email = normalizeEmail(body.email);
      if (!email || !email.includes("@")) return { status: 400, payload: { ok: false, error: "Enter a valid email address." } };
      response = { id: `invite_${crypto.randomBytes(8).toString("hex")}`, email, role: body.role || "Editor", status: "pending", link: `/invite/${crypto.randomBytes(10).toString("hex")}`, createdAt: new Date().toISOString() };
      account.invites.unshift({ ...response, privateCode: crypto.randomBytes(16).toString("hex") });
    } else if (req.method === "DELETE" && parts[0] === "invites" && parts[1]) {
      response = { ok: removeById(account.invites, parts[1]) };
    } else if (req.method === "POST" && parts[0] === "search-console" && parts[1] === "connect") {
      response = { ok: false, message: account.searchConsole.message };
    }

    if (response === undefined) return { status: 404, payload: { ok: false, error: "Account endpoint not found." } };
    return { status: 200, payload: { ok: true, data: response, account: publicAccountData(account, user) } };
  });

  sendJson(res, result.status, result.payload);
  return true;
}

async function serveApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      service: "sirbloggsalot",
      googleAuthEnabled: Boolean(googleClientId),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/config") {
    sendJson(res, 200, {
      ok: true,
      googleAuthEnabled: Boolean(googleClientId),
      googleClientId,
      allowedDomains: googleAllowedDomains,
      blawgyClientEnabled: enableBlawgyClient,
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
    sendJson(
      res,
      200,
      { ok: true },
      {
        "set-cookie": cookieHeader(req, "", 0),
      }
    );
    return true;
  }

  if (url.pathname.startsWith("/api/account/")) {
    return serveAccountApi(req, res, url);
  }

  if (await blawgyCompat.serve(req, res, url)) {
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

  if (url.pathname === "/account") {
    const user = await readSessionUser(req);

    if (!user) {
      send(res, 302, { location: "/login?next=/account", "cache-control": "no-store" }, "");
      return;
    }
  }

  let filePath = isBlawgyClientRoute(url.pathname) ? path.join(root, "blawgy-app.html") : safeFile(req.url);
  if (!filePath) {
    send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "Not found");
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(root, "index.html");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 500, { "content-type": "text/plain; charset=utf-8" }, "Server error");
      return;
    }

    const contentType = types[path.extname(filePath)] || "application/octet-stream";
    send(res, 200, { "content-type": contentType, "cache-control": "no-store" }, req.method === "HEAD" ? "" : data);
  });
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

      if (await blawgyCompat.serve(req, res, url)) {
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
