<?php
// The built-in PHP server ignores Range requests, so the browser marks the
// audio as unseekable and every currentTime change is dropped. Serve audio
// here with byte ranges, like Apache does in production
function serve_audio($path) {
  if (!is_file($path)) {
    http_response_code(404);
    return;
  }

  $size = filesize($path);
  $start = 0;
  $end = $size - 1;
  $range = $_SERVER['HTTP_RANGE'] ?? '';

  if ($range !== '') {
    if (!preg_match('#^bytes=(\d*)-(\d*)$#', $range, $r) || $r[1] . $r[2] === '') {
      header('Content-Range: bytes */' . $size);
      http_response_code(416);
      return;
    }
    if ($r[1] === '') {
      $start = max(0, $size - (int) $r[2]);
    } else {
      $start = (int) $r[1];
      if ($r[2] !== '') $end = min($end, (int) $r[2]);
    }
    if ($start > $end) {
      header('Content-Range: bytes */' . $size);
      http_response_code(416);
      return;
    }
    http_response_code(206);
    header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
  }

  header('Content-Type: audio/mpeg');
  header('Accept-Ranges: bytes');
  header('Content-Length: ' . ($end - $start + 1));

  $handle = fopen($path, 'rb');
  fseek($handle, $start);
  $remaining = $end - $start + 1;

  while ($remaining > 0 && !feof($handle)) {
    $chunk = fread($handle, (int) min(65536, $remaining));
    if ($chunk === false || $chunk === '') break;
    echo $chunk;
    flush();
    $remaining -= strlen($chunk);
  }

  fclose($handle);
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (preg_match('#^/stories/([a-z0-9-]+)/?$#', $uri, $m)) {
  $_GET['slug'] = $m[1];
  require __DIR__ . '/stories/view.php';
  return true;
}

if (preg_match('#^/audio/[a-z0-9/_-]+\.mp3$#', $uri)) {
  serve_audio(__DIR__ . $uri);
  return true;
}

return false;
