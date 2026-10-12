<script>
	import { onMount } from 'svelte';

	let { title, message, confirmLabel, cancelLabel, onConfirm, onCancel } = $props();

	onMount(() => {
		const onKey = (e) => {
			if (e.key === 'Escape') onCancel();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});
</script>

<div class="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
	<div
		class="absolute inset-0 bg-black/40 backdrop-blur-sm fade-in"
		role="button"
		tabindex="-1"
		aria-label="Close dialog"
		onclick={onCancel}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onCancel();
			}
		}}
	></div>
	<div class="relative card shadow-l2 p-5 w-full max-w-sm fade-in">
		<h2 class="text-[15px] font-semibold text-ink">{title}</h2>
		{#if message}
			<p class="mt-2 text-sm text-soft leading-relaxed">{message}</p>
		{/if}
		<div class="mt-5 flex justify-end gap-2">
			<button type="button" class="btn btn-ghost" onclick={onCancel}>{cancelLabel}</button>
			<button type="button" class="btn btn-danger" onclick={onConfirm}>{confirmLabel}</button>
		</div>
	</div>
</div>