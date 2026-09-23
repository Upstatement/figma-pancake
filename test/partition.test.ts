import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partitionRuns } from '../src/partition.ts';

// 'T' is a TEXT layer, any other character is a non-text layer.
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
    { start: 0, end: 1 },
    { start: 2, end: 3 },
    { start: 4, end: 5 },
  ]);
});

test('leading and trailing text are excluded', () => {
  assert.deepEqual(partitionRuns(layers('TxxT')), [{ start: 1, end: 3 }]);
});

test('adjacent text layers leave no empty run between them', () => {
  assert.deepEqual(partitionRuns(layers('xTTx')), [
    { start: 0, end: 1 },
    { start: 3, end: 4 },
  ]);
});

test('groups, frames and instances count as non-text', () => {
  const children = [{ type: 'GROUP' }, { type: 'FRAME' }, { type: 'INSTANCE' }, { type: 'TEXT' }];
  assert.deepEqual(partitionRuns(children), [{ start: 0, end: 3 }]);
});
