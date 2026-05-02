// =============================================
// 1. HEADER INJECTION (runs immediately)
// =============================================
(() => {
  const pathname = window.location.pathname;
  const isHomePage = pathname === "/" || pathname.endsWith("/index.html");
  const isNestedDetailPage = /\/(?:healthcare|packages)\/[^/]+\.html$/i.test(window.location.pathname);
  const pagePrefix = isNestedDetailPage ? "../" : (isHomePage ? "" : "/");

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

<div class="mobile-menu" id="mobileMenu" aria-hidden="true">
  <div class="mobile-menu-inner">
    <div class="mobile-menu-head">
      <div class="mobile-menu-title">MENU</div>
      <button class="mobile-close" id="mobileClose" type="button" aria-label="Close menu">\u00d7</button>
    </div>

    <a href="${homeLink("#hero")}" class="m-link">Inicio</a>
    <a href="${homeLink("#about")}" class="m-link">Sobre nosotros</a>
    <a href="${homeLink("#sec2")}" class="m-link">Servicios</a>
    <a href="${homeLink("#sec3")}" class="m-link">Showroom</a>
    <a href="${homeLink("#contacto")}" class="m-link">Contacto</a>

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
// 1b. FOOTER INJECTION
// =============================================
(() => {
  const pathname = window.location.pathname;
  const isHomePage = pathname === "/" || pathname.endsWith("/index.html");
  const isNestedDetailPage = /\/(?:healthcare|packages)\/[^/]+\.html$/i.test(pathname);
  const prefix = isNestedDetailPage ? "../" : (isHomePage ? "" : "/");

  const footerHtml = `
<footer class="site-footer" id="site-footer-el">
  <div class="footer-inner">
    <div class="footer-top">

      <div class="footer-brand">
        <a href="${prefix}index.html" aria-label="3DNA Home">
          <img src="${prefix}img/logo.png" alt="3DNA" class="footer-logo" />
        </a>
        <p class="footer-tagline">Visual Marketing &amp; Experiencias Inmersivas 3D</p>
      </div>

      <div class="footer-cols">

        <div class="footer-col">
          <h4>Servicios</h4>
          <ul>
            <li><a href="${prefix}index.html#sec2">Diseño 3D</a></li>
            <li><a href="${prefix}index.html#sec5">Webs y Landing Pages</a></li>
            <li><a href="${prefix}index.html#sec2">Embudos de venta</a></li>
            <li><a href="${prefix}index.html#sec2">IA aplicada</a></li>
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
            <li><a href="https://wa.me/34722878642?text=Hola%2C%20me%20interesa%20saber%20m%C3%A1s%20sobre%20vuestros%20servicios." target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
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
    panel.classList.add('open');
    backdrop.classList.add('visible');
    document.body.classList.add('panel-open');
    document.body.classList.add('modal-open');
  };

  document.querySelectorAll('.open-panel').forEach(btn => {
    bindTap(btn, openPanel);
  });

  function closePanel() {
    panel.classList.remove('open');
    backdrop.classList.remove('visible');
    document.body.classList.remove('panel-open');
    document.body.classList.remove('modal-open');
  }

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
// 8. FORM PROGRESS BAR
// =============================================
function updateStepProgress() {
  const allSections = document.querySelectorAll('.form-section');
  const progressSections = document.querySelectorAll('.form-section:not([data-optional="true"])');
  let completed = 0;

  allSections.forEach(section => {
    const checkboxGroupName = section.dataset.checkboxGroup;
    const requiredFields = section.querySelectorAll('.form-select[required], .form-input[required], .form-textarea[required]');
    const controls = section.querySelectorAll('.form-select, .form-input, .form-textarea');
    const checkboxFields = checkboxGroupName
      ? section.querySelectorAll(`.form-check-input[name="${checkboxGroupName}"]`)
      : [];

    controls.forEach((field) => {
      const isFilled = String(field.value || '').trim() !== '';
      field.classList.toggle('is-filled', isFilled);
    });

    checkboxFields.forEach((field) => {
      const option = field.closest('.form-check-option');
      option?.classList.toggle('is-filled', field.checked);
    });

    const isCheckboxGroupComplete = checkboxFields.length > 0
      ? Array.from(checkboxFields).some((field) => field.checked)
      : false;

    const isSectionComplete = checkboxFields.length > 0
      ? isCheckboxGroupComplete
      : requiredFields.length > 0
        ? Array.from(requiredFields).every((field) => String(field.value || '').trim() !== '')
        : Array.from(controls).some((field) => String(field.value || '').trim() !== '');

    section.classList.toggle('is-complete', isSectionComplete);
  });

  progressSections.forEach(section => {
    if (section.classList.contains('is-complete')) completed++;
  });

  const percent = progressSections.length > 0
    ? Math.round((completed / progressSections.length) * 100)
    : 0;
  const bar = document.getElementById('progress-bar');
  const txt = document.getElementById('progress-text');
  if (bar) bar.style.width = `${percent}%`;
  if (txt) txt.textContent = `${percent}% completado`;
}

onFormPanelLifecycle(() => {
  if (document.body.dataset.formProgressInit === '1') return;
  if (!document.querySelector('.form-section')) return;
  document.body.dataset.formProgressInit = '1';

  updateStepProgress();

  document.querySelectorAll('.form-section .form-select, .form-section .form-input, .form-section .form-textarea, .form-section .form-check-input').forEach(field => {
    field.addEventListener('change', updateStepProgress);
    field.addEventListener('input', updateStepProgress);
  });
});


// =============================================
// 9. FORM SUBMIT VALIDATION
// =============================================
onFormPanelLifecycle(() => {
  const submitBtn = document.querySelector('.form-submit');
  const progressWrapper = document.querySelector('.progress-wrapper');
  const API_BASE_URL = 'https://threedna-site.onrender.com';
  const SUBMISSION_STATE_KEY = 'threeDNA_form_submission_state';
  const SUBMISSION_STATE_TTL_MS = 24 * 60 * 60 * 1000;
  if (!submitBtn) return;
  if (submitBtn.dataset.submitInit === '1') return;
  submitBtn.dataset.submitInit = '1';

  const showSubmittedState = () => {
    document.querySelectorAll('.form-section').forEach((section) => {
      section.hidden = true;
    });
    submitBtn.hidden = true;
    if (progressWrapper) progressWrapper.hidden = true;

    const formIntro = document.querySelector('.form-intro');
    if (formIntro) {
      formIntro.hidden = true;
    }

    const successState = document.getElementById('form-success-state');
    if (successState) {
      successState.hidden = false;
    }
  };

  const persistSubmissionState = () => {
    try {
      const state = { submittedAt: Date.now() };
      localStorage.setItem(SUBMISSION_STATE_KEY, JSON.stringify(state));
    } catch (_error) {
      // Ignore localStorage failures.
    }
  };

  const restoreSubmissionState = () => {
    try {
      const raw = localStorage.getItem(SUBMISSION_STATE_KEY);
      if (!raw) return;

      const state = JSON.parse(raw);
      const submittedAt = Number(state?.submittedAt || 0);
      const isFresh = Number.isFinite(submittedAt) && (Date.now() - submittedAt < SUBMISSION_STATE_TTL_MS);

      if (isFresh) {
        showSubmittedState();
        upsertMessage('Solicitud enviada correctamente. Te contactaremos muy pronto.', 'success');
      } else {
        localStorage.removeItem(SUBMISSION_STATE_KEY);
      }
    } catch (_error) {
      localStorage.removeItem(SUBMISSION_STATE_KEY);
    }
  };

  const formControls = Array.from(
    document.querySelectorAll('.form-section .form-select, .form-section .form-input, .form-section .form-textarea, .form-section .form-check-input')
  );

  const setFormBusy = (busy) => {
    formControls.forEach((field) => {
      if (busy) {
        field.dataset.prevDisabled = field.disabled ? '1' : '0';
        field.disabled = true;
        field.setAttribute('aria-disabled', 'true');
        return;
      }

      const wasDisabled = field.dataset.prevDisabled === '1';
      field.disabled = wasDisabled;
      field.removeAttribute('aria-disabled');
      delete field.dataset.prevDisabled;
    });

    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    submitBtn.textContent = busy ? 'Procesando...' : 'Analizar mi negocio';
  };

  const getRequiredFields = () => Array.from(
    document.querySelectorAll('.form-section:not([data-optional="true"]) .form-select[required], .form-section:not([data-optional="true"]) .form-input[required], .form-section:not([data-optional="true"]) .form-textarea[required]')
  );

  const clearErrors = () => {
    document.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
    document.querySelectorAll('.form-check-option.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
    document.querySelectorAll('.form-section.has-error').forEach((section) => section.classList.remove('has-error'));
  };

  const upsertMessage = (text, type, useHtml = false) => {
    let message = document.getElementById('form-status-message');
    if (!message) {
      message = document.createElement('p');
      message.id = 'form-status-message';
      message.className = 'form-status-message';
      if (progressWrapper) {
        progressWrapper.appendChild(message);
      } else {
        submitBtn.insertAdjacentElement('afterend', message);
      }
    }
    if (useHtml) {
      message.innerHTML = text;
    } else {
      message.textContent = text;
    }
    message.classList.remove('is-error', 'is-success');
    message.classList.add(type === 'success' ? 'is-success' : 'is-error');
  };

  const isValidEmail = (value) => {
    const email = String(value || '').trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const blockedDomains = new Set([
      'gmai.com',
      'ail.com',
      'gmil.com',
      'gnail.com',
      'hotnail.com',
      'outlok.com',
      'yaho.com'
    ]);
    if (!emailPattern.test(email)) return false;
    if (email.includes('xn--')) return false;
    const domain = email.split('@')[1] || '';
    if (blockedDomains.has(domain)) return false;
    return true;
  };

  const isValidPhone = (value) => {
    const cleaned = String(value || '').replace(/\s|-/g, '');
    const e164Pattern = /^\+[1-9]\d{7,14}$/;
    if (!e164Pattern.test(cleaned)) return false;
    // Keep worldwide numbers, but apply realistic length for Spain (+34 + 9 digits).
    if (cleaned.startsWith('+34')) {
      return /^\+34\d{9}$/.test(cleaned);
    }
    return true;
  };

  let isSubmitting = false;

  restoreSubmissionState();

  submitBtn.addEventListener('click', async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    setFormBusy(true);

    clearErrors();
    updateStepProgress();

    const requiredFields = getRequiredFields();
    const invalidFields = requiredFields.filter((field) => String(field.value || '').trim() === '');
    const invalidSections = [];

    document.querySelectorAll('.form-section[data-checkbox-group]').forEach((section) => {
      const groupName = section.dataset.checkboxGroup;
      const checkboxes = Array.from(section.querySelectorAll(`.form-check-input[name="${groupName}"]`));
      const hasChecked = checkboxes.some((field) => field.checked);

      if (!hasChecked) {
        invalidSections.push(section);
        checkboxes.forEach((field) => field.closest('.form-check-option')?.classList.add('is-invalid'));
      }
    });

    if (invalidFields.length > 0 || invalidSections.length > 0) {
      invalidFields.forEach((field) => {
        field.classList.add('is-invalid');
        const section = field.closest('.form-section');
        if (section) section.classList.add('has-error');
      });

      invalidSections.forEach((section) => section.classList.add('has-error'));

      const firstInvalidField = invalidFields[0];
      const firstInvalidSection = invalidSections[0];

      if (firstInvalidField) {
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidField.focus({ preventScroll: true });
      } else if (firstInvalidSection) {
        firstInvalidSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      upsertMessage('Completa todos los campos obligatorios para continuar.', 'error');
      isSubmitting = false;
      setFormBusy(false);
      return;
    }

    const payload = {};
    document.querySelectorAll('.form-select, .form-input, .form-textarea').forEach((field) => {
      const key = field.name || field.id;
      if (!key) return;
      payload[key] = String(field.value || '').trim();
    });

    const emailInput = document.querySelector('.form-input[name="email"]');
    const phoneInput = document.querySelector('.form-input[name="whatsapp"]');
    const invalidContactFields = [];

    const emailFailsNativeValidation = emailInput
      ? (typeof emailInput.checkValidity === 'function' && !emailInput.checkValidity())
      : false;

    if (emailFailsNativeValidation || !isValidEmail(payload.email)) {
      if (emailInput) {
        emailInput.classList.add('is-invalid');
        emailInput.closest('.form-section')?.classList.add('has-error');
        if (emailFailsNativeValidation && typeof emailInput.reportValidity === 'function') {
          emailInput.reportValidity();
        }
      }
      invalidContactFields.push(emailInput);
    }

    if (!isValidPhone(payload.whatsapp)) {
      if (phoneInput) {
        phoneInput.classList.add('is-invalid');
        phoneInput.closest('.form-section')?.classList.add('has-error');
      }
      invalidContactFields.push(phoneInput);
    }

    if (invalidContactFields.length > 0) {
      const firstInvalid = invalidContactFields.find(Boolean);
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }

      upsertMessage('Revisa email y WhatsApp: introduce un correo real y un telefono valido.', 'error');
      isSubmitting = false;
      setFormBusy(false);
      return;
    }

    document.querySelectorAll('.form-check-input').forEach((field) => {
      if (!field.name) return;
      if (!payload[field.name]) payload[field.name] = [];
      if (field.checked) payload[field.name].push(field.value);
    });

    const now = new Date();
    const formVersion = '3dna-form-v2026.04.29';
    const fechaLocal = now.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: false,
      timeZone: 'Europe/Madrid'
    });
    const fechaISO = now.toISOString();

    let clientIp = 'No disponible';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        if (ipData && ipData.ip) {
          clientIp = String(ipData.ip).trim();
        }
      }
    } catch (_error) {
      clientIp = 'No disponible';
    }

    const aceptoPrivacidad = Array.isArray(payload.consentimiento)
      && payload.consentimiento.includes('aceptado')
      ? 'Si'
      : 'No';

    payload.acepto_politica_privacidad = aceptoPrivacidad;
    payload.fecha_envio_local = fechaLocal;
    payload.fecha_envio_iso = fechaISO;
    payload.ip_cliente = clientIp;
    payload.version_formulario = formVersion;

    const submitLog = {
      ip: clientIp,
      timestamp: fechaISO,
      formVersion: formVersion
    };

    try {
      const storageKey = 'threeDNA_submission_logs';
      const prevLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const nextLogs = Array.isArray(prevLogs) ? prevLogs : [];
      nextLogs.push(submitLog);
      localStorage.setItem(storageKey, JSON.stringify(nextLogs.slice(-50)));
    } catch (_error) {
      // Ignore storage failures (private mode/quota), log still continues in email payload.
    }

    console.log('Formulario completo. Payload listo para enviar:', payload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payload, submitLog })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar la solicitud.');
      }

      persistSubmissionState();
      showSubmittedState();

      const successState = document.getElementById('form-success-state');
      successState?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      upsertMessage('Solicitud enviada correctamente. Te contactaremos muy pronto.', 'success');
    } catch (error) {
      console.error('Error enviando formulario:', error);
      upsertMessage(
        'No pudimos procesar tu solicitud en este momento.<br><br>'
          + '<a href="mailto:andrei@3dna.es">📩 Enviar email</a><br>'
          + '<a href="https://wa.me/34722878642" target="_blank" rel="noopener noreferrer">💬 Escribir por WhatsApp</a>',
        'error',
        true
      );
    } finally {
      isSubmitting = false;
      setFormBusy(false);
    }
  });
});


// =============================================
// 10. OTRO CHECKBOX TOGGLE
// =============================================
onFormPanelLifecycle(() => {
  const negocioSelect = document.getElementById('negocio-select');
  const otroInputWrapper = document.getElementById('otroInputWrapper');

  if (negocioSelect && otroInputWrapper) {
    if (negocioSelect.dataset.otroInit === '1') return;
    negocioSelect.dataset.otroInit = '1';

    const toggleOtroInput = () => {
      const isOtro = negocioSelect.value === 'otro';
      otroInputWrapper.style.display = isOtro ? 'block' : 'none';
    };

    negocioSelect.addEventListener('change', toggleOtroInput);
    toggleOtroInput();
  }
});


// =============================================
// 11. MOBILE MENU (burger)
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
  const isMobile = window.matchMedia('(max-width: 767px)').matches;

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
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('loop', '');

    if (isMobile) {
      // On mobile, videos should start and keep looping without requiring touch.
      video.preload = 'auto';
      video.play().catch(()=>{});
      return;
    }

    if (video.closest('.about-media')) {
      video.play().catch(()=>{});
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
