# Tanke (gas-tracker)

Buscador de gasolineras baratas en España (datos del Ministerio). Prod: [tanke.javistudio.dev](https://tanke.javistudio.dev).

El código de la app vive en **`tanke/`**. En la raíz: compose, CI y README.

## Stack

- React 19 · Vite 7 · Tailwind 4 · Leaflet · PWA · React Router
- Prod: Express (`tanke/server.js`) — estático `dist/` + API (`/api/*`) en :3002
- PostgreSQL · Prisma · sesiones por cookie httpOnly · Nodemailer (Resend SMTP)
- Docker · Traefik · GHCR `ghcr.io/javipaez7/tanke` · `/opt/gas-tracker`

## Comandos

```bash
cd tanke
cp .env.example .env   # si no existe
npm install
npm run db:up          # Postgres local en :5433
npx prisma migrate deploy
npx prisma generate
npm run dev            # Express :3003 + Vite; /api proxied al Express
npm run build
npm run lint
```

## Proxy (crítico)

El browser **solo** llama `/api/gas?id=<provincia|all>` (`src/services/gasStations.js`).

- Dev: Vite proxyea `/api` → Express (`127.0.0.1:3003`)
- Prod: Express fetch con User-Agent de navegador (evita CORS + 403 del Ministerio)

No llames la API del Ministerio desde el cliente.

## Cuentas

- Registro/login: `/registro`, `/login`
- Recuperar contraseña: `/recuperar` → email → `/restablecer?token=…` (caduca a los 30 min, un solo uso)
- Front-office extra: `/guias`, `/cuenta` (pestañas: favoritas, alertas, avisos, histórico, ajustes)
- Ajustes: cambiar nombre/email/contraseña, exportar datos (JSON) y borrar la cuenta
- Back-office: `/admin` (rol `admin`)
- Seed: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (por defecto `admin@tanke.dev` / `TankeAdmin2026`)

## Correo

Resend por SMTP, el mismo transporte que Citaly y DanceFloor en el VPS
(`smtp.resend.com:587`, dominio `mail.javistudio.dev`). Se configura con
`SMTP_URL`, `EMAIL_FROM` y `APP_URL` (base de los enlaces del email).

Sin `SMTP_URL` la app arranca igual y escribe los emails en el log: el flujo de
recuperación se puede probar en local sin montar nada.

## No negociables

1. Editar la app en `tanke/`; no reinventar Vercel/serverless (ya retirado).
2. Mantener el proxy server-side y el User-Agent.
3. Puerto 3002 + labels Traefik `tanke.javistudio.dev` / red `public-edge`.
4. `App.jsx` es la fuente de verdad del buscador.
5. UI en español; prefs de búsqueda en `localStorage` (`tanke_*`).
6. No commits/push sin confirmación explícita.
