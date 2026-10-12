const DB_NAME = 'certves';
const DB_VERSION = 1;
const STORE = 'images';
const LS_PREFIX = 'cert_img:';

const cache = new Map();
let dbPromise = null;

function openDB() {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve) => {
		try {
			if (typeof indexedDB === 'undefined') {
				resolve(null);
				return;
			}
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve(null);
			req.onblocked = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
	return dbPromise;
}

function idbRequest(mode, fn) {
	return openDB().then(
		(db) =>
			new Promise((resolve) => {
				if (!db) {
					resolve(null);
					return;
				}
				try {
					const tx = db.transaction(STORE, mode);
					const store = tx.objectStore(STORE);
					const req = fn(store);
					tx.oncomplete = () => resolve(req ? req.result : true);
					tx.onerror = () => resolve(null);
					tx.onabort = () => resolve(null);
				} catch {
					resolve(null);
				}
			}),
	);
}

function readLocal(id) {
	try {
		return localStorage.getItem(LS_PREFIX + id);
	} catch {
		return null;
	}
}

function removeLocal(id) {
	try {
		localStorage.removeItem(LS_PREFIX + id);
	} catch {
		// ignore
	}
}

export function getImage(id) {
	if (!id) return null;
	return cache.get(id) ?? null;
}

export async function loadImages(ids) {
	const result = {};
	for (const id of ids ?? []) {
		if (!id) continue;
		if (cache.has(id)) {
			result[id] = cache.get(id);
			continue;
		}
		let value = readLocal(id);
		if (!value) value = await idbRequest('readonly', (s) => s.get(id));
		if (typeof value === 'string' && value) {
			cache.set(id, value);
			result[id] = value;
			await idbRequest('readwrite', (s) => s.put(value, id));
			removeLocal(id);
		}
	}
	return result;
}

export async function setImage(id, dataUrl) {
	if (!id || !dataUrl) return false;
	cache.set(id, dataUrl);
	const ok = await idbRequest('readwrite', (s) => s.put(dataUrl, id));
	if (ok === null) {
		try {
			localStorage.setItem(LS_PREFIX + id, dataUrl);
			return true;
		} catch {
			return false;
		}
	}
	removeLocal(id);
	return true;
}

export async function deleteImage(id) {
	if (!id) return;
	cache.delete(id);
	removeLocal(id);
	await idbRequest('readwrite', (s) => s.delete(id));
}
