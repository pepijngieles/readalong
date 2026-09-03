<?php

function e($value) {
  return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

require_once __DIR__ . '/icons.php';

function format_duration($seconds) {
  $seconds = (int) $seconds;
  $h = intdiv($seconds, 3600);
  $m = intdiv($seconds % 3600, 60);
  $s = $seconds % 60;

  $hDisplay = $h > 0 ? ($h < 10 ? '0' : '') . $h . ':' : '';
  $mDisplay = $m > 0 ? ($m < 10 ? '0' : '') . $m . ':' : '00:';
  $sDisplay = $s > 0 ? ($s < 10 ? '0' : '') . $s : '00';

  return $hDisplay . $mDisplay . $sDisplay;
}

function read_json($path) {
  if (!is_readable($path)) {
    throw new RuntimeException('Missing JSON file: ' . $path);
  }
  $data = json_decode(file_get_contents($path), true);
  if (!is_array($data)) {
    throw new RuntimeException('Invalid JSON in: ' . $path);
  }
  return $data;
}

function lang_labels() {
  return [
    'en' => 'English (UK)',
    'nl' => 'Nederlands',
    'no' => 'Norwegian',
    'es' => 'Espa&ntilde;ol',
    'hu' => 'Magyar',
  ];
}

function lang_label($code) {
  $labels = lang_labels();
  return $labels[$code] ?? strtoupper($code);
}

function lang_pref($key, array $allowed, $default) {
  $value = $_GET[$key] ?? $_COOKIE['readalong-' . $key] ?? $default;
  return in_array($value, $allowed, true) ? $value : $default;
}

function level_tiers() {
  return ['beginner', 'intermediate', 'advanced'];
}

function level_tier_labels() {
  return [
    'beginner' => 'Beginner',
    'intermediate' => 'Intermediate',
    'advanced' => 'Advanced',
  ];
}

function level_tier_label($tier) {
  $labels = level_tier_labels();
  return $labels[$tier] ?? ucfirst($tier);
}

function level_score($code) {
  static $scores = ['A1' => 1, 'A2' => 2, 'B1' => 3, 'B2' => 4, 'C1' => 5, 'C2' => 6];
  $code = strtoupper(trim($code));
  return $scores[$code] ?? null;
}

function level_valid($level) {
  if (!is_string($level) || $level === '') {
    return false;
  }
  if (preg_match('/^(A[12]|B[12]|C[12])-(A[12]|B[12]|C[12])$/', $level, $m)) {
    return level_score($m[1]) !== null && level_score($m[2]) !== null;
  }
  return level_score($level) !== null;
}

function level_average_score($level) {
  if (!level_valid($level)) {
    return null;
  }
  if (strpos($level, '-') !== false) {
    [$low, $high] = explode('-', $level, 2);
    return (level_score($low) + level_score($high)) / 2;
  }
  return (float) level_score($level);
}

function level_tier($level) {
  $score = level_average_score($level);
  if ($score === null) {
    return null;
  }
  if ($score <= 2.5) {
    return 'beginner';
  }
  if ($score <= 4.5) {
    return 'intermediate';
  }
  return 'advanced';
}

function level_label($level) {
  $tier = level_tier($level);
  return $tier ? level_tier_label($tier) : null;
}

function story_attribution(array $meta) {
  if (!empty($meta['attribution'])) {
    return $meta['attribution'];
  }
  if (empty($meta['source'])) {
    return null;
  }
  $source = $meta['source'];
  $attribution = [];
  if (!empty($source['title'])) {
    $attribution['title'] = $source['title'];
  }
  if (!empty($source['url'])) {
    $attribution['url'] = $source['url'];
  }
  return $attribution ?: null;
}
