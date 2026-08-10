import { useMemo, useState } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import { objetOptions, filterCatalog, buildItems } from '../data/catalogHelpers';
import { MatrixTable } from '../components/Matrix/MatrixTable';
import { Button } from '../components/ui/Shell';
import { theme } from '../styles/theme';

export function MatrixPage() {
  const {
    roles,
    fonctions,
    perms,
    ready,
    source,
    persisting,
    toggle,
    resetReferenceDefaults,
    clearAll,
    setAllForFonction,
    copyFonctionPerms,
  } = useMatrixStore();
  const [objet, setObjet] = useState('ACTION');
  const [q, setQ] = useState('');

  const options = useMemo(() => objetOptions(), []);
  const entries = useMemo(() => filterCatalog(objet, q), [objet, q]);
  const items = useMemo(() => buildItems(entries), [entries]);

  // Compteurs par fonction (sur l'ensemble des autorisations).
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

  const totalAuth = useMemo(() => Object.keys(perms).filter((k) => perms[k]).length, [perms]);
  const rowCount = items.filter((i) => i.kind === 'row').length;

  return (
    <div style={{ padding: '36px 34px 60px', fontFamily: theme.font, color: theme.color.ink }}>
      <div style={{ maxWidth: 1640, margin: '0 auto 22px' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.color.muted, fontWeight: 600 }}>
          ERP Wavesoft · Fiches profil
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.025em', margin: '8px 0 6px' }}>
          Matrice des autorisations
        </h1>
        <p style={{ fontSize: 14, color: theme.color.muted, lineHeight: 1.55, margin: 0, maxWidth: 960 }}>
          Grille native Wavesoft — <strong>Objet · Intitulé · Fonction</strong> — avec une colonne d'autorisation par
          poste, regroupées par niveau hiérarchique. Cochez la case pour autoriser la fonction. La colonne{' '}
          <strong>Gestionnaire de stock</strong> est pré-remplie d'après la fiche profil « STOCK ».{' '}
          {source && <span style={{ color: theme.color.muted2 }}>(source : {source}{persisting ? ' · enregistrement…' : ''})</span>}
        </p>
      </div>

      {/* TOOLBAR */}
      <div style={{ maxWidth: 1640, margin: '0 auto 16px', display: 'flex', flexWrap: 'wrap', gap: '12px 18px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: theme.color.muted2, fontWeight: 600 }}>
            Objet
          </label>
          <select
            value={objet}
            onChange={(e) => setObjet(e.target.value)}
            style={{ fontSize: 13, fontWeight: 600, color: theme.color.ink, background: '#fff', border: '1px solid #ded9d0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', minWidth: 190 }}
          >
            {options.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un intitulé / fonction…"
            style={{ fontSize: 13, color: theme.color.ink, background: '#fff', border: '1px solid #ded9d0', borderRadius: 8, padding: '8px 12px', minWidth: 240 }}
          />
          <span style={{ fontSize: 12.5, color: theme.color.muted2 }}>
            {rowCount} fonction{rowCount > 1 ? 's' : ''} affichée{rowCount > 1 ? 's' : ''} · {totalAuth} autorisation
            {totalAuth > 1 ? 's' : ''} au total
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={resetReferenceDefaults}>Réinitialiser (profil STOCK)</Button>
          <Button variant="danger" onClick={clearAll}>
            Tout décocher
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ maxWidth: 1640, margin: '0 auto', background: '#fff', border: `1px solid ${theme.color.border}`, borderRadius: 14, boxShadow: theme.shadow.card, overflow: 'hidden' }}>
        {ready ? (
          <MatrixTable
            roles={roles}
            fonctions={fonctions}
            items={items}
            perms={perms}
            counts={counts}
            onToggle={toggle}
            onSetAll={setAllForFonction}
            onCopy={copyFonctionPerms}
          />
        ) : (
          <div style={{ padding: 60, textAlign: 'center', color: theme.color.muted2, fontSize: 14 }}>
            Chargement du catalogue Wavesoft…
          </div>
        )}
      </div>

      {/* LÉGENDE */}
      <div style={{ maxWidth: 1640, margin: '18px auto 0', display: 'flex', flexWrap: 'wrap', gap: '10px 26px', alignItems: 'center', fontSize: 12.5, color: theme.color.muted }}>
        <Legend swatch={<span style={{ width: 16, height: 16, borderRadius: 4, background: theme.color.on, color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}>
          Fonction autorisée
        </Legend>
        <Legend swatch={<span style={{ width: 16, height: 16, borderRadius: 4, background: '#fff', border: `1px solid ${theme.color.offBorder}`, display: 'inline-block' }} />}>
          Non autorisée
        </Legend>
        <Legend swatch={<span style={{ width: 14, height: 14, borderRadius: 3, background: theme.color.dir, display: 'inline-block' }} />}>Direction</Legend>
        <Legend swatch={<span style={{ width: 14, height: 14, borderRadius: 3, background: theme.color.enc, display: 'inline-block' }} />}>Encadrement</Legend>
        <Legend swatch={<span style={{ width: 14, height: 14, borderRadius: 3, background: theme.color.ope, display: 'inline-block' }} />}>Opérationnels</Legend>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#a5a199' }}>Le badge sous chaque poste indique le nombre de fonctions autorisées.</span>
      </div>
    </div>
  );
}

function Legend({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {swatch} {children}
    </div>
  );
}
