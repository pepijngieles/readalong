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

function settingsEl(selector) {
  return document.querySelector(selector)
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

function uiLocaleFromTranslate(code) {
  const allowed = Object.keys(window.LANG_ENDONYMS || window.READALONG_ENDONYMS || {})
  return allowed.indexOf(code) !== -1 ? code : 'en'
}

function saveCatalogPrefs(el) {
  const translateSelect = (el && el.matches && el.matches('[data-translate-along]'))
    ? el
    : settingsEl('[data-translate-along]')
  const next = translateSelect ? translateSelect.value : ''
  if (!next) return
  const current = (localStorage.getItem('readalong-translate') || '').split(',')[0]
  if (next === current) return
  window.setLangPref('translate', next)
  window.setLangPref('ui', uiLocaleFromTranslate(next))
  location.reload()
}

function openSettings(el, event) {
  openDialog(el, event, 'settings')
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
    updateThemeColor()
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

window.saveCatalogPrefs = saveCatalogPrefs
window.openSettings = openSettings
window.saveSettings = saveSettings
window.updateSettings = updateSettings
window.loadSettings = loadSettings
