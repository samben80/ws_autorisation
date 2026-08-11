// Serveur API : authentification, dossiers multi-tenant, génération SQL.
// Sert également le frontend statique (déploiement full-stack, même origine).
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import './db.js'; // initialise la base + seed au démarrage
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { dossiersRouter } from './routes/dossiers.js';
import { requireAuth } from './auth/jwt.js';
import { buildSql } from './sql/buildSql.js';
import type { ProfilExport } from './types.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const PORT = Number(process.env.PORT ?? 8787);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/dossiers', dossiersRouter);

// Génération SQL (authentifié)
app.post('/api/sql/generate', requireAuth, (req, res) => {
  const profil = req.body as ProfilExport;
  if (!profil || typeof profil.nom !== 'string' || !Array.isArray(profil.autorisations)) {
    return res.status(400).json({ error: 'profil invalide' });
  }
  res.json({ sql: buildSql(profil) });
});

// Frontend statique (si présent). En dev, Vite sert l'UI et ce bloc est ignoré.
const FRONTEND_DIR = process.env.FRONTEND_DIR ?? path.resolve(process.cwd(), 'frontend/dist');
if (fs.existsSync(path.join(FRONTEND_DIR, 'index.html'))) {
  app.use(express.static(FRONTEND_DIR));
  // SPA fallback : toute route non-API renvoie index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
  // eslint-disable-next-line no-console
  console.log(`[backend] frontend servi depuis ${FRONTEND_DIR}`);
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] API prête sur http://localhost:${PORT}`);
});
