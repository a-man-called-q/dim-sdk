/* tslint:disable */
/* eslint-disable */

export class WebMap {
    free(): void;
    [Symbol.dispose](): void;
    boxOf(id: string): string;
    expandedForLevel(level: number): string;
    expanded(scale: number, previous: string): string;
    hasChildren(id: string): boolean;
    constructor(model: string);
    openingScale(id: string): number;
    project(expanded: string, flow: string | null | undefined, fixed: boolean): string;
    toggle(id: string, expanded: string): string;
    visible(id: string, expanded: string): string;
}

export function compileProject(entry: string, files: string): string;

export function formatFile(name: string, text: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_webmap_free: (a: number, b: number) => void;
    readonly compileProject: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly formatFile: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly webmap_boxOf: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webmap_expanded: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly webmap_expandedForLevel: (a: number, b: number) => [number, number, number, number];
    readonly webmap_hasChildren: (a: number, b: number, c: number) => number;
    readonly webmap_new: (a: number, b: number) => [number, number, number];
    readonly webmap_openingScale: (a: number, b: number, c: number) => number;
    readonly webmap_project: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly webmap_toggle: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly webmap_visible: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
