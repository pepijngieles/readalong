<?php
require_once __DIR__ . '/assets/helpers.php';
require_once __DIR__ . '/assets/story.php';

$base = '';
$story = ['title' => 'Readalong'];
$storiesDir = __DIR__ . '/stories';
$sourceLangs = story_source_languages($storiesDir);
$translationLangs = story_translation_languages($storiesDir);
$levelTiers = story_level_tiers($storiesDir);
$readAlongLang = lang_pref('read', $sourceLangs, 'nl');
$translationLang = lang_pref('translate', $translationLangs, 'en');
$levelFilter = lang_pref('level', array_merge([''], $levelTiers), '');
$stories = story_list($storiesDir, $translationLang, $readAlongLang, $levelFilter ?: null);
$langLabelsJs = [];
foreach (configured_languages() as $code) {
  $langLabelsJs[$code] = html_entity_decode(strip_tags(lang_label($code)), ENT_QUOTES, 'UTF-8');
}
$partials = __DIR__ . '/assets/partials';
?>
<?php include $partials . '/head.php'; ?>
<script type="text/javascript">
	(function () {
		if (localStorage.getItem('readalong-onboarding-complete') === '1') return;
		if (document.cookie.indexOf('readalong-onboarding-complete=1') !== -1) return;
		if (localStorage.getItem('readalong-read') || document.cookie.indexOf('readalong-read=') !== -1) return;
		document.documentElement.classList.add('show-onboarding');
	})();
</script>
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

		<p class="info dummy-content-notice">
			De verhalen hieronder met &ldquo;Placeholder&rdquo; zijn dummy content &mdash; alleen titels, zonder tekst of audio. Dit helpt de homepage te testen met meer content.
		</p>

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
<?php if ($levelTiers): ?>
			<div class=story-level>
				<label for=story-level>Level</label>
				<select id=story-level name=story-level class=quiet data-story-level>
					<option value=""<?= $levelFilter === '' ? ' selected' : '' ?>>All levels</option>
<?php foreach ($levelTiers as $tier): ?>
					<option value=<?= e($tier) ?><?= $tier === $levelFilter ? ' selected' : '' ?>><?= e(level_tier_label($tier)) ?></option>
<?php endforeach; ?>
				</select>
				<?php icon('chevron-down', ['size' => 16]); ?>
			</div>
<?php endif; ?>
		</div>

		<ul class=list>
<?php foreach ($stories as $item): ?>
			<li<?= !empty($item['dummy']) ? ' class=dummy-story' : '' ?>>
<?php if (!empty($item['dummy'])): ?>
				<span class=dummy-story-item aria-disabled=true>
					<p><?= e($item['title']) ?></p>
					<small>Placeholder</small>
				</span>
<?php else: ?>
				<a href="stories/<?= e($item['slug']) ?>/">
					<p><?= e($item['title']) ?></p>
					<small><?= e($item['duration']) ?><?php if (!empty($item['levelLabel'])): ?> · <?= e($item['levelLabel']) ?><?php endif; ?></small>
				</a>
<?php endif; ?>
			</li>
<?php endforeach; ?>
		</ul>

		<p class="info velvet">
			Your feedback is appreciated! Please <a href="mailto:support@readalong.io?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A">send an email</a> to support@readalong.io or <a href="https://github.com/pepijngieles/read-along" target="_blank" rel="noopener">report an issue on GitHub</a>.
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

	<div class=onboarding-scrim hidden aria-hidden=true></div>
	<div class="onboarding-popover velvet" role=dialog aria-labelledby=onboarding-title aria-modal=true hidden>
		<h2 id=onboarding-title>Welkom bij Readalong</h2>
		<p class=onboarding-intro>Stel je voorkeuren in voordat je begint.</p>

		<div class=onboarding-field>
			<label for=onboarding-read>In welke taal wil je meelezen?</label>
			<select id=onboarding-read class=quiet data-onboarding-read>
<?php foreach ($sourceLangs as $code): ?>
				<option value=<?= e($code) ?>><?= lang_label($code) ?></option>
<?php endforeach; ?>
			</select>
			<?php icon('chevron-down', ['size' => 16]); ?>
		</div>

		<p class=onboarding-note>
			Vertalingen worden getoond in je systeemtaal (<span data-system-language-label></span>).
			<label for=onboarding-translate class=onboarding-translate-label>Andere taal</label>
			<select id=onboarding-translate class=quiet data-onboarding-translate translate=no>
<?php foreach ($translationLangs as $code): ?>
				<option value=<?= e($code) ?>><?= lang_label($code) ?></option>
<?php endforeach; ?>
			</select>
			<?php icon('chevron-down', ['size' => 16]); ?>
		</p>

		<button type=button class="primary onboarding-continue" data-onboarding-continue>Beginnen</button>
	</div>

	<script type="text/javascript">
		const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
		const SUPPORTED_LANGS = <?= json_encode(configured_languages(), JSON_UNESCAPED_UNICODE) ?>;
		const LANG_LABELS = <?= json_encode($langLabelsJs, JSON_UNESCAPED_UNICODE) ?>;

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

		function detectSystemLanguage() {
			const lang = (navigator.language || 'en').split('-')[0].toLowerCase();
			return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
		}

		function isOnboardingComplete() {
			if (localStorage.getItem('readalong-onboarding-complete') === '1') return true;
			if (document.cookie.indexOf('readalong-onboarding-complete=1') !== -1) return true;
			if (localStorage.getItem('readalong-read') || document.cookie.indexOf('readalong-read=') !== -1) return true;
			return false;
		}

		function completeOnboarding() {
			setLangPref('onboarding-complete', '1');
		}

		function initOnboarding() {
			if (isOnboardingComplete()) return;

			const scrim = document.querySelector('.onboarding-scrim');
			const popover = document.querySelector('.onboarding-popover');
			const readSelect = document.querySelector('[data-onboarding-read]');
			const translateSelect = document.querySelector('[data-onboarding-translate]');
			const systemLabel = document.querySelector('[data-system-language-label]');
			const continueButton = document.querySelector('[data-onboarding-continue]');
			const systemLang = detectSystemLanguage();

			scrim.hidden = false;
			scrim.removeAttribute('aria-hidden');
			popover.hidden = false;
			document.documentElement.classList.add('show-onboarding');

			readSelect.value = systemLang;
			translateSelect.value = systemLang;
			systemLabel.textContent = LANG_LABELS[systemLang] || systemLang;

			continueButton.addEventListener('click', function () {
				setLangPref('read', readSelect.value);
				setLangPref('translate', translateSelect.value);
				completeOnboarding();
				location.reload();
			});
		}

		(function syncLangPrefsFromStorage() {
			const params = new URLSearchParams(location.search);
			let shouldReload = false;

			['read', 'translate', 'level'].forEach(function (key) {
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
		document.querySelector('[data-story-level]')?.addEventListener('change', onLangChange('level'));

		initOnboarding();

		function iOS() {
		  return [
		    'iPad Simulator',
		    'iPhone Simulator',
		    'iPod Simulator',
		    'iPad',
		    'iPhone',
		    'iPod'
		  ].includes(navigator.platform)
		  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
		}

		if (iOS()) document.body.classList.add('ios')
	</script>

</body>
</html>
