/*
 * Renders the conceptual visuals of a marketing project to WebP (Windows; needs Microsoft Edge + ffmpeg).
 *
 *   node scripts/marketing-visuals/render.js letreros-programables            # every visual of the project
 *   node scripts/marketing-visuals/render.js letreros-programables reel-3     # only the named ones
 *
 * Jobs come from scripts/marketing-visuals/<project>.jobs.json:
 *   { "out": "images/marketing/projects/<id>",
 *     "jobs": [ { "name": "cover", "src": "letreros-programables.html?v=cover", "width": 1600, "height": 1200,
 *                 "scale": 1, "fullPage": false, "sizes": [1600, 800], "quality": 82 } ] }
 * fullPage pages report their height in document.title ("h:<px>") and are captured whole.
 * Output: <out>/<name>-<size>.webp for each size (width in px); .jpg when the job has "format": "jpg".
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..", "..");
const [project, ...only] = process.argv.slice(2);
if (!project) { console.error("usage: node scripts/marketing-visuals/render.js <project> [job ...]"); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, `${project}.jobs.json`), "utf8"));
const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
if (!EDGE) throw new Error("Microsoft Edge not found");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "3dna-mkv-"));
const outDir = path.join(root, spec.out);
fs.mkdirSync(outDir, { recursive: true });

const urlOf = (src) => src.startsWith("http") ? src : "file:///" + path.join(__dirname, src).replace(/\\/g, "/");
const edge = (args) => execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  "--virtual-time-budget=9000", "--run-all-compositor-stages-before-draw", ...args], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }).toString();

for (const job of spec.jobs.filter((j) => !only.length || only.includes(j.name))) {
  const scale = job.scale || 1;
  let height = job.height;
  if (job.fullPage) {
    const dom = edge([`--window-size=${job.width},${job.height}`, "--dump-dom", urlOf(job.src)]);
    const m = dom.match(/<title>h:(\d+)<\/title>/);
    if (!m) throw new Error(`${job.name}: page did not report its height`);
    height = +m[1];
  }
  const png = path.join(tmp, `${job.name}.png`);
  edge([`--window-size=${job.width},${height}`, `--force-device-scale-factor=${scale}`, `--screenshot=${png}`, urlOf(job.src)]);
  for (const size of job.sizes || [job.width * scale]) {
    // format "jpg" for link-preview cards (messengers want JPEG/PNG), WebP otherwise
    const jpg = job.format === "jpg";
    const file = path.join(outDir, `${job.name}-${size}.${jpg ? "jpg" : "webp"}`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", `crop=${job.width * scale}:${height * scale}:0:0,scale=${size}:-2:flags=lanczos`,
      ...(jpg ? ["-q:v", "3"] : ["-c:v", "libwebp", "-quality", String(job.quality || 82)]), file]);
    console.log(path.relative(root, file).replace(/\\/g, "/"), `${size}w`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
