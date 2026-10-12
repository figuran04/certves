export function GET({ url }) {
	const origin = url.origin;
	const urls = ['/']
		.map(
			(path) =>
				`  <url>\n    <loc>${origin}${path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`
		)
		.join('\n');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
