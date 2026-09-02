'use strict'

;(function () {
  const isIOS = [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  || (navigator.userAgent.includes('Mac') && 'ontouchend' in document)

  if (isIOS) document.body.classList.add('ios')
})()
