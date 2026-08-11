// Store global (Zustand) : authentification, dossiers clients multi-tenant,
// et matrice du dossier ACTIF.
//
// Deux modes, auto-détectés au démarrage :
//  - 'api'   : backend disponible (auth JWT + base partagée). Source de vérité.
//  - 'local' : hors-ligne (localStorage + seed) — utilisé pour la démo autonome.
import { create } from 'zustand';
import type { Role, Fonction, PermMap, User, Dossier, AppState, UserType, DossierData, PublicUser } from '../types';
import { CATALOG } from '../data/catalog';
import { SEED_USERS, SEED_DOSSIER } from '../data/seed';
import { permKey, buildReferenceDefaults, buildDossierSeedData } from '../data/catalogHelpers';
import { apiClient, setAuthToken } from './apiClient';

export { permKey };

const LS_KEY = 'wavesoft-app-v4';
const TOKEN_KEY = 'wavesoft-token';
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

function loadApp(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* ignore */
  }
  return null;
}
function seedApp(): AppState {
  return {
    users: structuredClone(SEED_USERS),
    dossiers: [{ ...SEED_DOSSIER, data: buildDossierSeedData(true) }],
    currentUserId: null,
    activeDossierId: null,
  };
}

/** Dossiers accessibles à un utilisateur (admin = tous). */
export function accessibleDossiers(user: User | null, dossiers: Dossier[]): Dossier[] {
  if (!user) return [];
  if (user.type === 'admin') return dossiers;
  return dossiers.filter((d) => user.dossierIds.includes(d.id));
}

/** Convertit un utilisateur API en User interne (sans mot de passe). */
function toUser(p: PublicUser): User {
  return { ...p, password: '' };
}
const emptyData: DossierData = { roles: [], fonctions: [], perms: {} };

interface StoreState {
  mode: 'api' | 'local' | null;
  users: User[];
  dossiers: Dossier[];
  currentUserId: string | null;
  activeDossierId: string | null;
  ready: boolean;
  source: 'api' | 'local' | 'seed' | null;
  persisting: boolean;

  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;

  init: () => Promise<void>;

  currentUser: () => User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;

  myDossiers: () => Dossier[];
  setActiveDossier: (id: string) => void;
  createDossier: (nom: string, client: string) => string;
  updateDossier: (id: string, patch: { nom?: string; client?: string }) => void;
  removeDossier: (id: string) => void;

  upsertUser: (user: User) => void;
  removeUser: (id: string) => void;

  toggle: (fonctionId: string, objet: string, intitule: string, fonction: string) => void;
  resetReferenceDefaults: () => void;
  clearAll: () => void;
  countFor: (fonctionId: string) => number;
  setAllForFonction: (fonctionId: string, value: boolean) => void;
  copyFonctionPerms: (fromId: string, toId: string) => void;

