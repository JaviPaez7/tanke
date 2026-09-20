import { prisma, requireDb } from "../db.js";
import {
  FUELS,
  InvalidProvinceError,
  fetchNormalized,
  isValidStationId,
} from "../lib/stations.js";
import { rateLimit, requireAuth, userKey, wrap } from "../lib/auth.js";
import { cheapestFor } from "../lib/alerts.js";
import { ACCOUNT_LIMITS } from "../lib/limits.js";

// Las escrituras de la cuenta se limitan por usuario, no por IP: una cuenta
// no puede inundar la base ni el panel de avisos aunque cambie de red.
const writeLimit = () => rateLimit({ max: 30, key: userKey });

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
    writeLimit(),
    wrap(async (req, res) => {
      const data = stationPayload(req.body);
      if (!data.stationId) {
        return res.status(400).json({ error: "Falta el identificador de la estación." });
      }

      // Volver a guardar una que ya está no cuenta contra el tope.
      const [existing, total] = await Promise.all([
        prisma.favorite.findUnique({
          where: { userId_stationId: { userId: req.user.id, stationId: data.stationId } },
          select: { id: true },
        }),
        prisma.favorite.count({ where: { userId: req.user.id } }),
      ]);
      if (!existing && total >= ACCOUNT_LIMITS.favorites) {
        return res.status(400).json({
          error: `Has llegado al máximo de ${ACCOUNT_LIMITS.favorites} gasolineras guardadas.`,
        });
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
    writeLimit(),
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
    writeLimit(),
    wrap(async (req, res) => {
      const provinceId = String(req.body?.provinceId || "").trim();
      const province = String(req.body?.province || "").trim();
      const municipality = String(req.body?.municipality || "").trim();
      const fuel = String(req.body?.fuel || "").trim();
      const threshold = Number(req.body?.threshold);

      // El id acaba en la URL del Ministerio desde el job de alertas: solo
      // valen provincias reales.
      if (!provinceId || !province || provinceId === "all" || !isValidStationId(provinceId)) {
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

      const active = await prisma.priceAlert.count({
        where: { userId: req.user.id, active: true },
      });
      if (active >= ACCOUNT_LIMITS.activeAlerts) {
        return res.status(400).json({
          error: `Has llegado al máximo de ${ACCOUNT_LIMITS.activeAlerts} alertas activas. Desactiva o borra alguna.`,
        });
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
    writeLimit(),
    wrap(async (req, res) => {
      const existing = await prisma.priceAlert.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) return res.status(404).json({ error: "Alerta no encontrada." });

      const data = {};
      if (typeof req.body?.active === "boolean") data.active = req.body.active;
      if (data.active === true && !existing.active) {
        const active = await prisma.priceAlert.count({
          where: { userId: req.user.id, active: true },
        });
        if (active >= ACCOUNT_LIMITS.activeAlerts) {
          return res.status(400).json({
            error: `Has llegado al máximo de ${ACCOUNT_LIMITS.activeAlerts} alertas activas. Desactiva o borra alguna.`,
          });
        }
      }
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
    writeLimit(),
    wrap(async (req, res) => {
      await prisma.priceAlert.deleteMany({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json({ ok: true });
    }),
  );

  // Cada provincia distinta puede costar una descarga del Ministerio, asi que
  // esta ruta va mas corta de cupo que el resto.
  app.get(
    "/api/me/alerts/status",
    requireDb,
    requireAuth,
    rateLimit({ max: 10, key: userKey }),
    wrap(async (req, res) => {
      const alerts = await prisma.priceAlert.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });

      const byProvince = new Map();
      for (const alert of alerts) {
        if (!alert.active) continue;
        if (byProvince.has(alert.provinceId)) continue;
        try {
          byProvince.set(alert.provinceId, await fetchNormalized(alert.provinceId));
        } catch (error) {
          // Una alerta antigua con un id que ya no pasa la lista blanca no
          // debe tumbar la pantalla entera: se muestra sin precio.
          if (!(error instanceof InvalidProvinceError)) throw error;
          byProvince.set(alert.provinceId, []);
        }
      }

      // Misma función que usa el job que manda los correos: si divergieran,
      // la cuenta diría una cosa y el email otra.
      const status = alerts.map((alert) => {
        if (!alert.active) {
          return {
            ...alert,
            currentMin: null,
            stationName: null,
            triggered: false,
          };
        }
        const stations = byProvince.get(alert.provinceId) || [];
        const best = cheapestFor(stations, alert);
        const currentMin = best ? best[alert.fuel] : null;
        return {
          ...alert,
          currentMin,
          stationName: best?.name || null,
          triggered: currentMin != null && currentMin <= alert.threshold,
        };
      });

      res.json({ alerts: status, emailVerified: Boolean(req.user.emailVerifiedAt) });
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
    writeLimit(),
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

      const today = await prisma.stationReport.count({
        where: {
          userId: req.user.id,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (today >= ACCOUNT_LIMITS.reportsPerDay) {
        return res.status(429).json({
          error: `Ya has enviado ${ACCOUNT_LIMITS.reportsPerDay} avisos en las últimas 24 horas. Inténtalo mañana.`,
        });
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
        orderBy: { capturedDate: "desc" },
        take: 90,
      });
      res.json({ snapshots: snapshots.reverse() });
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
