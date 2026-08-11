import { useMemo, useState } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import { apiClient } from '../store/apiClient';
import { buildSql, autorisationsFor } from '../data/buildSql';
import { Button } from '../components/ui/Shell';
import { NoDossier } from '../components/ui/NoDossier';
import { theme } from '../styles/theme';
import type { ProfilExport } from '../types';

export function SqlPage() {
  const fonctions = useMatrixStore((s) => s.fonctions);
  const perms = useMatrixStore((s) => s.perms);
  const mode = useMatrixStore((s) => s.mode);
  const activeDossierId = useMatrixStore((s) => s.activeDossierId);
  const dossiers = useMatrixStore((s) => s.dossiers);
  const dossierNom = dossiers.find((d) => d.id === activeDossierId)?.nom ?? '';

  const [scope, setScope] = useState<'one' | 'all'>('one');
  const [fonctionId, setFonctionId] = useState('');
  const [profilNom, setProfilNom] = useState('');
  const [sql, setSql] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Compteur d'autorisations par poste.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of fonctions) c[f.id] = 0;
    for (const k in perms) {
      if (!perms[k]) continue;
      const pid = k.slice(0, k.indexOf('|'));
      if (pid in c) c[pid]++;
    }
    return c;
  }, [perms, fonctions]);

  const selected = fonctions.find((f) => f.id === fonctionId);

  async function generateOne(profil: ProfilExport): Promise<string> {
    if (mode === 'api') {
      const r = await apiClient.generateSql(profil);
      return r.sql;
    }
    return buildSql(profil);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      if (scope === 'one') {
        const f = fonctions.find((x) => x.id === fonctionId);
        if (!f) {
          setError('Sélectionnez un poste.');
          setBusy(false);
          return;
        }
        const profil: ProfilExport = { nom: (profilNom || f.libelle).trim(), autorisations: autorisationsFor(f.id, perms) };
        setSql(await generateOne(profil));
      } else {
        const withAuth = fonctions.filter((f) => counts[f.id] > 0);
        const parts: string[] = [];
        for (const f of withAuth) {
          const profil: ProfilExport = { nom: f.libelle.trim(), autorisations: autorisationsFor(f.id, perms) };
          parts.push(`-- ############ Poste : ${f.libelle} ############\n` + (await generateOne(profil)));
        }
        setSql(parts.join('\n\n') || '-- Aucun poste avec autorisation.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la génération.');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = scope === 'one' ? (profilNom || selected?.libelle || 'profil') : (dossierNom || 'dossier');
    a.href = url;
    a.download = `wavesoft-${base.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (!activeDossierId) return <NoDossier />;

  const field: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: theme.color.ink, background: '#fff', border: '1px solid #ded9d0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' };

  return (
    <div style={{ padding: '36px 34px 60px', fontFamily: theme.font, color: theme.color.ink }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.color.muted, fontWeight: 600 }}>Export</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.025em', margin: '8px 0 6px' }}>Génération du script SQL</h1>
        <p style={{ fontSize: 14, color: theme.color.muted, margin: '0 0 20px', maxWidth: 780 }}>
          Traduit les autorisations cochées en script Wavesoft (SQL Server) — un profil par poste, idempotent
          (transaction, purge puis réinsertion des droits). {mode === 'api' ? 'Généré côté serveur.' : 'Généré localement.'}
        </p>

        <div style={{ background: '#fbeeec', border: '1px solid #e6cdc8', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#7a3f38', marginBottom: 22 }}>
          ⚠ Les noms de tables/colonnes sont des <strong>placeholders</strong> à valider contre le schéma Wavesoft réel du
          client. Exécutez d'abord en environnement de test — ce script <strong>modifie la base</strong>.
        </div>

        {/* Contrôles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 18 }}>
          <select style={field} value={scope} onChange={(e) => setScope(e.target.value as 'one' | 'all')}>
            <option value="one">Un poste</option>
            <option value="all">Tous les postes</option>
          </select>

          {scope === 'one' && (
            <select style={field} value={fonctionId} onChange={(e) => setFonctionId(e.target.value)}>
              <option value="">— choisir un poste —</option>
              {fonctions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.libelle} ({counts[f.id]} autor.)
                </option>
              ))}
            </select>
          )}

          {scope === 'one' && (
            <input
              style={{ ...field, fontWeight: 400, minWidth: 220 }}
              value={profilNom}
              onChange={(e) => setProfilNom(e.target.value)}
              placeholder={selected ? `Nom du profil (défaut : ${selected.libelle})` : 'Nom du profil'}
            />
          )}

          <Button variant="primary" onClick={generate}>{busy ? 'Génération…' : 'Générer le script SQL'}</Button>
          {sql && (
            <>
              <Button onClick={copy}>{copied ? 'Copié ✓' : 'Copier'}</Button>
              <Button onClick={download}>Télécharger .sql</Button>
            </>
          )}
        </div>

        {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {/* Aperçu */}
        <pre
          style={{
            margin: 0,
            background: '#1e1e24',
            color: '#e8e6e0',
            borderRadius: 12,
            padding: '18px 20px',
            fontSize: 12.5,
            lineHeight: 1.55,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            overflow: 'auto',
            maxHeight: '60vh',
            border: `1px solid ${theme.color.border}`,
            whiteSpace: 'pre',
          }}
        >
          {sql || '-- L’aperçu du script apparaîtra ici après génération.'}
        </pre>
      </div>
    </div>
  );
}
