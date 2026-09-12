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
  $contentLangs = story_content_languages($storiesDir);
  $defaultReadLang = in_array('nl', $contentLangs, true) ? 'nl' : ($contentLangs[0] ?? 'nl');
  $translationLangsBySource = [];
  foreach ($contentLangs as $code) {
    $translationLangsBySource[$code] = story_translation_languages_for_source($storiesDir, $code);
  }
  $readAlongLang = lang_prefs_list('read', $contentLangs, [$defaultReadLang])[0] ?? $defaultReadLang;
  $translateLangOptions = story_translation_languages_for_sources($translationLangsBySource, [$readAlongLang], $contentLangs);
  $translateLang = lang_prefs_list('translate', $translateLangOptions, [ui_locale()])[0] ?? ($translateLangOptions[0] ?? ui_locale());
  $levelCodes = level_codes();
  $levelFilter = lang_prefs_list('level', $levelCodes, []);
  $showTranslationLang = false;
  $stories = story_list($storiesDir, [$translateLang], null, []);
  $stories = story_apply_home_hidden($stories, [$readAlongLang], $contentLangs, $levelFilter);
  [$weatherStories, $stories] = story_partition_by_kind($stories, 'weather');
  $kindStories = story_apply_home_hidden(
    story_list($storiesDir, [$translateLang], null, []),
    [$readAlongLang],
    $contentLangs,
    []
  );
  [, $kindStories] = story_partition_by_kind($kindStories, 'weather');
  $durationPills = story_duration_filter_minutes();
  $kindTiles = story_catalog_kinds($kindStories);
  $defaultKind = $kindTiles[0] ?? '';
  $readLabels = [];
  foreach ($contentLangs as $code) {
    $readLabels[$code] = lang_endonym($code);
  }
  $readSelectLabel = $readLabels[$readAlongLang] ?? lang_endonym($readAlongLang);
  $levelLabels = array_combine($levelCodes, $levelCodes);
  $levelSelectLabel = level_filter_summary($levelFilter, t('home.all_levels'));
  $weatherVisible = false;
  foreach ($weatherStories as $item) {
    if (empty($item['hidden'])) {
      $weatherVisible = true;
      break;
    }
  }
  $visibleStories = false;
  foreach ($stories as $item) {
    if (empty($item['hidden'])) {
      $visibleStories = true;
      break;
    }
  }
}
?>
<?php include $partials . '/head.php'; ?>
<body<?= $needsOnboarding ? ' class="onboarding-page"' : '' ?>>
<?php include $partials . '/theme-bootstrap.php'; ?>

<?php if ($needsOnboarding): ?>

<?php include $partials . '/onboarding.php'; ?>

<?php else: ?>

	<main>

		<header class="home-header flex gap-small">
			<div class="home-title flex">
				<h1>Readalong</h1>
<?php
				render_title_menu(
					'read-menu',
					'read',
					t('home.read_along'),
					$readSelectLabel,
					t('home.all_languages'),
					$readLabels,
					[$readAlongLang],
					$contentLangs,
					true,
					false,
					true
				);
?>
			</div>
			<button type=button class="quiet icon-only small rounded home-settings-toggle" data-click=openSettings aria-haspopup=dialog aria-controls=settings>
				<span class=visually-hidden><?= e(t('nav.settings')) ?></span>
				<?php icon('gear', ['size' => 20]); ?>
			</button>
		</header>

		<section class="home-section js-only" data-continue-section hidden data-i18n-history="<?= e(t('home.continue_history')) ?>" data-i18n-hide-history="<?= e(t('home.hide_history')) ?>"<?= $showTranslationLang ? ' data-show-translation-lang' : '' ?>>
			<div class="section-header flex gap-small">
				<h2><?= e(t('home.continue_reading')) ?></h2>
				<button type=button class="quiet section-link" data-continue-history-toggle data-click=toggleHistory hidden aria-expanded=false><?= e(t('home.continue_history')) ?></button>
			</div>
			<ul class="list continue-list" data-continue-featured></ul>
			<ul class="list continue-list history" data-continue-history hidden></ul>
		</section>

<?php if ($weatherStories): ?>
		<section class=home-section data-weather-section<?= $weatherVisible ? '' : ' hidden' ?>>
			<div class=section-header>
				<h2><?= e(t('home.weather')) ?></h2>
			</div>
<?php render_story_list($weatherStories, 'data-weather-items', $showTranslationLang); ?>
		</section>
<?php endif; ?>

		<section class=home-section id=alle-items data-all-section data-i18n-remaining="<?= e(t('home.remaining')) ?>" data-i18n-results="<?= e(t('home.results_count')) ?>" data-default-kind="<?= e($defaultKind) ?>"<?= $showTranslationLang ? ' data-show-translation-lang' : '' ?>>
			<div class=section-header>
				<h2><?= e(t('home.browse_content')) ?></h2>
			</div>
			<div class="home-browse-filters flex columns gap-2xs">
<?php if (count($kindTiles) > 1): ?>
				<div class="home-browse-kinds flex gap-2xs" role=group aria-label="<?= e(t('home.kind_filters')) ?>" data-kind-filters>
<?php foreach ($kindTiles as $kind): ?>
					<button type=button class="pill choice" data-kind-filter="<?= e($kind) ?>" data-click=filterKind aria-pressed=<?= $kind === $defaultKind ? 'true' : 'false' ?>>
						<?= e(t('home.kind.' . $kind)) ?>
					</button>
<?php endforeach; ?>
				</div>
<?php endif; ?>
				<div class="home-browse-selects flex gap-2xs">
<?php
				render_browse_filter_menu(
					'level-menu',
					'level',
					t('home.level'),
					$levelSelectLabel,
					t('home.all_levels'),
					$levelLabels,
					$levelFilter,
					$levelCodes
				);
?>
					<label class=filter-field>
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
			</div>
			<div class="home-results-bar flex gap-small">
				<p class="home-results-count text-color-tertiary" data-results-count></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters data-click=clearFilters hidden><?= e(t('home.clear_filters')) ?></button>
			</div>
<?php render_story_list($stories, 'data-all-items', $showTranslationLang, false); ?>
			<div class="home-empty" data-no-results<?= $visibleStories ? ' hidden' : '' ?> data-i18n-empty="<?= e(t('home.no_results')) ?>" data-i18n-empty-filters="<?= e(t('home.no_results_filters')) ?>">
				<p data-empty-message><?= e(t('home.no_results')) ?></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters data-click=clearFilters hidden><?= e(t('home.clear_filters')) ?></button>
			</div>
		</section>

	</main>

<?php $settingsCatalog = true; include $partials . '/settings-dialog.php'; ?>

	<script type="text/javascript">
		window.COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
		window.TRANSLATION_LANGS_BY_SOURCE = <?= json_encode($translationLangsBySource, JSON_UNESCAPED_UNICODE) ?>;
		window.LANG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;
		window.LANG_FLAG_CODES = <?= json_encode(lang_flag_codes(), JSON_UNESCAPED_UNICODE) ?>;

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
	<script type="text/javascript" src="assets/settings.js?v=4" defer></script>
	<script type="text/javascript" src="assets/home.js?v=25" defer></script>

<?php endif; ?>

</body>
</html>
