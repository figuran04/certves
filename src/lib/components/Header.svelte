<script>
	import { ArrowLeft, Award } from 'lucide-svelte';

	let { children = null } = $props();
</script>

<header class="cv-header flex items-center gap-3 px-3 sm:px-5">
	<div class="flex items-center gap-2 sm:gap-3 shrink-0">
		<a
			href="/"
			class="w-8 h-8 grid place-items-center rounded-lg text-soft hover:text-ink border border-black/10 hover:border-black/25 hover:bg-black/5 transition-colors"
			aria-label="Back to dashboard"
			title="Back to dashboard"
		><ArrowLeft size={16} /></a>
		<span class="shrink-0 hidden sm:grid place-items-center text-accent"><Award size={24} strokeWidth={2.2} /></span>
	</div>

	{#if children}
		<div class="flex items-center flex-1 min-w-0">
			{@render children()}
		</div>
	{/if}
</header>