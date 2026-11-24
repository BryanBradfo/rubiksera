import { createCube3D, invertSequence } from './cube3d.js';
import { STEPS, syncStepsFromI18n } from './steps.js';
import { createMoveIcon } from './moveIcons.js';
import { createCube as createCubeState, applyMove as engineApplyMove, applySequence as engineApplySequence, isSolved as engineIsSolved } from './cubeEngine.js';
import * as solver from './lblSolver.js';
import * as i18n from './i18n.js';
import { phaseOf, splitHighlight } from './phases.js';

// ─── Scramble fixé + solution pré-calculée ───────────────────────────────
// Le scramble + les 8 séquences de moves par étape sont pré-calculés via le
// solveur LBL (lblSolver.js) exécuté offline. Le browser n'a pas à attendre
// le calcul.
//
// TODO(toi) : pour changer le scramble :
//   1. Modifie la constante SCRAMBLE ci-dessous
//   2. Lance : node scripts/precompute.mjs (à adapter)
//   3. Copie-colle le résultat dans PRECOMPUTED_STEPS
const SCRAMBLE = "F R U2 B' L' D F' R D' B".split(' ');
const PRECOMPUTED_STEPS = [
  ["R2","L","F'","B","L"],
  ["L'","F2","D","R'","F2"],
  ["F'","U","F","L'","B","U2","L","B'","R","B'","R2","U'","R","B","F'","R2","F","R2","F"],
  ["F2","U2","F","U2","F2","B2","U2","B","U2","B2","R'","F2","U'","F","U","F2","R"],
  ["F","R","U","R'","U'","F'","U2","F","R","U","R'","U'","R","U","R'","U'","F'"],
  ["R'","U'","R","U'","R'","U2","R"],
  ["R","U'","L'","U","R'","U'","L","U","R","U'","L'","U","R'","U'","L","U"],
  ["U2","R'","D'","R","D","R'","D'","R","D","U","R'","D'","R","D","R'","D'","R","D","U2","R'","D'","R","D","R'","D'","R","D","U'"],
];

// ─── Vitesse de lecture ──────────────────────────────────────────────────
const SPEED_STORAGE_KEY = 'rubiks-speed-mult';
let speedMult = parseFloat(localStorage.getItem(SPEED_STORAGE_KEY) || '1.0');
if (!Number.isFinite(speedMult) || speedMult < 0.3 || speedMult > 2) speedMult = 1.0;

function moveDur()      { return MOVE_DURATION_MS / speedMult; }
function scrambleDur()  { return SCRAMBLE_DURATION_MS / speedMult; }
function stepPause()    { return STEP_PAUSE_MS / Math.max(speedMult, 0.6); }

// ─── Caméra : à l'étape 4, on flip pour voir le jaune en haut ───────────
const FLIP_AT_STEP = 3;   // index 0-based : avant l'étape 4 (index 3) on flip
let currentView = 'white';

async function ensureViewForStep(idx) {
  const wanted = idx >= FLIP_AT_STEP ? 'yellow' : 'white';
  if (wanted !== currentView) {
    await cube.setCameraView(wanted);
    currentView = wanted;
  }
}

// ─── Timing ──────────────────────────────────────────────────────────────
// TODO(toi) : ajuste ces valeurs selon ton goût.
const MOVE_DURATION_MS = 320;
const SCRAMBLE_DURATION_MS = 90;
const STEP_PAUSE_MS = 1100;

// ─── DOM refs (lookup une seule fois) ────────────────────────────────────
const stepNumEl = document.getElementById('step-num');
const stepTitleEl = document.getElementById('step-title');
const stepBodyEl = document.getElementById('step-body');
const movesListEl = document.getElementById('moves-list');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset');
const btnPlayLabel = document.getElementById('btn-play-label');
const pagesEl = document.getElementById('pages');
const bubbleInnerEl = document.getElementById('bubble-inner');
const bigNumEl = document.getElementById('step-big-num');
const chapterNumEl = document.getElementById('chapter-num');
const chapterNameEl = document.getElementById('chapter-name');
const stageEl = document.getElementById('stage');
const sfxEl = document.getElementById('sfx');
const speedSlider = document.getElementById('speed-slider');
const speedValueEl = document.getElementById('speed-value');
const creditLineEl = document.getElementById('credit-line');

