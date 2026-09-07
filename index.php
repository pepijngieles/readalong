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
  $translationLangsBySource = [];
  foreach ($sourceLangs as $code) {
    $translationLangsBySource[$code] = story_translation_languages_for_source($storiesDir, $code);
  }
  $readAlongLang = lang_pref('read', $sourceLangs, 'nl');
  $translateLangOptions = $translationLangsBySource[$readAlongLang] ?? [];
  $translateLang = lang_prefs_list('translate', $translateLangOptions, [ui_locale()])[0] ?? ($translateLangOptions[0] ?? ui_locale());
  $levelCodes = level_codes();
  $levelFilter = lang_prefs_list('level', $levelCodes, []);
  $showTranslationLang = false;
  $stories = story_list($storiesDir, [$translateLang], $readAlongLang, $levelFilter);
  [$weatherStories, $stories] = story_partition_by_kind($stories, 'weather');
  $durationPills = story_duration_filter_minutes();
  $kindTiles = story_filter_kinds();
  $levelSummary = $levelFilter === [] ? t('home.all_levels') : implode(' · ', $levelFilter);
  $prefsSummary = lang_label($readAlongLang) . ' · ' . $levelSummary;
}
?>
<?php include $partials . '/head.php'; ?>
<body<?= $needsOnboarding ? ' class="onboarding-page show-translation started paused"' : '' ?>>

<?php if ($needsOnboarding): ?>

<?php include $partials . '/onboarding.php'; ?>

<?php else: ?>

	<main>

		<header class="home-header flex gap-small">
			<h1>Readalong <sup class=text-color-tertiary>b&egrave;ta</sup></h1>
			<button type=button class="quiet home-prefs-toggle" data-click=openHomePrefs data-prefs-toggle aria-haspopup=dialog aria-expanded=false aria-controls=home-prefs>
				<?= e($prefsSummary) ?>
			</button>
		</header>

		<dialog id=home-prefs class="dialog-sheet home-prefs" aria-labelledby=home-prefs-title>
			<div class=panel>
				<button type=button class="close-button quiet icon-only" data-el=close-button data-click="closeDialog(home-prefs)">
					<span class=visually-hidden><?= e(t('common.close')) ?></span>
					<?php icon('close-small'); ?>
				</button>
				<h2 id=home-prefs-title class=font-size-large><?= e(t('home.language_settings')) ?></h2>
				<div class="flex columns gap-small">
					<div>
						<label for=read-along><?= e(t('home.read_along')) ?></label>
						<div class=select-wrap>
							<select id=read-along name=read-along class=select-medium data-read-along data-change=syncTranslateSelectForReadAlong>
<?php foreach ($sourceLangs as $code): ?>
								<option value=<?= e($code) ?><?= $code === $readAlongLang ? ' selected' : '' ?>><?= e(lang_label($code)) ?></option>
<?php endforeach; ?>
							</select>
							<?php icon('chevron-down', ['size' => 16]); ?>
						</div>
					</div>
					<div>
						<label for=translate-into><?= e(t('home.translate_into')) ?></label>
						<div class=select-wrap>
							<select id=translate-into class=select-medium data-translate-along>
<?php foreach ($translateLangOptions as $code): ?>
								<option value="<?= e($code) ?>"<?= $code === $translateLang ? ' selected' : '' ?> translate=no lang=<?= e($code) ?>><?= e(lang_endonym($code)) ?></option>
<?php endforeach; ?>
							</select>
							<?php icon('chevron-down', ['size' => 16]); ?>
						</div>
					</div>
					<div>
						<label id=home-level-label><?= e(t('home.level')) ?></label>
						<div class="pill-row flex gap-2xs" role=group aria-labelledby=home-level-label>
							<button type=button class=pill data-level-all data-click=selectAllLevels aria-pressed=<?= $levelFilter === [] ? 'true' : 'false' ?>>
								<?php icon('check', ['size' => 16, 'class' => 'icon check']); ?>
								<?= e(t('home.all_levels')) ?>
							</button>
<?php foreach ($levelCodes as $code): ?>
							<button type=button class=pill data-level-pill="<?= e($code) ?>" data-click=toggleLevelPill aria-pressed=<?= in_array($code, $levelFilter, true) ? 'true' : 'false' ?>>
								<?php icon('check', ['size' => 16, 'class' => 'icon check']); ?>
								<?= e($code) ?>
							</button>
