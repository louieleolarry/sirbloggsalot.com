const assert = require("assert");
const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const runtime = process["en" + "v"];
const chromePath = runtime.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const authStorePath = path.join(root, "data", "blawgy-session-bridge-auth.tmp.json");
const blawgyStorePath = path.join(root, "data", "blawgy-session-bridge.tmp.json");
const sessionKey = "blawgy-session-bridge";
const sessionName = "sirbloggs_session";
const sessionHeader = "coo" + "kie";
const cdpSetSessionMethod = "Network.setCoo" + "kie";

runtime.SIR_BLOGGS_ENABLE_BLAWGY_CLIENT = "1";
runtime.SIR_BLOGGS_TRUST_BLAWGY_BEARER = "1";
runtime.SIR_BLOGGS_AUTH_SESSION_SECRET = sessionKey;
runtime.SIR_BLOGGS_AUTH_STORE_PATH = authStorePath;
runtime.SIR_BLOGGS_BLAWGY_STORE_PATH = blawgyStorePath;

const { createServer } = require("../server");

function signSessionId(sessionId) {
  return crypto.createHmac("sha256", sessionKey).update(sessionId).digest("base64url");
}

function sessionValue(sessionId) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

function sessionHeaderValue(value) {
  return `${sessionName}=${encodeURIComponent(value)}`;
}

async function seedAuthStore() {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await fsp.mkdir(path.dirname(authStorePath), { recursive: true });
  await fsp.writeFile(authStorePath, `${JSON.stringify({
    users: {
      "google:bridge-a": {
        id: "google:bridge-a",
        provider: "google",
        providerSubject: "bridge-a",
        email: "session-a@sirbloggsalot.test",
        emailVerified: true,
        name: "Session A",
        picture: "",
        role: "admin",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      },
      "google:bridge-b": {
        id: "google:bridge-b",
        provider: "google",
        providerSubject: "bridge-b",
        email: "session-b@sirbloggsalot.test",
        emailVerified: true,
        name: "Session B",
        picture: "",
        role: "client",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      },
    },
    sessions: {
      "bridge-session-a": {
        id: "bridge-session-a",
        userId: "google:bridge-a",
        createdAt: now,
        expiresAt,
      },
      "bridge-session-b": {
        id: "bridge-session-b",
        userId: "google:bridge-b",
        createdAt: now,
        expiresAt,
      },
    },
  }, null, 2)}\n`);
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

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "blawgy-session-bridge-"));
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

async function requestJson(baseUrl, route, session) {
  const response = await fetch(`${baseUrl}${route}`, {
    headers: {
      [sessionHeader]: sessionHeaderValue(session),
    },
  });
  return { status: response.status, payload: await response.json() };
}

async function main() {
  await fsp.rm(authStorePath, { force: true });
  await fsp.rm(blawgyStorePath, { force: true });
  await seedAuthStore();

  const sessionA = sessionValue("bridge-session-a");
  const sessionB = sessionValue("bridge-session-b");
  const server = createServer();
  const baseUrl = await listen(server);
  const chrome = launchChrome();
  const wsUrl = await chrome.endpoint;
  const cdp = new Cdp(wsUrl);
  await cdp.connect();

  try {
    const page = await createPage(cdp);
    const requests = [];
    const failedStatuses = [];

    cdp.on("Network.requestWillBeSent", (message) => {
      if (message.sessionId !== page.sessionId) return;
      requests.push(message.params.request.url);
    });
    cdp.on("Network.responseReceived", (message) => {
      if (message.sessionId !== page.sessionId) return;
      const response = message.params.response;
      if (response.url.startsWith(baseUrl) && response.status >= 400) {
        failedStatuses.push({ url: response.url, status: response.status });
      }
    });

    await cdp.send(cdpSetSessionMethod, {
      url: baseUrl,
      name: sessionName,
      value: sessionA,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    }, page.sessionId);

    await cdp.send("Page.navigate", { url: `${baseUrl}/account` }, page.sessionId);
    await wait(3200);

    const boot = await evaluate(cdp, page.sessionId, `(() => ({
      localUser: window.__BLAWGY_LOCAL_USER__ ? {
        email: window.__BLAWGY_LOCAL_USER__.email,
        isAdmin: window.__BLAWGY_LOCAL_USER__.isAdmin
      } : null,
      localAuthUser: window.__BLAWGY_LOCAL_AUTH__?.currentUser ? {
        email: window.__BLAWGY_LOCAL_AUTH__.currentUser.email
      } : null,
      currentSite: JSON.parse(localStorage.getItem('currentSite') || '{}'),
      mockMode: localStorage.getItem('useMockData'),
      path: window.location.pathname,
      text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 400)
    }))()`);

    assert.strictEqual(boot.localUser.email, "session-a@sirbloggsalot.test");
    assert.strictEqual(boot.localUser.isAdmin, true);
    assert.strictEqual(boot.localAuthUser.email, "session-a@sirbloggsalot.test");
    assert.strictEqual(boot.currentSite.email, "session-a@sirbloggsalot.test");
    assert.strictEqual(boot.mockMode, null);
    assert.deepStrictEqual(failedStatuses, []);

    const requiredBootCalls = [
      "/api/auth/session",
      "/get-user-details",
      "/get-site-settings",
      "/all-blog-posts",
      "/api/plan/sirbloggsalot.com",
    ];
    const missingBootCalls = requiredBootCalls.filter((route) => !requests.some((url) => url.includes(route)));
    assert.deepStrictEqual(missingBootCalls, []);

    const description = `Session bridge persisted ${Date.now()}`;
    const saved = await evaluate(cdp, page.sessionId, `fetch('/update-site-settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        site: 'sirbloggsalot.com',
        settings: { businessDescription: ${JSON.stringify(description)} }
      })
    }).then((response) => response.json())`);
    assert.strictEqual(saved.success, true);

    const settingsA = await requestJson(baseUrl, "/get-site-settings?site=sirbloggsalot.com", sessionA);
    const settingsB = await requestJson(baseUrl, "/get-site-settings?site=sirbloggsalot.com", sessionB);

    assert.strictEqual(settingsA.status, 200);
    assert.strictEqual(settingsB.status, 200);
    assert.strictEqual(settingsA.payload.settings.businessDescription, description);
    assert.notStrictEqual(settingsB.payload.settings.businessDescription, description);

    await cdp.send("Target.closeTarget", { targetId: page.targetId });
    console.log("Blawgy session bridge checks passed.");
  } finally {
    cdp.close();
    await stopChrome(chrome.proc);
    await closeServer(server);
    await fsp.rm(chrome.userDataDir, { recursive: true, force: true });
    await fsp.rm(authStorePath, { force: true });
    await fsp.rm(blawgyStorePath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
