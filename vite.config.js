import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/gas": {
        // Apuntamos a la base de la API del gobierno
        target:
          "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia",
        changeOrigin: true,
        secure: false, // Ignoramos problemas de certificados SSL
        // Reescribimos la ruta: quitamos '/api/gas' y dejamos solo el ID (ej: '/35')
        rewrite: (path) => path.replace(/^\/api\/gas/, ""),
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // Añadimos la identidad de navegador para evitar bloqueo 403
            proxyReq.setHeader(
              "User-Agent",
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            );
            proxyReq.setHeader("Accept", "application/json");
          });
        },
      },
    },
  },
});
