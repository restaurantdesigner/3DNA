/*
 * Centro Deportivo · Modelo 3D Interactivo — multipurpose building (Proyecto de Fitness y Bienestar).
 * Isolated prototype (noindex, not linked from the website).
 *
 * Geometry sources (all in metres, plan frame: x east, y south -> 3D x, z):
 *   plan-extracted.json  walls + steel columns from the PDF vector drawing (plano 04, 1:100)
 *   plan-model.json      rooms (official names / areas), completed walls, openings, heights
 *   plan-furniture.json  fixtures placed from the architect's furnished plan
 * Every element carries a status (verified / estimated); "Resaltar estimados"
 * tints the estimated ones.
 * Rendering: shared kit assets/js/shared-3d/archviz.js (image-based light,
 * soft shadows, canvas textures, geometry baked per material).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as K from "/assets/js/shared-3d/archviz.js";
import { buildFixture, PROJECT_MATS } from "./modelo-equipamiento.js";
import { createClubEquipment } from "/assets/js/fitness-club-3d/club-equipment.js";
import { buildEnvironment } from "./modelo-entorno.js";
import { summarize, toRows, dashboard, FIELDS } from "./presupuesto.js";

// ?embed=1 — shown inside the Fitness page: viewer, modes, room data and budget only
const PARAMS = new URLSearchParams(location.search);
const EMBED = PARAMS.has("embed");
if (EMBED) document.documentElement.classList.add("embed");
// embedded: tell the host page when the scene is ready (or failed), same origin only
const notifyHost = (type, data = {}) => { if (EMBED && window.parent !== window) window.parent.postMessage({ ...data, type: "centro-deportivo:" + type }, location.origin); };

const ui = {
  viewport: document.getElementById("viewport"),
  labels: document.getElementById("labels"),
  panel: document.getElementById("panel-body"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
};

const ESTIMATE = 0xe08a2e;
const HIGHLIGHT = 0x2f7d73;

try {
  await main();
} catch (err) {
  console.error(err);
  ui.loading.hidden = true;
  ui.error.hidden = false;
  ui.error.textContent = "No se ha podido cargar el modelo 3D: " + (err && err.message ? err.message : err);
  notifyHost("error");
}

async function main() {
  const webgl = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  if (!webgl) throw new Error("este navegador no admite WebGL. Usa la vista 2D del plano.");
  const [EX, MODEL, FURN, GYM, SITE, SPEC] = await Promise.all(["plan-extracted.json", "plan-model.json", "plan-furniture.json", "concepto-gimnasio.json", "emplazamiento.json", "equipamiento-especificaciones.json"].map((u) =>
    fetch(u).then((r) => { if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json(); })));

  // phones and tablets (portrait or landscape, any touch-first screen): the model starts unobstructed, details closed
  const COMPACT = window.matchMedia("(max-width: 900px), (max-height: 560px), (pointer: coarse)");
  if (COMPACT.matches) { document.body.classList.add("panel-closed"); document.getElementById("btn-panel").setAttribute("aria-expanded", "false"); }
  function lowPowerEarly() { return window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4; }
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const lowPower = touch || (navigator.hardwareConcurrency || 8) <= 4;

  // ---------- helpers: rooms, point in polygon ----------
  const rooms = MODEL.rooms.map((r) => ({ ...r, area3d: polyArea(r.poly) }));
  const roomAt = (x, y) => rooms.find((r) => inPoly(x, y, r.poly));
  const isSala = (x, y) => { const r = roomAt(x, y); return r && r.id === "sala"; };
  const inside = (x, y) => !!roomAt(x, y);
  const bounds = rooms.reduce((b, r) => { r.poly.forEach(([x, y]) => { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }); return b; }, [1e9, 1e9, -1e9, -1e9]);
  const CENTER = new THREE.Vector3((bounds[0] + bounds[2]) / 2, 0, (bounds[1] + bounds[3]) / 2);
  const SPAN = Math.hypot(bounds[2] - bounds[0], bounds[3] - bounds[1]);

  // floating island: contains the building and every documented site element (emplazamiento.json)
  const ISLAND = { x0: -19.5, z0: -39.0, x1: 66.5, z1: 44.5, r: 5.5, depth: 6.5 };
  const ISL_C = new THREE.Vector3((ISLAND.x0 + ISLAND.x1) / 2, 0, (ISLAND.z0 + ISLAND.z1) / 2);

  // ---------- renderer, scene, light ----------
  const renderer = K.createRenderer({ lowPower, exposure: 0.98, className: "canvas3d" });
  ui.viewport.prepend(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", "Modelo 3D del edificio multiusos");
  const scene = new THREE.Scene();
  const sun = K.setupLighting(renderer, scene, { center: ISL_C, span: 112, hemi: [0xb4c7e8, 0x2b3550, 0.8], key: 0xffd8a6, keyIntensity: 3.3, keyFrom: [0.5, 1.0, 0.55], fill: [0x7f9fd4, 0.75] });
  if (sun.shadow) { sun.shadow.mapSize.set(lowPowerEarly() ? 1024 : 4096, lowPowerEarly() ? 1024 : 4096); sun.shadow.radius = 4; }
  // cool rim light from behind: separates the island from the dark sky
  const rim = new THREE.DirectionalLight(0x9cb8ff, 0.9); rim.position.set(ISL_C.x - 60, 40, ISL_C.z - 80); scene.add(rim);
  // warm interior light pools (desktop)
  if (!lowPowerEarly()) {
    [[4.5, 2.9, 4.2], [9.5, 2.9, 4.2], [14.5, 2.9, 4.2], [8.5, 2.4, 11.8], [9.4, 2.4, 15.2], [14.6, 2.4, 15.2], [18.8, 2.4, 15.6], [5.2, 2.4, 15.0]].forEach(([x, y, z]) => {
      const l = new THREE.PointLight(0xffc98a, 7, 7.5, 2); l.position.set(x, y, z); scene.add(l);
    });
  }
  const TEX = K.makeTextures(renderer, 21);
  TEX.panel = panelTexture(renderer);
  TEX.gravel = gravelTexture(renderer);
  const MAT = K.createMaterials(TEX, PROJECT_MATS);
  const surf = (tex, color, rough, rep) => K.surfaceMat(TEX, tex, { color, roughness: rough, repeat: rep });

  const M = {
    plaster: surf(null, 0xebe6dd, 0.9),
    wallTop: surf(null, 0xa9a196, 0.85),
    panel: (() => { const m = surf(null, 0xffffff, 0.45); m.map = TEX.panel; m.metalness = 0.35; m.envMapIntensity = 0.9; return m; })(),
    plinth: surf("tile", 0xa48f79, 0.8, [1, 1]),
    ceramicClad: surf("tile", 0xb79f86, 0.75, [1, 1]),
    alu: (() => { const m = MAT.makeMat("dark"); m.color.setHex(0x51575d); m.metalness = 0.6; m.roughness = 0.35; return m; })(),
    glass: MAT.shared("glass"),
    doorWhite: surf(null, 0xf6f5f2, 0.4),
    doorSteel: (() => { const m = MAT.makeMat("steelPaint"); m.color.setHex(0x6c747b); return m; })(),
    roofPanel: (() => { const m = surf(null, 0xd5d9dc, 0.4); m.metalness = 0.55; m.map = TEX.panel; return m; })(),
    gravel: (() => { const m = surf(null, 0xffffff, 1); m.map = TEX.gravel; return m; })(),
    slab: surf(null, 0xe2ddd4, 0.85),
    ground: surf("concreteLight", 0xc9bca4, 0.95, [30, 30]),
    paving: surf("tile", 0xcdc5b8, 0.85, [10, 10]),
  };

  // ---------- camera + controls ----------
  const camera = new THREE.PerspectiveCamera(32, 1, 0.2, 400);
  let HOME_AZ = 0.72; const HOME_EL = 0.82;
  const homeTarget = new THREE.Vector3(CENTER.x, 0.6, CENTER.z);
  let homeDist = 40;
  const dirFrom = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const homePos = () => homeTarget.clone().addScaledVector(dirFrom(HOME_AZ, HOME_EL), homeDist);
  const controls = new OrbitControls(camera, renderer.domElement);
  // embedded in a page: the mouse wheel scrolls the page until the visitor engages with the
  // model (click / drag inside it); a pinch (ctrl + wheel) always zooms — same behaviour as
  // the Fitness zoning model. Capture listener: OrbitControls never sees a plain page scroll.
  if (EMBED) {
    let engaged = false;
    renderer.domElement.addEventListener("wheel", (e) => { if (!engaged && !e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });
    renderer.domElement.addEventListener("pointerdown", () => { engaged = true; });
    ui.viewport.addEventListener("pointerleave", () => { engaged = false; });
  }
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.35;
  controls.minDistance = 3;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

  // ---------- state ----------
  // default: cut-away walls (gym visible), surroundings on, presentation view
  const state = { roof: false, cut: true, estimates: false, env: true, view: "edificio", selected: null, zone: null, hovered: null, tab: "info", eq: null };
  const root = new THREE.Group(); scene.add(root);
  const groups = { site: new THREE.Group(), floors: new THREE.Group(), walls: new THREE.Group(), openings: new THREE.Group(), columns: new THREE.Group(), fixtures: new THREE.Group(), gym: new THREE.Group(), finishes: new THREE.Group(), signage: new THREE.Group(), roof: new THREE.Group(), outlines: new THREE.Group(), env: new THREE.Group() };
  Object.values(groups).forEach((g) => root.add(g));
  const estMats = [];        // materials of estimated elements (tinted on demand)
  const roomFloors = new Map();
  const zoneOutlines = new Map();
  const mesh = (geo, mat, { cast = true, receive = true, order = 0 } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast && renderer.shadowMap.enabled; m.receiveShadow = receive && renderer.shadowMap.enabled;
    if (order) m.renderOrder = order;
    return m;
  };
  const estimatedMat = (m) => { const c = m.clone(); c.userData.baseColor = (m.color || new THREE.Color(1, 1, 1)).clone(); c.userData.baseEmissive = c.emissiveIntensity || 0; estMats.push(c); return c; };

  buildSite();
  buildFloors();
  buildWalls();
  buildOpenings();
  buildColumns();
  buildFixtures();
  buildRoof();
  groups.roof.visible = false;
  buildGym();
  buildContactShade();
  buildSignage();
  // site (sheet 02): environment + comparison overlay share one adjustable frame
  const site = new THREE.Group(); site.name = "SITE_FRAME"; groups.env.add(site);
  site.add(buildEnvironment({ K, MAT, TEX, renderer, data: SITE, mesh, lowPower }));
  const overlay = buildOverlay();
  overlay.visible = false; site.add(overlay);
  const adj = { ...(SITE.registration.adjust || { dx: 0, dy: 0, rot: 0 }) };
  function applyAdjust() {
    // rotate about the building centre, then translate (metres / degrees)
    const pivot = new THREE.Vector3(10.2, 0, 9.05);
    site.position.set(0, 0, 0); site.rotation.set(0, 0, 0);
    site.rotateY(-THREE.MathUtils.degToRad(adj.rot));
    const p = pivot.clone().sub(pivot.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.MathUtils.degToRad(adj.rot)));
    site.position.set(p.x + adj.dx, 0, p.z + adj.dy);
    const out = document.getElementById("adj-out"); if (out) out.textContent = `dx ${adj.dx.toFixed(2)} m · dy ${adj.dy.toFixed(2)} m · giro ${adj.rot.toFixed(2)}°`;
    dirty = true;
  }
  document.getElementById("btn-cut").setAttribute("aria-pressed", "true");

  // ---------- labels ----------
  const pins = new Map();
  rooms.forEach((r) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "pin";
    el.innerHTML = `<span class="pin-n">${r.n}</span><span class="pin-name"></span>`;
    el.querySelector(".pin-name").textContent = r.name;
    el.addEventListener("click", () => select(r.id));
    el.addEventListener("pointerenter", () => setHover(r.id));
    el.addEventListener("pointerleave", () => setHover(null));
    ui.labels.appendChild(el);
    const c = r.label || centroid(r.poly);
    pins.set(r.id, { el, pos: new THREE.Vector3(c[0], r.id === "sala" ? 3.2 : 2.4, c[1]) });
  });

  // ---------- selection / highlight ----------
  function applyHighlight() {
    rooms.forEach((r) => {
      const f = roomFloors.get(r.id);
      const sel = state.selected === r.id, hov = state.hovered === r.id && !sel;
      if (f) { f.material.emissive.setHex(HIGHLIGHT); f.material.emissiveIntensity = sel ? 0.1 : hov ? 0.06 : 0; f.userData.outline.visible = sel || hov; }
      const p = pins.get(r.id);
      p.el.classList.toggle("is-selected", sel); p.el.classList.toggle("is-hover", hov);
      p.el.classList.toggle("is-dim", !!state.selected && !sel);
    });
    zoneOutlines.forEach((o, id) => { o.visible = state.zone === id; });
    renderer.domElement.style.cursor = state.hovered ? "pointer" : "grab";
    dirty = true;
  }
  function setHover(id) { if (state.hovered !== id) { state.hovered = id; applyHighlight(); } }
  function select(id, { fly = true } = {}) {
    state.selected = id;
    state.zone = null;
    applyHighlight();
    renderPanel();
    if (id && document.body.classList.contains("panel-closed")) document.getElementById("btn-panel").click();
    if (id) ui.panel.parentElement.scrollTop = 0;   // a newly selected room's details start at its title
    if (!id) return;   // closing a room's details keeps the current camera
    if (!fly) return;
    const r = rooms.find((q) => q.id === id);
    const b = r.poly.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]);
    const c = new THREE.Vector3((b[0] + b[2]) / 2, 0.8, (b[1] + b[3]) / 2);
    const size = Math.max(b[2] - b[0], b[3] - b[1]);
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    sph.phi = THREE.MathUtils.clamp(sph.phi, 0.22, 0.58);   // look down into the room over its walls
    sph.radius = size * (camera.aspect < 1 ? 2.2 : 1.5) + 4;
    flyTo(c.clone().add(new THREE.Vector3().setFromSpherical(sph)), c);
  }
  // functional areas of the gym (concept): fly to the area and list its equipment
  function selectZone(zid) {
    const z = GYM.zones.find((q) => q.id === zid);
    if (!z) return;
    state.selected = "sala"; state.zone = zid;
    applyHighlight(); renderPanel();
    const b = z.poly.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]);
    const c = new THREE.Vector3((b[0] + b[2]) / 2, 0.7, (b[1] + b[3]) / 2);
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    sph.phi = THREE.MathUtils.clamp(sph.phi, 0.3, 0.75);
    sph.radius = Math.max(b[2] - b[0], b[3] - b[1]) * (camera.aspect < 1 ? 1.9 : 1.25) + 3.5;
    flyTo(c.clone().add(new THREE.Vector3().setFromSpherical(sph)), c);
  }
  // view presets: GENERAL (presentation), EDIFICIO (building), COMPLEJO (whole club)
  const VIEWS = {
    general:  { box: [-12, -25, 40, 28], az: 0.62, el: 0.72, y: 3 },
    edificio: { box: [bounds[0] - 0.4, bounds[1] - 0.5, bounds[2] + 0.9, bounds[3] + 0.6], az: 0.72, el: 0.86, y: 4.3, xLim: 0.95 },
    complejo: { box: [ISLAND.x0, ISLAND.z0, ISLAND.x1, ISLAND.z1], az: 0.62, el: 0.56, y: 8, yLow: -ISLAND.depth - 0.7, xLim: 0.82 },
  };
  function viewPose(name) {
    const V = VIEWS[name];
    const [x0, z0, x1, z1] = V.box;
    const target = new THREE.Vector3((x0 + x1) / 2, 0.6, (z0 + z1) / 2);
    const pts = [];
    [x0, x1].forEach((x) => [z0, z1].forEach((z) => [V.yLow || 0, V.y].forEach((y) => pts.push(new THREE.Vector3(x, y, z)))));
    const portrait = camera.aspect < 0.9;
    const dir = dirFrom(portrait ? V.az + 0.4 : V.az, V.el);
    const probe = camera.clone(); probe.clearViewOffset(); probe.aspect = camera.userData.fitAspect || camera.aspect; probe.updateProjectionMatrix();
    const d = K.fitDistance(probe, target, dir, pts, V.xLim || 0.97, 0.9);
    return { pos: target.clone().addScaledVector(dir, d), target, d };
  }
  function setView(name) {
    state.view = name; state.selected = null; state.zone = null;
    // building view: trees stay out of the way of the interiors
    thinPlanting(name === "edificio");
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === name)));
    const v = viewPose(name);
    controls.maxDistance = Math.max(controls.maxDistance || 0, v.d * 1.5);
    applyHighlight(); renderPanel();
    flyTo(v.pos, v.target);
  }
  // close-up: plants right around the building would hide the interiors; the rest of the planting stays
  const plantKeep = new Map();
  function thinPlanting(on) {
    const [x0, z0, x1, z1] = [bounds[0] - 5, bounds[1] - 5, bounds[2] + 7, bounds[3] + 6];
    const m4 = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    groups.env.traverse((o) => {
      if (!o.isInstancedMesh || !o.userData.vegetation || !o.userData.places) return;
      if (!plantKeep.has(o)) plantKeep.set(o, o.userData.places.map((_, i) => { o.getMatrixAt(i, m4); return m4.clone(); }));
      const orig = plantKeep.get(o);
      o.userData.places.forEach((p, i) => {
        const near = p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1;
        o.setMatrixAt(i, on && near ? zero : orig[i]);
      });
      o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere();
    });
    dirty = true;
  }
  let tween = null, dirty = true;
  function flyTo(pos, target) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { camera.position.copy(pos); controls.target.copy(target); controls.update(); dirty = true; return; }
    const far = camera.position.distanceTo(pos);
    tween = { from: camera.position.clone(), fromT: controls.target.clone(), to: pos, toT: target, t0: performance.now(), dur: far > 30 ? 1800 : 1100, lift: Math.min(12, far * 0.12) };
  }
  controls.addEventListener("start", () => { tween = null; });
  controls.addEventListener("change", () => {
    const t = controls.target;
    t.x = THREE.MathUtils.clamp(t.x, -20, 66); t.z = THREE.MathUtils.clamp(t.z, -40, 45); t.y = THREE.MathUtils.clamp(t.y, 0, 2);
    dirty = true;
  });

  // picking: the ray meets a horizontal plane at 0,9 m -> room under that point
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9), hit = new THREE.Vector3();
  function pick(cx, cy) {
    const rc = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    const r = roomAt(hit.x, hit.z);
    if (r && r.id === "sala" && state.selected === "sala") {
      const z = GYM.zones.find((q) => inPoly(hit.x, hit.z, q.poly));
      if (z) return "zone:" + z.id;
    }
    return r ? r.id : null;
  }
  let down = null;
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 6) return;
    // "Presupuesto y energía": a click picks the equipment item first
    if (state.tab === "budget") { const eq = pickEquipment(e.clientX, e.clientY); if (eq) { selectEquipment(eq, { fly: false }); return; } }
    const id = pick(e.clientX, e.clientY);
    if (id && id.startsWith("zone:")) selectZone(id.slice(5));
    else if (id) select(id);
  });
  let raf = 0, lastMove = null;
  cv.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || down) return;
    lastMove = e; if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (state.tab === "budget" && pickEquipment(lastMove.clientX, lastMove.clientY)) { setHover(null); renderer.domElement.style.cursor = "pointer"; return; }
      const id = pick(lastMove.clientX, lastMove.clientY); setHover(id && id.startsWith("zone:") ? "sala" : id);
    });
  });
  cv.addEventListener("pointerleave", () => setHover(null));

  // ---------- toolbar ----------
  const bind = (id, fn) => document.getElementById(id).addEventListener("click", fn);
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  bind("btn-overlay", (e) => { overlay.visible = !overlay.visible; e.currentTarget.setAttribute("aria-pressed", overlay.visible); if (overlay.visible && !state.env) document.getElementById("btn-env").click(); dirty = true; });
  bind("btn-adjust", (e) => { const box = document.getElementById("adjust"); box.hidden = !box.hidden; e.currentTarget.setAttribute("aria-pressed", !box.hidden); });
  [["adj-dx", "dx"], ["adj-dy", "dy"], ["adj-rot", "rot"]].forEach(([id, k]) => { const el = document.getElementById(id); el.value = adj[k]; el.addEventListener("input", () => { adj[k] = parseFloat(el.value); applyAdjust(); }); });
  document.getElementById("adj-reset").addEventListener("click", () => { Object.assign(adj, SITE.registration.adjust || { dx: 0, dy: 0, rot: 0 }); ["dx", "dy", "rot"].forEach((k) => { document.getElementById("adj-" + k).value = adj[k]; }); applyAdjust(); });
  applyAdjust();
  bind("btn-env", (e) => { state.env = !state.env; groups.env.visible = state.env; e.currentTarget.setAttribute("aria-pressed", state.env); dirty = true; });
  bind("btn-panel", () => {
    const closed = document.body.classList.toggle("panel-closed");
    document.getElementById("btn-panel").setAttribute("aria-expanded", String(!closed));
    applyPanelOffset(ui.viewport.clientWidth, ui.viewport.clientHeight); dirty = true;
  });
  // "Cerrar detalles": hides every piece of room information, clears the selection, keeps the camera
  function closeDetails() {
    state.selected = null; state.zone = null;
    if (state.eq) { state.eq = null; showEquipment(null); }
    applyHighlight(); renderPanel();
    document.body.classList.remove("sheet-expanded");
    document.getElementById("btn-sheet").setAttribute("aria-expanded", "false");
    if (!document.body.classList.contains("panel-closed")) document.getElementById("btn-panel").click();
    dirty = true;
  }
  bind("btn-close-details", closeDetails);
  // phones: the details sheet opens compact and can be expanded
  bind("btn-sheet", (e) => {
    const on = document.body.classList.toggle("sheet-expanded");
    e.currentTarget.setAttribute("aria-expanded", String(on));
    e.currentTarget.setAttribute("aria-label", on ? "Reducir detalles" : "Ampliar detalles");
    e.currentTarget.title = e.currentTarget.getAttribute("aria-label");
  });
  bind("btn-roof", (e) => { state.roof = !state.roof; groups.roof.visible = state.roof; e.currentTarget.setAttribute("aria-pressed", state.roof); dirty = true; });
  bind("btn-cut", (e) => { state.cut = !state.cut; e.currentTarget.setAttribute("aria-pressed", state.cut); rebuildWalls(); rebuildGymWalls(); dirty = true; });
  bind("btn-est", (e) => {
    state.estimates = !state.estimates; e.currentTarget.setAttribute("aria-pressed", state.estimates);
    estMats.forEach((m) => { if (!m.emissive) return; m.emissive.setHex(ESTIMATE); m.emissiveIntensity = state.estimates ? 0.55 : (m.userData.baseEmissive || 0); });
    dirty = true;
  });

  // ---------- size ----------
  const corners = [];
  [bounds[0] - 0.3, bounds[2] + 0.8].forEach((x) => [bounds[1] - 0.4, bounds[3] + 0.5].forEach((z) => [0, 4.3].forEach((y) => corners.push(new THREE.Vector3(x, y, z)))));
  let sized = false;
  function resize() {
    const { clientWidth: w, clientHeight: h } = ui.viewport;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.fov = w / h < 1 ? 42 : 32;
    applyPanelOffset(w, h);
    HOME_AZ = w / h < 0.9 ? 1.05 : 0.72;
    homeDist = K.fitDistance(camera, homeTarget, dirFrom(HOME_AZ, HOME_EL), corners, 0.96, 0.9);
    controls.maxDistance = Math.max(viewPose("complejo").d * 1.3, homeDist * 1.6);
    if (!sized || (!state.selected && !tween)) { const v = viewPose(state.view); camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); }
    sized = true; dirty = true;
  }
  // the info panel floats over the right of the viewport on wide screens:
  // shift the projection centre into the free area (fit uses the free width)
  function applyPanelOffset(w, h) {
    const open = !document.body.classList.contains("panel-closed");
    const p = open && w > 900 ? 354 : 0;
    camera.aspect = (w - p) / h;
    if (p) camera.setViewOffset(w + p, h, p, 0, w, h); else camera.clearViewOffset();
    camera.aspect = (w + p) / h;
    camera.updateProjectionMatrix();
    camera.userData.fitAspect = (w - p) / h;
  }
  const host = { vh: 0, full: false };
  let flowOn = null;
  const FLOW = window.matchMedia("(max-width: 900px)");
  function applyFlow() {
    const on = EMBED && FLOW.matches && !host.full;
    if (on !== flowOn) {
      flowOn = on;
      document.documentElement.classList.toggle("embed-flow", on);
      if (!on) notifyHost("height", { flow: false });
    }
    if (on) {
      // viewer height inside the page: tall enough to explore, leaving room for the page around it
      const h = Math.round(Math.max(320, Math.min(window.innerWidth * 1.25, (host.vh || 800) * 0.72, 640)));
      document.documentElement.style.setProperty("--flow-h", h + "px");
      reportHeight();
    }
  }
  function reportHeight() { if (flowOn) notifyHost("height", { flow: true, h: Math.ceil(document.body.getBoundingClientRect().height) }); }
  if (EMBED) {
    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.type !== "centro-deportivo:host") return;
      host.vh = +e.data.vh || host.vh; host.full = !!e.data.full;
      applyFlow();
    });
    FLOW.addEventListener("change", applyFlow);
    new ResizeObserver(reportHeight).observe(document.body);
    applyFlow();
  }
  thinPlanting(state.view === "edificio");
  new ResizeObserver(resize).observe(ui.viewport);
  resize();

  // ---------- loop ----------
  const v = new THREE.Vector3();
  function placePins() {
    const w = ui.viewport.clientWidth, h = ui.viewport.clientHeight;
    pins.forEach(({ el, pos }) => {
      v.copy(pos); if (state.roof) v.y = 4.8;
      v.project(camera);
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      el.style.visibility = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 ? "visible" : "hidden";
    });
  }
  // the host page pauses rendering while the viewer is off screen (state is kept)
  let active = true, readySent = false;
  if (EMBED) window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== "centro-deportivo:active") return;
    active = !!e.data.on; if (active) dirty = true;
  });
  function frame(now) {
    requestAnimationFrame(frame);
    if (!active) return;
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.from, tween.to, e); controls.target.lerpVectors(tween.fromT, tween.toT, e);
      camera.position.y += Math.sin(Math.PI * e) * (tween.lift || 0);
      if (k >= 1) tween = null; dirty = true;
    }
    if (controls.update()) dirty = true;
    if (!dirty) return;
    dirty = false;
    // clip planes follow the orbit distance (the whole island must fit on narrow phones)
    const dist = camera.position.distanceTo(controls.target);
    const far = dist + 180, near = Math.max(0.15, dist / 600);
    if (Math.abs(camera.far - far) > 5 || camera.near !== near) { camera.far = far; camera.near = near; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
    placePins();
    if (!readySent) { readySent = true; notifyHost("ready"); }
  }
  requestAnimationFrame(frame);
  ui.loading.hidden = true;
  applyHighlight();
  renderPanel();

  // =====================================================================
  // builders
  // =====================================================================
  function buildSite() {
    const g = groups.site;
    g.add(buildIsland());
    // building slab (+0,15 over the ground, memoria)
    const slab = [];
    rooms.forEach((r) => { const s = shapeGeo(r.poly, 0.15); s.translate(0, -0.15, 0); slab.push(s); });
    EX.walls.concat(MODEL.manualWalls.map((w) => w.poly)).forEach((p) => { const s = shapeGeo(p.poly || p, 0.15); s.translate(0, -0.15, 0); slab.push(s); });
    g.add(mesh(K.mergeGeometries(slab), M.slab, { cast: false }));
  }

  // floating island: rounded slab, chamfered top edge, layered stone sides, dark underside
  function buildIsland() {
    const { x0, z0, x1, z1, r, depth } = ISLAND;
    const sh = new THREE.Shape();
    const P = (x, z) => [x, -z];
    sh.moveTo(...P(x0 + r, z0)); sh.lineTo(...P(x1 - r, z0)); sh.quadraticCurveTo(...P(x1, z0), ...P(x1, z0 + r));
    sh.lineTo(...P(x1, z1 - r)); sh.quadraticCurveTo(...P(x1, z1), ...P(x1 - r, z1));
    sh.lineTo(...P(x0 + r, z1)); sh.quadraticCurveTo(...P(x0, z1), ...P(x0, z1 - r));
    sh.lineTo(...P(x0, z0 + r)); sh.quadraticCurveTo(...P(x0, z0), ...P(x0 + r, z0));
    const bevel = 0.35;
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2);                       // extrusion -> +y
    geo.translate(0, -0.15 - depth - bevel, 0);       // top cap at the ground level (-0,15)
    // side UVs in metres so the strata keep their scale
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const y = pos.getY(i);
      if (y < -0.2 && y > -0.15 - depth - 2 * bevel + 0.01) uv.setXY(i, (pos.getX(i) + pos.getZ(i)) / 9, (y + 0.15 + depth + 2 * bevel) / (depth + 2 * bevel));
    }
    const top = surf("concreteLight", 0xcabd9f, 0.95, [0.08, 0.08]);
    const side = new THREE.MeshStandardMaterial({ map: strataTexture(renderer), color: 0xd6d0c8, roughness: 0.95 });
    side.envMapIntensity = 0.5;
    const m = new THREE.Mesh(geo, [top, side]);
    m.receiveShadow = renderer.shadowMap.enabled;
    const grp = new THREE.Group(); grp.add(m);
    // dark recessed underside lip (reads as a floating slab)
    const under = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0c1220 }));
    under.position.y = -0.15 - depth - 2 * bevel - 0.02; under.rotation.x = Math.PI; under.position.z = 0;
    under.scale.z = -1;
    grp.add(under);
    return grp;
  }

  function buildFloors() {
    const finish = (id) => {
      if (id === "sala") return surf("rubber", 0xb8b8b8, 0.85, [0.5, 0.5]);                      // concept: caucho deportivo (project: hormigón + resina)
      if (["vestM", "vestF", "sauna"].includes(id)) return surf("vinyl", 0xa9bcc6, 0.45, [0.5, 0.5]); // PVC (V)
      return surf("tile", 0xd6c5ad, 0.4, [0.42, 0.42]);                                         // gres antideslizante (V)
    };
    rooms.forEach((r) => {
      // shape in (x, -y), rotated to lie on the floor facing up; UVs are in metres
      const geo = new THREE.ShapeGeometry(new THREE.Shape(r.poly.map(([x, y]) => new THREE.Vector2(x, -y))));
      geo.rotateX(-Math.PI / 2); // (x, -y, 0) -> (x, 0, y)
      const m = finish(r.id);
      const f = mesh(geo, m, { cast: false });
      f.position.y = 0.004;
      groups.floors.add(f);
      // outline on the floor
      const pts = r.poly.concat([r.poly[0]]);
      const ob = [];
      for (let i = 0; i < pts.length - 1; i++) ob.push(K.segment(pts[i], pts[i + 1], 0.012, 0.06, 0.012));
      const om = new THREE.MeshStandardMaterial({ color: 0, emissive: HIGHLIGHT, emissiveIntensity: 2.2 });
      const outline = new THREE.Mesh(K.mergeGeometries(ob), om);
      outline.visible = false;
      groups.outlines.add(outline);
      f.userData.outline = outline;
      roomFloors.set(r.id, f);
    });
  }

  // wall height rule (plan-model.json heights.rule)
  function wallInfo(poly) {
    const b = poly.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9]);
    const horiz = b[2] - b[0] >= b[3] - b[1];
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, o = 0.3;
    const sideA = horiz ? [cx, b[1] - o] : [b[0] - o, cy], sideB = horiz ? [cx, b[3] + o] : [b[2] + o, cy];
    const inA = inside(...sideA), inB = inside(...sideB);
    const exterior = !inA || !inB;
    const touchesSala = isSala(...sideA) || isSala(...sideB);
    let hgt = exterior ? (touchesSala ? 4.2 : 3.6) : (touchesSala ? 3.6 : 2.6);
    // walls on the outer line of the hall (north / east / west) with the hall inside
    return { b, horiz, exterior, hgt, outward: exterior ? (!inA ? -1 : 1) : 0 };
  }

  function buildWalls() { rebuildWalls(); }
  function rebuildWalls() {
    groups.walls.clear();
    const cutH = state.cut ? 1.3 : Infinity;
    const plaster = [], tops = [], panels = [], plinths = [];
    const all = EX.walls.map((p) => ({ poly: p, est: false })).concat(MODEL.manualWalls.filter((w) => !w.glass).map((w) => ({ poly: w.poly, est: /estimated/.test(w.status) })));
    all.forEach(({ poly }) => {
      const info = wallInfo(poly);
      const h = Math.min(info.hgt, cutH);
      plaster.push(prism(poly, 0, h));
      tops.push(prism(poly, h, h + 0.02));
      // exterior skin: ceramic plinth 0,60 + sandwich panel above (memoria)
      if (info.exterior && poly.length <= 5) {
        const { b, horiz, outward } = info;
        const t = 0.035;
        const face = horiz ? (outward < 0 ? b[1] - t / 2 : b[3] + t / 2) : (outward < 0 ? b[0] - t / 2 : b[2] + t / 2);
        const len = horiz ? b[2] - b[0] : b[3] - b[1];
        const mid = horiz ? (b[0] + b[2]) / 2 : (b[1] + b[3]) / 2;
        const box = (y0, y1) => { const g = new THREE.BoxGeometry(horiz ? len + 0.07 : t, y1 - y0, horiz ? t : len + 0.07); g.translate(horiz ? mid : face, (y0 + y1) / 2, horiz ? face : mid); return g; };
        plinths.push(box(-0.15, Math.min(0.6, h)));
        if (h > 0.6) panels.push(box(0.6, h + 0.02));
      }
    });
    groups.walls.add(mesh(K.mergeGeometries(plaster), M.plaster));
    groups.walls.add(mesh(K.mergeGeometries(tops), M.wallTop, { cast: false }));
    if (panels.length) groups.walls.add(mesh(K.mergeGeometries(panels), M.panel));
    if (plinths.length) groups.walls.add(mesh(K.mergeGeometries(plinths), M.plinth));
    // glazed vestíbulo front (estimated)
    MODEL.manualWalls.filter((w) => w.glass).forEach((w) => {
      const g = prism(w.poly, 0.05, Math.min(2.75, cutH));
      const m = mesh(g, estimatedMat(M.glass), { cast: false, receive: false, order: 3 });
      groups.walls.add(m);
    });
    rebuildOpenings();
  }

  // ---------- openings: sills, lintels, frames, glass, door leaves ----------
  function buildOpenings() { /* built by rebuildWalls */ }
  function rebuildOpenings() {
    groups.openings.clear();
    const cutH = state.cut ? 1.3 : Infinity;
    const solid = { plaster: [], panel: [] }, frames = [], glass = [], doorsW = [], doorsS = [];
    const est = { frames: [], glass: [], doorsW: [], doorsS: [] };
    MODEL.openings.forEach((o) => {
      const [a, b] = o.ab;
      const horiz = Math.abs(b[1] - a[1]) < 0.01;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const probe = horiz ? [[mid[0], mid[1] - 0.3], [mid[0], mid[1] + 0.3]] : [[mid[0] - 0.3, mid[1]], [mid[0] + 0.3, mid[1]]];
      const inA = inside(...probe[0]), inB = inside(...probe[1]);
      const exterior = !inA || !inB;
      const sala = isSala(...probe[0]) || isSala(...probe[1]);
      const top = Math.min(exterior ? (sala ? 4.2 : 3.6) : (sala ? 3.6 : 2.6), cutH);
      const thick = exterior ? 0.19 : 0.15;
      const isEst = /estimated/.test(o.status);
      const box = (y0, y1, t = thick, l = len) => { const g = new THREE.BoxGeometry(horiz ? l : t, y1 - y0, horiz ? t : l); g.translate(mid[0], (y0 + y1) / 2, mid[1]); return g; };
      const bucket = exterior ? solid.panel : solid.plaster;
      if (o.kind === "window") {
        const sill = o.sill ?? 0.9, head = Math.min(o.head ?? 2.2, top);
        if (sill > 0) bucket.push(box(0, Math.min(sill, top)));
        if (top > head) bucket.push(box(head, top));
        if (head > sill && sill < top) {
          (isEst ? est.glass : glass).push(box(sill, head, 0.016));
          const fr = isEst ? est.frames : frames;
          fr.push(box(sill, sill + 0.05, 0.07), box(head - 0.05, head, 0.07));
          // mullions every ~1,7 m (the north glazing follows the steel frames)
          const n = Math.max(1, Math.round(len / (o.id === "N-glazing" ? 1.72 : 1.75)));
          for (let i = 0; i <= n; i++) {
            const t = -len / 2 + (len * i) / n;
            const g = new THREE.BoxGeometry(horiz ? 0.06 : 0.07, head - sill, horiz ? 0.07 : 0.06);
            g.translate(mid[0] + (horiz ? t : 0), (sill + head) / 2, mid[1] + (horiz ? 0 : t));
            fr.push(g);
          }
        }
      } else {
        const head = Math.min(o.head ?? 2.05, top);
        if (top > head) bucket.push(box(head, top));
        if (head < top || !state.cut) {
          // door leaf, opened 30° inwards (hinge side not drawn for every door: illustrative)
          const leaves = len > 1.25 ? 2 : 1;
          const lw = len / leaves - 0.02;
          for (let i = 0; i < leaves; i++) {
            const leaf = new THREE.BoxGeometry(lw, Math.min(head, cutH) - 0.02, 0.045);
            leaf.translate(lw / 2, Math.min(head, cutH) / 2, 0);
            const s = leaves === 2 ? (i === 0 ? 1 : -1) : 1;
            leaf.rotateY((horiz ? 0 : Math.PI / 2) + s * 0.5);
            const hx = horiz ? (i === 0 ? a[0] : b[0]) : mid[0];
            const hz = horiz ? mid[1] : (i === 0 ? a[1] : b[1]);
            if (i === 1) leaf.rotateY(Math.PI);
            leaf.translate(hx, 0, hz);
            ((exterior ? (isEst ? est.doorsS : doorsS) : (isEst ? est.doorsW : doorsW))).push(leaf);
          }
          (isEst ? est.frames : frames).push(box(head, head + 0.05, thick + 0.02));
        }
      }
    });
    const add = (list, mat, opts) => { if (list.length) groups.openings.add(mesh(K.mergeGeometries(list), mat, opts)); };
    add(solid.plaster, M.plaster); add(solid.panel, M.panel);
    add(frames, M.alu); add(glass, M.glass, { cast: false, receive: false, order: 3 });
    add(doorsW, M.doorWhite); add(doorsS, M.doorSteel);
    add(est.frames, estimatedMat(M.alu)); add(est.glass, estimatedMat(M.glass), { cast: false, receive: false, order: 3 });
    add(est.doorsW, estimatedMat(M.doorWhite)); add(est.doorsS, estimatedMat(M.doorSteel));
    if (state.estimates) estMats.forEach((m) => { if (m.emissive) { m.emissive.setHex(ESTIMATE); m.emissiveIntensity = 0.55; } });
  }

  function buildColumns() {
    // steel portal columns from the drawing (symbols); deduplicated to one per position
    const seen = [];
    EX.columns.forEach(({ c }) => { if (!seen.some((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < 0.3)) seen.push(c); });
    const kit = K.createModelKit();
    const items = seen.map(([x, y]) => {
      const h = y < 9 ? 4.0 : 2.9;
      const key = `col${h}`;
      if (!kit.has(key)) kit.define(key, (hh) => buildFixture(hh, { k: "steel_column", h }));
      return { k: key, p: [x, y], r: 0 };
    });
    K.bakeItems(items, (k) => kit.get(k)).forEach((g, key) => groups.columns.add(mesh(g, MAT.shared(key))));
  }

  function buildFixtures() {
    const kit = K.createModelKit();
    const keyOf = (it) => `${it.k}|${JSON.stringify(it.size || [])}|${it.front || ""}|${JSON.stringify(it.basins || [])}|${it.n || ""}`;
    const sets = { verified: [], estimated: [] };
    FURN.items.forEach((it) => {
      const key = keyOf(it);
      if (!kit.has(key)) kit.define(key, (h) => buildFixture(h, it));
      sets[it.status === "verified" ? "verified" : "estimated"].push({ k: key, p: it.p, r: it.r || 0 });
    });
    const NO_SHADOW = new Set(["glass", "glassBronze", "water", "warmLight", "mirror", "screen", "curtainShower"]);
    Object.entries(sets).forEach(([status, items]) => {
      K.bakeItems(items, (k) => kit.get(k)).forEach((g, key) => {
        const mat = status === "estimated" ? estimatedMat(MAT.shared(key)) : MAT.shared(key);
        const m = mesh(g, mat, { cast: !NO_SHADOW.has(key), receive: key !== "warmLight", order: key.startsWith("glass") || key === "water" ? 3 : 0 });
        groups.fixtures.add(m);
      });
    });
  }

  function buildRoof() {
    const g = groups.roof;
    // hall: mono-pitch sandwich-panel roof, high side north (drainage to the south, plano 05)
    const hall = new THREE.BoxGeometry(17.25 + 0.6, 0.1, 8.51 + 0.5);
    hall.rotateX(-0.035);
    hall.translate(8.62, 4.05, 4.1);
    g.add(mesh(hall, M.roofPanel));
    // middle strip: inverted gravel roof at +2,90 with parapet, 4 circular skylights
    const mid = new THREE.BoxGeometry(17.29, 0.3, 4.25); mid.translate(8.65, 2.75, 10.5);
    g.add(mesh(mid, M.gravel));
    const sky = [];
    FURN.skylights.at.forEach(([x, y]) => { const s = new THREE.SphereGeometry(FURN.skylights.r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); s.scale(1, 0.55, 1); s.translate(x, 2.9, y); sky.push(s); });
    const opal = MAT.makeMat("ceramic"); opal.emissive = new THREE.Color(0xfff6e6); opal.emissiveIntensity = 0.25;
    g.add(mesh(K.mergeGeometries(sky), opal));
    // south wing: walkable flat roof at +2,90 with solar collectors (positions estimated)
    const south = new THREE.BoxGeometry(17.29 - 3.42, 0.3, 5.42); south.translate((3.42 + 17.29) / 2, 2.75, 15.17);
    g.add(mesh(south, M.slab));
    const sol = [];
    for (let i = 0; i < 4; i++) { const p = new THREE.BoxGeometry(1.05, 0.05, 2.05); p.rotateX(-0.6); p.translate(8.6 + i * 1.2, 3.35, 15.2); sol.push(p); }
    g.add(mesh(K.mergeGeometries(sol), estimatedMat(MAT.shared("dark"))));
    // entrance canopy (dashed outline on plano 04): concrete slab
    const can = new THREE.BoxGeometry(20.98 - 17.21, 0.25, 18.4 - 10.77); can.translate((17.21 + 20.98) / 2, 3.05, (10.77 + 18.4) / 2);
    g.add(mesh(can, estimatedMat(M.slab)));
  }

  // =====================================================================
  // concept: gym fit-out of the Sala multiusos
  // =====================================================================
  function buildGym() {
    const club = createClubEquipment(THREE, { RoundedBoxGeometry: K.RoundedBoxGeometry, mergeGeometries: K.mergeGeometries });
    const kit = K.createModelKit();
    const get = (k) => (club.has(k) ? club.get(k) : kit.get(k));
    const NO_SHADOW = new Set(["glass", "led", "ledWarm", "ledBlue", "screen", "screenBright", "mirror", "track"]);
    // wall mirrors are built with the walls (they follow the cut-away height)
    K.bakeItems(GYM.items.filter((it) => it.k !== "mirror_panel"), get).forEach((g, key) => {
      groups.gym.add(mesh(g, MAT.shared(key), { cast: !NO_SHADOW.has(key), receive: !key.startsWith("led"), order: key === "glass" ? 3 : 0 }));
    });
    // interior items (lockers…) built with the prototype library
    const items = (GYM.interiorItems || []).map((it) => {
      const key = `${it.k}|${JSON.stringify(it.size || [])}`;
      if (!kit.has(key)) kit.define(key, (h) => buildFixture(h, it));
      return { k: key, p: it.p, r: it.r };
    });
    K.bakeItems(items, (k) => kit.get(k)).forEach((g, key) => groups.gym.add(mesh(g, MAT.shared(key))));
    // high-density rubber in the free-weights area
    const fw = GYM.zones.find((z) => z.id === "pesolibre");
    if (fw) {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(fw.poly.map(([x, y]) => new THREE.Vector2(x, -y))));
      geo.rotateX(-Math.PI / 2);
      const f = mesh(geo, surf("rubberThick", 0xffffff, 0.9, [0.5, 0.5]), { cast: false });
      f.position.y = 0.007; groups.gym.add(f);
    }
    // zone outlines (shown when an area is selected)
    GYM.zones.forEach((z) => {
      const pts = z.poly.concat([z.poly[0]]); const ob = [];
      for (let i = 0; i < pts.length - 1; i++) ob.push(K.segment(pts[i], pts[i + 1], 0.012, 0.05, 0.015));
      const o = new THREE.Mesh(K.mergeGeometries(ob), new THREE.MeshStandardMaterial({ color: 0, emissive: 0x6f5bb5, emissiveIntensity: 2.4 }));
      o.visible = false; groups.outlines.add(o); zoneOutlines.set(z.id, o);
    });
    rebuildGymWalls();
  }
  // wall-mounted gym elements depend on the wall height (cut-away mode)
  function rebuildGymWalls() {
    if (!groups.gymWalls) { groups.gymWalls = new THREE.Group(); root.add(groups.gymWalls); }
    groups.gymWalls.clear();
    const kit = K.createModelKit();
    const items = [];
    if (!state.cut) {
      (GYM.interior.acoustic || []).forEach((a, i) => { const key = "ac" + i; kit.define(key, (h) => buildFixture(h, { k: "acoustic_panel", w: a.w, y: 2.75 })); items.push({ k: key, p: a.p, r: 180 }); });
    }
    K.bakeItems(items, (k) => kit.get(k)).forEach((g, key) => groups.gymWalls.add(mesh(g, MAT.shared(key), { cast: false })));
    if (!state.cut) {
      const club = createClubEquipment(THREE, { RoundedBoxGeometry: K.RoundedBoxGeometry, mergeGeometries: K.mergeGeometries });
      K.bakeItems(GYM.items.filter((it) => it.k === "mirror_panel"), (k) => club.get(k)).forEach((g, key) => groups.gymWalls.add(mesh(g, MAT.shared(key), { cast: false })));
    }
    // suspended linear LED luminaires (hidden in cut-away mode, they would float)
    if (!state.cut) {
      const ln = ledLuminaires().map(([a, b]) => K.segment(a, b, 0.04, 0.07, GYM.interior.ledHeight));
      const hs = ledLuminaires().map(([a, b]) => K.segment(a, b, 0.05, 0.09, GYM.interior.ledHeight + 0.04));
      if (ln.length) { groups.gymWalls.add(mesh(K.mergeGeometries(ln), MAT.shared("led"), { cast: false, receive: false })); groups.gymWalls.add(mesh(K.mergeGeometries(hs), MAT.shared("dark"), { cast: false })); }
      // warm cove along the south wall of the hall
      groups.gymWalls.add(mesh(K.segment([0.3, 8.3], [12.6, 8.3], 0.03, 0.04, 3.45), MAT.shared("lightWarm"), { cast: false, receive: false }));
    }
    rebuildFinishes();
    // wall-mounted signs would float above cut-away walls
    groups.signage.children.forEach((o) => { if (o.userData.onWall) o.visible = !state.cut; });
  }

  // each suspended LED line = a group of individual luminaires, evenly spaced on the original line
  function ledLuminaires() {
    const G = GYM.interior.ledGroups || { luminairesPerLine: 1 };
    const out = [];
    (GYM.interior.ledLines || []).forEach(({ a, b }) => {
      const n = G.luminairesPerLine, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const lum = Math.min(G.luminaireLength || len / n, len / n), ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      for (let i = 0; i < n; i++) {
        const c = (i + 0.5) * (len / n);
        out.push([[a[0] + ux * (c - lum / 2), a[1] + uy * (c - lum / 2)], [a[0] + ux * (c + lum / 2), a[1] + uy * (c + lum / 2)]]);
      }
    });
    return out;
  }

  // wet-room tiling (lining on the inner wall faces, broken at doors and windows)
  function rebuildFinishes() {
    groups.finishes.clear();
    const WET = { aseoM: "tile", aseoF: "tile", vestM: "tile", vestF: "tile", sauna: "spa" };
    const hMax = state.cut ? 1.25 : 2.1;
    const lists = { tile: [], spa: [] };
    rooms.forEach((r) => {
      const kind = WET[r.id]; if (!kind) return;
      const P = r.poly;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.3) continue;
        const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
        let nx = -uy, ny = ux;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if (!inPoly(mx + nx * 0.2, my + ny * 0.2, P)) { nx = -nx; ny = -ny; }
        // intervals cut by openings on this edge
        const cuts = MODEL.openings.map((o) => {
          const [p0, p1] = o.ab;
          const d0 = Math.abs((p0[0] - a[0]) * ny - (p0[1] - a[1]) * nx), d1 = Math.abs((p1[0] - a[0]) * ny - (p1[1] - a[1]) * nx);
          if (d0 > 0.2 || d1 > 0.2) return null;
          const t0 = (p0[0] - a[0]) * ux + (p0[1] - a[1]) * uy, t1 = (p1[0] - a[0]) * ux + (p1[1] - a[1]) * uy;
          return [Math.min(t0, t1), Math.max(t0, t1), o.kind === "window" ? Math.min(o.sill ?? 0.9, hMax) : 0];
        }).filter(Boolean);
        const segs = [[0, len, hMax]];
        cuts.forEach(([c0, c1, hh]) => {
          for (let k = segs.length - 1; k >= 0; k--) {
            const [s0, s1, sh] = segs[k];
            if (c1 <= s0 || c0 >= s1) continue;
            segs.splice(k, 1, ...[[s0, c0, sh], [c0, c1, hh], [c1, s1, sh]].filter(([x0, x1, y]) => x1 - x0 > 0.02 && y > 0.05));
          }
        });
        segs.forEach(([t0, t1, hh]) => {
          const l = t1 - t0, cx = a[0] + ux * (t0 + l / 2) + nx * 0.012, cy = a[1] + uy * (t0 + l / 2) + ny * 0.012;
          const g = new THREE.PlaneGeometry(l, hh);
          const uv = g.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * l / 1.8, uv.getY(q) * hh / 1.8);
          g.rotateY(Math.atan2(nx, ny)); g.translate(cx, hh / 2 + 0.01, cy);
          lists[kind].push(g);
        });
      }
    });
    const tileMat = surf("tileWhite", 0xffffff, 0.25, [1, 1]); tileMat.envMapIntensity = 0.8;
    const spaMat = surf("tile", 0xd9c7ab, 0.3, [1, 1]);
    if (lists.tile.length) groups.finishes.add(mesh(K.mergeGeometries(lists.tile), tileMat, { cast: false }));
    if (lists.spa.length) groups.finishes.add(mesh(K.mergeGeometries(lists.spa), spaMat, { cast: false }));
  }

  // soft contact shading at the foot of every wall (cheap ambient occlusion)
  function buildContactShade() {
    const c = document.createElement("canvas"); c.width = 4; c.height = 64;
    const g2 = c.getContext("2d"); const gr = g2.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, "rgba(0,0,0,0.42)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 4, 64);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const strips = [];
    rooms.forEach((r) => {
      const P = r.poly;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.3) continue;
        const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
        let nx = -uy, ny = ux;
        if (!inPoly((a[0] + b[0]) / 2 + nx * 0.2, (a[1] + b[1]) / 2 + ny * 0.2, P)) { nx = -nx; ny = -ny; }
        const w = 0.32;
        const g = new THREE.PlaneGeometry(len, w);
        g.rotateX(-Math.PI / 2);                 // lies flat, local +y (texture top = dark) -> -z
        g.rotateY(Math.atan2(nx, ny) + Math.PI);
        g.translate((a[0] + b[0]) / 2 + nx * w / 2, 0.012, (a[1] + b[1]) / 2 + ny * w / 2);
        strips.push(g);
      }
    });
    const m = new THREE.Mesh(K.mergeGeometries(strips), mat); m.renderOrder = 1;
    groups.finishes.parent.add(m);
  }

  // comparison overlay: sheet 02 image laid on the ground with its registration
  function buildOverlay() {
    const c = SITE.overlay.corners;
    const geo = new THREE.BufferGeometry();
    const P = [c.tl, c.tr, c.br, c.bl].map(([x, z]) => [x, 0.06, z]);
    geo.setAttribute("position", new THREE.Float32BufferAttribute([...P[0], ...P[1], ...P[2], ...P[3]], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    geo.setIndex([0, 3, 1, 1, 3, 2]);
    const t = new THREE.TextureLoader().load(SITE.overlay.src, () => { dirty = true; });
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 4;
    return m;
  }

  // architectural signage: the club's name (memoria: logo on the east façade of the hall)
  function buildSignage() {
    const tex = (text, { w = 2048, h = 200, color = "#ffffff", bg = null, size = 120, spacing = 0.22 } = {}) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d");
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
      g.fillStyle = color; g.textBaseline = "middle";
      let fs = size; const measure = () => { g.font = `600 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`; let t = 0; for (const ch of text) t += g.measureText(ch).width + fs * spacing; return t - fs * spacing; };
      while (measure() > w * 0.92 && fs > 10) fs -= 2;
      let x = (w - measure()) / 2; for (const ch of text) { g.fillText(ch, x, h / 2); x += g.measureText(ch).width + fs * spacing; }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    const letters = (t, glow) => { const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.4, metalness: 0.2 }); if (glow) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = t; m.emissiveIntensity = glow; } return m; };
    const NAME = "CENTRO DEPORTIVO";
    // east façade of the hall, above the strip windows (façade text = concept placement)
    const east = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.66), letters(tex(NAME, { color: "#2c3a33" }), 0));
    east.rotation.y = Math.PI / 2; east.position.set(17.32, 3.45, 4.2); east.userData.onWall = true; groups.signage.add(east);
    // free-standing sign by the entrance (on the walkway side)
    const base = mesh(new K.RoundedBoxGeometry(3.4, 1.15, 0.32, 2, 0.03), MAT.shared("dark"));
    base.position.set(21.25, 0.45, 8.6); base.rotation.y = Math.PI / 2; groups.signage.add(base);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.42), letters(tex(NAME, { color: "#f2efe8" }), 0.25));
    front.rotation.y = Math.PI / 2; front.position.set(21.42, 0.62, 8.6); groups.signage.add(front);
    const line = mesh(new THREE.BoxGeometry(0.02, 0.03, 2.8), MAT.shared("lightWarm"), { cast: false }); line.position.set(21.42, 0.3, 8.6); groups.signage.add(line);
    // backlit name on the inner wall of the entrance (reception / control)
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.2), letters(tex(NAME, { color: "#2f7d73" }), 0.3));
    inner.position.set(18.2, 1.95, 11.19); inner.userData.onWall = true; groups.signage.add(inner);
    groups.signage.children.forEach((o) => { if (o.userData.onWall) o.visible = !state.cut; });
  }


  // =====================================================================
  // room media (plan-model.json: rooms[].media, attached by room id) and one shared viewer
  // =====================================================================
  const PLAY_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`;
  const PAUSE_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>`;
  const MUTED_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;
  const SOUND_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;
  const FULL_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;

  // section inside the room panel (information tab)
  function mediaSection(r) {
    if (!r.media || !r.media.items || !r.media.items.length) return "";
    const items = r.media.items;
    const vid = items.findIndex((m) => m.type === "video");
    const card = (m, i, big) => `<button type="button" class="m-card${big ? " m-card--video" : ""}" data-media="${i}" aria-label="${esc(m.label)} · ${esc(r.name)}">
        <img src="${esc(m.thumb || m.poster || m.src)}" alt="" loading="lazy" decoding="async" width="${big ? 640 : 480}" height="${big ? 360 : 300}">
        ${m.type === "video" ? `<span class="m-play" aria-hidden="true">${PLAY_SVG}</span>` : ""}
        <span class="m-cap">${esc(m.label)}${m.type === "video" && m.duration ? ` <em>${Math.round(m.duration)} s</em>` : ""}</span>
      </button>`;
    return `<section class="media" aria-labelledby="media-h">
        <h3 id="media-h">Visualización del espacio</h3>
        ${vid >= 0 ? card(items[vid], vid, true) : ""}
        <div class="m-grid">${items.map((m, i) => (i === vid ? "" : card(m, i, false))).join("")}</div>
        ${r.media.note ? `<p class="note small">${esc(r.media.note)}</p>` : ""}
      </section>`;
  }

  // one viewer for every room's media, created on first use (above the scene; the 3D state is untouched)
  const viewer = { el: null, room: null, index: 0, opener: null };
  function buildViewer() {
    const el = document.createElement("div");
    el.className = "lb"; el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <div class="lb-box">
        <div class="lb-top">
          <p class="lb-title"><strong data-lb-room></strong> · <span data-lb-label></span></p>
          <button type="button" class="lb-btn" data-lb-full aria-label="Pantalla completa">${FULL_SVG}</button>
          <button type="button" class="lb-btn" data-lb-close aria-label="Cerrar">&times;</button>
        </div>
        <div class="lb-stage" data-lb-stage>
          <video class="lb-video" playsinline webkit-playsinline muted preload="none" hidden></video>
          <img class="lb-img" alt="" hidden>
          <div class="lb-ctl" data-lb-ctl hidden>
            <button type="button" class="lb-btn" data-lb-play aria-label="Reproducir vídeo">${PLAY_SVG}</button>
            <button type="button" class="lb-btn" data-lb-sound aria-label="Activar sonido">${MUTED_SVG}</button>
          </div>
        </div>
        <div class="lb-tabs" data-lb-tabs role="tablist" aria-label="Vistas del espacio"></div>
        <p class="lb-note" data-lb-note></p>
      </div>`;
    document.body.appendChild(el);
    const $ = (s) => el.querySelector(s);
    const video = $(".lb-video"), img = $(".lb-img"), playBtn = $("[data-lb-play]"), soundBtn = $("[data-lb-sound]");
    const sync = () => {
      const playing = !video.paused && !video.ended;
      playBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
      playBtn.setAttribute("aria-label", playing ? "Pausar vídeo" : "Reproducir vídeo");
      soundBtn.innerHTML = video.muted ? MUTED_SVG : SOUND_SVG;
      soundBtn.setAttribute("aria-label", video.muted ? "Activar sonido" : "Silenciar");
      soundBtn.setAttribute("aria-pressed", String(!video.muted));
    };
    ["play", "pause", "ended", "volumechange"].forEach((ev) => video.addEventListener(ev, sync));
    video.addEventListener("ended", () => { video.currentTime = 0; sync(); });   // one pass, no loop
    playBtn.addEventListener("click", () => { if (video.paused || video.ended) video.play().catch(sync); else video.pause(); });
    soundBtn.addEventListener("click", () => { video.muted = !video.muted; if (!video.muted && video.paused) video.play().catch(sync); sync(); });
    video.addEventListener("click", () => playBtn.click());
    $("[data-lb-close]").addEventListener("click", closeViewer);
    el.addEventListener("click", (e) => { if (e.target === el) closeViewer(); });   // backdrop
    $("[data-lb-full]").addEventListener("click", () => {
      const box = $(".lb-box");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
      else if (video.webkitEnterFullscreen && !video.hidden) video.webkitEnterFullscreen();   // iPhone: native video player
    });
    // Esc closes the viewer only (does not reach the host page's own Esc handling)
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else closeViewer(); }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = viewer.room.media.items.length; showMedia((viewer.index + (e.key === "ArrowRight" ? 1 : n - 1)) % n); }
    });
    // nothing reaches the 3D canvas while the viewer is open
    el.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    viewer.el = el; viewer.video = video; viewer.img = img; viewer.sync = sync;
    return el;
  }
  function showMedia(i) {
    const r = viewer.room, m = r.media.items[i], el = viewer.el, video = viewer.video, img = viewer.img;
    viewer.index = i;
    el.querySelector("[data-lb-label]").textContent = m.label;
    el.querySelectorAll("[data-lb-tab]").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.lbTab === i)));
    el.querySelector("[data-lb-stage]").style.setProperty("--ar", `${m.w} / ${m.h}`);
    if (m.type === "video") {
      img.hidden = true;
      video.hidden = false; el.querySelector("[data-lb-ctl]").hidden = false;
      video.setAttribute("aria-label", m.alt || m.label);
      if (video.getAttribute("src") !== m.src) { video.poster = m.poster || ""; video.src = m.src; }   // loaded only now
      video.muted = true;                       // never starts with sound
      video.currentTime = 0;
      video.play().catch(viewer.sync);
    } else {
      video.pause(); video.hidden = true; el.querySelector("[data-lb-ctl]").hidden = true;
      img.hidden = false; img.alt = m.alt || m.label; img.width = m.w; img.height = m.h;
      if (img.getAttribute("src") !== m.src) img.src = m.src;
    }
    viewer.sync();
  }
  function openViewer(room, i, opener) {
    const el = viewer.el || buildViewer();
    viewer.room = room; viewer.opener = opener || null;
    el.setAttribute("aria-label", `${room.name} · Visualización del espacio`);
    el.querySelector("[data-lb-room]").textContent = room.name;
    el.querySelector("[data-lb-note]").textContent = room.media.note || "";
    const tabs = el.querySelector("[data-lb-tabs]");
    tabs.innerHTML = room.media.items.map((m, k) => `<button type="button" role="tab" data-lb-tab="${k}" aria-selected="false"><img src="${esc(m.thumb || m.poster || m.src)}" alt="" width="96" height="54">${m.type === "video" ? `<i aria-hidden="true">${PLAY_SVG}</i>` : ""}<span>${esc(m.label)}</span></button>`).join("");
    tabs.querySelectorAll("[data-lb-tab]").forEach((b) => b.addEventListener("click", () => showMedia(+b.dataset.lbTab)));
    el.hidden = false;
    document.documentElement.classList.add("lb-open");
    if (document.documentElement.classList.contains("embed-flow")) { viewer.askedFull = true; notifyHost("request-full"); }
    showMedia(i);
    el.querySelector("[data-lb-close]").focus({ preventScroll: true });
  }
  function closeViewer() {
    if (!viewer.el || viewer.el.hidden) return;
    viewer.video.pause();                       // playback stops when the viewer closes
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    viewer.el.hidden = true;
    document.documentElement.classList.remove("lb-open");
    if (viewer.askedFull) { viewer.askedFull = false; notifyHost("release-full"); }
    if (viewer.opener && document.contains(viewer.opener)) viewer.opener.focus({ preventScroll: true });
    dirty = true;                               // camera and selection were never touched
  }

  // =====================================================================
  // panel
  // =====================================================================
  function renderPanel() {
    if (state.tab === "budget") { renderBudget(); return; }
    const r = rooms.find((q) => q.id === state.selected);
    if (!r) {
      ui.panel.innerHTML = `
        <p class="kicker">Proyecto de Fitness y Bienestar</p>
        <h2>Centro Deportivo</h2>
        <p class="lead">Edificio multiusos junto a las pistas de tenis y pádel. Planta baja única; estructura de pórticos metálicos; sala multiusos con cubierta de panel sándwich.</p>
        <dl class="facts"><div><dt>Superficie útil</dt><dd>286,15 m²</dd></div><div><dt>Construida</dt><dd>314,42 m²</dd></div></dl>
        <h3>Recintos</h3>
        <ul class="rooms">${rooms.map((q) => `<li><button type="button" data-room="${q.id}"><span>${q.n}</span>${q.name}<em>${fmt(q.area)} m²</em></button></li>`).join("")}</ul>
        <h3>Emplazamiento</h3>
        <p class="note">${esc(SITE.memoria)}</p>
        <ul class="items">
          <li><span class="b v">V</span>Pistas de tenis (3) y pádel (3), plataforma, zonas verdes, piscina y pavimentos: posición y orientación medidas en el plano 02 (vista aérea, 1:200), registrado sobre la cubierta del edificio (±0,5 m).</li>
          <li><span class="b e">E</span>Dimensiones reglamentarias aplicadas (tenis ITF 23,77 × 10,97 m; pádel 20 × 10 m), vallados y cerramientos; longitud de las pistas de pádel sur (cortadas en el plano).</li>
          <li><span class="b c">C</span>Especies y posición de la vegetación, bancos, balizas y torres de iluminación.</li>
          <li class="muted">El plano 02 muestra solo parte del conjunto; el resto de pistas (6 de tenis en total según memoria), aparcamiento, club social y la plataforma alta no se representan. El desnivel de 0,70 m entre plataformas no está ubicado en los planos.</li>
        </ul>
        <p class="legend"><span class="b v">Verificado</span> plano 04 (vectorial, 1:100) y memoria · <span class="b e">Estimado</span> interpretación; activa “Resaltar estimados” · <span class="b c">Concepto</span> propuesta 3DNA: gimnasio, interiorismo y entorno del club (no forman parte del proyecto).</p>`;
    } else {
      const zone = state.zone && GYM.zones.find((q) => q.id === state.zone);
      const gymItems = r.id === "sala" ? GYM.items.filter((it) => !zone || inPoly(it.p[0], it.p[1], zone.poly)) : [];
      const conceptItems = (GYM.interiorItems || []).filter((it) => it.room === r.id);
      const items = FURN.items.filter((it) => it.room === r.id && !zone);
      const fin = FINISHES[r.id] || [];
      ui.panel.innerHTML = `
        <button type="button" class="close" data-room="" aria-label="Volver al resumen del edificio" title="Volver al resumen">‹</button>
        <p class="kicker">Recinto ${r.n} · programa de usos</p>
        <h2>${r.name}</h2>
        <dl class="facts">
          <div><dt>Superficie útil (plano)</dt><dd>${fmt(r.area)} m² <span class="b v">V</span></dd></div>
          <div><dt>Medida en el modelo</dt><dd>${fmt(r.area3d)} m²</dd></div>
        </dl>
        ${r.assignment ? `<p class="note"><span class="b e">Estimado</span> Asignación masculino / femenino provisional: el plano no lo indica; se sigue el orden del cuadro de superficies.</p>` : ""}
        ${mediaSection(r)}
        ${r.id === "sala" ? `<h3>Gimnasio · propuesta 3DNA <span class="b c">C</span></h3>
        <p class="note">Concepto de interiorismo sobre la sala del proyecto; la geometría del edificio no cambia.</p>
        <div class="zones">${GYM.zones.map((z) => `<button type="button" data-zone="${z.id}" aria-pressed="${state.zone === z.id}">${z.name}</button>`).join("")}</div>
        ${zone ? `<p class="lead">${esc(zone.desc)}</p>` : ""}
        <ul class="items">${groupCount(gymItems).map(([label, n]) => `<li><span class="b c">C</span>${n > 1 ? n + " × " : ""}${esc(label)}</li>`).join("")}</ul>` : ""}
        ${conceptItems.length ? `<h3>Propuesta de interiorismo <span class="b c">C</span></h3><ul class="items">${conceptItems.map((it) => `<li><span class="b c">C</span>${esc(it.label)}</li>`).join("")}</ul>` : ""}
        ${zone ? "" : `<h3>Equipamiento según plano de amueblamiento</h3>`}
        ${zone ? "" : items.length ? `<ul class="items">${items.map((it) => `<li><span class="b ${it.status === "verified" ? "v" : "e"}">${it.status === "verified" ? "V" : "E"}</span>${esc(it.label)}${it.note ? `<small>${esc(it.note)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="muted">${r.id === "sala" ? "Espacio diáfano: el plano no dibuja mobiliario en la sala (usos según memoria: escuela de verano, yoga, talleres, musculación)." : "Sin mobiliario dibujado."}</p>`}
        <h3>Acabados y alturas (memoria)</h3>
        <ul class="items">${fin.map(([s, t]) => `<li><span class="b ${s}">${s.toUpperCase()}</span>${t}</li>`).join("")}</ul>`;
    }
    ui.panel.querySelectorAll("[data-room]").forEach((b) => b.addEventListener("click", () => select(b.dataset.room || null)));
    ui.panel.querySelectorAll("[data-zone]").forEach((b) => b.addEventListener("click", () => selectZone(b.dataset.zone)));
    if (r) ui.panel.querySelectorAll("[data-media]").forEach((b) => b.addEventListener("click", () => openViewer(r, +b.dataset.media, b)));
  }

  // =====================================================================
  // equipment specification: cost & energy (equipamiento-especificaciones.json)
  // =====================================================================
  const roomName = (id) => (rooms.find((q) => q.id === id) || { name: id }).name;
  const EDIT_KEY = "centro-deportivo-equipamiento-ediciones-v1";
  const budget = {
    scenario: "estimate", search: "", edits: (() => { try { return JSON.parse(localStorage.getItem(EDIT_KEY) || "{}") || {}; } catch (e) { return {}; } })(),
  };
  const saveEdits = () => { try { localStorage.setItem(EDIT_KEY, JSON.stringify(budget.edits)); } catch (e) { /* storage unavailable: edits last for this visit */ } };
  const ctx = () => ({ scenario: budget.scenario, edits: budget.edits });
  const lineOfObject = new Map();
  SPEC.items.forEach((it) => it.objects.forEach((o) => lineOfObject.set(o, it.id)));

  // pick volumes: one box per placed copy of every equipment object (stable ids from the data files)
  const objBoxes = new Map();
  (function buildEquipmentIndex() {
    const club = createClubEquipment(THREE, { RoundedBoxGeometry: K.RoundedBoxGeometry, mergeGeometries: K.mergeGeometries });
    const kit = K.createModelKit();
    const cache = new Map();
    const partsBox = (key, getParts) => {
      if (!cache.has(key)) { const b = new THREE.Box3(); getParts(key).forEach(({ geometry }) => { geometry.computeBoundingBox(); b.union(geometry.boundingBox); }); cache.set(key, b); }
      return cache.get(key);
    };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    const place = (id, box0, it) => {
      const n = it.n || 1, st = it.s || [0, 0], list = objBoxes.get(id) || [];
      for (let i = 0; i < n; i++) {
        q.setFromAxisAngle(up, THREE.MathUtils.degToRad(it.r || 0));
        m4.compose(new THREE.Vector3(it.p[0] + st[0] * i, it.y || 0, it.p[1] + st[1] * i), q, one);
        list.push(box0.clone().applyMatrix4(m4).expandByScalar(0.03));
      }
      objBoxes.set(id, list);
    };
    const fixKey = (it) => { const key = "fx|" + JSON.stringify(it); if (!kit.has(key)) kit.define(key, (h) => buildFixture(h, it)); return key; };
    GYM.items.forEach((it) => place(it.id, partsBox(it.k, (k) => club.get(k)), it));
    (GYM.interiorItems || []).forEach((it) => place(it.id, partsBox(fixKey(it), (k) => kit.get(k)), it));
    FURN.items.forEach((it) => place(it.id, partsBox(fixKey(it), (k) => kit.get(k)), it));
    const segBox = (g) => { g.computeBoundingBox(); return g.boundingBox.clone().expandByScalar(0.05); };
    objBoxes.set("gym-led-lines", ledLuminaires().map(([a, b]) => segBox(K.segment(a, b, 0.05, 0.09, GYM.interior.ledHeight))));
    objBoxes.set("gym-led-cove", [segBox(K.segment([0.3, 8.3], [12.6, 8.3], 0.03, 0.04, 3.45))]);
  })();

  // highlight of the selected equipment line (all its objects / copies)
  const eqHi = new THREE.Group(); root.add(eqHi);
  const hiLine = new THREE.LineBasicMaterial({ color: 0xffc56b, depthTest: false, transparent: true, opacity: 0.95 });
  const hiFill = new THREE.MeshBasicMaterial({ color: 0xffc56b, transparent: true, opacity: 0.14, depthWrite: false });
  function lineBoxes(lineId) {
    const it = SPEC.items.find((q) => q.id === lineId);
    return it ? it.objects.flatMap((o) => objBoxes.get(o) || []) : [];
  }
  function showEquipment(lineId) {
    eqHi.children.forEach((o) => o.geometry.dispose()); eqHi.clear();
    lineBoxes(lineId).forEach((b) => {
      const size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const bg = new THREE.BoxGeometry(size.x, size.y, size.z);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(bg), hiLine); e.position.copy(c); e.renderOrder = 6; eqHi.add(e);
      const f = new THREE.Mesh(bg, hiFill); f.position.copy(c); f.renderOrder = 5; eqHi.add(f);
    });
    dirty = true;
  }
  function flyToEquipment(lineId) {
    const bs = lineBoxes(lineId); if (!bs.length) return;
    const all = bs.reduce((a, b) => a.union(b), new THREE.Box3());
    const c = all.getCenter(new THREE.Vector3()), s = all.getSize(new THREE.Vector3());
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    sph.phi = THREE.MathUtils.clamp(sph.phi, 0.35, 0.85);
    sph.radius = Math.max(s.x, s.z, 1.2) * (camera.aspect < 1 ? 2.6 : 1.9) + 5;
    flyTo(c.clone().add(new THREE.Vector3().setFromSpherical(sph)), c);
  }
  function pickEquipment(cx, cy) {
    const rc = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    let best = null, bestD = Infinity; const p = new THREE.Vector3();
    objBoxes.forEach((list, id) => list.forEach((b) => {
      if (!raycaster.ray.intersectBox(b, p)) return;
      const d = p.distanceTo(raycaster.ray.origin); if (d < bestD) { bestD = d; best = id; }
    }));
    return best ? lineOfObject.get(best) : null;
  }
  function selectEquipment(lineId, { fly = true } = {}) {
    state.eq = lineId;
    // keep the space selection in step with the equipment (3D highlight + dashboard entry)
    const it = lineId && SPEC.items.find((q) => q.id === lineId);
    if (it && rooms.some((r) => r.id === it.room) && state.selected !== it.room) { state.selected = it.room; state.zone = null; applyHighlight(); }
    showEquipment(lineId);
    if (lineId && fly) flyToEquipment(lineId);
    renderBudget();
    const card = lineId && ui.panel.querySelector(".eqcard");
    if (card) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ---------- formatting ----------
  const nf = (d) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
  const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const PEND = `<span class="pend">Pendiente de definir</span>`;
  const eur = (v) => (v === null ? PEND : EUR.format(v));
  const kw = (v) => (v === null ? PEND : nf(2).format(v) + " kW");
  const kwh = (v) => (v === null ? PEND : nf(0).format(v) + " kWh");
  const BADGE = {
    verified: ["v", "V", "Verificado (documentado)"], estimated: ["e", "E", "Estimado / preliminar"], concept: ["c", "C", "Concepto 3DNA"],
    edited: ["ed", "Ed", "Editado (preliminar)"], reference: ["r", "Est", "Estimado — referencia orientativa"],
    pending: ["p", "P", "Pendiente de definir"], inherent: ["z", "0", "Sin consumo eléctrico (inherente al elemento)"], na: ["z", "–", "No aplica"],
  };
  const badge = (s) => { const [c, t, title] = BADGE[s] || BADGE.pending; return `<span class="b ${c}" title="${title}">${t}</span>`; };

  // ---------- panel: equipment budget dashboard ----------
  const roomList = () => rooms.map((r) => ({ id: r.id, name: r.name }));
  const SECTIONS = { summary: true, rooms: true, groups: !window.matchMedia("(max-width: 900px)").matches, params: false, list: false, services: false, legend: false };
  budget.open = { ...SECTIONS, ...(budget.open || {}) };
  const sec = (id, title, body, extra = "") => `<details class="dsec" data-sec="${id}" ${budget.open[id] ? "open" : ""}><summary><span>${title}</span>${extra}</summary><div class="dbody">${body}</div></details>`;
  const pctTxt = (p) => (p === null ? "—" : nf(1).format(p * 100) + " %");
  const costTxt = (a) => (a.n === 0 ? `<span class="pend">Sin equipamiento</span>` : a.costPending === a.n ? `<span class="pend">Pendiente</span>` : EUR.format(a.cost) + (a.costPending ? "*" : ""));
  const kwTxt = (a) => (a.n === 0 ? "0 kW" : a.kwPending === a.n ? "kW P" : nf(2).format(a.installedKw) + " kW" + (a.kwPending ? "*" : ""));
  const kwhTxt = (a) => (a.n === 0 ? "0 kWh" : a.kwhPending === a.n ? "kWh P" : nf(0).format(a.kwh) + " kWh" + (a.kwhPending ? "*" : ""));
  function bars(list, kind) {
    const max = Math.max(...list.map((a) => a.cost), 0);
    return `<ul class="bars" role="list">${list.map((a) => {
      const active = kind === "room" && state.selected === a.id;
      const w = max > 0 ? (a.cost / max) * 100 : 0;
      const head = `<span class="bn">${esc(a.name)}</span><span class="bv">${costTxt(a)}</span>
        <span class="track" aria-hidden="true"><span class="fill" style="width:${w.toFixed(1)}%"></span></span>
        <span class="bm">${pctTxt(a.pct)} · ${kwTxt(a)} · ${kwhTxt(a)}/año</span>`;
      if (kind === "room") return `<li><button type="button" class="bar${active ? " is-active" : ""}" data-room="${a.id}" aria-pressed="${active}" title="Ver ${esc(a.name)} en el modelo 3D">${head}</button></li>`;
      return `<li><details class="bar grp"><summary>${head}</summary><p class="gdesc">${esc(a.desc)} · categorías de datos: ${a.categories.map(esc).join(", ")}</p>
        <ul class="gitems">${a.lines.map((L) => `<li><button type="button" data-eq="${L.item.id}">${esc(L.item.name)} <small>${esc(roomName(L.item.room))} · ${L.r.qty.v ?? "?"} ud</small><em>${L.total === null ? "P" : EUR.format(L.total)}</em></button></li>`).join("")}</ul></details></li>`;
    }).join("")}</ul>`;
  }
  function renderBudget() {
    const D = dashboard(SPEC, ctx(), roomList());
    const sel = state.eq && D.S.lines.find((L) => L.item.id === state.eq);
    ui.panel.innerHTML = `
      <p class="kicker">Equipamiento · inversión y energía</p>
      <h2>Presupuesto y energía</h2>
      <div class="seg2" role="group" aria-label="Datos mostrados">
        <button type="button" data-scn="estimate" aria-pressed="${budget.scenario === "estimate"}">Estimación preliminar</button>
        <button type="button" data-scn="verified" aria-pressed="${budget.scenario === "verified"}">Solo datos verificados</button>
      </div>
      <p class="warn" role="note"><strong>${esc(SPEC.disclaimerBudget)}</strong> ${esc(SPEC.disclaimer)}${budget.scenario === "estimate"
        ? ` Los valores ${badge("reference")} son orientativos (sin cotización de proveedores).`
        : ` Vista de solo datos verificados: aún no hay precios ni potencias documentados.`}</p>
      ${sec("summary", "Resumen del proyecto", `<div id="d-summary"></div><p class="note small">${esc(SPEC.pricing.scope)} No incluye montaje, climatización, ventilación ni el resto de instalaciones del edificio.</p>`)}
      ${sel ? detailCard(sel) : ""}
      <div id="d-room"></div>
      ${sec("rooms", "Presupuesto por espacios", `<div id="d-rooms"></div><p class="legend small">Pulsa un espacio para verlo en el modelo 3D. Porcentaje sobre el coste total de equipamiento sin IVA. * subtotal parcial (hay partidas pendientes).</p>`)}
      ${sec("groups", "Presupuesto por categorías", `<div id="d-groups"></div><p class="legend small">Cada partida pertenece a una sola categoría; la suma coincide con el total.</p>`)}
      ${sec("params", "Supuestos de energía", `<div class="fields">
        <label>Precio de la energía <span class="unit">€/kWh</span><input type="number" min="0" step="0.01" data-g="priceEurKwh" value="${budget.edits._global?.priceEurKwh ?? ""}" placeholder="${D.S.energy.price.v ?? "Pendiente"}"><span data-gb="price"></span></label>
        <label>Coeficiente de simultaneidad <span class="unit">0–1</span><input type="number" min="0" max="1" step="0.05" data-g="simultaneity" value="${budget.edits._global?.simultaneity ?? ""}" placeholder="${D.S.energy.simultaneity.v ?? "Pendiente"}"><span data-gb="simultaneity"></span></label>
      </div>
      <p class="note small">${esc(SPEC.energy.formula)}. El <strong>factor de uso</strong> y las horas (en la ficha de cada equipo) determinan la energía anual; el <strong>coeficiente de simultaneidad</strong> solo reduce la demanda máxima en kW. No se sustituyen entre sí.</p>
      ${budget.scenario === "estimate" ? `<p class="legend small">Base: precio — ${esc(SPEC.energy.estimate.basis.priceEurKwh)}; simultaneidad — ${esc(SPEC.energy.estimate.basis.simultaneity)} (${esc(SPEC.energy.estimate.date)}).</p>` : ""}`)}
      ${sec("list", `Equipos${state.selected ? " · " + esc(roomName(state.selected)) : ""}`, `
        <input type="search" class="search" placeholder="Buscar equipo, categoría o espacio…" value="${esc(budget.search)}" aria-label="Buscar equipo">
        <ul id="b-list" class="eqlist"></ul>`, `<span class="cnt" id="d-count"></span>`)}
      ${sec("services", "Instalaciones — estimación preliminar", `<p class="note small">Opcional y <strong>separada del total de equipamiento</strong>. Marcadores pendientes del proyecto de instalaciones; las cargas ya contadas (sauna, luminarias del gimnasio) no se repiten.</p><div id="b-services"></div>`, `<small class="opt">fuera del total</small>`)}
      ${sec("legend", "Leyenda y datos", `<p class="legend">${["verified", "reference", "estimated", "concept", "edited", "pending", "inherent"].map((s) => `${badge(s)} ${BADGE[s][2]}`).join("<br>")}</p>
        <p class="legend small">Ediciones guardadas solo en este navegador. Datos estructurados preparados para exportar (CSV / Excel / PDF) en una fase posterior.</p>`)}`;
    refreshBudget(D);
    // events
    ui.panel.querySelectorAll("details.dsec").forEach((d) => d.addEventListener("toggle", () => { budget.open[d.dataset.sec] = d.open; }));
    ui.panel.querySelectorAll("[data-scn]").forEach((b) => b.addEventListener("click", () => { budget.scenario = b.dataset.scn; renderBudget(); }));
    ui.panel.querySelector(".search").addEventListener("input", (e) => { budget.search = e.target.value; refreshBudget(); });
    ui.panel.querySelectorAll("[data-g]").forEach((inp) => inp.addEventListener("input", () => {
      const g = budget.edits._global || (budget.edits._global = {});
      setEdit(g, inp.dataset.g, inp.value, true); if (!Object.keys(g).length) delete budget.edits._global;
      saveEdits(); refreshBudget();
    }));
    ui.panel.querySelectorAll("[data-f]").forEach((inp) => inp.addEventListener("input", () => {
      const e = budget.edits[state.eq] || (budget.edits[state.eq] = {});
      setEdit(e, inp.dataset.f, inp.value, inp.type === "number"); if (!Object.keys(e).length) delete budget.edits[state.eq];
      saveEdits(); refreshBudget();
    }));
    const reset = ui.panel.querySelector("[data-reset]");
    if (reset) reset.addEventListener("click", () => { delete budget.edits[state.eq]; saveEdits(); renderBudget(); });
    const close = ui.panel.querySelector("[data-eq-close]");
    if (close) close.addEventListener("click", () => selectEquipment(null));
    // a new space selection (from the chart or from the 3D model) brings its card into view
    if (state.selected && budget.lastSel !== state.selected) ui.panel.querySelector("#d-room").scrollIntoView({ block: "nearest", behavior: "smooth" });
    budget.lastSel = state.selected;
  }
  // dynamic parts (no inputs inside: typing never loses focus)
  function refreshBudget(D = dashboard(SPEC, ctx(), roomList())) {
    const S = D.S, T = D.summary, $ = (sel) => ui.panel.querySelector(sel);
    const P = T.pending, part = (n) => (n ? `<small class="partial">parcial · ${n} pendiente${n > 1 ? "s" : ""}</small>` : "");
    const val = (v, n, f) => (v === 0 && n === T.n ? PEND : f(v) + part(n));
    $("#d-summary").innerHTML = `<dl class="kpis">
      <div class="k1"><dt>Equipamiento sin IVA</dt><dd>${val(T.cost, P.cost, (v) => EUR.format(v))}</dd></div>
      <div><dt>IVA ${nf(0).format(T.vatRate * 100)} %</dt><dd>${T.cost ? EUR.format(T.vat) : PEND}</dd></div>
      <div><dt>Equipamiento con IVA</dt><dd>${T.cost ? EUR.format(T.costWithVat) : PEND}</dd></div>
      <div><dt>Potencia instalada</dt><dd>${val(T.installedKw, P.kw, (v) => nf(2).format(v) + " kW")}</dd></div>
      <div><dt>Demanda simultánea est.</dt><dd>${T.demandKw === null ? PEND : nf(2).format(T.demandKw) + " kW" + part(P.kw)}</dd></div>
      <div><dt>Consumo anual est.</dt><dd>${val(T.kwh, P.kwh, (v) => nf(0).format(v) + " kWh")}</dd></div>
      <div><dt>Coste eléctrico anual est.</dt><dd>${val(T.energyCost, P.eur, (v) => EUR.format(v))}</dd></div>
    </dl>`;
    const gb = (k) => $(`[data-gb="${k}"]`); if (gb("price")) { gb("price").innerHTML = badge(S.energy.price.s); gb("simultaneity").innerHTML = badge(S.energy.simultaneity.s); }
    // selected space (synchronised with the 3D selection)
    const R = state.selected && D.byRoom.find((a) => a.id === state.selected);
    $("#d-room").innerHTML = R ? `<section class="roomcard" aria-label="Espacio seleccionado">
        <button type="button" class="close sm" data-room="" aria-label="Quitar selección">×</button>
        <p class="kicker">Espacio seleccionado</p><h4>${esc(R.name)}</h4>
        <p class="rc">${costTxt(R)} <span>${pctTxt(R.pct)} del total · ${kwTxt(R)} · ${kwhTxt(R)}/año</span></p>
        ${R.n ? `<ul class="gitems">${S.lines.filter((L) => L.item.room === R.id).sort((a, b) => (b.total || 0) - (a.total || 0)).map((L) => `<li><button type="button" data-eq="${L.item.id}" aria-pressed="${state.eq === L.item.id}">${esc(L.item.name)} <small>${L.r.qty.v ?? "?"} ud</small><em>${L.total === null ? "P" : EUR.format(L.total)}</em></button></li>`).join("")}</ul>` : `<p class="muted small">Este espacio no tiene equipamiento en el inventario.</p>`}
      </section>` : "";
    // detail card
    const L = state.eq && S.lines.find((x) => x.item.id === state.eq);
    if (L && $("#b-detail")) {
      $("#b-detail").innerHTML = `
        <div><dt>Total</dt><dd>${eur(L.total)}</dd></div>
        <div><dt>Potencia instalada</dt><dd>${kw(L.installedKw)}</dd></div>
        <div><dt>Consumo estimado</dt><dd>${L.kwh === null ? PEND : kwh(L.kwh) + "/año"}</dd></div>
        <div><dt>Coste energético</dt><dd>${L.energyCost === null ? PEND : eur(L.energyCost) + "/año"}</dd></div>`;
      FIELDS.forEach((f) => { const el = $(`[data-fb="${f}"]`); if (el) el.innerHTML = badge(L.r[f].s); });
    }
    $("#d-rooms").innerHTML = bars(D.byRoom, "room");
    // keep open groups open across refreshes
    const openG = new Set([...ui.panel.querySelectorAll("#d-groups details[open] .bn")].map((n) => n.textContent));
    $("#d-groups").innerHTML = bars(D.byGroup, "group");
    ui.panel.querySelectorAll("#d-groups details").forEach((d) => { if (openG.has(d.querySelector(".bn").textContent)) d.open = true; });
    // equipment list
    const q = budget.search.trim().toLowerCase();
    const list = S.lines.filter((x) => (!state.selected || x.item.room === state.selected) &&
      (!q || [x.item.name, x.item.category, roomName(x.item.room), x.r.manufacturer.v || "", x.r.model.v || ""].join(" ").toLowerCase().includes(q)));
    $("#d-count").textContent = list.length;
    $("#b-list").innerHTML = list.length ? list.map((x) => `<li><button type="button" data-eq="${x.item.id}" aria-pressed="${state.eq === x.item.id}">
        <span class="nm">${badge(x.item.qtyStatus)} ${esc(x.item.name)}<small>${esc(roomName(x.item.room))} · ${esc(x.item.category)} · ${x.r.qty.v ?? "?"} ud</small></span>
        <span class="vals">${x.total === null ? `<span class="pend">Pendiente</span>` : EUR.format(x.total)}${x.edited ? badge("edited") : x.reference ? badge("reference") : ""}<small>${x.r.ratedKw.s === "inherent" ? "0 kW" : x.installedKw === null ? "kW pendiente" : nf(2).format(x.installedKw) + " kW"}</small></span>
      </button></li>`).join("") : `<li class="muted small">Sin resultados.</li>`;
    // building services (separate estimate, never added to the equipment total)
    const ST = S.servicesTotal;
    $("#b-services").innerHTML = `<table class="sub"><thead><tr><th>Instalación</th><th>Coste</th><th>kW inst.</th><th>kWh/año</th></tr></thead><tbody>${S.services.map((x) => `<tr title="${esc(x.item.scope)}. ${esc(x.item.note || "")}"><td>${esc(x.item.name)}<small class="partial">${esc(x.item.scope)}</small></td>${x.includedIn
        ? `<td colspan="3" class="incl">Incluida en el equipamiento (${esc((SPEC.items.find((q) => q.id === x.includedIn) || {}).name || x.includedIn)})</td>`
        : `<td>${x.total === null ? "P" : EUR.format(x.total)}</td><td>${x.installedKw === null ? "P" : nf(2).format(x.installedKw)}</td><td>${x.kwh === null ? "P" : nf(0).format(x.kwh)}</td>`}</tr>`).join("")}
      <tr class="tot"><td>Total instalaciones</td><td>${ST.costPending === ST.n ? "P" : EUR.format(ST.cost) + (ST.costPending ? "*" : "")}</td><td>${ST.kwPending === ST.n ? "P" : nf(2).format(ST.installedKw) + (ST.kwPending ? "*" : "")}</td><td>${ST.kwhPending === ST.n ? "P" : nf(0).format(ST.kwh) + (ST.kwhPending ? "*" : "")}</td></tr></tbody></table>`;
    // links: spaces -> 3D selection, equipment -> card
    ui.panel.querySelectorAll("#d-rooms [data-room], #d-room [data-room]").forEach((b) => b.addEventListener("click", () => select(b.dataset.room || null)));
    ui.panel.querySelectorAll("#b-list [data-eq], #d-groups [data-eq], #d-room [data-eq]").forEach((b) => b.addEventListener("click", () => selectEquipment(b.dataset.eq)));
  }
  function setEdit(obj, f, raw, numeric) {
    const v = numeric ? parseFloat(String(raw).replace(",", ".")) : String(raw).trim();
    if (raw === "" || (numeric && !Number.isFinite(v))) delete obj[f]; else obj[f] = v;
  }
  function detailCard(L) {
    const it = L.item, r = L.r;
    const inp = (f, label, unit, type, step) => {
      const own = budget.edits[it.id]?.[f];
      const ph = r[f].s === "edited" ? "" : r[f].v ?? "Pendiente de definir";
      const dis = r[f].s === "na" ? "disabled" : "";
      return `<label>${label}${unit ? ` <span class="unit">${unit}</span>` : ""}<input ${dis} type="${type}" ${step ? `step="${step}" min="0"` : ""} data-f="${f}" value="${own ?? ""}" placeholder="${esc(String(r[f].s === "na" ? "No aplica" : ph))}"><span data-fb="${f}"></span></label>`;
    };
    return `<section class="eqcard" aria-label="Ficha del equipo">
      <button type="button" class="close sm" data-eq-close aria-label="Cerrar ficha">×</button>
      <p class="kicker">${esc(it.category)} · ${esc(roomName(it.room))}${it.zone ? " · " + esc((GYM.zones.find((z) => z.id === it.zone) || {}).name || it.zone) : ""}</p>
      <h4>${esc(it.name)}</h4>
      <dl class="facts" id="b-detail"></dl>
      <div class="fields">
        ${inp("manufacturer", "Fabricante", "", "text")}
        ${inp("model", "Modelo", "", "text")}
        ${inp("qty", "Cantidad", "ud", "number", "1")}
        ${inp("unitPrice", "Precio unitario", "€ sin IVA", "number", "10")}
        ${inp("ratedKw", "Potencia nominal", "kW", "number", "0.01")}
        ${inp("hoursYear", "Horas de funcionamiento", "h/año", "number", "50")}
        ${inp("utilization", "Factor de uso", "0–1", "number", "0.05")}
      </div>
      ${it.group ? `<p class="note small"><strong>Grupo de iluminación:</strong> ${it.group.lines} líneas × ${it.group.perLine} luminarias = ${it.group.lines * it.group.perLine} luminarias. ${esc(it.group.status)}.</p>` : ""}
      ${it.note ? `<p class="note small">${esc(it.note)}</p>` : ""}
      ${it.estimate && budget.scenario === "estimate" ? `<p class="note small">${badge("reference")} <strong>Base de la estimación:</strong> ${esc(it.estimate.basis)} · ${esc(it.estimate.date)}. Requiere confirmación del proveedor.</p>` : ""}
      <p class="note small"><strong>Fuente:</strong> ${esc(it.source)}. Objetos 3D: <code>${it.objects.map(esc).join(", ")}</code></p>
      ${budget.edits[it.id] ? `<button type="button" class="chip" data-reset>Restablecer valores de esta partida</button>` : ""}
    </section>`;
  }
  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    if (tab !== "budget") { state.eq = null; showEquipment(null); }
    renderPanel();
    ui.panel.parentElement.scrollTop = 0;
  }
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  document.getElementById("btn-budget").addEventListener("click", () => {
    if (document.body.classList.contains("panel-closed")) document.getElementById("btn-panel").click();
    setTab("budget");
  });
  if (PARAMS.has("capture")) window.__viewer = { THREE, renderer, scene, camera, controls, groups, state, setView, thinPlanting, viewPose, applyPanelOffset, ui };
  window.__equipmentSpec = { spec: SPEC, ctx, rows: () => toRows(SPEC, ctx(), roomName), summary: () => summarize(SPEC, ctx()), dashboard: () => dashboard(SPEC, ctx(), roomList()) };
}

// ---------------------------------------------------------------------------
const FINISHES = {
  sala: [["c", "Propuesta: pavimento de caucho deportivo, caucho de alta densidad en peso libre, espejos, paneles acústicos de lamas y líneas LED"], ["v", "Proyecto: suelo de hormigón pulido con pintura de resina estireno-acrílica"], ["v", "Fachada: termoarcilla + cámara + panel sándwich PU 4 cm; zócalo cerámico 0,60 m"], ["v", "Carpintería de aluminio lacado RPT, vidrio laminar 6+8+(4+4)"], ["v", "Cubierta de panel sándwich (PU 5 cm) sobre correas y pórticos metálicos"], ["e", "Altura libre ≈ 3,0–3,8 m (cubierta inclinada; leída en sección B-B)"]],
  instalaciones: [["v", "Gres antideslizante"], ["v", "Altura libre 2,60 m"], ["e", "Hueco exterior en fachada oeste (rejilla / ventana)"]],
  aseoM: [["v", "Gres antideslizante; alicatado de gres en zonas húmedas (altura no indicada)"], ["v", "Falso techo de escayola; altura libre 2,60 m"], ["v", "Lucernario circular en cubierta"]],
  aseoF: [["v", "Gres antideslizante; alicatado de gres en zonas húmedas (altura no indicada)"], ["v", "Falso techo de escayola; altura libre 2,60 m"], ["v", "Lucernario circular en cubierta"]],
  botiquin: [["v", "Gres antideslizante"], ["v", "Falso techo de escayola; altura libre 2,60 m"]],
  pasillo: [["v", "Gres antideslizante; falso techo de escayola"], ["v", "Ancho 1,30 m; dos lucernarios circulares"], ["v", "Puertas al oeste hacia la zona de piscina"]],
  sauna: [["v", "Suelo de lámina de PVC; alicatado en zonas húmedas"], ["v", "Cabina de sauna de madera (sección C-C)"], ["e", "Uso del vaso octogonal (hidromasaje / baño de vapor)"]],
  vestM: [["v", "Suelo de lámina de PVC; alicatado de gres"], ["v", "Ducha accesible 1,90 × 1,50; bancos de 0,50 a 0,45 m de altura"], ["v", "Ventana alta de 1,70 m en fachada sur"]],
  vestF: [["v", "Suelo de lámina de PVC; alicatado de gres"], ["v", "Ducha accesible 1,90 × 1,50; bancos de 0,50 a 0,45 m de altura"], ["v", "Ventana alta de 1,70 m en fachada sur"]],
  acceso: [["v", "Vestíbulo acristalado de perfilería de acero, vidrio 4+4, puerta doble 1,70"], ["v", "Altura libre 2,75 m; fachada de plaqueta cerámica"], ["e", "Marquesina = línea discontinua del plano 04"]],
  control: [["v", "Gres antideslizante; fachada de plaqueta cerámica"], ["v", "Ventana de 1,05 m de alto sobre antepecho de 1,15 m"], ["v", "Altura libre 2,60 m"]],
};

function groupCount(items) { const m = new Map(); items.forEach((it) => m.set(it.label, (m.get(it.label) || 0) + (it.n || 1))); return [...m]; }
function polyArea(p) { return Math.abs(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0) / 2); }
function centroid(p) { return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]; }
function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
function fmt(n) { return n.toFixed(2).replace(".", ","); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
// extruded plan polygon from y0 to y1 (plan y -> 3D z)
function prism(poly, y0, y1) {
  const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(Math.PI / 2);          // extrusion goes to -y; shape y -> +z
  g.translate(0, y1, 0);
  return g;
}
function shapeGeo(poly, h) { return prism(poly, 0, h); }
function strataTexture(renderer) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  let a = 31; const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  // layered limestone / concrete: warm top course, cooler deeper courses
  const bands = [["#c9b896", 0.12], ["#b9a685", 0.1], ["#a39276", 0.16], ["#8f8170", 0.14], ["#7d7468", 0.16], ["#686461", 0.14], ["#56565a", 0.18]];
  let y = 0;
  bands.forEach(([col, hgt]) => { const hh = hgt * 256; g.fillStyle = col; g.fillRect(0, y, 512, hh + 1); y += hh; });
  for (let i = 0; i < 9000; i++) { const v = rnd(); g.fillStyle = v > 0.5 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.08)"; g.fillRect(rnd() * 512, rnd() * 256, 2 + rnd() * 6, 1 + rnd() * 2); }
  g.strokeStyle = "rgba(30,28,26,.35)"; g.lineWidth = 1.5;
  y = 0; bands.forEach(([, hgt]) => { y += hgt * 256; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 1.5); g.stroke(); });
  for (let i = 0; i < 26; i++) { const x = rnd() * 512, y0 = rnd() * 256; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (rnd() - 0.5) * 8, y0 + 20 + rnd() * 30); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function panelTexture(renderer) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#cfd4d8"); gr.addColorStop(1, "#c3c9cd");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(60,66,72,.55)"; g.lineWidth = 3;
  [0, 128].forEach((y) => { g.beginPath(); g.moveTo(0, y + 1); g.lineTo(256, y + 1); g.stroke(); });
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; [0, 128].forEach((y) => { g.beginPath(); g.moveTo(0, y + 4); g.lineTo(256, y + 4); g.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function gravelTexture(renderer) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d"); g.fillStyle = "#b9b3a8"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = 150 + Math.random() * 80; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 0.8 + Math.random() * 1.8, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
