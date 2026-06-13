// ─── Moteur d'état d'un Rubik's cube (modèle facelet) ───────────────────
//
// Le cube est représenté par un Uint8Array de 54 entiers, un par sticker.
// Couleurs : 0=W(blanc), 1=Y(jaune), 2=R(rouge), 3=O(orange), 4=G(vert), 5=B(bleu).
//
// Indexation des 54 facelets par face dans l'ordre URFDLB :
//   U: 0-8   (top,    jaune)
//   R: 9-17  (right,  rouge)
//   F: 18-26 (front,  vert)
//   D: 27-35 (bottom, blanc)
//   L: 36-44 (left,   orange)
//   B: 45-53 (back,   bleu)
//
// Sur chaque face vue de l'extérieur, les 9 facelets sont disposés ainsi :
//
//      0 1 2        ← rangée haute (= côté "back" pour U et D, côté "up" pour les autres)
//      3 4 5
//      6 7 8        ← rangée basse
//
// Le facelet 4 (5e d'une face) est le centre - il ne bouge jamais.
//
// Convention 3D (identique à cube3d.js) :
//   +X = droite (face R)         +Y = haut (face U)        +Z = avant (face F)
// Les moves utilisent les rotations right-hand-rule.
// U "horaire vu du dessus" = rotation R_Y(-π/2). Idem R/F/L/D/B avec leurs axes.

export const COLORS = { W: 0, Y: 1, R: 2, O: 3, G: 4, B: 5 };
const C = COLORS;
const FACE_COLOR = [C.Y, C.R, C.G, C.W, C.O, C.B];  // index = face (U,R,F,D,L,B)
const FACE_INDEX = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

// FACELET_POS[i] = [x, y, z, nx, ny, nz] où (x,y,z) est la position 3D
// du sticker dans {-1, 0, 1}^3 et (nx,ny,nz) la direction de sa normale
// (vers l'extérieur du cube).
const FACELET_POS = [
  // U face (y=+1) - facelets 0..8 - vue d'au-dessus, "haut" du layout = -Z (arrière du cube)
  [-1, 1, -1, 0, 1, 0], [0, 1, -1, 0, 1, 0], [1, 1, -1, 0, 1, 0],
  [-1, 1,  0, 0, 1, 0], [0, 1,  0, 0, 1, 0], [1, 1,  0, 0, 1, 0],
  [-1, 1,  1, 0, 1, 0], [0, 1,  1, 0, 1, 0], [1, 1,  1, 0, 1, 0],

  // R face (x=+1) - facelets 9..17 - vue de la droite, "haut" du layout = +Y, "gauche" = +Z
  [1,  1,  1, 1, 0, 0], [1,  1,  0, 1, 0, 0], [1,  1, -1, 1, 0, 0],
  [1,  0,  1, 1, 0, 0], [1,  0,  0, 1, 0, 0], [1,  0, -1, 1, 0, 0],
  [1, -1,  1, 1, 0, 0], [1, -1,  0, 1, 0, 0], [1, -1, -1, 1, 0, 0],

  // F face (z=+1) - facelets 18..26 - vue de devant, "haut" = +Y, "gauche" = -X
  [-1,  1, 1, 0, 0, 1], [0,  1, 1, 0, 0, 1], [1,  1, 1, 0, 0, 1],
  [-1,  0, 1, 0, 0, 1], [0,  0, 1, 0, 0, 1], [1,  0, 1, 0, 0, 1],
  [-1, -1, 1, 0, 0, 1], [0, -1, 1, 0, 0, 1], [1, -1, 1, 0, 0, 1],

  // D face (y=-1) - facelets 27..35 - vue d'en bas, "haut" du layout = +Z (avant)
  [-1, -1,  1, 0, -1, 0], [0, -1,  1, 0, -1, 0], [1, -1,  1, 0, -1, 0],
  [-1, -1,  0, 0, -1, 0], [0, -1,  0, 0, -1, 0], [1, -1,  0, 0, -1, 0],
  [-1, -1, -1, 0, -1, 0], [0, -1, -1, 0, -1, 0], [1, -1, -1, 0, -1, 0],

  // L face (x=-1) - facelets 36..44 - vue de gauche, "haut" = +Y, "gauche" = -Z
  [-1,  1, -1, -1, 0, 0], [-1,  1,  0, -1, 0, 0], [-1,  1,  1, -1, 0, 0],
  [-1,  0, -1, -1, 0, 0], [-1,  0,  0, -1, 0, 0], [-1,  0,  1, -1, 0, 0],
  [-1, -1, -1, -1, 0, 0], [-1, -1,  0, -1, 0, 0], [-1, -1,  1, -1, 0, 0],

  // B face (z=-1) - facelets 45..53 - vue de derrière, "haut" = +Y, "gauche" = +X
  [ 1,  1, -1, 0, 0, -1], [0,  1, -1, 0, 0, -1], [-1,  1, -1, 0, 0, -1],
  [ 1,  0, -1, 0, 0, -1], [0,  0, -1, 0, 0, -1], [-1,  0, -1, 0, 0, -1],
  [ 1, -1, -1, 0, 0, -1], [0, -1, -1, 0, 0, -1], [-1, -1, -1, 0, 0, -1],
];

