import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/*
  Plan mapping. The floor plan's only dimension (960 mm, door pivot to the first tick)
  spans 198 px, so 1 px = 0.96 / 198 m. Origin: WC face of the partition (px 300.5)
  and the room face of the back wall (py 62). x runs right, z runs toward the front.
*/
const S = 0.96 / 198;
const PX = px => (px - 300.5) * S;
const PY = py => (py - 62) * S;

const H = 2.7;                              // wall height, metres (not on the plan)
const X_VL = PX(75), X_PV = PX(277.5), X_PW = 0, X_R = PX(657.5), X_RO = PX(690.5), X_L0 = PX(0);
const Z_BO = PY(39.5), Z_V = PY(459), Z_THR = PY(471), Z_W = PY(469.5), Z_FO = PY(469.5) + 0.2;
const Z_LW = PY(262), Z_D0 = PY(300), Z_D1 = PY(455);

const PLAN_PNG = new URL('./plan-reference.png', import.meta.url).href;   // was embedded as a data URI in the artifact
// interface language and public mode (washroom-suite.i18n.js); the public embed never loads the client's plan
const WS = window.WS || { tr: s => s, isPublic: false };

const stage = document.getElementById('stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  // alpha: the canvas is transparent where there is no model, so the page's white shows through untouched by tone mapping
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  window.__modelFail();
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.03, 80);

/* ---------- procedural textures ---------- */

const rand = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function tiled(g, s, fn) {
  for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.save(); g.translate(dx, dy); fn(); g.restore(); }
}
function strokePts(g, pts) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}
function makeTex(size, coverage, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / coverage, 1 / coverage);      // geometry UVs are in metres
  t.anisotropy = maxAniso;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function paintStone(g, s, o) {
  const r = rand(o.seed);
  g.fillStyle = rgba(o.base, 1); g.fillRect(0, 0, s, s);
  if (o.tiles) {
    const [tx, ty] = o.tiles;
    for (let i = 0; i < tx; i++) for (let j = 0; j < ty; j++) {
      const k = r() - 0.5;
      g.fillStyle = k < 0 ? rgba([0, 0, 0], -k * 0.07) : rgba([255, 255, 255], k * 0.07);
      g.fillRect(i * s / tx, j * s / ty, s / tx, s / ty);
    }
  }
  for (let i = 0; i < (o.clouds || 0); i++) {
    const x = r() * s, y = r() * s, rad = s * (0.04 + r() * 0.2);
    const a = o.cloudA * (0.4 + r() * 0.6), col = r() < 0.5 ? o.light : o.dark;
    tiled(g, s, () => {
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    });
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let v = 0; v < (o.veins || 0); v++) {
    let x = r() * s, y = r() * s, ang = o.angle + (r() - 0.5) * 1.2;
    const pts = [[x, y]], len = s * (0.25 + r() * 0.6), step = s / 160;
    for (let d = 0; d < len; d += step) {
      ang += (r() - 0.5) * 0.45;
      x += Math.cos(ang) * step; y += Math.sin(ang) * step;
      pts.push([x, y]);
    }
    const w = o.veinW * (s / 1024) * (0.5 + r()), a = o.veinA * (0.35 + r() * 0.65);
    tiled(g, s, () => {
      g.strokeStyle = rgba(o.vein, a * 0.22); g.lineWidth = w * 5; strokePts(g, pts);
      g.strokeStyle = rgba(o.vein, a); g.lineWidth = w; strokePts(g, pts);
    });
  }
  if (o.tiles && o.grout) {
    const [tx, ty] = o.tiles, gw = (o.groutW || 2) * s / 1024;
    g.fillStyle = rgba(o.grout, o.groutA);
    for (let i = 0; i <= tx; i++) g.fillRect(Math.round(i * s / tx) - gw / 2, 0, gw, s);
    for (let j = 0; j <= ty; j++) g.fillRect(0, Math.round(j * s / ty) - gw / 2, s, gw);
  }
}

const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v + k))));
function gridLines(g, s, cols, rows, col, a, w) {
  g.fillStyle = rgba(col, a);
  for (let i = 0; i <= cols; i++) g.fillRect(Math.round(i * s / cols) - w / 2, 0, w, s);
  for (let j = 0; j <= rows; j++) g.fillRect(0, Math.round(j * s / rows) - w / 2, s, w);
}
function tileTone(g, s, r, cols, rows, amt) {
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const k = r() - 0.5;
    g.fillStyle = k < 0 ? rgba([0, 0, 0], -k * amt) : rgba([255, 255, 255], k * amt);
    g.fillRect(i * s / cols, j * s / rows, s / cols, s / rows);
  }
}
// bump maps: white face, black joint
const jointBump = (cols, rows, w) => (g, s) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
  gridLines(g, s, cols, rows, [0, 0, 0], 1, Math.max(1.5, w * s / 1024));
};
function brick(g, s, cols, rows, gw, face) {
  const tw = s / cols, th = s / rows;
  for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
    face(i * tw + (j % 2 ? tw / 2 : 0) + gw / 2, j * th + gw / 2, tw - gw, th - gw);
  }
}

