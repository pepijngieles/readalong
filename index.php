<?php
require_once __DIR__ . '/assets/helpers.php';
require_once __DIR__ . '/assets/story.php';

$base = '';
$story = ['title' => 'Readalong'];
$uiLocale = ui_locale();
$needsOnboarding = needs_onboarding();
$partials = __DIR__ . '/assets/partials';

if (!$needsOnboarding) {
  $storiesDir = __DIR__ . '/stories';
  $sourceLangs = story_source_languages($storiesDir);
  $translationLangs = story_translation_languages($storiesDir);
  $levelTiers = story_level_tiers($storiesDir);
  $readAlongLang = lang_pref('read', $sourceLangs, 'nl');
  $translationLang = lang_pref('translate', $translationLangs, $uiLocale);
  $levelFilter = lang_pref('level', array_merge([''], $levelTiers), '');
  $stories = story_list($storiesDir, $translationLang, $readAlongLang, $levelFilter ?: null);
  $durationPills = [2, 5, 10];
  $kindTiles = story_filter_kinds();
  $prefsSummary = lang_label($readAlongLang) . ' → ' . lang_label($translationLang);
}
?>
<?php include $partials . '/head.php'; ?>
<body<?= $needsOnboarding ? ' class="onboarding-page show-translation"' : '' ?>>

<?php if ($needsOnboarding): ?>

<?php include $partials . '/onboarding.php'; ?>

<?php else: ?>

	<main>

		<div class="add-app-popover velvet hide-on-standalone js-only ios-only">
			<button class="close-button quiet icon-only" onclick="hideAppBanner()">
				<span class=visually-hidden><?= e(t('common.close')) ?></span>
				<?php icon('close-small'); ?>
			</button>
			<img src="assets/favicons/favicon.svg" class=app-icon width=40>
			<div class=text>
				<h3>Readalong</h3>
				<small><?= e(t('app.use_app')) ?></small>
			</div>
			<button class="primary small" onclick="toggleExplanationPopover()"><?= e(t('app.view')) ?></button>
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

		<header class=home-header>
			<h1>Readalong <sup style="color:var(--text-tertiary)">b&egrave;ta</sup></h1>
			<button type=button class="quiet home-prefs-toggle" data-prefs-toggle aria-expanded=false aria-controls=home-prefs>
				<?= e($prefsSummary) ?>
			</button>
		</header>

		<div id=home-prefs class=home-prefs hidden>
			<button type=button class="close-button quiet icon-only" data-prefs-close>
				<span class=visually-hidden><?= e(t('common.close')) ?></span>
				<?php icon('close-small'); ?>
			</button>
			<div class=selection-row>
				<div class=read-along>
					<label for=read-along><?= e(t('home.read_along')) ?></label>
					<select id=read-along name=read-along class=quiet data-read-along>
<?php foreach ($sourceLangs as $code): ?>
						<option value=<?= e($code) ?><?= $code === $readAlongLang ? ' selected' : '' ?>><?= e(lang_label($code)) ?></option>
<?php endforeach; ?>
					</select>
					<?php icon('chevron-down', ['size' => 16]); ?>
				</div>
				<div class=app-language>
					<label for=app-language><?= e(t('home.translate_into')) ?></label>
					<select id=app-language name=app-language class=quiet data-app-language translate=no>
<?php foreach ($translationLangs as $code): ?>
						<option value=<?= e($code) ?><?= $code === $translationLang ? ' selected' : '' ?>><?= e(lang_label($code)) ?></option>
<?php endforeach; ?>
					</select>
					<?php icon('chevron-down', ['size' => 16]); ?>
				</div>
<?php if ($levelTiers): ?>
				<div class=story-level>
					<label for=story-level><?= e(t('home.level')) ?></label>
					<select id=story-level name=story-level class=quiet data-story-level>
						<option value=""<?= $levelFilter === '' ? ' selected' : '' ?>><?= e(t('home.all_levels')) ?></option>
