/*
 * Hospital naming opportunities — page logic (small, no dependencies).
 *
 * Works without WebGL: the opportunity list, the details panel and the SVG
 * floor plan are plain HTML rendered at build time. This script:
 *   - turns the list / plan into a selector that shows one opportunity at a time
 *   - opens the details as a bottom sheet on phones
 *   - lazy-loads the 3D scene (naming-scene.js + Three.js) only when the section
 *     approaches the viewport, after the page has loaded, and only with WebGL
 *   - pauses 3D rendering while the section is off screen
 */
(() => {
  // captured now: document.currentScript is null inside later async code
  const scriptVersion = (document.currentScript && document.currentScript.src.split("?v=")[1]) || "1";
  const app = document.querySelector("[data-naming-app]");
  if (!app) return;
  const section = app.closest("section");
  const viewport = app.querySelector("[data-naming-viewport]");
  const poster = app.querySelector("[data-naming-poster]");
  const loading = app.querySelector("[data-naming-loading]");
  const hint = app.querySelector("[data-naming-hint]");
  const spotsEl = app.querySelector("[data-naming-spots]");
  const resetBtn = app.querySelector("[data-naming-reset]");
  const closeBtn = app.querySelector("[data-naming-close]");
  const buttons = [...app.querySelectorAll(".hnaming__opp")];
  const articles = new Map([...app.querySelectorAll(".hn-opp")].map((a) => [a.dataset.opp, a]));
  let data = null;
  try { data = JSON.parse(document.getElementById("naming-data").textContent); } catch (e) { return; }

  const phone = window.matchMedia("(max-width: 900px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let scene = null;
  let current = "overview";

  app.classList.add("is-enhanced");

  function show(id, { fromScene = false, moveCamera = true } = {}) {
    if (!articles.has(id)) id = "overview";
    current = id;
    articles.forEach((el, key) => { el.hidden = key !== id; });
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.opp === id)));
    app.querySelectorAll(".hn-plan__spot").forEach((g) => g.classList.toggle("is-active", g.dataset.opp === id));
    app.classList.toggle("has-selection", id !== "overview");
    app.classList.toggle("is-sheet-open", id !== "overview" && phone.matches);
    if (scene && !fromScene) id === "overview" ? scene.reset({ animate: moveCamera }) : scene.select(id, { animate: moveCamera });
    if (id !== "overview" && window.track) window.track("naming_opportunity_selected", { opportunity: id, language: document.documentElement.lang });
  }

  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.opp)));
  resetBtn?.addEventListener("click", () => show("overview"));
  closeBtn?.addEventListener("click", () => {
    const btn = buttons.find((b) => b.dataset.opp === current);
    show("overview");
    btn?.focus({ preventScroll: true });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && app.classList.contains("is-sheet-open")) closeBtn?.click();
  });
  phone.addEventListener?.("change", () => app.classList.toggle("is-sheet-open", current !== "overview" && phone.matches));

  // SVG plan hotspots are clickable too (before 3D is ready / without WebGL)
  app.querySelectorAll(".hn-plan__spot").forEach((g) => g.addEventListener("click", () => show(g.dataset.opp)));

  show("overview", { moveCamera: false });

  // section view (once)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      if (window.track) window.track("naming_section_viewed", { language: document.documentElement.lang });
    }, { threshold: 0.3 }).observe(section);
  }

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
      const mod = await import(`/assets/js/healthcare-3d/naming-scene.js?v=${scriptVersion}`);
      scene = await mod.createNamingScene({
        container: viewport,
        spotsEl,
        data,
        reducedMotion,
        ariaLabel: poster.querySelector("svg")?.getAttribute("aria-label") || "",
        onSelect: (id) => show(id || "overview", { fromScene: true }),
      });
      poster.hidden = true;
      hint.hidden = false;
      app.classList.add("is-3d");
      if (current !== "overview") scene.select(current, { animate: false });
      new IntersectionObserver(([entry]) => scene && scene.setActive(entry.isIntersecting), { rootMargin: "100px 0px" })
        .observe(viewport);
    } catch (err) {
      console.warn("Naming 3D model unavailable, keeping the floor plan.", err);
    } finally {
      loading.hidden = true;
    }
  }

  const arm = () => new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    start3D();
  }, { rootMargin: "600px 0px" }).observe(section);
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
})();
