<script>
	import { ImagePlus, Plus, X } from 'lucide-svelte';
	import FieldEditor from './FieldEditor.svelte';
	import { readImageFile } from '$lib/services/image.js';

	let {
		template = null,
		fields = $bindable([]),
		activeFieldId = $bindable(null),
		onFieldAdd = () => {},
		onFieldRemove = () => {},
		onFieldUpdate = () => {},
		onImage = () => {},
		onCreatePage = () => {},
		onCopyFormat = () => {},
		onCopyField = () => {},
		onCutField = () => {},
		onPasteFormat = () => {},
		hasFormat = false,
		participantData = null,
		mapping = {},
		showFieldPanel = $bindable(false)
	} = $props();

	let canvasEl = $state(null);
	let scrollEl = $state(null);
	let containerWidth = $state(800);
	let containerHeight = $state(600);
	let canvasWidth = $state(800);
	let canvasHeight = $state(600);
	let isDragging = $state(false);
	let dragField = $state(null);
	let dragOffsetX = $state(0);
	let dragOffsetY = $state(0);
	let imageInput;

	const STRIP_RESERVE = 140;

	let pageRatio = $derived((template?.width ?? 842) / (template?.height ?? 595));

	let pageW = $derived.by(() => {
		const availW = Math.max(containerWidth, 160);
		const availH = Math.max((containerHeight || 600) - STRIP_RESERVE, 160);
		const byW = availW;
		const byH = availH * pageRatio;
		return Math.min(byW, byH, 800);
	});

	let pageH = $derived(pageW / pageRatio);

	async function handleImageSelect(e) {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file || !file.type.startsWith('image/')) return;
		try {
			const { dataUrl, width, height } = await readImageFile(file);
			onImage({ id: template?.id ?? null, dataUrl, width, height });
		} catch {
			// ignore unreadable images
		}
	}

	let fieldKeys = $derived([...new Set(fields.map((f) => f.key))]);

	$effect(() => {
		if (scrollEl) {
			const obs = new ResizeObserver((entries) => {
				for (const entry of entries) {
					containerWidth = entry.contentRect.width;
					containerHeight = entry.contentRect.height;
				}
			});
			obs.observe(scrollEl);
			return () => obs.disconnect();
		}
	});

	$effect(() => {
		if (canvasEl) {
			const obs = new ResizeObserver((entries) => {
				for (const entry of entries) {
					canvasWidth = entry.contentRect.width;
					canvasHeight = entry.contentRect.height;
				}
			});
			obs.observe(canvasEl);
			return () => obs.disconnect();
		}
	});

	function getDisplayPos(field) {
		return {
			x: (field.x / 100) * canvasWidth,
			y: (field.y / 100) * canvasHeight
		};
	}

	function getCanvasRect() {
		return canvasEl?.getBoundingClientRect() ?? null;
	}

	function posFromClient(clientX, clientY) {
		const rect = getCanvasRect();
		if (!rect) return null;
		const x = ((clientX - rect.left) / canvasWidth) * 100;
		const y = ((clientY - rect.top) / canvasHeight) * 100;
		return {
			x: Math.max(0, Math.min(100, x)),
			y: Math.max(0, Math.min(100, y))
		};
	}

	function handlePointerDown(e, field) {
		e.preventDefault();
		e.stopPropagation();
		activeFieldId = field.id;
		showFieldPanel = true;
		isDragging = true;
		dragField = field;
		const rect = getCanvasRect();
		if (!rect) return;
		const pos = getDisplayPos(field);
		const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
		const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
		dragOffsetX = clientX - rect.left - pos.x;
		dragOffsetY = clientY - rect.top - pos.y;
	}

	function handlePointerMove(e) {
		if (!isDragging || !dragField) return;
		e.preventDefault();
		const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
		const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
		const rect = getCanvasRect();
		if (!rect) return;
		let x = ((clientX - rect.left - dragOffsetX) / canvasWidth) * 100;
		let y = ((clientY - rect.top - dragOffsetY) / canvasHeight) * 100;
		x = Math.max(0, Math.min(100, x));
		y = Math.max(0, Math.min(100, y));
		onFieldUpdate(dragField.id, { x, y });
	}

	function handlePointerUp() {
		isDragging = false;
		dragField = null;
	}

	function handleCanvasClick(e) {
		if (e.target === e.currentTarget || e.target.classList.contains('template-image')) {
			activeFieldId = null;
			showFieldPanel = false;
		}
	}

	function getFieldValue(field) {
		if (!participantData) return '';
		const col = mapping[field.key] ?? field.key;
		return participantData[col] ?? participantData[field.key] ?? '';
	}

</script>

<svelte:window
	onmousemove={handlePointerMove}
	onmouseup={handlePointerUp}
	ontouchmove={handlePointerMove}
	ontouchend={handlePointerUp}
	ontouchcancel={handlePointerUp}
/>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="application"
	aria-label="Canvas workspace"
	bind:this={scrollEl}
	class="h-full flex flex-col overflow-hidden"
