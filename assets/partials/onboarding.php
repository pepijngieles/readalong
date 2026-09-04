<?php
$sourceLangs = story_source_languages(__DIR__ . '/../../stories');
$translationLangs = story_translation_languages(__DIR__ . '/../../stories');
?>
<div class=onboarding-screen>
	<div class=onboarding-screen__inner>
		<h1 class=onboarding-brand>Readalong <sup style="color:var(--text-tertiary)">b&egrave;ta</sup></h1>
		<h2 class=onboarding-title data-i18n=onboarding.title><?= e(t('onboarding.title')) ?></h2>
		<p class=onboarding-intro data-i18n=onboarding.intro><?= e(t('onboarding.intro')) ?></p>

		<fieldset class=onboarding-languages>
			<legend class=onboarding-languages__legend data-i18n=onboarding.read_along><?= e(t('onboarding.read_along')) ?></legend>
			<div class=onboarding-languages__grid>
<?php foreach ($sourceLangs as $code): ?>
				<label class=onboarding-language>
					<input type=radio name=read value=<?= e($code) ?> data-onboarding-read>
					<span class=onboarding-language__button data-i18n="lang.<?= e($code) ?>"><?= e(t('lang.' . $code)) ?></span>
				</label>
<?php endforeach; ?>
			</div>
		</fieldset>

		<p class=onboarding-note>
			<span data-i18n=onboarding.translations_note data-i18n-template=onboarding.translations_note><?= e(t('onboarding.translations_note', ['language' => t('lang.' . ui_locale())])) ?></span>
			<label for=onboarding-translate class=onboarding-translate-label data-i18n=onboarding.other_language><?= e(t('onboarding.other_language')) ?></label>
			<select id=onboarding-translate class=quiet data-onboarding-translate translate=no>
<?php foreach ($translationLangs as $code): ?>
				<option value=<?= e($code) ?> data-i18n="lang.<?= e($code) ?>"><?= e(t('lang.' . $code)) ?></option>
<?php endforeach; ?>
			</select>
			<?php icon('chevron-down', ['size' => 16]); ?>
		</p>

		<button type=button class="primary onboarding-continue" data-onboarding-continue data-i18n=onboarding.continue><?= e(t('onboarding.continue')) ?></button>
	</div>
</div>

<script type="text/javascript">
	window.READALONG_I18N = <?= json_encode(ui_strings(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_LANGS = <?= json_encode(configured_languages(), JSON_UNESCAPED_UNICODE) ?>;
</script>
<script type="text/javascript" src="assets/onboarding.js"></script>
