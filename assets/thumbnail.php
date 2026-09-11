<?php

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/thumbnail-icons.php';
require_once __DIR__ . '/thumbnail-topics.php';
require_once __DIR__ . '/thumbnail-motifs.php';

function thumbnail_layout_for_size($size) {
  $size = (int) $size;
  if ($size < 32) {
    return 'icon';
  }
  if ($size < 64) {
    return 'compact';
  }
  return 'full';
}

function render_item_thumbnail($id, $topic, $contentType, $size = 96, $className = '', $shape = 'square') {
  $shape = $shape === 'banner' ? 'banner' : 'square';
  $size = (int) $size;
  if ($size < 1) {
    $size = 96;
  }

  $resolved = resolve_topic($topic);
  $family = $resolved['family'];
  $iconName = $resolved['icon'];
  $badgeName = resolve_content_type_badge($contentType);
  $layout = $shape === 'banner' ? 'full' : thumbnail_layout_for_size($size);
  $motifInfo = motif_for($id);

  $classes = 'item-thumb';
  if ($shape === 'banner') {
    $classes .= ' banner';
  }
  $className = trim((string) $className);
  if ($className !== '') {
    $classes .= ' ' . $className;
  }

  $html = '<div class="' . e($classes) . '"';
  $html .= ' data-family="' . e($family) . '"';
  $html .= ' data-layout="' . e($layout) . '"';
  if ($shape === 'banner') {
    $html .= ' data-shape=banner';
  } else {
    $html .= ' style="--thumb-size:' . $size . 'px;width:var(--thumb-size);height:var(--thumb-size)"';
  }
  $html .= ' aria-hidden="true" role="presentation">';
  $html .= '<div class="canvas">';

  if ($layout === 'full') {
    $html .= thumbnail_render_motif($motifInfo['motif'], $motifInfo['variant'], $iconName);
  }

  if ($layout !== 'icon') {
    $html .= '<div class="disc"></div>';
  }

  $html .= '<div class="topic-icon">' . thumb_icon_html($iconName) . '</div>';
  $html .= '</div>';

  if ($layout !== 'icon') {
    $html .= '<div class="type-badge">' . thumb_icon_html($badgeName, ['badge' => true]) . '</div>';
  }

  $html .= '</div>';
  return $html;
}

function item_thumbnail($id, $topic, $contentType, $size = 96, $className = '') {
  echo render_item_thumbnail($id, $topic, $contentType, $size, $className);
}
