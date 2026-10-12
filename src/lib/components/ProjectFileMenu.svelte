<script>
	import { ChevronDown, Download, Keyboard, MoreHorizontal, Upload } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { parsePreset } from '$lib/preset.js';

	let {
		projectName = 'project',
		saveStatus = 'idle',
		pageCount = 0,
		onExportProject = () => {},
		onImportProject = () => {},
		onShowShortcuts = () => {},
		onError = () => {}
	} = $props();

	let open = $state(false);
	let root;
	let importInput;

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

	const statusLabel = {
		idle: 'Ready',
		saving: 'Saving…',
		saved: 'Saved',
		error: 'Save failed'
	};

	async function handleImportFile(e) {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		try {
			const preset = parsePreset(await file.text());
			if (!preset) {
				onError('That file does not look like a valid project file.');
				return;
			}
			onImportProject(preset);
		} catch {
			onError('Could not read that project file.');
		}
	}
</script>

<div class="relative shrink-0" bind:this={root}>
	<button
		type="button"
		class="flex items-center justify-center gap-1 w-8 sm:w-auto sm:px-2.5 h-8 rounded-lg text-[13px] font-medium text-soft hover:text-ink hover:bg-black/5 transition-colors"
		title="Project file"
		aria-label="Project file"
		aria-haspopup="true"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		<MoreHorizontal size={16} class="sm:hidden" />
		<span class="hidden sm:inline-flex items-center gap-1">File <ChevronDown size={13} class="text-faint" /></span>
	</button>

	{#if open}
		<div class="absolute top-10 z-50 w-64 max-w-[calc(100vw-1.5rem)] card p-1.5 fade-in shadow-l2 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0" role="menu" aria-label="File menu">
			<div class="px-2.5 py-2 border-b border-line mb-1 overflow-hidden">
				<p class="text-xs font-semibold text-ink truncate">{projectName}</p>
				<p class="text-[11px] text-faint mt-0.5">
					{pageCount} page{pageCount !== 1 ? 's' : ''} · {statusLabel[saveStatus] || 'Ready'}
				</p>
			</div>
			<button
				type="button"
				role="menuitem"
				onclick={() => {
					open = false;
					onExportProject();
				}}
				class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-soft hover:text-ink hover:bg-black/5 text-left"
			>
				<Download size={13} /> Export to JSON
			</button>
			<button
				type="button"
				role="menuitem"
				onclick={(e) => {
					e.stopPropagation();
					open = false;
					importInput?.click();
				}}
				class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-soft hover:text-ink hover:bg-black/5 text-left"
			>
				<Upload size={13} /> Import from JSON
			</button>
			<button
				type="button"
				role="menuitem"
				onclick={() => {
					open = false;
					onShowShortcuts();
				}}
				class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-soft hover:text-ink hover:bg-black/5 text-left"
			>
				<Keyboard size={13} /> Keyboard shortcuts
			</button>
		</div>
	{/if}

	<input
		bind:this={importInput}
		type="file"
		accept=".json,application/json"
		onchange={handleImportFile}
		class="hidden"
	/>
</div>