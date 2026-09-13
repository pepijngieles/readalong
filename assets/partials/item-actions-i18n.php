	<script type="text/javascript">
		window.ITEM_ACTIONS_I18N = <?= json_encode([
			'favorite' => t('item.favorite'),
			'unfavorite' => t('item.unfavorite'),
			'mark_complete' => t('item.mark_complete'),
			'mark_read' => t('item.mark_read'),
			'mark_listened' => t('item.mark_listened'),
			'mark_incomplete' => t('item.mark_incomplete'),
			'hide' => t('item.hide'),
			'unhide' => t('item.unhide'),
			'reset_progress' => t('item.reset_progress'),
			'dismiss_continue' => t('item.dismiss_continue'),
			'share' => t('item.share'),
			'share_copied' => t('item.share_copied'),
			'snackbar_hidden' => t('item.snackbar.hidden'),
			'snackbar_completed' => t('item.snackbar.completed'),
		], JSON_UNESCAPED_UNICODE) ?>;
	</script>