function paintTravertine(g, s) {
  const r = rand(61), k = s / 1024;
  g.fillStyle = rgba([212, 194, 166], 1); g.fillRect(0, 0, s, s);
  for (let i = 0; i < 240; i++) {
    const y = r() * s, h = (1 + r() * 7) * k, a = 0.05 + r() * 0.12;
    const col = r() < 0.55 ? [236, 222, 198] : [176, 154, 122];
    const amp = (2 + r() * 8) * k, ph = r() * 6.283, f = (1 + Math.floor(r() * 3)) * 2 * Math.PI / s;
    g.fillStyle = rgba(col, a);
    for (const dy of [-s, 0, s]) {
      g.beginPath();
      for (let x = 0; x <= s; x += s / 64) g.lineTo(x, y + dy + Math.sin(ph + f * x) * amp);
      for (let x = s; x >= 0; x -= s / 64) g.lineTo(x, y + dy + h + Math.sin(ph + f * x) * amp);
      g.closePath(); g.fill();
    }
  }
  for (let i = 0; i < 700; i++) {
    const x = r() * s, y = r() * s;
    g.fillStyle = rgba([120, 100, 74], 0.25 + r() * 0.35);
    g.beginPath(); g.ellipse(x, y, (1 + r() * 5) * k, (0.6 + r() * 1.4) * k, 0, 0, Math.PI * 2); g.fill();
  }
  tileTone(g, s, r, 2, 4, 0.08);
  gridLines(g, s, 2, 4, [170, 152, 126], 0.7, 3 * k);
}
function paintMicrocement(g, s) {
  paintStone(g, s, { seed: 51, base: [174, 170, 163], light: [198, 194, 188], dark: [148, 144, 138], clouds: 180, cloudA: 0.2 });
  const r = rand(52), k = s / 1024;
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = r() * s, y = r() * s, rad = (60 + r() * 220) * k, a0 = r() * 6.283, sweep = 0.5 + r() * 1.2;
    const col = r() < 0.5 ? [204, 200, 194] : [140, 136, 130], a = 0.05 + r() * 0.08, w = (6 + r() * 26) * k;
    tiled(g, s, () => { g.strokeStyle = rgba(col, a); g.lineWidth = w; g.beginPath(); g.arc(x, y, rad, a0, a0 + sweep); g.stroke(); });
  }
}
function paintTerrazzo(g, s) {
  const r = rand(71), k = s / 1024;
  g.fillStyle = rgba([222, 218, 210], 1); g.fillRect(0, 0, s, s);
  const cols = [[120, 118, 114], [70, 70, 72], [168, 96, 70], [246, 244, 240], [150, 158, 146], [196, 170, 128]];
  for (let i = 0; i < 1600; i++) {
    const x = r() * s, y = r() * s, rad = (2 + Math.pow(r(), 2.4) * 16) * k;
    const col = cols[Math.floor(r() * cols.length)], n = 5 + Math.floor(r() * 4), rot = r() * 6.283;
    const pts = [];
    for (let j = 0; j < n; j++) {
      const a = rot + j * 2 * Math.PI / n + (r() - 0.5) * 0.6, rr = rad * (0.6 + r() * 0.5);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    const chip = () => { g.fillStyle = rgba(col, 1); g.beginPath(); for (const [px, py] of pts) g.lineTo(px, py); g.closePath(); g.fill(); };
    const edge = 20 * k;
    if (x < edge || y < edge || x > s - edge || y > s - edge) tiled(g, s, chip); else chip();
  }
  gridLines(g, s, 2, 2, [190, 186, 178], 0.6, 2 * k);
}
function paintSubway(g, s) {
  const r = rand(81), gw = Math.max(1.5, 4 * s / 1024);
  g.fillStyle = rgba([192, 190, 186], 1); g.fillRect(0, 0, s, s);
  brick(g, s, 4, 16, gw, (x, y, w, h) => {
    g.fillStyle = rgba(shade([238, 238, 234], (r() - 0.5) * 10), 1); g.fillRect(x, y, w, h);
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.2, 'rgba(255,255,255,0)');
    gr.addColorStop(0.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  });
}
function bumpSubway(g, s) {
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#fff';
  brick(g, s, 4, 16, Math.max(1.5, 4 * s / 1024), (x, y, w, h) => g.fillRect(x, y, w, h));
}
function paintZellige(g, s) {
  const r = rand(91), n = 12, c = s / n, gw = Math.max(1.5, 3 * s / 1024);
  g.fillStyle = rgba([150, 148, 140], 1); g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * c + gw / 2, y = j * c + gw / 2, w = c - gw;
    g.fillStyle = rgba(shade([34, 96, 76], (r() - 0.5) * 40), 1); g.fillRect(x, y, w, w);
    const px = x + r() * w, py = y + r() * w, a = 0.35 * r();
    const gr = g.createRadialGradient(px, py, 0, px, py, w * (0.5 + r() * 0.6));
    gr.addColorStop(0, rgba([120, 190, 160], a)); gr.addColorStop(1, rgba([120, 190, 160], 0));
    g.fillStyle = gr; g.fillRect(x, y, w, w);
    g.strokeStyle = rgba([10, 40, 30], 0.35); g.lineWidth = 3 * s / 1024; g.strokeRect(x + 1, y + 1, w - 2, w - 2);
  }
}
function paintSlats(g, s) {
  const r = rand(101), n = 24, p = s / n, gap = p * 0.22;
  g.fillStyle = rgba([28, 22, 18], 1); g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) {
    const x0 = i * p + gap / 2, w = p - gap;
    g.fillStyle = rgba(shade([172, 124, 80], (r() - 0.5) * 30), 1); g.fillRect(x0, 0, w, s);
    g.save(); g.beginPath(); g.rect(x0, 0, w, s); g.clip();
    for (let l = 0; l < 10; l++) {
      const gx = x0 + r() * w, amp = r() * w * 0.12, ph = r() * 6.283, f = (1 + Math.floor(r() * 3)) * 2 * Math.PI / s;
      g.strokeStyle = rgba(r() < 0.6 ? [120, 80, 46] : [204, 160, 112], 0.25 + r() * 0.3);
      g.lineWidth = (0.6 + r() * 1.4) * s / 1024;
      g.beginPath();
      for (let y = 0; y <= s; y += s / 64) g.lineTo(gx + Math.sin(ph + f * y) * amp, y);
      g.stroke();
    }
    g.restore();
    const sh = g.createLinearGradient(x0, 0, x0 + w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(0.25, 'rgba(255,255,255,0.06)');
    sh.addColorStop(0.75, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = sh; g.fillRect(x0, 0, w, s);
  }
}
function bumpSlats(g, s) {
  const n = 24, p = s / n, gap = p * 0.22;
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) {
    const x0 = i * p + gap / 2, w = p - gap;
    const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
    gr.addColorStop(0, '#555'); gr.addColorStop(0.2, '#fff'); gr.addColorStop(0.8, '#fff'); gr.addColorStop(1, '#555');
    g.fillStyle = gr; g.fillRect(x0, 0, w, s);
  }
}
function paintTerracotta(g, s) {
  const r = rand(111), n = 6, c = s / n, gw = Math.max(2, 6 * s / 1024);
  g.fillStyle = rgba([214, 204, 190], 1); g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * c + gw / 2, y = j * c + gw / 2, w = c - gw;
    g.fillStyle = rgba(shade([178, 94, 62], (r() - 0.5) * 36), 1); g.fillRect(x, y, w, w);
    g.save(); g.beginPath(); g.rect(x, y, w, w); g.clip();
    for (let b = 0; b < 26; b++) {
      const bx = x + r() * w, by = y + r() * w, br = w * (0.06 + r() * 0.3);
      const col = r() < 0.5 ? [206, 124, 88] : [140, 66, 42];
      const gr = g.createRadialGradient(bx, by, 0, bx, by, br);
      gr.addColorStop(0, rgba(col, 0.22)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    g.restore();
  }
}

// Wall coverings. cover = metres of wall one texture repeat spans; tile sizes follow from it.
const WALLS = [
  { name: 'Greige marble', cover: 2.4, rough: 0.4, bumpScale: 0.6, bump: jointBump(4, 2, 2),
    paint: (g, s) => paintStone(g, s, { seed: 11, base: [150, 144, 137], light: [178, 172, 165], dark: [124, 118, 111],
      clouds: 70, cloudA: 0.18, veins: 18, vein: [196, 191, 183], veinA: 0.3, veinW: 0.9, angle: 1.1,
      tiles: [4, 2], grout: [104, 99, 92], groutA: 0.5 }) },
  { name: 'White marble', cover: 2.4, rough: 0.25, bumpScale: 0.6, bump: jointBump(2, 1, 2),
    paint: (g, s) => paintStone(g, s, { seed: 31, base: [232, 229, 224], light: [246, 245, 242], dark: [212, 207, 200],
      clouds: 60, cloudA: 0.2, veins: 12, vein: [128, 118, 104], veinA: 0.5, veinW: 1.4, angle: 1.3,
      tiles: [2, 1], grout: [200, 196, 190], groutA: 0.6 }) },
  { name: 'Black marble', cover: 2.4, rough: 0.22, bumpScale: 0.6, bump: jointBump(2, 1, 2),
    paint: (g, s) => paintStone(g, s, { seed: 41, base: [30, 30, 32], light: [52, 52, 56], dark: [16, 16, 18],
      clouds: 60, cloudA: 0.3, veins: 16, vein: [222, 220, 216], veinA: 0.55, veinW: 1.1, angle: 0.9,
      tiles: [2, 1], grout: [12, 12, 12], groutA: 0.8 }) },
  { name: 'Travertine', cover: 1.2, rough: 0.5, bumpScale: 0.8, bump: jointBump(2, 4, 3), paint: paintTravertine },
  { name: 'Microcement', cover: 2.4, rough: 0.6, paint: paintMicrocement },
  { name: 'Terrazzo', cover: 1.2, rough: 0.35, bumpScale: 0.5, bump: jointBump(2, 2, 2), paint: paintTerrazzo },
  { name: 'White subway tile', cover: 1.2, rough: 0.12, bumpScale: 1, bump: bumpSubway, paint: paintSubway },
  { name: 'Green zellige', cover: 1.2, rough: 0.14, bumpScale: 0.5, bump: jointBump(12, 12, 3), paint: paintZellige },
  { name: 'Oak slats', cover: 1.2, rough: 0.55, bumpScale: 1.2, bump: bumpSlats, paint: paintSlats },
  { name: 'Terracotta tile', cover: 1.2, rough: 0.65, bumpScale: 1, bump: jointBump(6, 6, 6), paint: paintTerracotta },
];
function paintHerringbone(g, s, bump = false) {
  // planks 5:1; the pattern repeats on the lattice (9W, 0), (W, W), so 36 plank widths tile the texture exactly
  const W = s / 36, k = 5, L = k * W, step = 2 * k - 1;
  const mod = (a, m) => ((a % m) + m) % m;
  g.fillStyle = bump ? '#000' : rgba([40, 30, 22], 1); g.fillRect(0, 0, s, s);
  const plank = (x, y, w, h, horiz, id) => {
    if (x > s || y > s || x + w < 0 || y + h < 0) return;
    const inset = Math.max(0.6, s / 1700);
    if (bump) { g.fillStyle = '#fff'; g.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2); return; }
    const r = rand(id);
    g.fillStyle = rgba(shade([168, 122, 80], (r() - 0.5) * 34), 1);
    g.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let l = 0; l < 6; l++) {
      g.strokeStyle = rgba(r() < 0.6 ? [118, 80, 48] : [206, 164, 118], 0.2 + r() * 0.25);
      g.lineWidth = (0.6 + r()) * s / 1024;
      g.beginPath();
      if (horiz) {
        const yy = y + r() * h;
        g.moveTo(x, yy); g.bezierCurveTo(x + w * 0.3, yy + (r() - 0.5) * h * 0.4, x + w * 0.7, yy + (r() - 0.5) * h * 0.4, x + w, yy);
      } else {
        const xx = x + r() * w;
        g.moveTo(xx, y); g.bezierCurveTo(xx + (r() - 0.5) * w * 0.4, y + h * 0.3, xx + (r() - 0.5) * w * 0.4, y + h * 0.7, xx, y + h);
      }
      g.stroke();
    }
    g.restore();
  };
  for (let j = -6; j <= 6; j++) for (let n = -8; n <= 40; n++) {
    const ox = (n + j * step) * W, oy = n * W;
    // seed by position modulo the repeat, so a plank cut by the edge matches its wrapped copy
    const id = (mod(n + j * step, 36) * 36 + mod(n, 36)) * 2;
    plank(ox, oy, L, W, true, 1000 + id);
    plank(ox, oy + W, W, L, false, 1001 + id);
  }
}
function paintChequer(g, s) {
  const r = rand(121), n = 4, c = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = rgba((i + j) % 2 ? [36, 36, 38] : [234, 232, 226], 1);
    g.fillRect(i * c, j * c, c, c);
  }
  for (let i = 0; i < 140; i++) {
    const x = r() * s, y = r() * s, rad = s * (0.03 + r() * 0.12), col = r() < 0.5 ? [255, 255, 255] : [0, 0, 0], a = 0.04 + r() * 0.05;
    tiled(g, s, () => {
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    });
  }
  gridLines(g, s, n, n, [128, 126, 122], 0.8, 2 * s / 1024);
}
function paintMosaic(g, s) {
  const r = rand(131), n = 12, c = s / n, gap = Math.max(1.5, 5 * s / 1024);
  g.fillStyle = rgba([150, 152, 156], 1); g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = rgba(shade([106, 108, 112], (r() - 0.5) * 26), 1);
    g.fillRect(i * c + gap / 2, j * c + gap / 2, c - gap, c - gap);
  }
}

