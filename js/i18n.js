// ─── Moteur de traduction (i18n) ────────────────────────────────────────
//
// API :
//   await init()             — charge la langue (localStorage > navigator)
//   t(path)                  — résout 'ui.btnPlay' ou 'moves.right'
//   tSteps()                 — renvoie le tableau steps[] de la langue courante
//   getLang()                — code de langue courant ('fr' | 'en')
//   getSupportedLangs()      — liste des codes supportés
//   await setLang(lang)      — change la langue + persiste + déclenche 'langChanged'
//
// Évite l'usage de eval ou de template literals dynamiques : utilise les chemins
// pointés et un fallback sûr si la clé n'existe pas.

const SUPPORTED = ['fr', 'en'];
const STORAGE_KEY = 'rubiks-lang';
const DEFAULT_LANG = 'fr';

let currentLang = null;
let dict = null;

function pickInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;
  const nav = (navigator.language || '').toLowerCase();
  for (const code of SUPPORTED) {
    if (nav.startsWith(code)) return code;
  }
  return DEFAULT_LANG;
}

async function loadDict(lang) {
  // Import dynamique : './../i18n/fr.js' depuis js/
  return (await import(`../i18n/${lang}.js`)).default;
}

export async function init() {
  currentLang = pickInitialLang();
  dict = await loadDict(currentLang);
  document.documentElement.lang = currentLang;
}

export function t(path) {
  if (!dict) return path;
  const value = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
  return value ?? path;
}

export function tSteps() {
  return dict?.steps ?? [];
}

export function getLang() {
  return currentLang;
}

export function getSupportedLangs() {
  return SUPPORTED.slice();
}

export async function setLang(lang) {
  if (!SUPPORTED.includes(lang)) {
    console.warn(`[i18n] Langue non supportée : ${lang}`);
    return;
  }
  if (lang === currentLang) return;
  currentLang = lang;
  dict = await loadDict(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  document.dispatchEvent(new CustomEvent('langChanged', { detail: lang }));
}

// Applique les traductions à tous les éléments avec data-i18n="path"
// (gérera title, label, button text, etc. automatiquement).
export function applyToDom(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const path = el.dataset.i18n;
    el.textContent = t(path);
  }
}
