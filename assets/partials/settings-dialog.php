	<div class="settings-scrim" onclick="closeSettings()" hidden></div>

	<form id=settings class="settings-popover" oninput="updateSettings()" onchange="updateSettings()" hidden>

		<div class="settings-grabber" aria-hidden="true"></div>

		<fieldset class="settings-segment">
			<legend class="visually-hidden">Font</legend>
			<label class="settings-segment__option">
				<input type=radio name=fontFamily value=sans checked>
				<span class="settings-segment__button">
					<span class="settings-segment__preview settings-segment__preview--sans" aria-hidden="true">Aa</span>
					<span class="settings-segment__label">Sans</span>
				</span>
			</label>
			<label class="settings-segment__option">
				<input type=radio name=fontFamily value=serif>
				<span class="settings-segment__button">
					<span class="settings-segment__preview settings-segment__preview--serif" aria-hidden="true">Aa</span>
					<span class="settings-segment__label">Serif</span>
				</span>
			</label>
			<label class="settings-segment__option">
				<input type=radio name=fontFamily value=mono>
				<span class="settings-segment__button">
					<span class="settings-segment__preview settings-segment__preview--mono" aria-hidden="true">Aa</span>
					<span class="settings-segment__label">Mono</span>
				</span>
			</label>
		</fieldset>

		<div class="settings-slider">
			<?php icon('font-small'); ?>
			<label class="visually-hidden" for=fontSize>Font size</label>
			<input type=range name=fontSize id=fontSize min=80 max=240 value=100 step=10>
			<?php icon('font-large'); ?>
		</div>

		<div class="settings-slider">
			<?php icon('line-tight'); ?>
			<label class="visually-hidden" for=lineHeight>Line spacing</label>
			<input type=range name=lineHeight id=lineHeight min=1 max=3 value=1.5 step=0.1>
			<?php icon('line-loose'); ?>
		</div>

		<div class="settings-slider">
			<?php icon('speed-rabbit'); ?>
			<label class="visually-hidden" for=playbackRate>Playback speed</label>
			<input type=range name=playbackRate id=playbackRate min=0.6 max=1.2 value=1 step=0.01>
			<output name=playbackRateOut id=playbackRateOut for=playbackRate>1×</output>
		</div>

		<div class="settings-slider">
			<?php icon('pause-bars'); ?>
			<label class="visually-hidden" for=sentencePause>Pause between sentences</label>
			<input type=range name=sentencePause id=sentencePause min=0 max=5000 value=0 step=80>
			<output name=sentencePauseOut id=sentencePauseOut for=sentencePause>0s</output>
		</div>

		<div class="settings-row">
			<fieldset class="settings-themes">
				<legend class="visually-hidden">Theme</legend>
				<label class="settings-theme">
					<input type=radio name=theme value=light checked>
					<span class="settings-theme__swatch settings-theme__swatch--light" aria-hidden="true"></span>
					<span class="visually-hidden">Light</span>
				</label>
				<label class="settings-theme">
					<input type=radio name=theme value=cream>
					<span class="settings-theme__swatch settings-theme__swatch--cream" aria-hidden="true"></span>
					<span class="visually-hidden">Cream</span>
				</label>
				<label class="settings-theme">
					<input type=radio name=theme value=dark>
					<span class="settings-theme__swatch settings-theme__swatch--dark" aria-hidden="true"></span>
					<span class="visually-hidden">Dark</span>
				</label>
			</fieldset>

			<fieldset class="settings-layouts">
				<legend class="visually-hidden">Text alignment</legend>
				<label class="settings-layout">
					<input type=radio name=layout value=start checked>
					<span class="settings-layout__button" aria-hidden="true"><?php icon('text-align-start', ['width' => 23, 'height' => 29]); ?></span>
					<span class="visually-hidden">Align start</span>
				</label>
				<label class="settings-layout">
					<input type=radio name=layout value=justify>
					<span class="settings-layout__button" aria-hidden="true"><?php icon('text-align-justify', ['width' => 23, 'height' => 29]); ?></span>
					<span class="visually-hidden">Justify</span>
				</label>
			</fieldset>
		</div>

	</form>
