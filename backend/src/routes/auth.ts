import { Router } from 'express';
import { getUserRowByEmail, toPublicUser, verifyPassword } from '../db.js';
import { signToken, requireAuth, type AuthedRequest } from '../auth/jwt.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }
  const row = getUserRowByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }
  res.json({ token: signToken(row.id), user: toPublicUser(row) });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});
