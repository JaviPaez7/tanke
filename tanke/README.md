# Tanke. ⛽

**En vivo:** [tanke.javistudio.dev](https://tanke.javistudio.dev) · [tanke-seven.vercel.app](https://tanke-seven.vercel.app/)

Tanke es una plataforma para encontrar las gasolineras más económicas en España, optimizando el ahorro según el tipo de combustible y la capacidad del depósito.

> El README del repositorio (GitHub) está en la [raíz](../README.md). Este archivo documenta la app en `tanke/`.

## Reto técnico: superar el bloqueo 403

Uno de los mayores desafíos fue el acceso a los datos de la sede electrónica del Ministerio. Por CORS y el bloqueo de agentes no identificados hace falta un **proxy en servidor**:

- Función serverless en Vercel (`api/gas.js`) o Express (`server.js`) en Docker
- Encabezados de navegador real para mantener el flujo de datos hacia el cliente

## Stack

**Frontend:** React 19 · Vite 7 · Tailwind CSS 4 · Leaflet · Axios · PWA  

**Proxy:** Node.js (Vercel serverless o Express)

## Arranque local

```bash
cd tanke
npm install
npm run dev
```

No hace falta `.env`. Scripts útiles: `npm run build`, `npm run preview`, `npm run lint`.

## Despliegue

- **Vercel:** `vercel.json` en la raíz del repo + `api/gas.js`
- **Docker / VPS:** `Dockerfile` (Express en `:3002`) + compose → `tanke.javistudio.dev`
- **CI:** GitHub Actions → imagen GHCR y deploy en el VPS

## Autor

Desarrollado por [Javi Páez](https://www.linkedin.com/in/javi-paez-42b5a8368/).
