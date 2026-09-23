/** A half-open range of child indices, [start, end), rasterized into one image. */
export interface Run {
  start: number;
  end: number;
}

/** The only thing partitionRuns needs to know about a layer. */
export interface Layer {
  type: string;
}

/**
 * Split a frame's children into runs of consecutive non-TEXT layers.
 *
 * `children` is in Figma's order: index 0 is the bottom of the stack. TEXT
 * layers break runs and never appear inside one, so every run can be swapped
 * for a single image without changing what sits above or below the text.
 * Runs come back in ascending index order and are never empty.
 *
 *   T = TEXT, x = anything else
 *   [x, x, T, x] -> [{ start: 0, end: 2 }, { start: 3, end: 4 }]
 *   [T, T]       -> []
 *   [x, x, x]    -> [{ start: 0, end: 3 }]
 */
export function partitionRuns(children: ReadonlyArray<Layer>): Run[] {
  const runs: Run[] = [];
  let start = -1; // index where the open run began, or -1 when none is open
  children.forEach((child, i) => {
    if (child.type !== 'TEXT') {
      if (start < 0) start = i;
    } else if (start >= 0) {
      runs.push({ start, end: i });
      start = -1;
    }
  });
  // A frame whose top layers are images leaves a run open at the end.
  if (start >= 0) runs.push({ start, end: children.length });
  return runs;
}
