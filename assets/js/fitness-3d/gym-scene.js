/*
 * Fitness planner — 3D scene (ES module, lazy-loaded by gym-app.js).
 *
 * Model source
 *   - data.model.enabled === true  -> loads data.model.url (GLB/GLTF)
 *   - otherwise                    -> PLACEHOLDER geometry built here from the
 *                                     zone rectangles (honest prototype, not a model)
 *
 * Zone mapping (same for both sources)
 *   An object belongs to a zone when it, or any parent, is named "zone-<id>"
 *   (e.g. "zone-cardio") or has userData.zone === "<id>". Clicking any mesh
 *   resolves up the parent chain to its zone group.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// same ?v= cache-buster as this module, so both update together on deploy
const { createEquipmentLibrary } = await import(`./gym-equipment.js${new URL(import.meta.url).search}`);

const PALETTE = {
  slab: 0xd9d3c9,
  wall: 0xefe9df,
  glass: 0xcfd8d6,
  metal: 0x6f6963,        // warm graphite frames
  metalLight: 0x9a948c,   // brushed steel
  upholstery: 0x8b7d6e,   // taupe upholstery / mats
  wood: 0xc49a6c,         // light oak
  accent: 0xc9a46a,
  finish: { wood: 0xdcc4a2, rubber: 0x6e6964, impact: 0x5c5853, turf: 0x7a8466, tile: 0xe9e4dc },
  highlight: 0xe3c48f,
};

// Footprint (m) + height + material for placeholder equipment
const ITEM = {
  reception_desk: { w: 4.2, d: 0.9, h: 1.05, mat: "wood" },
  access_gate: { w: 0.3, d: 1.2, h: 1.0, mat: "metal" },
  waiting_bench: { w: 1.8, d: 0.5, h: 0.45, mat: "wood" },
  retail_wall: { w: 2.4, d: 0.4, h: 2.0, mat: "wood" },
  treadmill: { w: 0.9, d: 2.1, h: 1.4, mat: "metal" },
  elliptical: { w: 0.75, d: 2.1, h: 1.6, mat: "metal" },
  upright_bike: { w: 0.6, d: 1.1, h: 1.3, mat: "metal" },
  rower: { w: 0.6, d: 2.45, h: 0.5, mat: "metalLight" },
  stair_climber: { w: 0.85, d: 1.65, h: 2.0, mat: "metal" },
  chest_press: { w: 1.3, d: 1.5, h: 1.6, mat: "metal" },
  shoulder_press: { w: 1.3, d: 1.5, h: 1.6, mat: "metal" },
  lat_pulldown: { w: 1.2, d: 1.5, h: 2.2, mat: "metal" },
  seated_row: { w: 1.2, d: 1.6, h: 1.6, mat: "metal" },
  leg_press: { w: 1.4, d: 2.2, h: 1.5, mat: "metal" },
  leg_extension: { w: 1.1, d: 1.4, h: 1.5, mat: "metal" },
  leg_curl: { w: 1.1, d: 1.6, h: 1.5, mat: "metal" },
  cable_crossover: { w: 4.2, d: 1.0, h: 2.3, mat: "metal", frame: true },
  power_rack: { w: 1.4, d: 1.4, h: 2.3, mat: "metal", frame: true },
  adjustable_bench: { w: 0.6, d: 1.4, h: 0.45, mat: "upholstery" },
  dumbbell_rack: { w: 2.5, d: 0.8, h: 0.9, mat: "metal" },
  plate_storage: { w: 1.0, d: 0.6, h: 1.2, mat: "metalLight" },
  lifting_platform: { w: 3.0, d: 2.4, h: 0.05, mat: "wood" },
  functional_rig: { w: 6.0, d: 1.8, h: 2.8, mat: "metal", frame: true },
  kettlebell_set: { w: 1.2, d: 0.4, h: 0.4, mat: "metalLight" },
  medicine_ball: { w: 0.35, d: 0.35, h: 0.35, mat: "upholstery" },
  plyo_box: { w: 0.75, d: 0.6, h: 0.6, mat: "wood" },
  sled_lane: { w: 11.0, d: 1.4, h: 0.02, mat: "accent" },
  suspension_point: { w: 0.2, d: 0.2, h: 0.1, mat: "metal" },
  mat: { w: 0.6, d: 1.8, h: 0.02, mat: "upholstery" },
  foam_roller: { w: 0.9, d: 0.15, h: 0.15, mat: "metalLight" },
  stretch_station: { w: 1.6, d: 1.2, h: 1.6, mat: "metal", frame: true },
  training_position: { w: 0.7, d: 1.6, h: 0.02, mat: "upholstery" },
  storage_wall: { w: 4.0, d: 0.5, h: 2.2, mat: "wood" },
  mirror_wall: { w: 8.0, d: 0.06, h: 2.2, mat: "glass" },
  audio_system: { w: 0.6, d: 0.4, h: 1.0, mat: "metal" },
  spin_bike: { w: 0.55, d: 1.2, h: 1.1, mat: "metal" },
  instructor_platform: { w: 2.0, d: 1.6, h: 0.3, mat: "wood" },
  lighting_control: { w: 0.4, d: 0.2, h: 1.2, mat: "metalLight" },
  locker: { w: 0.4, d: 0.5, h: 1.9, mat: "wood" },
  shower: { w: 1.0, d: 1.0, h: 2.1, mat: "glass" },
  changing_bench: { w: 1.6, d: 0.45, h: 0.45, mat: "wood" },
  vanity_station: { w: 1.0, d: 0.5, h: 0.9, mat: "wood" },
  stretch_bench: { w: 0.8, d: 2.0, h: 0.6, mat: "upholstery" },
  recovery_station: { w: 1.0, d: 2.0, h: 0.9, mat: "metalLight" },
  massage_table: { w: 0.75, d: 1.95, h: 0.75, mat: "upholstery" },
};
// Equipment material palette (one set per zone, see zoneMaterials)
const EQUIPMENT_MATS = {
  frame:   { color: 0x57534e, roughness: 0.45, metalness: 0.55 },  // powder-coated graphite
  steel:   { color: 0xb9b4ac, roughness: 0.32, metalness: 0.75 },  // brushed steel
  pad:     { color: 0x6b5f54, roughness: 0.8 },                    // taupe upholstery
  rubber:  { color: 0x2e2c2a, roughness: 0.9 },                    // plates, belts
  wood:    { color: 0xc89f72, roughness: 0.6 },                    // light oak
  stone:   { color: 0xe9e4db, roughness: 0.45 },
  screen:  { color: 0x1b1b1c, roughness: 0.25, metalness: 0.2 },
  glass:   { color: 0xcfdcda, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32 },
  mirror:  { color: 0xdfe7e9, roughness: 0.05, metalness: 0.9 },
  mat:     { color: 0x8d8174, roughness: 0.95 },
  matDark: { color: 0x5e554d, roughness: 0.9 },
  accent:  { color: 0xc9a46a, roughness: 0.7 },
  turf:    { color: 0x6f7b5d, roughness: 1 },
  line:    { color: 0xf1ede6, roughness: 0.8 },
};

// Large quantities are represented, not modelled one by one
const VISUAL_CAP = { locker: 24, training_position: 20, mat: 8, foam_roller: 6, suspension_point: 4, kettlebell_set: 2, medicine_ball: 6, sled_lane: 1 };

export async function createGymScene({ container, labelsEl, data, reducedMotion = false, ariaLabel = "", onSelect }) {
  const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const equipment = createEquipmentLibrary(THREE, mergeGeometries);
  const { width: FW, depth: FD } = data.floor;
  const center = new THREE.Vector3(FW / 2, 0, FD / 2);

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "gym3d__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", ariaLabel);
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 300);
  const HOME = { pos: new THREE.Vector3(FW / 2 + 16, 31, FD + 26), target: center.clone() };
  camera.position.copy(HOME.pos);

  // ---------- lights: warm, architectural ----------
  scene.add(new THREE.HemisphereLight(0xfff3e2, 0x6a5d50, 1.7));
  scene.add(new THREE.AmbientLight(0xfff1e0, 0.35));
  const sun = new THREE.DirectionalLight(0xffe6c7, 1.35);
  sun.position.set(FW * 0.75, 30, FD * 1.4);
  sun.target.position.copy(center);
  scene.add(sun, sun.target);
  if (renderer.shadowMap.enabled) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 20, bottom: -20, near: 5, far: 90 });
    sun.shadow.bias = -0.0008;
    sun.shadow.radius = 4;
  }

  // ---------- controls (limited, easy to use) ----------
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.minDistance = 10;
  controls.maxDistance = 70;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.2;
  controls.screenSpacePanning = false;
  controls.update();

  // ---------- model ----------
  const zones = new Map(); // id -> { group, floor, center, size, materials[] }
  let root;
  if (data.model && data.model.enabled) {
    root = await loadGLB(data.model.url);
  } else {
    root = buildPlaceholder(data);
  }
  scene.add(root);
  indexZones(root);

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
    labelsEl.appendChild(el);
    labels.set(z.id, el);
  });

  // ---------- state, highlight ----------
  let selected = null;
  let hovered = null;
  let dirty = true;
  let active = true;
  let tween = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function applyHighlight() {
    zones.forEach((z, id) => {
      const isSel = id === selected;
      const isHover = id === hovered && !isSel;
      const dim = selected && !isSel;
      z.materials.forEach((m) => {
        m.color.copy(m.userData.baseColor).multiplyScalar(dim ? 0.42 : 1);
        if (m.emissive) {
          m.emissive.setHex(PALETTE.highlight);
          m.emissiveIntensity = m.userData.isFloor ? (isSel ? 0.38 : isHover ? 0.16 : 0) : (isSel ? 0.06 : 0);
        }
      });
      if (z.outline) z.outline.visible = isSel || isHover;
      if (z.outline) z.outline.material.opacity = isSel ? 0.95 : 0.5;
      const label = labels.get(id);
      if (label) {
        label.classList.toggle("is-selected", isSel);
        label.classList.toggle("is-hover", isHover);
        label.classList.toggle("is-dim", !!dim);
      }
    });
    canvas.style.cursor = hovered ? "pointer" : "grab";
    dirty = true;
  }

  // ---------- camera tween ----------
  function flyTo(pos, target, animate) {
    if (!animate || reducedMotion) {
      camera.position.copy(pos); controls.target.copy(target); controls.update(); dirty = true; return;
    }
    tween = { from: camera.position.clone(), fromT: controls.target.clone(), to: pos, toT: target, t0: performance.now(), dur: 750 };
  }

  function select(id, { animate = true, notify = false } = {}) {
    if (!zones.has(id)) return;
    selected = id;
    applyHighlight();
    const z = zones.get(id);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.y < 0.45) dir.y = 0.45; // stay above
    dir.normalize();
    const dist = Math.max(z.size.x, z.size.z) * 1.05 + 7;
    flyTo(z.center.clone().add(dir.multiplyScalar(dist)), z.center.clone(), animate);
    if (notify && onSelect) onSelect(id);
  }

  function reset({ animate = true } = {}) {
    selected = null;
    applyHighlight();
    flyTo(HOME.pos.clone(), HOME.target.clone(), animate);
  }

  // ---------- picking (tap vs drag) ----------
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(root, true)[0];
    return hit ? zoneOf(hit.object) : null;
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
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || down) return;
    const id = pick(e.clientX, e.clientY);
    if (id !== hovered) { hovered = id; applyHighlight(); }
  });
  canvas.addEventListener("pointerleave", () => { if (hovered) { hovered = null; applyHighlight(); } });

  // keep the view on the floor
  controls.addEventListener("change", () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -2, FW + 2);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -2, FD + 2);
    controls.target.y = 0;
    dirty = true;
  });

  // ---------- size ----------
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // narrow viewports: pull back so the whole floor fits
    camera.fov = w / h < 1 ? 46 : 34;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- render loop (on demand, paused off screen) ----------
  const tmp = new THREE.Vector3();
  function updateLabels() {
    const w = container.clientWidth, h = container.clientHeight;
    const far = camera.position.distanceTo(controls.target) > 46;
    labelsEl.classList.toggle("is-compact", far);
    labels.forEach((el, id) => {
      const z = zones.get(id);
      tmp.copy(z.center).setY(z.labelY);
      tmp.project(camera);
      const visible = tmp.z < 1;
      el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
      el.style.visibility = visible ? "visible" : "hidden";
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
  // helpers
  // =====================================================================
  function zoneOf(obj) {
    for (let o = obj; o; o = o.parent) {
      if (o.userData && o.userData.zone) return o.userData.zone;
      const m = /^zone-([a-z0-9]+)/i.exec(o.name || "");
      if (m) return m[1].toLowerCase();
    }
    return null;
  }

  // Collect zone groups, clone materials per zone (so one zone can be dimmed
  // or highlighted alone) and compute each zone's centre/size for the camera.
  function indexZones(rootObj) {
    const byId = new Map();
    rootObj.traverse((o) => {
      const m = /^zone-([a-z0-9]+)$/i.exec(o.name || "");
      const id = (o.userData && o.userData.zone) || (m && m[1].toLowerCase());
      if (id && !byId.has(id)) byId.set(id, o);
    });
    byId.forEach((group, id) => {
      const materials = new Set();
      group.traverse((o) => {
        if (!o.isMesh) return;
        // GLB materials are shared between zones: clone them once per zone.
        // Placeholder materials are already created per zone (zoneOwned).
        const own = (m) => (m.userData.zoneOwned ? m : m.clone());
        o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat) => {
          if (!mat.userData.baseColor) mat.userData.baseColor = mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1);
          if (o.userData.isFloor) mat.userData.isFloor = true;
          materials.add(mat);
        });
      });
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3()).setY(0);
      const outline = group.getObjectByName("outline") || null;
      zones.set(id, { group, materials: [...materials], center: c, size, outline, labelY: Math.min(box.max.y, 2.4) + 0.6 });
    });
  }

  async function loadGLB(url) {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(url);
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = !lowPower; } });
    return gltf.scene;
  }

  // ---------------------------------------------------------------------
  // PLACEHOLDER: simple geometry from the zone rectangles. Same naming
  // contract as a real model: one group per zone, named "zone-<id>".
  // ---------------------------------------------------------------------
  function buildPlaceholder(d) {
    const group = new THREE.Group();
    group.name = "gym-placeholder";
    const mat = (hex, extra = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, metalness: 0.05, ...extra });
    const M = {
      metal: () => mat(PALETTE.metal, { roughness: 0.45, metalness: 0.6 }),
      metalLight: () => mat(PALETTE.metalLight, { roughness: 0.5, metalness: 0.5 }),
      upholstery: () => mat(PALETTE.upholstery, { roughness: 0.9 }),
      wood: () => mat(PALETTE.wood, { roughness: 0.65 }),
      accent: () => mat(PALETTE.accent, { roughness: 0.8 }),
      glass: () => mat(PALETTE.glass, { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 }),
    };
    const box = (w, h, dd, m) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m);
      mesh.castShadow = mesh.receiveShadow = !lowPower;
      return mesh;
    };

    // base slab + service area
    const slab = box(d.floor.width + 0.6, 0.25, d.floor.depth + 0.6, mat(PALETTE.slab));
    slab.position.set(d.floor.width / 2, -0.13, d.floor.depth / 2);
    slab.castShadow = false;
    group.add(slab);
    (d.serviceAreas || []).forEach((s) => {
      const b = box(s.rect.w - 0.2, 2.6, s.rect.d - 0.2, mat(PALETTE.wall));
      b.position.set(s.rect.x + s.rect.w / 2, 1.3, s.rect.z + s.rect.d / 2);
      group.add(b);
    });

    // low cut-away perimeter walls (back + left), so the plan stays readable
    const wallMat = mat(PALETTE.wall);
    const backWall = box(d.floor.width, 1.2, 0.2, wallMat);
    backWall.position.set(d.floor.width / 2, 0.6, -0.1);
    const leftWall = box(0.2, 1.2, d.floor.depth, wallMat);
    leftWall.position.set(-0.1, 0.6, d.floor.depth / 2);
    group.add(backWall, leftWall);

    d.zones.forEach((z) => {
      const zg = new THREE.Group();
      zg.name = z.mesh || `zone-${z.id}`;
      zg.userData.zone = z.id;
      const r = z.rect;

      // floor finish (the clickable area)
      const floorMat = mat(PALETTE.finish[z.floorFinish] || PALETTE.finish.wood, { roughness: 0.9 });
      floorMat.userData.zoneOwned = true;
      const floor = box(r.w - 0.12, 0.05, r.d - 0.12, floorMat);
      floor.position.set(r.x + r.w / 2, 0.025, r.z + r.d / 2);
      floor.userData.isFloor = true;
      floor.castShadow = false;
      zg.add(floor);

      // selection outline
      const pts = [[r.x + 0.1, r.z + 0.1], [r.x + r.w - 0.1, r.z + 0.1], [r.x + r.w - 0.1, r.z + r.d - 0.1], [r.x + 0.1, r.z + r.d - 0.1]]
        .map(([x, zz]) => new THREE.Vector3(x, 0.07, zz));
      const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: PALETTE.highlight, transparent: true, opacity: 0.9 }));
      outline.name = "outline";
      outline.visible = false;
      zg.add(outline);

      // enclosed rooms get low partitions / glazing
      if (["studio", "spin", "lockers", "recovery"].includes(z.id)) {
        const glassy = z.id === "studio" || z.id === "spin";
        const pm = glassy ? M.glass() : wallMat;
        const front = box(r.w - 1.6, glassy ? 2.4 : 1.2, 0.08, pm);
        front.position.set(r.x + r.w / 2 + 0.8, glassy ? 1.2 : 0.6, r.z + r.d - 0.04);
        zg.add(front);
      }

      layoutEquipment(z, zg, zoneMaterials());
      group.add(zg);
    });
    return group;
  }

  function zoneMaterials() {
    const set = {};
    Object.entries(EQUIPMENT_MATS).forEach(([key, p]) => {
      const m = new THREE.MeshStandardMaterial(p);
      m.userData.zoneOwned = true;
      set[key] = m;
    });
    return set;
  }

  // Row packing inside the zone rectangle (aisle margin + gaps), then one
  // InstancedMesh per equipment type and material: every treadmill in a zone
  // is drawn in a single call per material.
  function layoutEquipment(z, zg, mats) {
    const r = z.rect;
    const margin = 0.7, gap = 0.5;
    let cx = r.x + margin, cz = r.z + margin, rowDepth = 0;
    const items = [];
    z.equipment.forEach((e) => {
      const spec = ITEM[e.key];
      if (!spec) return;
      const n = Math.min(e.quantity, VISUAL_CAP[e.key] || e.quantity);
      for (let i = 0; i < n; i++) items.push({ key: e.key, spec });
    });
    items.sort((a, b) => b.spec.w * b.spec.d - a.spec.w * a.spec.d);

    const placements = new Map(); // key -> Matrix4[]
    items.forEach(({ key, spec }) => {
      let w = spec.w, dd = spec.d, rot = 0;
      if (w > r.w - 2 * margin) { [w, dd] = [dd, w]; rot = Math.PI / 2; }
      if (cx + w > r.x + r.w - margin) { cx = r.x + margin; cz += rowDepth + gap; rowDepth = 0; }
      if (cz + dd > r.z + r.d - margin) return; // full: the list still shows the real quantity
      const m = new THREE.Matrix4().makeRotationY(rot).setPosition(cx + w / 2, 0.05, cz + dd / 2);
      if (!placements.has(key)) placements.set(key, []);
      placements.get(key).push(m);
      cx += w + gap;
      rowDepth = Math.max(rowDepth, dd);
    });

    placements.forEach((matrices, key) => {
      equipment.get(key, ITEM[key]).forEach(({ mat, geometry }) => {
        const mesh = new THREE.InstancedMesh(geometry, mats[mat] || mats.frame, matrices.length);
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.castShadow = mesh.receiveShadow = !lowPower;
        mesh.name = `equipment-${key}`;
        zg.add(mesh);
      });
    });
  }
}
