/*
 * Scope-of-work board (scripts/scope-board.js builds the markup from assets/data/boards/<id>.json).
 *   - access options (A / B): each has its own annotated image; items that differ have one card,
 *     table row and work-list entry per option ([data-opt]); only the chosen option's ones show
 *   - a marker selects its card; a card (or a table / work-list entry) highlights its marker
 *   - desktop: every card beside the image; phones (< 900 px): the selected card below it, previous / next
 *   - "Antes / Después", hide annotations, "Imprimir A3" (layout in CSS: the chosen option)
 *   - option videos: share (the file itself where the phone allows it, else the link, else WhatsApp /
 *     Telegram / copy) and download
 *   - hero film: slow motion, black and white turning to colour
 */
(function () {
  "use strict";
  var board = document.querySelector("[data-sboard]");
  if (!board) return;
  var phone = window.matchMedia("(max-width: 899px)");
  var option = board.getAttribute("data-option") || "a";
  var view = "after";
  var current = null;

  var all = function (sel) { return Array.prototype.slice.call(board.querySelectorAll(sel)); };
  var forOpt = function (el) { var o = el.getAttribute("data-opt"); return !o || o === option; };
  var cards = function () { return all("[data-item]").filter(forOpt); };
  var ids = function () { return cards().map(function (c) { return c.getAttribute("data-item"); }); };
  var afterPane = function () { return board.querySelector('[data-pane="after-' + option + '"]'); };

  function select(n, opts) {
    opts = opts || {};
    var list = ids();
    if (list.indexOf(n) < 0) return;
    current = n;
    all("[data-item]").forEach(function (c) { c.classList.toggle("is-selected", forOpt(c) && c.getAttribute("data-item") === n); });
    all("[data-marker]").forEach(function (m) {
      var on = m.getAttribute("data-marker") === n;
      m.classList.toggle("is-selected", on); m.setAttribute("aria-pressed", String(on));
    });
    all("[data-line], [data-dot]").forEach(function (el) {
      el.classList.toggle("is-selected", (el.getAttribute("data-line") || el.getAttribute("data-dot")) === n);
    });
    var pos = board.querySelector("[data-pos]");
    if (pos) pos.textContent = (list.indexOf(n) + 1) + " / " + list.length;
    var card = cards().filter(function (c) { return c.getAttribute("data-item") === n; })[0];
    if (opts.scroll && card) {
      if (phone.matches) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      else {
        var r = card.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight) card.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    if (opts.focus && card) card.focus({ preventScroll: true });
  }

  function showView(v) {
    view = v;
    board.setAttribute("data-view", v);
    all("[data-pane]").forEach(function (p) {
      var id = p.getAttribute("data-pane");
      var on = v === "before" ? id === "before" : id === "after-" + option;
      p.hidden = !on;
      p.classList.toggle("is-option", id === "after-" + option);      // print: the chosen option's image
    });
    all("[data-show]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-show") === v)); });
  }
  function setOption(o) {
    option = o;
    board.setAttribute("data-option", o);
    all("[data-opt]").forEach(function (el) { el.hidden = !forOpt(el); });
    all("[data-opt-btn]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-opt-btn") === o)); });
    showView(view);
    select(current && ids().indexOf(current) >= 0 ? current : ids()[0]);
  }

  all("[data-marker]").forEach(function (m) {
    m.addEventListener("click", function () { select(m.getAttribute("data-marker"), { scroll: true }); });
  });
  all("[data-item]").forEach(function (c) {
    c.addEventListener("click", function () { select(c.getAttribute("data-item")); });
  });
  all("[data-goto]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault(); showView("after");
      select(a.getAttribute("data-goto"), { scroll: !phone.matches, focus: true });
      board.querySelector(phone.matches ? ".sboard__fig" : "#opciones").scrollIntoView({ block: "start", behavior: "smooth" });
    });
  });
  all("[data-step]").forEach(function (b) {
    b.addEventListener("click", function () {
      var list = ids(), i = list.indexOf(current) + Number(b.getAttribute("data-step"));
      select(list[(i + list.length) % list.length]);
    });
  });
  all("[data-show]").forEach(function (b) { b.addEventListener("click", function () { showView(b.getAttribute("data-show")); }); });
  all("[data-opt-btn]").forEach(function (b) { b.addEventListener("click", function () { setOption(b.getAttribute("data-opt-btn")); }); });

  var annot = board.querySelector("[data-annot]");
  annot.addEventListener("click", function () {
    var hidden = board.classList.toggle("is-plain");
    annot.setAttribute("aria-pressed", String(hidden));
    annot.textContent = hidden ? annot.getAttribute("data-label-show") : annot.getAttribute("data-label-hide");
  });
  board.querySelector("[data-print]").addEventListener("click", function () { window.print(); });

  // ---------------------------------------------------------------- share a video
  all("[data-share]").forEach(function (btn) {
    var id = btn.getAttribute("data-share"), title = btn.getAttribute("data-title");
    var url = location.origin + location.pathname + "#" + id;
    var menu = board.querySelector('[data-shareto="' + id + '"]');
    var label = btn.textContent;
    menu.querySelector('[data-net="whatsapp"]').href = "https://wa.me/?text=" + encodeURIComponent(title + " · Santa Locura Fitness " + url);
    menu.querySelector('[data-net="telegram"]').href = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(title + " · Santa Locura Fitness");
    menu.querySelector("[data-copy]").addEventListener("click", function () {
      var done = function () { var c = menu.querySelector("[data-copied]"); c.hidden = false; setTimeout(function () { c.hidden = true; }, 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
    });
    btn.addEventListener("click", function () {
      // phones: share the video file itself; otherwise the link; otherwise the menu
      if (navigator.share) {
        btn.textContent = board.getAttribute("data-preparing") || "…";
        fetch(btn.getAttribute("data-src")).then(function (r) { return r.blob(); }).then(function (blob) {
          var file = new File([blob], "Santa-Locura-" + id + ".mp4", { type: "video/mp4" });
          var data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], title: title, text: title + " · " + url } : { title: title, text: title, url: url };
          return navigator.share(data);
        }).catch(function (err) {
          if (err && err.name === "AbortError") return;           // the visitor closed the share sheet
          return navigator.share({ title: title, text: title, url: url }).catch(function () { menu.hidden = !menu.hidden; });
        }).then(function () { btn.textContent = label; });
      } else {
        menu.hidden = !menu.hidden;
      }
    });
  });
  // a shared link (#video-…) opens on that video
  if (/^#video-/.test(location.hash)) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(function () { target.scrollIntoView({ block: "start" }); }, 300);
  }

  // ---------------------------------------------------------------- hero film
  // slow motion (encoded at half speed); it opens in black and white, fills with colour, and returns to
  // black and white before it loops. With prefers-reduced-motion: the colour poster, no film.
  var hero = document.querySelector("[data-sboard-hero]");
  if (hero) {
    var v = hero.querySelector("video");
    var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) { v.style.filter = "none"; }
    else {
      v.src = v.getAttribute("data-src");
      var raf = 0;
      var grey = function (f) {
        if (f < 0.12) return 1;
        if (f < 0.42) return 1 - (f - 0.12) / 0.30;
        if (f < 0.82) return 0;
        return (f - 0.82) / 0.18;
      };
      var tick = function () {
        if (v.duration) v.style.filter = "grayscale(" + grey(v.currentTime / v.duration).toFixed(3) + ")";
        raf = v.paused ? 0 : requestAnimationFrame(tick);
      };
      v.addEventListener("playing", function () { if (!raf) raf = requestAnimationFrame(tick); });
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      document.addEventListener("visibilitychange", function () { if (document.hidden) v.pause(); else { var q = v.play(); if (q && q.catch) q.catch(function () {}); } });
    }
  }

  // ---------------------------------------------------------------- today's reception: full-screen film
  // plays muted while on screen (loaded when it comes near); the button turns the sound on and off
  var cur = document.querySelector("[data-sboard-current]");
  if (cur) {
    var cv = cur.querySelector("video"), snd = cur.querySelector("[data-sound]");
    var start = function () { if (!cv.getAttribute("src")) cv.src = cv.getAttribute("data-src"); var p = cv.play(); if (p && p.catch) p.catch(function () {}); };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(); else cv.pause(); }); }, { threshold: 0.3 }).observe(cur);
    } else start();
    snd.addEventListener("click", function () {
      cv.muted = !cv.muted;
      if (!cv.muted) start();
      snd.setAttribute("aria-pressed", String(!cv.muted));
      snd.textContent = cv.muted ? snd.getAttribute("data-on") : snd.getAttribute("data-off");
    });
  }

  // a link ending in #opcion-a / #opcion-b / #opcion-c opens on that option
  var oh = location.hash.match(/^#opcion-([a-z])$/);
  if (oh && board.querySelector('[data-opt-btn="' + oh[1] + '"]')) {
    option = oh[1];
    setTimeout(function () { var h = document.getElementById("opciones"); if (h) h.scrollIntoView({ block: "start" }); }, 300);
  }
  setOption(option);
  var m = location.hash.match(/^#item-(\d+)/);
  if (m) select(m[1]);
})();
