<?php require_once __DIR__ . '/assets/helpers.php'; ?>
<!DOCTYPE html>
<html lang=en translate=yes class=no-js>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#ffffff" />

	<title>Readalong</title>

	<script type="module">
		document.documentElement.classList.remove('no-js');
		document.documentElement.classList.add('js');
	</script>

	<link rel=icon href=assets/favicons/favicon.svg type=image/svg+xml>
	<link rel=apple-touch-icon href=assets/favicons/favicon-180.png>
	<link rel=manifest href=manifest.json>
	<link rel="stylesheet" type="text/css" href="assets/styles.css?v=3">
</head>
<body id=app>

<?php readfile(__DIR__ . '/assets/icons.svg'); ?>

	<main>

		<div class="add-app-popover velvet hide-on-standalone js-only ios-only">
			<button class="close-button quiet icon-only" data-click="hideAppBanner">
				<span class=visually-hidden>Close banner</span>
				<svg width=24 height=24 class=icon aria-hidden=true>
					<use xlink:href=#close-small></use>
				</svg>
			</button>
			<img src="assets/favicons/favicon.svg" class=app-icon width=40 alt="">
			<div class=text>
				<h3>Readalong</h3>
				<small>Use the app</small>
			</div>
			<button class="primary small" data-click="toggleClassName(app,show-install-explanation)">View</button>
		</div>

		<h1>Readalong <sup style="color:var(--text-tertiary)">b&egrave;ta</sup></h1>
		<p>Read foreign languages along with native speakers. No tests, no rankings, no gamification. Just read along at your pace.</p>

		<div class=selection-row>
			<div class=read-along>
				<label for=read-along>Read along</label>
				<select id=read-along name=read-along class=quiet data-read-along>
					<option value=en disabled>English (UK)</option>
					<option value=nl selected>Dutch</option>
					<option value=es disabled>Spanish</option>
					<option value=hu disabled>Hungarian</option>
				</select>
				<svg width=16 height=16 class=icon aria-hidden=true>
					<use xlink:href=#chevron-down></use>
				</svg>
			</div>
			<div class=app-language>
				<label for=app-language>Translate into</label>
				<select id=app-language name=app-language class=quiet data-app-language translate=no>
					<option value=en selected>English (UK)</option>
					<option value=es disabled>Espa&ntilde;ol</option>
					<option value=hu disabled>Magyar</option>
					<option value=nl disabled>Nederlands</option>
				</select>
				<svg width=16 height=16 class=icon aria-hidden=true>
					<use xlink:href=#chevron-down></use>
				</svg>
			</div>
		</div>

		<ul class=list>
			<li>
				<a href="stories/story-one/">
					<p>The story of two frogs</p>
					<small>01:36</small>
				</a>
			</li>
			<li>
				<a href="stories/story-two/">
					<p>What's your favorite food?</p>
					<small>01:04</small>
				</a>
			</li>
		</ul>

		<p class="info velvet">
			Your feedback is appreciated! Please <a href="mailto:pepijngieles@proton.me?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A">send an email</a> to pepijngieles@proton.me or <a href="https://github.com/pepijngieles/read-along" target="_blank" rel="noopener">report an issue on GitHub</a>.
		</p>

	</main>

	<div class="explanation-popover pointer bottom-center hide-on-standalone js-only ios-only" data-click="toggleClassName(app,show-install-explanation)">
		<h3>Add to your home screen</h3>
		<small class=description>Access Readalong easily with a web app on your home screen:</small>
		<ol>
			<li>Open in Safari</li>
			<li>
				Tap the share icon<svg width=24 height=24 class=icon aria-hidden=true style=color:#036EFC><use xlink:href=#share-ios></use></svg>
			</li>
			<li>Select Add to Home Screen<svg width=24 height=24 class=icon aria-hidden=true><use xlink:href=#add-ios></use></svg></li>
		</ol>
	</div>

	<script type="text/javascript" src="assets/ios-detect.js" defer></script>
	<script type="text/javascript" src="assets/ios-banner.js" defer></script>
	<script type="text/javascript" src="assets/brio/brio.js" defer></script>

</body>
</html>
