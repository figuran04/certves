import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, DATABASE_URL } from '$env/static/private';

let client = null;
let lastConfig = null;

function resolveLocalUrl() {
	let provided = (DATABASE_URL || '').trim();
	if (!provided) provided = './data/cert.db';
	const file = provided.replace(/^file:/i, '');
	const abs = path.resolve(process.cwd(), file).replace(/\\/g, '/');
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	return `file:${abs}`;
}

function getConfig() {
	if (TURSO_DATABASE_URL?.trim()) {
		return {
			kind: 'turso',
			url: TURSO_DATABASE_URL.trim(),
			authToken: TURSO_AUTH_TOKEN?.trim() || undefined
		};
	}
	return { kind: 'local', url: resolveLocalUrl() };
}

export function isDbConfigured() {
	const cfg = getConfig();
	return Boolean(cfg.url);
}

export function db() {
	const cfg = getConfig();
	if (!cfg.url) return null;
	if (!client || JSON.stringify(cfg) !== lastConfig) {
		client = createClient({ url: cfg.url, authToken: cfg.authToken });
		lastConfig = JSON.stringify(cfg);
	}
	return client;
}

export async function dbHealth() {
	try {
		await ensureDb();
		return { ok: true };
	} catch (e) {
		return { ok: false, reason: e?.message || String(e) };
	}
}

let seedPromise = null;

export function ensureDb() {
	const c = db();
	if (!c) return null;
	if (!seedPromise) {
		seedPromise = c
			.executeMultiple(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				email TEXT UNIQUE NOT NULL,
				name TEXT,
				avatar TEXT,
				provider TEXT,
				provider_id TEXT,
				created_at INTEGER
			);
			CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
			CREATE TABLE IF NOT EXISTS sessions (
				token TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				created_at INTEGER,
				expires_at INTEGER
			);
			CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
			CREATE TABLE IF NOT EXISTS projects (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				name TEXT DEFAULT '',
				data TEXT DEFAULT '{}',
				updated_at INTEGER
			);
			CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, updated_at);
		`)
			.then(() => c)
			.catch((e) => {
				seedPromise = null;
				throw e;
			});
	}
	return seedPromise;
}