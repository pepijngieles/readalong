<?php
$prevSpeaker = null;
$sentenceIndex = 0;
$hasSpeakers = !empty($text['speakers']);

foreach ($text['blocks'] as $block) {
  $speaker = $block['speaker'] ?? null;

  if ($hasSpeakers) {
    foreach ($block['sentences'] as $sentence) {
      $nameAttr = ($speaker && $speaker !== $prevSpeaker) ? ' data-name=' . e($speaker) : '';
      $translationText = $translation['sentences'][$sentenceIndex];
      echo "\t\t\t<p" . $nameAttr . ">\n";
      echo "\t\t\t\t<span tabindex=0 data-sentence=" . $sentenceIndex . ' data-translation="' . e($translationText) . '">' . e($sentence) . "</span>\n";
      echo "\t\t\t</p>\n";
      $sentenceIndex++;
      $prevSpeaker = $speaker;
    }
    continue;
  }

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
