/*
 * Restaurants page, "Proyectos en desarrollo": a project card's cover film (scripts/projects.js).
 * The film is black and white (CSS) and downloads only when first needed:
 *   - mouse / pen: plays while the pointer is over the card or the card has keyboard focus, pauses after
 *   - touch screens (no hover): plays while most of the card is on screen
 * With prefers-reduced-motion it never plays; the still cover stays.
 */
(function () {
  "use strict";
  var cards = document.querySelectorAll(".rproj__card");
  if (!cards.length) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var canHover = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  function setup(card) {
    var video = card.querySelector(".rproj__video");
    if (!video) return null;
    var wanted = false;
    function play() {
      wanted = true;
      if (!video.getAttribute("src")) { video.src = video.getAttribute("data-src"); video.load(); }
      var p = video.play();
      if (p && p.then) p.then(function () { if (wanted) card.classList.add("is-playing"); else video.pause(); }).catch(function () {});
      else card.classList.add("is-playing");
    }
    function stop() {
      wanted = false;
      card.classList.remove("is-playing");
      if (!video.paused) video.pause();
    }
    return { play: play, stop: stop };
  }

  var players = [];
  for (var i = 0; i < cards.length; i++) {
    var pl = setup(cards[i]);
    if (!pl) continue;
    players.push([cards[i], pl]);
    if (canHover) {
      cards[i].addEventListener("mouseenter", pl.play);
      cards[i].addEventListener("mouseleave", pl.stop);
      cards[i].addEventListener("focus", pl.play);
      cards[i].addEventListener("blur", pl.stop);
    }
  }
  if (!canHover && players.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        for (var j = 0; j < players.length; j++) if (players[j][0] === e.target) (e.isIntersecting ? players[j][1].play : players[j][1].stop)();
      });
    }, { threshold: 0.6 });
    players.forEach(function (p) { io.observe(p[0]); });
  }
  // a hidden tab never keeps a film running
  document.addEventListener("visibilitychange", function () { if (document.hidden) players.forEach(function (p) { p[1].stop(); }); });
})();
