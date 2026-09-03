	<form id=settings class="settings-popover" oninput="updateSettings()" hidden>

		<label for=playbackRate>Playback speed</label>
		<input type=range name=playbackRate id=playbackRate min=0.6 max=1.2 value=1 step=0.01 list=playbackRates>
		<datalist id=playbackRates>
			<option>1</option>
		</datalist>
		<br><br>

		<label for=sentencePause>Pause between sentences</label>
		<input type=range name=sentencePause id=sentencePause min=0 max=5000 value=0 step=80><br><br>

		<!--<label for=volume>Volume</label>
		<input type=range name=volume id=volume min=0 max=1 value=1 step=0.02><br><br>-->

		<label for=fontSize>Font size</label>
		<input type=range name=fontSize id=fontSize min=80 max=240 value=100 step=10 list=fontSizes><br>
		<datalist id=fontSizes>
			<option>100</option>
		</datalist>
		<br>

		<label for=lineHeight>Line height</label>
		<input type=range name=lineHeight id=lineHeight min=1 max=3 value=1.5 step=0.1 list=lineHeights><br>
		<datalist id=lineHeights>
			<option>1.5</option>
		</datalist>
		<br>

		<button type=button onclick="toggleSettings()" style=float:right>Close</button>

	</form>