  upsertRole: (role: Role) => void;
  removeRole: (roleId: string) => void;
  upsertFonction: (f: Fonction) => void;
  removeFonction: (fonctionId: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useMatrixStore = create<StoreState>((set, get) => {
  function persistLocalApp() {
    const { users, dossiers, currentUserId, activeDossierId } = get();
    const app: AppState = { users, dossiers, currentUserId, activeDossierId };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(app));
    } catch {
      /* ignore */
    }
  }

  /** Écrit la matrice active (flat) dans le dossier actif en mémoire. */
  function syncFlatIntoActive() {
    set((state) => {
      if (!state.activeDossierId) return {};
      const dossiers = state.dossiers.map((d) =>
        d.id === state.activeDossierId ? { ...d, data: { roles: state.roles, fonctions: state.fonctions, perms: state.perms } } : d,
      );
      return { dossiers };
    });
  }

  /** Persiste après une mutation de matrice, selon le mode. */
  function commit() {
    syncFlatIntoActive();
    if (get().mode === 'local') {
      persistLocalApp();
      return;
    }
    // API : PUT débattu de la matrice du dossier actif
    if (saveTimer) clearTimeout(saveTimer);
    set({ persisting: true });
    saveTimer = setTimeout(async () => {
      const { activeDossierId, roles, fonctions, perms } = get();
      if (!activeDossierId) return set({ persisting: false });
      try {
        await apiClient.putDossierData(activeDossierId, { roles, fonctions, perms });
      } catch {
        /* réseau : conservé en mémoire, réessayé au prochain commit */
      } finally {
        set({ persisting: false });
      }
    }, 400);
  }

  function flatFromDossier(dossiers: Dossier[], id: string | null) {
    const d = id ? dossiers.find((x) => x.id === id) : null;
    return d ? { roles: d.data.roles, fonctions: d.data.fonctions, perms: d.data.perms } : { ...emptyData };
  }

  /** API : charge la matrice d'un dossier (si absente) et l'installe comme active. */
  async function activateApiDossier(id: string | null) {
    if (!id) {
      set({ activeDossierId: null, ...emptyData });
      return;
    }
    let data = get().dossiers.find((d) => d.id === id)?.data;
    const isLoaded = data && (data.roles.length > 0 || data.fonctions.length > 0 || Object.keys(data.perms).length > 0);
    if (!isLoaded) {
      try {
        const r = await apiClient.getDossierData(id);
        data = r.data;
        set((s) => ({ dossiers: s.dossiers.map((d) => (d.id === id ? { ...d, data: r.data } : d)) }));
      } catch {
        data = { ...emptyData };
      }
    }
    set({ activeDossierId: id, roles: data!.roles, fonctions: data!.fonctions, perms: data!.perms });
  }

  /** API : (re)charge la liste des dossiers accessibles + éventuellement les utilisateurs. */
  async function loadApiWorkspace(user: User) {
    const { dossiers } = await apiClient.listDossiers();
    const dossierObjs: Dossier[] = dossiers.map((m) => ({ ...m, data: { ...emptyData } }));
    let users: User[] = [user];
    if (user.type === 'admin') {
      try {
        const r = await apiClient.listUsers();
        users = r.users.map(toUser);
      } catch {
        /* ignore */
      }
    }
    set({ users, dossiers: dossierObjs, currentUserId: user.id });
    const firstId = dossierObjs[0]?.id ?? null;
    await activateApiDossier(firstId);
  }

  return {
    mode: null,
    users: [],
    dossiers: [],
    currentUserId: null,
    activeDossierId: null,
    ready: false,
    source: null,
    persisting: false,
    roles: [],
    fonctions: [],
    perms: {},

    async init() {
      const online = await apiClient.health();
      if (online) {
        const token = (() => {
          try {
            return localStorage.getItem(TOKEN_KEY);
          } catch {
            return null;
          }
        })();
        setAuthToken(token);
        if (token) {
          try {
            const { user } = await apiClient.me();
            await loadApiWorkspace(toUser(user));
            set({ mode: 'api', source: 'api', ready: true });
            return;
          } catch {
            setAuthToken(null);
            try {
              localStorage.removeItem(TOKEN_KEY);
            } catch {
              /* ignore */
            }
          }
        }
        set({ mode: 'api', source: 'api', ready: true, currentUserId: null, users: [], dossiers: [] });
        return;
      }

      // Mode local (hors-ligne)
      const stored = loadApp();
      const app = stored ?? seedApp();
      const user = app.users.find((u) => u.id === app.currentUserId) ?? null;
      const acc = accessibleDossiers(user, app.dossiers);
      const activeId = app.activeDossierId && acc.some((d) => d.id === app.activeDossierId) ? app.activeDossierId : acc[0]?.id ?? null;
      set({
        mode: 'local',
        users: app.users,
        dossiers: app.dossiers,
        currentUserId: user ? user.id : null,
        activeDossierId: user ? activeId : null,
        ready: true,
        source: stored ? 'local' : 'seed',
        ...flatFromDossier(app.dossiers, user ? activeId : null),
      });
    },

    currentUser() {
      const { users, currentUserId } = get();
      return users.find((u) => u.id === currentUserId) ?? null;
    },

    async login(email, password) {
      if (get().mode === 'api') {
        try {
          const { token, user } = await apiClient.login(email, password);
          setAuthToken(token);
          try {
            localStorage.setItem(TOKEN_KEY, token);
          } catch {
            /* ignore */
          }
          await loadApiWorkspace(toUser(user));
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'Échec de la connexion.' };
        }
      }
      // local
      const { users, dossiers } = get();
      const user = users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) return { ok: false, error: 'Identifiants incorrects.' };
      const acc = accessibleDossiers(user, dossiers);
      const activeId = acc[0]?.id ?? null;
      set({ currentUserId: user.id, activeDossierId: activeId, ...flatFromDossier(dossiers, activeId) });
      persistLocalApp();
      return { ok: true };
    },

