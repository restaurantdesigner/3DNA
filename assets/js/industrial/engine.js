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
import { createRenderer, setupLighting } from "/assets/js/shared-3d/archviz.js?v=ind1";
import { createMaterials, createTextures, buildEquipment, createBuilder } from "./equipment.js?v=ind1";

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
  const path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  return new THREE.TubeGeometry(path, Math.max(8, pts.length * 6), r, 10, false);
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
  const lowPower = opts.lowPower ?? (matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4);
  const listeners = { select: [], hover: [], ready: [] };
  const emit = (k, v) => listeners[k].forEach((f) => f(v));

  // ---------------------------------------------------------------- renderer / scene / camera
  const renderer = createRenderer({ lowPower, exposure: 0.92, className: "twin__canvas" });
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const S = F.site;
  const center = new THREE.Vector3((S.x[0] + S.x[1]) / 2, 0, (S.z[0] + S.z[1]) / 2);
  const span = Math.max(S.x[1] - S.x[0], S.z[1] - S.z[0]);
  // dusk: deep blue sky, warm low sun with long shadows, cool fill
  scene.background = skyTexture("#070d22", "#c98a6a", "#1a1e28");
  scene.fog = new THREE.Fog(0x2a3048, span * 1.2, span * 3.6);
  setupLighting(renderer, scene, { center, span, hemi: [0x9fb4e8, 0x1c1a17, 0.62], key: 0xffc996, keyIntensity: 2.6, keyFrom: [-0.85, 0.62, 0.55], fill: [0x6d8cff, 0.55] });
  const camera = new THREE.PerspectiveCamera(36, 1, 1, span * 8);
  // overview: the whole site framed for the canvas' aspect ratio
  const homeDir = new THREE.Vector3(0.62, 0.52, 0.6).normalize();
  const home = { pos: new THREE.Vector3(), target: center.clone().add(new THREE.Vector3(0, 6, 0)) };
  const frameHome = () => {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2, hfov = Math.atan(Math.tan(v) * camera.aspect);
    const dist = Math.max((span * 0.5) / Math.tan(hfov), (span * 0.34) / Math.tan(v)) * (showcase ? 0.78 : 0.86);
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
  groundB.add(M.grass, new THREE.PlaneGeometry(span * 8, span * 8), groundB.T(center.x, -0.02, center.z, 0, -Math.PI / 2));
  groundB.add(M.concrete, new THREE.PlaneGeometry(S.x[1] - S.x[0], S.z[1] - S.z[0]), groundB.T(center.x, 0, center.z, 0, -Math.PI / 2));
  for (const r of F.roads || []) groundB.add(M.asphalt, new THREE.PlaneGeometry(r.w, r.d), groundB.T(r.x, 0.02, r.z, 0, -Math.PI / 2));
  for (const r of F.roads || []) if (r.lines !== false) {
    const along = r.w > r.d, len = along ? r.w : r.d;
    for (let s = -len / 2 + 2; s < len / 2 - 2; s += 6) groundB.add(M.white, new THREE.PlaneGeometry(along ? 3 : 0.2, along ? 0.2 : 3), groundB.T(r.x + (along ? s : 0), 0.04, r.z + (along ? 0 : s), 0, -Math.PI / 2));
  }
  if (F.fence) {
    const [x0, x1] = F.fence.x, [z0, z1] = F.fence.z, step = 4;
    const edge = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / step); for (let i = 0; i <= n; i++) { const t = i / n; groundB.box(M.darkSteel, 0.12, 2.4, 0.12, ax + (bx - ax) * t, 1.2, az + (bz - az) * t); } for (const y of [0.4, 1.4, 2.3]) groundB.rod(M.darkSteel, 0.03, [ax, y, az], [bx, y, bz], 4); };
    edge(x0, z0, x1, z0); edge(x1, z0, x1, z1); edge(x1, z1, x0, z1); edge(x0, z1, x0, z0);
  }
  const ground = groundB.group("ground");
  ground.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  scene.add(ground);

  // ---------------------------------------------------------------- equipment
  const items = new Map();          // id -> { item, group, info, meshes, worldPorts }
  const pickables = [];
  for (const it of F.equipment) {
    const { group, info } = buildEquipment(M, it.type, it.params || {});
    group.position.set(it.pos[0], 0, it.pos[1]);
    group.rotation.y = it.rot || 0;
    group.userData.id = it.id;
    scene.add(group);
    group.updateMatrixWorld(true);
    const meshes = []; group.traverse((o) => { if (o.isMesh) { o.userData.id = it.id; meshes.push(o); pickables.push(o); } });
    const worldPorts = {};
    for (const [k, p] of Object.entries(info.ports || {})) worldPorts[k] = new THREE.Vector3(...p).applyMatrix4(group.matrixWorld);
    items.set(it.id, { item: it, group, info, meshes });
    items.get(it.id).worldPorts = worldPorts;
  }

  // ---------------------------------------------------------------- process connections (pipes)
  const streams = F.streams;
  const pipes = [];
  const pipeGroup = new THREE.Group(); scene.add(pipeGroup);
  for (const c of F.connections) {
    const A = items.get(c.from), B = items.get(c.to);
    if (!A || !B) { console.warn("connection skipped", c); continue; }
    const a = (A.worldPorts[c.fromPort || "out"] || A.group.position).clone();
    const b = (B.worldPorts[c.toPort || "in"] || B.group.position).clone();
    const st = streams[c.stream];
    const pts = route(a, b, st.lane, c.direct);
    const len = pathLength(pts);
    const geo = tubeAlong(pts, st.r || 0.28);
    const real = new THREE.MeshStandardMaterial({ color: st.pipe || 0xb9c0c8, metalness: 0.65, roughness: 0.35 });
    const ft = flowTexture(st.color); ft.repeat.set(Math.max(1, len / 7), 1);
    const flow = new THREE.MeshBasicMaterial({ map: ft, color: 0xffffff, toneMapped: false });
    const mesh = new THREE.Mesh(geo, real);
    mesh.castShadow = true; mesh.userData = { stream: c.stream, from: c.from, to: c.to };
    pipeGroup.add(mesh);
    // flanges + a valve near the source
    const fb = createBuilder(M);
    for (const p of [pts[0], pts[pts.length - 1]]) fb.cyl(M.steel, (st.r || 0.28) * 1.8, 0.15, p.x, p.y, p.z, 14);
    if (pts.length > 2 && !c.direct) { const p = pts[1].clone().lerp(pts[0], 0.35); fb.cyl(M.cabRed, 0.18, 0.5, p.x + 0.45, p.y, p.z, 12); fb.box(M.darkSteel, 0.5, 0.5, 0.5, p.x, p.y, p.z); }
    const fl = fb.group("flanges"); pipeGroup.add(fl);
    pipes.push({ c, mesh, real, flow, tex: ft, len, pts });
  }

  // ---------------------------------------------------------------- area markers (process view)
  const areaGroup = new THREE.Group(); areaGroup.visible = false; scene.add(areaGroup);
  const labelLayer = document.createElement("div"); labelLayer.className = "twin__labels"; container.appendChild(labelLayer);
  const areaLabels = [];
  for (const ar of F.areas) {
    const [x0, x1] = ar.x, [z0, z1] = ar.z;
    const mat = new THREE.MeshBasicMaterial({ color: ar.color, transparent: true, opacity: 0.16, depthWrite: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
    pl.rotation.x = -Math.PI / 2; pl.position.set((x0 + x1) / 2, 0.08, (z0 + z1) / 2);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), new THREE.LineBasicMaterial({ color: ar.color }));
    edge.rotation.x = -Math.PI / 2; edge.position.copy(pl.position).setY(0.1);
    areaGroup.add(pl, edge);
    const el = document.createElement("button"); el.type = "button"; el.className = "twin__area"; el.style.setProperty("--c", "#" + new THREE.Color(ar.color).getHexString());
    el.innerHTML = `<b>${ar.step ? String(ar.step).padStart(2, "0") : ""}</b>${tr(ar.name, lang)}`;
    el.addEventListener("click", () => focus(ar.id));
    labelLayer.appendChild(el);
    areaLabels.push({ el, pos: new THREE.Vector3((x0 + x1) / 2, ar.labelY || 26, (z0 + z1) / 2) });
  }
  const tip = document.createElement("div"); tip.className = "twin__tip"; tip.hidden = true; container.appendChild(tip);

  // ---------------------------------------------------------------- views
  const ghost = new THREE.MeshStandardMaterial({ color: 0xaec2e6, transparent: true, opacity: 0.24, depthWrite: false, metalness: 0, roughness: 1 });
  const xray = new THREE.MeshBasicMaterial({ color: 0x7fd6ff, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false });
  const highlightCache = new Map();
  let view = "realistic", selected = null, streamFocus = null, needs = true;
  const baseMat = (mesh) => mesh.userData.base || (mesh.userData.base = mesh.material);
  function applyView() {
    for (const [id, rec] of items) {
      for (const m of rec.meshes) {
        const base = baseMat(m);
        let mat = base;
        if (view === "process") mat = ghost;
        if (view === "xray") mat = xray;
        if (id === selected) {
          const key = mat.uuid;
          if (!highlightCache.has(key)) { const h = mat.clone(); if (h.emissive) { h.emissive = new THREE.Color(0x2f8cff); h.emissiveIntensity = view === "realistic" ? 0.45 : 1; } else h.color = new THREE.Color(0x52b4ff); h.opacity = Math.max(h.opacity || 1, 0.85); highlightCache.set(key, h); }
          mat = highlightCache.get(key);
        }
        m.material = mat;
        m.castShadow = view === "realistic" && base !== M.glass && base !== M.grating;
      }
    }
    for (const p of pipes) {
      const on = view !== "realistic";
      p.mesh.material = on ? p.flow : p.real;
      const dim = streamFocus && p.c.stream !== streamFocus;
      p.mesh.visible = !(dim && on);
    }
    ground.visible = true;
    areaGroup.visible = view === "process";
    labelLayer.classList.toggle("is-on", view === "process");
    needs = true;
  }
  function setView(v) { view = v; applyView(); }
  function highlightStream(s) { streamFocus = s; applyView(); }

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
    return hit ? hit.object.userData.id : null;
  }
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; if (showcase) controls.autoRotate = false; });
  cv.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || showcase) return;
    const id = pick(e); select(id);
  });
  cv.addEventListener("pointermove", (e) => {
    if (showcase || e.pointerType !== "mouse") return;
    const now = performance.now(); if (now - lastHover < 60) return; lastHover = now;
    const id = pick(e);
    if (id !== hoverId) { hoverId = id; cv.style.cursor = id ? "pointer" : ""; emit("hover", id ? items.get(id).item : null); }
    if (id) {
      const it = items.get(id).item, r = container.getBoundingClientRect();
      tip.hidden = false; tip.textContent = nameOf(F, it, lang);
      tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
    } else tip.hidden = true;
  });
  cv.addEventListener("pointerleave", () => { tip.hidden = true; });
  controls.addEventListener("change", () => { needs = true; });

  // ---------------------------------------------------------------- size, loop, visibility
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needs = true;
    if (!framed) { frameHome(); camera.position.copy(home.pos); controls.target.copy(home.target); framed = true; }
  }
  let framed = false;
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let visible = true;
  const io = new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; }, { threshold: 0.01 }); io.observe(container);
  const clock = new THREE.Clock(), v3 = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    let moving = controls.update();
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
      if (k >= 1) tween = null; moving = true;
    }
    const animated = view !== "realistic" || (showcase && controls.autoRotate);
    if (view !== "realistic") for (const p of pipes) p.tex.offset.x -= dt * 0.6 * (8 / p.len) * p.tex.repeat.x;
    if (!(needs || moving || animated)) return;
    needs = false;
    renderer.render(scene, camera);
    if (view === "process") {
      const w = container.clientWidth, h = container.clientHeight;
      for (const l of areaLabels) { v3.copy(l.pos).project(camera); const off = v3.z > 1; l.el.style.transform = `translate(-50%, -50%) translate(${(v3.x * .5 + .5) * w}px, ${(-v3.y * .5 + .5) * h}px)`; l.el.style.visibility = off ? "hidden" : "visible"; }
    }
  });

  const api = {
    scene, camera, controls, renderer, items,
    select, focus, setView, highlightStream,
    home: () => { select(null, false); frameHome(); flyTo(home.pos.clone(), home.target.clone()); },
    get view() { return view; },
    on: (k, f) => { listeners[k].push(f); return api; },
    resize,
    dispose() { renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); renderer.dispose(); container.innerHTML = ""; }
  };
  emit("ready", api);
  return api;
}
