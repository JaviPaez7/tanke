// Servidor de produccion: estatico, proxy API, landings SEO y sitemap.
import express from "express";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;
const distDir = path.join(__dirname, "dist");

app.get("/api/gas", async (req, res) => {
  const id = req.query.id || "35";
  const GOV_URL_PROVINCE =
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia";
  const GOV_URL_ALL =
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
  const targetUrl = id === "all" ? GOV_URL_ALL : `${GOV_URL_PROVINCE}/${id}`;

  try {
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=300");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Gov API responded with ${response.status}`);

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Saturacion en el Ministerio o timeout" });
  }
});

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
      .set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300")
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
    res.type("html").status(200).send(html);
  }
});

app.get("/precios/:slug", (req, res) => {
  const fuel = fuelPages.find((f) => f.slug === req.params.slug);
  if (!fuel) return res.status(404).send(notFoundHtml());
  res
    .type("html")
    .set("Cache-Control", "public, max-age=3600")
    .send(renderFuelLanding(fuel));
});

app.get("/guia/ahorrar-gasolina", (_req, res) => {
  res
    .type("html")
    .set("Cache-Control", "public, max-age=86400")
    .send(renderGuidePage());
});

app.use(express.static(distDir, { index: false }));

app.use((_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

function notFoundHtml() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>No encontrado — Tanke</title>
  <meta name="robots" content="noindex"><link rel="canonical" href="${SITE_URL}/">
  <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0}
  a{color:#818cf8}</style></head><body><div style="text-align:center">
  <h1>Página no encontrada</h1><p><a href="/">Volver a Tanke</a> · <a href="/gasolineras/las-palmas">Gasolineras en Las Palmas</a></p>
  </div></body></html>`;
}

app.listen(PORT, () => console.log(`tanke server listening on ${PORT}`));
