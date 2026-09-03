<?php
require_once __DIR__ . '/assets/helpers.php';
require_once __DIR__ . '/assets/story.php';

$base = '';
$story = ['title' => 'Readalong'];
$stories = story_list(__DIR__ . '/stories');
$partials = __DIR__ . '/assets/partials';
?>
<?php include $partials . '/head.php'; ?>
<body>

	<main>

		<div class="add-app-popover velvet hide-on-standalone js-only ios-only">
			<button class="close-button quiet icon-only" onclick="hideAppBanner()">
				<span class=visually-hidden>Close banner</span>
				<?php icon('close-small'); ?>
			</button>
			<img src="assets/favicons/favicon.svg" class=app-icon width=40>
			<div class=text>
				<h3>Readalong</h3>
				<small>Use the app</small>
			</div>
			<button class="primary small" onclick="toggleExplanationPopover()">View</button>
		</div>

		<script type="text/javascript">
			const appBanner = document.querySelector('.add-app-popover');

			function hideAppBanner() {
				document.body.classList.add('hide-app-banner')
				let bannerTimeOut = setTimeout(function(){
					appBanner.remove()
				}, 200)
			}

			function toggleExplanationPopover() {
				document.body.classList.toggle('show-install-explanation')
			}
		</script>

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
				<?php icon('chevron-down', ['size' => 16]); ?>
			</div>
			<div class=app-language>
				<label for=app-language>Translate into</label>
				<select id=app-language name=app-language class=quiet data-app-language translate=no>
					<option value=en selected>English (UK)</option>
					<option value=es disabled>Espa&ntilde;ol</option>
					<option value=hu disabled>Magyar</option>
					<option value=nl disabled>Nederlands</option>
				</select>
				<?php icon('chevron-down', ['size' => 16]); ?>
			</div>
		</div>

		<ul class=list>
<?php foreach ($stories as $item): ?>
			<li>
				<a href="stories/<?= e($item['slug']) ?>/">
					<p><?= e($item['title']) ?></p>
					<small><?= e($item['duration']) ?></small>
				</a>
			</li>
<?php endforeach; ?>
		</ul>

		<p class="info velvet">
			Your feedback is appreciated! Please <a href="mailto:pepijngieles@proton.me?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A">send an email</a> to pepijngieles@proton.me or <a href="https://github.com/pepijngieles/read-along" target="_blank" rel="noopener">report an issue on GitHub</a>.
		</p>

	</main>

	<div class="explanation-popover pointer bottom-center hide-on-standalone js-only ios-only" onclick="toggleExplanationPopover()">
		<h3>Add to your home screen</h3>
		<small class=description>Access Readalong easily with a web app on your home screen:</small>
		<ol>
			<li>Open in Safari</li>
			<li>
				Tap the share icon<?php icon('share-ios', ['style' => 'color:#036EFC']); ?>
			</li>
			<li>Select Add to Home Screen<?php icon('add-ios'); ?></li>
		</ol>
	</div>

	<script type="text/javascript">
		function iOS() {
		  return [
		    'iPad Simulator',
		    'iPhone Simulator',
		    'iPod Simulator',
		    'iPad',
		    'iPhone',
		    'iPod'
		  ].includes(navigator.platform)
		  // iPad on iOS 13 detection
		  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
		}

		if (iOS()) document.body.classList.add('ios')
	</script>

</body>
</html>
