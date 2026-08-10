// Générateur SQL Wavesoft (SQL Server) — module PUR et testable.
//
// ⚠ Le modèle exact des droits Wavesoft n'est pas public. Les noms de tables et
// colonnes ci-dessous sont des PLACEHOLDERS à valider/ajuster contre le schéma
// réel du client avant toute exécution (générer d'abord en environnement de test).
//
// Le script produit est idempotent : il ouvre une transaction, upsert le profil,
// purge ses droits puis réinsère une ligne par autorisation cochée.
import type { ProfilExport, Autorisation } from '../types.js';

/** Noms d'objets de base Wavesoft (placeholders — À VALIDER). */
export interface SqlSchema {
  profilTable: string;
  profilKey: string; // colonne libellé/clé du profil
  droitTable: string;
  droitProfilCol: string;
  droitObjetCol: string;
  droitIntituleCol: string;
  droitFonctionCol: string;
  droitAutoriseCol: string;
}

export const DEFAULT_SCHEMA: SqlSchema = {
  profilTable: 'dbo.PROFIL',
  profilKey: 'PROFIL_Libelle',
  droitTable: 'dbo.PROFIL_DROIT',
  droitProfilCol: 'PROFIL_Libelle',
  droitObjetCol: 'DROIT_Objet',
  droitIntituleCol: 'DROIT_Intitule',
  droitFonctionCol: 'DROIT_Fonction',
  droitAutoriseCol: 'DROIT_Autorise',
};

/** Échappe une chaîne pour un littéral SQL Server (apostrophes doublées). */
export function sqlStr(v: string): string {
  return `N'${String(v).replace(/'/g, "''")}'`;
}

export interface BuildSqlOptions {
  schema?: SqlSchema;
  /** N'inclure que les autorisations cochées (défaut : true). */
  onlyAuthorized?: boolean;
}

/**
 * Construit le script SQL idempotent pour un profil.
 * @returns une chaîne SQL prête à télécharger (UTF-8).
 */
export function buildSql(profil: ProfilExport, opts: BuildSqlOptions = {}): string {
  const s = opts.schema ?? DEFAULT_SCHEMA;
  const onlyAuthorized = opts.onlyAuthorized ?? true;
  const nom = profil.nom?.trim() || 'PROFIL_SANS_NOM';

  const rows: Autorisation[] = (profil.autorisations ?? []).filter((a) => (onlyAuthorized ? a.autorise : true));

  const header = [
    '-- =====================================================================',
    `-- Profil Wavesoft : ${nom}`,
    `-- Généré le ${new Date().toISOString()}`,
    `-- ${rows.length} autorisation(s)`,
    '-- ⚠ Placeholders de schéma — À VALIDER contre la base Wavesoft réelle.',
    '-- =====================================================================',
    'SET NOCOUNT ON;',
    'SET XACT_ABORT ON;',
    'BEGIN TRAN;',
    '',
    '-- 1) Upsert du profil',
    `IF NOT EXISTS (SELECT 1 FROM ${s.profilTable} WHERE ${s.profilKey} = ${sqlStr(nom)})`,
    `    INSERT INTO ${s.profilTable} (${s.profilKey}) VALUES (${sqlStr(nom)});`,
    '',
    '-- 2) Purge des droits existants du profil (idempotence)',
    `DELETE FROM ${s.droitTable} WHERE ${s.droitProfilCol} = ${sqlStr(nom)};`,
    '',
    '-- 3) Réinsertion des autorisations',
  ];

  const inserts =
    rows.length === 0
      ? ['-- (aucune autorisation cochée)']
      : rows.map(
          (a: Autorisation) =>
            `INSERT INTO ${s.droitTable} (${s.droitProfilCol}, ${s.droitObjetCol}, ${s.droitIntituleCol}, ${s.droitFonctionCol}, ${s.droitAutoriseCol}) ` +
            `VALUES (${sqlStr(nom)}, ${sqlStr(a.objet)}, ${sqlStr(a.intitule)}, ${sqlStr(a.fonction)}, 1);`,
        );

  const footer = ['', 'COMMIT TRAN;', '-- Fin du script.', ''];

  return [...header, ...inserts, ...footer].join('\n');
}