// Floor coverings, same convention as the walls
const FLOORS = [
  { name: 'Greige marble', cover: 2.4, rough: 0.28, bumpScale: 0.6, bump: jointBump(4, 4, 2),
    paint: (g, s) => paintStone(g, s, { seed: 7, base: [160, 154, 146], light: [188, 182, 175], dark: [132, 126, 118],
      clouds: 70, cloudA: 0.18, veins: 20, vein: [204, 199, 191], veinA: 0.28, veinW: 0.9, angle: 0.4,
      tiles: [4, 4], grout: [112, 106, 98], groutA: 0.55 }) },
  { name: 'White marble', cover: 2.4, rough: 0.22, bumpScale: 0.6, bump: jointBump(4, 4, 2),
    paint: (g, s) => paintStone(g, s, { seed: 161, base: [232, 229, 224], light: [246, 245, 242], dark: [212, 207, 200],
      clouds: 60, cloudA: 0.2, veins: 14, vein: [128, 118, 104], veinA: 0.45, veinW: 1.3, angle: 0.7,
      tiles: [4, 4], grout: [196, 192, 186], groutA: 0.6 }) },
  { name: 'Charcoal stone', cover: 2.4, rough: 0.45, bumpScale: 0.6, bump: jointBump(4, 4, 2),
    paint: (g, s) => paintStone(g, s, { seed: 151, base: [64, 64, 66], light: [84, 84, 88], dark: [46, 46, 48],
      clouds: 90, cloudA: 0.25, veins: 6, vein: [120, 120, 124], veinA: 0.25, veinW: 1, angle: 0.3,
      tiles: [4, 4], grout: [36, 36, 38], groutA: 0.8 }) },
  { name: 'Grey porcelain', cover: 2.4, rough: 0.4, bumpScale: 0.6, bump: jointBump(2, 4, 2),
    paint: (g, s) => paintStone(g, s, { seed: 141, base: [130, 130, 128], light: [150, 150, 148], dark: [112, 112, 110],
      clouds: 110, cloudA: 0.16, tiles: [2, 4], grout: [98, 98, 96], groutA: 0.6 }) },
  { name: 'Travertine', cover: 1.2, rough: 0.5, bumpScale: 0.8, bump: jointBump(2, 4, 3), paint: paintTravertine },
  { name: 'Microcement', cover: 2.4, rough: 0.55, paint: paintMicrocement },
  { name: 'Terrazzo', cover: 1.2, rough: 0.3, bumpScale: 0.5, bump: jointBump(2, 2, 2), paint: paintTerrazzo },
  { name: 'Oak herringbone', cover: 2.7, rough: 0.5, bumpScale: 0.8, bump: (g, s) => paintHerringbone(g, s, true), paint: paintHerringbone },
  { name: 'Chequerboard', cover: 1.2, rough: 0.25, bumpScale: 0.6, bump: jointBump(4, 4, 2), paint: paintChequer },
  { name: 'Grey mosaic', cover: 0.6, rough: 0.35, bumpScale: 0.8, bump: jointBump(12, 12, 5), paint: paintMosaic },
];

const flatBump = makeTex(4, 1, (g, s) => { g.fillStyle = '#fff'; g.fillRect(0, 0, s, s); });
flatBump.colorSpace = THREE.NoColorSpace;
function buildWall(v) {
  if (!v.built) {
    const map = makeTex(1024, v.cover, v.paint);
    let bump = flatBump;
    if (v.bump) { bump = makeTex(1024, v.cover, v.bump); bump.colorSpace = THREE.NoColorSpace; }
    v.built = { map, bump };
  }
  return v.built;
}

const TEX = {
  counter: makeTex(512, 1.2, (g, s) => paintStone(g, s, {
    seed: 3, base: [40, 40, 42], light: [64, 64, 68], dark: [24, 24, 26], clouds: 40, cloudA: 0.25,
    veins: 14, vein: [176, 176, 178], veinA: 0.38, veinW: 1.8, angle: 0.8 })),
};

const washTex = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 256, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.07, 'rgba(255,255,255,0.7)');
  gr.addColorStop(0.32, 'rgba(255,255,255,0.2)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

/* ---------- materials ---------- */

// finishes the model opens with (indexes into WALLS, FLOORS and LEDS): green zellige, white marble, blue LED
const START = { wall: 7, floor: 1, led: 4 };

const std = (color, roughness = 0.5, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const M = {
  wall: std(0xffffff, WALLS[START.wall].rough, 0, { map: buildWall(WALLS[START.wall]).map, bumpMap: buildWall(WALLS[START.wall]).bump, bumpScale: WALLS[START.wall].bumpScale || 0 }),
  floor: std(0xffffff, FLOORS[START.floor].rough, 0, { map: buildWall(FLOORS[START.floor]).map, bumpMap: buildWall(FLOORS[START.floor]).bump, bumpScale: FLOORS[START.floor].bumpScale || 0 }),
  black: std(0x141416, 0.62),
  cap: std(0x9a9c9f, 0.32, 0.75),
  outerLight: std(0xa6a7a9, 0.42, 0.35),
  outerDark: std(0x38393c, 0.6),
  counter: std(0xffffff, 0.28, 0, { map: TEX.counter }),
  plinth: std(0x1b1a19, 0.9),
  brass: std(0xb88a4c, 0.35, 1.0),
  ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf3f2ee, roughness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.08, side: THREE.DoubleSide }),
  ceramicShade: std(0xdcdbd6, 0.3),
  metalBlack: std(0x161617, 0.36, 0.6),
  steel: std(0xc6c8cb, 0.28, 1.0),
  mirror: std(0x9da1a5, 0.03, 1.0, { envMapIntensity: 1.2 }),
  screen: std(0xb1a99d, 0.55),
  door: std(0xb9ad9b, 0.5),
  doorGrey: std(0x8e8983, 0.42),
  amber: std(0x4a2a10, 0.15, 0.1),
  petal: std(0xf1eee6, 0.75),
  leaf: std(0x4e6b34, 0.6),
  leafLight: std(0x7c9a3c, 0.55),
  vaseGrey: std(0x8c8a87, 0.4),
  dimLine: new THREE.MeshBasicMaterial({ color: 0x2b2926 }),
};

const WARM = new THREE.Color(1.0, 0.6, 0.28);
const ledMat = new THREE.MeshBasicMaterial({ color: WARM.clone().multiplyScalar(4) });
const washMats = [];
const washMat = (k) => {
  const m = new THREE.MeshBasicMaterial({
    map: washTex, color: WARM.clone().multiplyScalar(k), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  m.userData.k = k; washMats.push(m);
  return m;
};
const wallWash = washMat(0.2), coveWash = washMat(0.13), floorWash = washMat(0.15);

/* ---------- geometry helpers ---------- */

// UVs in metres, anchored to world space, so tile joints line up across walls
function worldUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), -p.getZ(i));
    else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  uv.needsUpdate = true;
}

const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
const occluders = [];
function box(x, y, z, mat, { cast = true, receive = true, parent = scene } = {}) {
  const geo = new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]);
  geo.translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
  worldUV(geo);
  const mats = mat.isMaterial ? mat : FACES.map(f => mat[f] || mat.all || M.black);
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}
const wall = (...args) => { const m = box(...args); occluders.push(m); return m; };
function mesh(geo, mat, parent, pos) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  (parent || scene).add(m);
  return m;
}
const cylGeo = (r0, r1, h, seg = 28) => new THREE.CylinderGeometry(r0, r1, h, seg);

// A shape drawn in plan (x across, y = -depth from the wall), extruded upward from y0
function extrudeUp(shape, depth, bevel, y0) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0, 0);
  return geo;
}
function planRect(x0, x1, yBack, yFront, rb, rf, path = new THREE.Shape()) {
  path.moveTo(x0 + rb, yBack);
  path.lineTo(x1 - rb, yBack);
  path.quadraticCurveTo(x1, yBack, x1, yBack - rb);
  path.lineTo(x1, yFront + rf);
  path.quadraticCurveTo(x1, yFront, x1 - rf, yFront);
  path.lineTo(x0 + rf, yFront);
  path.quadraticCurveTo(x0, yFront, x0, yFront + rf);
  path.lineTo(x0, yBack - rb);
  path.quadraticCurveTo(x0, yBack, x0 + rb, yBack);
  return path;
}
function planD(w, d, straight, rb) {
  const s = new THREE.Shape(), hw = w / 2;
  s.moveTo(-hw + rb, 0);
  s.lineTo(hw - rb, 0);
  s.quadraticCurveTo(hw, 0, hw, -rb);
  s.lineTo(hw, -straight);
  s.absellipse(0, -straight, hw, d - straight, 0, Math.PI, true);
  s.lineTo(-hw, -rb);
  s.quadraticCurveTo(-hw, 0, -hw + rb, 0);
  return s;
}
// oval basin built on a lathe profile
function basin(rx, rz, h) {
  const prof = [[0, 0.004], [0.55, 0.004], [0.78, 0.02], [0.92, 0.12], [0.985, 0.4], [1, 0.75], [1, 1],
    [0.965, 1], [0.955, 0.72], [0.9, 0.38], [0.78, 0.18], [0.55, 0.1], [0, 0.09]];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 72);
  geo.scale(rx, h, rz);
  return geo;
}

/* ---------- LED coves ---------- */

const ledGroup = new THREE.Group(); scene.add(ledGroup);
const ledRuns = [];                          // every run, for the specification panel
function ledRun(x0, z0, x1, z1, nx, nz, { floor = true, top = true, topWash = 1.05 } = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  ledRuns.push({ len, room: mx + nx * 0.05 < X_PW ? 'vestibule' : 'wc', floor, top });
  const ry = Math.atan2(nx, nz);
  for (const level of [floor && 'floor', top && 'top'].filter(Boolean)) {
    const y = level === 'floor' ? 0.014 : H - 0.05;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.008, 0.008), ledMat);
    strip.position.set(mx + nx * 0.012, y, mz + nz * 0.012);
    strip.rotation.y = ry;
    ledGroup.add(strip);

    const wh = level === 'floor' ? 0.8 : topWash;
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(len, wh), level === 'floor' ? wallWash : coveWash);
    wash.rotation.order = 'YXZ';
    wash.rotation.set(0, ry, level === 'top' ? Math.PI : 0);
    wash.position.set(mx + nx * 0.004, level === 'floor' ? wh / 2 : H - wh / 2, mz + nz * 0.004);
    wash.renderOrder = 2;
    ledGroup.add(wash);

    if (level === 'floor') {
      const fw = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.36), floorWash);
      fw.rotation.order = 'YXZ';
      fw.rotation.set(-Math.PI / 2, Math.atan2(-nx, -nz), 0);
      fw.position.set(mx + nx * 0.18, 0.003, mz + nz * 0.18);
      fw.renderOrder = 2;
      ledGroup.add(fw);
    }
  }
}