// ─── État ────────────────────────────────────────────────────────────────
let cube;             // créé après i18n.init()
let currentStep = 0;
let playing = false;
let busy = false;
let solvedShown = false;
let solved = false;        // vrai quand l'étape 8 a été jouée : le cube est résolu   // « BRAVO ! » reste affiché jusqu'au prochain contrôle

// ─── Onomatopées (« CLIC ! » en fin d'étape, « BRAVO ! » à la fin) ──────
function showSfx(kind) {
  const solved = kind === 'solved';
  solvedShown = solved;
  sfxEl.textContent = i18n.t(solved ? 'ui.sfxSolved' : 'ui.sfxStep');
  sfxEl.classList.remove('is-on', 'is-solved');
  void sfxEl.offsetWidth;   // relance l'animation même si elle vient de jouer
  sfxEl.classList.add(solved ? 'is-solved' : 'is-on');
}

function hideSfx() {
  solvedShown = false;
  sfxEl.classList.remove('is-on', 'is-solved');
  sfxEl.textContent = '';
}

// ─── Render de l'étape (bulle, formule, chapitre, pages) ─────────────────
function renderTitle(step) {
  // Titre construit en nœuds DOM : le mot clé est entouré d'un <mark>.
  stepTitleEl.replaceChildren();
  const parts = splitHighlight(step.title, step.highlight);
  if (!parts) {
    stepTitleEl.textContent = step.title;
    return;
  }
  const mark = document.createElement('mark');
  mark.textContent = parts.mark;
  stepTitleEl.append(parts.before, mark, parts.after);
}

// langOnly : simple changement de langue, on garde la position de lecture
// dans la bulle et dans la formule, sans rejouer l'animation d'entrée.
function renderStep(idx, { langOnly = false } = {}) {
  const step = STEPS[idx];
  const phase = phaseOf(idx);
  document.body.dataset.phase = String(phase);

  stepNumEl.textContent = step.number;
  bigNumEl.textContent = String(step.number).padStart(2, '0');
  chapterNumEl.textContent = phase;
  chapterNameEl.textContent = i18n.t(`ui.phases.p${phase}`);
  renderTitle(step);
  // step.body est du HTML statique défini dans les fichiers i18n/*.js
  // (contrôlé par nous, jamais de saisie utilisateur).
  stepBodyEl.innerHTML = step.body;

  movesListEl.replaceChildren();
  // Placeholder (shown via CSS :empty) for steps with no formula, kept in
  // sync with the current language.
  movesListEl.dataset.empty = i18n.t('ui.noMovesPlaceholder');
  step.moves.forEach(m => {
    movesListEl.appendChild(createMoveIcon(m));
  });
  if (!langOnly) movesListEl.scrollTo({ top: 0, left: 0 });

  // Nouvelle étape : on relit la bulle depuis le haut, avec une petite entrée.
  if (!langOnly) {
    bubbleInnerEl.scrollTop = 0;
    bubbleInnerEl.classList.remove('is-entering');
    void bubbleInnerEl.offsetWidth;   // relance l'animation
    bubbleInnerEl.classList.add('is-entering');
  }

  [...pagesEl.children].forEach((page, i) => {
    page.classList.toggle('current', i === idx);
    page.classList.toggle('done', i < idx);
    if (i === idx) page.setAttribute('aria-current', 'step');
    else page.removeAttribute('aria-current');
    page.title = `${i18n.t('ui.stepLabel')} ${i + 1} : ${STEPS[i].title}`;
  });
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Garde la carte en cours visible en ne faisant défiler QUE la liste des
// mouvements (jamais la page : sur mobile, le cube doit rester à l'écran).
function revealCard(card) {
  const list = movesListEl;
  const left = card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2;
  const top = card.offsetTop - (list.clientHeight - card.offsetHeight) / 2;
  const behavior = reducedMotion.matches ? 'auto' : 'smooth';
  list.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior });
}

// ─── Joue les moves d'une étape ──────────────────────────────────────────
async function playStep(idx, durationMs = null, { sfx = true } = {}) {
  const step = STEPS[idx];
  if (!step.moves.length) return;
  busy = true;
  setControlsDisabled(true);
  stageEl.classList.add('is-turning');
  const tokens = movesListEl.children;
  const dur = durationMs ?? moveDur();
  await cube.applySequence(step.moves, dur, (i, _move) => {
    for (let k = 0; k < tokens.length; k++) {
      tokens[k].classList.toggle('current', k === i);
      tokens[k].classList.toggle('done', k < i);
    }
    // Keep the move being animated visible while the cube turns.
    if (tokens[i]) revealCard(tokens[i]);
  });
  for (const tok of tokens) {
    tok.classList.remove('current');
    tok.classList.add('done');
  }
  stageEl.classList.remove('is-turning');
  busy = false;
  setControlsDisabled(false);
  if (idx === STEPS.length - 1) {
    solved = true;
    showSfx('solved');
  } else if (sfx) {
    showSfx('step');
  }
  refreshNavButtons();
}

