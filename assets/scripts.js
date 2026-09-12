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
  9. Settings (reader)
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
      showTranslation = document.body.classList.contains('show-translation'),
      popoverOffsetY = 0,
      popoverOffsetX = 0,
      playbackRate = 1,
      volume = 1

const storyConfig = JSON.parse(document.getElementById('story-config').textContent)
const timestamps = Object.fromEntries(
  Object.entries(storyConfig.voices).map(([id, v]) => [id, v.timestamps]))
let voice = storyConfig.voice

const PROGRESS_KEY = 'readalong-progress'
const PREVIOUS_RESTART_SECONDS = 1.5

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
      completed: completed === true,
      started: true
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

function sentenceStart(index) {
  return Number(timestamps[voice][index])
}

function seekAudio(seconds) {
  const start = Number(seconds)
  if (!audioFile || !Number.isFinite(start)) return
  try {
    audioFile.currentTime = start
  } catch (error) {}
  time = start
}



/* 3. Start, Play, Pause & End
---------------------------------------------------------------------------- */
function start() {
  started = true
  document.body.classList.add('started','paused')
  updateThemeColor()
  currentSentenceEl.setAttribute('aria-current', 'true')
  updateTranslation()
}

function play() {
  if (!audioFile) return
  if (!started) start()
  const startTime = sentenceStart(currentSentence)
  // Skip title/intro audio that sits before the current sentence. On the
  // first Play click, browsers often ignore currentTime until playback has
  // actually started, so re-apply once play() resolves.
  const needsStartSeek = Number.isFinite(startTime) &&
    audioFile.currentTime + 0.1 < startTime
  if (needsStartSeek) {
    if (!audioFile.paused) audioFile.pause()
    seekAudio(startTime)
  }
  playing = true
  document.body.classList.remove('paused')
  const playAttempt = audioFile.play()
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(function () {})
  }
  if (needsStartSeek) {
    const reapplySeek = function () {
      if (!playing) return
      if (audioFile.currentTime + 0.1 < startTime) seekAudio(startTime)
    }
    if (playAttempt && typeof playAttempt.then === 'function') {
      playAttempt.then(reapplySeek).catch(function () {})
    }
    audioFile.addEventListener('playing', reapplySeek, { once: true })
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
  currentSentence = 0
  const startTime = sentenceStart(0)
  seekAudio(Number.isFinite(startTime) ? startTime : 0)
  document.body.classList.remove('started')
  started = false
  updateThemeColor()
  changeSentence()
  playing = false
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
  disableButtons()
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

    // Update the position
    // Added translateZ(0) to prevent laggy animation of drop-shadow filter
    translationPopover.style.transform = 'translateX(' + popoverOffsetX + 'rem) translateY(' + popoverOffsetY + 'rem) translateZ(0)'    
  }

  /* 5.3 Check if auto-scrolling is needed --------------------------------- */
  let scrollMargin = 12
  
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
  function sentenceElapsed() {
    const start = sentenceStart(currentSentence)
    if (!Number.isFinite(start)) return 0
    const now = audioFile && Number.isFinite(audioFile.currentTime)
      ? audioFile.currentTime
      : time
    return now - start
  }

  function disableButtons(button){
    if (rewindButton) {
      rewindButton.disabled = currentSentence == 0 &&
        sentenceElapsed() < PREVIOUS_RESTART_SECONDS
    }
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
  const start = sentenceStart(currentSentence)
  time = start
  const wasPlaying = playing
  clearTimeout(sentencePauseTimeout)
  inSentencePause = false
  if (!audioFile.paused) audioFile.pause()
  seekAudio(start)
  // 3. After the audio file time-change, the UI can be updated accordingly
  changeSentence()
  time = start
  if (wasPlaying) play()
}



function playPrevious() {
  if (currentSentence > 0 && sentenceElapsed() < PREVIOUS_RESTART_SECONDS) {
    playSentence(currentSentence - 1)
    return
  }
  playSentence(currentSentence)
}

function playNext() {
  playSentence(currentSentence + 1)
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



/* 9. Settings (reader)
---------------------------------------------------------------------------- */
const FONT_FAMILIES = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
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

window.applyReaderSettings = function () {
  const form = document.forms.settings
  if (!form || !form.fontFamily) return
  if (audioFile && form.playbackRate) audioFile.playbackRate = form.playbackRate.value
  if (form.sentencePause) sentencePause = form.sentencePause.value
  if (form.fontSize) document.documentElement.style.setProperty('--font-size', form.fontSize.value + '%')
  const story = document.querySelector('.story')
  if (story && form.lineHeight) story.style.setProperty('--line-height', form.lineHeight.value)
  applyFontFamily(form.fontFamily.value)
  if (form.playbackRateOut) form.playbackRateOut.value = formatSpeed(form.playbackRate.value)
  if (form.sentencePauseOut) form.sentencePauseOut.value = formatPause(form.sentencePause.value)
  updateAllRangeProgress()
  if (typeof updateTranslation === 'function') updateTranslation()
}

applyReaderSettings()

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


