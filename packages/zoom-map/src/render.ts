// Menghasilkan HTML peta zoom dari state (level / elemen yang terbuka / flow yang dipilih).
// Fungsi yang sama dipakai saat build dan di browser, jadi tampilan awal tidak bergantung JavaScript.

import type { LiftedEdge, MapData, SceneBox } from './engine.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(4)}%`;

const labels = {
	id: {
		open: 'Buka', close: 'Tutup', zoomTo: 'Perbesar', external: 'eksternal', to: 'ke', recursive: 'rekursif',
		push: 'kirim', pull: 'ambil',
		relations: (n: number) => `${n} relasi`,
		steps: (n: number) => `${n} langkah`,
		flowTitle: (name: string) => `Langkah ${name}`,
		step: (n: number) => `Langkah asal ${n}`,
		merged: (first: number, last: number) => `Langkah ${first}–${last} digabung`,
		hidden: (n: number) => `${n} langkah tidak tampil karena relasinya berada di dalam satu elemen di level ini.`,
		empty: 'Tidak ada relasi antar elemen yang terlihat di level ini. Semua relasi berada di dalam satu elemen; buka elemen itu untuk melihatnya.',
		zoomEmpty: 'Belum ada panah antar elemen yang terlihat. Perbesar peta untuk melihat relasi di dalamnya.',
	},
	en: {
		open: 'Open', close: 'Close', zoomTo: 'Zoom to', external: 'external', to: 'to', recursive: 'recursive',
		push: 'send', pull: 'receive',
		relations: (n: number) => `${n} relations`,
		steps: (n: number) => `${n} ${n === 1 ? 'step' : 'steps'}`,
		flowTitle: (name: string) => `${name} steps`,
		step: (n: number) => `Original step ${n}`,
		merged: (first: number, last: number) => `Steps ${first}–${last} merged`,
		hidden: (n: number) => n === 1
			? '1 step is hidden because its relation is inside a single element at this level.'
			: `${n} steps are hidden because their relations are inside individual elements at this level.`,
		empty: 'No relations connect visible elements at this level. Open an element to see the relations inside it.',
		zoomEmpty: 'No arrows connect visible elements yet. Zoom in to see the relations inside them.',
	},
};
export type MapLanguage = keyof typeof labels;
type Labels = (typeof labels)[MapLanguage];

function dataText(e: LiftedEdge, text: Labels): string {
	const push = e.data.find((d) => d.dir === 'push');
	const pull = e.data.find((d) => d.dir === 'pull');
	const fmt = (d: { payload: string[] }) => (d.payload.length ? d.payload.join(', ') : 'data');
	const parts: string[] = [];
	if (push) parts.push(`${text.push} ${fmt(push)}`);
	if (pull) parts.push(`${text.pull} ${fmt(pull)}`);
	return parts.join(' · ');
}

const arrow = (id: string, cls: string) =>
	`<marker id="${id}" class="${cls}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker>`;

