<?php
$settingsCatalog = !empty($settingsCatalog);
$settingsReader = !empty($settingsReader);
$translateSelectLabel = lang_endonym($translateLang ?? ui_locale());
?>
	<dialog id=settings class="dialog-sheet settings"<?php if ($settingsCatalog): ?> aria-labelledby=settings-title<?php else: ?> aria-label="<?= e(t('nav.settings')) ?>"<?php endif; ?>>
		<div class=panel>
			<button type=button class="close-button quiet icon-only" data-el=close-button data-click="closeDialog(settings)">
				<span class=visually-hidden><?= e(t('common.close')) ?></span>
				<?php icon('close-small'); ?>
			</button>
<?php if ($settingsCatalog): ?>
			<h2 id=settings-title class=font-size-large><?= e(t('nav.settings')) ?></h2>
<?php endif; ?>
			<form name=settings class="content grid gap-medium" data-input=updateSettings data-change=updateSettings>
<?php if ($settingsCatalog): ?>

				<div class="settings-catalog flex columns gap-small">
					<div class="flex columns gap-3xs onboarding-ui-field">
						<label for=settings-translate-trigger class=onboarding-field-label data-i18n=onboarding.app_language_label><?= e(t('onboarding.app_language_label')) ?></label>
						<div id=settings-translate-control class="home-title-control onboarding-ui-control full-width">
							<button type=button id=settings-translate-trigger class="quiet home-title-trigger onboarding-ui-trigger" data-click=toggleTitleMenu aria-expanded=false aria-haspopup=listbox aria-controls=settings-translate-menu>
								<span data-title-label translate=no lang=<?= e($translateLang) ?>><?= e($translateSelectLabel) ?></span>
								<?php icon('chevron-down', ['size' => 16]); ?>
							</button>
							<div id=settings-translate-menu class=title-menu hidden role=listbox data-multiple=false data-translate-along data-change=saveCatalogPrefs>
<?php foreach ($translateLangOptions as $code): ?>
								<label role=option aria-selected=<?= $code === $translateLang ? 'true' : 'false' ?> translate=no lang=<?= e($code) ?>>
									<input type=radio name=settings-translate value="<?= e($code) ?>"<?= $code === $translateLang ? ' checked' : '' ?>>
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
				</div>
<?php endif; ?>
<?php if ($settingsReader): ?>

				<fieldset class="settings-segment flex gap-xs">
					<legend class=visually-hidden><?= e(t('settings.font')) ?></legend>
					<label>
						<input type=radio name=fontFamily value=sans checked>
						<span class=button>
							<span class="preview sans" aria-hidden=true>Aa</span>
							<span class=label><?= e(t('settings.sans')) ?></span>
						</span>
					</label>
					<label>
						<input type=radio name=fontFamily value=serif>
						<span class=button>
							<span class="preview serif" aria-hidden=true>Aa</span>
							<span class=label><?= e(t('settings.serif')) ?></span>
						</span>
					</label>
					<label>
						<input type=radio name=fontFamily value=mono>
						<span class=button>
							<span class="preview mono" aria-hidden=true>Aa</span>
							<span class=label><?= e(t('settings.mono')) ?></span>
						</span>
					</label>
				</fieldset>

				<div class="settings-slider flex gap-xs">
					<?php icon('font-small'); ?>
					<label class=visually-hidden for=fontSize><?= e(t('settings.font_size')) ?></label>
					<input type=range name=fontSize id=fontSize min=80 max=240 value=100 step=10>
					<?php icon('font-large'); ?>
				</div>

				<div class="settings-slider flex gap-xs">
					<?php icon('line-tight'); ?>
					<label class=visually-hidden for=lineHeight><?= e(t('settings.line_spacing')) ?></label>
					<input type=range name=lineHeight id=lineHeight min=1 max=3 value=1.5 step=0.1>
					<?php icon('line-loose'); ?>
				</div>

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

<?php endif; ?>
				<fieldset class="settings-segment settings-appearance flex gap-xs">
					<legend class=visually-hidden><?= e(t('settings.appearance')) ?></legend>
					<label>
						<input type=radio name=appearance value=system checked>
						<span class=button>
							<?php icon('sun-moon', ['size' => 24]); ?>
							<span class=label><?= e(t('settings.system')) ?></span>
						</span>
					</label>
					<label>
						<input type=radio name=appearance value=light>
						<span class=button>
							<?php icon('sun', ['size' => 24]); ?>
							<span class=label><?= e(t('settings.light')) ?></span>
						</span>
					</label>
					<label>
						<input type=radio name=appearance value=dark>
						<span class=button>
							<?php icon('moon', ['size' => 24]); ?>
							<span class=label><?= e(t('settings.dark')) ?></span>
						</span>
					</label>
				</fieldset>

				<div class="settings-row flex gap-medium">
					<fieldset class="settings-themes flex gap-2xs">
						<legend class=visually-hidden><?= e(t('settings.paper')) ?></legend>
						<label class=settings-theme>
							<input type=radio name=paper value=neutral checked>
							<span class="swatch light" aria-hidden=true></span>
							<span class=visually-hidden><?= e(t('settings.neutral')) ?></span>
						</label>
						<label class=settings-theme>
							<input type=radio name=paper value=warm>
							<span class="swatch cream" aria-hidden=true></span>
							<span class=visually-hidden><?= e(t('settings.cream')) ?></span>
						</label>
					</fieldset>
<?php if ($settingsReader): ?>

					<fieldset class="settings-layouts flex gap-2xs">
						<legend class=visually-hidden><?= e(t('settings.text_alignment')) ?></legend>
						<label class=settings-layout>
							<input type=radio name=layout value=start checked>
							<span class=button aria-hidden=true><?php icon('text-align-start', ['width' => 23, 'height' => 29]); ?></span>
							<span class=visually-hidden><?= e(t('settings.align_start')) ?></span>
						</label>
						<label class=settings-layout>
							<input type=radio name=layout value=justify>
							<span class=button aria-hidden=true><?php icon('text-align-justify', ['width' => 23, 'height' => 29]); ?></span>
							<span class=visually-hidden><?= e(t('settings.justify')) ?></span>
						</label>
					</fieldset>
<?php endif; ?>

				</div>

			</form>

		</div>
	</dialog>
