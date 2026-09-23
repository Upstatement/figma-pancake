# Pancake Frame

Flatten imagery and preserve editable text.

A Figma plugin that rasterizes everything in a frame except its text layers,
so large proposals export to lighter PDFs with live, selectable text.

Select one or more frames and run **Plugins > Development > Pancake Frame**. Each run of consecutive non-text layers becomes one 2x PNG rectangle
named `Flattened`, in the same stacking position. Top-level text layers are
left alone. Text nested inside groups, frames or instances is baked into the
image. The frame is edited in place, and one Cmd+Z undoes the whole run.

## Setup

```bash
npm install
npm run build
```

In the Figma desktop app, choose **Plugins > Development > Import plugin from
manifest** and pick `manifest.json`. Use `npm run watch` while developing.

## Scripts

- `npm test` runs the unit tests for the run-partitioning logic.
- `npm run typecheck` type-checks the plugin and the tests.
- `npm run build` bundles `src/` into `code.js`, which Figma loads.

Design: `docs/2026-09-20-flatten-except-text-plugin.md`.
