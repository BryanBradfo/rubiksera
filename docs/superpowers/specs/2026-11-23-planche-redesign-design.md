# rubiksera, refonte « Planche » (design)

Date : 2026-11-23. Branche : `feature/planche-redesign`.

## Intention

rubiksera apprend à résoudre un Rubik's Cube avec la méthode débutant en 8 étapes de Victor Colin.
Le public : des gens de tout âge, enfants comme adultes, qui ont envie d'apprendre. Le site actuel
fonctionne mais son interface est quelconque. Bryan veut une identité visuelle assumée et premium,
construite autour de son nouveau logo : une illustration à l'encre, style manga, d'une fille qui
tient un cube.

Direction retenue : **Planche**. Le site devient une planche de manga. La fille du logo est la prof
et parle dans des bulles. Le cube 3D est dessiné à l'encre, pas photographié.

## Objectifs

- L'outil reste la première chose qu'on voit. Pas de page d'accueil, pas de section marketing.
- Une identité reconnaissable au premier regard : cases, gouttières, bulles, trame, lignes de
  vitesse, onomatopées.
- Un code couleur qui sert à apprendre (phases de la méthode, sens de rotation).
- Lisible et accueillant pour un enfant, soigné pour un adulte.
- Aucun « · » comme séparateur et aucun tiret long ou moyen (— –) dans les textes visibles du site
  (FR et EN), ni dans le titre de page.

## Non objectifs

- Pas de changement au solveur (`lblSolver.js`), au moteur (`cubeEngine.js`), au mélange ni aux
  séquences précalculées.
- Pas de framework, pas de build, pas de dépendance npm. On reste en HTML, CSS et modules ES, avec
  Three.js chargé par importmap.
