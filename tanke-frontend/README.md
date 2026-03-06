# Tanke. ⛽

🚀 **Ver en vivo:** [https://tanke-seven.vercel.app/](https://tanke-seven.vercel.app/)

Tanke es una plataforma Full-Stack diseñada para encontrar las gasolineras más económicas en España, optimizando el ahorro según el tipo de combustible y la capacidad del depósito del usuario.

## 🚀 Despliegue
- **Frontend:** https://vercel.com/docs/cli/dev
- **Backend:** https://www.d5render.com/

## 🛠️ Reto Técnico: Superando el bloqueo 403
Uno de los mayores desafíos de este proyecto fue el acceso a los datos de la sede electrónica del Ministerio. Debido a las restricciones de CORS y el bloqueo de agentes no identificados, se desarrolló una **arquitectura de microservicios**:
- Se construyó un **Backend intermedio** en Node.js para realizar las peticiones del lado del servidor.
- Se implementó la rotación de encabezados para emular un navegador real, garantizando el flujo constante de datos hacia el cliente.

## 💻 Tecnologías utilizadas
### Frontend
- React.js
- Tailwind CSS
- Leaflet.js (Mapas interactivos)
- Axios

### Backend
- Node.js
- Express
- CORS & Axios

## 📦 Instalación y Uso Local

1. Clonar el repositorio: `git clone [URL-DE-TU-REPO]`
2. **Backend:**
   - `cd backend`
   - `npm install`
   - `node index.js`
3. **Frontend:**
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## 👤 Contacto
Desarrollado por Javi Páez.
- **LinkedIn:** [https://www.linkedin.com/in/javi-paez-42b5a8368/](https://www.linkedin.com/in/javi-paez-42b5a8368/)