<?php

require_once __DIR__ . '/helpers.php';

function voice_label(array $voice) {
  $label = $voice['name'];
  if (!empty($voice['dialect'])) {
    $label .= ' (' . $voice['dialect'] . ')';
  }
  return $label;
}

function story_voice_by_id(array $voices, $id) {
  foreach ($voices as $voice) {
    if ($voice['id'] === $id) {
      return $voice;
    }
  }
  return null;
}

function story_flatten_blocks(array $text, array $translation) {
  $sentences = [];
  $index = 0;

  foreach ($text['blocks'] as $block) {
    foreach ($block['sentences'] as $sentence) {
      if (!array_key_exists($index, $translation['sentences'])) {
        throw new RuntimeException('Translation missing sentence index ' . $index);
      }
      $sentences[] = [
        'index' => $index,
        'text' => $sentence,
        'translation' => $translation['sentences'][$index],
        'speaker' => $block['speaker'] ?? null,
      ];
      $index++;
    }
  }

  return $sentences;
}

function story_validate(array $meta, array $sentences) {
  $count = count($sentences);

  foreach ($meta['voices'] as $voice) {
    if (count($voice['timestamps']) !== $count) {
      throw new RuntimeException(
        'Voice "' . $voice['id'] . '" has ' . count($voice['timestamps']) .
        ' timestamps but story has ' . $count . ' sentences'
      );
    }
  }
}

function story_load($storyDir, $translationLang = 'en', $voiceId = null) {
  $meta = read_json($storyDir . '/story.json');
  $language = $meta['language'];
  $translation = read_json($storyDir . '/translations/' . $translationLang . '.json');

  $defaultVoice = $meta['voices'][0];
  $activeVoiceId = $voiceId ?? $defaultVoice['id'];
  $activeVoice = story_voice_by_id($meta['voices'], $activeVoiceId);
  if ($activeVoice === null) {
    $activeVoice = $defaultVoice;
    $activeVoiceId = $defaultVoice['id'];
  }

  $textKey = $activeVoice['text'] ?? $language;
  $text = read_json($storyDir . '/text/' . $textKey . '.json');
  $sentences = story_flatten_blocks($text, $translation);
  story_validate($meta, $sentences);

  $voices = [];
  foreach ($meta['voices'] as $voice) {
    $voices[] = [
      'value' => $voice['id'],
      'label' => voice_label($voice),
      'duration' => format_duration($voice['duration']),
    ];
  }

  $story = [
    'title' => $translation['title'],
    'heading' => $text['heading'],
    'storyID' => $meta['id'],
    'languageCode' => $meta['language'],
    'storyType' => $meta['type'],
    'duration' => format_duration($activeVoice['duration']),
    'voices' => $voices,
    'attribution' => story_attribution($meta),
  ];

  $voiceConfig = [];
  foreach ($meta['voices'] as $voice) {
    $voiceConfig[$voice['id']] = [
      'timestamps' => $voice['timestamps'],
      'text' => $voice['text'] ?? $language,
    ];
  }

  $storyConfig = [
    'id' => $meta['id'],
    'slug' => basename($storyDir),
    'type' => $meta['type'],
    'audioBase' => null,
    'voice' => $activeVoiceId,
    'voices' => $voiceConfig,
  ];

  return compact(
    'meta',
    'text',
    'translation',
    'sentences',
    'activeVoiceId',
    'activeVoice',
    'story',
    'storyConfig'
  );
}

function story_published_dirs($storiesDir) {
  $dirs = [];

  foreach (glob($storiesDir . '/*/story.json') as $storyJsonPath) {
    $meta = read_json($storyJsonPath);
    if (!empty($meta['published'])) {
      $dirs[] = dirname($storyJsonPath);
    }
  }

  return $dirs;
}

function story_source_languages($storiesDir) {
  $languages = array_fill_keys(configured_languages(), true);

  foreach (story_published_dirs($storiesDir) as $storyDir) {
    $meta = read_json($storyDir . '/story.json');
    $languages[$meta['language']] = true;
  }

  $codes = array_keys($languages);
  sort($codes);
  return $codes;
}

function story_translation_languages($storiesDir) {
  $languages = array_fill_keys(configured_languages(), true);

  foreach (story_published_dirs($storiesDir) as $storyDir) {
    foreach (glob($storyDir . '/translations/*.json') as $translationPath) {
      $languages[pathinfo($translationPath, PATHINFO_FILENAME)] = true;
    }
  }

  $codes = array_keys($languages);
  sort($codes);
  return $codes;
}

function story_level_tiers($storiesDir) {
  $tiers = [];

  foreach (story_published_dirs($storiesDir) as $storyDir) {
    $meta = read_json($storyDir . '/story.json');
    if (empty($meta['level'])) {
      continue;
    }
    $tier = level_tier($meta['level']);
    if ($tier !== null) {
      $tiers[$tier] = true;
    }
  }

  $codes = array_values(array_filter(level_tiers(), function ($tier) use ($tiers) {
    return !empty($tiers[$tier]);
  }));
  return $codes;
}

