<?php
$sourceLangs = story_source_languages(__DIR__ . '/../../stories');
$translationLangs = story_translation_languages(__DIR__ . '/../../stories');
?>
<div class=onboarding-screen>
	<div class=onboarding-screen__inner>
		<h1 class=onboarding-brand>Readalong <sup style="color:var(--text-tertiary)">b&egrave;ta</sup></h1>

		<fieldset class=onboarding-languages>
			<legend class=onboarding-languages__legend data-i18n=onboarding.read_along><?= e(t('onboarding.read_along')) ?></legend>
			<div class=onboarding-languages__grid>
<?php foreach ($sourceLangs as $code): ?>
				<label class=onboarding-language>
					<span class=onboarding-language__button>
						<input type=radio name=read value=<?= e($code) ?> class=onboarding-language__radio data-onboarding-read>
						<span class=onboarding-language__label data-i18n="lang.<?= e($code) ?>"><?= e(t('lang.' . $code)) ?></span>
					</span>
				</label>
<?php endforeach; ?>
			</div>
		</fieldset>

		<div class=onboarding-translations>
			<label for=onboarding-translate data-i18n=onboarding.translations_label><?= e(t('onboarding.translations_label')) ?></label>
			<select id=onboarding-translate class=quiet data-onboarding-translate translate=no>
<?php foreach ($translationLangs as $code): ?>
				<option value=<?= e($code) ?> data-i18n="lang.<?= e($code) ?>"><?= e(t('lang.' . $code)) ?></option>
<?php endforeach; ?>
			</select>
			<?php icon('chevron-down', ['size' => 16]); ?>
		</div>

		<button type=button class="primary onboarding-continue" data-onboarding-continue data-i18n=onboarding.continue><?= e(t('onboarding.continue')) ?></button>
	</div>
</div>

<script type="text/javascript">
	window.READALONG_I18N = <?= json_encode(ui_strings(), JSON_UNESCAPED_UNICODE) ?>;
	window.READALONG_LANGS = <?= json_encode(configured_languages(), JSON_UNESCAPED_UNICODE) ?>;
</script>
<script type="text/javascript" src="assets/onboarding.js"></script>
