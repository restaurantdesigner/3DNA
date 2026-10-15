// Checks for the fitness club interiors (section 03 / Zonificación): node scripts/fitness-club.test.js
// Every zone: flat eye-level render + 360° panorama (web copies exist, originals untouched in renders/),
// the four language pages carry the viewers, and the texts exist in es / en / ru / uk.
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/fitness-club.json"), "utf8"));
const texts = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/i18n/fitness-club.json"), "utf8"));
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.error("FAIL", m); } };
const exists = (p) => fs.existsSync(path.join(ROOT, p.replace(/^\//, "")));

ok(data.zones.length === 10, "10 zones");
for (const z of data.zones) {
  const r = z.render;
  ok(r && r.widths.every((w) => exists(`${r.base}-${w}.webp`)), `${z.id}: flat render in every width`);
  ok(r && exists(r.source), `${z.id}: original flat render kept (${r && r.source})`);
  ok(r && r.pano && r.pano.widths.every((w) => exists(`${r.pano.base}-${w}.webp`)), `${z.id}: 360° panorama in every width`);
  ok(r && r.pano && exists(r.pano.source), `${z.id}: original 360° render kept (${r && r.pano && r.pano.source})`);
}
const PAGES = { es: "gimnasios-3d.html", en: "en/fitness/index.html", ru: "ru/fitness/index.html", uk: "uk/fitness/index.html" };
for (const [lang, file] of Object.entries(PAGES)) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  ok((html.match(/data-fclub-open-render=/g) || []).length === 10, `${lang}: a render thumbnail per zone`);
  ok(/data-fclub-pano/.test(html) && /data-fclub-lb-pano/.test(html), `${lang}: 360° viewers in the viewport and full screen`);
  ok(/data-fclub-view="interior"/.test(html) && /data-fclub-lightbox/.test(html), `${lang}: interior switch and full-screen viewer`);
  const client = JSON.parse(html.match(/<script type="application\/json" id="fclub-data">([\s\S]*?)<\/script>/)[1]);
  ok(client.zones.every((z) => z.render && z.render.pano && z.render.pano[2048] && z.render.pano[3072]), `${lang}: panorama sources in the page data`);
  const ui = texts[lang].ui;
  ok(["view3d", "viewInterior", "openInterior", "fullscreen", "back3d", "closeViewer", "prev", "next", "renderCaption", "renderAlt", "viewerLabel", "viewSwitch", "pano360"].every((k) => typeof ui[k] === "string" && ui[k]), `${lang}: viewer texts`);
}
ok(exists("assets/js/fitness-club-3d/club-pano.js"), "360° viewer module");
console.log(fails ? `${fails} of ${n} checks FAILED` : `all ${n} checks passed`);
process.exitCode = fails ? 1 : 0;
