import { json } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession, oauthConfigured } from '$lib/server/auth.js';
import { dbHealth } from '$lib/server/db.js';

export async function GET({ cookies }) {
	const token = cookies.get(SESSION_COOKIE);
	const user = token ? await verifySession(token) : null;
	const db = await dbHealth();
	return json({ user, configured: oauthConfigured, db });
}