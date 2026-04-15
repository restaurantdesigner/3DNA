// =============================================
// 1. HEADER INJECTION (runs immediately)
// =============================================
(() => {
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
          Showroom <span class="nav-arrow" aria-hidden="true">&#9660;</span>
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
      <button class="mobile-close" id="mobileClose" type="button" aria-label="Close menu">\u00d7</button>
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
})();


// =============================================
// 2. ROTATING TEXT (hero + sec2)
// =============================================
const phrases = [
  "Diseno 3D de espacios comerciales",
  "Restaurantes disenados para atraer y vender",
  "Clubes deportivos con enfoque en experiencia y rendimiento",
  "Diseno 3D para centros medicos y clinicas",
  "Museos y galerias con narrativa espacial inmersiva",
  "Visualizacion 3D para tomar decisiones seguras",
  "Espacios que comunican marca y funcionalidad",
  "Experiencias espaciales que convierten en ventas",
  "Landing pages y pagos online integrados",
  "El futuro de los espacios es 3D. Empieza hoy"
];

let current = 0;
const el = document.getElementById("rotating-text");

if (el) {
  setInterval(() => {
    el.classList.add("fade-out");
    setTimeout(() => {
      current = (current + 1) % phrases.length;
      el.textContent = phrases[current];
      el.classList.remove("fade-out");
    }, 600);
  }, 3500);
}

const phrasesSec2 = [
  "Panoramas 360 del gimnasio (antes de construir)",
  "Zonas Instagrammables que atraen y venden",
  "Escenarios de iluminacion: energia / relax / noche",
  "Recorridos interactivos por salas y zonas premium",
  "Diseno de flujo: entrada -> vestuarios -> maquinas",
  "Visualizacion 3D de branding en el espacio",
  "Showroom digital para inversores y socios"
];

let currentSec2 = 0;
const elSec2 = document.getElementById("rotating-text-sec2");

if (elSec2) {
  setInterval(() => {
    elSec2.classList.add("fade-out");
    setTimeout(() => {
      currentSec2 = (currentSec2 + 1) % phrasesSec2.length;
      elSec2.textContent = phrasesSec2[currentSec2];
      elSec2.classList.remove("fade-out");
    }, 600);
  }, 3500);
}


// =============================================
// 3. SIDE PANEL (open/close)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById('side-panel');
  const closeBtn = document.getElementById('close-panel');
  const backdrop = document.getElementById('panel-backdrop');

  document.querySelectorAll('.open-panel').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      panel.classList.add('open');
      backdrop.classList.add('visible');
      document.body.classList.add('modal-open');
    });
  });

  function closePanel() {
    panel.classList.remove('open');
    backdrop.classList.remove('visible');
    document.body.classList.remove('modal-open');
  }

  closeBtn.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
});


// =============================================
// 4. COOKIES BANNER
// =============================================
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
    localStorage.setItem('cookiesDecision', JSON.stringify({
      necessary: true, analytics: true, ads: true
    }));
    banner.classList.remove('show');
  };

  reject.onclick = () => {
    localStorage.setItem('cookiesDecision', JSON.stringify({
      necessary: true, analytics: false, ads: false
    }));
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

    localStorage.setItem('cookiesDecision', JSON.stringify({
      necessary: true, analytics: analytics, ads: ads
    }));

    modal.classList.remove('show');
    overlay.classList.remove('show');
    banner.classList.remove('show');
  };
});


// =============================================
// 5. COOKIES POLICY MODAL
// =============================================
document.querySelectorAll('a[href="#politica-cookies"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('cookies-policy-modal').style.display = 'flex';
  });
});

document.getElementById('close-policy-modal')?.addEventListener('click', () => {
  document.getElementById('cookies-policy-modal').style.display = 'none';
});


// =============================================
// 6. GOOGLE ANALYTICS (after consent)
// =============================================
function loadGoogleAnalytics() {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-QGGREKNJDX';
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QGGREKNJDX');
}

document.addEventListener("DOMContentLoaded", () => {
  const consent = JSON.parse(localStorage.getItem('cookiesDecision'));
  if (consent && consent.analytics) {
    loadGoogleAnalytics();
  }
});


// =============================================
// 7. OFERTA MODAL
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const ofertaLinks = document.querySelectorAll('.open-oferta');
  const modalOferta = document.getElementById('modal-oferta');
  const closeOferta = document.getElementById('close-oferta');

  ofertaLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      modalOferta.style.display = 'flex';
    });
  });

  closeOferta?.addEventListener('click', () => {
    modalOferta.style.display = 'none';
  });

  modalOferta?.addEventListener('click', (e) => {
    if (e.target === modalOferta) {
      modalOferta.style.display = 'none';
    }
  });
});


