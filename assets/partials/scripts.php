	<script type="text/javascript">
		const timestamps = <?= json_encode($story['timestamps'], JSON_UNESCAPED_UNICODE) ?>,
			storyID = <?= json_encode($story['storyID']) ?>,
			languageCode = <?= json_encode($story['languageCode']) ?>,
			storyType = <?= json_encode($story['storyType']) ?>

		let voice = <?= json_encode(defaultVoice($story['voices'])) ?>
	</script>

	<script type="text/javascript" src="<?= e($base) ?>assets/ios-detect.js" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/brio/brio.js" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/scripts.js?v=12" defer></script>
