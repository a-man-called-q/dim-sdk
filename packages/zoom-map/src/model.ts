/** Lokasi di sumber (§9). Baris dan kolom mulai dari 1, dihitung per karakter. */
export interface DimSpan {
	file: string;
	line: number;
	col: number;
	endLine: number;
	endCol: number;
}

export interface DimSourceLocation {
	path?: string | null;
	line?: number | null;
	url?: string | null;
}

export interface DimType {
	type: string;
	description: string | null;
	refs?: string[];
}

type NamedType = DimType & { name: string };
type Auth = { scheme: string; requires: string[] };
type RateLimit = { key: string; limit: number; window: number };

export interface DimHttpDefaults {
	prefix: string | null;
	auth: Auth | null;
	rate: RateLimit[];
}

export interface DimHttp {
	method: string;
	path: string;
	status: number;
	auth: (Auth & { from: string }) | null;
	rate: (RateLimit & { from: string })[];
	query: NamedType[];
	headers: NamedType[];
	cookies: NamedType[];
	body: DimType | null;
	sets: { kind: string; name: string; description: string | null }[];
}

export interface DimCode {
	form: string | null;
	visibility?: string | null;
	static?: boolean;
	abstract?: boolean;
	async?: boolean;
	type: string | null;
	typeRefs?: string[];
	params: NamedType[];
	returns: DimType | null;
	throws?: DimType[];
	http?: DimHttp | null;
}

export interface DimNode {
	id: string;
	kind: 'person' | 'system' | 'container' | 'component' | 'code';
	name: string;
	parent: string | null;
	description?: string | null;
	tech: string | null;
	shape?: string;
	tags?: string[];
	external: boolean;
	ui?: boolean;
	httpDefaults?: DimHttpDefaults | null;
	code?: DimCode | null;
	source?: DimSourceLocation | null;
	span?: DimSpan;
}

export interface DimData {
	dir: 'push' | 'pull';
	payload: string[];
	refs?: string[];
}

export interface DimEdge {
	id: string;
	from: string;
	to: string;
	label: string | null;
	op: string;
	category?: 'interaction' | 'structure';
	data: DimData[];
	tech?: string | null;
	description?: string | null;
	tags?: string[];
	span?: DimSpan;
}

export interface DimFlow {
	id: string;
	name: string;
	description: string | null;
	steps: { edge: string; label: string | null }[];
	tags?: string[];
	span?: DimSpan;
}

export interface DimModel {
	version: string;
	nodes: DimNode[];
	edges: DimEdge[];
	flows?: DimFlow[];
}
