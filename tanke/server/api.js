import cookieParser from "cookie-parser";
import { attachUser } from "./lib/auth.js";
import { rejectCrossSite } from "./lib/csrf.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerArticleRoutes } from "./routes/articles.js";
import { registerAssistantRoutes } from "./routes/assistant.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerGasRoute } from "./routes/gas.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerMetaRoutes } from "./routes/meta.js";

export function mountApi(app) {
  app.use(cookieParser());
  app.use("/api", rejectCrossSite);
  app.use("/api", attachUser);

  registerGasRoute(app);
  registerMetaRoutes(app);
  registerAuthRoutes(app);
  registerMeRoutes(app);
  registerArticleRoutes(app);
  registerAssistantRoutes(app);
  registerAdminRoutes(app);

  app.use("/api", (err, _req, res, next) => {
    if (typeof next === "function" && res.headersSent) return next(err);
    if (res.headersSent) return;
    // Un JSON mal formado es culpa del cliente, no un fallo del servidor.
    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido." });
    }
    // Restricciones de la base que no se comprobaron antes: mejor un código
    // que la persona pueda entender que un 500 genérico.
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Ya existe un registro con ese valor." });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "No encontrado" });
    }
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "No encontrado" });
  });
}
