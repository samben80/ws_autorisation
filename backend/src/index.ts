// Serveur API : persistance de l'état + génération SQL.
import express from 'express';
import cors from 'cors';
import { readState, writeState } from './store/fileStore.js';
import { buildSql } from './sql/buildSql.js';
import type { ProfilExport, StateSnapshot } from './types.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const PORT = Number(process.env.PORT ?? 8787);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// État (rôles + fonctions + autorisations)
app.get('/api/state', async (_req, res) => {
  const s = await readState();
  // 204-like : renvoyer un état vide si rien de persisté (le front basculera sur le seed).
  res.json(s ?? { roles: [], fonctions: [], perms: {} });
});

app.put('/api/state', async (req, res) => {
  const body = req.body as StateSnapshot;
  if (!body || !Array.isArray(body.roles) || !Array.isArray(body.fonctions)) {
    return res.status(400).json({ error: 'payload invalide' });
  }
  await writeState({ roles: body.roles, fonctions: body.fonctions, perms: body.perms ?? {} });
  res.json({ ok: true });
});

// Génération SQL
app.post('/api/sql/generate', (req, res) => {
  const profil = req.body as ProfilExport;
  if (!profil || typeof profil.nom !== 'string' || !Array.isArray(profil.autorisations)) {
    return res.status(400).json({ error: 'profil invalide' });
  }
  const sql = buildSql(profil);
  res.json({ sql });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] API prête sur http://localhost:${PORT}`);
});
