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
 *   /<lang>/<fitnessPage.slug>/index.html       Fitness page (templates/fitness.html)
 *   /<lang>/<restaurants slug>/<projects slug>/<id>/index.html   client project pages
 *                                               (templates/project.html, assets/data/projects.json)
 *   /inmobiliaria/ + /<lang>/real-estate/   real estate catalogue (templates/real-estate.html) and one
 *                   page per listing, …/<slug>/ (templates/property.html, assets/data/properties.json)
 *   /index.html     entry point: English content + language redirect for visitors
 *   /sitemap.xml    every published, self-canonical, indexable page (with hreflang alternates and
 *                   its images); lastmod = last commit that really changed the page (git)
 *   /robots.txt
 *   /llms.txt       plain-text map of the public pages (titles, descriptions, URLs) for AI search tools
 *
 * Check the result: npm run seo:audit (scripts/seo-audit.js)
 *
 * Run: npm run build:i18n
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const { SUPPORTED, DEFAULT_LANG } = require("../assets/js/i18n-detect.js");

const SITE_URL = "https://3dna.es";
const SITE_NAME = "3DNA";
const PUBLIC_EMAIL = "andrei@3dna.es"; // published in the site footer
const LOGO_PATH = "/img/logo-3dna.png";
// Social preview cards (1200 × 630 JPG, made by scripts/og-images.js): one per page and language
const OG_IMAGE = { path: (lang) => `/images/og/og-${lang}.jpg`, width: 1200, height: 630 };
const OG_PAGE_IMAGES = {
  restaurants: (lang) => `/images/og/og-restaurants-${lang}.jpg`,
  fitness: (lang) => `/images/og/og-fitness-${lang}.jpg`,
  about: () => "/images/about/og-andrei-yafimenka.jpg",   // the approved photograph, cropped, no text
  marketing: (lang) => `/images/og/og-marketing-${lang}.jpg`,
  industrial: (lang) => "/images/industrial/og-industrial-en.jpg",
  "industrial-ethanol": (lang) => "/images/industrial/og-industrial-en.jpg",
};
// client project pages: the project's own preview image
const projectKey = (id) => `project-${id}`;
const projectIdOf = (page) => (page && page.startsWith("project-") ? page.slice("project-".length) : null);
// real estate: a property page uses its listing's preview image (own size and type); the catalogue
// uses properties.json catalog.ogImage when there is one
const propertyKey = (slug) => `property-${slug}`;
const propertySlugOf = (page) => (page && page.startsWith("property-") ? page.slice("property-".length) : null);
// real estate pages: their own generated card (or override / fallback), see scripts/real-estate.js shareImage
const realEstateOg = (page, lang) => (propertySlugOf(page) || page === "realEstate")
  ? realEstate.shareImage(propertySlugOf(page), lang, (p) => fs.existsSync(path.join(root, p.replace(/^\//, "")))) : null;
// marketing projects (portfolio on the digital marketing page): mproject-<id>
const mprojectKey = (id) => `mproject-${id}`;
const mprojectIdOf = (page) => (page && page.startsWith("mproject-") ? page.slice("mproject-".length) : null);
const ogImagePath = (page, lang) => realEstateOg(page, lang) ? realEstateOg(page, lang).path
  : mprojectIdOf(page) ? marketingProjects.ogImage(mprojectIdOf(page), lang)
  : projectIdOf(page) ? projects.ogImage(projectIdOf(page)) : (page && OG_PAGE_IMAGES[page] ? OG_PAGE_IMAGES[page](lang) : OG_IMAGE.path(lang));
const ogImageSize = (page, lang) => {
  if (!realEstateOg(page, lang)) return { width: OG_IMAGE.width, height: OG_IMAGE.height, type: "image/jpeg" };
  const im = realEstateOg(page, lang);
  const ext = ((im.path.match(/\.(\w+)$/) || [])[1] || "jpg").toLowerCase();
  return { width: im.width, height: im.height, type: `image/${ext === "jpg" ? "jpeg" : ext}` };
};
// Language switcher order (header): EN / ES / RU / UK
const SWITCHER_ORDER = ["en", "es", "ru", "uk"];

// Single-language (Spanish) pages written by hand: their language when the page does not declare one.
const DEFAULT_LANG_LEGACY = "es";

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/^﻿/, "");
const template = read("templates/home.html");
const formTemplate = read("templates/form-panel.html");
// Shared layout: the ONLY header and footer on the site (see applyLayout below)
const layoutHeader = read("templates/layout/header.html");
const layoutFooter = read("templates/layout/footer.html");
const restaurantsTemplate = read("templates/restaurants.html");
const fitnessTemplate = read("templates/fitness.html");
const aboutTemplate = read("templates/about.html");
const marketingTemplate = read("templates/marketing.html");
const marketingProjectTemplate = read("templates/marketing-project.html");
const industrialTemplate = read("templates/industrial.html");
const industrialPlantTemplate = read("templates/industrial-plant.html");
// 3DNA Industrial division (ES / EN): landing + plant dashboards (assets/i18n/industrial.json)
const industrialI18n = JSON.parse(read("assets/i18n/industrial.json"));
const INDUSTRIAL_LANGS = ["en"]; // English only; other languages link to the English pages
const INDUSTRIAL_PLANTS = { ethanol: { en: "ethanol" } };
const projectTemplate = read("templates/project.html");
const realEstateTemplate = read("templates/real-estate.html");
const propertyTemplate = read("templates/property.html");
const restaurantStories = JSON.parse(read("assets/data/restaurant-stories.json"));
// Spanish keeps the original path, which the legacy (Spanish) pages already load
const formPartialFile = (lang) => (lang === "es" ? "form-panel.html" : `form-panel.${lang}.html`);
const translations = JSON.parse(read("assets/i18n/translations.json"));
const gym = JSON.parse(read("assets/data/gym-zones.json"));
const fitnessPlanner = require("./fitness-planner.js").createFitnessPlanner(gym, translations);
const fitnessClub = require("./fitness-club.js").createFitnessClub(
  JSON.parse(read("assets/data/fitness-club.json")), JSON.parse(read("assets/i18n/fitness-club.json")), translations);
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

const aboutPage = require("./about-page.js").createAboutPage(translations, { whatsappHref: (lang) => whatsappHref(lang) });
// sector 04: the purposes of digital marketing (/es/marketing-digital/, /en|ru|uk/digital-marketing/)
// marketing projects: the portfolio grid on that page + one presentation page per published project
const marketingProjects = require("./marketing-projects.js").createMarketingProjects(
  JSON.parse(read("assets/data/marketing-projects.json")), JSON.parse(read("assets/i18n/marketing-projects.json")),
  { marketingSlug: (lang) => translations[lang].marketingPage.slug, whatsappNumber: (lang) => translations[lang].contact.whatsappNumber, email: PUBLIC_EMAIL });
const industrialPage = require("./industrial-page.js").createIndustrialPage(industrialI18n, {
  whatsappNumber: (lang) => translations[lang].contact.whatsappNumber,
  landingPath: (lang) => pagePathFor("industrial", lang),
  plantPath: (lang) => pagePathFor("industrial-ethanol", lang)
});
const marketingPage = require("./marketing-page.js").createMarketingPage(translations, {
  whatsappHref: (lang) => whatsappHref(lang),
  projectsHtml: (lang, num) => marketingProjects.galleryHtml(lang, num),
  localNavHtml: (lang) => marketingProjects.localNavHtml(lang)
});
const restaurantsPage = require("./restaurants-page.js").createRestaurantsPage(
  restaurantStories, translations, { whatsappHref: (lang) => whatsappHref(lang) });
// client projects: card section on the Restaurants page + one page per project
const projects = require("./projects.js").createProjects(
  JSON.parse(read("assets/data/projects.json")), JSON.parse(read("assets/i18n/projects.json")),
  { restaurantsSlug: (lang) => translations[lang].restaurantsPage.slug });
const restaurantPlanData = JSON.parse(read("assets/data/restaurant-plan.json"));
// FF&E / lighting / equipment / finishes specification (also tags the plan's objects with their references)
const restaurantSpec = require("./restaurant-spec.js").createRestaurantSpec(
  restaurantPlanData, JSON.parse(read("assets/data/restaurant-spec.json")), JSON.parse(read("assets/i18n/restaurant-spec.json")));
const restaurantPlan = require("./restaurant-plan.js").createRestaurantPlan(restaurantPlanData, translations, { spec: restaurantSpec });
// business calculators (Restaurants: own section after the 3D plan; Fitness: after "01 / Del plano a la realidad")
// each calculator is shared through its own small page (social previews ignore #fragments):
// /<page path>/<slug>/ — a page kept at a root file (/gimnasios-3d.html) gets /gimnasios-3d/<slug>/
const calcSharePath = (pageKey, transKey) => (lang) =>
  `${pagePathFor(pageKey, lang).replace(/\.html$/, "/")}${translations[lang][transKey].calc.share.slug}/`;
const restaurantCalcSharePath = calcSharePath("restaurants", "restaurantsPage");
const fitnessCalcSharePath = calcSharePath("fitness", "fitnessPage");
const businessCalcs = require("./business-calc.js").createBusinessCalcs(translations, {
  whatsappHref: (lang) => whatsappHref(lang), email: PUBLIC_EMAIL, restaurantPlanning: restaurantPlanData.planning,
  restaurantSharePath: restaurantCalcSharePath, fitnessSharePath: fitnessCalcSharePath });

// Real estate: catalogue + one page per listing. Spanish lives at /inmobiliaria/ (the route the
// section was planned with); the other languages follow /<lang>/<slug>/.
//
// Local draft with example prices (never published): RE_DRAFT=1 node scripts/build-i18n.js
// writes ONLY the real estate pages, to /inmobiliaria-borrador/ and /<lang>/real-estate-draft/
// (git-ignored, noindex, with a "draft" banner), taking the prices from
// drafts/real-estate-example-prices.json ({ "<ref>": <euros> }). The real pages are not touched.
const RE_DRAFT = process.env.RE_DRAFT === "1";
const realEstateI18n = JSON.parse(read("assets/i18n/real-estate.json"));
const reSlug = (lang) => `${realEstateI18n[lang].slug}${RE_DRAFT ? "-draft" : ""}`;
const realEstateSectionPath = (lang) => (lang === "es" ? (RE_DRAFT ? "/inmobiliaria-borrador/" : "/inmobiliaria/") : `/${lang}/${reSlug(lang)}/`);
const realEstateData = JSON.parse(read("assets/data/properties.json"));
if (RE_DRAFT) {
  const example = JSON.parse(read("drafts/real-estate-example-prices.json"));
  for (const p of realEstateData.properties) if (example[p.ref] != null) p.price = example[p.ref];
}
const realEstate = require("./real-estate.js").createRealEstate(
  realEstateData, realEstateI18n,
  { whatsappNumber: translations.es.contact.whatsappNumber, absolute: (p) => absolute(p), sectionPath: realEstateSectionPath, homePath: (lang) => `/${lang}/`,
    // 3D site models of developments (assets/data/site-models/<id>.json), keyed by id
    siteModels: Object.fromEntries(fs.readdirSync(path.join(root, "assets/data/site-models")).filter((f) => f.endsWith(".json"))
      .map((f) => [f.replace(/\.json$/, ""), JSON.parse(read(`assets/data/site-models/${f}`))])),
    assetVersion: (rel) => fileVersion(rel) });
// link-preview cards for every real estate page (drawn only when missing or changed; not for the draft)
if (!RE_DRAFT) require("./real-estate-og.js").ensureCards(root, realEstate.shareJobs(SUPPORTED));

// Homepage editorial carousel "the value of design"
const designQuotes = require("./design-quotes.js").createDesignQuotes(JSON.parse(read("assets/data/design-quotes.json")), translations);

// Localized sub-pages: key -> path under /<lang>/ (slug comes from translations)
const PAGES = {
  restaurants: {
    template: () => restaurantsTemplate,
    subPath: (lang) => `${translations[lang].restaurantsPage.slug}/`,
    meta: (lang) => translations[lang].restaurantsPage.meta
  },
  // Spanish keeps the historic URL /gimnasios-3d.html (the page it replaced);
  // the other languages follow /<lang>/<slug>/.
  fitness: {
    template: () => fitnessTemplate,
    subPath: (lang) => `${translations[lang].fitnessPage.slug}/`,
    urlPath: (lang) => (lang === "es" ? "/gimnasios-3d.html" : null),
    meta: (lang) => translations[lang].fitnessPage.meta
  },
  // the founder's story: /es/nosotros/, /en|ru|uk/about/
  about: {
    template: () => aboutTemplate,
    subPath: (lang) => `${translations[lang].aboutPage.slug}/`,
    meta: (lang) => translations[lang].aboutPage.meta
  },
  // sector 04, digital marketing: /es/marketing-digital/, /en|ru|uk/digital-marketing/
  marketing: {
    template: () => marketingTemplate,
    subPath: (lang) => `${translations[lang].marketingPage.slug}/`,
    meta: (lang) => translations[lang].marketingPage.meta
  },
  realEstate: {
    template: () => realEstateTemplate,
    subPath: (lang) => `${reSlug(lang)}/`,
    urlPath: (lang) => (lang === "es" ? realEstateSectionPath(lang) : null),
    // "Viviendas en venta" when every listing is residential
    meta: (lang) => realEstateI18n[lang].meta
  },
  ...Object.fromEntries(realEstate.slugs().map((slug) => [propertyKey(slug), {
    template: () => propertyTemplate,
    subPath: (lang) => `${reSlug(lang)}/${slug}/`,
    urlPath: (lang) => (lang === "es" ? `${realEstateSectionPath(lang)}${slug}/` : null),
    meta: (lang) => realEstate.detailMeta(lang, slug)
  }])),
  // 3DNA Industrial: /en/industrial/ only (Spanish, Russian and Ukrainian visitors get the English page)
  industrial: {
    template: () => industrialTemplate,
    subPath: () => "industrial/",
    langs: INDUSTRIAL_LANGS,
    fallbackLang: "en",
    meta: (lang) => industrialPage.meta(lang)
  },
  // plant dashboards: /en/industrial/ethanol/
  ...Object.fromEntries(Object.entries(INDUSTRIAL_PLANTS).map(([id, slugs]) => [`industrial-${id}`, {
    template: () => industrialPlantTemplate,
    subPath: (lang) => `industrial/${slugs[lang] || slugs.en}/`,
    langs: INDUSTRIAL_LANGS,
    fallbackLang: "en",
    meta: (lang) => industrialPage.twinMeta(lang)
  }])),
  // marketing projects: /es/marketing-digital/<slug>/, /en/digital-marketing/<slug>/ ... only in the project's
  // languages (langs); the switcher sends the others to the digital marketing page (fallback)
  ...Object.fromEntries(marketingProjects.list().map((id) => [mprojectKey(id), {
    template: () => marketingProjectTemplate,
    subPath: (lang) => marketingProjects.subPath(lang, id),
    langs: marketingProjects.langs(id),
    fallback: "marketing",
    noindex: !marketingProjects.indexable(id),
    meta: (lang) => marketingProjects.meta(lang, id)
  }])),
  // client projects: /es/restaurantes/proyectos/ilia/, /en/restaurants/projects/ilia/ ...
  ...Object.fromEntries(projects.ids().map((id) => [projectKey(id), {
    template: () => projectTemplate,
    subPath: (lang) => projects.subPath(lang, id),
    meta: (lang) => projects.meta(lang, id)
  }]))
};
const pageSubPath = (options, lang) => (options && options.page ? PAGES[options.page].subPath(lang) : "");
// URL path of a page in a language: /<lang>/<subPath>, unless the page keeps a
// historic root URL in that language (PAGES[key].urlPath)
// languages a page is built in (PAGES[key].langs, default all)
const pageLangs = (key) => (key && PAGES[key] && PAGES[key].langs) || SUPPORTED;
const pagePathFor = (key, lang) => {
  const page = key ? PAGES[key] : null;
  if (page && page.langs && !page.langs.includes(lang)) return page.fallbackLang ? pagePathFor(key, page.fallbackLang) : pagePathFor(page.fallback, lang);
  const fixed = page && page.urlPath ? page.urlPath(lang) : null;
  return fixed || `/${lang}/${page ? page.subPath(lang) : ""}`;
};
const pagePath = (options, lang) => pagePathFor(options && options.page, lang);
// file written for a page in a language
const pageFile = (key, lang) => {
  const fixed = PAGES[key].urlPath ? PAGES[key].urlPath(lang) : null;
  // a fixed URL ending in "/" is a folder: its index.html
  return fixed ? fixed.replace(/^\//, "").replace(/\/$/, "/index.html") : `${lang}/${PAGES[key].subPath(lang)}index.html`;
};

const fileVersion = (rel) =>
  crypto.createHash("sha1").update(fs.readFileSync(path.join(root, rel))).digest("hex").slice(0, 8);

const jsonForScript = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

// ---------------------------------------------------------------- SEO: metadata
function alternateLinks(pathFor = (code) => `/${code}/`, langs = SUPPORTED) {
  const links = langs.map((code) => `  <link rel="alternate" hreflang="${code}" href="${absolute(pathFor(code))}">`);
  links.push(`  <link rel="alternate" hreflang="x-default" href="${absolute(pathFor(langs.includes(DEFAULT_LANG) ? DEFAULT_LANG : langs[0]))}">`);
  return links;
}

function socialMeta(lang, t, meta = t.meta, url = localeUrl(lang), page = null) {
  const image = absolute(ogImagePath(page, lang));
  const ogTitle = meta.ogTitle || meta.title;
  const ogAlt = meta.ogImageAlt || t.meta.ogImageAlt;
  const lines = [
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="${SITE_NAME}">`,
    `  <meta property="og:title" content="${escapeHtml(ogTitle)}">`,
    `  <meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:image" content="${image}">`,
    `  <meta property="og:image:secure_url" content="${image}">`,
    `  <meta property="og:image:type" content="${ogImageSize(page, lang).type}">`,
    `  <meta property="og:image:width" content="${ogImageSize(page, lang).width}">`,
    `  <meta property="og:image:height" content="${ogImageSize(page, lang).height}">`,
    `  <meta property="og:image:alt" content="${escapeHtml(ogAlt)}">`,
    `  <meta property="og:locale" content="${t.meta.ogLocale}">`,
    ...pageLangs(page).filter((code) => code !== lang).map(
      (code) => `  <meta property="og:locale:alternate" content="${translations[code].meta.ogLocale}">`
    ),
    `  <meta name="twitter:card" content="summary_large_image">`,
    `  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `  <meta name="twitter:image" content="${image}">`,
    `  <meta name="twitter:image:alt" content="${escapeHtml(ogAlt)}">`
  ];
  return lines;
}

// ---------------------------------------------------------------- SEO: JSON-LD
// Only confirmed public facts: the locality published in the footer (no street
// address), the public e-mail. No phone, social profiles, ratings or Person until
// they are published on the site.
// The organization, its founder (named on the site's About page) and the website: the same
// nodes (same @id) on every page, so search engines connect them into one entity.
function siteNodes(lang, t) {
  return [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: { "@type": "ImageObject", url: absolute(LOGO_PATH), width: 1932, height: 295 },
      description: t.schema.organizationDescription,
      email: PUBLIC_EMAIL,
      address: { "@type": "PostalAddress", addressLocality: "Salobreña", addressRegion: "Granada", addressCountry: "ES" },
      founder: { "@id": `${SITE_URL}/#founder` },
      knowsLanguage: SUPPORTED
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      inLanguage: SUPPORTED,
      publisher: { "@id": `${SITE_URL}/#organization` }
    }
  ];
}
// the founder as a reference node (the About page carries the full Person)
const founderRef = (lang) => ({ "@type": "Person", "@id": `${SITE_URL}/#founder`, name: "Andrei Yafimenka", url: absolute(pagePathFor("about", lang)), worksFor: { "@id": `${SITE_URL}/#organization` } });
// a page's name in breadcrumbs: its service name, else its title without the brand
const crumbName = (key, lang) => {
  const services = translations[lang].schema.services || {};
  if (services[key]) return services[key];
  // the title's first part: "Nosotros | Andrei Yafimenka — …" → "Nosotros"
  return String(PAGES[key].meta(lang).title).replace(/\s*[|·—–-]\s*3DNA\s*$/i, "").split(/\s+[|—]\s+/)[0].trim();
};
// parent page in the site hierarchy (listings sit under the catalogue, projects under restaurants)
const parentPageOf = (key) => (propertySlugOf(key) ? "realEstate" : projectIdOf(key) ? "restaurants" : mprojectIdOf(key) ? "marketing" : key && key.startsWith("industrial-") ? "industrial" : null);
function breadcrumbNode(lang, t, url, key) {
  const chain = [];
  for (let k = parentPageOf(key); k; k = parentPageOf(k)) chain.unshift(k);
  const items = [{ name: t.schema.breadcrumbHome, item: absolute(`/${lang}/`) },
    ...chain.map((k) => ({ name: crumbName(k, lang), item: absolute(pagePathFor(k, lang)) })),
    { name: crumbName(key, lang), item: url }];
  return { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })) };
}

