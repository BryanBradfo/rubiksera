// ─── Générateur de schémas SVG pour les mouvements du Rubik's cube ──────
//
// Pour chaque mouvement (R, R', R2, U, U', U2, F, F', F2, L, L', L2, D, D', D2, B, B', B2),
// on génère un mini-cube isométrique (3 faces visibles : Haut, Avant, Droite) avec :
//   - la face concernée par la rotation tintée en jaune accent
//   - une flèche courbe sur cette face indiquant le sens (horaire / antihoraire / 180°)
//
// Convention de la projection isométrique utilisée ici (vue d'un cube avec
// face avant un peu décalée vers le bas-droite) :
//   - Face HAUT  = losange en haut
//   - Face AVANT = losange en bas-gauche
//   - Face DROITE = losange en bas-droite
//   - Face BAS / GAUCHE / ARRIERE = invisibles → représentés par un cadre grisé
//
// Couleurs : la face visible concernée est en accent jaune ; les autres
// faces visibles sont en gris clair pour ne pas distraire.

import { t } from './i18n.js';

const ACCENT = '#ffd500';
const FACE_LIGHT = '#3a3a44';
const FACE_DARK = '#252530';
const STROKE = '#0d0d11';
const ARROW = '#000';
const HIDDEN_FACE = '#1f1f26';

// Coordonnées canoniques (viewBox 100×100) des 4 sommets d'un cube isométrique
// dont le centre est à (50, 52). On dessine un cube unitaire et on indique
// laquelle de ses 3 faces visibles est active.
const P = {
  topBack:    [50, 14],
  topLeft:    [16, 32],
  topRight:   [84, 32],
  topFront:   [50, 50],     // sommet où top, front, right se rencontrent
  bottomLeft: [16, 70],
  bottomRight:[84, 70],
  bottomFront:[50, 88],
};

function pathFromPoints(points) {
  return 'M ' + points.map(p => p.join(' ')).join(' L ') + ' Z';
}

// Polygones des 3 faces visibles
const FACE_PATHS = {
  U: pathFromPoints([P.topBack,  P.topRight, P.topFront, P.topLeft]),
  F: pathFromPoints([P.topLeft,  P.topFront, P.bottomFront, P.bottomLeft]),
  R: pathFromPoints([P.topFront, P.topRight, P.bottomRight, P.bottomFront]),
};

// Pour les faces cachées (D, L, B), on accroche un petit indicateur sur la
// face opposée visible avec une mention textuelle. Décision pragmatique :
// la rotation se fait quand même côté caché, mais la flèche peut être dessinée
// sur la face opposée avec un sens visuellement cohérent.
//
// Mapping : à chaque face de rotation, on associe :
//  - quelle face visible "représente" la rotation (souvent l'opposée)
//  - le sens correctif éventuel de la flèche (car vue depuis la face opposée,
//    le sens de rotation est inversé)
// labelKey est utilisé pour la traduction (i18n.t('moves.<labelKey>'))
const FACE_INFO = {
  R: { onFace: 'R', labelKey: 'right', invertArrow: false, hiddenFace: false },
  L: { onFace: 'R', labelKey: 'left',  invertArrow: true,  hiddenFace: true  },
  U: { onFace: 'U', labelKey: 'up',    invertArrow: false, hiddenFace: false },
  D: { onFace: 'U', labelKey: 'down',  invertArrow: true,  hiddenFace: true  },
  F: { onFace: 'F', labelKey: 'front', invertArrow: false, hiddenFace: false },
  B: { onFace: 'F', labelKey: 'back',  invertArrow: true,  hiddenFace: true  },
};

