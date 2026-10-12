import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import { isDbConfigured, ensureDb } from './db.js';

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'cert_session';
export const OAUTH_STATE_COOKIE = 'cert_oauth';

export const oauthConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) && isDbConfigured();

function base64url(buf) {
	return Buffer.from(buf).toString('base64url');
}

export async function randomToken(bytes = 32) {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return base64url(arr);
}

export async function grantCodeChallenge() {
	const verifier = await randomToken(48);
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
	return {
		verifier,
		challenge: base64url(new Uint8Array(digest))
	};
}

export async function exchangeCode(code, redirectUri, verifier) {
	const body = new URLSearchParams({
		code,
		client_id: GOOGLE_CLIENT_ID,
		client_secret: GOOGLE_CLIENT_SECRET,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code',
		code_verifier: verifier
	});
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 200)}`);
	}
	return res.json();
}

export async function fetchGoogleProfile(accessToken) {
	const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error(`Failed to fetch profile (${res.status})`);
	return res.json();
}

export async function verifySession(token) {
	if (!token) return null;
	const c = await ensureDb();
	if (!c) return null;
	try {
		const now = Date.now();
		const r = await c.execute({
			sql: `SELECT u.id, u.email, u.name, u.avatar FROM sessions s
				JOIN users u ON u.id = s.user_id
				WHERE s.token = ? AND s.expires_at > ?`,
			args: [token, now]
		});
		const row = r.rows[0];
		if (!row) return null;
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			avatar: row.avatar
		};
	} catch {
		return null;
	}
}

export async function upsertGoogleUser(profile) {
	const c = await ensureDb();
	if (!c) throw new Error('Database is not configured.');

	const existing = await c.execute({
		sql: 'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
		args: ['google', profile.id]
	});

	const now = Date.now();
	if (existing.rows[0]) {
		const id = existing.rows[0].id;
		await c.execute({
			sql: 'UPDATE users SET email = ?, name = ?, avatar = ? WHERE id = ?',
			args: [profile.email ?? null, profile.name ?? null, profile.picture ?? null, id]
		});
		return id;
	}

	const id = await randomToken(16);
	await c.execute({
		sql: 'INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
		args: [id, profile.email ?? null, profile.name ?? null, profile.picture ?? null, 'google', profile.id, now]
	});
	return id;
}

export async function createSession(userId) {
	const c = await ensureDb();
	if (!c) throw new Error('Database is not configured.');
	const token = await randomToken(32);
	const now = Date.now();
	try {
		await c.execute({ sql: 'DELETE FROM sessions WHERE expires_at < ?', args: [now] });
	} catch {
		// non-critical cleanup
	}
	await c.execute({
		sql: 'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
		args: [token, userId, now, now + 30 * DAY]
	});
	return token;
}

export async function deleteSession(token) {
	if (!token) return;
	const c = await ensureDb();
	if (!c) return;
	try {
		await c.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
	} catch {
		// ignore
	}
}

export function sessionCookieOptions() {
	return {
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		path: '/',
		maxAge: 30 * DAY / 1000
	};
}