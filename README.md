# Tanke

Encuentra las gasolineras más baratas de España según combustible, depósito y ubicación. Datos oficiales del Ministerio de Industria.

**En vivo:** [tanke.javistudio.dev](https://tanke.javistudio.dev)

## Características

- Filtro por provincia / municipio (por defecto Canarias · Las Palmas)
- Ordenar por Gasolina 95/98, Diésel / Diésel+, GLP
- Estimación de coste y ahorro según litros del depósito
- GPS + radio (km); ordenar por precio o distancia
- Vista lista y mapa (Leaflet)
- Modo oscuro; preferencias en `localStorage`
- PWA instalable

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 · Vite 7 · Tailwind CSS 4 · Leaflet |
| Proxy API | Express (`server.js`) en Docker |
| Datos | API pública de carburantes (Ministerio) |
| Infra | Docker · Traefik · GHCR · VPS Hetzner |

La app vive en la carpeta [`tanke/`](./tanke/). El proxy evita CORS y el bloqueo 403 del origen gubernamental (headers de navegador en servidor).

## Arranque local

```bash
cd tanke
npm install
npm run dev                   # Vite; /api/gas proxied al Ministerio
```

No hace falta `.env`.

```bash
npm run build
npm run preview
npm run lint
```

## Despliegue

- **Docker / VPS:** `tanke/Dockerfile` (Express en `:3002`) + `docker-compose.yml` → `tanke.javistudio.dev`
- **CI:** GitHub Actions construye la imagen GHCR y despliega en el VPS

## Autor

[Javi Páez](https://www.linkedin.com/in/javi-paez-42b5a8368/) · [javistudio.dev](https://javistudio.dev)
