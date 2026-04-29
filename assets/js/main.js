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
      <a class="utility-link" href="#sec2">
        <span class="utility-text">3D</span>
      </a>
      <a class="utility-link" href="#sec5">
        <span class="utility-text">WEB</span>
      </a>
      <a class="utility-link" href="#sec5">
        <span class="utility-text">AI</span>
      </a>
    </nav>
  </div>
</div>

<header class="topbar" id="topbar">
  <div class="container topbar-inner">
    <a class="brand" href="#hero" aria-label="3DNA Home">
      <div class="brand-title"><img src="img/logo.png" alt="3DNA" /></div>
      
    </a>

    <nav class="nav-desktop" aria-label="Primary">
      <a href="#hero">Inicio</a>
      <a href="#about">Sobre nosotros</a>
      <a href="#sec2">Servicios</a>

      <div class="nav-dropdown" id="showroomDropdown">
        <a href="#sec3" class="nav-parent" aria-haspopup="true" aria-expanded="false">
          Experiencias <span class="nav-arrow" aria-hidden="true">&#9660;</span>
        </a>

        <div class="nav-menu" role="menu" aria-label="Showroom submenu">
          <a role="menuitem" href="#sec3">Restaurantes</a>
          <a role="menuitem" href="#sec2">Gimnasios</a>
          <a role="menuitem" href="#sec4">Centros medicos</a>
        </div>
      </div>

      <a href="#contacto">Contacto</a>
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
    <a href="#about" class="m-link">Sobre nosotros</a>
    <a href="#sec2" class="m-link">Servicios</a>
    <a href="#sec3" class="m-link">Showroom</a>
    <a href="#contacto" class="m-link">Contacto</a>

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

const heroTitlePairs = [
  ["Marketing Digital", "Publicidad"],
  ["Diseno 3D para comercio", "Implementacion de AI y Web"],
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

  if (!localStorage.getItem('cookiesDecision')) {
    showBanner();
  } else {
    hideBanner();
  }

  accept.onclick = () => {
    localStorage.setItem('cookiesDecision', JSON.stringify({
      necessary: true, analytics: true, ads: true
    }));
    hideBanner();
  };

  reject.onclick = () => {
    localStorage.setItem('cookiesDecision', JSON.stringify({
      necessary: true, analytics: false, ads: false
    }));
    hideBanner();
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

document.addEventListener("DOMContentLoaded", () => {
  updateStepProgress();

  document.querySelectorAll('.form-section .form-select, .form-section .form-input, .form-section .form-textarea, .form-section .form-check-input').forEach(field => {
    field.addEventListener('change', updateStepProgress);
    field.addEventListener('input', updateStepProgress);
  });
});


// =============================================
// 9. FORM SUBMIT VALIDATION
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.querySelector('.form-submit');
  const progressWrapper = document.querySelector('.progress-wrapper');
  const API_BASE_URL = 'https://threedna-site.onrender.com';
  if (!submitBtn) return;

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
    return e164Pattern.test(cleaned);
  };

  submitBtn.addEventListener('click', async () => {
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

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

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

      document.querySelectorAll('.form-section').forEach((section) => {
        section.hidden = true;
      });
      submitBtn.hidden = true;
      if (progressWrapper) progressWrapper.hidden = true;

      const successState = document.getElementById('form-success-state');
      if (successState) {
        successState.hidden = false;
        successState.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

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
      submitBtn.disabled = false;
      submitBtn.textContent = 'Analizar mi negocio';
    }
  });
});


// =============================================
// 10. OTRO CHECKBOX TOGGLE
// =============================================
{
  const negocioSelect = document.getElementById('negocio-select');
  const otroInputWrapper = document.getElementById('otroInputWrapper');

  if (negocioSelect && otroInputWrapper) {
    const toggleOtroInput = () => {
      const isOtro = negocioSelect.value === 'otro';
      otroInputWrapper.style.display = isOtro ? 'block' : 'none';
    };

    negocioSelect.addEventListener('change', toggleOtroInput);
    toggleOtroInput();
  }
}


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
    if (isDragging) e.preventDefault();
  }, { passive: false });

  scroller.addEventListener("touchend", stopDrag, { passive: true });

  virtualScrollLeft = scroller.scrollLeft;
  normalizeScroll();
});
