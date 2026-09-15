const OVERLAY_MENU_GAP = 8
const OVERLAY_MENU_PAD = 8

function overlayMenuViewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

function inferOverlayMenuAlign(button, menu) {
  if (menu.classList.contains('item-menu')) return 'end'
  if (menu.closest('.onboarding-ui-control')) return 'stretch'
  if (button.closest('.home-title-control:last-child')) return 'end'
  return 'start'
}

function positionOverlayMenu(button, menu) {
  if (!button || !menu) return

  const alreadyOpen = menu.classList.contains('is-fixed')
  menu.hidden = false
  menu.classList.add('is-fixed')
  if (!alreadyOpen) {
    menu.style.visibility = 'hidden'
    menu.style.top = '0'
    menu.style.left = '0'
  }
  menu.style.right = 'auto'
  menu.style.width = ''
  menu.style.maxHeight = ''
  menu.style.overflowY = ''

  const align = inferOverlayMenuAlign(button, menu)
  const trigger = button.getBoundingClientRect()
  const view = overlayMenuViewport()
  const gap = OVERLAY_MENU_GAP
  const pad = OVERLAY_MENU_PAD

  let width = menu.offsetWidth
  let height = menu.offsetHeight

  if (align === 'stretch') {
    width = trigger.width
  } else if (!menu.classList.contains('item-menu')) {
    width = Math.max(width, trigger.width)
  }

  const maxWidth = Math.max(0, view.width - pad * 2)
  if (width > maxWidth) width = maxWidth

  let left = align === 'end' ? trigger.right - width : trigger.left
  left = Math.min(Math.max(left, pad), view.width - pad - width)

  const spaceBelow = view.height - pad - (trigger.bottom + gap)
  const spaceAbove = trigger.top - gap - pad
  let top
  let maxHeight = 0

  if (height <= spaceBelow) {
    top = trigger.bottom + gap
  } else if (height <= spaceAbove) {
    top = trigger.top - gap - height
  } else if (spaceBelow >= spaceAbove) {
    top = trigger.bottom + gap
    maxHeight = Math.max(0, spaceBelow)
  } else {
    maxHeight = Math.max(0, spaceAbove)
    top = trigger.top - gap - maxHeight
  }

  menu.style.top = Math.round(top) + 'px'
  menu.style.left = Math.round(left) + 'px'
  menu.style.right = 'auto'
  menu.style.width = Math.round(width) + 'px'
  if (maxHeight) {
    menu.style.maxHeight = Math.round(maxHeight) + 'px'
    menu.style.overflowY = 'auto'
  }
  menu.style.visibility = ''
}

function resetOverlayMenu(menu) {
  if (!menu) return
  menu.classList.remove('is-fixed')
  menu.style.top = ''
  menu.style.left = ''
  menu.style.right = ''
  menu.style.width = ''
  menu.style.maxHeight = ''
  menu.style.overflowY = ''
  menu.style.visibility = ''
}

function repositionOpenOverlayMenus(event) {
  if (event && event.target && event.target.closest && event.target.closest('.title-menu')) return
  document.querySelectorAll('[aria-expanded=true][aria-controls]').forEach(function (button) {
    const menu = document.getElementById(button.getAttribute('aria-controls'))
    if (!menu || menu.hidden || !menu.classList.contains('title-menu')) return
    positionOverlayMenu(button, menu)
  })
}

window.positionOverlayMenu = positionOverlayMenu
window.resetOverlayMenu = resetOverlayMenu

window.addEventListener('scroll', repositionOpenOverlayMenus, true)
window.addEventListener('resize', repositionOpenOverlayMenus)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', repositionOpenOverlayMenus)
  window.visualViewport.addEventListener('scroll', repositionOpenOverlayMenus)
}
