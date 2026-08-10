import { useState } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import { Button } from '../components/ui/Shell';
import { theme } from '../styles/theme';

export function LoginPage() {
  const login = useMatrixStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(email, password);
    setError(res.ok ? null : res.error ?? 'Échec de la connexion.');
  };

  const field: React.CSSProperties = {
    width: '100%',
    fontSize: 14,
    color: theme.color.ink,
    background: '#fff',
    border: '1px solid #ded9d0',
    borderRadius: 8,
    padding: '11px 13px',
    marginTop: 6,
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.color.canvas, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.font, padding: 20 }}>
      <div style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.color.muted, fontWeight: 600 }}>ERP Wavesoft</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.025em', margin: '8px 0 0' }}>Rôles &amp; autorisations</h1>
        </div>

        <form onSubmit={submit} style={{ background: '#fff', border: `1px solid ${theme.color.border}`, borderRadius: 14, boxShadow: theme.shadow.card, padding: 26 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Connexion</h2>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: theme.color.muted }}>Accédez à vos dossiers clients.</p>

          <label style={{ fontSize: 12, fontWeight: 600, color: theme.color.muted }}>Email</label>
          <input style={field} type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ma" />

          <label style={{ fontSize: 12, fontWeight: 600, color: theme.color.muted, display: 'block', marginTop: 14 }}>Mot de passe</label>
          <input style={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

          {error && (
            <div style={{ marginTop: 14, fontSize: 13, color: theme.color.danger, background: '#fbeeec', border: '1px solid #e6cdc8', borderRadius: 8, padding: '9px 12px' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <Button type="submit" variant="primary">Se connecter</Button>
          </div>
        </form>

        <div style={{ marginTop: 16, background: '#fff', border: `1px dashed ${theme.color.border}`, borderRadius: 12, padding: '14px 16px', fontSize: 12.5, color: theme.color.muted }}>
          <div style={{ fontWeight: 700, color: theme.color.ink, marginBottom: 6 }}>Comptes de démonstration</div>
          <div>Admin — <code>admin@wavesoft.ma</code> / <code>admin</code></div>
          <div>Consultant — <code>consultant@wavesoft.ma</code> / <code>consultant</code></div>
          <div>Client — <code>client@toymart.ma</code> / <code>client</code></div>
        </div>
      </div>
    </div>
  );
}
