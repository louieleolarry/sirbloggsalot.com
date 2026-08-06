const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const required = [
  'class="promo-bar"',
  "Annual plan special pricing ends August 31st",
  'data-primary-nav',
  "Be the brand",
  "AI recommends.",
  "Get recommended in ChatGPT, Google AI, Claude, Perplexity &amp; Gemini",
  'id="features"',
  'id="pricing"',
  'id="faq"',
  'href="/blog"',
  'href="/login"',
  'href="/signup"',
  'class="assistant-widget"',
  'data-auth-login',
  'data-auth-account',
  'data-route-page="account"',
  'data-account-email',
  'data-account-view="settings"',
  'data-settings-tab="cms"',
  "Content Plan",
  "CMS Connect",
];

const missing = required.filter((needle) => !html.includes(needle));
if (missing.length) {
  console.error(`Missing required homepage markers: ${missing.join(", ")}`);
  process.exit(1);
}

const forbidden = [
  'data-section="logo_cloud"',
  'data-section="example_articles"',
  'data-section="bottom_cta"',
  "SEO content built around your brand, not just a keyword.",
  "self.__next_f.push",
  "/_next/static/chunks/",
];

const present = forbidden.filter((needle) => html.includes(needle));
if (present.length) {
  console.error(`Forbidden legacy homepage markers present: ${present.join(", ")}`);
  process.exit(1);
}

console.log("Route and homepage markers present.");
