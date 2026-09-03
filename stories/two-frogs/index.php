<?php
$story = [
  'title'        => 'The story of two frogs',
  'heading'      => 'Het verhaal van twee kikkers',
  'storyID'      => 'two_frogs',
  'languageCode' => 'nl',
  'storyType'    => 'default',
  'duration'     => '01:36',
  'voices'       => [
    ['value' => 'annelinn', 'label' => 'AnneLinn'],
    ['value' => 'pepijn', 'label' => 'Pepijn'],
  ],
];
$base = '../../';
$content = __DIR__ . '/content.php';
$storyData = __DIR__ . '/story-data.php';
include __DIR__ . '/../../assets/story-shell.php';
