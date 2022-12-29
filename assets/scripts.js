/* Define variables
---------------------------------------------------------------------------- */
const audioFile = document.querySelector('audio'),
      progressBar = document.querySelector('progress'),
      sentences = document.querySelectorAll('[data-sentence]'),
      timeDisplay = document.getElementById("time-display"),
      textarea = document.querySelector('textarea'), // For developer purposes
      translationPopover = document.querySelector('[data-translation-popover]'),
      translationText = document.querySelector('[data-translation-text]'),
      navHeight = document.querySelector('nav').offsetHeight,
      timestamps = {'pepijn': [0,5.6,9.4,13,18.6,26.9,28.8,32,35.2,40.1,44.8,48.1,52.1,56,59.1,62.4,65.2,73,75,77.7,79.7]}

let   started = false,
      playing = false,
      time = 0,
      currentSentence = 0, // TODO: get current sentence from localStorage
      currentSentenceEl = sentences[0],
      voice = 'pepijn', // TODO: change audio file on selection
      interval,
      showTranslation = true

// Make all sentences clickable
// TODO: use event delegation
for (var i = 0; i < sentences.length; i++) {
  sentences[i].addEventListener('click', playSentence, false)
}



/* Start, Play, Pause & End
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

  interval = setInterval(function() {
    if(playing) autoPlay()
  }, 100)
}

function pause() {
  playing = false
  document.body.classList.add('paused')
  audioFile.pause()
  clearInterval(interval)
}

function end() {
  audioFile.currentTime = 0
  document.body.classList.remove('started')
  currentSentence = 0
  changeSentence()
  time = 0
  playing = false
  
  return
}



/* Automatically change sentence based on timestamps
---------------------------------------------------------------------------- */
function autoPlay() {
  // If current time is equal to, or greater than timestamp of current sentence
  if (time >= timestamps[voice][currentSentence + 1]) {
    // And if there are sentences left to read
    if(sentences.length > currentSentence) {  
      // Move to the next sentence
      currentSentence++
      changeSentence()
    }
    // If there are no sentences left, end the story
    else end()
  }
  updateProgressBar()
}



/* 
---------------------------------------------------------------------------- */
function changeSentence() {
  currentSentenceEl = sentences[currentSentence]
  // Highlight the current sentence
  highlightSentence()
  updateTranslation()
  updateProgressBar()
  setTimeout(function(){
    checkForScroll()
  }, 240)
}

function highlightSentence(number) {
  if (!started) start()
  document.querySelector('[data-sentence][aria-current]').removeAttribute('aria-current')
  currentSentenceEl.setAttribute('aria-current', 'true')
  // TODO: find out how to cope with focus()
}

function updateTranslation() {
  // Update translation
  translationText.innerHTML = currentSentenceEl.dataset.translation
  // TODO: only add this if
  var popoverOffset = currentSentenceEl.offsetHeight - 22
  popoverOffset += currentSentenceEl.offsetTop
  translationPopover.style.transform = 'translateY(' + (popoverOffset / 16 - 1) + 'rem) translateZ(0)'
  // translateZ(0) is added so the filter drop-shadow doesn't animate laggy
  
}

function checkForScroll() {
  // TODO: use highlighted sentence for when no translation is shown instead of popover
  if(showTranslation) {
    var popoverOffset = translationPopover.getBoundingClientRect()
    var contentWindowHeight = window.innerHeight - navHeight
    if (contentWindowHeight < (popoverOffset.bottom + 48)) {
      window.scrollBy(0, (contentWindowHeight / 1.4))
    }
  }
}



/* 
---------------------------------------------------------------------------- */
function playSentence(number) {
  if (number === parseInt(number, 10)) currentSentence = number
  else currentSentence = parseInt(this.dataset.sentence)
  // 
  time = timestamps[voice][currentSentence]
  audioFile.currentTime = time

  changeSentence()
}

function updateProgressBar() {
  // Update the time
  time = audioFile.currentTime.toFixed(1)
  // Update the progress bar
  progressBar.value = (audioFile.currentTime * 100 / audioFile.duration).toFixed(0)
  // Update the shown time for developer purposed
  if (timeDisplay) timeDisplay.innerText = time + " seconden"
}

function disableButton(button){
  // Check for forward/rewind buttons to be enabled/disabled
  // if (currentSentence = 0) disableButton('rewind')
  // if (currentSentence == sentences.length) disableButton('forward')
  document.querySelector('[data-action=' + button + ']').setAttribute('disabled', 'true')
}



/* 
---------------------------------------------------------------------------- */
function addTimestamp() {
  textarea.value += ',' + time
}



function toggleTranslation() {
  showTranslation = !showTranslation
  document.body.classList.toggle('show-translation')
}