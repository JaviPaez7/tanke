import {
  provinceDisplay,
  provinceIds,
} from "../../seo/provinces.js";
import { FUELS } from "../lib/stations.js";
import { prisma } from "../db.js";

export function registerMetaRoutes(app) {
  // Sonda para el healthcheck de Docker. Responde 200 mientras el proceso
  // pueda atender: el buscador funciona sin base de datos, asi que una BD
  // caida se informa pero no marca el contenedor como enfermo (reiniciarlo no
  // arreglaria la BD y si tiraria las busquedas que si funcionan).
  app.get("/api/health", async (_req, res) => {
    let db = false;
    if (prisma) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        db = true;
      } catch {
        db = false;
      }
    }
    res.set("Cache-Control", "no-store").json({ ok: true, db, uptime: Math.round(process.uptime()) });
  });

  app.get("/api/meta", (_req, res) => {
    const provinces = Object.entries(provinceIds).map(([name, id]) => ({
      id,
      name,
      label: provinceDisplay[name] || name,
    }));
    res.json({
      provinces,
      fuels: FUELS,
      reportTypes: [
        { id: "horario", label: "Horario incorrecto" },
        { id: "cerrada", label: "Estación cerrada" },
        { id: "precio", label: "Precio sospechoso" },
        { id: "otro", label: "Otro" },
      ],
    });
  });
}
