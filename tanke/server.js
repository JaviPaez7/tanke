// Servidor de produccion: estatico, proxy API, landings SEO y sitemap.
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  provinceIds,
  resolveProvinceSlug,
  provinceSlug,
  fuelPages,
  SITE_URL,
} from "./seo/provinces.js";
import {
  fetchStations,
  cheapest,
  averagePrice,
} from "./seo/fetchStations.js";
import {
  renderProvinceLanding,
  renderFuelLanding,
  renderGuidePage,
  renderSitemapXml,
  allSitemapPaths,
} from "./seo/html.js";
import { mountApi } from "./server/api.js";
import { bootstrap } from "./server/bootstrap.js";
import { prisma } from "./server/db.js";
import { startBackgroundJobs } from "./server/jobs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;
const distDir = path.join(__dirname, "dist");

app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));
mountApi(app);

// Cache para HTML. Antes las landings iban con max-age=3600 y 86400, así que un
// visitante que ya había estado seguía viendo la versión vieja hasta 24 h
// después de desplegar. Con max-age=0 el navegador revalida siempre, y como ya
// enviamos ETag la respuesta habitual es un 304 de unos pocos bytes. s-maxage
// mantiene el alivio de carga en cachés compartidas y stale-while-revalidate
// evita esperas mientras se refresca.
const HTML_CACHE =
  "public, max-age=0, must-revalidate, s-maxage=600, stale-while-revalidate=300";

app.get("/sitemap.xml", (_req, res) => {
  res
    .type("application/xml")
    .set("Cache-Control", "public, max-age=3600")
    .send(renderSitemapXml(allSitemapPaths()));
});

app.get("/robots.txt", (_req, res) => {
  res
    .type("text/plain")
    .set("Cache-Control", "public, max-age=86400")
    .send(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

const aliasRedirects = {
  tenerife: "santa-cruz-de-tenerife",
  "gran-canaria": "las-palmas",
  canarias: "las-palmas",
  baleares: "islas-baleares",
  mallorca: "islas-baleares",
};

app.get("/gasolineras/:slug", async (req, res) => {
  const raw = req.params.slug.toLowerCase();
  if (aliasRedirects[raw]) {
    return res.redirect(301, `/gasolineras/${aliasRedirects[raw]}`);
  }

  const provinceKey = resolveProvinceSlug(raw);
  if (!provinceKey) {
    return res.status(404).send(notFoundHtml());
  }

  const canonical = provinceSlug(provinceKey);
  if (raw !== canonical) {
    return res.redirect(301, `/gasolineras/${canonical}`);
  }

  try {
    const id = provinceIds[provinceKey];
    const stations = await fetchStations(id);
    const html = renderProvinceLanding({
      provinceKey,
      stations,
      avg95: averagePrice(stations, "price95"),
      avgDiesel: averagePrice(stations, "priceDiesel"),
      top95: cheapest(stations, "price95", 12),
      topDiesel: cheapest(stations, "priceDiesel", 12),
    });
    res
      .type("html")
      .set("Cache-Control", HTML_CACHE)
      .send(html);
  } catch (error) {
    console.error("SEO landing error:", error.message);
    const html = renderProvinceLanding({
      provinceKey,
      stations: [],
      avg95: 0,
      avgDiesel: 0,
      top95: [],
      topDiesel: [],
    });
    // Página degradada (la API del Ministerio falló): no la cacheamos, o una
    // caída pasajera se quedaría servida durante minutos.
    res
      .type("html")
      .status(200)
      .set("Cache-Control", "no-store")
      .send(html);
  }
});

app.get("/precios/:slug", (req, res) => {
  const fuel = fuelPages.find((f) => f.slug === req.params.slug);
  if (!fuel) return res.status(404).send(notFoundHtml());
  res
    .type("html")
    .set("Cache-Control", HTML_CACHE)
    .send(renderFuelLanding(fuel));
});

app.get("/guia/ahorrar-gasolina", (_req, res) => {
  res
    .type("html")
    .set("Cache-Control", HTML_CACHE)
    .send(renderGuidePage());
});

app.use(express.static(distDir, { index: false }));

// Rutas de cuenta: no tienen nada que aportar en Google y algunas no deberian
// aparecer nunca. `/restablecer` lleva el token en la URL, y `/cuenta` y
// `/admin` solo enseñan un formulario de login a quien no ha entrado. El
// header enlaza a /login, asi que Google llega solo si no se le dice que no.
const NOINDEX_PATHS = new Set([
  "/login",
  "/registro",
  "/recuperar",
  "/restablecer",
  "/cuenta",
  "/admin",
]);

// Se marca en el HTML servido, no desde React: Googlebot indexa antes de
// ejecutar el JS y una meta que aparece despues llega tarde.
let indexHtml = null;
let noindexHtml = null;

function loadShell() {
  if (indexHtml) return;
  indexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  noindexHtml = indexHtml.replace(
    /<meta name="robots" content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="noindex,nofollow" />',
  );
}

app.use((req, res) => {
  loadShell();
  const privada = NOINDEX_PATHS.has(req.path.replace(/\/+$/, "") || "/");
  res
    .type("html")
    .set("Cache-Control", HTML_CACHE)
    .send(privada ? noindexHtml : indexHtml);
});

function notFoundHtml() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>No encontrado — Tanke</title>
  <meta name="robots" content="noindex"><link rel="canonical" href="${SITE_URL}/">
  <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0}
  a{color:#818cf8}</style></head><body><div style="text-align:center">
  <h1>Página no encontrada</h1><p><a href="/">Volver a Tanke</a> · <a href="/gasolineras/las-palmas">Gasolineras en Las Palmas</a></p>
  </div></body></html>`;
}

await bootstrap(prisma);
if (prisma) startBackgroundJobs(prisma);

app.listen(PORT, () => console.log(`tanke server listening on ${PORT}`));
