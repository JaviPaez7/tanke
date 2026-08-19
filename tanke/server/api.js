import cookieParser from "cookie-parser";
import { attachUser } from "./lib/auth.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerArticleRoutes } from "./routes/articles.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerGasRoute } from "./routes/gas.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerMetaRoutes } from "./routes/meta.js";

export function mountApi(app) {
  app.use(cookieParser());
  app.use("/api", attachUser);

  registerGasRoute(app);
  registerMetaRoutes(app);
  registerAuthRoutes(app);
  registerMeRoutes(app);
  registerArticleRoutes(app);
  registerAdminRoutes(app);

  app.use("/api", (err, _req, res, next) => {
    if (typeof next === "function" && res.headersSent) return next(err);
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Error interno" });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "No encontrado" });
  });
}
