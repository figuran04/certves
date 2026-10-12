<script>
	import { Award } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Terms of Service - certves</title>
	<meta
		name="description"
		content="The terms under which certves is provided."
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
				<h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Terms of Service</h1>
				<p class="text-xs text-faint">Last updated: {new Date().toLocaleDateString('en-CA')}</p>
			</div>

			<p class="text-sm leading-relaxed text-soft">
				This template explains the terms for using certves. <strong>Review it, fill in the placeholders,
				and replace it before going into production.</strong>
			</p>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">1. The service</h2>
				<p class="text-sm leading-relaxed text-soft">
					certves lets you design certificate pages, import participant data, and generate PDF
					certificates. You keep ownership of the content you upload and the certificates you create.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">2. Acceptable use</h2>
				<p class="text-sm leading-relaxed text-soft">
					You agree not to misuse the service, attempt to disrupt it, or generate abusive, infringing or
					unlawful content. Automated bulk project creation or any attempt to exceed rate limits is not
					allowed.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">3. Availability</h2>
				<p class="text-sm leading-relaxed text-soft">
					The service is provided "as is", without warranty of any kind. We may limit features,
					add hosting/usage limits, or change pricing in the future.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">4. Liability</h2>
				<p class="text-sm leading-relaxed text-soft">
					To the maximum extent permitted by law, the operator of certves is not liable for indirect or
					consequential damages arising from use of the service.
				</p>
			</section>

			<section class="space-y-2">
				<h2 class="text-[15px] font-semibold text-ink">5. Contact</h2>
				<p class="text-sm leading-relaxed text-soft">
					Questions about these terms: dikaelsaputra2406@gmail.com
				</p>
			</section>
		</article>
	</main>

	<footer class="border-t border-line px-4 sm:px-6 py-6">
		<div class="max-w-3xl mx-auto text-xs text-faint">
			© {new Date().getFullYear()} certves · <a href="/privacy" class="text-soft hover:text-ink">Privacy</a>
		</div>
	</footer>
</div>