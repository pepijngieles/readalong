<?php

function thumbnail_motifs() {
  return ['band', 'arc', 'echo', 'grid', 'horizon'];
}

function thumbnail_hash_id($id) {
  $h = 2166136261;
  $id = (string) $id;
  $len = strlen($id);
  for ($i = 0; $i < $len; $i++) {
    $h ^= ord($id[$i]);
    $h = ($h * 16777619) & 0xFFFFFFFF;
  }
  return $h;
}

function motif_for($id) {
  $motifs = thumbnail_motifs();
  $h = thumbnail_hash_id($id);
  return [
    'motif' => $motifs[$h % count($motifs)],
    'variant' => ($h >> 8) % 4,
  ];
}

function thumbnail_render_motif($motif, $variant, $iconName) {
  $variant = (int) $variant;
  if ($variant < 0 || $variant > 3) {
    $variant = 0;
  }

  if ($motif === 'echo') {
    return '<div class="motif echo" data-variant="' . $variant . '">'
      . thumb_icon_html($iconName)
      . '</div>';
  }

  $known = thumbnail_motifs();
  if (!in_array($motif, $known, true)) {
    $motif = 'band';
  }

  return '<div class="motif ' . e($motif) . '" data-variant="' . $variant . '"></div>';
}
