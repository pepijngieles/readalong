<?php if (!empty($story['source'])): ?>
		<p class="info source">
			Source:
<?php
  $s = $story['source'];
  if (!empty($s['title'])):
    if (!empty($s['url'])): ?>
			<a href="<?= e($s['url']) ?>" target="_blank" rel="noopener"><?= e($s['title']) ?></a>
<?php else: ?>
			<?= e($s['title']) ?>
<?php
    endif;
  endif;
  if (!empty($s['author'])): ?>
			· <?= e($s['author']) ?>
<?php endif;
  if (!empty($s['license'])): ?>
			· <?= e($s['license']) ?>
<?php endif;
  if (!empty($s['note'])): ?>
			· <?= e($s['note']) ?>
<?php endif; ?>
		</p>
<?php endif; ?>
		<p class=info>
			More content will follow soon. Do you want to request a new story or conversation? Please <a href="mailto:pepijngieles@proton.me?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A">send an email</a> to pepijngieles@proton.me
		</p>
