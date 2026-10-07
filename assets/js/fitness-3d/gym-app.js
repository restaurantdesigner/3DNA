/*
 * Fitness planner — page logic (small, no dependencies).
 *
 * Works without WebGL: the zone list, the details panel and the SVG floor plan
 * are plain HTML rendered at build time. This script:
 *   - turns the zone list / plan into a selector that shows one zone at a time
 *   - opens the details as a bottom sheet on phones
 *   - lazy-loads the 3D scene (gym-scene.js + Three.js) only when the section
 *     approaches the viewport, after the page has loaded, and only with WebGL
 *   - pauses 3D rendering while the section is off screen
 */
(() => {
  // captured now: document.currentScript is null inside later async code
  const scriptVersion = (document.currentScript && document.currentScript.src.split("?v=")[1]) || "1";
  const app = document.querySelector("[data-gym-app]");
  if (!app) return;
  const section = app.closest("section");
  const viewport = app.querySelector("[data-gym-viewport]");
  const poster = app.querySelector("[data-gym-poster]");
  const loading = app.querySelector("[data-gym-loading]");
  const hint = app.querySelector("[data-gym-hint]");
  const labelsEl = app.querySelector("[data-gym-labels]");
  const panel = app.querySelector("[data-gym-panel]");
  const resetBtn = app.querySelector("[data-gym-reset]");
  const closeBtn = app.querySelector("[data-gym-close]");
  const buttons = [...app.querySelectorAll(".gym3d__zone-btn")];
  const articles = new Map([...app.querySelectorAll(".gym-zone")].map((a) => [a.dataset.zone, a]));
  let data = null;
  try { data = JSON.parse(document.getElementById("gym-data").textContent); } catch (e) { return; }

  const phone = window.matchMedia("(max-width: 900px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let scene = null;
  let current = "overview";

  app.classList.add("is-enhanced");

  function show(id, { fromScene = false, moveCamera = true } = {}) {
    if (!articles.has(id)) id = "overview";
    current = id;
    articles.forEach((el, key) => { el.hidden = key !== id; });
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.zone === id)));
    app.querySelectorAll(".gym-plan__zone").forEach((g) => g.classList.toggle("is-active", g.dataset.zone === id));
    app.classList.toggle("has-selection", id !== "overview");
    app.classList.toggle("is-sheet-open", id !== "overview" && phone.matches);
    if (scene && !fromScene) id === "overview" ? scene.reset({ animate: moveCamera }) : scene.select(id, { animate: moveCamera });
    if (id !== "overview" && window.track) window.track("fitness_zone_selected", { zone: id, language: document.documentElement.lang });
  }

  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.zone)));
  resetBtn?.addEventListener("click", () => show("overview"));
  closeBtn?.addEventListener("click", () => {
    const btn = buttons.find((b) => b.dataset.zone === current);
    show("overview");
    btn?.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && app.classList.contains("is-sheet-open")) closeBtn?.click();
  });
  phone.addEventListener?.("change", () => app.classList.toggle("is-sheet-open", current !== "overview" && phone.matches));

  // SVG plan zones are clickable too (fallback / before 3D is ready)
  app.querySelectorAll(".gym-plan__zone").forEach((g) => {
    g.addEventListener("click", () => show(g.dataset.zone));
  });

  show("overview", { moveCamera: false });

  // ---------------- lazy 3D ----------------
  const webglAvailable = (() => {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  })();
  if (!webglAvailable || !("IntersectionObserver" in window)) return;

  let started = false;
  async function start3D() {
    if (started) return;
    started = true;
    loading.hidden = false;
    try {
      const mod = await import(`/assets/js/fitness-3d/gym-scene.js?v=${scriptVersion}`);
      scene = await mod.createGymScene({
        container: viewport,
        labelsEl,
        data,
        reducedMotion,
        ariaLabel: poster.querySelector("svg")?.getAttribute("aria-label") || "",
        onSelect: (id) => show(id || "overview", { fromScene: true }),
      });
      poster.hidden = true;
      hint.hidden = false;
      app.classList.add("is-3d");
      if (current !== "overview") scene.select(current, { animate: false });
      watchVisibility();
    } catch (err) {
      console.warn("Fitness 3D planner unavailable, keeping the floor plan.", err);
    } finally {
      loading.hidden = true;
    }
  }

  function watchVisibility() {
    new IntersectionObserver(([entry]) => scene && scene.setActive(entry.isIntersecting), { rootMargin: "100px 0px" })
      .observe(viewport);
  }

  const arm = () => new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    start3D();
  }, { rootMargin: "600px 0px" }).observe(section);
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
})();