function structuredData(lang, t, meta = t.meta, url = localeUrl(lang), page = null) {
  const graph = [
    ...siteNodes(lang, t),
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: meta.title,
      description: meta.description,
      inLanguage: lang,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      primaryImageOfPage: { "@type": "ImageObject", url: absolute(ogImagePath(page, lang)) }
    }
  ];
  // the founder's page: an AboutPage whose main entity is the founder (only stated facts)
  if (page === "about") {
    graph[2]["@type"] = "AboutPage";
    graph[2].mainEntity = { "@id": `${SITE_URL}/#founder` };
    graph.push({
      "@type": "Person",
      "@id": `${SITE_URL}/#founder`,
      name: "Andrei Yafimenka",
      jobTitle: t.aboutPage.jobTitle,
      image: absolute("/images/about/andrei-yafimenka-1280.webp"),
      url,
      worksFor: { "@id": `${SITE_URL}/#organization` },
      knowsLanguage: ["ru", "uk", "en", "es"]
    });
  }
  else graph.push(founderRef(lang));
  // sub-pages that are not service pages: where they sit in the site
  if (page && !(t.schema.services && t.schema.services[page])) {
    graph[2].breadcrumb = { "@id": `${url}#breadcrumb` };
    graph.push(breadcrumbNode(lang, t, url, page));
  }
  // service pages: what the page offers + where it sits in the site
  if (page && t.schema.services && t.schema.services[page]) {
    graph[2].breadcrumb = { "@id": `${url}#breadcrumb` };
    graph[2].mainEntity = { "@id": `${url}#service` };
    graph.push(
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: t.schema.services[page],
        serviceType: t.schema.services[page],
        description: meta.description,
        url,
        provider: { "@id": `${SITE_URL}/#organization` }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.schema.breadcrumbHome, item: absolute(`/${lang}/`) },
          { "@type": "ListItem", position: 2, name: t.schema.services[page], item: url }
        ]
      }
    );
  }
  return `  <script type="application/ld+json">${jsonForScript({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function headTags(lang, options = {}) {
  const { isRoot } = options;
  const t = translations[lang];
  const pathFor = (code) => pagePath(options, code);
  const meta = options.page ? PAGES[options.page].meta(lang) : t.meta;
  const url = absolute(pathFor(lang));
  const detectSrc = `/assets/js/i18n-detect.js?v=${fileVersion("assets/js/i18n-detect.js")}`;
  // Only what client JS needs; all visible text is rendered into the HTML here.
  const clientI18n = { lang, languages: SUPPORTED, whatsappHref: whatsappHref(lang) };

  const lines = [
    `  <meta name="description" content="${escapeHtml(meta.description)}">`,
    ...(options.page && PAGES[options.page].noindex ? [`  <meta name="robots" content="noindex, follow">`] : []),
    `  <link rel="canonical" href="${url}">`,
    ...alternateLinks(pathFor, pageLangs(options.page)),
    ...socialMeta(lang, t, meta, url, options.page),
    structuredData(lang, t, meta, url, options.page),
    // the catalogue's first paint is its hero film poster (the largest element): fetch it first
    ...(options.page === "realEstate" && realEstateData.catalog && realEstateData.catalog.heroVideo
      ? [`  <link rel="preload" as="image" href="${realEstateData.catalog.heroVideo.poster}" fetchpriority="high">`] : []),
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
function languageSwitcher(lang, variant, pathFor = (code) => `/${code}/`) {
  const t = translations[lang];
  const links = SWITCHER_ORDER.filter((code) => SUPPORTED.includes(code)).map((code) => {
    const current = code === lang ? ' aria-current="page"' : "";
    const name = escapeHtml(translations[code].languageName);
    return `<a href="${pathFor(code)}" hreflang="${code}" lang="${code}" data-lang="${code}" aria-label="${name}"${current}>${code.toUpperCase()}</a>`;
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
    if (key === "header.langSwitchBar") return languageSwitcher(lang, "bar", (code) => pagePath(options, code));
    if (key === "header.langSwitchMenu") return languageSwitcher(lang, "menu", (code) => pagePath(options, code));
    if (key === "contact.whatsappHref") return escapeHtml(whatsappHref(lang));
    if (key === "form.partialFile") return formPartialFile(lang);
    if (key === "form.partialVersion") return FORM_PARTIAL_VERSION;
    if (key === "layout.header") return renderPartial(lang, layoutHeader, options);
    if (key === "layout.footer") return renderPartial(lang, layoutFooter, options);
    if (key === "restaurants.storiesHtml") return restaurantsPage.storiesHtml(lang);
    if (key === "restaurants.projectsHtml") return projects.sectionHtml(lang);
    if (key === "fitness.projectsHtml") return projects.sectionHtml(lang, "fitness");
    if (key.startsWith("project.")) {
      const id = projectIdOf(options && options.page);
      if (!id) throw new Error(`"${key}" used outside a project page`);
      if (key === "project.bodyHtml") return projects.pageBodyHtml(lang, id);
      if (key === "project.heroHtml") return projects.heroHtml(lang, id);
      if (key === "project.name") return escapeHtml(projects.name(id));
      if (key === "project.back") return escapeHtml(projects.back(lang));
      if (key === "project.contextLabel") return escapeHtml(projects.contextLabel(lang));
      if (key === "project.meta.title") return escapeHtml(projects.meta(lang, id).title);
    }
    if (key.startsWith("realEstate.")) {
      if (key === "realEstate.url") return pagePathFor("realEstate", lang);
      if (key === "realEstate.nav") return escapeHtml(realEstateI18n[lang].nav);
      if (key === "realEstate.meta.title") return escapeHtml(PAGES.realEstate.meta(lang).title);
      if (key === "realEstate.catalogHtml") return realEstate.catalogHtml(lang);
      if (key === "realEstate.cssVersion") return fileVersion("assets/css/real-estate.css");
      if (key === "realEstate.jsVersion") return fileVersion("assets/js/real-estate.js");
      const slug = propertySlugOf(options && options.page);
      if (!slug) throw new Error(`"${key}" used outside a property page`);
      if (key === "realEstate.propertyHtml") return realEstate.detailHtml(lang, slug);
      if (key === "realEstate.property.meta.title") return escapeHtml(realEstate.detailMeta(lang, slug).title);
    }
    if (key === "fitnessPage.url") return pagePathFor("fitness", lang);
    if (key === "restaurantsPage.url") return pagePathFor("restaurants", lang);
    if (key === "aboutPage.url") return pagePathFor("about", lang);
    if (key === "about.bodyHtml") return aboutPage.bodyHtml(lang);
    if (key === "marketingPage.url") return pagePathFor("marketing", lang);
    if (key === "marketing.bodyHtml") return marketingPage.bodyHtml(lang);
    if (key === "industrialPage.url") return pagePathFor("industrial", lang);
    if (key === "industrialPage.nav") return escapeHtml(industrialPage.nav(INDUSTRIAL_LANGS.includes(lang) ? lang : "en"));
    if (key === "industrial.cssVersion") return fileVersion("assets/css/industrial.css");
    if (key === "industrial.jsVersion") return ["engine", "equipment", "dashboard", "showcase", "factories/ethanol"].map((m) => fileVersion(`assets/js/industrial/${m}.js`)).join("").slice(0, 10);
    if (key === "industrial.meta.title") return escapeHtml(industrialPage.meta(lang).title);
    if (key === "industrial.heroHtml") return industrialPage.heroHtml(lang);
    if (key === "industrial.bodyHtml") return industrialPage.bodyHtml(lang);
    if (key === "twin.meta.title") return escapeHtml(industrialPage.twinMeta(lang).title);
    if (key === "twin.html") {
      const id = (options && options.page || "").replace(/^industrial-/, "");
      return industrialPage.plantHtml(lang, id, industrialI18n[lang].twin.metaTitle.split(" · ")[0]);
    }
    if (key.startsWith("mproject.")) {
      const id = mprojectIdOf(options && options.page);
      if (!id) throw new Error(`"${key}" used outside a marketing project page`);
      if (key === "mproject.heroHtml") return marketingProjects.heroHtml(lang, id);
      if (key === "mproject.bodyHtml") return marketingProjects.bodyHtml(lang, id);
      if (key === "mproject.meta.title") return escapeHtml(marketingProjects.meta(lang, id).title);
      if (key === "mproject.heroPreload") return marketingProjects.heroPreload(id);
    }
    if (key === "designQuotes.html") return designQuotes.sectionHtml(lang);
    if (key === "fitnessPage.voicesHtml") return designQuotes.fitnessVoicesHtml(lang);
    if (key === "fitnessPage.voicesContentHtml") return designQuotes.fitnessContentVoicesHtml(lang);
    if (key === "fitnessPage.clubHtml") return fitnessClub.sectionHtml(lang);
    // the homepage gym plan drawing, used as a static zoning diagram on the Fitness page
    if (key === "fitnessPage.planSvg") return fitnessPlanner.planSvg(lang)
      .replace(/aria-label="[^"]*"/, `aria-label="${escapeHtml(translations[lang].fitnessPage.zoning.planLabel)}"`);
    if (key === "restaurants.planHtml") return restaurantPlan.sectionHtml(lang);
    if (key === "restaurants.calcHtml") return businessCalcs.restaurantHtml(lang);
    if (key === "fitnessPage.calcHtml") return businessCalcs.fitnessHtml(lang);
    if (key === "footer.year") return String(new Date().getFullYear());
    // footer service links: the home page's services section; in Spanish, web / funnels / applied AI
    // go to their own (Spanish-only) page, so it is linked from every page of the site
    const svc = key.match(/^footer\.servicesHrefs\.(\d)$/);
    if (svc) return lang === "es" && svc[1] !== "0" ? "/ecosistemas-digitales.html" : `/${lang}/#servicios`;
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
  const generated = new Set(Object.keys(PAGES).flatMap((key) => pageLangs(key).map((lang) => pageFile(key, lang))));
  return fs.readdirSync(root).filter((name) =>
    name.endsWith(".html") && name !== "index.html" && !name.startsWith("index.") && !generated.has(name) &&
    fs.readFileSync(path.join(root, name), "utf8").includes("<!-- 3dna:header -->"));
}

