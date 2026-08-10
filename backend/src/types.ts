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

export interface StateSnapshot {
  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;
}

export interface ProfilExport {
  nom: string;
  autorisations: Autorisation[];
}
