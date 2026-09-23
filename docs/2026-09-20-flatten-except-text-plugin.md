# Flatten Except Text — Figma plugin design

Date: 2026-09-20
Status: approved design, pre-implementation

## Problem

Large proposal decks in Figma export to bloated, slow PDFs. Each slide is a
frame with many layers: photos, gradients, effects, nested mockups. Flattening
a slide to a single image fixes size and rendering, but Figma's native Flatten
and every community plugin surveyed (Flatten as Image, Crop and Flatten as
Image, Flatly, Flatten Master, Flatten to Image, Rasterize Selection, Flatten
Selection to Bitmap) also flatten the text. We want text to stay live so it
exports to the PDF as crisp, selectable vector glyphs and can still be edited.

Reference file: an internal sample deck with "Input" and "Desired Output" frames.

## Goal

A menu-run Figma plugin, "Flatten except text". Select one or more frames,
run it, and every non-text layer in each selected frame is rasterized into as
few images as possible while every top-level text layer is left untouched and
in its original stacking position. The result is pixel-identical to the input.

## Non-goals for v1

- Text nested inside groups, frames, or component instances. It gets baked
  into the image. Recursion is the planned first follow-up.
- A settings UI. No scale picker, no JPEG option, no copy-vs-replace toggle.
- Reversibility beyond Figma's native undo. The plugin edits the selected
  frame in place.
- Handling of anything other than frames at the top of the selection.
  Selected non-frame nodes are skipped with a notification.

## Behavior

1. User selects one or more FRAME nodes and runs the plugin from the Plugins
   menu.
2. For each selected frame, the plugin partitions the frame's direct children
   by z-order into runs: maximal stretches of consecutive non-TEXT children.
   TEXT children break runs and are never modified.
3. Each run is grouped into a temporary group, exported as PNG at 2x scale,
   and replaced by a single RECTANGLE with an IMAGE fill (scaleMode FILL)
   sized and positioned to the group's render bounds, inserted at the run's
   original index. The temporary group is then removed. The scale drops
   below 2x when needed to keep both sides at or under 4000px, because
   `figma.createImage` rejects images over 4096px.
4. A hidden child (visible === false) is treated as part of the run it sits
   in. It contributes nothing to the export, which matches how it renders.
   A run with nothing visible is removed without creating an image.
5. A frame whose children are all non-text collapses to one image. A frame
   whose children are all text is left untouched.
6. On completion the plugin closes with a notification: N frames flattened,
   M images created. Errors on one frame do not stop the others.

## Rendering fidelity rules

- Export the temporary group's render bounds, not the frame's. Render bounds
  include shadows and outside strokes that the plain bounding box would clip. This keeps
  rotated children and children partially outside the frame correct, and
  the frame's own clipping still applies to the resulting rectangle.
- Exporting a group rather than individual nodes lets Figma composite blend
  modes, opacity, shadows, and overlaps inside the run. Effects on the frame
  itself remain on the frame and are not baked.
- Runs are replaced one at a time, from the top of the z-order down, so
  indices already processed are not disturbed.
- In an auto-layout frame the new rectangle is inserted at the run's index
  and given the run's size. Layout may reflow if the run contained
  absolutely-positioned children; this is accepted in v1.

## Architecture

Single-file plugin, no UI window.

- `manifest.json`: name, id, `main: code.js`, `editorType: ["figma"]`,
  `documentAccess: "dynamic-page"`.
- `src/partition.ts`: the pure `partitionRuns` function, unit-tested with
  Node's built-in test runner.
- `src/code.ts`, bundled with `src/partition.ts` by esbuild into `code.js`.
  Figma loads a single script, so a bundler is the simplest way to keep the
  pure logic in its own testable file. `tsc` only type-checks.
  - `main()`: reads `figma.currentPage.selection`, filters to frames, calls
    `flattenFrame` on each, notifies, closes.
  - `partitionRuns(children)`: pure function. Given a frame's children array
    returns an ordered list of `{start, end}` index ranges for non-text runs.
    This is the heart of the plugin and is the piece Jared writes. It
    returns half-open ranges, so `end` is exclusive like `Array.slice`.
  - `rasterizeRun(frame, run)`: groups, exports, creates the image rect,
    inserts, removes the group.
  - `flattenFrame(frame)`: partitions, then rasterizes runs from last to
    first.

Dependencies: `typescript`, `@figma/plugin-typings`, `@types/node`, `esbuild`.
No framework.

## Testing

Manual, against the sample file, plus a fixture frame.

- Photo slide: run the plugin, export both the Input frame and the flattened
  frame at 1x PNG, compare visually. Expect identical output and a layer
  panel showing only image rectangles and text.
- Mockup board: same check. Mockup text is expected to become pixels.
- Fixture: a frame with image, text, semi-transparent overlay, text, image in
  that z-order. Expect three images and two text layers, stacking preserved,
  identical render.
- Fixture: frame with all-text children is untouched; frame with no text
  becomes a single image.
- Undo after running restores the original layers.

## Follow-ups (not in v1)

1. Recurse into groups, frames, and detached instances so nested text stays
   live. Needs instance detaching, auto-layout handling, mask handling.
2. Optional JPEG export for photo-heavy runs.
3. Scale option (1x, 2x, 3x).
