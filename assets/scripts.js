'use strict'

/*
  Index

  1. Define variables
  2. Generic functions
  3. Start, Play, Pause & End
  4. Automatically change sentence based on timestamps
  5. Change a sentence
  6. Play a sentence when clicking on it
  7. Toggle the translation on/off
  8. Switch voice
  9. Settings & storage
  X. Developer controls

*/



/* 1. Define variables
---------------------------------------------------------------------------- */
const audioFile = document.querySelector('audio'),
      audioSource = document.querySelector('audio source'),
      audioBase = document.body.dataset.audioBase || '../../audio/',
      rewindButton = document.querySelector('[data-rewind]'),
      fastForwardButton = document.querySelector('[data-fast-forward]'),
      progressBar = document.querySelector('progress'),
      sentences = document.querySelectorAll('[data-sentence]'),
      timeInput = document.querySelector('input[name=currentSentenceTime]'),
      translationPopover = document.querySelector('[data-translation-popover]'),
      translationText = document.querySelector('[data-translation-text]'),
      navHeight = document.querySelector('nav').offsetHeight,
      settingsPopover = document.querySelector('.settings-popover'),
      durationEl = document.querySelector('[data-duration]'),
      voiceSelect = document.querySelector('[data-voice]'),
      playMessageEl = document.querySelector('[data-message]')

const STORAGE_PREFIX = 'readalong:v1:'
const SETTINGS_KEYS = {
  playbackRate: STORAGE_PREFIX + 'settings:playbackRate',
  sentencePause: STORAGE_PREFIX + 'settings:sentencePause',
  fontSize: STORAGE_PREFIX + 'settings:fontSize',
  lineHeight: STORAGE_PREFIX + 'settings:lineHeight',
  showTranslation: STORAGE_PREFIX + 'settings:showTranslation'
}

let   started = false,
      playing = false,
      time = 0,
      sentencePause = 0,
      currentSentence = 0,
      currentSentenceEl = sentences[0],
      interval,
      sentencePauseTimeout,
      inSentencePause = false,
      showTranslation = true,
      popoverOffsetY = 0,
      popoverOffsetX = 0,
      wasPlaying = false,
      storageWriteBlocked = false,
      audioReadyHandled = false,
      audioReadyTimeout = null,
      previousVoice = null

function storyKey(name) {
  return STORAGE_PREFIX + 'story:' + storyID + ':' + name
}

function migrateStorage() {
  // Reserved for future v2 migrations
}

function saveSetting(key, value) {
  if (storageWriteBlocked) return
  try {
    localStorage.setItem(key, String(value))
  } catch (e) {
    storageWriteBlocked = true
    console.warn('[readalong] localStorage write blocked:', e)
  }
}

function readShowTranslationSetting() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEYS.showTranslation)
    if (stored === null) return true
    return stored !== 'false' && stored !== '0'
  } catch (e) {
    return true
  }
}

showTranslation = readShowTranslationSetting()

for (const sentence of sentences) {
  sentence.addEventListener('click', playSentence, false)
  sentence.addEventListener('keydown', onSentenceKeydown, false)
}



/* 2. Generic functions
---------------------------------------------------------------------------- */
function secondsToHms(d) {
  d = Number(d)
  if (!Number.isFinite(d) || d < 0) return '--:--'
  const h = Math.floor(d / 3600)
  const m = Math.floor(d % 3600 / 60)
  const s = Math.floor(d % 3600 % 60)
  const hDisplay = h > 0 ? (h < 10 ? '0' : '') + h + ':' : ''
  const mDisplay = m > 0 ? (m < 10 ? '0' : '') + m + ':' : '00:'
  const sDisplay = s > 0 ? (s < 10 ? '0' : '') + s : '00'
  return hDisplay + mDisplay + sDisplay
}

function onSentenceKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  playSentence.call(this, event)
}

