<script>
	import { onMount } from 'svelte';
	import { CopyPlus, ImagePlus, ImageUp, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-svelte';
	import { readImageFile } from '$lib/services/image.js';

	let {
		templates = $bindable([]),
		activeTemplateId = $bindable(null),
		onAdd = () => {},
		onCreatePage = () => {},
		onSelect = () => {},
		onDuplicate = () => {},
		onRemove = () => {},
		onRename = () => {},
		onReplaceImage = () => {}
	} = $props();

	let editingId = $state(null);
	let editName = $state('');
	let menuId = $state(null);
	let menuPos = $state({ left: 0, top: 0 });
	let fileInput;
	let replaceInput;
	let replaceTargetId = $state(null);

	function openMenu(e, id) {
		const r = e.currentTarget.getBoundingClientRect();
		const menuW = 144;
		const menuH = 164;
		const left = Math.min(Math.max(r.right - 8, 8), window.innerWidth - menuW - 8);
		let top = r.top - menuH - 8;
		if (top < 8) top = r.bottom + 8;
		if (top + menuH > window.innerHeight - 8) top = window.innerHeight - menuH - 8;
		menuPos = { left, top };
		menuId = id;
	}

	function triggerReplace(id) {
		replaceTargetId = id;
		replaceInput?.click();
	}

	async function handleReplace(e) {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file || !file.type.startsWith('image/')) return;
		const id = replaceTargetId;
		if (!id) return;
		try {
			const { dataUrl, width, height } = await readImageFile(file);
			onReplaceImage({ id, dataUrl, width, height });
		} catch {
			// ignore unreadable images
		}
	}

	let dragIndex = $state(null);
	let dragOverIndex = $state(null);
	let touchDragIndex = $state(null);

	async function handleFileSelect(e) {
		const files = e.target.files;
		if (!files) return;
		for (const file of files) {
			if (!file.type.startsWith('image/')) continue;
			try {
				const { dataUrl, width, height } = await readImageFile(file);
				onAdd({
					id: crypto.randomUUID(),
					name: file.name.replace(/\.[^.]+$/, ''),
					image: dataUrl,
					width,
					height,
					fields: []
				});
			} catch {
				// ignore unreadable images
			}
		}
		e.target.value = '';
	}

	function startRename(t) {
		editingId = t.id;
		editName = t.name;
	}

	function confirmRename() {
		if (editingId && editName.trim()) {
			onRename(editingId, editName.trim());
		}
		editingId = null;
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') confirmRename();
		if (e.key === 'Escape') editingId = null;
	}

	function handleDragStart(e, index) {
		dragIndex = index;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index.toString());
	}

	function handleDragOver(e, index) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		dragOverIndex = index;
	}

	function handleDragEnd() {
		if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
			const items = [...templates];
			const [moved] = items.splice(dragIndex, 1);
			items.splice(dragOverIndex, 0, moved);
			templates = items;
		}
		dragIndex = null;
		dragOverIndex = null;
	}

	function handleTouchMove(e) {
		if (touchDragIndex === null) return;
		e.preventDefault();
		const touch = e.touches[0];
		const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
		const item = elements.find((el) => el.dataset.templateIndex !== undefined);
		if (item) {
			dragOverIndex = parseInt(item.dataset.templateIndex);
		}
	}

	function handleTouchEnd() {
		if (touchDragIndex !== null && dragOverIndex !== null && touchDragIndex !== dragOverIndex) {
			const items = [...templates];
			const [moved] = items.splice(touchDragIndex, 1);
			items.splice(dragOverIndex, 0, moved);
			templates = items;
		}
		touchDragIndex = null;
		dragOverIndex = null;
	}

	onMount(() => {
		window.addEventListener('touchmove', handleTouchMove, { passive: false });
		const onDown = (e) => {
			if (menuId && !e.target.closest('[data-template-menu]')) menuId = null;
		};
		document.addEventListener('mousedown', onDown);
		return () => {
			window.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('mousedown', onDown);
		};
	});
</script>

<svelte:window
	ontouchend={handleTouchEnd}
	ontouchcancel={handleTouchEnd}
/>

