/*
 * Social preview (Open Graph) images: 1200 × 630 JPG per page and language.
 *
 *   node scripts/og-images.js        (Windows; needs Microsoft Edge + ffmpeg)
 *
 * Each card = one existing project photograph (cover-cropped, never stretched),
 * a soft dark gradient on the text side, the 3DNA logo (img/logo.png, only its
 * transparent margin trimmed) and the page's headline in the site typography
 * (Inter + DM Serif Text italic for the last word, as on the pages).
 * Text comes from assets/i18n/translations.json, so the cards follow the copy.
 * Output: images/og/og-<lang>.jpg (home), og-restaurants-<lang>.jpg, og-fitness-<lang>.jpg.
 * The build (build-i18n.js, OG_IMAGES) points each page's og:image at its card.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const t = JSON.parse(fs.readFileSync(path.join(root, "assets/i18n/translations.json"), "utf8").replace(/^\uFEFF/, ""));
const LANGS = ["es", "en", "ru", "uk"];
const EDGE = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
if (!EDGE) throw new Error("Microsoft Edge not found");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "3dna-og-"));
const fileUrl = (rel) => "file:///" + path.join(root, rel).replace(/\\/g, "/");

// logo with its transparent margin trimmed (no scaling, no recolouring)
const logo = path.join(tmp, "logo.png");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(root, "img/logo.png"), "-vf", "crop=880:350:301:295", logo]);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// last word of a headline in italic serif, like the page titles
const headline = (lines) => {
  const words = lines.join(" ").trim().split(/\s+/);
  const last = words.pop();
  return `${esc(words.join(" "))} <em>${esc(last)}</em>`;
};

const CARDS = {
  home: {
    file: (l) => `og-${l}.jpg`,
    image: "images/sector-restaurants-still.webp", position: "62% 50%",
    eyebrow: (l) => t[l].hero.eyebrow,
    title: (l) => t[l].hero.headline,
    line: (l) => t[l].hero.subheadline,
  },
  restaurants: {
    file: (l) => `og-restaurants-${l}.jpg`,
    image: "images/banner-restaurant-render.webp", position: "70% 50%",
    eyebrow: (l) => t[l].restaurantsPage.plan.eyebrow,
    title: (l) => [t[l].restaurantsPage.plan.heading],
    line: (l) => t[l].restaurantsPage.plan.supporting,
  },
  fitness: {
    file: (l) => `og-fitness-${l}.jpg`,
    image: "images/fitness/hero-after.webp", position: "60% 50%",
    eyebrow: (l) => t[l].fitnessPage.hero.eyebrow,
    title: (l) => t[l].fitnessPage.hero.heading,
    line: (l) => t[l].fitnessPage.hero.lead,
  },
};

const html = (card, l) => `<!doctype html><html lang="${l}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&family=Inter:wght@400;500;600&display=block">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#15110d}
  .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${card.position}}
  .shade{position:absolute;inset:0;background:
    linear-gradient(90deg,rgba(12,10,8,.86) 0%,rgba(12,10,8,.62) 34%,rgba(12,10,8,.18) 62%,rgba(12,10,8,0) 80%),
    linear-gradient(0deg,rgba(12,10,8,.45) 0%,rgba(12,10,8,0) 38%)}
  .logo{position:absolute;left:64px;top:52px;width:196px;height:auto}
  .text{position:absolute;left:64px;bottom:60px;width:640px;color:#fff;font-family:Inter,system-ui,sans-serif}
  .eyebrow{margin:0 0 18px;font-size:15px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:#e3c48f}
  h1{margin:0;font-size:${l === "ru" || l === "uk" ? 54 : 64}px;line-height:1.03;font-weight:500;letter-spacing:-.03em}
  h1 em{font-family:"DM Serif Text",Georgia,serif;font-style:italic;font-weight:400;letter-spacing:-.01em}
  .line{margin:20px 0 0;font-size:19px;line-height:1.4;color:rgba(255,255,255,.86)}
  .url{position:absolute;right:56px;bottom:60px;font:500 15px Inter,sans-serif;letter-spacing:.12em;color:rgba(255,255,255,.8)}
</style></head><body>
<img class="bg" src="${fileUrl(card.image)}" alt="">
<div class="shade"></div>
<img class="logo" src="file:///${logo.replace(/\\/g, "/")}" alt="">
<div class="text"><p class="eyebrow">${esc(card.eyebrow(l))}</p><h1>${headline(card.title(l))}</h1><p class="line">${esc(card.line(l))}</p></div>
<div class="url">3dna.es</div>
</body></html>`;

const outDir = path.join(root, "images/og");
fs.mkdirSync(outDir, { recursive: true });
for (const [key, card] of Object.entries(CARDS)) {
  for (const l of LANGS) {
    const page = path.join(tmp, `${key}-${l}.html`);
    const png = path.join(tmp, `${key}-${l}.png`);
    fs.writeFileSync(page, html(card, l));
    execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      "--window-size=1200,630", "--virtual-time-budget=6000", "--allow-file-access-from-files",
      `--screenshot=${png}`, "file:///" + page.replace(/\\/g, "/")], { stdio: "ignore" });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "crop=1200:630:0:0", "-q:v", "3", path.join(outDir, card.file(l))]);
    console.log(`images/og/${card.file(l)}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