>
	<div class="flex-1 overflow-auto p-2 sm:p-5 flex flex-col items-center min-h-0">
		{#if template}
			<div
				bind:this={canvasEl}
				role="button"
				tabindex="-1"
				data-keep-selection
				class="template-canvas relative rounded-2xl overflow-hidden cursor-crosshair shadow-2xl border border-line-hi {template.image ? 'bg-white' : 'bg-panel-hi'}"
				style="width: {pageW}px; height: {pageH}px;"
				onclick={handleCanvasClick}
				onkeydown={(e) => e.key === 'Escape' && (activeFieldId = null)}
			>
				{#if template.image}
					<img
						src={template.image}
						alt={template.name}
						class="template-image w-full h-full object-contain pointer-events-none select-none"
						draggable="false"
					/>
				{:else}
					<button
						type="button"
						class="absolute inset-3 rounded-xl border-2 border-dashed border-line-hi bg-black/5 hover:bg-black/10 hover:border-accent/50 flex flex-col items-center justify-center gap-2 text-soft hover:text-ink transition-colors cursor-pointer"
						title="Upload page image"
						onclick={(e) => {
							e.stopPropagation();
							imageInput?.click();
						}}
					>
						<ImagePlus size={28} strokeWidth={1.6} />
						<span class="text-xs font-medium">Upload image</span>
						<span class="text-[10px] text-faint">fields can still be placed on an empty canvas</span>
					</button>
				{/if}

				{#each fields as field (field.id)}
					{@const pos = getDisplayPos(field)}
					{@const val = getFieldValue(field)}
					{@const fontScale = canvasWidth / (template?.width ?? 842)}
					{@const rot = Number(field.rotation) || 0}
					<div
						role="button"
						tabindex="-1"
						aria-label="Field: {field.key}"
						class="absolute select-none cursor-move touch-none
							{activeFieldId === field.id ? 'ring-2 ring-accent ring-offset-2 ring-offset-white/20 z-20' : 'hover:ring-1 hover:ring-accent/70 z-10'}"
						style="
							left: {pos.x}px;
							top: {pos.y}px;
							transform: {(field.align === 'center' ? 'translateX(-50%) ' : field.align === 'right' ? 'translateX(-100%) ' : '') + `rotate(${rot}deg) scale(${field.flipX ? -1 : 1}, ${field.flipY ? -1 : 1})`};
							font-size: {(field.fontSize ?? 24) * fontScale}px;
							font-weight: {field.fontWeight ?? 400};
							font-style: {field.italic ? 'italic' : 'normal'};
							text-transform: {field.uppercase ? 'uppercase' : 'none'};
							opacity: {field.opacity ?? 1};
							color: {field.color ?? '#000000'};
							font-family: {field.fontFamily ?? 'Helvetica'}, sans-serif;
						"
						onmousedown={(e) => handlePointerDown(e, field)}
						ontouchstart={(e) => handlePointerDown(e, field)}
					>
						<span class="whitespace-nowrap pointer-events-none">
							{val || (participantData ? `[${field.key}]` : field.key)}
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex-1 flex items-center justify-center min-h-[50vh]">
				<div class="text-center px-4">
					<div class="w-16 h-16 bg-panel rounded-2xl flex items-center justify-center mx-auto mb-4 border border-line">
						<ImagePlus size={30} class="text-faint" />
					</div>
					<p class="text-sm text-soft">No page to edit yet</p>
					<p class="text-xs text-faint mt-1.5">Create a blank page to place fields, or upload an image for your first page.</p>
					<div class="flex flex-wrap items-center justify-center gap-2 mt-5">
						<button onclick={onCreatePage} class="btn btn-accent text-xs">
							<Plus size={14} strokeWidth={2.4} />
							Create blank page
						</button>
						<button onclick={() => imageInput?.click()} class="btn btn-ghost text-xs">
							Upload image
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if showFieldPanel && activeFieldId}
		<div class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-raised border-t border-line shadow-2xl max-h-[52vh] overflow-y-auto rounded-t-3xl" data-keep-selection>
				<div class="flex items-center justify-between px-4 py-3 border-b border-line">
					<span class="section-label">Design</span>
					<button
						onclick={() => {
							showFieldPanel = false;
							activeFieldId = null;
						}}
						class="icon-btn"
						aria-label="Close field editor"
					>
						<X size={16} />
					</button>
				</div>
				<FieldEditor
					{fields}
					bind:activeFieldId
					{onFieldUpdate}
					{onFieldRemove}
					{onCopyFormat}
					{onCopyField}
					{onCutField}
					{onPasteFormat}
					hasFormat={hasFormat}
					allFieldKeys={fieldKeys}
				/>
			</div>
	{/if}

	<input
		bind:this={imageInput}
		type="file"
		accept="image/png,image/jpeg,image/webp"
		onchange={handleImageSelect}
		class="hidden"
	/>
</div>