const GOV_URL_PROVINCE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia";
const GOV_URL_ALL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function parseStations(rawData) {
  const list = rawData.ListaEESSPrecio || rawData;
  if (!Array.isArray(list)) return [];

  return list
    .map((station) => ({
      id: station["IDEESS"],
      name: station["Rótulo"] || "Gasolinera",
      address: station["Dirección"] || "",
      municipality: station["Municipio"] || "",
      schedule: station["Horario"] || "",
      price95: parseFloat(
        station["Precio Gasolina 95 E5"]?.replace(",", ".") || 0,
      ),
      price98: parseFloat(
        station["Precio Gasolina 98 E5"]?.replace(",", ".") || 0,
      ),
      priceDiesel: parseFloat(
        station["Precio Gasoleo A"]?.replace(",", ".") || 0,
      ),
      priceGLP: parseFloat(
        station["Precio Gases licuados del petróleo"]?.replace(",", ".") || 0,
      ),
    }))
    .filter((s) => s.price95 > 0 || s.priceDiesel > 0);
}

export async function fetchStations(provinceId = "35") {
  const key = String(provinceId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const targetUrl =
    key === "all" ? GOV_URL_ALL : `${GOV_URL_PROVINCE}/${key}`;

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Gov API responded with ${response.status}`);
  }

  const json = await response.json();
  const data = parseStations(json);
  cache.set(key, { at: Date.now(), data });
  return data;
}

export function cheapest(stations, priceKey, limit = 12) {
  return [...stations]
    .filter((s) => s[priceKey] > 0)
    .sort((a, b) => a[priceKey] - b[priceKey])
    .slice(0, limit);
}

export function averagePrice(stations, priceKey) {
  const prices = stations.map((s) => s[priceKey]).filter((p) => p > 0);
  if (prices.length === 0) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}