function boxHtml(map: MapData, box: SceneBox, W: number, H: number, selectable: boolean, zoomable: boolean, interactive: boolean, text: Labels): string {
	const b = box.rect;
	const n = map.nodes.get(b.id)!;
	const style = `left:${pct(b.x, W)};top:${pct(b.y, H)};width:${pct(b.w, W)};height:${pct(b.h, H)}`;
	const id = esc(b.id);
	// Kotak yang bisa dipilih (editor) memakai <button> supaya bisa difokus dan diaktifkan dengan keyboard.
	const zoomTo = `data-zoom-to="${id}" aria-label="${text.zoomTo} ${esc(n.name)}"`;
	const leaf = zoomable ? `button type="button" ${zoomTo}` : selectable ? 'button type="button"' : 'div';
	const leafEnd = selectable || zoomable ? 'button' : 'div';

	if (box.kind.type === 'member') {
		const vis = n.code?.visibility;
		const cls = ['zm-member', b.divider ? 'zm-member--divider' : '', box.isStatic ? 'is-static' : '', box.isAbstract ? 'is-abstract' : '']
			.filter(Boolean)
			.join(' ');
		const visLabel = vis ? `<span class="sr-only">${esc(vis)}</span>` : '';
		return `<${leaf} class="${cls}" style="${style}" data-id="${id}" title="${esc(box.memberTitle ?? box.text)}"><span class="zm-vis" aria-hidden="true">${box.visibility ?? ''}</span>${visLabel}<span class="zm-sig">${esc(box.text)}</span></${leafEnd}>`;
	}

	const kindLabel = n.code?.form ?? n.kind;
	const kind = `<span class="zm-kind">${esc(kindLabel)}${n.external ? ` · ${text.external}` : ''}</span>`;
	const name = `<span class="zm-name" title="${esc(n.name)}">${esc(n.name)}</span>`;
	const head = zoomable ? zoomTo : `data-toggle="${id}" aria-expanded="true" aria-label="${text.close} ${esc(n.name)} (${esc(kindLabel)})"`;
	const heading = (cls: string, content: string) => interactive
		? `<button type="button" class="${cls}" ${head}>${content}</button>`
		: `<div class="${cls}">${content}</div>`;

	if (box.kind.type === 'card') {
		const ctor = box.detail ? `<span class="zm-tech">${esc(box.detail)}</span>` : '';
		const abstract = box.isAbstract ? ' is-abstract' : '';
		return `<div class="zm-card${abstract}" style="${style}" data-id="${id}" title="${esc(n.description ?? n.name)}">${heading('zm-card-head', `${name}${kind}${ctor}`)}</div>`;
	}
	if (box.kind.type === 'region') {
		return `<div class="zm-region" style="${style}" data-id="${id}">${heading('zm-region-head', `${name}${kind}`)}</div>`;
	}
	const detail = box.detail;
	const tech = detail ? `<span class="zm-tech" title="${esc(detail)}">${esc(detail)}</span>` : '';
	const inner = `${name}${kind}${tech}`;
	if (interactive && !zoomable && box.kind.type === 'place' && box.kind.opens) {
		return `<button type="button" class="zm-place zm-place--opens" style="${style}" data-id="${id}" data-toggle="${id}" aria-expanded="false" aria-label="${text.open} ${esc(n.name)} (${esc(kindLabel)})">${inner}<span class="zm-more" aria-hidden="true">+</span></button>`;
	}
	return `<${leaf} class="zm-place" style="${style}" data-id="${id}">${inner}</${leafEnd}>`;
}

export interface Rendered {
	stage: string;
	routes: string;
	routeCount: number;
	flows: string;
	flowButtons: string;
	flowDetails: string;
	/** Indeks panah yang termasuk flow yang dipilih. */
	flowRoutes: number[];
	width: number;
	height: number;
}

export interface View {
	expanded: Set<string>;
	/** Indeks panah yang disematkan dari daftar panah. */
	pinned: number | null;
	/** Id flow yang sedang disorot. */
	flow: string | null;
}

export interface RenderOptions {
	/** Tempat dan baris kartu dirender sebagai tombol supaya bisa dipilih (dipakai editor). */
	selectable?: boolean;
	fixed?: boolean;
	compactRoutes?: boolean;
	language?: MapLanguage;
	interactive?: boolean;
}

