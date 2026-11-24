#!/usr/bin/env node
/*
 * 3DNA technical SEO audit — run after every build or deploy.
 *
 *   node scripts/seo-audit.js                       # local: emulates GitHub Pages over the git-tracked files
 *   node scripts/seo-audit.js --base https://3dna.es # production (read-only GET requests)
 *   options: --json <file>   write the full report as JSON
 *            --no-assets     skip checking images / scripts / styles / videos referenced by pages
 *            --quiet         only the summary and errors
 *
 * Checks: robots.txt (sitemap directive, public pages and rendering assets allowed), sitemap.xml
 * (every URL 200, not redirected, canonical = itself, not noindex, hreflang alternates exist and are
 * reciprocal), every page reachable by links (HTTP status, title, meta description, duplicates,
 * exactly one H1, html lang, canonical, hreflang + x-default, Open Graph / X card, JSON-LD parses
 * and has @context/@type, images without alt, unexpected noindex), broken internal links and
 * assets, internal links that redirect, and indexable pages missing from the sitemap.
 * Exit code 1 when there are errors (warnings do not fail).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://3dna.es";
const LANGS = ["es", "en", "ru", "uk"];
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const flag = (name) => args.includes(name);
const QUIET = flag("--quiet");
const CHECK_ASSETS = !flag("--no-assets");

// pages that are published on purpose but must not be indexed (they carry noindex or are blocked)
const NOT_INDEXED = [/^\/404\.html$/, /^\/prototipos\//, /^\/demos\//, /^\/assets\/partials\//, /\/(washroom-3d|aseos-3d)\/$/, /\/(calculator|calculadora)\/$/];
// marketing proposals addressed to a prospective client (assets/data/marketing-projects.json, index:false)
{
  const mp = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/marketing-projects.json"), "utf8"));
  const tr = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/i18n/translations.json"), "utf8").replace(/^﻿/, ""));
  for (const p of mp.projects) if (p.published && p.index === false) for (const l of p.langs)
    NOT_INDEXED.push(new RegExp(`^/${l}/${tr[l].marketingPage.slug}/${p.slug}/$`));
}

// ---------------- local GitHub Pages emulation (only what git publishes) ----------------
function localServer() {
  const files = new Set(execSync("git ls-files -c", { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean)
    .filter((f) => fs.existsSync(path.join(ROOT, f))));
  const dirs = new Set();
  files.forEach((f) => { const parts = f.split("/"); for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/")); });
  const type = (f) => ({ ".html": "text/html; charset=utf-8", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4" }[path.extname(f).toLowerCase()] || "application/octet-stream");
  const send = (res, code, f, headers = {}) => {
    res.writeHead(code, { "Content-Type": type(f), ...headers });
    res.end(fs.readFileSync(path.join(ROOT, f)));
  };
  const srv = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const rel = p.replace(/^\/+/, "");
    if (rel === "" || p.endsWith("/")) {
      const f = rel + "index.html";
      if (files.has(f)) return send(res, 200, f);
    } else if (files.has(rel)) return send(res, 200, rel);
    else if (dirs.has(rel) && files.has(rel + "/index.html")) { res.writeHead(301, { Location: p + "/" }); return res.end(); }
    else if (files.has(rel + ".html")) return send(res, 200, rel + ".html");
    if (files.has("404.html")) return send(res, 404, "404.html");
    res.writeHead(404); res.end();
  });
  return new Promise((resolve) => srv.listen(0, "127.0.0.1", () => resolve({ srv, files, base: `http://127.0.0.1:${srv.address().port}` })));
}

// ---------------- helpers ----------------
const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return m ? decode(m[2] ?? m[3] ?? m[4]) : null; };
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) || [];
const stripScripts = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
const text = (s) => decode(String(s).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url, method = "GET") {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { method, redirect: "manual", headers: { "User-Agent": "3DNA-SEO-Audit/1.0 (+https://3dna.es/)" } });
      const ct = r.headers.get("content-type") || "";
      const body = method === "GET" && /html|xml|text\/plain/.test(ct) ? await r.text() : (method === "GET" ? (await r.arrayBuffer(), "") : "");
      return { status: r.status, location: r.headers.get("location"), ct, xrobots: r.headers.get("x-robots-tag"), body };
    } catch (e) {
      if (attempt === 2) return { status: 0, error: String(e.message || e), body: "" };
      await new Promise((ok) => setTimeout(ok, 500 * (attempt + 1)));
    }
  }
}

// ---------------- robots.txt ----------------
function parseRobots(txt) {
  const groups = []; let cur = null; const sitemaps = [];
  txt.split(/\r?\n/).forEach((line) => {
    const l = line.replace(/#.*/, "").trim(); if (!l) return;
    const [k, ...rest] = l.split(":"); const v = rest.join(":").trim(); const key = k.trim().toLowerCase();
    if (key === "user-agent") { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); }
    else if (key === "allow" || key === "disallow") { if (cur) cur.rules.push({ allow: key === "allow", path: v }); }
    else if (key === "sitemap") sitemaps.push(v);
  });
  return { groups, sitemaps };
}
function robotsAllows(robots, agent, p) {
  const g = robots.groups.find((x) => x.agents.includes(agent.toLowerCase())) || robots.groups.find((x) => x.agents.includes("*"));
  if (!g) return true;
  let best = null;
  g.rules.forEach((r) => {
    if (!r.path) return;
    const re = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(p) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  });
  return !best || best.allow;
}

