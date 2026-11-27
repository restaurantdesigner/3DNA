/*
 * 3DNA Industrial landing: the plant in 3D behind the hero, turning slowly ([data-ind-hero]).
 * Loads the engine only when the hero is on screen; with reduced motion the camera does not turn.
 * If WebGL is unavailable the hero keeps its dark backdrop and the page works as before.
 */
const el = document.querySelector("[data-ind-hero]");
if (el) {
  const start = async () => {
    try {
      const v = "?v=ind1";
      const [{ createTwin }, factory] = await Promise.all([import("./engine.js" + v), import("./factories/ethanol.js" + v)]);
      const twin = await createTwin(el, factory.default, { lang: el.dataset.lang || "es", mode: "showcase" });
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) twin.controls.autoRotate = false;
      el.querySelector("[data-loading]")?.remove();
      el.classList.add("is-ready");
    } catch (e) {
      console.warn("3D hero unavailable", e);
      el.querySelector("[data-loading]")?.remove();
    }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: "200px" });
    io.observe(el);
  } else start();
}
