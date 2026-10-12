import { redirect } from '@sveltejs/kit';
import {
	OAUTH_STATE_COOKIE,
	SESSION_COOKIE,
	exchangeCode,
	fetchGoogleProfile,
	upsertGoogleUser,
	createSession,
	sessionCookieOptions
} from '$lib/server/auth.js';
import { ANON_COOKIE, migrateAnonProjects } from '$lib/server/projects.js';

export async function GET({ url, cookies }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	const storedRaw = cookies.get(OAUTH_STATE_COOKIE);

	try {
		if (error || !code || !state || !storedRaw) {
			throw new Error('OAuth flow aborted.');
		}

		const stored = JSON.parse(storedRaw);
		if (stored.state !== state) {
			throw new Error('State mismatch. Please try again.');
		}

		const redirectUri = `${url.origin}/auth/callback`;
		const tokens = await exchangeCode(code, redirectUri, stored.verifier);
		const profile = await fetchGoogleProfile(tokens.access_token);
		const userId = await upsertGoogleUser(profile);
		const token = await createSession(userId);

		const anonId = cookies.get(ANON_COOKIE);
		if (anonId) {
			await migrateAnonProjects(anonId, userId);
			cookies.delete(ANON_COOKIE, { path: '/' });
		}

		cookies.delete(OAUTH_STATE_COOKIE, { path: '/' });
		cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

		const target =
			stored.next && stored.next.startsWith('/') && !stored.next.startsWith('//')
				? stored.next
				: '/project';
		throw redirect(302, target);
	} catch (err) {
		if (err && typeof err === 'object' && err.status === 302) throw err;
		console.error('Auth callback failed:', err);
		cookies.delete(OAUTH_STATE_COOKIE, { path: '/' });
		throw redirect(302, '/?auth=error');
	}
}