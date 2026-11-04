# Étape 1 : Build des dépendances
FROM node:26-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Étape 2 : Image finale de production
FROM node:26-alpine
WORKDIR /app

# Sécurité : Exécution avec un utilisateur non-root
USER node

# Copie sélective depuis l'étape builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/

EXPOSE 3000
ENV PORT=3000

CMD ["node", "src/index.js"]