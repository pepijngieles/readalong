<?php
$isDialogue = !empty($text['speakers']);
$speakerSides = [];

if ($isDialogue) {
  foreach ($text['speakers'] as $i => $speaker) {
    $speakerSides[$speaker] = ($i % 2 === 0) ? 'left' : 'right';
  }
  echo "\t\t\t<ul class=styled-list>\n";
}

$sentenceIndex = 0;
foreach ($text['blocks'] as $block) {
  if ($isDialogue) {
    $side = $speakerSides[$block['speaker']] ?? 'left';
    echo "\t\t\t\t<li class=" . $side . ">\n";
    echo "\t\t\t\t\t<p data-name=" . e($block['speaker']) . ">\n";
    foreach ($block['sentences'] as $sentence) {
      $translationText = $translation['sentences'][$sentenceIndex];
      echo "\t\t\t\t\t\t<span tabindex=0 data-sentence=" . $sentenceIndex . ' data-translation="' . e($translationText) . "\">\n";
      echo "\t\t\t\t\t\t\t" . e($sentence) . "\n";
      echo "\t\t\t\t\t\t</span>\n";
      $sentenceIndex++;
    }
    echo "\t\t\t\t\t</p>\n";
    echo "\t\t\t\t</li>\n";
  } else {
    echo "\t\t\t<p>\n";
    $parts = [];
    foreach ($block['sentences'] as $sentence) {
      $translationText = $translation['sentences'][$sentenceIndex];
      $parts[] = '<span tabindex=0 data-sentence=' . $sentenceIndex . ' data-translation="' . e($translationText) . '">' . e($sentence) . '</span>';
      $sentenceIndex++;
    }
    echo "\t\t\t\t" . implode(' ', $parts) . "\n";
    echo "\t\t\t</p>\n";
  }
}

if ($isDialogue) {
  echo "\t\t\t</ul>\n";
}
