#!/usr/bin/env node
/*
 * Builds the localized, statically rendered home pages plus the SEO files.
 *
 * Sources
 *   templates/home.html              page markup with {{placeholders}}
 *   assets/i18n/translations.json    { en: {...}, es: {...}, ru: {...}, uk: {...} }
 *
 * Output (plain static files: GitHub Pages and the Express server serve them as-is)
 *   /en/index.html /es/index.html /ru/index.html /uk/index.html
 *   /index.html     entry point: English content + language redirect for visitors
 *   /sitemap.xml    every /<lang>/**\/index.html found + LEGACY_PAGES
 *   /robots.txt
 *
 * Run: npm run build:i18n
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { SUPPORTED, DEFAULT_LANG } = require("../assets/js/i18n-detect.js");

const SITE_URL = "https://3dna.es";
const SITE_NAME = "3DNA";
const PUBLIC_EMAIL = "andrei@3dna.es"; // published in the site footer
const LOGO_PATH = "/img/logo.png";
const OG_IMAGE = { path: (lang) => `/images/og/og-${lang}.jpg`, width: 1200, height: 630 };
// Language switcher order (header): EN / ES / RU / UK
const SWITCHER_ORDER = ["en", "es", "ru", "uk"];

// Existing single-language pages that are public and linked from the site.
// They have no translations yet, so they go into the sitemap without hreflang.
const LEGACY_PAGES = [
  "restaurantes-3d.html",
  "gimnasios-3d.html",
  "clinicas-3d.html",
  "ecosistemas-digitales.html",
  "proyecto01-restaurante.html",
  "prodazh-restorana.html",
  "oferta-publica.html",
  "aviso-legal.html",
  "politica-privacidad.html",
  "politica-cookies.html"
];

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/^﻿/, "");
const template = read("templates/home.html");
const formTemplate = read("templates/form-panel.html");
// Spanish keeps the original path, which the legacy (Spanish) pages already load
const formPartialFile = (lang) => (lang === "es" ? "form-panel.html" : `form-panel.${lang}.html`);
const translations = JSON.parse(read("assets/i18n/translations.json"));
const gym = JSON.parse(read("assets/data/gym-zones.json"));
const fitnessPlanner = require("./fitness-planner.js").createFitnessPlanner(gym, translations);

// ---------------------------------------------------------------- helpers
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "hero.headline.0" -> dict.hero.headline[0]; "sectors.0.title" -> dict.sectors[0].title
const lookup = (dict, key) => key.split(".").reduce((node, part) => (node == null ? node : node[part]), dict);

const absolute = (urlPath) => `${SITE_URL}${urlPath}`;
const localeUrl = (lang, subPath = "") => absolute(`/${lang}/${subPath}`);

// WhatsApp deep link with the locale's pre-filled message (no "+" or spaces in the number)
const whatsappHref = (lang) => {
  const c = translations[lang].contact;
  return `https://wa.me/${c.whatsappNumber}?text=${encodeURIComponent(c.whatsappMessage)}`;
};

const fileVersion = (rel) =>
  crypto.createHash("sha1").update(fs.readFileSync(path.join(root, rel))).digest("hex").slice(0, 8);

const jsonForScript = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

// ---------------------------------------------------------------- SEO: metadata
function alternateLinks(subPath = "") {
  const links = SUPPORTED.map((code) => `  <link rel="alternate" hreflang="${code}" href="${localeUrl(code, subPath)}">`);
  links.push(`  <link rel="alternate" hreflang="x-default" href="${localeUrl(DEFAULT_LANG, subPath)}">`);
  return links;
}

function socialMeta(lang, t) {
  const image = absolute(OG_IMAGE.path(lang));
  const lines = [
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="${SITE_NAME}">`,
    `  <meta property="og:title" content="${escapeHtml(t.meta.title)}">`,
    `  <meta property="og:description" content="${escapeHtml(t.meta.description)}">`,
    `  <meta property="og:url" content="${localeUrl(lang)}">`,
    `  <meta property="og:image" content="${image}">`,
    `  <meta property="og:image:width" content="${OG_IMAGE.width}">`,
    `  <meta property="og:image:height" content="${OG_IMAGE.height}">`,
    `  <meta property="og:image:alt" content="${escapeHtml(t.meta.ogImageAlt)}">`,
    `  <meta property="og:locale" content="${t.meta.ogLocale}">`,
    ...SUPPORTED.filter((code) => code !== lang).map(
      (code) => `  <meta property="og:locale:alternate" content="${translations[code].meta.ogLocale}">`
    ),
    `  <meta name="twitter:card" content="summary_large_image">`,
    `  <meta name="twitter:title" content="${escapeHtml(t.meta.title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(t.meta.description)}">`,
    `  <meta name="twitter:image" content="${image}">`,
    `  <meta name="twitter:image:alt" content="${escapeHtml(t.meta.ogImageAlt)}">`
  ];
  return lines;
}

// ---------------------------------------------------------------- SEO: JSON-LD
// Only confirmed public facts. No address, phone, social profiles or Person
// until they are published on the site.
function structuredData(lang, t) {
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: { "@type": "ImageObject", url: absolute(LOGO_PATH), width: 1536, height: 1024 },
      description: t.schema.organizationDescription,
      email: PUBLIC_EMAIL
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      inLanguage: SUPPORTED,
      publisher: { "@id": `${SITE_URL}/#organization` }
    },
    {
      "@type": "WebPage",
      "@id": `${localeUrl(lang)}#webpage`,
      url: localeUrl(lang),
      name: t.meta.title,
      description: t.meta.description,
      inLanguage: lang,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      primaryImageOfPage: { "@type": "ImageObject", url: absolute(OG_IMAGE.path(lang)) }
    }
  ];
  return `  <script type="application/ld+json">${jsonForScript({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function headTags(lang, { isRoot }) {
  const t = translations[lang];
  const detectSrc = `/assets/js/i18n-detect.js?v=${fileVersion("assets/js/i18n-detect.js")}`;
  // Only what client JS needs; all visible text is rendered into the HTML here.
  const clientI18n = { lang, languages: SUPPORTED, whatsappHref: whatsappHref(lang) };

  const lines = [
    `  <meta name="description" content="${escapeHtml(t.meta.description)}">`,
    `  <link rel="canonical" href="${localeUrl(lang)}">`,
    ...alternateLinks(),
    ...socialMeta(lang, t),
    structuredData(lang, t),
    `  <script>window.I18N = ${jsonForScript(clientI18n)};</script>`
  ];

  if (isRoot) {
    // Entry point: visitors are sent to their locale before anything renders.
    // Crawlers can read this page (English + hreflang) and every /<lang>/ URL
    // directly. Locale pages never redirect, so there is no loop.
    lines.push(
      `  <script src="${detectSrc}"></script>`,
      `  <script>(function () {`,
      `    var d = window.I18nDetect; if (!d) return;`,
      `    var lang = d.detectInBrowser(); // saved choice > market (time zone) > browser language > en`,
      `    window.location.replace("/" + lang + "/" + window.location.search + window.location.hash);`,
      `  })();</script>`
    );
  } else {
    // Only needed when the visitor switches language
    lines.push(`  <script src="${detectSrc}" defer></script>`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------- header: language switcher
function languageSwitcher(lang, variant) {
  const t = translations[lang];
  const links = SWITCHER_ORDER.filter((code) => SUPPORTED.includes(code)).map((code) => {
    const current = code === lang ? ' aria-current="page"' : "";
    const name = escapeHtml(translations[code].languageName);
    return `<a href="/${code}/" hreflang="${code}" lang="${code}" data-lang="${code}" aria-label="${name}"${current}>${code.toUpperCase()}</a>`;
  });
  return [
    `      <nav class="lang-switch lang-switch--${variant}" aria-label="${escapeHtml(t.nav.language)}">`,
    `        ${links.join('<span class="lang-switch__sep" aria-hidden="true">/</span>')}`,
    `      </nav>`
  ].join("\n");
}

// ---------------------------------------------------------------- render
function render(lang, options = { isRoot: false }, tpl = template) {
  const dict = translations[lang];
  if (!dict) throw new Error(`Missing translations for "${lang}"`);

  const out = tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    if (key === "lang") return lang;
    if (key === "head.i18n") return headTags(lang, options);
    if (key === "header.langSwitchBar") return languageSwitcher(lang, "bar");
    if (key === "header.langSwitchMenu") return languageSwitcher(lang, "menu");
    if (key === "contact.whatsappHref") return escapeHtml(whatsappHref(lang));
    if (key === "form.partialFile") return formPartialFile(lang);
    if (key === "fitness.zoneNav") return fitnessPlanner.zoneNav(lang);
    if (key === "fitness.zoneDetails") return fitnessPlanner.zoneDetails(lang);
    if (key === "fitness.planSvg") return fitnessPlanner.planSvg(lang);
    if (key === "fitness.dataJson") return jsonForScript(fitnessPlanner.clientData(lang));
    const value = lookup(dict, key);
    if (value == null || typeof value === "object") {
      throw new Error(`Missing translation "${key}" for "${lang}"`);
    }
    return escapeHtml(value);
  });
  return "﻿" + out;
}

function write(relPath, content) {
  const file = path.join(root, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`wrote ${relPath}`);
}

// ---------------------------------------------------------------- sitemap + robots
// Localized pages: every index.html under /<lang>/ (future /en/restaurants/ etc.
// are picked up automatically). A page is listed with hreflang alternates for
// the languages where the same sub-path exists.
function localizedPaths() {
  const found = new Map(); // subPath -> Set(lang)
  for (const lang of SUPPORTED) {
    const walk = (dir, sub) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(path.join(dir, entry.name), `${sub}${entry.name}/`);
        else if (entry.name === "index.html") {
          if (!found.has(sub)) found.set(sub, new Set());
          found.get(sub).add(lang);
        }
      }
    };
    const dir = path.join(root, lang);
    if (fs.existsSync(dir)) walk(dir, "");
  }
  return found;
}

function sitemapXml() {
  const lastmod = (rel) => fs.statSync(path.join(root, rel)).mtime.toISOString().slice(0, 10);
  const urls = [];
  for (const [subPath, langs] of localizedPaths()) {
    const alternates = [...langs].map(
      (code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${localeUrl(code, subPath)}"/>`
    );
    if (langs.has(DEFAULT_LANG)) {
      alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(DEFAULT_LANG, subPath)}"/>`);
    }
    for (const lang of langs) {
      urls.push(
        [
          "  <url>",
          `    <loc>${localeUrl(lang, subPath)}</loc>`,
          `    <lastmod>${lastmod(`${lang}/${subPath}index.html`)}</lastmod>`,
          ...alternates,
          "  </url>"
        ].join("\n")
      );
    }
  }
  for (const page of LEGACY_PAGES) {
    if (!fs.existsSync(path.join(root, page))) continue;
    urls.push(["  <url>", `    <loc>${absolute(`/${page}`)}</loc>`, `    <lastmod>${lastmod(page)}</lastmod>`, "  </url>"].join("\n"));
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    ""
  ].join("\n");
}

const robotsTxt = () =>
  [
    "User-agent: *",
    "Allow: /",
    "",
    "# Build sources and old copies of the home page (not public content)",
    "Disallow: /templates/",
    "Disallow: /scripts/",
    "Disallow: /backup-20260414-233441/",
    "Disallow: /index.before-clean-20260414.html",
    "Disallow: /index.before-restore-20260414.html",
    "Disallow: /index.mojibake.bak.html",
    "Disallow: /index.recovered.html",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ""
  ].join("\n");

// ---------------------------------------------------------------- build
for (const lang of SUPPORTED) write(`${lang}/index.html`, render(lang));
for (const lang of SUPPORTED) write(`assets/partials/${formPartialFile(lang)}`, render(lang, {}, formTemplate));
write("index.html", render(DEFAULT_LANG, { isRoot: true }));
write("sitemap.xml", sitemapXml());
write("robots.txt", robotsTxt());
