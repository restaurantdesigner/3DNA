/*
 * 3DNA business calculators — shared browser engine (no dependencies).
 *
 * Used by the Restaurants calculator (assets/js/restaurant-3d/revenue-calc.js)
 * and the Fitness calculator (assets/js/fitness-calc.js). A model module
 * describes its fields, its formula and its report; this engine does the rest:
 *
 *   - reads/validates inputs ([data-cf]) and writes live results ([data-co])
 *   - direct links: the section id (#calculadora) lands below the fixed header;
 *     ?param=value restores a shared calculation (validated, clamped, else ignored)
 *   - share: native share sheet when available, copy-link fallback, then a
 *     selectable link field as the last resort
 *   - save: versioned localStorage ("3dna.calc.<id>", v1), validated on read;
 *     nothing leaves the browser
 *   - PDF: a branded A4 report drawn with jsPDF (vector text, selectable),
 *     loaded on demand; print: the same report as an A4 print sheet, never the page
 *
 * Markup contract (rendered at build time by scripts/business-calc.js):
 *   [data-calc="<id>"]            the calculator section (id="calculadora")
 *   [data-cf="<field>"]           an input (text) or radio group member
 *   [data-co="<result>"]          a live result; data-fmt = eur | int | num1 | pct | eurm2 | text
 *                                 optional data-tpl with {v} and {<field>} placeholders
 *   [data-cbars] [data-cbar=k]    bar chart rows (width relative to the largest bar)
 *   [data-when="field=value"]     shown only while the field has that value
 *   [data-ca="share-section|share-calc|save|pdf|print"]   actions
 *   [data-csaved]                 saved calculations list
 *   [data-cstatus] [data-clink]   status line, manual-copy link field
 *   script[data-calc-i18n]        UI + report strings (page language + English)
 */
