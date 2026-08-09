"use strict";

// CMS publisher dispatch. Normalizes the four per-platform modules (which diverged
// slightly in export shape) into one interface resolved by site.settings.blogType:
//   getPublisher(blogType) -> { blogType, hasCreds(conn), validate(conn,opts),
//     publish(article,conn,opts), update(id,article,conn,opts), listFields?(conn,opts) } | null
//   connFromSettings(blogType, settings, siteDomain) -> the per-platform conn object
// Callers use hasCreds() to decide real-publish vs. the existing local placeholder,
// so a site with no/partial creds keeps today's behavior (graceful degradation).

const wordpress = require("./wordpress");
const shopify = require("./shopify");
const webflow = require("./webflow");
const astro = require("./astro");

const webflowClient = webflow.createWebflow(); // no server key; per-conn methods

const REQUIRED = {
  wordpress: (c) => Boolean(c.site && c.username && c.appPassword),
  shopify: (c) => Boolean(c.siteName && (c.authToken || (c.shopifyClientId && c.shopifyClientSecret)) && c.blogId),
  webflow: (c) => Boolean(c.apiToken && c.collectionId),
  astro: (c) => Boolean(c.githubToken && c.repoOwner && c.repoName),
};

const ADAPTERS = {
  wordpress: {
    validate: (conn, opts) => wordpress.validate(conn, opts),
    publish: (article, conn, opts) => wordpress.publish(article, conn, opts),
    update: (id, article, conn, opts) => wordpress.update(id, article, conn, opts),
  },
  shopify: {
    validate: (conn, opts) => shopify.validate(conn, opts),
    publish: (article, conn, opts) => shopify.publish(article, conn, opts),
    update: (id, article, conn, opts) => shopify.update(id, article, conn, opts),
  },
  webflow: {
    validate: (conn, opts) => webflowClient.validate(conn, opts),
    publish: (article, conn, opts) => webflowClient.publish(article, conn, opts),
    update: (id, article, conn, opts) => webflowClient.update(id, article, conn, opts),
    listFields: (conn, opts) => webflowClient.listFields(conn, opts),
  },
  astro: {
    validate: (conn, opts) => { const a = astro.createAstro(conn); if (!a) throw invalidConn("astro"); return a.validate(conn, opts); },
    publish: (article, conn, opts) => { const a = astro.createAstro(conn); if (!a) throw invalidConn("astro"); return a.publish(article, conn, opts); },
    update: (id, article, conn, opts) => { const a = astro.createAstro(conn); if (!a) throw invalidConn("astro"); return a.update(id, article, conn, opts); },
  },
};

function invalidConn(platform) {
  const err = new Error(`${platform} connection is incomplete.`);
  err.status = 400;
  err.code = "invalid_connection";
  return err;
}

function getPublisher(blogType) {
  const key = String(blogType || "").toLowerCase();
  const adapter = ADAPTERS[key];
  if (!adapter) return null;
  return { blogType: key, hasCreds: (conn) => REQUIRED[key](conn || {}), ...adapter };
}

function connFromSettings(blogType, settings = {}, siteDomain) {
  const s = settings || {};
  switch (String(blogType || "").toLowerCase()) {
    case "wordpress":
      return { site: s.site || siteDomain, username: s.username, appPassword: s.appPassword };
    case "shopify":
      return {
        siteName: s.siteName, shopifyClientId: s.shopifyClientId, shopifyClientSecret: s.shopifyClientSecret,
        authToken: s.authToken, blogId: s.categoryId, author: s.author, apiVersion: s.shopifyApiVersion,
      };
    case "webflow":
      return { apiToken: s.apiToken, collectionId: s.collectionId, fields: s.fields, siteId: s.siteId };
    case "astro":
      return {
        githubToken: s.githubToken, repoOwner: s.repoOwner, repoName: s.repoName, branch: s.branch,
        contentDir: s.contentDir, commitMode: s.commitMode, authorName: s.authorName, authorEmail: s.authorEmail,
      };
    default:
      return {};
  }
}

module.exports = { getPublisher, connFromSettings };
