/*
 * Fitness club, section 03 / Zonificación — 360° panorama viewer for the zone interiors.
 *
 * Equirectangular, path-traced panoramas (images/fitness/club-interiors/*-360-*.webp) on the
 * inside of a sphere. The view starts on the same direction as the flat eye-level render and turns
 * slowly; drag (mouse or touch) or the arrow keys look around, then the slow turn resumes after a
 * pause. No turning with prefers-reduced-motion. Rendering stops while the viewer is hidden or off
 * screen. three.js comes from the page import map (same version as the 3D model).
 */
import * as THREE from "three";

const SPEED = 2.4;          // degrees per second: slow automatic turn
const RESUME_MS = 3500;     // pause after an interaction before the turn resumes
const START_LON = 180;      // image centre = start view (the direction of the flat render)

export function createPano(container, { reducedMotion = false, onError } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "fclub-pano__canvas";
  canvas.tabIndex = 0;
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 100);
  const geo = new THREE.SphereGeometry(50, 96, 48);
  geo.scale(-1, 1, 1);                                   // seen from inside, not mirrored
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  scene.add(new THREE.Mesh(geo, mat));

  let lon = START_LON, lat = 0, auto = 0, lastInput = 0, raf = 0, last = 0, active = false, loadedUrl = "", token = 0;
  const loader = new THREE.TextureLoader();

  function size() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 88 : 72;                    // portrait screens: a little wider
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => { size(); draw(); });
  ro.observe(container);

  function draw() {
    const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon);
    camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    renderer.render(scene, camera);
  }
  function frame(t) {
    raf = 0;
    if (!active) return;
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
    last = t;
    if (!reducedMotion && !dragging && performance.now() - lastInput > RESUME_MS) {
      auto = Math.min(1, auto + dt * 0.5);               // ease back in after an interaction
      lon += SPEED * auto * dt;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  function setActive(on) {
    active = !!on;
    if (active && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!active && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  // drag to look around
  let dragging = false, px = 0, py = 0;
  const look = (dx, dy) => {
    const k = camera.fov / (container.clientHeight || 600);
    lon -= dx * k; lat = Math.max(-80, Math.min(80, lat + dy * k));
    lastInput = performance.now(); auto = 0;
    if (!raf) draw();
  };
  canvas.addEventListener("pointerdown", (e) => { dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture?.(e.pointerId); container.classList.add("is-dragging"); });
  canvas.addEventListener("pointermove", (e) => { if (!dragging) return; look(e.clientX - px, e.clientY - py); px = e.clientX; py = e.clientY; });
  const end = () => { dragging = false; lastInput = performance.now(); container.classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -30], ArrowDown: [0, 30] }[e.key];
    if (!step) return;
    e.preventDefault(); e.stopPropagation(); look(step[0], step[1]);
  });

  // load a panorama: the start view is the flat render's direction
  function show(url) {
    if (url === loadedUrl) return Promise.resolve();
    const my = ++token;
    container.classList.add("is-loading");
    return new Promise((resolve) => {
      loader.load(url, (tex) => {
        if (my !== token) { tex.dispose(); return resolve(); }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        if (mat.map) mat.map.dispose();
        mat.map = tex; mat.needsUpdate = true;
        loadedUrl = url; lon = START_LON; lat = 0; auto = 0; lastInput = performance.now() - RESUME_MS + 900;
        container.classList.remove("is-loading"); container.classList.add("is-ready");
        size(); draw(); resolve();
      }, undefined, (err) => { container.classList.remove("is-loading"); if (onError) onError(err); resolve(); });
    });
  }

  function dispose() { setActive(false); ro.disconnect(); geo.dispose(); mat.map?.dispose(); mat.dispose(); renderer.dispose(); canvas.remove(); }
  size();
  return { show, setActive, dispose, canvas };
}