// ---------------- main ----------------
(async () => {
  const baseArg = opt("--base");
  let server = null, BASE = baseArg ? baseArg.replace(/\/$/, "") : null;
  if (!BASE) { server = await localServer(); BASE = server.base; }
  const local = !!server;
  const toLocal = (u) => u.startsWith(SITE) ? BASE + u.slice(SITE.length) : u;
  const toSite = (u) => u.startsWith(BASE) ? SITE + u.slice(BASE.length) : u;
  const errors = [], warnings = [], info = [];
  const E = (where, msg) => errors.push({ where, msg }), W = (where, msg) => warnings.push({ where, msg });

  // robots
  const rb = await get(BASE + "/robots.txt");
  let robots = { groups: [], sitemaps: [] };
  if (rb.status !== 200) E("/robots.txt", `HTTP ${rb.status}`);
  else {
    robots = parseRobots(rb.body);
    if (!robots.sitemaps.includes(SITE + "/sitemap.xml")) E("/robots.txt", "no absolute Sitemap: https://3dna.es/sitemap.xml directive");
    ["/assets/css/main.css", "/assets/js/main.js", "/images/", "/img/", "/videos/"].forEach((p) => { if (!robotsAllows(robots, "Googlebot", p)) E("/robots.txt", `rendering resource blocked for Googlebot: ${p}`); });
  }

  // sitemap
  const sm = await get(BASE + "/sitemap.xml");
  const smUrls = new Map();   // loc -> { alts: {lang: href}, images: [] }
  if (sm.status !== 200) E("/sitemap.xml", `HTTP ${sm.status}`);
  else {
    if (!/<urlset\b/.test(sm.body)) E("/sitemap.xml", "not a <urlset> sitemap");
    (sm.body.match(/<url>[\s\S]*?<\/url>/g) || []).forEach((block) => {
      const loc = decode((block.match(/<loc>([^<]+)<\/loc>/) || [])[1] || "").trim();
      if (!loc) return E("/sitemap.xml", "<url> without <loc>");
      if (smUrls.has(loc)) W("/sitemap.xml", `duplicate <loc> ${loc}`);
      const alts = {};
      (block.match(/<xhtml:link\b[^>]*>/g) || []).forEach((t) => { alts[attr(t, "hreflang")] = attr(t, "href"); });
      const images = (block.match(/<image:loc>([^<]+)<\/image:loc>/g) || []).map((x) => decode(x.replace(/<\/?image:loc>/g, "")));
      const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1];
      if (lastmod && !/^\d{4}-\d{2}-\d{2}/.test(lastmod)) E("/sitemap.xml", `invalid lastmod ${lastmod} for ${loc}`);
      smUrls.set(loc, { alts, images });
    });
    if (!smUrls.size) E("/sitemap.xml", "no URLs");
  }

  // crawl: sitemap URLs + the root + language homes, following every internal <a href>
  const pages = new Map();          // site URL -> result
  const linkStatus = new Map();     // site URL -> status (non-page resources)
  const inlinks = new Map();        // site URL -> Set(from)
  const queue = [SITE + "/", ...LANGS.map((l) => `${SITE}/${l}/`), ...smUrls.keys()];
  const seen = new Set();
  const isPageUrl = (u) => { const p = new URL(u).pathname; return p.endsWith("/") || p.endsWith(".html") || !/\.[a-z0-9]{2,5}$/i.test(p); };
  const norm = (href, from) => {
    if (!href || /^(mailto:|tel:|javascript:|data:|whatsapp:|#)/i.test(href)) return null;
    let u; try { u = new URL(href, from); } catch (e) { return null; }
    if (u.origin !== new URL(SITE).origin && u.origin !== BASE) return null;
    u.hash = ""; u.search = "";
    return SITE + u.pathname;
  };
  const assets = new Map();         // site URL -> Set(from)
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue; seen.add(url);
    const r = await get(toLocal(url));
    const res = { url, status: r.status, location: r.location, xrobots: r.xrobots };
    pages.set(url, res);
    if (r.status >= 300 && r.status < 400) { const to = r.location && norm(r.location, toLocal(url)); res.redirectTo = to; if (to && !seen.has(to)) queue.push(to); continue; }
    if (r.status !== 200 || !/html/.test(r.ct)) continue;
    const html = r.body, body = stripScripts(html);
    const head = (html.match(/<head\b[\s\S]*?<\/head>/i) || [""])[0];
    res.title = text((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const meta = (name, by = "name") => { const t = tags(head, "meta").find((x) => (attr(x, by) || "").toLowerCase() === name); return t ? attr(t, "content") : null; };
    res.description = meta("description");
    res.robots = [meta("robots"), meta("googlebot"), r.xrobots].filter(Boolean).join(", ");
    res.noindex = /noindex/i.test(res.robots);
    res.lang = attr((html.match(/<html\b[^>]*>/i) || [""])[0], "lang");
    const links = tags(head, "link");
    const canon = links.filter((t) => (attr(t, "rel") || "").toLowerCase() === "canonical");
    res.canonical = canon.length ? attr(canon[0], "href") : null;
    if (canon.length > 1) E(url, "more than one canonical");
    res.hreflang = {};
    links.filter((t) => (attr(t, "rel") || "").toLowerCase() === "alternate" && attr(t, "hreflang")).forEach((t) => { res.hreflang[attr(t, "hreflang")] = attr(t, "href"); });
    res.h1 = (body.match(/<h1\b[\s\S]*?<\/h1>/gi) || []).map(text);
    res.og = { title: meta("og:title", "property"), description: meta("og:description", "property"), image: meta("og:image", "property"), url: meta("og:url", "property"), type: meta("og:type", "property") };
    res.twitter = meta("twitter:card");
    res.jsonld = [];
    (html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []).forEach((s) => {
      const raw = s.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
      try {
        const j = JSON.parse(raw);
        const items = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
        if (!(Array.isArray(j) ? j.every((x) => x["@context"]) : j["@context"])) E(url, "JSON-LD without @context");
        items.forEach((it) => { if (!it["@type"]) E(url, "JSON-LD item without @type"); else res.jsonld.push([].concat(it["@type"]).join("+")); });
        // every {"@id": …} reference resolves to a node of the page; breadcrumbs are complete
        const ids = new Set(items.map((it) => it["@id"]).filter(Boolean));
        JSON.stringify(j, (k, v) => { if (v && typeof v === "object" && !Array.isArray(v) && v["@id"] && Object.keys(v).length === 1 && !ids.has(v["@id"])) E(url, "JSON-LD reference to an undefined node " + v["@id"]); return v; });
        items.filter((it) => it["@type"] === "BreadcrumbList").forEach((bc) => (bc.itemListElement || []).forEach((li, i) => {
          if (li.position !== i + 1 || !li.name || !li.item) E(url, "BreadcrumbList item " + (i + 1) + " incomplete");
        }));
      } catch (e) { E(url, `JSON-LD does not parse: ${e.message}`); }
    });
    res.imgNoAlt = tags(body, "img").filter((t) => attr(t, "alt") === null).map((t) => attr(t, "src"));
    res.imgCount = tags(body, "img").length;
    // visible text in the initial HTML (what a crawler gets without running JavaScript)
    const visible = text(body.replace(/<style\b[\s\S]*?<\/style>/gi, "").replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, "").replace(/<svg\b[\s\S]*?<\/svg>/gi, ""));
    res.words = visible ? visible.split(" ").length : 0;
    res.h2 = (body.match(/<h2\b/gi) || []).length;
    res.imgNoSize = tags(body, "img").filter((t) => attr(t, "src") && (!attr(t, "width") || !attr(t, "height"))).length;
    // links
    tags(body, "a").forEach((t) => {
      const href = attr(t, "href") || "";
      if (/^https?:\/\/www\.3dna\.es/i.test(href)) E(url.replace(SITE, "") || "/", `link to www.3dna.es (that host has no valid certificate): ${href}`);
      const u = norm(attr(t, "href"), toLocal(url)); if (!u) return;
      if (!inlinks.has(u)) inlinks.set(u, new Set()); inlinks.get(u).add(url);
      if (isPageUrl(u)) { if (!seen.has(u)) queue.push(u); } else { if (!assets.has(u)) assets.set(u, new Set()); assets.get(u).add(url); }
    });
    if (CHECK_ASSETS) {
      const refs = [];
      tags(html, "img").concat(tags(html, "source"), tags(html, "video"), tags(html, "script"), links.filter((t) => /stylesheet|icon|preload|apple-touch-icon|manifest/i.test(attr(t, "rel") || ""))).forEach((t) => {
        ["src", "href", "poster", "data-src"].forEach((a) => refs.push(attr(t, a)));
        [attr(t, "srcset"), attr(t, "data-srcset")].filter(Boolean).forEach((ss) => ss.split(",").forEach((c) => refs.push(c.trim().split(/\s+/)[0])));
      });
      [res.og.image].forEach((x) => refs.push(x));
      refs.forEach((h) => { const u = norm(h, toLocal(url)); if (u && !isPageUrl(u)) { if (!assets.has(u)) assets.set(u, new Set()); assets.get(u).add(url); } });
    }
  }
  // non-page resources: one request each
  const assetList = [...assets.keys()];
  for (let i = 0; i < assetList.length; i += 12) {
    await Promise.all(assetList.slice(i, i + 12).map(async (u) => {
      let r = await get(toLocal(u), "HEAD");
      if (r.status === 405 || r.status === 0) r = await get(toLocal(u));
      linkStatus.set(u, r.status);
      if (r.status !== 200) E([...assets.get(u)][0].replace(SITE, ""), `broken resource ${u.replace(SITE, "")} (HTTP ${r.status})`);
    }));
  }

  // ---------------- page checks ----------------
  const isNotIndexedPath = (u) => NOT_INDEXED.some((re) => re.test(new URL(u).pathname));
  const indexable = [];
  for (const [url, p] of pages) {
    const where = url.replace(SITE, "") || "/";
    if (p.status === 0) { E(where, `request failed`); continue; }
    if (p.status >= 300 && p.status < 400) {
      if (smUrls.has(url)) E(where, `sitemap URL redirects (${p.status} → ${p.redirectTo})`);
      const from = inlinks.get(url); if (from && url !== SITE + "/") W(where, `internal links point to a redirect (${p.status} → ${(p.redirectTo || "").replace(SITE, "")}), e.g. from ${[...from][0].replace(SITE, "")}`);
      if (p.redirectTo && pages.get(p.redirectTo) && pages.get(p.redirectTo).status >= 300 && pages.get(p.redirectTo).status < 400) E(where, "redirect chain");
      continue;
    }
    if (p.status !== 200) {
      const from = inlinks.get(url);
      if (from) E([...from][0].replace(SITE, ""), `broken link → ${where} (HTTP ${p.status})`);
      if (smUrls.has(url)) E(where, `sitemap URL returns HTTP ${p.status}`);
      continue;
    }
    if (p.title === undefined) continue;   // not HTML
    const expectedNo = isNotIndexedPath(url);
    if (p.noindex && !expectedNo) W(where, `noindex (${p.robots})`);
    if (p.noindex && smUrls.has(url)) E(where, "noindex page listed in the sitemap");
    const canonicalSelf = p.canonical && p.canonical === url;
    if (!p.canonical && !p.noindex) E(where, "no canonical");
    else if (p.canonical && !/^https:\/\/3dna\.es\//.test(p.canonical)) E(where, `canonical is not an absolute https://3dna.es URL: ${p.canonical}`);
    if (smUrls.has(url) && !canonicalSelf) E(where, `sitemap URL is not self-canonical (canonical → ${p.canonical})`);
    if (p.canonical && !canonicalSelf) {
      const c = pages.get(p.canonical);
      if (c && c.status !== 200) E(where, `canonical target returns HTTP ${c.status}`);
      if (!pages.has(p.canonical)) { const r = await get(toLocal(p.canonical)); if (r.status !== 200) E(where, `canonical target ${p.canonical} returns HTTP ${r.status}`); }
    }
    if (p.noindex || expectedNo || !canonicalSelf) continue;
    indexable.push(p);
    if (!p.title) E(where, "missing <title>"); else if (p.title.length > 70) W(where, `long title (${p.title.length} chars)`); else if (p.title.length < 15) W(where, `short title (${p.title.length} chars)`);
    if (!p.description) E(where, "missing meta description"); else if (p.description.length > 175) W(where, `long meta description (${p.description.length} chars)`); else if (p.description.length < 60) W(where, `short meta description (${p.description.length} chars)`);
    if (p.h1.length === 0) E(where, "no <h1>"); else if (p.h1.length > 1) W(where, `${p.h1.length} <h1> elements`);
    if (!p.lang) E(where, "no <html lang>");
    if (!p.og.title || !p.og.description || !p.og.image || !p.og.url) E(where, `incomplete Open Graph (${["title", "description", "image", "url"].filter((k) => !p.og[k]).join(", ")})`);
    else if (p.og.url !== url) W(where, `og:url ≠ canonical (${p.og.url})`);
    if (!p.twitter) W(where, "no twitter:card");
    if (!p.jsonld.length) W(where, "no structured data (JSON-LD)");
    if (p.words < 150) W(where, `little text in the initial HTML (${p.words} words): content may depend on JavaScript`);
    if (!p.h2) W(where, "no <h2> headings");
    if (p.imgNoSize) W(where, `${p.imgNoSize} <img> without width/height (layout shift risk)`);
    if (p.imgNoAlt.length) W(where, `${p.imgNoAlt.length} <img> without alt (e.g. ${p.imgNoAlt[0]})`);
    if (!smUrls.has(url)) E(where, "indexable page missing from the sitemap");
    // hreflang
    const hl = p.hreflang, keys = Object.keys(hl);
    if (keys.length) {
      if (!keys.includes("x-default")) W(where, "hreflang set without x-default");
      const selfLang = keys.find((k) => hl[k] === url && k !== "x-default");
      if (!selfLang) E(where, "hreflang set does not include the page itself");
      else if (p.lang && selfLang !== p.lang.toLowerCase().slice(0, 2)) E(where, `html lang "${p.lang}" ≠ its hreflang "${selfLang}"`);
      for (const [l, href] of Object.entries(hl)) {
        if (l !== "x-default" && !LANGS.includes(l)) W(where, `unexpected hreflang "${l}"`);
        if (href === url) continue;
        let t = pages.get(href);
        if (!t) { const r = await get(toLocal(href)); t = { status: r.status }; if (r.status === 200) queue.push(href); }
        if (t.status !== 200) { E(where, `hreflang ${l} → ${href.replace(SITE, "")} returns HTTP ${t.status}`); continue; }
        if (l !== "x-default" && t.hreflang && !Object.values(t.hreflang).includes(url)) E(where, `hreflang ${l} → ${href.replace(SITE, "")} is not reciprocal`);
      }
    } else if (LANGS.some((l) => new URL(url).pathname.startsWith(`/${l}/`))) W(where, "no hreflang alternates");
    // sitemap alternates agree with the page
    const s = smUrls.get(url);
    if (s && Object.keys(s.alts).length) for (const [l, href] of Object.entries(s.alts)) if (hl[l] !== href) E(where, `sitemap hreflang ${l} (${href}) ≠ page hreflang (${hl[l] || "none"})`);
  }
  // duplicates among indexable pages
  const dup = (key) => { const m = new Map(); indexable.forEach((p) => { const k = p[key]; if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(p.url.replace(SITE, "")); }); [...m].filter(([, v]) => v.length > 1).forEach(([k, v]) => E(v.join(", "), `duplicate ${key}: "${k.slice(0, 80)}"`)); };
  dup("title"); dup("description");
  // sitemap URLs that the crawl never reached by a link = orphans
  for (const u of smUrls.keys()) if (!inlinks.has(u) && !/^https:\/\/3dna\.es\/(en|es|ru|uk)\/$/.test(u)) W(u.replace(SITE, ""), "orphan: listed in the sitemap but no internal link points to it");
  // local: every published HTML page is either reached by links, noindex, or not its own canonical
  if (server) for (const f of server.files) {
    if (!f.endsWith(".html") || /^(templates|scripts|assets\/partials)\//.test(f)) continue;
    const u = SITE + "/" + f.replace(/(^|\/)index\.html$/, "$1");
    if (pages.has(u) || pages.has(u.replace(/\.html$/, ""))) continue;
    const html = fs.readFileSync(path.join(ROOT, f), "utf8");
    const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
    const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (noindex) continue;
    if (!canon) W("/" + f, "published HTML with neither a canonical nor noindex (old copy? remove it from the repository or mark it noindex)");
    else if (canon === u) E("/" + f, "indexable page that no internal link reaches");
  }
  // images listed in the sitemap exist
  const smImages = [...new Set([...smUrls.values()].flatMap((x) => x.images))];
  for (let i = 0; i < smImages.length; i += 16) await Promise.all(smImages.slice(i, i + 16).map(async (u) => {
    if (linkStatus.has(u)) { if (linkStatus.get(u) !== 200) E("/sitemap.xml", `image ${u} returns HTTP ${linkStatus.get(u)}`); return; }
    let r = await get(toLocal(u), "HEAD"); if (r.status === 405 || r.status === 0) r = await get(toLocal(u));
    linkStatus.set(u, r.status); if (r.status !== 200) E("/sitemap.xml", `image ${u.replace(SITE, "")} returns HTTP ${r.status}`);
  }));
  // sitemap URLs blocked by robots
  const SEARCH_AGENTS = ["Googlebot", "Bingbot", "OAI-SearchBot", "PerplexityBot", "Applebot", "DuckDuckBot", "YandexBot"];
  for (const u of smUrls.keys()) for (const a of SEARCH_AGENTS) if (!robotsAllows(robots, a, new URL(u).pathname)) E(u.replace(SITE, ""), `sitemap URL is disallowed for ${a} in robots.txt`);

  // ---------------- report ----------------
  const summary = {
    base: BASE, mode: local ? "local (git-tracked files, GitHub Pages emulation)" : "remote",
    pagesCrawled: [...pages.values()].filter((p) => p.title !== undefined).length,
    sitemapImages: [...new Set([...smUrls.values()].flatMap((x) => x.images))].length,
    indexable: indexable.length, sitemapUrls: smUrls.size, resourcesChecked: linkStatus.size,
    redirects: [...pages.values()].filter((p) => p.status >= 300 && p.status < 400).length,
    errors: errors.length, warnings: warnings.length,
  };
  const out = (list, label) => { if (!list.length) return; console.log(`\n${label} (${list.length})`); list.forEach((x) => console.log(`  ${x.where}  —  ${x.msg}`)); };
  console.log("3DNA SEO audit", JSON.stringify(summary, null, 2));
  out(errors, "ERRORS");
  if (!QUIET) out(warnings, "WARNINGS");
  if (opt("--json")) fs.writeFileSync(opt("--json"), JSON.stringify({ summary, errors, warnings, pages: [...pages.values()] }, null, 2));
  if (server) server.srv.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
