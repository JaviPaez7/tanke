# Tanke

Encuentra las gasolineras más baratas de España según combustible, depósito y ubicación. Datos oficiales del Ministerio de Industria.

**En vivo:** [tanke.javistudio.dev](https://tanke.javistudio.dev)

## Características

- Filtro por provincia / municipio (por defecto Canarias · Las Palmas)
- Ordenar por Gasolina 95/98, Diésel / Diésel+, GLP
- Estimación de coste y ahorro según litros del depósito
- GPS + radio (km); ordenar por precio o distancia
- Al activar el GPS la provincia se ajusta sola a donde estás, no a la guardada
- Vista lista y mapa (Leaflet)
- Modo oscuro; preferencias de búsqueda en `localStorage`
- PWA instalable
- Cuentas: favoritas, alertas de precio, avisos e histórico de Canarias
- Guías editables y panel `/admin` (usuarios, contenidos, ingesta)

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 · Vite 7 · Tailwind CSS 4 · Leaflet · React Router |
| API | Express (`server.js` + `server/`) |
| Auth | Cookies httpOnly · bcryptjs · Prisma Session |
| BD | PostgreSQL 16 · Prisma |
| Datos | API pública de carburantes (Ministerio) |
| Infra | Docker · Traefik · GHCR · VPS Hetzner |

La app vive en [`tanke/`](./tanke/). El proxy evita CORS y el 403 del origen gubernamental.

## Arranque local

```bash
cd tanke
cp .env.example .env
npm install
npm run db:up
npx prisma migrate deploy
npx prisma generate
npm run dev                   # Express :3003 + Vite; /api → Express
```

Admin por defecto: `admin@tanke.dev` / `TankeAdmin2026`.

```bash
npm run build
npm run lint
```

## Despliegue

- **Docker / VPS:** `tanke/Dockerfile` (Express en `:3002`) + `docker-compose.yml` (app + Postgres) → `tanke.javistudio.dev`
- **CI:** GitHub Actions construye la imagen GHCR y despliega en el VPS
- El VPS guarda su copia del compose en `/opt/gas-tracker`, con `POSTGRES_PASSWORD`, `SESSION_SECRET` y `ADMIN_PASSWORD` en el `.env` de al lado. Los datos viven en el volumen `gas-tracker_tanke_pg`, así que sobreviven a los despliegues
- Las migraciones se aplican solas al arrancar el contenedor (`docker-entrypoint.sh`)

## Autor

[Javi Páez](https://www.linkedin.com/in/javi-paez-42b5a8368/) · [javistudio.dev](https://javistudio.dev)
