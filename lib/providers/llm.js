"use strict";

// Swappable LLM provider. Selects, in order:
//   * SIR_BLOGGS_LLM_PROVIDER=codex  -> the local `codex` CLI (codex exec), no API key
//   * SIR_BLOGGS_LLM_PROVIDER=anthropic|openai (if the matching key is set)
//   * else ANTHROPIC_API_KEY -> anthropic, else OPENAI_API_KEY -> openai
//   * else null (callers degrade to placeholders)
// Every network/subprocess call accepts an injected transport (fetchImpl for HTTP,
// run for codex) so the unit test runs with zero real network or subprocess access.

const { spawn } = require("node:child_process");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function asArray(value) {
  if (Array.isArray(value)) return value.map((row) => String(row).trim()).filter(Boolean);
  if (value === null || value === undefined || value === "") return [];
  return [String(value).trim()].filter(Boolean);
}

function asText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value || "");
}

function clip(value, max = 6000) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function contextText(context = {}) {
  const lines = [];
  if (context.product) lines.push(`Product/service: ${asText(context.product)}`);
  if (context.description) lines.push(`Business: ${asText(context.description)}`);
  if (context.audience) lines.push(`Audience: ${asText(context.audience)}`);
  if (context.tone) lines.push(`Tone: ${asText(context.tone)}`);
  if (context.keyword) lines.push(`Primary keyword: ${asText(context.keyword)}`);
  return lines.join("\n");
}

function businessContextText(context = {}, keyword) {
  const lines = [];
  if (context.site) lines.push(`Business website: ${context.site}`);
  if (context.description) lines.push(`About the business: ${asText(context.description)}`);
  if (context.product) lines.push(`Products/services: ${asText(context.product)}`);
  if (context.audience) lines.push(`Target audience: ${asText(context.audience)}`);
  if (context.tone) lines.push(`Preferred tone: ${asText(context.tone)}`);
  if (context.city) lines.push(`Primary location/market: ${asText(context.city)}`);
  if (keyword) lines.push(`Primary keyword to target: ${keyword}`);
  return lines.length ? `Business context:\n${lines.join("\n")}` : "";
}

function parseJson(text) {
  let raw = String(text || "").trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    const start = raw.search(/[[{]/);
    const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (innerError) {
        // fall through to a clear error below
      }
    }
    throw new Error(`LLM did not return valid JSON: ${raw.slice(0, 120)}`);
  }
}

async function readJson(response, label) {
  if (!response || typeof response.json !== "function") {
    throw new Error(`${label} transport returned no response.`);
  }
  if (response.ok === false) {
    const detail = typeof response.text === "function" ? await response.text().catch(() => "") : "";
    throw new Error(`${label} request failed (${response.status}). ${String(detail).slice(0, 200)}`.trim());
  }
  return response.json();
}

// --- HTTP completer (Anthropic / OpenAI) ------------------------------------

function httpCompleter({ provider, apiKey, model, timeoutMs }) {
  const signal = () => (timeoutMs && typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined);
  async function callProvider({ system, prompt, maxTokens, temperature, fetchImpl }) {
    if (provider === "anthropic") {
      const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: system || undefined,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: signal(),
      });
      const data = await readJson(response, "Anthropic");
      const text = data && data.content && data.content[0] && data.content[0].text;
      if (typeof text !== "string") throw new Error("Anthropic response missing content text.");
      return text;
    }

    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: system || "" },
          { role: "user", content: prompt },
        ],
      }),
      signal: signal(),
    });
    const data = await readJson(response, "OpenAI");
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof text !== "string") throw new Error("OpenAI response missing message content.");
    return text;
  }

  return async function complete({ system, prompt, maxTokens = 1200, temperature = 0.7, json = false }, { fetchImpl = fetch } = {}) {
    const finalSystem = json
      ? `${system || ""}\nRespond with ONLY valid JSON. No prose, no markdown, no code fences.`.trim()
      : system || "";
    const text = await callProvider({ system: finalSystem, prompt, maxTokens, temperature, fetchImpl });
    return json ? parseJson(text) : text.trim();
  };
}

