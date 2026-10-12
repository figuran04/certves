const ROUTES = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/privacy', priority: '0.4', changefreq: 'monthly' },
	{ path: '/terms', priority: '0.4', changefreq: 'monthly' }
];

export function GET({ url }) {
	const origin = url.origin;
	const urls = ROUTES.map(
		({ path, priority, changefreq }) =>
			`  <url>\n    <loc>${origin}${path}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
	).join('\n');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
