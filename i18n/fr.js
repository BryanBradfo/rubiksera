// ─── Traductions françaises ─────────────────────────────────────────────
// Texte des 8 étapes reproduit fidèlement depuis la fiche méthode de Victor Colin.

export default {
  lang: 'fr',
  langName: 'Français',

  ui: {
    docTitle: "Résoudre un Rubik's cube — méthode Victor Colin",
    title: "Résoudre un Rubik's cube",
    subtitle: "Méthode débutant pas à pas — fiche de Victor Colin",
    stepLabel: "Étape",
    movesLabel: "Mouvements de cette étape",
    noMovesPlaceholder: "(aucun mouvement — pas de formule miracle, c'est à toi !)",
    btnPrev: "◀ Précédent",
    btnPlay: "▶ Lecture",
    btnPause: "⏸ Pause",
    btnNext: "Suivant ▶",
    btnReset: "↻ Reset",
    speedLabel: "Vitesse",
    cubeHint: "Glisse-déposer pour faire pivoter le cube · Molette pour zoomer",
    creditLineHTML:
      "<strong>Méthode et fiche méthode</strong> par " +
      "<a href='https://youtu.be/Leml4U4D1r8' target='_blank' rel='noopener'>Victor Colin</a>. " +
      "Cette page reprend fidèlement la fiche méthode " +
      "<a href='assets/rubiks.pdf' target='_blank' rel='noopener'><code>rubiks.pdf</code></a> " +
      "ainsi que le " +
      "<a href='https://youtu.be/Leml4U4D1r8' target='_blank' rel='noopener'>tutoriel vidéo</a> " +
      "(« Résoudre le Rubik's Cube — solution complète pour débutants »).",
    creditThanks: "Merci Victor pour ton tuto !",
  },

  moves: {
    right: "Droite",
    left: "Gauche",
    up: "Haut",
    down: "Bas",
    front: "Avant",
    back: "Arrière",
    hidden: "(cachée)",
  },

  // Texte fidèle au PDF de Victor (rubiks.pdf)
  steps: [
    {
      title: "Faire une croix (sur la face blanche)",
      body: `
        <p>Sur la face blanche (celle où le centre est blanc), tu dois construire une croix
        blanche <strong>en montant les arêtes qui ont du blanc (ne t'occupe pas des coins)</strong>.
        Tu dois obtenir une croix comme sur le schéma de la fiche.</p>

        <p>Pour cela, <strong>pas de formule ou de solution miracle…</strong> il faut tester et comprendre
        soi-même comment les pièces bougent. Réussir à faire une croix devient vite instinctif et logique.</p>
      `,
    },
    {
      title: "Placer les arêtes de la croix aux bons endroits",
      body: `
        <p>Dans la continuité de la croix, les arêtes doivent être de la même couleur que le centre de chaque face.
        Par exemple, l'arête <strong>blanc/rouge</strong> doit être placée sur la face rouge (et non sur la face bleue).</p>

        <p><strong>Méthode :</strong> tourner la face blanche jusqu'à trouver
        <strong>deux arêtes bien placées</strong> (si les 4 sont déjà bien placées, tu n'as pas besoin de faire cette étape).</p>

        <div class="case">
          <div class="case-title">Cas n°1</div>
          Les deux arêtes bien placées sont l'une à côté de l'autre. Je prends une mauvaise arête
          en face de moi et une bonne sur ma droite, puis je fais la formule.
        </div>
        <div class="case">
          <div class="case-title">Cas n°2</div>
          Les deux arêtes sont sur des faces opposées. Je prends une arête bien placée en face de moi
          et je fais la même formule mais sans le dernier mouvement. Puis je me retrouve dans le cas n°1 !
        </div>
      `,
    },
    {
      title: "Placer les coins de la première couronne",
      body: `
        <p>Trouve sur la face du bas un coin qui a du blanc et place-le en dessous de l'emplacement où il doit aller.
        Par exemple, si tu as trouvé le coin <strong>BLANC / BLEU / ROUGE</strong>, tourne la face du bas
        pour l'emmener au niveau de l'emplacement entouré sur le schéma de la fiche.</p>

        <p>Puis, pour le monter, répète la formule
        <code>R' D' R D</code> jusqu'à ce que le coin soit résolu.</p>

        <div class="case">
          <div class="case-title">Remarque</div>
          Si la première couronne n'est pas résolue mais que tu ne trouves plus de coin avec du blanc sur la face du bas,
          cela signifie qu'un coin blanc est déjà sur la face blanche, mais au mauvais endroit ou dans le mauvais sens.
          <strong>Il faut appliquer une fois la formule pour le redescendre.</strong>
        </div>
      `,
    },
    {
      title: "Faire la deuxième couronne",
      body: `
        <p>À partir de maintenant et jusqu'à la fin, <strong>mettre la face blanche vers le bas.</strong></p>

        <p>Pour construire la deuxième couronne, il faut placer 4 arêtes entre les centres de la deuxième couronne.
        Pour cela, cherche un T à l'envers comme sur les schémas. Tu peux tourner la face du haut pour trouver un T.
        Puis regarde le sommet du T (s'il est jaune, alors le T ne servira à rien, il faut chercher un autre T).</p>

        <div class="case">
          <div class="case-title">Si le sommet du T doit aller vers la gauche</div>
          Fais la formule : <code>U' L' U L U F U' F'</code>
        </div>
        <div class="case">
          <div class="case-title">Si le sommet du T doit aller vers la droite</div>
          Fais la formule : <code>U R U' R' U' F' U F</code>
        </div>

        <div class="remark">
          <span class="remark-title">Remarque</span>
          <div class="remark-body">
            Si ta deuxième couronne n'est pas terminée mais que tu ne trouves plus de T sans jaune sur le sommet,
            cela signifie qu'une arête de la deuxième couronne est déjà insérée quelque part, mais au mauvais endroit
            ou dans le mauvais sens.<br><br>
            → Regarder le tutoriel à 24 minutes et 25 secondes précisément.
          </div>
        </div>
      `,
    },
    {
      title: "Faire une croix jaune",
      body: `
        <p><strong>Pour cette étape, la méthode expliquée ici est différente de la méthode montrée dans le tutoriel vidéo.</strong>
        Il s'agit de la <strong>SEULE</strong> étape où les explications sont différentes. Pour toutes les autres,
        regarder le tutoriel permet de mieux comprendre cette fiche méthode.</p>

        <div class="case">
          <div class="case-title">Le cas de la ligne</div>
          Fais la formule : <code>F R U R' U' F'</code>
        </div>
        <div class="case">
          <div class="case-title">Le cas du petit « L »</div>
          Faire la formule deux fois (la première sert à se remettre dans le cas de la ligne).
        </div>
        <div class="case">
          <div class="case-title">Le point</div>
          Faire la formule trois fois (la première sert à se remettre dans le cas du petit « L »).
          Attention, le petit « L » obtenu après avoir fait la formule n'est pas directement bien placé,
          il faut le mettre en haut à gauche avant d'enchaîner.
        </div>
      `,
    },
    {
      title: "Placer les arêtes de la croix jaune aux bons endroits",
      body: `
        <p>Faire <strong>EXACTEMENT pareil</strong> qu'à l'étape 2.</p>
        <p>Tourne la face du haut jusqu'à trouver deux arêtes bien placées,
        puis applique la formule. Si les deux arêtes bien placées sont opposées,
        enchaîne la même formule sans le dernier mouvement, et tu retrouveras le cas n°1.</p>
      `,
    },
    {
      title: "Placer les 4 derniers coins aux bons endroits",
      body: `
        <p>L'objectif est que chaque coin soit <strong>au bon endroit</strong>. Par exemple, le coin
        <strong>JAUNE / VERT / ROUGE</strong> doit être placé entre les faces verte et rouge
        (peu importe qu'il soit bien orienté ou non : il n'est pas obligatoire que les coins
        soient résolus, il faut juste qu'ils soient aux bons endroits).</p>

        <p><strong>Méthode :</strong> chercher si 1 des 4 coins est au bon endroit, c'est-à-dire
        si les couleurs d'un coin correspondent aux couleurs des faces voisines.</p>

        <div class="case">
          <div class="case-title">Si un coin est au bon endroit</div>
          Tenir son cube de façon à ce qu'il soit devant nous à droite, et faire la formule
          (une fois ou deux fois si la première n'a pas suffi) :
          <code>U R U' L' U R' U' L</code>
        </div>
        <div class="case">
          <div class="case-title">Si aucun coin n'est au bon endroit</div>
          Faire une fois cette formule « dans le vent » puis un coin sera au bon endroit.
        </div>
      `,
    },
    {
      title: "Orienter les 4 derniers coins pour terminer le cube",
      body: `
        <p><strong>Attention :</strong> si c'est une des premières fois que tu fais cette étape,
        il est fortement conseillé de regarder entièrement les explications données dans le tutoriel
        <strong>avant de te lancer.</strong></p>

        <p>Pour orienter ce coin, utilise la même formule que celle de l'étape 3, en la répétant
        jusqu'à ce que le coin soit résolu (jusqu'à ce que tu voies apparaître du jaune sur la face du haut) :
        <code>R' D' R D</code></p>

        <p>Quand le coin est résolu, <strong>tourne UNIQUEMENT la face du haut</strong>
        pour amener un autre coin (qu'il faudra aussi résoudre) au même endroit.
        Puis continue à enchaîner la même formule jusqu'à ce qu'il soit résolu.</p>

        <p>Répète cela pour chaque coin qui a besoin d'être orienté… puis le cube est résolu !</p>
      `,
    },
  ],
};
