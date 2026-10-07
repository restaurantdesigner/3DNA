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
 *   /<lang>/<restaurantsPage.slug>/index.html   Restaurants page (templates/restaurants.html)
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
const DEFAULT_LANG_LEGACY = "es";
const LEGACY_PAGES = [
  "gimnasios-3d.html",
  "clinicas-3d.html",
  "ecosistemas-digitales.html",
  "proyecto01-restaurante.html",
  "oferta-publica.html",
  "aviso-legal.html",
  "politica-privacidad.html",
  "politica-cookies.html"
];

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/^﻿/, "");
const template = read("templates/home.html");
const formTemplate = read("templates/form-panel.html");
// Shared layout: the ONLY header and footer on the site (see applyLayout below)
const layoutHeader = read("templates/layout/header.html");
const layoutFooter = read("templates/layout/footer.html");
const restaurantsTemplate = read("templates/restaurants.html");
const restaurantStories = JSON.parse(read("assets/data/restaurant-stories.json"));
// Spanish keeps the original path, which the legacy (Spanish) pages already load
const formPartialFile = (lang) => (lang === "es" ? "form-panel.html" : `form-panel.${lang}.html`);
const translations = JSON.parse(read("assets/i18n/translations.json"));
const gym = JSON.parse(read("assets/data/gym-zones.json"));
const fitnessPlanner = require("./fitness-planner.js").createFitnessPlanner(gym, translations);
const servicesPricing = require("./services-pricing.js").createServicesPricing(
  JSON.parse(read("assets/data/services.json")), translations,
  { whatsappNumber: translations.es.contact.whatsappNumber });
const hospitalNaming = require("./healthcare-naming.js").createHealthcareNaming(
  JSON.parse(read("assets/data/hospital-naming.json")), translations,
  { whatsappNumber: translations.es.contact.whatsappNumber });

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

const restaurantsPage = require("./restaurants-page.js").createRestaurantsPage(
  restaurantStories, translations, { whatsappHref: (lang) => whatsappHref(lang) });
const restaurantPlanData = JSON.parse(read("assets/data/restaurant-plan.json"));
// FF&E / lighting / equipment / finishes specification (also tags the plan's objects with their references)
const restaurantSpec = require("./restaurant-spec.js").createRestaurantSpec(
  restaurantPlanData, JSON.parse(read("assets/data/restaurant-spec.json")), JSON.parse(read("assets/i18n/restaurant-spec.json")));
const restaurantPlan = require("./restaurant-plan.js").createRestaurantPlan(restaurantPlanData, translations, { spec: restaurantSpec });

// Localized sub-pages: key -> path under /<lang>/ (slug comes from translations)
const PAGES = {
  restaurants: {
    template: () => restaurantsTemplate,
    subPath: (lang) => `${translations[lang].restaurantsPage.slug}/`,
    meta: (lang) => translations[lang].restaurantsPage.meta
  }
};
const pageSubPath = (options, lang) => (options && options.page ? PAGES[options.page].subPath(lang) : "");

const fileVersion = (rel) =>
  crypto.createHash("sha1").update(fs.readFileSync(path.join(root, rel))).digest("hex").slice(0, 8);

const jsonForScript = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

// ---------------------------------------------------------------- SEO: metadata
function alternateLinks(subPathFor = () => "") {
  const links = SUPPORTED.map((code) => `  <link rel="alternate" hreflang="${code}" href="${localeUrl(code, subPathFor(code))}">`);
  links.push(`  <link rel="alternate" hreflang="x-default" href="${localeUrl(DEFAULT_LANG, subPathFor(DEFAULT_LANG))}">`);
  return links;
}