// --- codex CLI completer ----------------------------------------------------

function defaultCodexRun(bin, args, stdin, timeoutMs) {
  return new Promise((resolve, reject) => {
    let child;
    let settled = false;
    let timer = null;
    const done = (error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    try {
      child = spawn(bin, args, { stdio: ["pipe", "ignore", "pipe"] });
    } catch (error) {
      done(error);
      return;
    }
    // Bound the call: a hung/slow codex must not pin a request or wedge the worker.
    if (timeoutMs) {
      timer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch (_) { /* ignore */ }
        done(new Error(`codex exec timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }
    let stderr = "";
    child.on("error", (error) => done(error));
    if (child.stderr) child.stderr.on("data", (chunk) => { stderr = (stderr + String(chunk)).slice(-4096); });
    child.on("close", (code) => done(code === 0 ? null : new Error(`codex exec exited ${code}: ${stderr.slice(-300)}`)));
    if (child.stdin) {
      child.stdin.on("error", () => {});
      if (stdin) child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}

function codexCompleter({ bin, model, timeoutMs }) {
  // The codex CLI is an agent; keep it to pure generation and capture only its
  // final message via --output-last-message. maxTokens/temperature don't apply.
  return async function complete({ system, prompt, json = false } = {}, { run = defaultCodexRun } = {}) {
    const guard = "You are a content generator. Output ONLY the requested content as your final message. Do not run commands, edit files, browse, or use any tools.";
    const jsonRule = json ? "Respond with ONLY valid JSON. No prose, no markdown, no code fences." : "";
    const fullPrompt = [guard, system, jsonRule, prompt].filter(Boolean).join("\n\n");
    const outFile = path.join(os.tmpdir(), `sba-codex-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e9)}.txt`);
    const args = ["exec", "--skip-git-repo-check", "--ephemeral", "--color", "never", "-s", "read-only", "-o", outFile];
    if (model) args.push("-m", model);
    args.push("-");
    try {
      await run(bin, args, fullPrompt, timeoutMs);
      const text = await fsp.readFile(outFile, "utf8").catch(() => "");
      if (!String(text).trim()) throw new Error("codex returned no output.");
      return json ? parseJson(text) : String(text).trim();
    } finally {
      await fsp.rm(outFile, { force: true }).catch(() => {});
    }
  };
}

// Small async semaphore so parallel LLM calls (onboarding fires several at once)
// can't fork an unbounded number of codex processes / in-flight HTTP requests.
function makeSemaphore(max) {
  let active = 0;
  const waiters = [];
  const pump = () => {
    while (active < max && waiters.length) {
      active += 1;
      waiters.shift()();
    }
  };
  return async function run(fn) {
    await new Promise((resolve) => { waiters.push(resolve); pump(); });
    try {
      return await fn();
    } finally {
      active -= 1;
      pump();
    }
  };
}

// --- shared high-level helpers ----------------------------------------------

function makeHelpers(complete) {
  return {
    async businessDescription({ url, siteText }, transport = {}) {
      const system = "You are a marketing analyst who writes concise, factual business descriptions.";
      const prompt = [
        "Write a single-paragraph description (2-3 sentences) of the business below.",
        "Base it strictly on the provided content. Do not invent services.",
        url ? `URL: ${url}` : "",
        `Site content:\n${clip(siteText)}`,
      ].filter(Boolean).join("\n\n");
      return complete({ system, prompt, maxTokens: 400, temperature: 0.5 }, transport);
    },

    async detectBusinessType({ url, siteText }, transport = {}) {
      const system = "You classify businesses for an SEO tool.";
      const prompt = [
        "From the content, determine the business type and market. Return JSON:",
        '{"businessType": "local|ecommerce|saas|service|other", "market": {"countryCode": "US", "languageCode": "en", "locationName": "..."}, "locations": ["City, ST"]}',
        url ? `URL: ${url}` : "",
        `Site content:\n${clip(siteText)}`,
      ].filter(Boolean).join("\n\n");
      const data = await complete({ system, prompt, json: true, maxTokens: 400, temperature: 0.2 }, transport);
      return {
        businessType: String(data.businessType || "local"),
        market: data.market && typeof data.market === "object" ? data.market : { countryCode: "US", languageCode: "en", locationName: "United States" },
        locations: asArray(data.locations),
      };
    },

    async onboardingSuggestions({ siteText }, transport = {}) {
      const system = "You help onboard a business into a content-marketing tool.";
      const prompt = [
        "Suggest target audiences and tones for this business. Return JSON:",
        '{"audienceSuggestions": ["..."], "toneSuggestions": ["professional", "friendly"]}',
        `Site content:\n${clip(siteText)}`,
      ].join("\n\n");
      const data = await complete({ system, prompt, json: true, maxTokens: 400, temperature: 0.4 }, transport);
      return {
        audienceSuggestions: asArray(data.audienceSuggestions),
        toneSuggestions: asArray(data.toneSuggestions),
      };
    },

    async researchCompetitors({ url, siteText }, transport = {}) {
      const system = "You are an SEO competitor analyst.";
      const prompt = [
        "List up to 5 likely online competitors for this business. Return JSON:",
        '{"competitors": [{"domain": "example.com"}]}',
        url ? `URL: ${url}` : "",
        `Site content:\n${clip(siteText)}`,
      ].filter(Boolean).join("\n\n");
      const data = await complete({ system, prompt, json: true, maxTokens: 400, temperature: 0.3 }, transport);
      const rows = Array.isArray(data.competitors) ? data.competitors : [];
      return {
        competitors: rows
          .map((row) => ({ domain: String((row && row.domain) || row || "").trim() }))
          .filter((row) => row.domain),
      };
    },

    async articleTitles({ keyword, siteContext }, transport = {}) {
      const system = "You are an SEO editor who writes compelling, specific article titles.";
      const prompt = [
        `Write 6 article title options targeting the keyword "${keyword}".`,
        "Return JSON: an array of strings only.",
        contextText({ ...siteContext, keyword }),
      ].filter(Boolean).join("\n\n");
      const data = await complete({ system, prompt, json: true, maxTokens: 400, temperature: 0.8 }, transport);
      const rows = Array.isArray(data) ? data : Array.isArray(data.titles) ? data.titles : [];
      return asArray(rows);
    },

    async articleOutline({ title, keyword, siteContext }, transport = {}) {
      const system = "You are an SEO content strategist who builds article outlines.";
      const prompt = [
        `Create an outline for the article "${title}" targeting "${keyword}".`,
        '{"sections": [{"title": "...", "bullets": ["..."]}]}',
        contextText({ ...siteContext, keyword }),
      ].filter(Boolean).join("\n\n");
      const data = await complete({ system, prompt, json: true, maxTokens: 700, temperature: 0.6 }, transport);
      const sections = Array.isArray(data.sections) ? data.sections : [];
      return {
        sections: sections.map((section) => ({
          title: String((section && section.title) || "").trim(),
          bullets: asArray(section && section.bullets),
        })),
      };
    },

    async fullArticle({ title, outline, keyword, siteContext }, transport = {}) {
      const context = siteContext || {};
      const system = "You are an expert SEO content writer. You produce comprehensive, genuinely useful, publish-ready articles grounded in the specific business and its local market.";
      const prompt = [
        `Write a complete, in-depth SEO article titled "${title}" targeting the keyword "${keyword}".`,
        "Requirements:",
        "- 1800-2500 words, written for real readers: helpful, specific, and concrete (no fluff or filler).",
        "- Open with a compelling hook section, then a section titled \"Table of Contents\" whose content lists the other section titles.",
        "- Use H3 subsections, bullet lists, and at least one comparison table (HTML <table>) where it genuinely helps the reader.",
        "- Ground the article in THIS business and its local market: reference the business and its city/region naturally, and weave in a soft call-to-action to the business where appropriate. Do NOT invent facts about the business beyond the context provided.",
        "- End with a section titled \"Frequently Asked Questions\" whose content is several question/answer pairs (each question as an <h3>, each answer 2-4 sentences).",
        "- Each section's content must be valid HTML (<p>, <ul>, <ol>, <table>, <h3>). Do NOT repeat the section title inside its content (the title is returned separately).",
        "Return JSON ONLY in this exact shape:",
        '{"sections": [{"title": "Section Title", "content": "<p>...</p>"}], "metaDescription": "<= 155 characters"}',
        outline && outline.sections && outline.sections.length ? `Suggested outline (expand and improve as needed):\n${JSON.stringify(outline)}` : "",
        businessContextText(context, keyword),
      ].filter(Boolean).join("\n\n");
      const data = await complete({ system, prompt, json: true, maxTokens: 4000, temperature: 0.7 }, transport);
      const sections = Array.isArray(data.sections) ? data.sections : [];
      return {
        sections: sections.map((section) => ({
          title: String((section && section.title) || "").trim(),
          content: String((section && section.content) || "").trim(),
        })),
        metaDescription: String(data.metaDescription || "").trim(),
      };
    },

    async articleSection({ sectionTitle, articleTitle, siteContext }, transport = {}) {
      const system = "You are a professional writer who produces publish-ready HTML.";
      const prompt = [
        `Write the HTML body for the section "${sectionTitle}" of the article "${articleTitle}".`,
        "Return HTML only (<p>, <ul>, <h3> as needed). No markdown, no code fences.",
        contextText(siteContext),
      ].filter(Boolean).join("\n\n");
      return complete({ system, prompt, maxTokens: 1200, temperature: 0.7 }, transport);
    },
  };
}

function createLlm(env = process.env) {
  const explicit = String(env.SIR_BLOGGS_LLM_PROVIDER || "").toLowerCase();
  const anthropicKey = env.ANTHROPIC_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;

  let provider = null;
  if (explicit === "codex") provider = "codex";
  else if (explicit === "anthropic" && anthropicKey) provider = "anthropic";
  else if (explicit === "openai" && openaiKey) provider = "openai";
  else if (anthropicKey) provider = "anthropic";
  else if (openaiKey) provider = "openai";

  if (!provider) return null;

  const timeoutMs = Number(env.SIR_BLOGGS_LLM_TIMEOUT_MS) || 120000;
  const maxConcurrency = Math.max(1, Number(env.SIR_BLOGGS_LLM_MAX_CONCURRENCY) || 2);

  let baseComplete;
  let model;
  if (provider === "codex") {
    model = env.SIR_BLOGGS_LLM_MODEL || "codex-default";
    baseComplete = codexCompleter({ bin: env.SIR_BLOGGS_CODEX_BIN || "codex", model: env.SIR_BLOGGS_LLM_MODEL || "", timeoutMs });
  } else {
    const apiKey = provider === "anthropic" ? anthropicKey : openaiKey;
    model = env.SIR_BLOGGS_LLM_MODEL || (provider === "anthropic" ? "claude-sonnet-5" : "gpt-4o");
    baseComplete = httpCompleter({ provider, apiKey, model, timeoutMs });
  }

  // Cap concurrent LLM calls across all helpers sharing this instance.
  const semaphore = makeSemaphore(maxConcurrency);
  const complete = (opts, transport) => semaphore(() => baseComplete(opts, transport));

  return { provider, model, complete, ...makeHelpers(complete) };
}

module.exports = { createLlm };
