(function () {
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const strings = window.READALONG_I18N || {};
  const supportedLangs = window.READALONG_LANGS || [];

  function setLangPref(key, value) {
    localStorage.setItem('readalong-' + key, value);
    document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax';
  }

  if (localStorage.getItem('readalong-onboarding-complete') === '1' || localStorage.getItem('readalong-read')) {
    ['read', 'translate', 'level', 'onboarding-complete'].forEach(function (key) {
      const value = localStorage.getItem('readalong-' + key);
      if (value) setLangPref(key, value);
    });
    location.replace(location.pathname);
    return;
  }

  function detectSystemLanguage() {
    const lang = (navigator.language || 'en').split('-')[0].toLowerCase();
    return supportedLangs.includes(lang) ? lang : 'en';
  }

  function translate(key, locale, replacements) {
    const text = (strings[locale] && strings[locale][key]) || (strings.en && strings.en[key]) || key;
    if (!replacements) return text;
    return Object.keys(replacements).reduce(function (result, name) {
      return result.replace('{' + name + '}', replacements[name]);
    }, text);
  }

  function applyLocale(locale) {
    document.documentElement.lang = locale;

    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      const key = element.getAttribute('data-i18n');
      if (!key) return;
      element.textContent = translate(key, locale);
    });

    document.querySelectorAll('[data-onboarding-translate] option').forEach(function (option) {
      const key = option.getAttribute('data-i18n');
      if (key) {
        option.textContent = translate(key, locale);
      }
    });
  }

  const systemLang = detectSystemLanguage();
  applyLocale(systemLang);

  const readInputs = document.querySelectorAll('[data-onboarding-read]');
  const translateSelect = document.querySelector('[data-onboarding-translate]');
  const continueButton = document.querySelector('[data-onboarding-continue]');

  translateSelect.value = systemLang;

  readInputs.forEach(function (input) {
    if (input.value === systemLang) {
      input.checked = true;
    }
  });

  continueButton.addEventListener('click', function () {
    const selectedRead = document.querySelector('[data-onboarding-read]:checked');
    if (!selectedRead) {
      continueButton.disabled = true;
      return;
    }

    setLangPref('read', selectedRead.value);
    setLangPref('translate', translateSelect.value);
    setLangPref('onboarding-complete', '1');
    location.href = location.pathname;
  });

  readInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      continueButton.disabled = false;
    });
  });

  if (!document.querySelector('[data-onboarding-read]:checked')) {
    continueButton.disabled = true;
  }
})();
