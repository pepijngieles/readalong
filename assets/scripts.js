/*

  Index

  1. Define variables
  2. Start, Play, Pause & End
  3. Automatically change sentence based on timestamps
  4. Change a sentence
    4.1 Highlight a sentence
    4.2 Update the translation
    4.3 Check if auto-scrolling is needed
    4.4 Update the progress bar
  5. Play a sentence when clicking on it
  6. Toggle the translation on/off
  7. Settings
    7.1 Toggle
    7.2 Update
  8. Detect iOS
  X. Developer related functions

*/



/* 1. Define variables
---------------------------------------------------------------------------- */
const audioFile = document.querySelector('audio'),
      rewindButton = document.querySelector('[data-rewind]'),
      fastForwardButton = document.querySelector('[data-fast-forward]'),
      progressBar = document.querySelector('progress'),
      sentences = document.querySelectorAll('[data-sentence]'),
      timeDisplay = document.getElementById("time-display"),
      textarea = document.querySelector('textarea'), // For developer purposes
      translationPopover = document.querySelector('[data-translation-popover]'),
      translationText = document.querySelector('[data-translation-text]'),
      navHeight = document.querySelector('nav').offsetHeight,
      settingsPopover = document.querySelector('.settings-popover'),
      timestamps = {'pepijn': [0,5.6,9.4,13,18.6,26.9,28.8,32,35.2,40.1,44.8,48.1,52.1,56,59.1,62.4,65.2,73,75,77.7,79.7]}

let   started = false,
      playing = false,
      time = 0,
      sentencePause = 0,
      currentSentence = 0, // TODO: get current sentence from localStorage
      currentSentenceEl = sentences[0],
      voice = 'pepijn', // TODO: change audio file on selection
      interval,
      sentencePauseTimeout,
      showTranslation = true,
      popoverOffset = 0,
      playbackRate = 1

// Make all sentences clickable
for (sentence of sentences) {
  // TODO: use event delegation instead of separate event listeners
  sentence.addEventListener('click', playSentence, false)
}



/* 2. Start, Play, Pause & End
---------------------------------------------------------------------------- */
function start() {
  started = true
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
  document.body.classList.remove('started')
  changeSentence()
  time = 0
  playing = false
  started = false
}



/* 3. Automatically change sentence based on timestamps
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



/* 4. Change a sentence
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
  // A little timeOut is needed so the function uses the updated values
  setTimeout(function(){
    checkForScroll()
  }, 240)
}

  /* 4.1 Highlight a sentence ---------------------------------------------- */
  function highlightSentence(number) {
    if (!started) start()
    document.querySelector('[data-sentence][aria-current]').removeAttribute('aria-current')
    currentSentenceEl.setAttribute('aria-current', 'true')
    // TODO: find out how to cope with focus()
  }

  /* 4.2 Update the translation -------------------------------------------- */
  function updateTranslation() {
    // Replace the text
    translationText.innerHTML = currentSentenceEl.dataset.translation
    // Calculate the right Y-position for the popover
    popoverOffset = currentSentenceEl.offsetHeight - 8
    popoverOffset += currentSentenceEl.offsetTop
    // Convert the pixel-value to rem
    popoverOffset /= 16
    // Update transform property. A translateZ of 0 is added to prevent
    // laggy animation of the filter drop-shadow
    translationPopover.style.transform = 'translateY(' + popoverOffset + 'rem) translateZ(0)'
  }

  /* 4.3 Check if auto-scrolling is needed --------------------------------- */
  function checkForScroll() {
    // TODO: use the highlighted sentence's dimenions instead of popover for
    //  when no translation is shown
    if(showTranslation) {
      var popoverOffset = translationPopover.getBoundingClientRect()
      var contentWindowHeight = window.innerHeight - navHeight
      if (contentWindowHeight < (popoverOffset.bottom + 48)) {
        window.scrollBy(0, (contentWindowHeight / 1.4))
      }
    }
  }

  /* 4.4 Update the progress bar ------------------------------------------- */
  function updateProgressBar() {
    // Update the time
    time = audioFile.currentTime.toFixed(1)
    // Update the progress bar value
    progressBar.value = (audioFile.currentTime * 100 / audioFile.duration).toFixed(0)
    // Update the shown time for developer purposed
    if (timeDisplay) timeDisplay.innerText = time + " seconden"
  }

  /* 4.5 Disable rewind/forward button if needed --------------------------- */
  function disableButtons(button){
    if (currentSentence == 0) rewindButton.disabled = true
    else if (rewindButton.disabled) rewindButton.disabled = false
    if (currentSentence == sentences.length - 1) fastForwardButton.disabled = true
    else if (fastForwardButton.disabled) fastForwardButton.disabled = false
  }



/* 5. Play a sentence when clicking on it
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



/* 6. Toggle the translation on/off
---------------------------------------------------------------------------- */
function toggleTranslation() {
  showTranslation = !showTranslation
  document.body.classList.toggle('show-translation')
}



/* 7. Settings
---------------------------------------------------------------------------- */

/* 7.1 Toggle -------------------------------------------------------------- */
function toggleSettings() {
  console.log(settingsPopover)
  settingsPopover.hidden = !settingsPopover.hidden
}

/* 7.2 Update -------------------------------------------------------------- */
function updateSettings() {
  audioFile.playbackRate = document.forms.settings.playbackRate.value
  sentencePause = document.forms.settings.sentencePause.value
}



/* 8. Detect iOS
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



/* X. Developer related functions
---------------------------------------------------------------------------- */
function addTimestamp() {
  textarea.value += ',' + time
}