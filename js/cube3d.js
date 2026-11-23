import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ─── Palette des stickers du cube ───────────────────────────────────────
// Convention : blanc = bas, jaune = haut, vert = avant, bleu = arrière,
//              rouge = droite, orange = gauche.
// Couleurs alignées sur la palette du site (jaune, rouge, bleu) ; vert,
// orange et blanc restent ceux du cube. Synchro avec js/moveIcons.js.
const STICKERS = {
  U: 0xffd400,  // up    = jaune
  D: 0xf6f6f6,  // down  = blanc
  R: 0xe8332a,  // right = rouge
  L: 0xff7f1f,  // left  = orange
  F: 0x1bb55c,  // front = vert
  B: 0x1f4fd8,  // back  = bleu
};
const PLASTIC = 0x1a1a1a;  // corps des cubies (l'encre du contour est plus noire)
const INK = 0x0e0e0e;      // contour encré autour de chaque cubie
const OUTLINE_SCALE = 1.07;

// Ombrage « dessiné » : 3 tons francs au lieu d'un dégradé continu.
function makeToonGradient() {
  const tones = new Uint8Array([85, 85, 85, 255, 165, 165, 165, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(tones, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

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

// Ombre portée en trame : une ellipse de points d'encre, comme en manga.
function makeContactShadow() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0e0e0e';
  const pitch = 7;
  for (let y = pitch / 2; y < s; y += pitch) {
    for (let x = pitch / 2; x < s; x += pitch) {
      const d = Math.hypot(x - s / 2, y - s / 2) / (s / 2);
      if (d >= 1) continue;
      const r = 2.2 * (1 - d * d);
      if (r < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
    white:  new THREE.Vector3(7.3, -5.3, 7.3),
    yellow: new THREE.Vector3(7.3,  5.3, 7.3),
  };

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.copy(VIEWS.white);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // ─── Éclairage « dessin » ────────────────────────────────────────────
  // Une clé directionnelle découpe les 3 tons du toon ; l'hémisphère éclaire
  // aussi le dessous, pour que la face blanche vue d'en bas (étapes 1 à 3)
  // reste blanche et jamais noire.
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(7, 10, 3);
  scene.add(key);
  const under = new THREE.DirectionalLight(0xffffff, 0.75);
  under.position.set(-4, -9, 6);
  scene.add(under);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.7);
  scene.add(hemi);

  // Ombre de contact (approximation douce) sous le cube. Visible seulement
  // quand la caméra est au-dessus (vue jaune) ; cachée en vue "blanche".
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({
      map: makeContactShadow(), transparent: true, opacity: 0.55,
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
  const gradientMap = makeToonGradient();
  const bodyMat = new THREE.MeshToonMaterial({ color: PLASTIC, gradientMap });
  // Coque inversée : même forme un peu plus grande, faces arrière seules,
  // noire. Elle dessine le trait d'encre autour de chaque cubie.
  const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubie = new THREE.Mesh(bodyGeom, bodyMat);
        cubie.position.set(x, y, z);
        const outline = new THREE.Mesh(bodyGeom, outlineMat);
        outline.scale.setScalar(OUTLINE_SCALE);
        cubie.add(outline);
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
          const col = new THREE.Color(STICKERS[f]);
          const mat = new THREE.MeshToonMaterial({ color: col, gradientMap });
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
