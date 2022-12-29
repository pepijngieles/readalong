const audioFile = document.querySelector('audio');
const progressBar = document.querySelector('progress');
const sentences = document.querySelectorAll('[data-sentence]');
const timeDisplay = document.getElementById("time-display");
const textarea = document.querySelector('textarea'); // For developer purposes
let started = false;
let playing = false;
let time = 0;
let currentSentence = 0; // TODO: get current sentence from localStorage
let voice = 'pepijn'; // TODO: change audio file on selection

// Make all sentences clickable, TODO: use event delegation
for (var i = 0; i < sentences.length; i++) {
  sentences[i].addEventListener('click', playSentence, false);
}


function checkSentences() {
  // If current time is equal to, or greater than timestamp of current sentence
  if (time >= timestamps[voice][currentSentence + 1]) {
    // And if there are any sentences left
    if(sentences.length > currentSentence) {
      currentSentence++;
      // Highlight the current sentence
      highlightSentence(currentSentence);
      // Check for forward/rewind buttons to be enabled/disabled
      // if (currentSentence = 0) disableButton('rewind');
      // if (currentSentence == sentences.length) disableButton('forward');
    }
    // If there are no sentences left, end the story
    else end();
  }
  // Update the time
  time = audioFile.currentTime.toFixed(1);
  // Update the progress bar
  progressBar.value = (audioFile.currentTime * 100 / audioFile.duration).toFixed(0);
  // Update the shown time for developer purposed
  if (timeDisplay) timeDisplay.innerText = time + " seconden";
}

function highlightSentence(number) {
  if (!started) start();
  document.querySelector('[data-sentence][aria-current]').removeAttribute('aria-current');
  currentSentence = number;
  sentences[currentSentence].setAttribute('aria-current', 'true');
  sentences[currentSentence].focus();
}

function start() {
  started = true;
  document.body.classList.add('started');
  document.body.classList.add('paused');
  sentences[currentSentence].setAttribute('aria-current', 'true');

  
}

var interval;

function play() {
  if (!started) start();
  playing = true;
  document.body.classList.remove('paused');
  sentences[currentSentence].focus();
  audioFile.play();

  interval = setInterval(function() {
    if(playing) checkSentences();
  }, 100);
}

function pause() {
  playing = false;
  document.body.classList.add('paused');
  audioFile.pause();
  clearInterval(interval);
}

function playSentence() {
  if (this.hasAttribute('aria-current')) {
    document.body.classList.toggle('show-translation');
    return;
  }
  playFrom(parseInt(this.dataset.sentence))
}

function playFrom(number) {
  highlightSentence(number);
  time = timestamps[voice][number];
  audioFile.currentTime = time;
}

function end() {
  audioFile.currentTime = 0;
	document.body.classList.remove('started');
  highlightSentence(0);
  time = 0;
  playing = false;
  
  return;
}

function disableButton(button){
  document.querySelector('[data-action=' + button + ']').setAttribute('disabled', 'true');
}

var timestamps = {
  'pepijn': [0,5.6,9.4,13,18.6,26.9,28.8,32,35.2,40.1,44.8,48.1,52.1,56,59.1,62.4,65.2,73,75,77.7,79.7]
}







function addTimestamp() {
  textarea.value += ',' + time;
}