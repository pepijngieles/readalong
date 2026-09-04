	<nav>
		<div>
			<a href="<?= e($base) ?>" class="button quiet icon-only rounded">
				<span class=visually-hidden><?= e(t('nav.back')) ?></span>
				<?php icon('back'); ?>
			</a>
		</div>
		<audio class="native-audio" src="<?= e($base) ?>audio/<?= e($story['storyID']) ?>/<?= e($story['languageCode']) ?>/<?= e($activeVoiceId) ?>.mp3" preload="metadata" playsinline onended="end()" controls></audio>
		<div class="audio-controls js-only">
			<button class="rewind quiet icon-only rounded" data-rewind onclick="playSentence(currentSentence - 1)" disabled>
				<span class=visually-hidden><?= e(t('nav.rewind')) ?></span>
				<?php icon('rewind'); ?>
			</button>
			<button class="play icon-only rounded" data-action=play onclick=play()>
				<span class=visually-hidden><?= e(t('nav.play')) ?></span>
				<?php icon('play'); ?>
			</button>
			<button class="pause icon-only rounded pressed" data-action=pause onclick=pause()>
				<span class=visually-hidden><?= e(t('nav.pause')) ?></span>
				<?php icon('pause'); ?>
			</button>
			<button class="forward quiet icon-only rounded" data-fast-forward onclick="playSentence(currentSentence + 1)">
				<span class=visually-hidden><?= e(t('nav.forward')) ?></span>
				<?php icon('forward'); ?>
			</button>
		</div>
		<div class="js-only text-align-right">
			<button class="settings quiet icon-only rounded" onclick="toggleSettings()">
				<span class=visually-hidden><?= e(t('nav.settings')) ?></span>
				<?php icon('gear'); ?>
			</button>
		</div>

		<div class=developer-controls>
			<!-- TODO: add button to 'clear timestamps' and hide 'add timestamp' button initially. Show either one or the other. When clearing all timestamps, set currenSentence to the first one -->
			<input type="number" name="currentSentenceTime" value="0" step="0.1" oninput="updateTimestamps()">
			<button onclick=addTimestamp() class="small">Add timestamp</button>
			<button onclick="copyTimestamps()" class="small">Copy timestamps</button>
		</div>
	</nav>
