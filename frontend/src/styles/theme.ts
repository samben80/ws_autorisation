// Design tokens repris du README (couleurs, rayons, ombres, typo).
export const theme = {
  font: "'Hanken Grotesk', system-ui, -apple-system, sans-serif",

  color: {
    canvas: '#f6f4ef',
    surface: '#ffffff',
    border: '#e8e4dc',
    sep: '#f0ece3',
    sep2: '#ece7dd',
    ink: '#2b2a31',
    muted: '#6d6a63',
    muted2: '#8a8780',

    // Niveaux hiérarchiques
    dir: '#2a2a33',
    enc: '#3f6796',
    ope: '#567d49',

    // Teintes de colonnes (corps de table)
    colDir: '#faf9fc',
    colEnc: '#f6f9fc',
    colOpe: '#f7fbf5',

    // Cases
    on: '#3f7d4f',
    offBorder: '#d3cfc6',

    // Bandeaux
    objetBand: '#2f2f37',
    headLeft: '#26262b',

    // Accents par pôle (rappel organigramme)
    acCom: '#c2685a',
    acAch: '#6f9e5f',
    acFin: '#5b82b0',
    acDig: '#8a6bb0',
    acMar: '#c39a4e',
    danger: '#8a4a42',
  },

  radius: {
    card: 14,
    sub: 12,
    box: 4,
    pill: 999,
  },

  shadow: {
    card: '0 1px 2px rgba(30,30,45,.05), 0 12px 30px rgba(30,30,45,.06)',
    sub: '0 1px 2px rgba(30,30,45,.06), 0 10px 24px rgba(30,30,45,.06)',
  },
} as const;

/** Métadonnées d'affichage par niveau. */
export const niveauMeta: Record<'dir' | 'enc' | 'ope', { label: string; head: string; col: string }> = {
  dir: { label: 'Direction', head: theme.color.dir, col: theme.color.colDir },
  enc: { label: 'Encadrement', head: theme.color.enc, col: theme.color.colEnc },
  ope: { label: 'Opérationnels', head: theme.color.ope, col: theme.color.colOpe },
};

export type Theme = typeof theme;