// =============================================
// 8. FORM PROGRESS BAR
// =============================================
function updateStepProgress() {
  const sections = document.querySelectorAll('.form-section');
  let completed = 0;

  sections.forEach(section => {
    const checked = section.querySelectorAll('input[type="checkbox"]:checked').length;
    if (checked > 0) completed++;
  });

  const percent = Math.round((completed / sections.length) * 100);
  const bar = document.getElementById('progress-bar');
  const txt = document.getElementById('progress-text');
  if (bar) bar.style.width = `${percent}%`;
  if (txt) txt.textContent = `${percent}% completado`;
}

document.addEventListener("DOMContentLoaded", () => {
  updateStepProgress();

  document.querySelectorAll('.form-section input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateStepProgress);
  });
});


// =============================================
// 9. OTRO CHECKBOX TOGGLE
// =============================================
{
  const otroCheckbox = document.getElementById('otroCheckbox');
  const otroInputWrapper = document.getElementById('otroInputWrapper');

  if (otroCheckbox && otroInputWrapper) {
    otroCheckbox.addEventListener('change', function () {
      otroInputWrapper.style.display = this.checked ? 'block' : 'none';
    });
  }
}


// =============================================
// 10. MOBILE MENU (burger)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileClose = document.getElementById("mobileClose");
  const mobileBackdrop = document.getElementById("mobileBackdrop");

  function openMobileMenu() {
    document.body.classList.add("mobile-open");
    burger?.setAttribute("aria-expanded", "true");
    mobileMenu?.setAttribute("aria-hidden", "false");
    setTimeout(() => mobileClose?.focus(), 0);
  }

  function closeMobileMenu() {
    burger?.focus();
    document.body.classList.remove("mobile-open");
    burger?.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      mobileMenu?.setAttribute("aria-hidden", "true");
    }, 0);
  }

  burger?.addEventListener("click", openMobileMenu);
  mobileClose?.addEventListener("click", closeMobileMenu);
  mobileBackdrop?.addEventListener("click", closeMobileMenu);

  document.querySelectorAll(".m-link").forEach(a => {
    a.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileMenu();
  });
});


// =============================================
// 11. PANO HANDLE DRAG
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const handle = document.querySelector(".pano-handle");
  if (!handle) return;

  let dragging = false;
  let lastY = 0;

  handle.addEventListener("mousedown", e => {
    dragging = true;
    lastY = e.clientY;
    e.preventDefault();
  });

  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    const dy = lastY - e.clientY;
    window.scrollBy(0, dy);
    lastY = e.clientY;
  });

  window.addEventListener("mouseup", () => { dragging = false; });

  handle.addEventListener("touchstart", e => {
    dragging = true;
    lastY = e.touches[0].clientY;
  }, { passive:true });

  handle.addEventListener("touchmove", e => {
    if (!dragging) return;
    const y = e.touches[0].clientY;
    const dy = lastY - y;
    window.scrollBy(0, dy);
    lastY = y;
  }, { passive:true });

  handle.addEventListener("touchend", () => { dragging = false; });
});


// =============================================
// 12. VIDEO HOVER (enable/disable all videos)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const videos = document.querySelectorAll('video.video-bg, video.side-video');

  function enable(video){
    video.classList.add('video-hover-active');
    if (!video.closest('.about-media')) video.play().catch(()=>{});
  }

  function disable(video){
    video.classList.remove('video-hover-active');
    if (!video.closest('.about-media')) {
      video.pause();
      try { video.currentTime = 0; } catch(e){}
    }
  }

  videos.forEach(video => {
    if (video.closest('.about-media')) {
      video.play().catch(()=>{});
    } else {
      disable(video);
    }
    const parent = video.parentElement;

    parent.addEventListener('mouseenter', () => enable(video));
    parent.addEventListener('mouseleave', () => disable(video));

    parent.addEventListener('touchstart', () => enable(video), { passive:true });
    parent.addEventListener('touchend',   () => disable(video), { passive:true });
  });
});