// round backlit mirror on a wall: centre on the wall face, n = direction into the room.
// The glass sits on an 18 mm black backing; an LED ring 30 mm wider glows behind its edge.
function roundMirror(at, n, d = 0.6) {
  const r = d / 2, face = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 72), M.mirror);
  glass.quaternion.copy(face); glass.position.copy(at).addScaledVector(n, 0.022); scene.add(glass);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.018, 72), M.black);
  back.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); back.position.copy(at).addScaledVector(n, 0.011);
  back.castShadow = true; back.receiveShadow = true; scene.add(back);
  const ring = new THREE.Mesh(new THREE.CircleGeometry(r + 0.03, 72), ledMat);
  ring.quaternion.copy(face); ring.position.copy(at).addScaledVector(n, 0.004); ledGroup.add(ring);
}

/* ---------- shell: floor and walls, to the plan ---------- */

box([X_L0 - 0.16, X_RO + 0.16], [-0.12, -0.02], [Z_BO - 0.22, Z_FO + 0.16], M.plinth, { cast: false });
box([X_VL, X_R], [-0.02, 0], [0, Z_W], M.floor, { cast: false });                       // one floor for both rooms
box([PX(61) - 0.04, X_VL], [-0.02, 0], [Z_LW, Z_V], M.floor, { cast: false });          // under the left panel
box([X_L0, X_PV], [-0.02, 0.004], [Z_V, Z_THR], M.brass, { cast: false });               // strip along the vestibule front

wall([X_L0, X_RO], [0, H], [Z_BO, 0], { pz: M.wall, nz: M.outerLight, py: M.cap });     // back wall
wall([X_L0, X_VL], [0, H], [0, Z_LW], { px: M.wall });                                   // vestibule left wall
wall([X_L0, X_VL], [2.1, H], [Z_LW, Z_V], { px: M.wall });                               // head over the left panel
wall([X_PV, X_PW], [0, H], [0, Z_D0], { px: M.wall, nx: M.wall });                       // partition
wall([X_PV, X_PW], [2.05, H], [Z_D0, Z_D1], { px: M.wall, nx: M.wall });                 // head over the WC door
wall([X_PV, X_PW], [0, H], [Z_D1, Z_W], { px: M.wall, nx: M.wall });
wall([PX(188), X_R], [0, H], [Z_W, Z_FO], { nz: M.wall });                                // front wall
wall([X_R, X_RO], [0, H], [0, Z_FO], { nx: M.wall, px: M.outerDark });                    // right wall

// panel on the vestibule's left side (thin element on the plan, px 61 to 74)
box([PX(61), PX(74)], [0, 2.1], [Z_LW, Z_V], M.door);
box([PX(74), PX(74) + 0.05], [1.0, 1.02], [Z_V - 0.2, Z_V - 0.08], M.metalBlack);

// WC door: leaf on the vestibule half of the wall, pivot at the back jamb as drawn
box([X_PV, PX(288.5)], [0, 2.05], [Z_D0, Z_D1], M.doorGrey);
box([X_PV - 0.002, PX(288.5) + 0.002], [0, 2.05], [Z_D1 - 0.03, Z_D1], M.metalBlack);
box([X_PV - 0.06, X_PV], [1.0, 1.02], [Z_D1 - 0.16, Z_D1 - 0.05], M.metalBlack);
box([PX(288.5), PX(288.5) + 0.06], [1.0, 1.02], [Z_D1 - 0.16, Z_D1 - 0.05], M.metalBlack);
box([X_PV - 0.012, X_PW + 0.012], [0.04, 2.0], [Z_D0, Z_D0 + 0.03], M.metalBlack);

/* ---------- WC room: urinal, screen, toilet, side basin ---------- */

// wall-hung urinal, 325 x 375 mm on the plan
{
  const g = new THREE.Group(); g.position.set(PX(387), 0, 0); scene.add(g);
  const w = 0.325, d = 0.36, x0 = -w / 2, x1 = w / 2, rf = 0.12, xi = w / 2 - 0.034, bt = 0.08, ri = 0.03;
  mesh(extrudeUp(planRect(x0, x1, 0, -d, 0.02, rf), 0.2, 0.012, 0.5), M.ceramic, g);
  // U-shaped walls: back and sides rise, the front stays open
  const u = new THREE.Shape();
  u.moveTo(-xi, -d + 0.02);
  u.lineTo(x0 + rf, -d); u.quadraticCurveTo(x0, -d, x0, -d + rf);
  u.lineTo(x0, -0.02); u.quadraticCurveTo(x0, 0, x0 + 0.02, 0);
  u.lineTo(x1 - 0.02, 0); u.quadraticCurveTo(x1, 0, x1, -0.02);
  u.lineTo(x1, -d + rf); u.quadraticCurveTo(x1, -d, x1 - rf, -d);
  u.lineTo(xi, -d + 0.02);
  u.lineTo(xi, -bt - ri); u.quadraticCurveTo(xi, -bt, xi - ri, -bt);
  u.lineTo(-xi + ri, -bt); u.quadraticCurveTo(-xi, -bt, -xi, -bt - ri);
  u.lineTo(-xi, -d + 0.02);
  mesh(extrudeUp(u, 0.36, 0.01, 0.712), M.ceramic, g);
  mesh(extrudeUp(planRect(x0, x1, 0, -0.16, 0.02, 0.05), 0.03, 0.01, 1.05), M.ceramic, g);
  mesh(extrudeUp(planRect(-xi, xi, -bt, -d + 0.01, 0.03, 0.09), 0.004, 0, 0.716), M.ceramicShade, g);
  mesh(new THREE.PlaneGeometry(xi * 2 - 0.02, 0.34), M.ceramicShade, g, [0, 0.89, bt + 0.002]);
  mesh(cylGeo(0.022, 0.022, 0.006), M.steel, g, [0, 0.722, 0.16]);
  mesh(cylGeo(0.014, 0.014, 0.16), M.metalBlack, g, [0, 1.16, 0.045]);
  box([-0.075, 0.075], [1.26, 1.37], [0, 0.014], M.metalBlack, { parent: g });
}
// privacy screen between urinal and toilet (in the render, not on the plan)
mesh(new RoundedBoxGeometry(0.07, 1.45, 0.62, 3, 0.02), M.screen, scene, [0.79, 1.03, 0.31]);

// wall-hung toilet, 350 x 535 mm on the plan, lid closed
{
  const g = new THREE.Group(); g.position.set(PX(563.5), 0, 0); scene.add(g);
  mesh(extrudeUp(planD(0.29, 0.5, 0.18, 0.03), 0.16, 0.03, 0.22), M.ceramic, g);
  const seat = extrudeUp(planD(0.32, 0.5, 0.18, 0.02), 0.012, 0.006, 0.42); seat.translate(0, 0, 0.025);
  mesh(seat, M.ceramicShade, g);
  const lid = extrudeUp(planD(0.31, 0.49, 0.18, 0.02), 0.016, 0.01, 0.442); lid.translate(0, 0, 0.03);
  mesh(lid, M.ceramic, g);
  box([-0.125, 0.125], [0.96, 1.12], [0, 0.016], M.metalBlack, { parent: g });
  box([-0.004, 0.004], [0.975, 1.105], [0.016, 0.018], M.black, { parent: g });
}
// paper holder on the back wall, right of the toilet
{
  box([1.56, 1.58], [0.66, 0.74], [0, 0.11], M.metalBlack);
  const roll = mesh(cylGeo(0.055, 0.055, 0.1), std(0xf4f2ec, 0.9), scene, [1.63, 0.7, 0.07]);
  roll.rotation.z = Math.PI / 2;
}

// side basin on the right wall, 500 x 350 mm on the plan, centred 1500 mm from the back wall
{
  const zc = PY(371.5);
  box([X_R - 0.42, X_R], [0.72, 0.86], [zc - 0.4, zc + 0.4], M.counter);
  mesh(basin(0.165, 0.25, 0.13), M.ceramic, scene, [X_R - 0.18, 0.86, zc]);
  mesh(cylGeo(0.022, 0.022, 0.004), M.metalBlack, scene, [X_R - 0.18, 0.874, zc]);
  const esc = mesh(cylGeo(0.03, 0.03, 0.012), M.metalBlack, scene, [X_R - 0.005, 1.04, zc]); esc.rotation.z = Math.PI / 2;
  const spout = mesh(cylGeo(0.012, 0.012, 0.2), M.metalBlack, scene, [X_R - 0.1, 1.04, zc]); spout.rotation.z = Math.PI / 2;
  mesh(cylGeo(0.012, 0.012, 0.04), M.metalBlack, scene, [X_R - 0.195, 1.025, zc]);
  // soap
  mesh(cylGeo(0.03, 0.03, 0.12), M.ceramic, scene, [X_R - 0.08, 0.92, zc - 0.32]);
  mesh(cylGeo(0.008, 0.008, 0.04), M.metalBlack, scene, [X_R - 0.08, 1.0, zc - 0.32]);
  box([X_R - 0.11, X_R - 0.06], [1.015, 1.025], [zc - 0.325, zc - 0.315], M.metalBlack);
  // round backlit mirror over the basin, Ø 600
  roundMirror(new THREE.Vector3(X_R, 1.55, zc), new THREE.Vector3(-1, 0, 0));
  // towel dispenser on the front wall, clear of the mirror
  mesh(new RoundedBoxGeometry(0.26, 0.34, 0.1, 2, 0.012), M.metalBlack, scene, [X_R - 0.4, 1.2, Z_W - 0.05]);
  // plant
  const g = new THREE.Group(); g.position.set(X_R - 0.1, 0.86, zc + 0.3); scene.add(g);
  mesh(cylGeo(0.048, 0.035, 0.13), M.vaseGrey, g, [0, 0.065, 0]);
  const r = rand(77);
  for (let i = 0; i < 11; i++) {
    const pivot = new THREE.Group(); pivot.position.y = 0.12;
    pivot.rotation.order = 'YXZ';
    pivot.rotation.set(0.25 + r() * 0.6, r() * Math.PI * 2, 0);
    const leaf = mesh(new THREE.SphereGeometry(1, 12, 8), r() < 0.5 ? M.leaf : M.leafLight, pivot, [0, 0.075, 0]);
    leaf.scale.set(0.022, 0.08 + r() * 0.035, 0.007);
    g.add(pivot);
  }
}

