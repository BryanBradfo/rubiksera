import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fr from '../i18n/fr.js';
import en from '../i18n/en.js';

const root = new URL('../', import.meta.url);
const FORBIDDEN = /[·—–]/;

for (const file of ['index.html', 'i18n/fr.js', 'i18n/en.js']) {
  test(`${file} has no middle dot or long dash`, () => {
    const lines = readFileSync(new URL(file, root), 'utf8').split('\n');
    const bad = lines.map((l, i) => [i + 1, l]).filter(([, l]) => FORBIDDEN.test(l));
    assert.deepEqual(bad, []);
  });
}

for (const dict of [fr, en]) {
  test(`${dict.lang}: every step has a highlight found in its title`, () => {
    assert.equal(dict.steps.length, 8);
    for (const [i, s] of dict.steps.entries()) {
      assert.ok(s.highlight, `step ${i + 1} has no highlight`);
      assert.ok(s.title.includes(s.highlight), `step ${i + 1}: "${s.highlight}" not in "${s.title}"`);
    }
  });
}

function keyPaths(o, prefix = '') {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
}

test('FR and EN ui/moves keys match', () => {
  assert.deepEqual(keyPaths(fr.ui).sort(), keyPaths(en.ui).sort());
  assert.deepEqual(keyPaths(fr.moves).sort(), keyPaths(en.moves).sort());
});

test('document titles', () => {
  assert.equal(fr.ui.docTitle, "rubiksera, apprendre le Rubik's Cube en 8 étapes");
  assert.equal(en.ui.docTitle, "rubiksera, learn the Rubik's Cube in 8 steps");
});
