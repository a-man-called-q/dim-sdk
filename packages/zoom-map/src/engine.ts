import init, { WebMap, compileProject as compile, formatFile as format } from '../wasm/dim_web.js';
import type { DimData, DimFlow, DimModel, DimNode, DimSpan } from './model.js';

export interface Diagnostic extends DimSpan {
	severity: 'error' | 'warning';
	code: string;
	message: string;
}

export interface CompiledProject {
	model: DimModel | null;
	diagnostics: Diagnostic[];
	files: string[];
}

export interface FormattedFile {
	text: string | null;
	diagnostics: Diagnostic[];
}

export interface Box {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	region: boolean;
	depth: number;
	card: boolean;
	member: string | null;
	divider: boolean;
}

export interface SceneBox {
	rect: Box;
	kind: { type: 'place'; opens: boolean } | { type: 'region' | 'card' | 'member' };
	text: string;
	detail: string | null;
	visibility: string | null;
	memberTitle: string | null;
	isStatic: boolean;
	isAbstract: boolean;
}

export interface LiftedEdge {
	from: string;
	to: string;
	sources: string[];
	ops: string[];
	structural: boolean;
	labels: string[];
	data: DimData[];
}

export interface FlowStep {
	route: number;
	/** 1-based step numbers in the original flow. */
	steps: number[];
	labels: string[];
}

export interface MapProjection {
	width: number;
	height: number;
	boxes: SceneBox[];
	routes: (LiftedEdge & { path: string | null; inFlow: boolean })[];
	flowSteps: FlowStep[];
	hiddenSteps: number;
	badges: { route: number; at: { x: number; y: number }; width: number; text: string }[];
}

export interface MapData {
	nodes: ReadonlyMap<string, DimNode>;
	flows: readonly DimFlow[];
	expandedForLevel(level: number): Set<string>;
	expanded(scale: number, previous?: ReadonlySet<string>): Set<string>;
	toggle(id: string, expanded: ReadonlySet<string>): Set<string>;
	visible(id: string, expanded: ReadonlySet<string>): string;
	hasChildren(id: string): boolean;
	box(id: string): Box | undefined;
	openingScale(id: string): number;
	project(expanded: ReadonlySet<string>, options?: { flow?: string | null; fixed?: boolean }): MapProjection;
	free(): void;
}

let initialization: Promise<void> | undefined;
let ready = false;

/** Initialize the same WebAssembly module in the browser (URL) or Node/Bun (file bytes). */
export function initDim(): Promise<void> {
	initialization ??= load().then(() => {
		ready = true;
	}).catch((error) => {
		initialization = undefined;
		throw error;
	});
	return initialization;
}

async function load() {
	if (typeof process !== 'undefined' && process.versions?.node) {
		const fsModule = 'node:fs/promises';
		const fs: typeof import('node:fs/promises') = await import(/* @vite-ignore */ fsModule);
		const path = import.meta.resolve('@dim/zoom-map/wasm');
		await init({ module_or_path: await fs.readFile(new URL(path)) });
	} else {
		await init();
	}
}

function requireDim() {
	if (!ready) throw new Error('Call and await initDim() before using DIM.');
}

export function compileProject(entry: string, files: Readonly<Record<string, string>>): CompiledProject {
	requireDim();
	return JSON.parse(compile(entry, JSON.stringify(files)));
}

export function formatFile(name: string, text: string): FormattedFile {
	requireDim();
	return JSON.parse(format(name, text));
}

const encodeIds = (ids: ReadonlySet<string>) => JSON.stringify([...ids]);
const decodeIds = (json: string) => new Set<string>(JSON.parse(json));

export function createMap(model: DimModel): MapData {
	requireDim();
	const map = new WebMap(JSON.stringify(model));
	return {
		nodes: new Map(model.nodes.map((node) => [node.id, node])),
		flows: model.flows ?? [],
		expandedForLevel: (level) => Number.isInteger(level) && level >= 1 && level <= 4
			? decodeIds(map.expandedForLevel(level)) : new Set(),
		expanded: (scale, previous = new Set()) => decodeIds(map.expanded(scale, encodeIds(previous))),
		toggle: (id, expanded) => decodeIds(map.toggle(id, encodeIds(expanded))),
		visible: (id, expanded) => map.visible(id, encodeIds(expanded)),
		hasChildren: (id) => map.hasChildren(id),
		box: (id) => JSON.parse(map.boxOf(id)) ?? undefined,
		openingScale: (id) => map.openingScale(id),
		project: (expanded, options) => JSON.parse(map.project(encodeIds(expanded), options?.flow ?? undefined, options?.fixed ?? false)),
		free: () => map.free(),
	};
}
