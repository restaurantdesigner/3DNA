/*
 * Marketing project presentation: live website prototype frame ([data-pvw], scripts/marketing-projects.js).
 * Desktop mode: the prototype runs in a real 1280 × 800 viewport, scaled to fit the column.
 * Mobile mode: a real 390 × 780 viewport inside a phone frame (scaled down only if the screen is narrower).
 * The iframe keeps its own layout: switching mode changes the prototype's viewport, not a picture.
 * Narrow screens start in mobile mode. No scroll listeners: one ResizeObserver per frame.
 */
(() => {
  const MODES = { desktop: [1280, 800], mobile: [390, 780] };
  document.querySelectorAll("[data-pvw]").forEach((box) => {
    const stage = box.querySelector(".pvw__stage");
    const screen = box.querySelector(".pvw__screen");
    const vp = box.querySelector(".pvw__vp");
    const frame = box.querySelector("iframe");
    const buttons = box.querySelectorAll("[data-pvw-mode]");
    let mode = stage.clientWidth < 760 ? "mobile" : "desktop";

    function apply() {
      const [w, h] = MODES[mode];
      const pad = mode === "mobile" ? 28 : 2;          // phone bezel / browser border
      const avail = stage.clientWidth - pad;
      const scale = Math.min(1, avail / w);
      screen.className = `pvw__screen pvw__screen--${mode}`;
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
      frame.style.transform = scale < 1 ? `scale(${scale})` : "none";
      vp.style.width = `${Math.round(w * scale)}px`;
      vp.style.height = `${Math.round(h * scale)}px`;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pvwMode === mode)));
    }
    buttons.forEach((b) => b.addEventListener("click", () => { mode = b.dataset.pvwMode; apply(); }));
    if ("ResizeObserver" in window) new ResizeObserver(apply).observe(stage);
    else window.addEventListener("resize", apply);
    apply();
  });
})();
