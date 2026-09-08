<?php
require_once __DIR__ . '/../story.php';

$storiesDir = dirname(__DIR__, 2) . '/stories';
$sourceLangs = story_source_languages($storiesDir);
$translationLangsBySource = [];
foreach ($sourceLangs as $code) {
  $translationLangsBySource[$code] = story_translation_languages_for_source($storiesDir, $code);
}
$uiLang = detect_browser_locale(configured_languages());
$defaultRead = 'no';
$translateLangOptions = $translationLangsBySource[$defaultRead] ?? [];
$defaultTranslate = lang_prefs_list('translate', $translateLangOptions, [$uiLang])[0] ?? ($translateLangOptions[0] ?? 'en');
$segments = onboarding_demo_segments();
$demoSource = $segments[$defaultRead] ?? $segments['no'];
$demoTranslation = $segments[$defaultTranslate] ?? $segments['en'];
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
	<div class="flex columns gap-small page-width">
		<h1 class=onboarding-brand>Readalong</h1>

		<div class="onboarding-card flex columns gap-medium">
			<p class="onboarding-tagline text-color-secondary" data-i18n=home.tagline><?= e(t('home.tagline')) ?></p>

			<div class="flex columns gap-small">
				<div class="flex columns gap-3xs">
					<label for=onboarding-read data-i18n=onboarding.read_along><?= e(t('onboarding.read_along')) ?></label>
					<div class="select-wrap full-width">
						<select id=onboarding-read class=select-medium data-onboarding-read data-change=onboardingReadChange translate=no>
<?php foreach ($sourceLangs as $code): ?>
							<option value=<?= e($code) ?> lang=<?= e($code) ?><?= $code === $defaultRead ? ' selected' : '' ?>><?= e(lang_label($code)) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</div>
				<div class="flex columns gap-3xs">
					<label for=onboarding-translate data-i18n=home.translate_into><?= e(t('home.translate_into')) ?></label>
					<div class="select-wrap full-width">
						<select id=onboarding-translate class=select-medium data-onboarding-translate data-change=onboardingTranslateChange translate=no>
<?php foreach ($translateLangOptions as $code): ?>
							<option value="<?= e($code) ?>"<?= $code === $defaultTranslate ? ' selected' : '' ?> lang=<?= e($code) ?>><?= e(lang_endonym($code)) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</div>
			</div>

			<div class=onboarding-demo>
				<article class=story lang=<?= e($defaultRead) ?> translate=no data-onboarding-demo-story>
					<p>
						<span tabindex=0 data-sentence=0 lang=<?= e($defaultRead) ?> data-translation="<?= e($demoTranslation[0]) ?>" aria-current=true><?= e($demoSource[0]) ?></span>
						<span tabindex=0 data-sentence=1 lang=<?= e($defaultRead) ?> data-translation="<?= e($demoTranslation[1]) ?>"><?= e($demoSource[1]) ?></span>
					</p>
				</article>

<?php include __DIR__ . '/translation-popover.php'; ?>

				<div class="onboarding-demo-controls flex gap-xs">
					<button type=button class="play icon-only rounded" data-action=play data-click=play>
						<span class=visually-hidden data-i18n=nav.play><?= e(t('nav.play')) ?></span>
						<?php icon('play'); ?>
					</button>
					<button type=button class="pause icon-only rounded pressed" data-action=pause data-click=pause>
						<span class=visually-hidden data-i18n=nav.pause><?= e(t('nav.pause')) ?></span>
						<?php icon('pause'); ?>
					</button>
					<progress value="0" max="100"></progress>
				</div>

				<audio src="assets/audio/onboarding-silence.wav" preload=auto playsinline muted hidden></audio>
			</div>

			<div class="flex columns gap-xs">
				<button type=button class="primary full-width onboarding-continue" data-onboarding-continue data-click=completeOnboarding data-i18n=onboarding.continue><?= e(t('onboarding.continue')) ?></button>
				<p class="onboarding-change-later text-color-tertiary font-size-small" data-i18n=onboarding.change_later><?= e(t('onboarding.change_later')) ?></p>
			</div>
		</div>
	</div>
</div>

<script type="application/json" id="story-config"><?= json_encode($storyConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>
<script type="text/javascript">
	window.READALONG_I18N = <?= json_encode(ui_strings(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_LANGS = <?= json_encode($sourceLangs, JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_DEMO = <?= json_encode($segments, JSON_UNESCAPED_UNICODE) ?>;
	window.TRANSLATION_LANGS_BY_SOURCE = <?= json_encode($translationLangsBySource, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script type="text/javascript" src="assets/brio/brio.js?v=1" defer></script>
<script type="text/javascript" src="assets/scripts.js?v=20" defer></script>
<script type="text/javascript" src="assets/onboarding.js?v=10" defer></script>
