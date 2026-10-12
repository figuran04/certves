<script>
	import {
		AlignCenter,
		AlignLeft,
		AlignRight,
		CaseUpper,
		Copy,
		FlipHorizontal2,
		FlipVertical2,
		Italic,
		Pencil,
		RotateCcw,
		RotateCw,
		Scissors,
		Wand2
	} from 'lucide-svelte';

	let {
		fields = [],
		activeFieldId = $bindable(null),
		onFieldUpdate = () => {},
		onFieldRemove = () => {},
		onCopyFormat = () => {},
		onCopyField = () => {},
		onCutField = () => {},
		onPasteFormat = () => {},
		hasFormat = false,
		allFieldKeys = []
	} = $props();

	let activeField = $derived(fields.find((f) => f.id === activeFieldId) ?? null);

	let editingKey = $state(false);
	let keyInput = $state();
	let keyDraft = $state('');

	$effect(() => {
		if (editingKey && keyInput) {
			keyInput.focus();
			keyInput.select();
		}
	});

	function startKeyRename() {
		keyDraft = activeField.key;
		editingKey = true;
	}

	function commitKeyRename() {
		const k = keyDraft.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
		if (k) updateProp('key', k);
		editingKey = false;
	}

	const fontFamilies = [
		'Helvetica', 'Arial', 'Times New Roman', 'Georgia',
		'Courier New', 'Verdana', 'Impact'
	];

	function updateProp(key, value) {
		if (activeField) {
			onFieldUpdate(activeField.id, { [key]: value });
		}
	}

	function normalizeAngle(a) {
		let v = Math.round(a) % 360;
		if (v > 180) v -= 360;
		if (v < -180) v += 360;
		return v === -0 ? 0 : v;
	}
</script>

