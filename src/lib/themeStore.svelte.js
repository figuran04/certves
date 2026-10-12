import { browser } from '$app/environment';

const KEY = 'certves:theme';

let mq = null;

function systemDark() {
	if (!browser) return false;
	if (!mq) mq = window.matchMedia('(prefers-color-scheme: dark)');
	return mq.matches;
}

function storedPreference() {
	if (!browser) return 'system';
	try {
		const v = localStorage.getItem(KEY);
		return v === 'light' || v === 'dark' ? v : 'system';
	} catch {
		return 'system';
	}
}

function resolve(pref) {
	if (pref === 'system') return systemDark() ? 'dark' : 'light';
	return pref;
}

export const theme = $state({
	pref: storedPreference(),
	resolved: resolve(storedPreference())
});

export function applyTheme() {
	theme.resolved = resolve(theme.pref);
	if (browser) {
		document.documentElement.setAttribute('data-theme', theme.resolved);
		document.documentElement.style.colorScheme = theme.resolved;
	}
}

export function setTheme(pref) {
	if (pref !== 'light' && pref !== 'dark' && pref !== 'system') return;
	theme.pref = pref;
	if (browser) {
		try {
			localStorage.setItem(KEY, pref);
		} catch {
			// storage unavailable - theme still applies for this session
		}
	}
	applyTheme();
}

if (browser) {
	try {
		if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, 'system');
	} catch {
		// ignore
	}
	applyTheme();
	mq = window.matchMedia('(prefers-color-scheme: dark)');
	const onChange = () => {
		if (theme.pref === 'system') applyTheme();
	};
	mq.addEventListener('change', onChange);
}