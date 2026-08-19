import {
  provinceDisplay,
  provinceIds,
} from "../../seo/provinces.js";
import { FUELS } from "../lib/stations.js";

export function registerMetaRoutes(app) {
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
