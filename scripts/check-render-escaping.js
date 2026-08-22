const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "app.js");
const app = fs.readFileSync(appPath, "utf8");

const requiredMarkers = [
  "function escapeHtml",
  "function escapeAttribute",
  "escapeHtml(item.title)",
  "const publicLink",
  "item.status === \"published\" && isLocalBlogPath(item.publicPath)",
  "Open post",
  "escapeAttribute(item.publicPath)",
  "escapeHtml(topic.title)",
  "escapeHtml(product.name)",
  "escapeHtml(location.name)",
  "escapeHtml(memberName)",
  "escapeHtml(memberInitial)",
  "escapeHtml(invite.email)",
  "escapeHtml(invoice.plan)",
  "escapeHtml(search.propertyUrl)",
  "escapeHtml(rowData.label)",
  "escapeHtml(keyword.keyword)",
  "escapeHtml(mention.source)",
  "escapeHtml(ticket.subject)",
  "escapeHtml(images.samplePrompt)",
  "escapeHtml(cms.platform || \"Platform not selected\")",
  "escapeHtml(cms.websiteUrl || \"No website URL\")",
  "escapeHtml(inventoryFeed.retailerName || \"Inventory feed\")",
  "escapeHtml(inventoryFeed.accountId || \"No account id\")",
  "escapeHtml(inventoryFeed.lastError)",
  "card.dataset.planItemId = item.id",
  "escapeAttribute(topic.id)",
  "escapeAttribute(product.id)",
  "escapeAttribute(location.id)",
  "escapeAttribute(invite.id)",
  "escapeAttribute(ticket.id)",
];

const missing = requiredMarkers.filter((marker) => !app.includes(marker));
if (missing.length) {
  console.error(`Missing render escaping markers: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Render escaping checks passed.");
