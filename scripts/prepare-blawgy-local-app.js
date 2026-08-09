const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const discoveryDir = require("./discovery-dir");
const sourceDir = path.join(discoveryDir, "research", "blawgy");
const staticJsDir = path.join(root, "static", "js");
const staticCssDir = path.join(root, "static", "css");
const staticMediaDir = path.join(root, "static", "media");

fs.mkdirSync(staticJsDir, { recursive: true });
fs.mkdirSync(staticCssDir, { recursive: true });
fs.mkdirSync(staticMediaDir, { recursive: true });

fs.copyFileSync(
  path.join(sourceDir, "main.371b1f5a.css"),
  path.join(staticCssDir, "main.371b1f5a.css")
);

for (const asset of [
  "blawgy-logo.8629adf7cf1c32596a3fee67bdcb4741.svg",
  "stock-sample-image.4696bc76dae75f1059ad.jpg",
  "ai-sample-image.4970afabcef514a10331.jpeg",
  "fonnts.com-Articulat_CF_Bold.93a8fd960ebd1f8a34fc.otf",
  "fonnts.com-Articulat_CF_Light.79754df9f29823981a81.otf",
  "fonnts.com-Articulat_CF_Medium.de6ce0674a80f2bc2e46.otf",
  "fonnts.com-Articulat_CF_Normal.6da55ac404b39d275186.otf",
  "fonnts.com-Articulat_CF_Regular.6d2212da4d006d124c6d.otf",
]) {
  fs.copyFileSync(
    path.join(sourceDir, "static", "media", asset),
    path.join(staticMediaDir, asset)
  );
}

const sourceBundle = path.join(sourceDir, "main.715d1cb0.js");
const localBundle = path.join(staticJsDir, "main.715d1cb0.local.js");
let bundle = fs.readFileSync(sourceBundle, "utf8");

const dashboardStrategyButton = `(0,Qt.jsx)(mS,{content:"Configure your content strategy",children:(0,Qt.jsxs)("button",{onClick:()=>Be(!0),className:"flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors","data-testid":"strategy-button",children:[(0,Qt.jsx)(oh,{size:15}),(0,Qt.jsx)("span",{className:"hidden sm:inline",children:"Strategy"})]})})`;
const dashboardWelcomeTourButton = `(0,Qt.jsx)(mS,{content:"Open the welcome walkthrough",children:(0,Qt.jsx)("button",{onClick:()=>{const e=Array.from(document.querySelectorAll("button")).find((e=>(e.title||"").includes("Guided walkthroughs")));e&&e.click(),setTimeout((()=>{const e=Array.from(document.querySelectorAll("button")).find((e=>(e.textContent||"").includes("Getting Started")));e&&e.click()}),60)},"data-testid":"welcome-tour-start",className:"flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors",children:"Start welcome tour"})})`;

const replacements = [
  [
    'baseURL:"https://app.blawgy.com"',
    "baseURL:window.__BLAWGY_API_BASE__||window.location.origin",
  ],
  ["marketing@gymshark.com", "owner@sirbloggsalot.com"],
  ["demo@gymshark.com", "owner@sirbloggsalot.com"],
  ["gymshark.com", "sirbloggsalot.com"],
  [
    "const{cta:n}=se,r=(0,Jp.A)(se,KO),i=(0,c.A)((0,c.A)((0,c.A)({},r),e||{}),{},{imageStyle:{",
    "const{cta:n}=se,r=(0,Jp.A)(se,KO),__blawgyOverrides=e&&e.nativeEvent?null:e,i=(0,c.A)((0,c.A)((0,c.A)({},r),__blawgyOverrides||{}),{},{imageStyle:{",
  ],
  [
    'N5={email:"owner@sirbloggsalot.com",sites:[{site:"sirbloggsalot.com",email:"owner@sirbloggsalot.com"}],blogType:"wordpress",subscription:{isActive:!0,plan:"growth",credits:847,maxCredits:1e3}},A5={site:"sirbloggsalot.com",email:"owner@sirbloggsalot.com",settings:{site:"sirbloggsalot.com",blogType:"wordpress",product:Eh.product,gsc:{access_token:"mock_gsc_token",connected_site:"sc-domain:sirbloggsalot.com"}},success:!0,onboard:!0}',
    'N5=window.__BLAWGY_LOCAL_USER__||{email:"owner@sirbloggsalot.com",sites:[{site:"sirbloggsalot.com",email:"owner@sirbloggsalot.com"}],blogType:"wordpress",subscription:{isActive:!0,plan:"growth",credits:847,maxCredits:1e3}},A5=window.__BLAWGY_LOCAL_SITE__||{site:"sirbloggsalot.com",email:"owner@sirbloggsalot.com",settings:{site:"sirbloggsalot.com",blogType:"wordpress",product:Eh.product,gsc:{access_token:"mock_gsc_token",connected_site:"sc-domain:sirbloggsalot.com"}},success:!0,onboard:!0}',
  ],
  [
    'let s=null;if(!a){const e=(0,r.Wp)(o);s=(0,i.xI)(e),(0,i.oM)(s,i.F0).catch((e=>{console.error("Error setting auth persistence:",e)}))}const l=()=>{window.__blawgyIntentionalSignOut=!0},c=()=>!0===window.__blawgyIntentionalSignOut,u=()=>{window.__blawgyIntentionalSignOut=!1}',
    'let s=window.__BLAWGY_LOCAL_AUTH__||null;if(!a&&!s){const e=(0,r.Wp)(o);s=(0,i.xI)(e),(0,i.oM)(s,i.F0).catch((e=>{console.error("Error setting auth persistence:",e)}))}const l=()=>{window.__blawgyIntentionalSignOut=!0},c=()=>!0===window.__blawgyIntentionalSignOut,u=()=>{window.__blawgyIntentionalSignOut=!1}',
  ],
  [
    'TC="https://app.blawgy.com"',
    'TC=window.__BLAWGY_API_BASE__||window.location.origin',
  ],
  [
    '.concat("https://app.blawgy.com/gsc/oauth2callback","&scope=")',
    '.concat((window.__BLAWGY_API_BASE__||window.location.origin)+"/gsc/oauth2callback","&scope=")',
  ],
  [
    '"".concat("https://app.blawgy.com","/api/assistant/flow/")',
    '"".concat(window.__BLAWGY_API_BASE__||window.location.origin,"/api/assistant/flow/")',
  ],
  [
    'const S5="https://app.blawgy.com"',
    'const S5=window.__BLAWGY_API_BASE__||window.location.origin',
  ],
  [
    '"".concat("https://app.blawgy.com","/api/assistant/chat")',
    '"".concat(window.__BLAWGY_API_BASE__||window.location.origin,"/api/assistant/chat")',
  ],
  [
    "https://app.blawgy.com/blog-posts",
    "/blog-posts",
  ],
  [
    dashboardStrategyButton,
    `${dashboardWelcomeTourButton},${dashboardStrategyButton}`,
  ],
];

for (const [from, to] of replacements) {
  if (!bundle.includes(from)) {
    throw new Error(`Blawgy local bundle marker not found: ${from}`);
  }
  bundle = bundle.split(from).join(to);
}

bundle = bundle.replace(/\n?\/\/# sourceMappingURL=main\.715d1cb0\.js\.map\s*$/, "");

fs.writeFileSync(localBundle, bundle);
console.log(`Prepared ${path.relative(root, localBundle)}`);
