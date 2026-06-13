// ─── Cartes d'instruction avec mini-cube 3D pour chaque mouvement ────────
//
// Chaque mouvement (R, R', R2 … B2) est illustré par un petit cube en
// projection isométrique (on voit 3 faces : haut, avant, droite) :
//   - la COUCHE qui tourne est mise en couleur (la vraie couleur de la face
//     sur le cube : droite = rouge, haut = jaune, …)
//   - une flèche de rotation en perspective 3D montre le sens (horaire,
//     antihoraire, ou demi-tour)
//
// À côté : la face nommée en toutes lettres + le sens (i18n) + la notation
// compacte (R2) en petit badge.
//
// Plutôt que de dessiner les 18 mouvements à la main, on PROJETTE de vraies
// coordonnées 3D en isométrique. Un mouvement se résume alors à : quelle
// couche colorer + autour de quel axe enrouler la flèche.

import { t } from './i18n.js';

// Couleurs réelles des stickers (synchro avec js/cube3d.js).
const FACE_COLOR = {
  U: '#ffd500', D: '#f6f6f6', R: '#c41e3a',
  L: '#ff7f1f', F: '#1bb55c', B: '#3b6df0',
};
const NEUTRAL    = '#d3cab5';  // stickers non concernés (assez foncé pour que le blanc ressorte)
const STICKER_LN = '#2c2820';  // contour des stickers
const ARROW_DARK = '#211d18';
const ARROW_HALO = '#fffdf8';

// Pour chaque face : l'axe tourné, le signe de la couche, et le signe de la
// rotation 3D d'un quart de tour « simple » (convention identique à cube3d.js :
// R,U,F tournent de -90° ; L,D,B de +90° autour de l'axe + correspondant).
const MOVE = {
  R: { axis: 'x', layer:  1, rot: -1 },
  L: { axis: 'x', layer: -1, rot: +1 },
  U: { axis: 'y', layer:  1, rot: -1 },
  D: { axis: 'y', layer: -1, rot: +1 },
  F: { axis: 'z', layer:  1, rot: -1 },
  B: { axis: 'z', layer: -1, rot: +1 },
};

// ─── Projection isométrique 3D → 2D ──────────────────────────────────────
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;
const SCALE = 8.2;
const CX = 32, CY = 33;   // centre dans un viewBox 64×64

function project(x, y, z) {
  const sx = (x - z) * COS30;
  const sy = (x + z) * SIN30 - y;
  return [CX + sx * SCALE, CY + sy * SCALE];
}
const fmt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;

// Un point sur le cercle de rotation autour d'un axe, à la profondeur `plane`.
function circlePoint(axis, plane, r, t) {
  const c = r * Math.cos(t), s = r * Math.sin(t);
  if (axis === 'x') return [plane, c, s];
  if (axis === 'y') return [c, plane, s];
  return [c, s, plane];               // axis === 'z'
}

// ─── Les 3 faces visibles, en stickers 3×3 ───────────────────────────────
// Chaque face est décrite par : la coord fixe, et comment varient les 2
// autres. On renvoie, pour chaque sticker, ses coords cubies (cx,cy,cz) et le
// quadrilatère projeté.
function faceStickers(face) {
  const out = [];
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      let cx, cy, cz, corners;
      const lo = -0.5, hi = 0.5;
      if (face === 'U') {        // y = 1.5, varie x (a) et z (b)
        cx = a; cy = 1; cz = b;
        corners = [
          [a + lo, 1.5, b + lo], [a + hi, 1.5, b + lo],
          [a + hi, 1.5, b + hi], [a + lo, 1.5, b + hi],
        ];
      } else if (face === 'R') { // x = 1.5, varie y (a) et z (b)
        cx = 1; cy = a; cz = b;
        corners = [
          [1.5, a + lo, b + lo], [1.5, a + hi, b + lo],
          [1.5, a + hi, b + hi], [1.5, a + lo, b + hi],
        ];
      } else {                   // F : z = 1.5, varie x (a) et y (b)
        cx = a; cy = b; cz = 1;
        corners = [
          [a + lo, b + lo, 1.5], [a + hi, b + lo, 1.5],
          [a + hi, b + hi, 1.5], [a + lo, b + hi, 1.5],
        ];
      }
      out.push({ cx, cy, cz, corners });
    }
  }
  return out;
}

// Un sticker appartient-il à la couche en rotation ?
function inLayer(s, axis, layer) {
  const coord = axis === 'x' ? s.cx : axis === 'y' ? s.cy : s.cz;
  return coord === layer;
}

