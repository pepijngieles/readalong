	<dialog id=settings class="settings-popover" aria-labelledby=settings-title>

		<form name=settings data-input="updateSettings">

		<h2 id=settings-title>Settings</h2>

		<label for=playbackRate>Playback speed <span data-bind="#playbackRate"></span>&times;</label>
		<input type=range name=playbackRate id=playbackRate min=0.6 max=1.2 value=1 step=0.01 list=playbackRates>
		<datalist id=playbackRates>
			<option>1</option>
		</datalist>
		<br><br>

		<label for=sentencePause>Pause between sentences <span data-bind="#sentencePause"></span> ms</label>
		<input type=range name=sentencePause id=sentencePause min=0 max=5000 value=0 step=80><br><br>

		<label for=fontSize>Font size <span data-bind="#fontSize"></span>%</label>
		<input type=range name=fontSize id=fontSize min=80 max=240 value=100 step=10 list=fontSizes><br>
		<datalist id=fontSizes>
			<option>100</option>
		</datalist>
		<br>

		<label for=lineHeight>Line height <span data-bind="#lineHeight"></span></label>
		<input type=range name=lineHeight id=lineHeight min=1 max=3 value=1.5 step=0.1 list=lineHeights><br>
		<datalist id=lineHeights>
			<option>1.5</option>
		</datalist>
		<br>

		<button type=button data-el=close-button data-click="closeDialog(settings)" style=float:right>Close</button>

		</form>

	</dialog>
