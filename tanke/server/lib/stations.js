const GOV_URL_PROVINCE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia";
const GOV_URL_ALL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export { FUELS } from "../../shared/fuels.js";

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
      priceCNG: num(station["Precio Gas Natural Comprimido"]),
      lat: num(station.Latitud),
      lng: num(station["Longitud (WGS84)"]),
    }))
    .filter((s) => s.id && (s.price95 > 0 || s.priceDiesel > 0));
}

const CACHE_TTL_MS = 10 * 60 * 1000;
// Cuanto aguantamos sirviendo datos viejos si el Ministerio no responde. Un
// precio de hace unas horas sigue siendo util; una pantalla de error, no.
const STALE_MAX_MS = 6 * 60 * 60 * 1000;

const cache = new Map();
const pending = new Map();

/**
 * Estaciones de una provincia, ya normalizadas, con la caché por delante.
 *
 * Devuelve tambien cuando se descargaron y si son de respaldo, para que la
 * ruta pueda avisar al usuario en vez de hacerle creer que son de ahora.
 */
export async function fetchStationsCached(id = "35") {
  const key = String(id);
  const hit = cache.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;

  if (hit && age < CACHE_TTL_MS) {
    return { stations: hit.data, fetchedAt: hit.at, stale: false };
  }

  // Si entran varias peticiones a la vez comparten una sola descarga: antes
  // cada visitante abria su propia llamada al Ministerio.
  let job = pending.get(key);
  if (!job) {
    job = fetchRawGas(key)
      .then((raw) => {
        const data = normalizeStations(raw);
        cache.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => pending.delete(key));
    pending.set(key, job);
  }

  try {
    const data = await job;
    return { stations: data, fetchedAt: Date.now(), stale: false };
  } catch (error) {
    if (hit && age < STALE_MAX_MS) {
      console.warn(
        `Ministerio caido (${error.message}); sirviendo copia de hace ${Math.round(age / 60000)} min`,
      );
      return { stations: hit.data, fetchedAt: hit.at, stale: true };
    }
    throw error;
  }
}

export async function fetchNormalized(id = "35") {
  const { stations } = await fetchStationsCached(id);
  return stations;
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

// El listado nacional son ~11.000 estaciones y varios MB de JSON: descargarlo
// al pulsar "cerca de mí" costaba unos ocho segundos. Para saber la provincia
// solo hacen falta coordenadas y nombre, así que se guarda ese índice reducido
// y no las estaciones completas. Las provincias no se mueven: aguanta el día.
const LOCATE_TTL_MS = 24 * 60 * 60 * 1000;
let locateIndex = null;
let locatePending = null;

async function buildLocateIndex() {
  const raw = await fetchRawGas("all");
  const list = raw.ListaEESSPrecio || raw;
  const points = [];

  if (Array.isArray(list)) {
    for (const station of list) {
      const provinceId = String(station.IDProvincia || "");
      const lat = num(station.Latitud);
      const lng = num(station["Longitud (WGS84)"]);
      if (!provinceId || !lat || !lng) continue;
      points.push({
        lat,
        lng,
        provinceId,
        province: station.Provincia || "",
        municipality: station.Municipio || "",
      });
    }
  }

  return { at: Date.now(), points };
}

function getLocateIndex() {
  if (locateIndex && Date.now() - locateIndex.at < LOCATE_TTL_MS) {
    return Promise.resolve(locateIndex);
  }

  // Si llegan varias peticiones a la vez comparten una sola descarga.
  locatePending ??= buildLocateIndex()
    .then((index) => {
      locateIndex = index;
      return index;
    })
    .finally(() => {
      locatePending = null;
    });

  return locatePending;
}

/** Se llama al arrancar para que el primer GPS del día no espere la descarga. */
export async function warmLocateIndex() {
  const { points } = await getLocateIndex();
  return points.length;
}

/**
 * La estación más cercana determina la provincia del usuario. Se usa
 * `IDProvincia` del propio Ministerio en lugar del nombre ("PALMAS (LAS)"),
 * que no coincide con las claves de la app.
 */
export async function nearestStation(lat, lng) {
  const { points } = await getLocateIndex();
  let best = null;
  let bestKm = Infinity;

  for (const point of points) {
    const km = haversineKm(lat, lng, point.lat, point.lng);
    if (km < bestKm) {
      bestKm = km;
      best = point;
    }
  }

  return best ? { station: best, distanceKm: bestKm } : null;
}

export function utcDateOnly(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
