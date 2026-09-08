<script>
(function () {
  var theme = 'light';
  try {
    var stored = localStorage.getItem('readalong-settings');
    if (stored) theme = JSON.parse(stored).theme || 'light';
  } catch (e) {}
  if (theme !== 'light') document.body.classList.add('theme-' + theme);
  var colors = { light: '#ffffff', cream: '#fef5e5', dark: '#333333', black: '#000000' };
  var meta = document.querySelector('meta[name=theme-color]');
  if (meta && colors[theme]) meta.setAttribute('content', colors[theme]);
})();
</script>
