<script>
	import { X } from 'lucide-svelte';

	let { open = $bindable(false) } = $props();

	const isMac =
		typeof navigator !== 'undefined' &&
		/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
	const mod = isMac ? '⌘' : 'Ctrl';

	const groups = [
		{
			title: 'History',
			items: [
				{ keys: [mod, 'Z'], label: 'Undo' },
				{ keys: [mod, '⇧', 'Z'], label: 'Redo' }
			]
		},
		{
			title: 'Fields',
			items: [
				{ keys: [mod, 'C'], label: 'Copy field' },
				{ keys: [mod, 'X'], label: 'Cut field' },
				{ keys: [mod, 'V'], label: 'Paste field' },
				{ keys: ['D'], label: 'Duplicate field' },
				{ keys: ['Delete'], label: 'Delete field' },
				{ keys: ['↑', '↓', '←', '→'], label: 'Nudge (⇧ = bigger step)' }
			]
		},
		{
			title: 'General',
			items: [
				{ keys: [mod, 'S'], label: 'Save now' },
				{ keys: ['Esc'], label: 'Deselect / close' },
				{ keys: ['?'], label: 'Show shortcuts' }
			]
		}
	];
</script>

{#if open}
	<div
		class="fixed inset-0 z-[95] grid place-items-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Keyboard shortcuts"
	>
		<div
			class="absolute inset-0 bg-black/40 backdrop-blur-sm fade-in"
			onclick={() => (open = false)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') open = false;
			}}
			role="button"
			tabindex="-1"
			aria-label="Close shortcuts"
		></div>
		<div class="relative card shadow-l2 p-5 w-full max-w-md fade-in max-h-[85vh] overflow-y-auto">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-[15px] font-semibold text-ink">Keyboard shortcuts</h2>
				<button
					type="button"
					class="icon-btn"
					aria-label="Close"
					onclick={() => (open = false)}
				>
					<X size={15} />
				</button>
			</div>

			<div class="space-y-4">
				{#each groups as group (group.title)}
					<div>
						<p class="cv-prop-label">{group.title}</p>
						<div class="space-y-0.5">
							{#each group.items as item (item.label)}
								<div class="flex items-center justify-between gap-3 py-1">
									<span class="text-xs text-soft">{item.label}</span>
									<span class="flex items-center gap-1 shrink-0">
										{#each item.keys as k (k)}
											<kbd
												class="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded-md border border-line bg-panel text-[11px] font-mono text-soft shadow-sm"
												>{k}</kbd
											>
										{/each}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
