const SETTINGS_KEY = 'readalong-settings'
const SETTINGS_DEFAULTS = {
  fontFamily: 'sans',
  fontSize: 100,
  lineHeight: 1.5,
  playbackRate: 1,
  sentencePause: 0,
  theme: 'light',
  layout: 'start'
}
const THEME_META_PREFIX = '--theme-meta-'
const LEVEL_CODES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

let initialCatalogPrefs = null

function settingsEl(selector) {
  return document.querySelector(selector)
}

function settingsAll(selector) {
  return document.querySelectorAll(selector)
}

function cssToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function themeMetaColor(theme, variant) {
  const value = cssToken(THEME_META_PREFIX + theme + '-' + variant)
  return value || cssToken(THEME_META_PREFIX + 'light-' + variant)
}

let currentTheme = 'light'

function updateThemeColor() {
  const themeColorEl = document.querySelector('meta[name=theme-color]')
  if (!themeColorEl) return
  const settingsDialog = document.getElementById('settings')
  const started = document.body.classList.contains('started')
  const showTranslation = document.body.classList.contains('show-translation')
  const variant = (settingsDialog && settingsDialog.open && started) || (started && showTranslation)
    ? 'secondary'
    : 'primary'
  themeColorEl.setAttribute('content', themeMetaColor(currentTheme, variant))
}

function applyTheme(value) {
  document.body.classList.remove('theme-light', 'theme-cream', 'theme-dark', 'theme-black')
  if (value !== 'light') document.body.classList.add('theme-' + value)
  currentTheme = value
  updateThemeColor()
}

function applyLayout(value) {
  document.body.classList.remove('layout-start', 'layout-justify', 'layout-dense', 'layout-spaced')
  if (value === 'justify') document.body.classList.add('layout-justify')
}

function readStoredSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const settings = Object.assign({}, SETTINGS_DEFAULTS, JSON.parse(stored))
      if (settings.layout === 'dense') settings.layout = 'start'
      if (settings.layout === 'spaced') settings.layout = 'justify'
      return settings
    }
  } catch (error) {}
  return Object.assign({}, SETTINGS_DEFAULTS)
}

function getSettingsFromForm() {
  const form = document.forms.settings
  if (!form) return {}
  const next = {}
  if (form.fontFamily) next.fontFamily = form.fontFamily.value
  if (form.fontSize) next.fontSize = parseInt(form.fontSize.value, 10)
  if (form.lineHeight) next.lineHeight = parseFloat(form.lineHeight.value)
  if (form.playbackRate) next.playbackRate = parseFloat(form.playbackRate.value)
  if (form.sentencePause) next.sentencePause = parseInt(form.sentencePause.value, 10)
  if (form.theme) next.theme = form.theme.value
  if (form.layout) next.layout = form.layout.value
  return next
}

function saveSettings() {
  const next = Object.assign({}, SETTINGS_DEFAULTS, readStoredSettings(), getSettingsFromForm())
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
}

function applyAppearanceFromForm(save) {
  const form = document.forms.settings
  const stored = readStoredSettings()
  const theme = (form && form.theme && form.theme.value) || stored.theme
  applyTheme(theme)
  if (form && form.layout) applyLayout(form.layout.value)
  if (save !== false) saveSettings()
}

function fillSettingsForm(settings) {
  const form = document.forms.settings
  if (!form) return
  if (form.fontFamily) form.fontFamily.value = settings.fontFamily
  if (form.fontSize) form.fontSize.value = settings.fontSize
  if (form.lineHeight) form.lineHeight.value = settings.lineHeight
  if (form.playbackRate) form.playbackRate.value = settings.playbackRate
  if (form.sentencePause) form.sentencePause.value = settings.sentencePause
  if (form.theme) form.theme.value = settings.theme
  if (form.layout) form.layout.value = settings.layout
}

function loadThemeFromStorage() {
  applyTheme(readStoredSettings().theme)
}

function loadSettings() {
  const settings = readStoredSettings()
  fillSettingsForm(settings)
  applyAppearanceFromForm(false)
}

function selectedLevelPills() {
  return Array.from(settingsAll('[data-level-pill][aria-pressed=true]'))
    .map(function (pill) { return pill.getAttribute('data-level-pill') })
    .filter(Boolean)
}

function isAllLevelsSelected(selected) {
  return !selected.length || selected.length === LEVEL_CODES.length
}

function levelsFromPref(raw) {
  const codes = (raw || '').split(',').map(function (code) { return code.trim() }).filter(function (code) {
    return LEVEL_CODES.indexOf(code) !== -1
  })
  if (!codes.length || codes.length === LEVEL_CODES.length) return LEVEL_CODES.slice()
  return codes
}

function levelPrefValue() {
  const selected = selectedLevelPills()
  return isAllLevelsSelected(selected) ? '' : selected.join(',')
}

function normalizeLevelPref(level) {
  const selected = levelsFromPref(level || '')
  if (isAllLevelsSelected(selected)) return ''
  return selected.sort(function (a, b) {
    return LEVEL_CODES.indexOf(a) - LEVEL_CODES.indexOf(b)
  }).join(',')
}

function catalogPrefsState() {
  return {
    read: settingsEl('[data-read-along]')?.value || '',
    translate: settingsEl('[data-translate-along]')?.value || '',
    level: levelPrefValue()
  }
}

