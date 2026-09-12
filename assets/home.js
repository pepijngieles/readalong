const PROGRESS_KEY = 'readalong-progress'
const DEFAULT_KIND = 'podcast'
const DURATION_OPTIONS = [2, 5, 10, 20]
const LEVEL_CODES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LEVEL_SCORES = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }

let kindFilter = DEFAULT_KIND
let durationLimit = 0

function homeEl(selector) {
  return document.querySelector(selector)
}

function homeAll(selector) {
  return document.querySelectorAll(selector)
}

function codesFromPref(raw, allowed) {
  const codes = (raw || '').split(',').map(function (code) { return code.trim() }).filter(function (code) {
    return allowed.indexOf(code) !== -1
  })
  if (!codes.length || codes.length === allowed.length) return allowed.slice()
  return codes
}

function isAllFilter(selected, allowed) {
  if (!allowed.length) return true
  return !selected.length || selected.length === allowed.length
}

function allowedCodesFromMenu(pref) {
  const menu = homeEl('[data-pref="' + pref + '"]')
  if (!menu) return []
  return Array.from(menu.querySelectorAll('input[type=checkbox], input[type=radio]')).map(function (input) {
    return input.value
  })
}

function savedReadFilter() {
  const allowed = allowedCodesFromMenu('read')
  if (!allowed.length) return []
  const codes = codesFromPref(localStorage.getItem('readalong-read') || '', allowed)
  const menu = homeEl('[data-pref=read]')
  if (menu && menu.getAttribute('data-multiple') === 'false') return codes.slice(0, 1)
  return codes
}

function savedLevelFilter() {
  return codesFromPref(localStorage.getItem('readalong-level') || '', LEVEL_CODES)
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
  if (isAllFilter(selected, LEVEL_CODES)) return true
  return levelCodesIn(level).some(function (code) {
    return selected.indexOf(code) !== -1
  })
}

function defaultKindFilter() {
  const allSection = homeEl('[data-all-section]')
  const fromDom = allSection && allSection.getAttribute('data-default-kind')
  if (fromDom) return fromDom
  const kinds = knownKinds()
  return kinds[0] || DEFAULT_KIND
}

function knownKinds() {
  const kinds = []
  homeAll('[data-kind-filter]').forEach(function (chip) {
    if (chip.hidden) return
    kinds.push(chip.getAttribute('data-kind-filter'))
  })
  return kinds
}

function readFiltersFromUrl() {
  const params = new URLSearchParams(location.search)
  const kind = params.get('kind') || defaultKindFilter()
  const duration = parseInt(params.get('duration'), 10)
  const kinds = knownKinds()
  kindFilter = kinds.indexOf(kind) !== -1 ? kind : defaultKindFilter()
  durationLimit = DURATION_OPTIONS.indexOf(duration) !== -1 ? duration * 60 : 0
}

