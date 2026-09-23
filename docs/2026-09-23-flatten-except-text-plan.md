# Flatten Except Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A menu-run Figma plugin that rasterizes every non-text layer of the selected frames into as few images as possible, leaving top-level text live and in place.

**Architecture:** One pure module (`src/partition.ts`) decides which child index ranges become images; one Figma-side module (`src/code.ts`) groups each range, exports it to PNG, and swaps in an image rectangle. esbuild bundles both into the single `code.js` Figma loads. The pure module is unit-tested with Node's built-in runner; the Figma side is verified by hand in the desktop app.

**Tech Stack:** TypeScript, `@figma/plugin-typings`, esbuild, Node 25 built-in test runner with native type stripping.

**Spec:** `docs/2026-09-20-flatten-except-text-plugin.md`

## Global Constraints

- Edits the selected frame in place. No copy, no UI window.
- Only direct children of the selected frame are considered. Nested text is baked.
- TEXT children are never modified or moved.
- Export PNG at 2x, capped so neither side exceeds 4000px (`figma.createImage` rejects anything over 4096px).
- One failing frame must not stop the others.
- `partitionRuns` is written by Jared (Task 3). Tasks 1 and 2 leave it as a throwing stub.

---

### Task 1: Scaffold and the partitionRuns contract

**Files:**
- Create: `package.json`, `tsconfig.json`, `manifest.json`, `README.md`
- Create: `src/partition.ts` (stub)
- Create: `test/partition.test.ts`
- Modify: `.gitignore` (add `.DS_Store`)

**Interfaces:**
- Produces: `export interface Run { start: number; end: number }` (half-open, `end` exclusive), `export interface Layer { type: string }`, `export function partitionRuns(children: ReadonlyArray<Layer>): Run[]`

- [ ] **Step 1: Install dev dependencies**

Run: `npm install -D typescript @figma/plugin-typings @types/node esbuild`

`package.json` scripts:

```json
{
  "build": "esbuild src/code.ts --bundle --target=es2017 --outfile=code.js",
  "watch": "esbuild src/code.ts --bundle --target=es2017 --outfile=code.js --watch",
  "typecheck": "tsc",
  "test": "node --test \"test/*.test.ts\""
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["es2017"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"]
  },
  "include": ["src", "test"]
}
```

`verbatimModuleSyntax` and `erasableSyntaxOnly` exist because Node strips types rather than compiling them: a type import without the `type` keyword, or an `enum`, crashes the test run.

- [ ] **Step 2: Write the stub**

```ts
// src/partition.ts
export interface Run { start: number; end: number }
export interface Layer { type: string }

export function partitionRuns(children: ReadonlyArray<Layer>): Run[] {
  throw new Error('partitionRuns is not implemented yet');
}
```

- [ ] **Step 3: Write the tests**

```ts
// test/partition.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partitionRuns } from '../src/partition.ts';

// 'T' is a TEXT layer, anything else is a non-text layer.
const layers = (pattern: string) =>
  [...pattern].map((c) => ({ type: c === 'T' ? 'TEXT' : 'RECTANGLE' }));

test('empty frame has no runs', () => {
  assert.deepEqual(partitionRuns([]), []);
});
test('all-text frame has no runs', () => {
  assert.deepEqual(partitionRuns(layers('TTT')), []);
});
test('no-text frame is one run', () => {
  assert.deepEqual(partitionRuns(layers('xxx')), [{ start: 0, end: 3 }]);
});
test('text sandwiched between images splits the runs', () => {
  assert.deepEqual(partitionRuns(layers('xTxTx')), [
    { start: 0, end: 1 }, { start: 2, end: 3 }, { start: 4, end: 5 },
  ]);
});
test('leading and trailing text are excluded', () => {
  assert.deepEqual(partitionRuns(layers('TxxT')), [{ start: 1, end: 3 }]);
});
test('adjacent text layers leave no empty run between them', () => {
  assert.deepEqual(partitionRuns(layers('xTTx')), [
    { start: 0, end: 1 }, { start: 3, end: 4 },
  ]);
});
test('groups, frames and instances count as non-text', () => {
  const children = [{ type: 'GROUP' }, { type: 'FRAME' }, { type: 'INSTANCE' }, { type: 'TEXT' }];
  assert.deepEqual(partitionRuns(children), [{ start: 0, end: 3 }]);
});
```

- [ ] **Step 4: Run the tests and confirm they fail on the stub**

Run: `npm test`
Expected: 7 failures, each "partitionRuns is not implemented yet".

- [ ] **Step 5: Commit** `feat: scaffold plugin and partitionRuns contract`

### Task 2: Figma rasterize pipeline

**Files:**
- Create: `src/code.ts`

**Interfaces:**
- Consumes: `partitionRuns`, `Run` from `src/partition.ts`
- Produces: `code.js` via `npm run build`, loaded by `manifest.json`

- [ ] **Step 1: Write `src/code.ts`**

`rasterizeRun(frame, run)` groups `frame.children.slice(run.start, run.end)` at `run.start`, reads the group's `absoluteRenderBounds` (includes shadows and outside strokes), exports PNG at `min(2, 4000 / side)`, creates a rectangle with the image fill at the render bounds, inserts it at the group's index, and removes the group. A run with no render bounds (every layer hidden) is removed without an image. `flattenFrame` processes runs last to first so earlier indices never shift. `main` filters the selection to frames, catches per frame, and closes with a summary. Full code lives in `src/code.ts`.

- [ ] **Step 2: Verify** `npm run typecheck` and `npm run build` both succeed.

- [ ] **Step 3: Commit** `feat: rasterize non-text runs into image rectangles`

### Task 3 (Jared): Implement partitionRuns and verify in Figma

- [ ] **Step 1:** Replace the stub body in `src/partition.ts`.
- [ ] **Step 2:** `npm test` shows 7 passing.
- [ ] **Step 3:** `npm run build`, then in Figma desktop: Plugins, Development, Import plugin from manifest, pick `manifest.json`.
- [ ] **Step 4:** Duplicate each Input frame, run the plugin on the duplicate, and compare against Desired Output. Check the layer panel shows only `Flattened` rectangles and text.
- [ ] **Step 5:** Build a fixture frame stacked image, text, 50% black overlay, text, image. Expect 3 images and 2 text layers with an identical render.
- [ ] **Step 6:** Cmd+Z once and confirm the original layers return.
- [ ] **Step 7: Commit** `feat: implement partitionRuns`
