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
  $todayWeather = null;
  $tussendoorStories = [];
  $tussendoorLimit = 10 * 60;
  foreach ($stories as $item) {
    if ($todayWeather === null && ($item['kind'] ?? '') === 'weather') {
      $todayWeather = $item;
    }
    $seconds = $item['durationSeconds'] ?? 0;
    if ($seconds > 0 && $seconds <= $tussendoorLimit) {
      $tussendoorStories[] = $item;
    }
  }
  $durationPills = [2, 5, 7, 10];
  $kindTiles = story_filter_kinds();
}
?>
<?php include $partials . '/head.php'; ?>
<body<?= $needsOnboarding ? ' class=onboarding-page' : '' ?>>

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

		<h1>Readalong <sup style="color:var(--text-tertiary)">b&egrave;ta</sup></h1>
		<p><?= e(t('home.tagline')) ?></p>

		<p class="info dummy-content-notice">
			<?= e(t('home.dummy_notice')) ?>
		</p>

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

		<section class="home-section js-only" data-continue-section hidden>
			<div class=home-section__header>
				<h2><?= e(t('home.continue_reading')) ?></h2>
			</div>
			<ul class=list data-continue-items></ul>
		</section>

<?php if ($todayWeather): ?>
		<section class=home-section data-weather-section>
			<div class=home-section__header>
				<h2><?= e(t('home.weather_today')) ?></h2>
				<button type=button class="quiet home-section__more" data-show-all-weather aria-pressed=false><?= e(t('home.show_all')) ?></button>
			</div>
			<ul class=list>
<?php echo story_list_item($todayWeather); ?>
			</ul>
		</section>
<?php endif; ?>

		<section class=home-section data-tussendoor-section>
			<div class=home-section__header>
				<h2><?= e(t('home.in_between')) ?></h2>
			</div>
			<div class=pill-row role=group aria-label="<?= e(t('home.in_between')) ?>">
<?php foreach ($durationPills as $minutes): ?>
				<button type=button class=pill data-duration-filter="<?= e((string) $minutes) ?>"<?= $minutes === 2 ? ' aria-pressed=true' : ' aria-pressed=false' ?>><?= e(t('home.minutes', ['n' => (string) $minutes])) ?></button>
<?php endforeach; ?>
			</div>
<?php render_story_list($tussendoorStories, 'data-tussendoor-items'); ?>
		</section>

		<section class=home-section id=alle-items data-all-section>
			<div class=home-section__header>
				<h2><?= e(t('home.all_items')) ?></h2>
			</div>
			<div class=kind-tiles role=group aria-label="<?= e(t('home.all_items')) ?>">
<?php foreach ($kindTiles as $kind): ?>
				<button type=button class=kind-tile data-kind-filter="<?= e($kind) ?>" aria-pressed=false><?= e(t('home.kind.' . $kind)) ?></button>
<?php endforeach; ?>
			</div>
			<label class=home-search>
				<span class=visually-hidden><?= e(t('home.search')) ?></span>
				<input type=search data-story-search placeholder="<?= e(t('home.search_placeholder')) ?>" autocomplete=off>
			</label>
<?php render_story_list($stories, 'data-all-items'); ?>
			<p class="home-no-results" data-no-results hidden><?= e(t('home.no_results')) ?></p>
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
	<script type="text/javascript" src="assets/home.js?v=1"></script>

<?php endif; ?>

</body>
</html>