const WRITTEN = new Set();
function write(relPath, content) {
  WRITTEN.add(relPath.replace(/\\/g, "/"));
  const file = path.join(root, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`wrote ${relPath}`);
}

// structured data for a hand-written page (legal pages, older service pages): read from its own head
function legacyStructuredData(html, lang, parentKey = null) {
  const t = translations[lang];
  const pick = (re) => { const m = html.match(re); return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : ""; };
  const url = pick(/<link rel="canonical" href="([^"]+)"/i);
  if (!url) return "";
  const name = pick(/<title>([^<]+)<\/title>/i);
  const description = pick(/<meta name="description" content="([^"]*)"/i);
  const short = name.replace(/\s*[|·—–-]\s*3DNA\s*$/i, "").trim();
  const graph = [...siteNodes(lang, t), founderRef(lang),
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name, description, inLanguage: lang,
      isPartOf: { "@id": `${SITE_URL}/#website` }, about: { "@id": `${SITE_URL}/#organization` }, breadcrumb: { "@id": `${url}#breadcrumb` } },
    { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
      { name: t.schema.breadcrumbHome, item: absolute(`/${lang}/`) },
      ...(parentKey ? [{ name: crumbName(parentKey, lang), item: absolute(pagePathFor(parentKey, lang)) }] : []),
      { name: short, item: url }].map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })) }];
  return `  <script type="application/ld+json">${jsonForScript({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

// ---------------------------------------------------------------- sitemap + robots
// Published files: what git tracks plus what this build wrote (drafts and local copies never count)
function publishedFiles() {
  let tracked = [];
  try { tracked = execSync("git ls-files -c", { cwd: root, encoding: "utf8", maxBuffer: 64e6 }).split("\n").filter(Boolean); } catch (e) { /* no git: built files only */ }
  return new Set([...tracked, ...WRITTEN].filter((f) => fs.existsSync(path.join(root, f))));
}
// lastmod = date of the last commit that changed the page's content; a page edited since the last
// commit gets today. Cache-busting query strings (?v=…) are ignored, so a version bump of a shared
// stylesheet does not make every page look modified.
const TODAY = new Date().toISOString().slice(0, 10);
function contentLastmod(rel) {
  const norm = (x) => x.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\?v=[\w.-]+/g, "");
  const current = norm(fs.readFileSync(path.join(root, rel), "utf8"));
  let log = [];
  try { log = execSync(`git log -n 25 --format="%H %cs" -- "${rel}"`, { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean); } catch (e) { return TODAY; }
  let date = null;
  for (const line of log) {
    const [hash, day] = line.split(" ");
    let old;
    try { old = norm(execSync(`git show ${hash}:"${rel}"`, { cwd: root, encoding: "utf8", maxBuffer: 64e6, stdio: ["ignore", "pipe", "ignore"] })); } catch (e) { break; }
    if (old !== current) break;
    date = day;                 // unchanged in this commit: the content dates from it or earlier
  }
  return date || TODAY;
}
// content images of a page for the image sitemap: its preview image and the raster images it shows
function pageImages(html) {
  const out = new Set();
  const og = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (og) out.add(og[1]);
  for (const m of html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)) {
    const src = m[1];
    if (!/^\/(images|img)\//.test(src) || /\.svg(\?|$)/i.test(src) || /logo-3dna/.test(src)) continue;
    out.add(absolute(src.replace(/\?.*$/, "")));
  }
  return [...out].slice(0, 40);
}
const xmlEsc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// every published page that is indexable and its own canonical, with the hreflang alternates it declares
function sitemapEntries() {
  const entries = [];
  for (const rel of [...publishedFiles()].sort()) {
    if (!rel.endsWith(".html") || /^(templates|scripts|assets|node_modules|backup-[^/]*|prototipos|drafts)\//.test(rel)) continue;
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    if (/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    const url = absolute("/" + rel.replace(/(^|\/)index\.html$/, "$1"));
    if (canonical !== url) continue;        // copies, the root entry page and pages without a canonical
    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]);
    const title = ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    const description = ((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    const lang = (html.match(/<html[^>]*\blang="([a-z]{2})/i) || [])[1] || DEFAULT_LANG_LEGACY;
    entries.push({ rel, url, alternates, title, description, lang, images: pageImages(html), lastmod: contentLastmod(rel) });
  }
  return entries;
}

function sitemapXml(entries) {
  const urls = entries.map((e) => [
    "  <url>",
    `    <loc>${xmlEsc(e.url)}</loc>`,
    `    <lastmod>${e.lastmod}</lastmod>`,
    ...e.alternates.map(([code, href]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${xmlEsc(href)}"/>`),
    ...e.images.map((src) => `    <image:image><image:loc>${xmlEsc(src)}</image:loc></image:image>`),
    "  </url>"
  ].join("\n"));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    "</urlset>",
    ""
  ].join("\n");
}

