// Client API léger vers le backend Node/TS.
import type { Role, Fonction, PermMap, ProfilExport } from '../types';

const BASE = '/api';

export interface StateSnapshot {
  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getState: () => req<StateSnapshot>('/state'),
  putState: (s: StateSnapshot) => req<{ ok: true }>('/state', { method: 'PUT', body: JSON.stringify(s) }),
  generateSql: (profil: ProfilExport) =>
    req<{ sql: string }>('/sql/generate', { method: 'POST', body: JSON.stringify(profil) }),
};