/* ---------- vestibule: basin on a stone counter, backlit mirror ---------- */

{
  const xc = PX(174);
  box([X_VL, X_PV], [0.7, 0.86], [0, 0.42], M.counter);
  mesh(basin(0.25, 0.145, 0.13), M.ceramic, scene, [xc, 0.858, 0.215]);
  mesh(cylGeo(0.022, 0.022, 0.004), M.steel, scene, [xc, 0.872, 0.215]);
  // deck tap behind the bowl, where the plan draws it
  mesh(cylGeo(0.022, 0.022, 0.03), M.metalBlack, scene, [xc, 0.875, 0.04]);
  mesh(cylGeo(0.015, 0.015, 0.24), M.metalBlack, scene, [xc, 0.98, 0.04]);
  const spout = mesh(cylGeo(0.012, 0.012, 0.14), M.metalBlack, scene, [xc, 1.09, 0.11]); spout.rotation.x = Math.PI / 2;
  box([xc + 0.015, xc + 0.03], [1.04, 1.1], [0.03, 0.05], M.metalBlack);
  // amber soap bottle
  mesh(cylGeo(0.03, 0.03, 0.15), M.amber, scene, [X_PV - 0.2, 0.935, 0.12]);
  mesh(cylGeo(0.011, 0.011, 0.05), M.metalBlack, scene, [X_PV - 0.2, 1.035, 0.12]);
  box([X_PV - 0.2, X_PV - 0.155], [1.05, 1.064], [0.113, 0.127], M.metalBlack);
  // round backlit mirror, Ø 600
  roundMirror(new THREE.Vector3(xc, 1.55, 0), new THREE.Vector3(0, 0, 1));
  // stainless towel dispenser on the partition
  mesh(new RoundedBoxGeometry(0.1, 0.34, 0.26, 2, 0.014), M.steel, scene, [X_PV - 0.05, 1.2, 0.26]);
  // white flowers in a black vase
  const g = new THREE.Group(); g.position.set(X_VL + 0.12, 0.86, 0.24); scene.add(g);
  mesh(cylGeo(0.048, 0.04, 0.12), M.metalBlack, g, [0, 0.06, 0]);
  const r = rand(42);
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group(); pivot.position.y = 0.11;
    pivot.rotation.order = 'YXZ'; pivot.rotation.set(0.7 + r() * 0.5, r() * Math.PI * 2, 0);
    const leaf = mesh(new THREE.SphereGeometry(1, 10, 8), M.leaf, pivot, [0, 0.06, 0]);
    leaf.scale.set(0.02, 0.07, 0.006);
    g.add(pivot);
  }
  for (let i = 0; i < 11; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.07;
    const head = mesh(new THREE.SphereGeometry(0.028 + r() * 0.012, 14, 10), M.petal, g,
      [Math.cos(a) * d, 0.2 + r() * 0.05 - d * 0.5, Math.sin(a) * d]);
    head.scale.y = 0.72;
  }
}

/* ---------- LED runs (wall line, direction into the room) ---------- */

ledRun(X_PW, 0, X_R, 0, 0, 1);              // WC back wall
ledRun(X_R, 0, X_R, Z_W, -1, 0);            // WC right wall
ledRun(X_PW, Z_W, X_R, Z_W, 0, -1);         // WC front wall
ledRun(X_PW, 0, X_PW, Z_D0, 1, 0);          // WC partition side
ledRun(X_VL, 0, X_PV, 0, 0, 1);             // vestibule back
ledRun(X_VL, 0, X_VL, Z_LW, 1, 0);          // vestibule left
ledRun(X_PV, 0, X_PV, Z_D0, -1, 0);         // vestibule partition side
// top cove carried on round every wall, so the ceiling line is one continuous loop in each room;
// over the door and the left panel the wash stops at the head, not on the opening
const top = { floor: false };
ledRun(X_PW, Z_D0, X_PW, Z_D1, 1, 0, { ...top, topWash: H - 2.05 });    // WC side, over the door
ledRun(X_PW, Z_D1, X_PW, Z_W, 1, 0, top);                              // WC side, door to front wall
ledRun(X_PV, Z_D0, X_PV, Z_D1, -1, 0, { ...top, topWash: H - 2.05 });  // vestibule side, over the door
ledRun(X_PV, Z_D1, X_PV, Z_W, -1, 0, top);                             // vestibule side, door to front wall
ledRun(X_VL, Z_LW, X_VL, Z_V, 1, 0, { ...top, topWash: H - 2.1 });     // vestibule left, over the panel
ledRun(PX(188), Z_W, X_PV, Z_W, 0, -1, top);                           // vestibule front wall
{
  const s = new THREE.Mesh(new THREE.BoxGeometry(X_PV - X_VL, 0.008, 0.008), ledMat);
  s.position.set((X_VL + X_PV) / 2, 0.695, 0.4); ledGroup.add(s);
}

/* ---------- waste bins under the basins ---------- */

// lidded bins under both counters (they sit clear of the basin waste pipes)
function bin(x, z, r, h) {
  mesh(cylGeo(r, r * 0.94, h, 40), M.metalBlack, scene, [x, h / 2, z]);
  mesh(cylGeo(r * 1.02, r * 1.02, 0.018, 40), M.black, scene, [x, h + 0.009, z]);
}
bin(X_VL + 0.2, 0.22, 0.12, 0.38);                 // vestibule, left of the basin, Ø 240 × 380
bin(X_R - 0.21, PY(371.5) - 0.22, 0.11, 0.36);     // WC room, beside the basin, Ø 220 × 360

/* ---------- services: electrics, water, drainage (switchable layers) ---------- */

