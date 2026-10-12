<script>
	import { Download, FileSpreadsheet, Upload, X } from 'lucide-svelte';
	import { parseCSV } from '$lib/services/csv.js';
	import { parseXLSX, readSheet, downloadTemplate } from '$lib/services/xlsx.js';

	let {
		onDataLoaded = () => {},
		onError = () => {}
	} = $props();

	let csvInput;
	let xlsxInput;
	let xlsxWorkbook = $state(null);
	let sheetNames = $state([]);
	let selectedSheet = $state('');
	let showSheetSelect = $state(false);

	function handleCSV(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const result = parseCSV(ev.target.result);
				onDataLoaded(result.headers, result.rows);
			} catch (err) {
				onError(err.message);
			}
		};
		reader.readAsText(file);
		e.target.value = '';
	}

	function handleXLSX(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const buf = new Uint8Array(ev.target.result);
				sheetNames = parseXLSX(buf);
				xlsxWorkbook = buf;
				if (sheetNames.length === 1) {
					loadSheet(sheetNames[0]);
				} else {
					selectedSheet = sheetNames[0];
					showSheetSelect = true;
				}
			} catch (err) {
				onError(err.message);
			}
		};
		reader.readAsArrayBuffer(file);
		e.target.value = '';
	}

	function loadSheet(name) {
		try {
			const result = readSheet(xlsxWorkbook, name);
			onDataLoaded(result.headers, result.rows);
			showSheetSelect = false;
		} catch (err) {
			onError(err.message);
		}
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<input bind:this={csvInput} type="file" accept=".csv" onchange={handleCSV} class="hidden" />
	<input bind:this={xlsxInput} type="file" accept=".xlsx,.xls" onchange={handleXLSX} class="hidden" />

	<button onclick={() => csvInput?.click()} class="btn btn-solid">
		<Upload size={14} />
		Import CSV
	</button>

	<button onclick={() => xlsxInput?.click()} class="btn btn-accent">
		<FileSpreadsheet size={14} />
		Import XLSX
	</button>

	<button onclick={downloadTemplate} class="btn btn-outline">
		<Download size={14} />
		Download Template
	</button>
</div>

{#if showSheetSelect}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="card card-hi p-6 w-full max-w-xs fade-in">
			<div class="flex items-center justify-between mb-4">
				<p class="section-label">Select Sheet</p>
				<button onclick={() => (showSheetSelect = false)} class="icon-btn" aria-label="Close"><X size={16} /></button>
			</div>
			<div class="space-y-1.5 mb-4">
				{#each sheetNames as name}
					<button
						onclick={() => loadSheet(name)}
						class="w-full text-left px-3 py-2.5 text-xs rounded-2xl border transition-colors
							{selectedSheet === name ? 'border-accent/50 bg-panel-hi text-ink' : 'border-line hover:bg-panel-hi text-soft'}"
					>
						{name}
					</button>
				{/each}
			</div>
			<button onclick={() => (showSheetSelect = false)} class="btn btn-ghost w-full border border-line">Cancel</button>
		</div>
	</div>
{/if}