- Pas de thème sombre (le papier fait partie de l'identité).
- Pas de nouvelle langue.

## Anti objectifs (échec même si ça marche)

- Un résultat qui ressemble à un template ou à un thème générique avec un logo collé dessus.
- Un cube brillant et réaliste qui a l'air posé sur la page au lieu d'être dessiné dedans.
- Des effets (onomatopées, lignes de vitesse) qui gênent la lecture ou rendent les contrôles flous
  pour un enfant.
- Une version mobile cassée ou illisible.

## Approches envisagées

1. **Refonte sur place, sans changer de technologie** (retenue). On réécrit `index.html` et
   `css/style.css`, on adapte la partie rendu de `main.js`, de `moveIcons.js` et de `cube3d.js`, on
   ajuste les textes i18n. Rien d'autre ne bouge.
2. Migration vers Vite + React + Tailwind, comme mantispdf. Écartée : réécriture complète d'un
   écran unique qui marche, aucun gain visible.
3. Habiller le site existant avec une feuille de style par dessus, sans toucher au HTML. Écartée :
   la structure en cases et la bulle de la prof demandent un nouveau balisage.

Style du cube 3D, décidé par Bryan : **cube dessiné** (aplats en 2 ou 3 tons et contour noir épais
autour de chaque cubie), plutôt que le cube réaliste actuel.

## Identité

### Palette (tokens CSS sur `:root`)

| Nom          | Valeur    | Rôle |
|--------------|-----------|------|
| Encre        | `#0E0E0E` | traits, texte, bordures des cases |
| Papier       | `#F3EEE3` | fond de page, gouttières |
| Blanc case   | `#FFFFFF` | intérieur des cases |
| Rouge Shōnen | `#E8332A` | phase 1, sens horaire, bouton lecture |
| Bleu Encre   | `#1F4FD8` | phase 2, sens anti horaire |
| Jaune Néon   | `#FFD400` | phase 3 (la face jaune), mouvement en cours, demi tour |

Le jaune ne porte jamais de texte blanc : texte en encre uniquement.

Motifs dérivés : trame (points d'encre, environ 7 px de pas), hachures (rayures à 45° dans la
couleur de phase), lignes de vitesse (dégradé conique répété autour du cube).

### Code couleur

- **Phases** : étapes 1 à 3 = phase 1 « La première couronne » (rouge). Étape 4 = phase 2 « La
  deuxième couronne » (bleu). Étapes 5 à 8 = phase 3 « La face jaune » (jaune). La couleur de
  phase apparaît sur l'étiquette de chapitre en haut, le mot surligné du titre, le liseré des pages
  de la barre de progression et le fond des pages terminées.
- **Sens de rotation** sur les cartes de mouvement : liseré bas rouge pour horaire, bleu pour anti
  horaire, jaune pour demi tour, toujours doublé de la flèche dessinée sur le mini cube et du libellé
  texte (la couleur n'est jamais la seule information).
- Les phases et les sens partagent les 3 mêmes couleurs. C'est voulu (palette courte et forte), et
  ils ne se mélangent pas : les phases vivent dans le cadre, les sens uniquement dans les cartes.

### Typographies (Google Fonts)

- **Dela Gothic One** : logotype, titres d'étape, numéros, onomatopées, boutons.
- **Zen Kaku Gothic New** (400, 500, 700) : texte courant, bulles.
- **IBM Plex Mono** (500, 600) : petites étiquettes en capitales (chapitre, « La formule »,
  vitesse).

Vérifier que les accents français et « ō » s'affichent bien dans chaque police ; sinon garder une
police de repli système pour le caractère manquant.

### Logo et images

Source : `~/Téléchargements/u/rubiksera_resized.png` (2592 px, fond blanc).

- `assets/brand/logo.png` : illustration recadrée au plus près (trim), environ 1200 px.
- `assets/brand/face.png` : recadrage visage et cube pour la case de la prof, environ 400 px.
- Favicon : `assets/favicon.png` (recadrage visage, 32 et 180 px pour apple-touch-icon), qui
  remplace `favicon.svg`.
- Image de partage `assets/brand/og.png` (1200 × 630) : papier, logo, logotype RUBIKSERA, et balises
  Open Graph et Twitter dans `index.html`.
- Décidé par Bryan : ces PNG sont committés. `.gitignore` reçoit l'exception `!assets/**/*.png` ;
  la règle « pas de captures d'écran dans git » reste valable partout ailleurs.
- Le logotype texte est « RUBIKSERA » en Dela Gothic One précédé d'un losange rouge.

## Écran

### Bureau (≥ 1024 px de large)

```
┌ case haut ─────────────────────────────────────────────────────────┐
│ ◆ RUBIKSERA      [CHAPITRE 1] La première couronne        [FR][EN] │
└────────────────────────────────────────────────────────────────────┘
┌ case cube (bord droit en biais) ───┐ ┌ prof ┐ ┌ bulle ─────────────┐
│ lignes de vitesse, trame           │ │visage│◁ Titre de l'étape     │
│            [cube 3D dessiné]       │ └──────┘ │ texte (défile)     │
│  CLIC !                       03   │          └────────────────────┘
│                                    │ ┌ La formule ── légende sens ┐
│                                    │ │ [R][U][R'][U'] ...         │
└────────────────────────────────────┘ └────────────────────────────┘
[◀] [▶ Lecture] [▶|]  [1][2][3][4][5][6][7][8]   Vitesse ━●━  [↻]
                       pages colorées par phase
┌ postface : crédits Victor Colin, PDF, vidéo ───────────────────────┐
```

- La page entière tient dans la fenêtre sur un écran de bureau ; la postface (crédits) est sous la
  ligne de flottaison.
- Les cases ont une bordure d'encre de 3 px et sont séparées par des gouttières de 12 px couleur
  papier.
- La case du cube a un bord droit coupé en biais (clip-path) comme une case dynamique de manga.
  Le grand numéro d'étape (« 03 ») est dessiné en contour dans le coin bas droit de la case.
- La bulle contient le titre (un mot clé surligné dans la couleur de phase) et le texte de l'étape.
  Le texte peut être long (cas, remarques) : la bulle défile à l'intérieur, la page ne bouge pas.
  Les blocs `.case` et `.remark` des textes i18n deviennent de petites cases internes.
- Le panneau « La formule » liste toutes les cartes de mouvement en grille (4 ou 5 par ligne selon
  la largeur) et défile à l'intérieur. Les étapes sans mouvement montrent le texte de
  remplacement existant (`ui.noMovesPlaceholder`) dans une petite bulle.
- La barre de contrôle : précédent, lecture ou pause, suivant, 8 pages numérotées cliquables
  (remplacent la timeline à points), réglage de vitesse, recommencer.
- L'indication « glisser pour tourner, molette pour zoomer » reste, en petite étiquette mono dans
  la case du cube.

### Mobile (< 1024 px, cible principale 375 à 430 px)

Empilement : case haut, case cube (environ 55 % de la hauteur), rangée des 8 pages, formule, bulle
de la prof, puis la barre de contrôle collée en bas de l'écran (sticky). Marge latérale de 16 px,
pas de défilement horizontal de la page. La bulle ne défile plus à l'intérieur : c'est la page qui
défile.

Décisions (prises par Claude, à corriger si besoin) :

- La barre collante ne contient que précédent, lecture, suivant et recommencer, en cibles de
  44 px. La rangée des 8 pages n'est pas collante, elle est placée juste sous le cube ; ses carrés
  font environ 38 px (exception assumée au 44 px, car précédent et suivant offrent la même action en
  grand). La vitesse passe dans l'en tête du panneau « La formule ».
- Sur mobile, la formule est une rangée de cartes qui défile horizontalement (défilement interne au
  panneau, pas à la page). Pendant la lecture, la carte en cours est ramenée en vue dans cette
  rangée uniquement : la page ne défile jamais toute seule, le cube reste à l'écran.

## Cartes de mouvement

On garde le générateur SVG de `moveIcons.js` (mini cube isométrique, couche qui tourne dans sa
vraie couleur, flèche de rotation) en l'encrant : traits noirs plus épais, autocollants neutres en
blanc case. Chaque carte : bordure d'encre, mini cube, notation en gros (Dela Gothic One), nom de
la face et sens en clair (Zen Kaku), liseré bas de 6 px dans la couleur du sens. États :

- `current` : fond Jaune Néon, légère montée (−3 px) et ombre dure 4 px d'encre.
- `done` : atténuée (opacité ou trame), la notation reste lisible.

Le libellé `aria-label` actuel est conservé.

## Cube 3D dessiné (`cube3d.js`)

- Matériaux : `MeshToonMaterial` avec une `gradientMap` à 3 tons (filtrage `NearestFilter`) pour
  les autocollants et pour le corps. Couleurs des autocollants alignées sur la palette du site là
  où c'est la même idée (jaune, rouge, bleu) ; vert, orange et blanc restent les couleurs du cube.
- Contour : coque inversée par cubie (même géométrie, légèrement agrandie, `side: BackSide`,
  noir encre). Elle doit suivre le cubie quand une couche tourne (enfant du cubie).
- Éclairage simple : une lumière directionnelle principale et une lumière d'ambiance ou
  hémisphérique, de sorte que la face blanche vue par dessous (étapes 1 à 3) ne soit jamais noire.
  On retire l'environnement `RoomEnvironment`, la softbox et le tone mapping ACES.
- L'ombre de contact devient une ellipse de trame (points d'encre) sous le cube.
- La mise en valeur de la couche qui tourne (`setLayerGlow`) reste, adaptée au matériau toon.
- Rotation lente au repos, contrôles orbitaux, changement de vue à l'étape 4 : inchangés.

## Animations

- **Lignes de vitesse** : visibles en permanence à faible opacité autour du cube ; plus marquées
  pendant qu'une couche tourne (classe sur la case pendant `playStep`).
- **Onomatopée de fin d'étape** : quand une étape se termine, un mot apparaît en grand dans la case
  du cube avec un effet de « pop » (échelle et légère rotation, environ 900 ms), puis disparaît.
  FR « CLIC ! », EN « CLICK! ». À la fin de l'étape 8 : FR « BRAVO ! », EN « SOLVED! », qui reste
  affiché jusqu'à la prochaine action.
  Décisions (Claude) : le pop ne joue que quand une étape est jouée à vitesse normale (lecture ou
  suivant), pas pendant un saut par les pages ni en arrière. « BRAVO ! » s'affiche dès que l'étape 8
  est jouée en entier, quel que soit le chemin. Il disparaît au prochain clic sur un contrôle
  (précédent, page, recommencer) ; changer de langue le traduit sans le cacher ; tourner le cube à la
  main ne le cache pas.
- **Changement d'étape** : le titre et le texte de la bulle entrent avec un léger fondu et une
  translation courte.
- `prefers-reduced-motion` : pas de pop, pas de variation des lignes de vitesse, simples fondus.

## Textes (i18n)

- Nouvelles clés FR et EN : nom des 3 phases, « Chapitre », légende des sens, onomatopées, libellés
  courts des boutons (sans symbole collé au texte si le bouton a déjà une icône), titre de page.
- Décisions (Claude) sur les textes existants : `ui.title` devient le titre de page et le texte
  alternatif du logo ; le crédit de Victor Colin reste visible au dessus de la ligne de flottaison,
  en petite étiquette mono dans la case haut (« Méthode de Victor Colin », lien vers la vidéo), en
  plus de la postface complète. `ui.subtitle` est supprimé. `ui.movesHint` est réécrit pour
  expliquer le code (« la couche qui tourne est en couleur, le liseré indique le sens »).
  `ui.stepLabel` est gardé pour les attributs `title` et `aria` des pages.
- Décidé par Bryan : **les titres et textes des 8 étapes restent fidèles à la fiche de Victor**, mot
  pour mot. La bulle parle avec les mots de Victor. Seul ajout : un mot clé surligné par titre.
  Décision (Claude) sur le stockage : nouvelle clé `steps[i].highlight` dans chaque fichier i18n,
  qui contient une sous chaîne exacte du titre (ex. « coins »). `renderStep` construit le titre avec
  des nœuds DOM (texte, `<mark>`, texte), sans `innerHTML`. Si la sous chaîne est absente, le titre
  s'affiche sans surlignage. Le choix du mot pour chaque étape, en FR et en EN, est fait par le
  constructeur (le mot qui dit ce que l'étape construit : croix, arêtes, coins, deuxième couronne,
  croix jaune, etc.).
- Titre de page FR proposé : « rubiksera, apprendre le Rubik's Cube en 8 étapes ». EN :
  « rubiksera, learn the Rubik's Cube in 8 steps ».
- Supprimer tous les « · », « — » et « – » des chaînes visibles (`ui.*`, `steps[*].body`, attribut
  `title` des pages de progression construit dans `main.js`). Remplacer par une virgule, deux
  points ou une nouvelle phrase selon le sens.
- Le README suit la même règle pour son titre et sa description (sinon il est hors périmètre, à
  part la section Features à mettre à jour).

## Accessibilité

- Contraste AA minimum pour tout texte (attention au texte sur rouge et bleu : texte blanc,
  graisse forte).
- Focus clavier visible : contour encre épais décalé.
- Le titre d'étape est annoncé aux lecteurs d'écran au changement d'étape (`aria-live="polite"`).
- Les onomatopées sont décoratives (`aria-hidden`).
- Cibles tactiles d'au moins 44 px sur mobile.

## Vérification

Pas de suite de tests dans le projet. Vérification manuelle avec un serveur local
(`python3 -m http.server`) et Playwright :

- captures bureau (1440 × 900) et mobile (390 × 844), en FR et en EN ;
- lecture des 8 étapes jusqu'au bout : le cube finit résolu et « BRAVO ! » s'affiche ;
- précédent, suivant, clic sur une page, recommencer, changement de langue en cours de route ;
- face blanche bien éclairée aux étapes 1 à 3, changement de vue à l'étape 4 ;
- aucune erreur dans la console ;
- recherche automatique : aucun « · », « — » ou « – » dans `index.html` et `i18n/*.js`.

## Laissé au constructeur

Valeurs exactes d'espacement, tailles de police par palier, nombre exact de cartes par ligne,
réglages fins de la gradientMap et de l'épaisseur du contour, densité de la trame, courbe exacte
des animations. Le tout jugé sur captures d'écran, en comparant à la maquette
`.superpowers/brainstorm/*/content/identites.html` (option 1).
