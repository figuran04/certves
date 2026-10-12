// Simple fixed-window in-memory rate limiter. Suitable for a single Node
// process (adapter-node). Not a substitute for a CDN-level limiter, but stops
// the worst scripted abuse of the JSON APIs.

const buckets = new Map();
const MAX_BUCKETS = 10_000;

export function rateLimit(key, limit, windowMs) {
	if (buckets.size > MAX_BUCKETS) {
		const now = Date.now();
		for (const [k, b] of buckets) {
			if (now > b.reset) buckets.delete(k);
		}
	}
	const now = Date.now();
	const b = buckets.get(key);
	if (!b || now > b.reset) {
		buckets.set(key, { count: 1, reset: now + windowMs });
		return { ok: true, remaining: limit - 1 };
	}
	b.count += 1;
	if (b.count > limit) {
		return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
	}
	return { ok: true, remaining: limit - b.count };
}