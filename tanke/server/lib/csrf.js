import { appUrl } from "./mailer.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Defensa en profundidad frente a CSRF. La cookie ya es SameSite=Lax y los
// cuerpos son JSON (que un formulario ajeno no puede mandar sin preflight),
// pero una sola capa es una sola capa.
//
// Los navegadores actuales ponen Sec-Fetch-Site en cada peticion: si dice que
// viene de otro sitio, se corta. Si no llega (navegadores viejos) se compara
// Origin con APP_URL en produccion. Sin ninguna de las dos cabeceras (curl,
// tests, apps nativas) se deja pasar: esos clientes no llevan la cookie del
// navegador y no hay nada que proteger.
export function rejectCrossSite(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const site = req.get("sec-fetch-site");
  if (site) {
    if (site === "same-origin" || site === "none") return next();
    return blocked(res);
  }

  const origin = req.get("origin");
  if (origin && process.env.NODE_ENV === "production") {
    if (origin.replace(/\/+$/, "") !== appUrl()) return blocked(res);
  }

  next();
}

function blocked(res) {
  return res
    .status(403)
    .json({ error: "Petición bloqueada: viene de otro sitio web." });
}
