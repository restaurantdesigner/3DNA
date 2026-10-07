/*
 * Hospital naming opportunities — 3D scene (ES module, lazy-loaded by naming-app.js).
 *
 * Model source
 *   - data.model.enabled === true  -> loads data.model.url (.glb / .gltf; Draco and
 *                                     Meshopt compression supported)
 *   - otherwise                    -> PLACEHOLDER floor built here from the zone
 *                                     rectangles in assets/data/hospital-naming.json
 *
 * Naming contract (same for both sources)
 *   ZONE_<Name>     group per room / area (ZONE_Lobby, ZONE_MRI, ...)
 *   NAMING_<Name>   the space a donor can name (NAMING_MainLobby, NAMING_MRI, ...)
 *                   = opportunity.meshId in the data file. Clicking any mesh inside
 *                   it (or any surface inside its footprint) selects the opportunity.
 *   Units are metres, origin at the back-left corner of the floor, +x to the
 *   right, +z towards the main entrance (same as the data file).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// bright, architectural palette: warm whites, light oak, glass, soft teal accents
const COLOR = {
  slab: 0xcbc5ba,
  wall: 0xf7f5f1,
  wood: 0xcfa97d,
  woodDark: 0xa98762,
  white: 0xfbfaf8,
  fabric: 0xaec3bd,       // soft sage
  fabricWarm: 0xd2c1ab,   // warm linen
  fabricBlue: 0xa9c0cf,   // pale blue bedding
  metal: 0xbcc1c4,
  dark: 0x454b4f,
  screen: 0x252b2f,
  glass: 0xcfe4ea,
  curtain: 0xb4d6d0,
  plant: 0x7d9b79,
  brass: 0xc9a668,
  accent: 0x6aa79e,       // healthcare teal-green (wayfinding)
  accentSoft: 0xc5e0db,
  paving: 0xe6e2da,
  light: 0xfffaf0,
};
const FINISH = { stone: 0xebe9e4, wood: 0xd6b88e, warm: 0xe8dfd0, clinical: 0xd9e6e4, corridor: 0xe2dfd8, service: 0xdcd7ce };
const HIGHLIGHT = 0x3f8f85;

export async function createNamingScene({ container, spotsEl, data, reducedMotion = false, ariaLabel = "", onSelect }) {
  const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const { width: FW, depth: FD } = data.floor;

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "hnaming__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", ariaLabel);
  container.insertBefore(canvas, container.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
  const HOME_TARGET = new THREE.Vector3(FW / 2, 0, FD / 2 + 1.5);
  const HOME_OFFSET = new THREE.Vector3(3, 37, 47.5);
  const narrow = () => camera.aspect < 1.2; // phones: square viewport
  const homePos = () => HOME_TARGET.clone().add(HOME_OFFSET.clone().multiplyScalar(narrow() ? 1.22 : 1));
  camera.position.copy(homePos());

  // ---------- lights: soft daylight ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b8, 1.35));
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const sun = new THREE.DirectionalLight(0xfff2e2, 2.0);
  sun.position.set(FW * 0.1, 34, FD + 14);
  sun.target.position.set(FW / 2, 0, FD / 2);
  scene.add(sun, sun.target);
  if (renderer.shadowMap.enabled) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 5, far: 120 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 3;
  }

  // ---------- controls: orbit, zoom, pan with limits ----------
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.minDistance = 9;
  controls.maxDistance = 85;
  controls.minPolarAngle = 0.2;        // never straight down...
  controls.maxPolarAngle = 1.15;       // ...nor at floor level
  controls.minAzimuthAngle = -1.25;    // keep the entrance side towards the viewer
  controls.maxAzimuthAngle = 1.25;
  controls.screenSpacePanning = false; // pan along the floor
  controls.update();

  // ---------- model ----------
  const root = data.model && data.model.enabled ? await loadModel(data.model.url) : buildPlaceholder();
  scene.add(root);
  const naming = indexNaming(root); // id -> entry

  // ---------- hotspots + zone labels (HTML, positioned per render) ----------
  const spots = new Map();
  data.opportunities.forEach((o) => {
    const n = naming.get(o.id);
    if (!n) return;
    const el = document.createElement("div");
    el.className = "hn-spot";
    el.dataset.opp = o.id;
    el.innerHTML = '<span class="hn-spot__dot"></span><span class="hn-spot__tip"><span class="hn-spot__name"></span><span class="hn-spot__price"></span></span>';
    el.querySelector(".hn-spot__name").textContent = o.name;
    el.querySelector(".hn-spot__price").textContent = o.price;
    el.addEventListener("click", () => select(o.id, { notify: true }));
    el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") setHover(o.id); });
    el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setHover(null); });
    spotsEl.appendChild(el);
    spots.set(o.id, el);
  });
  const zoneLabels = data.model && data.model.enabled ? [] : data.zones.map((z) => {
    const el = document.createElement("div");
    el.className = "hn-zone";
    el.textContent = z.name;
    spotsEl.appendChild(el);
    return { el, pos: new THREE.Vector3(z.rect.x + 0.45, 0.06, z.rect.z + z.rect.d - 0.45) };
  });

  // ---------- state, highlight ----------
  let selected = null;
  let hovered = null;
  let dirty = true;
  let active = true;
  let tween = null;
  let userMoved = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function applyHighlight() {
    naming.forEach((n, id) => {
      const isSel = id === selected;
      const isHover = id === hovered && !isSel;
      if (n.overlay) {
        n.overlay.material.opacity = isSel ? 0.3 : isHover ? 0.16 : selected ? 0 : 0.07;
        n.outline.visible = isSel || isHover;
        n.outline.material.opacity = isSel ? 1 : 0.6;
      }
      n.materials.forEach((m) => {
        m.emissive.setHex(HIGHLIGHT);
        m.emissiveIntensity = isSel ? 0.35 : isHover ? 0.15 : 0;
      });
      const el = spots.get(id);
      if (el) {
        el.classList.toggle("is-selected", isSel);
        el.classList.toggle("is-hover", isHover);
        el.classList.toggle("is-dim", !!selected && !isSel);
      }
    });
    canvas.style.cursor = hovered ? "pointer" : "";
    dirty = true;
  }
  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    applyHighlight();
  }

  // ---------- camera ----------
  function flyTo(pos, target, animate) {
    if (!animate || reducedMotion) {
      tween = null;
      camera.position.copy(pos); controls.target.copy(target); controls.update(); dirty = true; return;
    }
    tween = { from: camera.position.clone(), fromT: controls.target.clone(), to: pos, toT: target, t0: performance.now(), dur: 850 };
  }

  function select(id, { animate = true, notify = false } = {}) {
    const n = naming.get(id);
    if (!n) return;
    selected = id;
    applyHighlight();
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.y < 0.62) { dir.y = 0.62; dir.normalize(); }
    const dist = THREE.MathUtils.clamp(Math.max(n.size.x, n.size.z) * 1.15 + 8, 13, 34) * (narrow() ? 1.3 : 1);
    flyTo(n.center.clone().add(dir.multiplyScalar(dist)), n.center.clone(), animate);
    if (notify && onSelect) onSelect(id);
  }

  function reset({ animate = true } = {}) {
    selected = null;
    userMoved = false;
    applyHighlight();
    flyTo(homePos(), HOME_TARGET.clone(), animate);
  }

  // ---------- picking (tap vs drag) ----------
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // meshes only (outline lines have a 1 m pick tolerance), and nothing hidden
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = raycaster.intersectObject(root, true).find((h) => h.object.isMesh && shown(h.object));
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) if (o.userData && o.userData.naming) return o.userData.naming;
    // furniture / walls: fall back to the footprint the hit point lies in
    let best = null, bestArea = Infinity;
    naming.forEach((n, id) => {
      const b = n.box;
      if (hit.point.x < b.min.x || hit.point.x > b.max.x || hit.point.z < b.min.z || hit.point.z > b.max.z) return;
      const area = (b.max.x - b.min.x) * (b.max.z - b.min.z);
      if (area < bestArea) { bestArea = area; best = id; }
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
  let hoverQueued = null;
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || down) return;
    if (hoverQueued) { hoverQueued = { x: e.clientX, y: e.clientY }; return; }
    hoverQueued = { x: e.clientX, y: e.clientY };
    requestAnimationFrame(() => { const q = hoverQueued; hoverQueued = null; setHover(pick(q.x, q.y)); });
  });
  canvas.addEventListener("pointerleave", () => setHover(null));

  // keep the view on the building
  controls.addEventListener("start", () => { userMoved = true; tween = null; });
  controls.addEventListener("change", () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, 0, FW);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, 0, FD + 2);
    controls.target.y = 0;
    dirty = true;
  });

  // ---------- size ----------
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = narrow() ? 40 : 32;
    camera.updateProjectionMatrix();
    if (!userMoved && !selected && !tween) { camera.position.copy(homePos()); controls.target.copy(HOME_TARGET); controls.update(); }
    dirty = true;
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- render loop (on demand, paused off screen) ----------
  const tmp = new THREE.Vector3();
  function place(el, v, w, h) {
    tmp.copy(v).project(camera);
    const visible = tmp.z < 1 && tmp.x > -1.1 && tmp.x < 1.1 && tmp.y > -1.1 && tmp.y < 1.1;
    el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
    el.style.visibility = visible ? "visible" : "hidden";
  }
  function updateOverlay() {
    const w = container.clientWidth, h = container.clientHeight;
    spots.forEach((el, id) => place(el, naming.get(id).hotspot, w, h));
    const close = camera.position.distanceTo(controls.target) < 36;
    spotsEl.classList.toggle("show-zones", close);
    if (close) zoneLabels.forEach((z) => place(z.el, z.pos, w, h));
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
    if (root.userData.canopy) root.userData.canopy.visible = camera.position.distanceTo(controls.target) >= 36;
    renderer.render(scene, camera);
    updateOverlay();
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
  // helpers
  // =====================================================================

  // Find each NAMING_* object, prepare its highlight and camera framing.
  // A NAMING_* name missing from a real model gets an invisible footprint
  // overlay from the data rectangle, so the opportunity stays selectable.
  function indexNaming(rootObj) {
    const map = new Map();
    data.opportunities.forEach((o) => {
      let obj = rootObj.getObjectByName(o.meshId);
      if (!obj) {
        obj = footprintOverlay(o);
        rootObj.add(obj);
      }
      obj.userData.naming = o.id;
      const overlay = obj.getObjectByName(`${o.meshId}_overlay`) || null;
      const outline = obj.getObjectByName(`${o.meshId}_outline`) || null;
      const materials = [];
      if (!overlay) {
        // real model: clone this space's materials once so it can glow alone
        obj.traverse((m) => {
          if (!m.isMesh) return;
          const own = (mat) => { const c = mat.clone(); if (!c.emissive) c.emissive = new THREE.Color(0); materials.push(c); return c; };
          m.material = Array.isArray(m.material) ? m.material.map(own) : own(m.material);
        });
      }
      obj.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3()).setY(0);
      // placeholder: marker from the data file; real model: above the space
      const hotspot = !(data.model && data.model.enabled) && o.hotspot
        ? new THREE.Vector3(o.hotspot.x, 1.7, o.hotspot.z)
        : new THREE.Vector3(center.x, Math.min(box.max.y, 3) + 0.5, center.z);
      map.set(o.id, { obj, overlay, outline, materials, box, size, center, hotspot });
    });
    return map;
  }

  function footprintOverlay(o) {
    const r = o.rect;
    const g = new THREE.Group();
    g.name = o.meshId;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(r.w - 0.24, r.d - 0.24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: HIGHLIGHT, transparent: true, opacity: 0, depthWrite: false })
    );
    plane.name = `${o.meshId}_overlay`;
    plane.position.set(r.x + r.w / 2, 0.058, r.z + r.d / 2);
    plane.renderOrder = 2;
    const i = 0.12;
    const pts = [[r.x + i, r.z + i], [r.x + r.w - i, r.z + i], [r.x + r.w - i, r.z + r.d - i], [r.x + i, r.z + r.d - i]]
      .map(([x, z]) => new THREE.Vector3(x, 0.07, z));
    const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: HIGHLIGHT, transparent: true, opacity: 1 }));
    outline.name = `${o.meshId}_outline`;
    outline.visible = false;
    g.add(plane, outline);
    return g;
  }

  async function loadModel(url) {
    const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/loaders/DRACOLoader.js"),
      import("three/addons/libs/meshopt_decoder.module.js"),
    ]);
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/");
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url);
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = !lowPower; } });
    return gltf.scene;
  }

  // ---------------------------------------------------------------------
  // PLACEHOLDER hospital floor (dollhouse cut-away: no ceilings, low
  // partitions). Static geometry is merged per material, so the whole
  // floor draws in ~25 calls; small details are skipped on phones.
  // ---------------------------------------------------------------------
  function buildPlaceholder() {
    const group = new THREE.Group();
    group.name = "HOSPITAL_Placeholder";
    const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...extra });
    const M = {
      slab: std(COLOR.slab, { roughness: 0.95 }),
      wall: std(COLOR.wall, { roughness: 0.9 }),
      wood: std(COLOR.wood, { roughness: 0.6 }),
      woodDark: std(COLOR.woodDark, { roughness: 0.6 }),
      white: std(COLOR.white, { roughness: 0.45 }),
      fabric: std(COLOR.fabric, { roughness: 0.95 }),
      fabricWarm: std(COLOR.fabricWarm, { roughness: 0.95 }),
      fabricBlue: std(COLOR.fabricBlue, { roughness: 0.95 }),
      metal: std(COLOR.metal, { roughness: 0.35, metalness: 0.6 }),
      dark: std(COLOR.dark, { roughness: 0.5 }),
      screen: std(COLOR.screen, { roughness: 0.25, metalness: 0.2 }),
      glass: std(COLOR.glass, { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.26, depthWrite: false }),
      curtain: std(COLOR.curtain, { roughness: 0.9, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
      plant: std(COLOR.plant, { roughness: 0.9, flatShading: true }),
      brass: std(COLOR.brass, { roughness: 0.35, metalness: 0.7 }),
      accent: std(COLOR.accent, { roughness: 0.6 }),
      accentSoft: std(COLOR.accentSoft, { roughness: 0.8 }),
      paving: std(COLOR.paving, { roughness: 1 }),
      light: std(COLOR.light, { emissive: COLOR.light, emissiveIntensity: 0.9 }),
    };
    const NO_SHADOW = new Set(["glass", "curtain", "light", "accent", "paving", "slab"]);

    // ---- merged static geometry ----
    const buckets = new Map(); // material key -> geometries
    const baseGeo = new Map();
    const geoFor = (spec) => {
      const key = spec.join("|");
      if (!baseGeo.has(key)) {
        const [type, a, b, c, d] = spec;
        baseGeo.set(key,
          type === "box" ? new THREE.BoxGeometry(a, b, c)
          : type === "cyl" ? new THREE.CylinderGeometry(a, b, c, d || 20)
          : type === "cylz" ? new THREE.CylinderGeometry(a, b, c, d || 28).rotateX(Math.PI / 2)
          : new THREE.SphereGeometry(a, 10, 8));
      }
      return baseGeo.get(key);
    };
    const B = (w, h, d, m, ox = 0, oy = 0, oz = 0, detail = false) => ({ spec: ["box", w, h, d], m, o: [ox, oy, oz], detail });
    const C = (rt, rb, h, m, ox = 0, oy = 0, oz = 0, detail = false) => ({ spec: ["cyl", rt, rb, h, 20], m, o: [ox, oy, oz], detail });
    const CZ = (r, len, m, ox = 0, oy = 0, oz = 0) => ({ spec: ["cylz", r, r, len, 28], m, o: [ox, oy, oz], detail: false });
    const S = (r, m, ox = 0, oy = 0, oz = 0, detail = false) => ({ spec: ["sph", r], m, o: [ox, oy, oz], detail });
    function put(parts, x, z, rot = 0) {
      parts.forEach((p) => {
        if (p.detail && lowPower) return;
        const g = geoFor(p.spec).clone();
        g.translate(p.o[0], p.o[1], p.o[2]);
        if (rot) g.rotateY(rot);
        g.translate(x, 0, z);
        if (!buckets.has(p.m)) buckets.set(p.m, []);
        buckets.get(p.m).push(g);
      });
    }
    const box = (w, h, d, m, x, y, z, rot = 0) => put([B(w, h, d, m, 0, y, 0)], x, z, rot);

    // ---- walls (cut-away heights) ----
    const T = 0.12, H_INT = 1.15, H_SIDE = 1.6, H_BACK = 2.4, H_FRONT = 1.0;
    const segments = (a0, a1, gaps) => {
      const out = [];
      let cur = a0;
      [...gaps].sort((p, q) => p[0] - q[0]).forEach(([g0, g1]) => {
        if (g0 > cur + 0.01) out.push([cur, g0]);
        cur = Math.max(cur, g1);
      });
      if (a1 > cur + 0.01) out.push([cur, a1]);
      return out;
    };
    const wallX = (x0, x1, z, h, gaps = [], m = "wall") =>
      segments(x0, x1, gaps).forEach(([a, b]) => box(b - a, h, T, m, (a + b) / 2, h / 2, z));
    const wallZ = (z0, z1, x, h, gaps = [], m = "wall") =>
      segments(z0, z1, gaps).forEach(([a, b]) => box(T, h, b - a, m, x, h / 2, (a + b) / 2));

    // ---- base slab, outside paving, zone floors ----
    box(FW + 1.2, 0.3, FD + 1.2, "slab", FW / 2, -0.15, FD / 2);
    box(14, 0.1, 5.5, "paving", 18, -0.05, FD + 2.9);

    const zoneGroups = new Map();
    data.zones.forEach((z) => {
      const zg = new THREE.Group();
      zg.name = z.mesh;
      zg.userData.zone = z.id;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(z.rect.w - 0.04, 0.05, z.rect.d - 0.04),
        std(FINISH[z.finish] || FINISH.stone, { roughness: 0.85 }));
      floor.position.set(z.rect.x + z.rect.w / 2, 0.025, z.rect.z + z.rect.d / 2);
      floor.receiveShadow = !lowPower;
      floor.name = `${z.mesh}_floor`;
      zg.add(floor);
      zoneGroups.set(z.id, zg);
      group.add(zg);
    });
    (data.serviceAreas || []).forEach((s) => {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(s.rect.w - 0.04, 0.05, s.rect.d - 0.04), std(FINISH.service, { roughness: 0.9 }));
      floor.position.set(s.rect.x + s.rect.w / 2, 0.025, s.rect.z + s.rect.d / 2);
      floor.receiveShadow = !lowPower;
      group.add(floor);
    });

    // naming footprints live inside their zone: ZONE_Lobby > NAMING_MainLobby
    data.opportunities.forEach((o) => (zoneGroups.get(o.zone) || group).add(footprintOverlay(o)));

    // exterior
    wallX(0, FW, 0, H_BACK);
    box(FW, 0.05, 0.1, "light", FW / 2, H_BACK + 0.02, 0.1);                 // cove light strip
    wallZ(0, FD, 0, H_SIDE);
    wallZ(0, FD, FW, H_SIDE);
    wallX(0, 10, FD, H_FRONT);
    wallX(26, FW, FD, H_FRONT);
    // glazed entrance facade (lobby) with mullions and a door opening
    [[10, 16], [20, 26]].forEach(([a, b]) => {
      box(b - a, 2.8, 0.05, "glass", (a + b) / 2, 1.45, FD);
      box(b - a, 0.08, 0.12, "dark", (a + b) / 2, 2.86, FD);
      for (let x = a; x <= b + 0.01; x += 2) box(0.06, 2.9, 0.1, "dark", x, 1.45, FD);
    });
    // entrance canopy + columns + sign band (own group: hidden when the camera
    // comes close, so it never blocks the lobby)
    const canopy = new THREE.Group();
    canopy.name = "ENTRANCE_Canopy";
    const cm = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !lowPower; canopy.add(m); };
    cm(new THREE.BoxGeometry(7.6, 0.18, 3.4), M.white, 18, 3.3, FD + 1.7);
    cm(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 16), M.metal, 14.6, 1.6, FD + 3.1);
    cm(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 16), M.metal, 21.4, 1.6, FD + 3.1);
    cm(new THREE.BoxGeometry(3.2, 0.36, 0.06), M.accent, 18, 3.62, FD + 3.42);
    group.add(canopy);
    group.userData.canopy = canopy;

    // corridor (wayfinding spine): north wall with doors, south wall open to public areas
    wallX(0, FW, 12, H_INT, [
      [1.2, 2.3], [4.7, 5.8], [8.2, 9.3], [11.7, 12.8],     // patient rooms
      [15.2, 16.3], [19.2, 20.3],                          // consultation
      [24.6, 26.4], [32.0, 33.8], [39.4, 41.6],            // imaging, MRI, recovery
    ]);
    wallX(0, FW, 15, H_INT, [[1, 9], [10.6, 29], [31, 33], [38.5, 40.5]]);
    box(FW - 0.6, 0.012, 0.16, "accent", FW / 2, 0.058, 13.5);                // floor wayfinding line

    // back row partitions
    wallX(0, 22, 4, H_INT, [[10.6, 12.2], [19.8, 21.4]]);
    [3.5, 7, 10.5, 18].forEach((x) => wallZ(4, 12, x, H_INT));
    wallZ(4, 12, 14, H_INT);
    [22, 30, 37].forEach((x) => wallZ(0, 12, x, H_INT));
    wallX(37, FW, 6, H_INT, [[40, 42]]);
    // control rooms (glass)
    wallX(22, 24.6, 9, 2.2, [], "glass");
    wallZ(9, 12, 24.6, 2.2, [[10.1, 11.1]], "glass");
    wallX(30, 33.4, 8.6, 2.2, [], "glass");
    wallZ(8.6, 12, 33.4, 2.2, [[9.6, 10.6]], "glass");

    // front row partitions
    wallZ(22.5, FD, 10, H_INT);
    wallZ(15, 17.5, 29, H_INT);
    wallZ(25.5, FD, 29, H_INT);
    wallZ(15, FD, 36.5, H_INT, [[20, 21.2]]);

    // ---- furniture (bright, simplified) ----
    const BED = [B(0.95, 0.45, 2.05, "white", 0, 0.225, 0), B(0.9, 0.14, 1.95, "fabricBlue", 0, 0.52, 0.02),
      B(0.95, 0.8, 0.06, "wood", 0, 0.6, -1.0), B(0.6, 0.08, 0.32, "white", 0, 0.63, -0.76, true)];
    const SIDE = [B(0.45, 0.6, 0.45, "wood", 0, 0.3, 0)];
    const ARMCHAIR = [B(0.72, 0.42, 0.72, "fabricWarm", 0, 0.21, 0), B(0.72, 0.42, 0.14, "fabricWarm", 0, 0.63, -0.29)];
    const SEAT = [B(0.52, 0.08, 0.5, "fabric", 0, 0.45, 0), B(0.52, 0.42, 0.06, "fabric", 0, 0.7, -0.22), B(0.46, 0.41, 0.04, "metal", 0, 0.205, 0, true)];
    const SOFA = [B(2, 0.42, 0.85, "fabricWarm", 0, 0.21, 0), B(2, 0.4, 0.18, "fabricWarm", 0, 0.62, -0.335),
      B(0.16, 0.56, 0.85, "fabricWarm", -0.92, 0.28, 0), B(0.16, 0.56, 0.85, "fabricWarm", 0.92, 0.28, 0)];
    const COFFEE = [B(1.1, 0.36, 0.6, "wood", 0, 0.18, 0)];
    const DESK = [B(1.6, 0.05, 0.75, "wood", 0, 0.735, 0), B(0.45, 0.71, 0.7, "white", 0.55, 0.355, 0),
      B(0.04, 0.71, 0.7, "white", -0.76, 0.355, 0), B(0.5, 0.32, 0.03, "screen", -0.2, 0.92, -0.25, true)];
    const CHAIR = [B(0.48, 0.06, 0.48, "dark", 0, 0.46, 0), B(0.48, 0.45, 0.05, "dark", 0, 0.72, -0.21), C(0.03, 0.03, 0.43, "metal", 0, 0.215, 0, true)];
    const COUCH = [B(0.66, 0.55, 1.9, "white", 0, 0.275, 0), B(0.62, 0.1, 1.85, "accentSoft", 0, 0.6, 0)];
    const PLANT = [C(0.26, 0.2, 0.5, "white", 0, 0.25, 0), S(0.48, "plant", 0, 0.95, 0)];
    const TOTEM = [B(0.5, 1.9, 0.12, "dark", 0, 0.95, 0), B(0.5, 0.14, 0.13, "accent", 0, 1.72, 0),
      B(0.36, 0.04, 0.13, "white", 0, 1.35, 0, true), B(0.36, 0.04, 0.13, "white", 0, 1.2, 0, true)];
    const TABLE = [B(1.6, 0.05, 0.6, "white", 0, 0.735, 0), B(1.5, 0.7, 0.04, "metal", 0, 0.36, -0.26)];
    const RECEPTION = [B(5, 1.05, 0.9, "wood", 0, 0.525, 0), B(5.1, 0.04, 1.0, "white", 0, 1.07, 0), B(4.6, 0.7, 0.03, "accent", 0, 0.5, 0.46)];
    const NURSE = [B(6, 1.05, 0.8, "wood", 0, 0.525, 0), B(6.1, 0.04, 0.9, "white", 0, 1.07, 0)];
    const KITCHEN = [B(3, 0.9, 0.6, "white", 0, 0.45, 0), B(3, 0.04, 0.62, "wood", 0, 0.92, 0)];
    const BENCH = [B(2.2, 0.44, 0.5, "wood", 0, 0.22, 0)];
    const MRI = [B(2.3, 2.2, 1.5, "white", 0, 1.1, 0), CZ(0.46, 1.54, "dark", 0, 1.0, 0), CZ(0.62, 0.04, "accent", 0, 1.0, 0.77),
      B(0.62, 0.72, 2.3, "white", 0, 0.36, 1.9), B(0.56, 0.08, 2.2, "accentSoft", 0, 0.76, 1.9)];
    const XRAY = [B(0.9, 0.8, 2.2, "white", 0, 0.4, 0), B(0.86, 0.06, 2.1, "accentSoft", 0, 0.83, 0),
      B(0.24, 2.4, 0.24, "metal", -1.0, 1.2, 0), B(1.15, 0.12, 0.24, "metal", -0.45, 2.2, 0), B(0.42, 0.32, 0.42, "white", 0.1, 1.98, 0)];
    const DETECTOR = [B(0.6, 1.9, 0.14, "white", 0, 0.95, 0), B(0.5, 0.5, 0.03, "dark", 0, 1.3, 0.08)];
    const TRAUMA = [...BED, B(0.32, 2.5, 0.32, "metal", -1.15, 1.25, -0.6), B(0.7, 0.45, 0.08, "screen", -1.15, 1.75, -0.38),
      B(1.1, 0.1, 0.12, "metal", -0.6, 2.45, -0.6), C(0.42, 0.42, 0.08, "white", 0, 2.38, -0.6), B(0.6, 0.95, 0.5, "white", 1.25, 0.475, -0.6)];
    const CURTAIN = [B(0.02, 1.9, 2.3, "curtain", 0, 0.95, 0)];
    const SCREEN = [B(2.4, 1.35, 0.06, "screen", 0, 1.55, 0)];
    const FEATURE = [B(6.5, 2.4, 0.18, "woodDark", 0, 1.2, 0), B(3.6, 0.1, 0.03, "accent", 0, 1.85, 0.1)];

    // nurse station / service strip
    put(NURSE, 6, 2.2);
    put(CHAIR, 4.6, 1.3); put(CHAIR, 7.4, 1.3);
    box(3, 2.0, 0.6, "white", 17, 1.0, 0.45);
    box(2.2, 2.0, 0.6, "white", 12.6, 1.0, 0.45);

    // patient rooms
    for (let i = 0; i < 4; i++) {
      const x0 = i * 3.5;
      put(BED, x0 + 1.75, 5.35);
      put(SIDE, x0 + 0.55, 4.5);
      put(ARMCHAIR, x0 + 2.8, 7.6, -Math.PI / 2);
      box(1.0, 2.0, 0.5, "wood", x0 + 2.4, 1.0, 11.6);           // wardrobe by the door
    }
    // consultation rooms
    for (let j = 0; j < 2; j++) {
      const x0 = 14 + j * 4;
      put(DESK, x0 + 2.1, 6.2);
      put(CHAIR, x0 + 2.1, 5.4);
      put(CHAIR, x0 + 1.6, 7.3, Math.PI); put(CHAIR, x0 + 2.6, 7.3, Math.PI);
      put(COUCH, x0 + 0.6, 9.7);
      put(SIDE, x0 + 3.5, 11.4);
    }
    // diagnostic imaging
    put(XRAY, 27, 4.4);
    put(DETECTOR, 27, 0.45);
    put(COUCH, 29.2, 9.6);
    put(DESK, 23.3, 10.5, Math.PI / 2);
    put(CHAIR, 24.0, 10.5, -Math.PI / 2);
    // MRI suite
    put(MRI, 34.2, 2.6);
    put(DESK, 31.7, 10.9, Math.PI);
    put(CHAIR, 31.7, 11.5, Math.PI);
    // trauma / resuscitation
    put(TRAUMA, 40.5, 2.8);
    // preparation & recovery bays
    [38.3, 40.6, 42.9].forEach((x) => { put(BED, x, 7.45); });
    [39.45, 41.75].forEach((x) => put(CURTAIN, x, 7.5));
    // corridor signage
    [5.2, 34.2].forEach((x) => put(TOTEM, x, 14.45));
    // waiting area
    [[18.6, 0], [19.25, Math.PI], [22.8, 0], [23.45, Math.PI]].forEach(([z, r]) => {
      for (let x = 1.7; x <= 8.4; x += 0.6) put(SEAT, x, z, r);
    });
    put(COFFEE, 5, 26.3);
    [[1.0, 27.0], [9.0, 27.0], [9.2, 16.1]].forEach(([x, z]) => put(PLANT, x, z));
    // main lobby
    put(FEATURE, 18, 15.6);
    put(RECEPTION, 18, 17.7);
    [12.9, 23.1].forEach((x) => {
      put(SOFA, x, 22.0); put(SOFA, x, 25.0, Math.PI); put(COFFEE, x, 23.5);
    });
    [[11, 27.1], [25, 27.1], [11, 16.2], [25, 16.2]].forEach(([x, z]) => put(PLANT, x, z));
    box(4, 0.012, 1.6, "dark", 18, 0.058, 27.1);                                // entrance mat
    put(TOTEM, 15.4, 26.4);
    // donor recognition wall (faces the lobby)
    box(0.3, 2.6, 7, "wood", 28.85, 1.3, 21.5);
    box(0.04, 0.12, 6.4, "brass", 28.68, 2.35, 21.5);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 15; c++) put([B(0.02, 0.16, 0.3, "brass", 0, 0.95 + r * 0.3, 0, true)], 28.69, 18.56 + c * 0.42);
    }
    put(BENCH, 27.2, 21.5, Math.PI / 2);
    put(PLANT, 27.3, 16.4);
    // family lounge
    put(SOFA, 32.2, 19.6); put(SOFA, 32.2, 23.2, Math.PI); put(COFFEE, 32.2, 21.4);
    put(ARMCHAIR, 34.6, 21.4, -Math.PI / 2);
    put(KITCHEN, 35.9, 25.6, -Math.PI / 2);
    put(PLANT, 30.0, 27.1);
    // education / learning room
    put(SCREEN, 40.25, 15.16);
    [18.0, 20.6, 23.2].forEach((z) => {
      [38.7, 41.8].forEach((x) => {
        put(TABLE, x, z, Math.PI);
        put(CHAIR, x - 0.42, z + 0.62, Math.PI); put(CHAIR, x + 0.42, z + 0.62, Math.PI);
      });
    });
    put(PLANT, 43.3, 27.1);

    // ---- merge per material ----
    const statics = new THREE.Group();
    statics.name = "STRUCTURE_AND_FURNITURE";
    buckets.forEach((geos, key) => {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, M[key]);
      mesh.name = `merged-${key}`;
      mesh.castShadow = !lowPower && !NO_SHADOW.has(key);
      mesh.receiveShadow = !lowPower && key !== "glass" && key !== "light";
      if (key === "glass" || key === "curtain") mesh.renderOrder = 3;
      statics.add(mesh);
    });
    baseGeo.forEach((g) => g.dispose());
    group.add(statics);
    return group;
  }
}
