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
        "og.png",
        "robots.txt",
        "sitemap.xml",
      ],
      manifest: {
        name: "Tanke - Gasolineras baratas en España",
        short_name: "Tanke",
        description:
          "Compara precios de gasolina y diésel en Canarias y toda España",
        lang: "es",
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
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/gasolineras\//,
          /^\/precios\//,
          /^\/guia\//,
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/,
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
