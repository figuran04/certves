<script>
	import { onMount } from "svelte";
	import { beforeNavigate, goto } from "$app/navigation";
	import { page } from "$app/state";
	import {
		ClipboardPaste,
		Copy,
		CopyPlus,
		Eye,
		Image,
		Menu,
		MoreVertical,
		Pencil,
		Plus,
		Redo2,
		Table,
		Trash2,
		Type,
		Undo2,
		Wand2,
	} from "lucide-svelte";
	import Header from "$lib/components/Header.svelte";
	import TemplateList from "$lib/components/TemplateList.svelte";
	import TemplateCanvas from "$lib/components/TemplateCanvas.svelte";
	import DataTable from "$lib/components/DataTable.svelte";
	import ImportData from "$lib/components/ImportData.svelte";
	import DataMapping from "$lib/components/DataMapping.svelte";
	import Preview from "$lib/components/Preview.svelte";
	import GenerateMenu from "$lib/components/GenerateMenu.svelte";
	import FieldEditor from "$lib/components/FieldEditor.svelte";
	import ProfileMenu from "$lib/components/ProfileMenu.svelte";
	import ProjectFileMenu from "$lib/components/ProjectFileMenu.svelte";
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import ShortcutHelp from "$lib/components/ShortcutHelp.svelte";
	import { getImage, setImage, deleteImage, loadImages } from "$lib/imageStore.js";
	import {
		buildPreset,
		downloadPresetFile,
		parsePreset,
	} from "$lib/preset.js";

	let templates = $state([]);
	let activeTemplateId = $state(null);
	let activeFieldId = $state(null);
	let columns = $state([]);
	let participants = $state([]);
	let mapping = $state({});
	let activeTab = $state("templates");
	let previewIndex = $state(0);
	let message = $state({ text: "", type: "info" });
	let sidebarOpen = $state(false);
	let showFieldPanel = $state(false);
	let notFound = $state(false);
	let projectName = $state("Untitled Project");
	let editingName = $state(false);
	let nameInput = $state();

	$effect(() => {
		if (editingName && nameInput) {
			nameInput.focus();
			nameInput.select();
		}
	});

	function startRename() {
		editingName = true;
	}

	function commitRename(e) {
		const t = e.target.value.trim();
		if (t) projectName = t;
		editingName = false;
	}

	let user = $state(null);
	let authConfigured = $state(false);
	let authReady = $state(false);
	let hydrated = $state(false);
	let saveStatus = $state("idle");
	let saveTimer = undefined;
	let lastSavedSnapshot = $state("");

	let clipboardFields = $state([]);
	let clipboardMode = $state("copy");
	let clipboardFormat = $state(null);

	let showShortcuts = $state(false);

	const HISTORY_LIMIT = 80;
	const NUDGE_STEP = 0.5;
	const NUDGE_STEP_BIG = 5;

	let history = [];
	let histIndex = -1;
	let historyReady = false;
	let historyTimer;
	let lastKnownSnap = "";
	let canUndo = $state(false);
	let canRedo = $state(false);

	function syncHistoryFlags() {
		canUndo = histIndex > 0;
		canRedo = histIndex < history.length - 1;
	}

	function captureState() {
		return {
			name: projectName,
			templates: templates.map((t) => ({
				...t,
				fields: t.fields.map((f) => ({ ...f })),
			})),
			participants: participants.map((r) => ({ ...r })),
			columns: [...columns],
			mapping: { ...mapping },
		};
	}

	function applyState(s) {
		if (!s) return;
		projectName = s.name;
		templates = s.templates.map((t) => ({
			...t,
			fields: t.fields.map((f) => ({ ...f })),
		}));
		participants = s.participants.map((r) => ({ ...r }));
		columns = [...s.columns];
		mapping = { ...s.mapping };
		if (!templates.some((t) => t.id === activeTemplateId)) {
			activeTemplateId = templates[0]?.id ?? null;
		}
		if (!activeFields.some((f) => f.id === activeFieldId)) {
			activeFieldId = null;
			showFieldPanel = false;
		}
		lastKnownSnap = snapshot;
	}

	function commitHistory() {
		historyTimer = undefined;
		const snap = snapshot;
		if (snap === lastKnownSnap) return;
		history = history.slice(0, histIndex + 1);
		history.push(captureState());
		if (history.length > HISTORY_LIMIT) history.shift();
		histIndex = history.length - 1;
		lastKnownSnap = snap;
		syncHistoryFlags();
	}

	function flushHistory() {
		if (historyTimer) {
			clearTimeout(historyTimer);
			commitHistory();
		}
	}

	function undo() {
		if (!historyReady) return;
		flushHistory();
		if (histIndex <= 0) return;
		histIndex -= 1;
		applyState(history[histIndex]);
		syncHistoryFlags();
	}

	function redo() {
		if (!historyReady) return;
		flushHistory();
		if (histIndex >= history.length - 1) return;
		histIndex += 1;
		applyState(history[histIndex]);
		syncHistoryFlags();
	}

	$effect(() => {
		const snap = snapshot;
		if (!hydrated || notFound) return;
		if (!historyReady) {
			historyReady = true;
			history = [captureState()];
			histIndex = 0;
			lastKnownSnap = snap;
			syncHistoryFlags();
			return;
		}
		if (snap === lastKnownSnap) return;
		clearTimeout(historyTimer);
		historyTimer = setTimeout(commitHistory, 450);
	});

	let projectId = $derived(page.params.id);
	let activeTemplate = $derived(
		templates.find((t) => t.id === activeTemplateId) ?? null,
	);
	let activeFields = $derived(activeTemplate?.fields ?? []);
	let fieldKeys = $derived([...new Set(activeFields.map((f) => f.key))]);

	const snapshot = $derived.by(() =>
		JSON.stringify({
			name: projectName,
			templates,
			participants,
			columns,
			mapping,
		}),
	);

	$effect(() => {
		if (!hydrated || notFound) return;
		const snap = snapshot;
		if (snap === lastSavedSnapshot) return;
		clearTimeout(saveTimer);
		saveStatus = "saving";
		saveTimer = setTimeout(() => persist(snap), 1000);
	});

	beforeNavigate(() => {
		if (!saveTimer) return;
		clearTimeout(saveTimer);
		saveTimer = undefined;
		saveStatus = "saving";
		persist(snapshot);
	});

	async function persist(snap) {
		try {
			const data = JSON.parse(snap);
			const stored = {
				...data,
				templates: data.templates.map(({ image, ...t }) => ({ ...t })),
			};
			try {
				localStorage.setItem(
					`cert_project:${projectId}`,
					JSON.stringify(stored),
				);
			} catch {
				// local storage full - ignore, DB still gets it when configured
			}
			const res = await fetch(`/api/project?id=${projectId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: data.name, data: stored }),
			});
			lastSavedSnapshot = snap;
			saveStatus = res.ok ? "saved" : "error";
		} catch {
			saveStatus = "error";
		}
	}

	async function preloadImages(data) {
		if (!data || !Array.isArray(data.templates)) return;
		const ids = data.templates.map((t) => t.id).filter(Boolean);
		if (ids.length > 0) await loadImages(ids);
	}

	async function loadStored() {
		try {
			const res = await fetch(`/api/project?id=${projectId}`);
			const { project } = await res.json();
			if (!project) {
				notFound = true;
				goto("/");
				return;
			}
			if (project.data && !workingStarted()) {
				await preloadImages(project.data);
				applyLoaded(project.data);
				projectName = project.name || projectName;
				hydrated = true;
				lastSavedSnapshot = snapshot;
				return;
			}
		} catch {
			// fall through to local restore
		}
		await restoreLocal();
		hydrated = true;
	}

	function workingStarted() {
		return templates.length > 0 || participants.length > 0;
	}

	async function restoreLocal() {
		if (workingStarted()) return;
		try {
			const raw = localStorage.getItem(`cert_project:${projectId}`);
			if (raw) {
				const data = JSON.parse(raw);
				await preloadImages(data);
				applyLoaded(data);
			}
		} catch {
			// ignore
		}
	}

	function applyLoaded(data) {
		if (data.name) projectName = data.name;
		if (Array.isArray(data.templates)) {
			templates = data.templates.map((t) => ({
				...t,
				image:
					typeof t.image === "string" && t.image
						? t.image
						: getImage(t.id),
			}));
		}
		if (Array.isArray(data.columns)) columns = data.columns;
		if (Array.isArray(data.participants)) participants = data.participants;
		if (data.mapping && typeof data.mapping === "object")
			mapping = data.mapping;
		if (templates.length > 0 && !activeTemplateId)
			activeTemplateId = templates[0].id;
	}

	async function loadAuth() {
		try {
			const res = await fetch("/api/me");
			const data = await res.json();
			user = data.user ?? null;
			authConfigured = Boolean(data.configured);
		} catch {
			// ignore
		}
		authReady = true;
	}

	function flushOnUnload() {
		if (!hydrated || notFound) return;
		const snap = snapshot;
		if (snap === lastSavedSnapshot) return;
		try {
			const data = JSON.parse(snap);
			const stored = {
				...data,
				templates: data.templates.map(({ image, ...t }) => ({ ...t })),
			};
			fetch(`/api/project?id=${projectId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: data.name, data: stored }),
				keepalive: true,
			}).catch(() => {});
		} catch {
			// ignore
		}
	}

	onMount(() => {
		loadAuth();
		loadStored();
		const onDown = (e) => {
			if (openFieldMenu && !e.target.closest("[data-field-menu]"))
				openFieldMenu = null;
		};
		const onKey = (e) => handleKeydown(e);
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		window.addEventListener("beforeunload", flushOnUnload);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
			window.removeEventListener("beforeunload", flushOnUnload);
		};
	});

	function isEditable(el) {
		if (!el || !el.tagName) return false;
		const tag = el.tagName;
		return (
			tag === "INPUT" ||
			tag === "TEXTAREA" ||
			tag === "SELECT" ||
			el.isContentEditable === true
		);
	}

	function saveNow() {
		if (!hydrated || notFound) return;
		clearTimeout(saveTimer);
		saveTimer = undefined;
		saveStatus = "saving";
		persist(snapshot);
	}

	function handleKeydown(e) {
		const mod = e.ctrlKey || e.metaKey;
		const editable = isEditable(e.target);

		if (e.key === "?" && !editable && !mod) {
			e.preventDefault();
			showShortcuts = !showShortcuts;
			return;
		}

		if (showShortcuts) {
			if (e.key === "Escape") {
				e.preventDefault();
				showShortcuts = false;
			}
			return;
		}

		if (mod && e.key.toLowerCase() === "s") {
			e.preventDefault();
			saveNow();
			return;
		}

		if (mod && !editable) {
			const k = e.key.toLowerCase();
			if (k === "z") {
				e.preventDefault();
				if (e.shiftKey) redo();
				else undo();
				return;
			}
			if (k === "y") {
				e.preventDefault();
				redo();
				return;
			}
			if (k === "c" && activeFieldId) {
				e.preventDefault();
				copyField(activeFieldId);
				return;
			}
			if (k === "x" && activeFieldId) {
				e.preventDefault();
				cutField(activeFieldId);
				return;
			}
			if (k === "v" && clipboardFields.length > 0) {
				e.preventDefault();
				pasteFields();
				return;
			}
			return;
		}

		if (editable) return;

		if (e.key === "Escape") {
			if (openFieldMenu) {
				openFieldMenu = null;
				return;
			}
			if (sidebarOpen) {
				sidebarOpen = false;
				return;
			}
			if (activeFieldId) {
				activeFieldId = null;
				showFieldPanel = false;
			}
			return;
		}

		if (deleteFieldTarget || openFieldMenu) return;
		if (!activeFieldId) return;

		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			handleFieldRemove(activeFieldId);
			showMessage("Field deleted. Press Ctrl+Z to undo.", "success");
			return;
		}

		if (e.key === "d" || e.key === "D") {
			const f = findField(activeFieldId);
			if (f) {
				e.preventDefault();
				duplicateField(f);
			}
			return;
		}

		if (e.key.startsWith("Arrow")) {
			const f = findField(activeFieldId);
			if (!f) return;
			e.preventDefault();
			const step = e.shiftKey ? NUDGE_STEP_BIG : NUDGE_STEP;
			let x = f.x ?? 50;
			let y = f.y ?? 50;
			if (e.key === "ArrowLeft") x -= step;
			else if (e.key === "ArrowRight") x += step;
			else if (e.key === "ArrowUp") y -= step;
			else if (e.key === "ArrowDown") y += step;
			x = Math.max(0, Math.min(100, x));
			y = Math.max(0, Math.min(100, y));
			handleFieldUpdate(activeFieldId, { x, y });
		}
	}

	function showMessage(text, type = "info") {
		message = { text, type };
		setTimeout(() => {
			message = { text: "", type: "info" };
		}, 4000);
	}

	function handleTemplateAdd(t) {
		if (t.image) setImage(t.id, t.image);
		templates = [...templates, t];
		activeTemplateId = t.id;
		sidebarOpen = false;
		showMessage(`Page "${t.name}" added.`, "success");
	}

	function handleTemplateRemove(id) {
		const removed = templates.find((t) => t.id === id);
		if (removed?.image) deleteImage(id);
		templates = templates.filter((t) => t.id !== id);
		if (activeTemplateId === id) {
			activeTemplateId = templates[0]?.id ?? null;
		}
	}

	function handleTemplateDuplicate(id) {
		const t = templates.find((x) => x.id === id);
		if (!t) return;
		const clone = {
			...t,
			id: crypto.randomUUID(),
			name: `${t.name} Copy`,
			fields: t.fields.map((f) => ({ ...f, id: crypto.randomUUID() })),
		};
		const idx = templates.findIndex((x) => x.id === id);
		templates = [
			...templates.slice(0, idx + 1),
			clone,
			...templates.slice(idx + 1),
		];
		if (t.image) setImage(clone.id, t.image);
		activeTemplateId = clone.id;
		showMessage(`Page "${clone.name}" duplicated.`, "success");
	}

	function handleTemplateImage({ id, dataUrl, width, height }) {
		if (id) {
			templates = templates.map((t) =>
				t.id === id
					? {
							...t,
							image: dataUrl,
							width: Number(width) || t.width,
							height: Number(height) || t.height
						}
					: t,
			);
			setImage(id, dataUrl);
			showMessage("Page image updated.", "success");
			return;
		}
		const t = {
			id: crypto.randomUUID(),
			name: `Page ${templates.length + 1}`,
			width: Number(width) || 842,
			height: Number(height) || 595,
			image: dataUrl,
			fields: [],
		};
		setImage(t.id, t.image);
		templates = [...templates, t];
		activeTemplateId = t.id;
		activeFieldId = null;
		sidebarOpen = false;
		showMessage(`Page "${t.name}" added.`, "success");
	}

	function handleExportProject() {
		const preset = buildPreset({
			name: projectName,
			columns,
			mapping,
			templates,
		});
		downloadPresetFile(preset, projectName);
		showMessage(
			"Project exported as JSON (page images excluded).",
			"success",
		);
	}

	function handleImportProject(preset) {
		const existingNames = new Set(templates.map((t) => t.name));
		const newTemplates = [];
		for (const t of preset.templates ?? []) {
			let name =
				String(t.name || "Imported page").trim() || "Imported page";
			let n = name;
			let i = 2;
			while (existingNames.has(n)) n = `${name} (${i++})`;
			existingNames.add(n);
			newTemplates.push({
				id: crypto.randomUUID(),
				name: n,
				width: Number(t.width) || 800,
				height: Number(t.height) || 600,
				image: null,
				fields: Array.isArray(t.fields)
					? t.fields.map((f) => ({ ...f, id: crypto.randomUUID() }))
					: [],
			});
		}
		if (newTemplates.length === 0) {
			showMessage("That project file contains no pages.", "error");
			return;
		}
		templates = [...templates, ...newTemplates];
		if (Array.isArray(preset.columns) && preset.columns.length > 0) {
			columns = [...new Set([...columns, ...preset.columns])];
		}
		for (const [k, v] of Object.entries(preset.mapping ?? {})) {
			if (!(k in mapping)) mapping[k] = v;
		}
		rebuildMapping();
		if (!activeTemplateId) activeTemplateId = newTemplates[0].id;
		sidebarOpen = false;
		activeTab = "templates";
		showMessage(
			`Imported ${newTemplates.length} page${newTemplates.length !== 1 ? "s" : ""}. Upload images to fill the canvases.`,
			"success",
		);
	}

	function handleTemplateRename(id, name) {
		templates = templates.map((t) => (t.id === id ? { ...t, name } : t));
	}

	function handleCreatePage() {
		if (
			activeTemplateId &&
			templates.some((t) => t.id === activeTemplateId)
		)
			return;
		if (templates.length > 0) {
			activeTemplateId = templates[0].id;
			activeFieldId = null;
			sidebarOpen = false;
			return;
		}
		const t = {
			id: crypto.randomUUID(),
			name: `Page ${templates.length + 1}`,
			width: 842,
			height: 595,
			image: null,
			fields: [],
		};
		templates = [...templates, t];
		activeTemplateId = t.id;
		activeFieldId = null;
		sidebarOpen = false;
	}

	function handleAddBlankPage() {
		const t = {
			id: crypto.randomUUID(),
			name: `Page ${templates.length + 1}`,
			width: 842,
			height: 595,
			image: null,
			fields: [],
		};
		templates = [...templates, t];
		activeTemplateId = t.id;
		activeFieldId = null;
		sidebarOpen = false;
	}

	function handleFieldAdd(field) {
		if (!activeTemplateId) {
			if (templates.length === 0) handleCreatePage();
			if (!activeTemplateId) return;
		}
		templates = templates.map((t) => {
			if (t.id === activeTemplateId) {
				return { ...t, fields: [...t.fields, field] };
			}
			return t;
		});
	}

	function handleAddField() {
		const field = {
			id: crypto.randomUUID(),
			key: `field_${activeFields.length + 1}`,
			x: 50,
			y: 50,
			fontFamily: "Helvetica",
			fontSize: 24,
			fontWeight: 400,
			color: "#000000",
			align: "center",
			italic: false,
			uppercase: false,
			rotation: 0,
			flipX: false,
			flipY: false,
			opacity: 1,
			showWhenEmpty: false,
		};
		handleFieldAdd(field);
		activeFieldId = field.id;
	}

	function handleFieldUpdate(fieldId, updates) {
		if (!activeTemplateId) return;
		templates = templates.map((t) => {
			if (t.id === activeTemplateId) {
				return {
					...t,
					fields: t.fields.map((f) =>
						f.id === fieldId ? { ...f, ...updates } : f,
					),
				};
			}
			return t;
		});
	}

	function handleFieldRemove(fieldId) {
		if (!activeTemplateId) return;
		templates = templates.map((t) => {
			if (t.id === activeTemplateId) {
				return {
					...t,
					fields: t.fields.filter((f) => f.id !== fieldId),
				};
			}
			return t;
		});
		if (activeFieldId === fieldId) activeFieldId = null;
	}

	let renamingFieldId = $state(null);
	let fieldRenameValue = $state("");
	let openFieldMenu = $state(null);
	let deleteFieldTarget = $state(null);
	let fieldMenuPos = $state({ left: 0, top: 0 });

	function startFieldRename(f) {
		fieldRenameValue = f.key;
		renamingFieldId = f.id;
		openFieldMenu = null;
	}

	function commitFieldRename(id) {
		const raw = fieldRenameValue.trim();
		renamingFieldId = null;
		if (!raw) return;
		const t = activeFields.find((x) => x.id === id);
		const oldKey = t?.key;
		const newKey = raw.toLowerCase().replace(/[^a-z0-9_]/g, "_");
		if (!oldKey || !newKey || oldKey === newKey) return;
		templates = templates.map((tpl) =>
			tpl.id === activeTemplateId
				? {
						...tpl,
						fields: tpl.fields.map((x) =>
							x.id === id ? { ...x, key: newKey } : x,
						),
					}
				: tpl,
		);
		if (oldKey in mapping) {
			const m = { ...mapping };
			m[newKey] = mapping[oldKey];
			delete m[oldKey];
			mapping = m;
		}
	}

	function deleteField(f) {
		openFieldMenu = null;
		deleteFieldTarget = f;
	}

	function doDeleteField() {
		const f = deleteFieldTarget;
		deleteFieldTarget = null;
		if (f) handleFieldRemove(f.id);
	}

	function duplicateField(f) {
		const copy = {
			...f,
			id: crypto.randomUUID(),
			x: Math.min(96, (f.x ?? 50) + 4),
			y: Math.min(96, (f.y ?? 50) + 4),
		};
		templates = templates.map((tpl) =>
			tpl.id === activeTemplateId
				? { ...tpl, fields: [...tpl.fields, copy] }
				: tpl,
		);
		activeFieldId = copy.id;
		openFieldMenu = null;
		showMessage(`Field "${copy.key}" duplicated.`, "success");
	}

	function onWorkspaceDeselect(e) {
		if (e.target.closest("[data-keep-selection]")) return;
		activeFieldId = null;
	}

	function findField(fieldId) {
		if (!activeTemplateId) return null;
		const t = templates.find((x) => x.id === activeTemplateId);
		return t?.fields.find((f) => f.id === fieldId) ?? null;
	}

	function copyFormat(fieldId) {
		const f = findField(fieldId);
		if (!f) return;
		clipboardFormat = {
			fontFamily: f.fontFamily,
			fontSize: f.fontSize,
			fontWeight: f.fontWeight,
			color: f.color,
			align: f.align,
			italic: f.italic,
			uppercase: f.uppercase,
			rotation: f.rotation,
			flipX: f.flipX,
			flipY: f.flipY,
			opacity: f.opacity,
			showWhenEmpty: f.showWhenEmpty,
		};
		showMessage(
			"Field format copied - select another field and use Paste format.",
			"success",
		);
	}

	function pasteFormat(fieldId) {
		const f = findField(fieldId);
		if (!f || !clipboardFormat) return;
		handleFieldUpdate(fieldId, clipboardFormat);
		showMessage("Format applied to field.", "success");
	}

	function copyField(fieldId) {
		const f = findField(fieldId);
		if (!f) return;
		clipboardFields = [{ ...f }];
		clipboardMode = "copy";
		showMessage("Field copied - paste it on any page.", "success");
	}

	function cutField(fieldId) {
		const f = findField(fieldId);
		if (!f) return;
		clipboardFields = [{ ...f }];
		clipboardMode = "cut";
		handleFieldRemove(fieldId);
		showMessage("Field cut - paste it on any page.", "success");
	}

	function pasteFields() {
		if (clipboardFields.length === 0) return;
		if (!activeTemplateId) {
			showMessage("Select a page first, then paste.", "error");
			return;
		}
		const pasted = clipboardFields.map((f, i) => ({
			...f,
			id: crypto.randomUUID(),
			x: Math.max(2, Math.min(96, (f.x ?? 50) + i * 2)),
			y: Math.max(2, Math.min(96, (f.y ?? 50) + i * 2)),
		}));
		templates = templates.map((t) =>
			t.id === activeTemplateId
				? { ...t, fields: [...t.fields, ...pasted] }
				: t,
		);
		activeFieldId = pasted[0].id;
		if (clipboardMode === "cut") clipboardFields = [];
		showMessage(
			`Pasted ${pasted.length} field${pasted.length !== 1 ? "s" : ""}.`,
			"success",
		);
	}

	function handleDataLoad(loadedColumns, rows) {
		mapping = {};
		previewIndex = 0;
		activeFieldId = null;
		columns = loadedColumns;
		participants = rows;
		rebuildMapping();
		activeTab = "data";
		showMessage(
			`Loaded ${rows.length} rows with ${loadedColumns.length} columns.`,
			"success",
		);
	}

	function rebuildMapping() {
		const allKeys = new Set();
		for (const t of templates) {
			for (const f of t.fields) allKeys.add(f.key);
		}
		const m = {};
		for (const key of allKeys) {
			const found = columns.find(
				(c) =>
					c.toLowerCase().replace(/[\s_-]/g, "") ===
					key.toLowerCase().replace(/[\s_-]/g, ""),
			);
			if (found) m[key] = found;
		}
		mapping = m;
	}

	function addRow() {
		const row = {};
		for (const col of columns) row[col] = "";
		participants = [...participants, row];
	}

	function removeRow(index) {
		participants = participants.filter((_, i) => i !== index);
	}

	function updateField(index, key, value) {
		participants = participants.map((r, i) =>
			i === index ? { ...r, [key]: value } : r,
		);
	}

	function renameColumn(oldName, newName) {
		columns = columns.map((c) => (c === oldName ? newName : c));
		participants = participants.map((r) => {
			const row = { ...r };
			if (oldName in row) {
				row[newName] = row[oldName];
				delete row[oldName];
			}
			return row;
		});
		for (const key in mapping) {
			if (mapping[key] === oldName) mapping[key] = newName;
		}
	}

	function addColumn(name) {
		columns = [...columns, name];
		participants = participants.map((r) => ({ ...r, [name]: "" }));
	}

	function removeColumn(name) {
		columns = columns.filter((c) => c !== name);
		participants = participants.map((r) => {
			const row = { ...r };
			delete row[name];
			return row;
		});
		for (const key in mapping) {
			if (mapping[key] === name) delete mapping[key];
		}
	}

	let tabs = [
		{ id: "templates", label: "Pages", icon: Image },
		{ id: "data", label: "Data", icon: Table },
		{ id: "preview", label: "Preview", icon: Eye },
	];
