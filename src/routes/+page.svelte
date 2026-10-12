<script>
	import {
		ArrowDown,
		ArrowRight,
		Award,
		BadgeCheck,
		Copy,
		Download,
		Eye,
		FileImage,
		FilePlus2,
		FileSpreadsheet,
		FileText,
		Layers,
		LoaderCircle,
		MousePointer2,
		Pencil,
		Plus,
		Sparkles,
		TableProperties,
		Trash2,
		Upload,
		WandSparkles,
		Zap
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { buildPreset, downloadPresetFile, parsePreset } from '$lib/preset.js';

	let user = $state(null);
	let authState = $state('loading');
	let configured = $state(false);
	let dbOk = $state(true);
	let notice = $state(null);

	async function loadAuth() {
		try {
			const res = await fetch('/api/me');
			const data = await res.json();
			user = data.user ?? null;
			configured = Boolean(data.configured);
			dbOk = Boolean(data.db?.ok);
			authState = 'ready';
			if (configured && !dbOk) notice = 'dbdown';
			else if (!configured) notice = 'unconfigured';
			if (user) loadProjects();
		} catch {
			authState = 'ready';
		}
	}

	let projects = $state([]);
	let loading = $state(false);
	let dashboardBusy = $state(false);
	let message = $state({ text: '', type: 'info' });

	let renamingId = $state(null);
	let renameValue = $state('');
	let deleteTarget = $state(null);

	let importInput = $state(null);

	function showMessage(text, type = 'info') {
		message = { text, type };
		setTimeout(() => {
			message = { text: '', type: 'info' };
		}, 4000);
	}

	function formatDate(ts) {
		if (!ts) return '-';
		try {
			return new Date(Number(ts)).toLocaleString();
		} catch {
			return '-';
		}
	}

	async function loadProjects() {
		loading = true;
		try {
			const res = await fetch('/api/projects');
			const data = await res.json();
			projects = Array.isArray(data.projects) ? data.projects : [];
		} catch {
			projects = [];
		} finally {
			loading = false;
		}
	}

	async function createProject() {
		if (dashboardBusy) return;
		dashboardBusy = true;
		try {
			const res = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const data = await res.json();
			if (res.ok && data.id) {
				goto(`/project/${data.id}`);
				return;
			}
			notice = 'error';
		} catch {
			notice = 'error';
		} finally {
			dashboardBusy = false;
		}
	}

	onMount(() => {
		loadAuth();
		const p = new URLSearchParams(window.location.search);
		const kind = p.get('auth');
		if (kind === 'required' || kind === 'error' || kind === 'unconfigured') notice = kind;
	});

	async function handleImport(e) {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file || dashboardBusy) return;
		dashboardBusy = true;
		try {
			const preset = parsePreset(await file.text());
			if (!preset) {
				showMessage('Not a valid project/preset file.', 'error');
				return;
			}
			const templates = (preset.templates ?? []).map((t) => ({
				id: crypto.randomUUID(),
				name: String(t.name || 'Imported page').trim() || 'Imported page',
				width: Number(t.width) || 800,
				height: Number(t.height) || 600,
				image: null,
				fields: Array.isArray(t.fields)
					? t.fields.map((f) => ({ ...f, id: crypto.randomUUID() }))
					: []
			}));
			if (templates.length === 0) {
				showMessage('That project file contains no pages.', 'error');
				return;
			}
			const name = String(
				preset.name || file.name.replace(/\.certves\.json$|\.json$/i, '') || 'Imported project'
			)
				.trim()
				.slice(0, 200);
			const res = await fetch('/api/project', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					data: {
						name,
						templates,
						participants: [],
						columns: Array.isArray(preset.columns) ? preset.columns : [],
						mapping: preset.mapping && typeof preset.mapping === 'object' ? preset.mapping : {}
					}
				})
			});
			const data = await res.json();
			if (res.ok && data.id) {
				showMessage('Project imported from file.', 'success');
				goto(`/project/${data.id}`);
				return;
			}
			showMessage('Could not import project.', 'error');
		} catch {
			showMessage('Could not read that file.', 'error');
		} finally {
			dashboardBusy = false;
		}
	}

	function startRename(p) {
		renamingId = p.id;
		renameValue = p.name;
	}

	async function confirmRename() {
		if (!renamingId) return;
		const id = renamingId;
		const name = renameValue.trim();
		renamingId = null;
		if (!name) return;
		try {
			const res = await fetch(`/api/project?id=${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (res.ok) {
				projects = projects.map((p) => (p.id === id ? { ...p, name } : p));
				showMessage('Project renamed.', 'success');
			} else {
				showMessage('Could not rename project.', 'error');
			}
		} catch {
			showMessage('Could not rename project.', 'error');
		}
	}

	async function deleteProject(id) {
		try {
			const res = await fetch(`/api/project?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				projects = projects.filter((p) => p.id !== id);
				showMessage('Project deleted.', 'success');
			} else {
				showMessage('Could not delete project.', 'error');
			}
		} catch {
			showMessage('Could not delete project.', 'error');
		}
	}

	function requestDelete(id) {
		deleteTarget = id;
	}

	function cancelDelete() {
		deleteTarget = null;
	}

	function doDelete() {
		const id = deleteTarget;
		deleteTarget = null;
		if (id) deleteProject(id);
	}

	async function fetchProject(id) {
		const res = await fetch(`/api/project?id=${id}`);
		const { project } = await res.json();
		return project;
	}

	async function exportProject(p) {
		try {
			const project = await fetchProject(p.id);
			if (!project) {
				showMessage('Could not load project.', 'error');
				return;
			}
			const data = project.data && typeof project.data === 'object' ? project.data : {};
			const preset = buildPreset({
				name: project.name || p.name,
				columns: Array.isArray(data.columns) ? data.columns : [],
				mapping: data.mapping && typeof data.mapping === 'object' ? data.mapping : {},
				templates: Array.isArray(data.templates) ? data.templates : []
			});
			downloadPresetFile(preset, project.name || p.name);
			showMessage('Project exported as JSON.', 'success');
		} catch {
			showMessage('Could not export project.', 'error');
		}
	}

	async function duplicateProject(p) {
		if (dashboardBusy) return;
		dashboardBusy = true;
		try {
			const project = await fetchProject(p.id);
			if (!project) {
				showMessage('Could not load project.', 'error');
				return;
			}
			const data = project.data && typeof project.data === 'object' ? project.data : {};
			const newName = `${project.name || p.name} Copy`.slice(0, 200);
			const templates = Array.isArray(data.templates)
				? data.templates.map(({ image, ...t }) => ({ ...t, id: crypto.randomUUID() }))
				: [];
			const res = await fetch('/api/project', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newName,
					data: { ...data, name: newName, templates }
				})
			});
			const resData = await res.json();
			if (res.ok && resData.id) {
				await loadProjects();
				showMessage('Project duplicated.', 'success');
			} else {
				showMessage('Could not duplicate project.', 'error');
			}
		} catch {
			showMessage('Could not duplicate project.', 'error');
		} finally {
			dashboardBusy = false;
		}
	}

	const noticeCopy = {
		unconfigured: {
			title: 'Setup needed.',
			body: 'Google sign-in and the database aren\'t configured yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (and Turso URL) to the app\'s .env file. Until then, cert generation works fully offline.',
			tone: 'border-amber-500/30 bg-amber-500/10 text-amber-700/90'
		},
		dbdown: {
			title: 'Database not reachable.',
			body: 'The app could not open its SQLite database. Make sure the data directory is writable, or fix DATABASE_URL / TURSO_DATABASE_URL in the app\'s .env file.',
			tone: 'border-red-500/30 bg-red-500/10 text-red-600/90'
		},
		required: {
			title: 'Sign in required.',
			body: 'The editor is locked until you sign in with Google. Your projects stay synced to your account.',
			tone: 'border-accent/40 bg-accent/10 text-accent-strong'
		},
		error: {
			title: 'Sign in failed.',
			body: 'The Google sign-in didn\'t complete. Try again - if it keeps failing, double-check the credentials and that the authorized redirect URI ends with /auth/callback for this domain.',
			tone: 'border-red-500/30 bg-red-500/10 text-red-600/90'
		}
	};

	let features = [
		{
			icon: Layers,
			title: 'Page canvas',
			text: 'Upload an image for every page and drag fields anywhere on the canvas with live positioning.',
			span: '2',
			visual: 'canvas'
		},
		{
			icon: FileSpreadsheet,
			title: 'Import data',
			text: 'Bring participants from CSV or XLSX - pick any sheet, it just works.',
			span: '1',
			visual: 'chips'
		},
		{
			icon: WandSparkles,
			title: 'Smart mapping',
			text: 'Fields auto-match your columns. Fine-tune in one glance.',
			span: '1',
			visual: 'chips'
		},
		{
			icon: Eye,
			title: 'Live preview',
			text: 'Flip through every participant with real certificate rendering.',
			span: '1',
			visual: 'chips'
		},
		{
			icon: Zap,
			title: 'Bulk export',
			text: 'Generate one PDF - or a thousand as a single ZIP file.',
			span: '1',
			visual: 'stack'
		}
	];

	let steps = [
		{ num: '01', icon: FileImage, title: 'Upload a page', text: 'PNG, JPEG or WebP. Drop one design - photos, logos and all.' },
		{ num: '02', icon: TableProperties, title: 'Map your data', text: 'Import participants and bind fields to columns. Auto-mapping does the heavy lifting.' },
		{ num: '03', icon: Zap, title: 'Generate & export', text: 'Preview, then generate. PDF per person, or every certificate zipped up.' }
	];
