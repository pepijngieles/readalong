window.ReadalongItemState = (function () {
  const PROGRESS_KEY = 'readalong-progress'
  const FAVORITES_KEY = 'readalong-favorites'
  const HIDDEN_KEY = 'readalong-hidden'
  const BROWSE_FILTERS_KEY = 'readalong-browse-filters'

  const DEFAULT_BROWSE_FILTERS = {
    visibility: 'default',
    favorites: false
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : fallback
    } catch (error) {
      return fallback
    }
  }

  function loadProgressMap() {
    return readJson(PROGRESS_KEY, {})
  }

  function loadFavorites() {
    return readJson(FAVORITES_KEY, {})
  }

  function loadHidden() {
    return readJson(HIDDEN_KEY, {})
  }

  function isFavorite(id) {
    return !!loadFavorites()[id]
  }

  function isHidden(id) {
    return !!loadHidden()[id]
  }

  function isCompleted(id) {
    const progress = loadProgressMap()[id]
    return !!(progress && progress.completed)
  }

  function isStarted(id) {
    const progress = loadProgressMap()[id]
    return !!(progress && (progress.started || progress.sentence > 0))
  }

  function setFavorite(id, value) {
    const map = loadFavorites()
    if (value) map[id] = true
    else delete map[id]
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(map))
  }

  function setHidden(id, value) {
    const map = loadHidden()
    if (value) map[id] = Date.now()
    else delete map[id]
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(map))
  }

  function getProgress(id) {
    return loadProgressMap()[id] || null
  }

  function saveProgressEntry(id, entry) {
    const map = loadProgressMap()
    map[id] = Object.assign({}, map[id] || {}, entry, { updatedAt: Date.now() })
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map))
  }

  function markComplete(id, slug, complete) {
    const existing = getProgress(id) || {}
    saveProgressEntry(id, {
      slug: slug || existing.slug || '',
      completed: complete === true,
      started: true,
      sentence: complete ? (existing.sentence || 0) : (existing.sentence || 0)
    })
  }

  function favoriteCount() {
    return Object.keys(loadFavorites()).length
  }

  function hiddenCount() {
    return Object.keys(loadHidden()).length
  }

  function completedCount() {
    const map = loadProgressMap()
    return Object.keys(map).filter(function (id) {
      return map[id] && map[id].completed
    }).length
  }

  function loadBrowseFilters() {
    const stored = readJson(BROWSE_FILTERS_KEY, null)
    if (!stored) return Object.assign({}, DEFAULT_BROWSE_FILTERS)
    return Object.assign({}, DEFAULT_BROWSE_FILTERS, stored)
  }

  function saveBrowseFilters(filters) {
    localStorage.setItem(BROWSE_FILTERS_KEY, JSON.stringify(filters))
  }

  function matchesBrowseStatus(id, visibilityFilter, favoritesOnly) {
    const hidden = isHidden(id)
    const completed = isCompleted(id)
    const favorite = isFavorite(id)

    if (favoritesOnly && !favorite) return false
    if (completed) return false

    if (visibilityFilter === 'default' && hidden) return false
    if (visibilityFilter === 'hidden-only' && !hidden) return false

    return true
  }

  return {
    PROGRESS_KEY: PROGRESS_KEY,
    DEFAULT_BROWSE_FILTERS: DEFAULT_BROWSE_FILTERS,
    loadProgressMap: loadProgressMap,
    isFavorite: isFavorite,
    isHidden: isHidden,
    isCompleted: isCompleted,
    isStarted: isStarted,
    setFavorite: setFavorite,
    setHidden: setHidden,
    getProgress: getProgress,
    saveProgressEntry: saveProgressEntry,
    markComplete: markComplete,
    favoriteCount: favoriteCount,
    hiddenCount: hiddenCount,
    completedCount: completedCount,
    loadBrowseFilters: loadBrowseFilters,
    saveBrowseFilters: saveBrowseFilters,
    matchesBrowseStatus: matchesBrowseStatus
  }
})()
