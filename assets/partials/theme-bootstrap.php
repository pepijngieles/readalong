<script>
(function () {
  var theme = 'light';
  try {
    var stored = localStorage.getItem('readalong-settings');
    if (stored) theme = JSON.parse(stored).theme || 'light';
  } catch (e) {}
  if (theme !== 'light') document.body.classList.add('theme-' + theme);
  var meta = document.querySelector('meta[name=theme-color]');
  if (meta) {
    var color = getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-meta-' + theme + '-primary')
      .trim();
    if (color) meta.setAttribute('content', color);
  }
})();
</script>
