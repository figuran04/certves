import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSession } from '$lib/server/auth.js';

async function handleLogout({ cookies }) {
	const token = cookies.get(SESSION_COOKIE);
	cookies.delete(SESSION_COOKIE, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD
	});
	if (token) void deleteSession(token);
	throw redirect(302, '/');
}

export function GET(event) {
	return handleLogout(event);
}

export function POST(event) {
	return handleLogout(event);
}