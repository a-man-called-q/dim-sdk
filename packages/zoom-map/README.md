# @dim/zoom-map

Compile DIM models, format DIM files, and draw zoomable software architecture maps in TypeScript. The WebAssembly runtime is included.

```ts
import { compileProject, formatFile, initDim } from '@dim/zoom-map';

await initDim();
const files = { 'main.dim': 'person buyer; system shop; buyer -> shop;' };
const { model, diagnostics } = compileProject('main.dim', files);
const formatted = formatFile('main.dim', files['main.dim']);
```

See the [TypeScript SDK reference](https://github.com/a-man-called-q/dim-sdk/blob/main/apps/docs/src/content/docs/en/referensi/cli.md) and [license](LICENSE).
