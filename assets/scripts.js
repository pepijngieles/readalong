/*

  Index

  1. Define variables
  2. Generic functions
  3. Start, Play, Pause & End
  4. Automatically change sentence based on timestamps
  5. Change a sentence
    5.1 Highlight a sentence
    5.2 Update the translation
    5.3 Check if auto-scrolling is needed
    5.4 Update the progress bar
  6. Play a sentence when clicking on it
  7. Toggle the translation on/off
  8. Switch voice
  9. Settings
  10. Detect iOS
  X. Developer controls

*/



/* 1. Define variables
---------------------------------------------------------------------------- */
const audioFile = document.querySelector('audio'),
      rewindButton = document.querySelector('[data-rewind]'),
      fastForwardButton = document.querySelector('[data-fast-forward]'),
      progressBar = document.querySelector('progress'),
      sentences = document.querySelectorAll('[data-sentence]'),
      textarea = document.querySelector('textarea'), // For developer purposes
      timeInput =  document.querySelector('input[name=currentSentenceTime]'), // For developer purposes
      translationPopover = document.querySelector('[data-translation-popover]'),
      translationText = document.querySelector('[data-translation-text]'),
      navEl = document.querySelector('nav'),
      navHeight = navEl ? navEl.offsetHeight : 0,
      settingsPopover = document.querySelector('.settings-popover'),
      settingsScrim = document.querySelector('.settings-scrim'),
      themeColorEl = document.querySelector("meta[name=theme-color]"),
      parameterList = new URLSearchParams (window.location.search)

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
      playbackRate = 1,
      volume = 1,
      themeColorValue = '#ffffff'

const storyConfig = JSON.parse(document.getElementById('story-config').textContent)
const timestamps = Object.fromEntries(
  Object.entries(storyConfig.voices).map(([id, v]) => [id, v.timestamps]))
const storyType = storyConfig.type
let voice = storyConfig.voice
let pendingRestoreSeek = false

const PROGRESS_KEY = 'readalong-progress'

function loadProgressMap() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {}
  } catch (error) {
    return {}
  }
}

function saveStoryProgress(completed) {
  if (!storyConfig.id || !storyConfig.slug) return
  try {
    const map = loadProgressMap()
    map[storyConfig.id] = {
      slug: storyConfig.slug,
      sentence: currentSentence,
      updatedAt: Date.now(),
      completed: completed === true
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map))
  } catch (error) {}
}

function restoreStoryProgress() {
  const saved = loadProgressMap()[storyConfig.id]
  if (!saved || saved.completed || !(saved.sentence > 0) || !sentences.length) return
  const index = Math.min(saved.sentence, sentences.length - 1)
  if (index <= 0) return
  currentSentence = index
  currentSentenceEl = sentences[currentSentence]
  pendingRestoreSeek = true
}

restoreStoryProgress()

// Make all sentences clickable
for (sentence of sentences) {
  // TODO: use event delegation instead of separate event listeners
  sentence.addEventListener('click', playSentence, false)
}



/* 2. Generic functions
---------------------------------------------------------------------------- */
function secondsToHms(d) {
    d = Number(d)
    let h = Math.floor(d / 3600)
    let m = Math.floor(d % 3600 / 60)
    let s = Math.floor(d % 3600 % 60)

    let hDisplay = h > 0 ? (h < 10 ? '0' : '') + h + ':' : ''
    let mDisplay = m > 0 ? (m < 10 ? '0' : '') + m + ':' : '00:'
    let sDisplay = s > 0 ? (s < 10 ? '0' : '') + s : '00'
    return hDisplay + mDisplay + sDisplay 
}

function findAncestor(element, selector){
  while ((element = element.parentElement) && !element.matches(selector));
  return element;
}



/* 3. Start, Play, Pause & End
---------------------------------------------------------------------------- */
function start() {
  started = true
  updateThemeColor()
  document.body.classList.add('started','paused')
  currentSentenceEl.setAttribute('aria-current', 'true')
  updateTranslation()
}

function play() {
  if (!audioFile) return
  if (!started) start()
  if (pendingRestoreSeek) {
    pendingRestoreSeek = false
    const startTime = Number(timestamps[voice][currentSentence])
    if (Number.isFinite(startTime)) {
      try { audioFile.currentTime = startTime } catch (error) {}
    }
  }
  playing = true
  document.body.classList.remove('paused')
  const playAttempt = audioFile.play()
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(function () {})
  }
  checkForScroll()
  // Callers can reach play() without pausing first, which would leave the
  // previous interval running alongside the new one
  clearInterval(interval)
  // Start interval to check every 0.1s if the next sentence should be shown
  interval = setInterval(function() {
    if(playing) autoPlay()
  }, 100)
  return playAttempt
}

