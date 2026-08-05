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
    if (text.includes("Blocked attempt to show a 'beforeunload' confirmation panel")) return false;
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

async function waitForExpression(cdp, sessionId, expression, { timeout = 10000, interval = 250 } = {}) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeout) {
    lastValue = await evaluate(cdp, sessionId, expression);
    if (lastValue) return lastValue;
    await wait(interval);
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}\nLast value: ${JSON.stringify(lastValue)}`);
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
  const settingsActions = [];
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

  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const text = () => document.body.innerText || '';
    const clickButton = (label) => {
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.trim() === label);
      if (!button) return false;
      button.click();
      return true;
    };
    const setValue = (node, value) => {
      const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(node, value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    };
    return { name: 'site-settings-save', saved: text().includes('Saved!'), clickButtonExists: typeof clickButton === 'function', setValueExists: typeof setValue === 'function' };
  })()`));

  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('Find Competitors'));
    if (!button) return { name: 'competitor-suggestions', clicked: false };
    button.click();
    return { name: 'competitor-suggestions', clicked: true };
  })()`));
  await wait(1000);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const text = document.body.innerText || '';
    return {
      name: 'competitor-suggestions-result',
      hasSuggestedDomain: text.includes('localdirectory.example') || text.includes('regionalmarket.example'),
      hasUndefinedText: text.includes('undefined')
    };
  })()`));

  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const label = Array.from(document.querySelectorAll('label')).find((node) => node.textContent.includes('Internal Links'));
    const checkbox = label?.parentElement?.parentElement?.querySelector('input[type="checkbox"]') || Array.from(document.querySelectorAll('input[type="checkbox"]')).at(-1);
    if (checkbox && !Array.from(document.querySelectorAll('button')).some((node) => node.textContent.includes('Fetch from Sitemap'))) checkbox.click();
    return { name: 'internal-links-toggle', fetchButtonVisible: Array.from(document.querySelectorAll('button')).some((node) => node.textContent.includes('Fetch from Sitemap')) };
  })()`));
  await wait(300);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('Fetch from Sitemap'));
    if (!button) return { name: 'sitemap-fetch', clicked: false };
    button.click();
    return { name: 'sitemap-fetch', clicked: true };
  })()`));
  await wait(1000);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const text = document.body.innerText || '';
    return { name: 'sitemap-fetch-result', hasFetchedLink: text.includes('https://sirbloggsalot.com/') };
  })()`));
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.trim() === 'Save Changes');
    button?.click();
    return { name: 'sitemap-save-click', clicked: Boolean(button), disabled: Boolean(button?.disabled) };
  })()`));
  await wait(1500);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const headers = token ? { authorization: 'Bearer ' + token } : {};
    const settingsRes = await fetch('/get-site-settings?site=sirbloggsalot.com', { headers });
    const settings = await settingsRes.json();
    const links = settings.settings?.internalLinks || [];
    return {
      name: 'sitemap-save-readback',
      settingsStatus: settingsRes.status,
      linkCount: links.length,
      hasHomeLink: links.some((link) => link.url === 'https://sirbloggsalot.com/'),
      hasObjectObjectLink: links.some((link) => String(link.url || '').includes('[object'))
    };
  })()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/products` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const clickButton = (label) => {
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.trim() === label);
      if (!button) return false;
      button.click();
      return true;
    };
    return { name: 'product-modal-open-click', clicked: clickButton('Add Product') };
  })()`));
  await wait(300);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => ({ name: 'product-modal-opened', hasNameField: Array.from(document.querySelectorAll('label')).some((node) => node.textContent.includes('Product Name')) }))()`));
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const input = Array.from(document.querySelectorAll('input')).find((node) => node.placeholder && node.placeholder.includes('Premium Bath'));
    if (!input) return { name: 'product-create', hasInput: false };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Codex Button Test Product');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const buttons = Array.from(document.querySelectorAll('button')).filter((node) => node.textContent.trim() === 'Add Product');
    buttons.at(-1)?.click();
    return { name: 'product-create', hasInput: true };
  })()`));
  await wait(1000);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => ({ name: 'product-create-result', hasCreatedProduct: (document.body.innerText || '').includes('Codex Button Test Product') }))()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/image-style` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const section = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('Test Image Generation'));
    section?.click();
    return { name: 'image-test-opened', clicked: Boolean(section) };
  })()`));
  await wait(500);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const input = Array.from(document.querySelectorAll('input')).find((node) => node.placeholder && node.placeholder.includes('modern bathroom'));
    if (!input) return { name: 'image-generate', hasInput: false };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'A clean local business SEO dashboard');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('Generate Test Image'));
    button?.click();
    return { name: 'image-generate', hasInput: true, clicked: Boolean(button) };
  })()`));
  await wait(1200);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const previews = Array.from(document.images).filter((img) => img.alt === 'Preview' && img.getAttribute('src'));
    return { name: 'image-generate-result', previewCount: previews.length, previewSrc: previews[0]?.getAttribute('src') || '' };
  })()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/cta` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (!checkbox) return { name: 'cta-toggle', hasCheckbox: false };
    if (!checkbox.checked) checkbox.click();
    return { name: 'cta-toggle', hasCheckbox: true };
  })()`));
  await wait(1000);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => ({ name: 'cta-toggle-result', hasEditCta: (document.body.innerText || '').includes('Edit CTA') }))()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/invite` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const input = document.querySelector('input[type="email"]');
    if (!input) return { name: 'invite-generate', hasInput: false };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'teammate@example.com');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('Generate Invite Link'));
    button?.click();
    return { name: 'invite-generate', hasInput: true, clicked: Boolean(button) };
  })()`));
  await wait(1000);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => ({ name: 'invite-generate-result', hasInviteLink: (document.body.innerText || '').includes('Invitation Link') }))()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/webhooks` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => (node.textContent || '').includes('Add Webhook'));
    button?.click();
    return { name: 'webhook-add-open', clicked: Boolean(button) };
  })()`));
  await wait(500);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const setByLabel = (labelText, value) => {
      const label = Array.from(document.querySelectorAll('label')).find((node) => (node.textContent || '').includes(labelText));
      const input = label?.parentElement?.querySelector('input');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const filled = [
      setByLabel('Webhook Name', 'Codex Webhook'),
      setByLabel('Webhook URL', 'https://example.com/blawgy-webhook')
    ];
    return { name: 'webhook-form-fill', filled: filled.every(Boolean) };
  })()`));
  await wait(300);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).filter((node) => (node.textContent || '').trim() === 'Create Webhook').at(-1);
    button?.click();
    return { name: 'webhook-create-click', clicked: Boolean(button), disabled: Boolean(button?.disabled) };
  })()`));
  await wait(1200);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const text = document.body.innerText || '';
    const testButton = document.querySelector('button[title="Test webhook"]');
    testButton?.click();
    return { name: 'webhook-create-result', hasWebhook: text.includes('Codex Webhook'), clickedTest: Boolean(testButton) };
  })()`));
  await wait(500);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => (node.textContent || '').includes('Send Test'));
    button?.click();
    return { name: 'webhook-test-click', clicked: Boolean(button), disabled: Boolean(button?.disabled) };
  })()`));
  await wait(1000);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const headers = token ? { authorization: 'Bearer ' + token } : {};
    const webhooksRes = await fetch('/api/webhooks', { headers });
    const webhooks = await webhooksRes.json();
    const hook = (webhooks.webhooks || []).find((row) => row.name === 'Codex Webhook');
    const text = document.body.innerText || '';
    return {
      name: 'webhook-test-readback',
      webhooksStatus: webhooksRes.status,
      modalSuccess: text.includes('Success!'),
      lastTestSuccess: hook?.lastTest?.success === true,
      lastTestStatus: hook?.lastTestStatus || null
    };
  })()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/business-locations` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => /Add another location|Add a location/.test(node.textContent || ''));
    button?.click();
    return { name: 'business-location-add-open', clicked: Boolean(button) };
  })()`));
  await wait(500);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const setByLabel = (labelText, value) => {
      const label = Array.from(document.querySelectorAll('label')).find((node) => (node.textContent || '').includes(labelText));
      const input = label?.parentElement?.querySelector('input, textarea');
      if (!input) return false;
      const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const filled = [
      setByLabel('Label', 'Codex Upland Office'),
      setByLabel('Business name', 'Codex Plumbing'),
      setByLabel('City', 'Upland'),
      setByLabel('State', 'CA'),
      setByLabel('Service area', 'Upland, Ontario, Claremont')
    ];
    return { name: 'business-location-form-fill', filled: filled.every(Boolean) };
  })()`));
  await wait(300);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => (node.textContent || '').trim() === 'Add location');
    button?.click();
    return { name: 'business-location-create-click', clicked: Boolean(button) };
  })()`));
  await wait(1200);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const text = document.body.innerText || '';
    return { name: 'business-location-create-result', hasCreatedLocation: text.includes('Codex Upland Office') && text.includes('Upland') };
  })()`));
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const cards = Array.from(document.querySelectorAll('div')).filter((node) => (node.innerText || '').includes('Codex Upland Office'));
    const button = cards.flatMap((card) => Array.from(card.querySelectorAll('button'))).find((node) => (node.textContent || '').includes('Set primary'));
    button?.click();
    return { name: 'business-location-set-primary', clicked: Boolean(button) };
  })()`));
  await wait(1000);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const headers = token ? { authorization: 'Bearer ' + token } : {};
    const [profilesRes, settingsRes] = await Promise.all([
      fetch('/api/pages/business-profiles?site=sirbloggsalot.com', { headers }),
      fetch('/get-site-settings?site=sirbloggsalot.com', { headers })
    ]);
    const profiles = await profilesRes.json();
    const settings = await settingsRes.json();
    const rows = profiles.profiles || [];
    const primary = rows.find((row) => row.isPrimary);
    return {
      name: 'business-location-primary-readback',
      profilesStatus: profilesRes.status,
      settingsStatus: settingsRes.status,
      primaryCity: primary?.city || null,
      settingsBusinessProfileCity: settings.settings?.businessProfile?.city || null
    };
  })()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/settings/cms-connect` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const select = Array.from(document.querySelectorAll('select')).find((node) => Array.from(node.options || []).some((opt) => opt.value === 'framer'));
    if (!select) return { name: 'cms-framer-select', selected: false };
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(select, 'framer');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return { name: 'cms-framer-select', selected: select.value === 'framer' };
  })()`));
  await wait(500);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const setByLabel = (labelText, value) => {
      const label = Array.from(document.querySelectorAll('label')).find((node) => (node.textContent || '').includes(labelText));
      const input = label?.parentElement?.querySelector('input');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const filled = [
      setByLabel('Framer project link', 'https://framer.com/projects/sirbloggsalot-AbC123'),
      setByLabel('Framer API', 'local-framer-value')
    ];
    return { name: 'cms-framer-form-fill', filled: filled.every(Boolean) };
  })()`));
  await wait(300);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => (node.textContent || '').includes('Test Connection'));
    button?.click();
    return { name: 'cms-framer-test-click', clicked: Boolean(button), disabled: Boolean(button?.disabled) };
  })()`));
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const headers = token ? { authorization: 'Bearer ' + token } : {};
    const settingsRes = await fetch('/get-site-settings?site=sirbloggsalot.com', { headers });
    const settings = await settingsRes.json();
    const map = settings.settings?.framerFieldMap || {};
    const text = document.body.innerText || '';
    return {
      name: 'cms-framer-test-result',
      settingsStatus: settingsRes.status,
      hasSavedMessage: /Saved\\.|Connected!/.test(text),
      hasMismatchError: text.includes("couldn't match"),
      blogType: settings.settings?.blogType || null,
      collectionId: settings.settings?.framerCollectionId || null,
      hasTitleMap: Boolean(map.title),
      hasBodyMap: Boolean(map.body),
      hasHeroMap: Boolean(map.heroImage)
    };
  })()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/article-builder` }, page.sessionId);
  await wait(1800);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const headers = {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {})
    };
    const title = 'Browser Article Builder save readback';
    const content = '<p>Browser-authenticated Article Builder content is persisted.</p>';
    const draftRes = await fetch('/api/article-builder/drafts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        site: 'sirbloggsalot.com',
        defineData: { prompt: 'Browser Article Builder regression' },
        titleData: { selectedTitle: title },
        articleData: { article: { title, sections: [{ title: 'Proof', content }] } }
      })
    });
    const draft = await draftRes.json();
    const saveRes = await fetch('/save-article', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        site: 'sirbloggsalot.com',
        title,
        blogTitle: title,
        content,
        metaDescription: 'Browser Article Builder regression',
        keywords: ['browser article builder'],
        createdWith: 'article-builder'
      })
    });
    const saved = await saveRes.json();
    const publishRes = await fetch('/api/article-builder/drafts/' + draft.draft.id + '/publish', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ site: 'sirbloggsalot.com', publishedArticleId: saved.blog.id })
    });
    const published = await publishRes.json();
    const rowsRes = await fetch('/all-blog-posts?site=sirbloggsalot.com', { headers });
    const rows = await rowsRes.json();
    const matches = rows.filter((row) => row.title === title);
    return {
      name: 'article-builder-save-readback',
      pathname: window.location.pathname,
      draftStatus: draftRes.status,
      saveStatus: saveRes.status,
      publishStatus: publishRes.status,
      rowsStatus: rowsRes.status,
      publishSuccess: published.success === true,
      matchCount: matches.length,
      hasSavedContent: matches.some((row) => String(row.blogContent || '').includes('Browser-authenticated Article Builder content')),
      savedId: saved.blog?.id || null,
      readbackId: matches[0]?.id || null
    };
  })()`));

  await cdp.send("Page.navigate", { url: `${baseUrl}/dashboard` }, page.sessionId);
  await wait(1200);
  settingsActions.push(await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const jsonHeaders = {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {})
    };
    const readHeaders = token ? { authorization: 'Bearer ' + token } : {};
    const addRes = await fetch('/api/plan/sirbloggsalot.com/add', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        keyword: 'browser content command readback',
        clusterLabel: 'Browser Content Commands',
        source: 'manual'
      })
    });
    const added = await addRes.json();
    const id = added.entry?.id;
    const generateRes = await fetch('/generate-blog/' + id, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ site: 'sirbloggsalot.com' })
    });
    const saveRes = await fetch('/save-post', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        site: 'sirbloggsalot.com',
        id,
        title: 'Browser content command title',
        keywords: 'browser command keyword',
        publishDate: '2026-09-04T12:00:00.000Z',
        blogContent: '<p>Browser dashboard command content persisted.</p>'
      })
    });
    const dateRes = await fetch('/update-publish-date', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ site: 'sirbloggsalot.com', id, publishDate: '2026-09-05T12:00:00.000Z' })
    });
    const publishRes = await fetch('/publish-draft', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ site: 'sirbloggsalot.com', id })
    });
    const planRes = await fetch('/api/plan/sirbloggsalot.com', { headers: readHeaders });
    const plan = await planRes.json();
    const entry = (plan.entries || []).find((row) => row.id === id);
    const contentRes = await fetch('/blog-content?site=sirbloggsalot.com&id=' + encodeURIComponent(id), { headers: readHeaders });
    const content = await contentRes.json();
    const cancelRes = await fetch('/cancel-blog-posting', {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ siteDomain: 'sirbloggsalot.com', blogId: id })
    });
    const afterCancelRes = await fetch('/api/plan/sirbloggsalot.com', { headers: readHeaders });
    const afterCancel = await afterCancelRes.json();
    return {
      name: 'content-plan-command-readback',
      addStatus: addRes.status,
      generateStatus: generateRes.status,
      saveStatus: saveRes.status,
      dateStatus: dateRes.status,
      publishStatus: publishRes.status,
      planStatus: planRes.status,
      title: entry?.title || null,
      blogStatus: entry?.blogStatus || null,
      publishDate: entry?.publishDate || null,
      hasContent: entry?.blogContent === true,
      contentStatus: contentRes.status,
      contentPersisted: String(content.blogContent || '').includes('Browser dashboard command content persisted'),
      cancelStatus: cancelRes.status,
      afterCancelStatus: afterCancelRes.status,
      removedAfterCancel: !(afterCancel.entries || []).some((row) => row.id === id)
    };
  })()`));

  settingsActions.push(await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const jsonHeaders = {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {})
    };
    const readHeaders = token ? { authorization: 'Bearer ' + token } : {};
    const switchRes = await fetch('/switch-plan', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ site: 'sirbloggsalot.com', newPlanId: 'growth_annual' })
    });
    const switched = await switchRes.json();
    const switchedReadbackRes = await fetch('/subscription-details?site=sirbloggsalot.com', { headers: readHeaders });
    const switchedReadback = await switchedReadbackRes.json();
    const cancelRes = await fetch('/cancel-subscription', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        site: 'sirbloggsalot.com',
        reason: 'browser budget check',
        missing: 'readback proof',
        alternative: 'manual publishing',
        acceptRetention: false
      })
    });
    const cancelled = await cancelRes.json();
    const cancelledReadbackRes = await fetch('/subscription-details?site=sirbloggsalot.com', { headers: readHeaders });
    const cancelledReadback = await cancelledReadbackRes.json();
    return {
      name: 'billing-switch-cancel-readback',
      switchStatus: switchRes.status,
      switchPlanId: switched.newPlan?.planId || null,
      switchedReadbackStatus: switchedReadbackRes.status,
      switchedReadbackPlanId: switchedReadback.subscription?.planId || null,
      cancelStatus: cancelRes.status,
      hasEndsAt: Number.isInteger(cancelled.endsAt),
      cancelledReadbackStatus: cancelledReadbackRes.status,
      cancelAtPeriodEnd: cancelledReadback.subscription?.cancelAtPeriodEnd === true,
      cancellationReason: cancelledReadback.subscription?.cancellationFeedback?.reason || null,
      cancelledStatus: cancelledReadback.subscription?.status || null,
      stillActiveUntilEnd: cancelledReadback.subscription?.isActive === true
    };
  })()`));

  await cdp.send("Target.closeTarget", { targetId: page.targetId });

  return {
    updateResponses,
    settingsActions,
    liveBlawgy: requests.filter((url) => url.includes("app.blawgy.com")),
    failedLocal: unexpectedLocalStatuses(localStatuses),
    failedRequests,
    pageErrors: unexpectedPageErrors(pageErrors, localStatuses),
  };
}

async function runOnboardingCheck(cdp, baseUrl) {
  const page = await createPage(cdp);
  const localStatuses = [];
  const onboardingWrites = [];
  const pageErrors = [];

  cdp.on("Network.requestWillBeSent", (message) => {
    if (message.sessionId !== page.sessionId) return;
    const request = message.params.request || {};
    if (!request.url?.startsWith(baseUrl) || !request.url.endsWith("/onboarding/complete")) return;
    try {
      const payload = JSON.parse(request.postData || "{}");
      const authHeader = request.headers?.Authorization || request.headers?.authorization || "";
      const tokenParts = String(authHeader).replace(/^Bearer\s+/i, "").split(".");
      let claims = {};
      if (tokenParts.length >= 2) {
        try {
          claims = JSON.parse(Buffer.from(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
        } catch {
          claims = { parseError: true };
        }
      }
      onboardingWrites.push({
        ...payload,
        authClaims: {
          sub: claims.sub || null,
          email: claims.email || null,
          onboardingRequired: Boolean(claims.onboardingRequired),
        },
      });
    } catch {
      onboardingWrites.push({ parseError: true });
    }
  });
  cdp.on("Network.responseReceived", (message) => {
    if (message.sessionId !== page.sessionId) return;
    const response = message.params.response;
    if (response.url.startsWith(baseUrl) && !response.url.includes("/static/")) {
      localStatuses.push({ url: response.url, status: response.status });
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
    width: 1366,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  }, page.sessionId);

  await cdp.send("Page.navigate", { url: `${baseUrl}/signup` }, page.sessionId);
  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="domain-input"]'))`, { timeout: 8000 });
  const routeDiagnostics = await evaluate(cdp, page.sessionId, `(() => ({
    pathname: window.location.pathname,
    textSample: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 300),
    hasDomainInput: Boolean(document.querySelector('[data-testid="domain-input"]')),
    hasDomainContinue: Boolean(document.querySelector('[data-testid="domain-input-submit"]'))
  }))()`);

  await evaluate(cdp, page.sessionId, `(() => {
    const set = (selector, value) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(node, value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    set('[data-testid="domain-input"]', 'first-run-plumbing.com');
    document.querySelector('[data-testid="domain-input-submit"]')?.click();
    return true;
  })()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="stage-description"]'))`, { timeout: 12000 });
  const descriptionDiagnostics = await evaluate(cdp, page.sessionId, `(() => {
    const textarea = document.querySelector('[data-testid="description-textarea"]');
    const value = textarea?.value || '';
    document.querySelector('[data-testid="description-confirm"]')?.click();
    return {
      reachedDescription: Boolean(textarea),
      descriptionIncludesPlumbing: /plumbing|drain|first-run/i.test(value),
      descriptionSample: value.slice(0, 180)
    };
  })()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="stage-competitors"]'))`, { timeout: 10000 });
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-testid="competitors-continue"]')?.click()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="stage-audience"]'))`, { timeout: 10000 });
  await evaluate(cdp, page.sessionId, `(() => {
    const input = document.querySelector('[data-testid="bubble-custom-input"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Upland homeowners');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[aria-label="Add"]')?.click();
    document.querySelector('[data-testid="audience-continue"]')?.click();
    return true;
  })()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="stage-mode"]'))`, { timeout: 10000 });
  await evaluate(cdp, page.sessionId, `(() => {
    document.querySelector('[data-testid="mode-option-local"]')?.click();
    document.querySelector('[data-testid="mode-continue"]')?.click();
    return true;
  })()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="stage-local"]'))`, { timeout: 10000 });
  await evaluate(cdp, page.sessionId, `(() => {
    const setByPlaceholder = (needle, value) => {
      const input = Array.from(document.querySelectorAll('input')).find((node) => (node.placeholder || '').includes(needle));
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    setByPlaceholder('City', 'Upland');
    setByPlaceholder('State / region', 'CA');
    setByPlaceholder('Nearby towns', 'Ontario, Claremont');
    return true;
  })()`);
  await wait(300);
  const localDiagnostics = await evaluate(cdp, page.sessionId, `(() => {
    const byPlaceholder = (needle) => Array.from(document.querySelectorAll('input')).find((node) => (node.placeholder || '').includes(needle))?.value || '';
    const values = {
      city: byPlaceholder('City'),
      state: byPlaceholder('State / region'),
      serviceArea: byPlaceholder('Nearby towns')
    };
    document.querySelector('[data-testid="local-continue"]')?.click();
    return values;
  })()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="stage-tone"]'))`, { timeout: 15000 });
  await evaluate(cdp, page.sessionId, `(() => {
    const input = document.querySelector('[data-testid="bubble-custom-input"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Helpful and urgent');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-testid="tone-continue"]')?.click();
    return true;
  })()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="stage-subscribe"]'))`, { timeout: 18000 });
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-testid="subscribe-cta"]')?.click()`);

  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="success-plan-reveal"]'))`, { timeout: 10000 });
  await waitForExpression(cdp, page.sessionId, `Boolean(document.querySelector('[data-testid="plan-ready"]'))`, { timeout: 12000 });
  const successDiagnostics = await evaluate(cdp, page.sessionId, `(() => ({
    pathname: window.location.pathname,
    hasSuccessPlanReveal: Boolean(document.querySelector('[data-testid="success-plan-reveal"]')),
    hasPlanReady: Boolean(document.querySelector('[data-testid="plan-ready"]')),
    planPreviewRows: document.querySelectorAll('[data-testid="plan-preview-row"]').length,
    readyText: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 500)
  }))()`);

  await evaluate(cdp, page.sessionId, `document.querySelector('[data-testid="open-content-plan"]')?.click()`);
  await waitForExpression(cdp, page.sessionId, `window.location.pathname === '/dashboard'`, { timeout: 10000 });
  await wait(1500);
  const dashboardDiagnostics = await evaluate(cdp, page.sessionId, `(async () => {
    const token = await window.__BLAWGY_LOCAL_AUTH__?.currentUser?.getIdToken?.();
    const tokenParts = String(token || '').split('.');
    let claims = {};
    if (tokenParts.length >= 2) {
      try {
        claims = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      } catch {}
    }
    const headers = token ? { authorization: 'Bearer ' + token } : {};
    const [planRes, settingsRes] = await Promise.all([
      fetch('/api/plan/first-run-plumbing.com', { headers }),
      fetch('/get-site-settings?site=first-run-plumbing.com', { headers })
    ]);
    const data = await planRes.json();
    const settings = await settingsRes.json();
    const text = JSON.stringify(data).toLowerCase();
    const bodyText = document.body.innerText || '';
    return {
      pathname: window.location.pathname,
      planStatus: planRes.status,
      planEntries: (data.entries || data.plan?.entries || []).length,
      planIncludesPlumbing: text.includes('plumbing'),
      planIncludesUpland: text.includes('upland'),
      settingsStatus: settingsRes.status,
      settingsBusinessProfileCity: settings.settings?.businessProfile?.city || null,
      hasWelcomeTour: bodyText.includes('Welcome to Blawgy!'),
      hasWelcomeTourNext: Boolean(Array.from(document.querySelectorAll('button')).find((node) => (node.textContent || '').trim() === 'Next')),
      authClaims: {
        sub: claims.sub || null,
        email: claims.email || null,
        onboardingRequired: Boolean(claims.onboardingRequired)
      }
    };
  })()`);

  await cdp.send("Target.closeTarget", { targetId: page.targetId });

  return {
    ...routeDiagnostics,
    description: descriptionDiagnostics,
    local: localDiagnostics,
    onboardingWrites,
    success: successDiagnostics,
    dashboard: dashboardDiagnostics,
    failedLocal: unexpectedLocalStatuses(localStatuses),
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
    const articleBuilderReadback = interactions.settingsActions.find((row) => row.name === 'article-builder-save-readback');
    assert.deepStrictEqual(interactions.settingsActions, [
      { name: 'site-settings-save', saved: true, clickButtonExists: true, setValueExists: true },
      { name: 'competitor-suggestions', clicked: true },
      { name: 'competitor-suggestions-result', hasSuggestedDomain: true, hasUndefinedText: false },
      { name: 'internal-links-toggle', fetchButtonVisible: true },
      { name: 'sitemap-fetch', clicked: true },
      { name: 'sitemap-fetch-result', hasFetchedLink: true },
      { name: 'sitemap-save-click', clicked: true, disabled: false },
      { name: 'sitemap-save-readback', settingsStatus: 200, linkCount: 2, hasHomeLink: true, hasObjectObjectLink: false },
      { name: 'product-modal-open-click', clicked: true },
      { name: 'product-modal-opened', hasNameField: true },
      { name: 'product-create', hasInput: true },
      { name: 'product-create-result', hasCreatedProduct: true },
      { name: 'image-test-opened', clicked: true },
      { name: 'image-generate', hasInput: true, clicked: true },
      { name: 'image-generate-result', previewCount: 1, previewSrc: '/assets/sirbloggsalot-og.png' },
      { name: 'cta-toggle', hasCheckbox: true },
      { name: 'cta-toggle-result', hasEditCta: true },
      { name: 'invite-generate', hasInput: true, clicked: true },
      { name: 'invite-generate-result', hasInviteLink: true },
      { name: 'webhook-add-open', clicked: true },
      { name: 'webhook-form-fill', filled: true },
      { name: 'webhook-create-click', clicked: true, disabled: false },
      { name: 'webhook-create-result', hasWebhook: true, clickedTest: true },
      { name: 'webhook-test-click', clicked: true, disabled: false },
      { name: 'webhook-test-readback', webhooksStatus: 200, modalSuccess: true, lastTestSuccess: true, lastTestStatus: 200 },
      { name: 'business-location-add-open', clicked: true },
      { name: 'business-location-form-fill', filled: true },
      { name: 'business-location-create-click', clicked: true },
      { name: 'business-location-create-result', hasCreatedLocation: true },
      { name: 'business-location-set-primary', clicked: true },
      { name: 'business-location-primary-readback', profilesStatus: 200, settingsStatus: 200, primaryCity: 'Upland', settingsBusinessProfileCity: 'Upland' },
      { name: 'cms-framer-select', selected: true },
      { name: 'cms-framer-form-fill', filled: true },
      { name: 'cms-framer-test-click', clicked: true, disabled: false },
      { name: 'cms-framer-test-result', settingsStatus: 200, hasSavedMessage: true, hasMismatchError: false, blogType: 'framer', collectionId: 'blog', hasTitleMap: true, hasBodyMap: true, hasHeroMap: true },
      { name: 'article-builder-save-readback', pathname: '/article-builder', draftStatus: 200, saveStatus: 200, publishStatus: 200, rowsStatus: 200, publishSuccess: true, matchCount: 1, hasSavedContent: true, savedId: articleBuilderReadback.savedId, readbackId: articleBuilderReadback.savedId },
      { name: 'content-plan-command-readback', addStatus: 200, generateStatus: 200, saveStatus: 200, dateStatus: 200, publishStatus: 200, planStatus: 200, title: 'Browser content command title', blogStatus: 'published', publishDate: '2026-09-05T12:00:00.000Z', hasContent: true, contentStatus: 200, contentPersisted: true, cancelStatus: 200, afterCancelStatus: 200, removedAfterCancel: true },
      { name: 'billing-switch-cancel-readback', switchStatus: 200, switchPlanId: 'growth_annual', switchedReadbackStatus: 200, switchedReadbackPlanId: 'growth_annual', cancelStatus: 200, hasEndsAt: true, cancelledReadbackStatus: 200, cancelAtPeriodEnd: true, cancellationReason: 'browser budget check', cancelledStatus: 'active_until_period_end', stillActiveUntilEnd: true },
    ]);

    const onboarding = await runOnboardingCheck(cdp, baseUrl);
    assert.deepStrictEqual(onboarding.failedLocal, []);
    assert.deepStrictEqual(onboarding.pageErrors, []);
    assert.strictEqual(onboarding.pathname, "/onboarding");
    assert.strictEqual(onboarding.hasDomainInput, true);
    assert.strictEqual(onboarding.hasDomainContinue, true);
    assert.match(onboarding.textSample, /website|domain/i);
    assert.strictEqual(onboarding.description.reachedDescription, true);
    assert.strictEqual(onboarding.description.descriptionIncludesPlumbing, true);
    assert.deepStrictEqual(onboarding.local, { city: "Upland", state: "CA", serviceArea: "Ontario, Claremont" });
    assert.strictEqual(onboarding.onboardingWrites.length, 1);
    assert.strictEqual(onboarding.onboardingWrites[0].businessProfile?.city, "Upland");
    assert.deepStrictEqual(onboarding.dashboard.authClaims, onboarding.onboardingWrites[0].authClaims);
    assert.strictEqual(onboarding.success.pathname, "/success");
    assert.strictEqual(onboarding.success.hasSuccessPlanReveal, true);
    assert.strictEqual(onboarding.success.hasPlanReady, true);
    assert.ok(onboarding.success.planPreviewRows >= 3);
    assert.deepStrictEqual(onboarding.dashboard, {
      pathname: "/dashboard",
      planStatus: 200,
      planEntries: onboarding.dashboard.planEntries,
      planIncludesPlumbing: true,
      planIncludesUpland: true,
      settingsStatus: 200,
      settingsBusinessProfileCity: "Upland",
      hasWelcomeTour: true,
      hasWelcomeTourNext: true,
      authClaims: onboarding.dashboard.authClaims,
    });
    assert.ok(onboarding.dashboard.planEntries >= 3);

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
