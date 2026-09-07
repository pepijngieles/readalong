(function () {
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const strings = window.READALONG_I18N || {};
  const supportedLangs = window.READALONG_LANGS || [];
  const endonyms = window.READALONG_ENDONYMS || {};
  const demoSegments = window.READALONG_DEMO || {};
  const translationLangsBySource = window.TRANSLATION_LANGS_BY_SOURCE || {};

  function setLangPref(key, value) {
    localStorage.setItem('readalong-' + key, value);
    document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax';
  }

  if (localStorage.getItem('readalong-onboarding-complete') === '1' || localStorage.getItem('readalong-read')) {
    if (!localStorage.getItem('readalong-translate') && localStorage.getItem('readalong-ui')) {
      setLangPref('translate', localStorage.getItem('readalong-ui'));
      localStorage.removeItem('readalong-ui');
      document.cookie = 'readalong-ui=; path=/; max-age=0; SameSite=Lax';
    }
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

  function selectedTranslate() {
    const select = document.querySelector('[data-onboarding-translate]');
    return select ? select.value : '';
  }

  function syncTranslateSelectForReadAlong() {
    const readLang = selectedRead();
    const select = document.querySelector('[data-onboarding-translate]');
    if (!select) return;

    const options = translationLangsBySource[readLang] || [];
    const previous = select.value;
    select.innerHTML = '';
    options.forEach(function (code) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = endonyms[code] || code.toUpperCase();
      option.setAttribute('translate', 'no');
      option.lang = code;
      select.appendChild(option);
    });

    if (options.indexOf(previous) !== -1) {
      select.value = previous;
    } else if (options.length) {
      select.value = options[0];
    }

    updateContinueButton();
  }

  function updateContinueButton() {
    if (!continueButton) return;
    continueButton.disabled = !selectedRead() || !selectedTranslate();
  }

  function renderDemo() {
    const readLang = selectedRead();
    const translateLang = selectedTranslate() || 'en';
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
  const translateSelect = document.querySelector('[data-onboarding-translate]');
  const continueButton = document.querySelector('[data-onboarding-continue]');
  const initialTranslate = selectedTranslate() || detectSystemLanguage();

  applyLocale(initialTranslate);
  updateContinueButton();
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
    syncTranslateSelectForReadAlong();
    applyLocale(selectedTranslate());
    restartDemo();
  });

  translateSelect.addEventListener('change', function () {
    applyLocale(selectedTranslate());
    updateContinueButton();
    restartDemo();
  });

  continueButton.addEventListener('click', function () {
    const read = selectedRead();
    const translate = selectedTranslate();
    if (!read || !translate) {
      updateContinueButton();
      return;
    }
    setLangPref('read', read);
    setLangPref('translate', translate);
    setLangPref('onboarding-complete', '1');
    location.href = location.pathname;
  });
})();
