import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// ─── Palette des stickers du cube ───────────────────────────────────────
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
const PLASTIC = 0x101013;  // corps en plastique noir mat des cubies

const PI_2 = Math.PI / 2;
const EPS = 1e-4;

// Orientation d'un sticker pour chaque face extérieure : position du centre
// (sur la surface du cubie) + rotation pour coller la tuile à plat.
const FACE_PLACEMENT = {
  R: { axis: 'x', sign:  1, pos: [ 0.49, 0, 0], rot: [0,  PI_2, 0] },
  L: { axis: 'x', sign: -1, pos: [-0.49, 0, 0], rot: [0, -PI_2, 0] },
  U: { axis: 'y', sign:  1, pos: [0,  0.49, 0], rot: [-PI_2, 0, 0] },
  D: { axis: 'y', sign: -1, pos: [0, -0.49, 0], rot: [ PI_2, 0, 0] },
  F: { axis: 'z', sign:  1, pos: [0, 0,  0.49], rot: [0, 0, 0] },
  B: { axis: 'z', sign: -1, pos: [0, 0, -0.49], rot: [0, PI_2 * 2, 0] },
};

// Ombre de contact douce : disque radial sombre → transparent (teinte chaude).
function makeContactShadow() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, 'rgba(38, 30, 18, 0.55)');
  g.addColorStop(0.45, 'rgba(38, 30, 18, 0.32)');
  g.addColorStop(1.0, 'rgba(38, 30, 18, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Initialisation Three.js (scène, caméra, lumière, contrôles) ────────
export function createCube3D(container) {
  const scene = new THREE.Scene();
  scene.background = null;   // transparent : le fond "studio" est en CSS (fiable)

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // ─── Éclairage photographique ───────────────────────────────────────
  // Lumière d'environnement (IBL) générée depuis une "pièce" virtuelle :
  // donne aux tuiles brillantes des reflets doux et réalistes.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;

  // Softbox : reflet doux et large sur les tuiles brillantes (highlight studio).
  RectAreaLightUniformsLib.init();
  const softbox = new THREE.RectAreaLight(0xffffff, 4.5, 6, 6);
  softbox.position.set(3.5, 6.5, 6);
  softbox.lookAt(0, 0, 0);
  scene.add(softbox);

  // Clé dominante très directionnelle → une face vive, les autres plus
  // sombres : c'est ce modelé qui donne le relief "photographié".
  const key = new THREE.DirectionalLight(0xfff6ea, 2.6);
  key.position.set(6, 10, 5);
  scene.add(key);
  // Ambiance hémisphérique : éclaire TOUTES les faces, y compris celle du
  // dessous (la face blanche vue aux étapes 1-3) qui sinon resterait noire,
  // car toutes les autres lumières viennent d'en haut.
  const hemi = new THREE.HemisphereLight(0xfffaf0, 0xeae2d4, 0.85);
  scene.add(hemi);
  // Petit fill latéral chaud pour adoucir les ombres.
  const fill = new THREE.DirectionalLight(0xffe9d2, 0.2);
  fill.position.set(-7, -2, -4);
  scene.add(fill);

  // Ombre de contact (approximation douce) sous le cube. Visible seulement
  // quand la caméra est au-dessus (vue jaune) ; cachée en vue "blanche".
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({
      map: makeContactShadow(), transparent: true, opacity: 0.9,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -PI_2;
  contactShadow.position.y = -1.62;
  scene.add(contactShadow);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 18;
  // Rotation lente au repos pour montrer la 3D ; coupée dès qu'on interagit.
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  let lastInteract = -Infinity;
  controls.addEventListener('start', () => { lastInteract = performance.now(); });
  controls.addEventListener('end',   () => { lastInteract = performance.now(); });

  // ─── Construction du cube : 27 cubies plastique + tuiles stickers ────
  const cubies = [];
  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  const SIZE = 0.97;             // taille d'un cubie (gap de 0.03 entre eux)
  const bodyGeom = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 5, 0.13);
  // Tuile : carré arrondi bombé, posé sur une face (épaisseur en Z), légèrement
  // proéminent pour l'effet "sticker en relief".
  const tileGeom = new RoundedBoxGeometry(0.76, 0.76, 0.09, 4, 0.15);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: PLASTIC, roughness: 0.55, metalness: 0,
    clearcoat: 0.3, clearcoatRoughness: 0.5,
  });
  // Couleur de tuile légèrement désaturée + variation, pour éviter l'aplat
  // "néon" trop parfait qui fait synthétique.
  function tileColor(hex) {
    const c = new THREE.Color(hex);
    const hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s * 0.9, hsl.l * 0.96);
    return c;
  }

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubie = new THREE.Mesh(bodyGeom, bodyMat);
        cubie.position.set(x, y, z);
        cubeGroup.add(cubie);
        cubies.push(cubie);

        // Une tuile colorée pour chaque face extérieure de ce cubie.
        const faces = [];
        if (x ===  1) faces.push('R');
        if (x === -1) faces.push('L');
        if (y ===  1) faces.push('U');
        if (y === -1) faces.push('D');
        if (z ===  1) faces.push('F');
        if (z === -1) faces.push('B');

        for (const f of faces) {
          const p = FACE_PLACEMENT[f];
          const col = tileColor(STICKERS[f]);
          const mat = new THREE.MeshPhysicalMaterial({
            color: col, metalness: 0,
            // légère variation de rugosité par tuile → reflets non uniformes
            roughness: 0.2 + Math.random() * 0.08,
            clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 0.7,
          });
          const tile = new THREE.Mesh(tileGeom, mat);
          tile.position.set(...p.pos);
          tile.rotation.set(...p.rot);
          tile.userData.baseColor = col.clone();
          tile.userData.isSticker = true;
          cubie.add(tile);
        }
      }
    }
  }

  // Met en valeur (glow) les stickers d'une liste de cubies, intensité 0..1.
  function setLayerGlow(movingCubies, intensity) {
    for (const c of movingCubies) {
      for (const child of c.children) {
        if (!child.userData.isSticker) continue;
        child.material.emissive.copy(child.userData.baseColor);
        child.material.emissiveIntensity = intensity;
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

  // ─── État interne d'animation ───────────────────────────────────────
  let busy = Promise.resolve();
  let cancelled = false;
  let animating = false;   // vrai pendant qu'une séquence de moves joue

  // ─── Boucle de rendu ────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    // Auto-rotation seulement au repos : pas pendant un move, et pas dans les
    // 4 s qui suivent une interaction utilisateur.
    controls.autoRotate = !animating && (performance.now() - lastInteract > 4000);
    controls.update();
    // L'ombre de contact n'a de sens que vue de dessus (vue jaune).
    contactShadow.visible = camera.position.y > 0.5;
    renderer.render(scene, camera);
  }
  animate();

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
        // Glow de la couche en mouvement : monte puis redescend (pic au milieu).
        setLayerGlow(moving, Math.sin(t * Math.PI) * 0.4);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          finish();
        }
      }
      function finish() {
        pivot.rotation[axis] = angle;
        setLayerGlow(moving, 0);   // éteint le glow
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
      animating = true;
      try {
        for (let i = 0; i < moves.length; i++) {
          if (cancelled) break;
          if (onMoveStart) onMoveStart(i, moves[i]);
          const { axis, layer, angle } = parseMove(moves[i]);
          // Un move "2" (demi-tour) est animé plus long pour rester lisible.
          const dur = Math.abs(angle) > PI_2 + EPS ? durationMs * 1.6 : durationMs;
          await rotateLayer(axis, layer, angle, dur);
        }
      } finally {
        animating = false;
      }
    });
    return busy;
  }

  function cancel() {
    cancelled = true;
  }

  function isBusy() {
    // pas de vrai flag synchrone - l'appelant doit await le retour
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
      controls.autoRotate = false;       // pas d'auto-rotation pendant la bascule
      lastInteract = performance.now();  // garde l'auto-rotation coupée le temps de la bascule
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
          lastInteract = performance.now();   // laisse 4 s avant de re-spinner
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
