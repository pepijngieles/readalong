<?php $settingsReader = !empty($settingsReader); ?>
	<dialog id=settings class="dialog-sheet settings" aria-labelledby=settings-title>
		<div class=panel>
			<div class=settings-grabber aria-hidden=true></div>
			<button type=button class="close-button quiet icon-only" data-el=close-button data-click="closeDialog(settings)">
				<span class=visually-hidden><?= e(t('common.close')) ?></span>
				<?php icon('close-small'); ?>
			</button>
			<h2 id=settings-title class=visually-hidden><?= e(t('nav.settings')) ?></h2>
			<form name=settings class="content grid gap-medium" data-input=updateSettings data-change=updateSettings>
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
				<div class="settings-row flex gap-medium">
					<fieldset class="settings-themes flex gap-2xs">
						<legend class=visually-hidden><?= e(t('settings.theme')) ?></legend>
						<label class=settings-theme>
							<input type=radio name=theme value=light checked>
							<span class="swatch light" aria-hidden=true></span>
							<span class=visually-hidden><?= e(t('settings.light')) ?></span>
						</label>
						<label class=settings-theme>
							<input type=radio name=theme value=cream>
							<span class="swatch cream" aria-hidden=true></span>
							<span class=visually-hidden><?= e(t('settings.cream')) ?></span>
						</label>
						<label class=settings-theme>
							<input type=radio name=theme value=dark>
							<span class="swatch dark" aria-hidden=true></span>
							<span class=visually-hidden><?= e(t('settings.dark')) ?></span>
						</label>
						<label class=settings-theme>
							<input type=radio name=theme value=black>
							<span class="swatch black" aria-hidden=true></span>
							<span class=visually-hidden><?= e(t('settings.black')) ?></span>
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
