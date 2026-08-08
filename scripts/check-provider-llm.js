"use strict";

// Unit smoke test for the swappable LLM provider (lib/providers/llm.js).
//
// Runs with ZERO real network: every LLM call is driven through an injected
// fetchImpl that returns canned provider responses. No ANTHROPIC/OPENAI key is
// read from the real environment — keys are passed explicitly to createLlm.
//
// Run: node scripts/check-provider-llm.js

const assert = require("assert");
const { createLlm } = require("../lib/providers/llm");

function anthropicFetch(text) {
  return async () => ({ ok: true, status: 200, json: async () => ({ content: [{ text }] }) });
}

function openaiFetch(text) {
  return async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }] }) });
}

async function main() {
  // 1. No keys -> null.
  assert.strictEqual(createLlm({}), null, "createLlm with no keys must return null");

  // 2. Provider selection + models.
  const anthropic = createLlm({ ANTHROPIC_API_KEY: "x" });
  const openai = createLlm({ OPENAI_API_KEY: "x" });
  assert.strictEqual(anthropic.provider, "anthropic", "ANTHROPIC_API_KEY -> anthropic");
  assert.strictEqual(openai.provider, "openai", "OPENAI_API_KEY -> openai");
  assert.strictEqual(createLlm({ ANTHROPIC_API_KEY: "x", OPENAI_API_KEY: "y" }).provider, "anthropic", "anthropic wins when both keys set");
  assert.strictEqual(anthropic.model, "claude-sonnet-5", "anthropic default model");
  assert.strictEqual(openai.model, "gpt-4o", "openai default model");
  assert.strictEqual(createLlm({ OPENAI_API_KEY: "x", SIR_BLOGGS_LLM_MODEL: "gpt-4o-mini" }).model, "gpt-4o-mini", "model env override honored");

  // 3. complete() returns text for each provider shape (injected transport, no network).
  const aText = await anthropic.complete(
    { system: "s", prompt: "p" },
    { fetchImpl: anthropicFetch("hello from anthropic") }
  );
  assert.strictEqual(aText, "hello from anthropic", "anthropic complete() returns content text");

  const oText = await openai.complete(
    { system: "s", prompt: "p" },
    { fetchImpl: openaiFetch("hi from openai") }
  );
  assert.strictEqual(oText, "hi from openai", "openai complete() returns message content");

  // 4. JSON-in-text payload -> articleTitles returns a string array.
  const titles = await anthropic.articleTitles(
    { keyword: "local seo", siteContext: { product: "SEO articles" } },
    { fetchImpl: anthropicFetch('```json\n["First Title", "Second Title", "Third Title"]\n```') }
  );
  assert.ok(Array.isArray(titles), "articleTitles must return an array");
  assert.strictEqual(titles.length, 3, "articleTitles should parse 3 titles");
  assert.ok(titles.every((title) => typeof title === "string"), "every title must be a string");
  assert.strictEqual(titles[0], "First Title", "first parsed title matches");

  // Bonus: json:true through complete() parses to an object (defensive fence stripping).
  const parsed = await openai.complete(
    { system: "s", prompt: "p", json: true },
    { fetchImpl: openaiFetch('{"businessType":"local"}') }
  );
  assert.strictEqual(parsed.businessType, "local", "json:true must return a parsed object");

  console.log("LLM provider checks passed.");
}

main().catch((error) => {
  console.error("LLM provider check FAILED:", error.message);
  process.exit(1);
});
