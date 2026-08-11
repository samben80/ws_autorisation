import { Router } from 'express';
import { listUsers, createUser, updateUser, deleteUser, getUserRowByEmail, getUserRowById } from '../db.js';
import { requireAuth, requireAdmin, type AuthedRequest } from '../auth/jwt.js';
import type { UserType } from '../types.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const TYPES: UserType[] = ['admin', 'consultant', 'client'];

function validate(body: unknown): { nom: string; email: string; password?: string; type: UserType; dossierIds: string[] } | string {
  const b = body as Record<string, unknown>;
  if (typeof b?.nom !== 'string' || !b.nom.trim()) return 'Nom requis.';
  if (typeof b?.email !== 'string' || !b.email.trim()) return 'Email requis.';
  if (typeof b?.type !== 'string' || !TYPES.includes(b.type as UserType)) return 'Type invalide.';
  const dossierIds = Array.isArray(b.dossierIds) ? (b.dossierIds as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  return { nom: b.nom.trim(), email: b.email.trim(), password: typeof b.password === 'string' ? b.password : undefined, type: b.type as UserType, dossierIds };
}

usersRouter.get('/', (_req, res) => res.json({ users: listUsers() }));

usersRouter.post('/', (req, res) => {
  const v = validate(req.body);
  if (typeof v === 'string') return res.status(400).json({ error: v });
  if (!v.password) return res.status(400).json({ error: 'Mot de passe requis.' });
  if (getUserRowByEmail(v.email)) return res.status(409).json({ error: 'Email déjà utilisé.' });
  const user = createUser({ id: uid('u'), ...v, password: v.password });
  res.status(201).json({ user });
});

usersRouter.put('/:id', (req, res) => {
  const existing = getUserRowById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  const v = validate(req.body);
  if (typeof v === 'string') return res.status(400).json({ error: v });
  const byEmail = getUserRowByEmail(v.email);
  if (byEmail && byEmail.id !== req.params.id) return res.status(409).json({ error: 'Email déjà utilisé.' });
  const user = updateUser(req.params.id, v);
  res.json({ user });
});

usersRouter.delete('/:id', (req: AuthedRequest, res) => {
  const target = getUserRowById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (req.user?.id === req.params.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte.' });
  if (target.type === 'admin') {
    const admins = listUsers().filter((u) => u.type === 'admin').length;
    if (admins <= 1) return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur.' });
  }
  deleteUser(req.params.id);
  res.json({ ok: true });
});