function requestPlay() {
  const result = audioFile.play()
  if (result && typeof result.catch === 'function') {
    result.catch(function (error) {
      if (error && error.name === 'AbortError') return
      pause()
      if (typeof showMessage === 'function' && playMessageEl) {
        showMessage(playMessageEl, 'Tap play to continue', 'info')
      }
    })
  }
}



/* 3. Start, Play, Pause & End
---------------------------------------------------------------------------- */
function start() {
  started = true
  setThemeColor('#fafafa')
  document.body.classList.add('started', 'paused')
  currentSentenceEl.setAttribute('aria-current', 'true')
  updateTranslation()
}

function play() {
  if (!started) start()
  clearInterval(interval)
  playing = true
  document.body.classList.remove('paused')
  requestPlay()
  checkForScroll()
  interval = setInterval(function () {
    if (playing) autoPlay()
  }, 100)
}

function pause() {
  clearTimeout(sentencePauseTimeout)
  inSentencePause = false
  playing = false
  document.body.classList.add('paused')
  audioFile.pause()
  clearInterval(interval)
}

function end() {
  clearInterval(interval)
  audioFile.currentTime = 0
  currentSentence = 0
  saveSetting(storyKey('sentence'), 0)
  setThemeColor('#ffffff')
  document.body.classList.remove('started', 'paused')
  changeSentence()
  time = 0
  playing = false
  started = false
  inSentencePause = false
}



/* 4. Automatically change sentence based on timestamps
---------------------------------------------------------------------------- */
function autoPlay() {
  if (inSentencePause) {
    updateProgressBar()
    return
  }
  const currentTime = audioFile.currentTime
  if (currentTime >= timestamps[voice][currentSentence + 1]) {
    currentSentence++
    if (sentencePause == 0) changeSentence()
    else {
      inSentencePause = true
      audioFile.pause()
      sentencePauseTimeout = setTimeout(function () {
        inSentencePause = false
        requestPlay()
        changeSentence()
      }, sentencePause)
    }
  }
  updateProgressBar()
}



/* 5. Change a sentence
---------------------------------------------------------------------------- */
function changeSentence() {
  currentSentenceEl = sentences[currentSentence]
  highlightSentence()
  updateTranslation()
  updateProgressBar()
  disableButtons()
  saveSetting(storyKey('sentence'), currentSentence)
  if (timeInput) timeInput.value = timestamps[voice][currentSentence]
  setTimeout(function () {
    checkForScroll()
  }, 240)
}

function highlightSentence() {
  if (!started) start()
  const current = document.querySelector('[data-sentence][aria-current]')
  if (current) current.removeAttribute('aria-current')
  currentSentenceEl.setAttribute('aria-current', 'true')
}

function updateTranslation() {
  translationText.innerHTML = currentSentenceEl.dataset.translation
  popoverOffsetY = currentSentenceEl.offsetHeight - 8
  popoverOffsetY += currentSentenceEl.offsetTop
  popoverOffsetY /= 16

  if (storyType == 'dialogue') {
    const listItem = currentSentenceEl.closest('li')
    popoverOffsetY++
    popoverOffsetX = (listItem.classList.contains('right')) ? 2.75 : -2.75
    const popoverTextAlign = (listItem.classList.contains('right')) ? 'right' : 'left'
    translationPopover.style.textAlign = popoverTextAlign
    translationPopover.style.maxWidth = currentSentenceEl.offsetWidth / 16 + 2 + 'rem'
  }

  translationPopover.style.transform = 'translateX(' + popoverOffsetX + 'rem) translateY(' + popoverOffsetY + 'rem) translateZ(0)'
}

let scrollMargin = (storyType == 'dialogue') ? 48 : 12

function checkForScroll() {
  const sentenceOffset = currentSentenceEl.getBoundingClientRect()
  if (sentenceOffset.top < scrollMargin) {
    window.scrollBy(0, sentenceOffset.top - scrollMargin)
    return
  }
  const contentHeight = window.innerHeight - navHeight
  const popoverRect = translationPopover.getBoundingClientRect()
  const offsetBottom = (showTranslation) ? popoverRect.bottom + 48 : sentenceOffset.bottom + scrollMargin
  if (contentHeight < offsetBottom) window.scrollBy(0, sentenceOffset.top - scrollMargin)
}

