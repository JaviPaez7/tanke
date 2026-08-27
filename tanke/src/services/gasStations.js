const API_URL = "/api/gas";

/**
 * Estaciones de una provincia. El servidor ya las manda normalizadas, así que
 * aquí no hay que traducir los 41 campos del Ministerio: antes llegaba el JSON
 * crudo y el navegador tiraba 28 de cada estación.
 *
 * Los errores se propagan a propósito. Antes se devolvía `[]` al fallar, y la
 * pantalla no podía distinguir "esta provincia no tiene datos" de "se ha caído
 * la conexión", así que el aviso tenía que decir las dos cosas a la vez y no
 * había forma de ofrecer un reintento.
 */
export const getAllGasStations = async (provinceId = "35") => {
  const response = await fetch(`${API_URL}?id=${encodeURIComponent(provinceId)}`, {
    headers: { Accept: "application/json" },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "No hemos podido cargar las gasolineras.");
  }

  return {
    stations: Array.isArray(data.stations) ? data.stations : [],
    // `stale` = el Ministerio no respondía y el servidor ha servido su copia
    // anterior. Los precios valen, pero conviene decirlo.
    stale: Boolean(data.stale),
    fetchedAt: data.fetchedAt || null,
  };
};
