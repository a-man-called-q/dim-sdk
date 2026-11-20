import { describe, expect, test } from 'bun:test';
import { createZoomMap, initDim, type DimModel, type DimNode } from '../src';
import type { ZoomMapOptions } from '../src/controller';

await initDim();

const node = (id: string, kind: DimNode['kind'], parent: string | null = null): DimNode => ({
	id,
	kind,
	name: id.split('.').pop()!,
	parent,
	tech: null,
	external: false,
});

function model(extra: DimNode[] = [], withFlow = true): DimModel {
	return {
		version: '0.3',
		nodes: [
			node('user', 'person'),
			node('shop', 'system'),
			node('shop.web', 'container', 'shop'),
			node('shop.api', 'container', 'shop'),
			node('shop.api.orders', 'component', 'shop.api'),
			...extra,
		],
		edges: [
			{ id: 'visit', from: 'user', to: 'shop.web', label: null, op: 'use', data: [] },
			{ id: 'post', from: 'shop.web', to: 'shop.api.orders', label: null, op: 'call', data: [] },
		],
		flows: withFlow ? [{ id: 'f', name: 'Belanja', description: null, steps: [{ edge: 'visit', label: null }] }] : [],
	};
}

function mount(onSelect?: (id: string) => void, language?: ZoomMapOptions['language'], camera?: ZoomMapOptions['camera'], compactRoutes = false) {
	document.body.innerHTML = `
		<div id="root">
			<button class="zm-level" data-level="1"></button><button class="zm-level" data-level="2"></button>
			<div class="flow-buttons"></div><span class="route-count"></span>
			<div class="zm-stage"></div><div class="routes"></div><div class="flows"></div>
		</div>`;
	const root = document.getElementById('root')!;
	const els = {
		root,
		stage: root.querySelector<HTMLElement>('.zm-stage')!,
		routes: root.querySelector<HTMLElement>('.routes')!,
		routeCount: root.querySelector<HTMLElement>('.route-count')!,
		flows: root.querySelector<HTMLElement>('.flows')!,
		flowButtons: compactRoutes ? root.querySelector<HTMLElement>('.flow-buttons')! : undefined,
		levelButtons: [...root.querySelectorAll<HTMLButtonElement>('.zm-level')],
	};
	const renders: string[] = [];
	const map = createZoomMap(els, { uid: 't', level: 2, onSelect, camera, compactRoutes, language, onRender: (s) => renders.push(s.cause) });
	return { map, els, renders };
}

const click = (el: Element | null) => (el as HTMLElement).click();

