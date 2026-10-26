# Etiqueta fijada al parche: Dependabot (.github/dependabot.yml) propone las
# subidas; "22-slim" a secas cambiaba de version debajo sin que nadie lo viera.
FROM node:22.23.4-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22.23.4-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# La CLI de Prisma no tiene que llamar a casa desde produccion.
ENV PRISMA_HIDE_UPDATE_MESSAGE=1 CHECKPOINT_DISABLE=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force
COPY --chown=node:node server.js docker-entrypoint.sh ./
COPY --chown=node:node server ./server
COPY --chown=node:node seo ./seo
COPY --chown=node:node shared ./shared
COPY --chown=node:node --from=build /app/dist ./dist
RUN chmod +x docker-entrypoint.sh
# El proceso no necesita escribir en /app ni ser root: node_modules queda de
# root y solo lectura, y la app corre con el usuario `node` de la imagen. Un
# fallo en Express ya no regala root dentro del contenedor.
USER node
EXPOSE 3002
ENTRYPOINT ["./docker-entrypoint.sh"]
