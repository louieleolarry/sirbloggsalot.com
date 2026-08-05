const assert = require("assert");
const fs = require("fs/promises");
const path = require("path");
const { fetchBlawgyHomepage, transformBlawgyHomepage } = require("./sync-blawgy-homepage");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");

function normalize(html) {
  return String(html || "").replace(/\r\n/g, "\n").trim();
}

async function main() {
  const [liveHtml, localHtml] = await Promise.all([
    fetchBlawgyHomepage(),
    fs.readFile(indexPath, "utf8"),
  ]);
  const expected = transformBlawgyHomepage(liveHtml);

  assert.strictEqual(
    normalize(localHtml),
    normalize(expected),
    "Local homepage is not the transformed Blawgy homepage snapshot. Run npm run sync:blawgy-homepage."
  );

  assert.ok(localHtml.includes("<title>Be the brand AI recommends</title>"));
  assert.ok(localHtml.includes('data-section="hero"'));
  assert.ok(localHtml.includes('data-section="pricing"'));
  assert.ok(localHtml.includes("/assets/sirbloggsalot-logo.svg"));
  assert.ok(!localHtml.includes('class="assistant-widget"'));
  assert.ok(!localHtml.includes('data-route-page="account"'));

  console.log("Blawgy homepage parity check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
