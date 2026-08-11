// Authentification par jeton JWT (Bearer) + middlewares Express.
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { getUserRowById, toPublicUser } from '../db.js';
import type { PublicUser } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const JWT_EXPIRES: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES ?? '12h') as SignOptions['expiresIn'];

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[auth] JWT_SECRET non défini — secret de développement utilisé. À définir en production.');
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/** Étend Request avec l'utilisateur authentifié. */
export interface AuthedRequest extends Request {
  user?: PublicUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const row = getUserRowById(payload.sub);
    if (!row) return res.status(401).json({ error: 'Utilisateur introuvable.' });
    req.user = toPublicUser(row);
    next();
  } catch {
    return res.status(401).json({ error: 'Jeton invalide ou expiré.' });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.type !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  next();
}
