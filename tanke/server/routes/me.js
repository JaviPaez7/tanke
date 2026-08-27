import { prisma, requireDb } from "../db.js";
import { FUELS, fetchNormalized } from "../lib/stations.js";
import { requireAuth, wrap } from "../lib/auth.js";

const REPORT_TYPES = new Set(["horario", "cerrada", "precio", "otro"]);
const FUEL_IDS = new Set(FUELS.map((f) => f.id));

function stationPayload(body) {
  return {
    stationId: String(body?.stationId || body?.id || "").trim(),
    stationName: String(body?.stationName || body?.name || "Gasolinera").slice(0, 120),
    address: String(body?.address || "").slice(0, 200),
    municipality: String(body?.municipality || "").slice(0, 80),
    province: String(body?.province || "").slice(0, 80),
    lat: Number(body?.lat) || 0,
    lng: Number(body?.lng) || 0,
  };
}

export function registerMeRoutes(app) {
  app.get(
    "/api/me/favorites",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      const ids = favorites.map((row) => row.stationId);
      const snaps =
        ids.length === 0
          ? []
          : await prisma.priceSnapshot.findMany({
              where: { stationId: { in: ids } },
              orderBy: { capturedDate: "desc" },
            });
      const latest = new Map();
      for (const snap of snaps) {
        if (!latest.has(snap.stationId)) latest.set(snap.stationId, snap);
      }
      res.json({
        favorites: favorites.map((row) => ({
          ...row,
          latest: latest.get(row.stationId) || null,
        })),
      });
    }),
  );

  app.post(
    "/api/me/favorites",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const data = stationPayload(req.body);
      if (!data.stationId) {
        return res.status(400).json({ error: "Falta el identificador de la estación." });
      }

      const favorite = await prisma.favorite.upsert({
        where: {
          userId_stationId: { userId: req.user.id, stationId: data.stationId },
        },
        create: { ...data, userId: req.user.id },
        update: data,
      });
      res.status(201).json({ favorite });
    }),
  );

  app.delete(
    "/api/me/favorites/:stationId",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      await prisma.favorite.deleteMany({
        where: { userId: req.user.id, stationId: String(req.params.stationId) },
      });
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/me/alerts",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const alerts = await prisma.priceAlert.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      res.json({ alerts });
    }),
  );

  app.post(
    "/api/me/alerts",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const provinceId = String(req.body?.provinceId || "").trim();
      const province = String(req.body?.province || "").trim();
      const municipality = String(req.body?.municipality || "").trim();
      const fuel = String(req.body?.fuel || "").trim();
      const threshold = Number(req.body?.threshold);

      if (!provinceId || !province) {
        return res.status(400).json({ error: "Elige una provincia." });
      }
      if (!FUEL_IDS.has(fuel)) {
        return res.status(400).json({ error: "Combustible no válido." });
      }
      if (!Number.isFinite(threshold) || threshold < 0.4 || threshold > 3) {
        return res
          .status(400)
          .json({ error: "El umbral debe estar entre 0,40 y 3,00 €/L." });
      }

      const alert = await prisma.priceAlert.create({
        data: {
          userId: req.user.id,
          provinceId,
          province,
          municipality,
          fuel,
          threshold,
        },
      });
      res.status(201).json({ alert });
    }),
  );

  app.patch(
    "/api/me/alerts/:id",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const existing = await prisma.priceAlert.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) return res.status(404).json({ error: "Alerta no encontrada." });

      const data = {};
      if (typeof req.body?.active === "boolean") data.active = req.body.active;
      if (req.body?.threshold != null) {
        const threshold = Number(req.body.threshold);
        if (!Number.isFinite(threshold) || threshold < 0.4 || threshold > 3) {
          return res
            .status(400)
            .json({ error: "El umbral debe estar entre 0,40 y 3,00 €/L." });
        }
        data.threshold = threshold;
      }

      const alert = await prisma.priceAlert.update({
        where: { id: existing.id },
        data,
      });
      res.json({ alert });
    }),
  );

  app.delete(
    "/api/me/alerts/:id",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      await prisma.priceAlert.deleteMany({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/me/alerts/status",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const alerts = await prisma.priceAlert.findMany({
        where: { userId: req.user.id, active: true },
      });

      const byProvince = new Map();
      for (const alert of alerts) {
        if (!byProvince.has(alert.provinceId)) {
          byProvince.set(alert.provinceId, await fetchNormalized(alert.provinceId));
        }
      }

      const status = alerts.map((alert) => {
        const stations = byProvince.get(alert.provinceId) || [];
        const filtered = alert.municipality
          ? stations.filter((s) => s.municipality === alert.municipality)
          : stations;
        const prices = filtered
          .map((s) => s[alert.fuel])
          .filter((p) => typeof p === "number" && p > 0);
        const currentMin = prices.length ? Math.min(...prices) : null;
        return {
          ...alert,
          currentMin,
          triggered: currentMin != null && currentMin <= alert.threshold,
        };
      });

      res.json({ alerts: status });
    }),
  );

  app.get(
    "/api/me/reports",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const reports = await prisma.stationReport.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.json({ reports });
    }),
  );

  app.post(
    "/api/me/reports",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const stationId = String(req.body?.stationId || "").trim();
      const stationName = String(req.body?.stationName || "Gasolinera").slice(0, 120);
      const type = String(req.body?.type || "").trim();
      const message = String(req.body?.message || "").trim();

      if (!stationId) {
        return res.status(400).json({ error: "Falta la estación." });
      }
      if (!REPORT_TYPES.has(type)) {
        return res.status(400).json({ error: "Tipo de aviso no válido." });
      }
      if (message.length < 8 || message.length > 500) {
        return res
          .status(400)
          .json({ error: "El mensaje debe tener entre 8 y 500 caracteres." });
      }

      const report = await prisma.stationReport.create({
        data: {
          userId: req.user.id,
          stationId,
          stationName,
          type,
          message,
        },
      });
      res.status(201).json({ report });
    }),
  );

  app.get(
    "/api/stations/:id/history",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const snapshots = await prisma.priceSnapshot.findMany({
        where: { stationId: String(req.params.id) },
        orderBy: { capturedDate: "asc" },
        take: 90,
      });
      res.json({ snapshots });
    }),
  );

  app.get(
    "/api/stats/history",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const provinceId = String(req.query.provinceId || "35");
      const rows = await prisma.priceSnapshot.groupBy({
        by: ["capturedDate"],
        where: { provinceId },
        _avg: {
          price95: true,
          price98: true,
          priceDiesel: true,
          priceDieselPlus: true,
          priceGLP: true,
          priceCNG: true,
        },
        _min: {
          price95: true,
          priceDiesel: true,
        },
        orderBy: { capturedDate: "asc" },
      });
      res.json({
        provinceId,
        points: rows.map((row) => ({
          date: row.capturedDate,
          avg95: row._avg.price95,
          avg98: row._avg.price98,
          avgDiesel: row._avg.priceDiesel,
          avgDieselPlus: row._avg.priceDieselPlus,
          avgGLP: row._avg.priceGLP,
          avgCNG: row._avg.priceCNG,
          min95: row._min.price95,
          minDiesel: row._min.priceDiesel,
        })),
      });
    }),
  );

  // Portabilidad (RGPD art. 20): todo lo que la cuenta ha generado, en un JSON
  // que el usuario se descarga sin pasar por soporte.
  app.get(
    "/api/me/export",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const [favorites, alerts, reports] = await Promise.all([
        prisma.favorite.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: "asc" },
        }),
        prisma.priceAlert.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: "asc" },
        }),
        prisma.stationReport.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      const stamp = new Date().toISOString().slice(0, 10);
      res
        .type("application/json")
        .set("Content-Disposition", `attachment; filename="tanke-${stamp}.json"`)
        .send(
          JSON.stringify(
            {
              exportadoEl: new Date().toISOString(),
              cuenta: {
                nombre: req.user.name,
                email: req.user.email,
                altaEl: req.user.createdAt,
              },
              favoritas: favorites,
              alertas: alerts,
              avisos: reports,
            },
            null,
            2,
          ),
        );
    }),
  );
}
