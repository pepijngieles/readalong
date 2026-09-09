const PROGRESS_KEY = 'readalong-progress'
const DEFAULT_KIND = 'podcast'
const DURATION_OPTIONS = [2, 5, 10, 20]
const LEVEL_CODES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LEVEL_SCORES = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }

let kindFilter = DEFAULT_KIND
let durationLimit = 0
let initialPrefs = null

function homeEl(selector) {
  return document.querySelector(selector)
}

function homeAll(selector) {
  return document.querySelectorAll(selector)
}

function selectedLevelPills() {
  return Array.from(homeAll('[data-level-pill][aria-pressed=true]'))
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

function savedLevelFilter() {
  const selected = levelsFromPref(localStorage.getItem('readalong-level') || '')
  return isAllLevelsSelected(selected) ? [] : selected
}

function levelScore(code) {
  return LEVEL_SCORES[code] ?? null
}

function levelCodesIn(level) {
  if (!level) return []
  const trimmed = level.trim()
  if (!trimmed) return []
  if (trimmed.indexOf('-') !== -1) {
    const parts = trimmed.split('-', 2)
    const lowScore = levelScore(parts[0])
    const highScore = levelScore(parts[1])
    if (lowScore === null || highScore === null) return []
    const min = Math.min(lowScore, highScore)
    const max = Math.max(lowScore, highScore)
    return LEVEL_CODES.filter(function (code) {
      const score = levelScore(code)
      return score !== null && score >= min && score <= max
    })
  }
  return [trimmed.toUpperCase()]
}

function levelMatchesCodes(level, selected) {
  if (isAllLevelsSelected(selected)) return true
  return levelCodesIn(level).some(function (code) {
    return selected.indexOf(code) !== -1
  })
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

function prefsState() {
  return {
    read: homeEl('[data-read-along]')?.value || '',
    translate: homeEl('[data-translate-along]')?.value || '',
    level: levelPrefValue()
  }
}

function syncTranslateSelectForReadAlong() {
  const readLang = homeEl('[data-read-along]')?.value
  const select = homeEl('[data-translate-along]')
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
  homeAll('[data-level-pill]').forEach(function (pill) {
    const code = pill.getAttribute('data-level-pill')
    pill.setAttribute('aria-pressed', selected.indexOf(code) !== -1 ? 'true' : 'false')
  })
  syncLevelLabel()
}

function syncLevelLabel() {
  const label = homeEl('#home-level-label')
  if (!label) return
  const selected = selectedLevelPills()
  const allLevels = label.getAttribute('data-i18n-all-levels') || 'All levels'
  const levelLabel = label.getAttribute('data-i18n-level') || 'Level'
  label.textContent = isAllLevelsSelected(selected) ? allLevels : levelLabel
}

function revertHomePrefs() {
  if (!initialPrefs) return
  const readSelect = homeEl('[data-read-along]')
  if (readSelect) readSelect.value = initialPrefs.read
  syncTranslateSelectForReadAlong()
  const translateSelect = homeEl('[data-translate-along]')
  const savedTranslate = (initialPrefs.translate || '').split(',')[0]
  if (translateSelect && savedTranslate) {
    const langsBySource = window.TRANSLATION_LANGS_BY_SOURCE || {}
    const options = langsBySource[initialPrefs.read] || []
    translateSelect.value = options.indexOf(savedTranslate) !== -1 ? savedTranslate : (options[0] || '')
  }
  syncLevelPills(levelsFromPref(initialPrefs.level))
}

function saveHomePrefs() {
  const next = prefsState()
  if (!next.translate) return
  const initialTranslate = (initialPrefs.translate || '').split(',')[0]
  if (next.read === initialPrefs.read && next.translate === initialTranslate &&
      normalizeLevelPref(next.level) === normalizeLevelPref(initialPrefs.level)) {
    closeDialog(null, null, 'home-prefs')
    return
  }
  window.setLangPref('read', next.read)
  window.setLangPref('translate', next.translate)
  window.setLangPref('level', next.level)
  location.reload()
}

function toggleLevelPill(el) {
  const pressed = el.getAttribute('aria-pressed') === 'true'
  if (pressed && selectedLevelPills().length <= 1) return
  el.setAttribute('aria-pressed', pressed ? 'false' : 'true')
  syncLevelLabel()
}

function knownKinds() {
  const kinds = []
  homeAll('[data-kind-filter]').forEach(function (chip) {
    kinds.push(chip.getAttribute('data-kind-filter'))
  })
  return kinds
}

function readFiltersFromUrl() {
  const params = new URLSearchParams(location.search)
  const kind = params.get('kind') || DEFAULT_KIND
  const duration = parseInt(params.get('duration'), 10)
  kindFilter = knownKinds().indexOf(kind) !== -1 ? kind : DEFAULT_KIND
  durationLimit = DURATION_OPTIONS.indexOf(duration) !== -1 ? duration * 60 : 0
}

function writeFiltersToUrl() {
  const params = new URLSearchParams(location.search)
  if (kindFilter && kindFilter !== DEFAULT_KIND) params.set('kind', kindFilter)
  else params.delete('kind')
  if (durationLimit) params.set('duration', String(durationLimit / 60))
  else params.delete('duration')
  params.delete('q')
  const qs = params.toString()
  const url = qs ? location.pathname + '?' + qs + location.hash : location.pathname + location.hash
  if (url !== location.pathname + location.search + location.hash) {
    history.replaceState(null, '', url)
  }
}

function syncFilterState() {
  homeAll('[data-kind-filter]').forEach(function (chip) {
    chip.setAttribute('aria-pressed', chip.getAttribute('data-kind-filter') === kindFilter ? 'true' : 'false')
  })
  const durationSelect = homeEl('[data-duration-filter]')
  if (durationSelect) {
    durationSelect.value = durationLimit ? String(durationLimit / 60) : ''
  }
}

function filtersActive() {
  return !!durationLimit
}

function applyAllItems() {
  const allList = homeEl('[data-all-items]')
  const noResults = homeEl('[data-no-results]')
  const resultsCount = homeEl('[data-results-count]')
  const allSection = homeEl('[data-all-section]')
  if (!allList) return

  const remainingTemplate = (allSection && allSection.getAttribute('data-i18n-remaining')) || '{n} min'
  const resultsTemplate = (allSection && allSection.getAttribute('data-i18n-results')) || '{n}'
  let visible = 0

  const levelFilter = savedLevelFilter()

  allList.querySelectorAll('li').forEach(function (item) {
    const kind = item.getAttribute('data-kind') || ''
    const seconds = parseInt(item.getAttribute('data-duration-seconds'), 10) || 0
    const level = item.getAttribute('data-level') || ''
    const matchKind = !kind || kind === kindFilter
    const matchDuration = !durationLimit || (seconds > 0 && seconds <= durationLimit)
    const matchLevel = levelMatchesCodes(level, levelFilter)
    const show = matchKind && matchDuration && matchLevel
    item.hidden = !show
    if (show) visible++
  })

  if (noResults) {
    const emptyMessage = noResults.querySelector('[data-empty-message]')
    const emptyKey = filtersActive() ? 'data-i18n-empty-filters' : 'data-i18n-empty'
    const emptyText = noResults.getAttribute(emptyKey)
    if (emptyMessage && emptyText) emptyMessage.textContent = emptyText
    noResults.hidden = visible > 0
  }
  if (resultsCount) {
    resultsCount.textContent = resultsTemplate.replace('{n}', String(visible))
  }
  homeAll('[data-clear-filters]').forEach(function (button) {
    button.hidden = !filtersActive()
  })
  writeFiltersToUrl()
}

function loadProgressEntries() {
  let map = {}
  try {
    map = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {}
  } catch (error) {
    map = {}
  }

  return Object.keys(map).map(function (id) {
    return { id: id, progress: map[id] }
  }).filter(function (entry) {
    return entry.progress && !entry.progress.completed && (entry.progress.sentence > 0 || entry.progress.started)
  }).sort(function (a, b) {
    return (b.progress.updatedAt || 0) - (a.progress.updatedAt || 0)
  })
}

function decorateContinueItem(item, progress) {
  const continueSection = homeEl('[data-continue-section]')
  const total = Math.max(parseInt(item.getAttribute('data-sentence-count'), 10) || 1, 1)
  const sentence = progress.sentence || 0
  const duration = parseInt(item.getAttribute('data-duration-seconds'), 10) || 0
  const ratio = 1 - (sentence / Math.max(total - 1, 1))
  const remainingSeconds = Math.max(0, duration * ratio)
  const remainingMinutes = Math.round(remainingSeconds / 60)
  const remainingEl = item.querySelector('[data-remaining]')
  const progressEl = item.querySelector('[data-item-progress]')
  const metaEl = item.querySelector('.story-item .meta')
  const showTranslationLang = continueSection?.hasAttribute('data-show-translation-lang')
  const durationDisplay = item.getAttribute('data-duration-display') || ''
  const kindLabel = item.getAttribute('data-kind-label') || ''
  const translationEndonym = item.getAttribute('data-translation-endonym') || ''
  const parts = []
  const remainingTemplate = (homeEl('[data-all-section]')?.getAttribute('data-i18n-remaining')) || '{n} min'

  if (durationDisplay) parts.push(durationDisplay)
  if (remainingMinutes >= 1) {
    parts.push(remainingTemplate.replace('{n}', String(remainingMinutes)))
  }
  if (showTranslationLang && translationEndonym) parts.push(translationEndonym)
  if (kindLabel) parts.push(kindLabel)

  if (metaEl && parts.length) {
    metaEl.textContent = parts.join(' · ')
  }
  if (remainingEl) {
    remainingEl.hidden = true
  }
  if (progressEl) {
    progressEl.value = Math.max(0, Math.min(100, Math.round((sentence / Math.max(total - 1, 1)) * 100)))
    progressEl.hidden = false
  }
}

function cloneContinueItem(entry, featured) {
  const allList = homeEl('[data-all-items]')
  if (!allList) return null
  const source = allList.querySelector('li[data-id="' + entry.id.replace(/"/g, '') + '"]')
  if (!source) return null
  const clone = source.cloneNode(true)
  if (featured) clone.classList.add('featured')
  decorateContinueItem(clone, entry.progress)
  return clone
}

function fillContinueReading() {
  const continueSection = homeEl('[data-continue-section]')
  const continueFeatured = homeEl('[data-continue-featured]')
  const continueHistory = homeEl('[data-continue-history]')
  const historyToggle = homeEl('[data-continue-history-toggle]')
  if (!continueSection || !continueFeatured) return

  const historyLabel = continueSection.getAttribute('data-i18n-history') || 'All history'
  const entries = loadProgressEntries()
  continueFeatured.innerHTML = ''
  if (continueHistory) continueHistory.innerHTML = ''

  if (entries.length === 0) {
    continueSection.hidden = true
    return
  }

  const featuredItem = cloneContinueItem(entries[0], true)
  if (!featuredItem) {
    continueSection.hidden = true
    return
  }

  continueFeatured.appendChild(featuredItem)

  if (continueHistory) {
    entries.slice(1).forEach(function (entry) {
      const item = cloneContinueItem(entry, false)
      if (item) continueHistory.appendChild(item)
    })
  }

  if (historyToggle) {
    const hasHistory = continueHistory && continueHistory.children.length > 0
    historyToggle.hidden = !hasHistory
    historyToggle.textContent = historyLabel
    historyToggle.setAttribute('aria-expanded', 'false')
    if (continueHistory) continueHistory.hidden = true
  }

  continueSection.hidden = false
}

function clearFilters() {
  durationLimit = 0
  syncFilterState()
  applyAllItems()
}

function filterKind(el) {
  const kind = el.getAttribute('data-kind-filter')
  if (!kind || kindFilter === kind) return
  kindFilter = kind
  syncFilterState()
  applyAllItems()
}

function filterDuration(el) {
  const minutes = parseInt(el.value, 10)
  durationLimit = DURATION_OPTIONS.indexOf(minutes) !== -1 ? minutes * 60 : 0
  applyAllItems()
}

function toggleHistory(el) {
  const continueHistory = homeEl('[data-continue-history]')
  const continueSection = homeEl('[data-continue-section]')
  if (!continueHistory || !continueSection) return
  const historyLabel = continueSection.getAttribute('data-i18n-history') || 'All history'
  const hideHistoryLabel = continueSection.getAttribute('data-i18n-hide-history') || 'Hide history'
  const expanded = el.getAttribute('aria-expanded') === 'true'
  continueHistory.hidden = expanded
  el.setAttribute('aria-expanded', expanded ? 'false' : 'true')
  el.textContent = expanded ? historyLabel : hideHistoryLabel
}

function syncPrefsToggleExpanded() {
  const prefsToggle = homeEl('[data-prefs-toggle]')
  const prefsPanel = document.getElementById('home-prefs')
  if (prefsToggle && prefsPanel) {
    prefsToggle.setAttribute('aria-expanded', prefsPanel.open ? 'true' : 'false')
  }
}

function openHomePrefs(el, event) {
  openDialog(el, event, 'home-prefs')
  syncPrefsToggleExpanded()
}

function initHome() {
  if (!homeEl('[data-all-items]')) return

  initialPrefs = prefsState()
  readFiltersFromUrl()
  syncFilterState()
  fillContinueReading()
  applyAllItems()

  const prefsPanel = document.getElementById('home-prefs')
  if (prefsPanel) {
    prefsPanel.addEventListener('close', function () {
      revertHomePrefs()
      syncPrefsToggleExpanded()
    })
  }
}

window.syncTranslateSelectForReadAlong = syncTranslateSelectForReadAlong
window.saveHomePrefs = saveHomePrefs
window.toggleLevelPill = toggleLevelPill
window.openHomePrefs = openHomePrefs
window.clearFilters = clearFilters
window.filterKind = filterKind
window.filterDuration = filterDuration
window.toggleHistory = toggleHistory

document.addEventListener('DOMContentLoaded', initHome)
