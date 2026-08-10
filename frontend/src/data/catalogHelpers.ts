// Dérivations sur le catalogue Wavesoft pour la matrice.
import { CATALOG } from './catalog';
import type { CatalogEntry } from '../types';

/** Liste ordonnée et dédupliquée des objets. */
export function objetOptions(): { v: string; l: string }[] {
  const opts: { v: string; l: string }[] = [{ v: 'all', l: 'Tous les objets' }];
  let last: string | null = null;
  for (const [objet] of CATALOG) {
    if (objet !== last) {
      last = objet;
      opts.push({ v: objet, l: objet });
    }
  }
  return opts;
}

/** Filtre le catalogue par objet + recherche texte. */
export function filterCatalog(objet: string, q: string): CatalogEntry[] {
  const needle = q.trim().toLowerCase();
  return CATALOG.filter(([o, i, f]) => {
    if (objet !== 'all' && o !== objet) return false;
    if (needle && !(`${i} ${f} ${o}`.toLowerCase().includes(needle))) return false;
    return true;
  });
}

/** Ligne aplatie pour la virtualisation : bandeau d'objet ou ligne de fonction. */
export type MatrixItem =
  | { kind: 'band'; objet: string }
  | { kind: 'row'; objet: string; intitule: string; fonction: string; showIntitule: boolean; parity: 0 | 1 };

/**
 * Construit la liste aplatie : chaque changement d'objet insère un bandeau,
 * l'intitulé n'est affiché qu'à sa première ligne, le zébrage alterne par intitulé.
 */
export function buildItems(entries: CatalogEntry[]): MatrixItem[] {
  const items: MatrixItem[] = [];
  let curObjet: string | null = null;
  let curIntitule: string | null = null;
  let parity: 0 | 1 = 0;
  let firstAfterBand = false;

  for (const [objet, intitule, fonction] of entries) {
    if (objet !== curObjet) {
      curObjet = objet;
      curIntitule = null;
      firstAfterBand = true;
      items.push({ kind: 'band', objet });
    }
    const showIntitule = intitule !== curIntitule;
    if (showIntitule) {
      curIntitule = intitule;
      parity = firstAfterBand ? 0 : ((parity ^ 1) as 0 | 1);
      firstAfterBand = false;
    }
    items.push({ kind: 'row', objet, intitule, fonction, showIntitule, parity });
  }
  return items;
}

export const BAND_HEIGHT = 34;
export const ROW_HEIGHT = 30;
