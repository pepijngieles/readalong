		<div data-translation-popover class=translation-popover>

			<span data-translation-text></span>

			<button class="quiet small" onclick="toggleTranslation()" data-show-translation data-i18n=story.show_translation><?= e(t('story.show_translation')) ?></button>

			<button onclick="toggleTranslation()" data-hide-translation class="quiet icon-only small rounded">
				<span class=visually-hidden data-i18n=story.hide_translation><?= e(t('story.hide_translation')) ?></span>
				<?php icon('close'); ?>
				<?php icon('curve', ['width' => 80, 'height' => 24, 'class' => 'curve']); ?>
			</button>
		</div>