function updateProgressBar() {
  time = audioFile.currentTime
  if (Number.isFinite(audioFile.duration) && audioFile.duration > 0) {
    progressBar.value = (audioFile.currentTime * 100 / audioFile.duration).toFixed(0)
  }
}

function disableButtons() {
  if (currentSentence == 0) rewindButton.disabled = true
  else if (rewindButton.disabled) rewindButton.disabled = false
  if (currentSentence == sentences.length - 1) fastForwardButton.disabled = true
  else if (fastForwardButton.disabled) fastForwardButton.disabled = false
}



/* 6. Play a sentence when clicking on it
---------------------------------------------------------------------------- */
function playSentence(number) {
  if (number === parseInt(number, 10)) currentSentence = number
  else currentSentence = parseInt(this.dataset.sentence)
  time = timestamps[voice][currentSentence]
  audioFile.currentTime = time
  changeSentence()
}

function rewind() {
  playSentence(currentSentence - 1)
}

function forward() {
  playSentence(currentSentence + 1)
}



/* 7. Toggle the translation on/off
---------------------------------------------------------------------------- */
function toggleTranslation() {
  showTranslation = !showTranslation
  saveSetting(SETTINGS_KEYS.showTranslation, showTranslation)
  setThemeColor(showTranslation ? '#fafafa' : '#ffffff')
  document.body.classList.toggle('show-translation')
}



/* 8. Switch voice
---------------------------------------------------------------------------- */
function clearAudioReadyListeners() {
  audioFile.removeEventListener('canplaythrough', onAudioReady)
  audioFile.removeEventListener('loadedmetadata', onAudioReady)
  audioFile.removeEventListener('error', onAudioError)
  if (audioReadyTimeout) {
    clearTimeout(audioReadyTimeout)
    audioReadyTimeout = null
  }
}

function onAudioError() {
  if (audioReadyHandled) return
  audioReadyHandled = true
  clearAudioReadyListeners()
  document.documentElement.classList.remove('loading')
  wasPlaying = false
  if (previousVoice && voiceSelect) {
    voice = previousVoice
    voiceSelect.value = previousVoice
    audioSource.src = audioBase + storyID + '/' + languageCode + '/' + previousVoice + '.mp3'
    audioFile.load()
  }
}

function onAudioReady() {
  if (audioReadyHandled) return
  audioReadyHandled = true
  clearAudioReadyListeners()
  document.documentElement.classList.remove('loading')
  durationEl.innerHTML = secondsToHms(audioFile.duration)
  if (started) {
    time = timestamps[voice][currentSentence]
    audioFile.currentTime = time
    playSentence(currentSentence)
  }
  if (wasPlaying && audioFile.paused) requestPlay()
}

function bindAudioReady() {
  audioReadyHandled = false
  clearAudioReadyListeners()
  audioFile.addEventListener('canplaythrough', onAudioReady, { once: true })
  audioFile.addEventListener('loadedmetadata', onAudioReady, { once: true })
  audioFile.addEventListener('error', onAudioError, { once: true })
  audioReadyTimeout = setTimeout(function () {
    if (!audioReadyHandled) onAudioReady()
  }, 8000)
}

function switchVoice(el) {
  wasPlaying = playing
  previousVoice = voice
  pause()
  voice = el.value
  saveSetting(storyKey('voice'), voice)
  audioSource.src = audioBase + storyID + '/' + languageCode + '/' + el.value + '.mp3'
  document.documentElement.classList.add('loading')
  audioFile.load()
  bindAudioReady()
  if (wasPlaying) requestPlay()
}



/* 9. Settings & storage
---------------------------------------------------------------------------- */
function settingsOpened() {
  setThemeColor('#fafafa')
}