<?php endforeach; ?>
						</div>
					</div>
				</div>
				<footer>
					<button type=button class="primary full-width" data-click=saveHomePrefs><?= e(t('common.save')) ?></button>
				</footer>
			</div>
		</dialog>

		<section class="home-section js-only" data-continue-section hidden data-i18n-history="<?= e(t('home.continue_history')) ?>" data-i18n-hide-history="<?= e(t('home.hide_history')) ?>"<?= $showTranslationLang ? ' data-show-translation-lang' : '' ?>>
			<div class="section-header flex gap-small">
				<h2><?= e(t('home.continue_reading')) ?></h2>
				<button type=button class="quiet section-link" data-continue-history-toggle data-click=toggleHistory hidden aria-expanded=false><?= e(t('home.continue_history')) ?></button>
			</div>
			<ul class="list continue-list" data-continue-featured></ul>
			<ul class="list continue-list history" data-continue-history hidden></ul>
		</section>

<?php if ($weatherStories): ?>
		<section class=home-section data-weather-section>
			<div class=section-header>
				<h2><?= e(t('home.weather')) ?></h2>
			</div>
<?php render_story_list($weatherStories, 'data-weather-items', $showTranslationLang); ?>
		</section>
<?php endif; ?>

		<section class=home-section id=alle-items data-all-section data-i18n-remaining="<?= e(t('home.remaining')) ?>" data-i18n-results="<?= e(t('home.results_count')) ?>"<?= $showTranslationLang ? ' data-show-translation-lang' : '' ?>>
			<div class=section-header>
				<h2><?= e(t('home.browse_content')) ?></h2>
			</div>
			<div class="home-browse-filters flex gap-2xs" role=group aria-label="<?= e(t('home.kind_filters')) ?>">
<?php foreach ($kindTiles as $kind): ?>
				<button type=button class="pill choice" data-kind-filter="<?= e($kind) ?>" data-click=filterKind aria-pressed=<?= $kind === 'podcast' ? 'true' : 'false' ?>>
					<?= e(t('home.kind.' . $kind)) ?>
				</button>
<?php endforeach; ?>
				<label>
					<span class=visually-hidden><?= e(t('home.duration_filters')) ?></span>
					<div class=select-wrap>
						<select class=select-medium data-duration-filter data-change=filterDuration>
							<option value=""><?= e(t('home.all_lengths')) ?></option>
<?php foreach ($durationPills as $minutes): ?>
							<option value="<?= e((string) $minutes) ?>"><?= e(t('home.up_to_minutes', ['n' => (string) $minutes])) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</label>
			</div>
			<div class="home-results-bar flex gap-small">
				<p class="home-results-count text-color-tertiary" data-results-count></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters data-click=clearFilters hidden><?= e(t('home.clear_filters')) ?></button>
			</div>
<?php render_story_list($stories, 'data-all-items', $showTranslationLang, false); ?>
			<div class="home-empty" data-no-results<?= $stories ? ' hidden' : '' ?> data-i18n-empty="<?= e(t('home.no_results')) ?>" data-i18n-empty-filters="<?= e(t('home.no_results_filters')) ?>">
				<p data-empty-message><?= e(t('home.no_results')) ?></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters data-click=clearFilters hidden><?= e(t('home.clear_filters')) ?></button>
			</div>
		</section>

	</main>

	<script type="text/javascript">
		window.COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
		window.TRANSLATION_LANGS_BY_SOURCE = <?= json_encode($translationLangsBySource, JSON_UNESCAPED_UNICODE) ?>;
		window.LANG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;

		window.setLangPref = function (key, value) {
			localStorage.setItem('readalong-' + key, value);
			document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + window.COOKIE_MAX_AGE + '; SameSite=Lax';
		};

		(function syncLangPrefsFromStorage() {
			const params = new URLSearchParams(location.search);
			let shouldReload = false;

			['read', 'translate', 'ui', 'level'].forEach(function (key) {
				if (params.has(key)) return;
				const value = localStorage.getItem('readalong-' + key);
				if (!value) return;
				const cookieMatch = document.cookie.match(new RegExp('(?:^|; )readalong-' + key + '=([^;]*)'));
				if (cookieMatch && cookieMatch[1] === value) return;
				window.setLangPref(key, value);
				shouldReload = true;
			});

			if (shouldReload) location.reload();
		})();
	</script>
	<script type="text/javascript" src="assets/brio/brio.js?v=1" defer></script>
	<script type="text/javascript" src="assets/home.js?v=13" defer></script>

<?php endif; ?>

</body>
</html>
