(function () {
  const PROGRESS_KEY = 'readalong-progress'
  const durationPills = document.querySelectorAll('[data-duration-filter]')
  const kindTiles = document.querySelectorAll('[data-kind-filter]')
  const searchInput = document.querySelector('[data-story-search]')
  const allList = document.querySelector('[data-all-items]')
  const tussendoorList = document.querySelector('[data-tussendoor-items]')
  const continueSection = document.querySelector('[data-continue-section]')
  const continueList = document.querySelector('[data-continue-items]')
  const showAllWeather = document.querySelector('[data-show-all-weather]')
  const noResults = document.querySelector('[data-no-results]')
  const allSection = document.querySelector('[data-all-section]')

  if (!allList) return

  let durationLimit = 2 * 60
  let kindFilter = ''
  let query = ''

  function setPressed(elements, current) {
    elements.forEach(function (el) {
      el.setAttribute('aria-pressed', el === current ? 'true' : 'false')
    })
  }

  function applyTussendoor() {
    if (!tussendoorList) return
    tussendoorList.querySelectorAll('li').forEach(function (item) {
      const seconds = parseInt(item.getAttribute('data-duration-seconds'), 10) || 0
      item.hidden = seconds <= 0 || seconds > durationLimit
    })
  }

  function applyAllItems() {
    let visible = 0
    allList.querySelectorAll('li').forEach(function (item) {
      const kind = item.getAttribute('data-kind') || ''
      const title = item.getAttribute('data-title') || ''
      const matchKind = !kindFilter || kind === kindFilter
      const matchQuery = !query || title.indexOf(query) !== -1
      const show = matchKind && matchQuery
      item.hidden = !show
      if (show) visible++
    })
    if (noResults) noResults.hidden = visible > 0
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
      return entry.progress && !entry.progress.completed && entry.progress.sentence > 0
    }).sort(function (a, b) {
      return (b.progress.updatedAt || 0) - (a.progress.updatedAt || 0)
    })

    continueList.innerHTML = ''
    entries.forEach(function (entry) {
      const source = allList.querySelector('li[data-id="' + entry.id.replace(/"/g, '') + '"]')
      if (!source || source.classList.contains('dummy-story')) return
      continueList.appendChild(source.cloneNode(true))
    })
    continueSection.hidden = continueList.children.length === 0
  }

  durationPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      durationLimit = (parseInt(this.getAttribute('data-duration-filter'), 10) || 2) * 60
      setPressed(durationPills, this)
      applyTussendoor()
    })
  })

  kindTiles.forEach(function (tile) {
    tile.addEventListener('click', function () {
      const kind = this.getAttribute('data-kind-filter')
      if (kindFilter === kind) {
        kindFilter = ''
        this.setAttribute('aria-pressed', 'false')
      } else {
        kindFilter = kind
        setPressed(kindTiles, this)
      }
      if (showAllWeather) showAllWeather.setAttribute('aria-pressed', 'false')
      applyAllItems()
    })
  })

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      query = (this.value || '').trim().toLowerCase()
      applyAllItems()
    })
  }

  if (showAllWeather) {
    showAllWeather.addEventListener('click', function () {
      if (kindFilter === 'weather') {
        kindFilter = ''
        this.setAttribute('aria-pressed', 'false')
      } else {
        kindFilter = 'weather'
        this.setAttribute('aria-pressed', 'true')
        kindTiles.forEach(function (tile) {
          tile.setAttribute('aria-pressed', 'false')
        })
        if (searchInput) {
          searchInput.value = ''
          query = ''
        }
        if (allSection) allSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      applyAllItems()
    })
  }

  fillContinueReading()
  applyTussendoor()
  applyAllItems()
})()
