<?php
require_once __DIR__ . '/assets/helpers.php';
require_once __DIR__ . '/assets/story.php';

$view = $_GET['view'] ?? 'in_progress';
if (!in_array($view, ['in_progress', 'hidden', 'completed', 'favorites'], true)) {
  $view = 'in_progress';
}

$base = '/';
$story = ['title' => t('library.title')];
$uiLocale = ui_locale();
$partials = __DIR__ . '/assets/partials';

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
$levelFilter = lang_prefs_list('level', level_codes(), []);
$showTranslationLang = false;
$stories = story_list($storiesDir, [$translateLang], null, []);
$stories = story_apply_home_hidden($stories, [$readAlongLang], $contentLangs, $levelFilter);
?>
<?php include $partials . '/head.php'; ?>
<body class="library-page">

<?php include $partials . '/theme-bootstrap.php'; ?>

	<main class="library-main padding-page">

		<header class="library-header flex columns gap-small">
			<div class="library-header-row flex gap-small">
				<a class="quiet icon-only small rounded library-back" href="<?= e($base) ?>" aria-label="<?= e(t('library.back')) ?>">
					<?php icon('back', ['size' => 20]); ?>
				</a>
				<h1 class=font-size-large><?= e(t('library.title')) ?></h1>
			</div>
			<fieldset class="library-segment flex gap-2xs" data-change=switchLibraryView>
				<legend class=visually-hidden><?= e(t('library.title')) ?></legend>
				<label>
					<input type=radio name=library-view value=in_progress<?= $view === 'in_progress' ? ' checked' : '' ?>>
					<span class=button><?= e(t('home.filter.progress.in_progress')) ?></span>
				</label>
				<label>
					<input type=radio name=library-view value=completed<?= $view === 'completed' ? ' checked' : '' ?>>
					<span class=button><?= e(t('home.filter.progress.done')) ?></span>
				</label>
				<label>
					<input type=radio name=library-view value=favorites<?= $view === 'favorites' ? ' checked' : '' ?>>
					<span class=button><?= e(t('home.favorites')) ?></span>
				</label>
				<label>
					<input type=radio name=library-view value=hidden<?= $view === 'hidden' ? ' checked' : '' ?>>
					<span class=button><?= e(t('home.filter.visibility.hidden')) ?></span>
				</label>
			</fieldset>
		</header>

		<section class=home-section data-library-section data-library-view="<?= e($view) ?>" data-i18n-empty-in-progress="<?= e(t('library.empty_in_progress')) ?>" data-i18n-empty-hidden="<?= e(t('library.empty_hidden')) ?>" data-i18n-empty-completed="<?= e(t('library.empty_completed')) ?>" data-i18n-empty-favorites="<?= e(t('library.empty_favorites')) ?>">
<?php render_story_list($stories, 'data-library-items', $showTranslationLang, true, true); ?>
			<div class="home-empty" data-library-empty hidden>
				<p data-library-empty-message></p>
			</div>
		</section>

	</main>

<?php
$settingsCatalog = true;
include $partials . '/settings-dialog.php';
include $partials . '/item-chrome.php';
include $partials . '/item-actions-i18n.php';
?>

	<script type="text/javascript">
		window.COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
		window.TRANSLATION_LANGS_BY_SOURCE = <?= json_encode($translationLangsBySource, JSON_UNESCAPED_UNICODE) ?>;
		window.LANG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;
		window.setLangPref = function (key, value) {
			localStorage.setItem('readalong-' + key, value);
			document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + window.COOKIE_MAX_AGE + '; SameSite=Lax';
		};
	</script>
	<script type="text/javascript" src="<?= e($base) ?>assets/brio/brio.js?v=1" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/menu-position.js?v=1" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/item-state.js?v=4" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/item-actions.js?v=7" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/settings.js?v=7" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/library.js?v=6" defer></script>

</body>
</html>
