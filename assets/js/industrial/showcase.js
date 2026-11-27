/*
 * 3DNA Industrial landing: the plant behind the hero ([data-ind-hero]).
 * Desktop: the live 3D plant, turning slowly. Phones: a silent fly-through video of the same plant
 * (lighter than WebGL on a phone). Both load only when the hero is on screen.
 * With reduced motion the camera does not turn and phones keep the still poster.
 * If WebGL is unavailable the hero keeps its dark backdrop and the page works as before.
 */
const el = document.querySelector("[data-ind-hero]");
if (el) {
  const phone = matchMedia("(max-width: 900px)").matches;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startVideo = () => {
    const v = document.createElement("video");
    v.className = "ind-hero__video";
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = !still;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.poster = "/images/industrial/flythrough-poster-720.webp";
    v.preload = still ? "none" : "auto";
    if (!still) v.src = "/images/industrial/flythrough-mobile.mp4";
    el.prepend(v);
    el.querySelector("[data-loading]")?.remove();
    el.classList.add("is-ready");
    if (!still) v.play().catch(() => {});
  };
  const start3d = async () => {
    try {
      const v = "?v=ind12";
      const [{ createTwin }, factory] = await Promise.all([import("./engine.js" + v), import("./factories/ethanol.js" + v)]);
      const twin = await createTwin(el, factory.default, { lang: el.dataset.lang || "es", mode: "showcase" });
      if (still) twin.controls.autoRotate = false;
      el.querySelector("[data-loading]")?.remove();
      el.classList.add("is-ready");
    } catch (e) {
      console.warn("3D hero unavailable", e);
      el.querySelector("[data-loading]")?.remove();
    }
  };
  const start = phone ? startVideo : start3d;
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: "200px" });
    io.observe(el);
  } else start();
}
