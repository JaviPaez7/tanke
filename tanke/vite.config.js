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
        "og.jpg",
        "robots.txt",
        "sitemap.xml",
      ],
      manifest: {
        name: "Tanke - Gasolineras baratas en España",
        short_name: "Tanke",
        description:
          "Compara precios de gasolina y diésel en Canarias y toda España",
        lang: "es",
        display: "standalone",
        start_url: "/",
        scope: "/",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-trans.png",
            sizes: "500x500",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // El chunk del mapa pasa de 49 KB a 300 KB (gzip) al llevar MapLibre
        // dentro, y su worker suma otro tanto; solo hacen falta si el usuario
        // abre el mapa. Precargarlos en la instalacion del PWA multiplicaba lo
        // que se descarga de entrada, asi que se quedan fuera del precache y
        // se cachean al usarlos.
        globIgnores: ["**/StationMap-*.js", "**/maplibre-gl-worker-*.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/gasolineras\//,
          /^\/precios\//,
          /^\/guia\//,
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/,
        ],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\/assets\/(StationMap|maplibre-gl-worker)-[^/]+\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "tanke-mapa",
              expiration: { maxEntries: 2 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // MapLibre arranca su worker con `type: "module"`; se empaqueta como ES
  // module para que coincida con lo que espera.
  worker: { format: "es" },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3003",
        changeOrigin: true,
      },
    },
  },
});
