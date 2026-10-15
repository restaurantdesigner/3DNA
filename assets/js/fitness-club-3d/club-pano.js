/*
 * Fitness club, section 03 / Zonificación — 360° panorama viewer for the zone interiors.
 *
 * Equirectangular, path-traced panoramas (images/fitness/club-interiors/*-360-*.webp) on the
 * inside of a sphere, navigated like Street View:
 *   - drag with the mouse or one finger: look around the current panorama
 *   - mouse wheel or two-finger pinch: zoom (the wheel zooms in the full-screen viewer, and in the
 *     page viewer once it has been clicked or touched, so it never hijacks page scrolling)
 *   - arrow keys look around, + / − zoom (when the viewer has focus)
 * The viewer never changes panorama on its own: switching zones is done by the page's explicit
 * previous / next buttons. The view starts on the direction of the flat eye-level render and turns
 * slowly until the visitor interacts (no turning with prefers-reduced-motion); rendering stops while
 * the viewer is hidden or off screen. three.js comes from the page import map (as the 3D model).
 */
import * as THREE from "three";

const SPEED = 2.4;          // degrees per second: slow automatic turn
const RESUME_MS = 3500;     // pause after an interaction before the turn resumes
const START_LON = 180;      // image centre = start view (the direction of the flat render)
const FOV_MIN = 30, FOV_MAX = 100;

export function createPano(container, { reducedMotion = false, onError, wheelZoom = "focus" } = {}) {
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

  let lon = START_LON, lat = 0, fov = null, auto = 0, lastInput = 0, raf = 0, last = 0, active = false, loadedUrl = "", token = 0;
  const loader = new THREE.TextureLoader();
  const baseFov = () => ((container.clientWidth || 1) / (container.clientHeight || 1) < 1 ? 88 : 72);   // portrait: a little wider
  const clampFov = (v) => Math.max(FOV_MIN, Math.min(FOV_MAX, v));

  function size() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = fov ?? baseFov();
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
    if (!reducedMotion && pointers.size === 0 && performance.now() - lastInput > RESUME_MS) {
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
  const touched = () => { lastInput = performance.now(); auto = 0; if (!raf) draw(); };

  // look around (degrees follow the finger: 1 px ≈ fov / viewer height)
  const look = (dx, dy) => {
    const k = camera.fov / (container.clientHeight || 600);
    lon -= dx * k; lat = Math.max(-85, Math.min(85, lat + dy * k));
    touched();
  };
  const zoomTo = (v) => { fov = clampFov(v); camera.fov = fov; camera.updateProjectionMatrix(); touched(); };

  // pointers: one = rotate, two = pinch zoom (no rotation while pinching, no jump when a finger lifts)
  const pointers = new Map();
  let pinch = null;
  const pinchDist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true, focusVisible: false });   // wheel zoom works; the outline stays for keyboard users
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable: plain events still work */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinch = { d: pinchDist(), fov: camera.fov };
    container.classList.add("is-dragging");
    touched();
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size >= 2 && pinch) zoomTo(pinch.fov * pinch.d / pinchDist());
    else if (pointers.size === 1) look(dx, dy);
  });
  const end = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) container.classList.remove("is-dragging");
    lastInput = performance.now();
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("lostpointercapture", end);
  // no browser gestures (page zoom, text selection, image drag) on the panorama
  canvas.addEventListener("contextmenu", (e) => { if (pointers.size) e.preventDefault(); });
  canvas.addEventListener("dragstart", (e) => e.preventDefault());

  // wheel zoom: full screen always; in the page only once the viewer has been clicked or touched
  canvas.addEventListener("wheel", (e) => {
    if (wheelZoom !== "always" && document.activeElement !== canvas && !e.ctrlKey) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomTo(camera.fov * Math.exp(dy * 0.0012));
  }, { passive: false });

  canvas.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -30], ArrowDown: [0, 30] }[e.key];
    if (step) { e.preventDefault(); e.stopPropagation(); look(step[0], step[1]); return; }
    if (e.key === "+" || e.key === "=") { e.preventDefault(); e.stopPropagation(); zoomTo(camera.fov / 1.15); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); e.stopPropagation(); zoomTo(camera.fov * 1.15); }
  });

  // load a panorama: the start view is the flat render's direction, zoom back to normal
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
        loadedUrl = url; lon = START_LON; lat = 0; fov = null; auto = 0; lastInput = performance.now() - RESUME_MS + 900;
        container.classList.remove("is-loading"); container.classList.add("is-ready");
        size(); draw(); resolve();
      }, undefined, (err) => { container.classList.remove("is-loading"); if (onError) onError(err); resolve(); });
    });
  }

  function dispose() { setActive(false); ro.disconnect(); geo.dispose(); mat.map?.dispose(); mat.dispose(); renderer.dispose(); canvas.remove(); }
  size();
  // state(): for tests and support
  return { show, setActive, dispose, canvas, state: () => ({ lon, lat, fov: camera.fov, url: loadedUrl, pointers: pointers.size }) };
}
