<?php
$story = [
  'title'        => "What's your favorite food?",
  'heading'      => 'Wat is je lievelingseten?',
  'storyID'      => 'favorite_food',
  'languageCode' => 'nl',
  'storyType'    => 'dialogue',
  'duration'     => '01:04',
  'voices'       => [
    ['value' => 'annelinn-and-pepijn', 'label' => 'Pepijn & AnneLinn', 'default' => true],
  ],
  'timestamps'   => [
    'annelinn-and-pepijn' => [0, 2.1, 3.5, 5.9, 10.2, 12.9, 15.0, 18.5, 22.6, 24.8, 26.9, 30.4, 36.0, 38.6, 43.1, 45.8, 49.7, 53.0, 58.1],
  ],
];
$base = '../../';
$content = __DIR__ . '/content.php';
include __DIR__ . '/../../assets/story-shell.php';