export function render(map: MapData, view: View, uid: string, options: RenderOptions = {}): Rendered {
	const text = labels[options.language ?? 'id'];
	const zoomable = options.fixed ?? false;
	const interactive = options.interactive ?? true;
	const projected = map.project(view.expanded, { flow: view.flow, fixed: zoomable });
	const { width: W, height: H, routes: edges, flowSteps, hiddenSteps } = projected;
	const flow = map.flows.find((f) => f.id === view.flow) ?? null;
	const boxesHtml = projected.boxes.map((b) => boxHtml(map, b, W, H, interactive && !!options.selectable, interactive && zoomable, interactive, text)).join('');

	const paths = edges
		.map((e, i) => {
			if (!e.path) return '';
			const hot = view.pinned === i || ((!options.compactRoutes || view.pinned === null) && e.inFlow);
			const cls = ['zm-edge', hot ? 'is-route' : '', e.structural ? 'zm-edge--structure' : ''].filter(Boolean).join(' ');
			return `<path class="${cls}" data-route="${i}" marker-end="url(#${uid}-arrow${hot ? '-route' : ''})" fill="none" d="${e.path}"/>`;
		})
		.join('');

	const badges = projected.badges
		.map(({ at, width: w, text }) => {
			return `<g class="zm-step"><rect x="${(at.x - w / 2).toFixed(1)}" y="${(at.y - 10).toFixed(1)}" width="${w}" height="20" rx="3"/><text x="${at.x.toFixed(1)}" y="${(at.y + 4.5).toFixed(1)}">${text}</text></g>`;
		})
		.join('');

	const svgOpen = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"`;
	const svg = `${svgOpen} class="zm-edges"><defs>${arrow(`${uid}-arrow`, 'zm-arrow')}${arrow(`${uid}-arrow-route`, 'zm-arrow zm-arrow--route')}</defs>${paths}</svg>`;
	// Nomor langkah di lapisan paling atas supaya tidak tertutup kotak atau baris kartu.
	const badgeLayer = badges ? `${svgOpen} class="zm-edges zm-badges">${badges}</svg>` : '';

	const nodeName = (id: string) => esc(map.nodes.get(id)?.name ?? id);
	const ends = (e: LiftedEdge) =>
		`${nodeName(e.from)} <span aria-hidden="true">→</span><span class="sr-only">${text.to}</span> ${nodeName(e.to)}`;

	const routes = edges.length
		? `<ol class="zm-route-list">${edges
				.map((e, i) => {
					const recursive = e.from === e.to ? text.recursive : '';
					const meta = [recursive, e.ops.join(', '), dataText(e, text), e.sources.length > 1 ? text.relations(e.sources.length) : '']
						.filter(Boolean)
						.join(' · ');
					if (!interactive) {
						return `<li class="zm-route"><span class="zm-route-ends">${ends(e)}</span><span class="zm-route-meta">${esc(meta)}</span></li>`;
					}
					if (options.compactRoutes) {
						const detailId = `${uid}-route-detail-${i}`;
						const open = view.pinned === i;
						return `<li><button type="button" class="zm-route" data-route="${i}" aria-expanded="${open}" aria-controls="${detailId}"><span class="zm-route-ends">${ends(e)}</span></button><p id="${detailId}" class="zm-route-meta zm-route-detail"${open ? '' : ' hidden'}>${esc(meta)}</p></li>`;
					}
					return `<li><button type="button" class="zm-route" data-route="${i}" aria-pressed="${view.pinned === i}"><span class="zm-route-ends">${ends(e)}</span><span class="zm-route-meta">${esc(meta)}</span></button></li>`;
				})
				.join('')}</ol>`
		: `<p class="zm-empty">${zoomable ? text.zoomEmpty : text.empty}</p>`;

	let flowButtons = '';
	let flowDetails = '';
	if (map.flows.length) {
		const buttons = map.flows
			.map(
				(f) =>
					`<button type="button" class="zm-flow" data-flow="${esc(f.id)}" aria-pressed="${view.flow === f.id}">${esc(f.name)}<span class="zm-route-meta">${text.steps(f.steps.length)}</span></button>`,
			)
			.join('');
		flowButtons = `<div class="zm-flow-list">${buttons}</div>`;
		if (flow) {
			const items = flowSteps
				.map((s, i) => {
					const e = edges[s.route];
					const step = s.steps.length > 1
						? text.merged(s.steps[0], s.steps[s.steps.length - 1])
						: s.steps[0] === i + 1 ? '' : text.step(s.steps[0]);
					const meta = [step, ...s.labels].filter(Boolean).join(' · ');
					const subline = meta ? `<span class="zm-route-meta">${esc(meta)}</span>` : '';
					return `<li><span class="zm-step-no" aria-hidden="true">${i + 1}</span><span class="zm-step-text"><span class="zm-route-ends">${ends(e)}</span>${subline}</span></li>`;
				})
				.join('');
			const note = hiddenSteps
				? `<p class="zm-flow-note">${text.hidden(hiddenSteps)}</p>`
				: '';
			const desc = flow.description ? `<p class="zm-flow-note">${esc(flow.description)}</p>` : '';
			const title = options.compactRoutes ? `<p class="zm-routes-title">${esc(text.flowTitle(flow.name))}</p>` : '';
			const steps = items ? `<ol class="zm-flow-steps">${items}</ol>` : '';
			flowDetails = `${title}${desc}${steps}${note}`;
		}
	}

	return { stage: `${svg}${boxesHtml}${badgeLayer}`, routes, routeCount: edges.length,
		flows: `${flowButtons}${flowDetails}`, flowButtons, flowDetails,
		flowRoutes: edges.flatMap((edge, index) => edge.inFlow ? [index] : []), width: W, height: H };
}
