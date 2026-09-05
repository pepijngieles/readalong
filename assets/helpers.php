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

function story_filter_kinds() {
  return ['podcast', 'news', 'book', 'email', 'weather'];
}

function story_kind_label($kind) {
  if (!$kind) {
    return null;
  }
  $key = 'home.kind.' . $kind;
  $label = t($key);
  return $label === $key ? null : $label;
}

function dummy_story_catalog() {
  return [
    [
      'kind' => 'weather',
      'duration' => 95,
      'titles' => [
        'de' => 'Wetterbericht für heute',
        'en' => 'Today’s weather report',
        'es' => 'El tiempo de hoy',
        'fr' => 'La météo du jour',
        'nl' => 'Weerbericht van vandaag',
        'no' => 'Værmeldingen for i dag',
      ],
    ],
    [
      'kind' => 'weather',
      'duration' => 210,
      'titles' => [
        'de' => 'Das Wetter am Wochenende',
        'en' => 'The weekend forecast',
        'es' => 'El tiempo del fin de semana',
        'fr' => 'La météo du week-end',
        'nl' => 'Het weekendweer',
        'no' => 'Helgeværet',
      ],
    ],
    [
      'kind' => 'weather',
      'duration' => 400,
      'titles' => [
        'de' => 'Der Wochenrückblick aufs Wetter',
        'en' => 'This week’s weather in review',
        'es' => 'El tiempo de la semana',
        'fr' => 'La semaine météo',
        'nl' => 'Het weer van deze week',
        'no' => 'Ukeværet',
      ],
    ],
    [
      'kind' => 'podcast',
      'duration' => 110,
      'titles' => [
        'de' => 'Guten Morgen, kurz erzählt',
        'en' => 'Morning notes',
        'es' => 'Notas de la mañana',
        'fr' => 'Notes du matin',
        'nl' => 'Ochtendnotities',
        'no' => 'Morgennotater',
      ],
    ],
    [
      'kind' => 'podcast',
      'duration' => 280,
      'titles' => [
        'de' => 'Im Gespräch über den Alltag',
        'en' => 'A chat about everyday life',
        'es' => 'Una charla sobre el día a día',
        'fr' => 'Une discussion sur le quotidien',
        'nl' => 'Een gesprek over alledag',
        'no' => 'En prat om hverdagen',
      ],
    ],
    [
      'kind' => 'podcast',
      'duration' => 520,
      'titles' => [
        'de' => 'Lange Folge: Reisen und Sprache',
        'en' => 'Long episode: travel and language',
        'es' => 'Episodio largo: viajes e idioma',
        'fr' => 'Épisode long : voyage et langue',
        'nl' => 'Lange aflevering: reizen en taal',
        'no' => 'Lang episode: reise og språk',
      ],
    ],
    [
      'kind' => 'news',
      'duration' => 100,
      'titles' => [
        'de' => 'Kurznachrichten am Morgen',
        'en' => 'Morning headlines',
        'es' => 'Titulares de la mañana',
        'fr' => 'Les titres du matin',
        'nl' => 'Ochtendnieuws',
        'no' => 'Morgennyheter',
      ],
    ],
    [
      'kind' => 'news',
      'duration' => 250,
      'titles' => [
        'de' => 'Nachrichten aus der Stadt',
        'en' => 'News from the city',
        'es' => 'Noticias de la ciudad',
        'fr' => 'Infos de la ville',
        'nl' => 'Nieuws uit de stad',
        'no' => 'Nyheter fra byen',
      ],
    ],
    [
      'kind' => 'news',
      'duration' => 390,
      'titles' => [
        'de' => 'Die Woche in Nachrichten',
        'en' => 'The week in news',
        'es' => 'La semana en noticias',
        'fr' => 'La semaine en infos',
        'nl' => 'De week in het nieuws',
        'no' => 'Uken i nyheter',
      ],
    ],
    [
      'kind' => 'book',
      'duration' => 180,
      'titles' => [
        'de' => 'Erstes Kapitel',
        'en' => 'Chapter one',
        'es' => 'Capítulo uno',
        'fr' => 'Premier chapitre',
        'nl' => 'Hoofdstuk één',
        'no' => 'Kapittel én',
      ],
    ],
    [
      'kind' => 'book',
      'duration' => 540,
      'titles' => [
        'de' => 'Ein Nachmittag in der Bibliothek',
        'en' => 'An afternoon in the library',
        'es' => 'Una tarde en la biblioteca',
        'fr' => 'Un après-midi à la bibliothèque',
        'nl' => 'Een middag in de bibliotheek',
        'no' => 'En ettermiddag på biblioteket',
      ],
    ],
    [
      'kind' => 'email',
      'duration' => 85,
      'titles' => [
        'de' => 'Eine kurze Terminmail',
        'en' => 'A short meeting email',
        'es' => 'Un correo breve de reunión',
        'fr' => 'Un court mail de réunion',
        'nl' => 'Een korte afspraakmail',
        'no' => 'En kort møte-e-post',
      ],
    ],
    [
      'kind' => 'email',
      'duration' => 240,
      'titles' => [
        'de' => 'Die Einladung zum Projekt',
        'en' => 'The project invitation',
        'es' => 'La invitación al proyecto',
        'fr' => 'L’invitation au projet',
        'nl' => 'De projectuitnodiging',
        'no' => 'Invitasjonen til prosjektet',
      ],
    ],
    [
      'kind' => 'email',
      'duration' => 410,
      'titles' => [
        'de' => 'Ein ausführlicher Kundenbrief',
        'en' => 'A detailed client email',
        'es' => 'Un correo detallado a un cliente',
        'fr' => 'Un mail détaillé à un client',
        'nl' => 'Een uitgebreide klantmail',
        'no' => 'En grundig kunde-e-post',
      ],
    ],
  ];
}

function dummy_stories($readAlongLang) {
  $stories = [];

  foreach (dummy_story_catalog() as $index => $entry) {
    $titles = $entry['titles'];
    $title = $titles[$readAlongLang] ?? $titles['en'];
    $kind = $entry['kind'];
    $seconds = (int) $entry['duration'];
    $stories[] = [
      'id' => 'dummy-' . ($index + 1),
      'slug' => null,
      'order' => 1000 + $index,
      'title' => $title,
      'duration' => format_duration($seconds),
      'durationSeconds' => $seconds,
      'level' => null,
      'levelLabel' => null,
      'kind' => $kind,
      'kindLabel' => story_kind_label($kind),
      'language' => $readAlongLang,
      'sentenceCount' => 0,
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
