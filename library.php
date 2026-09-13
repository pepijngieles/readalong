<?php
require_once __DIR__ . '/assets/helpers.php';
require_once __DIR__ . '/assets/story.php';

$view = $_GET['view'] ?? 'hidden';
if (!in_array($view, ['hidden', 'completed'], true)) {
  $view = 'hidden';
}

$base = '';
$story = ['title' => t('library.' . $view . '_title')];
$uiLocale = ui_locale();
$partials = __DIR__ . '/assets/partials';

$storiesDir = __DIR__ . '/stories';
$contentLangs = story_content_languages($storiesDir);
$defaultReadLang = in_array('nl', $contentLangs, true) ? 'nl' : ($contentLangs[0] ?? 'nl');
$readAlongLang = lang_prefs_list('read', $contentLangs, [$defaultReadLang])[0] ?? $defaultReadLang;
$translateLangOptions = story_translation_languages_for_sources(
  array_reduce($contentLangs, function ($carry, $code) use ($storiesDir) {
    $carry[$code] = story_translation_languages_for_source($storiesDir, $code);
    return $carry;
  }, []),
  [$readAlongLang],
  $contentLangs
);
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

		<header class="library-header flex gap-small">
			<a class="quiet icon-only small rounded library-back" href="./" aria-label="<?= e(t('library.back')) ?>">
				<?php icon('back', ['size' => 20]); ?>
			</a>
			<h1 class=font-size-large><?= e(t('library.' . $view . '_title')) ?></h1>
		</header>

		<section class=home-section data-library-section data-library-view="<?= e($view) ?>" data-i18n-empty-hidden="<?= e(t('library.empty_hidden')) ?>" data-i18n-empty-completed="<?= e(t('library.empty_completed')) ?>">
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
	</script>
	<script type="text/javascript" src="assets/brio/brio.js?v=1" defer></script>
	<script type="text/javascript" src="assets/item-state.js?v=1" defer></script>
	<script type="text/javascript" src="assets/item-actions.js?v=2" defer></script>
	<script type="text/javascript" src="assets/settings.js?v=5" defer></script>
	<script type="text/javascript" src="assets/library.js?v=1" defer></script>

</body>
</html>
