(function () {
  const PROGRESS_KEY = 'readalong-progress'
  const INTRO_KEY = 'readalong-home-intro-dismissed'
  const DURATION_OPTIONS = [2, 5, 10]

  const kindChips = document.querySelectorAll('[data-kind-filter]')
  const durationChips = document.querySelectorAll('[data-duration-filter]')
  const searchInput = document.querySelector('[data-story-search]')
  const allList = document.querySelector('[data-all-items]')
  const continueSection = document.querySelector('[data-continue-section]')
  const continueList = document.querySelector('[data-continue-items]')
  const noResults = document.querySelector('[data-no-results]')
  const resultsCount = document.querySelector('[data-results-count]')
  const clearButtons = document.querySelectorAll('[data-clear-filters]')
  const allSection = document.querySelector('[data-all-section]')
  const prefsToggle = document.querySelector('[data-prefs-toggle]')
  const prefsPanel = document.getElementById('home-prefs')
  const prefsClose = document.querySelector('[data-prefs-close]')
  const intro = document.querySelector('[data-home-intro]')
  const dismissIntro = document.querySelector('[data-dismiss-intro]')

  if (!allList) return

  const remainingTemplate = (allSection && allSection.getAttribute('data-i18n-remaining')) || '{n} min'
  const resultsTemplate = (allSection && allSection.getAttribute('data-i18n-results')) || '{n}'

  let kindFilter = ''
  let durationLimit = 0
  let query = ''

  function knownKinds() {
    const kinds = []
    kindChips.forEach(function (chip) {
      kinds.push(chip.getAttribute('data-kind-filter'))
    })
    return kinds
  }

  function readFiltersFromUrl() {
    const params = new URLSearchParams(location.search)
    const kind = params.get('kind') || ''
    const duration = parseInt(params.get('duration'), 10)
    const q = (params.get('q') || '').trim()
    kindFilter = knownKinds().indexOf(kind) !== -1 ? kind : ''
    durationLimit = DURATION_OPTIONS.indexOf(duration) !== -1 ? duration * 60 : 0
    query = q.toLowerCase()
    if (searchInput) searchInput.value = q
  }

  function writeFiltersToUrl() {
    const params = new URLSearchParams(location.search)
    if (kindFilter) params.set('kind', kindFilter)
    else params.delete('kind')
    if (durationLimit) params.set('duration', String(durationLimit / 60))
    else params.delete('duration')
    if (query) params.set('q', query)
    else params.delete('q')
    const qs = params.toString()
    const url = qs ? location.pathname + '?' + qs + location.hash : location.pathname + location.hash
    if (url !== location.pathname + location.search + location.hash) {
      history.replaceState(null, '', url)
    }
  }

  function syncChipState() {
    kindChips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-kind-filter') === kindFilter ? 'true' : 'false')
    })
    durationChips.forEach(function (chip) {
      const minutes = parseInt(chip.getAttribute('data-duration-filter'), 10)
      chip.setAttribute('aria-pressed', minutes * 60 === durationLimit ? 'true' : 'false')
    })
  }

  function filtersActive() {
    return !!(kindFilter || durationLimit || query)
  }

  function applyAllItems() {
    let visible = 0
    allList.querySelectorAll('li').forEach(function (item) {
      const kind = item.getAttribute('data-kind') || ''
      const title = item.getAttribute('data-title') || ''
      const seconds = parseInt(item.getAttribute('data-duration-seconds'), 10) || 0
      const matchKind = !kindFilter || kind === kindFilter
      const matchDuration = !durationLimit || (seconds > 0 && seconds <= durationLimit)
      const matchQuery = !query || title.indexOf(query) !== -1
      const show = matchKind && matchDuration && matchQuery
      item.hidden = !show
      if (show) visible++
    })
    if (noResults) noResults.hidden = visible > 0 || !filtersActive()
    if (resultsCount) {
      resultsCount.textContent = resultsTemplate.replace('{n}', String(visible))
    }
    clearButtons.forEach(function (button) {
      if (button.closest('[data-no-results]')) return
      button.hidden = !filtersActive()
    })
    writeFiltersToUrl()
  }

  function fillContinueReading() {
    if (!continueSection || !continueList) return

    let map = {}
    try {
      map = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {}
    } catch (error) {
      map = {}
    }

    const entries = Object.keys(map).map(function (id) {
      return { id: id, progress: map[id] }
    }).filter(function (entry) {
      return entry.progress && !entry.progress.completed && (entry.progress.sentence > 0 || entry.progress.started)
    }).sort(function (a, b) {
      return (b.progress.updatedAt || 0) - (a.progress.updatedAt || 0)
    })

    entries.forEach(function (entry) {
      const source = allList.querySelector('li[data-id="' + entry.id.replace(/"/g, '') + '"]')
      if (!source || source.classList.contains('dummy-story')) return
      const clone = source.cloneNode(true)
      decorateContinueItem(clone, entry.progress)
      continueList.appendChild(clone)
    })
    continueSection.hidden = continueList.children.length === 0
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
    if (remainingEl) {
      if (remainingMinutes >= 1) {
        remainingEl.textContent = remainingTemplate.replace('{n}', String(remainingMinutes))
        remainingEl.hidden = false
      } else {
        remainingEl.hidden = true
      }
    }
    if (progressEl) {
      progressEl.value = Math.max(0, Math.min(100, Math.round((sentence / Math.max(total - 1, 1)) * 100)))
      progressEl.hidden = false
    }
  }

  function clearFilters() {
    kindFilter = ''
    durationLimit = 0
    query = ''
    if (searchInput) searchInput.value = ''
    syncChipState()
    applyAllItems()
  }

  function setPrefsOpen(open) {
    if (!prefsToggle || !prefsPanel) return
    prefsPanel.hidden = !open
    prefsToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  }

  kindChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const kind = this.getAttribute('data-kind-filter')
      kindFilter = kindFilter === kind ? '' : kind
      syncChipState()
      applyAllItems()
    })
  })

  durationChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const minutes = parseInt(this.getAttribute('data-duration-filter'), 10)
      const limit = minutes * 60
      durationLimit = durationLimit === limit ? 0 : limit
      syncChipState()
      applyAllItems()
    })
  })

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      query = (this.value || '').trim().toLowerCase()
      applyAllItems()
    })
  }

  clearButtons.forEach(function (button) {
    button.addEventListener('click', clearFilters)
  })

  if (prefsToggle && prefsPanel) {
    prefsToggle.addEventListener('click', function () {
      setPrefsOpen(prefsPanel.hidden)
    })
  }

  if (prefsClose) {
    prefsClose.addEventListener('click', function () {
      setPrefsOpen(false)
      if (prefsToggle) prefsToggle.focus()
    })
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && prefsPanel && !prefsPanel.hidden) {
      setPrefsOpen(false)
      if (prefsToggle) prefsToggle.focus()
    }
  })

  if (intro) {
    try {
      if (localStorage.getItem(INTRO_KEY) === '1') intro.hidden = true
    } catch (error) {}
  }

  if (dismissIntro && intro) {
    dismissIntro.addEventListener('click', function () {
      intro.hidden = true
      try {
        localStorage.setItem(INTRO_KEY, '1')
      } catch (error) {}
    })
  }

  readFiltersFromUrl()
  syncChipState()
  fillContinueReading()
  applyAllItems()
})()
