import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Palette des stickers du cube ───────────────────────────────────────
// TODO(toi) : à toi de jouer ! Tu peux remplacer ces couleurs par :
//   - les couleurs Rubik officielles (très saturées, voir code commenté)
//   - une palette plus douce / pastel
//   - les couleurs de ton équipe favorite, qui sait
// Convention : blanc = bas, jaune = haut, vert = avant, bleu = arrière,
//              rouge = droite, orange = gauche.
const STICKERS = {
  U: 0xffd500,  // up    = jaune
  D: 0xf6f6f6,  // down  = blanc
  R: 0xc41e3a,  // right = rouge
  L: 0xff7f1f,  // left  = orange
  F: 0x1bb55c,  // front = vert
  B: 0x3b6df0,  // back  = bleu
};
const INNER = 0x111114;  // couleur des faces internes (cachées) du cubie

const PI_2 = Math.PI / 2;
const EPS = 1e-4;

// ─── Initialisation Three.js (scène, caméra, lumière, contrôles) ────────
export function createCube3D(container) {
  const scene = new THREE.Scene();
  scene.background = null;

  // Deux vues canoniques :
  //   - 'white' : caméra en y NÉGATIF → on voit la face blanche (D) + rouge + vert.
  //               Utilisée pour les étapes 1-3 du PDF où on regarde la face blanche.
  //   - 'yellow': caméra en y POSITIF → on voit la face jaune (U) + rouge + vert.
  //               Utilisée à partir de l'étape 4 (« mettre la face blanche vers le bas »).
  const VIEWS = {
    white:  new THREE.Vector3(6.2, -4.5, 6.2),
    yellow: new THREE.Vector3(6.2,  4.5, 6.2),
  };

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.copy(VIEWS.white);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Éclairage doux : ambient + une directionnelle pour donner du relief
  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const dir = new THREE.DirectionalLight(0xffffff, 0.55);
  dir.position.set(6, 8, 4);
  scene.add(dir);
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.25);
  dir2.position.set(-5, -3, -4);
  scene.add(dir2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 18;

  // ─── Construction du cube : 27 cubies ───────────────────────────────
  const cubies = [];
  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  const SIZE = 0.96;             // taille d'un cubie (gap de 0.04 entre eux)
  const geom = new THREE.BoxGeometry(SIZE, SIZE, SIZE);

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // 6 matériaux : ordre Three.js = +X, -X, +Y, -Y, +Z, -Z
        const mats = [
          new THREE.MeshLambertMaterial({ color: x ===  1 ? STICKERS.R : INNER }),
          new THREE.MeshLambertMaterial({ color: x === -1 ? STICKERS.L : INNER }),
          new THREE.MeshLambertMaterial({ color: y ===  1 ? STICKERS.U : INNER }),
          new THREE.MeshLambertMaterial({ color: y === -1 ? STICKERS.D : INNER }),
          new THREE.MeshLambertMaterial({ color: z ===  1 ? STICKERS.F : INNER }),
          new THREE.MeshLambertMaterial({ color: z === -1 ? STICKERS.B : INNER }),
        ];
        const cubie = new THREE.Mesh(geom, mats);
        cubie.position.set(x, y, z);
        cubeGroup.add(cubie);
        cubies.push(cubie);

        // Léger contour foncé sur chaque arête de cubie : on ajoute
        // une LineSegments par-dessus la box pour bien voir les stickers.
        const edges = new THREE.EdgesGeometry(geom);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
        );
        cubie.add(line);
      }
    }
  }

  // ─── Resize ─────────────────────────────────────────────────────────
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  // ─── Boucle de rendu ────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // ─── État interne d'animation ───────────────────────────────────────
  let busy = Promise.resolve();
  let cancelled = false;

  // Rotation d'une couche : axis ∈ 'x'|'y'|'z', layer ∈ -1|0|1,
  //                        angle = ±π/2 ou ±π (pour les moves « 2 »)
  function rotateLayer(axis, layer, angle, durationMs) {
    return new Promise(resolve => {
      const pivot = new THREE.Object3D();
      scene.add(pivot);

      const moving = cubies.filter(c => Math.round(c.position[axis]) === layer);
      moving.forEach(c => pivot.attach(c));

      const start = performance.now();
      function tick(now) {
        if (cancelled) {
          // sortie propre : on saute à la fin immédiatement
          finish();
          return;
        }
        const t = Math.min(1, (now - start) / durationMs);
        const eased = easeInOutQuad(t);
        pivot.rotation[axis] = angle * eased;
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          finish();
        }
      }
      function finish() {
        pivot.rotation[axis] = angle;
        // re-attache les cubies à la scène (en gardant la transform monde),
        // puis snap positions + rotations pour éviter la dérive numérique.
        moving.forEach(c => {
          cubeGroup.attach(c);
          snap(c);
        });
        scene.remove(pivot);
        resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  // Snap les coordonnées d'un cubie à des entiers et sa rotation à un
  // multiple de π/2. Sans ça, les erreurs flottantes s'accumulent.
  function snap(cubie) {
    cubie.position.x = Math.round(cubie.position.x);
    cubie.position.y = Math.round(cubie.position.y);
    cubie.position.z = Math.round(cubie.position.z);
    // Pour la rotation, on prend la matrice, on l'arrondit à la rotation
    // 90° la plus proche par axe. Méthode pragmatique : convertir en quaternion,
    // chercher quelle base orthonormée est la plus proche, et resetter.
    const m = new THREE.Matrix4().makeRotationFromEuler(cubie.rotation);
    const snapped = snapMatrixToOrthonormal(m);
    cubie.rotation.setFromRotationMatrix(snapped);
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // ─── API publique : envoyer une séquence de moves ──────────────────
  // moves : liste de strings notation standard ("R", "R'", "R2", "U", ...)
  // durationMs : durée d'un quart de tour
  // onMoveStart(idx, move) : callback appelé avant chaque move
  function applySequence(moves, durationMs = 280, onMoveStart = null) {
    busy = busy.then(async () => {
      cancelled = false;
      for (let i = 0; i < moves.length; i++) {
        if (cancelled) break;
        if (onMoveStart) onMoveStart(i, moves[i]);
        const { axis, layer, angle } = parseMove(moves[i]);
        // Un move "2" (demi-tour) est animé plus long pour rester lisible.
        const dur = Math.abs(angle) > PI_2 + EPS ? durationMs * 1.6 : durationMs;
        await rotateLayer(axis, layer, angle, dur);
      }
    });
    return busy;
  }

  function cancel() {
    cancelled = true;
  }

  function isBusy() {
    // pas de vrai flag synchrone — l'appelant doit await le retour
    // de applySequence pour savoir quand c'est fini.
    return busy;
  }

  // Reset visuel : on recrée les 27 cubies à leur position d'origine.
  function reset() {
    cancelled = true;
    busy = busy.then(() => {
      for (let i = 0; i < cubies.length; i++) {
        const c = cubies[i];
        const x = (i / 9 | 0) - 1;
        const y = ((i / 3 | 0) % 3) - 1;
        const z = (i % 3) - 1;
        // ré-attache à la scène au cas où on aurait été interrompu en plein move
        cubeGroup.attach(c);
        c.position.set(x, y, z);
        c.rotation.set(0, 0, 0);
      }
      cancelled = false;
    });
    return busy;
  }

  // ─── Animation de bascule de la caméra entre les vues "white" / "yellow" ──
  // Au lieu de retourner le cube (ce qui inverserait toutes les formules),
  // on retourne la caméra. Le cube garde sa convention interne (jaune = U).
  // Pendant l'animation, on désactive temporairement OrbitControls pour éviter
  // les conflits, puis on remet la nouvelle position comme cible des controls.
  function setCameraView(viewName, durationMs = 900) {
    const target = VIEWS[viewName];
    if (!target) throw new Error(`Vue inconnue : ${viewName}`);
    return new Promise(resolve => {
      const start = performance.now();
      const from = camera.position.clone();
      const to = target.clone();
      controls.enabled = false;
      function tick(now) {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = easeInOutQuad(t);
        camera.position.lerpVectors(from, to, eased);
        camera.lookAt(0, 0, 0);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // Repositionner la cible des OrbitControls et réactiver
          controls.target.set(0, 0, 0);
          controls.enabled = true;
          controls.update();
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  return { applySequence, cancel, isBusy, reset, setCameraView, scene, camera, renderer };
}

// ─── Parsing : "R" / "R'" / "R2" → axe, couche, angle ───────────────────
// Convention :
//   R (face droite, sens horaire vu de droite)  = rotation -π/2 autour de +X
//   U (face haut,   sens horaire vu du dessus)  = rotation -π/2 autour de +Y
//   F (face avant,  sens horaire vu de devant)  = rotation -π/2 autour de +Z
//   L, D, B = faces opposées (autre layer + sens inversé pour rester "horaire vu de leur côté")
function parseMove(notation) {
  const m = notation.match(/^([RLUDFB])([2']?)$/);
  if (!m) throw new Error(`Move invalide : "${notation}"`);
  const face = m[1];
  const suffix = m[2];

  // axis, layer, baseSign  (baseSign = signe d'un quart de tour "horaire vu de cette face")
  const FACES = {
    R: { axis: 'x', layer:  1, baseSign: -1 },
    L: { axis: 'x', layer: -1, baseSign: +1 },
    U: { axis: 'y', layer:  1, baseSign: -1 },
    D: { axis: 'y', layer: -1, baseSign: +1 },
    F: { axis: 'z', layer:  1, baseSign: -1 },
    B: { axis: 'z', layer: -1, baseSign: +1 },
  };
  const f = FACES[face];
  let angle = f.baseSign * PI_2;
  if (suffix === "'") angle = -angle;
  if (suffix === '2') angle = angle * 2;
  return { axis: f.axis, layer: f.layer, angle };
}

// Inverse d'un move : R → R', R' → R, R2 → R2.
export function invertMove(move) {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);
  return move + "'";
}

// Inverse d'une séquence : ordre renversé + chaque move inversé.
export function invertSequence(moves) {
  return moves.slice().reverse().map(invertMove);
}

// ─── Helper : snap une matrice de rotation à la base orthonormée la plus proche ─
// On regarde où chacun des 3 axes de base atterrit, et on prend le ±axe le plus
// proche. C'est l'équivalent rotation 3D d'« arrondir à l'entier le plus proche ».
function snapMatrixToOrthonormal(m) {
  const e = m.elements;
  // colonnes = images des vecteurs de base
  const cols = [
    new THREE.Vector3(e[0], e[1], e[2]),
    new THREE.Vector3(e[4], e[5], e[6]),
    new THREE.Vector3(e[8], e[9], e[10]),
  ];
  const snapped = cols.map(snapAxis);
  // On reconstruit la matrice colonne par colonne.
  const out = new THREE.Matrix4().makeBasis(snapped[0], snapped[1], snapped[2]);
  return out;
}
function snapAxis(v) {
  const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
  if (ax >= ay && ax >= az) return new THREE.Vector3(Math.sign(v.x) || 1, 0, 0);
  if (ay >= az)             return new THREE.Vector3(0, Math.sign(v.y) || 1, 0);
  return new THREE.Vector3(0, 0, Math.sign(v.z) || 1);
}