(function (root) {
  const SITE = "https://3dna.es";
  const JSPDF_SRC = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  const STORE_VERSION = 1;
  const MAX_SAVED = 20;

  // ---------------- values ----------------
  function parseField(raw, field) {
    if (raw == null) return null;
    if (field.type === "text") {
      const s = String(raw).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, field.max || 80);
      return s;
    }
    if (field.type === "choice") return field.options.includes(String(raw)) ? String(raw) : null;
    const str = String(raw);
    if (str.length > 14) return null;
    const s = str.trim().replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const f = 10 ** (field.decimals || 0);
    return Math.min(field.max, Math.max(field.min, Math.round(n * f) / f));
  }
  function sanitize(model, input) {
    const out = { ...model.defaults };
    if (!input || typeof input !== "object") return out;
    model.fields.forEach((f) => {
      const v = parseField(input[f.key] == null ? null : String(input[f.key]), f);
      if (v !== null) out[f.key] = v;
    });
    return out;
  }
  function fromQuery(model, search) {
    let params;
    try { params = new URLSearchParams(search || ""); } catch (e) { return { values: { ...model.defaults }, shared: false }; }
    const values = { ...model.defaults };
    let shared = false;
    model.fields.forEach((f) => {
      const v = parseField(params.get(f.param), f);
      if (v !== null && !(f.type === "text" && v === "")) { values[f.key] = v; shared = true; }
    });
    return { values, shared };
  }
  function toQuery(model, values) {
    return model.fields
      .filter((f) => !(f.type === "text" && !values[f.key]))
      .map((f) => `${f.param}=${encodeURIComponent(String(values[f.key]))}`).join("&");
  }

  // ---------------- formatting ----------------
  function formatter(locale) {
    const nf = {};
    const n = (max, min = 0, group = true) => {
      const k = `${max}.${min}.${group}`;
      return nf[k] || (nf[k] = new Intl.NumberFormat(locale, { maximumFractionDigits: max, minimumFractionDigits: min, useGrouping: group }));
    };
    const cur = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0, minimumFractionDigits: 0 });
    const cur2 = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", currencyDisplay: "narrowSymbol", maximumFractionDigits: 2, minimumFractionDigits: 2 });
    const f = {
      eur: (v) => (v == null || !Number.isFinite(v) ? "—" : cur.format(Math.round(v))),
      eur2: (v) => (v == null || !Number.isFinite(v) ? "—" : cur2.format(v)),
      int: (v) => (v == null || !Number.isFinite(v) ? "—" : n(0).format(Math.round(v))),
      num1: (v) => (v == null || !Number.isFinite(v) ? "—" : n(1).format(v)),
      num2: (v) => (v == null || !Number.isFinite(v) ? "—" : n(2).format(v)),
      pct: (v) => (v == null || !Number.isFinite(v) ? "—" : `${n(1).format(v * 100)} %`),
      eurm2: (v) => (v == null || !Number.isFinite(v) ? "—" : `${cur2.format(v)}/m²`),
      text: (v) => (v == null ? "" : String(v)),
      input: (v, d) => n(d, 0, false).format(v),
      plain: (v, d) => n(d).format(v),
    };
    return f;
  }
  // fill {v} (the result) and {field} placeholders
  function fillTpl(tpl, v, values, model, f) {
    return tpl.replace(/\{(\w+)\}/g, (m, k) => {
      if (k === "v") return v;
      const field = model.fields.find((x) => x.key === k);
      if (!field) return m;
      return field.type === "number" ? f.plain(values[k], field.decimals || 0) : String(values[k]);
    });
  }

  // ---------------- clipboard / share ----------------
  function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall through */ }
    }
    return legacyCopy(text);
  }
  // "shared" | "copied" | "cancelled" | "manual"
  async function shareLink(url, title) {
    const data = { title, url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try { await navigator.share(data); return "shared"; }
      catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
    }
    return (await copyText(url)) ? "copied" : "manual";
  }

  // ---------------- direct link positioning ----------------
  function settleOn(box) {
    const bar = () => {
      const el = document.getElementById("topbar");
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top <= 0 ? r.bottom : 0;
    };
    const target = () => Math.max(0, Math.round(box.getBoundingClientRect().top + window.scrollY - bar() - 16));
    const jump = (y) => {
      const html = document.documentElement, prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      html.style.scrollBehavior = prev;
    };
    let done = false;
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"];
    const ro = "ResizeObserver" in window ? new ResizeObserver(() => align()) : null;
    function stop() { done = true; ro && ro.disconnect(); evs.forEach((ev) => window.removeEventListener(ev, stop, true)); }
    function align() { if (!done && Math.abs(window.scrollY - target()) > 2) jump(target()); }
    evs.forEach((ev) => window.addEventListener(ev, stop, { capture: true, passive: true }));
    if (ro) ro.observe(document.body);
    align();
    requestAnimationFrame(align);
    window.addEventListener("load", align, { once: true });
    document.fonts && document.fonts.ready.then(align);
    setTimeout(stop, 5000);
  }

  // ---------------- local storage (versioned, validated) ----------------
  function store(model) {
    const key = `3dna.calc.${model.id}`;
    function read() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (!data || data.v !== STORE_VERSION || !Array.isArray(data.items)) return [];
        return data.items
          .filter((it) => it && typeof it.id === "string" && /^[\w-]{1,40}$/.test(it.id) && Number.isFinite(it.savedAt))
          .slice(0, MAX_SAVED)
          .map((it) => ({ id: it.id, savedAt: it.savedAt, name: parseField(it.name, { type: "text", max: 80 }) || "", values: sanitize(model, it.values) }));
      } catch (e) { return []; }
    }
    function write(items) {
      try { localStorage.setItem(key, JSON.stringify({ v: STORE_VERSION, items: items.slice(0, MAX_SAVED) })); return true; }
      catch (e) { return false; }
    }
    return {
      list: read,
      add(name, values) {
        const items = read();
        const item = { id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, savedAt: Date.now(), name, values: sanitize(model, values) };
        return write([item, ...items]) ? item : null;
      },
      remove(id) { return write(read().filter((it) => it.id !== id)); },
    };
  }

  // ---------------- logo for the report ----------------
  let logoCache = null;
  function logoPng() {
    if (logoCache) return logoCache;
    logoCache = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve({ data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = "/img/logo-360.webp";
    });
    return logoCache;
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = resolve; s.onerror = () => reject(new Error("script failed: " + src));
      document.head.appendChild(s);
    });
  }
  let jspdfReady = null;
  function jsPDFLib() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!jspdfReady) jspdfReady = loadScript(JSPDF_SRC).then(() => window.jspdf.jsPDF);
    return jspdfReady;
  }

  // ---------------- PDF ----------------
  // The 14 standard PDF fonts cover Western European text (accents, ñ, ¿, €, ×, ², ·).
  // Characters outside that set are mapped to close equivalents.
  const pdfText = (s) => String(s == null ? "" : s)
    .replace(/[   ]/g, " ").replace(/−/g, "-").replace(/≈/g, "~").replace(/[→]/g, "->")
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/≥/g, ">=").replace(/≤/g, "<=");

  const C = { ink: [22, 21, 19], muted: [107, 98, 88], rule: [222, 216, 207], accent: [138, 106, 58], paper: [246, 243, 238], neg: [163, 58, 42], pos: [46, 106, 79] };

  async function renderPdf(report) {
    const [JsPDF, logo] = await Promise.all([jsPDFLib(), logoPng()]);
    const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    doc.setProperties({ title: pdfText(report.title), subject: pdfText(report.subtitle), author: "3DNA", creator: "3DNA · 3dna.es", keywords: pdfText(report.keywords || "") });
    const W = 210, H = 297, L = 18, R = 18, TOP = 18, BOTTOM = 24, CW = W - L - R;
    let y = TOP;
    const color = (c, kind = "text") => (kind === "text" ? doc.setTextColor(...c) : kind === "fill" ? doc.setFillColor(...c) : doc.setDrawColor(...c));
    const font = (style, size) => { doc.setFont("helvetica", style); doc.setFontSize(size); };
    const lh = (size, k = 1.35) => (size * 0.3528) * k;
    const newPage = () => { doc.addPage(); y = TOP; };
    const room = (h) => { if (y + h > H - BOTTOM) newPage(); };
    function para(text, { size = 9.5, style = "normal", col = C.ink, width = CW, x = L, gap = 2.2 } = {}) {
      font(style, size); color(col);
      const lines = doc.splitTextToSize(pdfText(text), width);
      lines.forEach((ln) => { room(lh(size)); doc.text(ln, x, y + lh(size) * 0.78); y += lh(size); });
      y += gap;
    }
    function kicker(text, x = L) {
      font("bold", 7.5); color(C.accent); doc.setCharSpace(0.6);
      doc.text(pdfText(text).toUpperCase(), x, y); doc.setCharSpace(0);
    }
    function heading(text) {
      room(16);
      y += 3;
      kicker(text);
      y += 2.2;
      color(C.rule, "draw"); doc.setLineWidth(0.3); doc.line(L, y, W - R, y);
      y += 5;
    }

    // ---- page 1 header ----
    if (logo) { const lw = 30, lhh = lw * logo.h / logo.w; doc.addImage(logo.data, "PNG", L - 1, y - 4, lw, lhh); }
    font("bold", 7.5); color(C.muted);
    const kick = pdfText(report.kicker).toUpperCase();
    doc.setCharSpace(0.5);
    doc.text(kick, W - R - doc.getTextWidth(kick) - 0.5 * (kick.length - 1), y + 2);
    doc.setCharSpace(0);
    font("normal", 8.5); color(C.muted);
    doc.text(pdfText(report.dateLine), W - R, y + 7, { align: "right" });
    y += 24;
    font("bold", 21); color(C.ink);
    doc.splitTextToSize(pdfText(report.title), CW).forEach((ln) => { doc.text(ln, L, y); y += 8.6; });
    y += 0.5;
    para(report.subtitle, { size: 10.5, col: C.muted, gap: 1.5 });
    if (report.project) para(report.project, { size: 10, style: "bold", gap: 1 });
    y += 3;

    // ---- KPI tiles ----
    const tiles = report.summary || [];
    const cols = 2, gapX = 5, tw = (CW - gapX) / cols, th = 21;
    for (let i = 0; i < tiles.length; i += cols) {
      room(th + 4);
      tiles.slice(i, i + cols).forEach((t, j) => {
        const x = L + j * (tw + gapX);
        color(t.strong ? C.ink : C.paper, "fill"); doc.rect(x, y, tw, th, "F");
        font("bold", 7); color(t.strong ? [214, 205, 192] : C.muted); doc.setCharSpace(0.4);
        doc.text(pdfText(t.label).toUpperCase(), x + 5, y + 6.5, { maxWidth: tw - 10 }); doc.setCharSpace(0);
        font("bold", 16); color(t.strong ? [255, 255, 255] : t.negative ? C.neg : C.ink);
        doc.text(pdfText(t.value), x + 5, y + 15);
        if (t.note) { font("normal", 7); color(t.strong ? [214, 205, 192] : C.muted); doc.text(pdfText(t.note), x + tw - 5, y + 15, { align: "right", maxWidth: tw / 2 }); }
      });
      y += th + 4;
    }

    // ---- blocks ----
    function table(rows) {
      const labelW = CW * 0.62;
      rows.forEach((r) => {
        font(r.strong ? "bold" : "normal", 9.2);
        const lines = doc.splitTextToSize(pdfText(r.label), labelW - 2);
        const h = Math.max(lines.length * lh(9.2), lh(9.2)) + 2.6;
        room(h);
        color(C.ink); lines.forEach((ln, k) => doc.text(ln, L, y + 3.3 + k * lh(9.2)));
        font(r.strong ? "bold" : "normal", 9.2); color(r.negative ? C.neg : C.ink);
        doc.text(pdfText(r.value), W - R, y + 3.3, { align: "right" });
        if (r.note) { font("normal", 7.4); color(C.muted); doc.text(pdfText(r.note), L + labelW, y + 3.3, { maxWidth: CW - labelW - 28 }); }
        y += h;
        color(C.rule, "draw"); doc.setLineWidth(0.2); doc.line(L, y - 0.8, W - R, y - 0.8);
      });
      y += 2;
    }
    function bars(chart) {
      const max = Math.max(1, ...chart.items.map((it) => Math.abs(it.value)));
      const labelW = 52, valueW = 30, barW = CW - labelW - valueW - 4;
      chart.items.forEach((it) => {
        room(7);
        font("normal", 8.6); color(C.ink);
        doc.text(pdfText(it.label), L, y + 3.8, { maxWidth: labelW - 2 });
        const w = Math.max(0.6, barW * Math.abs(it.value) / max);
        color(it.tone === "ink" ? C.ink : it.tone === "neg" ? C.neg : it.tone === "pos" ? C.pos : C.accent, "fill");
        doc.rect(L + labelW, y + 1, w, 3.8, "F");
        font("bold", 8.6); color(it.tone === "neg" ? C.neg : C.ink);
        doc.text(pdfText(it.display), W - R, y + 3.8, { align: "right" });
        y += 6.4;
      });
      y += 2;
    }
    function compare(c) {
      const n = c.columns.length, first = CW * 0.4, colW = (CW - first) / (n - 1);
      room(10);
      font("bold", 7.4); color(C.muted);
      c.columns.forEach((h, i) => doc.text(pdfText(h).toUpperCase(), i === 0 ? L : L + first + colW * i - 1, y + 3, { align: i === 0 ? "left" : "right", maxWidth: i === 0 ? first : colW - 2 }));
      y += 5.5;
      c.rows.forEach((r) => {
        room(7);
        r.forEach((cell, i) => {
          const neg = typeof cell === "object" && cell.negative;
          const txt = typeof cell === "object" ? cell.text : cell;
          font(i === 0 ? "normal" : "bold", 9); color(neg ? C.neg : C.ink);
          doc.text(pdfText(txt), i === 0 ? L : L + first + colW * i - 1, y + 3.6, { align: i === 0 ? "left" : "right", maxWidth: i === 0 ? first - 2 : colW - 2 });
        });
        y += 6.6;
        color(C.rule, "draw"); doc.setLineWidth(0.2); doc.line(L, y - 1.4, W - R, y - 1.4);
      });
      y += 2;
    }
    function note(text) {
      font("normal", 8.4);
      const lines = doc.splitTextToSize(pdfText(text), CW - 10);
      const h = lines.length * lh(8.4) + 7;
      room(h);
      color(C.paper, "fill"); doc.rect(L, y, CW, h, "F");
      color(C.accent, "fill"); doc.rect(L, y, 1.1, h, "F");
      color(C.ink); lines.forEach((ln, k) => doc.text(ln, L + 6, y + 4.8 + k * lh(8.4)));
      y += h + 4;
    }
    function cta(c) {
      font("normal", 9.6);
      const lines = c.lines.flatMap((t) => doc.splitTextToSize(pdfText(t), CW - 20));
      const h = 19 + lines.length * lh(9.6) + 15 + (c.links ? 7 : 0);
      room(h + 4);
      color(C.ink, "fill"); doc.rect(L, y, CW, h, "F");
      let yy = y + 9;
      font("bold", 13.5); color([255, 255, 255]);
      doc.splitTextToSize(pdfText(c.heading).toUpperCase(), CW - 20).forEach((ln) => { doc.text(ln, L + 10, yy); yy += 6; });
      yy += 1.5;
      font("normal", 9.6); color([214, 205, 192]);
      lines.forEach((ln) => { doc.text(ln, L + 10, yy); yy += lh(9.6); });
      yy += 3;
      const label = pdfText(c.button.label).toUpperCase();
      font("bold", 8.6); doc.setCharSpace(0.6);
      const bw = doc.getTextWidth(label) + label.length * 0.6 + 14, bh = 9;
      color(C.accent, "fill"); doc.rect(L + 10, yy, bw, bh, "F");
      color([255, 255, 255]); doc.text(label, L + 17, yy + 5.9);
      doc.setCharSpace(0);
      doc.link(L + 10, yy, bw, bh, { url: c.button.url });
      yy += bh + 6;
      if (c.links) {
        font("normal", 8.6); let x = L + 10;
        c.links.forEach((lk, i) => {
          const txt = pdfText(lk.label);
          color([255, 255, 255]); doc.textWithLink(txt, x, yy, { url: lk.url });
          x += doc.getTextWidth(txt) + 4;
          if (i < c.links.length - 1) { color([150, 140, 128]); doc.text("·", x, yy); x += 4; }
        });
      }
      y += h + 4;
    }

    const ROW = lh(9.2) + 2.6;
    function estimate(b) {
      let h = b.heading ? 15.5 : 0;
      if (b.intro) { font("normal", 9); h += doc.splitTextToSize(pdfText(b.intro), CW).length * lh(9) + 2.2; }
      if (b.rows) h += b.rows.length * ROW + 2;
      if (b.chart) h += b.chart.items.length * 6.4 + 2;
      if (b.compare) h += 5.5 + b.compare.rows.length * 6.6 + 2;
      if (b.paragraphs) { font("normal", 8.8); b.paragraphs.forEach((t) => { h += doc.splitTextToSize(pdfText(t), CW).length * lh(8.8) + 1.8; }); }
      if (b.note) { font("normal", 8.4); h += doc.splitTextToSize(pdfText(b.note), CW - 10).length * lh(8.4) + 11; }
      if (b.cta) { font("normal", 9.6); h += 45 + b.cta.lines.flatMap((t) => doc.splitTextToSize(pdfText(t), CW - 20)).length * lh(9.6); }
      return h;
    }
    const usable = H - BOTTOM - TOP;
    (report.blocks || []).forEach((b) => {
      if (b.pageBreak && y > TOP + 1) newPage();
      else { const h = estimate(b); if (h <= usable && y + h > H - BOTTOM) newPage(); }
      if (b.heading) heading(b.heading);
      if (b.intro) para(b.intro, { size: 9, col: C.muted });
      if (b.rows) table(b.rows);
      if (b.chart) bars(b.chart);
      if (b.compare) compare(b.compare);
      if (b.paragraphs) b.paragraphs.forEach((p) => para(p, { size: 8.8, gap: 1.8 }));
      if (b.note) note(b.note);
      if (b.cta) cta(b.cta);
    });

    // ---- footer + page numbers on every page ----
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const fy = H - 13;
      color(C.rule, "draw"); doc.setLineWidth(0.25); doc.line(L, fy - 4, W - R, fy - 4);
      font("normal", 7.6); color(C.muted);
      doc.text(pdfText(report.footer.left), L, fy);
      font("bold", 7.6); color(C.ink);
      const site = pdfText(report.footer.site);
      const sw = doc.getTextWidth(site);
      doc.textWithLink(site, (W - sw) / 2, fy, { url: report.footer.siteUrl });
      font("normal", 7.6); color(C.muted);
      doc.text(pdfText(report.footer.page.replace("{n}", i).replace("{total}", pages)), W - R, fy, { align: "right" });
    }
    return doc;
  }

  // ---------------- print sheet (same report, HTML) ----------------
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function printHtml(report) {
    const rows = (rs) => `<table class="crp__table">${rs.map((r) => `<tr class="${r.strong ? "is-strong" : ""}"><th scope="row">${esc(r.label)}${r.note ? `<span class="crp__rnote">${esc(r.note)}</span>` : ""}</th><td class="${r.negative ? "is-neg" : ""}">${esc(r.value)}</td></tr>`).join("")}</table>`;
    const chart = (c) => {
      const max = Math.max(1, ...c.items.map((it) => Math.abs(it.value)));
      return `<div class="crp__bars">${c.items.map((it) => `<div class="crp__bar"><span class="crp__bar-l">${esc(it.label)}</span><span class="crp__bar-t"><i class="tone-${esc(it.tone || "accent")}" style="width:${(Math.max(0.5, 100 * Math.abs(it.value) / max)).toFixed(1)}%"></i></span><span class="crp__bar-v${it.tone === "neg" ? " is-neg" : ""}">${esc(it.display)}</span></div>`).join("")}</div>`;
    };
    const cmp = (c) => `<table class="crp__cmp"><thead><tr>${c.columns.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${c.rows.map((r) => `<tr>${r.map((cell, i) => { const o = typeof cell === "object" ? cell : { text: cell }; return i === 0 ? `<th scope="row">${esc(o.text)}</th>` : `<td class="${o.negative ? "is-neg" : ""}">${esc(o.text)}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
    const blocks = (report.blocks || []).map((b) => `
      <div class="crp__block${b.pageBreak ? " is-break" : ""}">
        ${b.heading ? `<h2 class="crp__h">${esc(b.heading)}</h2>` : ""}
        ${b.intro ? `<p class="crp__intro">${esc(b.intro)}</p>` : ""}
        ${b.rows ? rows(b.rows) : ""}
        ${b.chart ? chart(b.chart) : ""}
        ${b.compare ? cmp(b.compare) : ""}
        ${b.paragraphs ? b.paragraphs.map((p) => `<p class="crp__p">${esc(p)}</p>`).join("") : ""}
        ${b.note ? `<p class="crp__note">${esc(b.note)}</p>` : ""}
        ${b.cta ? `<div class="crp__cta"><p class="crp__cta-h">${esc(b.cta.heading)}</p>${b.cta.lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p class="crp__cta-b"><a href="${esc(b.cta.button.url)}">${esc(b.cta.button.label)}</a></p>${b.cta.links ? `<p class="crp__cta-l">${b.cta.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(" · ")}</p>` : ""}</div>` : ""}
      </div>`).join("");
    return `
      <div class="crp__head">
        <img class="crp__logo" src="/img/logo-360.webp" width="360" height="240" alt="3DNA">
        <div class="crp__meta"><span>${esc(report.kicker)}</span><span>${esc(report.dateLine)}</span></div>
      </div>
      <h1 class="crp__title">${esc(report.title)}</h1>
      <p class="crp__sub">${esc(report.subtitle)}</p>
      ${report.project ? `<p class="crp__project">${esc(report.project)}</p>` : ""}
      <div class="crp__tiles">${(report.summary || []).map((t) => `<div class="crp__tile${t.strong ? " is-strong" : ""}"><span>${esc(t.label)}</span><strong class="${t.negative ? "is-neg" : ""}">${esc(t.value)}</strong>${t.note ? `<em>${esc(t.note)}</em>` : ""}</div>`).join("")}</div>
      ${blocks}
      ${pageMargins(report)}`;
  }
  // footer + page numbers in the printed page margins (repeat on every page, never overlap the report)
  const cssStr = (v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\n\r<>]/g, " ")}"`;
  function pageMargins(report) {
    const [before, rest = ""] = report.footer.page.split("{n}");
    const [mid, after = ""] = rest.split("{total}");
    const box = "font: 7.5pt Helvetica, Arial, sans-serif; color: #6b6258; border-top: .25mm solid #ded8cf; padding-top: 2mm;";
    return `<style>@media print{ @page{
      @bottom-left{ content: ${cssStr(report.footer.left)}; ${box} }
      @bottom-center{ content: ${cssStr(report.footer.site)}; ${box} color: #161513; font-weight: 700; }
      @bottom-right{ content: ${cssStr(before)} counter(page) ${cssStr(mid)} counter(pages) ${cssStr(after)}; ${box} }
    } }</style>`;
  }
  function printReport(report) {
    let sheet = document.getElementById("calc-print");
    if (!sheet) { sheet = document.createElement("div"); sheet.id = "calc-print"; sheet.className = "crp"; document.body.appendChild(sheet); }
    sheet.innerHTML = printHtml(report);
    const html = document.documentElement;
    const done = () => { html.classList.remove("is-calc-print"); window.removeEventListener("afterprint", done); };
    const go = () => { html.classList.add("is-calc-print"); window.addEventListener("afterprint", done); window.print(); setTimeout(done, 1500); };
    const img = sheet.querySelector("img");
    if (img && !img.complete) { img.onload = img.onerror = go; setTimeout(() => { if (!html.classList.contains("is-calc-print")) go(); }, 1500); }
    else go();
  }

  // ---------------- mount ----------------
  function mount(box, model) {
    let i18n;
    try { i18n = JSON.parse(box.querySelector("script[data-calc-i18n]").textContent); } catch (e) { return; }
    const ui = i18n.ui;
    const f = formatter(i18n.locale);
    const lang = document.documentElement.lang || "es";
    const inputs = [...box.querySelectorAll("[data-cf]")];
    const outputs = [...box.querySelectorAll("[data-co]")];
    const status = box.querySelector("[data-cstatus]");
    const linkField = box.querySelector("[data-clink]");
    const savedBox = box.querySelector("[data-csaved]");
    const saved = store(model);
    const fieldOf = (key) => model.fields.find((x) => x.key === key);
    let values = fromQuery(model, location.search).values;
    let results = null;

    function showInputs() {
      inputs.forEach((el) => {
        const field = fieldOf(el.dataset.cf);
        if (!field) return;
        if (el.type === "radio") el.checked = el.value === String(values[field.key]);
        else el.value = field.type === "number" ? f.input(values[field.key], field.decimals || 0) : values[field.key];
        el.removeAttribute("aria-invalid");
      });
    }
    function paint() {
      results = model.compute(values);
      outputs.forEach((el) => {
        const k = el.dataset.co;
        const raw = k.startsWith("_") ? null : results[k];
        const kind = el.dataset.fmt || "eur";
        let txt = kind === "text" ? String(raw == null ? "" : raw) : (f[kind] || f.eur)(raw);
        if (el.dataset.tpl) {
          const plainNum = raw == null || !Number.isFinite(raw) ? "—" : f.plain(Math.round(raw), 0);
          txt = fillTpl(el.dataset.tpl, el.dataset.tplRaw != null ? plainNum : txt, values, model, f);
        }
        el.textContent = txt;
        el.classList.toggle("is-neg", typeof raw === "number" && raw < 0);
      });
      box.querySelectorAll("[data-cbars]").forEach((group) => {
        const rowsEl = [...group.querySelectorAll("[data-cbar]")];
        const max = Math.max(1, ...rowsEl.map((r) => Math.abs(results[r.dataset.cbar] || 0)));
        rowsEl.forEach((r) => {
          const v = results[r.dataset.cbar] || 0;
          const fill = r.querySelector("[data-cbar-fill]");
          if (fill) fill.style.width = `${(100 * Math.abs(v) / max).toFixed(1)}%`;
          r.classList.toggle("is-neg", v < 0);
        });
      });
      box.querySelectorAll("[data-when]").forEach((el) => {
        const [k, v] = el.dataset.when.split("=");
        el.hidden = String(values[k]) !== v;
      });
      box.querySelectorAll("[data-cflag]").forEach((el) => { el.hidden = !results[el.dataset.cflag]; });
    }
    inputs.forEach((el) => {
      const field = fieldOf(el.dataset.cf);
      if (!field) return;
      const onInput = () => {
        const v = parseField(el.value, field);
        const bad = v === null || (field.type === "number" && el.value.trim() === "");
        el.setAttribute("aria-invalid", String(bad && el.value.trim() !== ""));
        if (bad) return;
        values = { ...values, [field.key]: v };
        paint();
      };
      el.addEventListener(el.type === "radio" ? "change" : "input", onInput);
      if (el.type !== "radio") el.addEventListener("change", () => { el.removeAttribute("aria-invalid"); if (field.type === "number") el.value = f.input(values[field.key], field.decimals || 0); });
    });
    box.querySelectorAll("form").forEach((fm) => fm.addEventListener("submit", (e) => e.preventDefault()));
    showInputs();
    paint();

    // status line
    let clear = 0;
    function say(msg, keep) {
      if (!status) return;
      status.textContent = msg;
      clearTimeout(clear);
      if (!keep) clear = setTimeout(() => { status.textContent = ""; }, 4500);
    }
    function pageUrl() {
      const canonical = document.querySelector('link[rel="canonical"]');
      try { const c = canonical && new URL(canonical.href); if (c && c.origin === location.origin) return c.origin + c.pathname; } catch (e) { /* fall through */ }
      return location.origin + location.pathname;
    }
    const linkFor = (withValues) => `${pageUrl()}${withValues ? `?${toQuery(model, values)}` : ""}#${box.id}`;

    async function share(withValues) {
      if (linkField) linkField.hidden = true;
      const url = linkFor(withValues);
      const r = await shareLink(url, withValues ? ui.shareCalcTitle : ui.shareSectionTitle);
      if (r === "copied") say(withValues ? ui.copiedCalc : ui.copiedSection);
      else if (r === "manual" && linkField) { linkField.value = url; linkField.hidden = false; linkField.focus(); linkField.select(); say(ui.copyManual, true); }
      if (window.track && r !== "cancelled") window.track("calculator_shared", { calculator: model.id, type: withValues ? "calculation" : "calculator", language: lang });
    }

    // saved calculations
    function renderSaved() {
      if (!savedBox) return;
      const items = saved.list();
      const listEl = savedBox.querySelector("[data-csaved-list]");
      const countEl = savedBox.querySelector("[data-csaved-count]");
      savedBox.hidden = items.length === 0;
      if (countEl) countEl.textContent = String(items.length);
      if (!listEl) return;
      const dateFmt = new Intl.DateTimeFormat(i18n.locale, { dateStyle: "medium", timeStyle: "short" });
      listEl.innerHTML = items.map((it) => `
        <li class="ccalc-saved__item">
          <span class="ccalc-saved__name">${esc(it.name || ui.untitled)}</span>
          <span class="ccalc-saved__date">${esc(dateFmt.format(new Date(it.savedAt)))} · ${esc(model.summaryLine(it.values, model.compute(it.values), f, ui))}</span>
          <span class="ccalc-saved__acts">
            <button type="button" class="ccalc-saved__btn" data-copen="${esc(it.id)}">${esc(ui.open)}</button>
            <button type="button" class="ccalc-saved__btn ccalc-saved__btn--del" data-cdel="${esc(it.id)}" aria-label="${esc(ui.delete)}: ${esc(it.name || ui.untitled)}">${esc(ui.delete)}</button>
          </span>
        </li>`).join("");
    }
    savedBox && savedBox.addEventListener("click", (e) => {
      const open = e.target.closest("[data-copen]"), del = e.target.closest("[data-cdel]");
      if (open) {
        const it = saved.list().find((x) => x.id === open.dataset.copen);
        if (!it) return;
        values = sanitize(model, it.values);
        showInputs(); paint();
        say(ui.opened);
        box.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      } else if (del) {
        saved.remove(del.dataset.cdel);
        renderSaved();
        say(ui.deleted);
      }
    });
    renderSaved();

    function reportFor(forPdf) {
      // the standard PDF fonts are Latin only: RU / UK reports (PDF and print, kept identical) are in English
      const latin = ["es", "en"].includes(lang);
      const rt = latin ? i18n.report : i18n.reportEn;
      const loc = latin ? i18n.locale : "en-GB";
      const rf = formatter(loc);
      const now = new Date();
      const date = new Intl.DateTimeFormat(loc, { dateStyle: "long" }).format(now);
      return model.report(values, model.compute(values), {
        t: rt, f: rf, date, pageUrl: pageUrl(), shareUrl: linkFor(true), contact: i18n.contact,
        common: { kicker: rt.kicker, dateLine: rt.dateLine.replace("{date}", date), footer: { left: rt.footerLeft, site: "3dna.es", siteUrl: SITE + "/", page: rt.page } },
      });
    }
    function fileName() {
      const base = (values.project || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      const d = new Date().toISOString().slice(0, 10);
      return `3DNA-${model.fileStem}${base ? "-" + base : ""}-${d}.pdf`;
    }
    box.querySelectorAll("[data-ca]").forEach((btn) => {
      btn.hidden = false;
      btn.addEventListener("click", async () => {
        const a = btn.dataset.ca;
        if (a === "share-section") share(false);
        else if (a === "share-calc") share(true);
        else if (a === "save") {
          const item = saved.add(values.project || "", values);
          if (item) { renderSaved(); say(ui.saved); }
          else say(ui.saveFailed);
        } else if (a === "print") {
          printReport(reportFor(false));
        } else if (a === "pdf") {
          btn.setAttribute("aria-busy", "true"); btn.disabled = true;
          say(ui.pdfWorking, true);
          try {
            const doc = await renderPdf(reportFor(true));
            doc.save(fileName());
            say(ui.pdfDone);
            if (window.track) window.track("calculator_pdf", { calculator: model.id, language: lang });
          } catch (e) {
            console.warn("PDF report unavailable", e);
            say(ui.pdfFailed, true);
          } finally { btn.disabled = false; btn.removeAttribute("aria-busy"); }
        }
      });
    });

    if (location.hash === `#${box.id}`) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      settleOn(box);
    }
    window.addEventListener("hashchange", () => { if (location.hash === `#${box.id}`) settleOn(box); });

    // test / support hook
    box.calc = { get values() { return { ...values }; }, get results() { return results; }, report: reportFor, pdf: () => renderPdf(reportFor(true)), set(v) { values = sanitize(model, { ...values, ...v }); showInputs(); paint(); } };
  }

  const api = { parseField, sanitize, fromQuery, toQuery, formatter, mount, renderPdf, printReport };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CalcTools = api;
})(typeof window !== "undefined" ? window : this);