// llms.txt (llmstxt.org): a plain map of the public pages, generated from the same entries as the
// sitemap so it can never drift from the site. It does not grant or deny anything: crawler access is
// governed by robots.txt.
function llmsTxt(entries) {
  const byLang = (lang) => entries.filter((e) => e.lang === lang).map((e) => `- [${e.title}](${e.url})${e.description ? `: ${e.description}` : ""}`);
  const names = { es: "Español", en: "English", ru: "Русский", uk: "Українська" };
  return [
    "# 3DNA",
    "",
    `> ${translations.en.schema.organizationDescription} Studio based in Salobreña (Granada, Spain), founded by Andrei Yafimenka. Contact: ${PUBLIC_EMAIL}.`,
    "",
    "Space planning, interior design and architectural 3D visualization for restaurants, bars and cafés, gyms and sports centres, clinics and other commercial spaces, with interactive 3D presentations and online business calculators. The site is published in Spanish, English, Russian and Ukrainian; each page lists its translations (hreflang).",
    "",
    ...["es", "en", "ru", "uk"].flatMap((lang) => { const list = byLang(lang); return list.length ? [`## ${names[lang]}`, "", ...list, ""] : []; }),
    "## Optional",
    "",
    `- [Sitemap](${SITE_URL}/sitemap.xml): every public page with its translations and images`,
    ""
  ].join("\n");
}