async function unplayStep(idx, durationMs = null) {
  const step = STEPS[idx];
  if (!step.moves.length) return;
  busy = true;
  setControlsDisabled(true);
  solved = false;
  stageEl.classList.add('is-turning');
  await cube.applySequence(invertSequence(step.moves), durationMs ?? moveDur());
  stageEl.classList.remove('is-turning');
  busy = false;
  setControlsDisabled(false);
}

async function jumpToStep(targetIdx) {
  if (busy) return;
  hideSfx();   // un clic sur une page cache « BRAVO ! », même sur la page en cours
  if (targetIdx === currentStep) return;
  // Un saut arrête la lecture auto : sinon la boucle de lecture rejouerait
  // une étape par dessus le saut.
  playing = false;
  setPlayButtonText();
  if (targetIdx > currentStep) {
    for (let i = currentStep; i < targetIdx; i++) {
      await playStep(i, scrambleDur(), { sfx: false });
      await ensureViewForStep(i + 1);
    }
  } else {
    for (let i = currentStep - 1; i >= targetIdx; i--) {
      await unplayStep(i, scrambleDur());
      await ensureViewForStep(i);
    }
  }
  currentStep = targetIdx;
  renderStep(currentStep);
}

function setControlsDisabled(disabled) {
  btnPrev.disabled = disabled || currentStep === 0;
  btnNext.disabled = disabled || currentStep >= STEPS.length - 1;
  btnReset.disabled = disabled;
  for (const page of pagesEl.children) page.disabled = disabled;
}

function refreshNavButtons() {
  btnPrev.disabled = busy || currentStep === 0;
  btnNext.disabled = busy || currentStep >= STEPS.length - 1;
  // Cube résolu : rejouer l'étape 8 le re-mélangerait. On passe par « Recommencer ».
  btnPlay.disabled = solved && !playing;
}

function setPlayButtonText() {
  btnPlayLabel.textContent = playing ? i18n.t('ui.btnPause') : i18n.t('ui.btnPlay');
  btnPlay.classList.toggle('is-playing', playing);
}

// ─── Lecture auto ────────────────────────────────────────────────────────
async function startPlayback() {
  playing = true;
  hideSfx();
  setPlayButtonText();
  while (playing && currentStep < STEPS.length) {
    await playStep(currentStep);
    // L'étape vient d'être jouée en entier (même si on a mis pause pendant) :
    // on avance toujours l'interface pour rester d'accord avec le cube.
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      renderStep(currentStep);
      await ensureViewForStep(currentStep);
      if (!playing) break;
      await sleep(stepPause(), () => !playing);
    } else {
      playing = false;
      break;
    }
  }
  setPlayButtonText();
  refreshNavButtons();
}

function sleep(ms, cancelCheck) {
  return new Promise(resolve => {
    const start = performance.now();
    function tick() {
      if (cancelCheck && cancelCheck()) return resolve();
      if (performance.now() - start >= ms) return resolve();
      requestAnimationFrame(tick);
    }
    tick();
  });
}

async function applyScramble() {
  busy = true;
  setControlsDisabled(true);
  await cube.applySequence(SCRAMBLE, scrambleDur());
  busy = false;
  setControlsDisabled(false);
}

// ─── Application des traductions à l'UI ──────────────────────────────────
function renderUIText() {
  document.title = i18n.t('ui.docTitle');
  i18n.applyToDom();
  // Le bloc crédit contient du HTML (liens) → on injecte via innerHTML
  // (contenu statique défini dans i18n/*.js, pas de saisie utilisateur).
  creditLineEl.innerHTML = i18n.t('ui.creditLineHTML');
  setPlayButtonText();
  // Met aussi à jour la valeur de vitesse affichée (juste le nombre, label séparé)
  speedValueEl.textContent = formatSpeed(speedMult);
  pagesEl.setAttribute('aria-label', i18n.t('ui.stepsLabel'));
  document.getElementById('brand').setAttribute('aria-label', i18n.t('ui.title'));
  // Active le bouton de langue courant
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === i18n.getLang());
  });
}

