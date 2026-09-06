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
  $translationLangsSelected = lang_prefs_list('translate', $translationLangs, [$uiLocale]);
  $levelFilter = lang_pref('level', array_merge([''], $levelTiers), '');
  $showTranslationLang = count($translationLangsSelected) > 1;
  $stories = story_list($storiesDir, $translationLangsSelected, $readAlongLang, $levelFilter ?: null);
  [$weatherStories, $stories] = story_partition_by_kind($stories, 'weather');
  $durationPills = [2, 5, 10];
  $kindTiles = story_filter_kinds();
  $levelSummary = $levelFilter === '' ? t('home.all_levels') : level_tier_label($levelFilter);
  $prefsSummary = lang_label($readAlongLang) . ' · ' . $levelSummary;
}
?>
<?php include $partials . '/head.php'; ?>
<body<?= $needsOnboarding ? ' class="onboarding-page show-translation started paused"' : '' ?>>

<?php if ($needsOnboarding): ?>

<?php include $partials . '/onboarding.php'; ?>

<?php else: ?>

	<main>

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
				<div class="read-along read-along--primary">
					<label for=read-along><?= e(t('home.read_along')) ?></label>
					<div class=read-along__field>
						<select id=read-along name=read-along class="quiet read-along-select" data-read-along>
<?php foreach ($sourceLangs as $code): ?>
							<option value=<?= e($code) ?><?= $code === $readAlongLang ? ' selected' : '' ?>><?= e(lang_label($code)) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</div>
				<div class=translation-langs>
					<span class=translation-langs__label><?= e(t('home.translate_into')) ?></span>
					<div class="pill-row translation-langs__pills" role=group aria-label="<?= e(t('home.translate_into')) ?>">
<?php foreach ($translationLangs as $code): ?>
<?php if ($code === $readAlongLang) continue; ?>
						<button type=button class=pill data-translate-pill="<?= e($code) ?>" aria-pressed=<?= in_array($code, $translationLangsSelected, true) ? 'true' : 'false' ?> translate=no lang=<?= e($code) ?>>
							<?php icon('check', ['size' => 16, 'class' => 'pill__check']); ?>
							<?= e(lang_endonym($code)) ?>
						</button>
<?php endforeach; ?>
					</div>
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

		<section class="home-section js-only" data-continue-section hidden data-i18n-history="<?= e(t('home.continue_history')) ?>" data-i18n-hide-history="<?= e(t('home.hide_history')) ?>"<?= $showTranslationLang ? ' data-show-translation-lang' : '' ?>>
			<div class=home-section__header>
				<h2><?= e(t('home.continue_reading')) ?></h2>
				<button type=button class="quiet home-section__link" data-continue-history-toggle hidden aria-expanded=false><?= e(t('home.continue_history')) ?></button>
			</div>
			<ul class="list continue-list" data-continue-featured></ul>
			<ul class="list continue-list continue-list--history" data-continue-history hidden></ul>
		</section>

<?php if ($weatherStories): ?>
		<section class=home-section data-weather-section>
			<div class=home-section__header>
				<h2><?= e(t('home.weather')) ?></h2>
			</div>
<?php render_story_list($weatherStories, 'data-weather-items', $showTranslationLang); ?>
		</section>
<?php endif; ?>

		<section class=home-section id=alle-items data-all-section data-i18n-remaining="<?= e(t('home.remaining')) ?>" data-i18n-results="<?= e(t('home.results_count')) ?>"<?= $showTranslationLang ? ' data-show-translation-lang' : '' ?>>
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
			<div class=pill-row role=group aria-label="<?= e(t('home.duration_filters')) ?>">
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
<?php render_story_list($stories, 'data-all-items', $showTranslationLang); ?>
			<div class=home-empty data-no-results hidden>
				<p><?= e(t('home.no_results_filters')) ?></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters><?= e(t('home.clear_filters')) ?></button>
			</div>
		</section>

		<p class="info velvet">
			<?= e(t('home.feedback_prefix')) ?>
			<a href="mailto:support@readalong.io?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A"><?= e(t('home.feedback_email')) ?></a>
			<?= e(t('home.feedback_middle')) ?>
			<a href="https://github.com/pepijngieles/readalong" target="_blank" rel="noopener"><?= e(t('home.feedback_github')) ?></a>.
		</p>

	</main>

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

		function selectedTranslatePills() {
			return Array.from(document.querySelectorAll('[data-translate-pill][aria-pressed=true]'))
				.map(function (pill) { return pill.getAttribute('data-translate-pill'); })
				.filter(Boolean);
		}

		function saveTranslatePrefs() {
			const selected = selectedTranslatePills();
			if (selected.length === 0) return;
			setLangPref('translate', selected.join(','));
			location.reload();
		}

		function syncTranslatePillsForReadAlong() {
			const readLang = document.querySelector('[data-read-along]')?.value;
			document.querySelectorAll('[data-translate-pill]').forEach(function (pill) {
				const code = pill.getAttribute('data-translate-pill');
				if (code === readLang) {
					pill.hidden = true;
					pill.setAttribute('aria-pressed', 'false');
					return;
				}
				pill.hidden = false;
			});
			if (selectedTranslatePills().length === 0) {
				const firstVisible = document.querySelector('[data-translate-pill]:not([hidden])');
				if (firstVisible) {
					firstVisible.setAttribute('aria-pressed', 'true');
					saveTranslatePrefs();
				}
			}
		}

		(function syncLangPrefsFromStorage() {
			const params = new URLSearchParams(location.search);
			let shouldReload = false;

			['read', 'translate', 'ui', 'level'].forEach(function (key) {
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

		document.querySelector('[data-read-along]')?.addEventListener('change', function () {
			setLangPref('read', this.value);
			syncTranslatePillsForReadAlong();
			location.reload();
		});
		document.querySelectorAll('[data-translate-pill]').forEach(function (pill) {
			pill.addEventListener('click', function () {
				const pressed = this.getAttribute('aria-pressed') === 'true';
				const selectedCount = selectedTranslatePills().length;
				if (pressed && selectedCount <= 1) return;
				this.setAttribute('aria-pressed', pressed ? 'false' : 'true');
				saveTranslatePrefs();
			});
		});
		document.querySelector('[data-story-level]')?.addEventListener('change', onLangChange('level'));
	</script>
	<script type="text/javascript" src="assets/home.js?v=7"></script>

<?php endif; ?>

</body>
</html>
