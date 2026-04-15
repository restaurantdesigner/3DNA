// Вставка хедера (sharedHeaderHtml) как было в index.html
document.addEventListener("DOMContentLoaded", () => {
  const isNestedDetailPage = /\/(?:healthcare|packages)\/[^/]+\.html$/i.test(window.location.pathname);
  const fixRelativePaths = (root, prefix) => {
    const skip = /^(?:[a-z]+:|#|\/\/)/i;
    root.querySelectorAll("[href], [src]").forEach((node) => {
      if (node.hasAttribute("href")) {
        const href = node.getAttribute("href");
        if (href && !skip.test(href)) {
          node.setAttribute("href", `${prefix}${href}`);
        }
      }
      if (node.hasAttribute("src")) {
        const src = node.getAttribute("src");
        if (src && !skip.test(src)) {
          node.setAttribute("src", `${prefix}${src}`);
        }
      }
    });
  };

  const sharedHeaderHtml = `
<div class="utility-bar" aria-label="Utility navigation">
  <div class="container">
    <nav class="utility-nav">
      <a class="utility-link" href="https://wa.me/34722878642" target="_blank" rel="noopener">
        <span class="utility-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="M12 2a10 10 0 0 0-8.7 14.95L2 22l5.2-1.25A10 10 0 1 0 12 2zm5.54 14.1c-.23.66-1.35 1.2-1.86 1.28-.48.08-1.08.12-1.74-.1-.4-.13-.92-.3-1.57-.58-2.77-1.2-4.58-4.14-4.72-4.34-.14-.2-1.12-1.49-1.12-2.84 0-1.35.7-2.01.95-2.29.25-.27.55-.34.73-.34h.53c.17 0 .4-.07.62.47.22.54.75 1.87.82 2 .07.13.11.3.02.48-.09.18-.14.3-.27.45-.14.16-.29.35-.41.48-.14.14-.28.3-.12.57.16.27.7 1.15 1.5 1.86 1.03.9 1.9 1.18 2.16 1.31.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.61-.13.25.08 1.58.74 1.84.87.27.13.45.2.52.32.07.12.07.73-.16 1.39z"/></svg>
        </span>
        <span class="utility-text">WhatsApp</span>
      </a>
      <a class="utility-link" href="#contacto">
        <span class="utility-text">Contacto</span>
      </a>
      <a class="utility-link" href="#legal">
        <span class="utility-text">Legal</span>
      </a>
    </nav>
  </div>
</div>

<header class="topbar" id="topbar">
  <div class="container topbar-inner">
    <a class="brand" href="#hero" aria-label="3DNA Home">
      <div class="brand-title">3dna.es</div>
      <div class="brand-subtitle">Marketing y Publicidad</div>
    </a>

    <nav class="nav-desktop" aria-label="Primary">
      <a href="#hero">Inicio</a>

      <div class="nav-dropdown" id="showroomDropdown">
        <a href="#sec2" class="nav-parent" aria-haspopup="true" aria-expanded="false">
          Showroom <span class="nav-arrow" aria-hidden="true">▼</span>
        </a>

        <div class="nav-menu" role="menu" aria-label="Showroom submenu">
          <a role="menuitem" href="#sec2">Gimnasios</a>
          <a role="menuitem" href="#sec3">Restaurantes</a>
          <a role="menuitem" href="#sec4">Centros medicos</a>
        </div>
      </div>

      <a href="#contacto">Contacto</a>
      <a href="#legal" class="nav-legal">Legal</a>
    </nav>

    <div class="topbar-actions">
      <button class="topbar-cta open-panel" type="button">Solicitar propuesta</button>

      <button class="burger" id="burger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobileMenu">
        <div class="burger-lines" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </button>
    </div>
  </div>
</header>

<div class="mobile-menu" id="mobileMenu" aria-hidden="true">
  <div class="mobile-menu-inner">
    <div class="mobile-menu-head">
      <div class="mobile-menu-title">MENU</div>
      <button class="mobile-close" id="mobileClose" type="button" aria-label="Close menu">×</button>
    </div>

    <a href="#hero" class="m-link">Inicio</a>
    <a href="#sec2" class="m-link">Showroom</a>
    <a href="#contacto" class="m-link">Contacto</a>
    <a href="#legal" class="m-link">Legal</a>

    <button class="m-cta open-panel" type="button">Solicitar propuesta</button>
  </div>
</div>

<div class="mobile-menu-backdrop" id="mobileBackdrop"></div>`;

  const host = document.getElementById("site-header");
  if (!host) return;

  host.innerHTML = sharedHeaderHtml;
  if (isNestedDetailPage) {
    fixRelativePaths(host, "../");
  }
});
// Cookies
    document.addEventListener("DOMContentLoaded", () => {
      const banner = document.getElementById('cookie-banner');
      const modal = document.getElementById('cookie-modal');
      const overlay = document.getElementById('cookie-overlay');

      const accept = document.getElementById('accept-cookies');
      const config = document.getElementById('config-cookies');
      const reject = document.getElementById('reject-cookies');

      const save = document.getElementById('save-settings');
      const cancel = document.getElementById('cancel-settings');

      if (!localStorage.getItem('cookiesDecision')) {
        banner.classList.add('show');
      }

      accept.onclick = () => {
        localStorage.setItem('cookiesDecision', JSON.stringify({ necessary:true, analytics:true, ads:true }));
        banner.classList.remove('show');
      };

      reject.onclick = () => {
        localStorage.setItem('cookiesDecision', JSON.stringify({ necessary:true, analytics:false, ads:false }));
        banner.classList.remove('show');
      };

      config.onclick = () => {
        modal.classList.add('show');
        overlay.classList.add('show');
      };

      cancel.onclick = () => {
        modal.classList.remove('show');
        overlay.classList.remove('show');
      };

      save.onclick = () => {
        const analytics = document.getElementById('analytics-cookies').checked;
        const ads = document.getElementById('ads-cookies').checked;

        localStorage.setItem('cookiesDecision', JSON.stringify({ necessary:true, analytics, ads }));
        modal.classList.remove('show');
        overlay.classList.remove('show');
        banner.classList.remove('show');
      };
    });

    // Mobile menu
    document.addEventListener("DOMContentLoaded", () => {
      const burger = document.getElementById("burger");
      const mobileMenu = document.getElementById("mobileMenu");
      const mobileClose = document.getElementById("mobileClose");
      const mobileBackdrop = document.getElementById("mobileBackdrop");

      function openMobileMenu() {
        document.body.classList.add("mobile-open");
        burger.setAttribute("aria-expanded", "true");
        mobileMenu.setAttribute("aria-hidden", "false");
        setTimeout(() => mobileClose.focus(), 0);
      }

      function closeMobileMenu() {
        burger.focus();
        document.body.classList.remove("mobile-open");
        burger.setAttribute("aria-expanded", "false");
        setTimeout(() => mobileMenu.setAttribute("aria-hidden", "true"), 0);
      }

      burger.addEventListener("click", openMobileMenu);
      mobileClose.addEventListener("click", closeMobileMenu);
      mobileBackdrop.addEventListener("click", closeMobileMenu);

      document.querySelectorAll(".m-link").forEach(a => {
        a.addEventListener("click", closeMobileMenu);
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMobileMenu();
      });
    });

// HERO hover: color + play/pause (desktop only)
document.addEventListener("DOMContentLoaded", () => {
  const topbar = document.getElementById("topbar");
  if (topbar) {
    const syncTopbarState = () => {
      topbar.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    syncTopbarState();
    window.addEventListener("scroll", syncTopbarState, { passive: true });
  }

  const hero = document.getElementById("hero");
  const video = hero?.querySelector(".video-bg");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (!hero || !video || !canHover) return;

  hero.addEventListener("mouseenter", () => {
    hero.classList.add("is-hovered");
    video.play().catch(()=>{});
  });

  hero.addEventListener("mouseleave", () => {
    hero.classList.remove("is-hovered");
    video.pause();
  });
});


// Desktop hover: sec2 videos отдельно (контейнер → play/pause + color)
document.addEventListener("DOMContentLoaded", () => {
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!canHover) return;

  const blocks = [
    { wrap: document.querySelector("#sec2 .sec2-left"),  vid: document.querySelector("#sec2 .sec2-left video") },
    { wrap: document.querySelector("#sec2 .sec2-center"), vid: document.querySelector("#sec2 .sec2-center video") }
  ].filter(x => x.wrap && x.vid);

  // старт: все видео в паузе
  blocks.forEach(({vid}) => { try { vid.pause(); } catch(e){} });

  blocks.forEach(({wrap, vid}) => {
    wrap.addEventListener("mouseenter", () => {
      vid.classList.add("is-hovered");
      vid.play().catch(()=>{});
    });

    wrap.addEventListener("mouseleave", () => {
      vid.classList.remove("is-hovered");
      vid.pause();
    });
  });
});







// Rotating text (hero + sec2)
function startRotator(elId, list, interval = 3500, fadeMs = 600) {
  const el = document.getElementById(elId);
  if (!el) return;

  let i = 0;
  setInterval(() => {
    el.classList.add("fade-out");
    setTimeout(() => {
      i = (i + 1) % list.length;
      el.textContent = list[i];
      el.classList.remove("fade-out");
    }, fadeMs);
  }, interval);
}

// фразы для HERO
startRotator("rotating-text", [
  "Diseño 3D de espacios comerciales",
  "Restaurantes diseñados para atraer y vender",
  "Clubes deportivos con enfoque en experiencia y rendimiento",
  "Diseño 3D para centros médicos y clínicas",
  "Museos y galerías con narrativa espacial inmersiva",
  "Visualización 3D para tomar decisiones seguras",
  "Espacios que comunican marca y funcionalidad",
  "Experiencias espaciales que convierten en ventas",
  "Landing pages y pagos online integrados",
  "El futuro de los espacios es 3D. Empieza hoy"
]);

// фразы для SEC2 (можешь любые)
startRotator("rotating-text-sec2", [
  "Visualización 3D para captar clientes nuevos",
  "Recorridos inmersivos antes de construir",
  "Diseño que vende membresías desde la primera visita",
  "Showroom 3D para decisiones rápidas"
], 3200);






document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("lead-form");
  if (!form) return;

  function getCheckedValues(name){
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  }

  function updateProgress(){
    const requiredFilled =
      (form.nombre?.value || "").trim() &&
      (form.email?.value || "").trim() &&
      (form.whatsapp?.value || "").trim() &&
      document.getElementById("gdprConsent")?.checked &&
      document.getElementById("readConfirm")?.checked;

    const hasNegocio = getCheckedValues("negocio").length > 0;
    const hasServicios = getCheckedValues("servicios").length > 0;

    const steps = [requiredFilled, hasNegocio, hasServicios];
    const done = steps.filter(Boolean).length;
    const percent = Math.round((done / steps.length) * 100);

    const bar = document.getElementById("progress-bar");
    const txt = document.getElementById("progress-text");
    if (bar) bar.style.width = percent + "%";
    if (txt) txt.textContent = `${percent}% completado`;
  }

  // ✅ Otro: negocio
  const negocioOtroCheckbox = document.getElementById("negocioOtroCheckbox");
  const negocioOtroWrapper  = document.getElementById("negocioOtroWrapper");
  if (negocioOtroCheckbox && negocioOtroWrapper){
    negocioOtroCheckbox.addEventListener("change", () => {
      negocioOtroWrapper.style.display = negocioOtroCheckbox.checked ? "block" : "none";
      if (!negocioOtroCheckbox.checked){
        const inp = negocioOtroWrapper.querySelector('input[name="negocio_otro"]');
        if (inp) inp.value = "";
      }
      updateProgress();
    });
  }

  // ✅ Otro: espacio
  const espacioOtroCheckbox = document.getElementById("espacioOtroCheckbox");
  const espacioOtroWrapper  = document.getElementById("espacioOtroWrapper");
  if (espacioOtroCheckbox && espacioOtroWrapper){
    espacioOtroCheckbox.addEventListener("change", () => {
      espacioOtroWrapper.style.display = espacioOtroCheckbox.checked ? "block" : "none";
      if (!espacioOtroCheckbox.checked){
        const inp = espacioOtroWrapper.querySelector('input[name="espacio_otro"]');
        if (inp) inp.value = "";
      }
      updateProgress();
    });
  }

  // ✅ Otro: servicios
  const serviciosOtroCheckbox = document.getElementById("serviciosOtroCheckbox");
  const serviciosOtroWrapper  = document.getElementById("serviciosOtroWrapper");
  if (serviciosOtroCheckbox && serviciosOtroWrapper){
    serviciosOtroCheckbox.addEventListener("change", () => {
      serviciosOtroWrapper.style.display = serviciosOtroCheckbox.checked ? "block" : "none";
      if (!serviciosOtroCheckbox.checked){
        const inp = serviciosOtroWrapper.querySelector('input[name="servicios_otro"]');
        if (inp) inp.value = "";
      }
      updateProgress();
    });
  }

  form.addEventListener("input", updateProgress);
  form.addEventListener("change", updateProgress);
  updateProgress();
});


