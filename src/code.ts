import { partitionRuns, type Run } from './partition.ts';

// 2x keeps photos crisp when the PDF is zoomed or viewed on a retina screen.
const EXPORT_SCALE = 2;
// figma.createImage rejects images over 4096px on either side; stay under it
// with room for rounding.
const MAX_IMAGE_SIDE = 4000;

/**
 * Replace frame.children[run.start, run.end) with one image rectangle that
 * renders identically. Returns false when nothing in the run is visible, in
 * which case the run is removed without an image.
 */
async function rasterizeRun(frame: FrameNode, run: Run): Promise<boolean> {
  const nodes = frame.children.slice(run.start, run.end);
  // Grouping lets Figma composite overlaps, blend modes and opacity for us.
  const group = figma.group(nodes, frame, run.start);
  const box = group.absoluteBoundingBox;
  const render = group.absoluteRenderBounds;

  if (!box || !render || render.width === 0 || render.height === 0) {
    group.remove();
    return false;
  }

  const scale = Math.min(
    EXPORT_SCALE,
    MAX_IMAGE_SIDE / render.width,
    MAX_IMAGE_SIDE / render.height,
  );
  const bytes = await group.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
  });

  const rect = figma.createRectangle();
  rect.name = 'Flattened';
  rect.resize(render.width, render.height);
  rect.fills = [{ type: 'IMAGE', imageHash: figma.createImage(bytes).hash, scaleMode: 'FILL' }];
  frame.insertChild(frame.children.indexOf(group), rect);
  // The export covers the render bounds, which extend past the group's own
  // box by any shadow or outside stroke. Shift by that difference.
  rect.x = group.x + (render.x - box.x);
  rect.y = group.y + (render.y - box.y);
  group.remove();
  return true;
}

/** Flatten one frame in place. Returns the number of images created. */
async function flattenFrame(frame: FrameNode): Promise<number> {
  let images = 0;
  // Last run first, so replacing a run never shifts the indices of the
  // runs still waiting below it.
  for (const run of partitionRuns(frame.children).reverse()) {
    if (await rasterizeRun(frame, run)) images++;
  }
  return images;
}

async function main(): Promise<void> {
  const selection = figma.currentPage.selection;
  const frames = selection.filter((node): node is FrameNode => node.type === 'FRAME');

  if (frames.length === 0) {
    figma.closePlugin('Select one or more frames to flatten.');
    return;
  }

  let images = 0;
  const failed: string[] = [];
  for (const frame of frames) {
    try {
      images += await flattenFrame(frame);
    } catch (error) {
      console.error(`Could not flatten "${frame.name}"`, error);
      failed.push(frame.name);
    }
  }

  const message = [
    `Flattened ${frames.length - failed.length} frame(s) into ${images} image(s).`,
  ];
  const skipped = selection.length - frames.length;
  if (skipped > 0) message.push(`Skipped ${skipped} non-frame layer(s).`);
  if (failed.length > 0) message.push(`Failed: ${failed.join(', ')}. See the console.`);
  figma.closePlugin(message.join(' '));
}

main();