// AI model training is a separate decision from search visibility. Search crawlers (Googlebot,
// Bingbot, OAI-SearchBot, PerplexityBot, Applebot, DuckDuckBot...) always follow the public rules.
// Set to true to refuse the crawlers and tokens used only to train AI models; search and AI search
// answers are unaffected.
const AI_TRAINING_OPT_OUT = false;
const AI_TRAINING_AGENTS = ["GPTBot", "Google-Extended", "ClaudeBot", "CCBot", "Applebot-Extended", "Meta-ExternalAgent", "Bytespider"];
const robotsTxt = () =>
  [
    "User-agent: *",
    "Allow: /",
    "",
    "# Build sources (not public content). Pages, styles, scripts, images and videos stay",
    "# crawlable: search engines need them to render the pages.",
    "Disallow: /templates/",
    "Disallow: /scripts/",
    "",
    "# Search crawlers (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot, Applebot, DuckDuckBot...)",
    "# follow the rules above.",
    ...(AI_TRAINING_OPT_OUT
      ? ["", "# AI model training: not allowed (search and AI search answers are not affected)",
         ...AI_TRAINING_AGENTS.flatMap((a) => [`User-agent: ${a}`, "Disallow: /", ""])]
      : ["# AI model training crawlers (GPTBot, Google-Extended, ClaudeBot, CCBot...) are allowed too;",
         "# this is set by AI_TRAINING_OPT_OUT in scripts/build-i18n.js.", ""]),
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ""
  ].join("\n");

