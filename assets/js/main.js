// =============================================
// 0a. WHATSAPP LINK (one number site-wide; message follows the page language)
// =============================================
// Locale home pages get the exact link from the build (window.I18N.whatsappHref,
// text from assets/i18n/translations.json). Other pages are Spanish.
window.whatsappHref = () =>
  (window.I18N && window.I18N.whatsappHref) ||
  "https://wa.me/34722878642?text=" +
    encodeURIComponent("Hola, me gustaría hablar sobre un proyecto de diseño de interiores comerciales.");

// Manual language choice; mirrors I18nDetect.save() for pages without it
window.saveLanguageChoice = (lang) => {
  if (window.I18nDetect) return window.I18nDetect.save(lang);
  if (!/^(en|es|ru|uk)$/.test(lang)) return;
  try { localStorage.setItem("3dna_language", lang); } catch (e) {}
  document.cookie = `3dna_language=${lang}; path=/; max-age=31536000; SameSite=Lax`;
};

// =============================================
// 0. ANALYTICS HOOK (no tracking by itself)
// =============================================
// window.track(name, params) always fires a "3dna:track" DOM event. It is only
// forwarded to Google Analytics when GA was loaded after cookie consent
// (see loadGoogleAnalytics). Elements with data-track="event_name" are tracked
// on click; data-track-location is sent as "location".
(() => {
  window.track = (name, params = {}) => {
    document.dispatchEvent(new CustomEvent("3dna:track", { detail: { name, params } }));
    if (window.__gaLoaded && Array.isArray(window.dataLayer)) {
      // gtag() expects an Arguments object
      (function () { window.dataLayer.push(arguments); })("event", name, params);
    }
  };
  document.addEventListener("click", (event) => {
    const el = event.target.closest && event.target.closest("[data-track]");
    if (!el) return;
    const params = {};
    if (el.dataset.trackLocation) params.location = el.dataset.trackLocation;
    if (document.documentElement.lang) params.language = document.documentElement.lang;
    window.track(el.dataset.track, params);
  }, true); // capture: the proposal-form handler stops propagation
})();

