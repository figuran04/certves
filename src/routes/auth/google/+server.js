import { redirect } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID } from '$env/static/private';
import {
	oauthConfigured,
	OAUTH_STATE_COOKIE,
	grantCodeChallenge,
	randomToken,
	sessionCookieOptions
} from '$lib/server/auth.js';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET({ url, cookies }) {
	if (!oauthConfigured) {
		throw redirect(302, '/?auth=unconfigured');
	}

	const next = url.searchParams.get('next');
	const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

	const { verifier, challenge } = await grantCodeChallenge();
	const state = await randomToken(24);
	const redirectUri = `${url.origin}/auth/callback`;

	cookies.set(
		OAUTH_STATE_COOKIE,
		JSON.stringify({ state, verifier, next: safeNext }),
		{ ...sessionCookieOptions(), maxAge: 600 }
	);

	const p = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'online',
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		prompt: 'select_account'
	});

	throw redirect(302, `${GOOGLE_AUTH}?${p.toString()}`);
}