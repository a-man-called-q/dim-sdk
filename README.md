# DIM TypeScript SDK

DIM (Diagram In Markup) describes software architecture as a text model you can explore from systems down to code. This SDK wraps the compiled DIM runtime in WebAssembly. The [documentation and examples](https://github.com/dim-language/docs) live in their own repository.

```sh
npm install @dim/zoom-map
```

The packaged SDK is also available from [GitHub Releases](https://github.com/dim-language/dim-sdk/releases/tag/v0.1.0).

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

## Develop the SDK

```sh
bun install --frozen-lockfile
bun run check
bun run test
bun run build
bun scripts/test-package.mjs
```

Use Bun 1.4.3 and Node.js 24. Build and test the SDK with its pinned WASM runtime and vocabulary. See the [SDK reference](https://github.com/dim-language/docs/blob/main/src/content/docs/en/referensi/cli.md) for usage.

## Release

Update the SDK version, build and test, and run `npm pack`. Attach the tarball and a `SHA256SUMS` file for it to a GitHub release tagged `v<version>`. For the first npm publication, a maintainer with access to `@dim` publishes that tarball. Configure npm Trusted Publishing for `publish.yml` for later releases. The workflow checks the GitHub release checksum before publishing.

## License

DIM's published materials are [source-available](LICENSE). Commercial SDK or runtime use requires a US$50 minimum annual donation when total annual revenue exceeds US$10,000. At US$10 million or more, it also requires a separate paid enterprise license from the DIM copyright holder. See the license for the full terms and donation eligibility. Contact [the DIM owner](https://github.com/a-man-called-q) for enterprise licensing.
