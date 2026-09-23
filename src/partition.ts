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
  // TODO(jared): implement. `npm test` spells out the expected behavior.
  throw new Error('partitionRuns is not implemented yet');
}