// ---------------------------------------------------------------- build
// pages of listings taken out of properties.json are removed (generated property folders only)
for (const lang of SUPPORTED) {
  const dir = path.join(root, realEstateSectionPath(lang).replace(/^\//, ""));
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const index = path.join(dir, entry.name, "index.html");
    if (!entry.isDirectory() || realEstate.slugs().includes(entry.name) || !fs.existsSync(index)) continue;
    if (!fs.readFileSync(index, "utf8").includes("templates/property.html")) continue;
    fs.rmSync(path.join(dir, entry.name), { recursive: true });
    console.log(`removed ${path.relative(root, path.join(dir, entry.name))} (no longer in properties.json)`);
  }
}
// draft mode: only the real estate pages, at their draft addresses, marked as a draft; nothing else
if (RE_DRAFT) {
  const BANNER = {
    es: "BORRADOR INTERNO · Precios de ejemplo, no reales · No publicar",
    en: "INTERNAL DRAFT · Example prices, not real · Do not publish",
    ru: "ВНУТРЕННИЙ ЧЕРНОВИК · Цены условные, не реальные · Не публиковать",
    uk: "ВНУТРІШНЯ ЧЕРНЕТКА · Ціни умовні, не реальні · Не публікувати",
  };
  for (const [key, page] of Object.entries(PAGES)) {
    if (key !== "realEstate" && !propertySlugOf(key)) continue;
    for (const lang of SUPPORTED) {
      const html = render(lang, { page: key }, page.template())
        .replace(/(main\.(?:css|js))\?v=[\w.-]+/g, (m, file) => `${file}?v=${ASSET_VERSIONS[file]}`)
        .replace("<head>", '<head>\n  <meta name="robots" content="noindex, nofollow">')
        .replace(/(<main [^>]*>)/, `$1\n<p class="re-draft" role="note">${escapeHtml(BANNER[lang])}</p>`);
      write(pageFile(key, lang), html);
    }
  }
  console.log("draft written (example prices): /inmobiliaria-borrador/ and /<lang>/real-estate-draft/");
  process.exit(0);
}
for (const lang of SUPPORTED) write(`${lang}/index.html`, render(lang));
for (const lang of SUPPORTED) write(`assets/partials/${formPartialFile(lang)}`, render(lang, {}, formTemplate));
write("index.html", render(DEFAULT_LANG, { isRoot: true }));
for (const [key, page] of Object.entries(PAGES)) {
  for (const lang of pageLangs(key)) {
    const html = render(lang, { page: key }, page.template())
      .replace(/(main\.(?:css|js))\?v=[\w.-]+/g, (m, file) => `${file}?v=${ASSET_VERSIONS[file]}`);
    write(pageFile(key, lang), html);
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
  if (!/application\/ld\+json/.test(out)) out = out.replace(/<\/head>/i, `${legacyStructuredData(out, lang)}\n</head>`);
  // same cache-busting versions as the home pages, so a page never pairs the
  // shared markup with an older cached main.js / main.css
  out = out.replace(/(main\.(?:css|js))\?v=[\w.-]+/g, (m, file) => `${file}?v=${ASSET_VERSIONS[file]}`);
  if (crlf) out = out.replace(/\n/g, "\r\n");
  if (bom + out !== raw) write(page, bom + out);
}
// Calculator share pages (Restaurants, Fitness): the social preview of a calculator link (title,
// description, 1200×630 image) in the initial HTML; visitors are sent straight on to the
// calculator with the shared values. noindex; canonical = the language's page.
const CALC_SHARES = [
  { page: "restaurants", trans: "restaurantsPage", path: restaurantCalcSharePath, image: "/images/og/restaurant-calculator-og.jpg", type: "image/jpeg" },
  { page: "fitness", trans: "fitnessPage", path: fitnessCalcSharePath, image: "/images/og/fitness-calculator-og.jpg", type: "image/jpeg" },
];
for (const cs of CALC_SHARES) for (const lang of SUPPORTED) {
  const CALC_OG_IMAGE = cs.image;
  const sh = translations[lang][cs.trans].calc.share;
  const target = pagePathFor(cs.page, lang);
  const shareUrl = absolute(cs.path(lang));
  const e = escapeHtml;
  write(`${cs.path(lang).replace(/^\//, "")}index.html`, `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(sh.title)}</title>
  <meta name="description" content="${e(sh.description)}">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${e(absolute(target))}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="3DNA">
  <meta property="og:locale" content="${e(translations[lang].meta.ogLocale)}">
  <meta property="og:title" content="${e(sh.title)}">
  <meta property="og:description" content="${e(sh.description)}">
  <meta property="og:url" content="${e(shareUrl)}">
  <meta property="og:image" content="${e(absolute(CALC_OG_IMAGE))}">
  <meta property="og:image:secure_url" content="${e(absolute(CALC_OG_IMAGE))}">
  <meta property="og:image:type" content="${cs.type}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(sh.imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(sh.title)}">
  <meta name="twitter:description" content="${e(sh.description)}">
  <meta name="twitter:image" content="${e(absolute(CALC_OG_IMAGE))}">
  <meta name="twitter:image:alt" content="${e(sh.imageAlt)}">
  <link rel="icon" type="image/png" href="/img/favicon_32x322.png">
  <script>location.replace(${JSON.stringify(target)} + location.search + "#calculadora");</script>
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ec;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#161513}a{color:inherit}</style>
</head>
<body>
  <p><a href="${e(target)}#calculadora">${e(sh.open)}</a></p>
</body>
</html>
`);
}

// Direct links to project 3D models: the model page (prototipos/…/index.html) served at a clean, localized
// address. Asset paths become absolute; language and public mode are preset; a link leads back to the project.
for (const lang of SUPPORTED) for (const m of projects.directModels(lang)) {
  const base = "/prototipos/washroom-suite/";
  let html = read("prototipos/washroom-suite/index.html")
    .replace(/(href|src)="(?!https?:|\/|#|data:)(\.\/)?([^"]+)"/g, (all, attr, dot, rel) => `${attr}="${base}${rel}"`)
    .replace(/"\.\/vendor\//g, `"${base}vendor/`)
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(m.title)}</title>`)
    .replace("<body>", `<body>
<a class="ws-back" href="${m.back}"><span aria-hidden="true">&larr;</span> ${escapeHtml(m.backLabel)}</a>`)
    .replace(/(<script src="[^"]*washroom-suite\.i18n\.js)/, `<script>window.WS_PRESET = ${JSON.stringify({ lang, public: true })};</script>
$1`);
  // link previews (Telegram, WhatsApp, Facebook, X, LinkedIn…): description and a 1200 × 630 image in the HTML
  if (m.share) {
    const e = escapeHtml, url = absolute(m.path), img = absolute(m.share.image);
    const tags = [
      `<meta name="description" content="${e(m.share.text)}">`,
      `<link rel="canonical" href="${e(url)}">`,
      ...m.langs.map(([l, pth]) => `<link rel="alternate" hreflang="${l}" href="${e(absolute(pth))}">`),
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="3DNA">`,
      `<meta property="og:locale" content="${e(translations[lang].meta.ogLocale)}">`,
      `<meta property="og:title" content="${e(m.share.title)}">`,
      `<meta property="og:description" content="${e(m.share.text)}">`,
      `<meta property="og:url" content="${e(url)}">`,
      `<meta property="og:image" content="${e(img)}">`,
      `<meta property="og:image:secure_url" content="${e(img)}">`,
      `<meta property="og:image:type" content="image/jpeg">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${e(m.share.alt)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${e(m.share.title)}">`,
      `<meta name="twitter:description" content="${e(m.share.text)}">`,
      `<meta name="twitter:image" content="${e(img)}">`,
      `<meta name="twitter:image:alt" content="${e(m.share.alt)}">`
    ];
    html = html.replace(/(<title>[^<]*<\/title>)/, (t) => `${t}\n${tags.join("\n")}`);
  }
  write(m.file, html);
}

// Scope-of-work boards (Spanish documentation pages for client proposals): assets/data/boards/*.json
for (const file of fs.readdirSync(path.join(root, "assets/data/boards")).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(read(`assets/data/boards/${file}`));
  const board = require("./scope-board.js").createScopeBoard(data);
  const e = escapeHtml, url = absolute(`/${data.slug}/`), img = absolute(data.meta.ogImage);
  const html = `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Built by scripts/build-i18n.js + scripts/scope-board.js from assets/data/boards/${file} -->
  <title>${e(data.meta.title)}</title>
  <meta name="description" content="${e(data.meta.description)}">
  <link rel="canonical" href="${e(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="3DNA">
  <meta property="og:locale" content="${e(translations[data.lang].meta.ogLocale)}">
  <meta property="og:title" content="${e(data.meta.shareTitle || data.title)}">
  <meta property="og:description" content="${e(data.meta.description)}">
  <meta property="og:url" content="${e(url)}">
  <meta property="og:image" content="${e(img)}">
  <meta property="og:image:secure_url" content="${e(img)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(data.meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(data.meta.shareTitle || data.title)}">
  <meta name="twitter:description" content="${e(data.meta.description)}">
  <meta name="twitter:image" content="${e(img)}">
  <meta name="twitter:image:alt" content="${e(data.meta.ogImageAlt)}">
${data.meta.ogVideo ? `  <meta property="og:video" content="${e(absolute(data.meta.ogVideo))}">
  <meta property="og:video:secure_url" content="${e(absolute(data.meta.ogVideo))}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="${data.meta.ogVideoWidth}">
  <meta property="og:video:height" content="${data.meta.ogVideoHeight}">
` : ""}  <script>window.I18N = ${jsonForScript({ lang: data.lang, languages: SUPPORTED, whatsappHref: whatsappHref(data.lang) })};</script>
  <link rel="stylesheet" href="/assets/fonts/site.css?v=20261010a">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/css/main.css?v=${ASSET_VERSIONS["main.css"]}">
  <link rel="stylesheet" href="/assets/css/scope-board.css?v=${fileVersion("assets/css/scope-board.css")}">
</head>
<body>
<!-- 3dna:header -->
<!-- /3dna:header -->
${board.bodyHtml(pagePathFor("fitness", data.lang) + "#proyectos")}
<!-- 3dna:footer -->
<!-- /3dna:footer -->
<script src="/assets/js/main.js?v=${ASSET_VERSIONS["main.js"]}"></script>
<script src="/assets/js/scope-board.js?v=${fileVersion("assets/js/scope-board.js")}" defer></script>
</body>
</html>
`;
  // structured data: the board is a project page under the Fitness page
  const boardHtml = applyLayout(html, data.lang).replace(/<\/head>/i, `${legacyStructuredData(html, data.lang, "fitness")}
</head>`);
  write(`${data.slug}/index.html`, "﻿" + boardHtml);
}

const SITEMAP_ENTRIES = sitemapEntries();
write("sitemap.xml", sitemapXml(SITEMAP_ENTRIES));
write("robots.txt", robotsTxt());
write("llms.txt", llmsTxt(SITEMAP_ENTRIES));
