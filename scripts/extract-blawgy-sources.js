const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mapPath = path.join(root, "research", "blawgy", "main.715d1cb0.js.map");
const outputRoot = path.join(root, "research", "blawgy", "app-src");

function cleanSourcePath(source) {
  return source
    .replace(/^webpack:\/\/blawgy\/\.\/src\//, "")
    .replace(/^webpack:\/\/blawgy\/\.\//, "")
    .replace(/^src\//, "")
    .replace(/\?.*$/, "");
}

function isAppSource(source) {
  if (!source || source.includes("node_modules")) return false;
  const cleaned = cleanSourcePath(source);
  return (
    /^(App|Views|components|contexts|utils|firebase|api|services|hooks|assets)\//.test(cleaned) ||
    /^[A-Z][A-Za-z0-9_-]+\.js$/.test(cleaned) ||
    /^App\.js$/.test(cleaned)
  );
}

async function main() {
  const map = JSON.parse(await fs.promises.readFile(mapPath, "utf8"));
  const sources = map.sources || [];
  const contents = map.sourcesContent || [];
  const written = [];

  await fs.promises.rm(outputRoot, { recursive: true, force: true });

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const content = contents[index];

    if (!isAppSource(source) || typeof content !== "string") {
      continue;
    }

    const relative = cleanSourcePath(source);
    const outputPath = path.join(outputRoot, relative);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, content);
    written.push(relative);
  }

  written.sort();
  await fs.promises.writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(written, null, 2)}\n`);
  console.log(`Wrote ${written.length} Blawgy app source files to ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