// ─── Définition des 6 moves de base (sens identique à cube3d.js) ─────────
const MOVE_DEFS = {
  R: { axis: 'x', layer:  1, sign: -1 },
  L: { axis: 'x', layer: -1, sign: +1 },
  U: { axis: 'y', layer:  1, sign: -1 },
  D: { axis: 'y', layer: -1, sign: +1 },
  F: { axis: 'z', layer:  1, sign: -1 },
  B: { axis: 'z', layer: -1, sign: +1 },
};

// Rotation 3D d'un vecteur (right-hand rule). Comme angle ∈ {±π/2, ±π},
// cos et sin donnent toujours des entiers, on arrondit pour éviter les flottants.
function rotateVec(v, axis, signedAngle) {
  const c = Math.round(Math.cos(signedAngle));
  const s = Math.round(Math.sin(signedAngle));
  const [x, y, z] = v;
  if (axis === 'x') return [x, y * c - z * s, y * s + z * c];
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];  // axis === 'z'
}

function findFaceletIdx(x, y, z, nx, ny, nz) {
  for (let i = 0; i < 54; i++) {
    const p = FACELET_POS[i];
    if (p[0] === x && p[1] === y && p[2] === z &&
        p[3] === nx && p[4] === ny && p[5] === nz) return i;
  }
  return -1;
}

// Construit la permutation { ancien index → nouvel index } pour une rotation donnée.
function buildPermutation(axis, layer, signedAngle) {
  const perm = new Int8Array(54);
  for (let i = 0; i < 54; i++) perm[i] = i;
  for (let i = 0; i < 54; i++) {
    const [x, y, z, nx, ny, nz] = FACELET_POS[i];
    const coord = axis === 'x' ? x : axis === 'y' ? y : z;
    if (coord !== layer) continue;  // facelet pas sur la couche tournante
    const [x2, y2, z2] = rotateVec([x, y, z], axis, signedAngle);
    const [nx2, ny2, nz2] = rotateVec([nx, ny, nz], axis, signedAngle);
    const target = findFaceletIdx(x2, y2, z2, nx2, ny2, nz2);
    if (target < 0) throw new Error(`buildPermutation: facelet introuvable pour (${x2},${y2},${z2}) normal (${nx2},${ny2},${nz2})`);
    perm[i] = target;
  }
  return perm;
}

// Cache des 18 permutations
const MOVE_PERMS = {};
for (const face of Object.keys(MOVE_DEFS)) {
  const { axis, layer, sign } = MOVE_DEFS[face];
  MOVE_PERMS[face]        = buildPermutation(axis, layer,  sign * Math.PI / 2);
  MOVE_PERMS[face + "'"]  = buildPermutation(axis, layer, -sign * Math.PI / 2);
  MOVE_PERMS[face + "2"]  = buildPermutation(axis, layer,  sign * Math.PI);
}

// ─── API publique ────────────────────────────────────────────────────────

export function createCube() {
  const s = new Uint8Array(54);
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 9; i++) s[f * 9 + i] = FACE_COLOR[f];
  }
  return s;
}

export function applyMove(state, move) {
  const perm = MOVE_PERMS[move];
  if (!perm) throw new Error(`Move inconnu : "${move}"`);
  const tmp = new Uint8Array(54);
  for (let i = 0; i < 54; i++) tmp[perm[i]] = state[i];
  state.set(tmp);
}

export function applySequence(state, moves) {
  for (const m of moves) applyMove(state, m);
}

export function cloneState(state) {
  return new Uint8Array(state);
}

export function isSolved(state) {
  for (let f = 0; f < 6; f++) {
    const c = state[f * 9 + 4];
    for (let i = 0; i < 9; i++) {
      if (state[f * 9 + i] !== c) return false;
    }
  }
  return true;
}

// ─── Helpers de structure : regrouper les facelets par cubie ────────────

