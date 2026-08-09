"use strict";

// Server-side site crawler used during onboarding.
//
// SSRF is the primary threat model here: the URL is attacker-influenced (a user
// types the domain they want us to scrape), so before we ever open a socket we
// resolve the host and refuse any address that points back into private,
// loopback, link-local, reserved, or cloud-metadata space. Redirects are
// followed manually so the same guard runs again on every hop's Location host.
//
// Dependency-free by design (prod is Node 18 with global fetch). All I/O is
// injectable so the unit test in scripts/check-provider-scrape.js runs with zero
// real network or DNS access.

const dns = require("node:dns");
const { URL } = require("node:url");

const DEFAULT_USER_AGENT = "SirBloggsAlotBot/1.0 (+https://sirbloggsalot.com)";
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const TEXT_CHAR_CAP = 20000;

function defaultDnsLookup(hostname, options) {
  return dns.promises.lookup(hostname, options);
}

function codedError(message, code, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause !== undefined) error.cause = cause;
  return error;
}

// --- URL normalization ------------------------------------------------------

function normalizeUrl(rawUrl) {
  const raw = String(rawUrl == null ? "" : rawUrl).trim();
  if (!raw) throw codedError("A URL is required.", "invalid_url");

  let working;
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):(\/\/)?/.exec(raw);
  if (!schemeMatch) {
    // Bare domain, e.g. "example.com" or "example.com/path".
    working = `https://${raw}`;
  } else {
    const scheme = schemeMatch[1].toLowerCase();
    const hasAuthority = Boolean(schemeMatch[2]);
    const rest = raw.slice(schemeMatch[0].length);
    if (scheme === "http" || scheme === "https") {
      working = raw;
    } else if (hasAuthority) {
      // ftp://, file://, ws:// … — an explicit non-http scheme.
      throw codedError(`Unsupported URL scheme: ${scheme}.`, "invalid_url");
    } else if (/^\d+([/?#]|$)/.test(rest)) {
      // Not a scheme at all — a bare "host:port" like "example.com:8080".
      working = `https://${raw}`;
    } else {
      // mailto:, javascript:, data:, tel: …
      throw codedError(`Unsupported URL scheme: ${scheme}.`, "invalid_url");
    }
  }

  let parsed;
  try {
    parsed = new URL(working);
  } catch (error) {
    throw codedError(`Could not parse URL: ${raw}`, "invalid_url", error);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw codedError(`Unsupported URL scheme: ${parsed.protocol.replace(/:$/, "")}.`, "invalid_url");
  }
  if (!parsed.hostname) throw codedError(`URL has no host: ${raw}`, "invalid_url");
  return parsed;
}

// --- IP parsing + private/reserved classification ---------------------------

function ipv4ToBytes(str) {
  const parts = String(str).split(".");
  if (parts.length !== 4) return null;
  const bytes = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    bytes.push(n);
  }
  return bytes;
}

function ipv6ToBytes(input) {
  let str = String(input).trim();
  const zone = str.indexOf("%");
  if (zone >= 0) str = str.slice(0, zone);
  if (!str.includes(":")) return null;

  // Fold an embedded IPv4 tail (e.g. ::ffff:127.0.0.1) into two hextets.
  if (str.includes(".")) {
    const lastColon = str.lastIndexOf(":");
    const v4 = ipv4ToBytes(str.slice(lastColon + 1));
    if (!v4) return null;
    const w1 = ((v4[0] << 8) | v4[1]).toString(16);
    const w2 = ((v4[2] << 8) | v4[3]).toString(16);
    str = `${str.slice(0, lastColon + 1)}${w1}:${w2}`;
  }

  const halves = str.split("::");
  if (halves.length > 2) return null;

  const parseWords = (segment) => {
    if (!segment) return [];
    const words = segment.split(":");
    const out = [];
    for (const word of words) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(word)) return null;
      const n = parseInt(word, 16);
      out.push((n >> 8) & 0xff, n & 0xff);
    }
    return out;
  };

  const head = parseWords(halves[0]);
  if (head === null) return null;

  let bytes;
  if (halves.length === 1) {
    bytes = head;
  } else {
    const tail = parseWords(halves[1]);
    if (tail === null) return null;
    const missing = 16 - head.length - tail.length;
    if (missing < 0) return null;
    bytes = [...head, ...new Array(missing).fill(0), ...tail];
  }
  if (bytes.length !== 16) return null;
  return bytes;
}

