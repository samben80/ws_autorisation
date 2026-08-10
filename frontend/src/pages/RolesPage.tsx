import { useState } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import { Button } from '../components/ui/Shell';
import { NoDossier } from '../components/ui/NoDossier';
import { theme } from '../styles/theme';
import type { Fonction, NiveauCode, Role } from '../types';

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export function RolesPage() {
  const { roles, fonctions, upsertRole, removeRole, upsertFonction, removeFonction, countFor } = useMatrixStore();
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editFonction, setEditFonction] = useState<Fonction | null>(null);

  const activeDossierId = useMatrixStore((s) => s.activeDossierId);
  const ordered = [...roles].sort((a, b) => a.ordre - b.ordre);
  const nameById = new Map(fonctions.map((f) => [f.id, f.libelle]));

  if (!activeDossierId) return <NoDossier />;

  return (
    <div style={{ padding: '36px 34px 60px', fontFamily: theme.font, color: theme.color.ink }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.color.muted, fontWeight: 600 }}>
          Administration
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.025em', margin: '8px 0 6px' }}>Rôles &amp; fonctions</h1>
        <p style={{ fontSize: 14, color: theme.color.muted, margin: '0 0 24px', maxWidth: 760 }}>
          Chaque <strong>rôle</strong> est un niveau hiérarchique ; chaque <strong>fonction</strong> (poste) lui est
          rattachée et devient une colonne de la matrice.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          <Button variant="primary" onClick={() => setEditRole({ id: uid('role'), code: 'ope', libelle: '', ordre: ordered.length })}>
            + Nouveau rôle
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              setEditFonction({ id: uid('f'), roleId: ordered[0]?.id ?? '', code: '', libelle: '', personnes: [] })
            }
          >
            + Nouvelle fonction
          </Button>
        </div>

        {ordered.map((role) => {
          const fs = fonctions.filter((f) => f.roleId === role.id);
          return (
            <div key={role.id} style={{ background: '#fff', border: `1px solid ${theme.color.border}`, borderRadius: 14, boxShadow: theme.shadow.sub, marginBottom: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${theme.color.sep}` }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: levelColor(role.code), display: 'inline-block' }} />
                <div style={{ fontWeight: 700, fontSize: 15 }}>{role.libelle || <em style={{ color: theme.color.muted2 }}>(sans nom)</em>}</div>
                <span style={{ fontSize: 12, color: theme.color.muted2 }}>
                  {role.code} · {fs.length} fonction{fs.length > 1 ? 's' : ''}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <Button onClick={() => setEditRole(role)}>Éditer</Button>
                  <Button variant="danger" onClick={() => confirm(`Supprimer le rôle « ${role.libelle} » et ses fonctions ?`) && removeRole(role.id)}>
                    Supprimer
                  </Button>
                </div>
              </div>
              <div>
                {fs.length === 0 && <div style={{ padding: '14px 18px', color: theme.color.muted2, fontSize: 13 }}>Aucune fonction.</div>}
                {fs.map((f) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: `1px solid ${theme.color.sep}` }}>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{f.libelle}</div>
                      <div style={{ fontSize: 11.5, color: theme.color.muted2 }}>
                        {f.parentId && nameById.has(f.parentId) ? `↳ ${nameById.get(f.parentId)}` : '↳ sommet'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: theme.color.muted, flex: 1 }}>{f.personnes.join(' · ')}</div>
                    <span style={{ fontSize: 11.5, color: theme.color.muted2, background: theme.color.canvas, borderRadius: 999, padding: '2px 9px' }}>
                      {countFor(f.id)} autor.
                    </span>
                    <Button onClick={() => setEditFonction(f)}>Éditer</Button>
                    <Button variant="danger" onClick={() => confirm(`Supprimer la fonction « ${f.libelle} » ?`) && removeFonction(f.id)}>
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editRole && <RoleModal role={editRole} onClose={() => setEditRole(null)} onSave={(r) => { upsertRole(r); setEditRole(null); }} />}
      {editFonction && (
        <FonctionModal
          fonction={editFonction}
          roles={ordered}
          fonctions={fonctions}
          onClose={() => setEditFonction(null)}
          onSave={(f) => {
            upsertFonction(f);
            setEditFonction(null);
          }}
        />
      )}
    </div>
  );
}

function levelColor(code: string) {
  if (code === 'dir') return theme.color.dir;
  if (code === 'enc') return theme.color.enc;
  return theme.color.ope;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,30,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: theme.shadow.card, width: 480, maxWidth: '100%', padding: 24 }}>{children}</div>
    </div>
  );
}

const field: React.CSSProperties = {
  width: '100%',
  fontSize: 13,
  color: theme.color.ink,
  background: '#fff',
  border: '1px solid #ded9d0',
  borderRadius: 8,
  padding: '9px 12px',
  marginTop: 4,
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: theme.color.muted, display: 'block', marginTop: 14 };

function RoleModal({ role, onClose, onSave }: { role: Role; onClose: () => void; onSave: (r: Role) => void }) {
  const [libelle, setLibelle] = useState(role.libelle);
  const [code, setCode] = useState<string>(role.code);
  const [ordre, setOrdre] = useState(role.ordre);
  return (
    <Overlay>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Rôle</h2>
      <label style={label}>Libellé</label>
      <input style={field} value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Encadrement…" />
      <label style={label}>Code (niveau)</label>
      <select style={field} value={code} onChange={(e) => setCode(e.target.value)}>
        <option value="dir">dir — Direction</option>
        <option value="enc">enc — Encadrement</option>
        <option value="ope">ope — Opérationnels</option>
      </select>
      <label style={label}>Ordre</label>
      <input style={field} type="number" value={ordre} onChange={(e) => setOrdre(Number(e.target.value))} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={() => onSave({ ...role, libelle, code: code as NiveauCode, ordre })}>
          Enregistrer
        </Button>
      </div>
    </Overlay>
  );
}

/** Descendants d'une fonction (pour interdire les cycles de rattachement). */
function descendantsOf(all: Fonction[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (pid: string) => {
    for (const f of all) {
      if (f.parentId === pid && !out.has(f.id)) {
        out.add(f.id);
        walk(f.id);
      }
    }
  };
  walk(id);
  return out;
}

function FonctionModal({
  fonction,
  roles,
  fonctions,
  onClose,
  onSave,
}: {
  fonction: Fonction;
  roles: Role[];
  fonctions: Fonction[];
  onClose: () => void;
  onSave: (f: Fonction) => void;
}) {
  const [libelle, setLibelle] = useState(fonction.libelle);
  const [roleId, setRoleId] = useState(fonction.roleId);
  const [code, setCode] = useState(fonction.code);
  const [personnes, setPersonnes] = useState(fonction.personnes.join(', '));
  const [parentId, setParentId] = useState<string>(fonction.parentId ?? '');

  // Parents possibles : toutes les autres fonctions, hors soi-même et ses descendants.
  const forbidden = descendantsOf(fonctions, fonction.id);
  const parentOptions = fonctions.filter((f) => f.id !== fonction.id && !forbidden.has(f.id));
  return (
    <Overlay>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Fonction</h2>
      <label style={label}>Libellé (poste)</label>
      <input style={field} value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Responsable commerciale…" />
      <label style={label}>Rôle</label>
      <select style={field} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.libelle}
          </option>
        ))}
      </select>
      <label style={label}>Rattaché à (responsable hiérarchique)</label>
      <select style={field} value={parentId} onChange={(e) => setParentId(e.target.value)}>
        <option value="">— Aucun (sommet de l'organigramme)</option>
        {parentOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.libelle}
          </option>
        ))}
      </select>
      <label style={label}>Code</label>
      <input style={field} value={code} onChange={(e) => setCode(e.target.value)} placeholder="auto d'après le libellé" />
      <label style={label}>Personnes (séparées par des virgules)</label>
      <input style={field} value={personnes} onChange={(e) => setPersonnes(e.target.value)} placeholder="Nom 1, Nom 2…" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="primary"
          onClick={() =>
            onSave({
              ...fonction,
              libelle,
              roleId,
              parentId: parentId || null,
              code: (code || slug(libelle) || fonction.id).toUpperCase(),
              personnes: personnes
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        >
          Enregistrer
        </Button>
      </div>
    </Overlay>
  );
}
