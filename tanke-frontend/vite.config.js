import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // He quitado mask-icon.svg porque no está en tu carpeta
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
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
        ],
      },
    }),
  ],
});
