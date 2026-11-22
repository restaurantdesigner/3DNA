/*
 * Interactive 3D site model of a development (property pages, "La promoción en 3D").
 * Scene from primitive geometry only; all data comes from the page:
 *   <script type="application/json" data-site-model> — layout + apartments (assets/data/site-models/*.json,
 *   resolved by scripts/real-estate.js with the listing links per language).
 * Panel (block buttons, apartments by level, "Vista general") is server-rendered HTML; this script adds
 * the 3D view and keeps both in step. Three.js 0.169 (same files as the washroom model), loaded only when
 * the viewer comes near the screen.
 *
 *   - opens on an angled overview of all blocks and the pool
 *   - orbit / zoom (mouse, wheel, touch: one finger turns, two fingers zoom and pan)
 *   - click or tap a building, or a numbered button: the block is highlighted, the camera moves to it,
 *     its apartments show in the panel; pointing at an apartment lights up its unit in the model
 *   - "Vista general" returns to the opening view
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createPost } from "/assets/js/shared-3d/post.js";

const root = document.querySelector("[data-site-model-root]");
if (root) init(root);

function init(root) {
  const data = JSON.parse(root.querySelector("[data-site-model]").textContent);
  const stage = root.querySelector("[data-sm-stage]");
  const S = data.image.scale;
  const cx = data.image.width / 2, cy = data.image.height / 2;
  // brochure aerial pixels -> scene units (x right, z towards the viewer = down in the image)
  const P = ([x, y]) => new THREE.Vector3((x - cx) / S, 0, (y - cy) / S);
  const LEVEL_H = 3.1;

  // ---------------------------------------------------------------- renderer, camera, controls
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
  catch (e) { root.classList.add("is-no-webgl"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef0ea);
  scene.fog = new THREE.Fog(0xeef0ea, 140, 260);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
  // ambient occlusion + MSAA (assets/js/shared-3d/post.js)
  const post = createPost(renderer, scene, camera, { lowPower: matchMedia("(pointer: coarse)").matches, radius: 1.2, onReady: () => requestRender() });
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.46;           // never below the ground
  controls.minDistance = 22;
  controls.maxDistance = 170;
  controls.screenSpacePanning = false;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  // opening view: an angled overview from the south-west; its distance is fitted to the screen shape
  // (see fitHome) so all four blocks and the pool are in view on wide and narrow screens
  const HOME_DIR = new THREE.Vector3(-48, 74, 102).normalize();
  const HOME = { target: new THREE.Vector3(2, 4, 2), position: new THREE.Vector3(-46, 78, 104) };
  camera.position.copy(HOME.position);
  controls.target.copy(HOME.target);

  // ---------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa58c, 1.35));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
  sun.position.set(-60, 90, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 60, bottom: -60, near: 10, far: 260 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // ---------------------------------------------------------------- materials
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...extra });
  const M = {
    ground: mat(0xb9c4a6), plot: mat(0x93a77f), path: mat(0xe9e2d2), road: mat(0xc9c7c1), deck: mat(0xefe9dd),
    water: mat(0x4fa9d6, { roughness: 0.25 }), wall: mat(0xfbfaf7), terrace: mat(0xe8e6e1), dark: mat(0x6b6f72),
    trunk: mat(0x8a7a62), leaf: mat(0x6f8f5a), hedge: mat(0x7d9668),
  };
  const HIGHLIGHT = 0xf2c56b, UNIT_HOVER = 0x2f6f9f;

  // ---------------------------------------------------------------- site: ground, plot, roads, paths, pool, trees
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; scene.add(ground);
  const shape = (pts) => { const s = new THREE.Shape(); pts.forEach((p, i) => { const v = P(p); i ? s.lineTo(v.x, -v.z) : s.moveTo(v.x, -v.z); }); return s; };
  const plot = new THREE.Mesh(new THREE.ShapeGeometry(shape(data.site.plot)), M.plot);
  plot.rotation.x = -Math.PI / 2; plot.position.y = 0.01; plot.receiveShadow = true; scene.add(plot);
  const strip = (pts, width, material, y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = P(pts[i]), b = P(pts[i + 1]), len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len + width * 0.6, 0.06, width), material);
      m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
      m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      m.receiveShadow = true; scene.add(m);
    }
  };
  data.site.roads.forEach((r) => strip(r, 6.5, M.road, 0.02));
  data.site.paths.forEach((r) => strip(r, 1.8, M.path, 0.05));
  const rotRect = (spec, h, material, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(spec.size[0] / S, h, spec.size[1] / S), material);
    const c = P(spec.center); m.position.set(c.x, y, c.z); m.rotation.y = -THREE.MathUtils.degToRad(spec.angle || 0);
    m.receiveShadow = true; scene.add(m); return m;
  };
  rotRect(data.site.pool.deck, 0.3, M.deck, 0.15);
  data.site.pool.water.forEach((w) => rotRect(w, 0.08, M.water, 0.32));
  data.site.trees.forEach(([x, y], i) => {
    const p = P([x, y]), h = 6 + (i % 4) * 1.4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 6), M.trunk);
    trunk.position.set(p.x, h / 2, p.z); trunk.castShadow = true; scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9 + (i % 3) * 0.4, 0), M.leaf);
    crown.position.set(p.x, h + 0.6, p.z); crown.scale.y = 0.6; crown.castShadow = true; scene.add(crown);
  });

  // ---------------------------------------------------------------- blocks: white stepped volumes, one unit per apartment
  const blocks = new Map();                    // id -> { group, units: [mesh], center, size }
  const unitByRef = new Map();
  const pickables = [];
  data.blocks.forEach((b) => {
    const group = new THREE.Group();
    const c = P(b.center);
    group.position.set(c.x, 0, c.z);
    group.rotation.y = -THREE.MathUtils.degToRad(b.angle);
    group.userData.block = b.id;
    const L = b.length / S, D = b.depth / S;
    const n = b.levels[0].length, w = L / n;
    const units = [];
    b.levels.forEach((level, li) => {
      const top = li === b.levels.length - 1 && li > 1;
      const depth = top ? D * 0.78 : D * (1 - li * 0.06);
      const zOff = top ? -D * 0.11 : -li * D * 0.03;
      level.forEach((u, i) => {
        const span = u.span || [i, i + 1];
        const width = (span[1] - span[0]) * w - 0.35;
        const x = -L / 2 + ((span[0] + span[1]) / 2) * w;
        const y = li * LEVEL_H + LEVEL_H / 2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(width, LEVEL_H - 0.12, depth), M.wall.clone());
        m.position.set(x, y, zOff);
        m.castShadow = m.receiveShadow = true;
        m.userData = { block: b.id, ref: u.ref };
        group.add(m); units.push(m); pickables.push(m); unitByRef.set(u.ref, m);
        // terrace slab on the garden side, a darker window band, a pergola on solariums
        const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 1.6), M.terrace);
        slab.position.set(x, li * LEVEL_H + 0.11, zOff + depth / 2 + 0.8); slab.castShadow = slab.receiveShadow = true;
        slab.userData = m.userData; group.add(slab); pickables.push(slab);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, LEVEL_H * 0.55, 0.06), M.dark);
        glass.position.set(x, y + 0.1, zOff + depth / 2 + 0.03); group.add(glass);
        if (data.solariumTypes.includes(u.type)) {
          const roofY = (li + 1) * LEVEL_H;
          const frame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.18, depth * 0.55), M.terrace);
          frame.position.set(x, roofY + 2.2, zOff); frame.castShadow = true; group.add(frame);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), M.terrace);
            post.position.set(x + sx * width * 0.33, roofY + 1.1, zOff + sz * depth * 0.25); group.add(post);
          });
        }
      });
    });
    // basement plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(L + 0.6, 0.6, D + 2.4), M.terrace);
    plinth.position.set(0, 0.3 - 0.29, 0.6); plinth.receiveShadow = true; group.add(plinth);
    scene.add(group);
    const box = new THREE.Box3().setFromObject(group);
    blocks.set(b.id, { group, units, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() });
  });

  // the whole site (blocks + pool) as a sphere, for fitting the opening view
  const siteBox = new THREE.Box3();
  blocks.forEach((b) => siteBox.expandByObject(b.group));
  const siteSphere = siteBox.getBoundingSphere(new THREE.Sphere());
  HOME.target.copy(siteSphere.center).setY(3);
  function fitHome() {
    const v = THREE.MathUtils.degToRad(camera.fov), h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const dist = (siteSphere.radius * 0.9) / Math.sin(Math.min(v, h) / 2);
    HOME.position.copy(HOME.target).addScaledVector(HOME_DIR, dist);
    controls.maxDistance = Math.max(170, dist * 1.4);
  }

  // ---------------------------------------------------------------- numbered markers (HTML over the canvas)
  const markers = new Map();
  data.blocks.forEach((b) => {
    const el = document.createElement("button");
    el.type = "button"; el.className = "sm-marker"; el.textContent = b.id;
    el.setAttribute("aria-label", root.getAttribute("data-label-block").replace("{n}", b.id));
    el.addEventListener("click", () => select(b.id));
    stage.appendChild(el);
    markers.set(b.id, el);
  });
  const tmp = new THREE.Vector3();
  function placeMarkers() {
    const r = renderer.domElement.getBoundingClientRect();
    markers.forEach((el, id) => {
      const blk = blocks.get(id);
      tmp.copy(blk.center); tmp.y = blk.group.children.reduce((m, c) => Math.max(m, c.position.y), 0) + 6;
      tmp.project(camera);
      const vis = tmp.z < 1;
      el.style.transform = `translate(${((tmp.x + 1) / 2) * r.width}px, ${((1 - tmp.y) / 2) * r.height}px) translate(-50%, -50%)`;
      el.style.opacity = vis ? "" : "0";
    });
  }

  // ---------------------------------------------------------------- selection, camera moves
  let selected = null, hoverRef = null, anim = null;
  const tint = () => {
    blocks.forEach((blk, id) => blk.units.forEach((m) => {
      const on = selected === id, dim = selected != null && !on;
      m.material.color.set(m.userData.ref === hoverRef ? UNIT_HOVER : on ? HIGHLIGHT : 0xfbfaf7);
      m.material.emissive.set(m.userData.ref === hoverRef ? 0x0d2a40 : 0x000000);
      m.material.transparent = dim; m.material.opacity = dim ? 0.55 : 1;
    }));
    markers.forEach((el, id) => el.classList.toggle("is-on", id === selected));
    requestRender();
  };
  function flyTo(target, position) {
    anim = { t0: performance.now(), dur: 900, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: target, toP: position };
    requestRender();
  }
  function select(id, { fly = true } = {}) {
    selected = id;
    root.setAttribute("data-selected", id == null ? "" : id);
    // panel (server-rendered): buttons and the block's apartment list
    root.querySelectorAll("[data-sm-block]").forEach((btn) => btn.setAttribute("aria-pressed", String(Number(btn.getAttribute("data-sm-block")) === id)));
    root.querySelectorAll("[data-sm-list]").forEach((ul) => { ul.hidden = Number(ul.getAttribute("data-sm-list")) !== id; });
    const intro = root.querySelector("[data-sm-intro]"); if (intro) intro.hidden = id != null;
    tint();
    if (!fly) return;
    if (id == null) { userMoved = false; flyTo(HOME.target.clone(), HOME.position.clone()); return; }
    const blk = blocks.get(id);
    const dir = camera.position.clone().sub(controls.target).setY(0).normalize();
    const dist = Math.max(42, blk.size * 1.35);
    flyTo(blk.center.clone().setY(4), blk.center.clone().add(dir.multiplyScalar(dist * 0.78)).setY(dist * 0.62));
  }
  root.querySelectorAll("[data-sm-block]").forEach((btn) => btn.addEventListener("click", () => select(Number(btn.getAttribute("data-sm-block")))));
  root.querySelector("[data-sm-home]").addEventListener("click", () => select(null));
  root.querySelectorAll("[data-sm-ref]").forEach((row) => {
    const on = () => { hoverRef = row.getAttribute("data-sm-ref"); tint(); };
    const off = () => { hoverRef = null; tint(); };
    row.addEventListener("mouseenter", on); row.addEventListener("mouseleave", off);
    row.addEventListener("focusin", on); row.addEventListener("focusout", off);
  });

  // click / tap on a building (a drag is an orbit, not a click)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) select(hit.object.userData.block);
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    renderer.domElement.style.cursor = ray.intersectObjects(pickables, false).length ? "pointer" : "grab";
  });

  // ---------------------------------------------------------------- render on demand
  let pending = false;
  function requestRender() { if (!pending) { pending = true; requestAnimationFrame(frame); } }
  function frame(now) {
    pending = false;
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      controls.target.lerpVectors(anim.fromT, anim.toT, e);
      camera.position.lerpVectors(anim.fromP, anim.toP, e);
      if (k >= 1) anim = null;
    }
    const moving = controls.update();
    post.render();
    placeMarkers();
    if (anim || moving) requestRender();
  }
  controls.addEventListener("change", requestRender);
  let userMoved = false;
  controls.addEventListener("start", () => { userMoved = true; });
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); post.setSize(w, h);
    camera.aspect = w / h;
    // narrow screens: step back so all four blocks stay in view
    camera.fov = w < 600 ? 46 : 38;
    camera.updateProjectionMatrix();
    fitHome();
    // still on the opening view: follow the new fit
    if (selected == null && !anim && !userMoved) { camera.position.copy(HOME.position); controls.target.copy(HOME.target); }
    requestRender();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  root.classList.add("is-ready");
  select(null, { fly: false });
  // fonts and late layout can move the stage after the first frame: draw (and place the markers) again
  window.addEventListener("load", requestRender);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestRender);
  setTimeout(requestRender, 700);
}