function isBlockedIPv4Bytes(bytes) {
  const [a, b] = bytes;
  if (a === 0) return true;                       // 0.0.0.0/8 "this network"
  if (a === 10) return true;                      // 10.0.0.0/8 private
  if (a === 127) return true;                     // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;        // 169.254.0.0/16 link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true;        // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 carrier-grade NAT
  return false;
}

function isBlockedIPv6Bytes(bytes) {
  const isZero = (from, to) => bytes.slice(from, to).every((x) => x === 0);
  // IPv4-mapped (::ffff:a.b.c.d) — classify the embedded v4.
  if (isZero(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isBlockedIPv4Bytes(bytes.slice(12));
  }
  if (isZero(0, 16)) return true;                 // :: unspecified
  if (isZero(0, 15) && bytes[15] === 1) return true; // ::1 loopback
  if ((bytes[0] & 0xfe) === 0xfc) return true;    // fc00::/7 unique local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  return false;
}

function isBlockedAddress(address) {
  const str = String(address == null ? "" : address).trim();
  if (str === "169.254.169.254") return true; // cloud metadata endpoint, explicit belt-and-suspenders
  const v4 = ipv4ToBytes(str);
  if (v4) return isBlockedIPv4Bytes(v4);
  const v6 = ipv6ToBytes(str);
  if (v6) return isBlockedIPv6Bytes(v6);
  // Fail closed: an address we cannot classify is not one we will connect to.
  return true;
}

async function assertHostAllowed(hostname, dnsLookup) {
  let records;
  try {
    records = await dnsLookup(hostname, { all: true });
  } catch (error) {
    throw codedError(`Could not resolve host: ${hostname}.`, "unreachable", error);
  }
  const list = Array.isArray(records) ? records : [records];
  if (list.length === 0) throw codedError(`Host did not resolve: ${hostname}.`, "unreachable");
  for (const record of list) {
    const address = record && typeof record === "object" ? record.address : record;
    if (isBlockedAddress(address)) {
      throw codedError(`Refusing to fetch private/reserved address for ${hostname}: ${address}.`, "blocked_domain");
    }
  }
}

// --- HTML extraction (regex/string ops, no deps) ----------------------------

function decodeEntities(str) {
  return String(str)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (m, d) => {
      try { return String.fromCodePoint(Number(d)); } catch (error) { return m; }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch (error) { return m; }
    })
    .replace(/&amp;/g, "&");
}

function extractTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return "";
  return decodeEntities(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractText(html) {
  let s = String(html || "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<template[\s\S]*?<\/template>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > TEXT_CHAR_CAP) s = s.slice(0, TEXT_CHAR_CAP);
  return s;
}

function attrValue(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const m = re.exec(tag);
  if (!m) return "";
  return m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] || "";
}

function extractFaviconUrl(html, baseUrl) {
  const linkRe = /<link\b[^>]*>/gi;
  let match;
  let href = "";
  while ((match = linkRe.exec(html))) {
    const rel = attrValue(match[0], "rel");
    if (rel && /icon/i.test(rel)) {
      const candidate = attrValue(match[0], "href");
      if (candidate) { href = candidate; break; }
    }
  }
  if (href) {
    try { return new URL(href, baseUrl).toString(); } catch (error) { /* fall through */ }
  }
  return new URL("/favicon.ico", baseUrl).toString();
}

// --- anti-bot / challenge detection -----------------------------------------

function looksLikeChallenge(headers, html) {
  const get = (name) => (headers && typeof headers.get === "function" ? String(headers.get(name) || "") : "");
  if (get("cf-mitigated").toLowerCase().includes("challenge")) return true;
  const body = String(html || "");
  const markers = [
    "cf-browser-verification",
    "cf_chl_opt",
    "_cf_chl_",
    "cf-challenge-running",
    "Checking your browser before accessing",
    "Attention Required! | Cloudflare",
    "Just a moment...",
  ];
  if (markers.some((marker) => body.includes(marker))) return true;
  if (get("server").toLowerCase().includes("cloudflare") && body.includes("challenge-platform")) return true;
  return false;
}

// --- body reading with a hard byte cap --------------------------------------

async function readCappedBody(response, maxBytes) {
  const stream = response.body;
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const bytes = Buffer.from(value.buffer ? value : value);
      if (total + bytes.length > maxBytes) {
        chunks.push(bytes.subarray(0, maxBytes - total));
        try { await reader.cancel(); } catch (error) { /* ignore */ }
        break;
      }
      chunks.push(bytes);
      total += bytes.length;
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  if (typeof response.text === "function") {
    const text = String((await response.text()) || "");
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }
  if (typeof response.arrayBuffer === "function") {
    const buf = Buffer.from(await response.arrayBuffer());
    return buf.subarray(0, maxBytes).toString("utf8");
  }
  return "";
}

// --- main entry point -------------------------------------------------------

async function fetchSite(rawUrl, {
  env = process.env,
  fetchImpl = fetch,
  dnsLookup = defaultDnsLookup,
  maxBytes = 2 * 1024 * 1024,
  timeoutMs = 10000,
  userAgent,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetchSite requires a fetch implementation (Node 18+ global fetch or an injected fetchImpl).");
  }

  const ua = userAgent || (env && env.SIR_BLOGGS_CRAWL_USER_AGENT) || DEFAULT_USER_AGENT;
  const startUrl = normalizeUrl(rawUrl);
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertHostAllowed(currentUrl.hostname, dnsLookup);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response;
      try {
        response = await fetchImpl(currentUrl.toString(), {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "user-agent": ua,
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9",
          },
        });
      } catch (error) {
        throw codedError(`Request to ${currentUrl.hostname} failed.`, "unreachable", error);
      }

      const status = Number(response.status);
      const headers = response.headers;

      if (REDIRECT_STATUSES.has(status)) {
        const location = headers && typeof headers.get === "function" ? headers.get("location") : null;
        if (location) {
          if (hop === MAX_REDIRECTS) throw codedError("Too many redirects.", "unreachable");
          let nextUrl;
          try {
            nextUrl = new URL(location, currentUrl.toString());
          } catch (error) {
            throw codedError(`Invalid redirect Location: ${location}`, "unreachable", error);
          }
          if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
            throw codedError(`Unsupported redirect scheme: ${nextUrl.protocol.replace(/:$/, "")}.`, "invalid_url");
          }
          currentUrl = nextUrl;
          continue; // re-run the SSRF guard on the new host at the top of the loop
        }
        // Redirect status with no Location — nothing we can follow.
      }

      if (status === 403 || status === 429) {
        throw codedError(`Anti-bot response (HTTP ${status}).`, "antibot");
      }

      const html = await readCappedBody(response, maxBytes);

      if (looksLikeChallenge(headers, html)) {
        throw codedError("Anti-bot challenge page detected.", "antibot");
      }
      if (status >= 400) {
        throw codedError(`Upstream returned HTTP ${status}.`, "unreachable");
      }

      const finalUrl = currentUrl.toString();
      return {
        url: startUrl.toString(),
        finalUrl,
        title: extractTitle(html),
        text: extractText(html),
        faviconUrl: extractFaviconUrl(html, currentUrl),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  throw codedError("Too many redirects.", "unreachable");
}

module.exports = { fetchSite };