// =============================================
// 1. HEADER INJECTION (runs immediately)
// =============================================
(() => {
  const pathname = window.location.pathname;
  // Localized home pages live at /en/, /es/, /ru/, /uk/ (see scripts/build-i18n.js)
  const isLocaleHome = /^\/(?:en|es|ru|uk)\/(?:index\.html)?$/.test(pathname);
  const isHomePage = isLocaleHome || pathname === "/" || pathname.endsWith("/index.html");
  const isNestedDetailPage = /\/(?:healthcare|packages)\/[^/]+\.html$/i.test(window.location.pathname);
  const pagePrefix = isNestedDetailPage ? "../" : (isLocaleHome ? "/" : (isHomePage ? "" : "/"));

  const homeLink = (hash) => {
    if (isHomePage) return hash;
    return `${pagePrefix}index.html${hash}`;
  };

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
      <a class="utility-link" href="${homeLink("#sec2")}">
        <span class="utility-text">3D</span>
      </a>
      <a class="utility-link" href="${homeLink("#sec5")}">
        <span class="utility-text">WEB</span>
      </a>
      <a class="utility-link" href="${homeLink("#sec5")}">
        <span class="utility-text">AI</span>
      </a>
    </nav>
  </div>
</div>

<header class="topbar" id="topbar">
  <div class="container topbar-inner">
    <a class="brand" href="${homeLink("#hero")}" aria-label="3DNA Home">
      <div class="brand-title"><img src="${pagePrefix}img/logo.png" alt="3DNA" /></div>
      
    </a>

    <nav class="nav-desktop" aria-label="Primary">
      <a href="${homeLink("#hero")}">Inicio</a>
      <a href="${homeLink("#about")}">Sobre nosotros</a>
      <a href="${homeLink("#sec2")}">Servicios</a>

      <div class="nav-dropdown" id="showroomDropdown">
        <a href="${homeLink("#sec3")}" class="nav-parent" aria-haspopup="true" aria-expanded="false">
          Experiencias <span class="nav-arrow" aria-hidden="true">&#9660;</span>
        </a>

        <div class="nav-menu" role="menu" aria-label="Showroom submenu">
          <a role="menuitem" href="${homeLink("#sec3")}">Restaurantes</a>
          <a role="menuitem" href="${homeLink("#sec2")}">Gimnasios</a>
          <a role="menuitem" href="${homeLink("#sec4")}">Centros medicos</a>
        </div>
      </div>

      <a href="${homeLink("#contacto")}">Contacto</a>
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

<div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Menú" aria-hidden="true">
  <div class="mobile-menu-inner">
    <div class="mobile-menu-head">
      <a class="mobile-menu-brand m-link" href="${homeLink("#hero")}" aria-label="Inicio de 3DNA"><img src="${pagePrefix}img/logo.png" alt="3DNA" width="1536" height="1024" decoding="async"></a>
      <button class="mobile-close" id="mobileClose" type="button" aria-label="Cerrar menú">\u00d7</button>
    </div>

    <nav class="mobile-menu-nav" aria-label="Principal">
      <a href="${homeLink("#hero")}" class="m-link">Inicio</a>
      <a href="${homeLink("#sec2")}" class="m-link">Proyectos</a>
      <a href="${homeLink("#transform")}" class="m-link">Proceso</a>
      <a href="${homeLink("#about")}" class="m-link">Nosotros</a>
      <a href="#site-footer" class="m-link">Contacto</a>
    </nav>

    <div class="mobile-menu-foot">
      <nav class="lang-switch lang-switch--menu" aria-label="Idioma">
        <a href="/en/" hreflang="en" lang="en" data-lang="en" aria-label="English">EN</a><span class="lang-switch__sep" aria-hidden="true">/</span><a href="/es/" hreflang="es" lang="es" data-lang="es" aria-label="Español" aria-current="page">ES</a><span class="lang-switch__sep" aria-hidden="true">/</span><a href="/ru/" hreflang="ru" lang="ru" data-lang="ru" aria-label="Русский">RU</a><span class="lang-switch__sep" aria-hidden="true">/</span><a href="/uk/" hreflang="uk" lang="uk" data-lang="uk" aria-label="Українська">UK</a>
      </nav>
      <a class="m-whatsapp" href="${window.whatsappHref()}" target="_blank" rel="noopener noreferrer"
        data-track="whatsapp_clicked" data-track-location="menu">WhatsApp <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</div>

<div class="mobile-menu-backdrop" id="mobileBackdrop"></div>`;

  const host = document.getElementById("site-header");
  if (!host) return;

  // Localized home pages ship their header in the HTML (built by scripts/build-i18n.js).
  const prerenderedHeader = host.querySelector("#topbar.topbar--overlay");
  if (!prerenderedHeader) host.innerHTML = sharedHeaderHtml;

  if (prerenderedHeader) {
    document.documentElement.classList.add("has-overlay-header");

    // A manual language choice is saved and always wins over detection.
    // The equivalent place on the page (#hash) is kept when switching.
    host.querySelectorAll(".lang-switch a[data-lang]").forEach((link) => {
      link.addEventListener("click", () => {
        const lang = link.dataset.lang;
        window.saveLanguageChoice(lang);
        if (window.track) window.track("language_selected", { language: lang });
        if (window.location.hash) link.setAttribute("href", `/${lang}/${window.location.hash}`);
      });
    });
    const topbar = document.getElementById("topbar");
    const hero = document.querySelector(".sector-hero");
    // Header turns solid once the hero has scrolled out from under it
    if (topbar && hero && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([entry]) => {
        topbar.classList.toggle("is-solid", !entry.isIntersecting);
      }, { rootMargin: `-${topbar.offsetHeight || 72}px 0px 0px 0px` });
      io.observe(hero);
    }
  }
  if (!prerenderedHeader) {
    host.querySelectorAll(".lang-switch a[data-lang]").forEach((link) => {
      link.addEventListener("click", () => window.saveLanguageChoice(link.dataset.lang));
    });
  }
  if (isNestedDetailPage) {
    fixRelativePaths(host, "../");
  }
})();

// =============================================
// 1b. FOOTER INJECTION
// =============================================
(() => {
  const pathname = window.location.pathname;
  const isLocaleHome = /^\/(?:en|es|ru|uk)\/(?:index\.html)?$/.test(pathname);
  const isHomePage = isLocaleHome || pathname === "/" || pathname.endsWith("/index.html");
  const isNestedDetailPage = /\/(?:healthcare|packages)\/[^/]+\.html$/i.test(pathname);
  const prefix = isNestedDetailPage ? "../" : (isLocaleHome ? "/" : (isHomePage ? "" : "/"));
  const homeHref = isLocaleHome ? "" : `${prefix}index.html`;

  const footerHtml = `
<footer class="site-footer" id="site-footer-el">
  <div class="footer-inner">
    <div class="footer-top">

      <div class="footer-brand">
        <a href="${homeHref || "#hero"}" aria-label="3DNA Home">
          <img src="${prefix}img/logo.png" alt="3DNA" class="footer-logo" />
        </a>
        <p class="footer-tagline">Visual Marketing &amp; Experiencias Inmersivas 3D</p>
      </div>

      <div class="footer-cols">

        <div class="footer-col">
          <h4>Servicios</h4>
          <ul>
            <li><a href="${homeHref}#sec2">Diseño 3D</a></li>
            <li><a href="${homeHref}#sec5">Webs y Landing Pages</a></li>
            <li><a href="${homeHref}#sec2">Embudos de venta</a></li>
            <li><a href="${homeHref}#sec2">IA aplicada</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="${prefix}oferta-publica.html">Oferta Pública</a></li>
            <li><a href="${prefix}politica-cookies.html">Política de Cookies</a></li>
            <li><a href="${prefix}aviso-legal.html">Aviso Legal</a></li>
            <li><a href="${prefix}politica-privacidad.html">Política de Privacidad</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Contacto</h4>
          <ul>
            <li><a href="mailto:andrei@3dna.es?subject=Consulta%20desde%203dna.es&body=Hola%2C%20me%20interesa%20saber%20m%C3%A1s%20sobre%20vuestros%20servicios.">Email: andrei@3dna.es</a></li>
            <li><a href="${window.whatsappHref()}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="footer">WhatsApp</a></li>
            <li><span>Salobreña, Granada</span></li>
            <li><a href="https://www.3dna.es">www.3dna.es</a></li>
            <li class="footer-cta-row"><button type="button" class="open-panel footer-cta-btn">Solicitar propuesta</button></li>
          </ul>
        </div>

      </div>
    </div>

    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} 3DNA · Todos los derechos reservados</span>
      <span>Diseño &amp; Desarrollo: 3DNA Studio</span>
    </div>
  </div>
</footer>`;

  const mount = document.getElementById("site-footer");
  if (mount) mount.outerHTML = footerHtml;
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

const heroTitlePairs = [
  ["Marketing Digital", "Publicidad"],
  ["Diseno 3D para comercio", "Implementacion de AI "],
  ["Web de alto impacto", "Pagos y automatizacion"],
  ["Experiencias inmersivas", "Que venden mas"],
  ["Diseno comercial", "Orientado a conversion"]
];

let heroTitleIndex = 0;
const heroTitleLine1 = document.getElementById("hero-title-line-1");
const heroTitleLine2 = document.getElementById("hero-title-line-2");

if (heroTitleLine1 && heroTitleLine2) {
  setInterval(() => {
    heroTitleLine1.classList.add("fade-out");
    heroTitleLine2.classList.add("fade-out");

    setTimeout(() => {
      heroTitleIndex = (heroTitleIndex + 1) % heroTitlePairs.length;
      heroTitleLine1.textContent = heroTitlePairs[heroTitleIndex][0];
      heroTitleLine2.textContent = heroTitlePairs[heroTitleIndex][1];
      heroTitleLine1.classList.remove("fade-out");
      heroTitleLine2.classList.remove("fade-out");
    }, 600);
  }, 3800);
}


// =============================================
// 2.5 GLOBAL SCROLL LOCK (mobile-safe)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  let lockY = 0;

  const lock = () => {
    if (body.dataset.scrollLocked === '1') return;
    lockY = window.scrollY || window.pageYOffset || 0;
    body.dataset.scrollLocked = '1';
    body.style.position = 'fixed';
    body.style.top = `-${lockY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  };

  const unlock = () => {
    if (body.dataset.scrollLocked !== '1') return;
    body.dataset.scrollLocked = '0';
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    window.scrollTo(0, lockY);
  };

  const syncLockState = () => {
    if (body.classList.contains('modal-open')) {
      lock();
      return;
    }
    unlock();
  };

  syncLockState();

  const classObserver = new MutationObserver(syncLockState);
  classObserver.observe(body, { attributes: true, attributeFilter: ['class'] });
});

