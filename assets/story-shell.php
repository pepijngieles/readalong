<?php
require_once __DIR__ . '/helpers.php';
$partials = __DIR__ . '/partials';
$storyClass = 'story';
?>
<?php include $partials . '/head.php'; ?>
<?php $showTranslation = ($translationLang ?? '') !== ($story['languageCode'] ?? ''); ?>
<body<?= $showTranslation ? ' class=show-translation' : '' ?>>
<?php include $partials . '/theme-bootstrap.php'; ?>

	<main>

		<article class="<?= e($storyClass) ?>" lang=<?= e($story['languageCode']) ?> translate=no>

			<h1><?= e($story['heading']) ?></h1>

<?php include $partials . '/selection-row.php'; ?>

<?php include $partials . '/noscript-info.php'; ?>

<?php include $partials . '/story-content.php'; ?>

		</article>

<?php include $partials . '/footer-info.php'; ?>

<?php include $partials . '/translation-popover.php'; ?>

		<progress value="0" max="100"></progress>

	</main>

<?php include $partials . '/nav.php'; ?>

<?php $settingsReader = true; include $partials . '/settings-dialog.php'; ?>

<?php include $partials . '/story-config.php'; ?>

<?php include $partials . '/scripts.php'; ?>

</body>
</html>
