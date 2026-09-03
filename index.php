<?php
require_once __DIR__ . '/assets/helpers.php';
require_once __DIR__ . '/assets/story.php';

$base = '';
$story = ['title' => 'Readalong'];
$storiesDir = __DIR__ . '/stories';
$sourceLangs = story_source_languages($storiesDir);
$translationLangs = story_translation_languages($storiesDir);
$readAlongLang = lang_pref('read', $sourceLangs, 'nl');
$translationLang = lang_pref('translate', $translationLangs, 'en');
$stories = story_list($storiesDir, $translationLang, $readAlongLang);
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
<?php foreach ($sourceLangs as $code): ?>
					<option value=<?= e($code) ?><?= $code === $readAlongLang ? ' selected' : '' ?>><?= lang_label($code) ?></option>
<?php endforeach; ?>
				</select>
				<?php icon('chevron-down', ['size' => 16]); ?>
			</div>
			<div class=app-language>
				<label for=app-language>Translate into</label>
				<select id=app-language name=app-language class=quiet data-app-language translate=no>
<?php foreach ($translationLangs as $code): ?>
					<option value=<?= e($code) ?><?= $code === $translationLang ? ' selected' : '' ?>><?= lang_label($code) ?></option>
<?php endforeach; ?>
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
		const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

		function setLangPref(key, value) {
			localStorage.setItem('readalong-' + key, value);
			document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax';
		}

		function onLangChange(key) {
			return function () {
				setLangPref(key, this.value);
				location.reload();
			};
		}

		(function syncLangPrefsFromStorage() {
			const params = new URLSearchParams(location.search);
			let shouldReload = false;

			['read', 'translate'].forEach(function (key) {
				if (params.has(key)) return;
				const value = localStorage.getItem('readalong-' + key);
				if (!value) return;
				const cookieMatch = document.cookie.match(new RegExp('(?:^|; )readalong-' + key + '=([^;]*)'));
				if (cookieMatch && cookieMatch[1] === value) return;
				setLangPref(key, value);
				shouldReload = true;
			});

			if (shouldReload) location.reload();
		})();

		document.querySelector('[data-read-along]')?.addEventListener('change', onLangChange('read'));
		document.querySelector('[data-app-language]')?.addEventListener('change', onLangChange('translate'));

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
