// Client HTTP vers le backend. Le jeton est injecté par le store.
import type { DossierData, DossierMeta, PublicUser, ProfilExport } from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

let authToken: string | null = null;
export function setAuthToken(t: string | null) {
  authToken = t;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(BASE + path, { ...init, headers });
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface UserPayload {
  nom: string;
  email: string;
  password?: string;
  type: PublicUser['type'];
  dossierIds: string[];
}

export const apiClient = {
  async health(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(BASE + '/health', { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  },
  login: (email: string, password: string) => req<{ token: string; user: PublicUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => req<{ user: PublicUser }>('/auth/me'),

  listDossiers: () => req<{ dossiers: DossierMeta[] }>('/dossiers'),
  getDossierData: (id: string) => req<{ data: DossierData }>(`/dossiers/${id}/data`),
  putDossierData: (id: string, data: DossierData) => req<{ ok: true }>(`/dossiers/${id}/data`, { method: 'PUT', body: JSON.stringify(data) }),
  createDossier: (nom: string, client: string) => req<{ dossier: DossierMeta }>('/dossiers', { method: 'POST', body: JSON.stringify({ nom, client }) }),
  updateDossier: (id: string, patch: { nom?: string; client?: string }) => req<{ dossier: DossierMeta }>(`/dossiers/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteDossier: (id: string) => req<{ ok: true }>(`/dossiers/${id}`, { method: 'DELETE' }),

  listUsers: () => req<{ users: PublicUser[] }>('/users'),
  createUser: (u: UserPayload) => req<{ user: PublicUser }>('/users', { method: 'POST', body: JSON.stringify(u) }),
  updateUser: (id: string, u: UserPayload) => req<{ user: PublicUser }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
  deleteUser: (id: string) => req<{ ok: true }>(`/users/${id}`, { method: 'DELETE' }),

  generateSql: (profil: ProfilExport) => req<{ sql: string }>('/sql/generate', { method: 'POST', body: JSON.stringify(profil) }),
};
