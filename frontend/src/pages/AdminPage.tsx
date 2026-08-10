import { useState } from 'react';
import { useMatrixStore, USER_TYPE_LABEL } from '../store/useMatrixStore';
import { Button } from '../components/ui/Shell';
import { theme } from '../styles/theme';
import type { Dossier, User, UserType } from '../types';

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function AdminPage() {
  const { dossiers, users, createDossier, updateDossier, removeDossier, upsertUser, removeUser } = useMatrixStore();
  const [editDossier, setEditDossier] = useState<Dossier | null>(null);
  const [newDossier, setNewDossier] = useState<{ nom: string; client: string } | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  return (
    <div style={{ padding: '36px 34px 60px', fontFamily: theme.font, color: theme.color.ink }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.color.muted, fontWeight: 600 }}>Administration</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.025em', margin: '8px 0 24px' }}>Dossiers &amp; utilisateurs</h1>

        {/* DOSSIERS */}
        <section style={{ marginBottom: 34 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Dossiers clients</h2>
            <span style={{ marginLeft: 10, fontSize: 12.5, color: theme.color.muted2 }}>{dossiers.length} dossier(s)</span>
            <div style={{ marginLeft: 'auto' }}>
              <Button variant="primary" onClick={() => setNewDossier({ nom: '', client: '' })}>+ Nouveau dossier</Button>
            </div>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${theme.color.border}`, borderRadius: 14, boxShadow: theme.shadow.sub, overflow: 'hidden' }}>
            {dossiers.length === 0 && <div style={{ padding: '16px 18px', color: theme.color.muted2, fontSize: 13 }}>Aucun dossier.</div>}
            {dossiers.map((d, i) => {
              const nbUsers = users.filter((u) => u.type !== 'admin' && u.dossierIds.includes(d.id)).length;
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderTop: i ? `1px solid ${theme.color.sep}` : undefined }}>
                  <div style={{ fontWeight: 700, fontSize: 14, minWidth: 220 }}>{d.nom || <em style={{ color: theme.color.muted2 }}>(sans nom)</em>}</div>
                  <div style={{ fontSize: 12.5, color: theme.color.muted, flex: 1 }}>Client : {d.client || '—'}</div>
                  <span style={{ fontSize: 11.5, color: theme.color.muted2, background: theme.color.canvas, borderRadius: 999, padding: '2px 9px' }}>{nbUsers} utilisateur(s)</span>
                  <Button onClick={() => setEditDossier(d)}>Renommer</Button>
                  <Button variant="danger" onClick={() => confirm(`Supprimer le dossier « ${d.nom} » et sa matrice ?`) && removeDossier(d.id)}>Supprimer</Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* UTILISATEURS */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Utilisateurs</h2>
            <span style={{ marginLeft: 10, fontSize: 12.5, color: theme.color.muted2 }}>{users.length} compte(s)</span>
            <div style={{ marginLeft: 'auto' }}>
              <Button variant="primary" onClick={() => setEditUser({ id: uid('u'), nom: '', email: '', password: '', type: 'consultant', dossierIds: [] })}>+ Nouvel utilisateur</Button>
            </div>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${theme.color.border}`, borderRadius: 14, boxShadow: theme.shadow.sub, overflow: 'hidden' }}>
            {users.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: i ? `1px solid ${theme.color.sep}` : undefined }}>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.nom || <em style={{ color: theme.color.muted2 }}>(sans nom)</em>}</div>
                  <div style={{ fontSize: 12, color: theme.color.muted }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', background: typeColor(u.type), borderRadius: 999, padding: '3px 10px' }}>{USER_TYPE_LABEL[u.type]}</span>
                <div style={{ fontSize: 12, color: theme.color.muted, flex: 1 }}>
                  {u.type === 'admin' ? 'Tous les dossiers' : u.dossierIds.map((id) => dossiers.find((d) => d.id === id)?.nom).filter(Boolean).join(' · ') || '—'}
                </div>
                <Button onClick={() => setEditUser(u)}>Éditer</Button>
                <Button variant="danger" onClick={() => confirm(`Supprimer l'utilisateur « ${u.nom} » ?`) && removeUser(u.id)}>Supprimer</Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {newDossier && (
        <DossierModal
          title="Nouveau dossier"
          value={newDossier}
          onClose={() => setNewDossier(null)}
          onSave={(v) => {
            createDossier(v.nom, v.client);
            setNewDossier(null);
          }}
        />
      )}
      {editDossier && (
        <DossierModal
          title="Renommer le dossier"
          value={{ nom: editDossier.nom, client: editDossier.client }}
          onClose={() => setEditDossier(null)}
          onSave={(v) => {
            updateDossier(editDossier.id, v);
            setEditDossier(null);
          }}
        />
      )}
      {editUser && (
        <UserModal
          user={editUser}
          dossiers={dossiers}
          onClose={() => setEditUser(null)}
          onSave={(u) => {
            upsertUser(u);
            setEditUser(null);
          }}
        />
      )}
    </div>
  );
}

