const PROJECT_FORMAT = 'certves-project';
const LEGACY_FORMAT = 'certves-preset';
const PROJECT_VERSION = 1;

export function stripImage(template) {
	const { image, ...rest } = template;
	return rest;
}

export function buildPreset({ name = 'My project', columns = [], mapping = {}, templates = [] }) {
	return {
		format: PROJECT_FORMAT,
		version: PROJECT_VERSION,
		name,
		exportedAt: new Date().toISOString(),
		columns,
		mapping,
		templates: templates.map(stripImage)
	};
}

export function downloadPresetFile(preset, customName) {
	const base =
		(customName || preset.name || 'certves-project').replace(/[^\w\- ]+/g, '').trim() || 'project';
	const fileName = `${base}.certves.json`;
	const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parsePreset(text) {
	let obj;
	try {
		obj = JSON.parse(text);
	} catch {
		return null;
	}
	if (!obj || typeof obj !== 'object') return null;
	if (obj.format && obj.format !== PROJECT_FORMAT && obj.format !== LEGACY_FORMAT) return null;
	if (!Array.isArray(obj.templates)) return null;
	return obj;
}