function pause() {
  if (!audioFile) return
  clearTimeout(sentencePauseTimeout)
  // currentSentence was already advanced, but changeSentence() was still
  // waiting on the timeout. Catch the UI up, or the sentence gets skipped
  if (inSentencePause) {
    inSentencePause = false
    changeSentence()
  }
  playing = false
  document.body.classList.add('paused')
  audioFile.pause()
  clearInterval(interval)
  saveStoryProgress(false)
}

function end() {
  saveStoryProgress(true)
  audioFile.currentTime = 0
  currentSentence = 0
  updateThemeColor()
  document.body.classList.remove('started')
  changeSentence()
  time = 0
  playing = false
  started = false
  clearInterval(interval)
}



/* 4. Automatically change sentence based on timestamps
---------------------------------------------------------------------------- */
function autoPlay() {
  // Read from the element, not the cached `time` variable. After a seek,
  // updateProgressBar can still hold the previous position for one tick
  // and would skip or stick on the wrong sentence.
  const currentTime = audioFile.currentTime
  const nextStart = timestamps[voice][currentSentence + 1]
  if (!inSentencePause && Number.isFinite(nextStart) && currentTime >= nextStart) {
    currentSentence++
    // Change to next sentence if no pause was set
    if (sentencePause == 0) changeSentence()
    // Else, pause the audio file for as long as sentencePause
    else {
      inSentencePause = true
      audioFile.pause()
      sentencePauseTimeout = setTimeout(function(){
        inSentencePause = false
        audioFile.play()
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
  // The updateTranslation function is also triggered when the translation
  // is not visible. This prevents the distance of the animation to grow very
  // large, which could lead to an uneasy transition when toggled on again
  updateTranslation()
  updateProgressBar()
  disableButtons()
  // Dev thinghies
  if (timeInput) timeInput.value = timestamps[voice][currentSentence]
  // A little timeOut is needed so the function uses the updated values
  setTimeout(function(){
    checkForScroll()
  }, 240)
  if (started) saveStoryProgress(false)
}

  /* 5.1 Highlight a sentence ---------------------------------------------- */
  function highlightSentence(number) {
    if (!started) start()
    const current = document.querySelector('[data-sentence][aria-current]')
    if (current) current.removeAttribute('aria-current')
    if (currentSentenceEl) currentSentenceEl.setAttribute('aria-current', 'true')
    // TODO: find out how to cope with focus()
  }

  /* 5.2 Update the translation -------------------------------------------- */
  function updateTranslation() {
    if (!translationPopover || !translationText || !currentSentenceEl) return
    translationText.textContent = currentSentenceEl.dataset.translation || ''
    // Calculate the right Y-position for the popover
    popoverOffsetY = currentSentenceEl.offsetHeight - 8
    popoverOffsetY += currentSentenceEl.offsetTop
    // Convert pixel-value to rem
    popoverOffsetY /= 16
    popoverTransform = 'translateY(' + popoverOffsetY + 'rem) translateZ(0)';

    // For dialogue stories, the popover is positioned differently
    if (storyType == 'dialogue'){
      // Get the list item element to relatively position popover to
      let listItem = findAncestor(currentSentenceEl, 'li')
      // Calculate transform and text align values
      popoverOffsetY++
      popoverOffsetX = (listItem.classList.contains('right')) ? 2.75 : -2.75
      popoverTransform += ' translateX(' + popoverOffsetX + 'rem)';
      popoverTextAlign = (listItem.classList.contains('right')) ? 'right' : 'left'
      // Set the text align and max width values
      // A max-width is set to prevent popover from transforming out of the viewport
      translationPopover.style.textAlign = popoverTextAlign
      translationPopover.style.maxWidth = currentSentenceEl.offsetWidth / 16 + 2 + 'rem'
    }

    // Update the position
    // Added translateZ(0) to prevent laggy animation of drop-shadow filter
    translationPopover.style.transform = 'translateX(' + popoverOffsetX + 'rem) translateY(' + popoverOffsetY + 'rem) translateZ(0)'    
  }

  /* 5.3 Check if auto-scrolling is needed --------------------------------- */
  let scrollMargin = (storyType == 'dialogue') ? 48 : 12
  
  function checkForScroll() {
    if (document.body.classList.contains('onboarding-page')) return
    if (!currentSentenceEl) return

    let sentenceOffset = currentSentenceEl.getBoundingClientRect()
    if (sentenceOffset.top < scrollMargin) {
      window.scrollBy(0, sentenceOffset.top - scrollMargin)
      return
    }

    let contentHeight = window.innerHeight - navHeight
    let popoverRect = translationPopover ? translationPopover.getBoundingClientRect() : sentenceOffset
    let offsetBottom = (showTranslation) ? popoverRect.bottom + 48 : sentenceOffset.bottom + scrollMargin
    
    if (contentHeight < offsetBottom) window.scrollBy(0, sentenceOffset.top - scrollMargin)
  }

  /* 5.4 Update the progress bar ------------------------------------------- */
  function updateProgressBar() {
    if (!progressBar || !audioFile) return
    // Keep time numeric so sentence-boundary compares stay reliable
    time = audioFile.currentTime
    if (Number.isFinite(audioFile.duration) && audioFile.duration > 0) {
      progressBar.value = (audioFile.currentTime * 100 / audioFile.duration).toFixed(0)
    }
  }

  /* 5.5 Disable rewind/forward button if needed --------------------------- */
  function disableButtons(button){
    if (rewindButton) rewindButton.disabled = currentSentence == 0
    if (fastForwardButton) fastForwardButton.disabled = currentSentence == sentences.length - 1
  }



/* 6. Play a sentence when clicking on it
---------------------------------------------------------------------------- */
function playSentence(number) {
  // 1. Check if the number parameter is filled, else use the clicked sentence
  if (number === parseInt(number, 10)) currentSentence = number
  else currentSentence = parseInt(this.dataset.sentence, 10)
  // 2. Seek the audio. Pause first: WebKit often ignores currentTime while
  // playing, especially when the element is visually hidden.
  const start = Number(timestamps[voice][currentSentence])
  time = start
  const wasPlaying = playing
  clearTimeout(sentencePauseTimeout)
  inSentencePause = false
  if (!audioFile.paused) audioFile.pause()
  try {
    audioFile.currentTime = start
  } catch (error) {}
  // 3. After the audio file time-change, the UI can be updated accordingly
  changeSentence()
  time = start
  if (wasPlaying) play()
}



/* 7. Toggle the translation on/off
---------------------------------------------------------------------------- */
function toggleTranslation() {
  showTranslation = !showTranslation
  document.body.classList.toggle('show-translation')
  updateThemeColor()
}



/* 8. Switch voice
---------------------------------------------------------------------------- */
let wasPlaying = playing
const voiceSelect = document.querySelector('[data-voice]')
const durationEl = document.querySelector('[data-duration]')
if (voiceSelect) voiceSelect.addEventListener('change', switchVoice, false)

function switchVoice() {
  const newVoice = this.value
  const currentText = storyConfig.voices[voice].text
  const newText = storyConfig.voices[newVoice].text
  if (currentText !== newText) {
    const url = new URL(window.location.href)
    url.searchParams.set('voice', newVoice)
    window.location.href = url.toString()
    return
  }
  wasPlaying = (playing == true) ? true : false
  pause()
  voice = newVoice
  audioFile.src = storyConfig.audioBase + newVoice + '.mp3'
  document.documentElement.classList.add('loading')
  audioFile.load()
  audioFile.addEventListener('canplaythrough', audioReady)
}

// TODO: rename this function to an active variant
function audioReady() {
  document.documentElement.classList.remove('loading')
  durationEl.innerHTML = secondsToHms(audioFile.duration)
  if (started) playSentence(currentSentence)
  if (wasPlaying) play()
  audioFile.removeEventListener('canplaythrough', audioReady)
}



/* 9. Settings
---------------------------------------------------------------------------- */
const SETTINGS_KEY = 'readalong-settings'
const SETTINGS_DEFAULTS = {
  fontFamily: 'sans',
  fontSize: 100,
  lineHeight: 1.5,
  playbackRate: 1,
  sentencePause: 0,
  theme: 'light',
  layout: 'start'
}
const THEME_META_COLORS = {
  light: { primary: '#ffffff', secondary: '#fafafa' },
  cream: { primary: '#fef5e5', secondary: '#f5ebd5' },
  dark: { primary: '#333333', secondary: '#2a2a2a' }
}
const FONT_FAMILIES = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
}

let currentTheme = 'light'

function updateThemeColor() {
  if (!themeColorEl) return
  const colors = THEME_META_COLORS[currentTheme] || THEME_META_COLORS.light
  if (settingsPopover && !settingsPopover.hidden && started) themeColorValue = colors.secondary
  else if (started && showTranslation) themeColorValue = colors.secondary
  else themeColorValue = colors.primary
  themeColorEl.setAttribute('content', themeColorValue)
}

function formatSpeed(value) {
  const rate = parseFloat(value)
  if (rate === 1) return '1×'
  return rate.toFixed(2).replace(/\.?0+$/, '') + '×'
}

function formatPause(ms) {
  const seconds = parseInt(ms, 10) / 1000
  if (seconds === 0) return '0s'
  if (Number.isInteger(seconds)) return seconds + 's'
  return seconds.toFixed(1).replace(/\.0$/, '') + 's'
}

function applyFontFamily(value) {
  document.documentElement.style.setProperty(
    '--font-family-story',
    FONT_FAMILIES[value] || FONT_FAMILIES.sans
  )
}

function applyTheme(value) {
  document.body.classList.remove('theme-light', 'theme-cream', 'theme-dark')
  if (value !== 'light') document.body.classList.add('theme-' + value)
  currentTheme = value
  updateThemeColor()
}

function applyLayout(value) {
  document.body.classList.remove('layout-start', 'layout-justify', 'layout-dense', 'layout-spaced')
  if (value === 'justify') document.body.classList.add('layout-justify')
}

function updateRangeProgress(input) {
  const min = parseFloat(input.min)
  const max = parseFloat(input.max)
  const value = parseFloat(input.value)
  const progress = ((value - min) / (max - min)) * 100
  input.style.setProperty('--range-progress', progress + '%')
}

function updateAllRangeProgress() {
  document.querySelectorAll('.settings-slider input[type=range]').forEach(updateRangeProgress)
}

function getSettingsFromForm() {
  const form = document.forms.settings
  return {
    fontFamily: form.fontFamily.value,
    fontSize: parseInt(form.fontSize.value, 10),
    lineHeight: parseFloat(form.lineHeight.value),
    playbackRate: parseFloat(form.playbackRate.value),
    sentencePause: parseInt(form.sentencePause.value, 10),
    theme: form.theme.value,
    layout: form.layout.value
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(getSettingsFromForm()))
}

function applySettingsFromForm(save) {
  const form = document.forms.settings
  audioFile.playbackRate = form.playbackRate.value
  sentencePause = form.sentencePause.value
  document.documentElement.style.setProperty('--font-size', form.fontSize.value + '%')
  document.querySelector('.story').style.setProperty('--line-height', form.lineHeight.value)
  applyFontFamily(form.fontFamily.value)
  applyTheme(form.theme.value)
  applyLayout(form.layout.value)
  form.playbackRateOut.value = formatSpeed(form.playbackRate.value)
  form.sentencePauseOut.value = formatPause(form.sentencePause.value)
  updateAllRangeProgress()
  updateTranslation()
  if (save !== false) saveSettings()
}

function loadSettings() {
  if (!document.forms.settings) return
  let settings = SETTINGS_DEFAULTS
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) settings = Object.assign({}, SETTINGS_DEFAULTS, JSON.parse(stored))
  } catch (error) {}
  if (settings.layout === 'dense') settings.layout = 'start'
  if (settings.layout === 'spaced') settings.layout = 'justify'
  const form = document.forms.settings
  form.fontFamily.value = settings.fontFamily
  form.fontSize.value = settings.fontSize
  form.lineHeight.value = settings.lineHeight
  form.playbackRate.value = settings.playbackRate
  form.sentencePause.value = settings.sentencePause
  form.theme.value = settings.theme
  form.layout.value = settings.layout
  applySettingsFromForm(false)
}

function initSettingsControls() {
  if (!settingsPopover) return
  document.querySelectorAll('.settings-segment, .settings-themes, .settings-layouts').forEach(function(fieldset) {
    const inputs = Array.from(fieldset.querySelectorAll('input[type=radio]'))
    inputs.forEach(function(input, index) {
      input.addEventListener('keydown', function(event) {
        let nextIndex = index
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = (index + 1) % inputs.length
          event.preventDefault()
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          nextIndex = (index - 1 + inputs.length) % inputs.length
          event.preventDefault()
        } else return
        inputs[nextIndex].checked = true
        inputs[nextIndex].focus()
        updateSettings()
      })
    })
  })
  loadSettings()
}

