import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { randomToken } from '$lib/server/auth.js';
import { ensureDb } from '$lib/server/db.js';
import { ownerId } from '$lib/server/projects.js';
import { rateLimit } from '$lib/server/ratelimit.js';

export async function GET({ cookies, url }) {
	const c = await ensureDb();
	if (!c) return json({ projects: [] });
	const oid = await ownerId(cookies, url);
	const r = await c.execute({
		sql: 'SELECT id, name, data, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
		args: [oid]
	});
	const projects = r.rows.map((row) => {
		let data = {};
		try {
			data = row.data ? JSON.parse(row.data) : {};
		} catch {
			data = {};
		}
		return {
			id: row.id,
			name: row.name ?? '',
			pageCount: Array.isArray(data.templates) ? data.templates.length : 0,
			updatedAt: Number(row.updated_at)
		};
	});
	return json({ projects });
}

export async function POST({ request, cookies, url, getClientAddress }) {
	const c = await ensureDb();
	if (!c) return json({ ok: false, reason: 'db_unconfigured' });
	const oid = await ownerId(cookies, url);
	let ip = 'unknown';
	try {
		ip = getClientAddress();
	} catch {
		// adapter may not expose the client address (e.g. dev)
	}
	const rl = rateLimit(`create:${oid}:${ip}`, 30, 60_000);
	if (!rl.ok) {
		return json({ ok: false, reason: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
	}
	let body = {};
	try {
		body = await request.json();
	} catch {
		// no body is fine
	}
	const now = Date.now();
	const id = `p_${await randomToken(12)}`;
	const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 200) : 'Untitled Project';
	const defaultData = {
		templates: [
			{
				id: randomUUID(),
				name: 'Page 1',
				width: 842,
				height: 595,
				image: null,
				fields: []
			}
		]
	};
	await c.execute({
		sql: 'INSERT INTO projects (id, user_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?)',
		args: [id, oid, name, JSON.stringify(defaultData), now]
	});
	return json({ ok: true, id });
}