if (settingsPopover) {
  settingsPopover.addEventListener('close', function () {
    document.body.classList.remove('show-settings')
    setThemeColor(started ? '#fafafa' : '#ffffff')
  })
}

const persistSettings = debounce(function () {
  const form = document.forms.settings
  saveSetting(SETTINGS_KEYS.playbackRate, form.playbackRate.value)
  saveSetting(SETTINGS_KEYS.sentencePause, form.sentencePause.value)
  saveSetting(SETTINGS_KEYS.fontSize, form.fontSize.value)
  saveSetting(SETTINGS_KEYS.lineHeight, form.lineHeight.value)
}, 250)

function updateSettings() {
  const form = document.forms.settings
  audioFile.playbackRate = form.playbackRate.value
  sentencePause = form.sentencePause.value
  document.documentElement.style.setProperty('--font-size', form.fontSize.value + '%')
  document.querySelector('.story').style.setProperty('--line-height', form.lineHeight.value)
  updateTranslation()
  persistSettings()
}

function clampSentenceIndex(index) {
  const parsed = parseInt(index, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(Math.max(parsed, 0), sentences.length - 1)
}

function restoreVoice() {
  if (!voiceSelect) return
  const defaultVoice = voiceSelect.querySelector('option[selected]')?.value || voiceSelect.options[0]?.value
  let storedVoice = getStorageItem(storyKey('voice'), defaultVoice)
  const valid = [...voiceSelect.options].some((option) => option.value === storedVoice)
  if (!valid) {
    try { localStorage.removeItem(storyKey('voice')) } catch (e) {}
    storedVoice = defaultVoice
  }
  voice = storedVoice
  voiceSelect.value = storedVoice
  audioSource.src = audioBase + storyID + '/' + languageCode + '/' + storedVoice + '.mp3'
}

function restoreState() {
  migrateStorage()

  const form = document.forms.settings
  if (form) {
    form.playbackRate.value = getStorageItem(SETTINGS_KEYS.playbackRate, form.playbackRate.defaultValue)
    form.sentencePause.value = getStorageItem(SETTINGS_KEYS.sentencePause, form.sentencePause.defaultValue)
    form.fontSize.value = getStorageItem(SETTINGS_KEYS.fontSize, form.fontSize.defaultValue)
    form.lineHeight.value = getStorageItem(SETTINGS_KEYS.lineHeight, form.lineHeight.defaultValue)
    updateSettings()
    if (typeof refreshBindings === 'function') refreshBindings()
  }

  restoreVoice()

  currentSentence = clampSentenceIndex(getStorageItem(storyKey('sentence'), '0'))
  currentSentenceEl = sentences[currentSentence]

  showTranslation = readShowTranslationSetting()
  document.body.classList.toggle('show-translation', showTranslation)

  function applyStoredSentenceTime() {
    if (currentSentence > 0 && timestamps[voice][currentSentence] != null) {
      time = timestamps[voice][currentSentence]
      audioFile.currentTime = time
    }
    if (durationEl && Number.isFinite(audioFile.duration)) {
      durationEl.innerHTML = secondsToHms(audioFile.duration)
    }
  }

  if (audioFile.readyState >= 1) applyStoredSentenceTime()
  else {
    audioFile.addEventListener('loadedmetadata', function onInitMetadata() {
      applyStoredSentenceTime()
    }, { once: true })
  }
}

restoreState()



/* X. Developer controls
---------------------------------------------------------------------------- */
function addTimestamp() {
  timestamps[voice].push(time)
  if (timeInput) timeInput.value = time
}

function updateTimestamps() {
  timestamps[voice][currentSentence] = timeInput.value
  play()
  playSentence(currentSentence)
}

function copyTimestamps() {
  navigator.clipboard.writeText(timestamps[voice])
}

const parameterList = new URLSearchParams(window.location.search)
for (const parameter of parameterList) {
  if (parameter[0] == 'devmode' && parameter[1] == 'on') document.body.classList.add('devmode')
}
