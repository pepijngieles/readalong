<?php $locked = count($story['voices']) === 1; ?>
			<div class=selection-row lang=en translate=yes>
				<div class=voice>
					<label for=voice>Voice</label>
					<select id=voice name=voice class=quiet data-voice<?= $locked ? ' disabled' : '' ?>>
<?php foreach ($story['voices'] as $i => $v): ?>
						<option value=<?= $v['value'] ?><?= $i === 0 ? ' selected' : '' ?>><?= e($v['label']) ?></option>
<?php endforeach; ?>
					</select>
<?php if (!$locked): ?>
					<svg width=16 height=16 class=icon aria-hidden=true>
						<use xlink:href=#chevron-down></use>
					</svg>
<?php endif; ?>
				</div>
				<dl class=duration>
					<dt>Duration</dt>
					<dd data-duration><?= e($story['duration']) ?></dd>
				</dl>
			</div>
