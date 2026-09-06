<?php
$languages = languages_by_endonym();
$uiLang = detect_browser_locale(configured_languages());
$segments = onboarding_demo_segments();
$translateLangsSelected = lang_prefs_list('translate', $languages, [$uiLang]);
$defaultRead = 'no';
if (in_array($defaultRead, $translateLangsSelected, true)) {
  foreach ($languages as $code) {
    if ($code !== $defaultRead) {
      $translateLangsSelected = [$code];
      break;
    }
  }
}
$demoTranslateLang = $translateLangsSelected[0] ?? 'en';
$demoSource = $segments[$defaultRead] ?? $segments['no'];
$demoTranslation = $segments[$demoTranslateLang] ?? $segments['en'];
$storyConfig = [
  'type' => 'default',
  'audioBase' => 'assets/audio/',
  'voice' => 'onboarding-silence',
  'voices' => [
    'onboarding-silence' => [
      'timestamps' => [0, 2.8],
      'text' => 'demo',
    ],
  ],
];
?>
<div class=onboarding-screen data-onboarding-screen>
	<div class=onboarding-screen__inner>
		<h1 class=onboarding-brand>Readalong <sup style="color:var(--text-tertiary)">b&egrave;ta</sup></h1>

		<div class=onboarding-card>
			<div class=onboarding-demo>
				<article class=story lang=<?= e($defaultRead) ?> translate=no data-onboarding-demo-story>
					<p>
						<span tabindex=0 data-sentence=0 lang=<?= e($defaultRead) ?> data-translation="<?= e($demoTranslation[0]) ?>" aria-current=true><?= e($demoSource[0]) ?></span>
						<span tabindex=0 data-sentence=1 lang=<?= e($defaultRead) ?> data-translation="<?= e($demoTranslation[1]) ?>"><?= e($demoSource[1]) ?></span>
					</p>
				</article>

<?php include __DIR__ . '/translation-popover.php'; ?>

				<div class=onboarding-demo-controls>
					<button type=button class="play icon-only rounded" data-action=play onclick=play()>
						<span class=visually-hidden data-i18n=nav.play><?= e(t('nav.play')) ?></span>
						<?php icon('play'); ?>
					</button>
					<button type=button class="pause icon-only rounded pressed" data-action=pause onclick=pause()>
						<span class=visually-hidden data-i18n=nav.pause><?= e(t('nav.pause')) ?></span>
						<?php icon('pause'); ?>
					</button>
					<progress value="0" max="100"></progress>
				</div>

				<audio src="assets/audio/onboarding-silence.wav" preload=auto playsinline muted hidden></audio>
			</div>

			<div class=onboarding-languages>
				<div class=onboarding-languages__row>
					<label for=onboarding-read data-i18n=onboarding.read_along><?= e(t('onboarding.read_along')) ?></label>
					<select id=onboarding-read class=onboarding-select data-onboarding-read translate=no>
<?php foreach ($languages as $code): ?>
						<option value=<?= e($code) ?> lang=<?= e($code) ?><?= $code === $defaultRead ? ' selected' : '' ?>><?= e(lang_endonym($code)) ?></option>
<?php endforeach; ?>
					</select>
					<?php icon('chevron-down', ['size' => 16]); ?>
				</div>
			</div>

			<div class=onboarding-translations>
				<span class=onboarding-translations__label data-i18n=onboarding.translations_label><?= e(t('onboarding.translations_label')) ?></span>
				<div class="pill-row onboarding-translations__pills" role=group aria-label="<?= e(t('onboarding.translations_label')) ?>">
<?php foreach ($languages as $code): ?>
<?php if ($code === $defaultRead) continue; ?>
					<button type=button class=pill data-onboarding-translate-pill="<?= e($code) ?>" aria-pressed=<?= in_array($code, $translateLangsSelected, true) ? 'true' : 'false' ?> translate=no lang=<?= e($code) ?>>
						<?php icon('check', ['size' => 16, 'class' => 'pill__check']); ?>
						<?= e(lang_endonym($code)) ?>
					</button>
<?php endforeach; ?>
				</div>
			</div>
		</div>
	</div>

	<div class=onboarding-footer>
		<div class=onboarding-footer__inner>
			<button type=button class="primary onboarding-continue" data-onboarding-continue data-i18n=onboarding.continue><?= e(t('onboarding.continue')) ?></button>
			<p class=onboarding-change-later data-i18n=onboarding.change_later><?= e(t('onboarding.change_later')) ?></p>
		</div>
	</div>
</div>

<script type="application/json" id="story-config"><?= json_encode($storyConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>
<script type="text/javascript">
	window.READALONG_I18N = <?= json_encode(ui_strings(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_LANGS = <?= json_encode($languages, JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_DEMO = <?= json_encode($segments, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script type="text/javascript" src="assets/scripts.js?v=19"></script>
<script type="text/javascript" src="assets/onboarding.js?v=8"></script>