const onFormPanelLifecycle = (handler) => {
  document.addEventListener('DOMContentLoaded', handler);
  document.addEventListener('form-panel:ready', handler);

  if (window.__formPanelLoaded && document.readyState !== 'loading') {
    handler();
  }
};


// =============================================
// 3. SIDE PANEL (open/close)
// =============================================
onFormPanelLifecycle(() => {
  const panel = document.getElementById('side-panel');
  const closeBtn = document.getElementById('close-panel');
  const backdrop = document.getElementById('panel-backdrop');

  if (!panel || !closeBtn || !backdrop) return;
  if (panel.dataset.panelInit === '1') return;
  panel.dataset.panelInit = '1';

  const bindTap = (el, handler) => {
    if (!el) return;
    let touchTriggered = false;

    el.addEventListener('touchend', (e) => {
      touchTriggered = true;
      e.preventDefault();
      handler(e);
    }, { passive: false });

    el.addEventListener('click', (e) => {
      if (touchTriggered) {
        touchTriggered = false;
        return;
      }
      handler(e);
    });
  };

  const openPanel = (e) => {
    const trigger = e && e.currentTarget;
    if (
      trigger &&
      trigger.classList &&
      trigger.classList.contains('quad-tile--cta') &&
      window.matchMedia('(max-width: 767px)').matches
    ) {
      return;
    }

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    lastTrigger = trigger || document.activeElement;
    panel.classList.add('open');
    backdrop.classList.add('visible');
    document.body.classList.add('panel-open');
    document.body.classList.add('modal-open');
    // keyboard users land in the first field (after the slide-in)
    setTimeout(() => {
      const first = panel.querySelector('[data-sp-form-state]:not([hidden]) input:not([tabindex="-1"]), [data-sp-done]:not([hidden])');
      first?.focus({ preventScroll: true });
    }, 320);
  };
  let lastTrigger = null;

  document.querySelectorAll('.open-panel').forEach(btn => {
    bindTap(btn, openPanel);
  });

  function closePanel() {
    if (!panel.classList.contains('open')) return;
    panel.classList.remove('open');
    backdrop.classList.remove('visible');
    document.body.classList.remove('panel-open');
    document.body.classList.remove('modal-open');
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });

  bindTap(closeBtn, closePanel);
  bindTap(backdrop, (e) => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    closePanel();
  });

  backdrop.addEventListener('touchmove', (e) => {
    if (document.body.classList.contains('panel-open')) {
      e.preventDefault();
    }
  }, { passive: false });
});


