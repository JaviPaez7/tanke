/**
 * Las landings SEO comparten la caché y el normalizador del resto de la app.
 * Antes este fichero repetía la descarga, el parseo y una segunda caché de 10
 * minutos, así que una landing y el buscador pedían lo mismo al Ministerio por
 * separado y podían enseñar precios distintos.
 */
import { fetchNormalized } from "../server/lib/stations.js";

export function fetchStations(provinceId = "35") {
  return fetchNormalized(provinceId);
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
