/*
 * LED dot-matrix renderer for 3DNA conceptual visuals (canvas, no dependencies).
 * Used by the HTML sources in scripts/marketing-visuals/ that scripts/marketing-visuals/render.js
 * screenshots into images/marketing/projects/<project>/. These are illustrations drawn by 3DNA,
 * never photographs of a client's products or installations.
 */
(function (g) {
  "use strict";

  // text -> boolean grid (cols x rows), rasterised from a real font at matrix resolution
  function textMask(text, cols, rows, opts) {
    const o = Object.assign({ font: "Inter, Arial, sans-serif", weight: 800, size: rows * 0.92, align: "center", offsetX: 0, offsetY: 0, spacing: 0 }, opts || {});
    const c = document.createElement("canvas");
    c.width = cols; c.height = rows;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.textBaseline = "middle";
    x.textAlign = o.align;
    if (o.spacing && "letterSpacing" in x) x.letterSpacing = `${o.spacing}px`;
    // shrink until the word fits the matrix with a one-diode margin each side
    let size = o.size;
    do { x.font = `${o.weight} ${size}px ${o.font}`; size -= 0.25; } while (x.measureText(text).width > cols - 2 - Math.abs(o.offsetX) * 2 && size > 4);
    const tx = o.align === "center" ? cols / 2 : o.align === "right" ? cols - 1 : 1;
    x.fillText(text, tx + o.offsetX, rows / 2 + 0.5 + o.offsetY);
    const d = x.getImageData(0, 0, cols, rows).data;
    return (cx, cy) => d[(cy * cols + cx) * 4 + 3] > 110;
  }

  // a small full-colour "picture" for full-colour panels: fn(u, v) -> [r, g, b] or null
  function sampler(draw, cols, rows) {
    const c = document.createElement("canvas");
    c.width = cols; c.height = rows;
    const x = c.getContext("2d");
    draw(x, cols, rows);
    const d = x.getImageData(0, 0, cols, rows).data;
    return (cx, cy) => {
      const i = (cy * cols + cx) * 4;
      return d[i + 3] < 20 ? null : `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
    };
  }

  /*
   * panel(ctx, { x, y, cols, rows, pitch, color(cx, cy) -> css colour | null,
   *              frame: px, radius, glow: 0..1, dot: 0..1 (dot diameter / pitch), off: unlit dot colour })
   * Draws the housing, unlit diodes, lit diodes and their bloom.
   */
  function panel(ctx, p) {
    const o = Object.assign({ frame: 10, radius: 6, glow: 1, dot: 0.72, off: "rgba(255,255,255,.045)", housing: "#0d0d10", rim: "#2a2a30" }, p);
    const w = o.cols * o.pitch, h = o.rows * o.pitch;
    // bare: diodes only (shaped products such as crosses), no housing or backing
    if (!o.bare) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    roundRect(ctx, o.x - o.frame, o.y - o.frame, w + o.frame * 2, h + o.frame * 2, o.radius);
    const hg = ctx.createLinearGradient(0, o.y - o.frame, 0, o.y + h + o.frame);
    hg.addColorStop(0, "#26262c"); hg.addColorStop(.08, o.housing); hg.addColorStop(1, "#060608");
    ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = o.rim; ctx.lineWidth = 1.2;
    roundRect(ctx, o.x - o.frame + .6, o.y - o.frame + .6, w + o.frame * 2 - 1.2, h + o.frame * 2 - 1.2, o.radius);
    ctx.stroke();
    ctx.fillStyle = "#050506";
    ctx.fillRect(o.x, o.y, w, h);
    }

    const r = (o.pitch * o.dot) / 2;
    const lit = [];
    for (let cy = 0; cy < o.rows; cy++) for (let cx = 0; cx < o.cols; cx++) {
      const col = o.color(cx, cy);
      const px = o.x + cx * o.pitch + o.pitch / 2, py = o.y + cy * o.pitch + o.pitch / 2;
      if (col) lit.push([px, py, col]);
      else if (!o.bare) { ctx.fillStyle = o.off; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); }
    }
    // bloom: the lit diodes drawn large and blurred, added light
    if (o.glow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `blur(${Math.max(4, o.pitch * 1.6)}px)`;
      ctx.globalAlpha = 0.55 * o.glow;
      for (const [px, py, col] of lit) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, r * 2.2, 0, 7); ctx.fill(); }
      ctx.filter = `blur(${Math.max(1, o.pitch * 0.35)}px)`;
      ctx.globalAlpha = 0.7 * o.glow;
      for (const [px, py, col] of lit) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, r * 1.3, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    // diodes with a hot centre
    for (const [px, py, col] of lit) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(px - r * .2, py - r * .2, r * .38, 0, 7); ctx.fill();
    }
    return { w: w + o.frame * 2, h: h + o.frame * 2, lit };
  }

  // pharmacy-style cross as a mask on a square matrix
  function crossMask(n, arm) {
    const a = Math.round(n * (arm || 0.34)), s = Math.round((n - a) / 2);
    return (cx, cy) => (cx >= s && cx < s + a) || (cy >= s && cy < s + a);
  }

  // soft light spill of a sign onto the floor / wall
  function spill(ctx, x, y, w, h, color, alpha) {
    const gr = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.9);
    gr.addColorStop(0, color); gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.35 : alpha; ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gr; ctx.fillRect(x - w, y - h, w * 3, h * 3); ctx.restore();
  }

  // mirror what is above `floorY` onto a glossy floor
  function reflect(ctx, floorY, height, alpha) {
    const c = ctx.canvas, W = c.width;
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = height;
    const t = tmp.getContext("2d");
    t.translate(0, height); t.scale(1, -1);
    t.drawImage(c, 0, floorY - height, W, height, 0, 0, W, height);
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = "destination-in";
    const gr = t.createLinearGradient(0, 0, 0, height);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    t.fillStyle = gr; t.fillRect(0, 0, W, height);
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.28 : alpha; ctx.filter = "blur(2px)";
    ctx.drawImage(tmp, 0, floorY); ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // dark studio / street backdrop with a soft vignette
  function stage(ctx, W, H, opts) {
    const o = Object.assign({ top: "#14141a", bottom: "#050507", floor: 0.72, floorColor: "#0a0a0d", haze: "rgba(120,90,255,.10)" }, opts || {});
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, o.top); bg.addColorStop(1, o.bottom);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const hz = ctx.createRadialGradient(W * .5, H * .35, 0, W * .5, H * .35, W * .7);
    hz.addColorStop(0, o.haze); hz.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
    if (o.floor) {
      const fy = H * o.floor;
      const fg = ctx.createLinearGradient(0, fy, 0, H);
      fg.addColorStop(0, o.floorColor); fg.addColorStop(1, "#020203");
      ctx.fillStyle = fg; ctx.fillRect(0, fy, W, H - fy);
      ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(0, fy, W, 1);
    }
  }

  function vignette(ctx, W, H, k) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${k == null ? .55 : k})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  g.LED = { textMask, sampler, panel, crossMask, spill, reflect, roundRect, stage, vignette };
})(window);
