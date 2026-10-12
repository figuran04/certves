<script>
	import { Award } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Privacy Policy - certves</title>
	<meta
		name="description"
		content="How certves collects, uses and protects your data."
	/>
</svelte:head>

<div class="page-bg" aria-hidden="true"></div>
<div class="relative min-h-dvh flex flex-col">
	<header class="border-b border-line bg-panel/80 backdrop-blur px-4 sm:px-6">
		<div class="max-w-3xl mx-auto h-14 flex items-center justify-between">
			<a href="/" class="flex items-center gap-1.5">
				<span class="text-accent"><Award size={22} /></span>
				<span class="text-sm font-semibold text-ink">certves</span>
			</a>
			<a href="/" class="text-xs text-soft hover:text-ink transition-colors">← Back</a>
		</div>
	</header>

	<main class="flex-1 px-4 sm:px-6 py-10">
		<article class="max-w-3xl mx-auto space-y-6">
			<div class="space-y-1">
				<p class="section-label">Legal</p>
				<h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
				<p class="text-xs text-faint">Last updated: {new Date().toLocaleDateString('en-CA')}</p>
			</div>

			<p class="text-sm leading-relaxed text-soft">
				This template policy explains how certves handles data. <strong>Review it, fill in the
				placeholders, and replace it before going into production or publishing any Google OAuth
				consent screen.</strong>
			</p>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">1. What we collect</h2>
				<p class="text-sm leading-relaxed text-soft">
					When you sign in with Google we store your Google account id, email, display name and avatar.
					Projects you create are stored in our database. Uploaded page images are processed only in
					your browser (IndexedDB) and are never sent to our servers.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">2. How we use it</h2>
				<p class="text-sm leading-relaxed text-soft">
					We use your data to authenticate you, sync your projects across devices, and display the
					certificates you design. We do not sell your data.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">3. Storage &amp; security</h2>
<p class="text-sm leading-relaxed text-soft">
				Data is stored in an encrypted-at-rest database (your own local or Turso database).
				Sessions use HttpOnly, Secure cookies. Access is limited to the project owner.
			</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">4. Your rights</h2>
				<p class="text-sm leading-relaxed text-soft">
					You may request export or deletion of your data by contacting
					dikaelsaputra2406@gmail.com or by deleting projects from your dashboard.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">5. Contact</h2>
				<p class="text-sm leading-relaxed text-soft">
					Questions about this policy: dikaelsaputra2406@gmail.com
				</p>
			</section>
		</article>
	</main>

	<footer class="border-t border-line px-4 sm:px-6 py-6">
		<div class="max-w-3xl mx-auto text-xs text-faint">
			© {new Date().getFullYear()} certves · <a href="/terms" class="text-soft hover:text-ink">Terms</a>
		</div>
	</footer>
</div>