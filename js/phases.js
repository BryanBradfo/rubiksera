// Phases de la méthode : chaque étape appartient à une des 3 grandes phases,
// et chaque phase a sa couleur dans tout le site (code couleur).
//   phase 1 = la première couronne (étapes 1 à 3)
//   phase 2 = la deuxième couronne (étape 4)
//   phase 3 = la face jaune        (étapes 5 à 8)

export const PHASE_COUNT = 3;

const PHASE_BY_STEP = [1, 1, 1, 2, 3, 3, 3, 3];

/** @param {number} stepIndex index 0-based de l'étape */
export function phaseOf(stepIndex) {
  return PHASE_BY_STEP[stepIndex];
}

/**
 * Découpe un titre autour du mot clé à surligner (première occurrence).
 * @returns {{before: string, mark: string, after: string} | null}
 */
export function splitHighlight(title, highlight) {
  if (!highlight) return null;
  const at = title.indexOf(highlight);
  if (at < 0) return null;
  return {
    before: title.slice(0, at),
    mark: highlight,
    after: title.slice(at + highlight.length),
  };
}
