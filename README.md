# rubiksera · Rubik's Cube, step by step

Interactive 3D Rubik's Cube visualization that walks through the **8 steps of
Victor Colin's beginner method**, with synchronized text in French or English.

> Visualisation interactive d'un Rubik's Cube en 3D qui déroule pas à pas les 8 étapes
> de la méthode débutant de Victor Colin, avec le texte synchronisé en français ou anglais.

## Demo

🎬 Live demo: https://rubiksera.bryanbradfo.me/
📖 Original tutorial (in French): https://youtu.be/Leml4U4D1r8

## Features

- 🧊 **Realistic 3D cube** (Three.js): rounded glossy cubies, studio lighting,
  a soft contact shadow and a gentle idle rotation (drag to rotate, scroll to zoom)
- 🎯 **3D move cards**: each move is a mini isometric cube with the turning layer
  shown in its real colour and a rotation arrow, plus the face and direction in
  plain language (clockwise / counter-clockwise / half turn). The compact notation
  (`R2`, `F'`, ...) is kept as a small badge so you learn it without depending on it.
- 🎨 **Light editorial design** (warm paper, serif display type, hairline structure)
- 🎬 **Step-by-step playback** with play/pause/prev/next/timeline controls; the active
  move card highlights and scrolls into view as the cube turns
- 🎚 **Speed slider** (0.3× to 2×) with localStorage persistence
- 🌍 **i18n** (FR / EN), auto-detected from browser language, switchable on the fly
- 🤖 **Custom LBL solver** (`js/lblSolver.js`): each step's moves are
  computed to **really do what the text says** (not just arbitrary moves)
- 📸 **Camera flip** at step 4, exactly as the PDF says ("put white face down")

## How to run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

No build step, no dependencies. Pure HTML + CSS + ES modules. Three.js loaded
from CDN via importmap.

## Project structure

```
.
├── index.html
├── assets/
│   ├── favicon.svg           # 3x3 cube-face favicon (the 6 colours)
│   └── rubiks.pdf            # Original methodology sheet by Victor Colin
├── css/
│   └── style.css
├── js/
│   ├── main.js               # UI orchestration
│   ├── cube3d.js             # Three.js 3D rendering + face rotation animation
│   ├── moveIcons.js          # SVG generator for the 3D move cards
│   ├── i18n.js               # Mini i18n engine
│   ├── steps.js              # Step data (titles/bodies from i18n, moves precomputed)
│   ├── cubeEngine.js         # Facelet model + 18 move permutations (engine)
│   └── lblSolver.js          # Layer-by-layer solver
├── i18n/
│   ├── fr.js                 # French strings + 8 steps (faithful to PDF)
│   └── en.js                 # English translation
└── scripts/
    └── precompute.mjs        # Node script to recompute move lists for a new scramble
```

## Change the scramble

The 8 step move lists are **pre-computed** for a fixed scramble (in `js/main.js`).
If you change the `SCRAMBLE` constant, you need to re-run the solver to get
new move lists:

```bash
node scripts/precompute.mjs
```

Copy the output into `PRECOMPUTED_STEPS` in `js/main.js`.

## Credit

Method and methodology sheet by **Victor Colin**.
[YouTube tutorial](https://youtu.be/Leml4U4D1r8) (in French).
This site faithfully reproduces the text and formulas of `rubiks.pdf`.

> Merci Victor pour ton tuto ! 🙏

## License

This project is for educational purposes. The methodology and PDF belong to
Victor Colin. The code is released under the [MIT License](LICENSE).