    logout() {
      if (get().mode === 'api') {
        setAuthToken(null);
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch {
          /* ignore */
        }
        set({ currentUserId: null, activeDossierId: null, users: [], dossiers: [], roles: [], fonctions: [], perms: {} });
        return;
      }
      set({ currentUserId: null, activeDossierId: null, roles: [], fonctions: [], perms: {} });
      persistLocalApp();
    },

    myDossiers() {
      return accessibleDossiers(get().currentUser(), get().dossiers);
    },

    setActiveDossier(id) {
      const acc = accessibleDossiers(get().currentUser(), get().dossiers);
      if (!acc.some((d) => d.id === id)) return;
      if (get().mode === 'api') {
        void activateApiDossier(id);
        return;
      }
      set({ activeDossierId: id, ...flatFromDossier(get().dossiers, id) });
      persistLocalApp();
    },

    createDossier(nom, client) {
      if (get().mode === 'api') {
        apiClient
          .createDossier(nom, client)
          .then((r) => set((s) => ({ dossiers: [...s.dossiers, { ...r.dossier, data: buildDossierSeedData(true) }] })))
          .catch(() => void 0);
        return '';
      }
      const id = uid('dossier');
      set((state) => ({ dossiers: [...state.dossiers, { id, nom, client, data: buildDossierSeedData(true) }] }));
      persistLocalApp();
      return id;
    },

