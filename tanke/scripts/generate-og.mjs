/**
 * Genera public/og.jpg — la tarjeta que ven WhatsApp, X, Telegram, LinkedIn...
 *
 *   npm run og
 *
 * Notas de por qué está hecho así:
 * - El texto se rasteriza con resvg, no con ImageMagick: el `convert` de la
 *   versión anterior superponía los glifos y se comía los degradados.
 * - La composición va centrada a propósito, porque WhatsApp recorta un
 *   cuadrado del centro cuando muestra el preview pequeño.
 * - Salida JPEG: WhatsApp descarta previews grandes por encima de ~600 KB y
 *   el PNG de una foto se iba a ~700 KB.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const FONT = "Lato, DejaVu Sans, sans-serif";

// misma foto que el hero de la home, recortada a 1.91:1 dejando el coche centrado
const bg = await sharp(join(root, "public/hero-1920.webp"))
  .resize(W, 800, { fit: "cover", position: "top" })
  .extract({ left: 0, top: 40, width: W, height: H })
  .jpeg({ quality: 92 })
  .toBuffer();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.74"/>
      <stop offset="45%" stop-color="#0f172a" stop-opacity="0.52"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.94"/>
    </linearGradient>
    <radialGradient id="focus" cx="50%" cy="58%" r="52%">
      <stop offset="0%" stop-color="#020617" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#020617" flood-opacity="0.75"/>
    </filter>
  </defs>

  <image href="data:image/jpeg;base64,${bg.toString("base64")}" x="0" y="0" width="${W}" height="${H}"/>
  <rect width="${W}" height="${H}" fill="url(#veil)"/>
  <rect width="${W}" height="${H}" fill="url(#focus)"/>

  <g filter="url(#shadow)">
    <!-- pastilla superior -->
    <rect x="352" y="196" width="496" height="52" rx="26" fill="#4f46e5" fill-opacity="0.28" stroke="#a5b4fc" stroke-opacity="0.6" stroke-width="1.5"/>
    <text x="600" y="230" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="700" letter-spacing="3.4" fill="#e0e7ff">PRECIOS OFICIALES EN TIEMPO REAL</text>

    <!-- wordmark -->
    <text x="600" y="392" text-anchor="middle" font-family="${FONT}" font-size="148" font-weight="900" letter-spacing="-5" fill="#ffffff">Tanke<tspan fill="#818cf8">.</tspan></text>

    <!-- claim -->
    <text x="600" y="452" text-anchor="middle" font-family="${FONT}" font-size="32" font-weight="700" fill="#f1f5f9">Gasolineras baratas en Canarias y España</text>
    <text x="600" y="493" text-anchor="middle" font-family="${FONT}" font-size="23" font-weight="400" fill="#cbd5e1">Gasolina 95 · 98 · Diésel · GLP — la más barata cerca de ti</text>

    <!-- dominio -->
    <text x="600" y="576" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="1.2" fill="#a5b4fc">tanke.javistudio.dev</text>
  </g>
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: "width", value: W },
  font: { loadSystemFonts: true, defaultFontFamily: "Lato" },
})
  .render()
  .asPng();

const out = join(root, "public/og.jpg");
const { size } = await sharp(png)
  .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" })
  .toFile(out);

console.log(`og.jpg ${W}x${H} — ${(size / 1024).toFixed(0)} KB → ${out}`);
