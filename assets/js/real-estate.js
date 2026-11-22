/*
 * Real estate pages (markup from scripts/real-estate.js)
 *   catalogue: filters (type, bedrooms, location) and price sort, with a live result count
 *   property page: photo viewer — a photo opens full size in a <dialog>; previous / next buttons,
 *   arrow keys and swipe; Escape or × closes it
 */
(function () {
  "use strict";
  var form = document.querySelector("[data-re-filter]");
  var grid = document.querySelector("[data-re-grid]");
  if (!form || !grid) return;
  var items = Array.prototype.slice.call(grid.querySelectorAll("[data-re-item]"));
  var original = items.slice();
  var shown = document.querySelector("[data-re-shown]"), none = document.querySelector("[data-re-none]");
  var forms = JSON.parse(form.getAttribute("data-shown") || "{}");
  var rules = window.Intl && Intl.PluralRules ? new Intl.PluralRules(form.getAttribute("data-locale")) : null;
  var val = function (name) { var f = form.elements[name]; return f ? f.value : ""; };

  var purposeVal = function () { var c = form.querySelector('input[name="purpose"]:checked'); return c ? c.value : ""; };
  var setPurpose = function (key) {
    var r = form.querySelector('input[name="purpose"][value="' + (key || "") + '"]');
    if (r) r.checked = true;
  };

  function apply() {
    var type = val("type"), beds = Number(val("beds") || 0), loc = val("loc"), sort = val("sort"), purpose = purposeVal(), n = 0;
    items.forEach(function (li) {
      var ok = (!purpose || (" " + li.getAttribute("data-purposes") + " ").indexOf(" " + purpose + " ") >= 0) &&
        (!type || li.getAttribute("data-type") === type) &&
        Number(li.getAttribute("data-beds")) >= beds &&
        (!loc || li.getAttribute("data-loc") === loc);
      li.hidden = !ok;
      if (ok) n++;
    });
    var order = original.slice();
    if (sort) {
      order.sort(function (a, b) {
        var pa = a.getAttribute("data-price"), pb = b.getAttribute("data-price");
        if (!pa) return pb ? 1 : 0;                      // "price on request" last
        if (!pb) return -1;
        return sort === "asc" ? pa - pb : pb - pa;
      });
    }
    order.forEach(function (li) { grid.appendChild(li); });
    var key = rules ? rules.select(n) : (n === 1 ? "one" : "other");
    shown.textContent = (forms[key] || forms.other || "{n}").replace("{n}", n);
    none.hidden = n > 0;
  }
  form.addEventListener("change", function () {
    apply();
    // keep the chosen purpose in the address, so the filtered list can be shared
    if (window.history && history.replaceState) {
      var p = purposeVal();
      history.replaceState(null, "", location.pathname + (p ? "?p=" + p : "") + location.hash);
    }
  });
  // purpose tiles ("¿Qué buscas?") filter the list in place
  Array.prototype.forEach.call(document.querySelectorAll("[data-re-purpose]"), function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      setPurpose(a.getAttribute("data-re-purpose"));
      form.dispatchEvent(new Event("change"));
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  // a shared link (?p=golf) opens filtered
  var start = (location.search.match(/[?&]p=([a-z-]+)/) || [])[1];
  if (start) { setPurpose(start); apply(); }
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  var reset = document.querySelector("[data-re-reset]");
  if (reset) reset.addEventListener("click", function () { form.reset(); apply(); });
})();

(function () {
  "use strict";
  var box = document.querySelector("[data-re-lightbox]");
  var data = document.querySelector("[data-re-photos]");
  if (!box || !data || typeof box.showModal !== "function") return;   // without <dialog> the photos stay inline
  var photos = JSON.parse(data.textContent);
  var img = box.querySelector("[data-re-lb-img]"), count = box.querySelector("[data-re-lb-count]");
  var of = box.getAttribute("data-of") || "{i} / {n}";
  var i = 0;

  function show(n) {
    i = (n + photos.length) % photos.length;
    var p = photos[i];
    img.src = p.src; img.width = p.width; img.height = p.height; img.alt = p.alt;
    count.textContent = of.replace("{i}", i + 1).replace("{n}", photos.length);
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-re-photo]"), function (b) {
    b.addEventListener("click", function () { show(Number(b.getAttribute("data-re-photo"))); box.showModal(); });
  });
  Array.prototype.forEach.call(box.querySelectorAll("[data-re-lb-step]"), function (b) {
    b.addEventListener("click", function () { show(i + Number(b.getAttribute("data-re-lb-step"))); });
  });
  box.querySelector("[data-re-lb-close]").addEventListener("click", function () { box.close(); });
  box.addEventListener("click", function (e) { if (e.target === box) box.close(); });     // the dark area around the photo
  box.addEventListener("keydown", function (e) {
    if (photos.length < 2) return;
    if (e.key === "ArrowRight") show(i + 1);
    if (e.key === "ArrowLeft") show(i - 1);
  });
  var x0 = null;
  box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (x0 == null || photos.length < 2) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
  });
})();

// catalogue header film: loads and plays (muted, inline, looped) only without reduced motion;
// otherwise the poster stays as a still. Paused while the tab is hidden.
(function () {
  "use strict";
  var v = document.querySelector("[data-re-hero-video]");
  if (!v) return;
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) return;
  v.muted = true;
  v.src = v.getAttribute("data-src");
  var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
  play();
  document.addEventListener("visibilitychange", function () { if (document.hidden) v.pause(); else play(); });
})();

// 3D site model: its module (three.js) loads when the viewer comes near the screen
(function () {
  "use strict";
  var root = document.querySelector("[data-site-model-root]");
  if (!root) return;
  var load = function () {
    if (root.getAttribute("data-sm-loaded")) return;
    root.setAttribute("data-sm-loaded", "1");
    var s = document.createElement("script");
    s.type = "module"; s.src = root.getAttribute("data-sm-src");
    s.onerror = function () { root.classList.add("is-no-webgl"); };
    document.head.appendChild(s);
  };
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); } }, { rootMargin: "600px 0px" });
    io.observe(root);
  } else load();
})();