function writeFiltersToUrl() {
  const params = new URLSearchParams(location.search)
  const kinds = knownKinds()
  const defaultKind = defaultKindFilter()
  if (kinds.length && kindFilter && kindFilter !== defaultKind) params.set('kind', kindFilter)
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

function updateKindPills(readFilter, levelFilter, sourceLangs) {
  const allList = homeEl('[data-all-items]')
  const kindsRow = homeEl('[data-kind-filters]')
  if (!allList) return

  const availableKinds = {}
  allList.querySelectorAll('li').forEach(function (item) {
    const language = item.getAttribute('data-language') || ''
    const level = item.getAttribute('data-level') || ''
    const matchLang = isAllFilter(readFilter, sourceLangs) || readFilter.indexOf(language) !== -1
    const matchLevel = levelMatchesCodes(level, levelFilter)
    if (!matchLang || !matchLevel) return
    const kind = item.getAttribute('data-kind') || ''
    if (kind) availableKinds[kind] = true
  })

  let firstVisible = null
  let visibleCount = 0
  homeAll('[data-kind-filter]').forEach(function (chip) {
    const kind = chip.getAttribute('data-kind-filter')
    const show = !!availableKinds[kind]
    chip.hidden = !show
    if (show) {
      visibleCount++
      if (!firstVisible) firstVisible = kind
    }
  })

  if (kindsRow) kindsRow.hidden = visibleCount <= 1

  if (firstVisible && knownKinds().indexOf(kindFilter) === -1) {
    kindFilter = firstVisible
    syncFilterState()
  }
}

function applyAllItems() {
  const allList = homeEl('[data-all-items]')
  const noResults = homeEl('[data-no-results]')
  const resultsCount = homeEl('[data-results-count]')
  const allSection = homeEl('[data-all-section]')
  if (!allList) return

  const resultsTemplate = (allSection && allSection.getAttribute('data-i18n-results')) || '{n}'
  let visible = 0

  const sourceLangs = allowedCodesFromMenu('read')
  const readFilter = savedReadFilter()
  const levelFilter = savedLevelFilter()

  updateKindPills(readFilter, levelFilter, sourceLangs)
  const activeKinds = knownKinds()

  function matchesHomeFilters(item, includeKindDuration) {
    const language = item.getAttribute('data-language') || ''
    const level = item.getAttribute('data-level') || ''
    const matchLang = isAllFilter(readFilter, sourceLangs) || readFilter.indexOf(language) !== -1
    const matchLevel = levelMatchesCodes(level, levelFilter)
    if (!matchLang || !matchLevel) return false
    if (!includeKindDuration) return true
    const kind = item.getAttribute('data-kind') || ''
    const seconds = parseInt(item.getAttribute('data-duration-seconds'), 10) || 0
    const matchKind = !activeKinds.length || !kind || kind === kindFilter
    const matchDuration = !durationLimit || (seconds > 0 && seconds <= durationLimit)
    return matchKind && matchDuration
  }

  allList.querySelectorAll('li').forEach(function (item) {
    const show = matchesHomeFilters(item, true)
    item.hidden = !show
    if (show) visible++
  })

  const weatherList = homeEl('[data-weather-items]')
  const weatherSection = homeEl('[data-weather-section]')
  if (weatherList) {
    let weatherVisible = 0
    weatherList.querySelectorAll('li').forEach(function (item) {
      const show = matchesHomeFilters(item, false)
      item.hidden = !show
      if (show) weatherVisible++
    })
    if (weatherSection) weatherSection.hidden = weatherVisible === 0
  }

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

function findContinueSource(entry) {
  const id = entry.id.replace(/"/g, '')
  const slug = (entry.progress && entry.progress.slug) ? entry.progress.slug.replace(/"/g, '') : ''
  const lists = homeAll('[data-all-items], [data-weather-items]')
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i]
    let source = list.querySelector('li[data-id="' + id + '"]')
    if (!source && slug) {
      source = list.querySelector('li[data-slug="' + slug + '"]')
    }
    if (source) return source
  }
  return null
}

function cloneContinueItem(entry, featured) {
  const source = findContinueSource(entry)
  if (!source) return null
  const clone = source.cloneNode(true)
  clone.removeAttribute('hidden')
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

  continueSection.hidden = continueFeatured.children.length === 0
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

function filterMenuTriggers() {
  return homeAll('.home-title-trigger, .filter-trigger')
}

function closeTitleMenus(except) {
  filterMenuTriggers().forEach(function (button) {
    if (except && button === except) return
    button.setAttribute('aria-expanded', 'false')
    const menu = document.getElementById(button.getAttribute('aria-controls'))
    if (menu) menu.hidden = true
  })
}

function toggleTitleMenu(el) {
  const menu = document.getElementById(el.getAttribute('aria-controls'))
  if (!menu) return
  const open = el.getAttribute('aria-expanded') === 'true'
  closeTitleMenus(open ? null : el)
  if (!open) {
    el.setAttribute('aria-expanded', 'true')
    menu.hidden = false
  }
}

function langFlagSrc(code) {
  const codes = window.LANG_FLAG_CODES || {}
  const file = codes[code]
  return file ? 'assets/flags/' + file + '.svg' : ''
}

function updateTitleFlag(control, code) {
  const wrap = control.querySelector('[data-title-flag]')
  if (!wrap) return
  const src = langFlagSrc(code)
  if (!src) {
    wrap.hidden = true
    return
  }
  let img = wrap.querySelector('img')
  if (!img) {
    img = document.createElement('img')
    img.className = 'lang-flag'
    img.width = 24
    img.height = 16
    img.decoding = 'async'
    img.setAttribute('aria-hidden', 'true')
    wrap.appendChild(img)
  }
  img.src = src
  img.alt = ''
  img.dataset.langFlag = code
  wrap.hidden = false
}

function titleOptionLabel(input) {
  const label = input.closest('label')
  const text = label ? label.querySelector('span') : null
  return (text && text.textContent.trim()) || input.value
}

function levelRangeLabel(selected, all, allLabel) {
  if (isAllFilter(selected, all)) return allLabel
  const ordered = all.filter(function (code) { return selected.indexOf(code) !== -1 })
  if (!ordered.length) return allLabel
  const ranges = []
  let start = ordered[0]
  let prev = ordered[0]
  for (let i = 1; i <= ordered.length; i++) {
    const curr = ordered[i]
    if (curr && LEVEL_SCORES[curr] === (LEVEL_SCORES[prev] || 0) + 1) {
      prev = curr
      continue
    }
    ranges.push(start === prev ? start : start + '-' + prev)
    start = curr
    prev = curr
  }
  return ranges.join(' · ')
}

function titleMenuLabel(control, menu, selected, all) {
  const allLabel = control.getAttribute('data-i18n-all') || ''
  if (menu.getAttribute('data-multiple') === 'false') {
    const input = menu.querySelector('input[value="' + selected[0] + '"]')
    return input ? titleOptionLabel(input) : (selected[0] || '')
  }
  if (menu.getAttribute('data-pref') === 'level') {
    return levelRangeLabel(selected, all, allLabel)
  }
  if (selected.length === all.length) return allLabel
  return selected.map(function (code) {
    const input = menu.querySelector('input[value="' + code + '"]')
    return input ? titleOptionLabel(input) : code
  }).join(' · ')
}

function syncTranslateForRead(readLangs) {
  const bySource = window.TRANSLATION_LANGS_BY_SOURCE || {}
  const sourceLangs = Object.keys(bySource)
  const sources = isAllFilter(readLangs, sourceLangs) ? sourceLangs : readLangs
  const seen = {}
  sources.forEach(function (code) {
    (bySource[code] || []).forEach(function (lang) {
      seen[lang] = true
    })
  })
  const options = Object.keys(seen)
  const translateSelect = homeEl('[data-translate-along]')
  const current = translateSelect
    ? translateSelect.value
    : (localStorage.getItem('readalong-translate') || '').split(',')[0]
  if (options.length && options.indexOf(current) === -1) {
    window.setLangPref('translate', options[0])
    const allowed = Object.keys(window.LANG_ENDONYMS || {})
    window.setLangPref('ui', allowed.indexOf(options[0]) !== -1 ? options[0] : 'en')
    location.reload()
    return
  }
  if (!translateSelect) return
  const endonyms = window.LANG_ENDONYMS || {}
  const keep = translateSelect.value
  translateSelect.innerHTML = ''
  options.sort(function (a, b) {
    return String(endonyms[a] || a).localeCompare(endonyms[b] || b)
  }).forEach(function (code) {
    const option = document.createElement('option')
    option.value = code
    option.lang = code
    option.setAttribute('translate', 'no')
    option.textContent = endonyms[code] || code
    if (code === keep) option.selected = true
    translateSelect.appendChild(option)
  })
}

function updateTitleFilter(el, event) {
  const menu = el.classList && el.classList.contains('title-menu') ? el : el.closest('.title-menu')
  const control = menu && menu.closest('.home-title-control, .filter-dropdown')
  if (!menu || !control) return

  const inputs = Array.from(menu.querySelectorAll('input[type=checkbox], input[type=radio]'))
  const all = inputs.map(function (input) { return input.value })
  const multiple = menu.getAttribute('data-multiple') !== 'false'
  let selected

  if (!multiple) {
    const chosen = (event && event.target && event.target.value) || (inputs.find(function (input) { return input.checked }) || {}).value
    if (!chosen) return
    inputs.forEach(function (input) { input.checked = input.value === chosen })
    selected = [chosen]
    closeTitleMenus()
  } else {
    selected = inputs.filter(function (input) { return input.checked }).map(function (input) { return input.value })
    if (!selected.length) {
      inputs.forEach(function (input) { input.checked = true })
      selected = all.slice()
    }
  }

  inputs.forEach(function (input) {
    const option = input.closest('[role=option]')
    if (option) option.setAttribute('aria-selected', input.checked ? 'true' : 'false')
  })

  window.setLangPref(menu.getAttribute('data-pref'), selected.join(','))

  const labelEl = control.querySelector('[data-title-label]')
  if (labelEl) labelEl.textContent = titleMenuLabel(control, menu, selected, all)

  if (menu.getAttribute('data-multiple') === 'false' && selected.length === 1) {
    updateTitleFlag(control, selected[0])
  }

  if (menu.getAttribute('data-pref') === 'read') syncTranslateForRead(selected)
  applyAllItems()
  fillContinueReading()
}

function initTitleMenus() {
  closeTitleMenus()
  const readMenu = homeEl('[data-pref=read]')
  if (readMenu && readMenu.getAttribute('data-multiple') === 'false') {
    const allowed = allowedCodesFromMenu('read')
    const codes = codesFromPref(localStorage.getItem('readalong-read') || '', allowed)
    if (codes.length > 1) window.setLangPref('read', codes[0])
  }
  document.addEventListener('click', function (event) {
    const singleOption = event.target.closest('[data-multiple=false] [role=option]')
    if (singleOption) {
      closeTitleMenus()
      return
    }
    if (event.target.closest('.home-title-control, .filter-dropdown')) return
    closeTitleMenus()
  })
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeTitleMenus()
  })
}

function initHome() {
  if (!homeEl('[data-all-items]')) return

  readFiltersFromUrl()
  syncFilterState()
  fillContinueReading()
  applyAllItems()
  initTitleMenus()
}

window.clearFilters = clearFilters
window.filterKind = filterKind
window.filterDuration = filterDuration
window.toggleHistory = toggleHistory
window.toggleTitleMenu = toggleTitleMenu
window.updateTitleFilter = updateTitleFilter

document.addEventListener('DOMContentLoaded', initHome)