function formatSpeed(mult) {
  return `${mult.toLocaleString(i18n.getLang(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}×`;
}

// ─── Re-render complet après changement de langue ────────────────────────
function reRenderAll() {
  // Les cartes sont reconstruites dans la nouvelle langue : on recopie leur
  // état (en cours, faite) pour ne pas perdre le fil pendant une lecture.
  const cardStates = [...movesListEl.children].map(card => ({
    current: card.classList.contains('current'),
    done: card.classList.contains('done'),
  }));
  syncStepsFromI18n();   // re-injecte les titres/bodies depuis i18n
  renderUIText();
  renderStep(currentStep, { langOnly: true });
  [...movesListEl.children].forEach((card, i) => {
    if (!cardStates[i]) return;
    card.classList.toggle('current', cardStates[i].current);
    card.classList.toggle('done', cardStates[i].done);
  });
}

// ─── Boot ────────────────────────────────────────────────────────────────
(async function boot() {
  // 1. Initialise i18n (localStorage > navigator.language > FR)
  await i18n.init();

  // 2. Peuple STEPS avec les textes localisés + moves pré-calculés
  syncStepsFromI18n();
  PRECOMPUTED_STEPS.forEach((moves, i) => { STEPS[i].moves = moves; });

  // 3. Crée le cube 3D Three.js
  const container = document.getElementById('cube-canvas-container');
  cube = createCube3D(container);

  // 4. Construit les 8 pages cliquables, colorées par phase
  for (let i = 0; i < STEPS.length; i++) {
    const page = document.createElement('button');
    page.type = 'button';
    page.className = 'page';
    page.dataset.step = i + 1;
    page.dataset.phase = phaseOf(i);
    const num = document.createElement('span');
    num.textContent = i + 1;
    page.appendChild(num);
    page.addEventListener('click', () => jumpToStep(i));
    pagesEl.appendChild(page);
  }

  // 5. Setup des event listeners (boutons + slider + lang switcher)
  setupEventListeners();

  // 6. Render initial : applique les traductions + affiche étape 1
  renderUIText();
  renderStep(currentStep);

  // 7. Applique le scramble visuel
  await applyScramble();
  refreshNavButtons();
})();

function setupEventListeners() {
  btnPlay.addEventListener('click', () => {
    if (busy && !playing) return;
    if (solved && !playing) return;
    if (playing) {
      playing = false;
      setPlayButtonText();
    } else {
      startPlayback();
    }
  });

  btnNext.addEventListener('click', async () => {
    if (busy) return;
    playing = false;
    setPlayButtonText();
    if (currentStep < STEPS.length - 1) {
      await playStep(currentStep);
      currentStep++;
      renderStep(currentStep);
      await ensureViewForStep(currentStep);
    } else if (currentStep === STEPS.length - 1) {
      await playStep(currentStep);
    }
    refreshNavButtons();
  });

  btnPrev.addEventListener('click', async () => {
    if (busy || currentStep === 0) return;
    hideSfx();
    playing = false;
    setPlayButtonText();
    currentStep--;
    await unplayStep(currentStep);
    await ensureViewForStep(currentStep);
    renderStep(currentStep);
    refreshNavButtons();
  });

  btnReset.addEventListener('click', async () => {
    if (busy) return;
    hideSfx();
    playing = false;
    setPlayButtonText();
    solved = false;
    await cube.reset();
    if (currentView !== 'white') {
      await cube.setCameraView('white');
      currentView = 'white';
    }
    await applyScramble();
    currentStep = 0;
    renderStep(currentStep);
    refreshNavButtons();
  });

  // Speed slider
  speedSlider.value = speedMult.toString();
  speedSlider.addEventListener('input', () => {
    speedMult = parseFloat(speedSlider.value);
    speedValueEl.textContent = formatSpeed(speedMult);
    localStorage.setItem(SPEED_STORAGE_KEY, speedMult.toString());
  });

  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.lang === i18n.getLang()) return;
      await i18n.setLang(btn.dataset.lang);
      // Le re-render est déclenché par l'event listener 'langChanged' ci-dessous.
    });
  });

  document.addEventListener('langChanged', () => {
    reRenderAll();
    if (solvedShown) sfxEl.textContent = i18n.t('ui.sfxSolved');
  });
}
