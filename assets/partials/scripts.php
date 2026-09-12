	<script type="text/javascript">
		window.COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
		window.LANG_ENDONYMS = <?= json_encode(lang_endonyms(), JSON_UNESCAPED_UNICODE) ?>;
		window.setLangPref = function (key, value) {
			localStorage.setItem('readalong-' + key, value);
			document.cookie = 'readalong-' + key + '=' + value + '; path=/; max-age=' + window.COOKIE_MAX_AGE + '; SameSite=Lax';
		};
	</script>
	<script type="text/javascript" src="<?= e($base) ?>assets/brio/brio.js?v=1" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/settings.js?v=4" defer></script>
	<script type="text/javascript" src="<?= e($base) ?>assets/scripts.js?v=24" defer></script>
