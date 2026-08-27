FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY server.js ./
COPY server ./server
COPY seo ./seo
COPY shared ./shared
COPY docker-entrypoint.sh ./
COPY --from=build /app/dist ./dist
RUN chmod +x docker-entrypoint.sh
EXPOSE 3002
ENTRYPOINT ["./docker-entrypoint.sh"]
