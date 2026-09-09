	<nav>
		<div>
			<a href="<?= e($base) ?>" class="button quiet icon-only rounded">
				<span class=visually-hidden><?= e(t('nav.back')) ?></span>
				<?php icon('back'); ?>
			</a>
		</div>
		<audio class="native-audio" src="<?= e($base) ?>audio/<?= e($story['storyID']) ?>/<?= e($story['languageCode']) ?>/<?= e($activeVoiceId) ?>.mp3" preload="metadata" playsinline onended="end()" controls></audio>
		<div class="audio-controls js-only">
			<button class="rewind quiet icon-only rounded" data-rewind data-click=playPrevious disabled>
				<span class=visually-hidden><?= e(t('nav.rewind')) ?></span>
				<?php icon('rewind'); ?>
			</button>
			<button class="play icon-only rounded" data-action=play data-click=play>
				<span class=visually-hidden><?= e(t('nav.play')) ?></span>
				<?php icon('play'); ?>
			</button>
			<button class="pause icon-only rounded pressed" data-action=pause data-click=pause>
				<span class=visually-hidden><?= e(t('nav.pause')) ?></span>
				<?php icon('pause'); ?>
			</button>
			<button class="forward quiet icon-only rounded" data-fast-forward data-click=playNext>
				<span class=visually-hidden><?= e(t('nav.forward')) ?></span>
				<?php icon('forward'); ?>
			</button>
		</div>
		<div class="js-only text-align-right">
			<button class="settings quiet icon-only rounded" data-click=openSettings>
				<span class=visually-hidden><?= e(t('nav.settings')) ?></span>
				<?php icon('gear'); ?>
			</button>
		</div>

		<div class=developer-controls>
			<input type="number" name="currentSentenceTime" value="0" step="0.1" data-input=updateTimestamps>
			<button type=button data-click=addTimestamp class="small">Add timestamp</button>
			<button type=button data-click=copyTimestamps class="small">Copy timestamps</button>
		</div>
	</nav>
