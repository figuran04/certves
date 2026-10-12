import { SESSION_COOKIE, verifySession, randomToken } from '$lib/server/auth.js';
import { ensureDb } from '$lib/server/db.js';

export const ANON_COOKIE = 'cert_anon';

export async function ownerId(cookies, url) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) {
		const user = await verifySession(token);
		if (user) return user.id;
	}
	let anon = cookies.get(ANON_COOKIE);
	if (!anon) {
		anon = await randomToken(20);
		cookies.set(ANON_COOKIE, anon, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 365
		});
	}
	return `anon_${anon}`;
}

// Hand any projects created before sign-in over to the freshly authenticated user.
export async function migrateAnonProjects(anonId, userId) {
	if (!anonId || !userId) return 0;
	const c = await ensureDb();
	if (!c) return 0;
	try {
		const r = await c.execute({
			sql: 'UPDATE projects SET user_id = ? WHERE user_id = ?',
			args: [userId, `anon_${anonId}`]
		});
		return Number(r.rowsAffected ?? 0);
	} catch {
		return 0;
	}
}