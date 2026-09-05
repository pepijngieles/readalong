<?php

function e($value) {
  return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

require_once __DIR__ . '/icons.php';
require_once __DIR__ . '/i18n.php';

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

function configured_languages() {
  return ['de', 'en', 'es', 'fr', 'nl', 'no'];
}

function lang_endonyms() {
  return [
    'de' => 'Deutsch',
    'en' => 'English',
    'es' => 'Español',
    'fr' => 'Français',
    'nl' => 'Nederlands',
    'no' => 'Norsk',
  ];
}

function lang_endonym($code) {
  $endonyms = lang_endonyms();
  return $endonyms[$code] ?? strtoupper($code);
}

function languages_by_endonym() {
  $codes = configured_languages();
  usort($codes, function ($a, $b) {
    return strcasecmp(lang_endonym($a), lang_endonym($b));
  });
  return $codes;
}

function onboarding_demo_segments() {
  return [
    'de' => [
      'Als der Zug endlich in den Bahnhof einfuhr,',
      'hatte ich schon die Hälfte des Buches gelesen.',
    ],
    'en' => [
      'When the train finally pulled into the station,',
      'I had already read half the book.',
    ],
    'es' => [
      'Cuando el tren por fin llegó a la estación,',
      'ya había leído la mitad del libro.',
    ],
    'fr' => [
      'Quand le train est enfin entré en gare,',
      'j\'avais déjà lu la moitié du livre.',
    ],
    'nl' => [
      'Toen de trein eindelijk het station binnenreed,',
      'had ik al de helft van het boek gelezen.',
    ],
    'no' => [
      'Da toget endelig kjørte inn på stasjonen,',
      'hadde jeg allerede lest halve boka.',
    ],
  ];
}

function detect_browser_locale(array $allowed, $default = 'en') {
  $header = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
  if (preg_match_all('/\b([a-z]{2})(?:-[a-z]{2})?\b/i', $header, $matches)) {
    foreach ($matches[1] as $code) {
      $code = strtolower($code);
      if (in_array($code, $allowed, true)) {
        return $code;
      }
    }
  }
  return $default;
}

function ui_locale() {
  static $locale = null;
  if ($locale !== null) {
    return $locale;
  }

  $allowed = configured_languages();
  if (!empty($_COOKIE['readalong-translate']) && in_array($_COOKIE['readalong-translate'], $allowed, true)) {
    return $locale = $_COOKIE['readalong-translate'];
  }

  return $locale = detect_browser_locale($allowed);
}

function t($key, array $replacements = [], $locale = null) {
  $locale = $locale ?? ui_locale();
  $strings = ui_strings();
  $text = $strings[$locale][$key] ?? $strings['en'][$key] ?? $key;

  foreach ($replacements as $name => $value) {
    $text = str_replace('{' . $name . '}', $value, $text);
  }

  return $text;
}

function needs_onboarding() {
  if (!empty($_COOKIE['readalong-onboarding-complete'])) {
    return false;
  }
  if (!empty($_COOKIE['readalong-read'])) {
    return false;
  }
  return true;
}

function lang_labels() {
  $labels = [];
  foreach (configured_languages() as $code) {
    $labels[$code] = t('lang.' . $code);
  }
  $labels['hu'] = 'Magyar';
  return $labels;
}

function lang_label($code) {
  $labels = lang_labels();
  return $labels[$code] ?? strtoupper($code);
}

function lang_pref($key, array $allowed, $default) {
  $value = $_GET[$key] ?? $_COOKIE['readalong-' . $key] ?? $default;
  return in_array($value, $allowed, true) ? $value : $default;
}

function dummy_story_titles($lang) {
  $titles = [
    'de' => ['Morgen in Berlin', 'Die kleine Buchhandlung', 'Regen und Kaffee', 'Sommerabend am Wasser', 'Ein Spaziergang im Park'],
    'en' => ['Morning in London', 'The little bookshop', 'Rain and coffee', 'Summer evening by the water', 'A walk in the park'],
    'es' => ['Mañana en Madrid', 'La pequeña librería', 'Lluvia y café', 'Noche de verano junto al agua', 'Un paseo por el parque'],
    'fr' => ['Matin à Paris', 'La petite librairie', 'Pluie et café', 'Soir d\'été au bord de l\'eau', 'Une promenade au parc'],
    'nl' => ['Ochtend in Amsterdam', 'De kleine boekwinkel', 'Regen en kaffie', 'Zomeravond aan het water', 'Een wandeling in het park'],
    'no' => ['Morgen i Oslo', 'Den lille bokhandelen', 'Regn og kaffe', 'Sommerkveld ved vannet', 'En tur i parken'],
  ];

  return $titles[$lang] ?? $titles['en'];
}

function dummy_stories($readAlongLang) {
  $stories = [];

  foreach (dummy_story_titles($readAlongLang) as $index => $title) {
    $stories[] = [
      'id' => 'dummy-' . ($index + 1),
      'slug' => null,
      'order' => 1000 + $index,
      'title' => $title,
      'duration' => '&mdash;',
      'level' => null,
      'levelLabel' => null,
      'dummy' => true,
    ];
  }

  return $stories;
}

function level_tiers() {
  return ['beginner', 'intermediate', 'advanced'];
}

function level_tier_labels() {
  return [
    'beginner' => t('level.beginner'),
    'intermediate' => t('level.intermediate'),
    'advanced' => t('level.advanced'),
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
