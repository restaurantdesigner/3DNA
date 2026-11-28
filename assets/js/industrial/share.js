/*
 * 3DNA Industrial — quick sharing of the tools ([data-share] buttons).
 *   data-share-title · data-share-text · data-share-url (absolute or site path) · data-share-img (share card)
 * Phones / browsers with the Web Share API: the native share sheet, with the share card attached as an image
 * where the browser accepts files. Elsewhere: a small panel previewing the card and the text, with WhatsApp,
 * LinkedIn, Facebook, X, Telegram, e-mail and copy-link. Nothing is sent anywhere until the visitor picks a target.
 */
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (u) => new URL(u || location.href, location.origin).toString();
let panel;

function targets(d) {
  const u = encodeURIComponent(d.url), t = encodeURIComponent(d.title), tx = encodeURIComponent(`${d.text}\n${d.url}`);
  return [
    ["WhatsApp", `https://wa.me/?text=${tx}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ["X", `https://twitter.com/intent/tweet?text=${encodeURIComponent(d.text)}&url=${u}`],
    ["Telegram", `https://t.me/share/url?url=${u}&text=${encodeURIComponent(d.text)}`],
    ["E-mail", `mailto:?subject=${t}&body=${tx}`]
  ];
}
function openPanel(d, from) {
  if (!panel) {
    panel = document.createElement("div"); panel.className = "shr"; panel.hidden = true;
    panel.innerHTML = `<div class="shr__bg" data-shr-close></div><div class="shr__box" role="dialog" aria-modal="true" aria-labelledby="shr-t"><button type="button" class="shr__x" data-shr-close aria-label="Close">×</button><div data-shr-body></div></div>`;
    document.body.appendChild(panel);
    panel.addEventListener("click", async (e) => {
      if (e.target.closest("[data-shr-close]")) close();
      const cp = e.target.closest("[data-shr-copy]");
      if (cp) { try { await navigator.clipboard.writeText(cp.dataset.shrCopy); cp.textContent = "Link copied ✓"; } catch { const i = panel.querySelector("[data-shr-url]"); i.select(); document.execCommand && document.execCommand("copy"); cp.textContent = "Link copied ✓"; } }
    });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }
  panel.querySelector("[data-shr-body]").innerHTML = `${d.img ? `<img class="shr__img" src="${esc(d.img)}" width="1200" height="630" alt="">` : ""}
    <h2 class="shr__t" id="shr-t">Share · ${esc(d.title)}</h2><p class="shr__p">${esc(d.text)}</p>
    <div class="shr__btns">${targets(d).map(([n, h]) => `<a class="shr__b" href="${esc(h)}" target="_blank" rel="noopener noreferrer">${n}</a>`).join("")}</div>
    <div class="shr__copy"><input type="text" readonly value="${esc(d.url)}" data-shr-url aria-label="Link"><button type="button" data-shr-copy="${esc(d.url)}">Copy link</button></div>`;
  panel.hidden = false; panel._from = from; document.documentElement.classList.add("shr-open");
  panel.querySelector(".shr__x").focus();
}
function close() { if (!panel) return; panel.hidden = true; document.documentElement.classList.remove("shr-open"); panel._from && panel._from.focus(); }

// share cards are fetched ahead (small JPEGs) so the native share runs straight from the tap
const files = new Map();
const prefetch = () => { for (const b of document.querySelectorAll("[data-share][data-share-img]")) { const u = abs(b.dataset.shareImg); if (files.has(u)) continue; files.set(u, null); fetch(u).then((r) => r.blob()).then((bl) => files.set(u, new File([bl], u.split("/").pop(), { type: bl.type || "image/jpeg" }))).catch(() => files.delete(u)); } };
if (matchMedia("(pointer: coarse)").matches && navigator.share) (window.requestIdleCallback || ((fn) => setTimeout(fn, 1500)))(prefetch);

async function share(btn) {
  const d = { title: btn.dataset.shareTitle || document.title, text: btn.dataset.shareText || "", url: abs(btn.dataset.shareUrl), img: btn.dataset.shareImg ? abs(btn.dataset.shareImg) : "" };
  const touch = matchMedia("(pointer: coarse)").matches;
  if (navigator.share && touch) {
    const file = d.img && files.get(d.img);
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ title: d.title, text: `${d.text}
${d.url}`, files: [file] });
      else await navigator.share({ title: d.title, text: d.text, url: d.url });
      return;
    } catch (e) { if (e && e.name === "AbortError") return; }
  }
  openPanel(d, btn);
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-share]"); if (b) { e.preventDefault(); share(b); } });
export { share };
