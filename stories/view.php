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

$translationLangs = story_translation_languages(__DIR__);
$translationLang = lang_pref('translate', $translationLangs, 'en');

story_render($storyDir, '../../', $translationLang);
