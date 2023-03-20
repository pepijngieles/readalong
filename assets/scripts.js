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
      audioSource = document.querySelector('audio source'),
      rewindButton = document.querySelector('[data-rewind]'),
      fastForwardButton = document.querySelector('[data-fast-forward]'),
      progressBar = document.querySelector('progress'),
      sentences = document.querySelectorAll('[data-sentence]'),
      textarea = document.querySelector('textarea'), // For developer purposes
      timeInput =  document.querySelector('input[name=currentSentenceTime]'), // For developer purposes
      translationPopover = document.querySelector('[data-translation-popover]'),
      translationText = document.querySelector('[data-translation-text]'),
      navHeight = document.querySelector('nav').offsetHeight,
      settingsPopover = document.querySelector('.settings-popover'),
      themeColorEl = document.querySelector("meta[name=theme-color]"),
      parameterList = new URLSearchParams (window.location.search)

let   started = false,
      playing = false,
      time = 0,
      sentencePause = 0,
      currentSentence = 0, // TODO: get current sentence from localStorage
      currentSentenceEl = sentences[0],
      interval,
      sentencePauseTimeout,
      showTranslation = true,
      popoverOffsetY = 0,
      popoverOffsetX = 0,
      playbackRate = 1,
      volume = 1,
      themeColorValue = '#ffffff'

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
  themeColorEl.setAttribute("content", "#fafafa")
  document.body.classList.add('started','paused')
  currentSentenceEl.setAttribute('aria-current', 'true')
  updateTranslation()
}

function play() {
  if (!started) start()
  playing = true
  document.body.classList.remove('paused')
  audioFile.play()
  checkForScroll()
  // Start interval to check every 0.1s if the next sentence should be shown
  interval = setInterval(function() {
    if(playing) autoPlay()
  }, 100)
}

function pause() {
  clearTimeout(sentencePauseTimeout)
  playing = false
  document.body.classList.add('paused')
  audioFile.pause()
  clearInterval(interval)
}

function end() {
  audioFile.currentTime = 0
  currentSentence = 0
  themeColorEl.setAttribute("content", "#ffffff")
  document.body.classList.remove('started')
  changeSentence()
  time = 0
  playing = false
  started = false
}



/* 4. Automatically change sentence based on timestamps
---------------------------------------------------------------------------- */
function autoPlay() {
  // If the current time is equal to, or greater than the starting time
  // of the next sentence, move to the next sentence
  if (time >= timestamps[voice][currentSentence + 1]) {
    currentSentence++
    // Change to next sentence if no pause was set
    if (sentencePause == 0) changeSentence()
    // Else, pause the audio file for as long as sentencePause
    else {
      audioFile.pause()
      sentencePauseTimeout = setTimeout(function(){
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
  timeInput.value = timestamps[voice][currentSentence]
  // A little timeOut is needed so the function uses the updated values
  setTimeout(function(){
    checkForScroll()
  }, 240)
}

  /* 5.1 Highlight a sentence ---------------------------------------------- */
  function highlightSentence(number) {
    if (!started) start()
    document.querySelector('[data-sentence][aria-current]').removeAttribute('aria-current')
    currentSentenceEl.setAttribute('aria-current', 'true')
    // TODO: find out how to cope with focus()
  }

  /* 5.2 Update the translation -------------------------------------------- */
  function updateTranslation() {
    // Replace the text
    translationText.innerHTML = currentSentenceEl.dataset.translation
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
  function checkForScroll() {

    let sentenceOffset = currentSentenceEl.getBoundingClientRect()
    if (sentenceOffset.top < 12) {
      window.scrollBy(0, sentenceOffset.top - 12)
      return
    }

    let contentHeight = window.innerHeight - navHeight
    let popoverOffsetY = translationPopover.getBoundingClientRect()
    let offsetBottom = (showTranslation) ? popoverOffsetY.bottom + 48 : sentenceOffset.bottom + 12
    
    if (contentHeight < offsetBottom) window.scrollBy(0, sentenceOffset.top - 12)
  }

  /* 5.4 Update the progress bar ------------------------------------------- */
  function updateProgressBar() {
    // Update the time
    time = audioFile.currentTime.toFixed(1)
    // Update the progress bar value
    progressBar.value = (audioFile.currentTime * 100 / audioFile.duration).toFixed(0)
  }

  /* 4.5 Disable rewind/forward button if needed --------------------------- */
  function disableButtons(button){
    if (currentSentence == 0) rewindButton.disabled = true
    else if (rewindButton.disabled) rewindButton.disabled = false
    if (currentSentence == sentences.length - 1) fastForwardButton.disabled = true
    else if (fastForwardButton.disabled) fastForwardButton.disabled = false
  }



/* 6. Play a sentence when clicking on it
---------------------------------------------------------------------------- */
function playSentence(number) {
  // 1. Check if the number parameter is filled, else use the clicked sentence
  if (number === parseInt(number, 10)) currentSentence = number
  else currentSentence = parseInt(this.dataset.sentence)
  // 2. Get the right timestamp and play the audio file from there
  time = timestamps[voice][currentSentence]
  audioFile.currentTime = time
  // 3. After the audio file time-change, the UI can be updated accordingly
  changeSentence()
}



/* 7. Toggle the translation on/off
---------------------------------------------------------------------------- */
function toggleTranslation() {
  showTranslation = !showTranslation
  themeColorValue = (showTranslation) ? "#fafafa" : "#ffffff"
  themeColorEl.setAttribute("content", themeColorValue)
  document.body.classList.toggle('show-translation')
}



/* 8. Switch voice
---------------------------------------------------------------------------- */
let wasPlaying = playing
const voiceSelect = document.querySelector('[data-voice]')
const durationEl = document.querySelector('[data-duration]')
voiceSelect.addEventListener('change', switchVoice, false)

function switchVoice() {
  wasPlaying = (playing == true) ? true : false
  pause()
  voice = this.value
  audioSource.src = '../../audio/' + storyID + '/' + languageCode + '/' + this.value + '.mp3'
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
function toggleSettings() {
  settingsPopover.hidden = !settingsPopover.hidden
  themeColorValue = (settingsPopover.hidden || !started) ? "#ffffff" : "#fafafa"
  themeColorEl.setAttribute("content", themeColorValue)
  document.body.classList.toggle('show-settings')
}

function updateSettings() {
  audioFile.playbackRate = document.forms.settings.playbackRate.value
  sentencePause = document.forms.settings.sentencePause.value
  // audioFile.volume = document.forms.settings.volume.value
  document.documentElement.style.setProperty('--font-size', document.forms.settings.fontSize.value + '%')
  document.querySelector('.story').style.setProperty('--line-height', document.forms.settings.lineHeight.value)
  updateTranslation()
}



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
  navigator.clipboard.writeText(timestamps[voice])
}

for (parameter of parameterList) {
  if (parameter[0] == 'devmode' && parameter[1] == 'on') document.body.classList.add('devmode')
}


