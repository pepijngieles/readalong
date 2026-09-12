(function () {
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  const strings = window.READALONG_I18N || {};
  const supportedLangs = window.READALONG_LANGS || [];
  const endonyms = window.READALONG_ENDONYMS || {};
  const demoSegments = window.READALONG_DEMO || {};
  const translationLangsBySource = window.TRANSLATION_LANGS_BY_SOURCE || {};
  const defaultRead = window.ONBOARDING_DEFAULT_READ || supportedLangs[0] || 'en';
  let currentStep = 1;
  let selectedRead = defaultRead;
  let demoStarted = false;
  let translateCheckIconTemplate = null;

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

  function langFlagSrc(code) {
    const codes = window.LANG_FLAG_CODES || {};
    const file = codes[code];
    return file ? 'assets/flags/' + file + '.svg' : '';
  }

  function updateTitleFlag(control, code) {
    const wrap = control.querySelector('[data-title-flag]');
    if (!wrap) return;
    const src = langFlagSrc(code);
    if (!src) {
      wrap.hidden = true;
      return;
    }
    let img = wrap.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'lang-flag';
      img.width = 24;
      img.height = 16;
      img.decoding = 'async';
      img.setAttribute('aria-hidden', 'true');
      wrap.appendChild(img);
    }
    img.src = src;
    img.alt = '';
    img.dataset.langFlag = code;
    wrap.hidden = false;
  }

  function closeTitleMenus(exceptButton) {
    document.querySelectorAll('.home-title-trigger[aria-expanded=true]').forEach(function (button) {
      if (exceptButton && button === exceptButton) return;
      button.setAttribute('aria-expanded', 'false');
      const menu = document.getElementById(button.getAttribute('aria-controls'));
      if (menu) menu.hidden = true;
    });
  }

  window.toggleTitleMenu = function (el) {
    const menu = document.getElementById(el.getAttribute('aria-controls'));
    if (!menu) return;
    const open = el.getAttribute('aria-expanded') === 'true';
    closeTitleMenus(open ? null : el);
    if (!open) {
      el.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
    }
  };

  function selectedTranslate() {
    const input = document.querySelector('#onboarding-translate-menu input:checked');
    return input ? input.value : '';
  }

  function syncTranslateMenuForReadAlong() {
    const menu = document.getElementById('onboarding-translate-menu');
    const control = menu && menu.closest('.home-title-control');
    if (!menu || !control) return;

    const options = translationLangsBySource[selectedRead] || [];
    const previous = selectedTranslate();
    if (!translateCheckIconTemplate) {
      translateCheckIconTemplate = menu.querySelector('label .icon');
    }
    menu.innerHTML = '';

    const nextTranslate = options.indexOf(previous) !== -1 ? previous : (options[0] || '');

    options.forEach(function (code) {
      const checked = code === nextTranslate;
      const label = document.createElement('label');
      label.setAttribute('role', 'option');
      label.setAttribute('aria-selected', checked ? 'true' : 'false');
      label.setAttribute('translate', 'no');
      label.lang = code;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'onboarding-translate';
      input.value = code;
      input.checked = checked;
      label.appendChild(input);

      if (translateCheckIconTemplate) {
        label.appendChild(translateCheckIconTemplate.cloneNode(true));
      }

      const src = langFlagSrc(code);
      if (src) {
        const img = document.createElement('img');
        img.className = 'lang-flag';
        img.src = src;
        img.width = 24;
        img.height = 16;
        img.decoding = 'async';
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.dataset.langFlag = code;
        label.appendChild(img);
      }

      const text = document.createElement('span');
      text.textContent = endonyms[code] || code.toUpperCase();
      label.appendChild(text);

      menu.appendChild(label);
    });

    const chosen = selectedTranslate() || options[0] || '';
    const labelEl = control.querySelector('[data-title-label]');
    if (labelEl && chosen) {
      labelEl.textContent = endonyms[chosen] || chosen.toUpperCase();
      labelEl.lang = chosen;
      updateTitleFlag(control, chosen);
    }
    updateNextButton();
  }

  function updateReadTiles() {
    document.querySelectorAll('[data-onboarding-read-tiles] [data-lang]').forEach(function (tile) {
      const active = tile.getAttribute('data-lang') === selectedRead;
      tile.setAttribute('aria-pressed', active ? 'true' : 'false');
      tile.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function updateNextButton() {
    const nextButton = document.querySelector('[data-onboarding-next]');
    if (!nextButton) return;
    nextButton.disabled = !selectedRead || !selectedTranslate();
  }

  function uiLocaleFromTranslate(code) {
    const allowed = Object.keys(endonyms);
    return allowed.indexOf(code) !== -1 ? code : 'en';
  }

  function renderDemo() {
    const translateLang = selectedTranslate() || 'en';
    const source = demoSegments[selectedRead] || demoSegments.en;
    const translation = demoSegments[translateLang] || demoSegments.en;
    const story = document.querySelector('[data-onboarding-demo-story]');
    const sentenceEls = document.querySelectorAll('[data-onboarding-demo-story] [data-sentence]');

    if (!story) return;

    story.lang = selectedRead;
    sentenceEls.forEach(function (el, index) {
      el.lang = selectedRead;
      el.textContent = source[index] || '';
      el.dataset.translation = translation[index] || '';
    });

    if (typeof translationText !== 'undefined' && translationText) {
      translationText.lang = translateLang;
      if (typeof translationPopover !== 'undefined' && translationPopover) translationPopover.lang = translateLang;
      if (typeof updateTranslation === 'function') updateTranslation();
    }
  }

  function restartDemo() {
    renderDemo();
    if (typeof pause === 'function') pause();
    currentSentence = 0;
    currentSentenceEl = sentences[0];
    if (typeof audioFile !== 'undefined' && audioFile) {
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

  function showStep(step) {
    currentStep = step;
    document.querySelectorAll('[data-onboarding-step]').forEach(function (panel) {
      const active = panel.getAttribute('data-onboarding-step') === String(step);
      panel.hidden = !active;
    });

    if (step === 2) {
      document.body.classList.add('show-translation', 'started', 'paused');
      renderDemo();
      if (typeof loadSettings === 'function') loadSettings();
      if (typeof updateSettings === 'function') updateSettings();
      if (!demoStarted) {
        demoStarted = true;
        afterLayout(function () {
          if (typeof start === 'function') start();
          restartDemo();
        });
      } else {
        restartDemo();
      }
    } else {
      if (typeof pause === 'function') pause();
      document.body.classList.remove('show-translation', 'started');
    }
  }

  window.onboardingReadTile = function (el) {
    const code = el.getAttribute('data-lang');
    if (!code) return;
    selectedRead = code;
    updateReadTiles();
    syncTranslateMenuForReadAlong();
    applyLocale(uiLocaleFromTranslate(selectedTranslate()));
    updateNextButton();
  };

  window.onboardingTranslateMenu = function (el, event) {
    const menu = el.classList && el.classList.contains('title-menu') ? el : el.closest('.title-menu');
    const control = menu && menu.closest('.home-title-control');
    if (!menu || !control) return;

    const inputs = Array.from(menu.querySelectorAll('input[type=radio]'));
    const chosen = (event && event.target && event.target.value) || (inputs.find(function (input) { return input.checked; }) || {}).value;
    if (!chosen) return;

    inputs.forEach(function (input) {
      input.checked = input.value === chosen;
      const option = input.closest('[role=option]');
      if (option) option.setAttribute('aria-selected', input.checked ? 'true' : 'false');
    });

    const labelEl = control.querySelector('[data-title-label]');
    if (labelEl) {
      labelEl.textContent = endonyms[chosen] || chosen.toUpperCase();
      labelEl.lang = chosen;
    }
    updateTitleFlag(control, chosen);
    closeTitleMenus();
    applyLocale(uiLocaleFromTranslate(chosen));
    updateNextButton();

    if (currentStep === 2) restartDemo();
  };

  window.onboardingNext = function () {
    if (!selectedRead || !selectedTranslate()) {
      updateNextButton();
      return;
    }
    showStep(2);
  };

  window.onboardingBack = function () {
    if (typeof pause === 'function') pause();
    showStep(1);
  };

  window.completeOnboarding = function () {
    const translate = selectedTranslate();
    if (!selectedRead || !translate) return;

    if (typeof saveSettings === 'function') saveSettings();

    setLangPref('read', selectedRead);
    setLangPref('translate', translate);
    setLangPref('ui', uiLocaleFromTranslate(translate));
    setLangPref('onboarding-complete', '1');
    location.href = location.pathname;
  };

  document.addEventListener('click', function (event) {
    const singleOption = event.target.closest('#onboarding-translate-menu [role=option]');
    if (singleOption) {
      closeTitleMenus();
      return;
    }
    if (event.target.closest('.home-title-control')) return;
    closeTitleMenus();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeTitleMenus();
  });

  const systemLang = detectSystemLanguage();
  applyLocale(systemLang);
  updateReadTiles();
  syncTranslateMenuForReadAlong();
  updateNextButton();
  showStep(1);

  if (typeof audioFile !== 'undefined' && audioFile) {
    audioFile.addEventListener('ended', function () {
      if (typeof pause === 'function') pause();
    });
  }
})();
