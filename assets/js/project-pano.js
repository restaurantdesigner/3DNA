/*
 * Project pages: interactive 360° panoramas (scripts/projects.js "panorama" item).
 * Uses the fitness club's viewer (fitness-club-3d/club-pano.js): drag or one finger to look around,
 * wheel (after a click) or pinch to zoom, arrow keys; the view turns slowly until the visitor
 * interacts (not with prefers-reduced-motion). The sharpest copy the device can show is loaded:
 * up to 8192 px where the GPU allows it (4096 px on phones). The flat still stays if WebGL fails.
 * Full screen covers the window (works on phones too); Esc or the button leaves it.
 */
import { createPano } from "/assets/js/fitness-club-3d/club-pano.js?v=20261101a";

const boxes = document.querySelectorAll("[data-ppano]");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = Math.min(screen.width || innerWidth, screen.height || innerHeight) < 600 && navigator.maxTouchPoints > 0;

function maxTexture() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2") || document.createElement("canvas").getContext("webgl");
    return gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0;
  } catch (e) { return 0; }
}
const maxTex = maxTexture();

function source(box) {
  const urls = box.dataset.sources.split(" "), widths = box.dataset.widths.split(" ").map(Number);
  const limit = Math.min(maxTex || 2048, phone ? 4096 : 8192);
  let pick = 0;
  widths.forEach((w, i) => { if (w <= limit) pick = i; });
  return urls[pick];
}

function setup(box) {
  if (!maxTex) return;                                        // no WebGL: keep the still image
  let viewer = null, onScreen = false;
  const full = box.querySelector(".pproj__pano-full");
  const start = () => {
    if (viewer) return;
    viewer = createPano(box, { reducedMotion, wheelZoom: "focus", onError: () => box.classList.add("is-failed") });
    viewer.show(source(box));
    viewer.setActive(onScreen);
  };
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start();
    if (viewer) viewer.setActive(onScreen || box.classList.contains("is-full"));
  }, { rootMargin: "200px 0px" }).observe(box);

  const setFull = (on) => {
    box.classList.toggle("is-full", on);
    document.documentElement.classList.toggle("ppano-open", on);
    full.setAttribute("aria-pressed", String(on));
    full.textContent = on ? box.dataset.labelExit : box.dataset.labelFull;
    if (viewer) { viewer.setActive(true); viewer.canvas.focus({ preventScroll: true }); }
  };
  full.addEventListener("click", () => setFull(!box.classList.contains("is-full")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && box.classList.contains("is-full")) setFull(false); });
}

boxes.forEach(setup);
