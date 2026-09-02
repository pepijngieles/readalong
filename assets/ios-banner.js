'use strict'

function hideAppBanner() {
  const appBanner = document.querySelector('.add-app-popover')
  document.body.classList.add('hide-app-banner')
  setTimeout(function () {
    appBanner.remove()
  }, 200)
}
