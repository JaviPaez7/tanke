import { fetchStationsCached, nearestStation } from "../lib/stations.js";

// Más allá de esto el usuario no está en España (o el dato no sirve para
// elegir provincia) y es mejor no tocar su selector.
const MAX_LOCATE_KM = 150;

export function registerGasRoute(app) {
  app.get("/api/gas/locate", async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Coordenadas no válidas." });
    }

    try {
      res.setHeader("Cache-Control", "no-store");
      const found = await nearestStation(lat, lng);

      if (!found || found.distanceKm > MAX_LOCATE_KM) {
        return res.json({ provinceId: null, outOfRange: true });
      }

      res.json({
        provinceId: found.station.provinceId,
        province: found.station.province,
        municipality: found.station.municipality,
        distanceKm: Number(found.distanceKm.toFixed(1)),
      });
    } catch (error) {
      console.error("Locate error:", error.message);
      res.status(502).json({ error: "No hemos podido localizar tu provincia." });
    }
  });

  // Antes se reenviaba el JSON crudo del Ministerio: 41 campos por estación de
  // los que el cliente usaba 13 y tiraba 28, y sin pasar por la caché (cada
  // visitante abría su propia llamada al Ministerio). Ahora sale normalizado y
  // cacheado, y si el origen falla se sirve la copia anterior marcada `stale`
  // en vez de dejar la pantalla vacía.
  app.get("/api/gas", async (req, res) => {
    const id = String(req.query.id || "35");

    try {
      const { stations, fetchedAt, stale } = await fetchStationsCached(id);
      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=300");
      res.json({ stations, fetchedAt, stale });
    } catch (error) {
      console.error("Gas error:", error.message);
      // 502: el fallo es del origen, no nuestro.
      res.status(502).json({
        error: "El Ministerio no responde ahora mismo. Inténtalo en un minuto.",
      });
    }
  });
}
