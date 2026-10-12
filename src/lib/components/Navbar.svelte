<script>
	import { Award, ChevronRight, Menu, Plus, X } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ProfileMenu from './ProfileMenu.svelte';

	let { user = null, configured = false, onNewProject = null, authLoading = false } = $props();

	let menuOpen = $state(false);
	let scrolled = $state(false);

	onMount(() => {
		const onScroll = () => (scrolled = window.scrollY > 16);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<header
	class="sticky top-0 z-50 transition-all duration-300 {scrolled ? 'px-2 sm:px-6 pt-2' : ''}"
>
	<div
		class="transition-all duration-300 {scrolled
			? 'max-w-5xl mx-auto bg-white/85 backdrop-blur-md border border-black/10 rounded-full shadow-lg px-3 sm:px-4 h-12'
			: 'bg-white/80 backdrop-blur-md px-2.5 sm:px-6 h-14'}"
	>
		<div class="flex items-center justify-between gap-2 h-full {scrolled ? '' : 'max-w-7xl mx-auto'}">
			<a
				href="/"
				class="flex items-center gap-1.5 text-base sm:text-lg font-bold tracking-tight text-ink shrink-0 min-w-0"
			>
				<span class="text-accent"><Award size={24} strokeWidth={2.2} /></span>
				<span class="truncate">certves</span>
			</a>

			<nav class="flex items-center gap-1.5 sm:gap-6">
				{#if user}
					<ProfileMenu {user} />
				{:else if authLoading}
					<div class="hidden md:flex items-center gap-2" aria-busy="true" aria-label="Checking sign-in state">
						<div class="skeleton h-9 w-[7.5rem] rounded-full"></div>
						<div class="skeleton h-9 w-[7rem] rounded-full"></div>
					</div>
				{:else}
					<div class="hidden md:flex items-center gap-3 sm:gap-6">
						<a href="#features" class="text-xs sm:text-sm text-soft hover:text-ink transition-colors">Features</a>
						<a href="#how" class="text-xs sm:text-sm text-soft hover:text-ink transition-colors">How it works</a>
					</div>

					{#if configured}
						<a
							href="/auth/google"
							class="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/10 bg-white hover:border-black/25 transition-colors text-soft text-sm shadow-sm"
						>Sign in</a>
					{/if}

					<a
						href="/auth/google?next=/"
						class="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent text-accent-ink text-sm font-medium shadow-sm hover:brightness-110 transition-[filter]"
					>Open Project <ChevronRight size={14} /></a>
				{/if}

				{#if !user}
					<button
						class="md:hidden icon-btn"
						aria-label="Toggle menu"
						aria-expanded={menuOpen}
						onclick={() => (menuOpen = !menuOpen)}
					>
						{#if menuOpen}<X size={16} />{:else}<Menu size={16} />{/if}
					</button>
				{/if}
			</nav>
		</div>
	</div>
</header>

{#if menuOpen && !user}
	<div class="fixed inset-x-2 sm:inset-x-3 top-16 z-40 md:hidden fade-in">
		<div class="card card-hi p-1.5 shadow-l2 border-t border-line/80">
			{#if !authLoading}
				<a href="#features" class="nav-link block" onclick={() => (menuOpen = false)}>Features</a>
				<a href="#how" class="nav-link block" onclick={() => (menuOpen = false)}>How it works</a>
				{#if configured}
					<a href="/auth/google" class="btn btn-outline w-full mt-1.5">Sign in with Google</a>
				{:else}
					<p class="px-3 py-2 text-xs text-faint">Authentication isn't configured yet.</p>
				{/if}
			{/if}
		</div>
	</div>
{/if}