// =============================================
// 13. PANNELLUM PANORAMA VIEWER
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const panoEl = document.getElementById("pano-right");
  if (!panoEl || typeof pannellum === "undefined") {
    console.error("Pannellum not loaded or #pano-right missing");
    return;
  }

  const viewer = pannellum.viewer("pano-right", {
    default: {
      firstScene: "s1",
      sceneFadeDuration: 800,
      autoLoad: true,
      showControls: false,
      mouseZoom: false
    },
    scenes: {
      s1: { type: "equirectangular", panorama: "img/pano4.jpg", autoRotate: -8 },
      s2: { type: "equirectangular", panorama: "img/pano3.jpg", autoRotate: -8 },
      s3: { type: "equirectangular", panorama: "img/pano1.jpg", autoRotate: -8 },
      s4: { type: "equirectangular", panorama: "img/pano2.jpg", autoRotate: -8 }
    }
  });

  document.querySelectorAll(".pano-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sceneId = btn.getAttribute("data-scene");
      if (sceneId) viewer.loadScene(sceneId);

      document.querySelectorAll(".pano-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const firstBtn = document.querySelector('.pano-btn[data-scene="s1"]');
  if (firstBtn) firstBtn.classList.add("active");
});


// =============================================
// 14. SEC3 RIGHT VIDEO AUTOPLAY
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const v = document.querySelector("#sec3 .sec2-right video");
  if (!v) return;

  v.classList.add("video-hover-active");
  v.muted = true;
  v.playsInline = true;

  const tryPlay = () => v.play().catch(()=>{});

  tryPlay();
  ["touchstart","click","scroll"].forEach(evt =>
    window.addEventListener(evt, tryPlay, { once:true, passive:true })
  );
});


// =============================================
// 15. SHOWROOM DROPDOWN TOGGLE
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const dd = document.getElementById("showroomDropdown");
  if (!dd) return;

  const parent = dd.querySelector(".nav-parent");
  const menu = dd.querySelector(".nav-menu");
  if (!parent || !menu) return;

  parent.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dd.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    dd.classList.remove("open");
  });

  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    dd.classList.remove("open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dd.classList.remove("open");
  });
});


// =============================================
// 16. REVIEWS MARQUEE (auto-scroll + drag)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const scroller = document.querySelector("#reviews .reviews-marquee");
  const track = document.querySelector("#reviews .reviews-track");
  if (!scroller || !track) return;

  const DRAG_SENSITIVITY = 0.45;
  const AUTO_SPEED_PX_PER_SEC = 18;
  const AUTO_RESUME_DELAY_MS = 1200;

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let virtualScrollLeft = 0;
  let lastInteractionAt = 0;
  let lastTs = performance.now();

  if (!track.dataset.looped) {
    track.innerHTML = track.innerHTML + track.innerHTML;
    track.dataset.looped = "1";
  }

  const halfWidth = () => track.scrollWidth / 2;

  const normalizeScroll = () => {
    const hw = halfWidth();
    if (!hw) return;
    if (virtualScrollLeft >= hw) virtualScrollLeft -= hw;
    if (virtualScrollLeft < 0) virtualScrollLeft += hw;
    scroller.scrollLeft = virtualScrollLeft;
  };

  const startDrag = (pageX) => {
    isDragging = true;
    lastInteractionAt = Date.now();
    startX = pageX;
    startScrollLeft = scroller.scrollLeft;
    virtualScrollLeft = scroller.scrollLeft;
    scroller.classList.add("is-dragging");
  };

  const moveDrag = (pageX) => {
    if (!isDragging) return;
    const dx = pageX - startX;
    virtualScrollLeft = startScrollLeft - (dx * DRAG_SENSITIVITY);
    scroller.scrollLeft = virtualScrollLeft;
    normalizeScroll();
  };

  const stopDrag = () => {
    isDragging = false;
    lastInteractionAt = Date.now();
    scroller.classList.remove("is-dragging");
  };

  const tick = (ts) => {
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    const autoAllowed = !isDragging && (Date.now() - lastInteractionAt > AUTO_RESUME_DELAY_MS);
    if (autoAllowed) {
      virtualScrollLeft += AUTO_SPEED_PX_PER_SEC * dt;
      scroller.scrollLeft = virtualScrollLeft;
      normalizeScroll();
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  scroller.addEventListener("mousedown", (e) => {
    startDrag(e.pageX);
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => { moveDrag(e.pageX); });
  window.addEventListener("mouseup", stopDrag);

  scroller.addEventListener("touchstart", (e) => {
    startDrag(e.touches[0].pageX);
  }, { passive: true });

  scroller.addEventListener("touchmove", (e) => {
    moveDrag(e.touches[0].pageX);
  }, { passive: true });

  scroller.addEventListener("touchend", stopDrag, { passive: true });

  virtualScrollLeft = scroller.scrollLeft;
  normalizeScroll();
});
