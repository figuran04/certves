import { requireWorkspace } from '$lib/server/guards.js';

export async function load({ locals, url, params }) {
	return { ...(await requireWorkspace({ locals, url })), id: params.id };
}