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
  $readAlongLang = lang_pref('read', $sourceLangs, 'nl');
  $translationLangsSelected = lang_prefs_list('translate', $translationLangs, [$uiLocale]);
  $levelCodes = level_codes();
  $levelFilter = lang_prefs_list('level', $levelCodes, []);
  $showTranslationLang = count($translationLangsSelected) > 1;
  $stories = story_list($storiesDir, $translationLangsSelected, $readAlongLang, $levelFilter);
  [$weatherStories, $stories] = story_partition_by_kind($stories, 'weather');
  $durationPills = [2, 5, 10];
  $kindTiles = story_filter_kinds();
  $levelSummary = $levelFilter === [] ? t('home.all_levels') : implode(' · ', $levelFilter);
  $prefsSummary = lang_label($readAlongLang) . ' · ' . $levelSummary;
  $prefsDialogLabel = t('home.read_along') . ', ' . t('home.translate_into') . ', ' . t('home.level');
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

		<dialog id=home-prefs class=home-prefs aria-label="<?= e($prefsDialogLabel) ?>">
			<button type=button class="close-button quiet icon-only" data-prefs-close>
				<span class=visually-hidden><?= e(t('common.close')) ?></span>
				<?php icon('close-small'); ?>
			</button>
			<div class=home-prefs__fields>
				<div class=home-prefs__field>
					<label for=read-along><?= e(t('home.read_along')) ?></label>
					<div class=home-prefs__select>
						<select id=read-along name=read-along class="quiet read-along-select" data-read-along>
<?php foreach ($sourceLangs as $code): ?>
							<option value=<?= e($code) ?><?= $code === $readAlongLang ? ' selected' : '' ?>><?= e(lang_label($code)) ?></option>
<?php endforeach; ?>
						</select>
						<?php icon('chevron-down', ['size' => 16]); ?>
					</div>
				</div>
				<div class=home-prefs__field>
					<label id=home-translate-label><?= e(t('home.translate_into')) ?></label>
					<div class="pill-row home-prefs__pills" role=group aria-labelledby=home-translate-label>
<?php foreach ($translationLangs as $code): ?>
						<button type=button class=pill data-translate-pill="<?= e($code) ?>" aria-pressed=<?= in_array($code, $translationLangsSelected, true) && $code !== $readAlongLang ? 'true' : 'false' ?> translate=no lang=<?= e($code) ?><?= $code === $readAlongLang ? ' hidden' : '' ?>>
							<?php icon('check', ['size' => 16, 'class' => 'pill__check']); ?>
							<?= e(lang_endonym($code)) ?>
						</button>
<?php endforeach; ?>
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

		<div class="info home-intro" data-home-intro>
			<button type=button class="close-button quiet icon-only" data-dismiss-intro>
				<span class=visually-hidden><?= e(t('home.dismiss_intro')) ?></span>
				<?php icon('close-small'); ?>
			</button>
			<p><?= e(t('home.tagline')) ?></p>
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
			<div class="home-empty" data-no-results<?= $stories ? ' hidden' : '' ?> data-i18n-empty="<?= e(t('home.no_results')) ?>" data-i18n-empty-filters="<?= e(t('home.no_results_filters')) ?>">
				<p data-empty-message><?= e(t('home.no_results')) ?></p>
				<button type=button class="quiet home-clear-filters" data-clear-filters hidden><?= e(t('home.clear_filters')) ?></button>
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

		function selectedTranslatePills() {
			return Array.from(document.querySelectorAll('[data-translate-pill][aria-pressed=true]'))
				.map(function (pill) { return pill.getAttribute('data-translate-pill'); })
				.filter(Boolean);
		}

		function selectedLevelPills() {
			return Array.from(document.querySelectorAll('[data-level-pill][aria-pressed=true]'))
				.map(function (pill) { return pill.getAttribute('data-level-pill'); })
				.filter(Boolean);
		}

		function prefsState() {
			return {
				read: document.querySelector('[data-read-along]')?.value || '',
				translate: selectedTranslatePills().join(','),
				level: selectedLevelPills().join(',')
			};
		}

		const initialPrefs = prefsState();

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
				if (firstVisible) firstVisible.setAttribute('aria-pressed', 'true');
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
			const translateSelected = initialPrefs.translate.split(',').filter(Boolean);
			document.querySelectorAll('[data-translate-pill]').forEach(function (pill) {
				const code = pill.getAttribute('data-translate-pill');
				pill.setAttribute('aria-pressed', translateSelected.indexOf(code) !== -1 ? 'true' : 'false');
			});
			syncTranslatePillsForReadAlong();
			syncLevelPills(initialPrefs.level.split(',').filter(Boolean));
		}

		function saveHomePrefs() {
			const next = prefsState();
			if (next.translate.length === 0) return;
			if (next.read === initialPrefs.read && next.translate === initialPrefs.translate && next.level === initialPrefs.level) {
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

		document.querySelector('[data-read-along]')?.addEventListener('change', syncTranslatePillsForReadAlong);
		document.querySelectorAll('[data-translate-pill]').forEach(function (pill) {
			pill.addEventListener('click', function () {
				const pressed = this.getAttribute('aria-pressed') === 'true';
				const selectedCount = selectedTranslatePills().length;
				if (pressed && selectedCount <= 1) return;
				this.setAttribute('aria-pressed', pressed ? 'false' : 'true');
			});
		});
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
		syncTranslatePillsForReadAlong();
	</script>
	<script type="text/javascript" src="assets/home.js?v=10"></script>

<?php endif; ?>

</body>
</html>
