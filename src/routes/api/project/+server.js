import { json } from '@sveltejs/kit';
import { randomToken } from '$lib/server/auth.js';
import { ensureDb } from '$lib/server/db.js';
import { ownerId } from '$lib/server/projects.js';
import { rateLimit } from '$lib/server/ratelimit.js';

function parseData(raw) {
	if (!raw) return {};
	try {
		const d = JSON.parse(raw);
		return d && typeof d === 'object' ? d : {};
	} catch {
		return {};
	}
}

const MAX_BODY_BYTES = 2_000_000;

// Page images live in the browser (IndexedDB), never in the database, so
// strip any that a client might still send and keep rows small.
function stripImages(data) {
	if (!data || typeof data !== 'object' || !Array.isArray(data.templates)) return data;
	return {
		...data,
		templates: data.templates.map((t) => {
			if (!t || typeof t !== 'object') return t;
			const { image, ...rest } = t;
			return rest;
		})
	};
}

function pageCount(data) {
	return Array.isArray(data.templates) ? data.templates.length : 0;
}

export async function GET({ cookies, url }) {
	const c = await ensureDb();
	if (!c) return json({ project: null });
	const oid = await ownerId(cookies, url);
	const id = url.searchParams.get('id');
	const r = id
		? await c.execute({
				sql: 'SELECT id, name, data, updated_at FROM projects WHERE id = ? AND user_id = ?',
				args: [id, oid]
			})
		: await c.execute({
				sql: 'SELECT id, name, data, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
				args: [oid]
			});
	const row = r.rows[0];
	if (!row) return json({ project: null });
	return json({
		project: {
			id: row.id,
			name: row.name ?? '',
			data: parseData(row.data),
			updatedAt: Number(row.updated_at)
		}
	});
}

export async function PUT({ request, cookies, url, getClientAddress }) {
	const c = await ensureDb();
	if (!c) return json({ ok: false, reason: 'db_unconfigured' });
	let body = {};
	try {
		const raw = await request.text();
		if (raw.length > MAX_BODY_BYTES) {
			return json({ ok: false, reason: 'too_large' }, { status: 413 });
		}
		body = raw ? JSON.parse(raw) : {};
	} catch {
		return json({ ok: false, reason: 'bad_body' });
	}
	const oid = await ownerId(cookies, url);
	let ip = 'unknown';
	try {
		ip = getClientAddress();
	} catch {
		// adapter may not expose the client address (e.g. dev)
	}
	const rl = rateLimit(`save:${oid}:${ip}`, 120, 60_000);
	if (!rl.ok) {
		return json({ ok: false, reason: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
	}
	const now = Date.now();
	const hasData = body.data && typeof body.data === 'object';
	const name = typeof body.name === 'string' ? body.name.slice(0, 200) : '';
	const id = url.searchParams.get('id') || (typeof body.id === 'string' ? body.id : '');
	const data = hasData ? stripImages(body.data) : {};

	if (id) {
		const existing = await c.execute({
			sql: 'SELECT name, data FROM projects WHERE id = ? AND user_id = ?',
			args: [id, oid]
		});
		if (existing.rows[0]) {
			const prevName = existing.rows[0].name ?? '';
			const prevData = parseData(existing.rows[0].data);
			const upName = typeof body.name === 'string' ? name : prevName;
			const upData = hasData ? data : prevData;
			await c.execute({
				sql: 'UPDATE projects SET name = ?, data = ?, updated_at = ? WHERE id = ? AND user_id = ?',
				args: [upName, JSON.stringify(upData), now, id, oid]
			});
			return json({ ok: true, id });
		}
		await c.execute({
			sql: 'INSERT INTO projects (id, user_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?)',
			args: [id, oid, name || 'Untitled Project', JSON.stringify(data), now]
		});
		return json({ ok: true, id });
	}

	const nid = `p_${await randomToken(12)}`;
	await c.execute({
		sql: 'INSERT INTO projects (id, user_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?)',
		args: [nid, oid, name || 'Untitled Project', JSON.stringify(data), now]
	});
	return json({ ok: true, id: nid, pageCount: pageCount(data) });
}

export async function DELETE({ cookies, url }) {
	const c = await ensureDb();
	if (!c) return json({ ok: false, reason: 'db_unconfigured' });
	const oid = await ownerId(cookies, url);
	const id = url.searchParams.get('id');
	if (!id) return json({ ok: false, reason: 'missing_id' });
	await c.execute({
		sql: 'DELETE FROM projects WHERE id = ? AND user_id = ?',
		args: [id, oid]
	});
	return json({ ok: true, id });
}