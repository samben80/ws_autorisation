// Seed rôles / fonctions issu de l'organigramme (cf. Organigramme.dc.html & README).
import type { Role, Fonction } from '../types';

export const SEED_ROLES: Role[] = [
  { id: 'dir', code: 'dir', libelle: 'Direction', ordre: 0 },
  { id: 'enc', code: 'enc', libelle: 'Encadrement', ordre: 1 },
  { id: 'ope', code: 'ope', libelle: 'Opérationnels', ordre: 2 },
];

export const SEED_FONCTIONS: Fonction[] = [
  { id: 'dg', roleId: 'dir', code: 'DG', libelle: 'Directeur Général', personnes: ['Rachid Hemmouda'] },

  { id: 'r-com', roleId: 'enc', code: 'R-COM', libelle: 'Resp. commerciale', personnes: ['Chaymae Bahraoui'] },
  { id: 'r-ach', roleId: 'enc', code: 'R-ACH', libelle: 'Resp. service achats', personnes: ['Fatima Ezzehra Ouahrour'] },
  { id: 'r-fin', roleId: 'enc', code: 'R-FIN', libelle: 'Dir. financière & admin.', personnes: ['Meryam El Gualloussi'] },
  { id: 'r-dig', roleId: 'enc', code: 'R-DIG', libelle: 'Digital Marketeur', personnes: ['Haytam Bouhdidi'] },
  { id: 'r-mar', roleId: 'enc', code: 'R-MAR', libelle: 'Resp. service marché', personnes: ['Rajae Said'] },

  { id: 'o-terrain', roleId: 'ope', code: 'O-TERRAIN', libelle: 'Commerciaux terrain', personnes: ['Tarik El Mernissi', 'Ayoub Jkhikh'] },
  { id: 'o-caisse', roleId: 'ope', code: 'O-CAISSE', libelle: 'Caissière permanente', personnes: ['Nissrine Rahmouni', 'Iqbal Chfarji', 'Amal Chehboun', 'Tarik Hamdan', 'Oumaima Boudaya'] },
  { id: 'o-magasin', roleId: 'ope', code: 'O-MAGASIN', libelle: 'Magasinier', personnes: ['Ilyas Bouhati'] },
  { id: 'o-assist', roleId: 'ope', code: 'O-ASSIST', libelle: 'Assistantes achats', personnes: ['Houda Elgraoui', 'Sara Elmoudni'] },
  { id: 'o-stock', roleId: 'ope', code: 'O-STOCK', libelle: 'Gestionnaire de stock', personnes: ['Ouassima Blal'] },
  { id: 'o-compta', roleId: 'ope', code: 'O-COMPTA', libelle: 'Service Comptabilité', personnes: ['Fatima Tribach', 'Khadija Mharzi', 'Hamidi Chaimae', 'Sanae Kasmi', 'Aicha Elhardouf'] },
  { id: 'o-factur', roleId: 'ope', code: 'O-FACTUR', libelle: 'Agentes de facturation', personnes: ['Fadoua Azzioui', 'Majda Salmane'] },
  { id: 'o-confirm', roleId: 'ope', code: 'O-CONFIRM', libelle: 'Agente de confirmation', personnes: ['Chaymae Akchikach'] },
  { id: 'o-adjoint', roleId: 'ope', code: 'O-ADJOINT', libelle: 'Adjointe resp. marché', personnes: ['Fatima Ichirou'] },
];

/** Fonction pré-remplie par le profil de référence « STOCK » (colonne ref du catalogue). */
export const SEED_REFERENCE_FONCTION_ID = 'o-stock';
