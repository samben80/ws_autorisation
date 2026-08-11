import { Router } from 'express';
import {
  accessibleDossiers,
  createDossier,
  updateDossierMeta,
  deleteDossier,
  getDossierMeta,
  getDossierData,
  setDossierData,
  canAccessDossier,
} from '../db.js';
import { requireAuth, requireAdmin, type AuthedRequest } from '../auth/jwt.js';
import type { DossierData } from '../types.js';

export const dossiersRouter = Router();
dossiersRouter.use(requireAuth);

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

// Liste des dossiers accessibles (métadonnées)
dossiersRouter.get('/', (req: AuthedRequest, res) => {
  const u = req.user!;
  res.json({ dossiers: accessibleDossiers(u.id, u.type) });
});

// Création (admin)
dossiersRouter.post('/', requireAdmin, (req, res) => {
  const { nom, client } = req.body ?? {};
  if (typeof nom !== 'string' || !nom.trim()) return res.status(400).json({ error: 'Nom requis.' });
  const meta = createDossier({ id: uid('dossier'), nom: nom.trim(), client: typeof client === 'string' ? client.trim() : '' });
  res.status(201).json({ dossier: meta });
});

// Mise à jour métadonnées (admin)
dossiersRouter.put('/:id', requireAdmin, (req, res) => {
  if (!getDossierMeta(req.params.id)) return res.status(404).json({ error: 'Dossier introuvable.' });
  const { nom, client } = req.body ?? {};
  updateDossierMeta(req.params.id, { nom, client });
  res.json({ dossier: getDossierMeta(req.params.id) });
});

// Suppression (admin)
dossiersRouter.delete('/:id', requireAdmin, (req, res) => {
  if (!getDossierMeta(req.params.id)) return res.status(404).json({ error: 'Dossier introuvable.' });
  deleteDossier(req.params.id);
  res.json({ ok: true });
});

// Données (matrice) — lecture
dossiersRouter.get('/:id/data', (req: AuthedRequest, res) => {
  const u = req.user!;
  if (!canAccessDossier(u.id, u.type, req.params.id)) return res.status(403).json({ error: 'Accès refusé à ce dossier.' });
  const data = getDossierData(req.params.id);
  if (!data) return res.status(404).json({ error: 'Dossier introuvable.' });
  res.json({ data });
});

// Données (matrice) — écriture
dossiersRouter.put('/:id/data', (req: AuthedRequest, res) => {
  const u = req.user!;
  if (!canAccessDossier(u.id, u.type, req.params.id)) return res.status(403).json({ error: 'Accès refusé à ce dossier.' });
  if (!getDossierMeta(req.params.id)) return res.status(404).json({ error: 'Dossier introuvable.' });
  const body = req.body as DossierData;
  if (!body || !Array.isArray(body.roles) || !Array.isArray(body.fonctions)) {
    return res.status(400).json({ error: 'Données invalides.' });
  }
  setDossierData(req.params.id, { roles: body.roles, fonctions: body.fonctions, perms: body.perms ?? {} });
  res.json({ ok: true });
});
