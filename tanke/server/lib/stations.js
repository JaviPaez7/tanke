const GOV_URL_PROVINCE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia";
const GOV_URL_ALL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const FUELS = [
  { id: "price95", label: "Gasolina 95" },
  { id: "price98", label: "Gasolina 98" },
  { id: "priceDiesel", label: "Diésel" },
  { id: "priceDieselPlus", label: "Diésel+" },
  { id: "priceGLP", label: "GLP" },
];

function num(value) {
  return parseFloat(String(value || "0").replace(",", ".")) || 0;
}

export async function fetchRawGas(id = "35") {
  const targetUrl =
    id === "all" ? GOV_URL_ALL : `${GOV_URL_PROVINCE}/${id}`;

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Gov API responded with ${response.status}`);
  }

  return response.json();
}

export function normalizeStations(rawData) {
  const list = rawData.ListaEESSPrecio || rawData;
  if (!Array.isArray(list)) return [];

  return list
    .map((station) => ({
      id: String(station.IDEESS || ""),
      name: station["Rótulo"] || "Gasolinera",
      address: station["Dirección"] || "",
      municipality: station.Municipio || "",
      province: station.Provincia || "",
      provinceId: String(station.IDProvincia || ""),
      schedule: station.Horario || "Sin horario",
      priceDiesel: num(station["Precio Gasoleo A"]),
      priceDieselPlus: num(station["Precio Nuevo Gasoleo A"]),
      price95: num(station["Precio Gasolina 95 E5"]),
      price98: num(station["Precio Gasolina 98 E5"]),
      priceGLP: num(station["Precio Gases licuados del petróleo"]),
      lat: num(station.Latitud),
      lng: num(station["Longitud (WGS84)"]),
    }))
    .filter((s) => s.id && (s.price95 > 0 || s.priceDiesel > 0));
}

// El listado nacional son ~11.000 estaciones y varios MB. Cachearlo evita
// castigar al Ministerio cada vez que alguien activa el GPS.
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

export async function fetchNormalized(id = "35") {
  const key = String(id);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const raw = await fetchRawGas(key);
  const data = normalizeStations(raw);
  cache.set(key, { at: Date.now(), data });
  return data;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * La estación más cercana determina la provincia del usuario. Se usa
 * `IDProvincia` del propio Ministerio en lugar del nombre ("PALMAS (LAS)"),
 * que no coincide con las claves de la app.
 */
export async function nearestStation(lat, lng) {
  const stations = await fetchNormalized("all");
  let best = null;
  let bestKm = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng || !station.provinceId) continue;
    const km = haversineKm(lat, lng, station.lat, station.lng);
    if (km < bestKm) {
      bestKm = km;
      best = station;
    }
  }

  return best ? { station: best, distanceKm: bestKm } : null;
}

export function utcDateOnly(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
