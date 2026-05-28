#!/usr/bin/env node
// ─── Pré-calcul des moves par étape ──────────────────────────────────────
//
// Usage : node scripts/precompute.mjs
//
// Lance le solveur LBL sur le SCRAMBLE défini ci-dessous (à adapter), puis
// affiche un bloc JavaScript prêt à coller dans `js/main.js` à la place de
// PRECOMPUTED_STEPS.
//
// Le solveur peut prendre quelques secondes à plusieurs dizaines de secondes
// selon le scramble. C'est normal — d'où l'intérêt de pré-calculer offline
// plutôt qu'au load du navigateur.

import * as engine from '../js/cubeEngine.js';
import * as solver from '../js/lblSolver.js';

// TODO(toi) : remplace le scramble ici si tu veux un mélange différent.
const SCRAMBLE = "F R U2 B' L' D F' R D' B";

const moves = SCRAMBLE.split(' ');
const state = engine.createCube();
engine.applySequence(state, moves);

console.log(`\nScramble : ${SCRAMBLE}\n`);

const stepFns = [
  ['1: cross blanche',         solver.solveStep1_cross],
  ['2: align cross',           solver.solveStep2_alignCross],
  ['3: 1ère couronne',         solver.solveStep3_firstLayerCorners],
  ['4: 2ème couronne',         solver.solveStep4_secondLayer],
  ['5: croix jaune',           solver.solveStep5_yellowCross],
  ['6: align croix jaune',     solver.solveStep6_alignYellowCross],
  ['7: placer derniers coins', solver.solveStep7_permuteCorners],
  ['8: orienter derniers coins', solver.solveStep8_orientCorners],
];

const stepResults = [];
for (const [label, fn] of stepFns) {
  process.stdout.write(`Étape ${label.padEnd(30)} `);
  const t0 = Date.now();
  const raw = fn(state);
  const simplified = solver.simplifyMoves(raw);
  const dt = Date.now() - t0;
  console.log(`(${dt}ms, ${raw.length} → ${simplified.length} moves)`);
  stepResults.push(simplified);
}

console.log(`\nCube résolu ? ${engine.isSolved(state) ? '✅ oui' : '❌ non'}\n`);

// Sortie prête à coller
console.log('// ─── Copie ce bloc dans js/main.js ───────────────────────────────');
console.log(`const SCRAMBLE = "${SCRAMBLE}".split(' ');`);
console.log('const PRECOMPUTED_STEPS = [');
for (const moves of stepResults) {
  console.log('  ' + JSON.stringify(moves) + ',');
}
console.log('];');
