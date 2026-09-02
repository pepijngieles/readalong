	<nav>
		<div>
			<a href="<?= e($base) ?>" class="button quiet icon-only rounded">
				<span class=visually-hidden>Go back</span>
				<svg width=24 height=24 class=icon aria-hidden=true>
					<use xlink:href=#back></use>
				</svg>
			</a>
		</div>
		<span data-message hidden></span>
		<audio class=no-js-only onended="end()" controls>
			<source src="<?= e($base) ?>audio/<?= e($story['storyID']) ?>/<?= e($story['languageCode']) ?>/<?= e(defaultVoice($story['voices'])) ?>.mp3" type="audio/mpeg">
		</audio>
		<script type="text/javascript">
			document.querySelector('audio').removeAttribute('controls')
		</script>
		<div class="audio-controls js-only">
			<button class="rewind quiet icon-only rounded" data-rewind data-click="rewind" disabled>
				<span class=visually-hidden>Rewind</span>
				<svg width=24 height=24 class=icon aria-hidden=true>
					<use xlink:href=#rewind></use>
				</svg>
			</button>
			<button class="play icon-only rounded" data-action=play data-click="play">
				<span class=visually-hidden>Play</span>
				<svg width=24 height=24 class=icon aria-hidden=true>
					<use xlink:href=#play></use>
				</svg>
			</button>
			<button class="pause icon-only rounded pressed" data-action=pause data-click="pause">
				<span class=visually-hidden>Pause</span>
				<svg width=24 height=24 class=icon aria-hidden=true>
					<use xlink:href=#pause></use>
				</svg>
			</button>
			<button class="forward quiet icon-only rounded" data-fast-forward data-click="forward">
				<span class=visually-hidden>Forward</span>
				<svg width=24 height=24 class=icon aria-hidden=true>
					<use xlink:href=#forward></use>
				</svg>
			</button>
		</div>
		<div class="js-only text-align-right">
			<button class="settings quiet icon-only rounded" data-click="openDialog(settings)|toggleClassName(app,show-settings)|settingsOpened" aria-haspopup=dialog>
				<span class=visually-hidden>Settings</span>
				<svg width=24 height=24 class=icon aria-hidden=true>
					<use xlink:href=#gear></use>
				</svg>
			</button>
		</div>

		<div class=developer-controls>
			<input type="number" name="currentSentenceTime" value="0" step="0.1" data-input="updateTimestamps">
			<button data-click="addTimestamp" class="small">Add timestamp</button>
			<button data-click="copyTimestamps" class="small">Copy timestamps</button>
		</div>
	</nav>
