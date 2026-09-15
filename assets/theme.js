(function (root) {
  'use strict'

  var SETTINGS_KEY = 'readalong-settings'
  var THEME_DEFAULTS = {
    appearance: 'system',
    paper: 'neutral'
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
    var source = settings || {}
    var appearance = source.appearance
    var paper = source.paper

    if (appearance !== 'system' && appearance !== 'light' && appearance !== 'dark') {
      if (source.theme === 'dark' || source.theme === 'black') appearance = 'dark'
      else appearance = THEME_DEFAULTS.appearance
    }

    if (paper !== 'warm' && paper !== 'neutral') {
      if (source.paper === 'cream' || source.lightTheme === 'cream' || source.theme === 'cream') {
        paper = 'warm'
      } else {
        paper = THEME_DEFAULTS.paper
      }
    }

    return {
      appearance: appearance,
      paper: paper
    }
  }

  function resolveTheme(settings, prefs) {
    var theme = normalizeThemeSettings(settings)
    var system = prefs || systemPrefs()
    var scheme = theme.appearance === 'light' || theme.appearance === 'dark'
      ? theme.appearance
      : system.scheme
    var contrast = !!system.contrast
    var warm = theme.paper === 'warm'
    var palette = 'light'
    if (scheme === 'dark') palette = contrast ? 'black' : 'dark'
    return {
      palette: palette,
      warm: warm,
      scheme: scheme,
      contrast: contrast
    }
  }

  function resolvePalette(settings, prefs) {
    var resolved = resolveTheme(settings, prefs)
    if (resolved.warm && resolved.palette === 'light') return 'cream'
    return resolved.palette
  }

  function metaKey(resolved) {
    if (resolved.warm && resolved.palette === 'light') return 'cream'
    if (resolved.warm && resolved.palette === 'dark') return 'dark-warm'
    if (resolved.warm && resolved.palette === 'black') return 'black-warm'
    return resolved.palette
  }

  function cssToken(name) {
    if (typeof getComputedStyle !== 'function' || !root.document) return ''
    return getComputedStyle(root.document.documentElement).getPropertyValue(name).trim()
  }

  function themeMetaColor(palette, variant) {
    var value = cssToken(THEME_META_PREFIX + palette + '-' + variant)
    return value || cssToken(THEME_META_PREFIX + 'light-' + variant)
  }

  function applyResolved(resolved) {
    var document = root.document
    if (!document || !document.body) return resolved
    var body = document.body
    body.classList.remove('theme-light', 'theme-cream', 'theme-dark', 'theme-black', 'theme-warm')
    if (resolved.palette === 'dark') body.classList.add('theme-dark')
    if (resolved.palette === 'black') body.classList.add('theme-black')
    if (resolved.warm) {
      body.classList.add('theme-warm')
      if (resolved.palette === 'light') body.classList.add('theme-cream')
    }
    var scheme = resolved.palette === 'dark' || resolved.palette === 'black' ? 'dark' : 'light'
    body.style.colorScheme = scheme
    document.documentElement.style.colorScheme = scheme
    api.current = resolved
    api.currentPalette = metaKey(resolved)
    if (typeof root.updateThemeColor === 'function') {
      root.updateThemeColor()
    } else {
      var meta = document.querySelector('meta[name=theme-color]')
      var color = themeMetaColor(api.currentPalette, 'primary')
      if (meta && color) meta.setAttribute('content', color)
    }
    return resolved
  }

  function applyPalette(palette) {
    var warm = palette === 'cream'
    var resolved = {
      palette: warm ? 'light' : palette,
      warm: warm,
      scheme: palette === 'dark' || palette === 'black' ? 'dark' : 'light',
      contrast: palette === 'black'
    }
    return applyResolved(resolved)
  }

  function applyThemeSettings(settings, prefs) {
    return applyResolved(resolveTheme(settings, prefs))
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
    current: { palette: 'light', warm: false, scheme: 'light', contrast: false },
    systemPrefs: systemPrefs,
    normalizeThemeSettings: normalizeThemeSettings,
    resolveTheme: resolveTheme,
    resolvePalette: resolvePalette,
    metaKey: metaKey,
    themeMetaColor: themeMetaColor,
    applyPalette: applyPalette,
    applyResolved: applyResolved,
    applyThemeSettings: applyThemeSettings,
    applyFromStorage: applyFromStorage,
    readStoredSettings: readStoredSettings,
    watchSystem: watchSystem,
    bootstrap: bootstrap
  }

  root.ReadalongTheme = api
  if (typeof module === 'object' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
