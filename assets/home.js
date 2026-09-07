(function () {
  const PROGRESS_KEY = 'readalong-progress'
  const DEFAULT_KIND = 'podcast'
  const DURATION_OPTIONS = [2, 5, 10, 20]

  const kindChips = document.querySelectorAll('[data-kind-filter]')
  const durationSelect = document.querySelector('[data-duration-filter]')
  const allList = document.querySelector('[data-all-items]')
  const continueSection = document.querySelector('[data-continue-section]')
  const continueFeatured = document.querySelector('[data-continue-featured]')
  const continueHistory = document.querySelector('[data-continue-history]')
  const historyToggle = document.querySelector('[data-continue-history-toggle]')
  const noResults = document.querySelector('[data-no-results]')
  const resultsCount = document.querySelector('[data-results-count]')
  const clearButtons = document.querySelectorAll('[data-clear-filters]')
  const allSection = document.querySelector('[data-all-section]')
  const prefsToggle = document.querySelector('[data-prefs-toggle]')
  const prefsPanel = document.getElementById('home-prefs')
  const prefsClose = document.querySelector('[data-prefs-close]')

  if (!allList) return

  const remainingTemplate = (allSection && allSection.getAttribute('data-i18n-remaining')) || '{n} min'
  const resultsTemplate = (allSection && allSection.getAttribute('data-i18n-results')) || '{n}'
  const historyLabel = (continueSection && continueSection.getAttribute('data-i18n-history')) || 'All history'
  const hideHistoryLabel = (continueSection && continueSection.getAttribute('data-i18n-hide-history')) || 'Hide history'

  let kindFilter = DEFAULT_KIND
  let durationLimit = 0

  function knownKinds() {
    const kinds = []
    kindChips.forEach(function (chip) {
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
    kindChips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-kind-filter') === kindFilter ? 'true' : 'false')
    })
    if (durationSelect) {
      durationSelect.value = durationLimit ? String(durationLimit / 60) : ''
    }
  }

  function filtersActive() {
    return kindFilter !== DEFAULT_KIND || !!durationLimit
  }

  function applyAllItems() {
    let visible = 0
    allList.querySelectorAll('li').forEach(function (item) {
      const kind = item.getAttribute('data-kind') || ''
      const seconds = parseInt(item.getAttribute('data-duration-seconds'), 10) || 0
      const matchKind = kind === kindFilter
      const matchDuration = !durationLimit || (seconds > 0 && seconds <= durationLimit)
      const show = matchKind && matchDuration
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
    clearButtons.forEach(function (button) {
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

  function cloneContinueItem(entry, featured) {
    const source = allList.querySelector('li[data-id="' + entry.id.replace(/"/g, '') + '"]')
    if (!source) return null
    const clone = source.cloneNode(true)
    if (featured) clone.classList.add('continue-item--featured')
    decorateContinueItem(clone, entry.progress)
    return clone
  }

  function fillContinueReading() {
    if (!continueSection || !continueFeatured) return

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

  function decorateContinueItem(item, progress) {
    const total = Math.max(parseInt(item.getAttribute('data-sentence-count'), 10) || 1, 1)
    const sentence = progress.sentence || 0
    const duration = parseInt(item.getAttribute('data-duration-seconds'), 10) || 0
    const ratio = 1 - (sentence / Math.max(total - 1, 1))
    const remainingSeconds = Math.max(0, duration * ratio)
    const remainingMinutes = Math.round(remainingSeconds / 60)
    const remainingEl = item.querySelector('[data-remaining]')
    const progressEl = item.querySelector('[data-item-progress]')
    const metaEl = item.querySelector('.story-item__meta')
    const showTranslationLang = continueSection?.hasAttribute('data-show-translation-lang')
    const durationDisplay = item.getAttribute('data-duration-display') || ''
    const kindLabel = item.getAttribute('data-kind-label') || ''
    const translationEndonym = item.getAttribute('data-translation-endonym') || ''
    const parts = []

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

  function clearFilters() {
    kindFilter = DEFAULT_KIND
    durationLimit = 0
    syncFilterState()
    applyAllItems()
  }

  function setPrefsOpen(open) {
    if (!prefsToggle || !prefsPanel) return
    if (open) {
      if (!prefsPanel.open && typeof prefsPanel.showModal === 'function') {
        prefsPanel.showModal()
      }
    } else if (prefsPanel.open && typeof prefsPanel.close === 'function') {
      prefsPanel.close()
    }
    prefsToggle.setAttribute('aria-expanded', prefsPanel.open ? 'true' : 'false')
  }

  kindChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const kind = this.getAttribute('data-kind-filter')
      if (kindFilter === kind) return
      kindFilter = kind
      syncFilterState()
      applyAllItems()
    })
  })

  if (durationSelect) {
    durationSelect.addEventListener('change', function () {
      const minutes = parseInt(this.value, 10)
      durationLimit = DURATION_OPTIONS.indexOf(minutes) !== -1 ? minutes * 60 : 0
      applyAllItems()
    })
  }

  clearButtons.forEach(function (button) {
    button.addEventListener('click', clearFilters)
  })

  if (historyToggle && continueHistory) {
    historyToggle.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true'
      continueHistory.hidden = expanded
      this.setAttribute('aria-expanded', expanded ? 'false' : 'true')
      this.textContent = expanded ? historyLabel : hideHistoryLabel
    })
  }

  if (prefsToggle && prefsPanel) {
    prefsToggle.addEventListener('click', function () {
      setPrefsOpen(!prefsPanel.open)
    })
    prefsPanel.addEventListener('close', function () {
      prefsToggle.setAttribute('aria-expanded', 'false')
    })
    prefsPanel.addEventListener('click', function (event) {
      const rect = prefsPanel.getBoundingClientRect()
      const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom
      if (!inside) setPrefsOpen(false)
    })
  }

  if (prefsClose) {
    prefsClose.addEventListener('click', function () {
      setPrefsOpen(false)
      if (prefsToggle) prefsToggle.focus()
    })
  }

  readFiltersFromUrl()
  syncFilterState()
  fillContinueReading()
  applyAllItems()
})()
