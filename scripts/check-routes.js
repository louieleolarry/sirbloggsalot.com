const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const required = [
  'data-primary-nav',
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

console.log("Route and homepage markers present.");
