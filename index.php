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

		<header class=home-header>
			<h1>Readalong <sup style="color:var(--text-tertiary)">b&egrave;ta</sup></h1>
			<button type=button class="quiet home-prefs-toggle" data-prefs-toggle aria-haspopup=dialog aria-expanded=false aria-controls=home-prefs>
				<?= e($prefsSummary) ?>
			</button>
		</header>

		<dialog id=home-prefs class=home-prefs aria-labelledby=home-prefs-title>
			<button type=button class="close-button quiet icon-only" data-prefs-close>
				<span class=visually-hidden><?= e(t('common.close')) ?></span>
				<?php icon('close-small'); ?>
			</button>
			<h2 id=home-prefs-title class=home-prefs__title><?= e(t('home.language_settings')) ?></h2>
			<div class=home-prefs__fields>
				<div class=home-prefs__field>
					<label for=read-along><?= e(t('home.read_along')) ?></label>
					<div class="select-wrap home-prefs__select">
						<select id=read-along name=read-along class=select-medium data-read-along>
<?php foreach ($sourceLangs as $code): ?>
							<option value=<?= e($code) ?><?= $code === $readAlongLang ? ' selected' : '' ?>><?= e(lang_label($code)) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</div>
				<div class=home-prefs__field>
					<label for=translate-into><?= e(t('home.translate_into')) ?></label>
					<div class="select-wrap home-prefs__select">
						<select id=translate-into class=select-medium data-translate-along>
<?php foreach ($translateLangOptions as $code): ?>
							<option value="<?= e($code) ?>"<?= $code === $translateLang ? ' selected' : '' ?> translate=no lang=<?= e($code) ?>><?= e(lang_endonym($code)) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</div>
				<div class=home-prefs__field>
					<label id=home-level-label><?= e(t('home.level')) ?></label>
					<div class="pill-row home-prefs__pills" role=group aria-labelledby=home-level-label>
						<button type=button class=pill data-level-all aria-pressed=<?= $levelFilter === [] ? 'true' : 'false' ?>>
							<?php icon('check', ['size' => 16, 'class' => 'pill__check']); ?>
							<?= e(t('home.all_levels')) ?>
						</button>
<?php foreach ($levelCodes as $code): ?>
						<button type=button class=pill data-level-pill="<?= e($code) ?>" aria-pressed=<?= in_array($code, $levelFilter, true) ? 'true' : 'false' ?>>
							<?php icon('check', ['size' => 16, 'class' => 'pill__check']); ?>
							<?= e($code) ?>
						</button>
<?php endforeach; ?>
					</div>
				</div>
			</div>
			<button type=button class="primary home-prefs__save" data-prefs-save><?= e(t('common.save')) ?></button>
		</dialog>

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
				<h2><?= e(t('home.browse_content')) ?></h2>
			</div>
			<div class=home-browse-filters role=group aria-label="<?= e(t('home.kind_filters')) ?>">
<?php foreach ($kindTiles as $kind): ?>
				<button type=button class="pill pill--choice" data-kind-filter="<?= e($kind) ?>" aria-pressed=<?= $kind === 'podcast' ? 'true' : 'false' ?>>
					<?= e(t('home.kind.' . $kind)) ?>
				</button>
<?php endforeach; ?>
				<label class=home-browse-filters__duration>
					<span class=visually-hidden><?= e(t('home.duration_filters')) ?></span>
					<div class=select-wrap>
						<select class=select-medium data-duration-filter>
							<option value=""><?= e(t('home.all_lengths')) ?></option>
<?php foreach ($durationPills as $minutes): ?>
							<option value="<?= e((string) $minutes) ?>"><?= e(t('home.up_to_minutes', ['n' => (string) $minutes])) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</label>
			</div>
			<div class=home-results-bar>
				<p class=home-results-count data-results-count></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters hidden><?= e(t('home.clear_filters')) ?></button>
			</div>