</script>

<Navbar {user} {configured} onNewProject={createProject} authLoading={authState === 'loading'} />

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 rounded-full focus:bg-accent focus:text-accent-ink text-sm font-medium"
>Skip to content</a>

<main id="main" class="relative scroll-mt-20">
	{#if authState === 'loading'}
		<div
			class="pt-40 sm:pt-44 pb-24 px-4 sm:px-6"
			aria-busy="true"
			aria-label="Preparing certves"
		>
			<div class="max-w-2xl mx-auto flex flex-col items-center">
				<div class="skeleton h-9 w-9 rounded-xl mb-8"></div>
				<div class="skeleton h-10 w-64 max-w-[80vw] rounded mb-4"></div>
				<div class="skeleton h-10 w-80 max-w-[80vw] rounded mb-9"></div>
				<div class="skeleton h-4 w-full max-w-sm rounded mb-2.5"></div>
				<div class="skeleton h-4 w-2/3 max-w-sm rounded mb-11"></div>
				<div class="skeleton h-11 w-44 rounded-full"></div>
			</div>
		</div>
	{:else}
	{#if user}
		<!-- Dashboard -->
		<section class="pt-28 sm:pt-32 pb-20 px-4 sm:px-6">
			<div class="max-w-5xl mx-auto">
				<div class="flex flex-wrap items-end justify-between gap-3 mb-8">
					<div class="min-w-0">
						<p class="section-label">Dashboard</p>
						<h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-ink mt-2">
							Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
						</h1>
						<p class="text-sm text-soft mt-1">
							{projects.length === 0
								? 'Start something new.'
								: `${projects.length} project${projects.length !== 1 ? 's' : ''} · each page is one uploaded image`}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<button
							onclick={() => importInput?.click()}
							class="btn btn-outline"
							disabled={dashboardBusy}
						>
							<Upload size={15} />
							Import
						</button>
						<button onclick={createProject} class="btn btn-accent" disabled={dashboardBusy}>
							{#if dashboardBusy}
								<LoaderCircle size={15} class="spin" />
							{:else}
								<Plus size={15} strokeWidth={2.4} />
							{/if}
							New project
						</button>
					</div>
				</div>

				{#if message.text}
					<div class="toast {message.type === 'error' ? 'toast-error' : 'toast-success'}">
						{message.text}
					</div>
				{/if}

				{#if deleteTarget}
					<ConfirmDialog
						open
						title="Delete this project?"
						message="This will permanently delete the project and all of its pages and fields. This can't be undone."
						onConfirm={doDelete}
						onCancel={cancelDelete}
					/>
				{/if}

				{#if loading}
					<div class="grid sm:grid-cols-2 gap-3" aria-busy="true" aria-label="Loading projects">
						{#each [0, 1, 2, 3] as _, i (i)}
							<div class="card p-4 flex flex-col gap-3">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 space-y-2">
										<div class="skeleton h-4 w-36 max-w-[80%] rounded"></div>
										<div class="skeleton h-3 w-24 rounded"></div>
									</div>
									<div class="flex items-center gap-1">
										<div class="skeleton h-8 w-8 rounded-lg"></div>
										<div class="skeleton h-8 w-8 rounded-lg"></div>
										<div class="skeleton h-8 w-8 rounded-lg"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else if projects.length === 0}
					<div class="card p-8 sm:p-12 text-center">
						<div class="w-16 h-16 bg-panel-hi rounded-2xl flex items-center justify-center mx-auto mb-4 border border-line">
							<FilePlus2 size={26} class="text-faint" />
						</div>
						<h2 class="text-base font-semibold text-ink mb-1">No projects yet</h2>
						<p class="text-sm text-soft mb-5">Create a project, upload a page for every design, map your participant data, then generate certificates. Or import a saved project file.</p>
						<div class="flex flex-wrap items-center justify-center gap-2">
							<button onclick={createProject} class="btn btn-accent" disabled={dashboardBusy}>
								<Plus size={15} strokeWidth={2.4} />
								Create your first project
							</button>
							<button onclick={() => importInput?.click()} class="btn btn-outline" disabled={dashboardBusy}>
								<Upload size={15} />
								Import a project file
							</button>
						</div>
					</div>
				{:else}
					<div class="grid sm:grid-cols-2 gap-3">
						{#each projects as p (p.id)}
							<div
								role="button"
								tabindex="0"
								onclick={() => {
									if (renamingId === p.id) return;
									goto(`/project/${p.id}`);
								}}
								onkeydown={(e) => {
									if (renamingId === p.id) return;
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										goto(`/project/${p.id}`);
									}
								}}
								class="card card-hover text-left p-4 flex flex-col gap-3 cursor-pointer group"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										{#if renamingId === p.id}
											<input
												type="text"
												bind:value={renameValue}
												onclick={(e) => e.stopPropagation()}
												onkeydown={(e) => {
													if (e.key === 'Enter') confirmRename();
													if (e.key === 'Escape') renamingId = null;
												}}
												onblur={confirmRename}
												class="input !py-1 !px-2 text-sm font-semibold"
											/>
										{:else}
											<h3 class="text-sm font-semibold text-ink truncate group-hover:text-accent-strong transition-colors">{p.name}</h3>
										{/if}
										<p class="text-[11px] text-faint mt-1">
											{p.pageCount} page{p.pageCount !== 1 ? 's' : ''} · updated {formatDate(p.updatedAt)}
										</p>
									</div>
									<div class="flex items-center gap-1 shrink-0">
										<button
											onclick={(e) => {
												e.stopPropagation();
												exportProject(p);
											}}
											class="icon-btn w-8 h-8"
											title="Export project as JSON"
											aria-label="Export project"
										><Download size={14} /></button>
										<button
											onclick={(e) => {
												e.stopPropagation();
												duplicateProject(p);
											}}
											class="icon-btn w-8 h-8"
											title="Duplicate project"
											aria-label="Duplicate project"
										><Copy size={14} /></button>
										<button
											onclick={(e) => {
												e.stopPropagation();
												renamingId === p.id ? confirmRename() : startRename(p);
											}}
											class="icon-btn w-8 h-8"
											title="Rename project"
											aria-label="Rename project"
										><Pencil size={14} /></button>
										<button
											onclick={(e) => {
												e.stopPropagation();
												requestDelete(p.id);
											}}
											class="icon-btn w-8 h-8"
											title="Delete project"
											aria-label="Delete project"
										><Trash2 size={14} /></button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<input
				bind:this={importInput}
				type="file"
				accept=".json,application/json"
				onchange={handleImport}
				class="hidden"
			/>
		</section>
	{:else}
	<!-- Hero -->
	<section class="pt-36 sm:pt-44 pb-20 px-4 sm:px-6">
		<div class="max-w-3xl mx-auto text-center">
			{#if authState === 'ready'}
				{#if notice}
					<div
						class="mx-auto mb-8 max-w-lg px-4 py-3 rounded-2xl border text-left {noticeCopy[notice].tone}"
					>
						<p class="text-xs leading-relaxed">
							<strong class="font-semibold">{noticeCopy[notice].title}</strong> {noticeCopy[notice].body}
						</p>
						{#if notice === 'unconfigured' || notice === 'dbdown'}
							<code class="font-mono text-[10px] bg-black/15 rounded-md px-1.5 py-0.5">
								{notice === 'unconfigured'
									? 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TURSO_DATABASE_URL (optional)'
									: 'DATABASE_URL / TURSO_DATABASE_URL'}
							</code>
						{/if}
					</div>
				{/if}
			{/if}

			<!-- <div class="flex justify-center mb-6">
				<span class="chip chip-accent">Certificate Generator</span>
			</div> -->

			<h1 class="hero-title">
				Design once.<br />
				<span class="text-grad">Generate a thousand.</span>
			</h1>

			<p class="hero-sub mt-6 mx-auto max-w-xl">
				Upload a page, drop in your participant list, and certves stamps
				pixel-perfect PDF certificates - automatically. No design tools, no copy-paste marathons.
			</p>

			<div class="flex flex-wrap items-center justify-center gap-3 mt-9">
				<a href="/auth/google?next=/" class="btn btn-accent text-[0.875rem] px-6 py-2.5">
					Open Project <ArrowRight size={16} />
				</a>
				<a href="#how" class="btn btn-outline px-6 py-2.5">
					How it works <ArrowDown size={15} />
				</a>
			</div>

			<div class="flex flex-wrap items-center justify-center gap-2 mt-10">
				<span class="chip">Unlimited participants</span>
				<span class="chip">CSV · XLSX</span>
				<span class="chip">PDF + ZIP export</span>
				<span class="chip chip-accent">Free to use</span>
			</div>
		</div>
	</section>

	<!-- Features bento -->
	<section id="features" class="px-4 sm:px-6 pb-16 scroll-mt-24">
		<div class="max-w-5xl mx-auto">
			<div class="space-y-2 mb-8">
				<p class="section-label">Features</p>
				<h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Everything a certificate run needs</h2>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each features as f}
					<div class="card card-hover p-5 {f.span === '2' ? 'lg:col-span-2' : ''}">
						<div class="flex items-center gap-2.5 mb-8">
							<span class="w-9 h-9 rounded-xl grid place-items-center border border-black/10 bg-panel-hi text-accent-strong">
								<f.icon size={17} strokeWidth={1.8} />
							</span>
							<h3 class="text-[15px] font-semibold tracking-tight text-ink">{f.title}</h3>
						</div>

						{#if f.visual === 'canvas'}
							<div class="relative mx-auto max-w-sm mb-8">
								<div class="relative aspect-[4/3] rounded-xl border border-black/10 bg-white overflow-hidden shadow-l2">
									<div class="absolute inset-x-0 top-0 h-1 bg-accent"></div>
									<div class="absolute inset-x-4 top-3 h-2.5 rounded-full bg-black/10"></div>
									<div class="absolute inset-x-4 top-7 h-2.5 w-1/2 rounded-full bg-black/5"></div>
									<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
										<span class="chip chip-accent text-[10px]">Name</span>
									</div>
									<div class="absolute left-1/2 top-[68%] -translate-x-1/2">
										<span class="chip text-[9px]">Certificate ID</span>
									</div>
									<div class="absolute right-3 top-3 flex gap-1.5">
										<span class="w-6 h-6 grid place-items-center rounded-full bg-black/5 text-soft"><MousePointer2 size={12} /></span>
										<span class="w-6 h-6 grid place-items-center rounded-full bg-accent text-base"><Layers size={12} /></span>
									</div>
								</div>
							</div>
						{:else if f.visual === 'stack'}
							<div class="relative mx-auto mb-8">
								<div class="space-y-0.5">
									<div class="mx-auto w-40 h-6 rounded-lg border border-black/10 bg-black/5 rotate-2"></div>
									<div class="mx-auto w-48 h-6 rounded-lg border border-black/10 bg-black/10"></div>
									<div class="h-6 rounded-lg bg-accent/90 w-48 mx-auto flex items-center justify-center gap-1.5 text-[10px] font-semibold text-base">
										<FileText size={11} /> certificates.zip
									</div>
								</div>
							</div>
						{:else}
							<div class="flex flex-wrap items-center gap-1.5 mb-8">
								<span class="chip chip-accent text-[9px]"><Sparkles size={10} /> {f.title === 'Smart mapping' ? 'nama → name' : f.title === 'Import data' ? 'participants.csv' : 'Joko · 1/124'}</span>
								<span class="chip text-[9px]">{f.title === 'Import data' ? 'Sheet: "Peserta 2024"' : f.title === 'Live preview' ? 'live rendering' : 'auto-matched'}</span>
							</div>
						{/if}

						<p class="text-[13px] leading-relaxed text-soft">{f.text}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section id="how" class="px-4 sm:px-6 pb-24 scroll-mt-24">
		<div class="max-w-5xl mx-auto">
			<div class="text-center mb-12">
				<div class="flex justify-center"><p class="section-label">How it works</p></div>
				<h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-ink mt-3">Three steps to a full batch</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#each steps as s, i}
					<div class="card card-hover p-6 relative overflow-hidden">
						<span class="step-num absolute top-5 right-5">{s.num}</span>
						<span class="w-11 h-11 rounded-xl grid place-items-center border border-black/10 bg-panel-hi text-accent-strong mb-6">
							<s.icon size={19} strokeWidth={1.8} />
						</span>
						<h3 class="text-[15px] font-semibold tracking-tight text-ink mb-2">{s.title}</h3>
						<p class="text-[13px] leading-relaxed text-soft">{s.text}</p>
						{#if i < steps.length - 1}
							<div class="hidden md:block absolute top-1/2 -right-3 text-faint">
								<ArrowRight size={15} />
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="mt-12 card card-hi p-8 sm:p-12 text-center relative overflow-hidden">
				<div class="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent pointer-events-none"></div>
				<BadgeCheck class="mx-auto mb-4 text-accent-strong" size={30} strokeWidth={1.6} />
				<h3 class="text-xl sm:text-2xl font-semibold tracking-tight text-ink">Ready to stop clicking "save as" 400 times?</h3>
				<p class="text-soft text-sm mt-3 max-w-md mx-auto">Import your list once. Every certificate - identical page, unique name, zero effort.</p>
				<div class="flex flex-wrap justify-center gap-3 mt-7">
					<a href="/auth/google?next=/" class="btn btn-accent px-6 py-2.5">Launch the editor <ArrowRight size={15} /></a>
					{#if configured && !user}
						<a href="/auth/google" class="btn btn-outline px-6 py-2.5">Sign in to sync</a>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<footer class="border-t border-black/10 px-4 py-10">
		<div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
			<div class="flex items-center gap-1">
				<span class="text-accent"><Award size={24} /></span>
				<span class="text-sm font-semibold text-ink">certves</span>
			</div>
			<nav class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-soft" aria-label="Footer">
				<a href="/#features" class="hover:text-ink transition-colors">Features</a>
				<a href="/#how" class="hover:text-ink transition-colors">How it works</a>
				<a href="/privacy" class="hover:text-ink transition-colors">Privacy</a>
				<a href="/terms" class="hover:text-ink transition-colors">Terms</a>
				<a href="/auth/google?next=/" class="hover:text-ink transition-colors">Open Project</a>
			</nav>
			<p class="font-mono text-[11px] tracking-wide text-faint">© {new Date().getFullYear()} certves</p>
		</div>
	</footer>
	{/if}
	{/if}
</main>