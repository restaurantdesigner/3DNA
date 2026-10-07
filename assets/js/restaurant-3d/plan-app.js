/*
 * Restaurants page — 3D restaurant plan, page logic (small, no dependencies).
 *
 * Works without WebGL: the drawing, the zone buttons, the metrics and the
 * default zone specification are plain HTML rendered at build time
 * (scripts/restaurant-plan.js). This script:
 *   - selects zones (labels, drawing, 3D floor) and objects (3D model, or the
 *     schedules inside the panel) and re-renders the specification panel with
 *     spec-panel.js from the #rplan-spec data
 *   - panel sections are tabs on desktop and collapsible blocks in a bottom
 *     sheet on phones (the sheet opens on selection, closes with ×, Esc or a tap outside)
 *   - loads the 3D model (plan-scene.js + Three.js) after the page has loaded,
 *     only with WebGL, and pauses its rendering while off screen
 */
(() => {
  const scriptVersion = (document.currentScript && document.currentScript.src.split("?v=")[1]) || "1";
  const app = document.querySelector("[data-rplan]");
  if (!app) return;
  let data = null, spec = null;
  try {
    data = JSON.parse(document.getElementById("rplan-data").textContent);
    spec = JSON.parse(document.getElementById("rplan-spec").textContent);
  } catch (e) { return; }
  const Panel = window.RestaurantSpecPanel;

  const viewport = app.querySelector("[data-rplan-viewport]");
  const poster = app.querySelector("[data-rplan-poster]");
  const labels = app.querySelector("[data-rplan-labels]");
  const loading = app.querySelector("[data-rplan-loading]");
  const hint = app.querySelector(".rplan3d__hint");
  const panel = app.querySelector("[data-rplan-panel]");
  const body = app.querySelector("[data-rplan-panel-body]");
  const scrim = app.querySelector("[data-rplan-scrim]");
  const resetBtn = app.querySelector("[data-rplan-reset]");
  const buttons = [...labels.querySelectorAll(".rp-zone")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = window.matchMedia("(max-width: 900px)");
  let scene = null;
  let current = { type: "zone", id: data.defaultZone };
  let tab = "overview";
  let lastFocus = null;

  if (hint && !window.matchMedia("(pointer: fine)").matches) hint.textContent = hint.dataset.hintTouch;
  app.classList.add("is-enhanced");

  // ---------- panel ----------
  function applyTab() {
    const secs = [...body.querySelectorAll(".rps__sec")];
    if (!secs.some((s) => s.dataset.sec === tab)) tab = "overview";
    body.querySelectorAll(".rps__tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.rpsTab === tab)));
    secs.forEach((s) => s.classList.toggle("is-active", s.dataset.sec === tab));
  }
  function render() {
    if (!Panel) return;
    body.innerHTML = Panel.render(spec, current);
    applyTab();
    body.scrollTop = 0;
    panel.scrollTop = 0;
  }
  function openSheet() {
    if (!phone.matches) return;
    if (!app.classList.contains("is-sheet-open")) lastFocus = document.activeElement;
    app.classList.add("is-sheet-open");
    document.body.classList.add("rp-sheet-open");
    scrim.hidden = false;
    requestAnimationFrame(() => body.querySelector(".rps__close")?.focus({ preventScroll: true }));
  }
  function closeSheet() {
    if (!app.classList.contains("is-sheet-open")) return;
    app.classList.remove("is-sheet-open");
    document.body.classList.remove("rp-sheet-open");
    scrim.hidden = true;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function select(sel, { track = false, fromScene = false, sheet = true } = {}) {
    if (sel.type === "zone" && !spec.zones[sel.id]) return;
    if (sel.type === "object" && !spec.objects[sel.id]) return;
    const same = current.type === sel.type && current.id === sel.id;
    current = sel;
    if (!same) tab = "overview";
    const zoneId = sel.type === "zone" ? sel.id : null;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.zone === zoneId)));
    poster?.querySelectorAll(".rp-poster__zone").forEach((p) => p.classList.toggle("is-active", p.dataset.zone === zoneId));
    if (scene) scene.select(zoneId, sel.type === "object" ? sel.id : null);
    render();
    if (sheet) openSheet();
    if (track && window.track) window.track(sel.type === "zone" ? "restaurant_plan_zone_selected" : "restaurant_plan_object_selected", { id: sel.id, language: document.documentElement.lang });
  }

  buttons.forEach((b) => b.addEventListener("click", () => select({ type: "zone", id: b.dataset.zone }, { track: true })));
  poster?.querySelectorAll(".rp-poster__zone").forEach((p) => p.addEventListener("click", () => select({ type: "zone", id: p.dataset.zone }, { track: true })));

  body.addEventListener("click", (e) => {
    const el = e.target.closest("[data-rps-open], [data-rps-zone], [data-rps-tab], [data-rps-toggle], [data-rps-close]");
    if (!el) return;
    if (el.hasAttribute("data-rps-open")) select({ type: "object", id: el.dataset.rpsOpen, zone: current.type === "zone" ? current.id : current.zone }, { track: true });
    else if (el.hasAttribute("data-rps-zone")) select({ type: "zone", id: el.dataset.rpsZone }, { track: true });
    else if (el.hasAttribute("data-rps-tab")) { tab = el.dataset.rpsTab; applyTab(); }
    else if (el.hasAttribute("data-rps-toggle")) {
      const sec = el.closest(".rps__sec");
      const open = !sec.classList.contains("is-open");
      sec.classList.toggle("is-open", open);
      el.setAttribute("aria-expanded", String(open));
    } else if (el.hasAttribute("data-rps-close")) closeSheet();
  });
  // arrow keys between tabs (desktop)
  body.addEventListener("keydown", (e) => {
    const t = e.target.closest(".rps__tab");
    if (!t || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const all = [...body.querySelectorAll(".rps__tab")];
    const next = all[(all.indexOf(t) + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
    tab = next.dataset.rpsTab; applyTab(); next.focus();
  });
  scrim.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  phone.addEventListener?.("change", () => { if (!phone.matches) closeSheet(); });

  select(current, { sheet: false });

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
        onSelect: (kind, id, zone) => select(kind === "zone" ? { type: "zone", id } : { type: "object", id, zone }, { track: true, fromScene: true }),
      });
      scene.select(current.type === "zone" ? current.id : null, current.type === "object" ? current.id : null);
      app.classList.add("is-3d");
      if (resetBtn) { resetBtn.hidden = false; resetBtn.addEventListener("click", () => scene.resetView()); }
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
