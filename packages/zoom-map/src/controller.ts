// Perilaku peta zoom di browser: buka/tutup elemen, ganti level, sorot flow, sematkan panah.
// Markup pembungkusnya milik pemakai (docs atau editor); controller hanya mengisi dan mendengarkan.

import { createMap, type Box, type MapData } from './engine.js';
import type { DimModel } from './model.js';
import { render, type MapLanguage } from './render.js';

export interface ZoomMapElements {
	/** Pembungkus semua bagian di bawah; klik di dalamnya didengarkan di sini. */
	root: HTMLElement;
	stage: HTMLElement;
	routes: HTMLElement;
	routeCount?: HTMLElement | null;
	flows?: HTMLElement | null;
	flowButtons?: HTMLElement | null;
	/** Tombol level berkelas `zm-level` dengan `data-level="1".."4"`. */
	levelButtons?: HTMLButtonElement[];
}

/** Penyebab peta digambar ulang, supaya pemakai bisa memutuskan apakah pandangan perlu diatur ulang. */
export type RenderCause = 'model' | 'level' | 'toggle' | 'zoom' | 'flow' | 'route';

export interface ZoomMapOptions {
	/** Prefix id unik untuk marker SVG kalau ada lebih dari satu peta di halaman. */
	uid: string;
	/** Level awal Z1–Z4 untuk model pertama. */
	level?: number;
	/** Detail adapts to the camera scale while the map's geometry stays fixed. */
	camera?: { scale: number; focus(box: Box, minimumScale: number): void };
	compactRoutes?: boolean;
	/** Id flow yang langsung disorot. */
	flow?: string | null;
	language?: MapLanguage;
	/** Dipanggil saat kotak mana pun (`[data-id]`) diaktifkan. Mengaktifkan mode kotak yang bisa dipilih. */
	onSelect?(id: string): void;
	/** Dipanggil setiap kali peta selesai digambar. */
	onRender?(size: { width: number; height: number; cause: RenderCause }): void;
}

export interface ZoomMapState {
	expanded: Set<string>;
	pinned: number | null;
	flow: string | null;
	current: string | null;
}

export interface ZoomMap {
	setModel(model: DimModel): void;
	setLevel(level: number): void;
	setZoom(scale: number): void;
	getBox(id: string): Box | undefined;
	setCurrent(id: string | null): void;
	getState(): ZoomMapState;
}

/**
 * State yang dibawa ke model baru: id yang masih ada (dan masih punya isi) tetap terbuka,
 * flow dipertahankan kalau id-nya masih ada, panah yang disematkan dilepas.
 */
export function carryState(prev: ZoomMapState, tree: MapData): ZoomMapState {
	const expanded = new Set([...prev.expanded].filter((id) => tree.hasChildren(id)));
	const flow = prev.flow !== null && tree.flows.some((f) => f.id === prev.flow) ? prev.flow : null;
	const current = prev.current !== null && tree.nodes.has(prev.current) ? prev.current : null;
	return { expanded, pinned: null, flow, current };
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
	return a.size === b.size && [...a].every((id) => b.has(id));
}

