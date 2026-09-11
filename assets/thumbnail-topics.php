<?php

function thumbnail_topic_map() {
  return [
    'history' => ['family' => 'history', 'icon' => 'Hourglass'],
    'archaeology' => ['family' => 'history', 'icon' => 'Shovel'],
    'religion' => ['family' => 'history', 'icon' => 'Church'],
    'biography' => ['family' => 'history', 'icon' => 'IdentificationCard'],

    'science' => ['family' => 'science', 'icon' => 'Flask'],
    'technology' => ['family' => 'science', 'icon' => 'Cpu'],
    'space' => ['family' => 'science', 'icon' => 'Rocket'],
    'mathematics' => ['family' => 'science', 'icon' => 'MathOperations'],

    'nature' => ['family' => 'nature', 'icon' => 'Plant'],
    'climate' => ['family' => 'nature', 'icon' => 'CloudSun'],
    'animals' => ['family' => 'nature', 'icon' => 'PawPrint'],
    'travel' => ['family' => 'nature', 'icon' => 'MapTrifold'],

    'world' => ['family' => 'society', 'icon' => 'Globe'],
    'politics' => ['family' => 'society', 'icon' => 'Flag'],
    'economy' => ['family' => 'society', 'icon' => 'ChartLine'],
    'cities' => ['family' => 'society', 'icon' => 'Buildings'],

    'health' => ['family' => 'life', 'icon' => 'Heartbeat'],
    'work' => ['family' => 'life', 'icon' => 'Briefcase'],
    'relationships' => ['family' => 'life', 'icon' => 'UsersThree'],
    'food' => ['family' => 'life', 'icon' => 'ForkKnife'],

    'fiction' => ['family' => 'arts', 'icon' => 'BookOpenText'],
    'literature' => ['family' => 'arts', 'icon' => 'Feather'],
    'music' => ['family' => 'arts', 'icon' => 'MusicNotes'],
    'film' => ['family' => 'arts', 'icon' => 'FilmSlate'],
  ];
}

function thumbnail_topic_aliases() {
  return [
    'news' => 'world',
    'law' => 'politics',
    'psychology' => 'health',
    'math' => 'mathematics',
    'maths' => 'mathematics',
    'urban' => 'cities',
    'city' => 'cities',
    'wildlife' => 'animals',
  ];
}

function thumbnail_family_fallbacks() {
  return [
    'history' => 'Hourglass',
    'science' => 'Flask',
    'nature' => 'Plant',
    'society' => 'Globe',
    'life' => 'Heart',
    'arts' => 'Palette',
  ];
}

function thumbnail_content_type_badges() {
  return [
    'podcast' => 'Microphone',
    'book' => 'BookBookmark',
    'news' => 'Newspaper',
    'email' => 'EnvelopeSimple',
  ];
}

function thumbnail_families() {
  return ['history', 'science', 'nature', 'society', 'life', 'arts'];
}

function thumbnail_normalize_slug($topic) {
  if ($topic === null || is_bool($topic)) {
    return '';
  }
  if (!is_scalar($topic)) {
    return '';
  }
  $slug = strtolower(trim((string) $topic));
  $slug = str_replace('_', '-', $slug);
  $slug = preg_replace('/[^a-z0-9-]+/', '-', $slug);
  $slug = trim($slug, '-');
  return $slug;
}

function resolve_topic($topic) {
  $slug = thumbnail_normalize_slug($topic);
  $aliases = thumbnail_topic_aliases();
  if ($slug !== '' && isset($aliases[$slug])) {
    $slug = $aliases[$slug];
  }

  $map = thumbnail_topic_map();
  if ($slug !== '' && isset($map[$slug])) {
    return $map[$slug];
  }

  $fallbacks = thumbnail_family_fallbacks();
  if ($slug !== '' && isset($fallbacks[$slug])) {
    return [
      'family' => $slug,
      'icon' => $fallbacks[$slug],
    ];
  }

  return [
    'family' => 'fallback',
    'icon' => 'BookOpen',
  ];
}

function resolve_content_type_badge($contentType) {
  $slug = thumbnail_normalize_slug($contentType);
  $badges = thumbnail_content_type_badges();
  if (isset($badges[$slug])) {
    return $badges[$slug];
  }
  return 'BookOpen';
}

function thumbnail_topics_for_family($family) {
  $topics = [];
  foreach (thumbnail_topic_map() as $slug => $entry) {
    if ($entry['family'] === $family) {
      $topics[$slug] = $entry;
    }
  }
  return $topics;
}
