<script>
	import { LogOut, User } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let { user = null, onPrimary = false, placement = 'down' } = $props();

	let open = $state(false);
	let root = $state();
	let showConfirm = $state(false);

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

	function doSignout() {
		showConfirm = false;
		open = false;
		window.location.assign('/auth/logout');
	}
</script>

{#if user}
	<div class="relative shrink-0" bind:this={root}>
		<button
			class="flex items-center gap-1.5 h-8 rounded-full border pl-0.5 pr-2
				{onPrimary ? 'border-white/25 bg-white/15 hover:border-white/40' : 'border-black/10 bg-black/5 hover:border-black/20'}"
			title={user.email}
			aria-haspopup="true"
			aria-expanded={open}
			onclick={(e) => {
				e.stopPropagation();
				open = !open;
			}}
		>
			{#if user.avatar}
				<img src={user.avatar} alt="" class="w-7 h-7 rounded-full" referrerpolicy="no-referrer" />
			{:else}
				<span class="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold bg-accent text-base">
					{(user.name || user.email || '?').charAt(0).toUpperCase()}
				</span>
			{/if}
			<span class="text-xs {onPrimary ? 'text-white/85' : 'text-soft'} hidden lg:inline max-w-[7rem] truncate">
				{(user.name || user.email || '').slice(0, 16)}
			</span>
		</button>

		{#if open}
			<div
				class="absolute z-50 w-56 card card-hi p-1 fade-in shadow-l2
					{placement === 'up' ? 'left-0 bottom-10' : 'right-0 top-10'}"
			>
				<div class="px-3 py-2 border-b border-line mb-1 overflow-hidden">
					<p class="text-xs font-semibold text-ink truncate">{user.name || 'User'}</p>
					<p class="text-[11px] text-faint truncate">{user.email}</p>
				</div>
				<a
					href="/profile"
					class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-soft hover:text-ink hover:bg-black/5"
					onclick={() => (open = false)}
				>
					<User size={13} /> Profile
				</a>
				<button
					class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-600 hover:text-red-700 hover:bg-black/5"
					onclick={() => {
						open = false;
						showConfirm = true;
					}}
				>
					<LogOut size={13} /> Sign out
				</button>
			</div>
		{/if}
	</div>

	{#if showConfirm}
		<ConfirmDialog
			open
			title="Sign out?"
			message="You'll need to sign in again to manage and generate certificates from this device."
			confirmLabel="Sign out"
			onConfirm={doSignout}
			onCancel={() => (showConfirm = false)}
		/>
	{/if}
{/if}