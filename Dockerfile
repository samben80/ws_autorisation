# syntax=docker/dockerfile:1
# Image full-stack : le backend Express sert l'API + le frontend statique.

# --- Étape build ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Outils pour compiler better-sqlite3 (module natif) si aucun binaire prébuild.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# Installe les dépendances (workspaces) à partir des manifestes.
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci
# Copie le code et build front + back.
COPY . .
RUN npm -w frontend run build \
    && npm -w backend run build \
    && npm prune --omit=dev

# --- Étape runtime ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    FRONTEND_DIR=/app/frontend/dist \
    DB_PATH=/app/backend/data/wavesoft.db
# Dépendances de production (better-sqlite3 déjà compilé pour cette même image).
# Les paquets des workspaces sont remontés (hoisted) dans le node_modules racine.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/package.json ./package.json
# Données SQLite persistées sur un volume.
RUN mkdir -p /app/backend/data
VOLUME ["/app/backend/data"]
EXPOSE 8787
CMD ["node", "backend/dist/index.js"]
