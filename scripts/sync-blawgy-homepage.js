const fs = require("fs/promises");
const path = require("path");

const root = path.join(__dirname, "..");
const blawgyOrigin = "https://blawgy.com";
const homepageUrl = `${blawgyOrigin}/`;
const indexPath = path.join(root, "index.html");

function absolutizePublicAsset(match, quote, assetPath) {
  return `${quote}${blawgyOrigin}/${assetPath}${quote}`;
}

function transformBlawgyHomepage(html) {
  let transformed = String(html || "");

  transformed = transformed.replace(
    /(["'])\/((?:_next|customer-logos|proof|app-screenshots|favicon|apple-touch-icon|og-image|manifest|feed|atom)[^"']*)\1/g,
    absolutizePublicAsset
  );

  transformed = transformed
    .replaceAll(`${blawgyOrigin}/blawgy-logo.svg`, "/assets/sirbloggsalot-logo.svg")
    .replaceAll("/blawgy-logo.svg", "/assets/sirbloggsalot-logo.svg")
    .replaceAll("https://app.blawgy.com/login", "/login")
    .replaceAll("https://app.blawgy.com/signup", "/signup");

  return transformed;
}

async function fetchBlawgyHomepage() {
  const response = await fetch(homepageUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "sirbloggsalot-local-parity/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${homepageUrl}: ${response.status}`);
  }

  return response.text();
}

async function main() {
  const liveHtml = await fetchBlawgyHomepage();
  const localHtml = transformBlawgyHomepage(liveHtml);
  await fs.writeFile(indexPath, localHtml);
  console.log(`Synced Blawgy homepage snapshot to ${path.relative(root, indexPath)}.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  fetchBlawgyHomepage,
  transformBlawgyHomepage,
};
