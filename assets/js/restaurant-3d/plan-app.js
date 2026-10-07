/*
 * Restaurants page — 3D restaurant plan, page logic (small, no dependencies).
 *
 * Works without WebGL: the axonometric SVG drawing, the zone buttons, the
 * metrics and the zone details are plain HTML rendered at build time
 * (scripts/restaurant-plan.js). This script:
 *   - makes the zone buttons / drawing select one zone at a time
 *   - shows that zone's details (seats, tables, furniture, planning notes)
 *   - loads the 3D model (plan-scene.js + Three.js) after the page has loaded,
 *     only with WebGL, and pauses its rendering while off screen
 */
(() => {
  const scriptVersion = (document.currentScript && document.currentScript.src.split("?v=")[1]) || "1";
  const app = document.querySelector("[data-rplan]");
  if (!app) return;
  let data = null;
  try { data = JSON.parse(document.getElementById("rplan-data").textContent); } catch (e) { return; }

  const viewport = app.querySelector("[data-rplan-viewport]");
  const poster = app.querySelector("[data-rplan-poster]");
  const labels = app.querySelector("[data-rplan-labels]");
  const loading = app.querySelector("[data-rplan-loading]");
  const hint = app.querySelector(".rplan3d__hint");
  const buttons = [...labels.querySelectorAll(".rp-zone")];
  const articles = new Map([...app.querySelectorAll(".rp-info")].map((a) => [a.dataset.zone, a]));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let scene = null;
  let current = null;

  if (hint && !window.matchMedia("(pointer: fine)").matches) hint.textContent = hint.dataset.hintTouch;
  app.classList.add("is-enhanced");

  function show(id, { track = false } = {}) {
    if (!articles.has(id)) return;
    current = id;
    articles.forEach((el, key) => { el.hidden = key !== id; });
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.zone === id)));
    poster?.querySelectorAll(".rp-poster__zone").forEach((p) => p.classList.toggle("is-active", p.dataset.zone === id));
    if (scene) scene.select(id);
    if (track && window.track) window.track("restaurant_plan_zone_selected", { zone: id, language: document.documentElement.lang });
  }

  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.zone, { track: true })));
  poster?.querySelectorAll(".rp-poster__zone").forEach((p) => p.addEventListener("click", () => show(p.dataset.zone, { track: true })));
  show(data.defaultZone);

  // ---------------- 3D ----------------
  const webgl = (() => {
    try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
    catch (e) { return false; }
  })();
  if (!webgl || !("IntersectionObserver" in window) || !("ResizeObserver" in window)) return;

  let started = false;
  async function start3D() {
    if (started) return;
    started = true;
    const slow = setTimeout(() => { loading.hidden = false; }, 600);
    try {
      const mod = await import(`/assets/js/restaurant-3d/plan-scene.js?v=${scriptVersion}`);
      scene = await mod.createPlanScene({
        container: viewport,
        labels,
        data,
        reducedMotion,
        ariaLabel: poster?.getAttribute("aria-label") || "",
        onSelect: (id) => show(id, { track: true }),
      });
      scene.select(current);
      app.classList.add("is-3d");
      new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting), { rootMargin: "100px 0px" }).observe(viewport);
    } catch (err) {
      console.warn("Restaurant 3D plan unavailable, keeping the drawing.", err);
    } finally {
      clearTimeout(slow);
      loading.hidden = true;
    }
  }

  // the section opens the page: start right after load (idle), or when it nears the viewport
  const arm = () => {
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      (window.requestIdleCallback || ((fn) => setTimeout(fn, 1)))(start3D, { timeout: 800 });
    }, { rootMargin: "400px 0px" }).observe(app);
  };
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
})();
