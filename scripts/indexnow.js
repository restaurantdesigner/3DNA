#!/usr/bin/env node
/*
 * IndexNow: tells Bing, Yandex, Seznam, Naver and the other IndexNow engines which URLs changed,
 * so they recrawl them sooner. (Google does not use IndexNow; it reads the sitemap.)
 *
 *   node scripts/indexnow.js --since 2026-11-23   # sitemap URLs whose lastmod is on/after that date
 *   node scripts/indexnow.js --all                 # every sitemap URL
 *   node scripts/indexnow.js --dry-run --all       # print what would be sent, send nothing
 *
 * Run it only AFTER the deploy is live: the engines fetch the key file below from https://3dna.es
 * to verify the submission. Submit changed pages only; resubmitting unchanged URLs does not help.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const HOST = "3dna.es";
const KEY = "10a0010ec7cd48b318ac1f4a9c443fbb";              // public by design: served at /<KEY>.txt
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const since = args.includes("--since") ? args[args.indexOf("--since") + 1] : null;
const all = args.includes("--all");
const dry = args.includes("--dry-run");
if (!since && !all) { console.error("Use --since YYYY-MM-DD or --all (add --dry-run to preview)."); process.exit(2); }

const root = path.join(__dirname, "..");
if (fs.readFileSync(path.join(root, `${KEY}.txt`), "utf8").trim() !== KEY) { console.error("key file does not match"); process.exit(2); }
const xml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const urls = (xml.match(/<url>[\s\S]*?<\/url>/g) || []).map((b) => ({
  loc: (b.match(/<loc>([^<]+)<\/loc>/) || [])[1],
  lastmod: (b.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || "",
})).filter((u) => u.loc && (all || u.lastmod >= since)).map((u) => u.loc.replace(/&amp;/g, "&"));

if (!urls.length) { console.log("No URLs to submit."); process.exit(0); }
console.log(`${urls.length} URL(s):\n  ${urls.join("\n  ")}`);
if (dry) process.exit(0);

(async () => {
  for (let i = 0; i < urls.length; i += 10000) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls.slice(i, i + 10000) }),
    });
    // 200 = received, 202 = received (key validation pending); 403 = key not found at keyLocation
    console.log(`IndexNow responded HTTP ${res.status} ${res.statusText}`);
    if (res.status >= 400) process.exitCode = 1;
  }
})();