// =============================================
// 4. COOKIES BANNER
// =============================================
const COOKIE_CONSENT_KEY = 'cookiesDecision';
const COOKIE_CONSENT_VERSION = '2026-05-01';

function readCookieConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function writeCookieConsent(decision) {
  const payload = {
    necessary: true,
    analytics: !!decision.analytics,
    ads: !!decision.ads,
    source: decision.source || 'banner',
    version: COOKIE_CONSENT_VERSION,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
  document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=31536000; SameSite=Lax`;
  document.dispatchEvent(new CustomEvent('cookie:consent-changed', { detail: payload }));
  return payload;
}

function hasAnalyticsConsent() {
  const consent = readCookieConsent();
  return !!(consent && consent.analytics === true);
}

document.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById('cookie-banner');
  const modal = document.getElementById('cookie-modal');
  const overlay = document.getElementById('cookie-overlay');

  const accept = document.getElementById('accept-cookies');
  const config = document.getElementById('config-cookies');
  const reject = document.getElementById('reject-cookies');

  const save = document.getElementById('save-settings');
  const cancel = document.getElementById('cancel-settings');

  if (!banner || !modal || !overlay || !accept || !config || !reject || !save || !cancel) {
    return;
  }

  const showBanner = () => {
    banner.classList.remove('cookie-banner--hidden');
    requestAnimationFrame(() => {
      banner.classList.add('show');
      banner.setAttribute('aria-hidden', 'false');
    });
  };

  const hideBanner = () => {
    banner.classList.remove('show');
    banner.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      if (!banner.classList.contains('show')) {
        banner.classList.add('cookie-banner--hidden');
      }
    }, 420);
  };

  if (!readCookieConsent()) {
    showBanner();
  } else {
    hideBanner();
  }

  accept.onclick = () => {
    writeCookieConsent({ analytics: true, ads: true, source: 'accept' });
    loadGoogleAnalytics();
    hideBanner();
  };

  reject.onclick = () => {
    writeCookieConsent({ analytics: false, ads: false, source: 'reject' });
    hideBanner();
  };

  config.onclick = () => {
    const consent = readCookieConsent();
    const analyticsCheckbox = document.getElementById('analytics-cookies');
    const adsCheckbox = document.getElementById('ads-cookies');
    if (analyticsCheckbox && consent) analyticsCheckbox.checked = !!consent.analytics;
    if (adsCheckbox && consent) adsCheckbox.checked = !!consent.ads;

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

    writeCookieConsent({ analytics, ads, source: 'config' });
    if (analytics) {
      loadGoogleAnalytics();
    }

    modal.classList.remove('show');
    overlay.classList.remove('show');
    hideBanner();
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

document.querySelectorAll('.open-privacy-policy').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('privacy-policy-modal').style.display = 'flex';
  });
});

document.getElementById('close-privacy-modal')?.addEventListener('click', () => {
  document.getElementById('privacy-policy-modal').style.display = 'none';
});

document.getElementById('privacy-policy-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('privacy-policy-modal')) {
    document.getElementById('privacy-policy-modal').style.display = 'none';
  }
});


// =============================================
// 6. GOOGLE ANALYTICS (after consent)
// =============================================
function loadGoogleAnalytics() {
  if (window.__gaLoaded) return;
  window.__gaLoaded = true;

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
  if (hasAnalyticsConsent()) {
    loadGoogleAnalytics();
  }
});


// =============================================
// 7. OFERTA MODAL
// =============================================
onFormPanelLifecycle(() => {
  const ofertaLinks = document.querySelectorAll('.open-oferta');
  const modalOferta = document.getElementById('modal-oferta');
  const closeOferta = document.getElementById('close-oferta');
  const panel = document.getElementById('side-panel');
  const panelBackdrop = document.getElementById('panel-backdrop');
  const cookieModal = document.getElementById('cookie-modal');
  const cookieOverlay = document.getElementById('cookie-overlay');
  let blockBackdropClose = false;

  if (!modalOferta) return;
  if (modalOferta.dataset.ofertaInit === '1') return;
  modalOferta.dataset.ofertaInit = '1';

  // Keep oferta modal outside side-panel DOM to avoid nested modal stacking bugs on iOS.
  if (modalOferta.parentElement !== document.body) {
    document.body.appendChild(modalOferta);
  }

  const openOferta = () => {
    // Force-reset other full-screen layers so oferta cannot inherit stale blockers.
    panel?.classList.remove('open');
    panelBackdrop?.classList.remove('visible');
    cookieModal?.classList.remove('show');
    cookieOverlay?.classList.remove('show');
    document.body.classList.remove('panel-open');
    document.body.classList.remove('mobile-open');

    modalOferta.classList.add('is-open');
    modalOferta.style.display = '';
    document.body.classList.add('modal-open');

    blockBackdropClose = true;
    window.setTimeout(() => {
      blockBackdropClose = false;
    }, 220);
  };

  const hideOferta = () => {
    modalOferta.classList.remove('is-open');
    modalOferta.style.display = 'none';

    // Keep lock only if another layer is actually open.
    const hasActiveLayer = Boolean(
      panel?.classList.contains('open') ||
      cookieModal?.classList.contains('show') ||
      document.body.classList.contains('mobile-open')
    );

    if (!hasActiveLayer) {
      document.body.classList.remove('modal-open');
    }
  };

  ofertaLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOferta();
    });
  });

  closeOferta?.addEventListener('click', () => {
    hideOferta();
  });

  modalOferta?.addEventListener('click', (e) => {
    if (blockBackdropClose) return;
    if (e.target === modalOferta) {
      hideOferta();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOferta.classList.contains('is-open')) {
      hideOferta();
    }
  });
});


// =============================================
// 8. PROJECT FORM (name · contact · message)
// =============================================
// Strings come from the localized partial (data-msg-* on the form), so this
// code has no hard-coded copy. Posts to the existing /api/lead endpoint.
onFormPanelLifecycle(() => {
  const form = document.querySelector('[data-sp-form]');
  if (!form || form.dataset.spInit === '1') return;
  form.dataset.spInit = '1';

  const API_BASE_URL = 'https://threedna-site.onrender.com';
  const formState = document.querySelector('[data-sp-form-state]');
  const doneState = document.querySelector('[data-sp-done]');
  const errorEl = form.querySelector('[data-sp-error]');
  const submitBtn = form.querySelector('[data-sp-submit]');
  const submitLabel = form.querySelector('[data-sp-submit-label]');
  const fields = {
    nombre: form.elements.nombre,
    contacto: form.elements.contacto,
    mensaje: form.elements.mensaje
  };
  const msg = (key) => form.dataset[key] || '';
  let busy = false;

  // A contact is usable if it is an email, or a phone number with 7+ digits
  const contactKind = (value) => {
    const v = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'email';
    if ((v.replace(/\D/g, '').length >= 7) && /^[+\d\s().-]+$/.test(v)) return 'phone';
    return null;
  };

  const showError = (text, field) => {
    errorEl.textContent = text;
    errorEl.hidden = !text;
    Object.values(fields).forEach((f) => f.removeAttribute('aria-invalid'));
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  };

  Object.values(fields).forEach((f) => f.addEventListener('input', () => {
    f.removeAttribute('aria-invalid');
    if (!errorEl.hidden) { errorEl.hidden = true; }
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;

    const values = Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.value.trim()]));
    const empty = Object.keys(fields).find((k) => !values[k]);
    if (empty) return showError(msg('msgRequired'), fields[empty]);
    const kind = contactKind(values.contacto);
    if (!kind) return showError(msg('msgContact'), fields.contacto);
    showError('');

    busy = true;
    submitBtn.disabled = true;
    const label = submitLabel.textContent;
    submitLabel.textContent = msg('msgSending');

    const now = new Date();
    const payload = {
      nombre: values.nombre,
      contacto: values.contacto,
      email: kind === 'email' ? values.contacto : '',
      whatsapp: kind === 'phone' ? values.contacto : '',
      mensaje: values.mensaje,
      idioma: document.documentElement.lang || 'es',
      pagina: window.location.pathname,
      company_website: form.elements.company_website.value,
      fecha_envio_iso: now.toISOString(),
      fecha_envio_local: now.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium', hour12: false, timeZone: 'Europe/Madrid' }),
      version_formulario: '3dna-contact-v2026.10'
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      formState.hidden = true;
      doneState.hidden = false;
      doneState.focus();
      if (window.track) window.track('project_form_submitted', { language: payload.idioma });
    } catch (error) {
      console.error('Project form failed:', error);
      showError(msg('msgSend'));
    } finally {
      busy = false;
      submitBtn.disabled = false;
      submitLabel.textContent = label;
    }
  });
});


// =============================================
// 11. MOBILE MENU (burger)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileClose = document.getElementById("mobileClose");
  const mobileBackdrop = document.getElementById("mobileBackdrop");

  const isOpen = () => document.body.classList.contains("mobile-open");
  const focusables = () => [...(mobileMenu?.querySelectorAll("a[href], button:not([disabled])") || [])];

  // Closed menu is inert: its links are not reachable by Tab or screen readers
  if (mobileMenu && "inert" in mobileMenu) mobileMenu.inert = true;

  function openMobileMenu() {
    document.body.classList.add("mobile-open");
    burger?.setAttribute("aria-expanded", "true");
    mobileMenu?.setAttribute("aria-hidden", "false");
    if (mobileMenu && "inert" in mobileMenu) mobileMenu.inert = false;
    setTimeout(() => mobileClose?.focus(), 0);
  }

  function closeMobileMenu({ restoreFocus = true } = {}) {
    if (!isOpen()) return;
    document.body.classList.remove("mobile-open");
    burger?.setAttribute("aria-expanded", "false");
    mobileMenu?.setAttribute("aria-hidden", "true");
    if (mobileMenu && "inert" in mobileMenu) mobileMenu.inert = true;
    if (restoreFocus) burger?.focus();
  }

  burger?.addEventListener("click", openMobileMenu);
  mobileClose?.addEventListener("click", () => closeMobileMenu());
  mobileBackdrop?.addEventListener("click", () => closeMobileMenu());

  // Following a link closes the menu without pulling focus back to the burger
  document.querySelectorAll(".m-link").forEach(a => {
    a.addEventListener("click", () => closeMobileMenu({ restoreFocus: false }));
  });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") { closeMobileMenu(); return; }
    // keep Tab inside the open panel
    if (e.key === "Tab") {
      const items = focusables(); if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
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
  const isMobile = window.matchMedia('(max-width: 767px)').matches;

  function enable(video){
    video.classList.add('video-hover-active');
    if (!video.closest('.about-media')) video.play().catch(()=>{});
  }

  // Play only while on screen, so below-the-fold videos don't download during page load
  function playWhenVisible(video){
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) { video.play().catch(()=>{}); return; }
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(()=>{});
      else video.pause();
    }, { rootMargin: '200px 0px' }).observe(video);
  }

  function disable(video){
    video.classList.remove('video-hover-active');
    if (!video.closest('.about-media')) {
      video.pause();
      try { video.currentTime = 0; } catch(e){}
    }
  }

  videos.forEach(video => {
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('loop', '');

    if (isMobile) {
      // On mobile, videos loop without requiring touch (only while on screen).
      playWhenVisible(video);
      return;
    }

    if (video.closest('.about-media')) {
      playWhenVisible(video);
    } else {
      disable(video);
    }

    const parent = video.parentElement;
    if (!parent) return;

    parent.addEventListener('mouseenter', () => enable(video));
    parent.addEventListener('mouseleave', () => disable(video));
  });
});


// =============================================
// 13. PANNELLUM PANORAMA VIEWER
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const panoEl = document.getElementById("pano-right");
  if (!panoEl || typeof pannellum === "undefined") {
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
      s1: { type: "equirectangular", panorama: "/img/pano4.jpg", autoRotate: -8 },
      s2: { type: "equirectangular", panorama: "/img/pano3.jpg", autoRotate: -8 },
      s3: { type: "equirectangular", panorama: "/img/pano1.jpg", autoRotate: -8 },
      s4: { type: "equirectangular", panorama: "/img/pano2.jpg", autoRotate: -8 }
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
// 15A. IOS INTERACTION LAYER SANITIZER
// =============================================
onFormPanelLifecycle(() => {
  const panel = document.getElementById("side-panel");
  if (!panel) return;
  if (document.body.dataset.layerSanitizerInit === '1') return;
  document.body.dataset.layerSanitizerInit = '1';

  const panelBackdrop = document.getElementById("panel-backdrop");
  const cookieModal = document.getElementById("cookie-modal");
  const cookieOverlay = document.getElementById("cookie-overlay");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileBackdrop = document.getElementById("mobileBackdrop");
  const ofertaModal = document.getElementById("modal-oferta");

  const sanitizeLayers = () => {
    if (panel && !panel.classList.contains("open")) {
      panelBackdrop?.classList.remove("visible");
      document.body.classList.remove("panel-open");
    }

    if (!cookieModal?.classList.contains("show")) {
      cookieOverlay?.classList.remove("show");
    }

    if (!document.body.classList.contains("mobile-open")) {
      mobileMenu?.setAttribute("aria-hidden", "true");
    }

    // Keep body lock only while at least one modal/menu is actually open.
    const hasActiveLayer = Boolean(
      panel?.classList.contains("open") ||
      cookieModal?.classList.contains("show") ||
      ofertaModal?.style.display === "flex" ||
      document.body.classList.contains("mobile-open")
    );

    if (!hasActiveLayer) {
      document.body.classList.remove("modal-open");
    }
  };

  sanitizeLayers();
  window.addEventListener("pageshow", sanitizeLayers);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sanitizeLayers();
  });
  window.addEventListener("focus", sanitizeLayers);
});


// =============================================
// 16. SHOWROOM DROPDOWN TOGGLE
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
// 16. REVIEWS MARQUEE (RAF auto-scroll + drag)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const marquee = document.querySelector("#reviews .reviews-marquee");
  const track = document.querySelector("#reviews .reviews-track");
  if (!marquee || !track) return;

  // Duplicate content for seamless infinite loop
  if (!track.dataset.looped) {
    track.innerHTML += track.innerHTML;
    track.dataset.looped = "1";
  }

  // Remove any CSS animation — JS controls position entirely
  track.style.animation = "none";

  const SPEED = 30; // px/s

  let offset = 0;       // current translateX (always negative or 0)
  let halfW = 0;
  let lastTs = null;

  // Drag state
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let direction = null; // 'h' | 'v' | null
  let dragDelta = 0;    // live horizontal delta during drag

  function tick(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    halfW = track.scrollWidth / 2;

    if (!isDragging) {
      offset -= SPEED * dt;
    }

    // Normalize: keep offset in [-halfW, 0)
    if (halfW > 0) {
      while (offset <= -halfW) offset += halfW;
      while (offset > 0)       offset -= halfW;
    }

    track.style.transform = `translateX(${offset + dragDelta}px)`;
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // ---- Drag ----
  marquee.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    direction = null;
    dragDelta = 0;
    marquee.setPointerCapture(e.pointerId);
  });

  marquee.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (direction === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      direction = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      if (direction === "v") { isDragging = false; return; }
    }

    if (direction !== "h") return;
    e.preventDefault();

    dragDelta = dx;
    marquee.classList.add("is-dragging");
  }, { passive: false });

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    direction = null;
    // Absorb drag into offset so animation continues from here
    offset += dragDelta;
    dragDelta = 0;
    marquee.classList.remove("is-dragging");
  }

  marquee.addEventListener("pointerup", endDrag);
  marquee.addEventListener("pointercancel", endDrag);
  marquee.addEventListener("lostpointercapture", endDrag);
  marquee.addEventListener("dragstart", (e) => e.preventDefault());
});

// =============================================
// SECTOR SECTIONS (.sector: 01 Restaurants, later 02–04; also .transform)
// =============================================
// - background video loads only near the viewport and pauses when away
// - reduced motion: no video (poster stays), no reveal animation
// - one "<sector>_section_viewed" analytics hook per page view (data-track-view)
(() => {
  const sections = document.querySelectorAll(".sector, .transform");
  if (!sections.length) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;

  const startVideo = (video) => {
    if (!video.getAttribute("src")) {
      video.muted = true;
      video.src = video.dataset.src;
    }
    video.play().catch(() => {});
  };

  sections.forEach((section) => {
    const video = section.querySelector("video[data-src]");
    if (video) video.addEventListener("error", () => video.remove(), true);

    if (!hasIO) {
      section.classList.add("is-inview");
      if (video && !reduceMotion) startVideo(video);
      return;
    }

    if (video && !reduceMotion) {
      // Wait for the page (hero video included) to finish loading first
      const watch = () => new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) startVideo(video);
        else if (video.getAttribute("src")) video.pause();
      }, { rootMargin: "200px 0px" }).observe(video);
      if (document.readyState === "complete") watch();
      else window.addEventListener("load", watch, { once: true });
    }

    if (!reduceMotion) section.classList.add("reveal-pending");
    const viewEvent = section.dataset.trackView;
    new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      section.classList.add("is-inview");
      if (viewEvent && window.track) window.track(viewEvent, { language: document.documentElement.lang });
      observer.disconnect();
    }, { threshold: 0.3 }).observe(section);
  });
})();
