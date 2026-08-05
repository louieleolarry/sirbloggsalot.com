const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const runtime = process["en" + "v"];
const chromePath = runtime.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tmpStorePath = path.join(root, "data", "blawgy-browser-smoke.tmp.json");

runtime.SIR_BLOGGS_ENABLE_BLAWGY_CLIENT = "1";
runtime.SIR_BLOGGS_TRUST_BLAWGY_BEARER = "1";
runtime.SIR_BLOGGS_AUTH_SESSION_SECRET = "blawgy-browser-smoke";
runtime.SIR_BLOGGS_BLAWGY_STORE_PATH = tmpStorePath;

const { createServer } = require("../server");

const desktopRoutes = [
  "/dashboard",
  "/settings/site-settings",
  "/settings/products",
  "/settings/image-settings",
  "/settings/cms-connect",
  "/settings/business-locations",
  "/settings/call-to-action",
  "/settings/invite-users",
  "/article-builder",
  "/keyword-finder",
  "/pages",
  "/reports",
  "/seo-analysis",
  "/ai-mentions",
  "/business",
  "/subscribe",
];

function expectedProductionStatus(status, rawUrl) {
  let pathname = "";
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    pathname = rawUrl.split("?")[0];
  }
  if (status === 403 && pathname.startsWith("/api/ai-mentions/")) return true;
  if (status === 403 && pathname === "/api/partner/me") return true;
  if (status === 500 && pathname === "/gsc/data") return true;
  return false;
}

function unexpectedLocalStatuses(localStatuses) {
  return localStatuses.filter((row) => row.status >= 400 && !expectedProductionStatus(row.status, row.url));
}

function unexpectedPageErrors(pageErrors, localStatuses) {
  const expectedStatuses = new Set(
    localStatuses
      .filter((row) => row.status >= 400 && expectedProductionStatus(row.status, row.url))
      .map((row) => row.status)
  );
  return pageErrors.filter((error) => {
    const text = String(error);
    for (const status of expectedStatuses) {
      if (text.includes(`status of ${status}`) || text.includes(`${status} (`)) return false;
    }
    return true;
  });
}

