/*
 * Hospital naming opportunities — 3D scene (ES module, lazy-loaded by naming-app.js).
 *
 * Model source
 *   - data.model.enabled === true  -> loads data.model.url (.glb / .gltf; Draco and
 *                                     Meshopt compression supported)
 *   - otherwise                    -> PROCEDURAL floor built here: architecture
 *                                     from the zone rectangles in
 *                                     assets/data/hospital-naming.json, detailed
 *                                     furniture / equipment from hospital-equipment.js
 *   Rendering: shared kit assets/js/shared-3d/archviz.js (image-based light, soft
 *   shadows, canvas textures, geometry baked per material).
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
// same ?v= for every module of this scene (shared kit: assets/js/shared-3d/archviz.js)
const V = new URL(import.meta.url).search;
const K = await import(`/assets/js/shared-3d/archviz.js${V}`);
const { defineHospitalModels } = await import(`./hospital-equipment.js${V}`);

// bright healthcare palette: warm whites, light oak, sage and teal accents, brushed metal
const HOSPITAL_MATS = {
  white:       { color: 0xf7f6f3, roughness: 0.45 },
  wood:        { color: 0xc49b6c, roughness: 0.55 },
  woodDark:    { color: 0x8a6747, roughness: 0.55 },
  stone:       { color: 0xeeebe5, roughness: 0.3 },
  fabric:      { color: 0x9fb8b0, roughness: 0.95 },
  fabricWarm:  { color: 0xcdbca5, roughness: 0.95 },
  fabricLight: { color: 0xe4dccf, roughness: 0.95 },
  fabricBlue:  { color: 0xa9c1d1, roughness: 0.95 },
  fabricDark:  { color: 0x3f4549, roughness: 0.9 },
  metal:       { color: 0xb8bec2, roughness: 0.3, metalness: 0.75 },
  chrome:      { color: 0xe4e7ea, roughness: 0.16, metalness: 1 },
  dark:        { color: 0x3d4347, roughness: 0.5, metalness: 0.2 },
  screen:      { color: 0x0a1014, roughness: 0.2, emissive: 0x2e6f78, emissiveIntensity: 0.7 },
  screenOff:   { color: 0x15191c, roughness: 0.15, metalness: 0.3 },
  screenLight: { color: 0x0a1014, roughness: 0.2, emissive: 0xd8efe9, emissiveIntensity: 0.55 },
  glass:       { color: 0xd3e8ee, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false },
  curtain:     { color: 0xb4d6d0, roughness: 0.9, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false },
  mirror:      { color: 0xa7b3ba, roughness: 0.05, metalness: 1 },
  leaf:        { color: 0x5f8a5a, roughness: 0.75 },
  trunk:       { color: 0x6b5442, roughness: 0.9 },
  soil:        { color: 0x4a3f36, roughness: 1 },
  brass:       { color: 0xc9a668, roughness: 0.32, metalness: 0.8 },
  accent:      { color: 0x3f8f85, roughness: 0.55 },
  accentSoft:  { color: 0xc5e0db, roughness: 0.8 },
  accentRed:   { color: 0xc4473c, roughness: 0.5 },
  lightWarm:   { color: 0x000000, emissive: 0xffe2bd, emissiveIntensity: 1.8 },
  lightTeal:   { color: 0x000000, emissive: 0x7fd6c8, emissiveIntensity: 1.8 },
  matDark:     { color: 0x4a4d50, roughness: 1 },
  rug:         { color: 0xffffff, roughness: 1, map: "rugLight" },
  glassBlue:   { color: 0x9fd0e0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false },
  planterStone:{ color: 0xb9b2a6, roughness: 0.85 },
  leafLight:   { color: 0x7fa36f, roughness: 0.75 },
  sage:        { color: 0xb7c9bf, roughness: 0.9 },
};
// fictional demonstration project: the name used on all signage in the model
const CENTER_NAME = "CENTRO MÉDICO GRANADA";
const HIGHLIGHT = 0x3f8f85;

export async function createNamingScene({ container, spotsEl, data, reducedMotion = false, ariaLabel = "", onSelect }) {
  const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const { width: FW, depth: FD } = data.floor;

  // ---------- renderer ----------
  const renderer = K.createRenderer({ lowPower, exposure: 1.0, className: "hnaming__canvas" });
  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", ariaLabel);
  container.insertBefore(canvas, container.firstChild);
  const TEX = K.makeTextures(renderer, 5);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.3, 400);
  // elevated three-quarter view from the entrance side; distance fitted to the building
  const HOME_TARGET = new THREE.Vector3(FW / 2, 0, FD / 2 + 1.0);
  const narrow = () => camera.aspect < 1.2; // phones: square viewport
  const homeDir = () => (narrow() ? new THREE.Vector3(0.16, 0.86, 0.5) : new THREE.Vector3(0.3, 0.7, 0.66)).normalize();
  let homeDist = 60;
  const homePos = () => HOME_TARGET.clone().addScaledVector(homeDir(), homeDist);
  const corners = [];
  [0, FW].forEach((x) => [0, FD + 4.6].forEach((z) => [0, 3.0].forEach((y) => corners.push(new THREE.Vector3(x, y, z)))));
  camera.position.copy(homePos());

  // ---------- lights: image-based daylight + one soft shadowed sun ----------
  K.setupLighting(renderer, scene, {
    center: new THREE.Vector3(FW / 2, 0, FD / 2), span: Math.hypot(FW, FD),
    hemi: [0xffffff, 0xcfc4b3, 0.75], key: 0xfff1e0, keyIntensity: 2.7, keyFrom: [-0.45, 1, 0.6], fill: [0xdbe8ff, 0.3],
  });

  // ---------- controls: orbit, zoom, pan with limits ----------
  // the wheel scrolls the page until the visitor engages with the model (click
  // or drag inside it); a pinch (ctrl + wheel) always zooms
  let engaged = false;
  canvas.addEventListener("wheel", (e) => { if (!engaged && !e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });
  canvas.addEventListener("pointerdown", () => { engaged = true; });
  container.addEventListener("pointerleave", () => { engaged = false; });

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME_TARGET);
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.minDistance = 9;
  controls.maxDistance = 110;
  controls.minPolarAngle = 0.2;        // never straight down...
  controls.maxPolarAngle = 1.15;       // ...nor at floor level
  controls.minAzimuthAngle = -1.25;    // keep the entrance side towards the viewer
  controls.maxAzimuthAngle = 1.25;
  controls.screenSpacePanning = false; // pan along the floor
  controls.update();

  // ---------- model ----------
  // signage is drawn with the site font: wait for it (max 1.5 s)
  if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('600 64px "Inter"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
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
        n.overlay.material.opacity = isSel ? 0.09 : isHover ? 0.06 : selected ? 0 : 0.03;
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
    const dist = Math.min(THREE.MathUtils.clamp(Math.max(n.size.x, n.size.z) * 1.45 + 9, 14, 40) * (narrow() ? 1.15 : 1), homeDist * 0.56);
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
    // nearest footprint volume (floor to 1.2 m) hit by the ray; equipment,
    // ceiling lights and signage never stand in the way of a room
    let best = null, bestD = Infinity;
    const hit = new THREE.Vector3();
    naming.forEach((n, id) => {
      if (!raycaster.ray.intersectBox(n.pickBox, hit)) return;
      const d = hit.distanceToSquared(raycaster.ray.origin);
      if (d < bestD) { bestD = d; best = id; }
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
    homeDist = K.fitDistance(camera, HOME_TARGET, homeDir(), corners, 0.98, 0.94);
    controls.maxDistance = Math.max(homeDist * 1.3, 40);
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
    const close = camera.position.distanceTo(controls.target) < homeDist * 0.62;
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
    const far = camera.position.distanceTo(controls.target) >= homeDist * 0.62;
    // the canopy carries the centre's name: it only steps aside for very close views
    if (root.userData.canopy) root.userData.canopy.visible = camera.position.distanceTo(controls.target) >= homeDist * 0.35;
    if (root.userData.ceiling) root.userData.ceiling.visible = far;
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
      const pickBox = new THREE.Box3(new THREE.Vector3(box.min.x, Math.min(box.min.y, 0), box.min.z), new THREE.Vector3(box.max.x, Math.max(box.min.y, 0) + 1.2, box.max.z));
      map.set(o.id, { obj, overlay, outline, materials, box, size, center, hotspot, pickBox });
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
  // PROCEDURAL hospital floor (dollhouse cut-away: no ceilings, low
  // partitions). Detailed furniture and medical equipment from
  // hospital-equipment.js; everything is baked per material, so the whole
  // floor draws in a few dozen calls.
  // ---------------------------------------------------------------------
  // canvas text for architectural signage (letter-spaced, uppercase)
  function signTexture(text, { color = "#fff", bg = null, accent = null, weight = 600, size = 80, spacing = 0.2, w = 2048, h = 160 } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    let pad = 0;
    if (accent) { g.fillStyle = accent; g.fillRect(h * 0.32, h * 0.32, h * 0.36, h * 0.36); g.fillStyle = bg || "#000"; g.fillRect(h * 0.47, h * 0.38, h * 0.06, h * 0.24); g.fillRect(h * 0.38, h * 0.47, h * 0.24, h * 0.06); pad = h * 0.45; }
    g.fillStyle = color;
    g.textBaseline = "middle";
    let fs = size;
    const measure = () => { g.font = `${weight} ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`; let t = 0; for (const ch of text) t += g.measureText(ch).width + fs * spacing; return t - fs * spacing; };
    while (measure() > w - pad - h * 0.5 && fs > 10) fs -= 2;
    let x = (w + pad - measure()) / 2;
    for (const ch of text) { g.fillText(ch, x, h / 2 + fs * 0.04); x += g.measureText(ch).width + fs * spacing; }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  function buildPlaceholder() {
    const group = new THREE.Group();
    group.name = "HOSPITAL_Placeholder";
    const kit = K.createModelKit();
    defineHospitalModels(kit);
    const MAT = K.createMaterials(TEX, HOSPITAL_MATS);
    const plain = (hex, roughness = 0.85) => K.surfaceMat(TEX, null, { color: hex, roughness });
    const add = (geo, mat, { cast = true, receive = true, order = 0 } = {}) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast && !lowPower;
      m.receiveShadow = receive && !lowPower;
      if (order) m.renderOrder = order;
      group.add(m);
      return m;
    };

    // ---- plinth, soft contact shadow, street paving ----
    const plinth = new THREE.BoxGeometry(FW + 1.4, 0.4, FD + 6.6);
    plinth.translate(FW / 2, -0.2, FD / 2 + 2.6);
    add(plinth, plain(0xc4bcb0, 0.95), { cast: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FW * 1.8, FD * 2.2), new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false, opacity: 0.5 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(FW / 2, -0.41, FD / 2 + 2.6);
    group.add(shadow);
    const pave = new THREE.PlaneGeometry(FW + 1.4, 5.6).rotateX(-Math.PI / 2);
    pave.translate(FW / 2, 0.002, FD + 2.8);
    add(pave, K.surfaceMat(TEX, "concreteLight", { roughness: 0.9, repeat: [(FW + 1.4) / 4, 5.6 / 4] }), { cast: false });

    // ---- zone floors (textured finishes) ----
    const FLOOR = { stone: ["terrazzo", 3, 0.3], wood: ["oakLight", 2.4, 0.5], warm: ["vinylWarm", 2, 0.45], clinical: ["vinyl", 2, 0.35], corridor: ["vinyl", 2, 0.35], service: ["tileWhite", 2.4, 0.4] };
    const zoneGroups = new Map();
    const floorOf = (rect, finish) => {
      const [tex, tile, rough] = FLOOR[finish] || FLOOR.stone;
      const m = K.surfaceMat(TEX, tex, { roughness: rough, repeat: [rect.w / tile, rect.d / tile] });
      const g = new THREE.PlaneGeometry(rect.w - 0.02, rect.d - 0.02).rotateX(-Math.PI / 2);
      g.translate(rect.x + rect.w / 2, 0.004, rect.z + rect.d / 2);
      const mesh = new THREE.Mesh(g, m);
      mesh.receiveShadow = !lowPower;
      return mesh;
    };
    data.zones.forEach((z) => {
      const zg = new THREE.Group();
      zg.name = z.mesh;
      zg.userData.zone = z.id;
      const floor = floorOf(z.rect, z.finish);
      floor.name = `${z.mesh}_floor`;
      zg.add(floor);
      zoneGroups.set(z.id, zg);
      group.add(zg);
    });
    (data.serviceAreas || []).forEach((s) => group.add(floorOf(s.rect, "service")));
    // naming footprints live inside their zone: ZONE_Lobby > NAMING_MainLobby
    data.opportunities.forEach((o) => (zoneGroups.get(o.zone) || group).add(footprintOverlay(o)));

    // ---- walls (cut-away heights) with caps, skirting and glazed partitions ----
    const T = 0.14, H_INT = 1.3, H_FAR = 3.0, H_NEAR = 1.3, H_BACK = 3.0, H_FRONT = 1.0;
    const walls = [], caps = [], glassG = [], mull = [], leds = [], skirt = [];
    const segments = (a0, a1, gaps) => {
      const out = [];
      let cur = a0;
      [...gaps].sort((p, q) => p[0] - q[0]).forEach(([g0, g1]) => { if (g0 > cur + 0.01) out.push([cur, g0]); cur = Math.max(cur, g1); });
      if (a1 > cur + 0.01) out.push([cur, a1]);
      return out;
    };
    const wall = (a, b, h) => {
      walls.push(K.segment(a, b, h, T));
      caps.push(K.segment(a, b, 0.025, T + 0.02, h));
      skirt.push(K.segment(a, b, 0.08, T + 0.02, 0));
    };
    const wallX = (x0, x1, z, h, gaps = []) => segments(x0, x1, gaps).forEach(([a, b]) => wall([a, z], [b, z], h));
    const wallZ = (z0, z1, x, h, gaps = []) => segments(z0, z1, gaps).forEach(([a, b]) => wall([x, a], [x, b], h));
    const glass = (a, b, h, gaps = []) => {
      const horiz = a[1] === b[1];
      const a0 = horiz ? a[0] : a[1], a1 = horiz ? b[0] : b[1];
      segments(a0, a1, gaps).forEach(([p, q]) => {
        const A = horiz ? [p, a[1]] : [a[0], p], Bp = horiz ? [q, a[1]] : [a[0], q];
        glassG.push(K.segment(A, Bp, h - 0.08, 0.02, 0.04));
        mull.push(K.segment(A, Bp, 0.05, 0.07, 0), K.segment(A, Bp, 0.06, 0.07, h - 0.06));
        const len = q - p, n = Math.max(1, Math.round(len / 1.2));
        for (let i = 0; i <= n; i++) {
          const t = p + (len * i) / n;
          const g = new THREE.BoxGeometry(0.05, h, 0.06);
          g.translate(horiz ? t : a[0], h / 2, horiz ? a[1] : t);
          mull.push(g);
        }
      });
    };

    // exterior
    // perimeter with window bands (sill 0.9 m, head 2.5 m) where rooms have daylight
    const windowed = (a, b, h, t = T) => {
      walls.push(K.segment(a, b, 0.9, t), K.segment(a, b, h - 2.5, t, 2.5));
      caps.push(K.segment(a, b, 0.025, t + 0.02, h));
      skirt.push(K.segment(a, b, 0.08, t + 0.02, 0));
      glassG.push(K.segment(a, b, 1.6, 0.02, 0.9));
      mull.push(K.segment(a, b, 0.05, t + 0.02, 0.9), K.segment(a, b, 0.05, t + 0.02, 2.45));
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 1.5));
      for (let i = 0; i <= n; i++) {
        const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n;
        const g = new THREE.BoxGeometry(0.06, 1.6, 0.06); g.translate(x, 1.7, z); mull.push(g);
      }
    };
    windowed([0, 0], [22, 0], H_BACK);
    wallX(22, FW, 0, H_BACK);
    leds.push(K.segment([0, 0.1], [FW, 0.1], 0.04, 0.04, H_BACK - 0.2));
    windowed([0, 0], [0, 12], H_FAR);
    wallZ(12, 15, 0, H_FAR);
    windowed([0, 15], [0, FD], H_FAR);
    wallZ(0, FD, FW, H_NEAR);
    leds.push(K.segment([0.1, 0], [0.1, FD], 0.04, 0.04, H_FAR - 0.2));
    wallX(0, 10, FD, H_FRONT);
    wallX(26, FW, FD, H_FRONT);
    glass([10, FD], [26, FD], 2.9, [[16, 20]]);
    glass([16, FD], [20, FD], 2.9);                  // automatic doors
    mull.push(K.segment([16, FD], [20, FD], 0.22, 0.12, 2.68));

    // corridor (wayfinding spine): north wall with doors, south wall open to public areas
    wallX(0, FW, 12, H_INT, [[1.2, 2.3], [4.7, 5.8], [8.2, 9.3], [11.7, 12.8], [15.2, 16.3], [19.2, 20.3], [24.6, 26.4], [32.0, 33.8], [39.4, 41.6]]);
    wallX(0, FW, 15, H_INT, [[1, 9], [10.6, 29], [31, 33], [38.5, 40.5]]);
    // back row partitions
    wallX(0, 22, 4, H_INT, [[10.6, 12.2], [19.8, 21.4]]);
    [3.5, 7, 10.5, 18].forEach((x) => wallZ(4, 12, x, H_INT));
    wallZ(4, 12, 14, H_INT);
    [22, 30, 37].forEach((x) => wallZ(0, 12, x, H_INT));
    wallX(37, FW, 6, H_INT, [[40, 42]]);
    // control rooms (glass)
    glass([22, 9], [24.6, 9], 2.2);
    glass([24.6, 9], [24.6, 12], 2.2, [[10.1, 11.1]]);
    glass([30, 8.6], [33.4, 8.6], 2.2);
    glass([33.4, 8.6], [33.4, 12], 2.2, [[9.6, 10.6]]);
    // front row partitions
    wallZ(22.5, FD, 10, H_INT);
    wallZ(15, 17.5, 29, H_INT);
    wallZ(25.5, FD, 29, H_INT);
    wallZ(15, FD, 36.5, H_INT, [[20, 21.2]]);

    add(K.mergeGeometries(walls), plain(0xf6f3ee, 0.9));
    add(K.mergeGeometries(caps), plain(0xd9d3c9, 0.8), { cast: false });
    add(K.mergeGeometries(skirt), MAT.shared("woodDark"), { cast: false });
    add(K.mergeGeometries(glassG), MAT.shared("glass"), { cast: false, receive: false, order: 3 });
    add(K.mergeGeometries(mull), MAT.shared("dark"));
    add(K.mergeGeometries(leds), MAT.shared("lightWarm"), { cast: false, receive: false });
    // corridor wayfinding line
    const line = new THREE.BoxGeometry(FW - 0.6, 0.008, 0.14); line.translate(FW / 2, 0.01, 13.5);
    add(line, MAT.shared("accent"), { cast: false });

    // accent finishes: sage paint behind the beds, oak panels in the consultation rooms
    const sageG = [], oakG = [];
    sageG.push(K.segment([0.1, 4.09], [13.9, 4.09], H_INT - 0.05, 0.02));
    oakG.push(K.segment([14.1, 4.09], [21.9, 4.09], H_INT - 0.05, 0.02));
    [38.3, 40.6, 42.9].forEach((x) => sageG.push(K.segment([x - 1.0, 6.08], [x + 1.0, 6.08], H_INT - 0.05, 0.02)));
    add(K.mergeGeometries(sageG), MAT.shared("sage"), { cast: false });
    add(K.mergeGeometries(oakG), MAT.shared("wood"), { cast: false });

    // corridor handrails (both walls, broken at the doors)
    const rails = [];
    const railX = (x0, x1, z, gaps) => segments(x0, x1, gaps).forEach(([a, b]) => {
      if (b - a < 0.6) return;
      const g = new THREE.CylinderGeometry(0.025, 0.025, b - a - 0.2, 10).rotateZ(Math.PI / 2);
      g.translate((a + b) / 2, 0.9, z);
      rails.push(g);
    });
    railX(0, FW, 12.12, [[1.2, 2.3], [4.7, 5.8], [8.2, 9.3], [11.7, 12.8], [15.2, 16.3], [19.2, 20.3], [24.6, 26.4], [32.0, 33.8], [39.4, 41.6]]);
    railX(0, FW, 14.88, [[1, 9], [10.6, 29], [31, 33], [38.5, 40.5]]);
    add(K.mergeGeometries(rails), MAT.shared("wood"), { cast: false });

    // suspended ceiling luminaires (the roof is removed): hidden in close-ups
    const ceil = [], ceilFrame = [];
    const lum = (a, b, y = 2.85) => { ceil.push(K.segment(a, b, 0.03, 0.12, y)); ceilFrame.push(K.segment(a, b, 0.05, 0.16, y + 0.03)); };
    lum([0.8, 13.5], [43.2, 13.5]);
    [[1.4, 17.6], [1.4, 21.0], [1.4, 25.2]].forEach(([x, z]) => lum([x, z], [x + 7.2, z]));
    [[38, 17.0], [38, 19.6], [38, 22.2], [38, 24.8]].forEach(([x, z]) => lum([x, z], [x + 5.4, z]));
    [[1.75, 8.6], [5.25, 8.6], [8.75, 8.6], [12.25, 8.6]].forEach(([x, z]) => lum([x - 0.5, z], [x + 0.5, z]));
    [[16, 8], [20, 8]].forEach(([x, z]) => lum([x - 0.7, z], [x + 0.7, z]));
    const ringG = [];
    [[12.9, 23.5], [23.1, 23.5], [18, 20.6]].forEach(([x, z], i) => {
      const r = i === 2 ? 1.6 : 1.1;
      const t = new THREE.TorusGeometry(r, 0.035, 8, 48).rotateX(Math.PI / 2); t.translate(x, 3.0, z); ringG.push(t);
    });
    const ceiling = new THREE.Group();
    ceiling.name = "CEILING_Lights";
    const cMesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); ceiling.add(m); };
    cMesh(K.mergeGeometries(ceil), MAT.shared("lightWarm"));
    cMesh(K.mergeGeometries(ceilFrame), MAT.shared("white"));
    cMesh(K.mergeGeometries(ringG), MAT.shared("lightWarm"));
    group.add(ceiling);
    group.userData.ceiling = ceiling;

    // ---- signage: CENTRO MÉDICO GRANADA (fictional demonstration project) ----
    const signMat = (canvasTex, { transparent = false, glow = 0.6 } = {}) => {
      const m = new THREE.MeshStandardMaterial({ map: canvasTex, roughness: 0.5, metalness: 0.1, transparent, alphaTest: transparent ? 0.4 : 0 });
      m.emissive = new THREE.Color(0xffffff); m.emissiveMap = canvasTex; m.emissiveIntensity = glow;
      return m;
    };
    const signPlane = (w, h, mat, x, y, z, ry = 0, parent = group) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
    };
    // reception wall: brass letters on a dark band
    signPlane(4.3, 0.42, signMat(signTexture(CENTER_NAME, { color: "#d8b77a", bg: null, weight: 600, size: 92, spacing: 0.22, h: 160 }), { transparent: true, glow: 0.35 }), 18, 2.05, 15.6 + 0.165);
    // wayfinding blade signs over the corridor doors (zone names, localized)
    const zname = (id) => (data.zones.find((z) => z.id === id) || {}).name || "";
    [[7, "patientrooms"], [18, "consultation"], [26, "imaging"], [33.5, "mri"], [40.5, "recovery"]].forEach(([x, id]) => {
      const tex = signTexture(zname(id).toUpperCase(), { color: "#ffffff", bg: "#2f3b3a", accent: "#5fb3a6", weight: 600, size: 64, spacing: 0.16, h: 140, w: 1400 });
      const sm = signMat(tex, { glow: 0.5 });
      signPlane(2.2, 0.22, sm, x, 2.45, 13.5 + 0.02);
      const back = signPlane(2.2, 0.22, sm, x, 2.45, 13.5 - 0.02, Math.PI);
      back.userData.sign = true;
      const rodA = new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6); rodA.translate(x - 0.9, 2.77, 13.5);
      const rodB = new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6); rodB.translate(x + 0.9, 2.77, 13.5);
      ceiling.add(new THREE.Mesh(K.mergeGeometries([rodA, rodB]), MAT.shared("metal")));
    });

    // entrance canopy + columns + sign band (own group: hidden when the camera
    // comes close, so it never blocks the lobby)
    const canopy = new THREE.Group();
    canopy.name = "ENTRANCE_Canopy";
    const cm = (geo, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast && !lowPower; canopy.add(m); };
    cm(new K.RoundedBoxGeometry(7.6, 0.2, 3.4, 2, 0.04), MAT.shared("white"), 18, 3.3, FD + 1.7);
    cm(new THREE.BoxGeometry(7.2, 0.02, 3.0), MAT.shared("wood"), 18, 3.19, FD + 1.7, false);
    cm(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 20), MAT.shared("metal"), 14.6, 1.6, FD + 3.1);
    cm(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 20), MAT.shared("metal"), 21.4, 1.6, FD + 3.1);
    cm(new THREE.BoxGeometry(7.4, 0.62, 0.08), MAT.shared("dark"), 18, 3.68, FD + 3.36);
    signPlane(7.2, 0.5, signMat(signTexture(CENTER_NAME, { color: "#ffffff", bg: "#3d4347", accent: "#5fb3a6", weight: 600, size: 96, spacing: 0.24, h: 150, w: 2400 }), { glow: 0.7 }), 18, 3.68, FD + 3.405, 0, canopy);
    cm(new THREE.BoxGeometry(7.2, 0.02, 0.04), MAT.shared("lightWarm"), 18, 3.19, FD + 3.35, false);
    group.add(canopy);
    group.userData.canopy = canopy;

    // ---- furniture and equipment (p = [x, z], r in degrees) ----
    const items = [];
    const put = (k, x, z, r = 0) => items.push({ k, p: [x, z], r });
    // nurse station / service strip
    put("nurse_station", 6, 2.2);
    put("task_chair", 4.6, 1.3); put("task_chair", 7.4, 1.3);
    put("shelving", 17, 0.3);
    put("cabinet_tall", 12.6, 0.35); put("cabinet_tall", 14.0, 0.35);
    // patient rooms
    for (let i = 0; i < 4; i++) {
      const x0 = i * 3.5;
      put("headwall", x0 + 1.75, 4.12);
      put("bed", x0 + 1.75, 5.35);
      put("bedside", x0 + 0.55, 4.45);
      put("overbed_table", x0 + 0.62, 6.7, 90);
      put("armchair", x0 + 2.8, 7.6, -90);
      put("tv", x0 + 3.42, 6.2, -90);
      put("wardrobe", x0 + 2.4, 11.6, 180);
    }
    for (let i = 0; i < 4; i++) {
      const x0 = i * 3.5;
      put("iv_pole", x0 + 2.75, 4.6);
      put("privacy_curtain", x0 + 1.75, 5.35);
      put("sanitizer", x0 + 1.2, 11.9, 180);
    }
    // consultation rooms
    for (let j = 0; j < 2; j++) {
      const x0 = 14 + j * 4;
      put("desk", x0 + 2.1, 6.2, 180);
      put("task_chair", x0 + 2.1, 5.35);
      put("visitor_chair", x0 + 1.6, 7.3, 180); put("visitor_chair", x0 + 2.6, 7.3, 180);
      put("exam_couch", x0 + 0.6, 9.6);
      put("sink_unit", x0 + 3.62, 11.2, -90);
      put("doctor_shelf", x0 + 0.62, 4.35);
    }
    // diagnostic imaging
    put("xray_table", 27, 4.4);
    put("wall_bucky", 27, 0.45);
    put("lead_screen", 29.2, 9.4, 180);
    put("control_desk", 23.3, 10.5, 90);
    put("task_chair", 24.05, 10.5, -90);
    // MRI suite
    put("mri", 34.2, 2.6);
    put("cabinet_tall", 36.35, 5.6, -90);
    put("ventilator", 31.2, 2.2, 90);
    put("control_desk", 31.7, 10.9, 180);
    put("task_chair", 31.7, 11.55, 180);
    // trauma / resuscitation
    put("trauma_bed", 40.5, 2.8);
    put("ceiling_pendant", 39.0, 1.9);
    put("surgical_light", 41.1, 3.0);
    put("crash_cart", 43.4, 1.0, -90);
    put("ventilator", 39.2, 4.0, 90);
    put("iv_pole", 41.9, 1.6);
    put("med_cart", 43.4, 4.6, -90);
    // preparation & recovery bays
    [38.3, 40.6, 42.9].forEach((x) => { put("headwall", x, 6.12); put("bed", x, 7.45); put("iv_pole", x + 0.75, 6.6); });
    put("med_cart", 37.6, 11.2, 90);
    [39.45, 41.75].forEach((x) => put("curtain", x, 7.5));
    // corridor signage
    [5.2, 34.2].forEach((x) => put("totem", x, 14.45));
    // waiting area: back-to-back beam seating
    [[18.6, 0], [19.25, 180], [22.8, 0], [23.45, 180]].forEach(([z, r]) => [2.4, 5.1, 7.8].forEach((x) => put("beam_seating", x, z, r)));
    put("coffee_table", 5, 26.3);
    put("wall_tv", 0.12, 21.0, 90);
    put("water_dispenser", 9.5, 17.6, -90);
    [[2.2, 21.0], [7.6, 21.0]].forEach(([x, z]) => put("side_table", x, z));
    [[1.0, 27.0], [9.0, 27.0], [9.2, 16.1]].forEach(([x, z]) => put("planter", x, z));
    // main lobby
    put("feature_wall", 18, 15.6);
    put("reception", 18, 17.7);
    [12.9, 23.1].forEach((x) => { put("rug", x, 23.5); put("sofa", x, 22.0); put("sofa", x, 25.0, 180); put("coffee_table", x, 23.5); });
    [[11, 27.1], [25, 27.1], [11, 16.2], [25, 16.2]].forEach(([x, z]) => put("planter", x, z));
    put("entrance_mat", 18, 27.1);
    [16.4, 17.2, 18.8, 19.6].forEach((x) => put("kiosk", x, 25.3));
    put("planter_bench", 18, 21.6);
    put("cafe", 12.6, 17.3);
    [[11.0, 18.9], [14.2, 18.9]].forEach(([x, z]) => put("round_table", x, z));
    put("totem", 15.4, 26.4);
    // donor recognition wall (faces the lobby)
    put("donor_wall", 28.85, 21.5, -90);
    put("bench", 27.2, 21.5, 90);
    put("planter", 27.3, 16.4);
    // family lounge
    put("bookshelf", 29.3, 16.3, 90);
    put("sofa", 32.2, 19.6); put("sofa", 32.2, 23.2, 180); put("coffee_table", 32.2, 21.4);
    put("lounge_chair", 34.7, 21.4, -90);
    put("dining", 31.7, 26.0);
    put("kitchenette", 35.9, 25.6, -90);
    put("planter", 30.0, 27.3);
    // education / learning room
    put("big_screen", 40.25, 15.16);
    put("lectern", 42.9, 16.3, 200);
    [18.0, 20.6, 23.2].forEach((z) => [38.7, 41.8].forEach((x) => {
      put("training_table", x, z, 180);
      put("visitor_chair", x - 0.42, z + 0.62, 180); put("visitor_chair", x + 0.42, z + 0.62, 180);
    }));
    put("planter", 43.3, 27.1);
    // corridor: hand-sanitizer stations
    [3.5, 14.2, 22.6, 30.3, 37.3].forEach((x) => put("sanitizer", x, 12.2));
    // street side landscaping
    [[2.6, FD + 4.0], [8.4, FD + 4.3], [27.6, FD + 4.3], [34.2, FD + 4.0], [41.0, FD + 4.3]].forEach(([x, z]) => put("tree", x, z));
    [[5.5, FD + 1.5], [30.5, FD + 1.5], [38.0, FD + 1.5]].forEach(([x, z]) => put("hedge", x, z));
    put("bench_outdoor", 11.6, FD + 4.2); put("bench_outdoor", 24.4, FD + 4.2);

    const NO_SHADOW = new Set(["glass", "curtain", "lightWarm", "lightTeal", "screen", "screenOff", "screenLight", "rug", "matDark", "mirror"]);
    K.bakeItems(items, (k) => kit.get(k)).forEach((geo, key) => {
      const m = add(geo, MAT.shared(key), { cast: !NO_SHADOW.has(key), receive: !key.startsWith("light") });
      m.name = `merged-${key}`;
      if (key === "glass" || key === "curtain") m.renderOrder = 3;
    });
    return group;
  }
}
