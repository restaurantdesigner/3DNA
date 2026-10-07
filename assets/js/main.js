// =============================================
// 0a. WHATSAPP LINK (one number site-wide; message follows the page language)
// =============================================
// Locale home pages get the exact link from the build (window.I18N.whatsappHref,
// text from assets/i18n/translations.json); other pages read it from the shared
// header's WhatsApp link (same build, page language). Spanish as a last resort.
window.whatsappHref = () =>
  (window.I18N && window.I18N.whatsappHref) ||
  (document.querySelector(".mobile-menu .m-whatsapp") || {}).href ||
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
// 1. SHARED HEADER (behaviour only)
// =============================================
// Header and footer markup live in templates/layout/*.html and are written
// into every page by scripts/build-i18n.js. Here: solid vs. transparent mode
// and the language choice.
(() => {
  const topbar = document.getElementById("topbar");
  if (!topbar) return;
  const root = document.documentElement;
  root.classList.add("has-overlay-header");

  // Pages with a full-bleed video hero: transparent header over the hero that
  // turns solid once the hero has scrolled away. Every other page: solid.
  const hero = document.querySelector(".sector-hero");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      topbar.classList.toggle("is-solid", !entry.isIntersecting);
    }, { rootMargin: `-${topbar.offsetHeight || 72}px 0px 0px 0px` }).observe(hero);
  } else {
    topbar.classList.add("is-solid");
    root.classList.add("has-solid-header");
    // Pages that don't leave room for the fixed bar themselves get it here
    // (pages with a #hero get it from CSS; legal pages already pad their main).
    const main = document.getElementById("main");
    const first = main && main.firstElementChild;
    const barH = parseFloat(getComputedStyle(root).getPropertyValue("--layout-header-h")) || 68;
    if (first && first.id !== "hero" && first.getBoundingClientRect().top + window.scrollY < barH) {
      main.style.paddingTop = `${barH}px`;
    }
  }

  // A manual language choice is saved and always wins over detection. On the
  // localized home pages the equivalent place (#hash) is kept; other pages
  // exist in one language only, so they switch to that language's home.
  const isLocaleHome = /^\/(?:en|es|ru|uk)\/(?:index\.html)?$/.test(window.location.pathname);
  document.querySelectorAll(".lang-switch a[data-lang]").forEach((link) => {
    link.addEventListener("click", () => {
      const lang = link.dataset.lang;
      window.saveLanguageChoice(lang);
      if (window.track) window.track("language_selected", { language: lang });
      if (isLocaleHome && window.location.hash) link.setAttribute("href", `/${lang}/${window.location.hash}`);
    });
  });
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
// 4. COOKIE CONSENT (shared banner + preferences; markup in templates/layout/footer.html)
// =============================================
// Categories that exist on this site: Essential (always on) and Analytics
// (Google Analytics 4, loaded only after consent). There are no marketing
// trackers, so "marketing" is stored as false and has no switch.
// Bump CONSENT_VERSION when the categories change materially: every visitor
// is then asked again.
const CONSENT_KEY = "3dna_cookie_consent";
const CONSENT_VERSION = 1;
const LEGACY_CONSENT_KEY = "cookiesDecision"; // previous banner (2026-05)

function readCookieConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && c.version === CONSENT_VERSION) return c;
      return null; // older structure: ask again
    }
    // carry over a choice made with the previous banner (same categories)
    const legacy = JSON.parse(localStorage.getItem(LEGACY_CONSENT_KEY) || "null");
    if (legacy && typeof legacy === "object") {
      const c = writeCookieConsent({ analytics: !!legacy.analytics }, "migrated");
      localStorage.removeItem(LEGACY_CONSENT_KEY);
      document.cookie = "cookie_consent=; path=/; max-age=0; SameSite=Lax";
      return c;
    }
  } catch (_e) { /* storage blocked: treat as no decision */ }
  return null;
}

