import { SESSION_COOKIE, verifySession } from '$lib/server/auth.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? await verifySession(token) : null;
	return resolve(event);
}