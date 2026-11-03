import Anthropic from "@anthropic-ai/sdk";
import {
  AssistantLimitError,
  AssistantUnavailableError,
  MAX_QUERY_LENGTH,
  interpretQuery,
} from "../lib/assistant.js";
import { rateLimit } from "../lib/auth.js";

export function registerAssistantRoutes(app) {
  // Cada petición cuesta dinero: cupo corto por IP además del tope diario.
  const limit = rateLimit({
    max: 10,
    message: "Demasiadas preguntas seguidas. Espera un minuto o usa los filtros.",
  });

  app.post("/api/assistant/search", limit, async (req, res) => {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    if (!query) {
      return res.status(400).json({ error: "Escribe qué gasolinera buscas." });
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return res
        .status(400)
        .json({ error: `Demasiado largo: como mucho ${MAX_QUERY_LENGTH} caracteres.` });
    }

    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await interpretQuery(query, {
        currentProvince:
          typeof req.body?.province === "string" ? req.body.province : "",
      });
      res.json(result);
    } catch (error) {
      if (error instanceof AssistantUnavailableError) {
        return res.status(503).json({ error: "El asistente no está disponible." });
      }
      if (error instanceof AssistantLimitError) {
        return res.status(503).json({
          error: "El asistente ha llegado a su límite de hoy. Usa los filtros de abajo.",
        });
      }
      if (error instanceof Anthropic.APIError) {
        console.error(`Assistant error ${error.status ?? "-"}: ${error.message}`);
        return res.status(502).json({
          error: "El asistente no responde ahora mismo. Usa los filtros de abajo.",
        });
      }
      throw error;
    }
  });
}
