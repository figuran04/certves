<script>
	import { onMount } from 'svelte';
	import { Columns3, Plus, X } from 'lucide-svelte';

	let {
		columns = [],
		participants = [],
		onAddRow = () => {},
		onRemoveRow = () => {},
		onUpdateField = () => {},
		onRenameColumn = () => {},
		onAddColumn = () => {},
		onRemoveColumn = () => {}
	} = $props();

	let editingCell = $state(null);
	let editTarget = $state(null);
	let editingInput;
	let editingCol = $state(null);
	let editColName = $state('');
	let newColName = $state('');
	let showAddCol = $state(false);

	function startEdit(index, col) {
		editingCell = `${index}-${col}`;
		editTarget = { index, col };
	}

	function commitEditing() {
		if (editTarget && editingInput) {
			onUpdateField(editTarget.index, editTarget.col, editingInput.value);
		}
	}

	function endEdit() {
		editingCell = null;
		editTarget = null;
	}

	function onGlobalPointerDown(e) {
		if (!editTarget) return;
		if (e.target?.closest?.('[data-datatable]')) return;
		commitEditing();
		endEdit();
	}

	onMount(() => {
		window.addEventListener('pointerdown', onGlobalPointerDown);
		return () => {
			window.removeEventListener('pointerdown', onGlobalPointerDown);
			commitEditing();
		};
	});

	function startRenameCol(col) {
		editingCol = col;
		editColName = col;
	}

	function confirmRenameCol() {
		if (editingCol && editColName.trim() && editColName.trim() !== editingCol) {
			onRenameColumn(editingCol, editColName.trim());
		}
		editingCol = null;
	}

	function handleColKeydown(e) {
		if (e.key === 'Enter') confirmRenameCol();
		if (e.key === 'Escape') editingCol = null;
	}

	function addColumn() {
		if (!newColName.trim()) return;
		onAddColumn(newColName.trim());
		newColName = '';
		showAddCol = false;
	}
</script>

<div class="overflow-auto max-h-[40vh] sm:max-h-[50vh]" data-datatable>
	{#if columns.length === 0}
		<div class="text-center py-14">
			<div class="w-12 h-12 bg-panel rounded-2xl flex items-center justify-center mx-auto mb-3 border border-line">
				<Columns3 size={22} class="text-faint" />
			</div>
			<p class="text-sm text-soft">No participant data.</p>
			<p class="text-xs text-faint mt-1">Import CSV/XLSX or start manually below.</p>
			<button onclick={() => (showAddCol = true)} class="btn btn-outline mt-5">
				<Plus size={14} />
				Add Column
			</button>
		</div>
	{:else}
		<table class="data-table w-full text-xs border-collapse">
			<thead>
				<tr>
					<th class="!w-10">#</th>
					{#each columns as col}
						<th class="group">
							{#if editingCol === col}
								<input
									type="text"
									bind:value={editColName}
									onblur={confirmRenameCol}
									onkeydown={handleColKeydown}
									class="input !py-0 !px-2 text-xs !h-8"
								/>
							{:else}
								<div class="flex items-center gap-1">
									<button
										onclick={() => startRenameCol(col)}
										class="hover:text-ink transition-colors truncate max-w-[120px]"
										title="Rename column"
									>
										{col}
									</button>
									<button
										onclick={() => onRemoveColumn(col)}
										class="w-6 h-6 grid place-items-center rounded-full hover:bg-down/20 text-faint hover:text-down transition-opacity flex-shrink-0
											opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
										title="Delete column"
									><X size={12} /></button>
								</div>
							{/if}
						</th>
					{/each}
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each participants as row, i (i)}
					<tr>
						<td class="px-2.5 py-1.5 text-faint text-center font-mono">{i + 1}</td>
						{#each columns as col}
							<td class="px-1 py-1">
								{#if editingCell === `${i}-${col}`}
									<input
										type="text"
										bind:this={editingInput}
										value={row[col] ?? ''}
										onblur={(e) => {
											onUpdateField(i, col, e.target.value);
											endEdit();
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												onUpdateField(i, col, e.target.value);
												endEdit();
											}
											if (e.key === 'Escape') endEdit();
										}}
										class="input !py-0 !px-2 text-xs !h-8"
									/>
								{:else}
									<button onclick={() => startEdit(i, col)} class="cell-btn">
										{row[col] ?? ''}
									</button>
								{/if}
							</td>
						{/each}
						<td class="px-2 py-1">
							<button
								onclick={() => onRemoveRow(i)}
								class="w-8 h-8 grid place-items-center rounded-full text-faint hover:text-down hover:bg-down/15 transition-colors"
								title="Delete row"
							><X size={14} /></button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

{#if columns.length > 0 || showAddCol}
	<div class="mt-2 flex flex-wrap gap-2 p-3 border-t border-line">
		{#if columns.length > 0}
			<button onclick={onAddRow} class="btn btn-outline">
				<Plus size={14} />
				Add Row
			</button>
		{/if}

		{#if showAddCol}
			<div class="flex items-center gap-1.5">
				<input
					type="text"
					bind:value={newColName}
					placeholder="Column name"
					onkeydown={(e) => {
						if (e.key === 'Enter') addColumn();
						if (e.key === 'Escape') showAddCol = false;
					}}
					class="input !w-36 !py-1.5 text-xs"
				/>
				<button onclick={addColumn} class="btn btn-accent !px-3 !py-1.5 text-xs">Add</button>
				<button onclick={() => (showAddCol = false)} class="btn btn-ghost !px-3 !py-1.5 text-xs">Cancel</button>
			</div>
		{:else}
			<button
				onclick={() => (showAddCol = true)}
				class="btn btn-ghost border border-line"
			>
				<Plus size={14} />
				Add Column
			</button>
		{/if}
	</div>
{/if}