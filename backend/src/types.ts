// Types partagés côté backend (miroir de frontend/src/types.ts).
export type NiveauCode = 'dir' | 'enc' | 'ope';

export interface Role {
  id: string;
  code: NiveauCode | string;
  libelle: string;
  ordre: number;
}

export interface Fonction {
  id: string;
  roleId: string;
  code: string;
  libelle: string;
  personnes: string[];
  parentId?: string | null;
}

export interface Autorisation {
  fonctionId: string;
  objet: string;
  intitule: string;
  fonction: string;
  autorise: boolean;
}

export type PermMap = Record<string, boolean>;

/** [Objet, Intitulé, Fonction, référence(0|1)] */
export type CatalogEntry = [objet: string, intitule: string, fonction: string, ref: 0 | 1];

/** Données métier d'un dossier (sa matrice complète). */
export interface DossierData {
  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;
}

export type UserType = 'admin' | 'consultant' | 'client';

/** Utilisateur (sans le hash du mot de passe, tel qu'exposé à l'API). */
export interface PublicUser {
  id: string;
  nom: string;
  email: string;
  type: UserType;
  dossierIds: string[];
}

/** Dossier (métadonnées, sans la matrice). */
export interface DossierMeta {
  id: string;
  nom: string;
  client: string;
}

export interface StateSnapshot {
  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;
}

export interface ProfilExport {
  nom: string;
  autorisations: Autorisation[];
}
