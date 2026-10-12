<script>
	import { Zap } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import GenerateProgress from './GenerateProgress.svelte';

	let {
		templates = [],
		participants = [],
		mapping = {},
		onDone = () => {},
		onError = () => {}
	} = $props();

	let open = $state(false);
	let root;

	onMount(() => {
		const onDown = (e) => {
			if (open && root && !root.contains(e.target)) open = false;
		};
		const onKey = (e) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="relative shrink-0" bind:this={root}>
	<button
		class="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-accent text-accent-ink text-xs font-semibold rounded-lg hover:brightness-110 transition-[filter]"
		title="Generate certificates"
		aria-label="Generate certificates"
		aria-haspopup="true"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		<Zap size={14} strokeWidth={2.4} />
		<span class="hidden sm:inline">Generate</span>
	</button>

	{#if open}
		<div class="absolute right-0 top-10 z-50 w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto card card-hi p-3 fade-in shadow-l2">
			<GenerateProgress {templates} {participants} {mapping} {onDone} {onError} />
		</div>
	{/if}
</div>