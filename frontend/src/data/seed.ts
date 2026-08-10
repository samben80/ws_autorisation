// Seed rôles / fonctions issu de l'organigramme (cf. Organigramme.dc.html & README).
import type { Role, Fonction, User } from '../types';

export const SEED_ROLES: Role[] = [
  { id: 'dir', code: 'dir', libelle: 'Direction', ordre: 0 },
  { id: 'enc', code: 'enc', libelle: 'Encadrement', ordre: 1 },
  { id: 'ope', code: 'ope', libelle: 'Opérationnels', ordre: 2 },
];

export const SEED_FONCTIONS: Fonction[] = [
  // Sommet
  { id: 'dg', roleId: 'dir', code: 'DG', libelle: 'Directeur Général', personnes: ['Rachid Hemmouda'], parentId: null },

  // Encadrement (N-1) — reporte au DG
  { id: 'r-com', roleId: 'enc', code: 'R-COM', libelle: 'Responsable commerciale', personnes: ['Chaymae Bahraoui'], parentId: 'dg' },
  { id: 'r-ach', roleId: 'enc', code: 'R-ACH', libelle: 'Responsable service achats', personnes: ['Fatima Ezzehra Ouahrour'], parentId: 'dg' },
  { id: 'r-fin', roleId: 'enc', code: 'R-FIN', libelle: 'Directrice financière et administrative', personnes: ['Meryam El Gualloussi'], parentId: 'dg' },
  { id: 'r-dig', roleId: 'enc', code: 'R-DIG', libelle: 'Digital Marketeur', personnes: ['Haytam Bouhdidi'], parentId: 'dg' },
  { id: 'r-mar', roleId: 'enc', code: 'R-MAR', libelle: 'Responsable service marché', personnes: ['Rajae Said'], parentId: 'dg' },

  // Opérationnels (N-2) — reportent à leur responsable
  { id: 'o-terrain', roleId: 'ope', code: 'O-TERRAIN', libelle: 'Commerciaux sur terrain', personnes: ['Tarik El Mernissi', 'Ayoub Jkhikh'], parentId: 'r-com' },
  { id: 'o-caisse', roleId: 'ope', code: 'O-CAISSE', libelle: 'Caissière permanente', personnes: ['Nissrine Rahmouni', 'Iqbal Chfarji', 'Amal Chehboun', 'Tarik Hamdan', 'Oumaima Boudaya'], parentId: 'r-com' },
  { id: 'o-magasin', roleId: 'ope', code: 'O-MAGASIN', libelle: 'Magasinier', personnes: ['Ilyas Bouhati'], parentId: 'r-com' },
  { id: 'o-assist', roleId: 'ope', code: 'O-ASSIST', libelle: 'Assistantes achats', personnes: ['Houda Elgraoui', 'Sara Elmoudni'], parentId: 'r-ach' },
  { id: 'o-stock', roleId: 'ope', code: 'O-STOCK', libelle: 'Gestionnaire de stock', personnes: ['Ouassima Blal'], parentId: 'r-ach' },
  { id: 'o-compta', roleId: 'ope', code: 'O-COMPTA', libelle: 'Service Comptabilité', personnes: ['Fatima Tribach', 'Khadija Mharzi', 'Hamidi Chaimae', 'Sanae Kasmi', 'Aicha Elhardouf'], parentId: 'r-fin' },
  { id: 'o-factur', roleId: 'ope', code: 'O-FACTUR', libelle: 'Agentes de facturation', personnes: ['Fadoua Azzioui', 'Majda Salmane'], parentId: 'r-fin' },
  { id: 'o-confirm', roleId: 'ope', code: 'O-CONFIRM', libelle: 'Agente de confirmation', personnes: ['Chaymae Akchikach'], parentId: 'r-dig' },
  { id: 'o-adjoint', roleId: 'ope', code: 'O-ADJOINT', libelle: 'Adjointe · Responsable service marché', personnes: ['Fatima Ichirou'], parentId: 'r-mar' },
];

/** Fonction pré-remplie par le profil de référence « STOCK » (colonne ref du catalogue). */
export const SEED_REFERENCE_FONCTION_ID = 'o-stock';

/** Dossier de démonstration (client de référence du bundle). */
export const SEED_DOSSIER_ID = 'dossier-toymart';
export const SEED_DOSSIER = { id: SEED_DOSSIER_ID, nom: 'SA TOYMART', client: 'SA TOYMART' };

/**
 * Comptes de démonstration. ⚠ Mots de passe en clair — prototype uniquement.
 * En production : authentification + hachage côté backend.
 */
export const SEED_USERS: User[] = [
  { id: 'u-admin', nom: 'Admin Wavesoft', email: 'admin@wavesoft.ma', password: 'admin', type: 'admin', dossierIds: [] },
  { id: 'u-consultant', nom: 'Consultant Wavesoft', email: 'consultant@wavesoft.ma', password: 'consultant', type: 'consultant', dossierIds: [SEED_DOSSIER_ID] },
  { id: 'u-client', nom: 'Client TOYMART', email: 'client@toymart.ma', password: 'client', type: 'client', dossierIds: [SEED_DOSSIER_ID] },
];
