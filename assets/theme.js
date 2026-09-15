(function (root) {
  'use strict'

  var SETTINGS_KEY = 'readalong-settings'
  var THEME_DEFAULTS = {
    appearance: 'system',
    lightTheme: 'light',
    darkTheme: 'dark'
  }
  var THEME_META_PREFIX = '--theme-meta-'

  function systemPrefs() {
    if (typeof matchMedia !== 'function') {
      return { scheme: 'light', contrast: false }
    }
    return {
      scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      contrast: matchMedia('(prefers-contrast: more)').matches
        || matchMedia('(forced-colors: active)').matches
    }
  }

  function normalizeThemeSettings(settings) {
    var next = {}
    var source = settings || {}
    next.appearance = source.appearance
    next.lightTheme = source.lightTheme
    next.darkTheme = source.darkTheme
    next.theme = source.theme

    if (next.appearance !== 'system' && next.appearance !== 'light' && next.appearance !== 'dark') {
      if (next.theme === 'cream') {
        next.appearance = 'light'
        next.lightTheme = 'cream'
      } else if (next.theme === 'dark' || next.theme === 'black') {
        next.appearance = 'dark'
        next.darkTheme = next.theme
      } else {
        next.appearance = THEME_DEFAULTS.appearance
      }
    }
    if (next.lightTheme !== 'cream') next.lightTheme = THEME_DEFAULTS.lightTheme
    if (next.darkTheme !== 'black') next.darkTheme = THEME_DEFAULTS.darkTheme
    return {
      appearance: next.appearance,
      lightTheme: next.lightTheme,
      darkTheme: next.darkTheme
    }
  }

  function resolvePalette(settings, prefs) {
    var theme = normalizeThemeSettings(settings)
    var system = prefs || systemPrefs()
    var scheme = theme.appearance === 'light' || theme.appearance === 'dark'
      ? theme.appearance
      : system.scheme
    var contrast = theme.appearance === 'system' && !!system.contrast
    if (scheme === 'dark') return contrast ? 'black' : theme.darkTheme
    return contrast ? 'light' : theme.lightTheme
  }

  function cssToken(name) {
    if (typeof getComputedStyle !== 'function' || !root.document) return ''
    return getComputedStyle(root.document.documentElement).getPropertyValue(name).trim()
  }

  function themeMetaColor(palette, variant) {
    var value = cssToken(THEME_META_PREFIX + palette + '-' + variant)
    return value || cssToken(THEME_META_PREFIX + 'light-' + variant)
  }

  function applyPalette(palette) {
    var document = root.document
    if (!document || !document.body) return palette
    document.body.classList.remove('theme-light', 'theme-cream', 'theme-dark', 'theme-black')
    if (palette !== 'light') document.body.classList.add('theme-' + palette)
    var scheme = palette === 'dark' || palette === 'black' ? 'dark' : 'light'
    document.body.style.colorScheme = scheme
    document.documentElement.style.colorScheme = scheme
    api.currentPalette = palette
    if (typeof root.updateThemeColor === 'function') {
      root.updateThemeColor()
    } else {
      var meta = document.querySelector('meta[name=theme-color]')
      var color = themeMetaColor(palette, 'primary')
      if (meta && color) meta.setAttribute('content', color)
    }
    return palette
  }

  function applyThemeSettings(settings, prefs) {
    return applyPalette(resolvePalette(settings, prefs))
  }

  function readStoredSettings() {
    try {
      var stored = root.localStorage && root.localStorage.getItem(SETTINGS_KEY)
      if (stored) return JSON.parse(stored)
    } catch (error) {}
    return {}
  }

  function applyFromStorage() {
    return applyThemeSettings(readStoredSettings())
  }

  function watchSystem() {
    if (typeof matchMedia !== 'function') return
    var onChange = function () {
      var stored = readStoredSettings()
      if (normalizeThemeSettings(stored).appearance !== 'system') return
      applyFromStorage()
    }
    var queries = [
      '(prefers-color-scheme: dark)',
      '(prefers-contrast: more)',
      '(forced-colors: active)'
    ]
    queries.forEach(function (query) {
      var media = matchMedia(query)
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onChange)
      } else if (typeof media.addListener === 'function') {
        media.addListener(onChange)
      }
    })
  }

  function bootstrap() {
    applyFromStorage()
    watchSystem()
  }

  var api = {
    SETTINGS_KEY: SETTINGS_KEY,
    THEME_DEFAULTS: THEME_DEFAULTS,
    THEME_META_PREFIX: THEME_META_PREFIX,
    currentPalette: 'light',
    systemPrefs: systemPrefs,
    normalizeThemeSettings: normalizeThemeSettings,
    resolvePalette: resolvePalette,
    themeMetaColor: themeMetaColor,
    applyPalette: applyPalette,
    applyThemeSettings: applyThemeSettings,
    applyFromStorage: applyFromStorage,
    readStoredSettings: readStoredSettings,
    watchSystem: watchSystem,
    bootstrap: bootstrap
  }

  root.ReadalongTheme = api
  if (typeof module === 'object' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
