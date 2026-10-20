/*
 * Project page hero film (scripts/projects.js heroHtml). One source is attached after the page loads:
 * phones (shortest screen side < 600 px, touch) get the 960 px film, tablets and computers the 1920 px one.
 * The poster is the film's first frame, so the start is seamless. With prefers-reduced-motion the film
 * never starts and the poster stays; a hidden tab pauses it.
 */
// Project films further down the page ([data-pfilm]): load near the viewport, play muted while on screen.
(function () {
  "use strict";
  var films = document.querySelectorAll("[data-pfilm]");
  if (!films.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    films.forEach(function (v) { v.controls = true; v.preload = "none"; v.src = v.getAttribute("data-src"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.getAttribute("src")) v.src = v.getAttribute("data-src");
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) v.pause();
    });
  }, { threshold: 0.35 });
  films.forEach(function (v) { io.observe(v); });
})();

(function () {
  "use strict";
  var hero = document.querySelector("[data-phero]");
  if (!hero) return;
  var video = hero.querySelector(".phero__video"), poster = hero.querySelector(".phero__poster");
  var s = window.screen || {}, side = Math.min(s.width || innerWidth, s.height || innerHeight);
  var mobile = side < 600 && (navigator.maxTouchPoints > 0 || "ontouchstart" in window);
  if (mobile && poster.getAttribute("data-poster-mobile")) poster.src = poster.getAttribute("data-poster-mobile");
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  video.src = video.getAttribute(mobile ? "data-src-mobile" : "data-src-desktop");
  video.addEventListener("playing", function () { hero.classList.add("is-playing"); });
  function play() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  play();
  document.addEventListener("visibilitychange", function () { if (document.hidden) video.pause(); else play(); });
})();
