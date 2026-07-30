# Tanke (gas-tracker)

Buscador de gasolineras baratas en España (datos del Ministerio). Prod: [tanke.javistudio.dev](https://tanke.javistudio.dev).

El código de la app vive en **`tanke/`**. En la raíz: compose, CI y README.

## Stack

- React 19 · Vite 7 · Tailwind 4 · Leaflet · PWA
- Prod: Express (`tanke/server.js`) — estático `dist/` + proxy `/api/gas` (:3002)
- Docker · Traefik · GHCR `ghcr.io/javipaez7/tanke` · `/opt/gas-tracker`
- Sin `.env` ni secrets de app

## Comandos

```bash
cd tanke
npm install
npm run dev          # Vite; proxy /api/gas → Ministerio
npm run build
npm run preview
npm run lint
```

## Proxy (crítico)

El browser **solo** llama `/api/gas?id=<provincia|all>` (`src/services/gasStations.js`).

- Dev: rewrite en `vite.config.js`
- Prod: Express fetch con User-Agent de navegador (evita CORS + 403 del Ministerio)

No llames la API del Ministerio desde el cliente.

## No negociables

1. Editar la app en `tanke/`; no reinventar Vercel/serverless (ya retirado).
2. Mantener el proxy server-side y el User-Agent.
3. Puerto 3002 + labels Traefik `tanke.javistudio.dev` / red `public-edge`.
4. `App.jsx` es la fuente de verdad (no `save.jsx`).
5. UI en español; prefs en `localStorage` (`tanke_*`).
6. No commits/push sin confirmación explícita.