export function createZoomMap(els: ZoomMapElements, options: ZoomMapOptions): ZoomMap {
	const { root, stage, routes, routeCount, flows, flowButtons, levelButtons = [] } = els;
	const { uid, onSelect, onRender, camera, compactRoutes } = options;
	const selectable = onSelect !== undefined;

	let tree: MapData | null = null;
	let scale = camera?.scale ?? 1;
	let state: ZoomMapState = { expanded: new Set(), pinned: null, flow: options.flow ?? null, current: null };
	let flowRoutes = new Set<number>();

	// Panah menyala kalau sedang di-hover/disematkan, atau bagian dari flow yang dipilih.
	const highlight = (index: number | null) => {
		stage.querySelectorAll('.zm-edge').forEach((el) => {
			const i = Number(el.getAttribute('data-route'));
			const on = i === index || (index === null && flowRoutes.has(i));
			el.classList.toggle('is-route', on);
			el.setAttribute('marker-end', `url(#${uid}-arrow${on ? '-route' : ''})`);
		});
	};

	// Kotak yang mewakili `current` di level ini: elemen tersembunyi naik ke leluhurnya yang terlihat.
	const markCurrent = () => {
		stage.querySelectorAll('.is-current').forEach((el) => el.classList.remove('is-current'));
		if (!tree || state.current === null || !tree.nodes.has(state.current)) return;
		const shown = tree.visible(state.current, state.expanded);
		stage.querySelector(`[data-id="${CSS.escape(shown)}"]`)?.classList.add('is-current');
	};

	const draw = (cause: RenderCause, focusSelector?: string) => {
		if (!tree) return;
		const t = tree;
		const out = render(t, { expanded: state.expanded, pinned: state.pinned, flow: state.flow }, uid, {
			selectable,
			fixed: camera !== undefined,
			compactRoutes,
			language: options.language,
		});
		flowRoutes = new Set(out.flowRoutes);
		stage.style.setProperty('--zm-w', String(out.width));
		stage.style.setProperty('--zm-h', String(out.height));
		stage.innerHTML = out.stage;
		routes.innerHTML = out.routes;
		if (routeCount) routeCount.textContent = String(out.routeCount);
		if (flowButtons && (cause === 'model' || cause === 'flow' || cause === 'route')) flowButtons.innerHTML = out.flowButtons;
		if (flows) flows.innerHTML = flowButtons ? out.flowDetails : out.flows;
		for (const b of levelButtons) {
			const lvl = Number(b.dataset.level);
			b.setAttribute('aria-pressed', String(sameSet(state.expanded, t.expandedForLevel(lvl))));
		}
		markCurrent();
		if (focusSelector) root.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: camera !== undefined });
		onRender?.({ width: out.width, height: out.height, cause });
	};

	const setLevel = (level: number) => {
		if (!tree || camera) return;
		state = { ...state, expanded: tree.expandedForLevel(level), pinned: null };
		draw('level');
	};

	root.addEventListener('click', (ev) => {
		if (!tree) return;
		const target = ev.target as HTMLElement;
		const level = target.closest<HTMLButtonElement>('.zm-level');
		if (level && levelButtons.includes(level)) {
			setLevel(Number(level.dataset.level));
			return;
		}
		const flowButton = target.closest<HTMLButtonElement>('.zm-flow');
		if (flowButton) {
			const id = flowButton.dataset.flow!;
			state = { ...state, flow: state.flow === id ? null : id, pinned: null };
			draw('flow', `[data-flow="${CSS.escape(id)}"]`);
			return;
		}
		if (!stage.contains(target) && !routes.contains(target)) return;
		if (camera && target.closest('[data-zoom-to]')) {
			if (ev.detail === 0) focusBox(target);
			return;
		}
		const toggle = target.closest<HTMLElement>('[data-toggle]');
		const selected = selectable && stage.contains(target) ? target.closest<HTMLElement>('[data-id]')?.dataset.id : undefined;
		if (toggle) {
			const id = toggle.dataset.toggle!;
			const expanded = tree.toggle(id, state.expanded);
			state = { ...state, expanded, pinned: null };
			draw('toggle', `[data-toggle="${CSS.escape(id)}"]`);
			if (selected !== undefined) onSelect?.(selected);
			return;
		}
		if (selected !== undefined) {
			onSelect?.(selected);
			return;
		}
		const route = target.closest<HTMLButtonElement>('.zm-route');
		if (route) {
			const i = Number(route.dataset.route);
			const pinned = state.pinned === i ? null : i;
			if (!compactRoutes && pinned !== null && state.flow !== null) {
				// Menyematkan satu panah melepas sorotan flow.
				state = { ...state, pinned, flow: null };
				draw('route', `.zm-route[data-route="${i}"]`);
				return;
			}
			state = { ...state, pinned };
			for (const button of routes.querySelectorAll('.zm-route')) {
				const active = button === route && pinned !== null;
				button.setAttribute(compactRoutes ? 'aria-expanded' : 'aria-pressed', String(active));
				if (compactRoutes) button.nextElementSibling?.toggleAttribute('hidden', !active);
			}
			highlight(pinned);
		}
	});

	const focusBox = (target: Element) => {
		const id = target.closest<HTMLElement>('[data-zoom-to]')?.dataset.zoomTo;
		const box = id === undefined ? undefined : tree?.box(id);
		if (box && tree) camera?.focus(box, tree.openingScale(box.id));
	};
	if (camera) stage.addEventListener('dblclick', (ev) => focusBox(ev.target as Element));

	// Hover/focus di daftar rute menyorot panahnya di peta.
	const preview = (ev: Event) => {
		const route = (ev.target as HTMLElement).closest<HTMLElement>('.zm-route');
		if (route) highlight(Number(route.dataset.route));
	};
	const restore = () => highlight(state.pinned);
	routes.addEventListener('mouseover', preview);
	routes.addEventListener('focusin', preview);
	routes.addEventListener('mouseleave', restore);
	routes.addEventListener('focusout', restore);

	return {
		setModel(model) {
			const next = createMap(model);
			if (tree) state = carryState(state, next);
			if (camera) {
				state = { ...state, expanded: next.expanded(scale, tree ? state.expanded : undefined) };
			} else if (!tree) {
				state = { ...state, expanded: next.expandedForLevel(options.level ?? 2) };
			}
			if (state.flow !== null && !next.flows.some((f) => f.id === state.flow)) state = { ...state, flow: null };
			tree?.free();
			tree = next;
			draw('model');
		},
		setLevel,
		setZoom(next) {
			if (!tree || !camera) return;
			scale = next;
			const expanded = tree.expanded(scale, state.expanded);
			if (sameSet(expanded, state.expanded)) return;
			const active = root.ownerDocument.activeElement;
			const activeId = stage.contains(active) ? (active as HTMLElement).dataset.zoomTo : undefined;
			const focus = activeId ? `[data-zoom-to="${CSS.escape(tree.visible(activeId, expanded))}"]` : undefined;
			state = { ...state, expanded, pinned: null };
			draw('zoom', focus);
		},
		getBox(id) {
			return camera ? tree?.box(id) : undefined;
		},
		setCurrent(id) {
			state = { ...state, current: id };
			markCurrent();
		},
		getState() {
			return { ...state, expanded: new Set(state.expanded) };
		},
	};
}
