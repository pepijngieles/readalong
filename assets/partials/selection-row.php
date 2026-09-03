<?php $locked = count($story['voices']) === 1; ?>
			<div class=selection-row lang=en translate=yes>
				<div class=voice>
					<label for=voice>Voice</label>
					<select id=voice name=voice class=quiet data-voice<?= $locked ? ' disabled' : '' ?>>
<?php foreach ($story['voices'] as $v): ?>
						<option value=<?= $v['value'] ?><?= $v['value'] === $activeVoiceId ? ' selected' : '' ?>><?= e($v['label']) ?></option>
<?php endforeach; ?>
					</select>
<?php if (!$locked): ?>
					<?php icon('chevron-down', ['size' => 16]); ?>
<?php endif; ?>
				</div>
				<dl class=duration>
					<dt>Duration</dt>
					<dd data-duration><?= e($story['duration']) ?></dd>
				</dl>
			</div>
