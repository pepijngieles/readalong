'use strict'

/* Utilities, actions, bindings, dialogs, feedback — Readalong subset */

function setThemeColor(color) {
  let themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) {
    themeMeta.setAttribute('content', color)
  } else {
    themeMeta = document.createElement('meta')
    themeMeta.setAttribute('name', 'theme-color')
    themeMeta.setAttribute('content', color)
    document.head.appendChild(themeMeta)
  }
}

function getStorageItem(item, defaultValue) {
  try {
    const stored = localStorage.getItem(item)
    if (stored === null) {
      localStorage.setItem(item, defaultValue)
      return defaultValue
    }
    return stored
  } catch (e) {
    console.warn('[utils] localStorage unavailable:', e)
    return defaultValue
  }
}

function debounce(fn, wait = 300) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), wait)
  }
}

function getElementValue(el) {
  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
    return el.type === 'checkbox' ? el.checked.toString() : el.value
  }
  return el.textContent
}

function resolveToken(token) {
  if (token.startsWith('#')) {
    const sourceEl = document.getElementById(token.slice(1))
    if (!sourceEl) return null
    return getElementValue(sourceEl)
  }
  return getPathValue(token, window)
}

function getPathValue(path, source) {
  return path.split('.').reduce((obj, key) => obj?.[key], source)
}

function compileBindingExpression(expression) {
  const trimmed = String(expression || '').trim()
  if (!trimmed.includes('{{')) {
    return () => {
      const value = resolveToken(trimmed)
      return value == null ? null : value
    }
  }
  return () => trimmed.replace(/\{\{([^}]+)\}\}/g, (_, token) => {
    const value = resolveToken(token.trim())
    return value == null ? '' : String(value)
  })
}

const textBindEntries = []
const attrBindEntries = []
let bindingIndexInitialized = false

function indexBindingsWithin(root) {
  if (!root) return
  const bindNodes = root.querySelectorAll ? root.querySelectorAll('[data-bind]') : []
  for (const el of bindNodes) {
    if (el.dataset.bindIndexed) continue
    el.dataset.bindIndexed = '1'
    textBindEntries.push({ el, fn: compileBindingExpression(el.dataset.bind) })
  }
  const allNodes = root.querySelectorAll ? root.querySelectorAll('*') : []
  for (const el of allNodes) {
    for (const [datasetKey, expression] of Object.entries(el.dataset || {})) {
      if (!datasetKey.startsWith('bind') || datasetKey === 'bind') continue
      const attrPart = datasetKey.slice(4).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
      attrBindEntries.push({ el, attrName: attrPart, fn: compileBindingExpression(expression) })
    }
  }
}

function applyBindings(scope = document) {
  const root = scope || document
  if (root === document && !bindingIndexInitialized) {
    indexBindingsWithin(document)
    bindingIndexInitialized = true
  } else if (root !== document) {
    indexBindingsWithin(root)
  }
  for (const entry of textBindEntries) {
    if (!entry.el.isConnected) continue
    const value = entry.fn()
    entry.el.textContent = value == null ? '' : String(value)
  }
}

function refreshBindings(scope = document) {
  applyBindings(scope)
}

const ACTION_REGEX = /^(\w+)(?:\((.+)\))?$/

function determineAction(targetElement, event, action) {
  action = action.trim()
  if (action.includes('|')) {
    for (const single of action.split('|')) {
      determineAction(targetElement, event, single.trim())
    }
    return
  }
  if (action === 'refresh') {
    window.location.reload()
    return
  }
  const match = action.match(ACTION_REGEX)
  if (!match) return
  const actionName = match[1]
  const target = match[2] ?? null
  if (typeof window[actionName] === 'function') {
    window[actionName](targetElement, event, target)
  } else {
    console.warn(`[actions] Unknown action: "${actionName}"`)
  }
}

