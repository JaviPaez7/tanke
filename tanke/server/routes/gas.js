import { fetchRawGas, nearestStation } from "../lib/stations.js";

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

  app.get("/api/gas", async (req, res) => {
    const id = req.query.id || "35";

    try {
      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=300");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const data = await fetchRawGas(id);
      res.status(200).json(data);
    } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "Saturacion en el Ministerio o timeout" });
    }
  });
}
