<script>
	import { ArrowRight, RefreshCw, TableProperties } from 'lucide-svelte';

	let {
		templates = [],
		columns = [],
		participants = [],
		mapping = $bindable({}),
		onAutoMap = () => {}
	} = $props();

	let allFieldKeys = $derived(() => {
		const keys = [];
		for (const t of templates) {
			for (const f of t.fields) {
				if (!keys.includes(f.key)) keys.push(f.key);
			}
		}
		return keys;
	});
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<p class="section-label">Field Mapping</p>
		<button onclick={onAutoMap} class="btn btn-outline !px-3 !py-1 text-xs">
			<RefreshCw size={12} />
			Auto-map
		</button>
	</div>

	{#if templates.length === 0 || participants.length === 0}
		<div class="flex items-center gap-2.5 text-xs text-faint">
			<TableProperties size={15} />
			Add pages and participant data first.
		</div>
	{:else}
		<div class="space-y-2">
			{#each allFieldKeys() as key}
				<div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs">
					<span class="sm:w-36 truncate font-mono bg-panel-hi border border-line px-2.5 py-1 rounded-full text-accent-strong shrink-0">{key}</span>
					<ArrowRight size={14} class="text-faint flex-shrink-0 hidden sm:block" />
					<span class="text-faint sm:hidden text-[10px]">→</span>
					<select
						value={mapping[key] ?? ''}
						onchange={(e) => {
							mapping[key] = e.target.value;
						}}
						class="input flex-1 !py-1.5"
					>
						<option value="">-- Select column --</option>
						{#each columns as col}
							<option value={col}>{col}</option>
						{/each}
					</select>
				</div>
			{/each}
		</div>
	{/if}
</div>