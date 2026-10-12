<script>
	import { ChevronLeft, ChevronRight, Users } from 'lucide-svelte';

	let {
		templates = [],
		participants = [],
		mapping = {},
		currentIndex = $bindable(0)
	} = $props();

	let participant = $derived(participants[currentIndex] ?? null);
	let containerEl = $state(null);
	let containerWidth = $state(600);

	$effect(() => {
		if (containerEl) {
			const obs = new ResizeObserver((entries) => {
				for (const entry of entries) {
					containerWidth = entry.contentRect.width;
				}
			});
			obs.observe(containerEl);
			return () => obs.disconnect();
		}
	});

	function getFieldValue(field) {
		if (!participant) return '';
		const col = mapping[field.key] ?? field.key;
		return participant[col] ?? participant[field.key] ?? '';
	}

	function prev() {
		if (currentIndex > 0) currentIndex--;
	}

	function next() {
		if (currentIndex < participants.length - 1) currentIndex++;
	}
</script>

<div class="space-y-4">
	{#if participants.length === 0}
		<div class="text-center py-16">
			<div class="w-12 h-12 bg-panel rounded-2xl flex items-center justify-center mx-auto mb-3 border border-line">
				<Users size={22} class="text-faint" />
			</div>
			<p class="text-sm text-soft">No participants to preview.</p>
			<p class="text-xs text-faint mt-1">Import data in the Data tab first.</p>
		</div>
	{:else}
		<div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
			<label for="preview-participant" class="text-xs font-medium text-soft shrink-0">Participant:</label>
			<select
				id="preview-participant"
				bind:value={currentIndex}
				class="input flex-1 !py-2"
			>
				{#each participants as p, i}
					<option value={i}>{p.nama ?? p.name ?? p.Nama ?? `Row ${i + 1}`}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center gap-2">
			<button onclick={prev} disabled={currentIndex === 0} class="btn btn-outline !px-3.5 !py-1.5 text-xs disabled:opacity-40">
				<ChevronLeft size={14} />
				Previous
			</button>
			<span class="text-xs text-soft font-mono flex-1 text-center">
				{currentIndex + 1} / {participants.length}
			</span>
			<button
				onclick={next}
				disabled={currentIndex >= participants.length - 1}
				class="btn btn-outline !px-3.5 !py-1.5 text-xs disabled:opacity-40"
			>
				Next
				<ChevronRight size={14} />
			</button>
		</div>

		<div bind:this={containerEl} class="space-y-5">
			{#each templates as t (t.id)}
				{@const fontScale = containerWidth / t.width}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<p class="text-[11px] font-medium tracking-widest uppercase text-faint">{t.name}</p>
						<span class="chip text-[9px]">{t.width} × {t.height}</span>
					</div>
					<div
						class="relative bg-white border border-line rounded-2xl overflow-hidden shadow-l2"
						style="aspect-ratio: {t.width} / {t.height};"
					>
						<img src={t.image} alt={t.name} class="absolute inset-0 w-full h-full object-contain" />
						{#each t.fields as field (field.id)}
							{@const col = mapping[field.key] ?? field.key}
							{@const val = participant[col] ?? participant[field.key] ?? ''}
							{@const rot = Number(field.rotation) || 0}
							<div
								class="absolute whitespace-nowrap pointer-events-none"
								style="
									left: {field.x}%;
									top: {field.y}%;
									transform: {(field.align === 'center' ? 'translateX(-50%) ' : field.align === 'right' ? 'translateX(-100%) ' : '') + `rotate(${rot}deg) scale(${field.flipX ? -1 : 1}, ${field.flipY ? -1 : 1})`};
									font-size: {(field.fontSize ?? 24) * fontScale}px;
									font-weight: {field.fontWeight};
									font-style: {field.italic ? 'italic' : 'normal'};
									text-transform: {field.uppercase ? 'uppercase' : 'none'};
									opacity: {field.opacity ?? 1};
									color: {field.color};
									font-family: {field.fontFamily}, sans-serif;
								"
							>
								{#if val}
									<span>{val}</span>
								{:else}
									<span class="text-black/50 font-mono text-[0.6em]">[{field.key}]</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>