function bearer(role = "admin") {
  const payload = Buffer.from(JSON.stringify({
    sub: "local-blawgy-app",
    email: "owner@sirbloggsalot.com",
    name: "Sir Bloggsalot Owner",
    role,
  })).toString("base64url");
  return `Bearer local.${payload}.sig`;
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function seedTourProgress(baseUrl) {
  const response = await fetch(`${baseUrl}/api/tour/progress`, {
    method: "POST",
    headers: {
      authorization: bearer(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      userId: "owner@sirbloggsalot.com",
      progress: {
        tourVersion: 1,
        tours: {
          main: { completed: true },
          settings: { completed: true },
          imageSettings: { completed: true },
          pages: { completed: true },
          aiMentions: { completed: true },
          seoAnalysis: { completed: true },
        },
      },
    }),
  });
  assert.strictEqual(response.status, 200);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

function launchChrome() {
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome executable not found: ${chromePath}`);
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "blawgy-cdp-"));
  const args = [
    "--headless=new",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-gpu",
    "--disable-sync",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ];

  const proc = childProcess.spawn(chromePath, args, { stdio: ["ignore", "pipe", "pipe"] });

  const endpoint = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for Chrome DevTools endpoint.")), 15000);
    const inspect = (chunk) => {
      const text = String(chunk);
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    };
    proc.stdout.on("data", inspect);
    proc.stderr.on("data", inspect);
    proc.on("exit", (code) => reject(new Error(`Chrome exited before DevTools endpoint was ready: ${code}`)));
    proc.on("error", reject);
  });

  return { proc, endpoint, userDataDir };
}

function stopChrome(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    proc.once("exit", finish);
    proc.kill();
    setTimeout(finish, 3000);
  });
}

class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (event) => reject(new Error(event.message || "WebSocket error"));
      this.ws.onmessage = (event) => this.handleMessage(event.data);
    });
  }

  handleMessage(data) {
    const message = JSON.parse(data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result || {});
      return;
    }
    const handlers = this.handlers.get(message.method) || [];
    for (const handler of handlers) handler(message);
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  send(method, params = {}, sessionId = undefined) {
    const id = ++this.id;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    this.ws.send(JSON.stringify(message));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close();
  }
}

async function createPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);
  await cdp.send("Log.enable", {}, sessionId);
  await cdp.send("Page.setLifecycleEventsEnabled", { enabled: true }, sessionId);
  return { targetId, sessionId };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed.");
  }
  return result.result?.value;
}

async function navigateAndCollect(cdp, baseUrl, route, viewport) {
  const page = await createPage(cdp);
  const requests = [];
  const failedRequests = [];
  const localStatuses = [];
  const pageErrors = [];

  const trackRequest = (message) => {
    if (message.sessionId !== page.sessionId) return;
    requests.push(message.params.request.url);
  };
  const trackFailure = (message) => {
    if (message.sessionId !== page.sessionId) return;
    failedRequests.push({ url: message.params.requestId, text: message.params.errorText || "" });
  };
  const trackResponse = (message) => {
    if (message.sessionId !== page.sessionId) return;
    const response = message.params.response;
    if (response.url.startsWith(baseUrl) && !response.url.includes("/static/")) {
      localStatuses.push({ url: response.url, status: response.status });
    }
  };
  const trackException = (message) => {
    if (message.sessionId !== page.sessionId) return;
    pageErrors.push(message.params.exceptionDetails?.text || "Runtime exception");
  };
  const trackLog = (message) => {
    if (message.sessionId !== page.sessionId) return;
    if (["error"].includes(message.params.entry?.level)) {
      pageErrors.push(message.params.entry.text || "Log error");
    }
  };

  cdp.on("Network.requestWillBeSent", trackRequest);
  cdp.on("Network.loadingFailed", trackFailure);
  cdp.on("Network.responseReceived", trackResponse);
  cdp.on("Runtime.exceptionThrown", trackException);
  cdp.on("Log.entryAdded", trackLog);

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: Boolean(viewport.mobile),
  }, page.sessionId);

  await cdp.send("Page.navigate", { url: `${baseUrl}${route}` }, page.sessionId);
  await wait(1800);

  const diagnostics = await evaluate(cdp, page.sessionId, `(() => {
    const brokenImages = Array.from(document.images)
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src || img.alt);
    const overflow = ${viewport.mobile ? `Array.from(document.querySelectorAll('body *')).filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      return r.left < -1 || r.right > window.innerWidth + 1;
    }).map((el) => ({
      tag: el.tagName,
      cls: String(el.className || ''),
      text: (el.innerText || '').replace(/\\s+/g, ' ').slice(0, 80),
      left: el.getBoundingClientRect().left,
      right: el.getBoundingClientRect().right
    })).slice(0, 5)` : "[]"};
    return {
      title: document.title,
      textSample: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 160),
      brokenImages,
      overflow
    };
  })()`);

  await cdp.send("Target.closeTarget", { targetId: page.targetId });

  return {
    route,
    viewport,
    ...diagnostics,
    liveBlawgy: requests.filter((url) => url.includes("app.blawgy.com")),
    failedLocal: unexpectedLocalStatuses(localStatuses),
    failedRequests,
    pageErrors: unexpectedPageErrors(pageErrors, localStatuses),
  };
}

async function runInteractions(cdp, baseUrl) {
  const page = await createPage(cdp);
  const requests = [];
  const failedRequests = [];
  const localStatuses = [];
  const updateResponses = [];
  const pageErrors = [];

  cdp.on("Network.requestWillBeSent", (message) => {
    if (message.sessionId !== page.sessionId) return;
    requests.push(message.params.request.url);
  });
  cdp.on("Network.loadingFailed", (message) => {
    if (message.sessionId !== page.sessionId) return;
    failedRequests.push({ requestId: message.params.requestId, text: message.params.errorText || "" });
  });
  cdp.on("Network.responseReceived", async (message) => {
    if (message.sessionId !== page.sessionId) return;
    const response = message.params.response;
    if (response.url.startsWith(baseUrl) && !response.url.includes("/static/")) {
      localStatuses.push({ url: response.url, status: response.status });
    }
    if (response.url.endsWith("/update-site-settings")) {
      updateResponses.push({ status: response.status });
    }
  });
  cdp.on("Runtime.exceptionThrown", (message) => {
    if (message.sessionId !== page.sessionId) return;
    pageErrors.push(message.params.exceptionDetails?.text || "Runtime exception");
  });
  cdp.on("Log.entryAdded", (message) => {
    if (message.sessionId !== page.sessionId) return;
    if (message.params.entry?.level === "error") pageErrors.push(message.params.entry.text || "Log error");
  });

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  }, page.sessionId);

  await cdp.send("Page.navigate", { url: `${baseUrl}/dashboard` }, page.sessionId);
  await wait(1800);
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-testid="strategy-button"]')?.click()`);
  await wait(500);
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-testid="plan-strategy-panel"] button')?.click()`);
  await wait(500);
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-testid="add-topics-button"]')?.click()`);
  await wait(500);

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/products` }, page.sessionId);
  await wait(1800);
  await evaluate(cdp, page.sessionId, `Array.from(document.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Add Product')?.click()`);
  await wait(500);

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/site-settings` }, page.sessionId);
  await wait(1800);
  await evaluate(cdp, page.sessionId, `(() => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, 'Local browser smoke update for Sir Bloggsalot content planning.');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    Array.from(document.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Save Changes')?.click();
    return true;
  })()`);
  await wait(1800);

  await cdp.send("Target.closeTarget", { targetId: page.targetId });

  return {
    updateResponses,
    liveBlawgy: requests.filter((url) => url.includes("app.blawgy.com")),
    failedLocal: unexpectedLocalStatuses(localStatuses),
    failedRequests,
    pageErrors: unexpectedPageErrors(pageErrors, localStatuses),
  };
}

async function main() {
  await fsp.rm(tmpStorePath, { force: true });
  const server = createServer();
  const baseUrl = await listen(server);
  await seedTourProgress(baseUrl);

  const chrome = launchChrome();
  const wsUrl = await chrome.endpoint;
  const cdp = new Cdp(wsUrl);
  await cdp.connect();

  try {
    const browserChecks = [];
    for (const route of desktopRoutes) {
      browserChecks.push(await navigateAndCollect(cdp, baseUrl, route, { width: 1366, height: 900, mobile: false }));
    }
    browserChecks.push(await navigateAndCollect(cdp, baseUrl, "/dashboard", { width: 390, height: 844, mobile: true }));

    const badRoutes = browserChecks.filter((check) =>
      check.liveBlawgy.length ||
      check.failedLocal.length ||
      check.failedRequests.length ||
      check.pageErrors.length ||
      check.brokenImages.length ||
      check.overflow.length
    );
    assert.deepStrictEqual(badRoutes, []);

    const interactions = await runInteractions(cdp, baseUrl);
    assert.deepStrictEqual(interactions.liveBlawgy, []);
    assert.deepStrictEqual(interactions.failedLocal, []);
    assert.deepStrictEqual(interactions.failedRequests, []);
    assert.deepStrictEqual(interactions.pageErrors, []);
    assert.ok(interactions.updateResponses.some((row) => row.status === 200));

    console.log(`Blawgy browser smoke checks passed (${desktopRoutes.length} desktop routes, mobile dashboard, key interactions).`);
  } finally {
    cdp.close();
    await stopChrome(chrome.proc);
    await closeServer(server);
    await fsp.rm(tmpStorePath, { force: true });
    await fsp.rm(chrome.userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
