/*
 * Restaurants page hero: one section, one <video>, one source at a time.
 *  - The variant is decided by the device, not by the window: phones (shortest screen side under
 *    600 px, touch) get the vertical film; tablets (iPads, Android tablets, any orientation),
 *    laptops and desktops get the 16:9 film. An inline script in the page sets data-variant and
 *    the matching poster before the first paint; this script attaches only that variant's file,
 *    so a phone never downloads the desktop film and vice versa.
 *  - Muted, looping, inline, no controls, no audio track. It fades in only once it is actually
 *    playing (the poster is the film's first frame: no visible loading state).
 *  - prefers-reduced-motion: poster only. Pauses when off screen or when the tab is hidden.
 *  - If the device class changes (e.g. a window moved to another screen), the same player swaps
 *    its source; there is never a second player.
 */
(() => {
  const root = document.querySelector("[data-rhero]");
  if (!root) return;
  const video = root.querySelector("video");
  const img = root.querySelector(".rhero__poster img");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let onScreen = true;

  function variant() {
    const s = window.screen || {};
    const shortest = Math.min(s.width || innerWidth, s.height || innerHeight);
    const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    return shortest < 600 && touch ? "mobile" : "desktop";
  }
  function applyVariant() {
    const v = variant();
    if (root.dataset.variant === v && img.getAttribute("src") === video.dataset["poster" + cap(v)]) return v;
    root.dataset.variant = v;
    img.setAttribute("src", video.dataset["poster" + cap(v)]);
    img.width = v === "mobile" ? 480 : 854; img.height = v === "mobile" ? 854 : 480;
    // a source of the other variant was already attached: swap it in the same player
    if (video.getAttribute("src") && video.getAttribute("src") !== video.dataset["src" + cap(v)]) {
      root.classList.remove("is-playing");
      video.pause(); video.removeAttribute("src"); video.load();
    }
    return v;
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function update() {
    const v = applyVariant();
    if (reduce.matches) {
      if (!video.paused) video.pause();
      root.classList.remove("is-playing");
      return;
    }
    if (!video.getAttribute("src")) { video.src = video.dataset["src" + cap(v)]; video.preload = "auto"; }
    if (onScreen && !document.hidden) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    else if (!video.paused) video.pause();
  }
  video.addEventListener("playing", () => root.classList.add("is-playing"));
  video.addEventListener("error", () => root.classList.remove("is-playing"));   // keep the poster

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }, { threshold: 0.05 }).observe(root);
  }
  document.addEventListener("visibilitychange", update);
  let t = 0;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(update, 200); });
  reduce.addEventListener ? reduce.addEventListener("change", update) : reduce.addListener(update);
  update();
})();
