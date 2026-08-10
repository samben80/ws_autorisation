import { theme } from '../../styles/theme';

export function NoDossier() {
  return (
    <div style={{ padding: '80px 34px', textAlign: 'center', fontFamily: theme.font, color: theme.color.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: theme.color.ink }}>Aucun dossier actif</div>
      <p style={{ fontSize: 13.5, maxWidth: 420, margin: '8px auto 0' }}>
        Sélectionnez un dossier dans la barre du haut. Si aucun dossier ne vous est attribué, contactez un administrateur
        Wavesoft.
      </p>
    </div>
  );
}
