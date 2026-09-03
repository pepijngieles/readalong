<?php

// Icons are inlined per usage instead of referenced with <use>. Chromium does
// not let document CSS reach the shadow tree that <use> creates, so selectors
// like [data-icon] path would only ever style the hidden original.
function icon_definitions() {
  return [
    'back' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M2.5 11.5L9.5 4.5" class="round"/><path d="M2.5 11.5H22.5" class="round"/><path d="M9.5 18.5L2.5 11.5" class="round"/>',
    ],
    'chevron-down' => [
      'viewBox' => '0 0 16 16',
      'body' => '<path d="M7.5 10.5L4.5 7.5" class="round"/><path d="M7.5 10.5L10.5 7.5" class="round"/>',
    ],
    'close' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M4.5 19.5L19.5 4.5" class="round"/><path d="M19.5 19.5L4.5 4.5" class="round"/>',
    ],
    'close-small' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M7.5 16.5L16.5 7.5" class="round"/><path d="M16.5 16.5L7.5 7.5" class="round"/>',
    ],
    'curve' => [
      'viewBox' => '0 0 80 24',
      'body' => '<path d="M21.1 14.8a24 24 0 0 0 37.8 0C64.3 8 71.2 0 80 0H0c8.8 0 15.7 7.9 21.1 14.8Z" class="fill no-stroke"/>',
    ],
    'forward' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M5.5 18.5C5.5 12.9772 9.97715 8.5 15.5 8.5" class="no-fill round"/><path d="M15.5 10.5V6.5L18.5 8.5L15.5 10.5Z" class="fill round"/>',
    ],
    'pause' => [
      'viewBox' => '0 0 24 24',
      'body' => '<rect x="6" y="4" width="3" height="16"/><rect x="15" y="4" width="3" height="16"/>',
    ],
    'play' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M6.5 21.5V2.5L21.5 12L6.5 21.5Z" class="fill"/>',
    ],
    'rewind' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M18.5 18.5C18.5 12.9772 14.0228 8.5 8.5 8.5" class="no-fill round"/><path d="M8.5 10.5V6.5L5.5 8.5L8.5 10.5Z" class="fill round"/>',
    ],
    'gear' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M20 7.2a1.9 1.9 0 0 0 1 2.6l1.3.4a1.9 1.9 0 0 1 0 3.6l-1.3.4a1.9 1.9 0 0 0-1 2.6l.5 1.2a1.9 1.9 0 0 1-2.5 2.5l-1.2-.6a1.9 1.9 0 0 0-2.6 1l-.4 1.4a1.9 1.9 0 0 1-3.6 0L9.8 21a1.9 1.9 0 0 0-2.6-1l-1.2.5A1.9 1.9 0 0 1 3.5 18l.6-1.2a1.9 1.9 0 0 0-1-2.6l-1.4-.4a1.9 1.9 0 0 1 0-3.6L3 9.8a1.9 1.9 0 0 0 1-2.6L3.6 6A1.9 1.9 0 0 1 6 3.5l1.2.6a1.9 1.9 0 0 0 2.6-1l.4-1.4a1.9 1.9 0 0 1 3.6 0l.4 1.3a1.9 1.9 0 0 0 2.6 1l1.2-.5A1.9 1.9 0 0 1 20.5 6l-.6 1.2Z"/><path d="M8.5 12a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0v0Z"/>',
    ],
    'share-ios' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M8.5 6.5L11.5 3.5" class="round"/><path d="M14.5 6.5L11.5 3.5" class="round"/><path d="M9 8.5H7C6.17157 8.5 5.5 9.17157 5.5 10V18C5.5 18.8284 6.17157 19.5 7 19.5H16C16.8284 19.5 17.5 18.8284 17.5 18V10C17.5 9.17157 16.8284 8.5 16 8.5H14" class="round"/><path d="M11.5 14.5V4.5" class="round"/>',
    ],
    'add-ios' => [
      'viewBox' => '0 0 24 24',
      'body' => '<rect x="5.5" y="6.5" width="12" height="12" rx="1.5" class="round no-fill stroke"/><path d="M11.5 15.5V9.5" class="round"/><path d="M8.5 12.5H14.5" class="round"/>',
    ],
  ];
}

function icon($name, $options = []) {
  static $icons = null;
  if ($icons === null) {
    $icons = icon_definitions();
  }

  if (!isset($icons[$name])) {
    throw new RuntimeException('Unknown icon: ' . $name);
  }

  $definition = $icons[$name];
  $size = $options['size'] ?? 24;
  $width = $options['width'] ?? $size;
  $height = $options['height'] ?? $size;
  $class = $options['class'] ?? 'icon';
  $style = isset($options['style']) ? ' style="' . e($options['style']) . '"' : '';

  echo '<svg width=' . (int) $width . ' height=' . (int) $height
    . ' viewBox="' . e($definition['viewBox']) . '"'
    . ' class=' . e($class) . ' data-icon aria-hidden=true' . $style . '>'
    . $definition['body']
    . '</svg>';
}