</script>

<div
	class="h-screen flex flex-col overflow-hidden"
	onclick={onWorkspaceDeselect}
>
	<Header>
		<div class="flex items-center justify-between gap-1.5 sm:gap-3 w-full min-w-0">
			<div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
				<span class="w-px h-6 bg-black/10 shrink-0 hidden sm:block" aria-hidden="true"></span>

				{#if !hydrated}
					<span class="skeleton h-4 w-40 max-w-[30vw] rounded" aria-busy="true" aria-label="Loading project name"></span>
				{:else if editingName}
					<input
						bind:this={nameInput}
						type="text"
						value={projectName}
						maxlength="80"
						class="h-7 px-2 rounded-lg border border-black/15 text-[13px] font-medium text-ink w-52 max-w-[45vw] sm:w-56 outline-none focus:border-lime-700/50"
						onkeydown={(e) => {
							if (e.key === "Enter") commitRename(e);
							if (e.key === "Escape") editingName = false;
						}}
						onblur={commitRename}
					/>
				{:else}
					<button
						type="button"
						class="flex items-center gap-1.5 h-7 px-1.5 rounded-lg text-[13px] font-medium text-ink min-w-0 max-w-[32vw] sm:max-w-[36ch] hover:bg-black/5 transition-colors"
						title="Rename project"
						onclick={(e) => {
							e.stopPropagation();
							startRename();
						}}
					>
						<span class="truncate">{projectName || "Untitled Project"}</span>
						<Pencil size={12} class="text-faint shrink-0 hidden sm:inline" />
					</button>
				{/if}

				{#if saveStatus !== "idle"}
					<span class="whitespace-nowrap text-[11px] text-faint hidden sm:inline">
						{saveStatus === "saving"
							? "Saving…"
							: saveStatus === "saved"
								? "Saved"
								: "Save failed"}
					</span>
				{/if}

				<span class="flex items-center gap-0.5 shrink-0">
					<button
						type="button"
						class="icon-btn disabled:opacity-30 disabled:pointer-events-none"
						title="Undo (Ctrl+Z)"
						aria-label="Undo"
						disabled={!canUndo}
						onclick={(e) => {
							e.stopPropagation();
							undo();
						}}
					><Undo2 size={15} /></button>
					<button
						type="button"
						class="icon-btn disabled:opacity-30 disabled:pointer-events-none"
						title="Redo (Ctrl+Shift+Z)"
						aria-label="Redo"
						disabled={!canRedo}
						onclick={(e) => {
							e.stopPropagation();
							redo();
						}}
					><Redo2 size={15} /></button>
				</span>

				<span class="w-px h-6 bg-black/10 shrink-0" aria-hidden="true"></span>

				<ProjectFileMenu
					{projectName}
					{saveStatus}
					pageCount={templates.length}
					onExportProject={handleExportProject}
					onImportProject={handleImportProject}
					onShowShortcuts={() => (showShortcuts = true)}
					onError={(msg) => showMessage(msg, "error")}
				/>
			</div>

			<div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
				<GenerateMenu
					{templates}
					{participants}
					{mapping}
					onDone={() => showMessage("Certificates generated!", "success")}
					onError={(msg) => showMessage(msg, "error")}
				/>

				<button
					class="lg:hidden icon-btn"
					aria-label="Toggle pages"
					onclick={() => (sidebarOpen = !sidebarOpen)}
				>
					<Menu size={16} />
				</button>
			</div>
		</div>
	</Header>

	{#if message.text}
		<div
			class="toast {message.type === 'error'
				? 'toast-error'
				: 'toast-success'}"
		>
			{message.text}
		</div>
	{/if}

	{#if deleteFieldTarget}
		<ConfirmDialog
			open
			title="Delete field?"
			message={`Delete field "${deleteFieldTarget.key}"? This removes it from the page layout and the field list.`}
			onConfirm={doDeleteField}
			onCancel={() => (deleteFieldTarget = null)}
		/>
	{/if}

	<ShortcutHelp bind:open={showShortcuts} />

	<div class="flex flex-1 min-h-0 relative">
		{#if !hydrated}
			<div
				class="absolute inset-0 z-[6] bg-white flex"
				aria-busy="true"
				aria-label="Loading workspace"
			>
				<div class="hidden lg:block w-64 flex-shrink-0 border-r border-line p-2.5 space-y-1.5">
					<div class="skeleton h-4 w-12 rounded mb-2"></div>
					{#each [0, 1, 2, 3] as _, i (i)}
						<div class="skeleton h-9 rounded-xl"></div>
					{/each}
				</div>
				<div class="flex-1 min-w-0 bg-panel-hi p-4 sm:p-6">
					<div class="skeleton h-5 w-44 rounded mb-3"></div>
					<div class="skeleton h-[55vh] rounded-2xl"></div>
				</div>
			</div>
		{/if}

		{#if sidebarOpen}
			<div
				class="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
				onclick={() => (sidebarOpen = false)}
				role="button"
				tabindex="-1"
				onkeydown={(e) => e.key === "Escape" && (sidebarOpen = false)}
			></div>
		{/if}

		<aside
			class="fixed lg:static top-12 bottom-0 left-0 z-50 w-60 lg:w-64 bg-white border-r border-line flex-shrink-0 flex flex-col
				transform transition-transform duration-200
				{sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
			data-keep-selection
		>
			<nav class="p-2.5 flex flex-col gap-1 min-h-0 overflow-y-auto flex-1">
				<p class="cv-prop-label px-3 pt-1 pb-2">
					Tools
				</p>
				{#each tabs as tab}
					<button
onclick={() => {
							activeTab = tab.id;
							sidebarOpen = false;
							openFieldMenu = null;
							showFieldPanel = false;
						}}
class="flex items-center justify-start gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors
						{activeTab === tab.id
						? 'bg-accent/10 text-accent-strong'
						: 'text-soft hover:text-ink hover:bg-black/5'}"
			>
					<tab.icon size={16} strokeWidth={2} />
					<span class="inline">{tab.label}</span>
{#if tab.id === "data" && participants.length > 0}
					<span
						class="ml-auto inline-flex px-1.5 py-0.5 rounded-lg text-[10px] font-mono {activeTab ===
							tab.id
							? 'bg-accent text-white'
							: 'bg-black/10 text-soft'}"
					>
						{participants.length}
					</span>
				{/if}
				{#if tab.id === "templates" && templates.length > 0}
					<span
						class="ml-auto inline-flex px-1.5 py-0.5 rounded-lg text-[10px] font-mono {activeTab ===
							tab.id
							? 'bg-accent text-white'
							: 'bg-black/10 text-soft'}"
					>
						{templates.length}
					</span>
				{/if}
					</button>
				{/each}

				{#if activeTab === "templates" && activeTemplate}
					<div
						class="{sidebarOpen
							? 'block'
							: 'hidden'} lg:block mt-4 border-t border-line pt-3"
					>
						<div
							class="flex items-center justify-between px-2 mb-1.5"
						>
							<p class="cv-prop-label !mb-0">Fields</p>
							<div class="flex items-center gap-1">
								<span class="text-[10px] font-mono text-faint"
									>{activeFields.length}</span
								>
								{#if clipboardFields.length > 0}
									<button
										type="button"
										onclick={pasteFields}
										class="icon-btn !w-7 !h-7"
										title="Paste {clipboardFields.length} field{clipboardFields.length !==
										1
											? 's'
											: ''} into this page"
										aria-label="Paste fields"
										><ClipboardPaste size={14} /></button
									>
								{/if}
								<button
									type="button"
									onclick={handleAddField}
									class="icon-btn !w-7 !h-7"
									title="Add field to this page"
									aria-label="Add field to this page"
									><Plus
										size={14}
										strokeWidth={2.4}
									/></button
								>
							</div>
						</div>
						{#if activeFields.length === 0}
							<p class="px-2 pb-1 text-[11px] text-faint">
								No fields on this page yet.
							</p>
						{:else}
							<div class="space-y-0.5">
								{#each activeFields as f (f.id)}
									{#if renamingFieldId === f.id}
										<div class="px-1 py-0.5">
											<input
												autofocus
												type="text"
												bind:value={fieldRenameValue}
												placeholder={f.key}
												class="input !h-7 !py-0.5 !px-1.5 text-xs font-semibold"
												onkeydown={(e) => {
													if (e.key === "Enter")
														commitFieldRename(f.id);
													if (e.key === "Escape")
														renamingFieldId = null;
												}}
												onblur={() =>
													commitFieldRename(f.id)}
											/>
										</div>
									{:else}
										<div
											class="group relative flex items-center"
											data-field-menu={f.id}
										>
											<button
												type="button"
												class="flex items-center gap-2 w-full min-w-0 px-2 py-1.5 rounded-md text-left transition-colors
													{f.id === activeFieldId
													? 'bg-accent/10 text-accent-strong'
													: 'text-soft hover:bg-black/5 hover:text-ink'}"
												title="Select field {f.key}"
												onclick={() => {
													activeFieldId =
														activeFieldId === f.id
															? null
															: f.id;
													showFieldPanel = activeFieldId
														? true
														: false;
													openFieldMenu = null;
													sidebarOpen = false;
												}}
											>
												<Type
													size={12}
													strokeWidth={2}
													class="shrink-0"
												/>
												<span
													class="truncate flex-1 text-xs font-medium"
													>{f.key}</span
												>
												<span
													class="text-[10px] font-mono text-faint shrink-0"
													>{(f.x ?? 0).toFixed(0)}% · {(
														f.y ?? 0
													).toFixed(0)}%</span
												>
											</button>
											<button
												type="button"
												class="shrink-0 w-7 h-7 grid place-items-center rounded-md text-faint hover:text-ink hover:bg-black/5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
												title="Field actions"
												aria-label="Field actions for {f.key}"
												onclick={(e) => {
													e.stopPropagation();
													if (
														openFieldMenu === f.id
													) {
														openFieldMenu = null;
														return;
													}
													const r =
														e.currentTarget.getBoundingClientRect();
													const menuH = 248;
													openFieldMenu = null;
													const menuW = 192;
												fieldMenuPos = {
													left: Math.min(
														Math.max(r.right - 4, menuW + 8),
														window.innerWidth - 8
													),
													top:
															r.bottom +
																8 +
																menuH >
															window.innerHeight
																? r.top -
																	menuH -
																	8
																: r.bottom + 6,
													};
													openFieldMenu = f.id;
												}}
												><MoreVertical
													size={13}
												/></button
											>
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</nav>

		<div class="p-2.5 border-t border-line shrink-0">
			{#if !authReady}
				<div
					class="skeleton h-9 w-full rounded-lg"
					aria-busy="true"
					aria-label="Checking sign-in state"
				></div>
			{:else if user}
				<ProfileMenu {user} placement="up" />
			{:else if authConfigured}
				<a
					href="/auth/google"
					class="btn btn-ghost w-full justify-center py-1.5 text-xs"
					>Sign in</a
				>
			{/if}
		</div>
		</aside>

		{#if openFieldMenu}
			{@const fm = findField(openFieldMenu)}
			{#if fm}
				<div
					class="fixed z-[70] w-48 card card-hi p-1 fade-in shadow-l2"
					style="left: {fieldMenuPos.left}px; top: {fieldMenuPos.top}px; transform: translateX(-100%);"
					data-field-menu
					data-keep-selection
				>
					<button
						type="button"
						class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left text-soft hover:text-ink hover:bg-black/5"
						onclick={() => startFieldRename(fm)}
					>
						<Pencil size={13} /> Rename
					</button>
					<button
						type="button"
						class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left text-soft hover:text-ink hover:bg-black/5"
						onclick={() => {
							copyFormat(fm.id);
							openFieldMenu = null;
						}}
					>
						<Wand2 size={13} /> Copy style
					</button>
					<button
						type="button"
						class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left text-soft hover:text-ink hover:bg-black/5 disabled:opacity-40"
						disabled={!clipboardFormat}
						onclick={() => {
							pasteFormat(fm.id);
							openFieldMenu = null;
						}}
					>
						<Wand2 size={13} /> Paste style
					</button>
					<button
						type="button"
						class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left text-soft hover:text-ink hover:bg-black/5"
						onclick={() => {
							copyField(fm.id);
							openFieldMenu = null;
						}}
					>
						<Copy size={13} /> Copy field
					</button>
					<button
						type="button"
						class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left text-soft hover:text-ink hover:bg-black/5"
						onclick={() => duplicateField(fm)}
					>
						<CopyPlus size={13} /> Duplicate
					</button>
					<button
						type="button"
						class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left text-red-600 hover:text-red-700 hover:bg-red-500/10"
						onclick={() => deleteField(fm)}
					>
						<Trash2 size={13} /> Delete
					</button>
				</div>
			{/if}
		{/if}

		<div class="flex-1 relative flex flex-col min-w-0 cv-canvas">
			<div class="flex-1 min-h-0">
				{#if activeTab === "templates"}
					<TemplateCanvas
						template={activeTemplate}
						bind:fields={activeFields}
						bind:activeFieldId
						bind:showFieldPanel
						onFieldAdd={handleFieldAdd}
						onFieldRemove={handleFieldRemove}
						onFieldUpdate={handleFieldUpdate}
						onImage={handleTemplateImage}
						onCreatePage={handleCreatePage}
						onCopyFormat={copyFormat}
						onCopyField={copyField}
						onCutField={cutField}
						onPasteFormat={pasteFormat}
						hasFormat={!!clipboardFormat}
						participantData={participants[0] ?? null}
						{mapping}
					/>
				{:else if activeTab === "data"}
					<div class="h-full flex flex-col p-3 sm:p-4 min-h-0">
						<div
							class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 shrink-0"
						>
							<div>
								<p class="section-label">Participant Data</p>
								<p class="text-xs text-faint mt-1">
									{participants.length} rows
								</p>
							</div>
							<ImportData
								onDataLoaded={handleDataLoad}
								onError={(msg) => showMessage(msg, "error")}
							/>
						</div>

						{#if columns.length > 0}
							<div class="mb-3 card p-4 shrink-0">
								<DataMapping
									{templates}
									{columns}
									bind:mapping
									onAutoMap={rebuildMapping}
								/>
							</div>
						{/if}

						<div
							class="flex-1 min-h-0 card overflow-hidden flex flex-col"
						>
							<DataTable
								{columns}
								{participants}
								onAddRow={addRow}
								onRemoveRow={removeRow}
								onUpdateField={updateField}
								onRenameColumn={renameColumn}
								onAddColumn={addColumn}
								onRemoveColumn={removeColumn}
							/>
						</div>
					</div>
				{:else if activeTab === "preview"}
					<div class="h-full overflow-y-auto p-3 sm:p-4">
						<Preview
							{templates}
							{participants}
							{mapping}
							bind:currentIndex={previewIndex}
						/>
					</div>
				{/if}
			</div>

			{#if activeTab === "templates"}
				<div
					class="fixed bottom-3 left-0 right-0 flex justify-center pointer-events-none z-20 px-3"
				>
					<div
						class="pointer-events-auto shadow-l2 rounded-2xl overflow-hidden max-w-full p-1"
					>
						<TemplateList
							bind:templates
							bind:activeTemplateId
							onAdd={handleTemplateAdd}
							onCreatePage={handleAddBlankPage}
							onSelect={(id) => {
								activeTemplateId = id;
								activeFieldId = null;
								showFieldPanel = false;
								sidebarOpen = false;
							}}
							onDuplicate={handleTemplateDuplicate}
							onRemove={handleTemplateRemove}
							onRename={handleTemplateRename}
							onReplaceImage={handleTemplateImage}
						/>
					</div>
				</div>
			{/if}
		</div>

		{#if activeTab === "templates" && activeTemplate}
			<aside
				class="hidden lg:flex w-72 bg-raised border-l border-line flex-shrink-0 flex-col min-h-0"
				data-keep-selection
			>
				<div class="cv-tabbar">
					<button class="on">Design</button>
				</div>
				<div class="flex-1 overflow-y-auto min-h-0">
					<FieldEditor
						fields={activeFields}
						bind:activeFieldId
						onFieldUpdate={handleFieldUpdate}
						onFieldRemove={handleFieldRemove}
						onCopyFormat={copyFormat}
						onCopyField={copyField}
						onCutField={cutField}
						onPasteFormat={pasteFormat}
						hasFormat={!!clipboardFormat}
						allFieldKeys={fieldKeys}
					/>
				</div>
			</aside>
		{/if}
	</div>
</div>
