import { describe, it, expect } from 'vitest';
import { buildSql, sqlStr } from '../src/sql/buildSql';
import type { ProfilExport } from '../src/types';

describe('sqlStr', () => {
  it('double les apostrophes et préfixe N', () => {
    expect(sqlStr("Demande de prix")).toBe("N'Demande de prix'");
    expect(sqlStr("l'écriture")).toBe("N'l''écriture'");
  });
});

describe('buildSql', () => {
  const profil: ProfilExport = {
    nom: 'STOCK',
    autorisations: [
      { fonctionId: 'o-stock', objet: 'STOCK', intitule: 'Inventaire', fonction: 'Créer', autorise: true },
      { fonctionId: 'o-stock', objet: 'STOCK', intitule: 'Inventaire', fonction: 'Supprimer', autorise: false },
      { fonctionId: 'o-stock', objet: "PIECE VENTE", intitule: "Devis", fonction: "Créer", autorise: true },
    ],
  };

  it('ne garde que les autorisations cochées', () => {
    const sql = buildSql(profil);
    expect(sql).toContain('-- 2 autorisation(s)');
    expect(sql.match(/INSERT INTO dbo\.PROFIL_DROIT/g)?.length).toBe(2);
    expect(sql).not.toContain('Supprimer');
  });

  it('encadre le script dans une transaction idempotente', () => {
    const sql = buildSql(profil);
    expect(sql).toContain('BEGIN TRAN;');
    expect(sql).toContain('COMMIT TRAN;');
    expect(sql).toContain('DELETE FROM');
    expect(sql).toContain(sqlStr('STOCK'));
  });

  it('gère un profil sans autorisation', () => {
    const sql = buildSql({ nom: 'VIDE', autorisations: [] });
    expect(sql).toContain('(aucune autorisation cochée)');
    expect(sql).not.toContain('INSERT INTO dbo.PROFIL_DROIT');
  });

  it('inclut tout quand onlyAuthorized=false', () => {
    const sql = buildSql(profil, { onlyAuthorized: false });
    expect(sql.match(/INSERT INTO dbo\.PROFIL_DROIT/g)?.length).toBe(3);
  });
});
