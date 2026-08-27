import { FUELS } from "../../shared/fuels.js";
import { fetchNormalized } from "./stations.js";
import { appUrl, priceAlertEmail, sendEmail } from "./mailer.js";

// Cuánto esperamos antes de volver a avisar de la misma alerta. Sin esto, el
// job horario mandaría un correo cada hora mientras el precio siguiera bajo, y
// el aviso dejaría de leerse a los dos días.
const COOLDOWN_MS = 20 * 60 * 60 * 1000;

// Si el precio vuelve a caer con holgura respecto al último aviso, merece la
// pena repetirlo aunque no haya pasado el cooldown.
const MEJORA_SIGNIFICATIVA = 0.03;

function fuelLabel(id) {
  return FUELS.find((f) => f.id === id)?.label || id;
}

/**
 * Estación más barata de la zona de la alerta para su combustible.
 * Devuelve null si no hay ninguna con precio.
 */
export function cheapestFor(stations, alert) {
  const enZona = alert.municipality
    ? stations.filter((s) => s.municipality === alert.municipality)
    : stations;

  let best = null;
  for (const station of enZona) {
    const price = station[alert.fuel];
    if (typeof price !== "number" || price <= 0) continue;
    if (!best || price < best[alert.fuel]) best = station;
  }
  return best;
}

/** Decide si una alerta que ha saltado merece un correo ahora mismo. */
export function shouldNotify(alert, currentMin, now = Date.now()) {
  if (currentMin > alert.threshold) return false;
  if (!alert.notifiedAt) return true;

  const desde = now - new Date(alert.notifiedAt).getTime();
  if (desde >= COOLDOWN_MS) return true;

  // Bajada notable desde el último aviso: vale la pena insistir.
  return (
    alert.notifiedPrice != null &&
    currentMin <= alert.notifiedPrice - MEJORA_SIGNIFICATIVA
  );
}

/**
 * Evalúa las alertas activas y manda un correo por usuario con las que hayan
 * saltado. Hasta ahora una alerta solo se comprobaba al abrir /cuenta, así que
 * avisaba solo a quien ya estaba mirando.
 */
export async function runAlerts(prisma, { now = Date.now() } = {}) {
  const alerts = await prisma.priceAlert.findMany({
    where: { active: true, user: { active: true } },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (alerts.length === 0) return { checked: 0, notified: 0, users: 0 };

  // Una descarga por provincia, compartida por todas las alertas de esa zona.
  const porProvincia = new Map();
  for (const alert of alerts) {
    if (porProvincia.has(alert.provinceId)) continue;
    try {
      porProvincia.set(alert.provinceId, await fetchNormalized(alert.provinceId));
    } catch (error) {
      console.error(`Alertas: provincia ${alert.provinceId}:`, error.message);
      porProvincia.set(alert.provinceId, []);
    }
  }

  const porUsuario = new Map();
  for (const alert of alerts) {
    const stations = porProvincia.get(alert.provinceId) || [];
    const best = cheapestFor(stations, alert);
    if (!best) continue;

    const currentMin = best[alert.fuel];
    if (!shouldNotify(alert, currentMin, now)) continue;

    if (!porUsuario.has(alert.userId)) {
      porUsuario.set(alert.userId, { user: alert.user, saltadas: [] });
    }
    porUsuario.get(alert.userId).saltadas.push({
      id: alert.id,
      fuelLabel: fuelLabel(alert.fuel),
      province: alert.province,
      municipality: alert.municipality,
      threshold: alert.threshold,
      currentMin,
      stationName: best.name,
    });
  }

  let notified = 0;
  for (const { user, saltadas } of porUsuario.values()) {
    try {
      await sendEmail({
        to: user.email,
        ...priceAlertEmail({
          name: user.name,
          alerts: saltadas,
          url: `${appUrl()}/cuenta?tab=alertas`,
        }),
      });
    } catch (error) {
      // Si el correo no sale no marcamos como avisadas: se reintenta a la
      // hora siguiente en vez de perderse el aviso en silencio.
      console.error(`Alertas: email a ${user.email}:`, error.message);
      continue;
    }

    for (const saltada of saltadas) {
      await prisma.priceAlert.update({
        where: { id: saltada.id },
        data: { notifiedAt: new Date(now), notifiedPrice: saltada.currentMin },
      });
      notified += 1;
    }
  }

  return { checked: alerts.length, notified, users: porUsuario.size };
}
