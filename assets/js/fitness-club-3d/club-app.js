/*
 * Fitness page, section 03 / Zonificación — page logic (small, no dependencies).
 *
 * Works without WebGL: the plan drawing, the zone buttons and the zone
 * specifications are plain HTML rendered at build time (scripts/fitness-club.js).
 * This script:
 *   - selects a zone (buttons, plan drawing or the 3D model) and shows its
 *     specification: a floating panel on desktop, a bottom sheet on phones
 *     (closes with ×, Esc or a tap outside)
 *   - shows the eye-level interior of the selected zone: "3D model | Interior
 *     view" switch over the viewport, a render thumbnail in the zone panel, and a
 *     full-screen viewer (previous / next zone, Esc, back to 3D). With WebGL the
 *     interior is a 360° panorama (club-pano.js: slow turn from the render's view,
 *     drag to look around); the flat render is the placeholder and the fallback
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
  let mode = "model";                       // "model" | "interior" (render of the selected zone)
  let onScreen = false;
  const zonesById = new Map((data.zones || []).map((z) => [z.id, z]));
  const order = (data.zones || []).filter((z) => z.render).map((z) => z.id);
  const interior = app.querySelector("[data-fclub-interior]");
  const interiorImg = app.querySelector("[data-fclub-interior-img]");
  const interiorName = app.querySelector("[data-fclub-interior-name]");
  const views = app.querySelector("[data-fclub-views]");
  const viewBtns = [...app.querySelectorAll("[data-fclub-view]")];
  const lb = app.querySelector("[data-fclub-lightbox]");
  const lbImg = app.querySelector("[data-fclub-lb-img]");
  const lbNum = app.querySelector("[data-fclub-lb-num]");
  const lbName = app.querySelector("[data-fclub-lb-name]");
  let lbZone = null;
  // 360° panoramas: one viewer inside the 3D viewport, one in the full-screen viewer (created on first use)
  const panoBox = app.querySelector("[data-fclub-pano]");
  const lbPanoBox = app.querySelector("[data-fclub-lb-pano]");
  const canPano = (() => { try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } })();
  let panoMod = null;
  const viewers = new Map();
  const panoUrl = (p) => { const big = Math.max(screen.width, screen.height) * Math.min(window.devicePixelRatio || 1, 2) > 1800; return p[big ? 3072 : 2048] || p[2048] || p[3072]; };
  async function panoIn(box, z) {
    if (!canPano || !box || !z || !z.render || !z.render.pano) { box?.classList.remove("is-on"); return null; }
    box.classList.add("is-on");
    try {
      panoMod = panoMod || await import(`/assets/js/fitness-club-3d/club-pano.js?v=${scriptVersion}`);
      if (!viewers.has(box)) viewers.set(box, panoMod.createPano(box, { reducedMotion, onError: () => box.classList.remove("is-on") }));
      const v = viewers.get(box);
      await v.show(panoUrl(z.render.pano));
      return v;
    } catch (e) { console.warn("360° panorama unavailable, keeping the flat render.", e); box.classList.remove("is-on"); return null; }
  }
  const panoActive = (box, on) => { const v = viewers.get(box); if (v) v.setActive(on); };

  const trackRender = (zone, how) => { if (window.track) window.track("fitness_club_render_viewed", { zone, view: how, language: document.documentElement.lang }); };

  function setImg(img, r, sizes) {
    img.sizes = sizes; img.srcset = r.srcset; img.src = r.src; img.alt = r.alt;
  }
  // inline interior view (inside the 3D viewport); the model is paused while it is shown
  function setMode(next, { track = false } = {}) {
    const z = zonesById.get(current);
    if (next === "interior" && !(z && z.render)) next = "model";
    mode = next;
    if (mode === "interior") {
      setImg(interiorImg, z.render, "(max-width: 900px) 100vw, 66vw");
      interiorName.textContent = `${z.index} · ${z.name}`;
      if (track) trackRender(current, "inline");
    }
    interior.hidden = mode !== "interior";
    if (mode === "interior") panoIn(panoBox, z).then((v) => v && v.setActive(mode === "interior" && (onScreen || !scene) && !(lb && lb.open)));
    else panoActive(panoBox, false);
    app.classList.toggle("is-interior", mode === "interior");
    viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fclubView === mode)));
    if (scene) scene.setActive(onScreen && mode === "model");
  }
  function syncViews() {
    const z = zonesById.get(current);
    views.hidden = !(z && z.render);
    if (views.hidden && mode === "interior") setMode("model");
    else if (mode === "interior") setMode("interior");
  }
  // full-screen viewer
  function lbShow(id) {
    const z = zonesById.get(id);
    if (!z || !z.render) return;
    lbZone = id;
    lbImg.sizes = "100vw"; lbImg.srcset = z.render.pano && canPano ? "" : z.render.srcset; lbImg.src = z.render.pano && canPano ? z.render.src : z.render.full; lbImg.alt = z.render.alt;   // with a panorama the flat image is only the placeholder
    lbNum.textContent = z.index; lbName.textContent = z.name;
    panoIn(lbPanoBox, z).then((v) => v && v.setActive(lb.open));
  }
  function openLightbox(id) {
    if (!lb || !zonesById.get(id)?.render) return;
    lbShow(id);
    if (!lb.open) { lastFocus = document.activeElement; lb.showModal(); document.body.classList.add("fclub-lb-open"); panoActive(panoBox, false); panoActive(lbPanoBox, true); }
    trackRender(id, "fullscreen");
  }
  function closeLightbox() { if (lb && lb.open) lb.close(); }
  function step(d) {
    const i = order.indexOf(lbZone);
    const id = order[(i + d + order.length) % order.length];
    lbShow(id);
    show(id, { track: false });                      // the 3D model and the panel follow the viewer
  }

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
    syncViews();
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !(lb && lb.open)) closeSheet(); });
  phone.addEventListener?.("change", () => { if (!phone.matches) closeSheet(); });
  resetBtn.addEventListener("click", () => { setMode("model"); show("overview"); });

  // interior render controls
  viewBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.fclubView, { track: true })));
  app.querySelector("[data-fclub-fullscreen]")?.addEventListener("click", () => openLightbox(current));
  panel.addEventListener("click", (e) => {
    const t = e.target.closest("[data-fclub-open-render]");
    if (!t) return;
    // phones: the sheet covers the model, so the render opens full screen; desktop: inside the viewport
    if (phone.matches) openLightbox(t.dataset.fclubOpenRender); else setMode("interior", { track: true });
  });
  if (lb) {
    app.querySelector("[data-fclub-lb-prev]").addEventListener("click", () => step(-1));
    app.querySelector("[data-fclub-lb-next]").addEventListener("click", () => step(1));
    app.querySelector("[data-fclub-lb-close]").addEventListener("click", closeLightbox);
    app.querySelector("[data-fclub-lb-back]").addEventListener("click", () => { closeLightbox(); closeSheet(); setMode("model"); app.scrollIntoView({ block: "nearest" }); });
    lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
    lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1); });
    lb.addEventListener("close", () => { document.body.classList.remove("fclub-lb-open"); panoActive(lbPanoBox, false); if (mode === "interior") panoActive(panoBox, true); if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); });
    // swipe between zones on touch screens
    let x0 = null;
    lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }, { passive: true });
  }

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
      new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; scene.setActive(onScreen && mode === "model"); panoActive(panoBox, onScreen && mode === "interior" && !(lb && lb.open)); }, { rootMargin: "100px 0px" }).observe(viewport);
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