<?php render_story_list($stories, 'data-all-items', $showTranslationLang, false); ?>
			<div class="home-empty" data-no-results<?= $stories ? ' hidden' : '' ?> data-i18n-empty="<?= e(t('home.no_results')) ?>" data-i18n-empty-filters="<?= e(t('home.no_results_filters')) ?>">
				<p data-empty-message><?= e(t('home.no_results')) ?></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters hidden><?= e(t('home.clear_filters')) ?></button>
			</div>
		</section>

	</main>

	<script type="text/javascript">
		const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
		const TRANSLATION_LANGS_BY_SOURCE = <?= json_encode($translationLangsBySource, JSON_UNESCAPED_UNICODE) ?>;
		const LANG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;

		function setLangPref(key, value) {
			localStorage.setItem('readalong-' + key, value);
			document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax';
		}

		function selectedLevelPills() {
			return Array.from(document.querySelectorAll('[data-level-pill][aria-pressed=true]'))
				.map(function (pill) { return pill.getAttribute('data-level-pill'); })
				.filter(Boolean);
		}

		function prefsState() {
			return {
				read: document.querySelector('[data-read-along]')?.value || '',
				translate: document.querySelector('[data-translate-along]')?.value || '',
				level: selectedLevelPills().join(',')
			};
		}

		const initialPrefs = prefsState();

		function syncTranslateSelectForReadAlong() {
			const readLang = document.querySelector('[data-read-along]')?.value;
			const select = document.querySelector('[data-translate-along]');
			if (!readLang || !select) return;

			const options = TRANSLATION_LANGS_BY_SOURCE[readLang] || [];
			const previous = select.value;
			select.innerHTML = '';
			options.forEach(function (code) {
				const option = document.createElement('option');
				option.value = code;
				option.textContent = LANG_ENDONYMS[code] || code.toUpperCase();
				option.setAttribute('translate', 'no');
				option.lang = code;
				select.appendChild(option);
			});

			if (options.indexOf(previous) !== -1) {
				select.value = previous;
			} else if (options.length) {
				select.value = options[0];
			}
		}

		function syncLevelPills(selected) {
			const allPill = document.querySelector('[data-level-all]');
			const noneSelected = !selected.length;
			if (allPill) allPill.setAttribute('aria-pressed', noneSelected ? 'true' : 'false');
			document.querySelectorAll('[data-level-pill]').forEach(function (pill) {
				const code = pill.getAttribute('data-level-pill');
				pill.setAttribute('aria-pressed', selected.indexOf(code) !== -1 ? 'true' : 'false');
			});
		}

		function revertHomePrefs() {
			const readSelect = document.querySelector('[data-read-along]');
			if (readSelect) readSelect.value = initialPrefs.read;
			syncTranslateSelectForReadAlong();
			const translateSelect = document.querySelector('[data-translate-along]');
			const savedTranslate = (initialPrefs.translate || '').split(',')[0];
			if (translateSelect && savedTranslate) {
				const options = TRANSLATION_LANGS_BY_SOURCE[initialPrefs.read] || [];
				translateSelect.value = options.indexOf(savedTranslate) !== -1 ? savedTranslate : (options[0] || '');
			}
			syncLevelPills(initialPrefs.level.split(',').filter(Boolean));
		}

		function saveHomePrefs() {
			const next = prefsState();
			if (!next.translate) return;
			const initialTranslate = (initialPrefs.translate || '').split(',')[0];
			if (next.read === initialPrefs.read && next.translate === initialTranslate && next.level === initialPrefs.level) {
				document.getElementById('home-prefs')?.close();
				return;
			}
			setLangPref('read', next.read);
			setLangPref('translate', next.translate);
			setLangPref('level', next.level);
			location.reload();
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

		document.querySelector('[data-read-along]')?.addEventListener('change', syncTranslateSelectForReadAlong);
		document.querySelector('[data-level-all]')?.addEventListener('click', function () {
			syncLevelPills([]);
		});
		document.querySelectorAll('[data-level-pill]').forEach(function (pill) {
			pill.addEventListener('click', function () {
				const pressed = this.getAttribute('aria-pressed') === 'true';
				this.setAttribute('aria-pressed', pressed ? 'false' : 'true');
				syncLevelPills(selectedLevelPills());
			});
		});
		document.querySelector('[data-prefs-save]')?.addEventListener('click', saveHomePrefs);
		document.getElementById('home-prefs')?.addEventListener('close', revertHomePrefs);
	</script>
	<script type="text/javascript" src="assets/home.js?v=12"></script>

<?php endif; ?>

</body>
</html>