function story_list($storiesDir, $translationLang = 'en', $readAlongLang = null, $levelTier = null) {
  $stories = [];

  foreach (glob($storiesDir . '/*/story.json') as $storyJsonPath) {
    $storyDir = dirname($storyJsonPath);
    $meta = read_json($storyJsonPath);

    if (empty($meta['published'])) {
      continue;
    }

    if ($readAlongLang !== null && $meta['language'] !== $readAlongLang) {
      continue;
    }

    if ($levelTier !== null && $levelTier !== '') {
      if (empty($meta['level']) || level_tier($meta['level']) !== $levelTier) {
        continue;
      }
    }

    $translationPath = $storyDir . '/translations/' . $translationLang . '.json';
    if (!is_readable($translationPath)) {
      continue;
    }
    $translation = read_json($translationPath);
    $defaultVoice = $meta['voices'][0];

    $kind = $meta['kind'] ?? null;
    $stories[] = [
      'id' => $meta['id'],
      'slug' => basename($storyDir),
      'order' => $meta['order'] ?? 0,
      'title' => $translation['title'],
      'duration' => format_duration($defaultVoice['duration']),
      'durationSeconds' => (int) $defaultVoice['duration'],
      'level' => $meta['level'] ?? null,
      'levelLabel' => !empty($meta['level']) ? level_label($meta['level']) : null,
      'kind' => $kind,
      'kindLabel' => story_kind_label($kind),
    ];
  }

  usort($stories, function ($a, $b) {
    $order = $a['order'] <=> $b['order'];
    if ($order !== 0) {
      return $order;
    }
    return strcmp($a['slug'] ?? $a['id'], $b['slug'] ?? $b['id']);
  });

  if ($readAlongLang !== null) {
    $stories = array_merge($stories, dummy_stories($readAlongLang));
  }

  return $stories;
}

function story_render($storyDir, $base, $translationLang = 'en') {
  $voiceId = $_GET['voice'] ?? null;
  extract(story_load($storyDir, $translationLang, $voiceId));

  $storyConfig['audioBase'] = $base . 'audio/' . $meta['id'] . '/' . $meta['language'] . '/';

  $partials = __DIR__ . '/partials';
  include __DIR__ . '/story-shell.php';
}

function story_search_text($title) {
  if (function_exists('mb_strtolower')) {
    return mb_strtolower((string) $title, 'UTF-8');
  }
  return strtolower((string) $title);
}

function story_item_meta(array $item) {
  $parts = [];
  if (!empty($item['duration']) && $item['duration'] !== '&mdash;') {
    $parts[] = $item['duration'];
  }
  if (!empty($item['kindLabel'])) {
    $parts[] = $item['kindLabel'];
  }
  if (!empty($item['dummy'])) {
    $parts[] = t('home.placeholder');
  } elseif (!empty($item['levelLabel'])) {
    $parts[] = $item['levelLabel'];
  }
  return implode(' · ', $parts);
}

function story_list_item(array $item) {
  $classes = [];
  if (!empty($item['dummy'])) {
    $classes[] = 'dummy-story';
  }

  $attrs = ' data-id="' . e($item['id']) . '"';
  $attrs .= ' data-kind="' . e($item['kind'] ?? '') . '"';
  $attrs .= ' data-duration-seconds="' . e((string) ($item['durationSeconds'] ?? '')) . '"';
  $attrs .= ' data-title="' . e(story_search_text($item['title'])) . '"';
  if (!empty($item['slug'])) {
    $attrs .= ' data-slug="' . e($item['slug']) . '"';
  }
  if (!empty($item['hidden'])) {
    $attrs .= ' hidden';
  }

  $classAttr = $classes ? ' class="' . e(implode(' ', $classes)) . '"' : '';
  $meta = story_item_meta($item);

  $html = "\t\t\t<li" . $classAttr . $attrs . ">\n";
  if (!empty($item['dummy'])) {
    $html .= "\t\t\t\t<span class=dummy-story-item aria-disabled=true>\n";
    $html .= "\t\t\t\t\t<p>" . e($item['title']) . "</p>\n";
    $html .= "\t\t\t\t\t<small>" . e($meta) . "</small>\n";
    $html .= "\t\t\t\t</span>\n";
  } else {
    $html .= "\t\t\t\t<a href=\"stories/" . e($item['slug']) . "/\">\n";
    $html .= "\t\t\t\t\t<p>" . e($item['title']) . "</p>\n";
    $html .= "\t\t\t\t\t<small>" . e($meta) . "</small>\n";
    $html .= "\t\t\t\t</a>\n";
  }
  $html .= "\t\t\t</li>\n";
  return $html;
}

function render_story_list(array $items, $extraAttrs = '') {
  echo "\t\t<ul class=list" . ($extraAttrs !== '' ? ' ' . $extraAttrs : '') . ">\n";
  foreach ($items as $item) {
    echo story_list_item($item);
  }
  echo "\t\t</ul>\n";
}
