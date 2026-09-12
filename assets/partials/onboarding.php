<?php
require_once __DIR__ . '/../story.php';

$storiesDir = dirname(__DIR__, 2) . '/stories';
$contentLangs = story_content_languages($storiesDir);
$translationLangsBySource = [];
foreach ($contentLangs as $code) {
  $translationLangsBySource[$code] = story_translation_languages_for_source($storiesDir, $code);
}
$uiLang = detect_browser_locale(configured_languages());
$defaultRead = in_array('nl', $contentLangs, true) ? 'nl' : ($contentLangs[0] ?? 'no');
$translateLangOptions = $translationLangsBySource[$defaultRead] ?? [];
$defaultTranslate = lang_prefs_list('translate', $translateLangOptions, [$uiLang])[0] ?? ($translateLangOptions[0] ?? 'en');
$translateSelectLabel = lang_endonym($defaultTranslate);
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
			<div class="onboarding-step flex columns gap-medium" data-onboarding-step=1>
				<div class="flex columns gap-3xs onboarding-ui-field">
					<span id=onboarding-read-label class=onboarding-field-label data-i18n=onboarding.read_along><?= e(t('onboarding.read_along')) ?></span>
					<div class="onboarding-read-list flex columns gap-2xs" role=radiogroup aria-labelledby=onboarding-read-label data-onboarding-read-list data-change=onboardingReadChange>
<?php foreach ($contentLangs as $code): ?>
						<label class=onboarding-lang-option role=option aria-selected=<?= $code === $defaultRead ? 'true' : 'false' ?> translate=no lang=<?= e($code) ?>>
<?php if (lang_flag_path($code) !== null): ?>
							<?= lang_flag($code, ['decorative' => true]) ?>
<?php endif; ?>
							<span data-lang-label="<?= e($code) ?>"><?= e(lang_label($code)) ?></span>
							<input type=radio name=onboarding-read value="<?= e($code) ?>"<?= $code === $defaultRead ? ' checked' : '' ?>>
						</label>
<?php endforeach; ?>
					</div>
				</div>

				<div class="flex columns gap-3xs onboarding-ui-field">
					<label for=onboarding-translate-trigger class=onboarding-field-label data-i18n=onboarding.app_language_label><?= e(t('onboarding.app_language_label')) ?></label>
					<div class="home-title-control onboarding-ui-control full-width">
						<button type=button id=onboarding-translate-trigger class="quiet home-title-trigger onboarding-ui-trigger" data-click=toggleTitleMenu aria-expanded=false aria-haspopup=listbox aria-controls=onboarding-translate-menu>
							<span data-title-label translate=no lang=<?= e($defaultTranslate) ?>><?= e($translateSelectLabel) ?></span>
							<?php icon('chevron-down', ['size' => 16]); ?>
						</button>
						<div id=onboarding-translate-menu class=title-menu hidden role=listbox data-multiple=false data-pref=translate data-change=onboardingTranslateMenu>
<?php foreach ($translateLangOptions as $code): ?>
							<label role=option aria-selected=<?= $code === $defaultTranslate ? 'true' : 'false' ?> translate=no lang=<?= e($code) ?>>
								<input type=radio name=onboarding-translate value="<?= e($code) ?>"<?= $code === $defaultTranslate ? ' checked' : '' ?>>
								<?php icon('check', ['size' => 16]); ?>
<?php if (lang_flag_path($code) !== null): ?>
								<?= lang_flag($code, ['decorative' => true]) ?>
<?php endif; ?>
								<span><?= e(lang_endonym($code)) ?></span>
							</label>
<?php endforeach; ?>
						</div>
					</div>
				</div>

				<div class="flex columns gap-xs onboarding-step-actions">
					<button type=button class="primary full-width onboarding-continue onboarding-next" data-onboarding-next data-click=onboardingNext data-i18n=onboarding.next><?= e(t('onboarding.next')) ?></button>
				</div>
			</div>

			<div class="onboarding-step flex columns gap-medium" data-onboarding-step=2 hidden>
				<button type=button class="quiet onboarding-back" data-click=onboardingBack><?php icon('back', ['size' => 16]); ?><span data-i18n=onboarding.back><?= e(t('onboarding.back')) ?></span></button>

				<div class="onboarding-demo flex columns gap-medium">
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

				<form name=settings id=settings class="onboarding-settings flex columns gap-small" data-input=updateSettings data-change=updateSettings>
					<input type=hidden name=fontFamily value=sans>
					<div class="settings-slider flex gap-xs">
						<?php icon('speed-rabbit'); ?>
						<label class=visually-hidden for=playbackRate><?= e(t('settings.playback_speed')) ?></label>
						<input type=range name=playbackRate id=playbackRate min=0.6 max=1.2 value=1 step=0.01>
						<output name=playbackRateOut id=playbackRateOut for=playbackRate>1×</output>
					</div>
					<div class="settings-slider flex gap-xs">
						<?php icon('pause-bars'); ?>
						<label class=visually-hidden for=sentencePause><?= e(t('settings.sentence_pause')) ?></label>
						<input type=range name=sentencePause id=sentencePause min=0 max=5000 value=0 step=80>
						<output name=sentencePauseOut id=sentencePauseOut for=sentencePause>0s</output>
					</div>
				</form>

				<div class="flex columns gap-xs onboarding-step-actions">
					<button type=button class="primary full-width onboarding-continue" data-onboarding-continue data-click=completeOnboarding data-i18n=onboarding.continue><?= e(t('onboarding.continue')) ?></button>
					<p class="onboarding-change-later text-color-tertiary font-size-small" data-i18n=onboarding.change_later><?= e(t('onboarding.change_later')) ?></p>
				</div>
			</div>
		</div>
	</div>
</div>

<script type="application/json" id="story-config"><?= json_encode($storyConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>
<script type="text/javascript">
	window.READALONG_I18N = <?= json_encode(ui_strings(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_LANGS = <?= json_encode(configured_languages(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;
	window.LANG_FLAG_CODES = <?= json_encode(lang_flag_codes(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_DEMO = <?= json_encode($segments, JSON_UNESCAPED_UNICODE) ?>;
	window.TRANSLATION_LANGS_BY_SOURCE = <?= json_encode($translationLangsBySource, JSON_UNESCAPED_UNICODE) ?>;
	window.ONBOARDING_DEFAULT_READ = <?= json_encode($defaultRead, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script type="text/javascript" src="assets/brio/brio.js?v=1" defer></script>
<script type="text/javascript" src="assets/settings.js?v=5" defer></script>
<script type="text/javascript" src="assets/scripts.js?v=25" defer></script>
<script type="text/javascript" src="assets/onboarding.js?v=14" defer></script>