function socialMeta(lang, t, meta = t.meta, url = localeUrl(lang)) {
  const image = absolute(OG_IMAGE.path(lang));
  const lines = [
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="${SITE_NAME}">`,
    `  <meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `  <meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:image" content="${image}">`,
    `  <meta property="og:image:width" content="${OG_IMAGE.width}">`,
    `  <meta property="og:image:height" content="${OG_IMAGE.height}">`,
    `  <meta property="og:image:alt" content="${escapeHtml(t.meta.ogImageAlt)}">`,
    `  <meta property="og:locale" content="${t.meta.ogLocale}">`,
    ...SUPPORTED.filter((code) => code !== lang).map(
      (code) => `  <meta property="og:locale:alternate" content="${translations[code].meta.ogLocale}">`
    ),
    `  <meta name="twitter:card" content="summary_large_image">`,
    `  <meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `  <meta name="twitter:image" content="${image}">`,
    `  <meta name="twitter:image:alt" content="${escapeHtml(t.meta.ogImageAlt)}">`
  ];
  return lines;
}

// ---------------------------------------------------------------- SEO: JSON-LD
// Only confirmed public facts. No address, phone, social profiles or Person
// until they are published on the site.
function structuredData(lang, t, meta = t.meta, url = localeUrl(lang)) {
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
      "@id": `${url}#webpage`,
      url,
      name: meta.title,
      description: meta.description,
      inLanguage: lang,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      primaryImageOfPage: { "@type": "ImageObject", url: absolute(OG_IMAGE.path(lang)) }
    }
  ];
  return `  <script type="application/ld+json">${jsonForScript({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function headTags(lang, options = {}) {
  const { isRoot } = options;
  const t = translations[lang];
  const subPathFor = (code) => pageSubPath(options, code);
  const meta = options.page ? PAGES[options.page].meta(lang) : t.meta;
  const url = localeUrl(lang, subPathFor(lang));
  const detectSrc = `/assets/js/i18n-detect.js?v=${fileVersion("assets/js/i18n-detect.js")}`;
  // Only what client JS needs; all visible text is rendered into the HTML here.
  const clientI18n = { lang, languages: SUPPORTED, whatsappHref: whatsappHref(lang) };

  const lines = [
    `  <meta name="description" content="${escapeHtml(meta.description)}">`,
    `  <link rel="canonical" href="${url}">`,
    ...alternateLinks(subPathFor),
    ...socialMeta(lang, t, meta, url),
    structuredData(lang, t, meta, url),
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
function languageSwitcher(lang, variant, subPathFor = () => "") {
  const t = translations[lang];
  const links = SWITCHER_ORDER.filter((code) => SUPPORTED.includes(code)).map((code) => {
    const current = code === lang ? ' aria-current="page"' : "";
    const name = escapeHtml(translations[code].languageName);
    return `<a href="/${code}/${subPathFor(code)}" hreflang="${code}" lang="${code}" data-lang="${code}" aria-label="${name}"${current}>${code.toUpperCase()}</a>`;
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
    if (key === "header.langSwitchBar") return languageSwitcher(lang, "bar", (code) => pageSubPath(options, code));
    if (key === "header.langSwitchMenu") return languageSwitcher(lang, "menu", (code) => pageSubPath(options, code));
    if (key === "contact.whatsappHref") return escapeHtml(whatsappHref(lang));
    if (key === "form.partialFile") return formPartialFile(lang);
    if (key === "form.partialVersion") return FORM_PARTIAL_VERSION;
    if (key === "layout.header") return renderPartial(lang, layoutHeader, options);
    if (key === "layout.footer") return renderPartial(lang, layoutFooter, options);
    if (key === "restaurants.storiesHtml") return restaurantsPage.storiesHtml(lang);
    if (key === "restaurants.planHtml") return restaurantPlan.sectionHtml(lang);
    if (key === "footer.year") return String(new Date().getFullYear());
    if (key === "footer.mailtoHref") {
      const f = translations[lang].footer;
      return escapeHtml(`mailto:${PUBLIC_EMAIL}?subject=${encodeURIComponent(f.emailSubject)}&body=${encodeURIComponent(f.emailBody)}`);
    }
    if (key === "fitness.zoneNav") return fitnessPlanner.zoneNav(lang);
    if (key === "fitness.zoneDetails") return fitnessPlanner.zoneDetails(lang);
    if (key === "fitness.planSvg") return fitnessPlanner.planSvg(lang);
    if (key === "fitness.dataJson") return jsonForScript(fitnessPlanner.clientData(lang));
    if (key === "howItWorks.stepsHtml") return servicesPricing.steps(lang);
    if (key === "pricing.cardsHtml") return servicesPricing.cards(lang);
    if (key === "naming.list") return hospitalNaming.list(lang);
    if (key === "naming.details") return hospitalNaming.details(lang);
    if (key === "naming.planSvg") return hospitalNaming.planSvg(lang);
    if (key === "naming.dataJson") return jsonForScript(hospitalNaming.clientData(lang));
    const value = lookup(dict, key);
    if (value == null || typeof value === "object") {
      throw new Error(`Missing translation "${key}" for "${lang}"`);
    }
    return escapeHtml(value);
  });
  return "﻿" + out;
}

// A partial rendered with the page language (no BOM: it is embedded in a page)
const renderPartial = (lang, tpl, options = {}) => render(lang, { page: options.page }, tpl).replace(/^\uFEFF/, "").replace(/\n+$/, "");
const FORM_PARTIAL_VERSION = "20261011a";

// ---------------------------------------------------------------- shared layout
// Every standalone page (root *.html other than the generated index.html and the
// old index.* copies) carries two marker pairs:
//   <!-- 3dna:header --> ... <!-- /3dna:header -->
//   <!-- 3dna:footer --> ... <!-- /3dna:footer -->
// Each build rewrites what is between them from templates/layout/*.html in the
// page's <html lang> (falls back to Spanish). Pages never contain their own
// header/footer markup.
const LAYOUT_MARKERS = {
  header: [/<!-- 3dna:header -->[\s\S]*?<!-- \/3dna:header -->/, layoutHeader],
  footer: [/<!-- 3dna:footer -->[\s\S]*?<!-- \/3dna:footer -->/, layoutFooter]
};
function applyLayout(html, lang) {
  let out = html;
  for (const [name, [re, tpl]] of Object.entries(LAYOUT_MARKERS)) {
    if (!re.test(out)) throw new Error(`missing 3dna:${name} markers`);
    const block = `<!-- 3dna:${name} -->\n${renderPartial(lang, tpl)}\n<!-- /3dna:${name} -->`;
    out = out.replace(re, () => block);
  }
  return out;
}
const ASSET_VERSIONS = {
  "main.css": (template.match(/main\.css\?v=([\w.-]+)/) || [])[1],
  "main.js": (template.match(/main\.js\?v=([\w.-]+)/) || [])[1]
};
function layoutPages() {
  return fs.readdirSync(root).filter((name) =>
    name.endsWith(".html") && name !== "index.html" && !name.startsWith("index.") &&
    fs.readFileSync(path.join(root, name), "utf8").includes("<!-- 3dna:header -->"));
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
  // a localized sub-page has a different slug per language (es: restaurantes/)
  const pageKey = (lang, sub) => {
    for (const [key, page] of Object.entries(PAGES)) if (page.subPath(lang) === sub) return key;
    return sub;
  };
  const found = new Map(); // page key -> Map(lang -> subPath)
  for (const lang of SUPPORTED) {
    const walk = (dir, sub) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(path.join(dir, entry.name), `${sub}${entry.name}/`);
        else if (entry.name === "index.html") {
          const key = pageKey(lang, sub);
          if (!found.has(key)) found.set(key, new Map());
          found.get(key).set(lang, sub);
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
  for (const [, langs] of localizedPaths()) {
    const alternates = [...langs].map(
      ([code, sub]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${localeUrl(code, sub)}"/>`
    );
    if (langs.has(DEFAULT_LANG)) {
      alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(DEFAULT_LANG, langs.get(DEFAULT_LANG))}"/>`);
    }
    for (const [lang, subPath] of langs) {
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
for (const [key, page] of Object.entries(PAGES)) {
  for (const lang of SUPPORTED) {
    const html = render(lang, { page: key }, page.template())
      .replace(/(main\.(?:css|js))\?v=[\w.-]+/g, (m, file) => `${file}?v=${ASSET_VERSIONS[file]}`);
    write(`${lang}/${page.subPath(lang)}index.html`, html);
  }
}
for (const page of layoutPages()) {
  const file = path.join(root, page);
  const raw = fs.readFileSync(file, "utf8");
  const bom = raw.startsWith("\uFEFF") ? "\uFEFF" : "";
  const crlf = raw.includes("\r\n");
  const html = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const pageLang = (html.match(/<html[^>]*\blang="([a-z]{2})/i) || [])[1];
  const lang = SUPPORTED.includes(pageLang) ? pageLang : DEFAULT_LANG_LEGACY;
  let out = applyLayout(html, lang);
  // same cache-busting versions as the home pages, so a page never pairs the
  // shared markup with an older cached main.js / main.css
  out = out.replace(/(main\.(?:css|js))\?v=[\w.-]+/g, (m, file) => `${file}?v=${ASSET_VERSIONS[file]}`);
  if (crlf) out = out.replace(/\n/g, "\r\n");
  if (bom + out !== raw) write(page, bom + out);
}
write("sitemap.xml", sitemapXml());
write("robots.txt", robotsTxt());