<?php foreach ($levelTiers as $tier): ?>
						<option value=<?= e($tier) ?><?= $tier === $levelFilter ? ' selected' : '' ?>><?= e(level_tier_label($tier)) ?></option>
<?php endforeach; ?>
					</select>
					<?php icon('chevron-down', ['size' => 16]); ?>
				</div>
<?php endif; ?>
			</div>
		</div>

		<div class="info home-intro" data-home-intro>
			<button type=button class="close-button quiet icon-only" data-dismiss-intro>
				<span class=visually-hidden><?= e(t('home.dismiss_intro')) ?></span>
				<?php icon('close-small'); ?>
			</button>
			<p><?= e(t('home.tagline')) ?></p>
			<p class="dummy-content-notice"><?= e(t('home.dummy_notice')) ?></p>
		</div>

		<section class="home-section js-only" data-continue-section hidden>
			<div class=home-section__header>
				<h2><?= e(t('home.continue_reading')) ?></h2>
			</div>
			<ul class=list data-continue-items></ul>
		</section>

		<section class=home-section id=alle-items data-all-section data-i18n-remaining="<?= e(t('home.remaining')) ?>" data-i18n-results="<?= e(t('home.results_count')) ?>">
			<div class=home-section__header>
				<h2><?= e(t('home.all_items')) ?></h2>
			</div>
			<label class=home-search>
				<span class=visually-hidden><?= e(t('home.search')) ?></span>
				<input type=search data-story-search placeholder="<?= e(t('home.search_placeholder')) ?>" autocomplete=off>
			</label>
			<div class=pill-row role=group aria-label="<?= e(t('home.all_items')) ?>">
<?php foreach ($kindTiles as $kind): ?>
				<button type=button class=pill data-kind-filter="<?= e($kind) ?>" aria-pressed=false>
					<?php icon('check', ['size' => 16, 'class' => 'pill__check']); ?>
					<?= e(t('home.kind.' . $kind)) ?>
				</button>
<?php endforeach; ?>
			</div>
			<div class=pill-row role=group aria-label="<?= e(t('home.up_to_minutes', ['n' => ''])) ?>">
<?php foreach ($durationPills as $minutes): ?>
				<button type=button class=pill data-duration-filter="<?= e((string) $minutes) ?>" aria-pressed=false>
					<?php icon('check', ['size' => 16, 'class' => 'pill__check']); ?>
					<?= e(t('home.up_to_minutes', ['n' => (string) $minutes])) ?>
				</button>
<?php endforeach; ?>
			</div>
			<div class=home-results-bar>
				<p class=home-results-count data-results-count></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters hidden><?= e(t('home.clear_filters')) ?></button>
			</div>
<?php render_story_list($stories, 'data-all-items'); ?>
			<div class=home-empty data-no-results hidden>
				<p><?= e(t('home.no_results_filters')) ?></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters><?= e(t('home.clear_filters')) ?></button>
			</div>
		</section>

		<p class="info velvet">
			<?= e(t('home.feedback_prefix')) ?>
			<a href="mailto:support@readalong.io?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A"><?= e(t('home.feedback_email')) ?></a>
			<?= e(t('home.feedback_middle')) ?>
			<a href="https://github.com/pepijngieles/read-along" target="_blank" rel="noopener"><?= e(t('home.feedback_github')) ?></a>.
		</p>

	</main>

	<div class="explanation-popover pointer bottom-center hide-on-standalone js-only ios-only" onclick="toggleExplanationPopover()">
		<h3><?= e(t('app.add_home_screen')) ?></h3>
		<small class=description><?= e(t('app.add_home_description')) ?></small>
		<ol>
			<li><?= e(t('app.open_safari')) ?></li>
			<li>
				<?= e(t('app.tap_share')) ?><?php icon('share-ios', ['style' => 'color:#036EFC']); ?>
			</li>
			<li><?= e(t('app.add_to_home')) ?><?php icon('add-ios'); ?></li>
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
	<script type="text/javascript" src="assets/home.js?v=2"></script>

<?php endif; ?>

</body>
</html>
