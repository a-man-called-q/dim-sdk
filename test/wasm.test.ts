import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { compileProject, createMap, formatFile, initDim } from '../src/index.ts';

test('the compiled WASM projects the shop fixture at Z2 and Z4', async () => {
	await initDim();
	const shop = new URL('./fixtures/shop/', import.meta.url);
	const files = Object.fromEntries(readdirSync(shop).filter((name) => name.endsWith('.dim'))
		.map((name) => [name, readFileSync(new URL(name, shop), 'utf8')]));
	const compiled = compileProject('main.dim', files);
	expect(compiled.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(compiled.files).toEqual(['main.dim', 'shop.dim', 'payment.dim']);
	expect(compiled.model?.version).toBe('0.5');
	const map = createMap(compiled.model!);
	try {
		const z2 = map.project(map.expandedForLevel(2), { flow: 'checkout', fixed: true });
		const z4 = map.project(map.expandedForLevel(4), { flow: 'checkout', fixed: true });
		const db = z2.routes.filter((route) => route.from === 'shop.api' && route.to === 'shop.db');
		expect(db).toHaveLength(1);
		expect(db[0]).toMatchObject({
			sources: ['insert_order', 'shop.api.orders.repo.find->shop.db#0'],
			ops: ['write', 'read'],
			data: [{ dir: 'push', payload: ['Order'] }, { dir: 'pull', payload: ['Order'] }],
			inFlow: true,
		});
		expect(db[0].path).toMatch(/^M/);
		expect(z2.flowSteps.flatMap(({ steps }) => steps)).toEqual([1, 2, 5, 7]);
		expect(z4.flowSteps.flatMap(({ steps }) => steps)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(z2.hiddenSteps).toBe(3);
		expect(z4.hiddenSteps).toBe(0);
		expect(z4.boxes.find(({ rect }) => rect.id === 'shop')?.rect)
			.toEqual(z2.boxes.find(({ rect }) => rect.id === 'shop')?.rect);
	} finally {
		map.free();
	}
});

test('WASM compiler and formatter report positioned errors', async () => {
	await initDim();
	const entry = 'main.dim';
	const missing = compileProject(entry, {});
	expect(missing.model).toBeNull();
	expect(missing.diagnostics).toMatchObject([{ code: 'E040', file: entry, line: 1, col: 1 }]);
	expect(compileProject(entry, { [entry]: '' }).model?.nodes).toEqual([]);

	const bad = compileProject(entry, { [entry]: 'system a "Tokó 🛒"; a -> nope;' });
	expect(bad.model).toBeNull();
	expect(bad.diagnostics).toMatchObject([{ code: 'E020', file: entry, line: 1, col: 25, endCol: 29 }]);

	const source = 'system shop{container api;}';
	const formatted = formatFile(entry, source);
	expect(formatted.diagnostics).toEqual([]);
	expect(formatted.text).not.toBe(source);
	expect(formatFile(entry, formatted.text!)).toEqual(formatted);
	expect(formatFile(entry, 'system shop {')).toMatchObject({
		text: null,
		diagnostics: [{ code: 'E001', file: entry, severity: 'error' }],
	});
});
