// Modèle de données de l'application (cf. README « Modèle de données »).

/** Niveau hiérarchique. */
export type NiveauCode = 'dir' | 'enc' | 'ope';

/** Rôle = niveau hiérarchique (Direction, Encadrement, Opérationnels). */
export interface Role {
  id: string;
  code: NiveauCode;
  libelle: string;
  ordre: number;
}

/** Fonction = poste rattaché à un rôle. Devient une colonne de la matrice. */
export interface Fonction {
  id: string;
  roleId: string;
  code: string;
  libelle: string;
  personnes: string[];
  /** Fonction supérieure hiérarchique (à qui ce poste reporte). null/absent = sommet. */
  parentId?: string | null;
}

/**
 * Entrée du catalogue Wavesoft.
 * [Objet, Intitulé, Fonction, autorisé_dans_le_profil_de_référence(0|1)]
 */
export type CatalogEntry = [objet: string, intitule: string, fonction: string, ref: 0 | 1];

/** Autorisation d'une fonction sur un triplet du catalogue. */
export interface Autorisation {
  fonctionId: string;
  objet: string;
  intitule: string;
  fonction: string;
  autorise: boolean;
}

/**
 * Table d'autorisations à plat, indexée par clé `fonctionId|objet|intitule|fonction`.
 * `true` = autorisé. Absence de clé = non autorisé.
 */
export type PermMap = Record<string, boolean>;

/** Profil exporté vers le générateur SQL. */
export interface ProfilExport {
  nom: string;
  autorisations: Autorisation[];
}
