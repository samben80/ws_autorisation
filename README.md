# Handoff : Générateur de rôles & autorisations Wavesoft

## Vue d'ensemble
Application web permettant à un administrateur de :
1. **Définir des rôles** (niveaux hiérarchiques : Direction, Encadrement, Opérationnels).
2. **Définir des fonctions / postes** (Directeur Général, Responsable commerciale, Responsable service achats, etc.) et les rattacher à un rôle.
3. **Attribuer les autorisations** par fonction, sur la base du **catalogue natif Wavesoft** (Objet · Intitulé · Fonction), via une matrice à cocher.
4. **Générer un script SQL** de mise à jour de la base Wavesoft à partir du matching autorisations ↔ fonction.

Les fichiers de ce bundle sont des **références de design en HTML** (prototypes montrant l'apparence et le comportement attendus), **pas du code de production à copier tel quel**. La tâche consiste à **recréer ces designs dans l'environnement cible** (framework à choisir — voir plus bas) et à y ajouter la logique métier (persistance des rôles/fonctions, matching, génération SQL).

## Fidélité
**Haute fidélité (hifi)** — couleurs, typographie, espacements et interactions sont définitifs. Reproduire l'UI fidèlement, puis brancher la logique. Les prototypes sont écrits en HTML/JS « Design Components » (runtime maison `support.js`) : **ne pas** réutiliser ce runtime en production — réimplémenter les vues dans le framework retenu.

## Stack recommandée (aucun code existant à ce jour)
Aucun dépôt n'est connecté. Suggestion :
- **Frontend** : React + TypeScript + Vite (les prototypes sont déjà en React via le runtime DC ; la logique `renderVals` se transpose en composants/hooks).
- **State/persistance** : au choix — Zustand/Context côté front ; API + base (Postgres/SQLite) côté back si multi-utilisateur. Les prototypes persistent aujourd'hui en `localStorage` (à remplacer).
- **Génération SQL** : côté serveur de préférence (Node/TypeScript) pour ne pas exposer la structure de la base ; un module pur `buildSql(profil)` testable unitairement.
- **Cible** : base **Wavesoft** (SQL Server). Voir « Génération SQL » pour le modèle de données.

---

## Écrans / Vues

### 1. Organigramme (référence hiérarchique) — `Organigramme.dc.html`
- **But** : visualiser la structure (source des rôles et fonctions).
- **Layout** : arbre 3 niveaux, connecteurs SVG à angle droit mesurés en JS. DG en tête (carte foncée), 5 responsables (N-1), équipes (N-2).
- **Usage handoff** : sert de référence pour le seed des rôles/fonctions (liste ci-dessous). Pas nécessairement à recréer dans l'app, mais utile en écran « visualisation ».

### 2. Matrice des autorisations — `Matrice Autorisations Wavesoft.dc.html` (écran central)
- **But** : cocher, pour chaque fonction (colonne), les autorisations Wavesoft (lignes).
- **Layout** :
  - Table à en-têtes figés (sticky) : 2 colonnes gauche figées **Intitulé** (180px) + **Fonction** (150px) ; puis 1 colonne étroite (36px) par fonction/poste, regroupées sous un bandeau de niveau.
  - En-têtes de colonnes de postes en **texte vertical** (`writing-mode: vertical-rl; transform: rotate(180deg)`), hauteur ~176px, avec un badge du nombre d'autorisations.
  - Lignes groupées par **Objet** (bandeau pleine largeur sombre), puis Intitulé affiché une fois par groupe.
  - Cellule = case cochable 16px (✓ vert `#3f7d4f` si autorisé, sinon carré bordé).
- **Contrôles** : sélecteur d'Objet (filtre — défaut « ACTION » pour la fluidité ; « Tous les objets » possible mais lourd), recherche texte (intitulé/fonction), boutons « Réinitialiser (profil STOCK) » et « Tout décocher », compteur.
- **Perf** : ~612 fonctions × N postes. En production, **virtualiser** la table (react-window/virtualized) pour permettre « Tous les objets » sans lag, et éviter un re-render global à chaque case (état par cellule / mise à jour ciblée).

### 3. (À concevoir) Gestion des rôles & fonctions
Écran CRUD :
- Créer/éditer/supprimer un **rôle** (niveau).
- Créer/éditer/supprimer une **fonction**, rattachée à un rôle, avec libellé + personnes.
- Chaque fonction devient une colonne de la matrice (§2).

### 4. (À concevoir) Génération & prévisualisation du script SQL
- Bouton « Générer le script SQL » → aperçu du SQL + téléchargement `.sql`.
- Options : par fonction / toutes les fonctions ; INSERT vs UPDATE ; nom du profil cible.

---

## Modèle de données (interne à l'app)

```
Role        { id, code, libelle, ordre }                       // dir, enc, ope
Fonction    { id, roleId, code, libelle, personnes[] }         // poste
Objet       { code }                                            // ex. "PIECE VENTE"
Intitule    { objetCode, libelle }                             // ex. "Devis"
FonctionCat { objetCode, intitule, fonction }                  // ex. ("PIECE VENTE","Devis","Créer")
Autorisation{ fonctionId, objetCode, intitule, fonction, autorise:boolean }
```

Le **catalogue Wavesoft** (Objet/Intitulé/Fonction) est fourni : `wavesoft-catalog.js` — 612 entrées `[objet, intitule, fonction, autoriseDansProfilReference(0|1)]`, extrait de la fiche profil « STOCK » du dossier SA TOYMART. Le drapeau de référence sert d'exemple de pré-remplissage (colonne Gestionnaire de stock).

### Seed rôles / fonctions (issu de l'organigramme)
- **Direction** : Directeur Général (Rachid Hemmouda)
- **Encadrement** : Responsable commerciale (Chaymae Bahraoui) · Responsable service achats (Fatima Ezzehra Ouahrour) · Directrice financière et administrative (Meryam El Gualloussi) · Digital Marketeur (Haytam Bouhdidi) · Responsable service marché (Rajae Said)
- **Opérationnels** : Commerciaux sur terrain · Caissière permanente · Magasinier · Assistantes achats · Gestionnaire de stock · Service Comptabilité · Agentes de facturation · Agente de confirmation · Adjointe Responsable service marché

---

## Génération SQL (Wavesoft — SQL Server)

Objectif : traduire la matrice cochée en écritures dans la base Wavesoft. **⚠ À valider contre le schéma réel Wavesoft du client** (le modèle exact des droits n'est pas public) — voici la structure de travail attendue et le format du générateur ; ajuster noms de tables/colonnes après inspection de la base.

Approche recommandée :
1. Un **profil Wavesoft** par fonction (comme la « Fiche profil » native).
2. Pour chaque fonction → upsert du profil, puis une ligne d'autorisation par triplet (Objet, Intitulé, Fonction) coché.
3. Générer un script **idempotent** (transaction, suppression/rechargement des droits du profil avant réinsertion), paramétré par le nom du dossier.

Pseudo-générateur (module pur, testable) :
```ts
function buildSql(profil: { nom: string; autorisations: Autorisation[] }): string {
  // BEGIN TRAN; upsert profil; DELETE droits WHERE profil = @nom;
  // INSERT (@nom, objet, intitule, fonction) pour chaque autorise=true; COMMIT
}
```
Sortie : fichier `.sql` téléchargeable + aperçu à l'écran. Prévoir échappement des libellés (apostrophes) et encodage UTF-8.

---

## Design tokens (repris tels quels)

**Police** : `'Hanken Grotesk'` (Google Fonts, poids 400/500/600/700/800), fallback `system-ui, -apple-system, sans-serif`.

**Couleurs**
- Fond page : `#f6f4ef` · Cartes/table : `#ffffff` · Bordure : `#e8e4dc` · Séparateurs : `#f0ece3` / `#ece7dd`
- Texte : encre `#2b2a31` · atténué `#6d6a63` / `#8a8780`
- Niveaux : Direction `#2a2a33` · Encadrement `#3f6796` · Opérationnels `#567d49`
- Teintes de colonnes (corps) : dir `#faf9fc` · enc `#f6f9fc` · ope `#f7fbf5`
- Autorisé (case ✓) : `#3f7d4f` (texte blanc) · Case vide : bord `#d3cfc6`
- Bandeau Objet : `#2f2f37` (texte blanc) · En-tête colonnes gauche : `#26262b`
- Accent secondaire (rappel organigramme, par pôle) : `#c2685a` `#6f9e5f` `#5b82b0` `#8a6bb0` `#c39a4e`

**Rayons** : cartes 14px · sous-cartes/table 12–14px · cases 4px · puces/badges pill.
**Ombres** : `0 1px 2px rgba(30,30,45,.05), 0 12px 30px rgba(30,30,45,.06)`.
**Typo table** : corps 12–12,5px ; en-têtes 11–12px ; titres H1 30px/800/-0.025em.

---

## Fichiers de ce bundle
- `Matrice Autorisations Wavesoft.dc.html` — écran matrice (design + interactions de référence).
- `Organigramme.dc.html` — organigramme (référence hiérarchique / seed).
- `wavesoft-catalog.js` — catalogue des 612 fonctions Wavesoft (données réelles extraites du PDF client).
- `support.js` — runtime des prototypes (référence uniquement ; **ne pas** porter en production).
- `AUTORISATIONS MATRICE.pdf` — fiche profil Wavesoft native d'origine (profil STOCK) : source de vérité du format et du catalogue.

## Captures (`screenshots/`)
- `screenshots/matrice.png` — écran matrice des autorisations (format Wavesoft).
- `screenshots/organigramme.png` — organigramme (référence hiérarchique).

## Notes
- Les prototypes persistent en `localStorage` : à remplacer par une vraie persistance.
- La matrice complète (Tous les objets) est dense : **virtualiser** en production.
- Le format SQL doit être **validé sur le schéma Wavesoft réel** avant exécution ; générer d'abord en environnement de test.

---

# Implémentation (application)

Le prototype de handoff ci-dessus a été implémenté en application réelle
(React + TypeScript + Vite côté front, Node/TypeScript + Express côté back).

## Arborescence

```
frontend/                 React + TS + Vite
  src/
    types.ts              Role, Fonction, Autorisation, CatalogEntry…
    data/
      catalog.ts          Catalogue Wavesoft typé (612 entrées, généré)
      seed.ts             Seed rôles/fonctions (issu de l'organigramme)
      catalogHelpers.ts   Options d'objet, filtrage, aplatissement des lignes
    store/
      api.ts              Client API
      useMatrixStore.ts   Store Zustand (perms + CRUD) + persistance
    styles/
      theme.ts            Design tokens du README (couleurs, rayons, ombres)
      global.css
    components/
      Matrix/MatrixTable.tsx   Table virtualisée (react-window), en-têtes figés
      ui/Shell.tsx             Navigation + boutons
    pages/
      MatrixPage.tsx      Écran matrice (toolbar + table + légende)
      RolesPage.tsx       CRUD rôles & fonctions
      OrganigrammePage.tsx     Visualisation hiérarchique
backend/                  Node + TS + Express
  src/
    sql/buildSql.ts       Générateur SQL PUR et testable (idempotent)
    store/fileStore.ts    Persistance JSON (remplaçable par une vraie base)
    index.ts              API : /api/state (GET/PUT), /api/sql/generate (POST)
  test/buildSql.test.ts   Tests unitaires (vitest)
```

## Démarrage

```bash
npm install            # installe frontend + backend (workspaces)

npm run dev:back       # API sur http://localhost:8787
npm run dev:front      # UI sur http://localhost:5173 (proxy /api → 8787)
```

Sans backend, le front bascule automatiquement sur le **seed** puis persiste
en `localStorage` ; avec le backend, l'état est persisté sur fichier
(`backend/data/state.json`).

## Vérifications

```bash
npm run typecheck      # tsc front + back
npm run build          # build de production front + back
npm test               # tests du générateur SQL (vitest)
```

## Correspondance avec le handoff

- **Matrice** : en-têtes figés (sticky), colonnes verticales par poste,
  bandeaux d'objet, cases ✓ — **virtualisée** via `react-window` pour
  supporter « Tous les objets » sans lag. Colonne *Gestionnaire de stock*
  pré-remplie d'après le drapeau de référence du catalogue (profil STOCK).
- **Persistance** : `localStorage` du prototype remplacé par un store Zustand
  + API (repli `localStorage`).
- **CRUD rôles & fonctions** : chaque fonction créée devient une colonne de la
  matrice.
- **Génération SQL** : module pur `buildSql(profil)` côté backend — noms de
  tables/colonnes en **placeholders à valider** contre le schéma Wavesoft réel.

## Hébergement (consultable partout)

L'interface est une **application statique** (aucun backend requis pour la
consultation ; données en `localStorage` du navigateur). Trois options :

### A. Artifact claude.ai (le plus rapide)
```bash
npm -w frontend run build:artifact   # → frontend/dist-standalone/artifact.html
```
Publier `artifact.html` comme Artifact → URL partageable immédiate. La page
est autonome (JS/CSS/polices inlinés, 0 requête externe).

### B. Hébergeur statique (URL publique permanente)
```bash
npm -w frontend run build            # → frontend/dist/
```
Déployer le dossier `frontend/dist/` sur Netlify, Vercel, GitHub Pages,
Cloudflare Pages, ou tout serveur statique. Routeur en HashRouter → aucune
règle de réécriture nécessaire.

### ⚠ Limite importante (prototype)
Les données (dossiers, utilisateurs, autorisations) et l'authentification
sont **locales au navigateur** (`localStorage`) : elles ne sont **pas
partagées** entre utilisateurs ni entre appareils, et les mots de passe sont
en clair. Pour un usage multi-utilisateurs réel (données partagées, comptes
sécurisés), déployer le **backend** (`backend/`) avec une vraie base et une
authentification hachée, puis brancher le front dessus.

---

# Backend full-stack (auth + base partagée)

Le backend fournit une **authentification sécurisée** et une **base partagée**
(SQLite) pour un usage multi-utilisateurs réel.

## Stack
- **Express** (TypeScript, ESM), **SQLite** via `better-sqlite3`.
- **Auth** : mots de passe hachés (`bcryptjs`), sessions par **jeton JWT**
  (`jsonwebtoken`, en-tête `Authorization: Bearer`).
- **Contrôle d'accès** : middlewares `requireAuth` / `requireAdmin` ;
  vérification par dossier (un client n'accède qu'à ses dossiers).

## Schéma (SQLite)
`users` (id, nom, email unique, password_hash, type) · `dossiers`
(id, nom, client, data JSON) · `user_dossiers` (liaison accès).
La matrice d'un dossier est stockée en JSON dans `dossiers.data`.

## Endpoints
```
POST   /api/auth/login          { email, password } → { token, user }
GET    /api/auth/me             → { user }                    (auth)
GET    /api/users              → { users }                    (admin)
POST   /api/users              créer                          (admin)
PUT    /api/users/:id          modifier                       (admin)
DELETE /api/users/:id          supprimer                      (admin)
GET    /api/dossiers           → dossiers accessibles         (auth)
POST   /api/dossiers           créer                          (admin)
PUT    /api/dossiers/:id       renommer                       (admin)
DELETE /api/dossiers/:id       supprimer                      (admin)
GET    /api/dossiers/:id/data  → matrice du dossier           (accès dossier)
PUT    /api/dossiers/:id/data  enregistrer la matrice         (accès dossier)
POST   /api/sql/generate       → { sql }                      (auth)
```

## Configuration (`backend/.env`)
Voir `backend/.env.example` : `JWT_SECRET` (obligatoire en prod),
`JWT_EXPIRES`, `PORT`, `DB_PATH`. La base est créée et **seedée** au premier
démarrage (dossier SA TOYMART + 3 comptes de démo).

## Démarrage
```bash
npm install
JWT_SECRET=... npm -w backend run dev     # API :8787 (SQLite: backend/data/)
npm -w frontend run dev                    # UI :5173 (proxy /api → :8787)
```

## Front connecté à l'API
Le store **auto-détecte** le backend au démarrage (`GET /api/health`) :
- backend joignable → **mode API** (auth + base partagée) ;
- sinon → **mode local** (localStorage + seed), utilisé par la démo autonome.

Pour builder le front vers une API distante :
```bash
VITE_API_URL=https://api.exemple.ma/api npm -w frontend run build
```
Ou servir front + backend derrière le même domaine avec `/api` proxifié
vers le backend (aucune variable nécessaire, `/api` par défaut).
