import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { theme } from '../../styles/theme';

const navStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: 8,
  color: isActive ? '#fff' : theme.color.ink,
  background: isActive ? theme.color.ink : 'transparent',
});

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: theme.color.canvas }}>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 34px',
          borderBottom: `1px solid ${theme.color.border}`,
          background: theme.color.surface,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: '-.02em', marginRight: 18 }}>Wavesoft · Autorisations</div>
        <NavLink to="/" style={navStyle} end>
          Matrice
        </NavLink>
        <NavLink to="/roles" style={navStyle}>
          Rôles &amp; fonctions
        </NavLink>
        <NavLink to="/organigramme" style={navStyle}>
          Organigramme
        </NavLink>
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
