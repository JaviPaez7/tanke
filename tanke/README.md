# Tanke. ⛽

**En vivo:** [tanke.javistudio.dev](https://tanke.javistudio.dev)

Tanke es una plataforma para encontrar las gasolineras más económicas en España, con cuentas, alertas e histórico para Canarias.

> El README del repositorio (GitHub) está en la [raíz](../README.md). Este archivo documenta la app en `tanke/`.

## Reto técnico: superar el bloqueo 403

El Ministerio bloquea clientes sin User-Agent de navegador y no envía CORS. El browser **nunca** llama al origen gubernamental:

- Express sirve el estático, `/api/gas` y el resto de la API
- En local, Vite proxyea `/api` a Express (`:3003`)
- Encabezados de navegador real en el fetch de servidor

## Stack

**Frontend:** React 19 · Vite 7 · Tailwind CSS 4 · Leaflet · React Router · PWA

**API:** Node.js · Express · Prisma · PostgreSQL

## Arranque local

```bash
cd tanke
cp .env.example .env
npm install
npm run db:up
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Panel: `/admin` · `admin@tanke.dev` / `TankeAdmin2026`

## Despliegue

- **Docker / VPS:** `Dockerfile` (Express en `:3002` + migrate) + compose con Postgres
- **CI:** GitHub Actions → imagen GHCR y deploy en el VPS

## Autor

Desarrollado por [Javi Páez](https://www.linkedin.com/in/javi-paez-42b5a8368/).
