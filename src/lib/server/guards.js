import { redirect } from '@sveltejs/kit';
import { oauthConfigured } from '$lib/server/auth.js';
import { dbHealth } from '$lib/server/db.js';

export async function requireWorkspace({ locals, url }) {
	if (oauthConfigured && !locals.user) {
		const next = `${url.pathname}${url.search}`;
		throw redirect(307, `/auth/google?next=${encodeURIComponent(next)}`);
	}
	const db = await dbHealth();
	if (!db.ok) {
		throw redirect(307, '/?auth=dbdown');
	}
	return { user: locals.user ?? null };
}