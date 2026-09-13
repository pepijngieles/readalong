(function () {
  const state = window.ReadalongItemState
  if (!state) return

  let activeItemEl = null
  let undoTimer = null
  let undoAction = null

  function i18n(key, fallback) {
    const strings = window.ITEM_ACTIONS_I18N || {}
    return strings[key] || fallback || key
  }

  function itemFromElement(el) {
    return el && el.closest ? el.closest('li[data-id]') : null
  }

  function itemMeta(itemEl) {
    return {
      id: itemEl.getAttribute('data-id') || '',
      slug: itemEl.getAttribute('data-slug') || '',
      kind: itemEl.getAttribute('data-kind') || ''
    }
  }

  function completeLabel(kind) {
    if (kind === 'podcast' || kind === 'news' || kind === 'weather') {
      return i18n('mark_listened', 'Mark as listened')
    }
    if (kind === 'book') {
      return i18n('mark_read', 'Mark as read')
    }
    return i18n('mark_complete', 'Mark as completed')
  }

  function dispatchItemChange() {
    document.dispatchEvent(new CustomEvent('readalong:items-changed'))
  }

  function favoriteIndicatorHtml() {
    const icons = window.ITEM_MENU_ICONS || {}
    const icon = icons['heart-filled'] || ''
    return '<span class="meta-sep"> · </span><span class="meta-favorite-icon" aria-hidden=true>' + icon + '</span>'
  }

  function mergeMetaTail(metaEl) {
    const baseEl = metaEl.querySelector('[data-meta-base]')
    const tailEl = metaEl.querySelector('[data-meta-tail]')
    if (!baseEl || !tailEl) return
    baseEl.textContent = baseEl.textContent + tailEl.textContent
    tailEl.remove()
  }

  function ensureMetaBase(metaEl) {
    let baseEl = metaEl.querySelector('[data-meta-base]')
    if (baseEl) return baseEl
    const text = metaEl.textContent || ''
    metaEl.textContent = ''
    baseEl = document.createElement('span')
    baseEl.setAttribute('data-meta-base', '')
    baseEl.textContent = text
    metaEl.appendChild(baseEl)
    return baseEl
  }

  function syncFavoriteIndicator(itemEl) {
    const metaEl = itemEl.querySelector('.story-item .meta')
    if (!metaEl) return

    const id = itemEl.getAttribute('data-id') || ''
    const active = state.isFavorite(id)
    const level = itemEl.getAttribute('data-level') || ''
    const indicator = metaEl.querySelector('[data-favorite-indicator]')

    if (!active) {
      if (indicator) indicator.remove()
      mergeMetaTail(metaEl)
      return
    }

    const baseEl = ensureMetaBase(metaEl)
    if (indicator) return

    const indicatorEl = document.createElement('span')
    indicatorEl.className = 'meta-favorite'
    indicatorEl.setAttribute('data-favorite-indicator', '')
    indicatorEl.setAttribute('aria-label', i18n('favorite', 'Add to favorites'))
    indicatorEl.innerHTML = favoriteIndicatorHtml()

    const tailEl = metaEl.querySelector('[data-meta-tail]')
    if (tailEl) {
      baseEl.after(indicatorEl)
      return
    }

    const text = baseEl.textContent || ''
    if (level && text.includes(level)) {
      const idx = text.indexOf(level) + level.length
      baseEl.textContent = text.slice(0, idx)
      const tail = document.createElement('span')
      tail.setAttribute('data-meta-tail', '')
      tail.textContent = text.slice(idx)
      baseEl.after(indicatorEl)
      indicatorEl.after(tail)
      return
    }

    baseEl.after(indicatorEl)
  }

  function syncAllFavoriteIndicators(root) {
    const scope = root || document
    scope.querySelectorAll('li[data-id]').forEach(syncFavoriteIndicator)
  }

  function setItemMetaText(itemEl, text) {
    let metaEl = itemEl.querySelector('.story-item .meta')
    if (!metaEl) {
      const body = itemEl.querySelector('.story-item .body')
      if (!body || !text) return
      metaEl = document.createElement('small')
      metaEl.className = 'meta'
      const titleEl = body.querySelector('p')
      if (titleEl && titleEl.nextElementSibling) {
        body.insertBefore(metaEl, titleEl.nextElementSibling)
      } else {
        body.appendChild(metaEl)
      }
    }
    if (!text) {
      metaEl.remove()
      return
    }

    metaEl.querySelector('[data-favorite-indicator]')?.remove()
    metaEl.querySelector('[data-meta-tail]')?.remove()
    let baseEl = metaEl.querySelector('[data-meta-base]')
    if (!baseEl) {
      metaEl.textContent = ''
      baseEl = document.createElement('span')
      baseEl.setAttribute('data-meta-base', '')
      metaEl.appendChild(baseEl)
    }
    baseEl.textContent = text
    syncFavoriteIndicator(itemEl)
  }

  function closeItemMenu() {
    const menu = document.getElementById('item-menu')
    if (!menu) return
    menu.hidden = true
    document.querySelectorAll('[data-click=openItemMenu][aria-expanded=true]').forEach(function (button) {
      button.setAttribute('aria-expanded', 'false')
    })
    activeItemEl = null
  }

  function positionItemMenu(button, menu) {
    const rect = button.getBoundingClientRect()
    menu.style.top = Math.round(rect.bottom + 8) + 'px'
    menu.style.left = 'auto'
    menu.style.right = Math.round(window.innerWidth - rect.right) + 'px'
  }

  const MENU_ACTION_ICONS = {
    favorite: 'heart',
    unfavorite: 'heart-filled',
    complete: 'circle-check',
    uncomplete: 'circle',
    reset: 'rotate-ccw',
    'dismiss-continue': 'list-x',
    hide: 'eye-off',
    unhide: 'eye',
    share: 'share'
  }

  function menuIconHtml(action) {
    const icons = window.ITEM_MENU_ICONS || {}
    const name = MENU_ACTION_ICONS[action]
    return name && icons[name] ? icons[name] : ''
  }

  function parseIconHtml(html) {
    if (!html) return null
    const template = document.createElement('template')
    template.innerHTML = html.trim()
    return template.content.firstChild
  }

  function createMenuButton(action, label) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'item-menu-action flex gap-small'
    button.setAttribute('role', 'menuitem')
    button.setAttribute('data-click', 'runItemAction')
    button.setAttribute('data-item-action', action)

    const icon = parseIconHtml(menuIconHtml(action))
    if (icon) button.appendChild(icon)

    const text = document.createElement('span')
    text.textContent = label
    button.appendChild(text)

    return button
  }

  function buildItemMenu(itemEl, inContinue) {
    const meta = itemMeta(itemEl)
    const completed = state.isCompleted(meta.id)
    const hidden = state.isHidden(meta.id)
    const started = state.isStarted(meta.id)
    const menu = document.createDocumentFragment()
    const favorite = state.isFavorite(meta.id)

    if (favorite) {
      menu.appendChild(createMenuButton('unfavorite', i18n('unfavorite', 'Remove from favorites')))
    } else {
      menu.appendChild(createMenuButton('favorite', i18n('favorite', 'Add to favorites')))
    }

    if (!completed) {
      menu.appendChild(createMenuButton('complete', completeLabel(meta.kind)))
    } else {
      menu.appendChild(createMenuButton('uncomplete', i18n('mark_incomplete', 'Mark as not completed')))
    }

    if (started && !completed) {
      menu.appendChild(createMenuButton('reset', i18n('reset_progress', 'Start over')))
    }

    if (inContinue) {
      menu.appendChild(createMenuButton('dismiss-continue', i18n('dismiss_continue', 'Remove from continue reading')))
    }

    if (!hidden) {
      menu.appendChild(createMenuButton('hide', i18n('hide', 'Hide item')))
    } else {
      menu.appendChild(createMenuButton('unhide', i18n('unhide', 'Show item again')))
    }

    menu.appendChild(createMenuButton('share', i18n('share', 'Share link')))

    return menu
  }

  function openItemMenu(el) {
    const itemEl = itemFromElement(el)
    const menu = document.getElementById('item-menu')
    if (!itemEl || !menu) return

    const open = el.getAttribute('aria-expanded') === 'true'
    closeItemMenu()
    if (open) return

    activeItemEl = itemEl
    const inContinue = !!itemEl.closest('[data-continue-section]')
    menu.replaceChildren()
    menu.appendChild(buildItemMenu(itemEl, inContinue))
    positionItemMenu(el, menu)
    menu.hidden = false
    el.setAttribute('aria-expanded', 'true')
  }

  function hideSnackbar() {
    const snackbar = document.querySelector('[data-item-snackbar]')
    if (!snackbar) return
    snackbar.hidden = true
    snackbar.classList.remove('visible')
    if (undoTimer) {
      clearTimeout(undoTimer)
      undoTimer = null
    }
    undoAction = null
  }

  function showSnackbar(message, undoFn) {
    const snackbar = document.querySelector('[data-item-snackbar]')
    if (!snackbar) return

    hideSnackbar()
    const messageEl = snackbar.querySelector('[data-snackbar-message]')
    const undoButton = snackbar.querySelector('[data-click=undoItemAction]')
    if (messageEl) messageEl.textContent = message
    undoAction = undoFn || null
    if (undoButton) undoButton.hidden = !undoAction
    snackbar.hidden = false
    requestAnimationFrame(function () {
      snackbar.classList.add('visible')
    })
    undoTimer = setTimeout(hideSnackbar, 5000)
  }

  function runItemAction(el, event) {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!activeItemEl) return
    const action = el.getAttribute('data-item-action')
    const meta = itemMeta(activeItemEl)
    closeItemMenu()

    if (action === 'complete') {
      const wasHidden = state.isHidden(meta.id)
      state.markComplete(meta.id, meta.slug, true)
      showSnackbar(i18n('snackbar_completed', 'Marked as completed'), function () {
        state.markComplete(meta.id, meta.slug, false)
        if (wasHidden) state.setHidden(meta.id, true)
        dispatchItemChange()
      })
    } else if (action === 'uncomplete') {
      state.markComplete(meta.id, meta.slug, false)
    } else if (action === 'hide') {
      const wasCompleted = state.isCompleted(meta.id)
      state.setHidden(meta.id, true)
      showSnackbar(i18n('snackbar_hidden', 'Item hidden'), function () {
        state.setHidden(meta.id, false)
        if (wasCompleted) state.markComplete(meta.id, meta.slug, true)
        dispatchItemChange()
      })
    } else if (action === 'unhide') {
      state.setHidden(meta.id, false)
    } else if (action === 'reset') {
      state.resetProgress(meta.id)
    } else if (action === 'dismiss-continue') {
      state.dismissFromContinue(meta.id, meta.slug)
    } else if (action === 'favorite' || action === 'unfavorite') {
      const next = action === 'favorite'
      state.setFavorite(meta.id, next)
      syncAllFavoriteIndicators(document)
    } else if (action === 'share') {
      const href = activeItemEl.querySelector('.story-item')?.getAttribute('href') || ('stories/' + meta.slug + '/')
      const url = new URL(href, location.href).href
      if (navigator.share) {
        navigator.share({ url: url, title: activeItemEl.querySelector('.story-item p')?.textContent || '' }).catch(function () {})
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(function () {})
        showSnackbar(i18n('share_copied', 'Link copied'), null)
      }
      dispatchItemChange()
      return
    }

    dispatchItemChange()
  }

  function undoItemAction(el, event) {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (typeof undoAction === 'function') undoAction()
    hideSnackbar()
    dispatchItemChange()
  }

  function updateLibrarySettingsCounts() {
    document.querySelectorAll('[data-hidden-count]').forEach(function (el) {
      const count = state.hiddenCount()
      el.textContent = String(count)
      const row = el.closest('[data-library-link=hidden]')
      if (row) row.hidden = count === 0
    })
    document.querySelectorAll('[data-completed-count]').forEach(function (el) {
      const count = state.completedCount()
      el.textContent = String(count)
      const row = el.closest('[data-library-link=completed]')
      if (row) row.hidden = count === 0
    })
  }

  function openLibrary(view) {
    const settingsDialog = document.getElementById('settings')
    if (settingsDialog && settingsDialog.open && typeof closeDialog === 'function') {
      closeDialog(settingsDialog, null, 'settings')
    }
    location.href = '/library/' + view
  }

  function openHiddenLibrary() {
    openLibrary('hidden')
  }

  function openCompletedLibrary() {
    openLibrary('completed')
  }

  function initItemActions() {
    syncAllFavoriteIndicators(document)
    updateLibrarySettingsCounts()

    document.addEventListener('click', function (event) {
      if (event.target.closest('#item-menu, [data-click=openItemMenu]')) return
      closeItemMenu()
    })
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeItemMenu()
    })
    document.addEventListener('readalong:items-changed', function () {
      syncAllFavoriteIndicators(document)
      updateLibrarySettingsCounts()
    })

    const settingsDialog = document.getElementById('settings')
    if (settingsDialog) {
      settingsDialog.addEventListener('toggle', updateLibrarySettingsCounts)
    }
  }

  window.openItemMenu = openItemMenu
  window.runItemAction = runItemAction
  window.undoItemAction = undoItemAction
  window.openHiddenLibrary = openHiddenLibrary
  window.openCompletedLibrary = openCompletedLibrary
  window.syncAllFavoriteIndicators = syncAllFavoriteIndicators
  window.setItemMetaText = setItemMetaText
  window.updateLibrarySettingsCounts = updateLibrarySettingsCounts

  document.addEventListener('DOMContentLoaded', initItemActions)
})()
