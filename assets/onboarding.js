(function () {
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const supportedLangs = window.READALONG_LANGS || [];
  const endonyms = window.READALONG_ENDONYMS || {};
  const demoSegments = window.READALONG_DEMO || {};

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

  function selectedRead() {
    const select = document.querySelector('[data-onboarding-read]');
    return select ? select.value : supportedLangs[0];
  }

  function resolveTranslate(readLang, translateLang, systemLang) {
    if (readLang !== translateLang) return translateLang;
    if (systemLang && systemLang !== readLang) return systemLang;
    return supportedLangs.find(function (code) { return code !== readLang; }) || translateLang;
  }

  function fillTranslateSelect(readLang, selected) {
    const select = document.querySelector('[data-onboarding-translate]');
    select.innerHTML = '';
    supportedLangs.forEach(function (code) {
      if (code === readLang) return;
      const option = document.createElement('option');
      option.value = code;
      option.lang = code;
      option.textContent = endonyms[code] || code;
      if (code === selected) option.selected = true;
      select.appendChild(option);
    });
    select.value = selected;
  }

  function renderDemo() {
    const readLang = selectedRead();
    const translateLang = document.querySelector('[data-onboarding-translate]').value;
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
  const systemLang = detectSystemLanguage();
  let readLang = selectedRead();
  let translateLang = resolveTranslate(readLang, systemLang, systemLang);

  if (translateSelect.querySelector('option[value="' + translateLang + '"]') == null) {
    translateLang = resolveTranslate(readLang, translateSelect.value, systemLang);
  }

  fillTranslateSelect(readLang, translateLang);
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
    translateLang = resolveTranslate(readLang, translateSelect.value, systemLang);
    fillTranslateSelect(readLang, translateLang);
    restartDemo();
  });

  translateSelect.addEventListener('change', function () {
    translateLang = translateSelect.value;
    restartDemo();
  });

  continueButton.addEventListener('click', function () {
    const read = selectedRead();
    if (!read) {
      continueButton.disabled = true;
      return;
    }
    setLangPref('read', read);
    setLangPref('translate', translateSelect.value);
    setLangPref('onboarding-complete', '1');
    location.href = location.pathname;
  });
})();
