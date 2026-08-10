// Store global (Zustand) : authentification, dossiers clients multi-tenant,
// et matrice (rôles, fonctions, autorisations) du dossier ACTIF.
//
// Persistance : localStorage (prototype). En production → backend + auth hachée.
import { create } from 'zustand';
import type { Role, Fonction, PermMap, User, Dossier, AppState, UserType } from '../types';
import { CATALOG } from '../data/catalog';
import { SEED_USERS, SEED_DOSSIER } from '../data/seed';
import { permKey, buildReferenceDefaults, buildDossierSeedData } from '../data/catalogHelpers';

export { permKey };

const LS_KEY = 'wavesoft-app-v4';

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

interface StoreState {
  // Auth & dossiers
  users: User[];
  dossiers: Dossier[];
  currentUserId: string | null;
  activeDossierId: string | null;
  ready: boolean;
  source: 'local' | 'seed' | null;
  persisting: boolean;

  // Matrice du dossier ACTIF (miroir de dossiers[activeDossierId].data)
  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;

  // Cycle de vie
  init: () => void;

  // Auth
  currentUser: () => User | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;

  // Dossiers
  myDossiers: () => Dossier[];
  setActiveDossier: (id: string) => void;
  createDossier: (nom: string, client: string) => string;
  updateDossier: (id: string, patch: { nom?: string; client?: string }) => void;
  removeDossier: (id: string) => void;

  // Utilisateurs (admin)
  upsertUser: (user: User) => void;
  removeUser: (id: string) => void;

  // Autorisations (dossier actif)
  toggle: (fonctionId: string, objet: string, intitule: string, fonction: string) => void;
  resetReferenceDefaults: () => void;
  clearAll: () => void;
  countFor: (fonctionId: string) => number;
  setAllForFonction: (fonctionId: string, value: boolean) => void;
  copyFonctionPerms: (fromId: string, toId: string) => void;

  // CRUD rôles / fonctions (dossier actif)
  upsertRole: (role: Role) => void;
  removeRole: (roleId: string) => void;
  upsertFonction: (f: Fonction) => void;
  removeFonction: (fonctionId: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useMatrixStore = create<StoreState>((set, get) => {
  /** Sauvegarde l'état applicatif complet (débattue). */
  function persistApp() {
    const { users, dossiers, currentUserId, activeDossierId } = get();
    const app: AppState = { users, dossiers, currentUserId, activeDossierId };
    if (saveTimer) clearTimeout(saveTimer);
    set({ persisting: true });
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(app));
      } catch {
        /* ignore */
      }
      set({ persisting: false });
    }, 250);
  }

  /** Écrit la matrice active (flat) dans le dossier actif, puis persiste. */
  function commit() {
    set((state) => {
      if (!state.activeDossierId) return {};
      const dossiers = state.dossiers.map((d) =>
        d.id === state.activeDossierId
          ? { ...d, data: { roles: state.roles, fonctions: state.fonctions, perms: state.perms } }
          : d,
      );
      return { dossiers };
    });
    persistApp();
  }

  /** Charge la matrice d'un dossier dans les champs plats (ou vide). */
  function flatFromDossier(dossiers: Dossier[], id: string | null) {
    const d = id ? dossiers.find((x) => x.id === id) : null;
    return d ? { roles: d.data.roles, fonctions: d.data.fonctions, perms: d.data.perms } : { roles: [], fonctions: [], perms: {} };
  }

  return {
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

    init() {
      const stored = loadApp();
      const app = stored ?? seedApp();
      const user = app.users.find((u) => u.id === app.currentUserId) ?? null;
      const acc = accessibleDossiers(user, app.dossiers);
      const activeId = app.activeDossierId && acc.some((d) => d.id === app.activeDossierId) ? app.activeDossierId : acc[0]?.id ?? null;
      set({
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

    login(email, password) {
      const { users, dossiers } = get();
      const user = users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) return { ok: false, error: 'Identifiants incorrects.' };
      const acc = accessibleDossiers(user, dossiers);
      const activeId = acc[0]?.id ?? null;
      set({ currentUserId: user.id, activeDossierId: activeId, ...flatFromDossier(dossiers, activeId) });
      persistApp();
      return { ok: true };
    },

    logout() {
      set({ currentUserId: null, activeDossierId: null, roles: [], fonctions: [], perms: {} });
      persistApp();
    },

    myDossiers() {
      return accessibleDossiers(get().currentUser(), get().dossiers);
    },

    setActiveDossier(id) {
      const { dossiers } = get();
      const acc = accessibleDossiers(get().currentUser(), dossiers);
      if (!acc.some((d) => d.id === id)) return;
      set({ activeDossierId: id, ...flatFromDossier(dossiers, id) });
      persistApp();
    },

    createDossier(nom, client) {
      const id = uid('dossier');
      const dossier: Dossier = { id, nom, client, data: buildDossierSeedData(true) };
      set((state) => ({ dossiers: [...state.dossiers, dossier] }));
      persistApp();
      return id;
    },

    updateDossier(id, patch) {
      set((state) => ({
        dossiers: state.dossiers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }));
      persistApp();
    },

    removeDossier(id) {
      set((state) => {
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
      });
      persistApp();
    },

    upsertUser(user) {
      set((state) => {
        const i = state.users.findIndex((u) => u.id === user.id);
        const users = i === -1 ? [...state.users, user] : state.users.map((u) => (u.id === user.id ? user : u));
        return { users };
      });
      persistApp();
    },

    removeUser(id) {
      set((state) => {
        const users = state.users.filter((u) => u.id !== id);
        // suppression de soi → déconnexion
        if (state.currentUserId === id) return { users, currentUserId: null, activeDossierId: null, roles: [], fonctions: [], perms: {} };
        return { users };
      });
      persistApp();
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
