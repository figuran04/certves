<script>
	import { onMount } from 'svelte';
	import { mount, unmount } from 'svelte';
	import ConfirmDialogInner from './ConfirmDialogInner.svelte';

	let {
		open = false,
		title = 'Are you sure?',
		message = '',
		confirmLabel = 'Delete',
		cancelLabel = 'Cancel',
		onConfirm = () => {},
		onCancel = () => {}
	} = $props();

	let container = $state(null);
	let dialog = null;

	onMount(() => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		container = el;
		return () => {
			if (dialog) unmount(dialog);
			el.remove();
		};
	});

	$effect(() => {
		if (!container || dialog) return;
		if (open) {
			dialog = mount(ConfirmDialogInner, {
				target: container,
				props: {
					title,
					message,
					confirmLabel,
					cancelLabel,
					onConfirm,
					onCancel
				}
			});
		}
	});

	$effect(() => {
		if (container && dialog && !open) {
			unmount(dialog);
			dialog = null;
		}
	});
</script>