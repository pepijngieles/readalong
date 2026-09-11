<?php
require_once __DIR__ . '/assets/helpers.php';
require_once __DIR__ . '/assets/thumbnail.php';

$base = '';
$story = ['title' => 'Item thumbnails'];
$partials = __DIR__ . '/assets/partials';

$families = thumbnail_families();
$contentTypes = ['podcast', 'book', 'news', 'email'];
$familyTopics = [
  'history' => 'history',
  'science' => 'science',
  'nature' => 'nature',
  'society' => 'world',
  'life' => 'health',
  'arts' => 'fiction',
];

$library = [
  ['id' => 'favorite-food', 'topic' => 'food', 'contentType' => '', 'title' => "What's your favorite food?"],
  ['id' => 'taco-pa-fredag', 'topic' => 'food', 'contentType' => 'podcast', 'title' => 'Taco on Friday, pizza on Saturday'],
  ['id' => 'bo-i-byen', 'topic' => 'cities', 'contentType' => 'news', 'title' => 'Benefits of Living in the City'],
  ['id' => 'byutvikling-i-trondheim', 'topic' => 'cities', 'contentType' => 'podcast', 'title' => 'City development in Trondheim'],
  ['id' => 'viktoria-av-hessen-darmstadt', 'topic' => 'biography', 'contentType' => 'book', 'title' => 'Victoria of Hesse-Darmstadt'],
  ['id' => 'kvinner-i-vikingtida', 'topic' => 'archaeology', 'contentType' => 'podcast', 'title' => 'How did women live in the Viking Age?'],
  ['id' => 'steilneset-minnested', 'topic' => 'history', 'contentType' => 'podcast', 'title' => 'The memorial at Steilneset'],
  ['id' => 'tonesette-dikt', 'topic' => 'music', 'contentType' => 'podcast', 'title' => 'Setting poems to music'],
  ['id' => 'two-frogs', 'topic' => 'fiction', 'contentType' => '', 'title' => 'The story of two frogs'],
];

function thumb_demo_cell($id, $topic, $contentType, $size, $caption) {
  echo '<div class=thumb-cell>';
  echo render_item_thumbnail($id, $topic, $contentType, $size);
  echo '<small>' . e($caption) . '</small>';
  echo '</div>';
}
?>
<?php include $partials . '/head.php'; ?>
<body class=thumb-demo-page>
<?php include $partials . '/theme-bootstrap.php'; ?>

	<main>
		<header class="flex gap-small">
			<div class="flex columns gap-3xs fill">
				<h1>Item thumbnails</h1>
				<p class="text-color-secondary font-size-small">Colour is topic family. Centre icon is topic. Badge is content type. Motif is hashed from id.</p>
			</div>
		</header>

		<div class="theme-toggles flex gap-2xs" role=group aria-label="Theme">
			<button type=button class="pill choice" data-theme=light data-click=setThumbDemoTheme>Light</button>
			<button type=button class="pill choice" data-theme=cream data-click=setThumbDemoTheme>Cream</button>
			<button type=button class="pill choice" data-theme=dark data-click=setThumbDemoTheme>Dark</button>
			<button type=button class="pill choice" data-theme=black data-click=setThumbDemoTheme>Black</button>
		</div>

		<h2>Family × content type</h2>
		<div class=thumb-matrix>
			<div></div>
<?php foreach ($contentTypes as $type): ?>
			<div class=head><?= e($type) ?></div>
<?php endforeach; ?>
<?php foreach ($families as $family): ?>
			<div class=row-label><?= e($family) ?></div>
<?php
  $topic = $familyTopics[$family];
  foreach ($contentTypes as $type) {
    $id = 'matrix-' . $family . '-' . $type;
    thumb_demo_cell($id, $topic, $type, 96, $topic);
  }
endforeach; ?>
			<div class=row-label>fallback</div>
<?php foreach ($contentTypes as $type): ?>
<?php thumb_demo_cell('matrix-fallback-' . $type, 'unknown-topic', $type, 96, 'unknown'); ?>
<?php endforeach; ?>
		</div>

		<h2>Motif grid</h2>
		<p class="text-color-tertiary font-size-small">Same topic and type; id varies. Six motifs × four variants.</p>
		<div class=thumb-motif-grid>
<?php for ($i = 0; $i < 24; $i++):
  $id = sprintf('grid-%02d', $i);
  $info = motif_for($id);
  $caption = $info['motif'] . ' · v' . $info['variant'];
  thumb_demo_cell($id, 'history', 'podcast', 96, $caption);
endfor; ?>
		</div>

		<h2>Library sample</h2>
		<p class="text-color-tertiary font-size-small">Proposed topics for the nine published stories. Not written to story.json yet.</p>
		<div class=thumb-library>
<?php foreach ($library as $item):
  $caption = $item['title'] . ' · ' . $item['topic'];
  if ($item['contentType'] !== '') {
    $caption .= ' · ' . $item['contentType'];
  }
  thumb_demo_cell($item['id'], $item['topic'], $item['contentType'], 96, $caption);
endforeach; ?>
		</div>

		<h2>Size</h2>
		<div class=thumb-sizes>
<?php
thumb_demo_cell('size-demo', 'archaeology', 'podcast', 96, '96px');
thumb_demo_cell('size-demo', 'archaeology', 'podcast', 48, '48px · no motif');
thumb_demo_cell('size-demo', 'archaeology', 'podcast', 24, '24px · icon only');
?>
		</div>

		<h2>Resolution</h2>
		<div class=thumb-motif-grid>
<?php
thumb_demo_cell('alias-news', 'news', 'news', 96, 'topic alias news → world');
thumb_demo_cell('alias-law', 'law', 'news', 96, 'alias law → politics');
thumb_demo_cell('family-only', 'society', 'email', 96, 'family slug society');
thumb_demo_cell('empty-topic', '', 'weather', 96, 'empty topic · unknown type');
?>
		</div>
	</main>

	<script>
		function setThumbDemoTheme(el) {
			var theme = el.getAttribute('data-theme') || 'light';
			document.body.classList.remove('theme-cream', 'theme-dark', 'theme-black');
			if (theme !== 'light') {
				document.body.classList.add('theme-' + theme);
			}
			document.querySelectorAll('.theme-toggles [data-theme]').forEach(function (btn) {
				btn.setAttribute('aria-pressed', btn.getAttribute('data-theme') === theme ? 'true' : 'false');
			});
		}
		(function () {
			var current = 'light';
			if (document.body.classList.contains('theme-cream')) current = 'cream';
			else if (document.body.classList.contains('theme-dark')) current = 'dark';
			else if (document.body.classList.contains('theme-black')) current = 'black';
			var match = document.querySelector('.theme-toggles [data-theme="' + current + '"]');
			if (match) match.setAttribute('aria-pressed', 'true');
		})();
	</script>
	<script type="text/javascript" src="<?= e($base) ?>assets/brio/brio.js?v=1" defer></script>
</body>
</html>