<div class="p-4">
	{#if activeField}
		<div class="flex items-center justify-between gap-2 mb-3">
			{#if editingKey}
				<input
					bind:this={keyInput}
					bind:value={keyDraft}
					type="text"
					maxlength="40"
					class="input !h-8 !py-1 !px-2 text-[13px] font-semibold min-w-0"
					aria-label="Rename field key"
					onkeydown={(e) => {
						if (e.key === "Enter") commitKeyRename();
						if (e.key === "Escape") editingKey = false;
					}}
					onblur={commitKeyRename}
				/>
			{:else}
				<button
					type="button"
					class="flex items-center gap-1.5 h-7 px-1.5 rounded-lg text-[13px] font-semibold text-ink min-w-0 hover:bg-black/5 transition-colors"
					title="Rename field"
					onclick={startKeyRename}
				>
					<span class="truncate">{activeField.key}</span>
					<Pencil size={12} class="text-faint shrink-0" />
				</button>
			{/if}
			<div class="flex items-center gap-0.5 shrink-0">
				<button onclick={() => onCopyFormat(activeField.id)} class="icon-btn" title="Copy style" aria-label="Copy style"><Wand2 size={13} /></button>
				<button onclick={() => onPasteFormat(activeField.id)} class="icon-btn" title="Paste style" aria-label="Paste style" disabled={!hasFormat}><Wand2 size={13} class="opacity-60" /></button>
				<button onclick={() => onCopyField(activeField.id)} class="icon-btn" title="Copy field" aria-label="Copy field"><Copy size={13} /></button>
				<button onclick={() => onCutField(activeField.id)} class="icon-btn" title="Cut field" aria-label="Cut field"><Scissors size={13} /></button>
			</div>
		</div>

		<p class="cv-prop-label">Align</p>
		<div class="cv-seg mb-3">
			<button class={activeField.align === 'left' ? 'on' : ''} onclick={() => updateProp('align', 'left')} title="Align left" aria-label="Align left">
				<AlignLeft size={14} />
			</button>
			<button class={activeField.align === 'center' ? 'on' : ''} onclick={() => updateProp('align', 'center')} title="Align center" aria-label="Align center">
				<AlignCenter size={14} />
			</button>
			<button class={activeField.align === 'right' ? 'on' : ''} onclick={() => updateProp('align', 'right')} title="Align right" aria-label="Align right">
				<AlignRight size={14} />
			</button>
		</div>
		<div class="grid grid-cols-2 gap-2">
			<div class="cv-num">
				<span>X</span>
				<input
					type="number"
					min="0"
					max="100"
					step="0.1"
					value={activeField.x.toFixed(1)}
					onchange={(e) => updateProp('x', parseFloat(e.target.value) || 0)}
					aria-label="X position percent"
				/>
			</div>
			<div class="cv-num">
				<span>Y</span>
				<input
					type="number"
					min="0"
					max="100"
					step="0.1"
					value={activeField.y.toFixed(1)}
					onchange={(e) => updateProp('y', parseFloat(e.target.value) || 0)}
					aria-label="Y position percent"
				/>
			</div>
		</div>

		<hr class="cv-divider" />

		<p class="cv-prop-label">Typography</p>
		<select
			id="field-font"
			value={activeField.fontFamily}
			onchange={(e) => updateProp('fontFamily', e.target.value)}
			class="input mb-2"
			aria-label="Font family"
		>
			{#each fontFamilies as f (f)}
				<option value={f}>{f}</option>
			{/each}
		</select>
		<div class="grid grid-cols-[1fr_auto] gap-2 mb-2">
			<div class="cv-num">
				<span>px</span>
				<input
					type="number"
					min="8"
					max="200"
					value={activeField.fontSize}
					onchange={(e) => updateProp('fontSize', parseInt(e.target.value) || 24)}
					aria-label="Font size"
				/>
			</div>
			<div class="cv-seg">
				<button
					class={activeField.fontWeight >= 700 ? 'on' : ''}
					onclick={() => updateProp('fontWeight', activeField.fontWeight >= 700 ? 400 : 700)}
					title="Bold"
					aria-label="Toggle bold"
				><strong class="text-[13px]">B</strong></button>
				<button
					class={activeField.italic ? 'on' : ''}
					onclick={() => updateProp('italic', !activeField.italic)}
					title="Italic"
					aria-label="Toggle italic"
				><Italic size={13} /></button>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<input
				type="color"
				value={activeField.color}
				onchange={(e) => updateProp('color', e.target.value)}
				class="cv-swatch"
				aria-label="Text color"
			/>
			<input
				type="text"
				value={activeField.color}
				onchange={(e) => updateProp('color', e.target.value)}
				class="input flex-1 font-mono"
				aria-label="Text color hex"
			/>
		</div>

		<hr class="cv-divider" />

		<p class="cv-prop-label">Transform</p>
		<div class="grid grid-cols-[1fr_auto] gap-2 mb-2">
			<div class="cv-num">
				<span>°</span>
				<input
					type="number"
					min="-180"
					max="180"
					step="1"
					value={activeField.rotation ?? 0}
					onchange={(e) => updateProp('rotation', normalizeAngle(parseFloat(e.target.value) || 0))}
					aria-label="Rotation degrees"
				/>
			</div>
			<div class="cv-seg">
				<button
					onclick={() => updateProp('rotation', normalizeAngle((activeField.rotation ?? 0) - 90))}
					title="Rotate -90°"
					aria-label="Rotate left 90 degrees"
				><RotateCcw size={14} /></button>
				<button
					onclick={() => updateProp('rotation', normalizeAngle((activeField.rotation ?? 0) + 90))}
					title="Rotate +90°"
					aria-label="Rotate right 90 degrees"
				><RotateCw size={14} /></button>
			</div>
		</div>
		<div class="cv-seg mb-2">
			<button
				class={activeField.flipX ? 'on' : ''}
				onclick={() => updateProp('flipX', !activeField.flipX)}
				title="Mirror horizontal"
				aria-label="Mirror horizontal"
			><FlipHorizontal2 size={14} /></button>
			<button
				class={activeField.flipY ? 'on' : ''}
				onclick={() => updateProp('flipY', !activeField.flipY)}
				title="Mirror vertical"
				aria-label="Mirror vertical"
			><FlipVertical2 size={14} /></button>
			<button
				class={activeField.uppercase ? 'on' : ''}
				onclick={() => updateProp('uppercase', !activeField.uppercase)}
				title="Uppercase"
				aria-label="Toggle uppercase"
			><CaseUpper size={14} /></button>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-[11px] text-faint w-11 shrink-0">Opacity</span>
			<input
				type="range"
				min="0"
				max="100"
				step="1"
				value={Math.round((activeField.opacity ?? 1) * 100)}
				oninput={(e) => updateProp('opacity', Number(e.target.value) / 100)}
				class="flex-1"
				aria-label="Opacity"
			/>
			<span class="text-[11px] font-mono text-faint w-9 text-right shrink-0">{Math.round((activeField.opacity ?? 1) * 100)}%</span>
		</div>

		<hr class="cv-divider" />

		<p class="cv-prop-label">Field</p>
		<div class="flex items-center justify-between">
			<span class="text-xs text-soft">Show when empty</span>
			<label class="cv-switch">
				<input
					type="checkbox"
					checked={activeField.showWhenEmpty}
					onchange={(e) => updateProp('showWhenEmpty', !!e.target.checked)}
				/>
				<span class="cv-track"></span>
			</label>
		</div>

		<hr class="cv-divider" />

		<button onclick={() => onFieldRemove(activeField.id)} class="btn btn-danger w-full">Delete field</button>
	{:else}
		<div class="text-center py-12 px-2">
			<p class="text-xs text-soft">Select a field to edit its properties</p>
			{#if fields.length > 0}
				<p class="text-[11px] text-faint mt-1.5">Click a field on the canvas</p>
			{:else}
				<p class="text-[11px] text-faint mt-1.5">Add a field first</p>
			{/if}
		</div>
	{/if}
</div>