<div class="flex flex-col">
	<div class="flex items-center gap-2.5 min-h-[118px] p-2.5">
		{#if templates.length === 0}
			<div class="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
				<div class="w-12 h-12 bg-panel-hi rounded-2xl flex items-center justify-center mb-3 border border-line">
					<ImagePlus size={22} class="text-faint" />
				</div>
				<p class="text-xs text-soft mb-3">No pages yet.</p>
				<button onclick={() => fileInput?.click()} class="text-xs text-accent-strong hover:brightness-110 font-medium">
					Upload your first page image
				</button>
			</div>
		{:else}
			<ul role="list" aria-label="Pages" class="flex-1 min-w-0 overflow-x-auto flex gap-2 p-1.5">
				{#each templates as t, i (t.id)}
					<li
						role="button"
						tabindex="0"
						data-template-index={i}
						draggable="true"
						class="group relative shrink-0 rounded-lg p-1 border transition-all cursor-pointer select-none
							{dragOverIndex === i ? 'border-accent/70 bg-panel-hi scale-[1.03]' : ''}
							{dragIndex === i ? 'opacity-40' : ''}
							{activeTemplateId === t.id && dragOverIndex !== i ? 'border-transparent ring-2 ring-inset ring-accent/70 bg-panel-hi' : ''}
							{activeTemplateId !== t.id && dragOverIndex !== i ? 'border-line hover:border-line-hi bg-panel' : ''}"
						onclick={() => {
							activeTemplateId = t.id;
							onSelect(t.id);
							menuId = null;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								activeTemplateId = t.id;
								onSelect(t.id);
							}
						}}
						ondragstart={(e) => handleDragStart(e, i)}
						ondragover={(e) => handleDragOver(e, i)}
						ondragend={handleDragEnd}
						ondragleave={() => {
							if (dragOverIndex === i) dragOverIndex = null;
						}}
						ontouchstart={() => {
							touchDragIndex = i;
						}}
					>
						<div class="relative w-24 sm:w-28 aspect-[4/3] overflow-hidden rounded-[5px]">
							<button
								onmousedown={(e) => e.stopPropagation()}
								onpointerdown={(e) => e.stopPropagation()}
								onclick={(e) => {
									e.stopPropagation();
									if (menuId === t.id) {
										menuId = null;
										return;
									}
									openMenu(e, t.id);
								}}
								class="absolute top-1 right-1 z-10 w-6 h-6 grid place-items-center rounded-full bg-black/30 text-white/90 hover:bg-white/20 backdrop-blur-sm
								opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 transition-opacity"
								title="Page options"
								aria-label="Page options"
								aria-haspopup="menu"
								aria-expanded={menuId === t.id}
							><MoreHorizontal size={11} /></button>
							{#if t.fields.length > 0}
								<span
									class="absolute top-1.5 right-8 z-10 px-1 py-0.5 rounded-md bg-black/60 text-white text-[7px] font-mono shrink-0"
								>{t.fields.length}</span>
							{/if}
							{#if t.image}
								<img
									src={t.image}
									alt={t.name}
									class="w-full h-full object-cover object-top pointer-events-none select-none"
									draggable="false"
								/>
							{:else}
								<div class="w-full h-full bg-panel-hi flex flex-col items-center justify-center gap-1 border-b border-line">
									<ImagePlus size={15} class="text-faint" />
									<span class="text-[9px] text-faint font-mono">no image</span>
								</div>
							{/if}

							<div
								class="absolute inset-x-0 bottom-0 flex items-center gap-1 px-1 pt-4 pb-1
									bg-gradient-to-t from-black/80 via-black/40 to-transparent"
							>
								<span class="text-[9px] font-mono text-white/60 shrink-0 select-none">{i + 1}</span>
								{#if editingId === t.id}
									<input
										type="text"
										bind:value={editName}
										onclick={(e) => e.stopPropagation()}
										onblur={confirmRename}
										onkeydown={handleKeydown}
										class="input !py-0 !px-1 text-[10px] !bg-black/50 min-w-0"
									/>
								{:else}
									<span class="text-[9px] text-white/90 truncate min-w-0">{t.name}</span>
								{/if}
							</div>
						</div>

						{#if menuId === t.id}
							<div
								class="fixed z-[70] w-36 card card-hi p-1 fade-in shadow-l2"
								style="left: {menuPos.left}px; top: {menuPos.top}px;"
								data-template-menu
								data-keep-selection
							>
								<button
									onclick={(e) => {
										e.stopPropagation();
										menuId = null;
										triggerReplace(t.id);
									}}
									class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-soft hover:text-ink hover:bg-black/5"
								><ImageUp size={12} /> Replace image</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										menuId = null;
										onDuplicate(t.id);
									}}
									class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-soft hover:text-ink hover:bg-black/5"
								><CopyPlus size={12} /> Duplicate</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										menuId = null;
										startRename(t);
									}}
									class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-soft hover:text-ink hover:bg-black/5"
								><Pencil size={12} /> Rename</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										menuId = null;
										onRemove(t.id);
									}}
									class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-red-600 hover:text-red-700 hover:bg-black/5"
								><Trash2 size={12} /> Delete</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Add Page Buttons -->
		<div class="flex items-center self-center w-24 sm:w-28 aspect-4/3 rounded-lg overflow-hidden border border-line bg-panel-hi">
			<button
				onclick={onCreatePage}
				class="w-full h-full flex justify-center items-center text-soft hover:text-ink hover:bg-black/5 transition-colors"
				title="Add blank page"
				aria-label="Add blank page"
			>
				<Plus size={16} strokeWidth={2.6} />
			</button>
			<button
				onclick={() => fileInput?.click()}
				class="w-full h-full flex justify-center items-center text-soft hover:text-ink hover:bg-black/5 transition-colors border-l border-line"
				title="Upload page image"
				aria-label="Upload page image"
			><ImageUp size={15} /></button>
		</div>
	</div>

	<!-- <div class="px-3 py-2 border-t border-line">
		<p class="text-[11px] text-faint">
			{templates.length} page{templates.length !== 1 ? 's' : ''} · one page per image
		</p>
	</div> -->

	<input
		bind:this={fileInput}
		type="file"
		accept="image/png,image/jpeg,image/webp"
		multiple
		onchange={handleFileSelect}
		class="hidden"
	/>
	<input
		bind:this={replaceInput}
		type="file"
		accept="image/png,image/jpeg,image/webp"
		onchange={handleReplace}
		class="hidden"
	/>
</div>