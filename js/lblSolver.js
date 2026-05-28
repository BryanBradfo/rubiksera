// ─── Solveur LBL (Layer by Layer) selon la méthode de Victor Colin ───────
//
// Pour chaque étape du PDF, une fonction qui prend l'état du cube et renvoie
// la liste des moves nécessaires pour faire ce que dit le texte de l'étape.
//
// Stratégie : IDDFS (Iterative Deepening DFS) avec invariants pour les étapes
// 1-4, 6 (où la forme des moves est moins critique). Pour les étapes 5, 7, 8,
// on applique directement les formules canoniques de Victor.

import {
  COLORS, applyMove, applySequence, cloneState, isSolved,
  isCrossDone, isCrossAligned, isFirstLayerDone, isSecondLayerDone,
  isYellowCrossDone, isLastLayerOriented, getTopPattern,
  countCorrectTopCorners, findCorrectTopCorner, findUnorientedTopCorner,
} from './cubeEngine.js';

const C = COLORS;
const ALL_MOVES = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

// ─── Utilitaires ─────────────────────────────────────────────────────────

function invMove(m) {
  if (m.endsWith('2')) return m;
  if (m.endsWith("'")) return m.slice(0, -1);
  return m + "'";
}

function iddfs(state, goalFn, maxDepth, moveSet = ALL_MOVES) {
  if (goalFn(state)) return [];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const result = dfs(state, goalFn, depth, [], moveSet);
    if (result) return result;
  }
  return null;
}

function dfs(state, goalFn, depth, history, moveSet) {
  if (depth === 0) return null;
  const lastFace = history.length ? history[history.length - 1][0] : null;
  const prevPrevFace = history.length >= 2 ? history[history.length - 2][0] : null;
  for (const m of moveSet) {
    const face = m[0];
    if (face === lastFace) continue;
    if (isOpposite(face, lastFace) && face === prevPrevFace) continue;
    applyMove(state, m);
    if (goalFn(state)) {
      const r = [...history, m];
      applyMove(state, invMove(m));
      return r;
    }
    history.push(m);
    const r = dfs(state, goalFn, depth - 1, history, moveSet);
    history.pop();
    applyMove(state, invMove(m));
    if (r) return r;
  }
  return null;
}

// Sous-ensembles de moves utilisés pour les formules de Victor
const MOVES_NO_D = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'F', "F'", 'F2', 'B', "B'", 'B2'];  // pour 4 et 6 (préserver 1ère couronne)
const MOVES_TFORM = ['U', "U'", 'U2', 'R', "R'", 'L', "L'", 'F', "F'", 'B', "B'"];  // restreint T-formula
const MOVES_LAST_LAYER = ['U', "U'", 'U2', 'R', "R'", 'L', "L'", 'F', "F'"];  // dernière couronne

function isOpposite(f1, f2) {
  return (f1 === 'R' && f2 === 'L') || (f1 === 'L' && f2 === 'R') ||
         (f1 === 'U' && f2 === 'D') || (f1 === 'D' && f2 === 'U') ||
         (f1 === 'F' && f2 === 'B') || (f1 === 'B' && f2 === 'F');
}

// Compte les facelets blancs aux 4 positions de la croix sur D.
function countCrossWhiteFacelets(state) {
  let n = 0;
  for (const i of [28, 30, 32, 34]) if (state[i] === C.W) n++;
  return n;
}

// Compte les coins de la 1ère couronne (face D) correctement placés.
function countCorrectFirstLayerCorners(state) {
  const cornerSpecs = [
    [27, 24, 22, 44, 40],   // D1: front-left, F7 → F-center, L9 → L-center
    [29, 26, 22, 15, 13],   // D3: front-right, F9 → F-center, R7 → R-center
    [33, 42, 40, 51, 49],   // D7: back-left, L7 → L-center, B7 → B-center
    [35, 17, 13, 53, 49],   // D9: back-right, R9 → R-center, B9 → B-center
  ];
  let n = 0;
  for (const [w, s1, c1, s2, c2] of cornerSpecs) {
    if (state[w] !== C.W) continue;
    if (state[s1] !== state[c1]) continue;
    if (state[s2] !== state[c2]) continue;
    n++;
  }
  return n;
}

// Compte les arêtes mid (2ème couronne) correctement placées.
function countCorrectMiddleEdges(state) {
  const edges = [
    [23, 22, 12, 13],   // FR
    [21, 22, 41, 40],   // FL
    [14, 13, 48, 49],   // BR
    [39, 40, 50, 49],   // BL
  ];
  let n = 0;
  for (const [s1, c1, s2, c2] of edges) {
    if (state[s1] === state[c1] && state[s2] === state[c2]) n++;
  }
  return n;
}

// ─── ÉTAPE 1 : Faire la croix blanche ────────────────────────────────────
// Place 4 facelets blancs sur les 4 positions de la croix de D.
export function solveStep1_cross(state) {
  const allMoves = [];
  let safety = 0;
  while (countCrossWhiteFacelets(state) < 4) {
    if (safety++ > 8) throw new Error('solveStep1 : trop d\'itérations');
    const current = countCrossWhiteFacelets(state);
    const goal = s => countCrossWhiteFacelets(s) > current;
    const seq = iddfs(state, goal, 8);
    if (!seq) throw new Error(`solveStep1 : stuck à ${current}/4`);
    applySequence(state, seq);
    allMoves.push(...seq);
  }
  return allMoves;
}

