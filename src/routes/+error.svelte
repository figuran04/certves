<script>
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';

	let { error } = $props();

	const status = $derived(page.status);
	const message = $derived(error?.message && import.meta.env.DEV ? error.message : '');
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<title>{status} - certves</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
	<div class="w-16 h-16 rounded-2xl bg-panel-hi border border-line grid place-items-center mb-6">
		<span class="font-mono text-xl font-semibold text-grad">{status}</span>
	</div>
	<h1 class="text-lg font-semibold text-ink">Something went wrong</h1>
	{#if message}
		<p class="text-sm text-soft mt-2 max-w-sm font-mono">{message}</p>
	{:else}
		<p class="text-sm text-soft mt-1 max-w-sm">
			Halaman tidak bisa dimuat saat ini. Silakan coba lagi.
		</p>
	{/if}
	<a href="/" class="btn btn-accent mt-7">Back to home</a>
</div>