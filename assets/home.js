const PROGRESS_KEY = 'readalong-progress'
const DEFAULT_KIND = 'podcast'
const DURATION_OPTIONS = [2, 5, 10, 20]
const LEVEL_CODES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LEVEL_SCORES = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
const itemState = window.ReadalongItemState

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
    const id = item.getAttribute('data-id') || ''
    const hiddenByUser = itemState && itemState.isHidden(id)
    const completed = itemState && itemState.isCompleted(id)
    const show = matchesHomeFilters(item, true) && !hiddenByUser && !completed
    item.hidden = !show
    if (show) visible++
  })

  const weatherList = homeEl('[data-weather-items]')
  const weatherSection = homeEl('[data-weather-section]')
  if (weatherList) {
    let weatherVisible = 0
    weatherList.querySelectorAll('li').forEach(function (item) {
      const id = item.getAttribute('data-id') || ''
      const hiddenByUser = itemState && itemState.isHidden(id)
      const show = matchesHomeFilters(item, false) && !hiddenByUser
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

function progressUpdatedAt(entry) {
  const value = entry && entry.progress && entry.progress.updatedAt
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function compareProgressEntries(a, b) {
  const byActivity = progressUpdatedAt(b) - progressUpdatedAt(a)
  if (byActivity !== 0) return byActivity
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
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
    return entry.progress &&
      !entry.progress.completed &&
      (entry.progress.sentence > 0 || entry.progress.started)
  }).sort(compareProgressEntries)
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
  const showTranslationLang = continueSection?.hasAttribute('data-show-translation-lang')
  const durationDisplay = item.getAttribute('data-duration-display') || ''
  const kindLabel = item.getAttribute('data-kind-label') || ''
  const level = item.getAttribute('data-level') || ''
  const translationEndonym = item.getAttribute('data-translation-endonym') || ''
  const parts = []
  const remainingTemplate = (homeEl('[data-all-section]')?.getAttribute('data-i18n-remaining')) || '{n} min'

  if (durationDisplay) parts.push(durationDisplay)
  if (level) parts.push(level)
  if (remainingMinutes >= 1) {
    parts.push(remainingTemplate.replace('{n}', String(remainingMinutes)))
  }
  if (showTranslationLang && translationEndonym) parts.push(translationEndonym)
  if (kindLabel) parts.push(kindLabel)

  if (parts.length && typeof window.setItemMetaText === 'function') {
    window.setItemMetaText(item, parts.join(' · '))
  }
  if (remainingEl) {
    remainingEl.hidden = true
  }
  if (itemState && typeof itemState.decorateItemProgress === 'function') {
    itemState.decorateItemProgress(item)
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

function continueEntriesForReadLanguage(entries) {
  const sourceLangs = allowedCodesFromMenu('read')
  const readFilter = savedReadFilter()
  if (isAllFilter(readFilter, sourceLangs)) return entries.slice()
  return entries.filter(function (entry) {
    const source = findContinueSource(entry)
    if (!source) return false
    const language = source.getAttribute('data-language') || ''
    return readFilter.indexOf(language) !== -1
  })
}

function displayableContinueEntries(entries) {
  return entries.filter(function (entry) {
    return findContinueSource(entry) !== null
  })
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
  const historyLink = homeEl('[data-continue-history-link]')
  if (!continueSection || !continueFeatured) return

  const entries = displayableContinueEntries(continueEntriesForReadLanguage(loadProgressEntries()))
  continueFeatured.innerHTML = ''

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

  if (historyLink) {
    historyLink.hidden = entries.length < 2
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

function filterMenuTriggers() {
  return homeAll('.home-title-trigger, .filter-trigger')
}

function closeTitleMenus(except) {
  filterMenuTriggers().forEach(function (button) {
    if (except && button === except) return
    button.setAttribute('aria-expanded', 'false')
    const menu = document.getElementById(button.getAttribute('aria-controls'))
    if (menu) {
      if (typeof window.resetOverlayMenu === 'function') window.resetOverlayMenu(menu)
      menu.hidden = true
    }
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
    if (typeof window.positionOverlayMenu === 'function') window.positionOverlayMenu(el, menu)
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

function readLangLabel(code) {
  const labels = window.LANG_LABELS || {}
  return labels[code] || code.toUpperCase()
}

function titleOptionLabel(input, menu) {
  if (menu && menu.getAttribute('data-pref') === 'read') {
    return readLangLabel(input.value)
  }
  const label = input.closest('label')
  const text = label ? label.querySelector('span:last-of-type') : null
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
    if (menu.getAttribute('data-pref') === 'read') {
      return readLangLabel(selected[0])
    }
    const input = menu.querySelector('input[value="' + selected[0] + '"]')
    return input ? titleOptionLabel(input, menu) : (selected[0] || '')
  }
  if (menu.getAttribute('data-pref') === 'level') {
    return levelRangeLabel(selected, all, allLabel)
  }
  if (selected.length === all.length) return allLabel
  return selected.map(function (code) {
    const input = menu.querySelector('input[value="' + code + '"]')
    return input ? titleOptionLabel(input, menu) : code
  }).join(' · ')
}

let settingsTranslateCheckIcon = null

function rebuildSettingsTranslateMenu(options, current) {
  const menu = homeEl('#settings-translate-menu')
  const control = menu && menu.closest('.home-title-control')
  if (!menu || !control) return

  const endonyms = window.LANG_ENDONYMS || {}
  if (!settingsTranslateCheckIcon) {
    settingsTranslateCheckIcon = menu.querySelector('label .icon')
  }
  menu.innerHTML = ''

  const nextTranslate = options.indexOf(current) !== -1 ? current : (options[0] || '')

  options.forEach(function (code) {
    const checked = code === nextTranslate
    const label = document.createElement('label')
    label.setAttribute('role', 'option')
    label.setAttribute('aria-selected', checked ? 'true' : 'false')
    label.setAttribute('translate', 'no')
    label.lang = code

    const input = document.createElement('input')
    input.type = 'radio'
    input.name = 'settings-translate'
    input.value = code
    input.checked = checked
    label.appendChild(input)

    if (settingsTranslateCheckIcon) {
      label.appendChild(settingsTranslateCheckIcon.cloneNode(true))
    }

    const src = langFlagSrc(code)
    if (src) {
      const img = document.createElement('img')
      img.className = 'lang-flag'
      img.src = src
      img.width = 24
      img.height = 16
      img.decoding = 'async'
      img.alt = ''
      img.setAttribute('aria-hidden', 'true')
      img.dataset.langFlag = code
      label.appendChild(img)
    }

    const text = document.createElement('span')
    text.textContent = endonyms[code] || code
    label.appendChild(text)
    menu.appendChild(label)
  })

  const labelEl = control.querySelector('[data-title-label]')
  if (labelEl && nextTranslate) {
    labelEl.textContent = endonyms[nextTranslate] || nextTranslate
    labelEl.lang = nextTranslate
  }
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
  const endonyms = window.LANG_ENDONYMS || {}
  const options = Object.keys(seen).sort(function (a, b) {
    return String(endonyms[a] || a).localeCompare(endonyms[b] || b)
  })
  const menu = homeEl('#settings-translate-menu')
  const current = menu
    ? ((menu.querySelector('input[type=radio]:checked') || {}).value || '')
    : (localStorage.getItem('readalong-translate') || '').split(',')[0]
  if (options.length && options.indexOf(current) === -1) {
    window.setLangPref('translate', options[0])
    const allowed = Object.keys(endonyms)
    window.setLangPref('ui', allowed.indexOf(options[0]) !== -1 ? options[0] : 'en')
    location.reload()
    return
  }
  if (!menu) return
  rebuildSettingsTranslateMenu(options, current)
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

function syncReadMenuLabel() {
  const readMenu = homeEl('[data-pref=read]')
  if (!readMenu || readMenu.getAttribute('data-multiple') !== 'false') return
  const control = readMenu.closest('.home-title-control')
  if (!control) return
  const allowed = allowedCodesFromMenu('read')
  const codes = codesFromPref(localStorage.getItem('readalong-read') || '', allowed)
  if (!codes.length) return
  const labelEl = control.querySelector('[data-title-label]')
  if (labelEl) labelEl.textContent = readLangLabel(codes[0])
  updateTitleFlag(control, codes[0])
}

function initTitleMenus() {
  closeTitleMenus()
  const readMenu = homeEl('[data-pref=read]')
  if (readMenu && readMenu.getAttribute('data-multiple') === 'false') {
    const allowed = allowedCodesFromMenu('read')
    const codes = codesFromPref(localStorage.getItem('readalong-read') || '', allowed)
    if (codes.length > 1) window.setLangPref('read', codes[0])
    syncReadMenuLabel()
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

function refreshHomeLists() {
  applyAllItems()
  fillContinueReading()
  if (typeof window.syncAllFavoriteIndicators === 'function') {
    window.syncAllFavoriteIndicators(document)
  }
  if (itemState && typeof itemState.syncAllItemProgress === 'function') {
    itemState.syncAllItemProgress(document)
  }
  if (typeof window.syncAllItemMetaIndicators === 'function') {
    window.syncAllItemMetaIndicators(document)
  }
}

function initHome() {
  if (!homeEl('[data-all-items]')) return

  readFiltersFromUrl()
  syncFilterState()
  fillContinueReading()
  applyAllItems()
  if (itemState && typeof itemState.syncAllItemProgress === 'function') {
    itemState.syncAllItemProgress(document)
  }
  if (typeof window.syncAllItemMetaIndicators === 'function') {
    window.syncAllItemMetaIndicators(document)
  }
  initTitleMenus()
  document.addEventListener('readalong:items-changed', refreshHomeLists)
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) fillContinueReading()
  })
  window.addEventListener('storage', function (event) {
    if (event.key === PROGRESS_KEY) fillContinueReading()
  })
}

window.clearFilters = clearFilters
window.filterKind = filterKind
window.filterDuration = filterDuration
window.toggleTitleMenu = toggleTitleMenu
window.updateTitleFilter = updateTitleFilter

document.addEventListener('DOMContentLoaded', initHome)