    updateDossier(id, patch) {
      set((state) => ({ dossiers: state.dossiers.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
      if (get().mode === 'api') apiClient.updateDossier(id, patch).catch(() => void 0);
      else persistLocalApp();
    },

    removeDossier(id) {
      const apply = (state: StoreState) => {
        const dossiers = state.dossiers.filter((d) => d.id !== id);
        const users = state.users.map((u) => ({ ...u, dossierIds: u.dossierIds.filter((x) => x !== id) }));
        let activeDossierId = state.activeDossierId;
        let flat = {};
        if (state.activeDossierId === id) {
          const acc = accessibleDossiers(users.find((u) => u.id === state.currentUserId) ?? null, dossiers);
          activeDossierId = acc[0]?.id ?? null;
          flat = flatFromDossier(dossiers, activeDossierId);
        }
        return { dossiers, users, activeDossierId, ...flat };
      };
      if (get().mode === 'api') {
        apiClient.deleteDossier(id).then(() => set(apply)).catch(() => void 0);
        return;
      }
      set(apply);
      persistLocalApp();
    },

    upsertUser(user) {
      const exists = get().users.some((u) => u.id === user.id);
      if (get().mode === 'api') {
        const payload = { nom: user.nom, email: user.email, password: user.password || undefined, type: user.type, dossierIds: user.dossierIds };
        const p = exists ? apiClient.updateUser(user.id, payload) : apiClient.createUser(payload);
        p.then((r) => {
          const saved = toUser(r.user);
          set((s) => ({ users: s.users.some((u) => u.id === saved.id) ? s.users.map((u) => (u.id === saved.id ? saved : u)) : [...s.users, saved] }));
        }).catch(() => void 0);
        return;
      }
      set((state) => {
        const i = state.users.findIndex((u) => u.id === user.id);
        const users = i === -1 ? [...state.users, user] : state.users.map((u) => (u.id === user.id ? user : u));
        return { users };
      });
      persistLocalApp();
    },

    removeUser(id) {
      if (get().mode === 'api') {
        apiClient.deleteUser(id).then(() => set((s) => ({ users: s.users.filter((u) => u.id !== id) }))).catch(() => void 0);
        return;
      }
      set((state) => {
        const users = state.users.filter((u) => u.id !== id);
        if (state.currentUserId === id) return { users, currentUserId: null, activeDossierId: null, roles: [], fonctions: [], perms: {} };
        return { users };
      });
      persistLocalApp();
    },

    // --- Autorisations (dossier actif) ---
    toggle(fonctionId, objet, intitule, fonction) {
      const k = permKey(fonctionId, objet, intitule, fonction);
      set((state) => {
        const perms = { ...state.perms };
        if (perms[k]) delete perms[k];
        else perms[k] = true;
        return { perms };
      });
      commit();
    },

    resetReferenceDefaults() {
      set({ perms: buildReferenceDefaults() });
      commit();
    },

    clearAll() {
      set({ perms: {} });
      commit();
    },

    countFor(fonctionId) {
      const { perms } = get();
      const prefix = fonctionId + '|';
      let n = 0;
      for (const k in perms) if (perms[k] && k.startsWith(prefix)) n++;
      return n;
    },

    setAllForFonction(fonctionId, value) {
      set((state) => {
        const prefix = fonctionId + '|';
        const perms: PermMap = {};
        for (const k in state.perms) if (state.perms[k] && !k.startsWith(prefix)) perms[k] = true;
        if (value) for (const [o, i, f] of CATALOG) perms[permKey(fonctionId, o, i, f)] = true;
        return { perms };
      });
      commit();
    },

    copyFonctionPerms(fromId, toId) {
      if (fromId === toId) return;
      set((state) => {
        const toPrefix = toId + '|';
        const perms: PermMap = {};
        for (const k in state.perms) if (state.perms[k] && !k.startsWith(toPrefix)) perms[k] = true;
        for (const [o, i, f] of CATALOG) if (state.perms[permKey(fromId, o, i, f)]) perms[permKey(toId, o, i, f)] = true;
        return { perms };
      });
      commit();
    },

    // --- CRUD rôles / fonctions (dossier actif) ---
    upsertRole(role) {
      set((state) => {
        const i = state.roles.findIndex((r) => r.id === role.id);
        const roles = i === -1 ? [...state.roles, role] : state.roles.map((r) => (r.id === role.id ? role : r));
        roles.sort((a, b) => a.ordre - b.ordre);
        return { roles };
      });
      commit();
    },

    removeRole(roleId) {
      set((state) => ({
        roles: state.roles.filter((r) => r.id !== roleId),
        fonctions: state.fonctions.filter((f) => f.roleId !== roleId),
      }));
      commit();
    },

    upsertFonction(f) {
      set((state) => {
        const i = state.fonctions.findIndex((x) => x.id === f.id);
        const fonctions = i === -1 ? [...state.fonctions, f] : state.fonctions.map((x) => (x.id === f.id ? f : x));
        return { fonctions };
      });
      commit();
    },

    removeFonction(fonctionId) {
      set((state) => {
        const prefix = fonctionId + '|';
        const perms: PermMap = {};
        for (const k in state.perms) if (state.perms[k] && !k.startsWith(prefix)) perms[k] = state.perms[k];
        const removed = state.fonctions.find((f) => f.id === fonctionId);
        const newParent = removed?.parentId ?? null;
        const fonctions = state.fonctions
          .filter((f) => f.id !== fonctionId)
          .map((f) => (f.parentId === fonctionId ? { ...f, parentId: newParent } : f));
        return { fonctions, perms };
      });
      commit();
    },
  };
});

export const USER_TYPE_LABEL: Record<UserType, string> = {
  admin: 'Admin Wavesoft',
  consultant: 'Consultant Wavesoft',
  client: 'Client final',
};
