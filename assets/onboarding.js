(function () {
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const strings = window.READALONG_I18N || {};
  const supportedLangs = window.READALONG_LANGS || [];
  const endonyms = window.READALONG_ENDONYMS || {};
  const demoSegments = window.READALONG_DEMO || {};

  function setLangPref(key, value) {
    localStorage.setItem('readalong-' + key, value);
    document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax';
  }

  if (localStorage.getItem('readalong-onboarding-complete') === '1' || localStorage.getItem('readalong-read')) {
    ['read', 'translate', 'ui', 'level', 'onboarding-complete'].forEach(function (key) {
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

  function translate(key, locale) {
    return (strings[locale] && strings[locale][key]) || (strings.en && strings.en[key]) || key;
  }

  function applyLocale(locale) {
    document.documentElement.lang = locale;
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      const key = element.getAttribute('data-i18n');
      if (key) element.textContent = translate(key, locale);
    });
  }

  function selectedRead() {
    const select = document.querySelector('[data-onboarding-read]');
    return select ? select.value : supportedLangs[0];
  }

  function selectedTranslatePills() {
    return Array.from(document.querySelectorAll('[data-onboarding-translate-pill][aria-pressed=true]:not([hidden])'))
      .map(function (pill) { return pill.getAttribute('data-onboarding-translate-pill'); })
      .filter(Boolean);
  }

  function resolveTranslate(readLang, selected, systemLang) {
    const available = selected.filter(function (code) { return code !== readLang; });
    if (available.length) return available;
    if (systemLang && systemLang !== readLang) return [systemLang];
    const fallback = supportedLangs.find(function (code) { return code !== readLang; });
    return fallback ? [fallback] : selected;
  }

  function syncTranslatePills(readLang, selected) {
    document.querySelectorAll('[data-onboarding-translate-pill]').forEach(function (pill) {
      const code = pill.getAttribute('data-onboarding-translate-pill');
      const hidden = code === readLang;
      pill.hidden = hidden;
      pill.setAttribute('aria-pressed', !hidden && selected.includes(code) ? 'true' : 'false');
    });
  }

  function activeTranslateLang() {
    const selected = selectedTranslatePills();
    return selected[0] || 'en';
  }

  function renderDemo() {
    const readLang = selectedRead();
    const translateLang = activeTranslateLang();
    const source = demoSegments[readLang] || demoSegments.en;
    const translation = demoSegments[translateLang] || demoSegments.en;
    const story = document.querySelector('[data-onboarding-demo-story]');
    const sentenceEls = document.querySelectorAll('[data-onboarding-demo-story] [data-sentence]');

    story.lang = readLang;
    sentenceEls.forEach(function (el, index) {
      el.lang = readLang;
      el.textContent = source[index] || '';
      el.dataset.translation = translation[index] || '';
    });

    if (translationText) {
      translationText.lang = translateLang;
      if (translationPopover) translationPopover.lang = translateLang;
      if (typeof updateTranslation === 'function') updateTranslation();
    }
  }

  function restartDemo() {
    renderDemo();
    if (typeof pause === 'function') pause();
    currentSentence = 0;
    currentSentenceEl = sentences[0];
    if (audioFile) {
      try { audioFile.currentTime = 0; } catch (error) {}
    }
    if (typeof changeSentence === 'function') changeSentence();
    if (typeof play === 'function') play();
  }

  function afterLayout(callback) {
    requestAnimationFrame(function () {
      requestAnimationFrame(callback);
    });
  }

  const readSelect = document.querySelector('[data-onboarding-read]');
  const translatePills = document.querySelectorAll('[data-onboarding-translate-pill]');
  const continueButton = document.querySelector('[data-onboarding-continue]');
  const systemLang = detectSystemLanguage();
  let readLang = selectedRead();
  let translateLangs = resolveTranslate(readLang, selectedTranslatePills(), systemLang);

  syncTranslatePills(readLang, translateLangs);
  applyLocale(systemLang);
  renderDemo();

  afterLayout(function () {
    if (typeof start === 'function') start();
    restartDemo();
  });

  if (audioFile) {
    audioFile.addEventListener('ended', function () {
      if (typeof pause === 'function') pause();
    });
  }

  readSelect.addEventListener('change', function () {
    readLang = readSelect.value;
    translateLangs = resolveTranslate(readLang, selectedTranslatePills(), systemLang);
    syncTranslatePills(readLang, translateLangs);
    restartDemo();
  });

  translatePills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      const pressed = this.getAttribute('aria-pressed') === 'true';
      const selectedCount = selectedTranslatePills().length;
      if (pressed && selectedCount <= 1) return;
      this.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      restartDemo();
    });
  });

  continueButton.addEventListener('click', function () {
    const read = selectedRead();
    const translate = selectedTranslatePills();
    if (!read || translate.length === 0) {
      continueButton.disabled = true;
      return;
    }
    setLangPref('read', read);
    setLangPref('translate', translate.join(','));
    setLangPref('onboarding-complete', '1');
    location.href = location.pathname;
  });
})();
