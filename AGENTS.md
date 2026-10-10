# Tanke

Buscador de gasolineras baratas en España (datos abiertos del Ministerio para la Transición Ecológica). Prod: [tanke.javistudio.dev](https://tanke.javistudio.dev).

El código de la app vive en **`tanke/`**. En la raíz: compose, CI y README.

## Stack

- React 19 · Vite 7 · Tailwind 4 · Leaflet · PWA · React Router
- Prod: Express (`tanke/server.js`) — estático `dist/` + API (`/api/*`) en :3002
- PostgreSQL · Prisma · sesiones por cookie httpOnly · Nodemailer (Resend SMTP)
- Docker · Traefik · GHCR `ghcr.io/javipaez7/tanke` · `/opt/tanke`

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
npm test               # vitest
```

## Estructura compartida

`shared/` guarda lo que leen servidor y cliente (los combustibles). No va en
`src/`: la imagen de producción no copia `src/`, así que el servidor no podría
leerlo. `seo/provinces.js` hace lo mismo con las 52 provincias.

Si algo se escribe dos veces (combustibles, provincias, el normalizador del
JSON del Ministerio), acaba divergiendo. Ya pasó con el GNC.

Las landings SEO (`/gasolineras/:provincia`, `/precios/:combustible`,
`/guia/ahorrar-gasolina` y el 404) se pintan en `seo/html.js` con clases de
Tailwind y cargan el CSS construido de la app: `server.js` lee su nombre del
`dist/index.html` al arrancar y suma a la CSP el hash de su script de tema.
Sin `npm run build` salen sin estilos. `src/index.css` declara
`@source "../seo"` para que Tailwind genere esas clases.

## Proxy (crítico)

El browser **solo** llama `/api/gas?id=<provincia|all>` (`src/services/gasStations.js`).

- Dev: Vite proxyea `/api` → Express (`127.0.0.1:3003`)
- Prod: Express fetch con User-Agent de navegador (evita CORS + 403 del Ministerio)

No llames la API del Ministerio desde el cliente.

`/api/gas` devuelve `{ stations, fetchedAt, stale }` **ya normalizado** (no el
JSON crudo). Caché de 10 min compartida con las landings SEO; si el Ministerio
falla se sirve la última copia buena hasta 6 h con `stale: true`.

## Cuentas

- Registro/login: `/registro`, `/login`. El registro abre sesión y manda un enlace de verificación (`/verificar?token=…`, 24 h, un solo uso); `server/lib/verification.js`
- Verificación suave: sin confirmar se puede usar todo menos recibir correos de alerta (`runAlerts` filtra `emailVerifiedAt`). `/cuenta` enseña el aviso con "reenviar"
- Recuperar contraseña: `/recuperar` → email → `/restablecer?token=…` (caduca a los 30 min, un solo uso)
- Front-office extra: `/guias`, `/cuenta` (pestañas: favoritas, alertas, avisos, histórico, ajustes)
- Ajustes: cambiar nombre/email/contraseña, exportar datos (JSON) y borrar la cuenta. El email nuevo queda pendiente (`pendingEmail` en `/api/auth/me`) hasta abrir el enlace enviado a esa dirección; la antigua recibe aviso
- Alertas: el job horario (`server/lib/alerts.js`) las evalúa y manda un correo;
  como mucho uno al día por alerta, salvo bajada de 3 céntimos sobre el último aviso
- Back-office: `/admin` (rol `admin`): usuarios, guías, categorías/etiquetas, avisos e ingesta. Las reglas de validación de guías y taxonomía viven en `server/lib/content.js`; crear y editar validan lo mismo
- Seed inicial: `ADMIN_EMAIL` / `ADMIN_PASSWORD` solo crean el primer administrador; no tienen valores predeterminados y no promocionan cuentas existentes. En el VPS se borran del `.env` tras el primer arranque (la app avisa en el log si siguen ahí)

## Correo

Resend por SMTP, el mismo transporte que Citaly y DanceFloor en el VPS
(`smtp.resend.com:587`, dominio `mail.javistudio.dev`). Se configura con
`SMTP_URL`, `EMAIL_FROM` y `APP_URL` (base de los enlaces del email).

Sin `SMTP_URL` la app arranca igual y escribe los emails en el log: el flujo de
recuperación se puede probar en local sin montar nada.

## No negociables

1. Editar la app en `tanke/`; no reinventar Vercel/serverless (ya retirado).
2. Mantener el proxy server-side y el User-Agent.
3. Puerto 3002 + labels Traefik `tanke.javistudio.dev` / red `public-edge`. Sin `ports` en el compose: nada entra sin pasar por Traefik.
4. `App.jsx` es la fuente de verdad del buscador.
5. UI en español; prefs de búsqueda en `localStorage` (`tanke_*`).
6. El mapa (`components/StationMap.jsx`) se carga con `React.lazy`. No importes
   Leaflet desde `App.jsx` o vuelve al bundle inicial de todas las rutas.
