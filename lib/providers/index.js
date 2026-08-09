"use strict";

// Aggregates the real external providers from the environment. Each client is
// null when its credentials are absent; every caller MUST degrade gracefully to
// the existing deterministic placeholder when a provider is unavailable or a
// call fails. This keeps the app fully functional with zero keys (dev / CI) and
// flips each subsystem to real data as keys are added.

const scrape = require("./scrape");
const { createLlm } = require("./llm");
const { createKeywords } = require("./keywords");

function createProviders(env = process.env) {
  const llm = createLlm(env);
  const keywords = createKeywords(env);
  return {
    scrape, // always available — server-side crawl, no key required
    llm, // null when no ANTHROPIC_API_KEY/OPENAI_API_KEY
    keywords, // null when no DATAFORSEO_LOGIN/PASSWORD
    llmAvailable: Boolean(llm),
    keywordsAvailable: Boolean(keywords),
    llmProvider: llm ? llm.provider : null,
  };
}

module.exports = { createProviders };
