# DIM TypeScript SDK

DIM (Diagram In Markup) describes software architecture as a text model you can explore from systems down to code. This repository contains the TypeScript SDK, the Indonesian and English documentation, and the example models.

```sh
npm install @dim/zoom-map
```

The packaged SDK is also available from [GitHub Releases](https://github.com/a-man-called-q/dim-sdk/releases/tag/v0.1.0).

```ts
import { compileProject, createMap, initDim } from '@dim/zoom-map';

await initDim();
const { model, diagnostics } = compileProject('main.dim', {
  'main.dim': 'person buyer; system shop "Shop"; buyer -> shop;',
});
if (!model) throw new Error(JSON.stringify(diagnostics));

const map = createMap(model);
try {
  console.log(map.project(map.expandedForLevel(1)));
} finally {
  map.free();
}
```

`formatFile` formats one file. Pass a record of files to `compileProject` for models with imports. For a browser map, use `createZoomMap` and import `@dim/zoom-map/map.css`.

## Develop the SDK and docs

```sh
bun install --frozen-lockfile
bun run dev
bun run check
bun run test
bun run build
bun scripts/test-package.mjs
```

Use Bun 1.4.3 and Node.js 24. The workspace includes a pinned WASM runtime and vocabulary. The docs generate their example data at build time using the same SDK used by consumers. Start with [the shop example](examples/shop/main.dim), [the language spec](apps/docs/src/content/docs/en/referensi/spesifikasi.md), or the [SDK reference](apps/docs/src/content/docs/en/referensi/cli.md).

## Release

Update the SDK version, build and test, and run `npm pack` from `packages/zoom-map`. Attach the tarball and a `SHA256SUMS` file for it to a GitHub release tagged `v<version>`. For the first npm publication, a maintainer with access to `@dim` publishes that tarball. Configure npm Trusted Publishing for `publish.yml` for later releases. The workflow checks the GitHub release checksum before publishing. Set the Cloudflare deployment secrets in this repository to deploy the `dim-docs` Worker.

## License

DIM's published materials are [source-available](LICENSE). Commercial SDK or runtime use requires a US$50 minimum annual donation when total annual revenue exceeds US$10,000. At US$10 million or more, it also requires a separate paid enterprise license from the DIM copyright holder. See the license for the full terms and donation eligibility. Contact [the DIM owner](https://github.com/a-man-called-q) for enterprise licensing.
