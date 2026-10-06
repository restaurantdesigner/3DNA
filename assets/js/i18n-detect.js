/*
 * 3DNA language detection — shared by the browser (root redirect, language
 * switcher) and server.js (require). No dependencies.
 *
 * Priority:
 *   1. language the visitor picked manually (localStorage / cookie "lang")
 *   2. browser languages (navigator.languages / Accept-Language)
 *   3. IP country — only when 2 gives no information and the host provides it
 *   4. English
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.I18nDetect = api;
})(typeof self !== "undefined" ? self : this, function () {
  var SUPPORTED = ["en", "es", "ru", "uk"];
  var DEFAULT_LANG = "en";
  var STORAGE_KEY = "lang";
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  // Spain + Spanish-speaking Latin America (and Equatorial Guinea)
  var SPANISH_COUNTRIES = [
    "ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO",
    "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ"
  ];
  // Country is never used to pick Russian.
  var COUNTRY_LANG = { UA: "uk" };
  SPANISH_COUNTRIES.forEach(function (c) { COUNTRY_LANG[c] = "es"; });

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

  function detect(input) {
    input = input || {};
    if (isSupported(input.saved)) return input.saved;
    var byLanguage = fromLanguages(input.languages);
    if (byLanguage) return byLanguage;
    return fromCountry(input.country) || DEFAULT_LANG;
  }

  // ---- browser-only helpers ----
  function readCookie(name) {
    if (typeof document === "undefined") return null;
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function getSaved() {
    var value = null;
    try { value = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!isSupported(value)) value = readCookie(STORAGE_KEY);
    return isSupported(value) ? value : null;
  }

  // Manual choice: stored in localStorage and in a cookie (the cookie lets a
  // server-side redirect honour it too).
  function save(lang) {
    if (!isSupported(lang)) return;
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    try {
      document.cookie = STORAGE_KEY + "=" + lang + "; path=/; max-age=" + COOKIE_MAX_AGE + "; SameSite=Lax";
    } catch (e) {}
  }

  function browserLanguages() {
    if (typeof navigator === "undefined") return [];
    if (navigator.languages && navigator.languages.length) return navigator.languages.slice();
    return navigator.language ? [navigator.language] : [];
  }

  return {
    SUPPORTED: SUPPORTED,
    DEFAULT_LANG: DEFAULT_LANG,
    STORAGE_KEY: STORAGE_KEY,
    isSupported: isSupported,
    normalize: normalize,
    fromLanguages: fromLanguages,
    parseAcceptLanguage: parseAcceptLanguage,
    fromCountry: fromCountry,
    detect: detect,
    getSaved: getSaved,
    save: save,
    browserLanguages: browserLanguages
  };
});