// ─── ÉTAPE 2 : Aligner la croix blanche ──────────────────────────────────
// Les 4 arêtes de la croix doivent avoir leur couleur secondaire alignée
// avec les centres voisins.
export function solveStep2_alignCross(state) {
  if (isCrossAligned(state, C.W)) return [];
  const seq = iddfs(state, s => isCrossAligned(s, C.W), 12);
  if (!seq) throw new Error('solveStep2 : pas de solution');
  applySequence(state, seq);
  return seq;
}

// ─── ÉTAPE 3 : Placer les coins de la 1ère couronne ──────────────────────
// On place les 4 coins blancs un par un, en préservant la croix.
export function solveStep3_firstLayerCorners(state) {
  const allMoves = [];
  let safety = 0;
  while (!isFirstLayerDone(state, C.W)) {
    if (safety++ > 8) throw new Error('solveStep3 : trop d\'itérations');
    const current = countCorrectFirstLayerCorners(state);
    const goal = s => countCorrectFirstLayerCorners(s) > current && isCrossAligned(s, C.W);
    const seq = iddfs(state, goal, 10);
    if (!seq) throw new Error(`solveStep3 : stuck à ${current}/4 coins`);
    applySequence(state, seq);
    allMoves.push(...seq);
  }
  return allMoves;
}

// ─── ÉTAPE 4 : 2ème couronne ─────────────────────────────────────────────
// On place les 4 arêtes de la 2ème couronne en préservant la 1ère couronne.
// Moves restreints : pas de D (qui casserait la 1ère couronne).
export function solveStep4_secondLayer(state) {
  const allMoves = [];
  let safety = 0;
  while (!isSecondLayerDone(state, C.W)) {
    if (safety++ > 8) throw new Error('solveStep4 : trop d\'itérations');
    const current = countCorrectMiddleEdges(state);
    const goal = s => countCorrectMiddleEdges(s) > current && isFirstLayerDone(s, C.W);
    const seq = iddfs(state, goal, 10, MOVES_NO_D);
    if (!seq) throw new Error(`solveStep4 : stuck à ${current}/4 arêtes mid`);
    applySequence(state, seq);
    allMoves.push(...seq);
  }
  return allMoves;
}

// ─── ÉTAPE 5 : Croix jaune ───────────────────────────────────────────────
// Formule de Victor : F R U R' U' F' (appliquée 1, 2 ou 3 fois selon pattern).
const F_FORMULA = ['F', 'R', 'U', "R'", "U'", "F'"];

export function solveStep5_yellowCross(state) {
  const allMoves = [];
  let safety = 0;
  while (!isYellowCrossDone(state)) {
    if (safety++ > 4) throw new Error('solveStep5 : trop d\'itérations');
    const pattern = getTopPattern(state);
    // Orientation canonique avant d'appliquer la formule :
    //   L → 2 facelets jaunes en haut-gauche du U (indices 1 et 3)
    //   line → ligne horizontale (indices 3 et 5)
    //   dot → pas d'orientation requise
    if (pattern === 'L') {
      let counter = 0;
      while (counter < 4) {
        const y = state[4];
        if (state[1] === y && state[3] === y && state[5] !== y && state[7] !== y) break;
        allMoves.push('U');
        applyMove(state, 'U');
        counter++;
      }
    } else if (pattern === 'line') {
      let counter = 0;
      while (counter < 2) {
        const y = state[4];
        if (state[3] === y && state[5] === y) break;
        allMoves.push('U');
        applyMove(state, 'U');
        counter++;
      }
    }
    for (const m of F_FORMULA) {
      allMoves.push(m);
      applyMove(state, m);
    }
  }
  return allMoves;
}

// ─── ÉTAPE 6 : Aligner la croix jaune ────────────────────────────────────
// Moves restreints : pas de D (préserve les couches inférieures).
export function solveStep6_alignYellowCross(state) {
  if (isCrossAligned(state, C.Y)) return [];
  const seq = iddfs(state, s => isCrossAligned(s, C.Y) && isSecondLayerDone(s, C.W), 12, MOVES_NO_D);
  if (!seq) throw new Error('solveStep6 : pas de solution');
  applySequence(state, seq);
  return seq;
}

// ─── ÉTAPE 7 : Placer les 4 derniers coins ───────────────────────────────
// Formule de Victor : U R U' L' U R' U' L (cycle de 3 coins).
const PERM_CORNERS = ['U', 'R', "U'", "L'", 'U', "R'", "U'", 'L'];

