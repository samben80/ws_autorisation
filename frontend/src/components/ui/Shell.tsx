import { useMemo, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { theme } from '../../styles/theme';
import { useMatrixStore, USER_TYPE_LABEL, accessibleDossiers } from '../../store/useMatrixStore';

const navStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: 8,
  color: isActive ? '#fff' : theme.color.ink,
  background: isActive ? theme.color.ink : 'transparent',
});

export function Shell({ children }: { children: ReactNode }) {
  const users = useMatrixStore((s) => s.users);
  const dossiers = useMatrixStore((s) => s.dossiers);
  const currentUserId = useMatrixStore((s) => s.currentUserId);
  const activeDossierId = useMatrixStore((s) => s.activeDossierId);
  const setActiveDossier = useMatrixStore((s) => s.setActiveDossier);
  const logout = useMatrixStore((s) => s.logout);

  const user = useMemo(() => users.find((u) => u.id === currentUserId) ?? null, [users, currentUserId]);
  const myDossiers = useMemo(() => accessibleDossiers(user, dossiers), [user, dossiers]);
  const isAdmin = user?.type === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: theme.color.canvas }}>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 28px',
          borderBottom: `1px solid ${theme.color.border}`,
          background: theme.color.surface,
          position: 'sticky',
          top: 0,
          zIndex: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: '-.02em', marginRight: 12 }}>Wavesoft</div>
        <NavLink to="/" style={navStyle} end>
          Matrice
        </NavLink>
        <NavLink to="/roles" style={navStyle}>
          Rôles &amp; fonctions
        </NavLink>
        <NavLink to="/organigramme" style={navStyle}>
          Organigramme
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" style={navStyle}>
            Administration
          </NavLink>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Sélecteur de dossier actif */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: theme.color.muted2, fontWeight: 600 }}>Dossier</span>
            {myDossiers.length > 1 || isAdmin ? (
              <select
                value={activeDossierId ?? ''}
                onChange={(e) => setActiveDossier(e.target.value)}
                style={{ fontSize: 13, fontWeight: 600, color: theme.color.ink, background: '#fff', border: '1px solid #ded9d0', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
              >
                {myDossiers.length === 0 && <option value="">— aucun dossier —</option>}
                {myDossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700 }}>{dossiers.find((d) => d.id === activeDossierId)?.nom ?? '—'}</span>
            )}
          </div>

          {/* Utilisateur + déconnexion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.nom}</div>
              <div style={{ fontSize: 11, color: theme.color.muted2 }}>{user ? USER_TYPE_LABEL[user.type] : ''}</div>
            </div>
            <Button onClick={logout}>Déconnexion</Button>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'default',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
  type?: 'button' | 'submit';
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: { color: theme.color.ink, background: '#fff', border: `1px solid ${theme.color.border}` },
    primary: { color: '#fff', background: theme.color.ink, border: `1px solid ${theme.color.ink}` },
    danger: { color: theme.color.danger, background: '#fff', border: '1px solid #e6cdc8' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        fontSize: 12.5,
        fontWeight: 600,
        borderRadius: 8,
        padding: '8px 14px',
        cursor: 'pointer',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}