function writeCookieConsent({ analytics }, source) {
  const payload = {
    version: CONSENT_VERSION,
    essential: true,
    analytics: !!analytics,
    marketing: false,
    timestamp: new Date().toISOString(),
    source
  };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(payload)); } catch (_e) {}
  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=31536000; SameSite=Lax`;
  document.dispatchEvent(new CustomEvent("cookie:consent-changed", { detail: payload }));
  return payload;
}

// Withdrawn consent: stop GA on this page and remove its cookies (_ga, _ga_*)
function stopGoogleAnalytics() {
  window["ga-disable-G-QGGREKNJDX"] = true;
  const host = window.location.hostname;
  const domains = ["", host, "." + host, "." + host.split(".").slice(-2).join(".")];
  document.cookie.split(";").map((c) => c.trim().split("=")[0]).filter((n) => /^_ga(_|$)/.test(n)).forEach((name) => {
    domains.forEach((d) => { document.cookie = `${name}=; path=/; max-age=0${d ? `; domain=${d}` : ""}`; });
  });
}

function hasAnalyticsConsent() {
  const c = readCookieConsent();
  return !!(c && c.analytics === true);
}

document.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("cookie-consent");
  const prefs = document.getElementById("cookie-prefs");
  if (!banner || !prefs) return;
  const toggle = prefs.querySelector('[data-consent-toggle="analytics"]');
  let lastFocus = null;

  const showBanner = () => { banner.hidden = false; requestAnimationFrame(() => banner.classList.add("is-visible")); };
  const hideBanner = () => {
    banner.classList.remove("is-visible");
    window.setTimeout(() => { if (!banner.classList.contains("is-visible")) banner.hidden = true; }, 320);
  };
  const setToggle = (on) => toggle && toggle.setAttribute("aria-checked", String(!!on));

  function openPrefs() {
    const c = readCookieConsent();
    setToggle(c ? c.analytics : false); // nothing optional is pre-ticked
    lastFocus = document.activeElement;
    prefs.hidden = false;
    document.body.classList.add("cookie-prefs-open");
    requestAnimationFrame(() => {
      prefs.classList.add("is-open");
      prefs.querySelector(".cprefs__close")?.focus();
    });
  }
  function closePrefs() {
    prefs.classList.remove("is-open");
    document.body.classList.remove("cookie-prefs-open");
    prefs.hidden = true;
    // no decision yet: back to the banner (closing never accepts anything)
    if (!readCookieConsent()) showBanner();
    if (lastFocus && document.contains(lastFocus) && !lastFocus.closest("[hidden]")) lastFocus.focus();
    else banner.querySelector('[data-consent="choose"]')?.focus();
  }
  function decide(analytics, source) {
    writeCookieConsent({ analytics }, source);
    if (analytics) loadGoogleAnalytics();
    else stopGoogleAnalytics();
    if (!prefs.hidden) { prefs.classList.remove("is-open"); document.body.classList.remove("cookie-prefs-open"); prefs.hidden = true; }
    hideBanner();
    if (lastFocus && document.contains(lastFocus) && !lastFocus.closest("#cookie-consent")) lastFocus.focus();
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest("[data-consent], [data-cookie-settings], [data-consent-toggle]");
    if (!el) return;
    if (el.hasAttribute("data-cookie-settings")) { e.preventDefault(); hideBanner(); openPrefs(); return; }
    if (el.hasAttribute("data-consent-toggle")) { setToggle(el.getAttribute("aria-checked") !== "true"); return; }
    const action = el.dataset.consent;
    if (action === "accept") decide(true, "accept");
    else if (action === "reject") decide(false, "reject");
    else if (action === "choose") { banner.classList.remove("is-visible"); banner.hidden = true; openPrefs(); }
    else if (action === "save") decide(toggle && toggle.getAttribute("aria-checked") === "true", "preferences");
    else if (action === "close") closePrefs();
  });

  document.addEventListener("keydown", (e) => {
    if (prefs.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closePrefs(); return; }
    if (e.key === "Tab") { // keep Tab inside the open dialog
      const items = [...prefs.querySelectorAll("button, a[href]")].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  if (!readCookieConsent()) showBanner();
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
  window["ga-disable-G-QGGREKNJDX"] = false;
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
// - background video loads only near the viewport, plays only while visible,
//   pauses when it leaves (see "Video playback" below)
// - reduced motion: no video (poster stays), no reveal animation
// - one "<sector>_section_viewed" analytics hook per page view (data-track-view)
(() => {
  const sections = document.querySelectorAll(".sector, .transform, .fit247, .vbanner, .pcontent, .fsvideo, .rstory, .rwide");
  if (!sections.length) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;

  // ---- Video playback ----
  // iPad / iOS Safari pauses a muted video by itself whenever it is not
  // visible, and never resumes one that was started with play(). Calling
  // play() early (while the video is still below the fold, or faded out by
  // the reveal) therefore left every video after the first one stuck.
  // So loading and playing are separate steps:
  //   near the viewport  -> attach the source (preload metadata), load()
  //   actually visible   -> play(), retried when data arrives or when the
  //                         browser pauses it while it is still on screen
  //   out of view        -> pause()
  // Only visible videos play; the poster stays until the first frame shows.
  const visible = new Set();
  const attach = (video) => {
    if (video.getAttribute("src") || !video.dataset.src) return;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.preload = "metadata";
    video.src = video.dataset.src;
    video.load();
  };
  const tries = new WeakMap();
  const play = (video) => {
    if (!visible.has(video)) return;
    attach(video);
    if (!video.paused && !video.ended) return;
    const p = video.play();
    if (p && p.catch) p.catch(() => retry(video)); // not ready yet / interrupted / blocked
  };
  // a few retries per visit (reset each time the video comes into view), never a loop
  const retry = (video) => {
    const n = (tries.get(video) || 0) + 1;
    tries.set(video, n);
    if (n <= 4) window.setTimeout(() => play(video), 350 * n);
  };
  const near = hasIO && !reduceMotion ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) attach(entry.target); });
  }, { rootMargin: "400px 0px" }) : null;
  const seen = hasIO && !reduceMotion ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.2) { visible.add(video); tries.set(video, 0); play(video); }
      else if (!entry.isIntersecting || entry.intersectionRatio < 0.05) { visible.delete(video); if (!video.paused) video.pause(); }
    });
  }, { threshold: [0, 0.05, 0.2, 0.5] }) : null;
  const watchVideo = (video) => {
    video.addEventListener("canplay", () => play(video));
    video.addEventListener("loadeddata", () => play(video));
    // the browser paused it (power saving, visibility policy) while it is still on screen
    video.addEventListener("pause", () => { if (visible.has(video) && !document.hidden) retry(video); });
    // started by the autoplay attribute while off screen: stop it
    video.addEventListener("play", () => { if (!visible.has(video)) video.pause(); });
    near.observe(video);
    seen.observe(video);
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) visible.forEach(play); });
  window.addEventListener("pageshow", (e) => { if (e.persisted) visible.forEach(play); }); // back/forward cache

  sections.forEach((section) => {
    // every lazy video in the section (some sections have more than one)
    const videos = [...section.querySelectorAll("video[data-src]")];
    // a source that cannot be decoded: keep the poster if there is one, else drop the element
    videos.forEach((video) => video.addEventListener("error", () => { if (!video.getAttribute("poster")) video.remove(); }, true));

    if (!hasIO) {
      section.classList.add("is-inview");
      if (!reduceMotion) videos.forEach((v) => { visible.add(v); attach(v); play(v); });
      return;
    }

    if (videos.length && !reduceMotion) {
      // Wait for the page (hero video included) to finish loading first
      const start = () => videos.forEach(watchVideo);
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
    }

    if (!reduceMotion) section.classList.add("reveal-pending");
    const viewEvent = section.dataset.trackView;
    new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      section.classList.add("is-inview");
      if (viewEvent && window.track) window.track(viewEvent, { language: document.documentElement.lang });
      observer.disconnect();
    // top edge well inside the viewport (a ratio threshold never fires for very tall sections)
    }, { rootMargin: "0px 0px -18% 0px" }).observe(section);
  });
})();

// =============================================
// GLOBAL WHATSAPP QUICK-CONTACT (all pages, all devices)
// =============================================
// Fixed bottom-right pill. Same localized link as the rest of the site
// (window.whatsappHref). Hidden while the project panel, a modal or the mobile
// menu is open; fades while the footer (which has its own WhatsApp link) or the
// cookie banner is on screen; moves up when the floating chat avatar is present.
(function () {
  if (document.querySelector(".wa-float")) return;
  const labels = {
    en: "Chat with 3DNA on WhatsApp (opens in a new tab)",
    es: "Escribir a 3DNA por WhatsApp (se abre en una pestaña nueva)",
    ru: "Написать 3DNA в WhatsApp (откроется в новой вкладке)",
    uk: "Написати 3DNA у WhatsApp (відкриється в новій вкладці)"
  };
  const lang = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();

  const a = document.createElement("a");
  a.className = "wa-float";
  a.href = window.whatsappHref();
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("aria-label", labels[lang] || labels.es);
  a.dataset.track = "whatsapp_clicked";
  a.dataset.trackLocation = "floating";
  a.innerHTML =
    '<svg class="wa-float__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.24 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29Z"/></svg>' +
    '<span class="wa-float__label">WhatsApp</span>';
  document.body.appendChild(a);

  const root = document.body;
  let footerVisible = false;
  function sync() {
    const blocked = root.classList.contains("panel-open") ||
                    root.classList.contains("modal-open") ||
                    root.classList.contains("mobile-open");
    const banner = document.querySelector("#cookie-consent.is-visible");
    const chat = document.querySelector("button.pxe-fixed, button.ai-launch");
    a.classList.toggle("is-hidden", blocked);
    a.classList.toggle("is-muted", !blocked && (footerVisible || !!banner));
    a.classList.toggle("is-stacked", !!(chat && chat.getBoundingClientRect().width));
    if (blocked) a.setAttribute("tabindex", "-1"); else a.removeAttribute("tabindex");
  }
  let queued = false;
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; sync(); }); } };
  new MutationObserver(queue).observe(root, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });

  const closers = [document.getElementById("site-footer") || document.querySelector("footer")].filter(Boolean);
  if (closers.length && "IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target)));
      footerVisible = seen.size > 0;
      sync();
    }, { threshold: 0.15 });
    closers.forEach((el) => io.observe(el));
  }
  sync();
})();

// =============================================
// AI ASSISTANT AVATAR (ishare.ai / Pickaxe chat button, all pages)
// =============================================
// The widget loads its round button picture from its own settings; this
// swaps it for the 3DNA portrait. The original picture stays hidden (CSS)
// until swapped, so it never flashes. Changing the picture in the ishare.ai
// dashboard would make this unnecessary.
(function () {
  const AVATAR = "/images/ai-assistant-avatar.webp";
  const SELECTOR = '.pickaxe-embed img[alt="FAB Icon"]';
  function swap() {
    // swapped pictures get alt="3DNA", so only fresh widget pictures match
    document.querySelectorAll(SELECTOR).forEach((img) => {
      img.dataset.avatar3dna = "1";
      img.src = AVATAR;
      img.alt = "3DNA";
    });
  }
  const watch = () => {
    swap();
    new MutationObserver(() => {
      if (document.querySelector(SELECTOR)) swap();
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) watch();
  else document.addEventListener("DOMContentLoaded", watch, { once: true });
})();

// =============================================
// VIDEO SOUND TOGGLE (Restaurants page: full-width video with "sound": true)
// =============================================
// The video always starts muted (so autoplay is allowed); sound only comes on
// after the visitor presses the button. Toggling never restarts playback.
(function () {
  document.querySelectorAll(".rwide__sound").forEach((btn) => {
    const video = btn.closest(".rwide")?.querySelector("video");
    if (!video) return;
    const render = () => {
      const on = !video.muted;
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? btn.dataset.labelDisable : btn.dataset.labelEnable);
    };
    btn.addEventListener("click", () => {
      // not loaded yet (e.g. reduced motion): this explicit press loads it
      if (!video.getAttribute("src") && video.dataset.src) video.src = video.dataset.src;
      video.muted = !video.muted;
      if (video.paused) video.play().catch(() => {});
      render();
      if (window.track) window.track("video_sound_toggled", { sound: video.muted ? "off" : "on", language: document.documentElement.lang });
    });
    video.addEventListener("volumechange", render);
    render();
  });
})();

// =============================================
// AI CHAT (on demand) — ishare.ai / Pickaxe widget
// =============================================
// The widget bundle loads Stripe (fraud-prevention cookies __stripe_mid /
// __stripe_sid) as soon as it runs, so it is NOT loaded with the page. Pages
// that offer the chat carry its deployment marker (<div id="deployment-…">);
// they get a lightweight launcher that looks like the widget's button. Only a
// click loads the bundle, waits for the real button and opens the chat.
(function () {
 // the marker sits after main.js in some pages: wait for the full DOM
 const init = () => {
  const marker = document.querySelector('div[id^="deployment-"]');
  if (!marker) return;
  const BUNDLE = "https://ishare.ai/api/embed/bundle.js";
  const labels = { es: "Abrir el asistente de IA", en: "Open the AI assistant", ru: "Открыть ИИ-ассистента", uk: "Відкрити ШІ-асистента" };
  const lang = (document.documentElement.lang || "es").slice(0, 2);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ai-launch";
  btn.setAttribute("aria-label", labels[lang] || labels.es);
  btn.innerHTML = '<img src="/images/ai-assistant-avatar.webp" alt="" width="60" height="60" decoding="async">';
  document.body.appendChild(btn);

  let requested = false;
  btn.addEventListener("click", () => {
    if (requested) return;
    requested = true;
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    const openReal = (real) => {
      btn.remove();
      // the widget's own button opens the chat
      requestAnimationFrame(() => real.click());
    };
    const found = document.querySelector("button.pxe-fixed");
    if (found) { openReal(found); return; }
    const obs = new MutationObserver(() => {
      const real = document.querySelector("button.pxe-fixed");
      if (real) { obs.disconnect(); clearTimeout(timer); openReal(real); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => { // service unreachable: allow another try
      obs.disconnect(); requested = false;
      btn.classList.remove("is-loading"); btn.removeAttribute("aria-busy");
    }, 15000);
    const s = document.createElement("script");
    s.src = BUNDLE;
    s.async = true;
    document.body.appendChild(s);
    if (window.track) window.track("ai_chat_opened", { language: document.documentElement.lang });
  });
 };
 if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
 else init();
})();
