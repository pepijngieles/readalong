<?php
/**
 * Unit tests for item thumbnail helpers.
 * Run: php tools/test_thumbnails.php
 */

require_once dirname(__DIR__) . '/assets/thumbnail.php';

$failed = 0;
$passed = 0;

function expect_true($cond, $message) {
  global $failed, $passed;
  if ($cond) {
    $passed++;
    return;
  }
  $failed++;
  fwrite(STDERR, "FAIL: $message\n");
}

function expect_equal($actual, $expected, $message) {
  expect_true($actual === $expected, $message . ' (got ' . var_export($actual, true) . ', expected ' . var_export($expected, true) . ')');
}

// resolve_topic never throws on unknown input
$unknown = [null, '', '   ', 0, 123, 'xyzzy', 'Unknown Topic', '!!!', [], new stdClass()];
foreach ($unknown as $input) {
  try {
    $resolved = resolve_topic($input);
    expect_true(isset($resolved['family'], $resolved['icon']), 'resolve_topic returns family+icon for ' . var_export($input, true));
    expect_true($resolved['family'] !== '' && $resolved['icon'] !== '', 'resolve_topic non-empty for ' . var_export($input, true));
  } catch (Throwable $e) {
    expect_true(false, 'resolve_topic threw on ' . var_export($input, true) . ': ' . $e->getMessage());
  }
}

expect_equal(resolve_topic('archaeology')['family'], 'history', 'archaeology family');
expect_equal(resolve_topic('archaeology')['icon'], 'Shovel', 'archaeology icon');
expect_equal(resolve_topic('news')['family'], 'society', 'alias news → world/society');
expect_equal(resolve_topic('news')['icon'], 'Globe', 'alias news icon');
expect_equal(resolve_topic('law')['icon'], 'Flag', 'alias law → politics');
expect_equal(resolve_topic('psychology')['icon'], 'Heartbeat', 'alias psychology → health');
expect_equal(resolve_topic('maths')['icon'], 'MathOperations', 'alias maths');
expect_equal(resolve_topic('society')['family'], 'society', 'family slug');
expect_equal(resolve_topic('society')['icon'], 'Globe', 'society family fallback icon');
expect_equal(resolve_topic('xyzzy')['family'], 'fallback', 'unknown family');
expect_equal(resolve_topic('xyzzy')['icon'], 'BookOpen', 'unknown icon');

expect_equal(resolve_content_type_badge('podcast'), 'Microphone', 'podcast badge');
expect_equal(resolve_content_type_badge('weather'), 'BookOpen', 'unknown type badge');

// motif_for is stable across calls for the same id
$ids = ['two-frogs', 'grid-00', 'matrix-history-podcast', str_repeat('a', 40), ''];
foreach ($ids as $id) {
  $a = motif_for($id);
  $b = motif_for($id);
  expect_equal($a, $b, 'motif_for stable for ' . var_export($id, true));
  expect_true(in_array($a['motif'], thumbnail_motifs(), true), 'known motif for ' . $id);
  expect_true($a['variant'] >= 0 && $a['variant'] <= 3, 'variant 0-3 for ' . $id);
}

// Motif distribution over 1000 deterministic ids is roughly uniform
$counts = array_fill_keys(thumbnail_motifs(), 0);
$variantCounts = [0, 0, 0, 0];
for ($i = 0; $i < 1000; $i++) {
  $info = motif_for('id-' . $i);
  $counts[$info['motif']]++;
  $variantCounts[$info['variant']]++;
}

foreach ($counts as $motif => $count) {
  expect_true($count >= 140 && $count <= 260, "motif $motif count $count is roughly uniform (expected ~200)");
}

$chi = 0.0;
foreach ($counts as $count) {
  $chi += (($count - 200) ** 2) / 200;
}
expect_true($chi < 20, "chi-square $chi over motifs should be modest");

foreach ($variantCounts as $variant => $count) {
  expect_true($count >= 150 && $count <= 350, "variant $variant count $count is roughly uniform (expected ~250)");
}

// Render never empty / never throws
try {
  $html = render_item_thumbnail('x', 'nope', 'nope', 96);
  expect_true(strpos($html, 'item-thumb') !== false, 'render includes item-thumb');
  expect_true(strpos($html, 'aria-hidden="true"') !== false, 'render is aria-hidden');
  expect_true(strpos($html, 'role="presentation"') !== false, 'render is presentation');
  expect_true(strpos($html, '<svg') !== false, 'render includes an icon');
  $compact = render_item_thumbnail('x', 'food', 'podcast', 48);
  expect_true(strpos($compact, 'class="motif') === false, 'compact skips motif');
  expect_true(strpos($compact, 'type-badge') !== false, 'compact keeps badge');
  $iconOnly = render_item_thumbnail('x', 'food', 'podcast', 24);
  expect_true(strpos($iconOnly, 'type-badge') === false, 'icon layout skips badge');
  expect_true(strpos($iconOnly, 'class="disc"') === false, 'icon layout skips disc');
} catch (Throwable $e) {
  expect_true(false, 'render_item_thumbnail threw: ' . $e->getMessage());
}

// Every mapped icon exists
$defs = thumb_icon_definitions();
foreach (thumbnail_topic_map() as $slug => $entry) {
  expect_true(isset($defs[$entry['icon']]), "icon {$entry['icon']} for $slug exists");
}
foreach (thumbnail_family_fallbacks() as $family => $icon) {
  expect_true(isset($defs[$icon]), "fallback icon $icon for $family exists");
}
foreach (thumbnail_content_type_badges() as $type => $icon) {
  expect_true(isset($defs[$icon]), "badge icon $icon for $type exists");
}
expect_true(isset($defs['BookOpen']), 'BookOpen fallback exists');

if ($failed > 0) {
  fwrite(STDERR, "$failed failed, $passed passed\n");
  exit(1);
}

echo "OK ($passed assertions)\n";
