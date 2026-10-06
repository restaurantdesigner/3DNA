#!/usr/bin/env node
/*
 * Social preview images (1200x630), one per locale, from the hero video frame
 * and the hero copy in assets/i18n/translations.json.
 *
 * Needs ffmpeg on PATH and the Segoe UI / Georgia fonts (Windows). The output
 * is committed, so this only needs to run again when the copy changes:
 *   npm run build:og
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { SUPPORTED } = require("../assets/js/i18n-detect.js");

const root = path.join(__dirname, "..");
const translations = JSON.parse(fs.readFileSync(path.join(root, "assets/i18n/translations.json"), "utf8"));
const video = path.join(root, "videos/restaurant-hero.mp4");
const outDir = path.join(root, "images/og");
const fontDir = process.env.OG_FONT_DIR || "C:/Windows/Fonts";

// ffmpeg filter syntax: escape ":" and "'" inside quoted option values
const ff = (p) => p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
const font = (file) => ff(path.join(fontDir, file));

fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-"));

for (const lang of SUPPORTED) {
  const hero = translations[lang].hero;
  const texts = {
    brand: "3DNA",
    eyebrow: hero.eyebrow.toUpperCase(),
    l0: hero.headline[0],
    l1: hero.headline[1],
    l2: hero.headline[2]
  };
  // Text goes through files so quotes/apostrophes need no escaping
  const file = {};
  for (const [key, value] of Object.entries(texts)) {
    file[key] = path.join(tmp, `${lang}-${key}.txt`);
    fs.writeFileSync(file[key], value, "utf8");
  }
  const text = (key, fontFile, size, x, y, alpha = 1) =>
    `drawtext=textfile='${ff(file[key])}':fontfile='${font(fontFile)}':fontsize=${size}:fontcolor=white@${alpha}:x=${x}:y=${y}`;

  const filter = [
    // cover-crop the 16:9 frame to 1200x630
    `[0:v]scale=1200:-2,crop=1200:630[bg]`,
    // left-side shade, like the hero overlay
    `color=black:s=1200x630,format=rgba,geq=r=0:g=0:b=0:a='255*0.78*pow(max(0,1-X/W*1.35),1.1)'[shade]`,
    `[bg][shade]overlay=0:0,` + [
      text("brand", "segoeuib.ttf", 30, 72, 64),
      text("eyebrow", "seguisb.ttf", 22, 72, 236, 0.85),
      text("l0", "seguisb.ttf", 76, 68, 280),
      text("l1", "seguisb.ttf", 76, 68, 366),
      text("l2", "georgiai.ttf", 80, 70, 448)
    ].join(",")
  ].join(";");

  const out = path.join(outDir, `og-${lang}.jpg`);
  const result = spawnSync("ffmpeg", [
    "-v", "error", "-y", "-ss", "6", "-i", video, "-frames:v", "1",
    "-filter_complex", filter, "-q:v", "3", out
  ], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
  console.log(`wrote images/og/og-${lang}.jpg`);
}
fs.rmSync(tmp, { recursive: true, force: true });
