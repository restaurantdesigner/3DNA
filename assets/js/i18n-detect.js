/*
 * 3DNA language detection — shared by the browser (root redirect, language
 * switcher) and server.js (require). No dependencies, no network calls.
 *
 * Priority:
 *   1. language the visitor picked manually ("3dna_language" in localStorage/cookie)
 *   2. the visitor's market:
 *        Spain + Spanish-speaking Latin America -> es, Ukraine -> uk
 *        (never Russian from geography)
 *      Country comes from a CDN/host header when one exists (server), otherwise
 *      from the device time zone (browser) — GitHub Pages exposes no IP country.
 *   3. browser languages (navigator.languages / Accept-Language)
 *   4. English
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.I18nDetect = api;
})(typeof self !== "undefined" ? self : this, function () {
  var SUPPORTED = ["en", "es", "ru", "uk"];
  var DEFAULT_LANG = "en";
  var STORAGE_KEY = "3dna_language";
  var LEGACY_STORAGE_KEY = "lang"; // earlier manual choices; still honoured
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  // ISO 3166-1 alpha-2 -> language
  var SPANISH_COUNTRIES = [
    "ES", "MX", "AR", "CL", "CO", "PE", "UY", "PY", "BO", "EC",
    "VE", "CR", "PA", "GT", "HN", "SV", "NI", "DO", "CU", "PR"
  ];
  var COUNTRY_LANG = { UA: "uk" };
  SPANISH_COUNTRIES.forEach(function (c) { COUNTRY_LANG[c] = "es"; });

  // IANA time zone -> country, for the markets above only. Phones set their
  // time zone from the network, so this follows where the device actually is.
  var TIMEZONE_COUNTRY = {
    "Europe/Madrid": "ES", "Africa/Ceuta": "ES", "Atlantic/Canary": "ES",
    "America/Mexico_City": "MX", "America/Cancun": "MX", "America/Merida": "MX", "America/Monterrey": "MX",
    "America/Matamoros": "MX", "America/Chihuahua": "MX", "America/Ciudad_Juarez": "MX", "America/Ojinaga": "MX",
    "America/Mazatlan": "MX", "America/Bahia_Banderas": "MX", "America/Hermosillo": "MX", "America/Tijuana": "MX",
    "America/Buenos_Aires": "AR", "America/Cordoba": "AR", "America/Mendoza": "AR",
    "America/Santiago": "CL", "America/Punta_Arenas": "CL", "Pacific/Easter": "CL",
    "America/Bogota": "CO", "America/Lima": "PE", "America/Montevideo": "UY", "America/Asuncion": "PY",
    "America/La_Paz": "BO", "America/Guayaquil": "EC", "Pacific/Galapagos": "EC", "America/Caracas": "VE",
    "America/Costa_Rica": "CR", "America/Panama": "PA", "America/Guatemala": "GT", "America/Tegucigalpa": "HN",
    "America/El_Salvador": "SV", "America/Managua": "NI", "America/Santo_Domingo": "DO", "America/Havana": "CU",
    "America/Puerto_Rico": "PR",
    "Europe/Kyiv": "UA", "Europe/Kiev": "UA", "Europe/Uzhgorod": "UA", "Europe/Zaporozhye": "UA"
  };

  function isSupported(lang) {
    return SUPPORTED.indexOf(lang) !== -1;
  }

  // "es-MX" -> "es", "en-US" -> "en", "ua" (common mistake) -> "uk"; others -> null
  function normalize(tag) {
    if (!tag || typeof tag !== "string") return null;
    var base = tag.trim().toLowerCase().split(/[-_;]/)[0];
    if (base === "ua") base = "uk";
    return isSupported(base) ? base : null;
  }

  // The visitor's first supported language wins (in their preference order),
  // DEFAULT_LANG when languages are known but none is supported, or null when
  // there is no language information at all.
  function fromLanguages(languages) {
    var list = (languages || []).filter(Boolean);
    if (!list.length) return null;
    for (var i = 0; i < list.length; i++) {
      var lang = normalize(list[i]);
      if (lang) return lang;
    }
    return DEFAULT_LANG;
  }

  // Accept-Language: "es-ES,es;q=0.9,en;q=0.8" -> ["es-ES", "es", "en"] sorted by q
  function parseAcceptLanguage(header) {
    if (!header) return [];
    return String(header)
      .split(",")
      .map(function (part, index) {
        var bits = part.trim().split(";q=");
        var q = bits.length > 1 ? parseFloat(bits[1]) : 1;
        return { tag: bits[0].trim(), q: isNaN(q) ? 0 : q, index: index };
      })
      .filter(function (x) { return x.tag && x.tag !== "*" && x.q > 0; })
      .sort(function (a, b) { return b.q - a.q || a.index - b.index; })
      .map(function (x) { return x.tag; });
  }

  function fromCountry(country) {
    if (!country) return null;
    return COUNTRY_LANG[String(country).trim().toUpperCase()] || null;
  }

  function countryFromTimeZone(tz) {
    if (!tz) return null;
    if (TIMEZONE_COUNTRY[tz]) return TIMEZONE_COUNTRY[tz];
    if (/^America\/Argentina\//.test(tz)) return "AR";
    return null;
  }

  function detect(input) {
    input = input || {};
    if (isSupported(input.saved)) return input.saved;
    var byCountry = fromCountry(input.country);
    if (byCountry) return byCountry;
    return fromLanguages(input.languages) || DEFAULT_LANG;
  }

  // ---- browser-only helpers ----
  function readCookie(name) {
    if (typeof document === "undefined") return null;
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function getSaved() {
    var keys = [STORAGE_KEY, LEGACY_STORAGE_KEY];
    for (var i = 0; i < keys.length; i++) {
      var value = null;
      try { value = window.localStorage.getItem(keys[i]); } catch (e) {}
      if (!isSupported(value)) value = readCookie(keys[i]);
      if (isSupported(value)) return value;
    }
    return null;
  }

  // Manual choice: stored in localStorage and in a cookie (the cookie lets a
  // server-side redirect honour it too).
  function save(lang) {
    if (!isSupported(lang)) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {}
    try {
      document.cookie = STORAGE_KEY + "=" + lang + "; path=/; max-age=" + COOKIE_MAX_AGE + "; SameSite=Lax";
      document.cookie = LEGACY_STORAGE_KEY + "=; path=/; max-age=0";
    } catch (e) {}
  }

  function browserLanguages() {
    if (typeof navigator === "undefined") return [];
    if (navigator.languages && navigator.languages.length) return navigator.languages.slice();
    return navigator.language ? [navigator.language] : [];
  }

  function browserTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; }
  }

  // Everything the root redirect needs, in one call
  function detectInBrowser() {
    return detect({
      saved: getSaved(),
      country: countryFromTimeZone(browserTimeZone()),
      languages: browserLanguages()
    });
  }

  return {
    SUPPORTED: SUPPORTED,
    DEFAULT_LANG: DEFAULT_LANG,
    STORAGE_KEY: STORAGE_KEY,
    LEGACY_STORAGE_KEY: LEGACY_STORAGE_KEY,
    isSupported: isSupported,
    normalize: normalize,
    fromLanguages: fromLanguages,
    parseAcceptLanguage: parseAcceptLanguage,
    fromCountry: fromCountry,
    countryFromTimeZone: countryFromTimeZone,
    detect: detect,
    getSaved: getSaved,
    save: save,
    browserLanguages: browserLanguages,
    browserTimeZone: browserTimeZone,
    detectInBrowser: detectInBrowser
  };
});
