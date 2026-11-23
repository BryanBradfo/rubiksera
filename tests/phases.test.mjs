import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseOf, splitHighlight, PHASE_COUNT } from '../js/phases.js';

test('phaseOf maps the 8 steps to the 3 phases', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(phaseOf), [1, 1, 1, 2, 3, 3, 3, 3]);
  assert.equal(PHASE_COUNT, 3);
});

test('splitHighlight splits on the first occurrence', () => {
  assert.deepEqual(
    splitHighlight('Placer les coins de la première couronne', 'coins'),
    { before: 'Placer les ', mark: 'coins', after: ' de la première couronne' },
  );
});

test('splitHighlight returns null when the word is missing or empty', () => {
  assert.equal(splitHighlight('abc', 'zz'), null);
  assert.equal(splitHighlight('abc', undefined), null);
  assert.equal(splitHighlight('abc', ''), null);
});
