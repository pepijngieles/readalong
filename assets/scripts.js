const audioFile = document.querySelector('audio');
const progressBar = document.querySelector('progress');
const sentences = document.querySelectorAll('[data-sentence]');
const timeDisplay = document.getElementById("time-display");
let playing = false;
let time = 0;
let currentSentence = 0; // TODO: get current sentence from localStorage
let voice = 'pepijn'; // TODO: change audio file on selection

// Make all sentences clickable, TODO: use event delegation
for (var i = 0; i < sentences.length; i++) {
  sentences[i].addEventListener('click', playSentence, false);
}







// TODO: start interval, pauseinterval?, clearinterval
var t = setInterval(function() {
  if(playing) {
    checkSentences();
    updateProgress();
  }
}, 100);

function checkSentences() {
  // If current time is equal to, or greater than timestamp of current sentence
  if (time >= timestamps[voice][currentSentence + 1]) {
    // And if there are any sentences left
    if(sentences.length > currentSentence) {
      currentSentence++;
      // Highlight the current sentence
      highlightSentence(currentSentence);
    }
    // If there are no sentences left, end the story
    else end();
  }
  // Update the time
  time = audioFile.currentTime.toFixed(1);
  // Update the shown time for developer purposed
  if (timeDisplay) timeDisplay.innerText = time + " seconden";
}

function highlightSentence(number) {
  document.querySelector('[data-sentence][aria-current]').removeAttribute('aria-current');
  currentSentence = number;
  sentences[currentSentence].setAttribute('aria-current', 'true');
  sentences[currentSentence].focus();
}

function play() {
  sentences[currentSentence].focus();
  audioFile.play();
	document.body.classList.add('started');
  document.body.classList.remove('paused');
  playing = true;
}

function pause() {
  audioFile.pause();
	document.body.classList.add('paused');
  playing = false;
}

function playSentence() {
  if (this.hasAttribute('aria-current')) alert(translation[currentSentence]); // TODO: show translation on click
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
  highlightSentence(0)
  time = 0;
  playing = false;
  return;
}


var textarea = document.querySelector('textarea');

function addTimestamp() {
  textarea.value += ',' + time;
}

function updateProgress() {
  progressBar.value = audioFile.currentTime * 100 / audioFile.duration;
}

var timestamps = {
  'pepijn': [0,5.6,9.4,13,18.6,26.9,28.8,32,35.2,40.1,44.8,48.1,52.1,56,59.1,62.4,65.2,73,75,77.7,79.7]
}

var translation = [
  "Once upon a time there was a large group of frogs who always went to the forest to hang out and have fun.",
  "They all sang and jumped until nightfall.",
  "They always laughed really hard and were inseparable.",
  "One day, during their usual outing, they decided to go to a new forest.",
  "In the middle of their usual games, three of the frogs fell into a deep pit that none of them had noticed before.",
  "The rest were shocked.",
  "They looked at the bottom of the well and saw that it was too deep.",
]


