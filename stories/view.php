<?php
require __DIR__ . '/../assets/story.php';

$slug = $_GET['slug'] ?? '';
if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
  http_response_code(404);
  exit('Story not found');
}

$storyDir = __DIR__ . '/' . $slug;
if (!is_readable($storyDir . '/story.json')) {
  http_response_code(404);
  exit('Story not found');
}

$meta = read_json($storyDir . '/story.json');
if ($meta['id'] !== $slug) {
  http_response_code(404);
  exit('Story not found');
}

$translationLangOptions = story_translation_languages(__DIR__);
$translationLangsSelected = lang_prefs_list('translate', $translationLangOptions, [ui_locale()]);
[, $translationLang] = story_pick_translation($storyDir, $translationLangsSelected, $meta['language']);
if ($translationLang === null) {
  http_response_code(404);
  exit('Story not found');
}

story_render($storyDir, '../../', $translationLang);
