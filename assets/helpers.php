<?php

function e($value) {
  return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function defaultVoice($voices) {
  foreach ($voices as $voice) {
    if (!empty($voice['default'])) return $voice['value'];
  }
  return $voices[0]['value'] ?? '';
}

function voiceOptions($voices) {
  $html = '';
  foreach ($voices as $voice) {
    $selected = !empty($voice['default']) ? ' selected' : '';
    $disabled = !empty($voice['disabled']) ? ' disabled' : '';
    $html .= '<option value="' . e($voice['value']) . '"' . $selected . $disabled . '>' . e($voice['label']) . '</option>';
  }
  return $html;
}