function syncTranslateSelectForReadAlong() {
  const readLang = settingsEl('[data-read-along]')?.value
  const select = settingsEl('[data-translate-along]')
  const langsBySource = window.TRANSLATION_LANGS_BY_SOURCE || {}
  const endonyms = window.LANG_ENDONYMS || {}
  if (!readLang || !select) return

  const options = langsBySource[readLang] || []
  const previous = select.value
  select.innerHTML = ''
  options.forEach(function (code) {
    const option = document.createElement('option')
    option.value = code
    option.textContent = endonyms[code] || code.toUpperCase()
    option.setAttribute('translate', 'no')
    option.lang = code
    select.appendChild(option)
  })

  if (options.indexOf(previous) !== -1) {
    select.value = previous
  } else if (options.length) {
    select.value = options[0]
  }
}

function syncLevelPills(selected) {
  settingsAll('[data-level-pill]').forEach(function (pill) {
    const code = pill.getAttribute('data-level-pill')
    pill.setAttribute('aria-pressed', selected.indexOf(code) !== -1 ? 'true' : 'false')
  })
  syncLevelLabel()
}

function syncLevelLabel() {
  const label = settingsEl('#settings-level-label')
  if (!label) return
  const selected = selectedLevelPills()
  const allLevels = label.getAttribute('data-i18n-all-levels') || 'All levels'
  const levelLabel = label.getAttribute('data-i18n-level') || 'Level'
  label.textContent = isAllLevelsSelected(selected) ? allLevels : levelLabel
}

function revertCatalogPrefs() {
  if (!initialCatalogPrefs) return
  const readSelect = settingsEl('[data-read-along]')
  if (readSelect) readSelect.value = initialCatalogPrefs.read
  syncTranslateSelectForReadAlong()
  const translateSelect = settingsEl('[data-translate-along]')
  const savedTranslate = (initialCatalogPrefs.translate || '').split(',')[0]
  if (translateSelect && savedTranslate) {
    const langsBySource = window.TRANSLATION_LANGS_BY_SOURCE || {}
    const options = langsBySource[initialCatalogPrefs.read] || []
    if (!readSelect) {
      translateSelect.value = savedTranslate
    } else {
      translateSelect.value = options.indexOf(savedTranslate) !== -1 ? savedTranslate : (options[0] || '')
    }
  }
  syncLevelPills(levelsFromPref(initialCatalogPrefs.level))
}

function uiLocaleFromTranslate(code) {
  const allowed = Object.keys(window.LANG_ENDONYMS || window.READALONG_ENDONYMS || {})
  return allowed.indexOf(code) !== -1 ? code : 'en'
}

function saveCatalogPrefs() {
  const next = catalogPrefsState()
  if (!next.translate) return
  const initialTranslate = (initialCatalogPrefs.translate || '').split(',')[0]
  const onHome = !!settingsEl('[data-read-along]')
  if (onHome) {
    if (next.read === initialCatalogPrefs.read && next.translate === initialTranslate &&
        normalizeLevelPref(next.level) === normalizeLevelPref(initialCatalogPrefs.level)) {
      closeDialog(null, null, 'settings')
      return
    }
    window.setLangPref('read', next.read)
    window.setLangPref('level', next.level)
  } else if (next.translate === initialTranslate) {
    closeDialog(null, null, 'settings')
    return
  }
  window.setLangPref('translate', next.translate)
  window.setLangPref('ui', uiLocaleFromTranslate(next.translate))
  location.reload()
}

function toggleLevelPill(el) {
  const pressed = el.getAttribute('aria-pressed') === 'true'
  if (pressed && selectedLevelPills().length <= 1) return
  el.setAttribute('aria-pressed', pressed ? 'false' : 'true')
  syncLevelLabel()
}

function syncSettingsToggleExpanded() {
  const toggle = settingsEl('[data-settings-toggle]')
  const panel = document.getElementById('settings')
  if (toggle && panel) {
    toggle.setAttribute('aria-expanded', panel.open ? 'true' : 'false')
  }
}

function openSettings(el, event) {
  if (settingsEl('[data-translate-along]')) {
    initialCatalogPrefs = catalogPrefsState()
  }
  openDialog(el, event, 'settings')
  syncSettingsToggleExpanded()
}

function initSettingsControls() {
  const settingsDialog = document.getElementById('settings')
  if (!settingsDialog) {
    loadThemeFromStorage()
    return
  }
  document.querySelectorAll('.settings-segment, .settings-themes, .settings-layouts').forEach(function(fieldset) {
    const inputs = Array.from(fieldset.querySelectorAll('input[type=radio]'))
    inputs.forEach(function(input, index) {
      input.addEventListener('keydown', function(event) {
        let nextIndex = index
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = (index + 1) % inputs.length
          event.preventDefault()
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          nextIndex = (index - 1 + inputs.length) % inputs.length
          event.preventDefault()
        } else return
        inputs[nextIndex].checked = true
        inputs[nextIndex].focus()
        updateSettings()
      })
    })
  })
  settingsDialog.addEventListener('close', function () {
    revertCatalogPrefs()
    updateThemeColor()
    syncSettingsToggleExpanded()
  })
  loadSettings()
}

function updateSettings() {
  applyAppearanceFromForm(true)
  if (typeof window.applyReaderSettings === 'function') {
    window.applyReaderSettings()
  }
}

initSettingsControls()

window.syncTranslateSelectForReadAlong = syncTranslateSelectForReadAlong
window.saveCatalogPrefs = saveCatalogPrefs
window.toggleLevelPill = toggleLevelPill
window.openSettings = openSettings
