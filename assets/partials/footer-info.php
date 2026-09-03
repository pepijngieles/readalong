<?php if (!empty($story['attribution'])): ?>
		<p class="info source">
			Source:
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
		<p class=info>
			More content will follow soon. Do you want to request a new story or conversation? Please <a href="mailto:support@readalong.io?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A">send an email</a> to support@readalong.io
		</p>