// Pour chaque cubie (corner ou edge), liste les indices de ses facelets.
// Centres exclus (ils ne bougent pas).
function buildCubieList(filter) {
  const groups = new Map();
  for (let i = 0; i < 54; i++) {
    const [x, y, z] = FACELET_POS[i];
    const key = `${x},${y},${z}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  const out = [];
  for (const [key, facelets] of groups) {
    if (facelets.length === filter) out.push(facelets);
  }
  return out;
}
export const CORNER_CUBIES = buildCubieList(3);   // 8 coins
export const EDGE_CUBIES   = buildCubieList(2);   // 12 arêtes

// Retourne les couleurs présentes sur un cubie (set sous forme d'array trié)
function cubieColors(state, faceletList) {
  return faceletList.map(i => state[i]).sort((a, b) => a - b);
}

function setEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Trouve le cubie d'arête qui contient ces deux couleurs.
// Renvoie { facelets: [idx1, idx2], pos: [x,y,z], colorAt: {face → couleur} }
// où "colorAt[face]" indique quelle couleur est sur quel facelet du cubie.
export function findEdge(state, c1, c2) {
  const target = [c1, c2].sort((a, b) => a - b);
  for (const facelets of EDGE_CUBIES) {
    if (setEq(cubieColors(state, facelets), target)) {
      return makeCubieInfo(state, facelets);
    }
  }
  throw new Error(`Edge introuvable : couleurs ${c1},${c2}`);
}

// Trouve le coin contenant ces trois couleurs.
export function findCorner(state, c1, c2, c3) {
  const target = [c1, c2, c3].sort((a, b) => a - b);
  for (const facelets of CORNER_CUBIES) {
    if (setEq(cubieColors(state, facelets), target)) {
      return makeCubieInfo(state, facelets);
    }
  }
  throw new Error(`Corner introuvable : couleurs ${c1},${c2},${c3}`);
}

function makeCubieInfo(state, facelets) {
  const pos = FACELET_POS[facelets[0]].slice(0, 3);  // (x,y,z) du cubie
  // Pour chaque facelet, on retient (normale, couleur)
  const stickers = facelets.map(i => ({
    facelet: i,
    normal: FACELET_POS[i].slice(3, 6),
    color: state[i],
  }));
  return { pos, stickers };
}

// Couleur sur la face de normale n=(nx,ny,nz) du cubie à position (x,y,z).
// Renvoie -1 si pas de sticker à cet endroit (face cachée).
export function getColorAt(state, x, y, z, nx, ny, nz) {
  const i = findFaceletIdx(x, y, z, nx, ny, nz);
  return i >= 0 ? state[i] : -1;
}

// Couleur du centre d'une face donnée
export function centerColor(state, face) {
  return state[FACE_INDEX[face] * 9 + 4];
}

// ─── Queries de progression de la résolution ────────────────────────────

// La croix sur la face faceColor est-elle faite ?
// = les 4 facelets d'arête de cette face sont tous de couleur faceColor
//   ET chaque arête a sa couleur "secondaire" sur la face voisine du centre adjacent.
// Pour l'étape 1 (croix simple, pas alignée), on vérifie juste la 1ère condition.
export function isCrossDone(state, faceColor) {
  // Trouver la face physique (U, D, F, B, L, R) qui a faceColor au centre
  let face = -1;
  for (let f = 0; f < 6; f++) if (state[f * 9 + 4] === faceColor) { face = f; break; }
  if (face < 0) return false;
  // Indices des 4 arêtes sur cette face : 1, 3, 5, 7
  return state[face * 9 + 1] === faceColor &&
         state[face * 9 + 3] === faceColor &&
         state[face * 9 + 5] === faceColor &&
         state[face * 9 + 7] === faceColor;
}

// La croix est-elle alignée avec les centres voisins ?
export function isCrossAligned(state, faceColor) {
  if (!isCrossDone(state, faceColor)) return false;
  // Pour la face D (blanche) : les 4 arêtes adjacentes sont D2 (z=+1, F), D6 (x=+1, R),
  // D8 (z=-1, B), D4 (x=-1, L). Les couleurs "secondaires" doivent matcher
  // les centres voisins.
  // Plus générique : pour chaque arête de la croix, regarder sa couleur secondaire
  // et vérifier qu'elle = couleur du centre de la face voisine.
  // On utilise findEdge pour ça : pour chaque couple (faceColor, otherCenter), l'arête doit
  // être à la bonne position avec la bonne orientation.
  for (let f = 0; f < 6; f++) {
    if (state[f * 9 + 4] === faceColor) continue;  // skip la face cible et son opposée
    const otherColor = state[f * 9 + 4];
    // Skip la face opposée à la face cible (elle ne touche pas)
    if (areOpposite(faceColor, otherColor)) continue;
    // Cherche l'arête (faceColor, otherColor)
    const edge = findEdge(state, faceColor, otherColor);
    // Vérifie : un des 2 stickers de l'arête doit être sur la face cible
    // ET avoir la couleur otherColor sur la face voisine.
    const targetCenter = centerOfColor(faceColor);
    const otherCenter = centerOfColor(otherColor);
    let okMain = false, okOther = false;
    for (const sticker of edge.stickers) {
      if (vectEq(sticker.normal, targetCenter) && sticker.color === faceColor) okMain = true;
      if (vectEq(sticker.normal, otherCenter) && sticker.color === otherColor) okOther = true;
    }
    if (!okMain || !okOther) return false;
  }
  return true;
}

function vectEq(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

// Normale (vecteur 3D) du centre d'une face d'une couleur donnée.
function centerOfColor(color) {
  for (let f = 0; f < 6; f++) {
    if (FACE_COLOR[f] === color) return FACELET_POS[f * 9 + 4].slice(3, 6);
  }
  throw new Error(`Pas de centre pour la couleur ${color}`);
}

// 2 couleurs sont opposées (sur faces opposées du cube) ?
function areOpposite(c1, c2) {
  // U opposé D, R opposé L, F opposé B → couleurs : Y↔W, R↔O, G↔B
  return (c1 === C.W && c2 === C.Y) || (c1 === C.Y && c2 === C.W) ||
         (c1 === C.R && c2 === C.O) || (c1 === C.O && c2 === C.R) ||
         (c1 === C.G && c2 === C.B) || (c1 === C.B && c2 === C.G);
}

// La 1ère couronne est-elle faite ? = face entière + bandeaux des 4 faces voisines
export function isFirstLayerDone(state, faceColor) {
  if (!isCrossAligned(state, faceColor)) return false;
  // Les 4 coins de la face faceColor doivent être complets
  let face = -1;
  for (let f = 0; f < 6; f++) if (state[f * 9 + 4] === faceColor) { face = f; break; }
  // Vérifier les 4 coins de cette face
  if (state[face * 9 + 0] !== faceColor) return false;
  if (state[face * 9 + 2] !== faceColor) return false;
  if (state[face * 9 + 6] !== faceColor) return false;
  if (state[face * 9 + 8] !== faceColor) return false;
  // Vérifier les bandeaux sur les faces voisines.
  // Pour la face D (blanche) : les 4 facelets d'angle des faces F, R, B, L
  // doivent matcher leurs centres respectifs. Plus simple : on prend chaque coin
  // de la face cible, on trouve ses 2 autres facelets et on vérifie qu'ils
  // matchent leurs centres voisins.
  for (const corner of CORNER_CUBIES) {
    // Skip si le coin ne touche pas la face cible
    const hasFace = corner.some(i => {
      const [, , , nx, ny, nz] = FACELET_POS[i];
      return vectEq([nx, ny, nz], centerOfColor(faceColor)) && state[i] === faceColor;
    });
    if (!hasFace) continue;
    // Pour chaque autre sticker du coin, sa couleur doit matcher le centre de sa face
    for (const i of corner) {
      const [, , , nx, ny, nz] = FACELET_POS[i];
      if (vectEq([nx, ny, nz], centerOfColor(faceColor))) continue;  // sticker sur la face cible
      const expectedColor = getColorAt(state, 0, 0, 0, nx, ny, nz);
      // 0,0,0 + normale donne directement le centre de cette face : on cherche le facelet center.
      // Plus simple : trouver le facelet à (nx, ny, nz)*1 + normale (nx,ny,nz).
      const centerFacelet = findFaceletIdx(nx, ny, nz, nx, ny, nz);
      if (centerFacelet < 0) continue;
      if (state[i] !== state[centerFacelet]) return false;
    }
  }
  return true;
}

// La 2ème couronne est-elle faite ? (les 4 arêtes mid + la 1ère couronne)
export function isSecondLayerDone(state, bottomFaceColor) {
  if (!isFirstLayerDone(state, bottomFaceColor)) return false;
  // Les 4 arêtes mid : y=0, x et z ∈ {-1, +1}. Chacune doit avoir
  // ses 2 stickers de la couleur des centres voisins.
  for (const edge of EDGE_CUBIES) {
    const [x, y, z] = FACELET_POS[edge[0]];
    if (y !== 0) continue;  // pas une arête mid
    for (const i of edge) {
      const [, , , nx, ny, nz] = FACELET_POS[i];
      const centerFacelet = findFaceletIdx(nx, ny, nz, nx, ny, nz);
      if (state[i] !== state[centerFacelet]) return false;
    }
  }
  return true;
}

// La croix jaune (4 facelets U de couleur Y autour du centre) est-elle faite ?
export function isYellowCrossDone(state) {
  const center = state[4];  // centre de U
  return state[1] === center && state[3] === center && state[5] === center && state[7] === center;
}

// La face U est-elle entièrement de la couleur de son centre ?
export function isLastLayerOriented(state) {
  const center = state[4];
  for (let i = 0; i < 9; i++) if (state[i] !== center) return false;
  return true;
}

// Détecte le pattern de la face U : 'dot', 'L', 'line', 'cross'.
// Les 4 facelets considérés sont U2, U4, U6, U8 (indices 1, 3, 5, 7).
export function getTopPattern(state) {
  const y = state[4];  // couleur du centre U
  const f = [state[1], state[3], state[5], state[7]].map(c => c === y);
  const count = f.filter(x => x).length;
  if (count === 4) return 'cross';
  if (count === 0) return 'dot';
  if (count === 2) {
    // ligne si opposés (1&7 ou 3&5), sinon L
    if ((f[0] && f[3]) || (f[1] && f[2])) return 'line';
    return 'L';
  }
  // 1 ou 3 yellows : ne devrait pas arriver dans un cube valide après étape 4,
  // mais on renvoie 'dot' par défaut pour ne pas planter.
  return 'dot';
}

// Combien de coins de la face U sont au bon endroit (sans considérer l'orientation) ?
// Un coin est "au bon endroit" si ses 3 couleurs correspondent aux centres
// des 3 faces sur lesquelles le coin est positionné.
export function countCorrectTopCorners(state) {
  let count = 0;
  for (const corner of CORNER_CUBIES) {
    if (FACELET_POS[corner[0]][1] !== 1) continue;  // skip les coins du bas
    // Couleurs présentes sur le coin
    const colorsOnCorner = corner.map(i => state[i]).sort((a, b) => a - b);
    // Couleurs attendues (= couleurs des 3 centres voisins)
    const expectedColors = corner.map(i => {
      const [, , , nx, ny, nz] = FACELET_POS[i];
      const ci = findFaceletIdx(nx, ny, nz, nx, ny, nz);
      return state[ci];
    }).sort((a, b) => a - b);
    if (setEq(colorsOnCorner, expectedColors)) count++;
  }
  return count;
}

// Renvoie la position (x,y,z) du coin du haut qui est au bon endroit, OU null si aucun.
export function findCorrectTopCorner(state) {
  for (const corner of CORNER_CUBIES) {
    if (FACELET_POS[corner[0]][1] !== 1) continue;
    const colorsOnCorner = corner.map(i => state[i]).sort((a, b) => a - b);
    const expectedColors = corner.map(i => {
      const [, , , nx, ny, nz] = FACELET_POS[i];
      const ci = findFaceletIdx(nx, ny, nz, nx, ny, nz);
      return state[ci];
    }).sort((a, b) => a - b);
    if (setEq(colorsOnCorner, expectedColors)) return FACELET_POS[corner[0]].slice(0, 3);
  }
  return null;
}

// Position d'un coin du haut "non orienté" (= sa face Y n'est pas jaune)
export function findUnorientedTopCorner(state) {
  for (const corner of CORNER_CUBIES) {
    if (FACELET_POS[corner[0]][1] !== 1) continue;
    // Cherche le facelet de ce coin sur la face U
    for (const i of corner) {
      if (FACELET_POS[i][4] === 1) {  // normale = +Y
        if (state[i] !== C.Y) {
          return FACELET_POS[corner[0]].slice(0, 3);
        }
      }
    }
  }
  return null;
}

// Pour debug : sérialise le cube en string lisible (1 ligne par face)
export function debugString(state) {
  const names = ['U', 'R', 'F', 'D', 'L', 'B'];
  const chars = ['W', 'Y', 'R', 'O', 'G', 'B'];
  let out = '';
  for (let f = 0; f < 6; f++) {
    out += names[f] + ': ';
    for (let i = 0; i < 9; i++) {
      out += chars[state[f * 9 + i]];
      if (i % 3 === 2 && i < 8) out += ' ';
    }
    out += '\n';
  }
  return out;
}

// Expose aussi FACELET_POS et findFaceletIdx pour le solveur
export { FACELET_POS, findFaceletIdx, FACE_INDEX, FACE_COLOR };
