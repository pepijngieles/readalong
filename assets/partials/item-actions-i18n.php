	<script type="text/javascript">
		window.ITEM_ACTIONS_I18N = <?= json_encode([
			'favorite' => t('item.favorite'),
			'unfavorite' => t('item.unfavorite'),
			'mark_complete' => t('item.mark_complete'),
			'mark_read' => t('item.mark_read'),
			'mark_listened' => t('item.mark_listened'),
			'hide' => t('item.hide'),
			'unhide' => t('item.unhide'),
			'reset_progress' => t('item.reset_progress'),
			'share' => t('item.share'),
			'share_copied' => t('item.share_copied'),
			'snackbar_hidden' => t('item.snackbar.hidden'),
			'snackbar_completed' => t('item.snackbar.completed'),
		], JSON_UNESCAPED_UNICODE) ?>;
		window.ITEM_MENU_ICONS = <?= json_encode([
			'heart' => icon_html('heart', ['size' => 16]),
			'heart-filled' => icon_html('heart-filled', ['size' => 16]),
			'circle-check' => icon_html('circle-check', ['size' => 16]),
			'eye-off' => icon_html('eye-off', ['size' => 16]),
			'eye' => icon_html('eye', ['size' => 16]),
			'share' => icon_html('share', ['size' => 16]),
			'rotate-ccw' => icon_html('rotate-ccw', ['size' => 16]),
		], JSON_UNESCAPED_UNICODE) ?>;
	</script>