function typeColor(t: UserType) {
  if (t === 'admin') return theme.color.dir;
  if (t === 'consultant') return theme.color.enc;
  return theme.color.ope;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,30,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: theme.shadow.card, width: 480, maxWidth: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

const field: React.CSSProperties = { width: '100%', fontSize: 13, color: theme.color.ink, background: '#fff', border: '1px solid #ded9d0', borderRadius: 8, padding: '9px 12px', marginTop: 4 };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: theme.color.muted, display: 'block', marginTop: 14 };

function DossierModal({ title, value, onClose, onSave }: { title: string; value: { nom: string; client: string }; onClose: () => void; onSave: (v: { nom: string; client: string }) => void }) {
  const [nom, setNom] = useState(value.nom);
  const [client, setClient] = useState(value.client);
  return (
    <Overlay>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{title}</h2>
      <label style={label}>Nom du dossier</label>
      <input style={field} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="SA TOYMART" />
      <label style={label}>Client</label>
      <input style={field} value={client} onChange={(e) => setClient(e.target.value)} placeholder="Raison sociale du client" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={() => onSave({ nom: nom.trim() || 'Nouveau dossier', client: client.trim() })}>Enregistrer</Button>
      </div>
    </Overlay>
  );
}

function UserModal({ user, dossiers, onClose, onSave }: { user: User; dossiers: Dossier[]; onClose: () => void; onSave: (u: User) => void }) {
  const [nom, setNom] = useState(user.nom);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password);
  const [type, setType] = useState<UserType>(user.type);
  const [dossierIds, setDossierIds] = useState<string[]>(user.dossierIds);

  const toggleDossier = (id: string) =>
    setDossierIds((cur) => {
      if (type === 'client') return cur.includes(id) ? [] : [id]; // client = 1 seul
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });

  return (
    <Overlay>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Utilisateur</h2>
      <label style={label}>Nom</label>
      <input style={field} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Prénom Nom" />
      <label style={label}>Email</label>
      <input style={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ma" />
      <label style={label}>Mot de passe</label>
      <input style={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mot de passe" />
      <label style={label}>Type de compte</label>
      <select style={field} value={type} onChange={(e) => { const t = e.target.value as UserType; setType(t); if (t === 'client') setDossierIds((c) => c.slice(0, 1)); }}>
        <option value="admin">Admin Wavesoft — voit tout, gère dossiers & utilisateurs</option>
        <option value="consultant">Consultant Wavesoft — dossiers autorisés</option>
        <option value="client">Client final — un seul dossier</option>
      </select>

      {type !== 'admin' && (
        <>
          <label style={label}>{type === 'client' ? 'Dossier du client' : 'Dossiers autorisés'}</label>
          <div style={{ marginTop: 6, border: `1px solid ${theme.color.border}`, borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
            {dossiers.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12.5, color: theme.color.muted2 }}>Aucun dossier — créez-en un d'abord.</div>}
            {dossiers.map((d) => (
              <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderTop: `1px solid ${theme.color.sep}` }}>
                <input type={type === 'client' ? 'radio' : 'checkbox'} checked={dossierIds.includes(d.id)} onChange={() => toggleDossier(d.id)} />
                <span style={{ fontWeight: 600 }}>{d.nom}</span>
                <span style={{ color: theme.color.muted2 }}>{d.client}</span>
              </label>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="primary"
          onClick={() => onSave({ ...user, nom: nom.trim(), email: email.trim(), password, type, dossierIds: type === 'admin' ? [] : dossierIds })}
        >
          Enregistrer
        </Button>
      </div>
    </Overlay>
  );
}