// Electrics follow the lighting and power plans (spot light and "sound" speaker in each room, LED wall-light
// outputs); water and drainage are schematic: one point per fixture at standard heights (no plumbing plan).
// Each point: wall or ceiling position, the direction into the room, label and specification text.
const LAYERS = { elec: new THREE.Group(), water: new THREE.Group(), drain: new THREE.Group() };
for (const g of Object.values(LAYERS)) { g.visible = false; scene.add(g); }
const SVC_COL = { elec: 0xf2a900, cold: 0x2f7de1, hot: 0xe34948, drain: 0x7a6552 };
const svcMat = Object.fromEntries(Object.entries(SVC_COL).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c, toneMapped: false })]));
const P3 = (x, y, z) => new THREE.Vector3(x, y, z);
const NX = P3(-1, 0, 0), NZ = P3(0, 0, 1), DOWN = P3(0, -1, 0);
const xcV = PX(174), zcW = PY(371.5), xT = PX(563.5), xU = PX(387);
const cV = (X_VL + X_PV) / 2, cW = (X_PW + X_R) / 2;
const SERVICES = [
  // electrics
  { layer: 'elec', room: 'Vestibule', name: 'Downlight', spec: 'Recessed, LED 2700 K', at: P3(cV, H, Z_V * 0.62), n: DOWN, kind: 'ceil' },
  { layer: 'elec', room: 'WC room', name: 'Downlight', spec: 'Recessed, LED 2700 K', at: P3(cW + 0.25, H, Z_W * 0.6), n: DOWN, kind: 'ceil' },
  { layer: 'elec', room: 'Vestibule', name: 'Ceiling speaker', spec: 'Sound system', at: P3(cV, H, Z_V * 0.26), n: DOWN, kind: 'speaker' },
  { layer: 'elec', room: 'WC room', name: 'Ceiling speaker', spec: 'Sound system', at: P3(cW - 0.35, H, Z_W * 0.35), n: DOWN, kind: 'speaker' },
  { layer: 'elec', room: 'Vestibule', name: 'LED strip feed', spec: 'Wall LED, 2700 K', at: P3(X_VL + 0.14, H - 0.16, 0), n: NZ, kind: 'box' },
  { layer: 'elec', room: 'WC room', name: 'LED strip feed', spec: 'Wall LED, 2700 K', at: P3(X_PW + 0.14, H - 0.16, 0), n: NZ, kind: 'box' },
  { layer: 'elec', room: 'Vestibule', name: 'Mirror LED feed', spec: 'Behind the mirror', at: P3(xcV + 0.38, 1.55, 0), n: NZ, kind: 'box' },
  { layer: 'elec', room: 'WC room', name: 'Mirror LED feed', spec: 'Behind the mirror', at: P3(X_R, 1.55, zcW + 0.38), n: NX, kind: 'box' },
  // water: cold and hot to the basins, cold to the toilet cistern and the urinal flush
  { layer: 'water', room: 'Vestibule', name: 'Cold water', spec: 'Basin', at: P3(xcV - 0.08, 0.55, 0), n: NZ, kind: 'cold' },
  { layer: 'water', room: 'Vestibule', name: 'Hot water', spec: 'Basin', at: P3(xcV + 0.08, 0.55, 0), n: NZ, kind: 'hot' },
  { layer: 'water', room: 'WC room', name: 'Cold water', spec: 'Basin, wall mixer', at: P3(X_R, 0.95, zcW - 0.08), n: NX, kind: 'cold' },
  { layer: 'water', room: 'WC room', name: 'Hot water', spec: 'Basin, wall mixer', at: P3(X_R, 0.95, zcW + 0.08), n: NX, kind: 'hot' },
  { layer: 'water', room: 'WC room', name: 'Cold water', spec: 'Toilet cistern', at: P3(xT + 0.2, 1.0, 0), n: NZ, kind: 'cold' },
  { layer: 'water', room: 'WC room', name: 'Cold water', spec: 'Urinal flush', at: P3(xU, 1.18, 0), n: NZ, kind: 'cold' },
  // drainage
  { layer: 'drain', room: 'Vestibule', name: 'Waste Ø 50', spec: 'Basin', at: P3(xcV, 0.45, 0), n: NZ, kind: 'drain', r: 0.025 },
  { layer: 'drain', room: 'WC room', name: 'Waste Ø 50', spec: 'Basin', at: P3(X_R, 0.45, zcW), n: NX, kind: 'drain', r: 0.025 },
  { layer: 'drain', room: 'WC room', name: 'Waste Ø 50', spec: 'Urinal', at: P3(xU, 0.44, 0), n: NZ, kind: 'drain', r: 0.025 },
  { layer: 'drain', room: 'WC room', name: 'Waste Ø 110', spec: 'Toilet', at: P3(xT, 0.15, 0), n: NZ, kind: 'drain', r: 0.055 },
];
for (const sv of SERVICES) {
  const g = LAYERS[sv.layer], q = new THREE.Quaternion().setFromUnitVectors(P3(0, 1, 0), sv.n);
  const put = (geo, mat, out) => { const m = new THREE.Mesh(geo, mat); m.quaternion.copy(q); m.position.copy(sv.at).addScaledVector(sv.n, out); g.add(m); return m; };
  if (sv.kind === 'ceil') { put(cylGeo(0.05, 0.05, 0.012, 32), svcMat.elec, 0.006); put(cylGeo(0.032, 0.032, 0.014, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 0.008); }
  else if (sv.kind === 'speaker') { put(cylGeo(0.09, 0.09, 0.01, 40), svcMat.elec, 0.005); put(cylGeo(0.07, 0.07, 0.012, 40), M.black, 0.007); }
  else if (sv.kind === 'box') { put(new THREE.BoxGeometry(0.08, 0.025, 0.08), svcMat.elec, 0.0125); }
  else if (sv.kind === 'cold' || sv.kind === 'hot') { put(cylGeo(0.011, 0.011, 0.07, 16), svcMat[sv.kind], 0.035); put(cylGeo(0.022, 0.022, 0.012, 20), svcMat[sv.kind], 0.006); }
  else { put(cylGeo(sv.r, sv.r, 0.06, 28), svcMat.drain, 0.03); put(cylGeo(sv.r * 1.35, sv.r * 1.35, 0.01, 28), svcMat.drain, 0.005); }
  // electrics: the cable run from a wall point up to the ceiling
  if (sv.layer === 'elec' && sv.kind === 'box') {
    const run = new THREE.Mesh(new THREE.BoxGeometry(0.008, H - sv.at.y, 0.008), svcMat.elec);
    run.position.copy(sv.at).addScaledVector(sv.n, 0.004); run.position.y = (sv.at.y + H) / 2; g.add(run);
  }
  sv.label = sv.at.clone().addScaledVector(sv.n, sv.kind === 'ceil' || sv.kind === 'speaker' ? 0.02 : 0.06);
}

/* ---------- plan overlay and the plan's dimension ---------- */

let dirty = true;
const overlay = (() => {
  const canvas = document.createElement('canvas');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width; canvas.height = img.height;
    const g = canvas.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, canvas.width, canvas.height), p = d.data;
    // colour-to-alpha against white: keep the linework, drop the paper
    for (let i = 0; i < p.length; i += 4) {
      const a = 1 - Math.min(p[i], p[i + 1], p[i + 2]) / 255;
      if (a <= 0.03) { p[i + 3] = 0; continue; }
      for (let c = 0; c < 3; c++) p[i + c] = Math.round(255 - (255 - p[i + c]) / a);
      p[i + 3] = Math.round(a * 255);
    }
    g.putImageData(d, 0, 0);
    tex.needsUpdate = true;
    dirty = true;
  };
  // the client's plan is not published: the public embed never asks for it, and wherever the file is
  // missing the Plan overlay switch disappears (the Plan view itself stays)
  const noPlan = () => { const b = document.getElementById('t-overlay'); if (b) b.hidden = true; };
  img.onerror = noPlan;
  if (WS.isPublic) noPlan(); else img.src = PLAN_PNG;
  const w = 703 * S, h = 490 * S;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(PX(0) + w / 2, 0.006, PY(0) + h / 2);
  m.renderOrder = 10;
  m.visible = false;
  scene.add(m);
  return m;
})();

const dims = new THREE.Group(); scene.add(dims);
{
  // the plan's polyline, from the WC door pivot toward the toilet front; first leg is 960 mm
  const pts = [[289, 292], [487, 292], [487, 228], [557, 228], [557, 172]].map(([px, py]) => [PX(px), PY(py)]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(len, 0.002, 0.006), M.dimLine);
    seg.position.set((ax + bx) / 2, 0.004, (az + bz) / 2);
    seg.rotation.y = -Math.atan2(bz - az, bx - ax);
    dims.add(seg);
  }
  for (const [x, z] of pts.slice(1)) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.008), M.dimLine);
    tick.position.set(x, 0.0045, z); tick.rotation.y = Math.PI / 4;
    dims.add(tick);
  }
}

/* ---------- lighting ---------- */

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.26;

scene.add(new THREE.HemisphereLight(0xfff2e2, 0x3a342e, 0.4));
const key = new THREE.DirectionalLight(0xfff3e4, 0.55);
key.position.set(-1.6, 7, 3.2);
key.target.position.set(0.2, 0, 0.9);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
key.shadow.camera.updateProjectionMatrix();
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key, key.target);

const roomLights = [];
for (const [x, y, z, i] of [
  [0.87, 2.35, 0.99, 2.0], [-0.6, 2.35, 0.96, 1.2], [-0.61, 1.5, 0.5, 0.2],
]) {
  const l = new THREE.PointLight(WARM, i, 0, 2);
  l.position.set(x, y, z);
  scene.add(l); roomLights.push(l);
}

/* ---------- post: bloom for the LED coves ---------- */

const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.42, 0.28, 0.92);
// the glow adds light but never opacity, so the transparent background stays clean white (no haze)
Object.assign(bloom.blendMaterial, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
bloom.blendMaterial.needsUpdate = true;
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- camera, controls, views ---------- */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.3;
controls.maxDistance = 20;
controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
controls.screenSpacePanning = true;
controls.autoRotateSpeed = 0.6;
controls.listenToKeyEvents(window);

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const MID = V3((X_L0 + X_RO) / 2, 0, (Z_BO + Z_FO) / 2);
const VIEWS = {
  overview:  { pos: V3(-2.22, 12.2, 5.26), target: V3(MID.x, 1.0, MID.z), fov: 26, fit: true },
  plan:      { pos: V3(MID.x, 14, MID.z + 0.005), target: V3(MID.x, 0, MID.z), fov: 19, fit: true },
  vestibule: { pos: V3(-0.85, 3.9, 3.5), target: V3(-0.62, 0.8, 0.7), fov: 40, fit: true },
  wc:        { pos: V3(0.87, 6.9, 2.75), target: V3(0.87, 0.5, 0.95), fov: 34, fit: true },
  eye:       { pos: V3(0.2, 1.6, 1.75), target: V3(1.25, 1.0, 0.35), fov: 70 },
};
const fitScale = () => (camera.aspect >= 1.3 ? 1 : Math.pow(1.3 / camera.aspect, 0.75));
const viewButtons = [...document.querySelectorAll('[data-view]')];
function markView(name) { for (const b of viewButtons) b.setAttribute('aria-pressed', String(b.dataset.view === name)); }

// The Plan view lands on an orthographic camera, so walls and fixtures line up with the drawing at every height
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
let cam = camera;
function setCam(c) { cam = c; controls.object = c; renderPass.camera = c; controls.update(); dirty = true; }
function enterOrtho() {
  const d = camera.position.distanceTo(controls.target);
  const half = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  Object.assign(ortho, { top: half, bottom: -half, left: -half * camera.aspect, right: half * camera.aspect, zoom: 1 });
  ortho.updateProjectionMatrix();
  ortho.position.copy(camera.position); ortho.quaternion.copy(camera.quaternion);
  setCam(ortho);
}
function leaveOrtho() {
  const d = ortho.position.distanceTo(controls.target);
  camera.position.copy(ortho.position);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((ortho.top / ortho.zoom) / d));
  camera.updateProjectionMatrix();
  camera.lookAt(controls.target);
  setCam(camera);
}

let tween = null;
function goTo(name, instant = false) {
  const v = VIEWS[name];
  const k = v.fit ? fitScale() : 1;
  const toPos = v.target.clone().add(v.pos.clone().sub(v.target).multiplyScalar(k));
  const done = name === 'plan' ? enterOrtho : null;
  markView(name);
  if (cam === ortho) leaveOrtho();
  if (instant || reduceMotion) {
    tween = null;
    camera.position.copy(toPos); controls.target.copy(v.target);
    camera.fov = v.fov; camera.updateProjectionMatrix(); controls.update();
    if (done) done();
    dirty = true; return;
  }
  tween = { t0: performance.now(), dur: 1200, fromPos: camera.position.clone(), fromTgt: controls.target.clone(),
    fromFov: camera.fov, toPos, toTgt: v.target.clone(), toFov: v.fov, done };
}
controls.addEventListener('start', () => { tween = null; markView(null); });
controls.addEventListener('change', () => { dirty = true; });
for (const b of viewButtons) b.addEventListener('click', () => goTo(b.dataset.view));

/* ---------- labels ---------- */

