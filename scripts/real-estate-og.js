/*
 * Link-preview cards (1200 × 630 JPG) for the real estate pages, made during `npm run build:i18n`.
 * Jobs come from scripts/real-estate.js (shareJobs): the landing card (hero film still or photo,
 * hero heading, "Costa del Sol · Costa Tropical") and one card per listing and language (lead photo,
 * title, location, price; a "sea views" label only when confirmed).
 *
 * Rendering: Microsoft Edge headless (screenshot of a small HTML page in the site's fonts, from
 * assets/fonts) + ffmpeg (film still, JPG). A card is redrawn only when its inputs change
 * (images/og/real-estate/manifest.json). Without Edge or ffmpeg nothing is drawn: the build warns
 * and pages fall back to the landing card / the site's default preview.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const VERSION = 3;   // bump to redraw every card after a design change
const EDGE = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
const hasFfmpeg = () => { try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch (e) { return false; } };

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const url = (file) => "file:///" + file.replace(/\\/g, "/");

function cardHtml(root, job, background) {
  // fonts embedded as data: URLs (file: fonts do not always load in a headless screenshot)
  const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, "assets/fonts", f)).toString("base64")}`;
  const cyr = job.lang === "ru" || job.lang === "uk";
  const landing = job.kind === "landing";
  const size = landing ? (cyr ? 70 : 80) : job.title.length > 46 ? 44 : 52;
  return `<!doctype html><html lang="${job.lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:100 900;src:url(${font("inter-latin-SjIa1ZL7.woff2")}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:Inter;font-weight:100 900;src:url(${font("inter-latin-ext-a25L7SUc.woff2")}) format("woff2");unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:Inter;font-weight:100 900;src:url(${font("inter-cyrillic-a0ZL7SUc.woff2")}) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"DM Serif Text";font-style:italic;src:url(${font("dmseriftext-latin-WfG1X1oN.woff2")}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD}
@font-face{font-family:"DM Serif Text";font-style:italic;src:url(${font("dmseriftext-latin-ext-1UVoNMrY.woff2")}) format("woff2");unicode-range:U+0100-02AF,U+1E00-1EFF,U+20A0-20C0,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:Inter;font-weight:100 900;src:url(${font("inter-cyrillic-ext-a2JL7SUc.woff2")}) format("woff2");unicode-range:U+0460-052F,U+1C80-1C88,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#15110d;font-family:Inter,system-ui,sans-serif;color:#fff}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${job.position}}
.shade{position:absolute;inset:0;background:${landing
    ? "linear-gradient(90deg,rgba(10,10,9,.82) 0%,rgba(10,10,9,.55) 38%,rgba(10,10,9,.08) 66%,rgba(10,10,9,0) 80%),linear-gradient(0deg,rgba(10,10,9,.5) 0%,rgba(10,10,9,0) 40%)"
    : "linear-gradient(0deg,rgba(10,10,9,.9) 0%,rgba(10,10,9,.62) 34%,rgba(10,10,9,0) 64%),linear-gradient(180deg,rgba(10,10,9,.45) 0%,rgba(10,10,9,0) 26%)"}}
.logo{position:absolute;left:60px;top:50px;height:34px;width:auto;filter:brightness(0) invert(1)}
.text{position:absolute;left:60px;right:60px;bottom:54px}
.kicker{margin:0 0 14px;font-size:20px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#f1d9a8}
h1 em{font-family:"DM Serif Text",Georgia,serif;font-style:italic;font-weight:400;letter-spacing:-.01em}
h1{margin:0;max-width:${landing ? 640 : 1000}px;font-size:${size}px;line-height:1.02;font-weight:500;letter-spacing:-.04em}
.line{margin:18px 0 0;font-size:${landing ? 26 : 24}px;font-weight:500;color:rgba(255,255,255,.9)}
.row{display:flex;align-items:center;gap:16px;margin-top:20px}
.price{font-size:38px;font-weight:700;letter-spacing:-.01em}
.badge{padding:8px 14px;border-radius:4px;background:#fff;color:#15110d;font-size:18px;font-weight:700;letter-spacing:.04em}
</style></head><body>
<img class="bg" src="${url(background)}" alt="">
<div class="shade"></div>
<img class="logo" src="${url(path.join(root, "img/logo-3dna.png"))}" alt="">
<div class="text">${landing
    ? `<h1>${(() => { const w = String(job.title).trim().split(/\s+/), last = w.pop(); return `${esc(w.join(" "))} <em>${esc(last)}</em>`; })()}</h1><p class="line">${esc(job.line)}</p>`
    : `${job.location ? `<p class="kicker">${esc(job.location)}</p>` : ""}<h1>${esc(job.title)}</h1><div class="row">${job.price ? `<span class="price">${esc(job.price)}</span>` : ""}${job.badge ? `<span class="badge">${esc(job.badge)}</span>` : ""}</div>`}</div>
</body></html>`;
}

// Draws the cards that are missing or out of date. Returns the number drawn; never throws for a
// missing tool (pages then use the fallback image).
function ensureCards(root, jobs, log = console.log) {
  if (!jobs.length) return 0;
  const manifestFile = path.join(root, "images/og/real-estate/manifest.json");
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); } catch (e) { /* first run */ }
  const stamp = (job) => {
    const src = job.video || job.image;
    const file = src ? path.join(root, src.replace(/^\//, "")) : "";
    const srcHash = file && fs.existsSync(file) ? crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 10) : "missing";
    return crypto.createHash("sha1").update(JSON.stringify({ VERSION, ...job, srcHash })).digest("hex").slice(0, 16);
  };
  const todo = jobs.filter((j) => manifest[j.out] !== stamp(j) || !fs.existsSync(path.join(root, j.out.replace(/^\//, ""))));
  if (!todo.length) return 0;
  if (!EDGE || !hasFfmpeg()) {
    log(`real estate previews: ${todo.length} card(s) not drawn (needs Microsoft Edge and ffmpeg); pages use the fallback image`);
    return 0;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "3dna-re-og-"));
  const stills = {};
  let drawn = 0;
  for (const job of todo) {
    let background = job.image ? path.join(root, job.image.replace(/^\//, "")) : null;
    if (job.video) {
      if (!stills[job.video]) {
        stills[job.video] = path.join(tmp, `still-${Object.keys(stills).length}.png`);
        execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "4", "-i", path.join(root, job.video.replace(/^\//, "")), "-frames:v", "1", stills[job.video]]);
      }
      background = stills[job.video];
    }
    if (!background || !fs.existsSync(background)) { log(`real estate previews: no image for ${job.out}`); continue; }
    const page = path.join(tmp, `card-${drawn}.html`), png = path.join(tmp, `card-${drawn}.png`);
    fs.writeFileSync(page, cardHtml(root, job, background));
    execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      "--window-size=1200,630", "--virtual-time-budget=4000", "--allow-file-access-from-files",
      `--screenshot=${png}`, url(page)], { stdio: "ignore" });
    const out = path.join(root, job.out.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "crop=1200:630:0:0", "-q:v", "3", out]);
    manifest[job.out] = stamp(job);
    drawn++;
  }
  // cards of pages that no longer exist
  const keep = new Set(jobs.map((j) => j.out));
  for (const out of Object.keys(manifest)) if (!keep.has(out)) {
    fs.rmSync(path.join(root, out.replace(/^\//, "")), { force: true });
    delete manifest[out];
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  fs.rmSync(tmp, { recursive: true, force: true });
  log(`real estate previews: ${drawn} card(s) drawn`);
  return drawn;
}

module.exports = { ensureCards };