document.addEventListener("DOMContentLoaded", () => {
  // На мобилке панораму не грузим
  if (window.matchMedia("(max-width: 767px)").matches) return;

  const panoEl = document.getElementById("pano-right");
  if (!panoEl || typeof pannellum === "undefined") return;

  const viewer = pannellum.viewer("pano-right", {
    default: {
      firstScene: "s1",
      autoLoad: true,
      showControls: false,
      sceneFadeDuration: 700,
      autoRotate: 0.8,
      autoRotateInactivityDelay: 3000
    },
    scenes: {
      s1: { type: "equirectangular", panorama: "img/pano1.jpg" },
      s2: { type: "equirectangular", panorama: "img/pano2.jpg" },
      s3: { type: "equirectangular", panorama: "img/pano3.jpg" },
      s4: { type: "equirectangular", panorama: "img/pano4.jpg" }
    }
  });

  document.querySelectorAll(".pano-btn").forEach(btn => {
    btn.addEventListener("click", () => viewer.loadScene(btn.dataset.scene));
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const backdrop = document.getElementById("panel-backdrop");
  const panel = document.getElementById("side-panel");
  const closeBtn = document.getElementById("close-panel");

  function openPanel(){
    document.body.classList.add("panel-open");
    panel?.setAttribute("aria-hidden","false");
    backdrop?.setAttribute("aria-hidden","false");
    document.documentElement.style.overflow = "hidden"; // чтобы фон не скроллился
  }
  function closePanel(){
    document.body.classList.remove("panel-open");
    panel?.setAttribute("aria-hidden","true");
    backdrop?.setAttribute("aria-hidden","true");
    document.documentElement.style.overflow = "";
  }

  document.querySelectorAll(".open-panel").forEach(btn => {
    btn.addEventListener("click", openPanel);
  });

  closeBtn?.addEventListener("click", closePanel);
  backdrop?.addEventListener("click", closePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("lead-form");
  if (!form) return;

  // всем label внутри form-grid, где есть checkbox — добавляем класс
  form.querySelectorAll(".form-grid label").forEach(label => {
    if (label.querySelector('input[type="checkbox"]')) {
      label.classList.add("checkline");
    }
  });
});

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  const SUPABASE_URL = "https://pmzeozpcrpjrfoowwofe.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtemVvenBjcnBqcmZvb3d3b2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTU0MTEsImV4cCI6MjA4Mjk3MTQxMX0.auE0KvzZovJ0cZhzNkF1c_-2MgcujSAXlRVYf7sOBwI";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const form = document.getElementById("lead-form");
  const statusEl = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  function checkedValues(name){
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  }

  function val(name){
    const el = form.querySelector(`[name="${name}"]`);
    return (el?.value || "").trim();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    submitBtn.disabled = true;

    // 1) собираем данные (под твою форму)
  const lead = {
  source: "landing",
  status: "new",

  name: val("nombre"),
  email: val("email"),
  whatsapp: val("whatsapp"),
  city: val("zona"),
  link: val("link"),

  consent_gdpr: document.getElementById("gdprConsent")?.checked ?? false,
  consent_read: document.getElementById("readConfirm")?.checked ?? false,

  // ✅ ВОТ ЭТО ЗАПОЛНИТ КОЛОНКИ text[]
  negocio: checkedValues("negocio"),
  espacio: checkedValues("espacio"),
  objetivo: checkedValues("objetivo"),
  servicios: checkedValues("servicios"),
  pago: checkedValues("pago"),
  ads: checkedValues("ads"),
  estado: checkedValues("estado"),

  // ✅ поля "Otro"
  negocio_otro: val("negocio_otro"),
  espacio_otro: val("espacio_otro"),
  servicios_otro: val("servicios_otro"),

  // ✅ проект
  metros: val("metros"),
  zonas: val("zonas"),
  plazo: val("plazo"),
  presupuesto: val("presupuesto"),
  comentario: (form.querySelector(`[name="comentario"]`)?.value || "").trim(),

  // ✅ при желании оставь полный JSON
  payload: {
    page_url: location.href,
    user_agent: navigator.userAgent
  }
};


    // 2) минимальная валидация (чтобы не писать мусор)
    if (!lead.name || !lead.email || !lead.whatsapp) {
      statusEl.textContent = "⚠️ Rellena nombre, email y WhatsApp.";
      submitBtn.disabled = false;
      return;
    }
    if (!lead.consent_gdpr || !lead.consent_read) {
      statusEl.textContent = "⚠️ Debes aceptar GDPR y confirmar lectura.";
      submitBtn.disabled = false;
      return;
    }

    // 3) INSERT в Supabase
    const { error } = await supabase.from("leads").insert([lead]);

    if (error) {
      console.error(error);
      statusEl.textContent = "❌ Error guardando en la base de datos. Reintenta.";
      submitBtn.disabled = false;
      return;
    }

    statusEl.textContent = "✅ Enviado. ¡Gracias!";

    // 4) (опционально) открыть WhatsApp, если хочешь
    // const msg = `Hola! Soy ${lead.name}. Mi email: ${lead.email}.`;
    // window.open(`https://wa.me/34722878642?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");

    form.reset();
    submitBtn.disabled = false;
  });

document.addEventListener("DOMContentLoaded", () => {
  const dd = document.getElementById("showroomDropdown");
  if (!dd) return;

  const parent = dd.querySelector(".nav-parent");
  const menu = dd.querySelector(".nav-menu");
  if (!parent || !menu) return;

  // ✅ Включаем клик-тоггл ТОЛЬКО на тач/мобилках
  const isTouch = window.matchMedia("(hover: none) or (pointer: coarse)").matches;

  function setOpen(state){
    dd.classList.toggle("open", state);
    parent.setAttribute("aria-expanded", state ? "true" : "false");
  }

  // На десктопе — hover, клик ведёт по ссылке как обычно
  if (!isTouch) {
    setOpen(false);
    return;
  }

  // На мобилке — клик открывает/закрывает (и НЕ прыгает к #sec2)
  parent.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!dd.classList.contains("open"));
  });

  // Клик вне — закрыть
  document.addEventListener("click", () => setOpen(false));

  // Клик по пункту меню — закрыть (и перейти по ссылке)
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(false);
  });

  // Esc — закрыть
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // Если повернули экран/ресайз — пересчитать режим
  window.addEventListener("resize", () => {
    const nowTouch = window.matchMedia("(hover: none) or (pointer: coarse)").matches;
    if (!nowTouch) setOpen(false);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const marquee = document.querySelector("#reviews .reviews-marquee");
  const track   = document.querySelector("#reviews .reviews-track");
  if (!marquee || !track) return;

  // 1) ДЕЛАЕМ БЕСШОВНЫЙ ЛУП АВТОМАТИЧЕСКИ:
  // если ты не добавил дубль вручную — мы продублируем сами.
  // (Если дубль уже есть — всё равно норм, но лучше оставить только один набор в HTML.)
  const originalHTML = track.innerHTML.trim();
  if (!track.dataset.looped) {
    track.innerHTML = originalHTML + originalHTML;
    track.dataset.looped = "1";
  }

  // 2) НАСТРОЙКИ АВТОПРОКРУТКИ
  const SPEED_PX_PER_SEC = 22;     // скорость “медленно едет”
  const PAUSE_AFTER_DRAG_MS = 900; // пауза после ручного вмешательства

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let lastUserActionAt = 0;

  // Для requestAnimationFrame
  let lastT = performance.now();

  // Половина трека = длина одного набора карточек
  function getHalfWidth() {
    return track.scrollWidth / 2;
  }

  // держим scrollLeft внутри [0 .. halfWidth)
  function normalizeScroll() {
    const half = getHalfWidth();
    if (half <= 0) return;

    // если ушли вправо за половину — вернём назад на half
    if (marquee.scrollLeft >= half) {
      marquee.scrollLeft -= half;
    }
    // если ушли влево — добавим half
    if (marquee.scrollLeft < 0) {
      marquee.scrollLeft += half;
    }
  }

  // 3) AUTO LOOP
  function tick(t) {
    const dt = (t - lastT) / 1000;
    lastT = t;

    const now = Date.now();
    const canAuto = !isDragging && (now - lastUserActionAt > PAUSE_AFTER_DRAG_MS);

    if (canAuto) {
      marquee.scrollLeft += SPEED_PX_PER_SEC * dt;
      normalizeScroll();
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // 4) DRAG (mouse)
  marquee.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastUserActionAt = Date.now();
    startX = e.pageX;
    startScrollLeft = marquee.scrollLeft;
    marquee.style.cursor = "grabbing";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = (e.pageX - startX);
    marquee.scrollLeft = startScrollLeft - dx;
    normalizeScroll();
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    lastUserActionAt = Date.now();
    marquee.style.cursor = "grab";
  });

  // 5) SWIPE (touch)
  marquee.addEventListener("touchstart", (e) => {
    isDragging = true;
    lastUserActionAt = Date.now();
    startX = e.touches[0].pageX;
    startScrollLeft = marquee.scrollLeft;
  }, { passive: true });

  marquee.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const dx = (e.touches[0].pageX - startX);
    marquee.scrollLeft = startScrollLeft - dx;
    normalizeScroll();
  }, { passive: true });

  marquee.addEventListener("touchend", () => {
    isDragging = false;
    lastUserActionAt = Date.now();
  }, { passive: true });

  // 6) Wheel horizontal support (trackpads)
  marquee.addEventListener("wheel", (e) => {
    // если человек скроллит трекпадом по горизонтали/вертикали — даём сдвигать отзывы
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      marquee.scrollLeft += e.deltaX;
      lastUserActionAt = Date.now();
      normalizeScroll();
      e.preventDefault();
    }
  }, { passive: false });

  // 7) Если изменился размер окна — починим позицию
  window.addEventListener("resize", () => {
    normalizeScroll();
  });

  // стартовая нормализация
  normalizeScroll();
});
