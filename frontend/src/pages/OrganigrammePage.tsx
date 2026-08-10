import { useMatrixStore } from '../store/useMatrixStore';
import { theme } from '../styles/theme';

const accent: Record<string, string> = { dir: theme.color.dir, enc: theme.color.enc, ope: theme.color.ope };

export function OrganigrammePage() {
  const { roles, fonctions } = useMatrixStore();
  const ordered = [...roles].sort((a, b) => a.ordre - b.ordre);

  return (
    <div style={{ padding: '48px 34px 72px', fontFamily: theme.font, color: theme.color.ink }}>
      <div style={{ maxWidth: 1200, margin: '0 auto 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.color.muted, fontWeight: 600 }}>
          Structure organisationnelle
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.025em', margin: '8px 0 0' }}>Organigramme</h1>
        <div style={{ width: 52, height: 3, background: theme.color.acFin, borderRadius: 2, margin: '16px auto 0' }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {ordered.map((role) => {
          const fs = fonctions.filter((f) => f.roleId === role.id);
          return (
            <div key={role.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: accent[role.code] ?? theme.color.ope }} />
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: theme.color.muted }}>
                  {role.libelle}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {fs.map((f) => (
                  <div key={f.id} style={{ width: 220, background: '#fff', border: `1px solid ${theme.color.border}`, borderRadius: 12, boxShadow: theme.shadow.sub, overflow: 'hidden' }}>
                    <div style={{ height: 4, background: accent[role.code] ?? theme.color.ope }} />
                    <div style={{ padding: '13px 15px 15px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 }}>{f.libelle}</div>
                      <div style={{ height: 1, background: theme.color.sep, margin: '9px 0' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5, color: theme.color.muted, lineHeight: 1.4 }}>
                        {f.personnes.length ? f.personnes.map((p) => <span key={p}>{p}</span>) : <span style={{ color: theme.color.muted2 }}>—</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
