/*
 * Fitness page, section 03 / Zonificación — page logic (small, no dependencies).
 *
 * Works without WebGL: the plan drawing, the zone buttons and the zone
 * specifications are plain HTML rendered at build time (scripts/fitness-club.js).
 * This script:
 *   - selects a zone (buttons, plan drawing or the 3D model) and shows its
 *     specification: a floating panel on desktop, a bottom sheet on phones
 *     (closes with ×, Esc or a tap outside)
 *   - loads the 3D model (club-scene.js + Three.js) after the page has loaded,
 *     when the section approaches the viewport, only with WebGL, and pauses
 *     its rendering while the section is off screen
 */
(() => {
  const scriptVersion = (document.currentScript && document.currentScript.src.split("?v=")[1]) || "1";
  const app = document.querySelector("[data-fclub]");
  if (!app) return;
  let data = null;
  try { data = JSON.parse(document.getElementById("fclub-data").textContent); } catch (e) { return; }

  const viewport = app.querySelector("[data-fclub-viewport]");
  const poster = app.querySelector("[data-fclub-poster]");
  const labels = app.querySelector("[data-fclub-labels]");
  const loading = app.querySelector("[data-fclub-loading]");
  const fallback = app.querySelector("[data-fclub-fallback]");
  const resetBtn = app.querySelector("[data-fclub-reset]");
  const hint = app.querySelector("[data-fclub-hint]");
  const panel = app.querySelector("[data-fclub-panel]");
  const scrim = app.querySelector("[data-fclub-scrim]");
  const buttons = [...app.querySelectorAll(".fclub__zone")];
  const articles = new Map([...panel.querySelectorAll(".fclub-z")].map((a) => [a.dataset.zone, a]));
  const phone = window.matchMedia("(max-width: 900px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let scene = null;
  let current = "overview";
  let lastFocus = null;

  if (hint && !window.matchMedia("(pointer: fine)").matches) hint.textContent = hint.dataset.hintTouch;
  app.classList.add("is-enhanced");

  function openSheet() {
    if (!phone.matches || current === "overview") return;
    if (!app.classList.contains("is-sheet-open")) lastFocus = document.activeElement;
    app.classList.add("is-sheet-open");
    document.body.classList.add("fclub-sheet-open");
    scrim.hidden = false;
    requestAnimationFrame(() => articles.get(current)?.querySelector("[data-fclub-close]")?.focus({ preventScroll: true }));
  }
  function closeSheet() {
    if (!app.classList.contains("is-sheet-open")) return;
    app.classList.remove("is-sheet-open");
    document.body.classList.remove("fclub-sheet-open");
    scrim.hidden = true;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function show(id, { fromScene = false, track = false } = {}) {
    if (!articles.has(id)) id = "overview";
    current = id;
    articles.forEach((el, key) => { el.hidden = key !== id; });
    panel.scrollTop = 0;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.zone === id)));
    poster?.querySelectorAll(".fclub-plan__zone").forEach((g) => g.classList.toggle("is-active", g.dataset.zone === id));
    app.classList.toggle("has-selection", id !== "overview");
    if (scene && !fromScene) id === "overview" ? scene.reset() : scene.select(id);
    if (id === "overview") closeSheet(); else openSheet();
    if (track && id !== "overview" && window.track) window.track("fitness_club_zone_selected", { zone: id, language: document.documentElement.lang });
  }

  buttons.forEach((b) => b.addEventListener("click", () => {
    show(b.dataset.zone === current ? "overview" : b.dataset.zone, { track: true });
  }));
  poster?.querySelectorAll(".fclub-plan__zone").forEach((g) => g.addEventListener("click", () => show(g.dataset.zone, { track: true })));
  panel.addEventListener("click", (e) => {
    if (!e.target.closest("[data-fclub-close]")) return;
    if (phone.matches) closeSheet(); else show("overview");
  });
  scrim.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  phone.addEventListener?.("change", () => { if (!phone.matches) closeSheet(); });
  resetBtn.addEventListener("click", () => show("overview"));

  show("overview");

  // ---------------- 3D ----------------
  const webgl = (() => {
    try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
    catch (e) { return false; }
  })();
  if (!webgl || !("IntersectionObserver" in window) || !("ResizeObserver" in window)) {
    fallback.hidden = false;
    return;
  }

  let started = false;
  async function start3D() {
    if (started) return;
    started = true;
    loading.hidden = false;
    try {
      const mod = await import(`/assets/js/fitness-club-3d/club-scene.js?v=${scriptVersion}`);
      scene = await mod.createClubScene({
        container: viewport,
        labels,
        data,
        reducedMotion,
        ariaLabel: poster?.getAttribute("aria-label") || "",
        onSelect: (id) => show(id || "overview", { fromScene: true, track: !!id }),
      });
      poster.style.display = "none";
      hint.hidden = false;
      resetBtn.hidden = false;
      app.classList.add("is-3d");
      if (current !== "overview") scene.select(current, { animate: false });
      new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting), { rootMargin: "100px 0px" }).observe(viewport);
    } catch (err) {
      console.warn("Fitness club 3D model unavailable, keeping the plan drawing.", err);
      fallback.hidden = false;
    } finally {
      loading.hidden = true;
    }
  }

  const arm = () => new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    (window.requestIdleCallback || ((fn) => setTimeout(fn, 1)))(start3D, { timeout: 800 });
  }, { rootMargin: "700px 0px" }).observe(app);
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
})();