function handleEvents(event) {
  const rawTarget = event.target
  const targetEl = rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement
  const targetElement = targetEl?.closest(`[data-${event.type}]:not([disabled])`)
  if (targetElement) {
    determineAction(targetElement, event, targetElement.dataset[event.type])
  }
  if (['change', 'input', 'submit'].includes(event.type)) {
    refreshBindings()
  }
}

document.addEventListener('click', handleEvents, false)
document.addEventListener('change', handleEvents, false)
document.addEventListener('input', handleEvents, false)
document.addEventListener('submit', handleEvents, false)

function resolveToggleTarget(target) {
  if (!target || typeof target !== 'string') return null
  const s = target.trim()
  if (!s || s === 'this') return null
  return document.getElementById(s)
}

function toggleClassName(el, className, target) {
  if (el instanceof Element && className && typeof className === 'object' && typeof target === 'string') {
    const raw = target.trim()
    const comma = raw.indexOf(',')
    if (comma === -1) return
    const actionElTarget = raw.slice(0, comma).trim()
    const actionClassName = raw.slice(comma + 1).trim()
    const targetEl = actionElTarget === 'this' ? el : resolveToggleTarget(actionElTarget)
    if (targetEl) targetEl.classList.toggle(actionClassName)
    return
  }
  const resolved = resolveToggleTarget(el)
  if (resolved && className) resolved.classList.toggle(className)
}

window.toggleClassName = toggleClassName

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

function getDialogById(id) {
  const dialog = document.getElementById(id)
  return dialog?.tagName === 'DIALOG' ? dialog : null
}

function updateModalPageLock() {
  const hasOpenModal = !!document.querySelector('dialog[open]:not([data-modeless])')
  document.documentElement.toggleAttribute('data-brio-modal-open', hasOpenModal)
}

function isClosable(dialog) {
  return !!dialog.querySelector('[data-el=close-button]:not([disabled])')
}

function openDialog(el, event, dialogId) {
  const dialog = getDialogById(dialogId)
  if (!dialog) return
  if (!dialog.open) dialog.showModal()
  updateModalPageLock()
  const focusable = [...dialog.querySelectorAll(FOCUSABLE)]
    .find((node) => node.offsetParent !== null && !node.matches('[data-el=close-button]'))
  if (focusable) focusable.focus()
}

function closeDialog(el, event, dialogId) {
  const dialog = dialogId ? getDialogById(dialogId) : getDialogById('settings')
  if (!dialog?.open) return
  dialog.close()
  updateModalPageLock()
}

document.addEventListener('cancel', (event) => {
  const dialog = event.target
  if (!(dialog instanceof HTMLDialogElement)) return
  if (!isClosable(dialog)) event.preventDefault()
}, true)

document.addEventListener('click', (event) => {
  const dialog = event.target
  if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return
  const rect = dialog.getBoundingClientRect()
  const isBackdropClick =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  if (isBackdropClick && isClosable(dialog)) {
    event.preventDefault()
    dialog.close()
    updateModalPageLock()
  }
}, true)

function showMessage(target, message, type = 'error') {
  let region = null
  if (typeof target === 'string') {
    region = document.querySelector(`[data-message][data-for="${target}"]`)
  } else if (target instanceof Element) {
    region = target.closest('nav')?.querySelector('[data-message]') || document.querySelector('[data-message]')
  } else {
    region = document.querySelector('[data-message]')
  }
  if (!region) return
  if (!region.id) region.id = 'msg-' + Math.random().toString(36).slice(2, 7)
  region.textContent = message
  region.dataset.type = type
  region.removeAttribute('hidden')
  if (type === 'error') {
    region.setAttribute('role', 'alert')
    region.removeAttribute('aria-live')
  } else {
    region.setAttribute('aria-live', 'polite')
    region.removeAttribute('role')
  }
}

window.setThemeColor = setThemeColor
window.getStorageItem = getStorageItem
window.debounce = debounce
window.refreshBindings = refreshBindings
window.showMessage = showMessage
window.openDialog = openDialog
window.closeDialog = closeDialog

document.addEventListener('DOMContentLoaded', () => {
  applyBindings(document)
})
