/*
 * Fitness page · case study "De un plano PDF a un proyecto digital interactivo".
 *  - live viewer: the existing /prototipos/centro-deportivo/ app in an iframe (one WebGL
 *    renderer, no copy of the model). It loads by itself shortly before the section is
 *    reached — same pattern as the Fitness zoning model: after the page has loaded, when
 *    idle, ~700 px ahead. A quiet status line shows until the scene reports its first frame.
 *    Rendering pauses while the viewer is off screen (the model state is kept).
 *    The mouse wheel scrolls the page until the visitor clicks into the model (handled inside).
 *  - fullscreen on the viewer stage (expanded window everywhere; native fullscreen on top)
 *  - 2D plan / 3D model comparison slider
 *  - "what the project contains": figures computed live from the model's own data
 *    (same calculation module as the viewer; nothing is hard-coded on this page)
 */
(() => {
  const root = document.querySelector("[data-fcase]");
  if (!root) return;
  const BASE = "/prototipos/centro-deportivo/";

  // ---------- live viewer (automatic) ----------
  const stage = root.querySelector("[data-fcase-stage]");
  const status = root.querySelector("[data-fcase-status]");
  const fail = root.querySelector("[data-fcase-fail]");
  const exitBtn = root.querySelector("[data-fcase-exit]");
  const fullBtn = root.querySelector("[data-fcase-full]");
  let frame = null, ready = false, onScreen = false, failTimer = 0;

  const webgl = (() => {
    try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
    catch (e) { return false; }
  })();
  function showFail() {
    clearTimeout(failTimer);
    stage.classList.remove("is-loading");
    stage.classList.add("is-failed");
    status.hidden = true; fail.hidden = false;
    if (frame) frame.hidden = true;
  }
  const tellActive = () => { if (ready && frame && frame.contentWindow) frame.contentWindow.postMessage({ type: "centro-deportivo:active", on: onScreen || stage.classList.contains("is-full") }, location.origin); };

  function load() {
    if (frame || !webgl) { if (!webgl) showFail(); return; }
    frame = document.createElement("iframe");
    frame.className = "fcase__frame";
    frame.src = stage.dataset.src;
    frame.title = stage.dataset.title || "";
    frame.setAttribute("allow", "fullscreen");
    stage.appendChild(frame);
    stage.classList.add("is-loading");
    // no answer from the scene in time: offer the standalone viewer instead
    failTimer = setTimeout(() => { if (!ready) showFail(); }, 30000);
  }
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === "centro-deportivo:ready") {
      ready = true; clearTimeout(failTimer);
      stage.classList.remove("is-loading"); stage.classList.add("is-ready");
      status.hidden = true;
      tellActive();
    } else if (e.data.type === "centro-deportivo:error") showFail();
  });

  if (!("IntersectionObserver" in window)) load();
  else {
    // start shortly before the section is reached, once the page itself has finished loading
    const arm = () => new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      (window.requestIdleCallback || ((fn) => setTimeout(fn, 1)))(load, { timeout: 800 });
    }, { rootMargin: "700px 0px" }).observe(stage);
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    // pause the scene's rendering while it is off screen
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; tellActive(); }, { rootMargin: "100px 0px" }).observe(stage);
  }

  // ---------- fullscreen ----------
  // The stage always expands to fill the window (works everywhere, also on iPhone where
  // element fullscreen does not exist); native fullscreen is requested on top when available.
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const isFull = () => stage.classList.contains("is-full");
  function enterFull() {
    load();
    stage.classList.add("is-full");
    document.documentElement.classList.add("fcase-lock");
    exitBtn.hidden = false;
    tellActive();
    const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req) { try { const p = req.call(stage); if (p && p.catch) p.catch(() => {}); } catch (e) { /* expanded mode stays */ } }
    exitBtn.focus({ preventScroll: true });
  }
  function exitFull() {
    if (fsEl() === stage) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ignore */ } }
    stage.classList.remove("is-full");
    document.documentElement.classList.remove("fcase-lock");
    exitBtn.hidden = true;
    tellActive();
    fullBtn.focus({ preventScroll: true });
  }
  fullBtn.addEventListener("click", enterFull);
  exitBtn.addEventListener("click", exitFull);
  // leaving native fullscreen with Esc also leaves the expanded mode
  const onFs = () => { if (!fsEl() && isFull()) exitFull(); };
  document.addEventListener("fullscreenchange", onFs);
  document.addEventListener("webkitfullscreenchange", onFs);
  const onKey = (e) => { if (e.key === "Escape" && isFull()) exitFull(); };
  document.addEventListener("keydown", onKey);
  // Esc pressed inside the viewer (same-origin frame)
  stage.addEventListener("load", () => { try { frame.contentWindow.addEventListener("keydown", onKey); } catch (e) { /* ignore */ } }, true);

  // ---------- 2D / 3D comparison ----------
  const cmp = root.querySelector("[data-fcase-compare]");
  if (cmp) {
    const range = cmp.querySelector("input[type=range]");
    const set = () => cmp.style.setProperty("--pos", range.value + "%");
    range.addEventListener("input", set); set();
  }

  // ---------- live project figures (lazy: when the section approaches) ----------
  const facts = root.querySelector("[data-fcase-facts]");
  let started = false;
  async function fill() {
    if (started) return; started = true;
    try {
      const [model, spec, calc] = await Promise.all([
        fetch(BASE + "plan-model.json").then((r) => r.json()),
        fetch(BASE + "equipamiento-especificaciones.json").then((r) => r.json()),
        import(BASE + "presupuesto.js"),
      ]);
      const rooms = model.rooms.map((r) => ({ id: r.id, name: r.name }));
      // base preliminary estimate (visitors' own edits in the viewer are not applied here)
      const D = calc.dashboard(spec, { scenario: "estimate" }, rooms);
      const loc = facts.dataset.locale || "es-ES";
      const n0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
      const n2 = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const eur = new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
      const fmt = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k]);
      const area = model.rooms.reduce((s, r) => s + (r.area || 0), 0);
      const units = D.S.lines.reduce((s, L) => s + (L.r.qty.v || 0), 0);
      const T = D.summary;
      const put = (k, text) => { const el = facts.querySelector(`[data-fact="${k}"]`); if (el && text) { el.textContent = text; el.classList.add("is-live"); } };
      put("spaces", fmt(facts.dataset.fSpaces, { n: rooms.length, area: n2.format(area) }));
      put("equipment", fmt(facts.dataset.fEquipment, { lines: T.n, units: n0.format(units) }));
      if (T.pending.cost === 0) put("cost", fmt(facts.dataset.fCost, { cost: eur.format(T.cost) }));
      if (T.pending.kw === 0) put("kw", n2.format(T.installedKw) + " kW");
      if (T.pending.kwh === 0) put("kwh", fmt(facts.dataset.fKwh, { kwh: n0.format(T.kwh) }));
    } catch (e) {
      // data unavailable: the descriptive texts already in the page stay
    }
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); fill(); } }, { rootMargin: "400px 0px" });
    io.observe(facts);
  } else fill();

  // ---------- Sala Multiusos walkthrough video ----------
  // Loaded when it approaches the viewport; plays once, muted, when mostly visible (never with sound
  // on its own, never with reduced motion); no loop; pauses when scrolled away. Play/pause and sound
  // buttons are always available.
  const vbox = root.querySelector("[data-fcase-video]");
  if (vbox) {
    const video = vbox.querySelector("video");
    const playBtn = vbox.querySelector("[data-v-play]");
    const soundBtn = vbox.querySelector("[data-v-sound]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let autoplayed = false;
    // poster (the interior view) and video are both fetched only when the gallery approaches
    const ensurePoster = () => { if (!video.getAttribute("poster")) video.poster = video.dataset.fcasePoster; };
    const ensureSrc = () => { ensurePoster(); if (!video.getAttribute("src")) { video.src = video.dataset.fcaseSrc; video.preload = "auto"; } };
    const sync = () => {
      const playing = !video.paused && !video.ended;
      playBtn.setAttribute("aria-pressed", String(playing));
      playBtn.setAttribute("aria-label", playing ? playBtn.dataset.labelPause : playBtn.dataset.labelPlay);
      soundBtn.setAttribute("aria-pressed", String(!video.muted));
      soundBtn.setAttribute("aria-label", video.muted ? soundBtn.dataset.labelOn : soundBtn.dataset.labelOff);
      vbox.classList.toggle("is-playing", playing);
      vbox.classList.toggle("is-sound", !video.muted);
    };
    const play = () => { ensureSrc(); if (video.ended) video.currentTime = 0; const p = video.play(); if (p && p.catch) p.catch(() => sync()); };
    playBtn.addEventListener("click", () => { if (video.paused || video.ended) play(); else video.pause(); });
    soundBtn.addEventListener("click", () => { video.muted = !video.muted; if (!video.muted && (video.paused || video.ended)) play(); sync(); });
    ["play", "pause", "ended", "volumechange"].forEach((ev) => video.addEventListener(ev, sync));
    // after the single pass, rest on the first frame (the same interior view as the poster); no loop
    video.addEventListener("ended", () => { video.pause(); video.currentTime = 0; sync(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) ensureSrc(); }), { rootMargin: "600px 0px" }).observe(vbox);
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6 && !autoplayed && !reduce) { autoplayed = true; play(); }
        if (!e.isIntersecting && !video.paused) video.pause();
      }), { threshold: [0, 0.6] }).observe(vbox);
    } else ensureSrc();
    sync();
  }
})();
