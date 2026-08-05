const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const required = [
  "<title>Be the brand AI recommends</title>",
  'data-section="hero"',
  'data-section="logo_cloud"',
  'data-section="pricing"',
  'data-section="faq"',
  'href="/login"',
  'href="/signup"',
  "/assets/sirbloggsalot-logo.svg",
  "Trusted by fast-growing companies.",
];

const missing = required.filter((needle) => !html.includes(needle));
if (missing.length) {
  console.error(`Missing required homepage markers: ${missing.join(", ")}`);
  process.exit(1);
}

const forbidden = [
  'class="assistant-widget"',
  'data-route-page="account"',
  "SEO content built around your brand, not just a keyword.",
];

const present = forbidden.filter((needle) => html.includes(needle));
if (present.length) {
  console.error(`Forbidden legacy homepage markers present: ${present.join(", ")}`);
  process.exit(1);
}

console.log("Route and homepage markers present.");
