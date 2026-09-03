<?php
$story = [
  'title'        => "What's your favorite food?",
  'heading'      => 'Wat is je lievelingseten?',
  'storyID'      => 'favorite_food',
  'languageCode' => 'nl',
  'storyType'    => 'dialogue',
  'duration'     => '01:04',
  'voices'       => [
    ['value' => 'annelinn-and-pepijn', 'label' => 'Pepijn & AnneLinn'],
  ],
];
$base = '../../';
$content = __DIR__ . '/content.php';
$storyData = __DIR__ . '/story-data.php';
include __DIR__ . '/../../assets/story-shell.php';
