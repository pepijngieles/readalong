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
    'source' => $meta['source'] ?? null,
  ];

  $voiceConfig = [];
  foreach ($meta['voices'] as $voice) {
    $voiceConfig[$voice['id']] = [
      'timestamps' => $voice['timestamps'],
      'text' => $voice['text'] ?? $language,
    ];
  }

  $storyConfig = [
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
  $languages = [];

  foreach (story_published_dirs($storiesDir) as $storyDir) {
    $meta = read_json($storyDir . '/story.json');
    $languages[$meta['language']] = true;
  }

  $codes = array_keys($languages);
  sort($codes);
  return $codes;
}

function story_translation_languages($storiesDir) {
  $languages = [];

  foreach (story_published_dirs($storiesDir) as $storyDir) {
    foreach (glob($storyDir . '/translations/*.json') as $translationPath) {
      $languages[pathinfo($translationPath, PATHINFO_FILENAME)] = true;
    }
  }

  $codes = array_keys($languages);
  sort($codes);
  return $codes;
}

function story_list($storiesDir, $translationLang = 'en', $readAlongLang = null) {
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

    $translationPath = $storyDir . '/translations/' . $translationLang . '.json';
    if (!is_readable($translationPath)) {
      continue;
    }
    $translation = read_json($translationPath);
    $defaultVoice = $meta['voices'][0];

    $stories[] = [
      'id' => $meta['id'],
      'slug' => basename($storyDir),
      'order' => $meta['order'] ?? 0,
      'title' => $translation['title'],
      'duration' => format_duration($defaultVoice['duration']),
    ];
  }

  usort($stories, function ($a, $b) {
    return ($a['order'] <=> $b['order']) ?: strcmp($a['slug'], $b['slug']);
  });

  return $stories;
}

function story_render($storyDir, $base, $translationLang = 'en') {
  $voiceId = $_GET['voice'] ?? null;
  extract(story_load($storyDir, $translationLang, $voiceId));

  $storyConfig['audioBase'] = $base . 'audio/' . $meta['id'] . '/' . $meta['language'] . '/';

  $partials = __DIR__ . '/partials';
  include __DIR__ . '/story-shell.php';
}
