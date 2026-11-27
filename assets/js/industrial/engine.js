/*
 * 3DNA Digital Twin engine — builds and drives an interactive 3D plant from a factory configuration.
 *
 *   const twin = await createTwin(container, factory, { lang, mode: "dashboard" | "showcase" });
 *   twin.select(id) · twin.focus(id | areaId) · twin.setView("realistic" | "process" | "xray")
 *   twin.highlightStream(stream | null) · twin.on("select" | "hover", fn) · twin.dispose()
 *
 * A factory (assets/js/industrial/factories/*.js) only describes the site: ground and roads, areas,
 * equipment items ({ id, type, params, pos, rot, area }), process connections and streams. Geometry comes
 * from the procedural library (equipment.js). Nothing here is specific to one kind of plant.
 * Rendering is on demand (camera moves, hover, animated flow), paused when the canvas is off screen.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createRenderer, setupLighting, mergeGeometries } from "/assets/js/shared-3d/archviz.js?v=ind1";
import { createMaterials, createTextures, buildEquipment, createBuilder } from "./equipment.js?v=ind10";

export const tr = (v, lang) => (v && typeof v === "object" && !Array.isArray(v) ? (v[lang] || v.en || v.es || "") : v);
// display name of an equipment item: its kind's catalogue name + number
export const nameOf = (F, it, lang) => { const c = F.catalog[it.kind] || {}; const n = tr(c.name, lang) || it.id; return it.n ? `${n} ${it.n}` : n; };

// ------------------------------------------------------------------ pipe routing
// Pipes rise from a port, run in the stream's rack lane, and drop into the next port. "direct" routes take
// an L-shaped path just above both items (short local links).
function route(a, b, lane, direct) {
  const pts = [a.clone()];
  if (direct) {
    const y = Math.max(a.y, b.y) + 1.2;
    pts.push(new THREE.Vector3(a.x, y, a.z), new THREE.Vector3(b.x, y, a.z), new THREE.Vector3(b.x, y, b.z));
  } else {
    pts.push(new THREE.Vector3(a.x, lane.y, a.z), new THREE.Vector3(a.x, lane.y, lane.z), new THREE.Vector3(b.x, lane.y, lane.z), new THREE.Vector3(b.x, lane.y, b.z));
  }
  pts.push(b.clone());
  // drop zero-length segments
  return pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 0.05);
}
function pathLength(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += pts[i].distanceTo(pts[i - 1]); return l; }
function tubeAlong(pts, r) {
  // straight runs trimmed at each corner + a curved elbow (bend radius ≈ 2.5 r) between them
  const n = pts.length, geos = [], bend = new Array(n).fill(0), dir = [];
  for (let i = 1; i < n; i++) dir.push(pts[i].clone().sub(pts[i - 1]));
  for (let i = 1; i < n - 1; i++) bend[i] = Math.max(0, Math.min(r * 2.5, dir[i - 1].length() / 2 - 0.01, dir[i].length() / 2 - 0.01));
  for (let i = 0; i < n - 1; i++) {
    const d = dir[i].clone().normalize(), a = pts[i].clone().addScaledVector(d, bend[i]), b = pts[i + 1].clone().addScaledVector(d, -bend[i + 1]);
    if (a.distanceTo(b) > 0.01) geos.push(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, r, 12, false));
  }
  for (let i = 1; i < n - 1; i++) if (bend[i] > 0.02) {
    const din = dir[i - 1].clone().normalize(), dout = dir[i].clone().normalize();
    geos.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(pts[i].clone().addScaledVector(din, -bend[i]), pts[i].clone(), pts[i].clone().addScaledVector(dout, bend[i])), 6, r, 12, false));
  }
  return geos.length === 1 ? geos[0] : mergeGeometries(geos);
}
function flowTexture(color) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 8;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, "rgba(255,255,255,0.0)"); g.addColorStop(0.55, "rgba(255,255,255,0.15)"); g.addColorStop(0.82, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0.0)");
  x.fillStyle = "#" + new THREE.Color(color).multiplyScalar(0.35).getHexString(); x.fillRect(0, 0, 128, 8);
  x.globalCompositeOperation = "lighter"; x.fillStyle = g; x.fillRect(0, 0, 128, 8);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pulseTexture(color) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 8;
  const x = c.getContext("2d"), col = new THREE.Color(color);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.6, `rgba(${rgb},0.25)`); g.addColorStop(0.9, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 8);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ sky
function skyTexture(top, horizon, ground) {
  const c = document.createElement("canvas"); c.width = 4; c.height = 512;
  const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top); g.addColorStop(0.58, horizon); g.addColorStop(0.62, ground); g.addColorStop(1, ground);
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

export async function createTwin(container, F, opts = {}) {
  const lang = opts.lang || "es";
  const showcase = opts.mode === "showcase";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPower = opts.lowPower ?? (matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4);
  const listeners = { select: [], hover: [], ready: [], link: [], trace: [], energy: [] };
  const emit = (k, v) => listeners[k].forEach((f) => f(v));

  // ---------------------------------------------------------------- renderer / scene / camera
  const renderer = createRenderer({ lowPower, exposure: 0.86, className: "twin__canvas" });
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const S = F.site;
  const center = new THREE.Vector3((S.x[0] + S.x[1]) / 2, 0, (S.z[0] + S.z[1]) / 2);
  const span = Math.max(S.x[1] - S.x[0], S.z[1] - S.z[0]);
  // studio: transparent background (the page draws the black backdrop), neutral key light, cool fill, rim
  setupLighting(renderer, scene, { center, span, hemi: [0xe6ecf5, 0x15161a, 0.55], key: 0xfff4e8, keyIntensity: 2.4, keyFrom: [-0.7, 0.9, 0.4], fill: [0x8fb2ff, 0.5] });
  const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(center.x + span, span * 0.6, center.z + span * 0.9); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(36, 1, 4, span * 6);
  // overview: the whole site framed for the canvas' aspect ratio
  const homeDir = new THREE.Vector3(0.62, 0.52, 0.6).normalize();
  const home = { pos: new THREE.Vector3(), target: center.clone().add(new THREE.Vector3(0, 6, 0)) };
  const frameHome = () => {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2, hfov = Math.atan(Math.tan(v) * camera.aspect);
    const dist = Math.max((span * 0.5) / Math.tan(hfov), (span * 0.34) / Math.tan(v)) * (opts.frame || (showcase ? 0.78 : 0.72)) * (camera.aspect < 1 ? 1.32 : 1);
    home.pos.copy(home.target).add(homeDir.clone().multiplyScalar(dist));
  };
  frameHome(); camera.position.copy(home.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(home.target);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 18; controls.maxDistance = span * 2.2;
  controls.screenSpacePanning = false;
  if (showcase) { controls.autoRotate = true; controls.autoRotateSpeed = 0.35; controls.enableZoom = false; controls.enablePan = false; }

  // ---------------------------------------------------------------- ground, roads, fence
  const tex = createTextures(renderer);
  tex.grating.repeat.set(14, 14);
  const M = createMaterials(tex);
  const groundB = createBuilder(M);
  { const W = S.x[1] - S.x[0] + 16, D = S.z[1] - S.z[0] + 16, H = 3;      // platform: its top sits 0.3 m below the site slab
    groundB.box(M.slabEdge, W, H, D, center.x, -H / 2 - 0.3, center.z); }
  groundB.add(M.concrete, new THREE.PlaneGeometry(S.x[1] - S.x[0], S.z[1] - S.z[0]), groundB.T(center.x, 0, center.z, 0, -Math.PI / 2));
  for (const r of F.roads || []) groundB.add(M.asphalt, new THREE.PlaneGeometry(r.w, r.d), groundB.T(r.x, 0.08, r.z, 0, -Math.PI / 2));
  for (const r of F.roads || []) if (r.lines !== false) {
    const along = r.w > r.d, len = along ? r.w : r.d;
    for (let s = -len / 2 + 2; s < len / 2 - 2; s += 6) groundB.add(M.white, new THREE.PlaneGeometry(along ? 3 : 0.2, along ? 0.2 : 3), groundB.T(r.x + (along ? s : 0), 0.16, r.z + (along ? 0 : s), 0, -Math.PI / 2));
  }
  if (F.fence) {
    const [x0, x1] = F.fence.x, [z0, z1] = F.fence.z, step = 4;
    const edge = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / step); for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; groundB.box(M.steel, 0.12, 2.4, 0.12, x, 1.2, z); if (i % 4 === 2) { groundB.box(M.steel, 0.16, 3.4, 0.16, x, 1.7, z); groundB.add(M.lampHead, new THREE.SphereGeometry(0.5, 12, 8), groundB.T(x, 3.5, z)); } } for (const y of [0.4, 1.4, 2.3]) groundB.rod(M.steel, 0.03, [ax, y, az], [bx, y, bz], 4); };
    edge(x0, z0, x1, z0); edge(x1, z0, x1, z1); edge(x1, z1, x0, z1); edge(x0, z1, x0, z0);
  }
  // pedestrian walkways: green painted strips with yellow edges (factory.paths)
  for (const p of F.paths || []) {
    const w = p.w || 1.8;
    for (let i = 1; i < p.pts.length; i++) {
      const [ax, az] = p.pts[i - 1], [bx, bz] = p.pts[i], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      // flat strips: lay the plane down first (X), then turn it along the walkway (Y)
      const flat = (gw, gd, x, y, z, a) => { const g = new THREE.PlaneGeometry(gw, gd); g.rotateX(-Math.PI / 2); g.rotateY(-a); g.translate(x, y, z); return g; };
      groundB.add(M.walkway, flat(L + w, w, cx, 0.12, cz, ang));
      for (const e of [-1, 1]) { const ox = -Math.sin(ang) * e * (w / 2 - 0.08), oz = Math.cos(ang) * e * (w / 2 - 0.08); groundB.add(M.yellow, flat(L + w, 0.12, cx + ox, 0.18, cz + oz, ang)); }
      for (let s = 1.2; s < L - 0.6; s += 2.4) { const t = s / L; groundB.add(M.white, flat(0.9, 0.18, ax + (bx - ax) * t, 0.18, az + (bz - az) * t, ang - Math.PI / 2)); }
    }
  }
  // paved surfaces (factory.paving): interlocking pavers or jointed concrete slab panels
  if (F.paving && F.paving.length) {
    const tile = (draw, size) => { const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; };
    const paverTex = tile((x, n) => {
      x.fillStyle = "#6d7076"; x.fillRect(0, 0, n, n);
      const bw = n / 4, bh = n / 8;
      for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) {
        const ox = (r % 2) * bw / 2, l = 0.38 + Math.random() * 0.12;
        x.fillStyle = "rgb(" + Math.round(l * 255) + "," + Math.round(l * 258) + "," + Math.round(l * 265) + ")";
        x.fillRect(k * bw + ox + 1.5, r * bh + 1.5, bw - 3, bh - 3);
      }
    }, 256);
    const slabTex = tile((x, n) => {
      x.fillStyle = "#7c8086"; x.fillRect(0, 0, n, n);
      for (let i = 0; i < 2200; i++) { x.fillStyle = "rgba(" + (Math.random() < 0.5 ? "0,0,0" : "255,255,255") + "," + (Math.random() * 0.06).toFixed(3) + ")"; x.fillRect(Math.random() * n, Math.random() * n, 2, 2); }
      x.fillStyle = "rgba(20,22,26,.55)"; x.fillRect(0, 0, n, 3); x.fillRect(0, 0, 3, n);
    }, 256);
    for (const p of F.paving) {
      const t = (p.kind === "slab" ? slabTex : paverTex).clone(); t.needsUpdate = true;
      t.repeat.set(p.w / (p.kind === "slab" ? 6 : 2.4), p.d / (p.kind === "slab" ? 6 : 2.4));
      const m = new THREE.MeshStandardMaterial({ map: t, roughness: p.kind === "slab" ? 0.55 : 0.85, metalness: p.kind === "slab" ? 0.15 : 0 });
      groundB.add(m, new THREE.PlaneGeometry(p.w, p.d), groundB.T(p.x, 0.05, p.z, 0, -Math.PI / 2));
    }
  }
  // zebra crossings where walkways meet roads (factory.crossings: { x, z, w, d, along: "x" | "z" })
  for (const c of F.crossings || []) {
    const n = Math.floor((c.along === "x" ? c.w : c.d) / 1.0);
    for (let i = 0; i < n; i++) {
      const o = -((c.along === "x" ? c.w : c.d) / 2) + 0.5 + i * 1.0;
      if (c.along === "x") groundB.add(M.white, new THREE.PlaneGeometry(0.5, c.d), groundB.T(c.x + o, 0.2, c.z, 0, -Math.PI / 2));
      else groundB.add(M.white, new THREE.PlaneGeometry(c.w, 0.5), groundB.T(c.x, 0.2, c.z + o, 0, -Math.PI / 2));
    }
  }
  // painted boundary lines around the process areas (factory.zoneLines: area ids)
  for (const id of F.zoneLines || []) {
    const a = (F.areas || []).find((x) => x.id === id); if (!a) continue;
    const [x0, x1] = a.x, [z0, z1] = a.z, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const [w, d, x, z] of [[x1 - x0, 0.16, cx, z0], [x1 - x0, 0.16, cx, z1], [0.16, z1 - z0, x0, cz], [0.16, z1 - z0, x1, cz]]) groundB.add(M.yellow, new THREE.PlaneGeometry(w, d), groundB.T(x, 0.19, z, 0, -Math.PI / 2));
  }
  // lawns around the offices (factory.lawns: [x, z, w, d])
  for (const [x, z, w, d] of F.lawns || []) groundB.add(M.lawn, new THREE.PlaneGeometry(w, d), groundB.T(x, 0.06, z, 0, -Math.PI / 2));
  const ground = groundB.group("ground");
  ground.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  scene.add(ground);

  // ---------------------------------------------------------------- equipment
  const movers = [];                 // spinning parts (fans, agitators, clarifier bridge)
  const items = new Map();          // id -> { item, group, info, meshes, worldPorts }
  const pickables = [];
  for (const it of F.equipment) {
    const { group, info } = buildEquipment(M, it.type, it.params || {});
    group.position.set(it.pos[0], 0, it.pos[1]);
    group.rotation.y = it.rot || 0;
    group.userData.id = it.id;
    scene.add(group);
    group.updateMatrixWorld(true);
    const meshes = []; group.traverse((o) => { if (o.isMesh) { o.userData.id = it.id; meshes.push(o); if (!it.decor) pickables.push(o); } });
    const worldPorts = {};
    for (const [k, p] of Object.entries(info.ports || {})) worldPorts[k] = new THREE.Vector3(...p).applyMatrix4(group.matrixWorld);
    items.set(it.id, { item: it, group, info, meshes });
    for (const m of group.userData.movers || []) movers.push(m);
    items.get(it.id).worldPorts = worldPorts;
  }

  // ---------------------------------------------------------------- engineering connection graph
  // Every network connection (production process + engineering networks) is one "link":
  //   { id, net, from, to, name, color, route, dir, desc, kind, visible, animated }
  // Lines start and end at attachment points on the equipment (ports, or a point on the item's side facing
  // the route), run in an allocated lane of the pipe rack (process / utilities / cable-tray tier) and get
  // supports wherever they leave the rack. Orphan references are reported and skipped.
  const NET = F.networks || { process: { name: "Production Process", color: 0xf59e0b, style: "pipe", tier: 0, r: 0.22 } };
  const RK = F.rack || { x: [-1e9, -1e9], z: 0, w: 8, tiers: [8, 10.4, 12.6] };
  const streams = F.streams || {};
  const validation = { links: 0, orphans: [], crossings: [] };
  const linkDefs = [
    ...(F.connections || []).map((c, i) => ({ id: c.id || `pr-${i + 1}`, net: "process", from: c.from, to: c.to, name: tr((streams[c.stream] || {}).name, lang) || "Process line", stream: c.stream, color: (streams[c.stream] || {}).color, fromPort: c.fromPort, toPort: c.toPort, direct: c.direct, desc: (NET.process || {}).desc })),
    ...(F.links || [])
  ];
  // bounding boxes of the items (for attachment points, supports and validation)
  for (const rec of items.values()) rec.box = new THREE.Box3().setFromObject(rec.group);
  const solid = [...items.values()].filter((r) => !r.item.decor && !["rack", "truck", "parking", "bund", "conveyor", "structure"].includes(r.item.kind));
  const onRoad = (x, z) => (F.roads || []).some((r) => Math.abs(x - r.x) < r.w / 2 + 0.5 && Math.abs(z - r.z) < r.d / 2 + 0.5);
  const inside = (x, z, pad = 0.4) => solid.find((r) => x > r.box.min.x - pad && x < r.box.max.x + pad && z > r.box.min.z - pad && z < r.box.max.z + pad);
  const onRack = (x, z) => x > RK.x[0] - 0.5 && x < RK.x[1] + 0.5 && Math.abs(z - RK.z) < RK.w / 2 + 0.3;
  const attachCount = new Map();
  const postAt = new Set();
  function attach(rec, port, toward, y) {
    if (port && rec.worldPorts[port]) return rec.worldPorts[port].clone();
    const k = attachCount.get(rec.item.id) || 0; attachCount.set(rec.item.id, k + 1);
    const b = rec.box, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    const off = ((k % 5) - 2) * 0.7;
    const dz = toward.z - cz, dx = toward.x - cx;
    if (Math.abs(dz) >= Math.abs(dx) * 0.6) {
      const x = THREE.MathUtils.clamp(cx + off, b.min.x + 0.3, b.max.x - 0.3);
      return new THREE.Vector3(x, Math.min(y, Math.max(0.8, b.max.y * 0.45)), dz < 0 ? b.min.z - 0.35 : b.max.z + 0.35);
    }
    const z = THREE.MathUtils.clamp(cz + off, b.min.z + 0.3, b.max.z - 0.3);
    return new THREE.Vector3(dx < 0 ? b.min.x - 0.35 : b.max.x + 0.35, Math.min(y, Math.max(0.8, b.max.y * 0.45)), z);
  }
  // lane allocation on the rack: slots across the width per tier, intervals along x
  const slotsFor = (tier, style) => style === "tray" ? [-3.2, -1.6].flatMap((z) => [z - 0.16, z, z + 0.16]) : style === "cable" ? [1.6, 3.2].flatMap((z) => [z - 0.16, z, z + 0.16]) : Array.from({ length: 13 }, (_, i) => -4.2 + i * 0.7);
  const used = new Map();
  function lane(tier, style, x0, x1) {
    const slots = slotsFor(tier, style);
    for (let si = 0; si < slots.length; si++) {
      const key = tier + ":" + style.replace("insulated", "pipe") + ":" + si, list = used.get(key) || [];
      if (!list.some(([a, b]) => x0 < b + 1.2 && x1 > a - 1.2)) { list.push([x0, x1]); used.set(key, list); return RK.z + slots[si]; }
    }
    return RK.z + slots[Math.floor(Math.random() * slots.length)];
  }
  const links = [];
  const netGroup = new THREE.Group(); scene.add(netGroup);
  const PAINT = {
    process: new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.9, roughness: 0.22 }),
    steam: M.insulation,
    cooling: new THREE.MeshStandardMaterial({ color: 0x1f4f8f, metalness: 0.4, roughness: 0.4 }),
    coolingReturn: new THREE.MeshStandardMaterial({ color: 0x4f86c6, metalness: 0.4, roughness: 0.4 }),
    water: new THREE.MeshStandardMaterial({ color: 0x2f6b4f, metalness: 0.35, roughness: 0.45 }),
    air: new THREE.MeshStandardMaterial({ color: 0x8fb4d9, metalness: 0.4, roughness: 0.4 }),
    waste: new THREE.MeshStandardMaterial({ color: 0x5b4630, metalness: 0.2, roughness: 0.6 }),
    fire: M.fireRed,
    power: new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.7 }),
    control: new THREE.MeshStandardMaterial({ color: 0x3b2a52, roughness: 0.6 })
  };
  const glowCache = new Map();
  const glowMat = (color) => { if (!glowCache.has(color)) glowCache.set(color, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.35 })); return glowCache.get(color); };
  const dimLink = new THREE.MeshStandardMaterial({ color: 0x2a2d33, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.9 });
  const supportB = createBuilder(M), fitB = createBuilder(M), trayB = createBuilder(M);
  const segBox = (bld, mat, a, b, w, h) => {                       // a flat box (tray) from a to b
    const d = b.clone().sub(a), L = d.length(); if (L < 0.05) return;
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()), new THREE.Vector3(1, 1, 1));
    bld.add(mat, new THREE.BoxGeometry(L + w * 0.5, h, w), m);
  };
  for (const def of linkDefs) {
    const A = items.get(def.from), B = items.get(def.to), net = NET[def.net];
    if (!A || !B || !net) { validation.orphans.push(def.id); continue; }
    const style = net.style || "pipe", r = style === "tray" ? 0.08 : style === "cable" ? 0.05 : (net.r || 0.22) * (def.kind === "return" ? 0.9 : 1);
    const ay = style === "tray" || style === "cable" ? 1.2 : 1.8;
    const tierY = RK.tiers[net.tier || 0];
    const laneY = style === "tray" || style === "cable" ? tierY + 0.12 : tierY + r + 0.14;
    const pA = A.group.position, pB = B.group.position;
    const useRack = !def.direct && RK.x[1] > RK.x[0];
    let a, b, pts, lzUsed = null;
    if (useRack) {
      a = attach(A, def.fromPort, new THREE.Vector3(pA.x, 0, RK.z), ay);
      b = attach(B, def.toPort, new THREE.Vector3(pB.x, 0, RK.z), ay);
      const lz = lane(net.tier || 0, style, Math.min(a.x, b.x), Math.max(a.x, b.x)); lzUsed = lz;
      const yc = laneY + (style === "tray" || style === "cable" ? 0.8 : 1.15);      // crossing level between tiers
      pts = [a, new THREE.Vector3(a.x, yc, a.z), new THREE.Vector3(a.x, yc, lz), new THREE.Vector3(a.x, laneY, lz), new THREE.Vector3(b.x, laneY, lz), new THREE.Vector3(b.x, yc, lz), new THREE.Vector3(b.x, yc, b.z), b];
      // expansion loop on long steam runs along the rack
      if (style === "insulated" && Math.abs(b.x - a.x) > 50) {
        const xm = (a.x + b.x) / 2, sgn = Math.sign(b.x - a.x);
        pts.splice(4, 0, new THREE.Vector3(xm - 2.5 * sgn, laneY, lz), new THREE.Vector3(xm - 2.5 * sgn, laneY + 1.0, lz), new THREE.Vector3(xm + 2.5 * sgn, laneY + 1.0, lz), new THREE.Vector3(xm + 2.5 * sgn, laneY, lz));
      }
    } else {
      a = attach(A, def.fromPort, pB, ay); b = attach(B, def.toPort, pA, ay);
      // clear any equipment under the two horizontal runs
      let y = Math.max(a.y, b.y) + 1.2;
      for (const [x0, z0, x1, z1] of [[a.x, a.z, b.x, a.z], [b.x, a.z, b.x, b.z]]) {
        const L = Math.hypot(x1 - x0, z1 - z0);
        for (let t = 0; t <= L; t += 0.8) { const x = x0 + ((x1 - x0) * t) / (L || 1), z = z0 + ((z1 - z0) * t) / (L || 1); for (const rr of solid) if (rr.item.id !== def.from && rr.item.id !== def.to && x > rr.box.min.x && x < rr.box.max.x && z > rr.box.min.z && z < rr.box.max.z) y = Math.max(y, rr.box.max.y + 1.0); }
      }
      pts = [a, new THREE.Vector3(a.x, y, a.z), new THREE.Vector3(b.x, y, a.z), new THREE.Vector3(b.x, y, b.z), b];
    }
    pts = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 0.05);
    const len = pathLength(pts);
    const color = def.color ?? (def.kind === "return" ? new THREE.Color(net.color).lerp(new THREE.Color(0xffffff), 0.35).getHex() : net.color);
    const paint = def.net === "cooling" && def.kind === "return" ? PAINT.coolingReturn : (PAINT[def.net] || PAINT.process);
    const mesh = new THREE.Mesh(tubeAlong(pts, r), paint);
    mesh.castShadow = style !== "cable";
    const link = { ...def, color, style, pts, len, mesh, paint, visible: true, animated: true, dir: def.dir || "forward", label: null, cum: [] };
    let acc = 0; link.cum = pts.map((p, i) => (acc += i ? p.distanceTo(pts[i - 1]) : 0));
    mesh.userData = { link };
    netGroup.add(mesh);
    // trays and cable ladders where the cables leave the rack tray tier
    if (style === "tray" || style === "cable") {
      const w = style === "tray" ? 0.5 : 0.3;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i], alongRack = useRack && Math.abs(p.y - laneY) < 0.01 && Math.abs(q.y - laneY) < 0.01 && Math.abs(p.z - q.z) < 0.01 && onRack(p.x, p.z) && onRack(q.x, q.z);
        if (alongRack) continue;
        const o = new THREE.Vector3(0, -r - 0.04, 0);
        segBox(trayB, M.galv, p.clone().add(o), q.clone().add(o), w, 0.08);
      }
      fitB.box(M.cabinet, 0.45, 0.45, 0.25, a.x, a.y, a.z); fitB.box(M.cabinet, 0.45, 0.45, 0.25, b.x, b.y, b.z);   // junction boxes
    } else {
      for (const p of [pts[0], pts[pts.length - 1]]) fitB.cyl(M.steel, r * 1.8, 0.16, p.x, p.y, p.z, 14);            // flanged nozzles
      if (pts.length > 2) { const p = pts[0].clone().lerp(pts[1], 0.5); fitB.box(M.darkSteel, r * 3, r * 3, r * 3, p.x, p.y, p.z); fitB.cyl(M.cabRed, r * 1.6, 0.08, p.x + r * 2.2, p.y, p.z, 12); }   // isolation valve
      if (style === "insulated") for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], n = Math.floor(p.distanceTo(q) / 3); for (let k = 1; k < n; k++) { const m = p.clone().lerp(q, k / n), d = q.clone().sub(p).normalize(); fitB.add(M.steel, new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.12, 14), new THREE.Matrix4().compose(m, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d), new THREE.Vector3(1, 1, 1))); } }   // jacket bands
    }
    // pipe shoes under the run along the rack, one per bay
    if (useRack && style !== "tray" && style !== "cable") {
      const nb = Math.round((RK.x[1] - RK.x[0]) / (RK.bay || 7)), bw = (RK.x[1] - RK.x[0]) / nb, sh = laneY - r - tierY;
      const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
      for (let k = 0; k <= nb; k++) { const bx = RK.x[0] + k * bw; if (bx > x0 + 0.5 && bx < x1 - 0.5 && sh > 0.02) supportB.box(M.darkSteel, 0.16, sh, 0.34, bx, tierY + sh / 2, lzUsed); }
    }
    // supports: posts every 6 m under horizontal runs off the rack (not near the rack, inside equipment, on roads or next to another post)
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      if (Math.abs(p.y - q.y) > 0.01 || p.y < 2.2) continue;
      const L = p.distanceTo(q);
      for (let t = 3; t < L - 1; t += 6) {
        const m = p.clone().lerp(q, t / L);
        const nearRack = m.x > RK.x[0] - 2 && m.x < RK.x[1] + 2 && Math.abs(m.z - RK.z) < RK.w / 2 + 2.5;
        const key = Math.round(m.x / 2.5) + ":" + Math.round(m.z / 2.5);
        if (nearRack || onRoad(m.x, m.z) || inside(m.x, m.z, 0.6) || postAt.has(key)) continue;
        postAt.add(key);
        const top = m.y - r - 0.12;
        supportB.box(M.paintGrey, 0.22, top, 0.22, m.x, top / 2, m.z);
        supportB.box(M.paintGrey, 0.9, 0.16, 0.18, m.x, top + 0.08, m.z);
        supportB.box(M.concrete, 0.5, 0.25, 0.5, m.x, 0.12, m.z);
      }
    }
    // label position: middle of the longest run
    let best = 1, bl = 0; for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); if (d > bl) { bl = d; best = i; } }
    link.labelPos = pts[best].clone().lerp(pts[best - 1], 0.5); link.labelPos.y += r + 0.7;
    // validation: runs crossing equipment (ignoring the first and last 1.5 m)
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i], L = p.distanceTo(q);
      for (let t = 1.5; t < L - 1.5; t += 1) { const m = p.clone().lerp(q, t / L); const hit = solid.find((rr) => rr.item.id !== def.from && rr.item.id !== def.to && rr.box.containsPoint(m)); if (hit) { validation.crossings.push(`${def.id} × ${hit.item.id}`); break; } }
    }
    links.push(link);
  }
  validation.links = links.length;
  const supports = supportB.group("supports"), fittings = fitB.group("fittings"), trays = trayB.group("trays");
  netGroup.add(supports, fittings, trays);
  if (validation.orphans.length) console.warn("[twin] orphan connections skipped:", validation.orphans);
  console.info(`[twin] ${links.length} connections · ${validation.orphans.length} orphans · ${validation.crossings.length} crossings`, validation.crossings.slice(0, 12));
  // directional particles per network (instanced), animated only while the network is active
  const particles = new Map();
  const sphere = new THREE.SphereGeometry(1, 8, 6);
  for (const id of Object.keys(NET)) {
    const own = links.filter((l) => l.net === id); if (!own.length) continue;
    const slots = []; for (const l of own) { const n = Math.max(2, Math.round(l.len / 5)); for (let k = 0; k < n; k++) slots.push({ l, o: (k / n) * l.len }); }
    const im = new THREE.InstancedMesh(sphere, new THREE.MeshBasicMaterial({ color: NET[id].color, toneMapped: false }), slots.length);
    im.visible = false; im.frustumCulled = false; im.raycast = () => {};
    scene.add(im); particles.set(id, { im, slots, size: NET[id].style === "tray" || NET[id].style === "cable" ? 0.2 : 0.34 });
  }
  const pointAt = (l, d, out) => { let i = 1; while (i < l.cum.length - 1 && l.cum[i] < d) i++; const a = l.pts[i - 1], b = l.pts[i], seg = l.cum[i] - l.cum[i - 1] || 1; return out.copy(a).lerp(b, (d - l.cum[i - 1]) / seg); };

  // contact shadows: soft dark discs under equipment (one merged mesh)
  let contactShadows = null;
  {
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
    const g = x.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(0.6, "rgba(0,0,0,0.25)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    const geos = [];
    for (const rec of solid) { const sz = rec.box.getSize(new THREE.Vector3()); if (Math.max(sz.x, sz.z) > 30 || ["substation", "parking", "muster", "aeration", "clarifier", "wdg"].includes(rec.item.kind)) continue; const p = new THREE.PlaneGeometry(sz.x * 1.5 + 1.5, sz.z * 1.5 + 1.5); p.rotateX(-Math.PI / 2); p.translate((rec.box.min.x + rec.box.max.x) / 2, 0.24, (rec.box.min.z + rec.box.max.z) / 2); geos.push(p); }
    if (geos.length) { const merged = mergeGeometries(geos); const cs = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); cs.renderOrder = 1; cs.raycast = () => {}; scene.add(cs); contactShadows = cs; }
  }

  // ---------------------------------------------------------------- area markers (process view)
  const areaGroup = new THREE.Group(); areaGroup.visible = false; scene.add(areaGroup);
  const labelLayer = document.createElement("div"); labelLayer.className = "twin__labels"; container.appendChild(labelLayer);
  const areaLabels = [];
  for (const ar of F.areas) {
    const [x0, x1] = ar.x, [z0, z1] = ar.z;
    const mat = new THREE.MeshBasicMaterial({ color: ar.color, transparent: true, opacity: 0.16, depthWrite: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
    pl.rotation.x = -Math.PI / 2; pl.position.set((x0 + x1) / 2, 0.26, (z0 + z1) / 2);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), new THREE.LineBasicMaterial({ color: ar.color }));
    edge.rotation.x = -Math.PI / 2; edge.position.copy(pl.position).setY(0.3);
    areaGroup.add(pl, edge);
    const el = document.createElement("button"); el.type = "button"; el.className = "twin__area"; el.style.setProperty("--c", "#" + new THREE.Color(ar.color).getHexString());
    el.innerHTML = `<b>${ar.step ? String(ar.step).padStart(2, "0") : ""}</b>${tr(ar.name, lang)}`;
    el.addEventListener("click", () => focus(ar.id));
    labelLayer.appendChild(el);
    areaLabels.push({ el, pos: new THREE.Vector3((x0 + x1) / 2, ar.labelY || 26, (z0 + z1) / 2) });
  }
  const tip = document.createElement("div"); tip.className = "twin__tip"; tip.hidden = true; container.appendChild(tip);
  const pipeLayer = document.createElement("div"); pipeLayer.className = "twin__pipes"; container.appendChild(pipeLayer);
  if (!showcase) for (const l of links) {
    const el = document.createElement("button"); el.type = "button";
    el.className = "twin__pipe"; el.style.setProperty("--c", "#" + new THREE.Color(l.color).getHexString());
    el.textContent = l.name; el.addEventListener("click", () => selectLink(l.id));
    pipeLayer.appendChild(el); l.label = el;
  }
  const showPipeLabels = () => !showcase && pipeLabelsOn;
  const caption = document.createElement("div"); caption.className = "twin__caption"; caption.hidden = true; container.appendChild(caption);

  // ---------------------------------------------------------------- vehicles
  const vehicles = [];
  for (const v of F.vehicles || []) {
    const P = v.path.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(P, true, "centripetal", 0.2);
    const L = curve.getLength();
    let stopU = 0, best = Infinity;
    for (let i = 0; i <= 600; i++) { const d = curve.getPointAt(i / 600).distanceTo(P[v.stopAt]); if (d < best) { best = d; stopU = i / 600; } }
    (v.ids || []).forEach((id, n) => { const rec = items.get(id); if (rec) vehicles.push({ rec, curve, L, stopU, stop: v.stop || 6, speed: v.speed || 9, u: (stopU + 0.02 + n / v.ids.length) % 1, wait: 0 }); });
  }
  const placeVehicle = (vh) => {
    const p = vh.curve.getPointAt(vh.u), t = vh.curve.getTangentAt(vh.u);
    vh.rec.group.position.set(p.x, 0, p.z);
    vh.rec.group.rotation.y = Math.atan2(t.z, -t.x);                 // the cab (local -x) leads
  };
  vehicles.forEach(placeVehicle);

  // ---------------------------------------------------------------- views and engineering layers
  const ghost = new THREE.MeshStandardMaterial({ color: 0xaec2e6, transparent: true, opacity: 0.24, depthWrite: false, metalness: 0, roughness: 1 });
  const xray = new THREE.MeshBasicMaterial({ color: 0x7fd6ff, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false });
  const dimEquip = new THREE.MeshStandardMaterial({ color: 0x3a3e46, transparent: true, opacity: 0.32, depthWrite: false, metalness: 0.2, roughness: 0.8 });
  const highlightCache = new Map(), connectedCache = new Map();
  let view = "realistic", selected = null, streamFocus = null, needs = true, pipeLabelsOn = true;
  const activeNets = new Set();
  let traceOn = false, traceSet = new Set(), selectedLink = null;
  const baseMat = (mesh) => mesh.userData.base || (mesh.userData.base = mesh.material);
  // "realistic" and "night" share the physical materials (and the engineering layers); thermal / blueprint recolour everything
  const REAL = () => view === "realistic" || view === "night";
  // thermal view: illustrative operating temperatures per kind of equipment and per network (°C)
  const TEMP = { boiler: 180, stack: 160, cooker: 150, sieve: 120, beercol: 100, structure: 90, liq: 85, rectifier: 80, centrifuge: 70, tstank: 65, slurry: 60, wdg: 50, condenser: 45, compressor: 45, substation: 45, mill: 35, egen: 35, fermenter: 33, yeast: 32, beerwell: 32, scrubber: 30, prodcooler: 30, receiver: 30, mcc: 30, cooling: 28, cwpump: 25, wwpump: 25, cyclone: 25, aeration: 22, admin: 21, lab: 21, gate: 20, clarifier: 20, day: 18, tank: 15, ro: 15, firepump: 15, wtank: 12, denaturant: 12, bin: 8, receiving: 8, elevator: 8, well: 8, firetank: 8 };
  const LINK_TEMP = (l) => l.net === "steam" ? (l.kind === "return" ? 95 : 180) : l.net === "cooling" ? (l.kind === "return" ? 34 : 22) : l.net === "water" ? 12 : l.net === "air" ? 30 : l.net === "waste" ? 25 : l.net === "fire" ? 8 : l.net === "process" ? ({ mash: 70, beer: 33, ethanol: 30, stillage: 85, thin: 70, co2: 30, denat: 10 }[l.stream] ?? 30) : null;
  const heat = (t) => new THREE.Color().setHSL(Math.max(0, Math.min(1, 1 - t / 160)) * 0.66, 0.9, 0.5);
  const thermalCache = new Map();
  const thermalMat = (t) => { const k = Math.round(t / 4) * 4; if (!thermalCache.has(k)) { const c = heat(k); thermalCache.set(k, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.65, metalness: 0 })); } return thermalCache.get(k); };
  const thermalCold = new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.9 });
  const thermalGround = new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 1 });
  // blueprint view: navy fills, light outlines (edges built on first use)
  const bpFill = new THREE.MeshBasicMaterial({ color: 0x0f2f5c });
  const bpGround = new THREE.MeshBasicMaterial({ color: 0x0b2447 });
  const bpLine = new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.8 });
  const bpPipe = new THREE.MeshBasicMaterial({ color: 0xe6f2ff });
  let edgesBuilt = false;
  function buildEdges() {
    if (edgesBuilt) return; edgesBuilt = true;
    for (const rec of items.values()) for (const m of rec.meshes) {
      if (!m.geometry || (rec.item.decor && rec.item.kind !== "tree")) continue;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), bpLine);
      e.raycast = () => {}; e.visible = false; m.add(e); (rec.edges = rec.edges || []).push(e);
    }
  }
  // backgrounds and lighting per view
  const bgTex = (draw) => { const c = document.createElement("canvas"); c.width = c.height = 1024; draw(c.getContext("2d")); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const BG = {
    blueprint: bgTex((x) => {
      x.fillStyle = "#0a2246"; x.fillRect(0, 0, 1024, 1024);
      for (const [step, a] of [[32, 0.12], [128, 0.24]]) { x.strokeStyle = "rgba(160,200,255," + a + ")"; x.lineWidth = 1; for (let i = 0; i <= 1024; i += step) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(1024, i); x.stroke(); } }
    }),
    thermal: bgTex((x) => { const g = x.createRadialGradient(512, 480, 40, 512, 512, 720); g.addColorStop(0, "#141a2b"); g.addColorStop(1, "#05070c"); x.fillStyle = g; x.fillRect(0, 0, 1024, 1024); }),
    night: bgTex((x) => { const g = x.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, "#02030a"); g.addColorStop(1, "#0a0f1f"); x.fillStyle = g; x.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 260; i++) { x.fillStyle = "rgba(255,255,255," + (Math.random() * 0.6).toFixed(2) + ")"; x.fillRect(Math.random() * 1024, Math.random() * 560, 1.4, 1.4); } })
  };
  let defaultBg, env0;
  const lights = []; scene.traverse((o) => { if (o.isLight) lights.push([o, o.intensity]); });
  const exposure0 = renderer.toneMappingExposure;
  const legend = document.createElement("div"); legend.className = "twin__legend"; legend.hidden = true;
  legend.innerHTML = "<span>" + (opts.thermalLabel || "Operating temperature (illustrative)") + "</span><i></i><b><em>0 °C</em><em>40</em><em>80</em><em>120</em><em>160+ °C</em></b>";
  container.appendChild(legend);
  function applyAtmosphere() {
    if (defaultBg === undefined) defaultBg = scene.background;
    scene.background = BG[view] || defaultBg;
    const night = view === "night";
    if (env0 === undefined) env0 = scene.environment;
    scene.environment = night ? null : env0;                                // no studio reflections after dark
    for (const [l, i] of lights) l.intensity = night ? i * (l.isHemisphereLight ? 0.85 : 0.3) : i;
    renderer.toneMappingExposure = night ? exposure0 * 0.95 : exposure0;
    legend.hidden = view !== "thermal";
  }
  const anyActive = () => activeNets.size > 0 || traceSet.size > 0 || !!selectedLink;
  const linkActive = (l) => (selectedLink === l) || (traceSet.size ? traceSet.has(l.id) : activeNets.has(l.net) && (!streamFocus || l.net !== "process" || l.stream === streamFocus));
  function applyView() {
    const act = anyActive(), connected = new Set();
    if (act) for (const l of links) if (linkActive(l)) { connected.add(l.from); connected.add(l.to); }
    for (const [id, rec] of items) {
      for (const m of rec.meshes) {
        const base = baseMat(m);
        let mat = base;
        if (view === "process") mat = ghost;
        else if (view === "xray") mat = xray;
        else if (view === "thermal") mat = TEMP[rec.item.kind] != null ? thermalMat(TEMP[rec.item.kind]) : rec.item.kind === "rack" ? thermalCold : thermalCold;
        else if (view === "blueprint") mat = bpFill;
        else if (act && !connected.has(id) && id !== selected) mat = rec.item.kind === "rack" ? dimEquip : dimEquip;
        else if (act && connected.has(id) && base.emissive) { if (!connectedCache.has(base.uuid)) { const h = base.clone(); h.emissive = new THREE.Color(0xffffff); h.emissiveIntensity = 0.08; connectedCache.set(base.uuid, h); } mat = connectedCache.get(base.uuid); }
        if (id === selected) {
          const key = mat.uuid;
          if (!highlightCache.has(key)) { const h = mat.clone(); if (h.emissive) { h.emissive = new THREE.Color(0x2f8cff); h.emissiveIntensity = view === "realistic" ? 0.45 : 1; } else h.color = new THREE.Color(0x52b4ff); h.opacity = Math.max(h.opacity || 1, 0.85); highlightCache.set(key, h); }
          mat = highlightCache.get(key);
        }
        m.material = mat;
        m.castShadow = REAL() && !act && base !== M.glass && base !== M.grating;
      }
      if (rec.edges) for (const e of rec.edges) e.visible = view === "blueprint";
    }
    ground.traverse((o) => { if (o.isMesh) { o.userData.base = o.userData.base || o.material; o.material = view === "blueprint" ? bpGround : view === "thermal" ? thermalGround : o.userData.base; } });
    for (const l of links) {
      const on = linkActive(l);
      if (view === "thermal") { const tt = LINK_TEMP(l); l.mesh.material = tt == null ? dimLink : thermalMat(tt); l.mesh.visible = true; }
      else if (view === "blueprint") { l.mesh.material = bpPipe; l.mesh.visible = true; }
      else if (!REAL()) { l.mesh.material = l.net === "process" || view === "xray" ? glowMat(l.color) : dimLink; l.mesh.visible = !(streamFocus && l.net === "process" && l.stream !== streamFocus); }
      else { l.mesh.material = act ? (on ? glowMat(l.color) : dimLink) : l.paint; l.mesh.visible = l.visible; }
      if (l.label) l.label.classList.toggle("is-sel", selectedLink === l);
    }
    const dimStatic = act || !REAL();
    supports.visible = fittings.visible = trays.visible = true;
    for (const g of [supports, fittings, trays]) g.traverse((o) => { if (o.isMesh) { o.userData.base = o.userData.base || o.material; o.material = view === "blueprint" ? bpFill : view === "thermal" ? thermalCold : dimStatic ? dimLink : o.userData.base; } });
    for (const [id, p] of particles) p.im.visible = REAL() && links.some((l) => l.net === id && linkActive(l));
    applyAtmosphere();
    if (contactShadows) contactShadows.visible = REAL() && !act;
    areaGroup.visible = view === "process";
    labelLayer.classList.toggle("is-on", view === "process");
    needs = true;
  }
  function setView(v) { view = v; if (v === "blueprint") buildEdges(); applyView(); }
  function highlightStream(s) { streamFocus = s; if (s) activeNets.add("process"); applyView(); }
  function setNetworks(list) { activeNets.clear(); for (const n of list) if (NET[n]) activeNets.add(n); selectedLink = null; applyView(); }
  function traceFor(id) { traceSet = new Set(id ? links.filter((l) => l.from === id || l.to === id).map((l) => l.id) : []); }
  function setTrace(on) { traceOn = !!on; traceFor(traceOn ? selected : null); applyView(); emit("trace", traceOn ? links.filter((l) => traceSet.has(l.id)) : []); }
  function selectLink(id) {
    selectedLink = links.find((l) => l.id === id) || null;
    applyView();
    emit("link", selectedLink);
  }

  // ---------------------------------------------------------------- camera moves
  let tween = null;
  function flyTo(pos, target, ms = 1100) {
    tween = { t0: performance.now(), ms, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: target };
    needs = true;
  }
  function bounds(ids) {
    const box = new THREE.Box3();
    ids.forEach((id) => { const r = items.get(id); if (r) box.expandByObject(r.group); });
    return box;
  }
  function focus(idOrArea) {
    let box;
    const ar = F.areas.find((a) => a.id === idOrArea);
    if (ar) box = new THREE.Box3(new THREE.Vector3(ar.x[0], 0, ar.z[0]), new THREE.Vector3(ar.x[1], 20, ar.z[1]));
    else if (items.has(idOrArea)) box = bounds([idOrArea]);
    else { flyTo(home.pos.clone(), home.target.clone()); return; }
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.z, size.y * 1.2) * 0.5 + 8;
    const dist = r / Math.sin((camera.fov * Math.PI / 180) / 2) * 1.15;
    const dir = camera.position.clone().sub(controls.target).normalize();
    dir.y = Math.max(0.42, Math.min(0.7, dir.y)); dir.normalize();
    flyTo(c.clone().add(dir.multiplyScalar(dist)), c.clone().setY(Math.min(size.y * 0.45, 14)));
  }
  function select(id, fly = true) {
    selected = id && items.has(id) ? id : null;
    selectedLink = null;
    if (traceOn) { traceFor(selected); emit("trace", links.filter((l) => traceSet.has(l.id))); }
    applyView();
    if (selected && fly) focus(selected);
    emit("select", selected ? items.get(selected).item : null);
  }

  // ---------------------------------------------------------------- picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, hoverId = null, lastHover = 0;
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    // a network segment wins when it is in front of the equipment and its network is shown
    if (!showcase && REAL()) {
      ray.params.Line = { threshold: 0.5 };
      const lh = ray.intersectObjects(links.filter((l) => l.mesh.visible && (!anyActive() || linkActive(l))).map((l) => l.mesh), false)[0];
      if (lh && (!hit || lh.distance < hit.distance + (anyActive() ? 30 : 0))) return { link: lh.object.userData.link };
    }
    return hit ? hit.object.userData.id : null;
  }
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; if (showcase) controls.autoRotate = false; });
  cv.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || showcase) return;
    const id = pick(e);
    if (id && typeof id === "object") { selectLink(id.link.id); return; }
    select(id);
  });
  cv.addEventListener("pointermove", (e) => {
    if (showcase || e.pointerType !== "mouse") return;
    const now = performance.now(); if (now - lastHover < 60) return; lastHover = now;
    const hit = pick(e), id = hit && typeof hit === "object" ? null : hit;
    const label = hit && typeof hit === "object" ? `${hit.link.name} · ${tr(NET[hit.link.net].name, lang)}` : id ? nameOf(F, items.get(id).item, lang) : "";
    if (id !== hoverId) { hoverId = id; emit("hover", id ? items.get(id).item : null); }
    cv.style.cursor = hit ? "pointer" : "";
    if (hit) {
      const r = container.getBoundingClientRect();
      tip.hidden = false; tip.textContent = label;
      tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
    } else tip.hidden = true;
  });
  cv.addEventListener("pointerleave", () => { tip.hidden = true; });
  controls.addEventListener("change", () => { needs = true; });

  // ---------------------------------------------------------------- size, loop, visibility
  const useBloom = !lowPower && !showcase;
  let composer = null;
  if (useBloom) {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 1024; const x = c.getContext("2d");
    const g = x.createRadialGradient(512, 470, 40, 512, 512, 720); g.addColorStop(0, "#24262b"); g.addColorStop(0.55, "#0e0f12"); g.addColorStop(1, "#060708");
    x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
    x.fillStyle = "rgba(255,255,255,.05)"; for (let i = 8; i < 1024; i += 22) for (let j = 8; j < 1024; j += 22) x.fillRect(i, j, 1.6, 1.6);
    const bg = new THREE.CanvasTexture(c); bg.colorSpace = THREE.SRGBColorSpace; scene.background = bg;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.4, 0.93));
    composer.addPass(new OutputPass());
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } camera.aspect = w / h; camera.updateProjectionMatrix(); needs = true;
    // re-frame while the camera still sits at the overview: phones settle their layout (toolbars, sheets)
    // after the first resize, and a frame computed for that first size leaves the plant small and off-centre
    const atHome = !framed || (camera.position.distanceTo(home.pos) < 0.5 && controls.target.distanceTo(home.target) < 0.5);
    if (atHome) { frameHome(); camera.position.copy(home.pos); controls.target.copy(home.target); framed = true; }
  }
  let framed = false;
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let visible = true;
  const io = new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; }, { threshold: 0.01 }); io.observe(container);
  const clock = new THREE.Clock(), v3 = new THREE.Vector3(), mtx = new THREE.Matrix4();
  let ptime = 0;
  // cinematic "Energy Flow": the energy networks one after another, slow orbit, caption
  const ENERGY = [
    { nets: ["power"], text: "Electrical power · substation → motor control centre → motors and panels" },
    { nets: ["steam"], text: "Steam & thermal energy · boiler house → jet cooker and distillation, condensate back" },
    { nets: ["cooling"], text: "Cooling water · cooling tower → fermenters and condensers, warm return" },
    { nets: ["water", "waste"], text: "Water · wells → reverse osmosis → process; wastewater → treatment" },
    { nets: ["process"], text: "Production process · wheat → mash → beer → 99.5 % ethanol → tankers and feedlot" }
  ];
  let energy = null, energyPrev = null;
  function showEnergy() {
    const st = ENERGY[energy.step]; energy.since = performance.now();
    activeNets.clear(); st.nets.forEach((n) => activeNets.add(n)); selectedLink = null; applyView();
    caption.hidden = false; caption.innerHTML = `<b>${energy.step + 1} / ${ENERGY.length}</b> ${st.text}`;
    emit("energy", { step: energy.step, nets: st.nets });
  }
  function energyFlow(on) {
    if (on && !energy) {
      energyPrev = { nets: [...activeNets], rot: controls.autoRotate };
      if (traceOn) { traceOn = false; traceSet = new Set(); }
      selected = null; emit("select", null);
      frameHome();                                                          // the whole facility in view
      const offset = home.pos.clone().sub(home.target).multiplyScalar(1.25);
      flyTo(home.target.clone().add(offset), home.target.clone(), 1400);
      energy = { step: 0, since: 0, sway: !reducedMotion, offset, t0: performance.now() + 1400 };
      controls.autoRotate = false; showEnergy();
    }
    else if (!on && energy) { energy = null; caption.hidden = true; controls.autoRotate = energyPrev.rot; setNetworks(energyPrev.nets); emit("energy", null); }
  }
  controls.addEventListener("start", () => { if (energy) energy.sway = false; });   // the visitor takes the camera
  let fixedDt = null;                                   // set by renderFrame(): deterministic frame stepping (video capture)
  const loopFn = () => {
    const dt = fixedDt ?? Math.min(clock.getDelta(), 0.05);
    if (fixedDt === null && (!visible || document.hidden)) return;
    let moving = controls.update();
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
      if (k >= 1) tween = null; moving = true;
    }
    const motion = !reducedMotion;
    if (motion) {
      for (const vh of vehicles) {
        // keep a gap behind the truck ahead
        const ahead = vehicles.filter((o) => o !== vh && o.curve === vh.curve).map((o) => ((o.u - vh.u + 1) % 1) * vh.L);
        const blocked = ahead.some((d) => d > 0 && d < 22);
        if (vh.wait > 0) vh.wait -= dt;
        else if (!blocked) { const before = vh.u; vh.u = (vh.u + (dt * vh.speed) / vh.L) % 1; if (before < vh.stopU && (vh.u >= vh.stopU || vh.u < before)) { vh.u = vh.stopU; vh.wait = vh.stop; } }
        placeVehicle(vh);
      }
      ptime += dt;
      for (const m of movers) m.mesh.rotation.y += dt * m.speed;
      for (const [, p] of particles) if (p.im.visible) {
        let n = 0;
        for (const sl of p.slots) {
          const on = linkActive(sl.l);
          const d = on ? (sl.o + ptime * 6) % sl.l.len : 0;
          pointAt(sl.l, d, v3); mtx.makeScale(on ? p.size : 0, on ? p.size : 0, on ? p.size : 0).setPosition(v3);
          p.im.setMatrixAt(n++, mtx);
        }
        p.im.instanceMatrix.needsUpdate = true;
      }
    }
    // gentle camera sway around the overview (instead of a full orbit, which loses the ends of the long site)
    if (energy && energy.sway && !tween && performance.now() > energy.t0) {
      const a = Math.sin(((performance.now() - energy.t0) / 1000) * 0.3) * 0.35;
      camera.position.copy(controls.target).add(energy.offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a)); moving = true;
    }
    if (energy && performance.now() - energy.since > 6500) { energy.step = (energy.step + 1) % ENERGY.length; showEnergy(); }   // 6.5 s per step (wall clock)
    // level of detail: small fittings only near the camera
    fittings.visible = camera.position.distanceTo(controls.target) < span * 0.9;
    const animated = !REAL() || (showcase && controls.autoRotate) || !!energy || (motion && (vehicles.length || anyActive()));
    if (!(needs || moving || animated)) return;
    needs = false;
    if (composer) composer.render(); else renderer.render(scene, camera);
    if (showPipeLabels() && anyActive() && REAL()) {
      const w = container.clientWidth, h = container.clientHeight, placed = [];
      const order = links.filter((l) => l.label).map((l) => ({ l, d: (l === selectedLink ? -1e9 : 0) + l.labelPos.distanceToSquared(camera.position) })).sort((a, b) => a.d - b.d);
      for (const { l } of order) {
        v3.copy(l.labelPos).project(camera);
        const x = (v3.x * .5 + .5) * w, y = (-v3.y * .5 + .5) * h;
        const lw = l.label.offsetWidth || 60;
        const near = l.labelPos.distanceTo(camera.position) < 95 && placed.length < 5;
        const hit = !linkActive(l) || !(l === selectedLink || near) || v3.z > 1 || x < 0 || x > w || y < 0 || y > h || placed.some((q) => Math.abs(q.x - x) < (q.w + lw) / 2 + 6 && Math.abs(q.y - y) < 22);
        l.label.style.visibility = hit ? "hidden" : "visible";
        if (!hit) { l.label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`; placed.push({ x, y, w: lw }); }
      }
    }
    pipeLayer.classList.toggle("is-on", showPipeLabels() && anyActive() && REAL());
    if (view === "process") {
      const w = container.clientWidth, h = container.clientHeight;
      for (const l of areaLabels) { v3.copy(l.pos).project(camera); const off = v3.z > 1; l.el.style.transform = `translate(-50%, -50%) translate(${(v3.x * .5 + .5) * w}px, ${(-v3.y * .5 + .5) * h}px)`; l.el.style.visibility = off ? "hidden" : "visible"; }
    }
  };
  renderer.setAnimationLoop(loopFn);

  const api = {
    scene, camera, controls, renderer, items,
    select, focus, setView, highlightStream,
    links, networks: NET, validation,
    setNetworks, setTrace, selectLink, energyFlow,
    // video capture: stop the real-time loop and render exactly one frame of dt seconds
    stopLoop: () => renderer.setAnimationLoop(null),
    renderFrame: (dt) => { fixedDt = dt; needs = true; loopFn(); fixedDt = null; },
    get activeNetworks() { return [...activeNets]; },
    get trace() { return traceOn; },
    get energy() { return !!energy; },
    setFlow: () => {},
    setPipeLabels: (on) => { pipeLabelsOn = !!on; needs = true; },
    setAutoRotate: (on) => { controls.autoRotate = !!on; },
    home: () => { select(null, false); frameHome(); flyTo(home.pos.clone(), home.target.clone()); },
    get view() { return view; },
    on: (k, f) => { listeners[k].push(f); return api; },
    resize,
    dispose() { renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); renderer.dispose(); container.innerHTML = ""; }
  };
  emit("ready", api);
  return api;
}
