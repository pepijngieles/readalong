			<div class=selection-row lang=en translate=yes>
				<div class=voice>
					<label for=voice>Voice</label>
					<select id=voice name=voice class=quiet data-voice data-change="switchVoice"<?= count($story['voices']) === 1 ? ' disabled' : '' ?>>
						<?= voiceOptions($story['voices']) ?>
					</select>
					<svg width=16 height=16 class=icon aria-hidden=true>
						<use xlink:href=#chevron-down></use>
					</svg>
				</div>
				<dl class=duration>
					<dt>Duration</dt>
					<dd data-duration><?= e($story['duration']) ?></dd>
				</dl>
			</div>

			<noscript class=info>
				It seems like javascript is turned off. You can still hit play and read along. When you turn on javascript you can easily replay sentences, change the playback speed or add pauses in between sentences.
			</noscript>