function closeSettings() {
  if (!settingsPopover || settingsPopover.hidden) return
  toggleSettings()
}

function toggleSettings() {
  if (!settingsPopover) return
  settingsPopover.hidden = !settingsPopover.hidden
  if (settingsScrim) settingsScrim.hidden = settingsPopover.hidden
  document.body.classList.toggle('show-settings')
  updateThemeColor()
}

function updateSettings() {
  applySettingsFromForm(true)
}

initSettingsControls()

if (currentSentence > 0 && currentSentenceEl) {
  start()
  changeSentence()
}

window.addEventListener('pagehide', function () {
  if (started) saveStoryProgress(false)
})



/* 10. Detect iOS
---------------------------------------------------------------------------- */
function iOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

if (iOS()) document.body.classList.add('ios')



/* X. Developer controls
---------------------------------------------------------------------------- */
function addTimestamp() {
  timestamps[voice].push(time)
  timeInput.value = time
}

function updateTimestamps() {
  timestamps[voice][currentSentence] = timeInput.value
  play()
  playSentence(currentSentence)
}

function copyTimestamps() {
  navigator.clipboard.writeText(JSON.stringify(timestamps[voice]))
}

for (parameter of parameterList) {
  if (parameter[0] == 'devmode' && parameter[1] == 'on') document.body.classList.add('devmode')
}