export function solveStep7_permuteCorners(state) {
  const allMoves = [];
  let safety = 0;
  while (countCorrectTopCorners(state) < 4) {
    if (safety++ > 6) throw new Error('solveStep7 : trop d\'itérations');
    const correctCount = countCorrectTopCorners(state);
    if (correctCount === 0) {
      // Aucun coin correct : applique la formule "à vide". Net U = 0.
      for (const m of PERM_CORNERS) {
        allMoves.push(m);
        applyMove(state, m);
      }
    } else {
      // 1 coin correct : on l'amène en UFR via U-turns, applique la formule,
      // puis annule les U-turns pour préserver l'alignement de la croix.
      const correctPos = findCorrectTopCorner(state);
      if (correctPos) {
        const [x, , z] = correctPos;
        let uTurns = 0;
        if (x === 1 && z === 1)       uTurns = 0;
        else if (x === -1 && z === 1) uTurns = 3;
        else if (x === -1 && z === -1) uTurns = 2;
        else if (x === 1 && z === -1) uTurns = 1;
        // Pré-rotation pour amener le coin correct en UFR
        for (let i = 0; i < uTurns; i++) {
          allMoves.push('U');
          applyMove(state, 'U');
        }
        // Formule (UFR fixe, 3-cycle des 3 autres)
        for (const m of PERM_CORNERS) {
          allMoves.push(m);
          applyMove(state, m);
        }
        // Post-rotation inverse (annule la pré-rotation pour ne pas désaligner la croix)
        const postTurns = (4 - uTurns) % 4;
        for (let i = 0; i < postTurns; i++) {
          allMoves.push('U');
          applyMove(state, 'U');
        }
      } else {
        // findCorrectTopCorner null malgré count > 0 (cas pathologique)
        for (const m of PERM_CORNERS) {
          allMoves.push(m);
          applyMove(state, m);
        }
      }
    }
  }
  return allMoves;
}

// ─── ÉTAPE 8 : Orienter les 4 derniers coins ─────────────────────────────
// Pour chaque coin non orienté : tourner U pour l'amener en UFR, puis
// appliquer R' D' R D jusqu'à ce que le jaune soit sur le haut (face U).
const TRIGGER = ["R'", "D'", 'R', 'D'];

export function solveStep8_orientCorners(state) {
  const allMoves = [];
  let safety = 0;
  while (!isLastLayerOriented(state)) {
    if (safety++ > 12) throw new Error('solveStep8 : trop d\'itérations');
    const unorPos = findUnorientedTopCorner(state);
    if (!unorPos) break;
    const [x, , z] = unorPos;
    let uTurns = 0;
    if (x === 1 && z === 1)       uTurns = 0;
    else if (x === -1 && z === 1) uTurns = 3;
    else if (x === -1 && z === -1) uTurns = 2;
    else if (x === 1 && z === -1) uTurns = 1;
    for (let i = 0; i < uTurns; i++) {
      allMoves.push('U');
      applyMove(state, 'U');
    }
    let triggerCount = 0;
    while (triggerCount < 6) {
      if (state[8] === C.Y) break;  // U9 = jaune → coin UFR orienté
      for (const m of TRIGGER) {
        allMoves.push(m);
        applyMove(state, m);
      }
      triggerCount++;
    }
    if (triggerCount >= 6) throw new Error(`solveStep8 : coin pas orienté après 6 triggers`);
  }
  // U-turn final pour aligner la face haute (les centres latéraux peuvent être
  // décalés après plusieurs U-turns intermédiaires)
  let finalU = 0;
  while (!isSolved(state) && finalU < 4) {
    allMoves.push('U');
    applyMove(state, 'U');
    finalU++;
  }
  if (!isSolved(state)) throw new Error('solveStep8 : pas résolu après orientation');
  return allMoves;
}

// ─── API : résolution complète ───────────────────────────────────────────
export function solveAll(state) {
  return [
    solveStep1_cross(state),
    solveStep2_alignCross(state),
    solveStep3_firstLayerCorners(state),
    solveStep4_secondLayer(state),
    solveStep5_yellowCross(state),
    solveStep6_alignYellowCross(state),
    solveStep7_permuteCorners(state),
    solveStep8_orientCorners(state),
  ];
}

// ─── Simplification de séquences de moves ────────────────────────────────
// Collapse les moves redondants : U U → U2, U U U → U', U U U U → (vide),
// M M' → (vide), M2 M2 → (vide), M M2 → M', etc.
export function simplifyMoves(moves) {
  // Représentation : chaque move = (face, count) avec count ∈ {1, 2, 3} mod 4.
  // count 1 = base move, 2 = double, 3 = inverse, 0 = identity (élidé).
  const out = [];
  for (const m of moves) {
    const face = m[0];
    let count;
    if (m.endsWith("'")) count = 3;
    else if (m.endsWith('2')) count = 2;
    else count = 1;

    // Si même face que dernier : fusionner
    if (out.length > 0 && out[out.length - 1][0] === face) {
      const newCount = (out[out.length - 1][1] + count) % 4;
      if (newCount === 0) {
        out.pop();
      } else {
        out[out.length - 1][1] = newCount;
      }
    } else {
      out.push([face, count]);
    }
  }
  // Recompose en notation standard
  return out.map(([f, c]) => {
    if (c === 1) return f;
    if (c === 2) return f + '2';
    if (c === 3) return f + "'";
    return null;
  }).filter(Boolean);
}
