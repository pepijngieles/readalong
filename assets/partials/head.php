<!DOCTYPE html>
<html lang="<?= e(ui_locale()) ?>" translate=yes class=no-js>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#ffffff" />

	<title><?= e($story['title']) ?></title>

	<script type="module">
		document.documentElement.classList.remove('no-js');
		document.documentElement.classList.add('js');
	</script>

	<!-- <link rel=icon href=<?= e($base) ?>assets/favicons/fav.ico> -->
	<link rel=icon href=<?= e($base) ?>assets/favicons/favicon.svg type=image/svg+xml>
	<link rel=apple-touch-icon href=<?= e($base) ?>assets/favicons/favicon-180.png>
	<link rel=manifest href=<?= e($base) ?>manifest.json>
	<link rel="stylesheet" type="text/css" href="<?= e($base) ?>assets/styles.css?v=9">
</head>
