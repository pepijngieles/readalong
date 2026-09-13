(function () {
  const state = window.ReadalongItemState
  if (!state) return

  function libraryEl(selector) {
    return document.querySelector(selector)
  }

  function applyLibraryFilters() {
    const section = libraryEl('[data-library-section]')
    const list = libraryEl('[data-library-items]')
    const empty = libraryEl('[data-library-empty]')
    if (!section || !list) return

    const view = section.getAttribute('data-library-view') || 'hidden'
    let visible = 0

    list.querySelectorAll('li[data-id]').forEach(function (item) {
      const id = item.getAttribute('data-id') || ''
      let show = view === 'hidden' ? state.isHidden(id) : state.isCompleted(id)
      item.hidden = !show
      if (show) visible++
    })

    if (empty) {
      const messageEl = empty.querySelector('[data-library-empty-message]')
      const emptyKey = view === 'hidden' ? 'data-i18n-empty-hidden' : 'data-i18n-empty-completed'
      const emptyText = section.getAttribute(emptyKey) || ''
      if (messageEl && emptyText) messageEl.textContent = emptyText
      empty.hidden = visible > 0
    }
  }

  function initLibrary() {
    if (!libraryEl('[data-library-items]')) return
    applyLibraryFilters()
    document.addEventListener('readalong:items-changed', applyLibraryFilters)
  }

  document.addEventListener('DOMContentLoaded', initLibrary)
})()