const LABELS = [
  { at: V3(0.87, 2.2, 1.25), name: 'WC room', dim: '1730 × 1975 mm' },
  { at: V3(-0.6, 2.2, 1.25), name: 'Vestibule', dim: '980 × 1925 mm' },
  { at: V3(PX(388), 0.01, PY(292)), name: '960 mm', dim: 'from the plan', kind: 'dim' },
  ...SERVICES.map(sv => ({ at: sv.label, name: sv.name, dim: 'H ' + Math.round(sv.at.y * 1000), kind: 'svc tag--' + sv.layer, layer: sv.layer })),
];
const tagLayer = document.getElementById('tags');
for (const L of LABELS) {
  const el = document.createElement('div');
  el.className = 'tag' + (L.kind ? ' tag--' + L.kind : '');
  const a = document.createElement('span'); a.className = 'tag-name'; a.textContent = WS.tr(L.name);
  const b = document.createElement('span'); b.className = 'tag-dim'; b.textContent = WS.tr(L.dim);
  el.append(a, b); tagLayer.appendChild(el); L.el = el;
}
let labelsOn = true;
const pv = new THREE.Vector3(), ray = new THREE.Raycaster(), rayDir = new THREE.Vector3();
function hiddenByWall(at) {
  const dist = cam.position.distanceTo(at);
  rayDir.subVectors(at, cam.position).normalize();
  ray.set(cam.position, rayDir); ray.far = dist - 0.05;
  return ray.intersectObjects(occluders, false).length > 0;
}
function placeLabels() {
  const w = stage.clientWidth, h = stage.clientHeight, placed = [];
  for (const L of LABELS) {
    pv.copy(L.at).project(cam);
    const near = cam === camera && camera.position.distanceTo(L.at) < 1.1;
    const show = (L.layer ? LAYERS[L.layer].visible : labelsOn) && !near && pv.z > -1 && pv.z < 1 && Math.abs(pv.x) < 1.05 && Math.abs(pv.y) < 1.05 && !hiddenByWall(L.at);
    L.el.hidden = !show;
    if (!show) continue;
    const sx = ((pv.x + 1) / 2) * w, sy = ((1 - pv.y) / 2) * h;
    const bw = L.el.offsetWidth, bh = L.el.offsetHeight;
    const rect = [sx - bw / 2 - 4, sy - bh - 4, sx + bw / 2 + 4, sy];
    // earlier labels in the list win; a later one that would overlap steps aside
    if (placed.some(r => rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1])) { L.el.hidden = true; continue; }
    placed.push(rect);
    L.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
  }
}

/* ---------- switches ---------- */

function toggle(id, initial, apply) {
  const btn = document.getElementById(id);
  let on = initial;
  btn.addEventListener('click', () => { on = !on; btn.setAttribute('aria-pressed', String(on)); apply(on); dirty = true; });
}
toggle('t-overlay', false, on => { overlay.visible = on; if (on && cam !== ortho && !(tween && tween.done)) goTo('plan'); });
toggle('t-labels', true, on => { labelsOn = on; dims.visible = on; });
toggle('t-glow', true, on => { bloom.enabled = on; });
toggle('t-spin', false, on => { controls.autoRotate = on && !reduceMotion; });
toggle('t-elec', false, on => { LAYERS.elec.visible = on; });
toggle('t-water', false, on => { LAYERS.water.visible = on; });
toggle('t-drain', false, on => { LAYERS.drain.visible = on; });
if (reduceMotion) document.getElementById('t-spin').hidden = true;

/* ---------- finishes: wall covering and LED colour ---------- */

const LEDS = [
  { name: 'Amber, 2200 K', c: [1.0, 0.38, 0.08], css: '#ffa040' },
  { name: 'Warm white, 2700 K', c: [1.0, 0.6, 0.28], css: '#ffcf8f' },
  { name: 'Neutral white, 4000 K', c: [1.0, 0.82, 0.6], css: '#fff0dc' },
  { name: 'Cool white, 6500 K', c: [0.8, 0.88, 1.0], css: '#e6f0ff' },
  { name: 'Blue', c: [0.12, 0.35, 1.0], css: '#5a8cff' },
  { name: 'Pink', c: [1.0, 0.22, 0.55], css: '#ff6fae' },
];
const finish = mat => v => {
  const t = buildWall(v);
  mat.map = t.map;
  mat.bumpMap = t.bump;
  mat.bumpScale = v.bumpScale || 0;
  mat.roughness = v.rough;
  dirty = true;
};
function setLed(L) {
  const c = new THREE.Color(L.c[0], L.c[1], L.c[2]);
  ledMat.color.copy(c).multiplyScalar(4);
  for (const m of washMats) m.color.copy(c).multiplyScalar(m.userData.k);
  for (const l of roomLights) l.color.copy(c);
  dirty = true;
}
function swatchRow(groupId, nameId, items, initial, decorate, apply) {
  const group = document.getElementById(groupId), label = document.getElementById(nameId);
  label.textContent = WS.tr(items[initial].name);
  items.forEach((item, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch'; b.id = groupId + '-' + i;
    const label_ = WS.tr(item.name);
    b.title = label_; b.setAttribute('aria-label', label_);
    b.setAttribute('aria-pressed', String(i === initial));
    decorate(b, item);
    b.addEventListener('click', () => {
      for (const o of group.children) o.setAttribute('aria-pressed', String(o === b));
      label.textContent = label_;
      apply(item);
    });
    group.appendChild(b);
  });
}
const thumbnail = (b, v) => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  v.paint(c.getContext('2d'), 256);
  b.style.backgroundImage = `url(${c.toDataURL('image/jpeg', 0.82)})`;
};
swatchRow('wall-swatches', 'wall-name', WALLS, START.wall, thumbnail, finish(M.wall));
swatchRow('floor-swatches', 'floor-name', FLOORS, START.floor, thumbnail, finish(M.floor));
swatchRow('led-swatches', 'led-name', LEDS, START.led, (b, L) => {
  b.style.background = L.css;
  b.style.setProperty('--glow', L.css);
}, setLed);
setLed(LEDS[START.led]);

/* ---------- specification panel ---------- */

