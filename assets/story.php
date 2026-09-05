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

function story_translation_from_text(array $text) {
  $sentences = [];
  foreach ($text['blocks'] as $block) {
    foreach ($block['sentences'] as $sentence) {
      $sentences[] = $sentence;
    }
  }
  return [
    'title' => $text['heading'] ?? '',
    'sentences' => $sentences,
  ];
}

function story_read_translation($storyDir, $lang) {
  if (!$lang) {
    return null;
  }
  $path = $storyDir . '/translations/' . $lang . '.json';
  return is_readable($path) ? read_json($path) : null;
}

function story_resolve_translation($storyDir, $requestedLang, $sourceLang, ?array $text = null) {
  $direct = story_read_translation($storyDir, $requestedLang);
  if ($direct) {
    return $direct;
  }

  if ($text === null) {
    $textPath = $storyDir . '/text/' . $sourceLang . '.json';
    if (is_readable($textPath)) {
      $text = read_json($textPath);
    }
  }

  if ($requestedLang === $sourceLang && $text) {
    return story_translation_from_text($text);
  }

  foreach (array_unique(array_filter(['en', $sourceLang])) as $lang) {
    if ($lang === $requestedLang) {
      continue;
    }
    $found = story_read_translation($storyDir, $lang);
    if ($found) {
      return $found;
    }
  }

  foreach (glob($storyDir . '/translations/*.json') as $path) {
    return read_json($path);
  }

  return $text ? story_translation_from_text($text) : null;
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

  $defaultVoice = $meta['voices'][0];
  $activeVoiceId = $voiceId ?? $defaultVoice['id'];
  $activeVoice = story_voice_by_id($meta['voices'], $activeVoiceId);
  if ($activeVoice === null) {
    $activeVoice = $defaultVoice;
    $activeVoiceId = $defaultVoice['id'];
  }

  $textKey = $activeVoice['text'] ?? $language;
  $text = read_json($storyDir . '/text/' . $textKey . '.json');
  $translation = story_resolve_translation($storyDir, $translationLang, $language, $text);
  if ($translation === null) {
    throw new RuntimeException('No translation available for story in ' . $storyDir);
  }
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

    $translation = story_resolve_translation($storyDir, $translationLang, $meta['language']);
    if ($translation === null) {
      continue;
    }
    $defaultVoice = $meta['voices'][0];

    $kind = $meta['kind'] ?? null;
    $textKey = $defaultVoice['text'] ?? $meta['language'];
    $sourceTitle = $translation['title'];
    $textPath = $storyDir . '/text/' . $textKey . '.json';
    if (is_readable($textPath)) {
      $textData = read_json($textPath);
      if (!empty($textData['heading'])) {
        $sourceTitle = $textData['heading'];
      }
    }
    $stories[] = [
      'id' => $meta['id'],
      'slug' => basename($storyDir),
      'order' => $meta['order'] ?? 0,
      'title' => $translation['title'],
      'sourceTitle' => $sourceTitle,
      'duration' => format_duration($defaultVoice['duration']),
      'durationSeconds' => (int) $defaultVoice['duration'],
      'level' => $meta['level'] ?? null,
      'levelLabel' => !empty($meta['level']) ? level_label($meta['level']) : null,
      'kind' => $kind,
      'kindLabel' => story_kind_label($kind),
      'language' => $meta['language'],
      'sentenceCount' => count($defaultVoice['timestamps'] ?? []),
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
    $stories = array_merge($stories, dummy_stories($readAlongLang, $translationLang));
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

function story_search_text($text) {
  if (function_exists('mb_strtolower')) {
    return mb_strtolower((string) $text, 'UTF-8');
  }
  return strtolower((string) $text);
}

function story_item_meta(array $item) {
  $parts = [];
  if (!empty($item['duration']) && $item['duration'] !== '&mdash;') {
    $parts[] = $item['duration'];
  }
  if (!empty($item['kindLabel'])) {
    $parts[] = $item['kindLabel'];
  }
  return implode(' · ', $parts);
}

function story_list_item(array $item) {
  $isDummy = !empty($item['dummy']);
  $classes = [];
  if ($isDummy) {
    $classes[] = 'dummy-story';
  }

  $search = trim($item['title'] . ' ' . ($item['sourceTitle'] ?? '') . ' ' . ($item['kindLabel'] ?? ''));
  $attrs = ' data-id="' . e($item['id']) . '"';
  $attrs .= ' data-kind="' . e($item['kind'] ?? '') . '"';
  $attrs .= ' data-kind-label="' . e($item['kindLabel'] ?? '') . '"';
  $attrs .= ' data-duration-seconds="' . e((string) ($item['durationSeconds'] ?? '')) . '"';
  $attrs .= ' data-title="' . e(story_search_text($search)) . '"';
  $attrs .= ' data-level="' . e($item['level'] ?? '') . '"';
  $attrs .= ' data-sentence-count="' . e((string) ($item['sentenceCount'] ?? '')) . '"';
  $attrs .= ' data-language="' . e($item['language'] ?? '') . '"';
  if (!empty($item['slug'])) {
    $attrs .= ' data-slug="' . e($item['slug']) . '"';
  }
  if (!empty($item['hidden'])) {
    $attrs .= ' hidden';
  }

  $classAttr = $classes ? ' class="' . e(implode(' ', $classes)) . '"' : '';
  $meta = story_item_meta($item);
  $lang = $item['language'] ?? '';
  $langAttr = $lang !== '' ? ' lang="' . e($lang) . '"' : '';
  $title = '<p' . $langAttr . '>' . e($item['title']) . '</p>';
  $metaHtml = $meta !== '' ? '<small class=story-item__meta>' . e($meta) . '</small>' : '';
  $badge = $isDummy
    ? '<span class=story-item__badge>' . e(t('home.no_audio')) . '</span>'
    : (!empty($item['level']) ? '<span class=story-item__badge>' . e($item['level']) . '</span>' : '');

  $html = "\t\t\t<li" . $classAttr . $attrs . ">\n";
  if ($isDummy) {
    $html .= "\t\t\t\t<div class=\"story-item dummy-story-item\" aria-disabled=true>\n";
    $html .= "\t\t\t\t\t<div class=story-item__body>\n";
    $html .= "\t\t\t\t\t\t" . $title . "\n";
    if ($metaHtml) {
      $html .= "\t\t\t\t\t\t" . $metaHtml . "\n";
    }
    $html .= "\t\t\t\t\t</div>\n";
    $html .= "\t\t\t\t\t" . $badge . "\n";
    $html .= "\t\t\t\t</div>\n";
  } else {
    $html .= "\t\t\t\t<a class=story-item href=\"stories/" . e($item['slug']) . "/\">\n";
    $html .= "\t\t\t\t\t<div class=story-item__body>\n";
    $html .= "\t\t\t\t\t\t" . $title . "\n";
    if ($metaHtml) {
      $html .= "\t\t\t\t\t\t" . $metaHtml . "\n";
    }
    $html .= "\t\t\t\t\t\t<small class=story-item__remaining data-remaining hidden></small>\n";
    $html .= "\t\t\t\t\t\t<progress class=story-item__progress data-item-progress hidden value=0 max=100></progress>\n";
    $html .= "\t\t\t\t\t</div>\n";
    if ($badge) {
      $html .= "\t\t\t\t\t" . $badge . "\n";
    }
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
