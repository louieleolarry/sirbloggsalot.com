const assert = require("assert");
const fs = require("fs");
const path = require("path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

function assertContains(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

assertContains(app, /function animateFaqItem\(/, "FAQ accordion should use a dedicated animation helper.");
assertContains(app, /prefers-reduced-motion:\s*reduce/, "FAQ animation should respect reduced motion preferences.");
assertContains(app, /event\.preventDefault\(\)/, "FAQ summary clicks should be controlled for smooth open and close.");
assertContains(css, /\.faq-list details\.is-animating/, "FAQ details should have a scoped animation state style.");
assertContains(css, /summary::after[\s\S]*transition:/, "FAQ affordance should transition smoothly.");

console.log("FAQ accordion animation checks passed.");