// Quantities come from the same constants and LED runs that build the model, so the panel and the
// geometry cannot drift apart. Tile counts use the greige marble formats (wall 600 x 1200, floor 600 x 600).
const SPEC = (() => {
  const DOOR_W = Z_D1 - Z_D0, DOOR_H = 2.05, PANEL_W = Z_V - Z_LW, PANEL_H = 2.1, T = X_PW - X_PV;
  const vW = X_PV - X_VL, wW = X_R - X_PW, vFront = X_PV - PX(188), WASTE = 0.1;
  const led = (room, level) => ledRuns.filter(r => r.room === room && r[level]).reduce((a, r) => a + r.len, 0);
  const counterStrip = X_PV - X_VL;
  const L = { wcTop: led('wc', 'top'), vTop: led('vestibule', 'top'), wcFloor: led('wc', 'floor'), vFloor: led('vestibule', 'floor'), counterStrip };
  L.net = L.wcTop + L.vTop + L.wcFloor + L.vFloor + counterStrip;
  const wallWC = (2 * wW + Z_W + Z_W) * H - DOOR_W * DOOR_H;                         // back, front, right, partition
  const wallV = (vW + Z_LW + Z_W + vFront) * H + PANEL_W * (H - PANEL_H) - DOOR_W * DOOR_H;
  const reveals = T * (2 * DOOR_H + DOOR_W);
  const wall = wallWC + wallV + reveals;
  const fWC = wW * Z_W, fV = vW * Z_V, fDoor = T * DOOR_W, floor = fWC + fV + fDoor;
  return {
    rooms: { vW, vD: Z_V, wW, wD: Z_W, DOOR_W, DOOR_H, PANEL_W, PANEL_H },
    L, wallWC, wallV, reveals, wall, wallOrder: wall * (1 + WASTE), wallTiles: Math.ceil(wall * (1 + WASTE) / (0.6 * 1.2)),
    fWC, fV, fDoor, floor, floorOrder: floor * (1 + WASTE), floorTiles: Math.ceil(floor * (1 + WASTE) / (0.6 * 0.6)),
    skirtWC: 2 * wW + 2 * Z_W - DOOR_W, skirtV: vW + Z_LW + Z_V - DOOR_W + vFront,
  };
})();
const specFix = [
  ['Vestibule', 'Counter', '982 × 420 × 160', 'Wall-hung, full width, top at 860', 'Dark stone, grey veining'],
  ['Vestibule', 'Countertop basin', 'Oval 500 × 290 × 130', 'Centre 480 from the left wall', 'White ceramic'],
  ['Vestibule', 'Deck tap', 'Column ≈ 240, spout 140', 'Behind the bowl', 'Matt black'],
  ['Vestibule', 'Backlit mirror', 'Round, Ø 600', 'Centre at 1550', 'Integrated LED'],
  ['Vestibule', 'Towel dispenser', '100 × 340 × 260', 'Partition, centre at 1200', 'Stainless steel'],
  ['Vestibule', 'Side panel / door', '955 × 2100', 'Left wall', 'Beige, to confirm'],
  ['WC room', 'Counter', '800 × 420 × 140', 'Right wall, top at 860, centre 1500 from the back', 'Dark stone, grey veining'],
  ['WC room', 'Countertop basin', 'Oval 330 × 500 × 130', 'Centre 180 from the wall', 'White ceramic'],
  ['WC room', 'Wall spout', 'Projection 200', 'At 1040', 'Matt black'],
  ['WC room', 'Backlit mirror', 'Round, Ø 600', 'Centre at 1550', 'Integrated LED'],
  ['WC room', 'Towel dispenser', '260 × 340 × 100', 'Front wall, centre at 1200', 'Matt black'],
  ['WC room', 'Urinal, wall-hung', '325 × 375 (plan)', 'Bowl 500 to ≈ 1080, centre 419 from the partition', 'White ceramic'],
  ['WC room', 'Privacy screen', '70 × 620 × 1450', '305 to 1755, 790 from the partition', 'Greige panel'],
  ['WC room', 'Toilet, wall-hung', '350 × 535 (plan)', 'Seat ≈ 430, centre 1275 from the partition', 'White ceramic'],
  ['WC room', 'Flush plates', '150 × 110, 250 × 160', 'Urinal 1260 to 1370, toilet 960 to 1120', 'Matt black'],
  ['WC room', 'Paper holder', 'For 110 roll', 'At 700, 1560 from the partition', 'Matt black'],
  ['WC room', 'Door', '752 × 2050', 'Partition', 'Grey leaf, black frame'],
  ['Vestibule', 'Waste bin, lidded', 'Ø 240 × 380', 'Under the counter, left of the basin', 'Matt black'],
  ['WC room', 'Waste bin, lidded', 'Ø 220 × 360', 'Under the counter, beside the basin', 'Matt black'],
  ['Both', 'Threshold strip', '1345 × 58', 'Vestibule front', 'Brass, to confirm'],
];
function renderSpec() {
  const T = WS.tr;
  const m = v => v.toFixed(2) + ' m', m2 = v => v.toFixed(2) + ' m²', mm = v => String(Math.round(v * 1000));
  const name = id => document.getElementById(id).textContent;
  const row = (k, v, cls = '') => `<tr class="${cls}"><th scope="row">${T(k)}</th><td>${v}</td></tr>`;
  const table = (title, sub, rows) => `<section class="spec-sec"><h3>${T(title)}${sub ? `<span>${T(sub)}</span>` : ''}</h3><table>${rows.join('')}</table></section>`;
  const s = SPEC, r = s.rooms, L = s.L;
  document.getElementById('spec-body').innerHTML = [
    table('Rooms', 'mm', [
      row('Vestibule', `${mm(r.vW)} × ${mm(r.vD)}`), row('WC room', `${mm(r.wW)} × ${mm(r.wD)}`),
      row('Ceiling height', `${mm(H)} ${T('(assumed)')}`), row('WC door', `${mm(r.DOOR_W)} × ${mm(r.DOOR_H)}`),
      row('Side panel', `${mm(r.PANEL_W)} × ${mm(r.PANEL_H)}`)]),
    table('LED strip', name('led-name'), [
      row('Top line, WC room', m(L.wcTop)), row('Top line, vestibule', m(L.vTop)),
      row('Floor line, WC room', m(L.wcFloor)), row('Floor line, vestibule', m(L.vFloor)),
      row('Under the vestibule counter', m(L.counterStrip)),
      row('Strip, net', m(L.net), 'tot'), row('To order, +10%', m(L.net * 1.1), 'tot'),
      row('Backlit mirrors (integrated)', T('2 × round, Ø 600'))]),
    table('Wall covering', name('wall-name'), [
      row('WC room, net of the door', m2(s.wallWC)), row('Vestibule, net of door and panel', m2(s.wallV)),
      row('Door reveals', m2(s.reveals)), row('Area to tile', m2(s.wall), 'tot'),
      row('To order, +10%', m2(s.wallOrder), 'tot'), row('Tiles at 600 × 1200', String(s.wallTiles))]),
    table('Floor covering', name('floor-name'), [
      row('WC room', m2(s.fWC)), row('Vestibule', m2(s.fV)), row('Under the door', m2(s.fDoor)),
      row('Floor area', m2(s.floor), 'tot'), row('To order, +10%', m2(s.floorOrder), 'tot'),
      row('Tiles at 600 × 600', String(s.floorTiles)), row('Skirting, WC / vestibule', `${m(s.skirtWC)} / ${m(s.skirtV)}`)]),
    `<section class="spec-sec"><h3>${T('Counters, basins and fixtures')}<span>${T('mm, heights above the floor')}</span></h3>
      <ul class="spec-fix">${specFix.map(([room, item, size, pos, fin]) =>
        `<li><b>${T(item)}</b><span class="spec-room">${T(room)}</span><span>${T(size)}</span><span>${T(pos)}</span><span>${T(fin)}</span></li>`).join('')}</ul></section>`,
    `<section class="spec-sec"><h3>${T('Services')}<span>${T('electrics per plan, water and drainage schematic')}</span></h3>
      ${['elec', 'water', 'drain'].map(layer => `<p class="spec-layer spec-layer--${layer}">${T({ elec: 'Electrics', water: 'Water', drain: 'Drainage' }[layer])} · ${SERVICES.filter(sv => sv.layer === layer).length}</p>
      <ul class="spec-fix">${SERVICES.filter(sv => sv.layer === layer).map(sv =>
        `<li><b>${T(sv.name)}</b><span class="spec-room">${T(sv.room)}</span><span>${T(sv.spec)}</span><span>${T('Height')} ${Math.round(sv.at.y * 1000)}</span></li>`).join('')}</ul>`).join('')}</section>`,
  ].join('');
}
{
  const panel = document.getElementById('spec'), btn = document.getElementById('t-spec');
  const set = on => {
    panel.hidden = !on;
    btn.setAttribute('aria-pressed', String(on));
    if (on) { renderSpec(); panel.focus({ preventScroll: true }); }
  };
  // the panel stops above the bottom controls, whatever their height
  const dock = document.querySelector('.dock-right');
  new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', dock.offsetHeight + 'px')).observe(dock);
  btn.addEventListener('click', () => set(panel.hidden));
  panel.querySelector('.spec-close').addEventListener('click', () => { set(false); btn.focus(); });
  // print the chosen configuration: a picture of the current view, the finishes and layers, the specification
  document.getElementById('spec-print').addEventListener('click', () => {
    const T = WS.tr, val = id => document.getElementById(id).textContent;
    composer.render(); placeLabels();
    const shot = renderer.domElement.toDataURL('image/png');          // read in the same task as the render
    renderSpec();
    const layers = ['elec', 'water', 'drain'].filter(k => LAYERS[k].visible).map(k => T({ elec: 'Electrics', water: 'Water', drain: 'Drainage' }[k]));
    const name = (document.title.split('|')[0] || '').trim();
    const sheet = document.getElementById('print-sheet');
    sheet.innerHTML = `
      <header class="ps-head"><p class="ps-brand">3DNA</p><h1>${name}</h1>
        <p class="ps-meta">${T('Concept model')} · ${new Date().toLocaleDateString(document.documentElement.lang || 'en')}</p></header>
      <section class="ps-config"><h2>${T('Selected configuration')}</h2>
        <dl><div><dt>${T('Wall covering')}</dt><dd>${val('wall-name')}</dd></div>
            <div><dt>${T('Floor covering')}</dt><dd>${val('floor-name')}</dd></div>
            <div><dt>${T('LED colour')}</dt><dd>${val('led-name')}</dd></div>
            <div><dt>${T('Services shown')}</dt><dd>${layers.length ? layers.join(', ') : '—'}</dd></div></dl></section>
      <figure class="ps-shot"><img src="${shot}" alt=""></figure>
      <section class="ps-spec"><h2>${T('Specification')}</h2>${document.getElementById('spec-body').innerHTML}</section>
      <p class="ps-note">${document.querySelector('.spec-note').textContent}</p>`;
    const img = sheet.querySelector('img');
    const go = () => window.print();
    if (img.complete) go(); else img.onload = go;
  });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { set(false); btn.focus(); } });
  // keep the finish names in the panel in step with the swatches
  document.querySelector('.finishes').addEventListener('click', () => { if (!panel.hidden) renderSpec(); });
}

/* ---------- theme and size ---------- */

// the scene has no background of its own: the stage colour (CSS --scene, white) shows through the canvas
function applyTheme() {
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  dirty = true;
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  ortho.left = ortho.bottom * camera.aspect; ortho.right = ortho.top * camera.aspect;
  ortho.updateProjectionMatrix();
  dirty = true;
}
new ResizeObserver(resize).observe(stage);
// phones: the stage ends above the controls (the finishes sheet opens over the model, the stage stays put)
const phone = matchMedia('(max-width: 640px)');
const dockEl = document.querySelector('.dock'), finBtn = document.getElementById('t-finishes');
function layoutPhone() {
  const root = document.documentElement;
  if (!phone.matches) { root.style.removeProperty('--stage-bottom'); root.classList.remove('finishes-open'); finBtn.setAttribute('aria-expanded', 'false'); return; }
  if (root.classList.contains('finishes-open')) return;
  root.style.setProperty('--stage-bottom', Math.max(0, Math.round(window.innerHeight - dockEl.getBoundingClientRect().top + 8)) + 'px');
}
finBtn.addEventListener('click', () => {
  const open = document.documentElement.classList.toggle('finishes-open');
  finBtn.setAttribute('aria-expanded', String(open));
  if (!open) layoutPhone();
});
new ResizeObserver(layoutPhone).observe(dockEl);
window.addEventListener('resize', layoutPhone);
phone.addEventListener('change', layoutPhone);
layoutPhone();

resize();
goTo('overview', true);

/* ---------- loop ---------- */

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function frame(now) {
  requestAnimationFrame(frame);
  let moving = false;
  if (tween) {
    const t = Math.min(1, (now - tween.t0) / tween.dur), e = ease(t);
    camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
    controls.target.lerpVectors(tween.fromTgt, tween.toTgt, e);
    camera.fov = tween.fromFov + (tween.toFov - tween.fromFov) * e;
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    if (t === 1) { const done = tween.done; tween = null; controls.update(); if (done) done(); }
    moving = true;
  } else if (controls.update()) {
    moving = true;
  }
  if (moving || dirty) {
    composer.render();
    placeLabels();
    dirty = false;
    if (!window.__modelReady) {
      window.__modelReady = true;
      document.getElementById('loading').hidden = true;
    }
  }
}
requestAnimationFrame(frame);
