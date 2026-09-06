<?php
$prevSpeaker = null;
$sentenceIndex = 0;

foreach ($text['blocks'] as $block) {
  $speaker = $block['speaker'] ?? null;
  $nameAttr = ($speaker && $speaker !== $prevSpeaker) ? ' data-name=' . e($speaker) : '';
  echo "\t\t\t<p" . $nameAttr . ">\n";

  $parts = [];
  foreach ($block['sentences'] as $sentence) {
    $translationText = $translation['sentences'][$sentenceIndex];
    $parts[] = '<span tabindex=0 data-sentence=' . $sentenceIndex . ' data-translation="' . e($translationText) . '">' . e($sentence) . '</span>';
    $sentenceIndex++;
  }
  echo "\t\t\t\t" . implode(' ', $parts) . "\n";
  echo "\t\t\t</p>\n";

  if ($speaker) {
    $prevSpeaker = $speaker;
  }
}
