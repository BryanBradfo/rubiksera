// ─── Données des 8 étapes ────────────────────────────────────────────────
// Les titres et bodies viennent maintenant de i18n. Le champ `moves` est peuplé
// au load par les valeurs PRECOMPUTED_STEPS de main.js.

import { tSteps } from './i18n.js';

// Tableau initial avec uniquement les `number` et `moves` (vides).
// Les titres et bodies sont injectés par syncStepsFromI18n() au chargement
// et à chaque changement de langue.
export const STEPS = Array.from({ length: 8 }, (_, i) => ({
  number: i + 1,
  title: '',
  body: '',
  moves: [],
}));

// Réinjecte les titres/bodies depuis i18n (langue courante).
// Préserve les `moves` qui ont été peuplés ailleurs.
export function syncStepsFromI18n() {
  const localized = tSteps();
  for (let i = 0; i < STEPS.length && i < localized.length; i++) {
    STEPS[i].title = localized[i].title;
    STEPS[i].body = localized[i].body;
  }
}

// La solution complète = concaténation des moves de toutes les étapes
export function fullSolution() {
  return STEPS.flatMap(s => s.moves);
}
