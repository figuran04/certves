<script>
	import { onMount } from 'svelte';
	import { Check, LogOut, Moon, Monitor, Palette, Sun } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { theme, setTheme } from '$lib/themeStore.svelte.js';

	let user = $state(null);
	let configured = $state(false);
	let authState = $state('loading');
	let showConfirm = $state(false);

	const options = [
		{ id: 'system', icon: Monitor, title: 'System', desc: 'Follow your device setting' },
		{ id: 'light', icon: Sun, title: 'Light', desc: 'Always light' },
		{ id: 'dark', icon: Moon, title: 'Dark', desc: 'Always dark' }
	];

	onMount(async () => {
		try {
			const res = await fetch('/api/me');
			const data = await res.json();
			user = data.user ?? null;
			configured = Boolean(data.configured);
		} catch {
			// ignore
		}
		authState = 'ready';
	});

	function doSignout() {
		showConfirm = false;
		window.location.assign('/auth/logout');
	}
</script>

<svelte:head>
	<title>Profile · certves</title>
</svelte:head>

<Navbar {user} {configured} authLoading={authState === 'loading'} />

<main class="pt-28 sm:pt-32 pb-20 px-4 sm:px-6">
	<div class="max-w-2xl mx-auto space-y-6">
		<div class="min-w-0">
			<p class="section-label">Account</p>
			<h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-ink mt-2">Profile</h1>
		</div>

		{#if user}
			<div class="card p-5 flex items-center justify-between gap-4">
				<div class="flex items-center gap-4 min-w-0">
					{#if user.avatar}
						<img
							src={user.avatar}
							alt=""
							class="w-12 h-12 rounded-full shrink-0"
							referrerpolicy="no-referrer"
						/>
					{:else}
						<span
							class="w-12 h-12 rounded-full grid place-items-center text-lg font-bold bg-accent text-accent-ink shrink-0"
						>
							{(user.name || user.email || '?').charAt(0).toUpperCase()}
						</span>
					{/if}
					<div class="min-w-0">
						<p class="text-[15px] font-semibold text-ink truncate">{user.name || 'User'}</p>
						<p class="text-xs text-soft truncate">{user.email}</p>
					</div>
				</div>
				<button
					onclick={() => (showConfirm = true)}
					class="btn btn-danger shrink-0"
					title="Sign out"
				>
					<LogOut size={14} />
					<span class="hidden sm:inline">Sign out</span>
				</button>
			</div>
		{:else if authState === 'ready'}
			<div class="card p-5 flex items-center justify-between gap-4">
				<div class="min-w-0">
					<p class="text-sm font-semibold text-ink">Not signed in</p>
					<p class="text-xs text-soft mt-0.5">Sign in to sync and manage your projects.</p>
				</div>
				{#if configured}
					<a href="/auth/google?next=/profile" class="btn btn-accent shrink-0">Sign in</a>
				{/if}
			</div>
		{:else}
			<div class="card p-5">
				<div class="skeleton h-12 rounded-full"></div>
			</div>
		{/if}

		<div class="card p-5 sm:p-6">
			<div class="flex items-center gap-2.5 mb-5">
				<span
					class="w-9 h-9 rounded-xl grid place-items-center border border-black/10 bg-panel-hi text-accent-strong"
				>
					<Palette size={17} strokeWidth={1.8} />
				</span>
				<div class="min-w-0">
					<p class="text-[15px] font-semibold text-ink">Appearance</p>
					<p class="text-xs text-soft">Choose how certves looks. “System” follows your device.</p>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
				{#each options as o}
					<button
						type="button"
						role="radio"
						aria-checked={theme.pref === o.id}
						onclick={() => setTheme(o.id)}
						class="card card-hover p-4 text-left relative
							{theme.pref === o.id
							? 'ring-2 ring-accent bg-accent/5'
							: ''}"
					>
						<span class="w-9 h-9 rounded-xl flex justify-center items-center border border-black/10 bg-panel-hi">
							<o.icon
								size={17}
								strokeWidth={1.8}
								class={theme.pref === o.id ? 'text-accent-strong' : 'text-soft'}
							/>
						</span>
						<p class="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
							{o.title}
						</p>
						<p class="text-xs text-soft mt-0.5 truncate">
							{o.id === 'system' && theme.pref === 'system'
								? `Follows device - currently ${theme.resolved}`
								: o.desc}
						</p>
						{#if theme.pref === o.id}
							<span
								class="absolute top-3.5 right-3.5 w-5 h-5 rounded-full grid place-items-center bg-accent text-accent-ink"
							><Check size={12} strokeWidth={3} /></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
</main>

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