// ─── Flèche de rotation en perspective ───────────────────────────────────
function arrowHead(px, py, ang, size) {
  const tip = [px + size * Math.cos(ang), py + size * Math.sin(ang)];
  const b1 = [px + size * 0.85 * Math.cos(ang + 2.5), py + size * 0.85 * Math.sin(ang + 2.5)];
  const b2 = [px + size * 0.85 * Math.cos(ang - 2.5), py + size * 0.85 * Math.sin(ang - 2.5)];
  return `${fmt(tip)} ${fmt(b1)} ${fmt(b2)}`;
}

// Angle de départ de l'arc par axe (pour placer joliment l'ouverture).
const ARC_START = { x: -40, y: 150, z: 210 };

function rotationArrow(axis, layer, rotSign, half) {
  const r = 1.15;
  const plane = layer * 1.6;                  // juste au-dessus de la face
  const spanDeg = half ? 180 : 265;
  const span = (spanDeg * Math.PI) / 180;
  const t0 = (ARC_START[axis] * Math.PI) / 180;
  const dir = rotSign;
  const N = 28;

  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = t0 + dir * span * (i / N);
    pts.push(project(...circlePoint(axis, plane, r, t)));
  }
  const d = 'M ' + pts.map(fmt).join(' L ');

  // pointe à la fin, orientée selon la tangente
  const a = pts[N], b = pts[N - 1];
  const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  let heads = `<polygon points="${arrowHead(a[0], a[1], ang, 3.6)}"
                 fill="${ARROW_DARK}" stroke="${ARROW_HALO}" stroke-width="0.6"/>`;
  if (half) {
    // demi-tour : seconde pointe au départ, sens opposé
    const a2 = pts[0], b2 = pts[1];
    const ang2 = Math.atan2(a2[1] - b2[1], a2[0] - b2[0]);
    heads += `<polygon points="${arrowHead(a2[0], a2[1], ang2, 3.6)}"
                 fill="${ARROW_DARK}" stroke="${ARROW_HALO}" stroke-width="0.6"/>`;
  }

  // tracé : halo clair dessous, trait sombre dessus → visible sur toute couleur
  return `
    <path d="${d}" fill="none" stroke="${ARROW_HALO}" stroke-width="4.2"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${ARROW_DARK}" stroke-width="2.3"
          stroke-linecap="round" stroke-linejoin="round"/>
    ${heads}
  `;
}

// ─── Construction du SVG du mini-cube pour un mouvement ──────────────────
function cubeSvg(face, suffix) {
  const { axis, layer, rot } = MOVE[face];
  const half = suffix === '2';
  const rotSign = suffix === "'" ? -rot : rot;   // ' inverse le sens
  const color = FACE_COLOR[face];

  // On dessine F puis R puis U (les 3 faces visibles ne se chevauchent pas).
  let stickers = '';
  for (const f of ['F', 'R', 'U']) {
    for (const s of faceStickers(f)) {
      const fill = inLayer(s, axis, layer) ? color : NEUTRAL;
      const d = 'M ' + s.corners.map(c => fmt(project(...c))).join(' L ') + ' Z';
      stickers += `<path d="${d}" fill="${fill}" stroke="${STICKER_LN}"
                     stroke-width="0.7" stroke-linejoin="round"/>`;
    }
  }

  const arrow = rotationArrow(axis, layer, rotSign, half);
  return `<svg viewBox="0 0 64 64" class="move-card__cube-svg" aria-hidden="true">
            ${stickers}${arrow}
          </svg>`;
}

// ─── API publique : crée une carte DOM pour un mouvement ─────────────────
export function createMoveIcon(move) {
  const m = move.match(/^([RLUDFB])([2']?)$/);
  if (!m) throw new Error(`Move inconnu : ${move}`);
  const face = m[1];
  const suffix = m[2];

  const turnKey = suffix === '2' ? 'half' : suffix === "'" ? 'ccw' : 'cw';
  const faceName = t(`moves.faces.${face}`);
  const dirName = t(`moves.turns.${turnKey}`);

  const wrapper = document.createElement('div');
  wrapper.className = 'move-card';
  wrapper.setAttribute('role', 'listitem');
  wrapper.setAttribute('aria-label', `${faceName}, ${dirName} (${move})`);
  wrapper.innerHTML = `
    <span class="move-card__cube">${cubeSvg(face, suffix)}</span>
    <span class="move-card__text">
      <span class="move-card__face">${escapeHtml(faceName)}</span>
      <span class="move-card__dir">${escapeHtml(dirName)}</span>
    </span>
    <span class="move-card__badge">${escapeHtml(move)}</span>
  `;
  return wrapper;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
