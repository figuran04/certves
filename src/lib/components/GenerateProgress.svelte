<script>
	import { Download, FileText, Layers, LoaderCircle, Users, Zap } from 'lucide-svelte';
	import { createZip, sanitizeFilename } from '$lib/services/zip.js';
	import { generateParticipantPDF, generateAllPDFs } from '$lib/services/pdf.js';

	let {
		templates = [],
		participants = [],
		mapping = {},
		onDone = () => {},
		onError = () => {}
	} = $props();

	let running = $state(false);
	let current = $state(0);
	let total = $state(0);
	let currentName = $state('');
	let error = $state(null);

	let progress = $derived(total > 0 ? (current / total) * 100 : 0);

	function measureImage(blob) {
		return new Promise((resolve) => {
			const url = URL.createObjectURL(blob);
			const img = new Image();
			img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
			img.onerror = () => resolve(null);
			img.src = url;
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		});
	}

	async function getTemplateImages() {
		const images = [];
		const pageSizes = [];
		for (const t of templates) {
			if (!t.image) {
				images.push(null);
				pageSizes.push({ width: t.width ?? 842, height: t.height ?? 595 });
				continue;
			}
			const res = await fetch(t.image);
			const blob = await res.blob();
			const buf = await blob.arrayBuffer();
			const dims = await measureImage(blob);
			images.push(new Uint8Array(buf));
			pageSizes.push({
				width: dims?.width ?? t.width ?? 842,
				height: dims?.height ?? t.height ?? 595
			});
		}
		return { images, pageSizes };
	}

	function getTemplateFieldsArray() {
		return templates.map((t) => t.fields);
	}

	async function generateAll() {
		if (running || templates.length === 0 || participants.length === 0) return;

		const hasFields = templates.some((t) => t.fields.length > 0);
		if (!hasFields) {
			error = 'No fields configured. Add fields to pages first.';
			onError(error);
			return;
		}

		const mappedColumns = Object.values(mapping).filter(Boolean);
		if (mappedColumns.length === 0 && templates.some((t) => t.fields.length > 0)) {
			error = 'No data mapping configured. Map fields to data columns first.';
			onError(error);
			return;
		}

		running = true;
		error = null;
		current = 0;
		total = participants.length;

		try {
			const { images, pageSizes } = await getTemplateImages();
			const fieldsArray = getTemplateFieldsArray();

			const results = await generateAllPDFs(
				images, fieldsArray, participants, mapping,
				pageSizes,
				(cur, tot, name) => {
					current = cur;
					total = tot;
					currentName = name;
				}
			);

			if (results.length === 1) {
				const blob = new Blob([results[0].data], { type: 'application/pdf' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${sanitizeFilename(results[0].name)}.pdf`;
				a.click();
				URL.revokeObjectURL(url);
			} else {
				const files = results.map((r) => ({
					name: `${sanitizeFilename(r.name)}.pdf`,
					data: r.data
				}));
				const zipBlob = await createZip(files);
				const url = URL.createObjectURL(zipBlob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'certificates.zip';
				a.click();
				URL.revokeObjectURL(url);
			}

			onDone();
		} catch (err) {
			error = err.message;
			onError(err.message);
		} finally {
			running = false;
		}
	}

	async function downloadSingle(index) {
		if (templates.length === 0 || !participants[index]) return;
		try {
			const { images, pageSizes } = await getTemplateImages();
			const fieldsArray = getTemplateFieldsArray();

			const pdfBytes = await generateParticipantPDF(
				images, fieldsArray, participants[index], mapping, pageSizes
			);

			const name = participants[index]?.nama ?? participants[index]?.name ?? `participant-${index + 1}`;
			const blob = new Blob([pdfBytes], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${sanitizeFilename(name)}.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			onError(err.message);
		}
	}
</script>

<div class="space-y-4">
	<div class="card p-5 shadow-l2">
		<p class="section-label mb-4">Summary</p>
		<div class="grid grid-cols-2 gap-4 text-xs">
			<div class="flex items-center gap-2">
				<Layers size={13} class="text-faint" />
				<span class="text-faint">Pages</span>
				<span class="font-medium text-ink ml-auto">{templates.length}</span>
			</div>
			<div class="flex items-center gap-2">
				<Users size={13} class="text-faint" />
				<span class="text-faint">Participants</span>
				<span class="font-medium text-ink ml-auto">{participants.length}</span>
			</div>
			<div class="flex items-center gap-2">
				<FileText size={13} class="text-faint" />
				<span class="text-faint">Total pages</span>
				<span class="font-medium text-ink ml-auto">{templates.length * participants.length}</span>
			</div>
			<div class="flex items-center gap-2">
				<Zap size={13} class="text-faint" />
				<span class="text-faint">Output</span>
				<span class="font-medium text-ink ml-auto">{participants.length === 1 ? '1 PDF' : `${participants.length} PDFs (ZIP)`}</span>
			</div>
		</div>
	</div>

	{#if error}
		<div class="card p-3.5 text-xs text-down border-down/30 bg-down/10">
			{error}
		</div>
	{/if}

	{#if running}
		<div class="space-y-2.5 card p-5">
			<div class="flex items-center justify-between text-xs">
				<span class="flex items-center gap-1.5 text-soft"><LoaderCircle size={13} class="spin" /> Generating…</span>
				<span class="font-medium text-accent-strong font-mono">{Math.round(progress)}%</span>
			</div>
			<div class="w-full bg-panel-hi rounded-full h-2 overflow-hidden">
				<div class="bg-accent h-2 rounded-full transition-all duration-300" style="width: {progress}%"></div>
			</div>
			<div class="flex items-center justify-between text-[11px] text-faint font-mono">
				<span>{current} / {total}</span>
				<span class="truncate max-w-[60%]">{currentName}</span>
			</div>
		</div>
	{:else}
		<button
			onclick={generateAll}
			disabled={templates.length === 0 || participants.length === 0}
			class="btn btn-accent w-full !py-3 text-[0.875rem]"
		>
			<Download size={16} />
			{participants.length === 1 ? 'Generate & Download PDF' : `Generate All (${participants.length} PDFs)`}
		</button>

		{#if participants.length > 1}
			<div class="space-y-1 max-h-[32vh] overflow-y-auto">
				{#each participants as p, i}
					{@const name = p?.nama ?? p?.name ?? p?.Nama ?? `Row ${i + 1}`}
					<div class="flex items-center justify-between text-xs px-3 py-2 rounded-xl hover:bg-panel-hi transition-colors">
						<span class="text-soft truncate">{name}</span>
						<button
							onclick={() => downloadSingle(i)}
							class="btn btn-ghost !px-3 !py-1 text-xs ml-2 flex-shrink-0 border border-line"
						>
							<Download size={12} />
							Download
						</button>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>