// Flèche courbe sur une face, sens horaire / antihoraire / 180°.
// Pour rester simple : on dessine un demi-cercle (ou cercle complet pour le 180°)
// avec une pointe de flèche à une extrémité.
function arrowOnFace(face, direction /* +1 = cw, -1 = ccw, 2 = 180 */) {
  // centre de la face (moyenne des 4 sommets du polygone)
  const cx = { U: 50, F: 33, R: 67 }[face];
  const cy = { U: 32, F: 60, R: 60 }[face];
  // rayon adapté à la taille du losange (les losanges sont ~34 large)
  const r = 12;

  if (direction === 2) {
    // 180° : on dessine un cercle complet avec une flèche à 12h
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ARROW}" stroke-width="2.6" stroke-linecap="round"/>
      <polygon points="${cx + r - 4},${cy - 5} ${cx + r + 4},${cy} ${cx + r - 4},${cy + 5}" fill="${ARROW}"/>
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="${ARROW}">180°</text>
    `;
  }

  // Demi-cercle. Direction +1 = horaire vu depuis cette face → arc de 9h à 3h
  // en passant par le haut. Direction -1 = antihoraire → arc de 3h à 9h en passant par le haut.
  const sweep = direction === 1 ? 1 : 0;  // SVG: 1 = sens horaire dans le viewBox

  // Points de départ/fin de l'arc (sur les côtés gauche et droit du centre)
  const x1 = cx - r, y1 = cy;
  const x2 = cx + r, y2 = cy;

  // Pointe de flèche à la fin de l'arc
  let arrowTip, arrowBase1, arrowBase2;
  if (direction === 1) {
    // arc va de gauche vers droite par le haut → finit en (x2, y2) en descendant
    arrowTip   = [x2, y2 + 2];
    arrowBase1 = [x2 - 5, y2 - 4];
    arrowBase2 = [x2 + 5, y2 - 4];
  } else {
    // arc va de droite vers gauche par le haut → finit en (x1, y1) en descendant
    arrowTip   = [x1, y1 + 2];
    arrowBase1 = [x1 - 5, y1 - 4];
    arrowBase2 = [x1 + 5, y1 - 4];
  }

  return `
    <path d="M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}"
          fill="none" stroke="${ARROW}" stroke-width="2.6" stroke-linecap="round"/>
    <polygon points="${arrowTip.join(',')} ${arrowBase1.join(',')} ${arrowBase2.join(',')}" fill="${ARROW}"/>
  `;
}

// ─── API publique : crée un élément SVG pour un mouvement ────────────────
export function createMoveIcon(move) {
  const m = move.match(/^([RLUDFB])([2']?)$/);
  if (!m) throw new Error(`Move inconnu : ${move}`);
  const face = m[1];
  const suffix = m[2];

  const info = FACE_INFO[face];

  // direction : +1 = horaire (= notation par défaut), -1 = antihoraire ('),
  // 2 = demi-tour (2)
  let direction;
  if (suffix === "2") direction = 2;
  else if (suffix === "'") direction = -1;
  else direction = 1;

  // Si la face est cachée (L, D, B), on inverse le sens de la flèche affichée
  // car visuellement la rotation se voit "depuis le côté opposé".
  if (info.invertArrow && direction !== 2) direction = -direction;

  // Détermine quelle face visible est colorée
  const activeFace = info.onFace;

  // Style des 3 faces visibles : la face active en accent, les autres en gris.
  // Si la rotation est sur une face cachée, on ajoute un "voile" plus sombre
  // sur la face affichée pour indiquer que c'est la face *opposée* qui tourne.
  const fills = {
    U: activeFace === 'U' ? (info.hiddenFace ? HIDDEN_FACE : ACCENT) : FACE_LIGHT,
    F: activeFace === 'F' ? (info.hiddenFace ? HIDDEN_FACE : ACCENT) : FACE_DARK,
    R: activeFace === 'R' ? (info.hiddenFace ? HIDDEN_FACE : ACCENT) : FACE_LIGHT,
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="move-icon-svg">
      <path d="${FACE_PATHS.U}" fill="${fills.U}" stroke="${STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="${FACE_PATHS.F}" fill="${fills.F}" stroke="${STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="${FACE_PATHS.R}" fill="${fills.R}" stroke="${STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
      ${arrowOnFace(activeFace, direction)}
    </svg>
  `;

  // Wrapping div avec libellé textuel (i18n)
  const faceLabel = t(`moves.${info.labelKey}`);
  const hiddenSuffix = info.hiddenFace ? ` ${t('moves.hidden')}` : '';
  const wrapper = document.createElement('div');
  wrapper.className = 'move-icon';
  wrapper.innerHTML = `
    ${svg}
    <div class="move-icon-text">
      <span class="move-icon-notation">${escapeHtml(move)}</span>
      <span class="move-icon-label">${escapeHtml(faceLabel + hiddenSuffix)}</span>
    </div>
  `;
  return wrapper;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
