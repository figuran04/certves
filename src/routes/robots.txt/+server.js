export function GET({ url }) {
	const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/
Disallow: /project/

Sitemap: ${url.origin}/sitemap.xml
`;
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
