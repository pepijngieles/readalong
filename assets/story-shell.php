<?php
require_once __DIR__ . '/helpers.php';
$partials = __DIR__ . '/partials';
$storyClass = 'story';
if (!empty($story['storyType']) && $story['storyType'] !== 'default') {
  $storyClass .= ' ' . e($story['storyType']);
}
?>
<?php include $partials . '/head.php'; ?>
<body id=app class=show-translation data-audio-base="<?= e($base) ?>audio/">
<script type="text/javascript">
;(function () {
  try {
    var stored = localStorage.getItem('readalong:v1:settings:showTranslation')
    if (stored === 'false' || stored === '0') {
      document.body.classList.remove('show-translation')
    }
  } catch (e) {}
})()
</script>

<?php include $partials . '/icon-sprite.php'; ?>

	<main>

		<article class="<?= $storyClass ?>" lang=nl translate=no>

			<h1><?= e($story['heading']) ?></h1>

<?php include $partials . '/selection-row.php'; ?>

<?php include $content; ?>

		</article>

<?php include $partials . '/footer-info.php'; ?>

<?php include $partials . '/translation-popover.php'; ?>

	</main>

<?php
include $partials . '/nav.php';
include $partials . '/settings-dialog.php';
include $partials . '/scripts.php';
?>
</body>
</html>
