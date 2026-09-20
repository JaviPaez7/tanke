# Tanke

Encuentra las gasolineras más baratas de España según combustible, depósito y ubicación. Datos oficiales del Ministerio para la Transición Ecológica y el Reto Demográfico.

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
- Alertas de precio que avisan por email cuando una gasolinera baja de tu tope (solo a direcciones verificadas)
- Verificación de email al registrarse (enlace de un solo uso, caduca en 24 h) y cambio de email confirmado desde la dirección nueva, con aviso a la antigua
- Recuperación de contraseña por email (enlace de un solo uso, caduca en 30 min)
- Ajustes de cuenta: cambiar nombre, email y contraseña, descargar tus datos y darte de baja
- Guías editables con categorías y etiquetas, filtro por categoría en `/guias`, y panel `/admin` (usuarios, guías, categorías/etiquetas, avisos, ingesta)

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 · Vite 7 · Tailwind CSS 4 · Leaflet · React Router |
| API | Express (`server.js` + `server/`) |
| Auth | Cookies httpOnly · bcryptjs · Prisma Session |
| Email | Nodemailer sobre Resend SMTP (`mail.javistudio.dev`) |
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

Para crear el primer administrador, define `ADMIN_EMAIL` y `ADMIN_PASSWORD` en
`.env` antes del primer arranque. No existen credenciales predeterminadas ni se
promocionan automáticamente cuentas ya registradas.

```bash
npm run build
npm run lint
npm test
```

## Seguridad

- Sesiones con token aleatorio (solo se guarda su hash), cookie `httpOnly` + `SameSite=Lax` + `Secure`; bcrypt para las contraseñas
- Contraseñas: 8–128 caracteres, no pueden contener el email y se comprueban contra [Have I Been Pwned](https://haveibeenpwned.com/API/v3#PwnedPasswords) por rango k-anónimo (si el servicio no responde se aceptan y queda aviso en el log)
- El login compara siempre contra un hash, exista o no la cuenta, para no delatar emails por tiempo de respuesta
- Verificación de email en modelo suave: la cuenta se usa desde el registro, pero las alertas solo se envían a direcciones confirmadas; un cambio de email no se aplica hasta confirmarlo desde la nueva y avisa a la antigua. Cambiar o restablecer la contraseña anula cualquier cambio pendiente
- Escrituras bajo `/api` protegidas frente a CSRF por `Sec-Fetch-Site`/`Origin` además de la cookie `Lax`
- Rate limiting con `express-rate-limit`: por IP en auth y buscador, por usuario en las escrituras de la cuenta; topes por cuenta (20 alertas activas, 100 favoritas, 20 avisos al día) publicados en `/api/meta`
- `/api/gas` solo acepta los 52 códigos de provincia o `all`; la caché del Ministerio está acotada
- Content Security Policy propia (`server/lib/csp.js`): scripts solo de la app (el del tema va por hash calculado al arrancar), conexiones solo a la API y a OpenFreeMap, sin `object-src` ni `unsafe-eval`. Arranca en modo informe (`Content-Security-Policy-Report-Only`, los avisos salen en el log vía `/api/csp-report`); `CSP_ENFORCE=true` en el `.env` pasa a bloquear sin desplegar. Traefik sigue poniendo HSTS, `nosniff`, `Referrer-Policy` y `frame-ancestors`
- El contenedor corre con el usuario `node` (no root), sin puerto publicado en el host y con `no-new-privileges`; las imágenes base van fijadas a un parche concreto y Dependabot propone las subidas (npm, Docker, Actions)
- Riesgos aceptados: el registro responde 409 si el email ya existe (enumeración de cuentas); el limitador vive en memoria y se reinicia con el contenedor

## Despliegue

- **Docker / VPS:** `tanke/Dockerfile` (Express en `:3002`) + `docker-compose.yml` (app + Postgres) → `tanke.javistudio.dev`
- **CI:** GitHub Actions ejecuta lint y tests; si pasan, construye la imagen GHCR y despliega en el VPS. En los pull requests hace lo mismo pero sin publicar la imagen ni desplegar
- El VPS guarda su copia del compose en `/opt/gas-tracker`, con `POSTGRES_PASSWORD` y `SMTP_URL` en el `.env` de al lado. `ADMIN_EMAIL` y `ADMIN_PASSWORD` solo hacen falta para crear el primer administrador: **bórralas del `.env` después del primer arranque** (la app avisa en el log mientras sigan ahí; la contraseña en claro acabaría en cada backup de configuración). Los datos viven en el volumen `gas-tracker_tanke_pg`, así que sobreviven a los despliegues
- Las migraciones se aplican solas al arrancar el contenedor (`docker-entrypoint.sh`)
- Healthcheck en `/api/health`; responde 200 mientras el proceso pueda atender

## Autor

[Javi Páez](https://www.linkedin.com/in/javi-paez-42b5a8368/) · [javistudio.dev](https://javistudio.dev)
