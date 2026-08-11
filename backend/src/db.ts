// Accès base de données (SQLite via better-sqlite3) + schéma + seed initial.
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { SEED_USERS, SEED_DOSSIER, buildDossierSeedData } from './data/seed.js';
import type { DossierData, DossierMeta, PublicUser, UserType } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH ?? path.join(DATA_DIR, 'wavesoft.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    type TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dossiers (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    client TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_dossiers (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, dossier_id)
  );
`);

interface UserRow {
  id: string;
  nom: string;
  email: string;
  password_hash: string;
  type: UserType;
}

const SALT_ROUNDS = 10;

// --- Seed initial (première exécution) ---
function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  if (count > 0) return;
  const insDossier = db.prepare('INSERT INTO dossiers (id, nom, client, data) VALUES (?, ?, ?, ?)');
  insDossier.run(SEED_DOSSIER.id, SEED_DOSSIER.nom, SEED_DOSSIER.client, JSON.stringify(buildDossierSeedData(true)));
  const insUser = db.prepare('INSERT INTO users (id, nom, email, password_hash, type) VALUES (?, ?, ?, ?, ?)');
  const insLink = db.prepare('INSERT INTO user_dossiers (user_id, dossier_id) VALUES (?, ?)');
  for (const u of SEED_USERS) {
    insUser.run(u.id, u.nom, u.email, bcrypt.hashSync(u.password, SALT_ROUNDS), u.type);
    for (const d of u.dossierIds) insLink.run(u.id, d);
  }
}
seedIfEmpty();

// --- Utilisateurs ---
export function getUserRowByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email) as UserRow | undefined;
}
export function getUserRowById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}
export function userDossierIds(userId: string): string[] {
  return (db.prepare('SELECT dossier_id FROM user_dossiers WHERE user_id = ?').all(userId) as { dossier_id: string }[]).map(
    (r) => r.dossier_id,
  );
}
export function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, nom: row.nom, email: row.email, type: row.type, dossierIds: userDossierIds(row.id) };
}
export function listUsers(): PublicUser[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY nom').all() as UserRow[];
  return rows.map(toPublicUser);
}
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

const setLinks = db.transaction((userId: string, dossierIds: string[]) => {
  db.prepare('DELETE FROM user_dossiers WHERE user_id = ?').run(userId);
  const ins = db.prepare('INSERT OR IGNORE INTO user_dossiers (user_id, dossier_id) VALUES (?, ?)');
  for (const d of dossierIds) ins.run(userId, d);
});

export function createUser(u: { id: string; nom: string; email: string; password: string; type: UserType; dossierIds: string[] }): PublicUser {
  db.prepare('INSERT INTO users (id, nom, email, password_hash, type) VALUES (?, ?, ?, ?, ?)').run(
    u.id,
    u.nom,
    u.email,
    bcrypt.hashSync(u.password, SALT_ROUNDS),
    u.type,
  );
  setLinks(u.id, u.type === 'admin' ? [] : u.dossierIds);
  return toPublicUser(getUserRowById(u.id)!);
}

export function updateUser(id: string, u: { nom: string; email: string; password?: string; type: UserType; dossierIds: string[] }): PublicUser {
  if (u.password && u.password.length > 0) {
    db.prepare('UPDATE users SET nom = ?, email = ?, type = ?, password_hash = ? WHERE id = ?').run(
      u.nom,
      u.email,
      u.type,
      bcrypt.hashSync(u.password, SALT_ROUNDS),
      id,
    );
  } else {
    db.prepare('UPDATE users SET nom = ?, email = ?, type = ? WHERE id = ?').run(u.nom, u.email, u.type, id);
  }
  setLinks(id, u.type === 'admin' ? [] : u.dossierIds);
  return toPublicUser(getUserRowById(id)!);
}

export function deleteUser(id: string) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

// --- Dossiers ---
export function listDossiers(): DossierMeta[] {
  return db.prepare('SELECT id, nom, client FROM dossiers ORDER BY nom').all() as DossierMeta[];
}
export function getDossierMeta(id: string): DossierMeta | undefined {
  return db.prepare('SELECT id, nom, client FROM dossiers WHERE id = ?').get(id) as DossierMeta | undefined;
}
export function getDossierData(id: string): DossierData | undefined {
  const row = db.prepare('SELECT data FROM dossiers WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as DossierData) : undefined;
}
export function setDossierData(id: string, data: DossierData) {
  db.prepare('UPDATE dossiers SET data = ? WHERE id = ?').run(JSON.stringify(data), id);
}
export function createDossier(d: { id: string; nom: string; client: string }): DossierMeta {
  db.prepare('INSERT INTO dossiers (id, nom, client, data) VALUES (?, ?, ?, ?)').run(
    d.id,
    d.nom,
    d.client,
    JSON.stringify(buildDossierSeedData(true)),
  );
  return { id: d.id, nom: d.nom, client: d.client };
}
export function updateDossierMeta(id: string, patch: { nom?: string; client?: string }) {
  const cur = getDossierMeta(id);
  if (!cur) return;
  db.prepare('UPDATE dossiers SET nom = ?, client = ? WHERE id = ?').run(patch.nom ?? cur.nom, patch.client ?? cur.client, id);
}
export function deleteDossier(id: string) {
  db.prepare('DELETE FROM dossiers WHERE id = ?').run(id);
}

/** Un utilisateur peut-il accéder à ce dossier ? */
export function canAccessDossier(userId: string, userType: UserType, dossierId: string): boolean {
  if (userType === 'admin') return !!getDossierMeta(dossierId);
  return userDossierIds(userId).includes(dossierId);
}

/** Dossiers accessibles à l'utilisateur (admin = tous). */
export function accessibleDossiers(userId: string, userType: UserType): DossierMeta[] {
  if (userType === 'admin') return listDossiers();
  const ids = new Set(userDossierIds(userId));
  return listDossiers().filter((d) => ids.has(d.id));
}
