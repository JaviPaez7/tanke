import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "robots.txt",
        "sitemap.xml",
      ],
      manifest: {
        name: "Tanke - Ahorra en Gasolina",
        short_name: "Tanke",
        description: "Buscador de gasolineras baratas en tiempo real",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-trans.png",
            sizes: "500x500",
            type: "image/png",
            purpose: "maskable"
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/gas': {
        target: 'https://sedeaplicaciones.minetur.gob.es',
        changeOrigin: true,
        rewrite: (path) => {
          // Si es 'all', pide toda España. Si no, filtra por provincia.
          const url = new URL(path, 'http://localhost');
          const id = url.searchParams.get('id') || '35';
          if (id === 'all') {
            return `/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/`;
          }
          return `/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${id}`;
        }
      }
    }
  }
});
