<script>
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const canonical = $derived(`${page.url.origin}${page.url.pathname}`);
	const origin = $derived(page.url.origin);
	const verification = env.PUBLIC_GOOGLE_SITE_VERIFICATION;
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#0f1015" media="(prefers-color-scheme: dark)" />
	<meta name="color-scheme" content="light dark" />
	<meta
		name="description"
		content="certves - design once, generate certificates automatically. Upload a page, map participant data, and export pixel-perfect PDFs."
	/>
	<title>certves - Certificate Generator</title>
	{#if verification}
		<meta name="google-site-verification" content={verification} />
	{/if}

	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="certves" />
	<meta property="og:title" content="certves - Certificate Generator" />
	<meta
		property="og:description"
		content="Design once, generate a thousand. Upload a page, map participant data, and export pixel-perfect PDF certificates automatically."
	/>
	<meta property="og:image" content="{origin}/og.png" />
	<meta property="og:url" content={canonical} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="certves - Certificate Generator" />
	<meta
		name="twitter:description"
		content="Design once, generate a thousand. Upload a page, map participant data, and export pixel-perfect PDF certificates automatically."
	/>
	<meta name="twitter:image" content="{origin}/og.png" />

	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'certves',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web',
		description:
			'Design once, generate a thousand. Upload a page, map participant data, and export pixel-perfect PDF certificates automatically.',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
	})}</script>`}
</svelte:head>

<div class="page-bg" aria-hidden="true"></div>
{@render children()}