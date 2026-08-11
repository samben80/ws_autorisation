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

// ---------------------------------------------------------------------------
// Multi-dossiers & authentification
// ---------------------------------------------------------------------------

/** Données métier propres à un dossier client (sa matrice complète). */
export interface DossierData {
  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;
}

/** Dossier client : espace isolé possédant sa propre matrice. */
export interface Dossier {
  id: string;
  nom: string; // nom du dossier / raison sociale
  client: string; // libellé client (ex. « SA TOYMART »)
  data: DossierData;
}

/** Type de compte applicatif (à ne pas confondre avec le « rôle » Wavesoft = niveau). */
export type UserType = 'admin' | 'consultant' | 'client';

/** Utilisateur de l'application. */
export interface User {
  id: string;
  nom: string;
  email: string;
  /** ⚠ Prototype : mot de passe en clair. En production → hash côté backend. */
  password: string;
  type: UserType;
  /** Dossiers accessibles (ignoré pour l'admin qui voit tout ; 1 seul pour un client). */
  dossierIds: string[];
}

/** État applicatif persistané (hors matrices, portées par les dossiers). */
export interface AppState {
  users: User[];
  dossiers: Dossier[];
  currentUserId: string | null;
  activeDossierId: string | null;
}

/** Utilisateur tel qu'exposé par l'API (sans mot de passe). */
export interface PublicUser {
  id: string;
  nom: string;
  email: string;
  type: UserType;
  dossierIds: string[];
}

/** Dossier (métadonnées seules, sans la matrice). */
export interface DossierMeta {
  id: string;
  nom: string;
  client: string;
}
