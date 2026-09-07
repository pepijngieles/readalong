<?php if (!empty($story['attribution'])): ?>
		<p class="info source">
			<?= e(t('story.source')) ?>
<?php
  $a = $story['attribution'];
  if (!empty($a['title'])):
    if (!empty($a['url'])): ?>
			<a href="<?= e($a['url']) ?>" target="_blank" rel="noopener"><?= e($a['title']) ?></a>
<?php else: ?>
			<?= e($a['title']) ?>
<?php
    endif;
  endif; ?>
		</p>
<?php endif; ?>