describe('createZoomMap', () => {
	test('model pertama dibuka sesuai level awal', () => {
		const { map, els } = mount();
		map.setModel(model());
		expect([...map.getState().expanded]).toEqual(['shop']);
		expect(els.stage.querySelector('[data-id="shop.api"]')).not.toBeNull();
		expect(els.levelButtons[1].getAttribute('aria-pressed')).toBe('true');
	});

	test('setModel mempertahankan node yang terbuka dan flow', () => {
		const { map, els, renders } = mount();
		map.setModel(model());
		click(els.stage.querySelector('[data-toggle="shop.api"]'));
		click(els.flows.querySelector('[data-flow="f"]'));
		expect(map.getState().expanded).toEqual(new Set(['shop', 'shop.api']));
		expect(map.getState().flow).toBe('f');

		// Elemen baru ditambahkan: yang terbuka tetap terbuka, elemen baru langsung tampil.
		map.setModel(model([node('shop.api.billing', 'component', 'shop.api')]));
		expect(map.getState().expanded).toEqual(new Set(['shop', 'shop.api']));
		expect(map.getState().flow).toBe('f');
		expect(els.stage.querySelector('[data-id="shop.api.billing"]')).not.toBeNull();
		expect(renders.at(-1)).toBe('model');
	});

	test('setModel membuang id yang hilang, flow yang hilang, dan panah yang disematkan', () => {
		const { map, els } = mount();
		map.setModel(model());
		click(els.stage.querySelector('[data-toggle="shop.api"]'));
		click(els.routes.querySelector('.zm-route'));
		expect(map.getState().pinned).toBe(0);

		const smaller = model([], false);
		smaller.nodes = smaller.nodes.filter((n) => n.id !== 'shop.api.orders');
		smaller.edges = smaller.edges.filter((e) => e.id !== 'post');
		map.setModel(smaller);
		expect(map.getState().expanded).toEqual(new Set(['shop']));
		expect(map.getState().flow).toBeNull();
		expect(map.getState().pinned).toBeNull();
	});

	test('setCurrent menandai leluhur yang terlihat', () => {
		const { map, els } = mount();
		map.setModel(model());
		map.setCurrent('shop.api.orders');
		expect(els.stage.querySelector('.is-current')?.getAttribute('data-id')).toBe('shop.api');
		click(els.stage.querySelector('[data-toggle="shop.api"]'));
		expect(els.stage.querySelector('.is-current')?.getAttribute('data-id')).toBe('shop.api.orders');
		map.setCurrent(null);
		expect(els.stage.querySelector('.is-current')).toBeNull();
	});

	test('onSelect: kotak daun jadi tombol dan memberi tahu id-nya', () => {
		const picked: string[] = [];
		const { map, els } = mount((id) => picked.push(id));
		map.setModel(model());
		const leaf = els.stage.querySelector('[data-id="shop.web"]')!;
		expect(leaf.tagName).toBe('BUTTON');
		click(leaf);
		click(els.stage.querySelector('[data-toggle="shop.api"]'));
		expect(picked).toEqual(['shop.web', 'shop.api']);
		expect(map.getState().expanded.has('shop.api')).toBe(true);
	});

	test('tanpa onSelect kotak daun tetap div (tampilan docs)', () => {
		const { map, els } = mount();
		map.setModel(model());
		expect(els.stage.querySelector('[data-id="shop.web"]')!.tagName).toBe('DIV');
	});

	test('tombol level mengganti isi peta', () => {
		const { map, els, renders } = mount();
		map.setModel(model());
		click(els.levelButtons[0]);
		expect(map.getState().expanded.size).toBe(0);
		expect(renders.at(-1)).toBe('level');
	});

	test('camera zoom reveals detail and lifts routes without moving the existing boxes', () => {
		const focused: string[] = [];
		const { map, els, renders } = mount(undefined, 'en', { scale: 0.2, focus: (box) => focused.push(box.id) });
		map.setModel(model());
		const box = (id: string) => els.stage.querySelector(`[data-id="${id}"]`);
		const position = box('shop')?.getAttribute('style');
		expect(box('shop.web')).toBeNull();
		click(box('shop'));
		expect(focused).toEqual(['shop']);
		click(els.flows.querySelector('[data-flow="f"]'));

		map.setZoom(1.5);
		expect(box('shop')?.getAttribute('style')).toBe(position);
		expect(box('shop.web')).not.toBeNull();
		expect(box('shop.api.orders')).not.toBeNull();
		expect(map.getState().flow).toBe('f');
		expect(renders.at(-1)).toBe('zoom');

		map.setZoom(0.2);
		expect(box('shop.web')).toBeNull();
		expect(box('shop')?.getAttribute('style')).toBe(position);
	});

	test('keeps English map labels after changing zoom and opening an element', () => {
		const { map, els } = mount(undefined, 'en');
		map.setModel(model());
		expect(els.flows.textContent).toContain('1 step');
		click(els.levelButtons[0]);
		const shop = els.stage.querySelector('[data-toggle="shop"]')!;
		expect(shop.getAttribute('aria-label')).toBe('Open shop (system)');
		click(shop);
		expect(els.stage.querySelector('[data-toggle="shop"]')?.getAttribute('aria-label')).toBe('Close shop (system)');
		expect(els.routes.querySelector('.sr-only')?.textContent).toBe('to');
	});

	test('compact relation details leave the selected flow open', () => {
		const { map, els } = mount(undefined, 'id', { scale: 0.2, focus() {} }, true);
		map.setModel(model());
		expect(els.routeCount.textContent).toBe('1');
		expect(els.flows.innerHTML).toBe('');
		click(els.flowButtons!.querySelector('.zm-flow'));
		expect(els.flows.textContent).toContain('Langkah Belanja');
		expect(els.stage.querySelector('.zm-edge.is-route')).not.toBeNull();

		map.setZoom(1.5);
		expect(els.routeCount.textContent).toBe('2');
		const route = els.routes.querySelector('.zm-route[data-route="1"]')!;
		const detail = document.getElementById(route.getAttribute('aria-controls')!)!;
		expect(detail.hidden).toBe(true);
		click(route);
		expect(route.getAttribute('aria-expanded')).toBe('true');
		expect(detail.hidden).toBe(false);
		expect(map.getState().flow).toBe('f');
		expect(els.stage.querySelector('.zm-edge.is-route')?.getAttribute('data-route')).toBe('1');
		click(route);
		expect(detail.hidden).toBe(true);
		expect(els.stage.querySelector('.zm-edge.is-route')?.getAttribute('data-route')).toBe('0');
	});
});
