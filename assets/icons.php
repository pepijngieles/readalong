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
    'check' => [
      'viewBox' => '0 0 16 16',
      'body' => '<path d="M3.5 8.5L6.5 11.5L12.5 4.5" class="round no-fill"/>',
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
    'font-small' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M8.18359 18.6364H5.93359L10.0302 7H12.6325L16.7347 18.6364H14.4847L11.3768 9.38636H11.2859L8.18359 18.6364ZM8.25746 14.0739H14.3938V15.767H8.25746V14.0739Z" class="fill no-stroke"/>',
    ],
    'font-large' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M7.44727 19.4545H4.07227L10.2172 2H14.1206L20.274 19.4545H16.899L12.237 5.57955H12.1007L7.44727 19.4545ZM7.55806 12.6108H16.7626V15.1506H7.55806V12.6108Z" class="fill no-stroke"/>',
    ],
    'line-tight' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M6 8.5H18" class="no-fill round"/><path d="M6 12.5H18" class="no-fill round"/><path d="M6 16.5H18" class="no-fill round"/>',
    ],
    'line-loose' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M6 5H18" class="no-fill round"/><path d="M6 12H18" class="no-fill round"/><path d="M6 19H18" class="no-fill round"/>',
    ],
    'speed-rabbit' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M13 16C13.5795 15.9992 14.1467 16.1663 14.6333 16.481C15.1198 16.7958 15.5048 17.2446 15.7417 17.7735C15.9787 18.3023 16.0573 18.8884 15.9683 19.461C15.8793 20.0336 15.6263 20.5681 15.24 21" class="no-fill round"/><path d="M18 12H18.01" class="no-fill round" stroke-width="2"/><path d="M18 20.9999H10C8.93913 20.9999 7.92172 20.5785 7.17157 19.8283C6.42143 19.0782 6 18.0608 6 16.9999C6 15.1434 6.7375 13.3629 8.05025 12.0502C9.36301 10.7374 11.1435 9.99992 13 9.99992H13.2L9.6 6.39992C9.41615 6.21607 9.27031 5.99781 9.17081 5.75759C9.07131 5.51738 9.0201 5.25992 9.0201 4.99992C9.0201 4.47482 9.2287 3.97122 9.6 3.59992C9.9713 3.22862 10.4749 3.02002 11 3.02002C11.26 3.02002 11.5175 3.07123 11.7577 3.17073C11.9979 3.27023 12.2161 3.41607 12.4 3.59992L15.8 6.99992H16C19.3 6.99992 22 9.69992 22 12.9999V13.9999C22 14.5304 21.7893 15.0391 21.4142 15.4141C21.0391 15.7892 20.5304 15.9999 20 15.9999H19C18.2044 15.9999 17.4413 16.316 16.8787 16.8786C16.3161 17.4412 16 18.2043 16 18.9999" class="no-fill round"/><path d="M20 8.54V4C20 3.46957 19.7893 2.96086 19.4142 2.58579C19.0391 2.21071 18.5304 2 18 2C17.4696 2 16.9609 2.21071 16.5858 2.58579C16.2107 2.96086 16 3.46957 16 4V7" class="no-fill round"/><path d="M7.6119 12.5242C7.3307 12.0265 6.91318 11.6196 6.40849 11.3512C5.90379 11.0828 5.33293 10.9642 4.76311 11.0094C4.19329 11.0545 3.64822 11.2615 3.19207 11.606C2.73592 11.9504 2.38767 12.4181 2.18834 12.9538C1.989 13.4895 1.94686 14.071 2.06688 14.6299C2.1869 15.1888 2.46409 15.7017 2.86581 16.1084C3.26753 16.515 3.77706 16.7984 4.33443 16.9252C4.89179 17.0521 5.47378 17.017 6.0119 16.8242" class="no-fill round"/>',
    ],
    'pause-bars' => [
      'viewBox' => '0 0 24 24',
      'body' => '<path d="M20 5.5H9C8.44772 5.5 8 5.75584 8 6.07143V8.92857C8 9.24416 8.44772 9.5 9 9.5H20C20.5523 9.5 21 9.24416 21 8.92857V6.07143C21 5.75584 20.5523 5.5 20 5.5Z" class="no-fill round"/><path d="M2 9L5 12L2 15" class="no-fill round"/><path d="M20 14.5H9C8.44772 14.5 8 14.7558 8 15.0714V17.9286C8 18.2442 8.44772 18.5 9 18.5H20C20.5523 18.5 21 18.2442 21 17.9286V15.0714C21 14.7558 20.5523 14.5 20 14.5Z" class="no-fill round"/>',
    ],
    'text-align-start' => [
      'viewBox' => '0 0 23 29',
      'body' => '<path d="M0.5 0.5H18.5" class="no-fill round"/><path d="M0.5 4.5H12.5" class="no-fill round"/><path d="M0.5 8.5H20.5" class="no-fill round"/><path d="M0.5 12.5H22.5" class="no-fill round"/><path d="M0.5 16.5H13.5" class="no-fill round"/><path d="M0.5 20.5H21.5" class="no-fill round"/><path d="M0.5 24.5H18.5" class="no-fill round"/><path d="M0.5 28.5H15.5" class="no-fill round"/>',
    ],
    'text-align-justify' => [
      'viewBox' => '0 0 23 29',
      'body' => '<path d="M0.5 0.5H22.5" class="no-fill round"/><path d="M0.5 4.5H22.5" class="no-fill round"/><path d="M0.5 8.5H22.5" class="no-fill round"/><path d="M0.5 12.5H22.5" class="no-fill round"/><path d="M0.5 16.5H22.5" class="no-fill round"/><path d="M0.5 20.5H22.5" class="no-fill round"/><path d="M0.5 24.5H22.5" class="no-fill round"/><path d="M0.5 28.5H9.5" class="no-fill round"/>',
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
