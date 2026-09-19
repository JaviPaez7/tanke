import { createHash } from "node:crypto";

// Content Security Policy de la app. Traefik ya pone HSTS, nosniff,
// Referrer-Policy y `frame-ancestors`; esta cabecera cubre lo que solo la app
// sabe: de donde cargan sus scripts, estilos, imagenes, teselas y workers.
//
// Arranca en modo informe (Content-Security-Policy-Report-Only): el navegador
// avisa a /api/csp-report de lo que bloquearia, sin bloquear nada. Cuando el
// log lleve una temporada sin sorpresas, CSP_ENFORCE=true en el .env pasa a
// la cabecera que bloquea, sin desplegar.
//
// Sin frame-ancestors a proposito: si las dos cabeceras lo llevaran, se
// aplicaria la interseccion y la de Traefik dejaria de mandar.

// Estilos inline: los <style> de las landings SEO y de index.html, y los
// atributos style que ponen Leaflet y MapLibre. Un hash no cubre atributos,
// y XSS por CSS es marginal frente a lo que 'unsafe-inline' evita romper.
export function buildPolicy({ scriptHashes = [], reportUri = "/api/csp-report" } = {}) {
  const hashes = scriptHashes.map((hash) => ` 'sha256-${hash}'`).join("");
  return [
    "default-src 'self'",
    `script-src 'self'${hashes}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://tiles.openfreemap.org",
    "worker-src 'self' blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `report-uri ${reportUri}`,
  ].join("; ");
}

/**
 * Hashes SHA-256 (base64) de los <script> inline que el navegador ejecuta.
 * Se saltan los que tienen `src` y los de tipo no ejecutable (JSON-LD). Se
 * calcula al arrancar sobre el index.html construido: si alguien edita el
 * script del tema, el hash sigue al dia sin tocar nada aqui.
 *
 * El parser HTML convierte CRLF en LF antes de que el navegador calcule el
 * hash, asi que aqui se hace lo mismo: un checkout de Windows (CRLF) daba un
 * hash distinto al que veia el navegador.
 */
export function inlineScriptHashes(html) {
  const hashes = [];
  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scripts.exec(html))) {
    const [, attrs, body] = match;
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && type !== "module" && type !== "text/javascript") continue;
    hashes.push(createHash("sha256").update(body.replace(/\r\n?/g, "\n")).digest("base64"));
  }
  return hashes;
}

export function cspHeaderName(enforce = process.env.CSP_ENFORCE === "true") {
  return enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

export function cspMiddleware({ policy, enforce } = {}) {
  const header = cspHeaderName(enforce);
  return (_req, res, next) => {
    res.setHeader(header, policy);
    next();
  };
}

/**
 * Resume un informe del navegador en una linea para el log. Llegan con dos
 * formas: `{"csp-report": {...}}` (report-uri) o una lista de `{body: {...}}`
 * (Reporting API). Los campos van recortados: el cuerpo lo escribe quien
 * quiera y acaba en el log tal cual.
 */
export function summarizeReport(payload) {
  const raw = payload?.["csp-report"] || payload?.[0]?.body || payload?.body || payload || {};
  const pick = (...keys) => {
    for (const key of keys) {
      const value = raw[key];
      if (value != null && value !== "") return String(value).slice(0, 200);
    }
    return "-";
  };
  return {
    directive: pick("effective-directive", "effectiveDirective", "violated-directive"),
    blocked: pick("blocked-uri", "blockedURL"),
    document: pick("document-uri", "documentURL"),
    sample: pick("script-sample", "sample"),
  };
}
