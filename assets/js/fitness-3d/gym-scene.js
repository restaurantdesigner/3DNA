/*
 * Fitness planner (homepage) — 3D scene (ES module, lazy-loaded by gym-app.js).
 *
 * Model source
 *   - data.model.enabled === true  -> loads data.model.url (GLB/GLTF)
 *   - otherwise                    -> the procedural example club built here:
 *       architecture from data.architecture, equipment and furniture placed by
 *       each zone's "layout" (assets/data/gym-zones.json). Models come from the
 *       Fitness page library (assets/js/fitness-club-3d/club-equipment.js, used
 *       as is) plus a few homepage extras defined below.
 *
 * Zone mapping (same for both sources)
 *   An object belongs to a zone when it, or any parent, is named "zone-<id>"
 *   (e.g. "zone-cardio") or has userData.zone === "<id>".
 *
 * Rendering (shared kit: assets/js/shared-3d/archviz.js): image-based light +
 * one soft shadowed key light, canvas-generated floor textures, equipment
 * merged per zone and material, on-demand rendering paused off screen.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const V = new URL(import.meta.url).search;   // same ?v= for every module of this scene
const K = await import(`/assets/js/shared-3d/archviz.js${V}`);
const { createClubEquipment } = await import(`/assets/js/fitness-club-3d/club-equipment.js${V}`);

const HIGHLIGHT = 0xe3c48f;    // 3DNA warm gold (homepage accent)
// homepage palette: warmer graphite and gold-white light instead of the Fitness page blue
const PALETTE = {
  frame:   { color: 0x2b2926, roughness: 0.4, metalness: 0.6 },
  ledBlue: { color: 0x000000, emissive: 0xf0c890, emissiveIntensity: 2.2 },
  accent:  { color: 0x9c7a46, roughness: 0.4, metalness: 0.35 },
  screen:  { color: 0x05080d, roughness: 0.2, emissive: 0x3a5f8a, emissiveIntensity: 0.8 },
};
const FLOORS = {
  wood: { tex: "oak", tile: 2.4, rough: 0.5 }, rubber: { tex: "rubber", tile: 2, rough: 0.85 },
  impact: { tex: "rubberThick", tile: 2, rough: 0.85 }, turf: { tex: "turf", tile: 1.6, rough: 1 },
  tile: { tex: "tile", tile: 2.4, rough: 0.35 },
};

export async function createGymScene({ container, labelsEl, data, reducedMotion = false, ariaLabel = "", onSelect }) {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const lowPower = touch || (navigator.hardwareConcurrency || 8) <= 4;
  const { width: FW, depth: FD } = data.floor;
  const CENTER = new THREE.Vector3(FW / 2, 0, FD / 2);
  const ARCH = data.architecture || { wallHeight: 3.2, cutHeight: 1.2, walls: [], columns: [], ceilingLines: [] };

  // ---------- renderer, light ----------
  const renderer = K.createRenderer({ lowPower, exposure: 1.12, className: "gym3d__canvas" });
  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", ariaLabel);
  container.prepend(canvas);   // under the zone labels
  const scene = new THREE.Scene();
  K.setupLighting(renderer, scene, { center: CENTER, span: Math.hypot(FW, FD), hemi: [0xfff3e2, 0x2a2420, 0.85], key: 0xfff0dc, keyIntensity: 2.0, fill: [0xbcd2ff, 0.35] });
  const TEX = K.makeTextures(renderer, 11);
  const MAT = K.createMaterials(TEX, PALETTE);

  // ---------- camera + controls (limited, easy to use) ----------
  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 400);
  let HOME_AZ = 0.62;
  const HOME_EL = 0.84;
  const homeTarget = new THREE.Vector3(FW / 2, 0.6, FD / 2 + 0.4);
  let homeDist = 50;
  const dirFrom = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const homePos = () => homeTarget.clone().addScaledVector(dirFrom(HOME_AZ, HOME_EL), homeDist);

  // the wheel scrolls the page until the visitor engages with the model (click
  // or drag inside it); a pinch (ctrl + wheel) always zooms
  let engaged = false;
  canvas.addEventListener("wheel", (e) => { if (!engaged && !e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });
  canvas.addEventListener("pointerdown", () => { engaged = true; });
  container.addEventListener("pointerleave", () => { engaged = false; });

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = touch ? 0.6 : 0.5;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = 1.2;
  controls.minDistance = 6;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

  // ---------- model ----------
  const zones = new Map(); // id -> { group, mats[], floorMats[], outline, center, size, rect, labelY }
  const root = new THREE.Group();
  scene.add(root);
  let ceiling = null;
  if (data.model && data.model.enabled) {
    root.add(await loadGLB(data.model.url));
    indexGLBZones(root);
  } else {
    buildArchitecture();
    buildZones();
  }

  // ---------- labels (HTML, positioned per render) ----------
  const labels = new Map();
  data.zones.forEach((z) => {
    if (!zones.has(z.id)) return;
    const el = document.createElement("div");
    el.className = "gym3d__label";
    el.dataset.zone = z.id;
    el.innerHTML = `<span class="gym3d__label-num">${z.index}</span><span class="gym3d__label-name"></span>`;
    el.querySelector(".gym3d__label-name").textContent = z.name;
    el.addEventListener("click", () => select(z.id, { notify: true }));
    el.addEventListener("pointerenter", () => setHover(z.id));
    el.addEventListener("pointerleave", () => setHover(null));
    labelsEl.appendChild(el);
    labels.set(z.id, el);
  });

  // ---------- state, highlight ----------
  let selected = null, hovered = null, dirty = true, active = true, tween = null;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function applyHighlight() {
    zones.forEach((z, id) => {
      const isSel = id === selected, isHover = id === hovered && !isSel;
      const dim = !!selected && !isSel;
      z.mats.forEach((m) => {
        m.color.copy(m.userData.baseColor).multiplyScalar(dim ? 0.5 : 1);
        if (m.emissive) m.emissiveIntensity = (m.userData.baseEmissive || 0) * (dim ? 0.45 : 1);
      });
      z.floorMats.forEach((m) => {
        m.color.copy(m.userData.baseColor).multiplyScalar(dim ? 0.55 : 1);
        m.emissive.setHex(HIGHLIGHT);
        m.emissiveIntensity = isSel ? 0.05 : isHover ? 0.035 : 0;
      });
      if (z.outline) { z.outline.visible = isSel || isHover; z.outline.material.emissiveIntensity = isSel ? 2.6 : 1.4; }
      const label = labels.get(id);
      if (label) {
        label.classList.toggle("is-selected", isSel);
        label.classList.toggle("is-hover", isHover);
        label.classList.toggle("is-dim", dim);
      }
    });
    canvas.style.cursor = hovered ? "pointer" : "grab";
    dirty = true;
  }
  function setHover(id) { if (id !== hovered) { hovered = id; applyHighlight(); } }

  // ---------- camera tween ----------
  function flyTo(pos, target, animate) {
    if (!animate || reducedMotion) {
      tween = null; camera.position.copy(pos); controls.target.copy(target); controls.update(); dirty = true; return;
    }
    tween = { from: camera.position.clone(), fromT: controls.target.clone(), to: pos, toT: target, t0: performance.now(), dur: 1000 };
  }
  function select(id, { animate = true, notify = false } = {}) {
    if (!zones.has(id)) return;
    selected = id;
    applyHighlight();
    const z = zones.get(id);
    const c = z.center.clone().setY(0.5);
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    sph.phi = THREE.MathUtils.clamp(sph.phi, 0.5, 0.9);
    sph.radius = Math.max(z.size.x, z.size.z) * (camera.aspect < 1 ? 2.1 : 1.45) + 6;
    flyTo(c.clone().add(new THREE.Vector3().setFromSpherical(sph)), c, animate);
    if (notify && onSelect) onSelect(id);
  }
  function reset({ animate = true } = {}) {
    selected = null;
    applyHighlight();
    flyTo(homePos(), homeTarget.clone(), animate);
  }

  // ---------- picking: rays against each zone's footprint volume ----------
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    let best = null, bestD = Infinity;
    const hit = new THREE.Vector3();
    zones.forEach((z, id) => {
      if (raycaster.ray.intersectBox(z.pickBox, hit)) {
        const d = hit.distanceToSquared(raycaster.ray.origin);
        if (d < bestD) { bestD = d; best = id; }
      }
    });
    return best;
  }
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const id = pick(e.clientX, e.clientY);
    if (id) select(id, { notify: true });
  });
  let moveRaf = 0, lastMove = null;
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || down) return;
    lastMove = e;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(() => { moveRaf = 0; setHover(pick(lastMove.clientX, lastMove.clientY)); });
  });
  canvas.addEventListener("pointerleave", () => setHover(null));

  // keep the view on the floor
  controls.addEventListener("change", () => {
    const t = controls.target;
    t.x = THREE.MathUtils.clamp(t.x, -2, FW + 2);
    t.z = THREE.MathUtils.clamp(t.z, -2, FD + 2);
    t.y = THREE.MathUtils.clamp(t.y, 0, 1.5);
    dirty = true;
  });
  controls.addEventListener("start", () => { tween = null; });

  // ---------- size: the whole building always fits the home view ----------
  const corners = [];
  [0, FW].forEach((x) => [0, FD + 0.6].forEach((z) => [0, ARCH.wallHeight].forEach((y) => corners.push(new THREE.Vector3(x, y, z)))));
  let sized = false;
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 40 : 30;
    camera.updateProjectionMatrix();
    HOME_AZ = w / h < 0.9 ? 1.2 : 0.62;
    controls.minAzimuthAngle = HOME_AZ - 1.5;
    controls.maxAzimuthAngle = HOME_AZ + 1.5;
    homeDist = K.fitDistance(camera, homeTarget, dirFrom(HOME_AZ, HOME_EL), corners, 0.96, 0.92);
    controls.maxDistance = homeDist * 1.3;
    if (!sized || (!selected && !tween)) { camera.position.copy(homePos()); controls.target.copy(homeTarget); controls.update(); }
    sized = true;
    dirty = true;
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- render loop (on demand, paused off screen) ----------
  const tmp = new THREE.Vector3();
  function updateLabels() {
    const w = container.clientWidth, h = container.clientHeight;
    const dist = camera.position.distanceTo(controls.target);
    labelsEl.classList.toggle("is-compact", dist > homeDist * 0.75);
    if (ceiling) ceiling.visible = dist > homeDist * 0.62;
    labels.forEach((el, id) => {
      const z = zones.get(id);
      tmp.copy(z.center).setY(z.labelY).project(camera);
      el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
      el.style.visibility = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05 ? "visible" : "hidden";
    });
  }
  function frame(now) {
    if (!active) return;
    requestAnimationFrame(frame);
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.from, tween.to, e);
      controls.target.lerpVectors(tween.fromT, tween.toT, e);
      if (k >= 1) tween = null;
      dirty = true;
    }
    if (controls.update()) dirty = true;
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
    updateLabels();
  }
  requestAnimationFrame(frame);
  function setActive(on) {
    if (on === active) return;
    active = on;
    if (on) { dirty = true; requestAnimationFrame(frame); }
  }

  applyHighlight();
  return { select: (id, o) => select(id, o), reset, setActive };

  // =====================================================================
  // procedural example club
  // =====================================================================
  function mesh(geometry, material, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = cast && renderer.shadowMap.enabled;
    m.receiveShadow = receive && renderer.shadowMap.enabled;
    return m;
  }
  function solid(hex, rough = 0.85) { return K.surfaceMat(TEX, null, { color: hex, roughness: rough }); }

  function buildArchitecture() {
    const arch = new THREE.Group();
    arch.name = "architecture";
    root.add(arch);
    const H = ARCH.wallHeight, CUT = ARCH.cutHeight;
    const wallMat = solid(0x2a2725, 0.88), wallTop = solid(0x45403b, 0.9), plinthMat = solid(0x141210, 0.9);
    const glass = MAT.shared("glass"), mull = MAT.shared("frame"), led = MAT.shared("ledWarm"), ledLine = MAT.shared("led");

    // plinth + soft contact shadow + street paving
    const plinth = mesh(new THREE.BoxGeometry(FW + 1.4, 0.45, FD + 2.8), plinthMat, { cast: false });
    plinth.position.set(FW / 2, -0.225, FD / 2 + 0.7);
    arch.add(plinth);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FW * 1.9, FD * 2.1), new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false, opacity: 0.85 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(FW / 2, -0.46, FD / 2 + 0.7);
    arch.add(shadow);
    const pave = mesh(new THREE.BoxGeometry(FW + 1.4, 0.02, 2.0), solid(0x3b3733, 0.85), { cast: false });
    pave.position.set(FW / 2, 0.01, FD + 1.2);
    arch.add(pave);
    // base under the zones (service area and joints)
    const base = mesh(new THREE.PlaneGeometry(FW, FD).rotateX(-Math.PI / 2), K.surfaceMat(TEX, "concrete", { roughness: 0.55, repeat: [FW / 4, FD / 4] }), { cast: false });
    base.position.set(FW / 2, 0.001, FD / 2);
    arch.add(base);

    const solids = [], tops = [], glassG = [], mullG = [], leds = [];
    const along = (a, b, every, fn) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(len / every));
      for (let i = 0; i <= n; i++) fn([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    };
    ARCH.walls.forEach(({ t, a, b }) => {
      if (t === "solid") {
        // perimeter built outside the footprint line, full height, warm LED cove
        const nx = a[1] === b[1] ? 0 : (a[0] < FW / 2 ? -0.12 : 0.12);
        const nz = a[1] === b[1] ? (a[1] < FD / 2 ? -0.12 : 0.12) : 0;
        const o = (p, k = 1) => [p[0] + nx * k, p[1] + nz * k];
        solids.push(K.segment(o(a), o(b), H, 0.24));
        tops.push(K.segment(o(a), o(b), 0.04, 0.26, H));
        leds.push(K.segment(o(a, -0.05), o(b, -0.05), 0.03, 0.04, H - 0.25));
      } else if (t === "cut") {
        solids.push(K.segment(a, b, CUT, 0.14));
        tops.push(K.segment(a, b, 0.03, 0.16, CUT));
      } else {
        const hh = t === "glass" ? 2.6 : H;
        glassG.push(K.segment(a, b, hh - 0.08, 0.02, 0.04));
        mullG.push(K.segment(a, b, 0.06, 0.08, 0), K.segment(a, b, 0.07, 0.08, hh - 0.07));
        along(a, b, t === "glass" ? 1.25 : 1.5, (p) => { const g = new THREE.BoxGeometry(0.06, hh, 0.07); g.translate(p[0], hh / 2, p[1]); mullG.push(g); });
        if (t === "door") mullG.push(K.segment(a, b, 0.25, 0.1, 2.5));
      }
    });
    if (solids.length) arch.add(mesh(K.mergeGeometries(solids), wallMat));
    if (tops.length) arch.add(mesh(K.mergeGeometries(tops), wallTop, { cast: false }));
    if (leds.length) arch.add(mesh(K.mergeGeometries(leds), led, { cast: false, receive: false }));
    if (glassG.length) { const g = mesh(K.mergeGeometries(glassG), glass, { cast: false, receive: false }); g.renderOrder = 2; arch.add(g); }
    if (mullG.length) arch.add(mesh(K.mergeGeometries(mullG), mull));

    // columns with warm vertical light lines
    const colGeo = [], colLed = [];
    (ARCH.columns || []).forEach(([x, z]) => {
      const g = new K.RoundedBoxGeometry(0.42, H, 0.42, 2, 0.02); g.translate(x, H / 2, z); colGeo.push(g);
      [0.215, -0.215].forEach((dx) => { const l = new THREE.BoxGeometry(0.012, H - 0.4, 0.05); l.translate(x + dx, H / 2, z); colLed.push(l); });
    });
    if (colGeo.length) {
      arch.add(mesh(K.mergeGeometries(colGeo), solid(0x3d3935, 0.75)));
      arch.add(mesh(K.mergeGeometries(colLed), MAT.shared("ledBlue"), { cast: false, receive: false }));
    }
    // suspended linear luminaires (hidden in close-ups)
    const lines = (ARCH.ceilingLines || []).map(({ a, b }) => K.segment(a, b, 0.035, 0.06, 3.0));
    if (lines.length) { ceiling = mesh(K.mergeGeometries(lines), ledLine, { cast: false, receive: false }); arch.add(ceiling); }

    // service area (back of house): plain floor + its layout
    if (data.serviceLayout && data.serviceLayout.length) {
      K.bakeItems(data.serviceLayout, getModel).forEach((g, key) => arch.add(mesh(g, MAT.shared(key))));
    }
  }

  function buildZones() {
    data.zones.forEach((z) => {
      const group = new THREE.Group();
      group.name = z.mesh || `zone-${z.id}`;
      group.userData.zone = z.id;
      const r = z.rect;
      const mats = {};
      const zm = (key) => mats[key] || (mats[key] = MAT.makeMat(key));

      // floor finish
      const f = FLOORS[z.floorFinish] || FLOORS.rubber;
      const floorMat = K.surfaceMat(TEX, f.tex, { roughness: f.rough, repeat: [r.w / f.tile, r.d / f.tile] });
      const floor = mesh(new THREE.PlaneGeometry(r.w - 0.06, r.d - 0.06).rotateX(-Math.PI / 2), floorMat, { cast: false });
      floor.position.set(r.x + r.w / 2, 0.004, r.z + r.d / 2);
      group.add(floor);

      // selection outline: thin emissive frame on the floor
      const outlineMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: HIGHLIGHT, emissiveIntensity: 2 });
      const ob = [];
      const x0 = r.x + 0.06, x1 = r.x + r.w - 0.06, z0 = r.z + 0.06, z1 = r.z + r.d - 0.06, tw = 0.07;
      [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]].forEach(([ax, az, bx, bz]) => {
        const g = new THREE.BoxGeometry(Math.abs(bx - ax) + tw, 0.012, Math.abs(bz - az) + tw);
        g.translate((ax + bx) / 2, 0.012, (az + bz) / 2);
        ob.push(g);
      });
      const outline = new THREE.Mesh(K.mergeGeometries(ob), outlineMat);
      outline.visible = false;
      group.add(outline);

      // equipment and furniture: every placed copy baked into one mesh per material
      K.bakeItems(z.layout || [], getModel).forEach((g, key) => {
        const noShadow = ["glass", "led", "ledWarm", "ledBlue", "screen", "screenBright", "water", "mirror"].includes(key);
        const m = mesh(g, zm(key), { cast: !noShadow, receive: !key.startsWith("led") });
        if (key === "glass" || key === "water") m.renderOrder = 2;
        group.add(m);
      });
      root.add(group);
      zones.set(z.id, {
        group, rect: r, mats: Object.values(mats), floorMats: [floorMat], outline,
        center: new THREE.Vector3(r.x + r.w / 2, 0, r.z + r.d / 2), size: new THREE.Vector3(r.w, 0, r.d),
        pickBox: new THREE.Box3(new THREE.Vector3(r.x, 0, r.z), new THREE.Vector3(r.x + r.w, 1.1, r.z + r.d)),
        labelY: 3.0,
      });
    });
  }

  // models: the Fitness page library + homepage extras
  function createLibrary() {
    const club = createClubEquipment(THREE, { RoundedBoxGeometry: K.RoundedBoxGeometry, mergeGeometries: K.mergeGeometries });
    const kit = K.createModelKit();
    kit.define("waiting_bench", ({ RB, B, mirrorX }) => {
      RB(1.8, 0.09, 0.5, 0.03, "oak", 0, 0.44, 0);
      RB(1.7, 0.08, 0.44, 0.04, "fabricLight", 0, 0.52, 0.0);
      mirrorX((s) => { RB(0.06, 0.4, 0.42, 0.01, "frame", s * 0.8, 0.2, 0); });
      B(1.5, 0.03, 0.03, "frame", 0, 0.1, 0);
    });
    kit.define("lighting_control", ({ RB, B }) => {
      RB(0.42, 0.62, 0.08, 0.02, "frame", 0, 1.3, 0);
      B(0.34, 0.24, 0.01, "screen", 0, 1.42, 0.045);
      B(0.3, 0.02, 0.01, "ledWarm", 0, 1.08, 0.045);
    });
    return (key) => (club.has(key) ? club.get(key) : kit.get(key));
  }
  function getModel(key) { return (getModel.lib || (getModel.lib = createLibrary()))(key); }

  // =====================================================================
  // authored GLB (optional)
  // =====================================================================
  async function loadGLB(url) {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(url);
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = renderer.shadowMap.enabled; } });
    return gltf.scene;
  }
  function indexGLBZones(rootObj) {
    rootObj.traverse((o) => {
      const m = /^zone-([a-z0-9]+)$/i.exec(o.name || "");
      const id = (o.userData && o.userData.zone) || (m && m[1].toLowerCase());
      if (!id || zones.has(id)) return;
      const mats = new Set();
      o.traverse((c) => {
        if (!c.isMesh) return;
        c.material = Array.isArray(c.material) ? c.material.map((x) => x.clone()) : c.material.clone();
        (Array.isArray(c.material) ? c.material : [c.material]).forEach((x) => {
          x.userData.baseColor = x.color ? x.color.clone() : new THREE.Color(1, 1, 1);
          x.userData.baseEmissive = x.emissiveIntensity || 0;
          mats.add(x);
        });
      });
      const bb = new THREE.Box3().setFromObject(o);
      zones.set(id, {
        group: o, mats: [...mats], floorMats: [], outline: null,
        center: bb.getCenter(new THREE.Vector3()).setY(0), size: bb.getSize(new THREE.Vector3()),
        pickBox: new THREE.Box3(bb.min.clone(), new THREE.Vector3(bb.max.x, bb.min.y + 1.1, bb.max.z)),
        labelY: Math.min(bb.max.y, 2.6) + 0.5,
      });
    });
  }
}
