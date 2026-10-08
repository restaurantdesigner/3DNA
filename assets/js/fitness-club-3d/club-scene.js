/*
 * Fitness page, section 03 / Zonificación — 3D fitness club (ES module,
 * lazy-loaded by club-app.js).
 *
 * Model source
 *   - data.model.url set  -> loads that GLB; every group named "zone-<id>"
 *                            (or with userData.zone) becomes a selectable zone
 *   - otherwise           -> the procedural conceptual club built here from
 *                            assets/data/fitness-club.json (architecture) and
 *                            club-equipment.js (equipment and furniture)
 * Selection, camera, labels, highlight and the panel work the same for both,
 * so an authored model can replace the procedural one without code changes.
 *
 * Rendering: dollhouse view without roof, perspective camera, image-based
 * lighting (RoomEnvironment) + one shadowed key light, canvas-generated floor
 * textures (no downloads), equipment merged per zone and material, rendering
 * on demand only (camera move, hover, selection) and paused off screen.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries as mergeRaw } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
// same ?v= cache-buster as this module, so both update together on deploy
const { createClubEquipment } = await import(`./club-equipment.js${new URL(import.meta.url).search}`);

// all inputs indexed (RoundedBoxGeometry is not), so mixed lists merge
const mergeGeometries = (list, groups = false) => mergeRaw(list.map((g) => {
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  return g;
}), groups);

const HIGHLIGHT = 0x8cc8ff;   // selection / hover: blue-white architectural light

const MATS = {
  frame:       { color: 0x272a2e, roughness: 0.38, metalness: 0.65 },
  chrome:      { color: 0xe4e7ea, roughness: 0.16, metalness: 1 },
  steel:       { color: 0x8f959b, roughness: 0.32, metalness: 0.85 },
  pad:         { color: 0x161618, roughness: 0.5 },
  rubber:      { color: 0x111213, roughness: 0.85 },
  rubberGrip:  { color: 0x2a2c30, roughness: 0.95 },
  plate:       { color: 0x18191b, roughness: 0.55, metalness: 0.25 },
  screen:      { color: 0x05080d, roughness: 0.2, emissive: 0x2a64a8, emissiveIntensity: 0.9 },
  screenBright:{ color: 0x05080d, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 1.1, map: "screen" },
  glass:       { color: 0xc6dbe4, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false },
  mirror:      { color: 0x93a3ad, roughness: 0.05, metalness: 1 },
  oak:         { color: 0xa97c52, roughness: 0.55 },
  oakLocker:   { color: 0xae8459, roughness: 0.5 },
  walnut:      { color: 0x4a3324, roughness: 0.5 },
  stone:       { color: 0xe4e0d8, roughness: 0.28 },
  tile:        { color: 0xc9c4bb, roughness: 0.35 },
  fabric:      { color: 0x55524e, roughness: 0.95 },
  fabricLight: { color: 0x8d867c, roughness: 0.95 },
  fabricDark:  { color: 0x2b2c31, roughness: 0.9 },
  leather:     { color: 0x7a4a2b, roughness: 0.48 },
  white:       { color: 0xf0efeb, roughness: 0.5 },
  led:         { color: 0x000000, emissive: 0xeaf4ff, emissiveIntensity: 2.4 },
  ledWarm:     { color: 0x000000, emissive: 0xffd2a0, emissiveIntensity: 2.0 },
  ledBlue:     { color: 0x000000, emissive: 0x4aa2ff, emissiveIntensity: 2.6 },
  leaf:        { color: 0x3a5e36, roughness: 0.75 },
  trunk:       { color: 0x4a3a2c, roughness: 0.9 },
  pot:         { color: 0x2c2c2e, roughness: 0.65 },
  rock:        { color: 0x55575b, roughness: 0.9 },
  water:       { color: 0x4f9fbf, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.78, emissive: 0x0a3550, emissiveIntensity: 0.6 },
  sauna:       { color: 0xc59b6b, roughness: 0.7 },
  saunaDark:   { color: 0x6e4f34, roughness: 0.8 },
  mat:         { color: 0x2c2e33, roughness: 0.95 },
  matLight:    { color: 0x66717c, roughness: 0.85 },
  track:       { color: 0xffffff, roughness: 0.9, map: "track" },
  rug:         { color: 0xffffff, roughness: 1, map: "rug" },
  accent:      { color: 0x2f6fb8, roughness: 0.4, metalness: 0.3 },
  darkStep:    { color: 0x1b1c1f, roughness: 0.8 },
};
// floor finishes: texture key + size of one texture tile (m)
const FLOORS = {
  oak: { tex: "oak", tile: 2.4 }, rubber: { tex: "rubber", tile: 2 }, rubberThick: { tex: "rubberThick", tile: 2 },
  sprung: { tex: "sprung", tile: 2.4 }, dark: { tex: "dark", tile: 2 }, tile: { tex: "tile", tile: 2.4 },
};

export async function createClubScene({ container, labels: labelsEl, data, reducedMotion = false, ariaLabel = "", onSelect }) {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const lowPower = touch || (navigator.hardwareConcurrency || 8) <= 4;
  const { w: FW, d: FD } = data.footprint;
  const CENTER = new THREE.Vector3(FW / 2, 0, FD / 2);
  const ARCH = data.architecture;

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "fclub__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", ariaLabel);
  container.prepend(canvas);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  // ---------- lights: soft image-based fill + one warm key light with shadows ----------
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x24211e, 0.8));
  const key = new THREE.DirectionalLight(0xfff1e2, 1.9);
  key.position.set(CENTER.x - 14, 34, CENTER.z + 22);
  key.target.position.copy(CENTER);
  scene.add(key, key.target);
  if (renderer.shadowMap.enabled) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 5, far: 90 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 3;
  }
  const fill = new THREE.DirectionalLight(0x9cc4ff, 0.45);
  fill.position.set(CENTER.x + 30, 18, CENTER.z - 20);
  scene.add(fill);

  // ---------- textures (canvas, generated once) ----------
  const TEX = makeTextures();

  // ---------- materials ----------
  const shared = {};
  const makeMat = (key) => {
    const p = { ...(MATS[key] || MATS.frame) };
    if (typeof p.map === "string") {
      const t = TEX[p.map];
      if (key === "screenBright") { p.emissiveMap = t; delete p.map; } else p.map = t;
    }
    const m = new THREE.MeshStandardMaterial(p);
    m.envMapIntensity = key === "mirror" || key === "chrome" ? 1.2 : 0.7;
    m.userData.key = key;
    m.userData.baseColor = m.color.clone();
    m.userData.baseEmissive = m.emissiveIntensity;
    return m;
  };
  const sharedMat = (key) => shared[key] || (shared[key] = makeMat(key));

  // ---------- camera + controls ----------
  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 400);
  // three-quarter view from the street corner; on portrait screens from the
  // side street, so the long side of the club runs up the screen
  let HOME_AZ = 0.6;
  const HOME_EL = 0.86;
  const homeTarget = new THREE.Vector3(CENTER.x, 0.6, CENTER.z + 0.6);
  let homeDist = 60;
  const dirFrom = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));

  // the mouse wheel scrolls the page until the visitor engages with the model
  // (click / drag inside it); a pinch (ctrl + wheel) always zooms. Registered
  // before OrbitControls so its wheel handler never sees a plain page scroll.
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
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = 1.2;
  controls.minAzimuthAngle = HOME_AZ - 1.5;
  controls.maxAzimuthAngle = HOME_AZ + 1.5;
  controls.minDistance = 6;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

  // ---------- model ----------
  let ceiling = null;       // suspended light lines: hidden in close-ups so they never block the view
  const zones = new Map(); // id -> { id, name, index, rect, group, mats[], floorMats[], outline, box, pin }
  const root = new THREE.Group();
  scene.add(root);
  if (data.model && data.model.url) {
    const glb = await loadGLB(data.model.url);
    root.add(glb);
    registerGLBZones(glb);
  } else {
    buildArchitecture();
    buildZones();
  }

  // ---------- labels (HTML pins) ----------
  zones.forEach((z) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "fclub__pin";
    el.dataset.zone = z.id;
    el.innerHTML = `<span class="fclub__pin-num">${z.index}</span><span class="fclub__pin-name"></span>`;
    el.querySelector(".fclub__pin-name").textContent = z.name;
    el.setAttribute("aria-label", `${z.index} ${z.name}`);
    el.tabIndex = -1;  // keyboard users have the zone buttons below the model
    el.addEventListener("click", () => select(z.id, { notify: true }));
    el.addEventListener("pointerenter", () => setHover(z.id));
    el.addEventListener("pointerleave", () => setHover(null));
    labelsEl.appendChild(el);
    z.pin = el;
  });

  // ---------- state ----------
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
        m.emissiveIntensity = isSel ? 0.028 : isHover ? 0.02 : 0;
      });
      z.outline.visible = isSel || isHover;
      z.outline.material.emissiveIntensity = isSel ? 3 : 1.6;
      z.pin.classList.toggle("is-selected", isSel);
      z.pin.classList.toggle("is-hover", isHover);
      z.pin.classList.toggle("is-dim", dim);
    });
    canvas.style.cursor = hovered ? "pointer" : "grab";
    dirty = true;
  }

  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    applyHighlight();
  }

  // ---------- camera ----------
  // Wide screens: the panel floats over the right edge. A view offset moves
  // the projection centre into the free area, so the overview and every zone
  // close-up are centred where the visitor can see them.
  let freeFrac = 1;                    // share of the canvas width not covered by the panel
  function applyViewOffset(w, h) {
    const p = w > 900 ? Math.min(380, w * 0.34) + 32 : 0;
    freeFrac = (w - p) / (w + p);
    camera.aspect = (w + p) / h;
    if (p) camera.setViewOffset(w + p, h, p, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // smallest distance at which the whole building (walls included) fits
  const corners = [];
  [0, FW].forEach((x) => [0, FD + 1.2].forEach((z) => [0, ARCH.wallHeight].forEach((y) => corners.push(new THREE.Vector3(x, y, z)))));
  function fitHome() {
    const probe = camera.clone();
    probe.clearViewOffset();
    probe.aspect = camera.aspect;
    probe.updateProjectionMatrix();
    const dir = dirFrom(HOME_AZ, HOME_EL);
    const fits = (d) => {
      probe.position.copy(homeTarget).addScaledVector(dir, d);
      probe.lookAt(homeTarget);
      probe.updateMatrixWorld();
      return corners.every((c) => { const v = c.clone().project(probe); return Math.abs(v.x) <= freeFrac * 0.94 && Math.abs(v.y) <= 0.9 && v.z < 1; });
    };
    let lo = 8, hi = 260;
    for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    homeDist = hi;
    controls.maxDistance = homeDist * 1.3;
  }
  const homeAim = () => homeTarget.clone();
  const homePos = () => homeAim().add(dirFrom(HOME_AZ, HOME_EL).multiplyScalar(homeDist));

  function flyTo(pos, target, animate = true) {
    if (!animate || reducedMotion) {
      camera.position.copy(pos); controls.target.copy(target); controls.update(); dirty = true; return;
    }
    tween = { from: camera.position.clone(), fromT: controls.target.clone(), to: pos, toT: target, t0: performance.now(), dur: 1100 };
  }

  function select(id, { animate = true, notify = false } = {}) {
    if (!zones.has(id)) return;
    selected = id;
    applyHighlight();
    const z = zones.get(id);
    const c = new THREE.Vector3(z.rect.x + z.rect.w / 2, 0.5, z.rect.z + z.rect.d / 2);
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.phi = THREE.MathUtils.clamp(sph.phi, 0.5, 0.9);
    sph.radius = Math.max(z.rect.w, z.rect.d) * (container.clientWidth < container.clientHeight ? 2.1 : 1.35) + 7;
    flyTo(c.clone().add(new THREE.Vector3().setFromSpherical(sph)), c, animate);
    if (notify && onSelect) onSelect(id);
  }

  function reset({ animate = true } = {}) {
    selected = null;
    applyHighlight();
    flyTo(homePos(), homeAim(), animate);
  }

  // ---------- picking: rays against each zone's footprint volume ----------
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    let best = null, bestD = Infinity;
    const hit = new THREE.Vector3();
    zones.forEach((z) => {
      if (raycaster.ray.intersectBox(z.box, hit)) {
        const d = hit.distanceToSquared(raycaster.ray.origin);
        if (d < bestD) { bestD = d; best = z.id; }
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
    moveRaf = requestAnimationFrame(() => {
      moveRaf = 0;
      const id = pick(lastMove.clientX, lastMove.clientY);
      setHover(id);   // the zone's pin opens with its name
    });
  });
  canvas.addEventListener("pointerleave", () => setHover(null));

  // keep the target inside the club so nobody gets lost
  controls.addEventListener("change", () => {
    const t = controls.target;
    t.x = THREE.MathUtils.clamp(t.x, -2, FW + 2);
    t.z = THREE.MathUtils.clamp(t.z, -2, FD + 2);
    t.y = THREE.MathUtils.clamp(t.y, 0, 1.5);
    dirty = true;
  });
  controls.addEventListener("start", () => { tween = null; });

  // ---------- size ----------
  let sized = false;
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.fov = w / h < 1 ? 40 : 30;
    HOME_AZ = w / h < 0.9 ? 1.2 : 0.6;
    controls.minAzimuthAngle = HOME_AZ - 1.5;
    controls.maxAzimuthAngle = HOME_AZ + 1.5;
    applyViewOffset(w, h);
    fitHome();
    if (!sized) { sized = true; camera.position.copy(homePos()); controls.target.copy(homeAim()); controls.update(); }
    dirty = true;
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- render loop (on demand, paused off screen) ----------
  const v = new THREE.Vector3();
  function updatePins() {
    const w = container.clientWidth, h = container.clientHeight;
    const dist = camera.position.distanceTo(controls.target);
    const far = dist > homeDist * 0.7;
    if (ceiling) ceiling.visible = dist > homeDist * 0.62;
    labelsEl.classList.toggle("is-far", far);
    zones.forEach((z) => {
      v.set(z.rect.x + z.rect.w / 2, z.pinY, z.rect.z + z.rect.d / 2).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      z.pin.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      z.pin.style.visibility = visible ? "visible" : "hidden";
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
    updatePins();
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
  // procedural club
  // =====================================================================
  function mesh(geometry, material, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = cast && renderer.shadowMap.enabled;
    m.receiveShadow = receive && renderer.shadowMap.enabled;
    return m;
  }

  function buildArchitecture() {
    const arch = new THREE.Group();
    arch.name = "architecture";
    root.add(arch);
    const H = ARCH.wallHeight, CUT = ARCH.cutHeight;
    const wallMat = makeMat("frame");
    wallMat.color.setHex(0x26272b); wallMat.metalness = 0; wallMat.roughness = 0.88;
    wallMat.userData.baseColor = wallMat.color.clone();
    const wallTop = makeMat("frame");
    wallTop.color.setHex(0x3b3d42); wallTop.metalness = 0; wallTop.roughness = 0.9;
    const plinthMat = makeMat("frame");
    plinthMat.color.setHex(0x17181b); plinthMat.metalness = 0; plinthMat.roughness = 0.9;
    const concrete = makeMat("frame");
    concrete.color.setHex(0xffffff); concrete.metalness = 0; concrete.roughness = 0.55; concrete.map = TEX.concrete;
    const glass = sharedMat("glass"), mull = sharedMat("frame");
    const led = sharedMat("led"), ledBlue = sharedMat("ledBlue");

    // plinth (architectural model base) and soft contact shadow
    const plinth = mesh(new THREE.BoxGeometry(FW + 1.6, 0.5, FD + 3.2), plinthMat, { cast: false });
    plinth.position.set(FW / 2, -0.25, FD / 2 + 0.8);
    arch.add(plinth);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FW * 1.9, FD * 2.1),
      new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false, opacity: 0.9 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(FW / 2, -0.5, FD / 2 + 0.8);
    arch.add(shadow);
    // exterior paving strip along the street facade
    const pave = mesh(new THREE.BoxGeometry(FW + 1.6, 0.02, 2.4), (() => { const m = makeMat("frame"); m.color.setHex(0x3a3b3e); m.metalness = 0; m.roughness = 0.85; return m; })(), { cast: false });
    pave.position.set(FW / 2, 0.01, FD + 1.6);
    arch.add(pave);

    // interior base: polished concrete (corridors and anything between zones)
    const baseGeo = new THREE.PlaneGeometry(FW, FD);
    baseGeo.rotateX(-Math.PI / 2);
    const base = mesh(baseGeo, concrete, { cast: false });
    concrete.map = concrete.map.clone(); concrete.map.needsUpdate = true; concrete.map.repeat.set(FW / 4, FD / 4);
    base.position.set(FW / 2, 0.001, FD / 2);
    arch.add(base);

    // LED guide lines in the corridors (circulation routes)
    ARCH.guideLines.forEach(({ a, b }) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = new THREE.BoxGeometry(len, 0.01, 0.05);
      const m = mesh(g, ledBlue, { cast: false, receive: false });
      m.position.set((a[0] + b[0]) / 2, 0.006, (a[1] + b[1]) / 2);
      m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      arch.add(m);
    });

    // walls
    const solids = [], tops = [], glassG = [], mullG = [], leds = [];
    const seg = (a, b, h, t, y0 = 0) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = new THREE.BoxGeometry(len, h, t);
      g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0]));
      g.translate((a[0] + b[0]) / 2, y0 + h / 2, (a[1] + b[1]) / 2);
      return g;
    };
    const along = (a, b, every, fn) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(len / every));
      for (let i = 0; i <= n; i++) fn([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    };
    ARCH.walls.forEach(({ t, a, b }) => {
      if (t === "solid") {
        // perimeter: full height, built outside the footprint line so wall-
        // mounted items (screens, mirrors, showers) sit on its inner face
        const nx = a[1] === b[1] ? 0 : (a[0] < FW / 2 ? -0.12 : 0.12);
        const nz = a[1] === b[1] ? (a[1] < FD / 2 ? -0.12 : 0.12) : 0;
        const o = (p, k = 1) => [p[0] + nx * k, p[1] + nz * k];
        solids.push(seg(o(a), o(b), H, 0.24));
        tops.push(seg(o(a), o(b), 0.04, 0.26, H));
        leds.push(seg(o(a, -0.05), o(b, -0.05), 0.03, 0.04, H - 0.25));
      } else if (t === "cut") {
        solids.push(seg(a, b, CUT, 0.14));
        tops.push(seg(a, b, 0.03, 0.16, CUT));
      } else if (t === "glass" || t === "curtain" || t === "door") {
        const h = t === "glass" ? 2.7 : H;
        glassG.push(seg(a, b, h - 0.08, 0.02, 0.04));
        mullG.push(seg(a, b, 0.06, 0.08, 0), seg(a, b, 0.07, 0.08, h - 0.07));
        if (t === "door") mullG.push(seg(a, b, 0.25, 0.1, 2.5));
      }
    });
    // vertical mullions
    const posts = [];
    ARCH.walls.forEach(({ t, a, b }) => {
      if (!["glass", "curtain", "door"].includes(t)) return;
      const h = t === "glass" ? 2.7 : H;
      along(a, b, t === "glass" ? 1.25 : 1.5, (p) => { const g = new THREE.BoxGeometry(0.06, h, 0.07); g.translate(p[0], h / 2, p[1]); posts.push(g); });
    });
    arch.add(mesh(mergeGeometries(solids), wallMat));
    arch.add(mesh(mergeGeometries(tops), wallTop, { cast: false }));
    arch.add(mesh(mergeGeometries(leds), led, { cast: false, receive: false }));
    const gl = mesh(mergeGeometries(glassG), glass, { cast: false, receive: false });
    gl.renderOrder = 2;
    arch.add(gl);
    arch.add(mesh(mergeGeometries([...mullG, ...posts]), mull));

    // entrance: slim lit header over the glass doors
    const header = mesh(new THREE.BoxGeometry(4.4, 0.12, 0.5), wallMat);
    header.position.set(23, H + 0.06, FD + 0.15);
    arch.add(header);
    const headerLed = mesh(new THREE.BoxGeometry(4.2, 0.02, 0.03), led, { cast: false, receive: false });
    headerLed.position.set(23, H - 0.01, FD + 0.38);
    arch.add(headerLed);

    // columns with vertical blue LED lines (reference: 3DNA fitness visualisation)
    const colGeo = [], colLed = [];
    ARCH.columns.forEach(([x, z]) => {
      const g = new RoundedBoxGeometry(0.42, H, 0.42, 2, 0.02); g.translate(x, H / 2, z); colGeo.push(g);
      [[0.215, 0], [-0.215, 0]].forEach(([dx]) => { const l = new THREE.BoxGeometry(0.012, H - 0.4, 0.05); l.translate(x + dx, H / 2, z); colLed.push(l); });
    });
    ARCH.pilasters.forEach(([x, z]) => {
      const g = new THREE.BoxGeometry(0.3, H, 0.6); g.translate(x + 0.15, H / 2, z); colGeo.push(g);
      const l = new THREE.BoxGeometry(0.02, H - 0.4, 0.06); l.translate(x + 0.31, H / 2, z); colLed.push(l);
    });
    const colMat = makeMat("frame"); colMat.color.setHex(0x3a3c40); colMat.metalness = 0; colMat.roughness = 0.75;
    arch.add(mesh(mergeGeometries(colGeo), colMat));
    arch.add(mesh(mergeGeometries(colLed), ledBlue, { cast: false, receive: false }));

    // suspended linear luminaires (no ceiling: the roof is removed for the dollhouse view)
    const lines = ARCH.ceilingLines.map(({ a, b }) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = new THREE.BoxGeometry(len, 0.035, 0.06);
      g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0]));
      g.translate((a[0] + b[0]) / 2, 3.05, (a[1] + b[1]) / 2);
      return g;
    });
    ceiling = mesh(mergeGeometries(lines), led, { cast: false, receive: false });
    arch.add(ceiling);
  }

  function buildZones() {
    const lib = createClubEquipment(THREE, { RoundedBoxGeometry, mergeGeometries });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    data.zones.forEach((z) => {
      const group = new THREE.Group();
      group.name = `zone-${z.id}`;
      group.userData.zone = z.id;
      const r = z.rect;
      const mats = {};
      const zm = (key) => mats[key] || (mats[key] = makeMat(key));

      // floor finish
      const f = FLOORS[z.floor] || FLOORS.rubber;
      const floorMat = makeMat("frame");
      floorMat.color.setHex(0xffffff); floorMat.metalness = 0; floorMat.roughness = z.floor === "oak" || z.floor === "sprung" ? 0.5 : 0.85;
      floorMat.map = TEX[f.tex].clone(); floorMat.map.needsUpdate = true;
      floorMat.map.repeat.set(r.w / f.tile, r.d / f.tile);
      floorMat.userData.baseColor = floorMat.color.clone();
      const fg = new THREE.PlaneGeometry(r.w - 0.06, r.d - 0.06);
      fg.rotateX(-Math.PI / 2);
      const floor = mesh(fg, floorMat, { cast: false });
      floor.position.set(r.x + r.w / 2, 0.004, r.z + r.d / 2);
      group.add(floor);

      // selection outline: thin emissive frame on the floor
      const outlineMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: HIGHLIGHT, emissiveIntensity: 2 });
      const ob = [];
      const tW = 0.07, x0 = r.x + 0.06, x1 = r.x + r.w - 0.06, z0 = r.z + 0.06, z1 = r.z + r.d - 0.06;
      [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]].forEach(([ax, az, bx, bz]) => {
        const g = new THREE.BoxGeometry(Math.abs(bx - ax) + tW, 0.012, Math.abs(bz - az) + tW);
        g.translate((ax + bx) / 2, 0.012, (az + bz) / 2);
        ob.push(g);
      });
      const outline = new THREE.Mesh(mergeGeometries(ob), outlineMat);
      outline.visible = false;
      group.add(outline);

      // equipment and furniture: every copy baked into one mesh per material
      const byMat = new Map();
      z.items.forEach((it) => {
        const n = it.n || 1, st = it.s || [0, 0];
        const parts = lib.get(it.k);
        for (let i = 0; i < n; i++) {
          q.setFromAxisAngle(up, THREE.MathUtils.degToRad(it.r || 0));
          m4.compose(new THREE.Vector3(it.p[0] + st[0] * i, it.y || 0, it.p[1] + st[1] * i), q, s1);
          parts.forEach(({ mat, geometry }) => {
            const g = geometry.clone().applyMatrix4(m4);
            if (!byMat.has(mat)) byMat.set(mat, []);
            byMat.get(mat).push(g);
          });
        }
      });
      byMat.forEach((list, key) => {
        const geometry = list.length === 1 ? list[0] : mergeGeometries(list, false);
        list.forEach((g) => { if (g !== geometry) g.dispose(); });
        const noShadow = ["glass", "led", "ledWarm", "ledBlue", "screen", "screenBright", "water", "mirror"].includes(key);
        const m = mesh(geometry, zm(key), { cast: !noShadow, receive: !key.startsWith("led") });
        if (key === "glass" || key === "water") m.renderOrder = 2;
        group.add(m);
      });
      root.add(group);

      zones.set(z.id, {
        id: z.id, name: z.name, index: z.index, rect: r, group,
        mats: Object.values(mats), floorMats: [floorMat], outline,
        box: new THREE.Box3(new THREE.Vector3(r.x, 0, r.z), new THREE.Vector3(r.x + r.w, 1.1, r.z + r.d)),
        pinY: 3.2,
      });
    });
  }

  // =====================================================================
  // authored GLB (optional)
  // =====================================================================
  async function loadGLB(url) {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(url);
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = renderer.shadowMap.enabled; } });
    return gltf.scene;
  }
  function registerGLBZones(glb) {
    const names = new Map(data.zones.map((z) => [z.id, z]));
    glb.traverse((o) => {
      const m = /^zone-([a-z0-9]+)$/i.exec(o.name || "");
      const id = (o.userData && o.userData.zone) || (m && m[1].toLowerCase());
      if (!id || zones.has(id) || !names.has(id)) return;
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
      const rect = { x: bb.min.x, z: bb.min.z, w: bb.max.x - bb.min.x, d: bb.max.z - bb.min.z };
      const outline = new THREE.Mesh(new THREE.BoxGeometry(rect.w, 0.01, rect.d),
        new THREE.MeshStandardMaterial({ color: 0, emissive: HIGHLIGHT, emissiveIntensity: 1, transparent: true, opacity: 0.25 }));
      outline.position.set(rect.x + rect.w / 2, bb.min.y + 0.02, rect.z + rect.d / 2);
      outline.visible = false;
      glb.add(outline);
      const z = names.get(id);
      zones.set(id, { id, name: z.name, index: z.index, rect, group: o, mats: [...mats], floorMats: [], outline,
        box: new THREE.Box3(bb.min.clone(), new THREE.Vector3(bb.max.x, bb.min.y + 1.1, bb.max.z)), pinY: Math.min(bb.max.y, 3) + 0.3 });
    });
  }

  // =====================================================================
  // canvas textures
  // =====================================================================
  function makeTextures() {
    const rnd = mulberry(7);
    const tex = (size, draw, { repeat = true, h = size } = {}) => {
      const c = document.createElement("canvas");
      c.width = size; c.height = h;
      draw(c.getContext("2d"), size, h);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, maxAniso);
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };
    const speckle = (g, s, h, n, colors, rMax = 2) => {
      for (let i = 0; i < n; i++) { g.fillStyle = colors[i % colors.length]; g.fillRect(rnd() * s, rnd() * h, 1 + rnd() * rMax, 1 + rnd() * rMax); }
    };
    const planks = (g, s, base, spread, plankW, grainA) => {
      const rows = Math.round(1 / plankW);
      const ph = s / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * s * 0.5;
        while (x < s) {
          const len = s * (0.35 + rnd() * 0.4);
          const k = (rnd() - 0.5) * spread;
          g.fillStyle = `rgb(${base[0] + k},${base[1] + k * 0.8},${base[2] + k * 0.6})`;
          g.fillRect(x, r * ph, len, ph);
          g.strokeStyle = `rgba(30,18,10,${grainA})`;
          for (let j = 0; j < 7; j++) {
            const y = r * ph + rnd() * ph;
            g.lineWidth = 0.6 + rnd();
            g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + (rnd() - 0.5) * 6, x + len * 0.7, y + (rnd() - 0.5) * 6, x + len, y); g.stroke();
          }
          g.fillStyle = "rgba(20,12,6,.55)"; g.fillRect(x, r * ph, 1.5, ph);
          x += len;
        }
        g.fillStyle = "rgba(20,12,6,.45)"; g.fillRect(0, r * ph, s, 1.2);
      }
    };
    const T = {
      oak: tex(1024, (g, s) => planks(g, s, [168, 124, 84], 34, 1 / 12, 0.12)),
      sprung: tex(1024, (g, s) => planks(g, s, [184, 146, 102], 26, 1 / 16, 0.1)),
      rubber: tex(512, (g, s) => { g.fillStyle = "#303236"; g.fillRect(0, 0, s, s); speckle(g, s, s, 5200, ["#43464c", "#50535a", "#24252a", "#36506c"]); }),
      rubberThick: tex(512, (g, s) => {
        g.fillStyle = "#1d1e21"; g.fillRect(0, 0, s, s); speckle(g, s, s, 3200, ["#2e3034", "#141517", "#383a3f"]);
        g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 2; [0, s / 2].forEach((p) => { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke(); });
      }),
      dark: tex(512, (g, s) => { g.fillStyle = "#151619"; g.fillRect(0, 0, s, s); speckle(g, s, s, 2400, ["#1d1e22", "#101113"]); }),
      tile: tex(512, (g, s) => {
        const n = 4, t = s / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const k = (rnd() - 0.5) * 10;
          g.fillStyle = `rgb(${190 + k},${186 + k},${178 + k})`; g.fillRect(i * t, j * t, t, t);
        }
        speckle(g, s, s, 1500, ["rgba(120,115,108,.35)", "rgba(230,226,220,.4)"]);
        g.strokeStyle = "#8f8a83"; g.lineWidth = 2;
        for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, s); g.moveTo(0, i * t); g.lineTo(s, i * t); g.stroke(); }
      }),
      concrete: tex(512, (g, s) => {
        g.fillStyle = "#4e5054"; g.fillRect(0, 0, s, s);
        for (let i = 0; i < 90; i++) {
          const x = rnd() * s, y = rnd() * s, r = 20 + rnd() * 70;
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          const c = rnd() > 0.5 ? "255,255,255" : "0,0,0";
          gr.addColorStop(0, `rgba(${c},.05)`); gr.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        speckle(g, s, s, 1600, ["rgba(255,255,255,.08)", "rgba(0,0,0,.12)"]);
      }),
      track: tex(2048, (g, s, h) => {
        g.fillStyle = "#16171a"; g.fillRect(0, 0, s, h); speckle(g, s, h, 6000, ["#202226", "#0f1012"]);
        g.fillStyle = "#e9ecef";
        g.fillRect(0, 10, s, 7); g.fillRect(0, h - 17, s, 7);
        g.font = "600 34px Inter, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        for (let m = 1; m < 10; m++) {
          const x = (m / 10) * s;
          g.fillRect(x - 2, 30, 4, m % 2 ? 40 : 70);
          g.fillRect(x - 2, h - 30 - (m % 2 ? 40 : 70), 4, m % 2 ? 40 : 70);
          if (m % 2 === 0) g.fillText(String(m).padStart(2, "0"), x, h / 2);
        }
      }, { h: 288 }),
      rug: tex(512, (g, s) => {
        g.fillStyle = "#3f3c39"; g.fillRect(0, 0, s, s); speckle(g, s, s, 9000, ["#47433f", "#36332f", "#4d4a46"], 1.5);
        g.strokeStyle = "#8a7f72"; g.lineWidth = 6; g.strokeRect(18, 18, s - 36, s - 36);
      }, { repeat: false }),
      screen: tex(512, (g, s, h) => {
        const gr = g.createLinearGradient(0, 0, s, h);
        gr.addColorStop(0, "#0d2a5c"); gr.addColorStop(0.55, "#2f7ad6"); gr.addColorStop(1, "#7fd0ff");
        g.fillStyle = gr; g.fillRect(0, 0, s, h);
        g.fillStyle = "rgba(255,255,255,.85)";
        for (let i = 0; i < 18; i++) { const bh = 20 + rnd() * 110; g.fillRect(40 + i * 24, h - 40 - bh, 12, bh); }
        g.fillRect(40, 50, 180, 18); g.fillRect(40, 80, 110, 12);
      }, { repeat: false, h: 170 }),
      shadow: tex(256, (g, s) => {
        const gr = g.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2);
        gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.fillRect(0, 0, s, s);
      }, { repeat: false }),
    };
    return T;
  }
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
