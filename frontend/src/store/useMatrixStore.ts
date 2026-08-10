// Store global (Zustand) : rôles, fonctions, autorisations.
// Persistance : API backend si disponible, sinon repli localStorage + seed.
import { create } from 'zustand';
import type { Role, Fonction, PermMap } from '../types';
import { CATALOG } from '../data/catalog';
import { SEED_ROLES, SEED_FONCTIONS, SEED_REFERENCE_FONCTION_ID } from '../data/seed';
import { api, type StateSnapshot } from './api';

const LS_KEY = 'wavesoft-matrix-v3';

export function permKey(fonctionId: string, objet: string, intitule: string, fonction: string): string {
  return `${fonctionId}|${objet}|${intitule}|${fonction}`;
}

/** Autorisations par défaut : recopie le drapeau `ref` du catalogue sur la fonction de référence. */
function buildReferenceDefaults(): PermMap {
  const perms: PermMap = {};
  for (const [objet, intitule, fonction, ref] of CATALOG) {
    if (ref) perms[permKey(SEED_REFERENCE_FONCTION_ID, objet, intitule, fonction)] = true;
  }
  return perms;
}

function loadLocal(): StateSnapshot | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as StateSnapshot;
  } catch {
    /* ignore */
  }
  return null;
}

function saveLocal(s: StateSnapshot) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

interface MatrixState {
  roles: Role[];
  fonctions: Fonction[];
  perms: PermMap;
  ready: boolean;
  persisting: boolean;
  source: 'api' | 'local' | 'seed' | null;

  init: () => Promise<void>;

  // Autorisations
  toggle: (fonctionId: string, objet: string, intitule: string, fonction: string) => void;
  resetReferenceDefaults: () => void;
  clearAll: () => void;
  countFor: (fonctionId: string) => number;

  // CRUD Rôles
  upsertRole: (role: Role) => void;
  removeRole: (roleId: string) => void;

  // CRUD Fonctions
  upsertFonction: (f: Fonction) => void;
  removeFonction: (fonctionId: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useMatrixStore = create<MatrixState>((set, get) => {
  function snapshot(): StateSnapshot {
    const { roles, fonctions, perms } = get();
    return { roles, fonctions, perms };
  }

  /** Persistance débattue : localStorage immédiat + API en tâche de fond. */
  function persist() {
    const snap = snapshot();
    saveLocal(snap);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      set({ persisting: true });
      api
        .putState(snap)
        .catch(() => void 0)
        .finally(() => set({ persisting: false }));
    }, 400);
  }

  return {
    roles: [],
    fonctions: [],
    perms: {},
    ready: false,
    persisting: false,
    source: null,

    async init() {
      // 1) API
      try {
        const s = await api.getState();
        if (s && s.roles?.length) {
          set({ roles: s.roles, fonctions: s.fonctions, perms: s.perms ?? {}, ready: true, source: 'api' });
          return;
        }
      } catch {
        /* API indisponible → repli */
      }
      // 2) localStorage
      const local = loadLocal();
      if (local && local.roles?.length) {
        set({ roles: local.roles, fonctions: local.fonctions, perms: local.perms ?? {}, ready: true, source: 'local' });
        return;
      }
      // 3) seed
      set({
        roles: SEED_ROLES,
        fonctions: SEED_FONCTIONS,
        perms: buildReferenceDefaults(),
        ready: true,
        source: 'seed',
      });
    },

    toggle(fonctionId, objet, intitule, fonction) {
      const k = permKey(fonctionId, objet, intitule, fonction);
      set((state) => {
        const perms = { ...state.perms };
        if (perms[k]) delete perms[k];
        else perms[k] = true;
        return { perms };
      });
      persist();
    },

    resetReferenceDefaults() {
      set({ perms: buildReferenceDefaults() });
      persist();
    },

    clearAll() {
      set({ perms: {} });
      persist();
    },

    countFor(fonctionId) {
      const { perms } = get();
      const prefix = fonctionId + '|';
      let n = 0;
      for (const k in perms) if (perms[k] && k.startsWith(prefix)) n++;
      return n;
    },

    upsertRole(role) {
      set((state) => {
        const i = state.roles.findIndex((r) => r.id === role.id);
        const roles = i === -1 ? [...state.roles, role] : state.roles.map((r) => (r.id === role.id ? role : r));
        roles.sort((a, b) => a.ordre - b.ordre);
        return { roles };
      });
      persist();
    },

    removeRole(roleId) {
      set((state) => ({
        roles: state.roles.filter((r) => r.id !== roleId),
        // les fonctions rattachées deviennent orphelines → on les supprime aussi
        fonctions: state.fonctions.filter((f) => f.roleId !== roleId),
      }));
      persist();
    },

    upsertFonction(f) {
      set((state) => {
        const i = state.fonctions.findIndex((x) => x.id === f.id);
        const fonctions = i === -1 ? [...state.fonctions, f] : state.fonctions.map((x) => (x.id === f.id ? f : x));
        return { fonctions };
      });
      persist();
    },

    removeFonction(fonctionId) {
      set((state) => {
        // purge des autorisations de la fonction supprimée
        const prefix = fonctionId + '|';
        const perms: PermMap = {};
        for (const k in state.perms) if (!k.startsWith(prefix)) perms[k] = state.perms[k];
        // reparentage : les enfants remontent au parent du supprimé
        const removed = state.fonctions.find((f) => f.id === fonctionId);
        const newParent = removed?.parentId ?? null;
        const fonctions = state.fonctions
          .filter((f) => f.id !== fonctionId)
          .map((f) => (f.parentId === fonctionId ? { ...f, parentId: newParent } : f));
        return { fonctions, perms };
      });
      persist();
    },
  };
});
